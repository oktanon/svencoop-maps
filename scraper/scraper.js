import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'https://scmapdb.wikidot.com';
const INDEX_URL = `${BASE_URL}/tag:all`;
const PUBLIC_DIR = path.join(__dirname, '../public');
const OUTPUT_FILE = fs.existsSync(PUBLIC_DIR)
  ? path.join(PUBLIC_DIR, 'maps_data.json')
  : path.join(__dirname, 'maps_data.json');
const CONCURRENCY_LIMIT = 5; // Scrape 5 maps concurrently in each batch
const BATCH_DELAY = 1000;    // Wait 1s between batches to avoid rate limit
const TEST_LIMIT = 5;       // Scrape only 5 maps in test mode

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to clean texts
const cleanText = (str) => {
  if (!str) return '';
  return str.replace(/\s+/g, ' ').trim();
};

async function fetchWithRetry(url, retries = 3, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`Fetching: ${url}`);
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return await res.text();
    } catch (e) {
      console.warn(`Attempt ${i + 1} failed for ${url}: ${e.message}`);
      if (i === retries - 1) throw e;
      await sleep(delay * (i + 1));
    }
  }
}

async function getMapsList() {
  console.log('Retrieving map list from indices...');
  const mapsMap = new Map(); // Use Map to avoid duplicates

  // Fetch page 1 first to determine how many pages there are
  try {
    const html = await fetchWithRetry(INDEX_URL);
    const $ = cheerio.load(html);
    
    // Parse total pages
    const pagerText = $('.pager-no').first().text().trim(); // "page 1 of 28"
    let totalPages = 28; // Default fallback
    const match = pagerText.match(/page \d+ of (\d+)/i);
    if (match) {
      totalPages = parseInt(match[1], 10);
    }
    console.log(`Found total pages: ${totalPages}`);

    const parsePageItems = (cheerioObj) => {
      cheerioObj('.lister-container-tags-map-small .list-pages-item').each((i, el) => {
        const titleAnchor = cheerioObj(el).find('.lister-item-title a');
        const urlPath = titleAnchor.attr('href') || '';
        const title = titleAnchor.text().trim();
        const id = urlPath.replace('/map:', '').trim();

        if (!id) return;

        const thumbnail = cheerioObj(el).find('.lister-item-image img').attr('src') || '';
        
        let rating = 0;
        const ratingText = cheerioObj(el).find('.voteitem strong').text().trim();
        if (ratingText) {
          rating = parseFloat(ratingText);
        }

        const tags = [];
        cheerioObj(el).find('.lister-item-tags p').text().split(/\s+/).forEach(t => {
          const cleaned = t.trim();
          if (cleaned) tags.push(cleaned);
        });

        mapsMap.set(id, {
          id,
          title,
          url: `${BASE_URL}${urlPath}`,
          thumbnail,
          rating,
          tags,
          scraped: false
        });
      });
    };

    // Parse page 1
    parsePageItems($);

    // Fetch the rest of the pages
    for (let p = 2; p <= totalPages; p++) {
      console.log(`Fetching page ${p}/${totalPages}...`);
      const pageHtml = await fetchWithRetry(`${INDEX_URL}/p/${p}`);
      const page$ = cheerio.load(pageHtml);
      parsePageItems(page$);
      await sleep(500); // Be polite to the server between page hits
    }

  } catch (error) {
    console.error('Error fetching map lists:', error.message);
  }

  return Array.from(mapsMap.values());
}

