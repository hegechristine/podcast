#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE = 'https://podcast.hegechristine.no';
const ROOT = resolve(import.meta.dirname, '..', '..');

const data = JSON.parse(readFileSync(resolve(ROOT, 'episodes.json'), 'utf8'));
const episodes = Array.isArray(data) ? data : data.episodes ?? [];
const channelUpdated = data.updatedAt ?? new Date().toISOString();

const isoDate = (s) => {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d) ? null : d.toISOString().slice(0, 10);
};

const urls = [
  { loc: `${SITE}/`, lastmod: isoDate(channelUpdated), changefreq: 'weekly', priority: '1.0' },
  { loc: `${SITE}/velkommen/`, changefreq: 'monthly', priority: '0.6' },
];

for (const ep of episodes) {
  if (!ep.slug) continue;
  urls.push({
    loc: `${SITE}/${ep.slug}/`,
    lastmod: isoDate(ep.pubDate),
    changefreq: 'monthly',
    priority: '0.8',
  });
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map(u => `  <url>
    <loc>${u.loc}</loc>${u.lastmod ? `\n    <lastmod>${u.lastmod}</lastmod>` : ''}
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

writeFileSync(resolve(ROOT, 'sitemap.xml'), xml);
console.log(`Wrote sitemap.xml with ${urls.length} URLs`);
