#!/usr/bin/env node
// Generate 1200×630 OG-images per episode (Variant C — rust-banner nederst).
// Idempotent: skips episodes whose title/cover hasn't changed since last run.
// Output: og/{slug}.png + og/manifest.json
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import puppeteer from 'puppeteer';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const EPISODES_PATH = path.join(ROOT, 'episodes.json');
const OG_DIR = path.join(ROOT, 'og');
const MANIFEST_PATH = path.join(OG_DIR, 'manifest.json');

const FORCE = process.argv.includes('--force');

function epHash(ep) {
  return crypto
    .createHash('sha1')
    .update(JSON.stringify({
      title: ep.title,
      n: ep.n,
      season: seasonFromDate(ep.pubDate || ep.date),
      cover: ep.imageUrl || '',
      template: 'v1',
    }))
    .digest('hex')
    .slice(0, 12);
}

function seasonFromDate(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.max(1, d.getFullYear() - 2024);
}

function escapeHtml(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Italicize the guest name in titles like "Susanne Todnem om …" or "Ane Hagen bygde …"
// We don't try to be too clever — just bold the first proper-noun pair after a colon.
function styleTitle(rawTitle) {
  let t = escapeHtml(rawTitle);
  // Pattern: ": <First Last> <verb/preposition>" — italicize the name
  t = t.replace(/(:\s*)([A-ZÆØÅ][a-zæøå]+(?:\s+[A-ZÆØÅ][a-zæøå]+)?)(\s+(?:om|bygde|deler|forteller|gikk|valgte|på|som|og|med|i|–))/,
    '$1<em>$2</em>$3');
  return t;
}

function buildHtml(ep) {
  const epNum = ep.n ? `Episode ${String(ep.n).padStart(2,'0')}` : 'Velkommen';
  const season = seasonFromDate(ep.pubDate || ep.date);
  const kicker = ep.n && season
    ? `${epNum} · Sesong ${String(season).padStart(2,'0')}`
    : epNum;
  const titleHtml = styleTitle(ep.title);
  const cover = ep.imageUrl || '';

  return `<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,500&family=Montserrat:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --cream:        #F4F2EF;
    --cream-deep:   #E8E4DC;
    --ink:          #303030;
    --brown:        #503D30;
    --yellow:       #FFCC00;
    --rust:         #A0522D;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 1200px; height: 630px; overflow: hidden; background: var(--cream); }
  body {
    font-family: 'Montserrat', system-ui, sans-serif;
    color: var(--ink);
  }
  .og {
    width: 1200px;
    height: 630px;
    background: var(--cream);
    display: grid;
    grid-template-rows: 1fr auto;
  }
  .og__main {
    padding: 60px 80px 40px;
    display: grid;
    grid-template-columns: 1fr 360px;
    gap: 60px;
    align-items: center;
  }
  .og__text {
    display: flex;
    flex-direction: column;
    gap: 20px;
    min-width: 0;
  }
  .og__kicker {
    font-family: 'Montserrat', system-ui, sans-serif;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    color: var(--rust);
  }
  .og__title {
    font-family: 'Cormorant Garamond', 'Times New Roman', serif;
    font-size: 64px;
    line-height: 1.02;
    color: var(--ink);
    font-weight: 500;
    letter-spacing: -0.015em;
    /* tittel kan være lang — skalér ned hvis nødvendig via JS */
  }
  /* Titler over ~60 tegn: mindre font automatisk */
  .og__title.is-long { font-size: 52px; line-height: 1.04; }
  .og__title.is-vlong { font-size: 44px; line-height: 1.06; }
  .og__title em {
    font-style: italic;
    color: var(--rust);
  }
  .og__cover {
    width: 360px;
    height: 360px;
    background: var(--brown);
    border-radius: 4px;
    overflow: hidden;
    box-shadow: 0 8px 24px rgba(48,40,30,.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--cream);
    font-family: 'Cormorant Garamond', serif;
    font-size: 56px;
    font-style: italic;
  }
  .og__cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .og__band {
    background: var(--rust);
    color: var(--cream);
    padding: 28px 80px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .og__band-brand {
    font-family: 'Cormorant Garamond', serif;
    font-size: 28px;
    font-weight: 500;
    letter-spacing: -0.01em;
  }
  .og__band-brand em {
    font-style: italic;
    color: var(--yellow);
  }
  .og__band-cta {
    font-family: 'Montserrat', system-ui, sans-serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.2em;
    text-transform: uppercase;
  }
</style>
</head>
<body>
<div class="og">
  <div class="og__main">
    <div class="og__text">
      <div class="og__kicker">${escapeHtml(kicker)}</div>
      <h1 class="og__title" id="title">${titleHtml}</h1>
    </div>
    <div class="og__cover">
      ${cover ? `<img src="${escapeHtml(cover)}" alt="" />` : 'HC'}
    </div>
  </div>
  <div class="og__band">
    <div class="og__band-brand">The <em>Edit</em> · med Hege Christine</div>
    <div class="og__band-cta">podcast.hegechristine.no</div>
  </div>
</div>
<script>
  // Auto-skalering: hvis tittel-blokken er høyere enn boksen tillater, skru ned font.
  const t = document.getElementById('title');
  const len = t.textContent.length;
  if (len > 80) t.classList.add('is-vlong');
  else if (len > 55) t.classList.add('is-long');
</script>
</body>
</html>`;
}

async function loadManifest() {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function main() {
  const raw = await fs.readFile(EPISODES_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  const episodes = Array.isArray(parsed) ? parsed : (parsed.episodes || []);

  await fs.mkdir(OG_DIR, { recursive: true });
  const manifest = FORCE ? {} : await loadManifest();
  const newManifest = {};

  // Determine work
  const todo = [];
  for (const ep of episodes) {
    const slug = ep.slug;
    if (!slug) continue;
    const hash = epHash(ep);
    newManifest[slug] = hash;
    const png = path.join(OG_DIR, `${slug}.png`);
    let needsBuild = FORCE || manifest[slug] !== hash;
    if (!needsBuild) {
      try { await fs.access(png); } catch { needsBuild = true; }
    }
    if (needsBuild) todo.push(ep);
  }

  if (todo.length === 0) {
    console.log('All OG-images up to date — skipping.');
    // Still rewrite manifest in case episode list changed
    await fs.writeFile(MANIFEST_PATH, JSON.stringify(newManifest, null, 2) + '\n');
    return;
  }

  console.log(`Generating ${todo.length} OG-image(s) (of ${episodes.length} total)...`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });

    for (const ep of todo) {
      const html = buildHtml(ep);
      await page.setContent(html, { waitUntil: 'load', timeout: 30000 });
      // Vent på fonts + alle bilder (decode eller error — vi vil ikke henge for evig)
      await page.evaluate(async () => {
        await document.fonts.ready;
        const imgs = Array.from(document.images);
        await Promise.all(imgs.map(img => {
          if (img.complete && img.naturalWidth > 0) return null;
          return new Promise(resolve => {
            const done = () => resolve();
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
            // Hard cap per image
            setTimeout(done, 8000);
          });
        }));
      });
      const out = path.join(OG_DIR, `${ep.slug}.png`);
      await page.screenshot({ path: out, type: 'png', clip: { x: 0, y: 0, width: 1200, height: 630 } });
      console.log(`  ✓ ${ep.slug}.png`);
    }
  } finally {
    await browser.close();
  }

  // Clean up stale PNGs (episodes that no longer exist)
  const existing = await fs.readdir(OG_DIR);
  const knownSlugs = new Set(episodes.map(e => e.slug).filter(Boolean));
  for (const f of existing) {
    if (f.endsWith('.png')) {
      const slug = f.replace(/\.png$/, '');
      if (!knownSlugs.has(slug)) {
        await fs.unlink(path.join(OG_DIR, f));
        console.log(`  ✕ removed stale ${f}`);
      }
    }
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(newManifest, null, 2) + '\n');
  console.log(`✓ Done. Manifest written.`);
}

main().catch(err => { console.error(err); process.exit(1); });