async function scrapeMapDetails(map) {
  try {
    const html = await fetchWithRetry(map.url);
    const $ = cheerio.load(html);

    // 1. Author and key attributes from wiki table
    let author = '';
    let projectLead = '';
    let team = '';
    let originalReleaseDate = '';
    let releaseDate = '';
    let bspNames = [];

    $('table.wiki-content-table tr').each((i, el) => {
      const label = $(el).find('td').first().text().trim();
      const val = $(el).find('td').last().text().trim();
      const labelLower = label.toLowerCase();

      if (labelLower.includes('author') || labelLower.includes('mapper') || labelLower.includes('creator') || labelLower.includes('developer')) {
        author = val;
      } else if (labelLower.includes('project lead') || labelLower.includes('project leader')) {
        projectLead = val;
      } else if (labelLower.includes('team')) {
        team = val;
      } else if (labelLower.includes('original mod release')) {
        originalReleaseDate = val;
      } else if (labelLower.includes('date of release')) {
        releaseDate = val;
      } else if (labelLower.includes('.bsp filename')) {
        bspNames = val.split(/,\s*(?![^()]*\))/).map(name => name.trim()).filter(Boolean);
      }
    });

    if (!author) {
      author = projectLead || team || 'Unknown';
    }

    // 2. Extract description (from Description header to next heading)
    const descHeader = $('h2, h3').filter((i, el) => $(el).text().toLowerCase().includes('description'));
    let description = '';
    if (descHeader.length) {
      let next = descHeader.next();
      const descElements = [];
      while (next.length && !next.is('h2') && !next.is('h3')) {
        const element = next.clone();
        
        // Rewrite relative links to absolute URLs and open in a new tab
        element.find('a').each((_, aEl) => {
          const href = $(aEl).attr('href');
          if (href) {
            if (href.startsWith('/')) {
              $(aEl).attr('href', `${BASE_URL}${href}`);
            }
            $(aEl).attr('target', '_blank');
            $(aEl).attr('rel', 'noopener noreferrer');
          }
        });

        // Strip inline styles, classes, and ids to prevent bleed
        element.find('*').each((_, elNode) => {
          const attributes = elNode.attribs || {};
          const tagName = elNode.name;
          if (tagName === 'a') {
            const href = attributes.href;
            const target = attributes.target;
            const rel = attributes.rel;
            elNode.attribs = {};
            if (href) elNode.attribs.href = href;
            if (target) elNode.attribs.target = target;
            if (rel) elNode.attribs.rel = rel;
          } else {
            elNode.attribs = {};
          }
        });

        if (element[0]) {
          element[0].attribs = {};
        }

        descElements.push($.html(element));
        next = next.next();
      }
      description = descElements.join('\n').trim();
    }

    // 3. Extract additional info
    const infoHeader = $('h2, h3').filter((i, el) => $(el).text().toLowerCase().includes('additional info'));
    let additionalInfo = '';
    if (infoHeader.length) {
      let next = infoHeader.next();
      const infoElements = [];
      while (next.length && !next.is('h2') && !next.is('h3')) {
        const element = next.clone();
        
        // Rewrite relative links to absolute URLs and open in a new tab
        element.find('a').each((_, aEl) => {
          const href = $(aEl).attr('href');
          if (href) {
            if (href.startsWith('/')) {
              $(aEl).attr('href', `${BASE_URL}${href}`);
            }
            $(aEl).attr('target', '_blank');
            $(aEl).attr('rel', 'noopener noreferrer');
          }
        });

        // Strip inline styles, classes, and ids to prevent bleed
        element.find('*').each((_, elNode) => {
          const attributes = elNode.attribs || {};
          const tagName = elNode.name;
          if (tagName === 'a') {
            const href = attributes.href;
            const target = attributes.target;
            const rel = attributes.rel;
            elNode.attribs = {};
            if (href) elNode.attribs.href = href;
            if (target) elNode.attribs.target = target;
            if (rel) elNode.attribs.rel = rel;
          } else {
            elNode.attribs = {};
          }
        });

        if (element[0]) {
          element[0].attribs = {};
        }

        infoElements.push($.html(element));
        next = next.next();
      }
      additionalInfo = infoElements.join('\n').trim();
    }

    // 3.5. Extract known issues
    const issuesHeader = $('h2, h3').filter((i, el) => $(el).text().toLowerCase().includes('known issues'));
    let knownIssues = '';
    if (issuesHeader.length) {
      let next = issuesHeader.next();
      while (next.length && !next.is('h2') && !next.is('h3')) {
        knownIssues += next.text().trim() + '\n';
        next = next.next();
      }
    }
    knownIssues = cleanText(knownIssues);

    // 4. Download mirror links and notes
    const downloadLinks = [];
    const downloadNotes = [];

    // Let's find all download link elements
    const downloadLinkElRefs = [];
    $('.dl a').each((i, el) => {
      const url = $(el).attr('href');
      if (url && (url.startsWith('http') || url.startsWith('ftp'))) {
        downloadLinkElRefs.push(el);
      }
    });

    downloadLinkElRefs.forEach((el) => {
      const url = $(el).attr('href');
      const text = $(el).text().trim();
      const parent = $(el).parent();
      
      const parentText = parent.text();
      let type = 'Mirror';
      if (parentText.toLowerCase().includes('community edit')) {
        type = 'Community Edit';
      } else if (parentText.toLowerCase().includes('original')) {
        type = 'Original';
      }
      
      // Extract sibling text nodes inside the parent element to get descriptions
      const contents = parent.contents();
      let beforeText = '';
      let afterText = '';
      let foundSelf = false;
      
      contents.each((idx, node) => {
        if (node === el) {
          foundSelf = true;
        } else if (node.type === 'text') {
          const t = $(node).text().trim();
          if (t) {
            if (!foundSelf) {
              beforeText += ' ' + t;
            } else {
              afterText += ' ' + t;
            }
          }
        }
      });
      
      // Clean up beforeText and afterText
      beforeText = beforeText.trim()
        .replace(/^(Community edit|Original|Mirror):?/i, '')
        .replace(/:$/, '')
        .trim();
      afterText = afterText.trim();
      
      let description = '';
      if (beforeText && afterText) {
        description = `${beforeText} - ${afterText}`;
      } else {
        description = beforeText || afterText;
      }
      
      let cleanedUrl = url;
      if (
        cleanedUrl.includes('scmapdb.com/local--files/') ||
        cleanedUrl.includes('scmapdb.wikidot.com/local--files/') ||
        cleanedUrl.includes('scmapdb.wdfiles.com/local--files/')
      ) {
        cleanedUrl = cleanedUrl
          .replace(/^http:\/\//i, 'https://')
          .replace(/scmapdb\.com/g, 'scmapdb.wdfiles.com')
          .replace(/scmapdb\.wikidot\.com/g, 'scmapdb.wdfiles.com');
        
        cleanedUrl = cleanedUrl.replace(/\/local--files\/([^/]+)\//, (match, p1) => {
          return `/local--files/${p1.replace(/:/g, '%3A')}/`;
        });
      }
      
      const linkObj = {
        name: text || 'Download',
        url: cleanedUrl,
        type
      };
      
      if (description) {
        linkObj.description = description;
      }
      
      downloadLinks.push(linkObj);
    });

    // Extract notes/messages
    $('.dl p, .dl li').each((i, el) => {
      // Check if this paragraph is a parent of any of our download links
      const isParentOfDownload = downloadLinkElRefs.some(linkEl => $(el).find(linkEl).length > 0 || el === $(linkEl).parent()[0]);
      if (isParentOfDownload) return;

      // Ignore helper sections/buttons
      if ($(el).closest('.dl-upload').length > 0 || $(el).closest('.dl-how-to-install').length > 0 || $(el).closest('.dlhelp').length > 0) {
        return;
      }

      const text = $(el).text().trim();
      if (text) {
        downloadNotes.push(text);
      }
    });

    // 5. Screenshot URLs (filtered to avoid suggestions or layout elements)
    const screenshots = [];
    const mapIdClean = map.id.toLowerCase();
    
    $('.gallery-item a').each((i, el) => {
      const href = $(el).attr('href');
      if (href && href.match(/\.(jpg|jpeg|png|gif)/i)) {
        const hrefLower = href.toLowerCase();
        if (hrefLower.includes(mapIdClean) || hrefLower.includes(mapIdClean.replace(/-/g, ''))) {
          screenshots.push(href);
        }
      }
    });

    // If no screenshots found in gallery, try standard image links in content
    if (screenshots.length === 0) {
      $('#page-content img').each((i, el) => {
        const src = $(el).attr('src');
        if (src && src.includes('wdfiles') && src.match(/\.(jpg|jpeg|png|gif)/i)) {
          const srcLower = src.toLowerCase();
          if (srcLower.includes(mapIdClean) || srcLower.includes(mapIdClean.replace(/-/g, ''))) {
            screenshots.push(src);
          }
        }
      });
    }

    // 6. Rating details
    let votes = 0;
    const rateText = $('.page-rate-widget-start').parent().text();
    const votesMatch = rateText.match(/(\d+)\s+votes/i);
    if (votesMatch) {
      votes = parseInt(votesMatch[1], 10);
    }

    // Extrapolate difficulty, size, year from tags
    let difficulty = 'unrated';
    let size = 'unrated';
    let year = null;

    map.tags.forEach(tag => {
      if (tag.startsWith('difficulty:')) {
        difficulty = tag.replace('difficulty:', '');
      } else if (tag.startsWith('size:')) {
        size = tag.replace('size:', '');
      } else if (tag.match(/^\d{4}$/)) {
        year = parseInt(tag, 10);
      }
    });

    return {
      ...map,
      author,
      original_release_date: originalReleaseDate,
      release_date: releaseDate,
      bsp_names: bspNames,
      description,
      additional_info: additionalInfo,
      download_links: downloadLinks,
      download_notes: downloadNotes,
      known_issues: knownIssues,
      screenshots,
      votes,
      difficulty,
      size,
      year,
      scraped: true
    };
  } catch (error) {
    console.error(`Error scraping map details for ${map.id}:`, error.message);
    return null; // Return null so we don't overwrite with corrupt data
  }
}

