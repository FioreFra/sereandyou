(function () {
  'use strict';

  var STORAGE_KEY = 'sereandyou_cookie_consent';
  var VIGLINK_KEY = '623e2468728aa8cd9051ec3242a03b9e';
  var CLARITY_ID = 'xqu7gqtct7';

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveConsent(consent) {
    consent.timestamp = new Date().toISOString();
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch (e) {}
    applyConsent(consent);
  }

  function insertViglinkScript() {
    window.vglnk = window.vglnk || { key: VIGLINK_KEY };
    var s = document.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = '//cdn.viglink.com/api/vglnk.js';
    var r = document.getElementsByTagName('script')[0];
    r.parentNode.insertBefore(s, r);
  }

  function loadViglink() {
    if (window.__vglnkLoaded) return;
    window.__vglnkLoaded = true;
    insertViglinkScript();
  }

  // VigLink genera i link di affiliazione ai prodotti: è sempre attivo,
  // non richiede consenso. Alcune pagine (es. look.html) iniettano nuovi
  // link dopo il caricamento iniziale e richiamano questa funzione per
  // far rianalizzare la pagina a VigLink.
  window.reloadViglink = function () {
    insertViglinkScript();
  };

  function loadClarity() {
    if (window.__clarityLoaded) return;
    window.__clarityLoaded = true;
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = 'https://www.clarity.ms/tag/' + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, 'clarity', 'script', CLARITY_ID);
  }

  function applyConsent(consent) {
    if (consent.analytics) loadClarity();
  }

  var banner = null;

  function buildBanner(existingConsent) {
    if (banner) return banner;

    var el = document.createElement('div');
    el.id = 'cc-banner';
    el.className = 'cc-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'false');
    el.setAttribute('aria-label', 'Preferenze cookie');

    el.innerHTML =
      '<div class="cc-banner__content">' +
        '<p class="cc-banner__text">Usiamo cookie tecnici e di affiliazione (VigLink) necessari al funzionamento del sito. Solo con il tuo consenso usiamo anche cookie di statistica (Microsoft Clarity) per capire come viene usato il sito. Puoi accettare, rifiutare o scegliere le tue preferenze. <a href="cookie-policy.html">Scopri di più</a>.</p>' +
        '<div class="cc-banner__prefs" id="cc-prefs" hidden>' +
          '<label class="cc-toggle">' +
            '<input type="checkbox" checked disabled>' +
            '<span>Tecnici e di affiliazione (sempre attivi)</span>' +
          '</label>' +
          '<label class="cc-toggle">' +
            '<input type="checkbox" id="cc-analytics">' +
            '<span>Statistiche (Microsoft Clarity)</span>' +
          '</label>' +
        '</div>' +
        '<div class="cc-banner__actions">' +
          '<button type="button" class="cc-btn cc-btn--text" id="cc-customize">Personalizza</button>' +
          '<button type="button" class="cc-btn cc-btn--outline" id="cc-reject">Rifiuta tutti</button>' +
          '<button type="button" class="cc-btn cc-btn--save" id="cc-save" hidden>Salva preferenze</button>' +
          '<button type="button" class="cc-btn cc-btn--primary" id="cc-accept">Accetta tutti</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(el);
    banner = el;

    var prefs = el.querySelector('#cc-prefs');
    var analyticsInput = el.querySelector('#cc-analytics');
    var customizeBtn = el.querySelector('#cc-customize');
    var saveBtn = el.querySelector('#cc-save');
    var acceptBtn = el.querySelector('#cc-accept');
    var rejectBtn = el.querySelector('#cc-reject');

    if (existingConsent) {
      analyticsInput.checked = !!existingConsent.analytics;
    }

    function close() {
      el.remove();
      banner = null;
    }

    customizeBtn.addEventListener('click', function () {
      var open = !prefs.hidden;
      prefs.hidden = open;
      saveBtn.hidden = open;
      customizeBtn.textContent = open ? 'Personalizza' : 'Nascondi preferenze';
    });

    acceptBtn.addEventListener('click', function () {
      saveConsent({ necessary: true, analytics: true });
      close();
    });

    rejectBtn.addEventListener('click', function () {
      saveConsent({ necessary: true, analytics: false });
      close();
    });

    saveBtn.addEventListener('click', function () {
      saveConsent({
        necessary: true,
        analytics: analyticsInput.checked
      });
      close();
    });

    return el;
  }

  // Permette di riaprire il pannello preferenze da un link nel footer,
  // per cambiare idea dopo la prima scelta.
  window.openCookiePreferences = function () {
    var consent = getConsent();
    var el = buildBanner(consent);
    var prefs = el.querySelector('#cc-prefs');
    var saveBtn = el.querySelector('#cc-save');
    var customizeBtn = el.querySelector('#cc-customize');
    prefs.hidden = false;
    saveBtn.hidden = false;
    customizeBtn.textContent = 'Nascondi preferenze';
  };

  function wireFooterLinks() {
    var links = document.querySelectorAll('[data-cc-open]');
    for (var i = 0; i < links.length; i++) {
      links[i].addEventListener('click', function (ev) {
        ev.preventDefault();
        window.openCookiePreferences();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireFooterLinks();
    loadViglink();
    var consent = getConsent();
    if (consent) {
      applyConsent(consent);
    } else {
      buildBanner(null);
    }
  });
})();
