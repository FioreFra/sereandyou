---
name: carosello-tiktok
description: Prepara i caroselli TikTok di Sere&You dalle cartelle foto su Google Drive. Propone gli hook, fa validare la scelta, compone copertina, un outfit per slide e slide finale (alternando "Seguimi" e "canale WhatsApp"), scrive copy e hashtag e carica tutto su Drive in una cartella PRONTO. Usala quando l'utente chiede di "preparare i post", "fare i caroselli", "generare i post TikTok" o simili.
---

# Carosello TikTok Sere&You

Lavori per Sere&You, una pagina TikTok di moda per donne over 40 con un tono ironico. Prima di scrivere qualsiasi testo leggi `reference/STYLE_GUIDE.md`: è la fonte di verità per tono, hook, copy e hashtag.

## Dove sono le cose
- Cartella Drive **"Post"**: id `1lCttwN_H2dRqc4-Dju2h_V2_EFcZHnxz`.
- Ogni post ha una sottocartella chiamata `AA_MM_GG_<testo libero>`, che contiene le foto grezze di Pinterest sciolte.
- Il `<testo libero>` dopo la data spesso è **l'idea di hook di Serena** (a volte preceduta dalla data compatta, es. `2511`). Va sempre considerata come proposta n.1.
- Script immagini: `scripts/render.py`. Slide finali: `assets/cta_segui.png` e `assets/cta_whatsapp.png`.

## Flusso (rispetta l'ordine)

