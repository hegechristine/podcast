#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const EPISODES_PATH = path.join(ROOT, 'episodes.json');
const CAMPAIGN_PATH = path.join(ROOT, 'data', 'campaign.json');

const SHOW = {
  title: 'The Edit',
  host: 'Hege Christine',
  hostBio: 'Online business strategist, mentor og tech founder. Hjelper gründere bygge en business som faktisk passer livet de vil leve.',
  showAbout: 'Podkasten for deg som vil bygge en business som passer livet du vil leve — uten at alt hviler på deg. Praktiske strategier, ærlige refleksjoner og dypere samtaler.',
  spotifyShow: 'https://open.spotify.com/show/286EpL6ZfSuJVB47nXSQbZ',
  appleShow: 'https://podcasts.apple.com/us/podcast/the-edit/id1857930330',
  rssUrl: 'https://anchor.fm/s/4f734584/podcast/rss',
  hostPhoto: '/assets/hege-portrait.jpg',
  newsletterFormId: '349307',
  newsletterEmbedUrl: 'https://www.hegechristine.no/forms/349307/embed.js',
};

const NORWEGIAN_MAP = { 'æ':'ae','ø':'o','å':'a','Æ':'ae','Ø':'o','Å':'a' };
function slugify(s) {
  return s
    .toLowerCase()
    .replace(/[æøå]/gi, c => NORWEGIAN_MAP[c] || c)
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
    .replace(/-+$/g, '');
}

function escHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escAttr(s) { return escHtml(s); }

function episodeSlug(ep) {
  if (!ep.n) return 'velkommen';
  const num = String(ep.n).padStart(3, '0');
  const titleSlug = slugify(ep.title || '');
  return `episode-${num}-${titleSlug}`;
}

// Parse the sanitized show-notes HTML from Anchor into structured sections.
// Anchor splits sections with <hr>, identifies them by heading keyword, and
// includes real <a href> tags inside each item — so we read URLs directly from
// the RSS instead of guessing.
function parseShowNotes(descriptionHtml, fullDescFallback) {
  const empty = { hook: '', guest: null, resources: [], hostSection: null, disclaimer: null };
  if (!descriptionHtml) {
    // Fallback to plain-text parsing if HTML not available
    if (fullDescFallback) return parseShowNotesPlainText(fullDescFallback);
    return empty;
  }

  // Split on <hr> (with optional whitespace/attributes)
  const sections = descriptionHtml.split(/<hr\s*\/?\s*>/i).map(s => s.trim()).filter(Boolean);
  if (sections.length === 0) return empty;

  const result = { ...empty };

  // First section is hook/intro — strip HTML for rendering
  result.hook = htmlToText(sections[0]);

  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    const firstHeading = (htmlToText(sec).split('\n')[0] || '').toLowerCase();

    if (/gjest:/i.test(firstHeading)) {
      result.guest = parseGuestFromHtml(sec);
    } else if (/ressurser|lenker\s*&\s*ressurser|^lenker\b|lenker og ressurser/i.test(firstHeading)) {
      result.resources = parseResourcesFromHtml(sec);
    } else if (/bli bedre kjent med hege/i.test(firstHeading)) {
      result.hostSection = sec;
    } else if (/disclaimer/i.test(firstHeading)) {
      result.disclaimer = sec;
    }
  }

  return result;
}

