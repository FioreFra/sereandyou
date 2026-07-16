(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURAZIONE — incolla qui l'URL di deploy della Web App
     di Google Apps Script che scrive sul foglio "newsletter".
     Finché resta col valore placeholder, il modulo iscrizione
     funziona solo a livello visivo, senza salvare nulla.
     ═══════════════════════════════════════════════════════════ */
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxQC0mMfe-nX67BinxaRM07Ak_tmz_tghH3bOBfMAh8nM8QxwSQSXohOiXJtCjC2MfgHg/exec';

  function isConfigured() {
    return /^https:\/\/script\.google\.com\//.test(WEB_APP_URL);
  }

  document.querySelectorAll('.news form').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var button = form.querySelector('button');
      var input = form.querySelector('input');
      var email = (input.value || '').trim();
      if (!email) return;

      function markSubscribed() {
        input.setAttribute('disabled', 'true');
        button.textContent = 'Iscritta ✓';
        button.setAttribute('disabled', 'true');
      }

      if (!isConfigured()) {
        markSubscribed();
        return;
      }

      button.setAttribute('disabled', 'true');
      button.textContent = 'Invio…';

      fetch(WEB_APP_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: new URLSearchParams({ email: email }),
      }).then(function () {
        markSubscribed();
      }).catch(function () {
        button.removeAttribute('disabled');
        button.textContent = 'Riprova';
      });
    });
  });
})();