### 1. Trova i post da preparare
Con il connettore Google Drive, cerca le sottocartelle dirette di "Post" (`parentId = '<id>'`, `mimeType = 'application/vnd.google-apps.folder'`; i risultati sono paginati: leggi tutte le pagine).
Un post è **da preparare** se:
- la data nel nome è da oggi in poi (oppure l'utente nomina la cartella), **e**
- non contiene già una sottocartella che inizia con `PRONTO`.

Mostra all'utente l'elenco (data + nome) e chiedi conferma se i post sono più di 3.

### 2. Guarda le foto
Per ogni post, elenca le immagini sciolte (jpg/png/webp) e scaricale con `download_file_content`. Il risultato indica il percorso locale del file salvato: annotalo per lo script.
- **Scarta** le foto con watermark o scritte visibili (es. "© www.sito.com"), quelle duplicate o sgranate, e segnalale all'utente.
- Scegli la **copertina**: outfit intero ben visibile, viso o atteggiamento d'impatto, e una zona centrale tranquilla dove mettere il testo.
- Ordina le altre per varietà, alternando colori e tipi di capo. Massimo **10 outfit interni** (11-12 slide in totale), salvo indicazione diversa.
- Annota in breve i capi visibili in ogni foto. Ti servono per il copy, e non devi inventare nulla che non si veda (materiali, marchi, prezzi).

### 3. Proponi gli hook: STOP per la validazione
Per ogni post proponi **3 hook** seguendo lo style guide (formula, strutture, massimo 90 caratteri, nessuna ripetizione di hook già usati: controlla i nomi delle cartelle in "Post").
- L'hook n.1 è l'idea di Serena presa dal nome della cartella, sistemata se serve (maiuscole, emoji). Se il nome non contiene un'idea, proponi 3 hook tuoi.
- Indica per ciascuno come andrà a capo in copertina: 2 righe, di circa 25 caratteri l'una.
- Proponi la riga viola (default `INVERNO 2027  OVER 40`; d'estate e in primavera adattala alla stagione).

**Fermati e aspetta che l'utente scelga** (es. "post 1 hook 2"). Non generare immagini né copy prima della scelta. L'utente può anche riscrivere l'hook a mano.

### 4. Decidi la slide finale (alternanza)
Le due slide finali si alternano. Per capire quale tocca, guarda la cartella `PRONTO` del post precedente più recente: contiene un file `NN_cta-segui.jpg` oppure `NN_cta-whatsapp.jpg`. Usa l'altra. Se non trovi una cartella PRONTO precedente, chiedi all'utente quale usare.
Se prepari più post insieme, alterna anche tra di loro, in ordine di data.

### 5. Componi le slide
**Inquadratura (regola di Serena):** avvicinare l'immagine il più possibile **senza tagliare testa e piedi**; se la foto è troppo stretta per il 4:5, **espandere** lo sfondo ai lati. Lo script lo fa da solo, ma per ogni foto devi dargli dove sono testa, piedi e centro della persona, come frazioni da 0 a 1: `foto.jpg@top,bottom,cx`.
- `top` = cima dei capelli, `bottom` = punta delle scarpe, `cx` = centro orizzontale della persona.
- Leggili guardando ogni foto a grandezza piena: il risultato di `download_file_content` la mostra. Se ti serve aiuto, crea una griglia con `render.py --inspect griglia.jpg foto1 foto2 …`, che mostra le righe ogni 5%. Se sono più di 4 foto, falla a gruppi di 3-4, altrimenti diventa troppo piccola per leggere le misure.
- Nel dubbio arrotonda **verso l'esterno** (top più piccolo, bottom più grande): meglio un po' d'aria che un piede tagliato.

```bash
python3 .claude/skills/carosello-tiktok/scripts/render.py \
  --out <cartella_output> --cover "<foto_copertina>@0.05,0.97,0.5" \
  --hook "Riga 1…|Riga 2 🤣" --tag "Inverno 2027  Over 40" --cta segui|whatsapp \
  "<foto2>@0.08,0.95,0.52" "<foto3>@0.0,0.99,0.5" ...
```
Lo script stampa `ATTENZIONE` per le foto ingrandite più di 2,2 volte, che potrebbero risultare sgranate: segnalale all'utente.
Poi **guarda la copertina** (01.jpg) e un riepilogo di tutte le slide. Controlla che:
- testa e piedi non siano tagliati;
- il testo non copra il viso o un punto importante dell'outfit. In quel caso cambia `--text-y` (es. 250 per metterlo più in alto, 850 per più in basso).

### 6. Scrivi il copy
Segui alla lettera la sezione 6 dello style guide: struttura, lessico, blocco fisso "💜🦋 E restate sintonizzate…" e hashtag fissi. Parla solo di capi che si vedono nelle foto. Se il copy cita un dettaglio che non puoi verificare dalle foto, toglilo.

### 7. Consegna
1. Crea nella cartella del post una sottocartella `PRONTO` (`create_file`, `contentMimeType`/mime folder, `parentId` = id cartella post).
2. Carica tutte le slide (`create_file` con `base64Content` come riferimento al file: `sha256:<hash>:<percorso assoluto>`, `contentMimeType: image/jpeg`, `disableConversionToGoogleType: true`). Calcola l'hash con `sha256sum`. Mantieni i nomi `01.jpg`, `02.jpg`…
3. Scrivi il testo in locale in `COPY.txt` con codifica **`utf-8-sig`** (Python: `open(p, 'w', encoding='utf-8-sig')`). Dentro: `TITOLO` + l'hook con emoji (massimo 90 caratteri), una riga vuota, `DESCRIZIONE` + il copy completo con gli hashtag. Caricalo **come file**: `base64Content` = riferimento sha256, `contentMimeType: text/plain`, `disableConversionToGoogleType: true`. ⚠️ Non usare `textContent` e non convertirlo in Google Doc: la conversione corrompe gli emoji (testato il 25/11/2026). Verifica che la dimensione su Drive (`fileSize`) sia uguale a quella del file locale.
4. In chat mostra all'utente: il link alla cartella PRONTO, la copertina, il titolo e il copy (in un blocco di codice, così si copia con un tocco).

## Modalità automatica (attività programmata, nessuno in chat)
Quando il prompt dice **"modalità automatica"**, nessuno risponderà alle domande: non fermarti ad aspettare scelte e applica queste regole al posto dei passi 1, 3 e 4.

**Quali cartelle lavorare.** Tutte le sottocartelle di "Post" che rispettano tre condizioni:
- la data di pubblicazione è **oggi o successiva**. Se nel nome c'è la data compatta `GGMM` dopo `AA_MM_GG_` (es. `26_11_25_2611 …`), conta quella: 26/11. Altrimenti conta `AA_MM_GG`;
- **non contengono nessuna sottocartella**: né `PRONTO`, né cartelle di lavoro Canva come "outfit senza prodotto". Se c'è una sottocartella, il post è già stato fatto, a mano o in automatico;
- contengono almeno 3 foto.

**Hook: dal nome della cartella.**
1. Il testo dopo le date è un **hook vero** se è una frase ironica o una battuta (es. "fuori icone di stile dentro operaie a fine turno"). Allora usalo come hook n.1, sistemando solo maiuscole, punteggiatura ed emoji. Il nome della cartella su Drive può essere troncato (circa 60 caratteri) o contenere `%C3%A0` al posto delle lettere accentate: ricostruisci la frase in modo sensato.
2. Se il testo è **solo un argomento** (es. "halle berry", "gilet", "outfit giugno") e nella cartella **non** c'è `HOOK_PROPOSTI.txt`: scrivi `HOOK_PROPOSTI.txt` (UTF-8 con BOM, caricato come file .txt, vedi sotto) con 3 hook numerati e queste istruzioni per Serena: *"Per scegliere, rinomina la cartella aggiungendo alla fine h1, h2 o h3, oppure scrivi il tuo hook nel nome della cartella."* Poi **passa alla cartella successiva senza fare le slide**.
3. Se c'è già `HOOK_PROPOSTI.txt`:
   - il nome finisce con ` h1`, ` h2` o ` h3`: usa quell'hook del file;
   - il nome ora contiene una frase-hook: usa quella;
   - il nome non è cambiato: non fare nulla, Serena non ha ancora scelto.
4. Riga viola: `INVERNO 2027  OVER 40`, adattata alla stagione. Per post su una celebrità: `ICONE DI STILE  OVER 40`.

**Slide finale.** Alternanza come al passo 4. Se non trovi un PRONTO precedente, usa `segui`.

**Foto.** Scegli tu copertina e ordine (passo 2). Misura testa e piedi di ogni foto guardandola a grandezza piena (passo 5). Scarta watermark, foto sgranate e doppioni.

**Consegna.** Come al passo 7, più un file `NOTE.txt` nella cartella `PRONTO` con:
- l'hook usato;
- le altre 2 proposte;
- le foto scartate e il motivo;
- gli avvisi dello script (foto sgranate);
- una riga: *"Controlla copertina e testo prima di pubblicare."*

**A fine giro** scrivi nel riepilogo finale della sessione: quali post hai preparato (con il link alla cartella PRONTO), per quali hai scritto le proposte di hook e quali hai saltato, con il motivo.

## Regole
- Un outfit per slide. Niente collage.
- Mai inventare dati, prezzi, marchi o testimonianze. Mai promettere risultati.
- Mai modificare o cancellare le foto originali di Serena: si scrive solo dentro `PRONTO`.
- Se il connettore Drive rifiuta un'operazione, non riprovarla in loop: dillo all'utente e consegna i file in chat.