async function run() {
  const isTest = process.argv.includes('--test');
  const isForce = process.argv.includes('--force');
  console.log(`Starting Scraper. Mode: ${isTest ? 'TEST' : 'FULL'}${isForce ? ' (FORCE re-scrape)' : ''}`);

  let maps = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      maps = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
      console.log(`Loaded ${maps.length} existing maps from ${OUTPUT_FILE}`);
    } catch (e) {
      console.error('Error reading output file, starting fresh:', e.message);
    }
  }

  // If we don't have any maps list, fetch the listing pages
  if (maps.length === 0) {
    maps = await getMapsList();
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(maps, null, 2));
    console.log(`Saved initial list of ${maps.length} maps to ${OUTPUT_FILE}`);
  }

  // Filter maps that need scraping (or all maps if forcing)
  let pendingMaps = isForce ? maps : maps.filter(m => !m.scraped);
  
  if (isTest) {
    // In test mode, scrape up to TEST_LIMIT maps
    pendingMaps = pendingMaps.slice(0, TEST_LIMIT);
  }

  console.log(`Remaining maps to scrape: ${pendingMaps.length}`);

  if (pendingMaps.length === 0) {
    console.log('All maps are already scraped!');
    return;
  }

  // Batch execution
  for (let i = 0; i < pendingMaps.length; i += CONCURRENCY_LIMIT) {
    const batch = pendingMaps.slice(i, i + CONCURRENCY_LIMIT);
    console.log(`Scraping batch ${Math.floor(i / CONCURRENCY_LIMIT) + 1}/${Math.ceil(pendingMaps.length / CONCURRENCY_LIMIT)}...`);

    const promises = batch.map(async (map) => {
      const detailed = await scrapeMapDetails(map);
      if (detailed) {
        // Find and replace in master list
        const idx = maps.findIndex(m => m.id === map.id);
        if (idx !== -1) {
          maps[idx] = detailed;
        }
      }
    });

    await Promise.all(promises);

    // Save incrementally
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(maps, null, 2));
    console.log(`Progress saved. Total maps database size: ${maps.length}`);

    if (i + CONCURRENCY_LIMIT < pendingMaps.length) {
      await sleep(BATCH_DELAY);
    }
  }

  console.log('Scraping finished successfully!');
}

run();
