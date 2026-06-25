import fs from 'fs';
import path from 'path';
import * as cheerio from 'cheerio';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicPath = path.join(__dirname, '../public/maps_data.json');
const scraperPath = path.join(__dirname, 'maps_data.json');

const CONCURRENCY = 15;
const BATCH_DELAY = 600;

async function fetchWithRetry(url, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
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
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

function parseDownloadDetails(html) {
  const $ = cheerio.load(html);
  
  const downloadLinks = [];
  const downloadNotes = [];

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

  $('.dl p, .dl li').each((i, el) => {
    const isParentOfDownload = downloadLinkElRefs.some(linkEl => $(el).find(linkEl).length > 0 || el === $(linkEl).parent()[0]);
    if (isParentOfDownload) return;

    if ($(el).closest('.dl-upload').length > 0 || $(el).closest('.dl-how-to-install').length > 0 || $(el).closest('.dlhelp').length > 0) {
      return;
    }

    const text = $(el).text().trim();
    if (text) {
      downloadNotes.push(text);
    }
  });

  return { downloadLinks, downloadNotes };
}

function saveMaps(maps) {
  if (fs.existsSync(scraperPath)) {
    fs.writeFileSync(scraperPath, JSON.stringify(maps, null, 2), 'utf8');
  }
  if (fs.existsSync(publicPath)) {
    fs.writeFileSync(publicPath, JSON.stringify(maps, null, 2), 'utf8');
  }
}

async function run() {
  if (!fs.existsSync(scraperPath)) {
    console.error('Master database not found at:', scraperPath);
    return;
  }

  const maps = JSON.parse(fs.readFileSync(scraperPath, 'utf8'));
  const pendingMaps = maps.filter(m => m.download_links && m.download_links.length > 0 && !m.download_notes);

  console.log(`Starting details migration. Total maps to migrate: ${pendingMaps.length}`);

  if (pendingMaps.length === 0) {
    console.log('All maps are already migrated!');
    return;
  }

  for (let i = 0; i < pendingMaps.length; i += CONCURRENCY) {
    const batch = pendingMaps.slice(i, i + CONCURRENCY);
    console.log(`Migrating batch ${Math.floor(i / CONCURRENCY) + 1}/${Math.ceil(pendingMaps.length / CONCURRENCY)}...`);

    const promises = batch.map(async (map) => {
      try {
        console.log(`Fetching details for: ${map.id} (${map.url})`);
        const html = await fetchWithRetry(map.url);
        const result = parseDownloadDetails(html);

        // Find map in main array and update
        const idx = maps.findIndex(m => m.id === map.id);
        if (idx !== -1) {
          maps[idx].download_links = result.downloadLinks;
          maps[idx].download_notes = result.downloadNotes;
        }
      } catch (err) {
        console.error(`Failed to migrate map ${map.id}:`, err.message);
      }
    });

    await Promise.all(promises);

    // Save incrementally
    saveMaps(maps);
    console.log(`Progress saved. Batch finished.`);

    if (i + CONCURRENCY < pendingMaps.length) {
      await new Promise(r => setTimeout(r, BATCH_DELAY));
    }
  }

  console.log('Migration finished successfully!');
}

run();
