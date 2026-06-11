/**
 * Samtykke-banner for Google Analytics (Consent Mode v2).
 *
 * gtag lastes i <head> med analytics_storage: 'denied' som default —
 * INGEN cookies settes før besøkeren godtar her. Valget lagres i
 * localStorage og banneren vises aldri igjen. «Nei takk» = forblir denied
 * (GA får kun cookieless consent-pings, ingen sporing).
 *
 * Cloudflare Web Analytics er cookieless og trenger ikke samtykke —
 * den er uberørt av dette.
 */
(function () {
  var KEY = 'hc-consent-analytics';

  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { /* private mode e.l. */ }

  function grant() {
    if (typeof gtag === 'function') {
      gtag('consent', 'update', { analytics_storage: 'granted' });
    }
  }

  if (saved === 'granted') { grant(); return; }
  if (saved === 'denied') { return; }

  // Ikke noe valg lagret — vis banner
  var banner = document.createElement('div');
  banner.id = 'hc-consent';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Informasjonskapsler');
  banner.innerHTML =
    '<p>Denne siden bruker informasjonskapsler til statistikk — for å forstå hva som er nyttig og hva som kan bli bedre. Høres det greit ut?</p>' +
    '<div class="hc-consent__actions">' +
    '<button type="button" class="hc-consent__btn hc-consent__btn--yes">Ja, greit</button>' +
    '<button type="button" class="hc-consent__btn hc-consent__btn--no">Nei takk</button>' +
    '</div>' +
    '<p class="hc-consent__more"><a href="https://www.hegechristine.no/pages/cookieerklaering" target="_blank" rel="noopener">Les mer i cookieerklæringen</a></p>';

  var style = document.createElement('style');
  style.textContent =
    '#hc-consent{position:fixed;bottom:16px;left:16px;right:16px;z-index:9999;max-width:420px;' +
    'background:var(--ink-600,#2E3230);color:var(--cream-50,#FBF8F0);' +
    'padding:20px 22px;border-radius:14px;box-shadow:0 8px 32px rgba(0,0,0,.28);' +
    "font-family:'Montserrat',sans-serif;font-size:.875rem;line-height:1.5;}" +
    '#hc-consent p{margin:0 0 14px;}' +
    '.hc-consent__actions{display:flex;gap:10px;}' +
    '.hc-consent__btn{cursor:pointer;border-radius:999px;padding:9px 20px;font-family:inherit;' +
    'font-size:.8125rem;font-weight:600;letter-spacing:.02em;}' +
    '.hc-consent__btn--yes{background:var(--rust-400,#C5522C);border:1px solid var(--rust-400,#C5522C);' +
    'color:var(--cream-50,#FBF8F0);}' +
    '.hc-consent__btn--yes:hover{background:var(--rust-500,#A94221);}' +
    '.hc-consent__btn--no{background:transparent;border:1px solid var(--ink-300,#777D73);' +
    'color:var(--cream-50,#FBF8F0);}' +
    '.hc-consent__btn--no:hover{border-color:var(--cream-50,#FBF8F0);}' +
    '.hc-consent__more{margin:12px 0 0!important;font-size:.75rem;opacity:.75;}' +
    '.hc-consent__more a{color:inherit;text-decoration:underline;text-underline-offset:2px;}' +
    '.hc-consent__more a:hover{opacity:1;}' +
    '@media (min-width:640px){#hc-consent{left:auto;right:24px;bottom:24px;}}';

  function choose(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
    if (value === 'granted') grant();
    banner.remove();
    style.remove();
  }

  banner.querySelector('.hc-consent__btn--yes').addEventListener('click', function () { choose('granted'); });
  banner.querySelector('.hc-consent__btn--no').addEventListener('click', function () { choose('denied'); });

  document.head.appendChild(style);
  document.body.appendChild(banner);
})();
