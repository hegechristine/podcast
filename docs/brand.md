# The Edit — Brand & Design System

Canonical reference for podcast.hegechristine.no. **The homepage `index.html` is the source of truth** — alle andre sider (episode-sider, evt fremtidige sider) skal følge mønstrene her.

The Edit er en **sub-brand av Hege Christine** med eget visuelt uttrykk. Brand-tokenene ligger inline i `index.html` `:root` (linje ~51–91) og overstyrer base-tokenene i `assets/tokens.css` (som tilhører Hege's personlige brand). De inline-tokenene er kanoniske for podcast-flatene.

---

## 1. Color tokens

Eksakte swatches fra cover-art:

| Token | Hex | Rolle |
|---|---|---|
| `--soft-bg` | `#F4F2EF` | Hovedbakgrunn (cream paper) |
| `--soft-bg-alt` | `#FAF8F4` | Kort/blokk-bakgrunn |
| `--soft-bg-deep` | `#E8E4DC` | Dypere cream-aksenter |
| `--soft-ink` | `#303030` | Primær tekst (near-black) |
| `--soft-ink-soft` | `#503D30` | Warm dark brown — workhorse for newsletter, campaign, footer, platforms |
| `--soft-muted` | `#6B5945` | Sekundær tekst, meta-info |
| `--soft-soft` | `#A89882` | Tertiær tekst, dempete labels |
| `--soft-yellow` | `#FFCC00` | Mustard — KUN små aksenter ("yellow dryss") |
| `--soft-rust` | `#A0522D` | Terracotta — italic emphasis + key body accents |
| `--soft-rust-deep` | `#7E3F1F` | Hover-state for rust |
| `--soft-warm` | `#C9A878` | Warm sand-aksent |
| `--soft-sand` | `#E8C796` | Lysere sand |
| `--soft-cream` | `#FAF8F4` | Alias til bg-alt |

### Color rules

- **"Rust mot cream, yellow mot brown"** — terracotta brukes på cream-bakgrunn (italic, hover-state, accent-strokes); mustard brukes på warm-brown bakgrunn (newsletter h-em, footer h5, kicker-tekst i campaign)
- Yellow er **dryss**, ikke fyllfarge. Brukt sparsomt: små streker, h5-labels, italic-em på dark, små CTA-bg på dark
- Aldri orange-rødt rust (`#C5522C`) — det er ikke i paletten. Bruk `--soft-rust` (`#A0522D`)
- Olive/sage-tokens fra base-systemet brukes IKKE i podcast-konteksten

---

## 2. Typography

### Fonts

| Familie | Bruk | Hvor |
|---|---|---|
| `'CS Calory'` (lokal) → `'Cormorant Garamond'` fallback | Wordmark, stat-tall | Footer-wordmark, ds-footer, stat__num. **Bryter ned ved hero-størrelse** — bruk Cormorant der |
| `'Cormorant Garamond'` 500 | Display headings | hero__h, featured__art-title, about__h, newsletter__h, list-head h2, ep__title, og alle headings på episode-side |
| `'Cormorant Garamond'` italic 500 i rust | Italic emphasis | em-tegn i alle headings (inkl. wordmark "Christine") |
| `'Montserrat'` 300/400 | Body text | Hovedtekst (lett vekt 300 for "soft magazine-feel"), meta-info |
| `'JetBrains Mono'` 600 uppercase | Mono-labels | Kicker, eyebrow, badges, meta-info, footer h5 |
| `'Archivo Black'` 900 | Wordmark "Hege" + HC-monogram | TOPBAR ONLY — overstyres alltid uavhengig av sub-brand-stil |
| `'Newsreader'` italic 500 | Wordmark "Christine" | TOPBAR ONLY |

### Font load (Google Fonts + lokal CS Calory)

```html
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&family=Archivo+Black&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;1,400;1,500&family=Newsreader:ital,wght@0,400;0,500;0,600;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500;600&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&display=swap" rel="stylesheet">

<style>
@font-face {
  font-family: 'CS Calory';
  src: url('/assets/fonts/CSCalory-Regular.ttf') format('truetype');
  font-weight: 400; font-style: normal; font-display: swap;
}
</style>
```

### Type scale (fra base tokens.css — brukt som-er)

```
--text-xs:    0.75rem    (12px)
--text-sm:    0.875rem   (14px)
--text-base:  1rem       (16px)
--text-lg:    1.125rem   (18px)
--text-xl:    1.375rem   (22px)
--text-2xl:   1.75rem    (28px)
--text-3xl:   2.25rem    (36px)
--text-4xl:   3rem       (48px)
--text-5xl:   4rem       (64px)
--text-6xl:   5.5rem     (88px)
--text-7xl:   7.5rem     (120px)
```

### Heading-mønstre (KANONISKE)

```css
/* Display headings (hero, about, featured, newsletter, list-head h2) */
font-family: 'Cormorant Garamond', serif;
font-weight: 500;
letter-spacing: 0.005em;
line-height: 1.05–1.1;

/* em inside heading */
font-family: 'Cormorant Garamond', serif;
font-style: italic;
font-weight: 500;
color: var(--soft-rust);   /* eller --soft-yellow på dark bg */
```

### Body-mønstre

```css
/* Hovedtekst */
font-family: 'Montserrat', sans-serif;
font-weight: 300;     /* lett vekt = magazine-feel */
line-height: 1.55;

/* Lede / first paragraph */
font-weight: 400;
font-size: 1.18rem;

/* Editorial italic (lede, newsletter__p) */
font-family: 'Newsreader' eller 'Cormorant Garamond', serif;
font-style: italic;
font-weight: 500;
```

---

## 3. Layout primitives

### Container max-widths

| Kontekst | Max-width |
|---|---|
| Hero, list-head, ep-list, about, footer | **1320px** |
| Newsletter inner | 1080px |
| Episode-side `.ep` container | **bør være 1320px** for konsistens (er 1100px nå — gap) |

### Section padding (vertikal rytme)

| Seksjon | Padding |
|---|---|
| Hero | `96px 48px 64px` (`--space-9` `--space-7` `--space-8`) |
| List-head | `48px 64px 16px` |
| Ep-list | `0 64px 96px` |
| Platforms-stripe | `24px 48px` |
| About | `96px 64px` |
| Newsletter | `64px 64px` |
| Footer | `64px 48px 32px` |

### Spacing tokens (fra tokens.css, brukt as-is)

```
--space-1: 4px       --space-6: 32px
--space-2: 8px       --space-7: 48px
--space-3: 12px      --space-8: 64px
--space-4: 16px      --space-9: 96px
--space-5: 24px      --space-10: 128px
```

### Border + shadow-mønstre

| Element | Border | Shadow |
|---|---|---|
| Standard kort (guest, resources, more, ep-host) | `1.5px solid var(--soft-ink)` | `4px 4px 0 var(--soft-ink)` (hard shadow) |
| Featured kort (hero) | `2px solid var(--ink-600)` | (ingen — hero er flat) |
| Hero / newsletter / host | større variant | `6px 6px 0 var(--soft-ink)` |
| Ep-art square (episode-list) | `1px solid rgba(58,42,30,0.18)` | hover: `4px 4px 0 var(--ink-600)` |

### Border radius

```
--radius-0: 0px
--radius-1: 2px        /* badges, search input */
--radius-2: 4px        /* kort, ep__art, about__portrait */
--radius-3: 8px
--radius-pill: 999px   /* play-buttons */
```

### Grid background

Bakgrunnsmønster brukt på hele body OG som overlay i hero/featured/newsletter/platforms:

```css
background-image:
  linear-gradient(rgba(48,48,48,0.07) 1px, transparent 1px),
  linear-gradient(90deg, rgba(48,48,48,0.07) 1px, transparent 1px);
background-size: 56px 56px;       /* 56px på body, 64px i hero, 28px i featured__art */
```

På mørke bakgrunner (newsletter, footer, featured__art): bytt til cream-linjer på lavere opacity:
```css
linear-gradient(rgba(239,230,212,0.07) 1px, transparent 1px), ...
```

---

## 4. Component patterns

### Kicker (eyebrow-label) — KANONISK MØNSTER

Liten mono-label med rust-strek foran. Brukes overalt over headings.

```html
<span class="hero__kicker"><span>Episodearkiv · Oppdatert ukentlig</span></span>
```

```css
font-family: 'JetBrains Mono', monospace;
font-size: 11px–12px;
letter-spacing: 0.18em;
text-transform: uppercase;
color: var(--soft-rust);    /* eller --soft-yellow på dark bg */
font-weight: 600;
display: flex;
align-items: center;
gap: 12px;
margin-bottom: 24px;

::before {
  content: "";
  width: 30–36px;     /* 36 i hero, 30 ellers */
  height: 2px;        /* 3px når yellow */
  background: var(--soft-rust);   /* eller --soft-yellow */
}
```

**KRITISK:** Strek-foran-mønsteret er det mest konsistente designsignaturet på hele siden. Det binder alle seksjoner sammen. Episode-side-kickerne mangler dette nå.

### Hero pattern

```
┌─────────────────────────────────────────────────────┐
│ [grid overlay]                                      │
│ ─── KICKER (rust + 36px stroke)                    │
│ Display heading 7xl Cormorant 500                  │
│   med italic em i rust                             │
│ Lede italic 22px Newsreader olive-700              │
│ ─────────────────                                  │
│ Mono meta: 7 ep | siden 2024 | etc                 │
└─────────────────────────────────────────────────────┘
border-bottom: 1px solid var(--soft-ink)
padding: 96px 48px 64px
max-width: 1320px (inner)
```

### Card pattern (guest/resources/more/host blocks)

```css
background: var(--soft-bg-alt);
border: 1.5px solid var(--soft-ink);
border-radius: 4–6px;
padding: 22–44px;
box-shadow: 4px 4px 0 var(--soft-ink);  /* eller 6px 6px 0 for større blokker */
```

### Newsletter pattern (dark warm-brown)

```css
background: var(--soft-ink-soft);   /* warm brown */
color: var(--soft-bg-alt);
padding: 64px 64px;

/* eyebrow stroke is YELLOW on dark, not rust */
.eyebrow::before { background: var(--soft-yellow); height: 3px; }

/* heading em is YELLOW on dark, not rust */
h2 em { color: var(--soft-yellow); }

/* CTA: rust bg */
button { background: var(--soft-rust); }
```

### Platforms strip (dark warm-brown band over fold)

Vises mellom hero og episode-listen på showsiden. Mørk warm-brown, bruker yellow strek + sand labels:

```css
.platforms { background: var(--soft-ink-soft); padding: 24px 48px; }
.platforms__label { color: var(--sand-200); font-mono uppercase; }
.platforms__label::before { width: 30px; height: 2px; background: var(--sand-200); }
.plat-btn { border: 1.5px solid rgba(239,230,212,0.4); padding: 10px 14px; }
```

### Filter pills

```css
background: transparent;
border: 1.5px solid var(--soft-ink);
font-family: 'JetBrains Mono';
font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase;
color: var(--soft-muted);
padding: 7px 12px;

.is-active { background: var(--soft-yellow); color: var(--soft-ink); }
```

### Search input

```css
background: var(--soft-bg-alt);
border: 1.5px solid var(--soft-ink);
border-radius: 2px;
padding: 12px 16px 12px 42px;
:focus { border-color: var(--soft-rust); background: #fff; }
```

### Buttons

| Variant | Background | Color | Hover |
|---|---|---|---|
| Primær (light bg) | `var(--soft-rust)` | `var(--soft-bg-alt)` | bg → `var(--soft-rust-deep)`, translateY(-1px) |
| Sekundær | transparent + 1.5px ink border | `var(--soft-ink)` | bg → ink, color → cream |
| Primær på dark (campaign/newsletter) | `var(--soft-yellow)` | `var(--soft-ink)` | bg → cream |
| Plat-btn (platforms strip) | transparent + cream-translucent border | cream | bg → cream, color → ink |

Standard button-stil:
```css
font-family: 'JetBrains Mono';
font-weight: 600;
font-size: 0.74rem;
letter-spacing: 0.16em;
text-transform: uppercase;
padding: 10–14px 16–20px;
border-radius: 3px;
```

---

## 5. Page structure (canonical flow)

```
┌───────────────────────────────────────────┐
│ TOPBAR  HC + wordmark | nav | meta-right  │  cream-50 bg, 1px ink border-bottom
├───────────────────────────────────────────┤
│                                           │
│ HERO (cream + grid overlay)               │  cream-200 bg, large display
│   kicker → h1 → lede → meta-bar           │  border-bottom: 1px ink
│                                           │
├───────────────────────────────────────────┤
│ PLATFORMS (warm-brown strip)              │  --soft-ink-soft, sand labels
├───────────────────────────────────────────┤
│ LIST-HEAD                                 │  border-bottom: 1px ink
│   kicker + h2 + sub | search + pills      │
├───────────────────────────────────────────┤
│ EPISODE LIST                              │  cream-200 bg, 100px ep-art squares
│   ep > ep > ep ...                        │  hover: shift +shadow
├───────────────────────────────────────────┤
│ FEATURED EPISODE (optional)               │  warm-brown art, large card
├───────────────────────────────────────────┤
│ ABOUT                                     │  cream-200, 4:5 portrait + text
│   portrait | eyebrow + h + lede + stats   │
├───────────────────────────────────────────┤
│ NEWSLETTER (dark warm-brown)              │  --soft-ink-soft, yellow accents
│   eyebrow + h + lede | email form         │
├───────────────────────────────────────────┤
│ FOOTER (dark warm-brown)                  │  --soft-ink-soft
│   wordmark+tag | Podcast | HC | Følg      │  4-col grid
│   © + legal-links                         │
└───────────────────────────────────────────┘
                                              FIXED PLAYER (sticky bottom, optional)
```

---

## 6. Visual motifs

1. **"Yellow dryss"** — mustard `#FFCC00` brukes som små streker, h5-labels på dark bg, italic-em på dark bg. Aldri som hovedfyll. Aldri på lys bakgrunn.
2. **Rust strokes (30–36px)** — `::before`-element i kicker/eyebrow lager den karakteristiske rust-streken til venstre for monolabel.
3. **Hard shadow (4px 4px 0 ink)** — alle kort og blokker har offset-skygge i ink-fargen, ikke softblur. Magazine-følelse.
4. **1.5px ink borders** — alle interaktive elementer (kort, knapper, inputs) har skarp 1.5px ink-ramme.
5. **Grid overlay** — subtile linjer (rgba 0.07 ink) i 56–64px raster på alt — gir editorial/grafisk-design-følelse.
6. **Cormorant italic i rust** — em-tegn i headings er ALLTID Cormorant italic 500 i terracotta. På dark bg bytter til yellow.
7. **Mono caps overalt** — meta-info, kicker, badges, button-text, footer h5 er alltid `'JetBrains Mono'` 600 i 0.14–0.18em letter-spacing uppercase.

---

## 7. Episode-side gap-analyse

Per i dag matcher episode-sidene paletten og fonten — men disse gapene gjenstår for full sømløs feel:

| Gap | Showside | Episode-side i dag | Forslag |
|---|---|---|---|
| **Container max-width** | 1320px | 1100px | Bump til 1320px for samme bredde-følelse |
| **Kicker-strek (`::before`)** | 30–36px rust horisontal strek foran mono-label | Mangler — kicker er bare tekst | Legg til `::before` på `.kicker` (rust på cream, yellow på dark) |
| **Hero-tittel-skala** | clamp(3.5rem, 8vw, 7rem) — text-7xl | clamp(2rem, 5vw, 3.2rem) — kraftig mindre | Bump til clamp(2.5rem, 6vw, 4rem) for større wow-faktor |
| **Section-padding** | 96px vertikalt | 28–48px | Øk top-margin på `.ep-host`, `.ep-newsletter`, og `.ep` container fra 48 til 64–96 |
| **Hero kicker-format** | "Episodearkiv · Oppdatert ukentlig" | "SESONG 2026 · EP 18" — riktig info, men er h2-aktig dato/nr i stedet for editorial label | Vurder om kickeren skal være mer redaksjonell ("Sesong 03 · Episode 18") med dato/varighet på egen meta-rad under |
| **Grid overlay i hero** | Subtle 64px-grid overlay på hero | Mangler | Legg til `.ep-hero__grid` overlay |
| **Stat-tall i About** | text-5xl Cormorant Italic | (ikke aktuelt på episode-side) | — |
| **Italic-color på dark bg** | `--soft-yellow` (newsletter h2 em, host bio em) | `--soft-rust` på campaign | Sjekk: campaign h3 em bruker yellow ✓; verifisere at newsletter h2 em også bruker yellow ✓ |
| **Footer base-rad alignment** | space-between flex med yellow hover | matchet ✓ | OK |

---

## 8. Eksempel-snippet — riktig kicker

```html
<span class="kicker">Sesong 03 · Episode 18</span>
```

```css
.kicker {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--soft-rust);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 12px;
}
.kicker::before {
  content: "";
  width: 30px;
  height: 2px;
  background: var(--soft-rust);
  flex-shrink: 0;
}

/* Yellow variant for use on dark bg */
.on-dark .kicker,
.ep-newsletter .kicker,
.ep-campaign .kicker { color: var(--soft-yellow); }
.on-dark .kicker::before,
.ep-newsletter .kicker::before,
.ep-campaign .kicker::before { background: var(--soft-yellow); height: 3px; }
```

---

**Versjon:** 1.0 · 2026-05-09
**Eier:** podcast.hegechristine.no
