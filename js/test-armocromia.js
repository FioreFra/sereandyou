(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURAZIONE INVIO EMAIL
     Riusa la stessa Web App Google Apps Script già collegata al
     modulo newsletter del sito (vedi js/newsletter.js), così i
     contatti finiscono nello stesso Google Sheet. Il campo
     "fonte" distingue i lead del quiz da quelli della newsletter
     generica — perché lo Sheet lo salvi, aggiungi una colonna
     "fonte" (e "stagione") allo script Apps Script lato server:
     oggi lo script probabilmente legge solo e.parameter.email,
     quindi i due campi extra vengono inviati ma ignorati finché
     non lo si aggiorna.
     ═══════════════════════════════════════════════════════════ */
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxQC0mMfe-nX67BinxaRM07Ak_tmz_tghH3bOBfMAh8nM8QxwSQSXohOiXJtCjC2MfgHg/exec';

  function isConfigured() {
    return /^https:\/\/script\.google\.com\//.test(WEB_APP_URL);
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

  var quizEl = document.getElementById('quiz');
  var cardEl = document.getElementById('quiz-card');
  var progressFill = document.getElementById('quiz-progress-fill');
  var progressLabel = document.getElementById('quiz-progress-label');
  var resultEl = document.getElementById('quiz-result');
  var resultSeasonEl = document.getElementById('result-season');
  var resultDescEl = document.getElementById('result-desc');
  var restartBtn = document.getElementById('quiz-restart');

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
    var season = computeSeason();
    resultSeasonEl.textContent = season.nome;
    resultDescEl.textContent = season.desc;
    resultEl.hidden = false;
  }

  restartBtn.addEventListener('click', function () {
    answers = [];
    currentStep = 0;
    resultEl.hidden = true;
    quizEl.hidden = false;

    var form = document.getElementById('quiz-email-form');
    var success = document.getElementById('quiz-email-success');
    form.hidden = false;
    form.reset();
    var btn = form.querySelector('button');
    btn.removeAttribute('disabled');
    btn.textContent = 'Voglio la palette';
    success.hidden = true;

    renderStep();
  });

  /* ─── Raccolta email ─── */
  var emailForm = document.getElementById('quiz-email-form');
  emailForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = emailForm.querySelector('input[type="email"]');
    var button = emailForm.querySelector('button');
    var email = (input.value || '').trim();
    if (!email) return;

    var successEl = document.getElementById('quiz-email-success');

    function markSent() {
      emailForm.hidden = true;
      successEl.hidden = false;
    }

    if (!isConfigured()) {
      markSent();
      return;
    }

    button.setAttribute('disabled', 'true');
    button.textContent = 'Invio…';

    fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams({
        email: email,
        stagione: resultSeasonEl.textContent,
        fonte: 'test-armocromia'
      })
    }).then(function () {
      markSent();
    }).catch(function () {
      button.removeAttribute('disabled');
      button.textContent = 'Riprova';
    });
  });

  renderStep();
})();
