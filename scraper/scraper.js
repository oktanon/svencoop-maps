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
    let author = 'Unknown';
    let originalReleaseDate = '';
    let releaseDate = '';
    let bspNames = [];

    $('table.wiki-content-table tr').each((i, el) => {
      const label = $(el).find('td').first().text().trim();
      const val = $(el).find('td').last().text().trim();

      if (label.toLowerCase().includes('author')) {
        author = val;
      } else if (label.toLowerCase().includes('original mod release')) {
        originalReleaseDate = val;
      } else if (label.toLowerCase().includes('date of release')) {
        releaseDate = val;
      } else if (label.toLowerCase().includes('.bsp filename')) {
        bspNames = val.split(/,\s*(?![^()]*\))/).map(name => name.trim()).filter(Boolean);
      }
    });

    // 2. Extract description (from Description header to next heading)
    const descHeader = $('h2, h3').filter((i, el) => $(el).text().toLowerCase().includes('description'));
    let description = '';
    if (descHeader.length) {
      let next = descHeader.next();
      while (next.length && !next.is('h2') && !next.is('h3')) {
        description += next.text().trim() + '\n';
        next = next.next();
      }
    }
    description = cleanText(description);

    // 3. Extract additional info
    const infoHeader = $('h2, h3').filter((i, el) => $(el).text().toLowerCase().includes('additional info'));
    let additionalInfo = '';
    if (infoHeader.length) {
      let next = infoHeader.next();
      while (next.length && !next.is('h2') && !next.is('h3')) {
        additionalInfo += next.text().trim() + '\n';
        next = next.next();
      }
    }
    additionalInfo = cleanText(additionalInfo);

    // 4. Download mirror links
    const downloadLinks = [];
    $('.dl a').each((i, el) => {
      const url = $(el).attr('href');
      if (url && (url.startsWith('http') || url.startsWith('ftp'))) {
        const text = $(el).text().trim();
        const parentText = $(el).parent().text();
        
        let type = 'Mirror';
        if (parentText.toLowerCase().includes('community edit')) {
          type = 'Community Edit';
        } else if (parentText.toLowerCase().includes('original')) {
          type = 'Original';
        }
        
        downloadLinks.push({
          name: text || 'Download',
          url,
          type
        });
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
  console.log(`Starting Scraper. Mode: ${isTest ? 'TEST (limit ' + TEST_LIMIT + ' maps)' : 'FULL'}`);

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

  // Filter maps that need scraping
  let pendingMaps = maps.filter(m => !m.scraped);
  
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
