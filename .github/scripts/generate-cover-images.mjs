#!/usr/bin/env node
// Download episode cover-art from Anchor's cloudfront (3000×3000 originals,
// ~900 KB each) and resize to local WebP at sizes we actually display.
// Outputs:
//   covers/{slug}-thumb.webp   400×400  — listing thumbnails (display 70 px)
//   covers/{slug}.webp        1200×1200 — featured + episode hero (display ≤620 px)
// Idempotent via covers/manifest.json (hash of imageUrl).
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const EPISODES_PATH = path.join(ROOT, 'episodes.json');
const COVERS_DIR = path.join(ROOT, 'covers');
const MANIFEST_PATH = path.join(COVERS_DIR, 'manifest.json');

const FORCE = process.argv.includes('--force');

const SIZES = [
  { suffix: '-thumb', size: 400, quality: 78 },
  { suffix: '',        size: 1200, quality: 82 },
];

function urlHash(url) {
  return crypto.createHash('sha1').update(url || '').digest('hex').slice(0, 12);
}

async function loadManifest() {
  try {
    return JSON.parse(await fs.readFile(MANIFEST_PATH, 'utf-8'));
  } catch {
    return {};
  }
}

async function fetchBuffer(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const raw = await fs.readFile(EPISODES_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  const episodes = Array.isArray(parsed) ? parsed : (parsed.episodes || []);

  await fs.mkdir(COVERS_DIR, { recursive: true });
  const manifest = FORCE ? {} : await loadManifest();
  const newManifest = {};

  const todo = [];
  for (const ep of episodes) {
    if (!ep.slug || !ep.imageUrl) continue;
    const hash = urlHash(ep.imageUrl);
    newManifest[ep.slug] = hash;

    let needsBuild = FORCE || manifest[ep.slug] !== hash;
    if (!needsBuild) {
      // Hash matched — but check files actually exist (manifest can drift)
      for (const { suffix } of SIZES) {
        try { await fs.access(path.join(COVERS_DIR, `${ep.slug}${suffix}.webp`)); }
        catch { needsBuild = true; break; }
      }
    }
    if (needsBuild) todo.push(ep);
  }

  if (todo.length === 0) {
    console.log('All cover-images up to date.');
  } else {
    console.log(`Generating cover-images for ${todo.length} episode(s)...`);
  }

  for (const ep of todo) {
    try {
      const orig = await fetchBuffer(ep.imageUrl);
      for (const { suffix, size, quality } of SIZES) {
        const out = path.join(COVERS_DIR, `${ep.slug}${suffix}.webp`);
        await sharp(orig)
          .resize(size, size, { fit: 'cover' })
          .webp({ quality, effort: 5 })
          .toFile(out);
      }
      console.log(`  ✓ ${ep.slug} (thumb + full)`);
    } catch (err) {
      console.error(`  ✕ ${ep.slug}: ${err.message}`);
      // Don't update manifest entry on failure — will retry next run
      delete newManifest[ep.slug];
    }
  }

  // Clean up stale files (episodes that no longer exist)
  const existing = await fs.readdir(COVERS_DIR);
  const knownSlugs = new Set(episodes.map(e => e.slug).filter(Boolean));
  for (const f of existing) {
    if (!f.endsWith('.webp')) continue;
    if (f === '_latest.webp') continue;
    const slug = f.replace(/(-thumb)?\.webp$/, '');
    if (!knownSlugs.has(slug)) {
      await fs.unlink(path.join(COVERS_DIR, f));
      console.log(`  ✕ removed stale ${f}`);
    }
  }

  // Copy latest episode's cover to _latest.webp so the hub page can statically
  // preload it (LCP discovery — browser fetches before JS runs and finds the slug).
  const latest = episodes
    .filter(e => e.slug && e.imageUrl && e.n)
    .sort((a, b) => (b.n || 0) - (a.n || 0))[0];
  if (latest) {
    const src = path.join(COVERS_DIR, `${latest.slug}.webp`);
    const dst = path.join(COVERS_DIR, '_latest.webp');
    try {
      await fs.copyFile(src, dst);
      console.log(`  ✓ _latest.webp -> ${latest.slug}`);
    } catch (err) {
      console.warn(`  ! could not refresh _latest.webp: ${err.message}`);
    }
  }

  await fs.writeFile(MANIFEST_PATH, JSON.stringify(newManifest, null, 2) + '\n');
  console.log(`✓ Done. Manifest written.`);
}

main().catch(err => { console.error(err); process.exit(1); });
