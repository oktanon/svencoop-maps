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

    // 3. Pre-render Static Body Content for Search Engine Crawlers (matching MapPageView)
    const bspListHtml = map.bsp_names?.length
      ? `<div class="sidebar-card bsp-card">
          <h3 class="sidebar-card-title">Console Commands</h3>
          <div class="bsp-commands-list">
            ${map.bsp_names.map(bsp => `<div class="bsp-command-item"><code class="bsp-code">map ${escapeHtml(bsp)}</code></div>`).join('')}
          </div>
        </div>`
      : '';

    const downloadLinksHtml = map.download_links?.length
      ? map.download_links.map(dl => `<a href="${escapeHtml(dl.url)}" target="_blank" rel="nofollow noopener" class="download-link-btn"><div class="download-btn-content"><span class="dl-name">${escapeHtml(dl.name)}</span> <span class="dl-badge">${escapeHtml(dl.type)}</span></div></a>`).join('')
      : '<p class="no-content-text">No download links available.</p>';

    const tagsHtml = map.tags?.length
      ? map.tags.map(t => `<span class="tag-badge">#${escapeHtml(t)}</span>`).join(' ')
      : '';

    const preRenderedHtml = `
      <div class="map-page-wrapper">
        <header class="map-page-nav-header">
          <div class="map-page-header-container">
            <a href="../../" class="btn btn-back" style="text-decoration: none;">← Volver a la lista de mapas</a>
            <div class="map-page-brand">
              <span class="brand-name">Sven Co-Op Maps</span>
            </div>
          </div>
        </header>

        <div class="map-page-content-container">
          <nav class="map-breadcrumb">
            <a href="../../" class="breadcrumb-link" style="color: var(--text-secondary); text-decoration: none;">Inicio</a>
            <span class="breadcrumb-separator">/</span>
            <a href="../../" class="breadcrumb-link" style="color: var(--text-secondary); text-decoration: none;">Mapas</a>
            <span class="breadcrumb-separator">/</span>
            <span class="breadcrumb-current">${escapeHtml(map.title)}</span>
          </nav>

          <div class="map-page-grid">
            <main class="map-page-main">
              <div class="map-gallery-card">
                <div class="gallery-main-view">
                  ${imageUrl ? `<img src="${escapeHtml(imageUrl)}" alt="${escapeHtml(map.title)}" class="gallery-active-image" />` : '<div class="gallery-placeholder">No Image Available</div>'}
                </div>
              </div>

              ${map.description ? `
                <section class="map-section-card">
                  <h2 class="section-title">Descripción</h2>
                  <div class="map-description-content">${map.description}</div>
                </section>
              ` : ''}

              ${map.additional_info ? `
                <section class="map-section-card">
                  <h2 class="section-title">Información Adicional</h2>
                  <div class="map-description-content">${map.additional_info}</div>
                </section>
              ` : ''}
            </main>

            <aside class="map-page-sidebar">
              <div class="sidebar-card main-info-card">
                <h1 class="map-title-heading">${escapeHtml(map.title)}</h1>
                <div class="specs-list">
                  <div class="spec-item"><span class="spec-label">Mapper:</span> <span class="spec-value">${escapeHtml(map.author || 'Unknown')}</span></div>
                  <div class="spec-item"><span class="spec-label">Rating:</span> <span class="spec-value">⭐ ${map.rating || 0}/5 (${map.votes || 0} votos)</span></div>
                  ${map.year ? `<div class="spec-item"><span class="spec-label">Año:</span> <span class="spec-value">${map.year}</span></div>` : ''}
                  ${map.difficulty ? `<div class="spec-item"><span class="spec-label">Dificultad:</span> <span class="spec-value">${escapeHtml(map.difficulty)}</span></div>` : ''}
                  ${map.size ? `<div class="spec-item"><span class="spec-label">Tamaño:</span> <span class="spec-value">${escapeHtml(map.size)}</span></div>` : ''}
                </div>
              </div>

              <div class="sidebar-card download-card">
                <h3 class="sidebar-card-title">Descargar Mapa</h3>
                <div class="download-links-list">${downloadLinksHtml}</div>
              </div>

              ${bspListHtml}

              ${tagsHtml ? `
                <div class="sidebar-card tags-card">
                  <h3 class="sidebar-card-title">Tags</h3>
                  <div class="tags-flex">${tagsHtml}</div>
                </div>
              ` : ''}
            </aside>
          </div>
        </div>
      </div>
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