// Strip tags and decode common entities; preserve paragraph breaks as \n\n
function htmlToText(html) {
  if (!html) return '';
  return html
    .replace(/<\/p>\s*<p[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[⁠​-‍﻿]/g, '') // zero-width chars
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function normalizeHref(raw) {
  if (!raw) return null;
  const t = raw.trim();
  if (/^(https?:|mailto:|tel:)/i.test(t)) return t;
  return `https://${t.replace(/^\/+/, '')}`;
}

// Match each <p>…</p> inside the section
function paragraphsOf(sectionHtml) {
  const m = sectionHtml.match(/<p[^>]*>[\s\S]*?<\/p>/gi);
  return m || [];
}

function parseResourcesFromHtml(sec) {
  const out = [];
  for (const p of paragraphsOf(sec)) {
    const text = htmlToText(p).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    // Skip the heading paragraph ("Ressurser:" etc.)
    if (/^(ressurser|lenker)/i.test(text) && text.length < 30) continue;

    // Extract first emoji (any non-ASCII character at start)
    const emojiMatch = text.match(/^(\S)/);
    const emoji = emojiMatch ? emojiMatch[1] : '';

    // Find first <a href> in the paragraph
    const aMatch = p.match(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (aMatch) {
      const href = normalizeHref(aMatch[1]);
      const linkText = htmlToText(aMatch[2]).trim();
      out.push({ emoji, text: linkText || text.replace(/^\S\s*/, '').trim(), href });
    } else {
      // No link present — keep the item but href stays null
      out.push({ emoji, text: text.replace(/^\S\s*/, '').trim(), href: null });
    }
  }
  // Filter out:
  // - Kajabi-related items (Kajabi has its own block in the campaign sidebar)
  // - Hege's own social links (the host block already shows these statically)
  return out.filter(r => {
    if (/kajabi/i.test(r.text)) return false;
    const href = (r.href || '').toLowerCase();
    if (/hegechristine\.no/.test(href)) return false;
    if (/instagram\.com\/hegechristine/.test(href)) return false;
    if (/linkedin\.com\/in\/hegechristine/.test(href)) return false;
    if (/facebook\.com\/groups\/strategisksalg/.test(href)) return false;
    if (/youtube\.com\/@hegechristine/.test(href)) return false;
    return true;
  });
}

function parseGuestFromHtml(sec) {
  // Heading paragraph contains "Gjest: <Name>"
  let name = '';
  const headingPara = paragraphsOf(sec)[0] || '';
  const headingText = htmlToText(headingPara);
  const nameMatch = headingText.match(/Gjest:\s*([^\n]+)/i);
  if (nameMatch) name = nameMatch[1].trim();

  // Each subsequent paragraph: "📸 Instagram: <a href>handle</a>"
  const links = [];
  const labelMap = {
    'instagram': 'Instagram',
    'linkedin': 'LinkedIn',
    'facebook': 'Facebook',
    'nettside': 'Nettside',
    'youtube': 'YouTube',
    'tiktok': 'TikTok',
  };

  for (const p of paragraphsOf(sec).slice(1)) {
    const text = htmlToText(p).replace(/\s+/g, ' ').trim();
    if (!text) continue;
    const emojiMatch = text.match(/^(\S)/);
    const emoji = emojiMatch ? emojiMatch[1] : '';
    const labelMatch = text.match(/^\S\s*([A-Za-zÆØÅæøå-]+)\s*:/);
    const labelKey = (labelMatch ? labelMatch[1] : '').toLowerCase();
    const label = labelMap[labelKey] || (labelMatch ? labelMatch[1] : '');

    const aMatch = p.match(/<a\s+[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (aMatch) {
      const href = normalizeHref(aMatch[1]);
      const value = htmlToText(aMatch[2]).trim();
      links.push({ emoji, label, value, href });
    }
  }

  return { name, links };
}

// Plain-text fallback (legacy) — only used if descriptionHtml is missing
function parseShowNotesPlainText(fullDesc) {
  const sections = fullDesc.split(/\s*-{10,}\s*/).map(s => s.trim()).filter(Boolean);
  const result = { hook: '', guest: null, resources: [], hostSection: null, disclaimer: null };
  if (sections.length === 0) return result;
  result.hook = sections[0];
  for (let i = 1; i < sections.length; i++) {
    const sec = sections[i];
    const firstLine = sec.split('\n')[0].toLowerCase();
    if (/gjest:/i.test(firstLine)) result.guest = parseGuestSection(sec);
  }
  return result;
}

function parseGuestSection(sec) {
  // Format: "🎙️ Gjest: Vetle Valsgård 📸 Instagram: @sjekkregnskapet 💼 LinkedIn: ..."
  // Extract the name after "Gjest:" and links by emoji prefix
  const cleaned = sec.replace(/\s+/g, ' ').trim();
  const nameMatch = cleaned.match(/Gjest:\s*([^📸💼💬🌐📲🎙️]+)/i);
  const name = nameMatch ? nameMatch[1].trim() : '';

  const links = [];
  const linkPatterns = [
    { emoji: '📸', label: 'Instagram', regex: /📸\s*Instagram:\s*([^📸💼💬🌐📲]+)/ },
    { emoji: '💼', label: 'LinkedIn', regex: /💼\s*LinkedIn:\s*([^📸💼💬🌐📲]+)/ },
    { emoji: '💬', label: 'Facebook', regex: /💬\s*Facebook:\s*([^📸💼💬🌐📲]+)/ },
    { emoji: '🌐', label: 'Nettside', regex: /🌐\s*Nettside:\s*([^📸💼💬🌐📲]+)/ },
    { emoji: '📲', label: 'YouTube', regex: /📲\s*YouTube:\s*([^📸💼💬🌐📲]+)/ },
  ];

  for (const { emoji, label, regex } of linkPatterns) {
    const m = cleaned.match(regex);
    if (m) {
      const value = m[1].trim().replace(/\s+/g, ' ');
      links.push({ emoji, label, value, href: makeLinkHref(label, value) });
    }
  }

  return { name, links };
}

function makeLinkHref(label, value) {
  const v = value.trim();
  if (label === 'Instagram') {
    const handle = v.replace(/^@/, '');
    return `https://instagram.com/${handle}`;
  }
  if (label === 'LinkedIn') {
    // Could be a name or handle — wrap in search if not URL
    if (/^https?:/.test(v)) return v;
    if (v.startsWith('@')) return `https://linkedin.com/in/${v.slice(1)}`;
    return `https://linkedin.com/in/${slugify(v)}`;
  }
  if (label === 'Facebook') {
    if (/^https?:/.test(v)) return v;
    return `https://facebook.com/${v.replace(/\s+/g, '')}`;
  }
  if (label === 'Nettside') {
    if (/^https?:/.test(v)) return v;
    return `https://${v.replace(/^\/+/, '')}`;
  }
  if (label === 'YouTube') {
    const handle = v.replace(/^@/, '');
    return `https://youtube.com/@${handle}`;
  }
  return '#';
}

function formatDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('nb-NO', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return iso; }
}

function formatDuration(seconds) {
  if (!seconds) return '';
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

function paragraphize(text) {
  if (!text) return '';

  // First try splitting on explicit paragraph breaks (double newline or 2+ spaces after period)
  let paragraphs = text
    .split(/\n{2,}|(?<=[.!?])\s{2,}/)
    .map(p => p.trim())
    .filter(Boolean);

  // If we ended up with one giant paragraph (no explicit breaks in the source),
  // split into sentences and group ~3 sentences per paragraph for readability.
  if (paragraphs.length === 1 && paragraphs[0].length > 400) {
    const sentences = paragraphs[0].match(/[^.!?]+[.!?]+(\s|$)/g) || [paragraphs[0]];
    paragraphs = [];
    for (let i = 0; i < sentences.length; i += 3) {
      paragraphs.push(sentences.slice(i, i + 3).join(' ').trim());
    }
  }

  return paragraphs.map(p => `<p>${escHtml(p)}</p>`).join('\n');
}

async function loadCampaign() {
  try {
    const raw = await fs.readFile(CAMPAIGN_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function renderEpisode(ep, campaign, allEpisodes) {
  const related = (allEpisodes || [])
    .filter(e => e.slug && e.slug !== ep.slug && e.n)
    .sort((a, b) => (b.n || 0) - (a.n || 0))
    .slice(0, 3);

  const slug = episodeSlug(ep);
  const parsed = parseShowNotes(ep.descriptionHtml || '', ep.fullDesc || ep.desc || '');
  const date = formatDate(ep.pubDate || ep.date);
  const duration = formatDuration(ep.durationSeconds || 0);
  const seasonEp = (ep.season && ep.episode) ? `SESONG ${ep.season} · EP ${String(ep.episode).padStart(2,'0')}` : 'TRAILER';
  const canonical = `https://podcast.hegechristine.no/${slug}/`;
  const ogImage = ep.imageUrl || 'https://podcast.hegechristine.no/assets/hege-portrait.jpg';

  // Description for SEO meta — first paragraph of hook, capped
  const metaDesc = (parsed.hook || ep.title).replace(/\s+/g, ' ').trim().slice(0, 160);

  return `<!doctype html>
<html lang="no">
<head>
<meta charset="utf-8" />
<title>${escHtml(ep.title)} — The Edit</title>
<meta name="description" content="${escAttr(metaDesc)}" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<link rel="canonical" href="${escAttr(canonical)}" />
<link rel="icon" href="/favicon.svg" type="image/svg+xml">

<meta property="og:type" content="article" />
<meta property="og:site_name" content="The Edit" />
<meta property="og:title" content="${escAttr(ep.title)}" />
<meta property="og:description" content="${escAttr(metaDesc)}" />
<meta property="og:url" content="${escAttr(canonical)}" />
<meta property="og:image" content="${escAttr(ogImage)}" />
<meta property="og:locale" content="nb_NO" />

<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escAttr(ep.title)}" />
<meta name="twitter:description" content="${escAttr(metaDesc)}" />
<meta name="twitter:image" content="${escAttr(ogImage)}" />

<script type="application/ld+json">${JSON.stringify({
  "@context": "https://schema.org",
  "@type": "PodcastEpisode",
  "name": ep.title,
  "url": canonical,
  "datePublished": ep.pubDate || ep.date,
  "duration": `PT${Math.round((ep.durationSeconds || 0)/60)}M`,
  "description": metaDesc,
  "image": ogImage,
  "associatedMedia": ep.audioUrl ? { "@type": "MediaObject", "contentUrl": ep.audioUrl } : undefined,
  "partOfSeries": {
    "@type": "PodcastSeries",
    "name": SHOW.title,
    "url": "https://podcast.hegechristine.no/"
  }
})}</script>

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/episode.css">
</head>
<body>

<header class="topbar">
  <div class="topbar__inner">
    <a href="/" class="topbar__brand">
      <span class="hc-mark"><span>HC</span></span>
      <span class="wordmark">Hege<em>Christine</em></span>
    </a>
    <nav class="topbar__nav" aria-label="Hovednavigasjon">
      <a href="/">Podcast</a>
      <a href="/#om">Om</a>
      <a href="/#never-miss">Nyhetsbrev</a>
      <a href="https://www.hegechristine.no" rel="noopener">Hovedside ↗</a>
    </nav>
    <div class="topbar__right">${ep.n ? `Episode ${ep.n}` : 'The Edit'}</div>
  </div>
</header>

<main class="ep">

  <section class="ep-hero">
    ${ep.imageUrl ? `<div class="ep-hero__cover">
      <img src="${escAttr(ep.imageUrl)}" alt="${escAttr(ep.title)} — episode-cover" loading="eager" />
    </div>` : ''}
    <div class="ep-hero__body">
      <div class="ep-hero__meta">
        <span class="kicker">${escHtml(seasonEp)}</span>
        <span class="ep-hero__date">${escHtml(date)}${duration ? ` · ${escHtml(duration)}` : ''}</span>
      </div>
      <h1 class="ep-hero__title">${escHtml(ep.title)}</h1>

      ${ep.audioUrl ? `<div class="ep-player">
        <audio controls preload="metadata" src="${escAttr(ep.audioUrl)}"></audio>
      </div>` : ''}

      <div class="ep-subscribe">
        <span class="ep-subscribe__label">Abonnér:</span>
        <a class="ep-subscribe__btn" href="${escAttr(SHOW.spotifyShow)}" target="_blank" rel="noopener">
          <svg class="ep-subscribe__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.84-.179-.96-.6-.122-.418.179-.842.6-.961 4.561-1.039 8.52-.6 11.64 1.32.42.18.479.659.302 1.142zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.42 1.56-.302.421-1.02.599-1.56.3z"/></svg>
          Spotify
        </a>
        <a class="ep-subscribe__btn" href="${escAttr(SHOW.appleShow)}" target="_blank" rel="noopener">
          <svg class="ep-subscribe__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12.04 2.4c-5.31 0-9.6 4.3-9.6 9.6 0 5.3 4.29 9.6 9.6 9.6 5.3 0 9.6-4.3 9.6-9.6 0-5.3-4.3-9.6-9.6-9.6zm0 17.04c-1.6 0-2.92-1.31-2.92-2.92 0-1.6 1.32-2.92 2.92-2.92s2.92 1.32 2.92 2.92c0 1.61-1.32 2.92-2.92 2.92zM10.04 11c-.36-1.32-.56-2.66-.56-3.79 0-1.36.78-2.45 2.56-2.45 1.78 0 2.56 1.09 2.56 2.45 0 1.13-.2 2.47-.56 3.79l-.5 1.84c-.15.55-.62.95-1.5.95s-1.35-.4-1.5-.95L10.04 11z"/></svg>
          Apple Podcasts
        </a>
        <a class="ep-subscribe__rss" href="${escAttr(SHOW.rssUrl)}" target="_blank" rel="noopener" title="RSS-feed for podkast-apper">
          <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 11a9 9 0 0 1 9 9M4 4a16 16 0 0 1 16 16M6 19a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          RSS
        </a>
      </div>
    </div>
  </section>

  <div class="ep-layout">
    <article class="ep-content">
      <div class="ep-prose">
        ${paragraphize(parsed.hook)}
      </div>
    </article>

    <aside class="ep-sidebar">
      ${parsed.guest ? `<section class="ep-guest">
        <span class="kicker">Gjest</span>
        <h3>${escHtml(parsed.guest.name)}</h3>
        ${parsed.guest.links.length ? `<ul class="ep-guest__links">
          ${parsed.guest.links.map(l => `<li><span class="ep-guest__emoji" aria-hidden="true">${escHtml(l.emoji)}</span><a href="${escAttr(l.href)}" target="_blank" rel="noopener">${escHtml(l.value.trim())}</a><span class="ep-guest__label">${escHtml(l.label)}</span></li>`).join('\n          ')}
        </ul>` : ''}
      </section>` : ''}

      ${parsed.resources.length ? `<section class="ep-resources">
        <span class="kicker">Lenker</span>
        <h3>Fra episoden</h3>
        <ul>
          ${parsed.resources.map(r => `<li>${r.emoji ? `<span class="ep-resources__emoji" aria-hidden="true">${escHtml(r.emoji)}</span>` : ''}${r.href ? `<a href="${escAttr(r.href)}" target="_blank" rel="noopener">${escHtml(r.text.replace(r.href.replace(/^https?:\/\//, ''), '').trim() || r.text)}</a>` : escHtml(r.text)}</li>`).join('\n          ')}
        </ul>
      </section>` : ''}

      ${campaign ? `<section class="ep-campaign">
        <span class="kicker">${escHtml(campaign.kicker || 'Aktuelt nå')}</span>
        <h3>${escHtml(campaign.title)}</h3>
        <p>${escHtml(campaign.body)}</p>
        <a href="${escAttr(campaign.href)}" target="_blank" rel="noopener" class="btn btn--primary">${escHtml(campaign.cta)}</a>
      </section>` : ''}

      ${related.length ? `<section class="ep-more">
        <span class="kicker">Mer fra</span>
        <h3>The <em>Edit</em></h3>
        <ul class="ep-more__list">
          ${related.map(r => `<li><a href="/${escAttr(r.slug)}/" class="ep-more__item">
            <div class="ep-more__cover">${r.imageUrl ? `<img src="${escAttr(r.imageUrl)}" alt="" loading="lazy" />` : ''}</div>
            <div class="ep-more__body">
              <span class="ep-more__num">EP ${escHtml(String(r.n))}</span>
              <span class="ep-more__title">${escHtml(r.title)}</span>
            </div>
          </a></li>`).join('\n          ')}
        </ul>
      </section>` : ''}
    </aside>
  </div>

  <section class="ep-host">
    <div class="ep-host__photo">
      <img src="${escAttr(SHOW.hostPhoto)}" alt="${escAttr(SHOW.host)}" loading="lazy" />
    </div>
    <div class="ep-host__body">
      <span class="kicker">Host & Show</span>
      <h2>${escHtml(SHOW.host)}</h2>
      <p class="ep-host__bio">${escHtml(SHOW.hostBio)}</p>
      <h3>Hva er The <em>Edit</em>?</h3>
      <p>${escHtml(SHOW.showAbout)}</p>
    </div>
  </section>

  <section class="ep-newsletter" id="never-miss">
    <div class="ep-newsletter__face ep-newsletter__face--front">
      <span class="kicker">— NYHETSBREV</span>
      <h2>Aldri gå <em>glipp</em> av en episode</h2>
      <form id="newsletter-form" class="hc-newsletter-form">
        <input type="text" name="name" placeholder="Navn" required autocomplete="name">
        <input type="email" name="email" placeholder="E-post" required autocomplete="email">
        <button type="submit">Ja, takk! →</button>
        <div class="form-message" id="form-message"></div>
      </form>
    </div>
    <div class="ep-newsletter__face ep-newsletter__face--back" hidden>
      <div class="check-circle" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <h2>Du er <em>på listen!</em></h2>
      <p>Sjekk innboksen din om litt — første hilsen er på vei.</p>
    </div>
    <div id="kajabi-hidden-wrap" style="position:absolute;left:-9999px;top:-9999px;visibility:hidden;pointer-events:none" aria-hidden="true">
      <script src="${escAttr(SHOW.newsletterEmbedUrl)}"></script>
    </div>
    <iframe name="kajabi-response-frame" style="display:none" aria-hidden="true"></iframe>
  </section>

</main>

<footer class="site-footer">
  <div class="site-footer__inner">
    <span class="kicker">© ${new Date().getFullYear()} HEGECHRISTINE.NO</span>
    <div class="site-footer__links">
      <a href="https://www.hegechristine.no/pages/personvern" target="_blank" rel="noopener" class="kicker">PERSONVERN</a>
      <a href="https://www.hegechristine.no/pages/cookieerklaering" target="_blank" rel="noopener" class="kicker">COOKIES</a>
    </div>
  </div>
</footer>

<script>
(function(){
  const form = document.getElementById('newsletter-form');
  if (!form) return;
  const msg = document.getElementById('form-message');
  const button = form.querySelector('button[type="submit"]');
  function findKajabi() { return document.querySelector('#kajabi-hidden-wrap form'); }
  form.addEventListener('submit', function(e){
    e.preventDefault();
    const k = findKajabi();
    if (!k) { msg.textContent = 'Skjemaet laster — prøv igjen om et øyeblikk.'; msg.style.color='#c44a2c'; return; }
    button.disabled = true; button.textContent = 'Sender...';
    const userName = form.querySelector('input[name="name"]').value.trim();
    const userEmail = form.querySelector('input[name="email"]').value.trim();
    const emailInput = k.querySelector('input[type="email"]'); if (emailInput) emailInput.value = userEmail;
    const textInputs = k.querySelectorAll('input[type="text"]');
    for (let i=0;i<textInputs.length;i++){ if (textInputs[i].name && textInputs[i].name.toLowerCase().includes('name')) { textInputs[i].value = userName; break; } }
    k.target = 'kajabi-response-frame';
    try {
      k.submit();
      setTimeout(function(){
        document.querySelector('.ep-newsletter__face--front').hidden = true;
        document.querySelector('.ep-newsletter__face--back').hidden = false;
      }, 700);
    } catch(err) { msg.textContent='Noe gikk galt. Prøv igjen.'; msg.style.color='#c44a2c'; button.disabled=false; button.textContent='Ja, takk! →'; }
  });
})();
</script>
</body>
</html>
`;
}

async function main() {
  const raw = await fs.readFile(EPISODES_PATH, 'utf-8');
  const parsed = JSON.parse(raw);
  const episodes = Array.isArray(parsed) ? parsed : (parsed.episodes || []);
  const campaign = await loadCampaign();

  console.log(`Building ${episodes.length} episode pages...`);
  if (campaign) console.log(`  campaign: "${campaign.title}"`);

  // Clean old episode-* directories first (so removed episodes get cleaned up)
  const entries = await fs.readdir(ROOT, { withFileTypes: true });
  for (const e of entries) {
    if (e.isDirectory() && (e.name.startsWith('episode-') || e.name === 'velkommen')) {
      await fs.rm(path.join(ROOT, e.name), { recursive: true, force: true });
    }
  }

  // Pre-compute slugs so renderEpisode can link to siblings even on first pass
  let slugChanged = false;
  for (const ep of episodes) {
    const slug = episodeSlug(ep);
    if (ep.slug !== slug) { ep.slug = slug; slugChanged = true; }
  }

  let count = 0;
  for (const ep of episodes) {
    const html = renderEpisode(ep, campaign, episodes);
    const dir = path.join(ROOT, ep.slug);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, 'index.html'), html, 'utf-8');
    count++;
  }
  console.log(`✓ Generated ${count} episode pages`);

  // Write slugs back to episodes.json so the hub can link directly
  if (slugChanged) {
    const out = Array.isArray(parsed) ? episodes : { ...parsed, episodes };
    await fs.writeFile(EPISODES_PATH, JSON.stringify(out, null, 2) + '\n', 'utf-8');
    console.log(`✓ Updated slugs in episodes.json`);
  }
}

main().catch(err => { console.error(err); process.exit(1); });
