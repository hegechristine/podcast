/**
 * Sider edit-modus — wysiwyg tekst-redigering for hele sider.hegechristine.no
 *
 * Bruk: legg `?edit` på slutten av URL-en (eks. /30-dager/?edit).
 * Endringer lagres per side i localStorage og overlever refresh.
 * Klikk "Kopier endringer" for å eksportere FØR/ETTER-diff som markdown.
 *
 * Inkluderes via:  <script defer src="/edit.js"></script>
 * Aktiveres kun når ?edit er i URL-en — null kostnad for normale besøkere.
 */
(function() {
  if (!new URLSearchParams(location.search).has('edit')) return;

  // Per-page storage key — edits på /lenker/ blander seg ikke med /30-dager/
  const STORAGE_KEY = 'sider-edits-' + location.pathname;
  const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');

  // Hvilke elementer blir redigerbare. Dekker semantiske content-tags +
  // de vanligste brand-klassene Hege bruker på tvers av sider.
  const EDIT_SELECTORS = [
    // Semantic content
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p',
    'li',
    'blockquote',
    'figcaption',
    // Brand-mønster klasser
    '.eyebrow',
    '.section-title',
    '.section-lead',
    '.footer-tagline',
    '.footer-col-label',
    // Spesifikke labels/numbers fra Hege's sider
    '.hero-partner-chip-text', '.hero-photo-tag', '.hero-tagline-quote',
    '.hero-meta', '.hero-lead',
    '.bridge-eyebrow',
    '.feature-label', '.feature-title', '.feature-desc',
    '.tier-label', '.tier-name', '.tier-price', '.tier-price-sub', '.tier-cta',
    '.partner-badge-note', '.footer-partner-text',
    '.disclosure-text',
    '.about-meta', '.about-name', '.about-tagline',
    '.faq-q', '.faq-a',
    '.transform-from', '.transform-to',
    '.stat-num', '.stat-label',
    '.day-num', '.day-title',
    '.premise-headline', '.premise-quote', '.premise-body',
    '.cta-primary', '.cta-secondary', '.header-cta',
    '.who-list li', '.notfor-list li', '.reasons-list li',
    '.tier-badge',
    '.final-lead', '.ps-label', '.ps-body',
    // Opt-in via attribute hvis du vil markere noe spesifikt
    '[data-editable]'
  ];

  // Tag editable elements
  let editCount = 0;
  const seenElements = new Set();

  EDIT_SELECTORS.forEach(sel => {
    let nodes;
    try { nodes = document.querySelectorAll(sel); }
    catch (e) { return; }
    nodes.forEach(el => {
      if (seenElements.has(el)) return;
      // Skip if has editable descendants (avoid double-editing)
      if (Array.from(el.querySelectorAll('*')).some(child => seenElements.has(child))) return;
      seenElements.add(el);

      const id = 'e' + (++editCount);
      el.dataset.editId = id;
      el.dataset.editOriginal = el.innerText;
      el.contentEditable = 'true';
      el.spellcheck = true;

      // Restore saved edit
      if (saved[id] != null && saved[id] !== el.innerText) {
        el.innerText = saved[id];
      }

      // Save on edit
      el.addEventListener('input', () => {
        const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        if (el.innerText === el.dataset.editOriginal) {
          delete current[id];
        } else {
          current[id] = el.innerText;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
        updateStatus();
      });
    });
  });

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    [contenteditable="true"] { cursor: text; transition: outline 0.15s ease, background 0.15s ease; }
    [contenteditable="true"]:hover { outline: 2px dashed rgba(197, 82, 44, 0.5); outline-offset: 4px; border-radius: 2px; }
    [contenteditable="true"]:focus { outline: 2px solid rgba(197, 82, 44, 0.9); outline-offset: 4px; background: rgba(251, 248, 240, 0.6); border-radius: 2px; }

    .edit-toolbar {
      position: fixed; bottom: 20px; right: 20px; z-index: 99999;
      background: #2E3230; color: #EFE6D4;
      border-radius: 12px; padding: 16px; min-width: 280px;
      box-shadow: 0 12px 32px rgba(0,0,0,0.25), 0 4px 8px rgba(0,0,0,0.15);
      font-family: 'Archivo', sans-serif; font-size: 13px;
      border: 1.5px solid #C5522C;
    }
    .edit-toolbar-title {
      font-family: 'JetBrains Mono', monospace; font-weight: 600;
      font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase;
      color: #C5522C; margin-bottom: 4px;
    }
    .edit-toolbar-page {
      font-family: 'JetBrains Mono', monospace; font-weight: 500;
      font-size: 10px; letter-spacing: 0.06em;
      color: rgba(239,230,212,0.5); margin-bottom: 12px;
      word-break: break-all;
    }
    .edit-toolbar-status {
      font-size: 12px; color: #F0D9A8; margin-bottom: 14px;
      font-family: 'Archivo', sans-serif;
    }
    .edit-toolbar-row { display: flex; gap: 8px; flex-wrap: wrap; }
    .edit-btn {
      flex: 1; min-width: 0;
      background: #C5522C; color: #EFE6D4; border: none;
      padding: 10px 14px; border-radius: 6px;
      font-family: 'Archivo', sans-serif; font-weight: 700;
      font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
      cursor: pointer; transition: background 0.15s ease, transform 0.1s ease;
    }
    .edit-btn:hover { background: #d96340; transform: translateY(-1px); }
    .edit-btn.edit-btn-secondary { background: transparent; border: 1px solid rgba(239,230,212,0.3); color: #EFE6D4; }
    .edit-btn.edit-btn-secondary:hover { background: rgba(239,230,212,0.1); }
    .edit-btn.edit-btn-tiny { padding: 6px 10px; font-size: 10px; flex: 0 1 auto; }

    .edit-toast {
      position: fixed; bottom: 220px; right: 20px; z-index: 99998;
      background: #5E5F4C; color: #EFE6D4;
      padding: 12px 18px; border-radius: 8px;
      font-family: 'Archivo', sans-serif; font-size: 13px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.2);
      transform: translateY(20px); opacity: 0;
      transition: transform 0.25s ease, opacity 0.25s ease;
      pointer-events: none;
    }
    .edit-toast.show { transform: translateY(0); opacity: 1; }
  `;
  document.head.appendChild(style);

  // Build toolbar
  const bar = document.createElement('div');
  bar.className = 'edit-toolbar';
  bar.innerHTML = `
    <div class="edit-toolbar-title">Edit-modus</div>
    <div class="edit-toolbar-page">${location.pathname}</div>
    <div class="edit-toolbar-status" id="edit-status">${Object.keys(saved).length} endringer lagret · ${editCount} felter åpne</div>
    <div class="edit-toolbar-row">
      <button class="edit-btn" id="edit-copy">Kopier endringer</button>
      <button class="edit-btn edit-btn-secondary" id="edit-reset">Tilbakestill</button>
    </div>
    <div class="edit-toolbar-row" style="margin-top: 8px;">
      <button class="edit-btn edit-btn-tiny edit-btn-secondary" id="edit-toggle">Skjul</button>
      <button class="edit-btn edit-btn-tiny edit-btn-secondary" id="edit-exit">Avslutt</button>
    </div>
  `;
  document.body.appendChild(bar);

  // Toast helper
  const toast = document.createElement('div');
  toast.className = 'edit-toast';
  document.body.appendChild(toast);
  function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => toast.classList.remove('show'), 2400);
  }

  function updateStatus() {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    document.getElementById('edit-status').textContent =
      Object.keys(current).length + ' endringer lagret · ' + editCount + ' felter åpne';
  }

  function getElementPath(el) {
    const tag = el.tagName.toLowerCase();
    const cls = (el.className || '').toString().split(' ').filter(Boolean).slice(0,2).join('.');
    return cls ? `${tag}.${cls}` : tag;
  }

  // Build export — only changed elements with OLD/NEW diff
  function buildExport() {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    const changes = [];
    Object.keys(current).forEach(id => {
      const el = document.querySelector(`[data-edit-id="${id}"]`);
      if (!el) return;
      const sectionEl = el.closest('section, footer, header');
      let section = '?';
      if (sectionEl) {
        const heading = sectionEl.querySelector('.section-title, h1, h2, h3');
        section = heading?.dataset?.editOriginal || heading?.innerText?.slice(0, 50) || sectionEl.tagName.toLowerCase();
      }
      changes.push({
        section: section.trim(),
        selector: getElementPath(el),
        oldText: el.dataset.editOriginal || '',
        newText: current[id]
      });
    });

    if (changes.length === 0) return 'Ingen endringer enda. Klikk på tekst og rediger.';

    let out = '# Endringer fra ' + location.pathname + ' — ' + new Date().toISOString().slice(0,16).replace('T',' ') + '\n\n';
    out += changes.length + ' endring' + (changes.length === 1 ? '' : 'er') + ':\n\n';
    let lastSection = null;
    changes.forEach(c => {
      if (c.section !== lastSection) {
        out += `\n## ${c.section}\n\n`;
        lastSection = c.section;
      }
      out += `### ${c.selector}\n\n`;
      out += `**FØR:**\n${c.oldText}\n\n`;
      out += `**ETTER:**\n${c.newText}\n\n`;
      out += '---\n\n';
    });
    return out;
  }

  // Copy button
  document.getElementById('edit-copy').addEventListener('click', async () => {
    const txt = buildExport();
    try {
      await navigator.clipboard.writeText(txt);
      showToast('Kopiert! Lim inn til Claude.');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = txt;
      ta.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:90vw;height:60vh;z-index:999999;padding:20px;font-family:monospace;';
      document.body.appendChild(ta);
      ta.select();
      showToast('Velg + kopier manuelt (Cmd+C)');
    }
  });

  // Reset
  document.getElementById('edit-reset').addEventListener('click', () => {
    if (!confirm('Tilbakestill alle endringer på denne siden? Dette kan ikke angres.')) return;
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  });

  // Toggle visibility
  let hidden = false;
  document.getElementById('edit-toggle').addEventListener('click', () => {
    hidden = !hidden;
    bar.style.opacity = hidden ? '0.2' : '1';
    bar.style.pointerEvents = hidden ? 'none' : 'auto';
    if (hidden) {
      const showBtn = document.createElement('button');
      showBtn.textContent = 'Vis edit';
      showBtn.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:99999;padding:10px 14px;background:#C5522C;color:#EFE6D4;border:none;border-radius:6px;font-family:Archivo,sans-serif;font-weight:700;font-size:11px;letter-spacing:0.06em;text-transform:uppercase;cursor:pointer;';
      showBtn.onclick = () => {
        hidden = false;
        bar.style.opacity = '1';
        bar.style.pointerEvents = 'auto';
        showBtn.remove();
      };
      document.body.appendChild(showBtn);
    }
  });

  // Exit
  document.getElementById('edit-exit').addEventListener('click', () => {
    const url = new URL(location.href);
    url.searchParams.delete('edit');
    location.href = url.toString();
  });

  // Prevent Enter from creating new paragraphs in single-line fields
  const singleLineSelectors = 'h1, h2, h3, .eyebrow, .feature-label, .tier-name, .tier-price, .tier-price-sub, .stat-num, .stat-label, .footer-col-label, .partner-badge-note, .footer-partner-text, .hero-photo-tag, .hero-partner-chip-text, .bridge-eyebrow, .about-meta, .disclosure-text, .day-num, .tier-badge';
  document.querySelectorAll('[contenteditable="true"]').forEach(el => {
    if (el.matches(singleLineSelectors)) {
      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          el.blur();
        }
      });
    }
  });

  console.log('[Edit-modus] Aktiv på ' + location.pathname + ' — ' + editCount + ' felter redigerbare.');
})();
