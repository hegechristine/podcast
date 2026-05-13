/* ============================================================
   EXIT-INTENT POPUP — 150K Challenge
   - Desktop only (mobile is excluded via CSS + JS guard)
   - Arms after 15s dwell, triggers on mouseleave at top edge
   - Once per session (dismissed) + once-ever (submitted)
   - Submits to Kajabi form 2149575768, then redirects
   ============================================================ */

(function() {
  if (window.matchMedia('(max-width: 720px)').matches) return;
  if (sessionStorage.getItem('exit-popup-dismissed') === '1') return;
  if (localStorage.getItem('exit-popup-submitted') === '1') return;

  const popup = document.getElementById('exit-popup');
  if (!popup) return;

  const REDIRECT_URL = 'https://sider.hegechristine.no/150k-challenge-altB/';
  const ARM_DELAY_MS = 10000;
  const SUCCESS_DELAY_MS = 500;
  const REDIRECT_DELAY_MS = 1800;

  let armed = false;
  let triggered = false;

  setTimeout(() => { armed = true; }, ARM_DELAY_MS);

  document.addEventListener('mouseleave', (e) => {
    if (!armed || triggered) return;
    if (e.clientY > 0) return;
    triggered = true;
    show();
  });

  function show() {
    popup.hidden = false;
    requestAnimationFrame(() => popup.classList.add('is-open'));
    document.body.style.overflow = 'hidden';
    const firstInput = popup.querySelector('input');
    if (firstInput) setTimeout(() => firstInput.focus(), 100);
  }

  function close() {
    popup.classList.remove('is-open');
    setTimeout(() => { popup.hidden = true; }, 240);
    document.body.style.overflow = '';
    sessionStorage.setItem('exit-popup-dismissed', '1');
  }

  popup.querySelectorAll('[data-close]').forEach(el => {
    el.addEventListener('click', close);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && popup.classList.contains('is-open')) close();
  });

  const form = document.getElementById('exit-popup-form');
  if (!form) return;

  const button = form.querySelector('button[type="submit"]');
  const msg = form.querySelector('[data-form-message]');
  const originalButtonText = button.textContent;

  function findKajabi() {
    return popup.querySelector('.exit-popup__kajabi-wrap form');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const k = findKajabi();
    if (!k) {
      msg.textContent = 'Skjemaet laster — prøv igjen om et øyeblikk.';
      return;
    }

    const userName = form.querySelector('input[name="name"]').value.trim();
    const userEmail = form.querySelector('input[name="email"]').value.trim();
    if (!userName || !userEmail) return;

    button.disabled = true;
    button.textContent = 'Sender...';
    msg.textContent = '';

    const emailInput = k.querySelector('input[type="email"]');
    if (emailInput) emailInput.value = userEmail;

    const textInputs = k.querySelectorAll('input[type="text"]');
    for (let i = 0; i < textInputs.length; i++) {
      if (textInputs[i].name && textInputs[i].name.toLowerCase().includes('name')) {
        textInputs[i].value = userName;
        break;
      }
    }

    k.target = 'exit-popup-response-frame';

    try {
      k.submit();
      localStorage.setItem('exit-popup-submitted', '1');

      setTimeout(() => {
        const front = popup.querySelector('.exit-popup__face--front');
        const back = popup.querySelector('.exit-popup__face--back');
        if (front) front.hidden = true;
        if (back) back.hidden = false;
      }, SUCCESS_DELAY_MS);

      setTimeout(() => {
        window.location.href = REDIRECT_URL;
      }, REDIRECT_DELAY_MS);
    } catch (err) {
      msg.textContent = 'Noe gikk galt. Prøv igjen.';
      button.disabled = false;
      button.textContent = originalButtonText;
    }
  });
})();
