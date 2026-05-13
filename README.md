# podcast.hegechristine.no

The Edit-podcasten med Hege Christine. Statisk side med RSS-sync via GitHub Actions.

**Live:** https://podcast.hegechristine.no

---

## For Hege — publisering av ny episode

1. Last opp episoden i **Anchor / Spotify for Podcasters** som vanlig.
   - Solo-episode: ikke last opp episode-cover (vi bruker show-coveret automatisk)
   - Gjest-episode: last opp custom episode-cover (vi henter det fra Anchor)
2. Episoden publiseres på Anchor kl 05:00 norsk tid.
3. Mellom 06:13 og 07:17 norsk tid synker GitHub Actions inn RSS → site.
4. Kl 07:30 norsk tid sjekker Podcast Sync-routinen at alt gikk bra og varsler i Slack `#podcast-sync` + lager all-day-event i Google Calendar.

**Hvis noe ikke ble live**: trigge manuelt på [Actions](https://github.com/hegechristine/podcast/actions/workflows/sync-podcast.yml) → "Run workflow". Eller la Podcast Sync-routinen auto-fixe (den prøver det selv).

---

## Arkitektur

| Komponent | Hva |
|---|---|
| `index.html` | Forsiden — laster `episodes.json` ved oppstart |
| `episode-{NNN}-{slug}/index.html` | Auto-bygget side per episode |
| `episodes.json` | Episodeliste, generert av sync-jobben |
| `feed.config.json` | RSS-feed-URL + stats-overrides |
| `data/campaign.json` | Switchable kampanje-blokk i episode-sidebar |
| `covers/{slug}.webp` + `-thumb.webp` | Resizede covers per episode (1200×1200 + 400×400) |
| `og/{slug}.png` | Auto-generert OG-image 1200×630 per episode |
| `sitemap.xml` | Auto-generert |
| `assets/` | Bilder, ikoner, fonts, episode.css |

### Sync-flyt

```
Anchor RSS → sync-podcast.mjs → episodes.json
              ↓
              build-episode-pages.mjs → episode-{NNN}-{slug}/index.html
              ↓
              generate-cover-images.mjs → covers/*.webp
              ↓
              generate-og-images.mjs → og/*.png
              ↓
              generate-sitemap.mjs → sitemap.xml
              ↓
              Commit → GitHub Pages deploy
```

---

## Scripts (`.github/scripts/`)

| Script | Hva gjør den |
|---|---|
| `sync-podcast.mjs` | Henter Anchor RSS, parser, skriver `episodes.json`. Har safety guards (se nedenfor). |
| `build-episode-pages.mjs` | Bygger HTML per episode med SEO-meta, JSON-LD, audio-player, gjeste/ressurs-seksjoner |
| `generate-cover-images.mjs` | Laster ned Anchor-covers, resizer til WebP (1200 + 400 thumb). Idempotent via `covers/manifest.json` |
| `generate-og-images.mjs` | Puppeteer renderer 1200×630 OG-images. Idempotent via `og/manifest.json` |
| `generate-sitemap.mjs` | Bygger `sitemap.xml` fra episodes.json |

---

## Cover-regel

Implementert i `sync-podcast.mjs`:

- **Har du lastet opp custom episode-cover på Anchor?** → bruk det
- **Ellers** → bruk show-coveret (channel-level `itunes:image`)

Hege's arbeidsflyt:
- Solo: ikke last opp → show-cover vises
- Gjest: last opp custom → custom vises
- Solo *med* custom (avansert): custom respekteres

---

## Cron-tider (`sync-podcast.yml`)

Tre uttrykk med skjeve minutter for redundans. GitHub Actions' scheduled cron dropper hyppig på hele timer, så vi unngår dem:

| Cron-uttrykk | UTC | Norsk sommer | Norsk vinter | Rolle |
|---|---|---|---|---|
| `13 4 * * *` | 04:13 | 06:13 | 05:13 | Primær |
| `43 4 * * *` | 04:43 | 06:43 | 05:43 | Backup +30 min |
| `17 5 * * *` | 05:17 | 07:17 | 06:17 | Backup +1 t |

Sync er idempotent — hvis RSS ikke har endret seg, commit'er den ingenting. Ekstra kjøringer koster ingenting.

Workflow trigger også på `workflow_dispatch` (manuell) og `push` på relevante stier.

---

## Safety guards

Tre guards i `sync-podcast.mjs` som forhindrer datatap ved transient Anchor RSS-glitch:

1. **EMPTY**: hvis 0 episoder parsed → abort
2. **SHRINK**: hvis ny count < forrige count → abort
3. **ID-LOSS**: hvis et eksisterende episode-id forsvinner → abort

Sync exit non-zero ved trip → workflow feiler → ingen commit → ingen datatap.

**Intensjonell sletting**: kjør sync med `--allow-shrink` (lokalt eller via workflow_dispatch med custom args).

---

## Daglig overvåking — Podcast Sync routine

claude.ai-routine (`trig_01Q1N3H2LUuZqvxDSasTmEr9`) som kjører hver dag kl 05:30 UTC (07:30 norsk sommer / 06:30 vinter). Logikk:

1. Sammenligner Anchor RSS' siste tittel med live `episodes.json` på siten
2. **Match + dagens dato** → 🎙️ Slack til `#podcast-sync` + Google Calendar all-day-event "🎙️ The Edit live: TITTEL"
3. **Match + eldre dato** → ✅ Slack "Sync OK, ingen ny episode"
4. **Mismatch** → trigger workflow → vent 3 min → re-sjekk → match eller ❌ Slack "Sync feilet"

Idempotent for kalender-events.

Endre/slett: [claude.ai/code/routines](https://claude.ai/code/routines).

---

## Hosting

- GitHub Pages, branch `main`, root `/`
- Custom domene `podcast.hegechristine.no` (CNAME-fil)
- DNS: CNAME `podcast` → `hegechristine.github.io` i Pro-ISP

---

## Operasjoner

### Trigge sync manuelt
```bash
gh workflow run sync-podcast.yml --ref main -R hegechristine/podcast
```
Eller gå til [Actions-fanen](https://github.com/hegechristine/podcast/actions/workflows/sync-podcast.yml) → "Run workflow".

### Kjøre sync lokalt (debug)
```bash
cd .github/scripts
npm install
node sync-podcast.mjs        # henter RSS, skriver episodes.json
node build-episode-pages.mjs # bygger episode-sider
node generate-cover-images.mjs
node generate-og-images.mjs
node generate-sitemap.mjs
```

### Tvinge re-build av alle covers/OG-images
```bash
node .github/scripts/generate-cover-images.mjs --force
node .github/scripts/generate-og-images.mjs --force
```

### Sletting av en episode (intensjonell)
```bash
node .github/scripts/sync-podcast.mjs --allow-shrink
```

---

## Dormant features

### Exit-intent-popup for 150K Challenge

Ferdig bygd, men deaktivert i påvente av at Hege velger å aktivere. Assets:

- `assets/exit-popup.css` — design matcher [sider.hegechristine.no/150k-challenge-altB/](https://sider.hegechristine.no/150k-challenge-altB/)
- `assets/exit-popup.js` — desktop-only, arm etter 10s, mouseleave top edge, én visning per session

**Aktivering**: legg tilbake CSS-link, popup-HTML og JS-script-tag i `index.html` og template-stringen i `.github/scripts/build-episode-pages.mjs`, så regenerer (`node .github/scripts/build-episode-pages.mjs`). Konfig (Kajabi-form `2149575768`, redirect til `/150k-challenge-altB/`) er hardkodet i HTML-snippeten/JS-en.

---

## Mer

- **Brand & design system**: [`docs/brand.md`](docs/brand.md)
- **SEO**: alle episode-sider har Open Graph article-tags (author, published_time), Twitter Card, JSON-LD PodcastEpisode med author
