(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════════
     CONFIGURAZIONE INVIO NUMERO
     Web App Apps Script collegata al foglio dedicato "Lead Test
     Armocromia | Sere&You" (cartella SERE&YOU/Armocromia su Drive).
     Il doPost() lì appende: telefono, le 10 risposte (q1..q10), gli
     assi calcolati (temperatura/contrasto/valore), la stagione e
     "fonte" — nello stesso ordine delle colonne del foglio. Il
     risultato non si vede sulla pagina: arriva su WhatsApp al
     numero lasciato, mandato manualmente da chi gestisce il foglio.
     ═══════════════════════════════════════════════════════════ */
  var WEB_APP_URL = 'https://script.google.com/macros/s/AKfycby1kJd0qivWgFFwJ0_RJ4ibxEUGdoq7NKzj19QRF85nZJC3ZcfjIWwKhnZTLgLH6miu/exec';

  function isConfigured() {
    return /^https:\/\/script\.google\.com\//.test(WEB_APP_URL);
  }

  /* ───────────────────────────────────────────────────────────
     DOMANDE
     10 domande su 3 caratteristiche:
     - "axis" (freddo/caldo): domande 1,3,4,8,9,10 — 6 segnali,
       decidono la temperatura.
     - "contrast" (alto/basso): domande 2,5,7 — 3 segnali (sempre
       dispari, nessuno saltabile: il pareggio è impossibile).
     - "valore" (chiaro/scuro): domanda 6, un solo segnale. Non
       decide la stagione (che resta temperatura × contrasto,
       4 caselle) ma aggiunge una riga al risultato — un quinto
       asse indipendente non avrebbe altre stagioni in cui finire.
     ─────────────────────────────────────────────────────────── */
  var QUESTIONS = [
    {
      title: 'Arancione o fucsia?',
      hint: 'Immagina i due colori vicino al viso, o prova un capo se ce l\'hai.',
      options: [
        { label: 'Arancione', axis: 'caldo' },
        { label: 'Fucsia', axis: 'freddo' }
      ]
    },
    {
      title: 'Nero vicino al viso',
      hint: 'Vale anche un maglione o una sciarpa scura.',
      options: [
        { label: 'Mi illumina', contrast: 'alto' },
        { label: 'Mi spegne', contrast: 'basso' }
      ]
    },
    {
      title: 'Oro o argento?',
      hint: 'Prova un gioiello vicino al viso — o immaginalo.',
      options: [
        { label: 'Argento', axis: 'freddo' },
        { label: 'Oro', axis: 'caldo' }
      ]
    },
    {
      title: 'Bianco ottico o crema?',
      hint: 'Il bianco ottico è il bianco puro; il crema tende all\'avorio.',
      options: [
        { label: 'Bianco ottico', axis: 'freddo' },
        { label: 'Color crema', axis: 'caldo' }
      ]
    },
    {
      title: 'Colori accesi o soft?',
      hint: 'Pensa a come ti senti vestita: più a tuo agio nel deciso o nel morbido.',
      options: [
        { label: 'Accesi e decisi', contrast: 'alto' },
        { label: 'Soft e polverosi', contrast: 'basso' }
      ]
    },
    {
      title: 'Colori chiari o profondi?',
      hint: 'Non caldo o freddo: quanto sono chiari o scuri.',
      options: [
        { label: 'Chiari e luminosi', valore: 'chiaro' },
        { label: 'Profondi e scuri', valore: 'scuro' }
      ]
    },
    {
      title: 'Contrasto netto (bianco + nero)',
      hint: 'Immagina un outfit o un trucco con bianco e nero insieme.',
      options: [
        { label: 'Mi valorizzano', contrast: 'alto' },
        { label: 'Mi spengono', contrast: 'basso' }
      ]
    },
    {
      title: 'Beige vicino al viso',
      hint: 'Vale anche cammello o tortora.',
      options: [
        { label: 'Più luminosa', axis: 'caldo' },
        { label: 'Si spegne', axis: 'freddo' }
      ]
    },
    {
      title: 'Bianco puro',
      hint: 'Il bianco puro, non l\'avorio o il panna.',
      options: [
        { label: 'Più fresca, riposata', axis: 'freddo' },
        { label: 'Più stanca, spenta', axis: 'caldo' }
      ]
    },
    {
      title: 'Capelli bianchi (se presenti)',
      hint: 'Se non ne hai ancora, salta pure.',
      options: [
        { label: 'Argento o grigio ghiaccio', axis: 'freddo' },
        { label: 'Giallo o avorio', axis: 'caldo' },
        { label: 'Non ho capelli bianchi — salta questa domanda', axis: null, skip: true }
      ]
    }
  ];

  var SEASONS = {
    'freddo-alto': {
      nome: 'Inverno',
      slug: 'inverno',
      desc: 'Sei probabilmente Inverno: pelle, capelli e occhi creano un contrasto netto, e sono i colori freddi e decisi a farti brillare di più. Il pastello ti spegne.',
      chiaro: ' Il tuo registro è quello ghiacciato, luminoso, quasi cristallino.',
      scuro: ' Il tuo registro è quello profondo, quasi notturno.'
    },
    'freddo-basso': {
      nome: 'Estate',
      slug: 'estate',
      desc: 'Sei probabilmente Estate: toni freddi ma sfumati, senza strappi tra pelle, capelli e occhi. I colori morbidi ti valorizzano, quelli troppo decisi ti induriscono i lineamenti.',
      chiaro: ' Il tuo registro è quello più chiaro e polveroso, delicato.',
      scuro: ' Il tuo registro è quello medio-scuro, sempre morbido, mai duro.'
    },
    'caldo-alto': {
      nome: 'Autunno',
      slug: 'autunno',
      desc: 'Sei probabilmente Autunno: pelle e capelli caldi e terrosi, con un contrasto deciso rispetto agli occhi. I colori caldi e profondi ti danno luce, i pastelli ti spengono.',
      chiaro: ' Il tuo registro è quello caldo ma luminoso, mai cupo.',
      scuro: ' Il tuo registro è quello caldo e profondo, quasi terroso.'
    },
    'caldo-basso': {
      nome: 'Primavera',
      slug: 'primavera',
      desc: 'Sei probabilmente Primavera: toni caldi e delicati, sfumati tra loro senza strappi. I colori chiari e luminosi ti illuminano, quelli scuri o freddi ti appesantiscono.',
      chiaro: ' Il tuo registro è quello più chiaro e fresco, leggero.',
      scuro: ' Il tuo registro è quello caldo e pieno, mai spento.'
    }
  };

  var answers = [];
  var currentStep = 0;

  var quizEl = document.getElementById('quiz');
  var cardEl = document.getElementById('quiz-card');
  var progressFill = document.getElementById('quiz-progress-fill');
  var progressLabel = document.getElementById('quiz-progress-label');
  var resultEl = document.getElementById('quiz-result');
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
    var lastTempAnswer = null;
    var alto = 0;
    var basso = 0;
    var valore = null;

    answers.forEach(function (a) {
      if (a.axis === 'freddo') { cold += 1; lastTempAnswer = 'freddo'; }
      if (a.axis === 'caldo') { warm += 1; lastTempAnswer = 'caldo'; }
      if (a.contrast === 'alto') alto += 1;
      if (a.contrast === 'basso') basso += 1;
      if (a.valore) valore = a.valore;
    });

    var temperatura;
    if (warm === cold) {
      // Pareggio possibile solo se la domanda sui capelli bianchi (l'unica
      // saltabile, sempre l'ultima) NON viene saltata: con 6 domande sulla
      // temperatura il totale è pari e può dividersi 3-3. In quel caso
      // decide proprio la risposta sui capelli bianchi, l'ultima data.
      temperatura = lastTempAnswer;
    } else {
      temperatura = warm > cold ? 'caldo' : 'freddo';
    }

    // Il contrasto arriva da 3 domande, mai saltabili: il totale è sempre
    // dispari, quindi un pareggio è matematicamente impossibile.
    var contrasto = alto > basso ? 'alto' : 'basso';

    var season = SEASONS[temperatura + '-' + contrasto];
    return {
      nome: season.nome,
      slug: season.slug,
      desc: season.desc + (valore === 'chiaro' ? season.chiaro : season.scuro),
      temperatura: temperatura,
      contrasto: contrasto,
      valore: valore
    };
  }

  // Risultato dell'ultimo test completato: non viene mai mostrato in
  // pagina, ma serve al form telefono per mandare a Google Sheet la
  // stagione e gli assi che l'hanno determinata, insieme alle risposte
  // singole in `answers`.
  var currentSeason = null;

  function showResult() {
    quizEl.hidden = true;
    currentSeason = computeSeason();
    resultEl.hidden = false;
  }

  restartBtn.addEventListener('click', function () {
    answers = [];
    currentStep = 0;
    currentSeason = null;
    resultEl.hidden = true;
    quizEl.hidden = false;

    var form = document.getElementById('quiz-phone-form');
    var success = document.getElementById('quiz-phone-success');
    form.hidden = false;
    form.reset();
    var btn = form.querySelector('button');
    btn.removeAttribute('disabled');
    btn.textContent = 'Voglio il risultato →';
    success.hidden = true;

    renderStep();
  });

  /* ─── Raccolta numero di telefono ─── */
  var phoneForm = document.getElementById('quiz-phone-form');
  phoneForm.addEventListener('submit', function (e) {
    e.preventDefault();
    var input = phoneForm.querySelector('input[type="tel"]');
    var button = phoneForm.querySelector('button');
    var telefono = (input.value || '').trim();
    if (!telefono) return;

    var successEl = document.getElementById('quiz-phone-success');

    function markSent() {
      phoneForm.hidden = true;
      successEl.hidden = false;
    }

    if (!isConfigured()) {
      markSent();
      return;
    }

    button.setAttribute('disabled', 'true');
    button.textContent = 'Invio…';

    // Manda anche le 10 risposte singole (q1..q10, l'etichetta scelta),
    // non solo il risultato finale: utile per capire quali domande sono
    // più divisive o rivedere lo scoring in futuro.
    var payload = { telefono: telefono };
    answers.forEach(function (a, i) {
      payload['q' + (i + 1)] = a.label;
    });
    payload.temperatura = currentSeason.temperatura;
    payload.contrasto = currentSeason.contrasto;
    payload.valore = currentSeason.valore;
    payload.stagione = currentSeason.nome;
    payload.fonte = 'test-armocromia';

    fetch(WEB_APP_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: new URLSearchParams(payload)
    }).then(function () {
      markSent();
    }).catch(function () {
      button.removeAttribute('disabled');
      button.textContent = 'Riprova';
    });
  });

  renderStep();
})();
