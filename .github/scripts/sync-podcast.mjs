#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { XMLParser } from 'fast-xml-parser';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CONFIG_PATH = path.join(ROOT, 'feed.config.json');
const OUTPUT_PATH = path.join(ROOT, 'episodes.json');

const config = JSON.parse(await fs.readFile(CONFIG_PATH, 'utf-8'));

if (!config.rssUrl || config.rssUrl.startsWith('REPLACE_')) {
  console.log('No RSS URL configured. Update feed.config.json');
  process.exit(0);
}

console.log(`Fetching ${config.rssUrl}...`);
const res = await fetch(config.rssUrl, {
  headers: { 'User-Agent': 'hegechristine.github.io podcast sync' },
});
if (!res.ok) {
  console.error(`Fetch failed: ${res.status} ${res.statusText}`);
  process.exit(1);
}
const xml = await res.text();

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  cdataPropName: '_cdata',
  parseAttributeValue: false,
  trimValues: true,
  processEntities: false,
});

const data = parser.parse(xml);
const channel = data?.rss?.channel;
if (!channel) {
  console.error('No <channel> found in RSS');
  process.exit(1);
}

const items = Array.isArray(channel.item) ? channel.item : (channel.item ? [channel.item] : []);
console.log(`Found ${items.length} items`);

function getText(node) {
  if (node === undefined || node === null) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (node._cdata) return Array.isArray(node._cdata) ? node._cdata.join('') : node._cdata;
  if (node._text) return String(node._text);
  return '';
}

function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[⁠​-‍﻿]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Behold HTML, fjern bare farlige tags + sett alle lenker til target=_blank.
// Konverter dash-only avsnitt til <hr>.
function sanitizeHtml(html) {
  if (!html) return '';
  let out = html
    // Fjern usikre tagger
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    // Fjern usynlige tegn (zero-width)
    .replace(/[⁠​-‍﻿]/g, '')
    // Konverter dash-paragrafer til <hr>
    .replace(/<p>\s*<strong>\s*-{4,}\s*<\/strong>\s*<\/p>/g, '<hr>')
    .replace(/<p>\s*-{4,}\s*<\/p>/g, '<hr>')
    // Sørg for target=_blank på lenker (la det stå hvis allerede satt)
    .replace(/<a\s+([^>]*?)>/gi, (m, attrs) => {
      if (/target\s*=/.test(attrs)) return m;
      return `<a ${attrs} target="_blank" rel="noopener noreferrer">`;
    });
  return out.trim();
}

function shortDesc(html, maxLen = 220) {
  const text = stripHtml(html);
  if (text.length <= maxLen) return text;
  const cut = text.slice(0, maxLen).replace(/\s+\S*$/, '');
  return cut + '…';
}

function parseEpisodeNumber(title) {
  const m = title.match(/^(\d+)\s*[-–—.:]/);
  return m ? parseInt(m[1], 10) : null;
}

function cleanTitle(title) {
  return title.replace(/^\d+\s*[-–—.:]\s*/, '').trim();
}

function parseDuration(d) {
  if (!d) return { display: '', seconds: 0 };
  const str = String(d).trim();
  if (/^\d+$/.test(str)) {
    const total = parseInt(str, 10);
    return { display: formatDuration(total), seconds: total };
  }
  const parts = str.split(':').map(p => parseInt(p, 10));
  let seconds = 0;
  if (parts.length === 3) seconds = parts[0] * 3600 + parts[1] * 60 + parts[2];
  else if (parts.length === 2) seconds = parts[0] * 60 + parts[1];
  return { display: formatDuration(seconds), seconds };
}

function formatDuration(s) {
  if (!s) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}t ${m}m`;
  return `${m} min`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  const months = ['jan.', 'feb.', 'mar.', 'apr.', 'mai', 'jun.', 'jul.', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
  return `${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function isNew(dateStr, days = 14) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return false;
  return (Date.now() - d.getTime()) < days * 24 * 60 * 60 * 1000;
}

