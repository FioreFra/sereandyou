(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURAZIONE — incolla qui l'URL di deploy della Web App
     di Google Apps Script che scrive sul foglio "Recensioni"
     (stesso meccanismo già usato per la newsletter in newsletter.js).
     Finché resta col valore placeholder, il form funziona solo a
     livello visivo, senza salvare nulla.

     Come collegarlo a un Google Sheet (una volta sola):
     1. Crea un nuovo Google Sheet (o usa quello della newsletter)
        e aggiungi un foglio chiamato "Recensioni" con le colonne:
        Data | Nome | Prodotto | Voto | Recensione | Email
     2. Nel foglio vai su Estensioni → Apps Script e incolla:

        function doPost(e) {
          var sheet = SpreadsheetApp.getActiveSpreadsheet()
            .getSheetByName('Recensioni');
          sheet.appendRow([
            new Date(),
            e.parameter.nome || '',
            e.parameter.prodotto || '',
            e.parameter.voto || '',
            e.parameter.testo || '',
            e.parameter.email || ''
          ]);
          return ContentService.createTextOutput('OK');
        }

     3. Distribuisci → Nuova distribuzione → tipo "Web app",
        accesso "Chiunque", copia l'URL generato e incollalo qui sotto.
     4. Le recensioni arrivano nel foglio "Recensioni": scegli quelle
        da pubblicare e caricale a mano sul sito.
     ═══════════════════════════════════════════════════════════ */
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxcQcKj1O1MYQ80oQNngD7ILvH5ra24rFARx7xe53J3zjyAiom7NOeDUvfJ1SHxysXICA/exec';

  function isConfigured() {
    return /^https:\/\/script\.google\.com\//.test(WEB_APP_URL);
  }

  var form = document.getElementById('review-form');
  if (!form) return;

  var status = document.getElementById('review-status');
  var button = form.querySelector('button[type="submit"]');

  function setStatus(text) {
    if (status) status.textContent = text;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var nome = form.nome.value.trim();
    var testo = form.testo.value.trim();
    var voto = form.querySelector('input[name="voto"]:checked');
    if (!nome || !testo || !voto) return;

    var payload = {
      nome: nome,
      prodotto: form.prodotto.value.trim(),
      voto: voto.value,
      testo: testo,
      email: form.email.value.trim(),
    };

    function markSent() {
      form.reset();
      setStatus('Grazie! La tua recensione è stata inviata ✓');
    }

    if (!isConfigured()) {
      markSent();
      return;
    }

    button.setAttribute('disabled', 'true');
    setStatus('Invio…');

    fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams(payload),
    }).then(function () {
      button.removeAttribute('disabled');
      markSent();
    }).catch(function () {
      button.removeAttribute('disabled');
      setStatus('Invio non riuscito, riprova tra poco.');
    });
  });
})();
