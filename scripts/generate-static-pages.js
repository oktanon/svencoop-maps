import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../dist');
const PUBLIC_DIR = path.join(__dirname, '../public');

// Fallback base URL for sitemap (can be customized via environment variable)
const SITE_URL = (process.env.SITE_URL || 'https://oktanon.github.io/svencoop-maps').replace(/\/$/, '');

// Utility to escape HTML text
function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Strip HTML tags to produce clean meta descriptions
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
}

// Sanitize map IDs to be safe for all operating systems and filesystems (e.g. replacing ':' with '-')
function sanitizeMapId(id) {
  if (!id) return '';
  return id.replace(/[:*?"<>|\\]/g, '-');
}

function run() {
  console.log('🚀 Starting Static Page Generator (SSG for SEO)...');

  const templatePath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(templatePath)) {
    console.error(`❌ Error: Template file not found at ${templatePath}. Run 'vite build' first.`);
    process.exit(1);
  }

  const mapsDataPath = fs.existsSync(path.join(DIST_DIR, 'maps_data.json'))
    ? path.join(DIST_DIR, 'maps_data.json')
    : path.join(PUBLIC_DIR, 'maps_data.json');

  if (!fs.existsSync(mapsDataPath)) {
    console.error(`❌ Error: Maps data file not found at ${mapsDataPath}.`);
    process.exit(1);
  }

  const templateHtml = fs.readFileSync(templatePath, 'utf8');
  const maps = JSON.parse(fs.readFileSync(mapsDataPath, 'utf8'));

  console.log(`Loaded ${maps.length} maps for static page generation.`);

  // Create dist/map directory
  const mapBaseDir = path.join(DIST_DIR, 'map');
  if (!fs.existsSync(mapBaseDir)) {
    fs.mkdirSync(mapBaseDir, { recursive: true });
  }

  const sitemapUrls = [];
  sitemapUrls.push({ url: `${SITE_URL}/`, priority: '1.0', changefreq: 'daily' });

  let generatedCount = 0;

  maps.forEach((map) => {
    if (!map.id) return;

    const safeId = sanitizeMapId(map.id);
    const mapDir = path.join(mapBaseDir, safeId);
    if (!fs.existsSync(mapDir)) {
      fs.mkdirSync(mapDir, { recursive: true });
    }

    const mapUrl = `${SITE_URL}/map/${safeId}/`;
    sitemapUrls.push({ url: mapUrl, priority: '0.8', changefreq: 'weekly' });

    const $ = cheerio.load(templateHtml);

    // Clean title and description
    const titleText = `${map.title} - Sven Co-op Map Database`;
    const rawDesc = map.description ? stripHtml(map.description) : '';
    const descSnippet = rawDesc
      ? rawDesc.slice(0, 160) + (rawDesc.length > 160 ? '...' : '')
      : `Download and view details for ${map.title}, a Sven Co-op map by ${map.author || 'Unknown author'}. Rating: ${map.rating || 'N/A'}/5.`;

    const imageUrl = map.thumbnail || map.screenshots?.[0] || `${SITE_URL}/Half-Life-Background.png`;

    // 1. Update Title & Meta Tags
    $('title').text(titleText);

    // Remove any existing dynamic meta description/og tags
    $('meta[name="description"]').remove();
    $('meta[property^="og:"]').remove();
    $('meta[name^="twitter:"]').remove();

    const metaTags = `
    <meta name="description" content="${escapeHtml(descSnippet)}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${escapeHtml(titleText)}" />
    <meta property="og:description" content="${escapeHtml(descSnippet)}" />
    <meta property="og:image" content="${escapeHtml(imageUrl)}" />
    <meta property="og:url" content="${escapeHtml(mapUrl)}" />
    <meta property="og:site_name" content="Sven Co-op Map Database" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(titleText)}" />
    <meta name="twitter:description" content="${escapeHtml(descSnippet)}" />
    <meta name="twitter:image" content="${escapeHtml(imageUrl)}" />
    <link rel="canonical" href="${escapeHtml(mapUrl)}" />
    `;

    $('head').append(metaTags);

    // 2. Structured Data (JSON-LD)
    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      'name': map.title,
      'applicationCategory': 'GameMap',
      'operatingSystem': 'Windows',
      'description': descSnippet,
      'image': imageUrl,
      'author': map.author ? { '@type': 'Person', 'name': map.author } : undefined,
      'aggregateRating': map.rating ? {
        '@type': 'AggregateRating',
        'ratingValue': map.rating,
        'bestRating': 5,
        'ratingCount': map.votes || 1
      } : undefined
    };

    $('head').append(`<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>`);

    // 3. Pre-render Static Body Content for Search Engine Crawlers
    const bspListHtml = map.bsp_names?.length
      ? `<ul>${map.bsp_names.map(bsp => `<li><code>${escapeHtml(bsp)}</code></li>`).join('')}</ul>`
      : '';

    const downloadLinksHtml = map.download_links?.length
      ? map.download_links.map(dl => `<a href="${escapeHtml(dl.url)}" target="_blank" rel="nofollow noopener">${escapeHtml(dl.name)} (${escapeHtml(dl.type)})</a>`).join(' | ')
      : '';

    const tagsHtml = map.tags?.length
      ? map.tags.map(t => `<span>#${escapeHtml(t)}</span>`).join(' ')
      : '';

    const preRenderedHtml = `
      <article class="static-map-page" style="max-width: 900px; margin: 0 auto; padding: 20px; font-family: sans-serif;">
        <header>
          <h1>${escapeHtml(map.title)}</h1>
          <p class="meta">
            <span><strong>Author:</strong> ${escapeHtml(map.author || 'Unknown')}</span> | 
            <span><strong>Rating:</strong> ⭐ ${map.rating || 0}/5 (${map.votes || 0} votes)</span> | 
            <span><strong>Year:</strong> ${map.year || 'N/A'}</span>
          </p>
        </header>

        ${map.thumbnail ? `<div class="thumbnail"><img src="${escapeHtml(map.thumbnail)}" alt="${escapeHtml(map.title)} thumbnail" style="max-width: 100%; height: auto; border-radius: 8px;" /></div>` : ''}

        <section class="downloads" style="margin: 20px 0; padding: 15px; background: rgba(255, 179, 0, 0.1); border-left: 4px solid #ffb300;">
          <h2>Download Map</h2>
          ${downloadLinksHtml || '<p>No mirror download links available.</p>'}
        </section>

        ${bspListHtml ? `<section class="bsp-files"><h3>BSP Files</h3>${bspListHtml}</section>` : ''}

        ${map.description ? `<section class="description"><h2>Description</h2><div>${map.description}</div></section>` : ''}

        ${map.additional_info ? `<section class="additional-info"><h2>Additional Info</h2><div>${map.additional_info}</div></section>` : ''}

        ${tagsHtml ? `<footer style="margin-top: 30px;"><p><strong>Tags:</strong> ${tagsHtml}</p></footer>` : ''}
      </article>
    `;

    $('#root').html(preRenderedHtml);

    // 4. Adjust relative paths in <script> and <link> tags
    // Since /map/{id}/index.html is 2 levels deep, replace relative paths like "./assets/" with "../../assets/"
    $('link[href], script[src], img[src]').each((_, el) => {
      const attr = el.name === 'link' ? 'href' : 'src';
      const val = $(el).attr(attr);
      if (val && !val.startsWith('http') && !val.startsWith('//') && !val.startsWith('data:')) {
        if (val.startsWith('./')) {
          $(el).attr(attr, '../../' + val.slice(2));
        } else if (!val.startsWith('/') && !val.startsWith('../')) {
          $(el).attr(attr, '../../' + val);
        }
      }
    });

    const finalHtml = $.html();
    fs.writeFileSync(path.join(mapDir, 'index.html'), finalHtml, 'utf8');
    generatedCount++;
  });

  console.log(`✅ Generated ${generatedCount} static map pages in dist/map/`);

  // 5. Generate Sitemap XML
  const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapUrls.map(item => `  <url>
    <loc>${escapeHtml(item.url)}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemapXml, 'utf8');
  console.log('✅ Generated dist/sitemap.xml');

  // 6. Generate Robots.txt
  const robotsTxt = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;
  fs.writeFileSync(path.join(DIST_DIR, 'robots.txt'), robotsTxt, 'utf8');
  console.log('✅ Generated dist/robots.txt');

  // 7. Copy index.html as 404.html for GitHub Pages SPA Fallback
  fs.copyFileSync(templatePath, path.join(DIST_DIR, '404.html'));
  console.log('✅ Created dist/404.html for SPA fallback');

  console.log('🎉 Static Page Generation completed successfully!');
}

run();