function detectGuest(title) {
  // Match "Fornavn Etternavn (Mellomnavn) om..." — krever minst to ord som starter med stor bokstav
  // Slik at "Hva om..." (solo-episode) IKKE matcher, men "Vetle Valsgård om..." gjør
  const m = title.match(/\b([A-ZÆØÅ][a-zæøåA-ZÆØÅ.\-]+(?:\s+[A-ZÆØÅ][a-zæøåA-ZÆØÅ.\-]+)+)\s+om\b/);
  if (m) return m[1].trim();
  return null;
}

const episodes = items.map((item, idx) => {
  const rawTitle = getText(item.title);
  const description = getText(item.description) || getText(item['itunes:summary']);
  const epNumFromTitle = parseEpisodeNumber(rawTitle);
  const dur = parseDuration(item['itunes:duration']);
  const guid = getText(item.guid);
  const pubDate = getText(item.pubDate);
  const audioUrl = item.enclosure?.url || '';
  const episodeUrl = getText(item.link);
  const imageUrl = item['itunes:image']?.href || channel['itunes:image']?.href || '';

  return {
    id: guid || `ep-${idx}`,
    n: epNumFromTitle, // null hvis ingen nummer i tittel (typisk trailer)
    title: cleanTitle(rawTitle),
    rawTitle,
    desc: shortDesc(description),
    fullDesc: stripHtml(description),
    descriptionHtml: sanitizeHtml(description),
    date: formatDate(pubDate),
    pubDate,
    isNew: isNew(pubDate),
    dur: dur.display,
    durationSeconds: dur.seconds,
    audioUrl,
    episodeUrl,
    imageUrl,
    season: getText(item['itunes:season']),
    episode: getText(item['itunes:episode']),
    guest: (() => {
      const override = config.guestOverrides?.[String(epNumFromTitle)];
      if (override !== undefined) return override || null;
      return detectGuest(rawTitle);
    })(),
    type: 'samtale',
  };
});

// Hent Apple Podcasts per-episode-URLer via iTunes Lookup API (gratis, no auth)
async function fetchAppleEpisodeUrls(showId) {
  if (!showId) return new Map();
  try {
    const url = `https://itunes.apple.com/lookup?id=${encodeURIComponent(showId)}&entity=podcastEpisode&limit=200`;
    const res = await fetch(url, { headers: { 'User-Agent': 'hegechristine.github.io podcast sync' } });
    if (!res.ok) {
      console.warn(`iTunes Lookup failed: ${res.status}`);
      return new Map();
    }
    const data = await res.json();
    const eps = (data.results || []).filter(r => r.wrapperType === 'podcastEpisode' || r.kind === 'podcast-episode');
    // Map by lowercased trackName
    const map = new Map();
    for (const e of eps) {
      if (e.trackName && e.trackViewUrl) {
        map.set(e.trackName.trim().toLowerCase(), e.trackViewUrl);
      }
    }
    console.log(`iTunes Lookup: ${map.size} episodes matched`);
    return map;
  } catch (err) {
    console.warn('iTunes Lookup error:', err.message);
    return new Map();
  }
}

const appleMap = await fetchAppleEpisodeUrls(config.appleShowId);
for (const ep of episodes) {
  const key = ep.rawTitle.trim().toLowerCase();
  ep.appleEpisodeUrl = appleMap.get(key) || '';
}

const output = {
  updatedAt: new Date().toISOString(),
  channel: {
    title: getText(channel.title),
    description: stripHtml(getText(channel.description)),
    imageUrl: channel['itunes:image']?.href || channel.image?.url || '',
    spotifyShowUrl: config.spotifyShowUrl || '',
    appleShowUrl: config.appleShowUrl || '',
    rssUrl: config.rssUrl,
    episodeCount: episodes.length,
    author: getText(channel['itunes:author']) || getText(channel['dc:creator']),
    stats: config.stats || {},
  },
  episodes: episodes.slice(0, config.maxEpisodes || 50),
};

await fs.writeFile(OUTPUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf-8');
console.log(`✓ Wrote ${output.episodes.length} episodes to ${path.relative(ROOT, OUTPUT_PATH)}`);
