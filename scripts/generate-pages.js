'use strict';

/*
 * Genera pagine statiche reali per ogni look/post attivo, cosi' i link
 * condivisi (es. su TikTok) puntano direttamente a un URL vero
 * (/look/<id>/, /post/<id>/, /sereyou/look/<id>/) senza mai passare da
 * un redirect o da una query string "?id=", che il browser in-app di
 * TikTok tende a bloccare.
 *
 * I tre link CSV vengono letti direttamente da js/sereyou-data.js, cosi'
 * restano un'unica fonte di verita' condivisa col sito.
 */

const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const ROOT = path.join(__dirname, '..');

function extractCsvUrl(dataJsSource, key) {
  const match = dataJsSource.match(new RegExp(key + "\\s*:\\s*'([^']+)'"));
  if (!match) throw new Error(`URL CSV non trovato per ${key} in js/sereyou-data.js`);
  return match[1];
}

async function fetchCsvRows(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Errore ${res.status} scaricando il CSV: ${url}`);
  const text = await res.text();
  return Papa.parse(text, { header: true, skipEmptyLines: true }).data;
}

function isActive(row) {
  return (row.attivo || '').trim().toUpperCase() === 'SI';
}

function activeIds(rows) {
  return rows.filter(isActive).map((r) => (r.id || '').trim()).filter(Boolean);
}

function isSafeId(id) {
  return !!id && !/[\\/]/.test(id) && id !== '.' && id !== '..';
}

/* Riscrive gli href/src relativi del template in percorsi assoluti dal
   root del sito (necessario perche' la pagina generata vive annidata,
   es. /look/123/index.html), e inietta l'id come variabile globale. */
function buildStaticPage(templateHtml, basePrefix, idVarName, id) {
  let html = templateHtml.replace(
    /(href|src)="(?!https?:|\/\/|#|mailto:)([^"/][^"]*)"/g,
    (full, attr, relPath) => `${attr}="${basePrefix}/${relPath}"`
  );
  const idScript = `<script>window.${idVarName} = ${JSON.stringify(id)};</script>\n`;
  html = html.replace('</head>', `${idScript}</head>`);
  return html;
}

function syncGeneratedDir(baseDir, currentIds, templateHtml, basePrefix, idVarName) {
  fs.mkdirSync(baseDir, { recursive: true });

  const existing = fs.readdirSync(baseDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const currentSet = new Set(currentIds);

  for (const dirName of existing) {
    if (!currentSet.has(dirName)) {
      fs.rmSync(path.join(baseDir, dirName), { recursive: true, force: true });
      console.log(`- rimosso ${path.relative(ROOT, baseDir)}/${dirName}/ (non piu' attivo)`);
    }
  }

  for (const id of currentIds) {
    if (!isSafeId(id)) {
      console.warn(`! id ignorato perche' non sicuro per un nome di cartella: ${JSON.stringify(id)}`);
      continue;
    }
    const dir = path.join(baseDir, id);
    fs.mkdirSync(dir, { recursive: true });
    const html = buildStaticPage(templateHtml, basePrefix, idVarName, id);
    fs.writeFileSync(path.join(dir, 'index.html'), html);
  }

  console.log(`✓ ${path.relative(ROOT, baseDir)}/: ${currentIds.length} pagine generate`);
}

async function main() {
  const dataJsSource = fs.readFileSync(path.join(ROOT, 'js', 'sereyou-data.js'), 'utf8');
  const postsCsvUrl = extractCsvUrl(dataJsSource, 'postsCsvUrl');
  const outfitsCsvUrl = extractCsvUrl(dataJsSource, 'outfitsCsvUrl');

  const [postRows, outfitRows] = await Promise.all([
    fetchCsvRows(postsCsvUrl),
    fetchCsvRows(outfitsCsvUrl),
  ]);

  const postIds = activeIds(postRows);
  const lookIds = activeIds(outfitRows);

  const rootLookTemplate = fs.readFileSync(path.join(ROOT, 'look.html'), 'utf8');
  const rootPostTemplate = fs.readFileSync(path.join(ROOT, 'post.html'), 'utf8');
  const sereyouLookTemplate = fs.readFileSync(path.join(ROOT, 'sereyou', 'look.html'), 'utf8');

  syncGeneratedDir(path.join(ROOT, 'look'), lookIds, rootLookTemplate, '', 'SEREYOU_LOOK_ID');
  syncGeneratedDir(path.join(ROOT, 'post'), postIds, rootPostTemplate, '', 'SEREYOU_POST_ID');
  syncGeneratedDir(path.join(ROOT, 'sereyou', 'look'), lookIds, sereyouLookTemplate, '/sereyou', 'SEREYOU_LOOK_ID');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
