(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURAZIONE INVIO EMAIL — Brevo
     Il form invia l'email al modulo Brevo collegato alla lista
     scelta per il lead magnet "Armocromia over 40". Non serve
     nessuna API key nel codice: si usa l'URL del modulo Brevo
     (form action), che è pensato apposta per essere chiamato da
     un form pubblico senza esporre credenziali.

     Per attivarlo:
     1. Su Brevo: Contatti → Moduli → Crea modulo → tipo
        "Modulo classico", collegato alla lista di destinazione.
     2. Nel builder lascia solo il campo Email (rimuovi
        nome/cognome se non servono). Se vuoi salvare anche la
        stagione come attributo del contatto, crea prima
        l'attributo personalizzato STAGIONE (tipo testo) in
        Contatti → Impostazioni → Attributi contatto, poi
        aggiungilo al modulo come campo nascosto.
     3. Vai su Condividi → Codice HTML e copia l'URL nell'
        attributo action del tag <form> (del tipo
        https://xxxxx.sibforms.com/serve/MUIFxxxxxxxxxxxxx).
        Controlla anche i nomi esatti dei campi presenti nel
        codice: di solito sono EMAIL e, se creato, STAGIONE;
        email_address_check è un campo honeypot anti-spam e va
        sempre lasciato vuoto.
     4. Incolla l'URL qui sotto al posto del placeholder.
     Finché BREVO_FORM_URL resta col valore placeholder, il
     modulo funziona solo a livello visivo, senza salvare nulla.
     ═══════════════════════════════════════════════════════════ */
  var BREVO_FORM_URL = 'https://SOSTITUISCI.sibforms.com/serve/SOSTITUISCI';

  function isConfigured() {
    return /^https:\/\/[a-z0-9.-]+\.sibforms\.com\//.test(BREVO_FORM_URL);
  }

  /* ───────────────────────────────────────────────────────────
     DOMANDE
     Ogni opzione porta un punteggio "asse" (freddo/caldo) e,
     solo per l'ultima domanda, il contrasto (alto/basso).
     ─────────────────────────────────────────────────────────── */
  var QUESTIONS = [
    {
      title: 'Capelli bianchi (se presenti)',
      hint: 'Se non ne hai ancora, salta pure.',
      options: [
        { label: 'Tendono ad argento o grigio ghiaccio', axis: 'freddo' },
        { label: 'Tendono a giallo, avorio o champagne', axis: 'caldo' },
        { label: 'Non ho capelli bianchi — salta questa domanda', axis: null, skip: true }
      ]
    },
    {
      title: 'Vene del polso',
      hint: 'Guardale alla luce naturale, non artificiale.',
      options: [
        { label: 'Bluastre o violacee', axis: 'freddo' },
        { label: 'Verdi o olivastre', axis: 'caldo' }
      ]
    },
    {
      title: 'Oro o argento?',
      hint: 'Prova un gioiello vicino al viso — o immaginalo.',
      options: [
        { label: 'L\'argento illumina di più', axis: 'freddo' },
        { label: 'L\'oro illumina di più', axis: 'caldo' }
      ]
    },
    {
      title: 'Contrasto naturale',
      hint: 'Guarda pelle, capelli e occhi insieme, allo specchio.',
      options: [
        { label: 'Contrasto netto tra i tre', contrast: 'alto' },
        { label: 'Tonalità simili, sfumate tra loro', contrast: 'basso' }
      ]
    }
  ];

  var SEASONS = {
    'freddo-alto': {
      nome: 'Inverno',
      desc: 'Sei probabilmente Inverno: pelle, capelli e occhi creano un contrasto netto, e sono i colori freddi e decisi a farti brillare di più. Il pastello ti spegne.'
    },
    'freddo-basso': {
      nome: 'Estate',
      desc: 'Sei probabilmente Estate: toni freddi ma sfumati, senza strappi tra pelle, capelli e occhi. I colori morbidi ti valorizzano, quelli troppo decisi ti induriscono i lineamenti.'
    },
    'caldo-alto': {
      nome: 'Autunno',
      desc: 'Sei probabilmente Autunno: pelle e capelli caldi e terrosi, con un contrasto deciso rispetto agli occhi. I colori caldi e profondi ti danno luce, i pastelli ti spengono.'
    },
    'caldo-basso': {
      nome: 'Primavera',
      desc: 'Sei probabilmente Primavera: toni caldi e delicati, sfumati tra loro senza strappi. I colori chiari e luminosi ti illuminano, quelli scuri o freddi ti appesantiscono.'
    }
  };

  var answers = [];
  var currentStep = 0;
  var currentSeason = null;

  var quizEl = document.getElementById('quiz');
  var cardEl = document.getElementById('quiz-card');
  var progressFill = document.getElementById('quiz-progress-fill');
  var progressLabel = document.getElementById('quiz-progress-label');
  var resultEl = document.getElementById('quiz-result');
  var gateEl = document.getElementById('quiz-gate');
  var revealEl = document.getElementById('quiz-reveal');
  var resultSeasonEl = document.getElementById('result-season');
  var resultDescEl = document.getElementById('result-desc');
  var restartBtn = document.getElementById('quiz-restart');
  var emailForm = document.getElementById('quiz-email-form');

  function renderStep() {
    var q = QUESTIONS[currentStep];
    progressFill.style.width = ((currentStep + 1) / QUESTIONS.length * 100) + '%';
    progressLabel.textContent = 'Domanda ' + (currentStep + 1) + ' di ' + QUESTIONS.length;

    var html = '';
    if (currentStep > 0) {
      html += '<button type="button" class="quiz-card__back" id="quiz-back">← Indietro</button>';
    }
    html += '<h2>' + q.title + '</h2>';
    if (q.hint) html += '<p class="quiz-card__hint">' + q.hint + '</p>';
    html += '<div class="quiz-options">';
    q.options.forEach(function (opt, i) {
      var cls = opt.skip ? 'quiz-option quiz-option--skip' : 'quiz-option';
      html += '<button type="button" class="' + cls + '" data-index="' + i + '">' + opt.label + '</button>';
    });
    html += '</div>';

    cardEl.innerHTML = html;

    var backBtn = document.getElementById('quiz-back');
    if (backBtn) {
      backBtn.addEventListener('click', function () {
        currentStep -= 1;
        answers.pop();
        renderStep();
      });
    }

    cardEl.querySelectorAll('.quiz-option').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var opt = q.options[parseInt(btn.getAttribute('data-index'), 10)];
        answers.push(opt);
        currentStep += 1;
        if (currentStep < QUESTIONS.length) {
          renderStep();
        } else {
          showResult();
        }
      });
    });
  }

  function computeSeason() {
    var warm = 0;
    var cold = 0;
    var contrast = null;
    var lastAxisAnswer = null;

    answers.forEach(function (a) {
      if (a.axis === 'freddo') { cold += 1; lastAxisAnswer = 'freddo'; }
      if (a.axis === 'caldo') { warm += 1; lastAxisAnswer = 'caldo'; }
      if (a.contrast) contrast = a.contrast;
    });

    var temperatura;
    if (warm === cold) {
      // Pareggio possibile solo se la domanda sui capelli bianchi
      // è stata saltata: si usa oro/argento (domanda 3) come ago
      // della bilancia, perché è il segnale più diretto.
      temperatura = lastAxisAnswer === 'caldo' ? 'caldo' : 'freddo';
    } else {
      temperatura = warm > cold ? 'caldo' : 'freddo';
    }

    return SEASONS[temperatura + '-' + contrast];
  }

  function showResult() {
    quizEl.hidden = true;
    // La stagione viene calcolata subito (serve per il testo da
    // mandare a Brevo) ma resta nascosta: si vede solo il gate
    // email finché il form non viene inviato.
    currentSeason = computeSeason();
    resultSeasonEl.textContent = currentSeason.nome;
    resultDescEl.textContent = currentSeason.desc;
    resultEl.hidden = false;
    gateEl.hidden = false;
    revealEl.hidden = true;
  }

  restartBtn.addEventListener('click', function () {
    answers = [];
    currentStep = 0;
    currentSeason = null;
    resultEl.hidden = true;
    quizEl.hidden = false;

    emailForm.reset();
    emailForm.hidden = false;
    var btn = emailForm.querySelector('button');
    btn.removeAttribute('disabled');
    btn.textContent = 'Scopri il risultato';
    gateEl.hidden = false;
    revealEl.hidden = true;

    renderStep();
  });

  /* ─── Raccolta email: il risultato si sblocca solo da qui ─── */
  emailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = emailForm.querySelector('input[type="email"]');
    var button = emailForm.querySelector('button');
    var email = (input.value || '').trim();
    if (!email) return;

    function reveal() {
      gateEl.hidden = true;
      revealEl.hidden = false;
    }

    if (!isConfigured()) {
      reveal();
      return;
    }

    button.setAttribute('disabled', 'true');
    button.textContent = 'Invio…';

    fetch(BREVO_FORM_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams({
        EMAIL: email,
        STAGIONE: currentSeason ? currentSeason.nome : '',
        email_address_check: ''
      })
    }).then(function () {
      reveal();
    }).catch(function () {
      button.removeAttribute('disabled');
      button.textContent = 'Riprova';
    });
  });

  renderStep();
})();
