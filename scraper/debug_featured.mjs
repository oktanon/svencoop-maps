// Debug script - run from project root
const cheerio = await import('cheerio');
const fs = await import('fs');

const html = await (await fetch('https://scmapdb.wikidot.com/tag:featured')).text();
const $ = cheerio.load(html);
const ids = [];
$('.lister-container-tags-map-small .list-pages-item').each((i, el) => {
  const a = $(el).find('.lister-item-title a');
  const href = a.attr('href') || '';
  const id = href.replace('/map:', '').trim();
  ids.push(id);
});
console.log('Featured IDs:', JSON.stringify(ids));

// Check against maps data  
const maps = JSON.parse(fs.readFileSync('./public/maps_data.json', 'utf8'));
const mapIds = new Set(maps.map(m => m.id));
const matches = ids.filter(id => mapIds.has(id));
const misses = ids.filter(id => !mapIds.has(id));
console.log(`\nMatches: ${matches.length}`, matches);
console.log(`Misses: ${misses.length}`, misses);
