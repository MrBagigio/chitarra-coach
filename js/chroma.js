// Ascolto dell'accordo: verifica quali note stanno davvero suonando.
//
// Due domande diverse, e la differenza conta:
//
//   verifica(atteso)  — "le corde che dovrebbero suonare ci sono tutte?"
//                       Domanda facile e onesta, perché sappiamo ESATTAMENTE quali
//                       frequenze aspettarci (accordatura + tasti). È anche la domanda
//                       giusta: l'errore del principiante non è suonare un altro accordo,
//                       è spegnere una corda col dito e non accorgersene.
//
//   riconosci()       — "che accordo è?" Domanda difficile e ambigua: Do6 e Lam7 sono LE
//                       STESSE note, e nessun programma può distinguerli. Torna una
//                       classifica, non una sentenza.
//
// ── La banda, e perché sulla chitarra è un problema diverso ───────────────────
//
// Banda di analisi 70–950 Hz. Sull'ukulele erano 240–950, e non per pigrizia: le
// fondamentali dell'ukulele stanno tutte lì dentro (Do4 261 → La5 880). Sulla chitarra il
// Mi basso è a 82,4 Hz e il La a 110: con quella banda le due corde gravi non esistevano
// proprio, e "verificare" un accordo significava verificarne i due terzi.
//
// Allargare in basso però NON è gratis, ed è il conto che va tenuto a mente leggendo il
// resto del file. La banda dell'ukulele copriva meno di due ottave: l'unico armonico che
// entrava era il secondo, che cade sulla STESSA classe di altezza della sua fondamentale
// e quindi non sporcava niente. Da 70 a 950 Hz ci sono quasi quattro ottave, e del Mi
// basso entrano dentro il 2°, 3°, 4°, 5° … armonico. Il 3° è una QUINTA sopra, il 5° una
// TERZA MAGGIORE: due note che la corda non sta suonando e che il conto delle classi si
// prende comunque.
//
// Sugli accordi maggiori è innocuo — fondamentale, quinta e terza maggiore sono
// esattamente le note dell'accordo. Sui MINORI no: il 5° armonico del basso è una terza
// maggiore, cioè precisamente la nota che un accordo minore non deve avere.
//
// Per questo `SOGLIA_ESTRANEA` più in basso è MISURATA sulla chitarra e non ereditata:
// il valore dell'ukulele qui non vorrebbe dire niente.

import { classiAttese } from './theory.js';

/**
 * Quanto deve essere lunga la finestra di analisi per giudicare un accordo di chitarra.
 *
 * Non è una preferenza: è il conto che decide se questa funzione funziona o no.
 *
 * Due picchi vicini nello spettro si distinguono solo se distano più o meno quanto è
 * largo il lobo della finestra — con quella che usa il browser, tre o quattro caselle.
 * Le due note più vicine che una chitarra può mettere in basso sono Si2 (123,47 Hz) e
 * Re3 (146,83): 23 Hz di distanza. Con 4096 campioni a 44,1 kHz una casella vale 10,8 Hz,
 * quindi quelle due note stanno a due caselle e SI FONDONO in una gobba sola.
 *
 * Non è teoria. Misurato, sullo stesso banco che gira nel collaudo:
 *
 *   4096  (93 ms)  → Sol, Mi7 e Sol7 risultavano con DUE corde mute che stavano suonando.
 *                    Energia estranea: giusti 0,11–0,51 · sbagliati 0,46–1,00 → si
 *                    SOVRAPPONGONO, e nessuna soglia può separarli.
 *   8192  (186 ms) → nessun falso allarme. Giusti 0,16–0,30 · sbagliati 0,46–1,00.
 *   16384 (372 ms) → identico a 8192, con il doppio del ritardo. Non serve.
 *
 * Quindi 8192, e la scelta finisce qui. Sull'ukulele 4096 bastava perché la nota più
 * grave era un Do a 261 Hz, dove le caselle sono strette rispetto ai semitoni: è uno di
 * quei numeri che sembrano generici e invece dipendevano tutti dallo strumento.
 */
export const FFT_ACCORDO = 8192;

const HZ_MIN = 70;              // sotto il Re2 del Drop D (73,4 Hz), con un filo di margine
const HZ_MAX = 950;
const SOGLIA_PICCO_DB = 30;     // quanto sotto il picco più forte un picco conta ancora
const SOGLIA_NOTA_DB = 26;      // quanto sotto il picco più forte una nota è "presente"
const TOLLERANZA_CENT = 65;     // quanto può essere scordata e contare lo stesso

export class Ascoltatore {
  constructor(analyser) {
    // Si rifiuta di nascere con una finestra troppo corta, invece di dare verdetti che
    // sembrano verdetti. Con 4096 campioni questo oggetto non sbagliava di poco: diceva
    // "questa corda non sta suonando" a corde che suonavano benissimo, e chi studia
    // avrebbe passato la serata a cercare un difetto nella propria mano.
    // È un errore di programmazione, non una situazione dell'utente: deve saltare fuori
    // sul banco di collaudo, non in cuffia.
    if (analyser.fftSize < FFT_ACCORDO) {
      throw new Error(`Ascoltatore: finestra da ${analyser.fftSize} campioni, servono almeno ${FFT_ACCORDO} — sotto, Si2 e Re3 si fondono in un picco solo`);
    }
    this.analyser = analyser;
    this.sr = analyser.context.sampleRate;
    this.spettro = new Float32Array(analyser.frequencyBinCount);
    this.tenuta = new Float32Array(analyser.frequencyBinCount);
    this.tempo = new Float32Array(analyser.fftSize);
    this.binHz = this.sr / analyser.fftSize;
    this.rms = 0;
    this.azzera();
  }

  azzera() {
    this.tenuta.fill(-Infinity);
    this.campioni = 0;
  }

  /**
   * Aggiunge un frame alla tenuta di picco. Un pizzicato dura più di un frame e le corde
   * non partono tutte insieme: valutare un singolo istante significa dichiarare muta la
   * corda che stava ancora per suonare.
   */
  campiona() {
    const { analyser, spettro, tenuta, tempo } = this;
    analyser.getFloatTimeDomainData(tempo);
    let somma = 0;
    for (let i = 0; i < tempo.length; i += 1) somma += tempo[i] * tempo[i];
    this.rms = Math.sqrt(somma / tempo.length);

    analyser.getFloatFrequencyData(spettro);
    for (let i = 0; i < spettro.length; i += 1) {
      const v = spettro[i];
      if (Number.isFinite(v) && v > tenuta[i]) tenuta[i] = v;
    }
    this.campioni += 1;
    return this.rms;
  }

  /** Picchi spettrali della tenuta, con frequenza interpolata. */
  picchi() {
    const { tenuta, binHz } = this;
    const primo = Math.max(2, Math.floor(HZ_MIN / binHz));
    const ultimo = Math.min(tenuta.length - 2, Math.ceil(HZ_MAX / binHz));
    let massimo = -Infinity;
    for (let i = primo; i <= ultimo; i += 1) if (tenuta[i] > massimo) massimo = tenuta[i];
    if (!Number.isFinite(massimo)) return { lista: [], massimo: -Infinity };

    const lista = [];
    for (let i = primo; i <= ultimo; i += 1) {
      const y2 = tenuta[i];
      if (!Number.isFinite(y2) || y2 < massimo - SOGLIA_PICCO_DB) continue;
      const y1 = tenuta[i - 1];
      const y3 = tenuta[i + 1];
      if (!(y2 > y1 && y2 >= y3)) continue;
      const den = 2 * (2 * y2 - y1 - y3);
      const scarto = den !== 0 ? (y3 - y1) / den : 0;
      lista.push({ hz: (i + scarto) * binHz, db: y2 });
    }
    return { lista, massimo };
  }

  /**
   * Vettore di 12 classi di altezza, normalizzato al massimo — SENZA gli armonici.
   *
   * Un picco che sta a un multiplo intero esatto di un picco più grave non è una nota
   * che stai suonando: è un armonico di quella. Contarlo come nota è il difetto che
   * rendeva quasi impossibile giudicare un accordo di chitarra, e non era una questione
   * di soglia — vedi `SOGLIA_ESTRANEA` più sotto per i numeri.
   *
   * La lista arriva già ordinata per frequenza crescente (`picchi()` scorre i bin dal
   * basso), quindi il "genitore" di un armonico è sempre già stato visto.
   */
  chroma() {
    const { lista, massimo } = this.picchi();
    const v = new Float32Array(12);
    if (!lista.length) return v;
    lista.forEach(({ hz, db }, i) => {
      if (armonicoDi(lista, i) >= 0) return;
      const midi = 69 + 12 * Math.log2(hz / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      // Peso lineare rispetto al picco più forte: 0 dB → 1, −30 dB → 0.
      v[pc] += Math.max(0, 1 + (db - massimo) / SOGLIA_PICCO_DB);
    });
    const max = Math.max(...v);
    if (max > 0) for (let i = 0; i < 12; i += 1) v[i] /= max;
    return v;
  }

  /**
   * Verifica che le frequenze attese ci siano.
   * @param {number[]} attese frequenze fondamentali che dovrebbero suonare
   */
  verifica(attese) {
    const { lista, massimo } = this.picchi();
    const controllabili = verificabilita(attese);
    const forza = [];
    const presenti = attese.map((hz) => {
      if (!hz) { forza.push(null); return true; }         // corda smorzata: nulla da trovare
      // Serve un PICCO alla frequenza attesa, non semplicemente dell'energia.
      // Misurando l'energia grezza, la falda di una nota vicina e forte riempie la
      // casella di una corda spenta: con questo accordo di prova la corda muta risultava
      // a −5 dB dal massimo, cioè "presente e squillante", per la sola vicinanza di un
      // armonico a 29 Hz di distanza. Una corda che suona fa una gobba; una zona coperta
      // dalla vicina fa solo una salita.
      let migliore = -Infinity;
      lista.forEach((p) => {
        if (Math.abs(1200 * Math.log2(p.hz / hz)) <= TOLLERANZA_CENT && p.db > migliore) migliore = p.db;
      });
      const rel = Number.isFinite(migliore) ? migliore - massimo : -Infinity;
      forza.push(Number.isFinite(rel) ? rel : -99);
      return rel >= -SOGLIA_NOTA_DB;
    });
    // Il verdetto si dà SOLO sulle corde che si possono davvero giudicare: dichiarare
    // "manca" una corda il cui suono è indistinguibile da un'altra sarebbe un'accusa
    // che non sappiamo dimostrare.
    const giudicabili = attese.map((_, i) => controllabili[i].verificabile);
    const mancanti = attese.map((_, i) => giudicabili[i] && !presenti[i]);
    return {
      presenti,
      controllabili,
      forza,
      quante: presenti.filter(Boolean).length,
      quanteGiudicabili: giudicabili.filter(Boolean).length,
      ok: !mancanti.some(Boolean),
      mancanti,
    };
  }
}

// ── Riconoscere un armonico ──────────────────────────────────────────────────

// Fin dove arrivano gli armonici DENTRO la banda. Non è un numero scelto: è quello che
// la banda permette. Perché un armonico sia visibile servono due picchi entrambi in
// banda — il genitore sopra HZ_MIN e il figlio sotto HZ_MAX — quindi il rapporto massimo
// fra i due è HZ_MAX/HZ_MIN e basta.
//
// Scritto così, lo stesso file dà 13 sulla chitarra (banda 70–950) e 3 sull'ukulele
// (banda 240–950), che sono i due valori giusti. Scritto a mano sarebbe stato un numero
// da ricordarsi di cambiare, cioè un numero da sbagliare.
const K_MASSIMO = Math.floor(HZ_MAX / HZ_MIN);
const TOLLERANZA_ARMONICO = 25;   // centesimi
const MARGINE_GENITORE_DB = 6;    // di quanto il genitore può essere PIÙ DEBOLE del figlio

/**
 * Se il picco `i` è un armonico di un picco più grave, dice quale. Altrimenti −1.
 *
 * Tre numeri, e ognuno ha una ragione fisica, non una taratura:
 *
 * `TOLLERANZA_ARMONICO = 25 centesimi`. Una corda d'acciaio non ha armoniche a n×f
 * esatti: la rigidità le stira, e stanno a n·f·√(1+Bn²). Su una corda avvolta grave
 * (B ≈ 1e-4) l'ottava armonica è 5,5 centesimi sopra il suo posto teorico. Servono
 * quindi più di una manciata di centesimi. Ma non troppi: una settima minore in
 * temperamento equabile cade 31 centesimi sotto la settima armonica, e a 31 il
 * programma comincerebbe a cancellare note davvero suonate. Venticinque sta comodo
 * in mezzo, e la misura è PIATTA da 15 a 40 — il numero non è delicato.
 *
 * `MARGINE_GENITORE_DB = 6`: il genitore può essere fino a 6 dB più debole del figlio.
 * Sembra strano e non lo è: su una corda pizzicata la seconda armonica è spesso più
 * forte della fondamentale. Pretendere un genitore più forte faceva scendere il
 * guadagno da 0,39 a 0,03 — cioè quasi tutto.
 *
 * `K_MASSIMO` si ricava dalla banda (vedi sopra). Fermarsi prima sembrava prudente e
 * lasciava passare un fantasma preciso: l'undicesima armonica cade 551 centesimi sopra
 * la fondamentale — cioè quasi esattamente in mezzo fra la quarta e il tritono — e
 * arrotonda al tritono. Un Mi basso da solo, suonato brillante, "conteneva" un La♯ a
 * 0,296 che nessuno aveva suonato. Arrivando fino al bordo della banda il fantasma
 * sparisce, e non si rischia di cancellare note vere: le armoniche 11ª e 13ª cadono
 * 50 e 40 centesimi lontano da qualunque nota del temperamento equabile, quindi ben
 * fuori dalla tolleranza di 25.
 */
function armonicoDi(lista, i) {
  const p = lista[i];
  for (let j = 0; j < i; j += 1) {
    const q = lista[j];
    const k = Math.round(p.hz / q.hz);
    if (k < 2 || k > K_MASSIMO) continue;
    if (Math.abs(1200 * Math.log2(p.hz / (q.hz * k))) > TOLLERANZA_ARMONICO) continue;
    if (q.db < p.db - MARGINE_GENITORE_DB) continue;
    return j;
  }
  return -1;
}

/**
 * Soglia sotto la quale l'energia su note estranee è solo il rumore degli armonici.
 *
 * MISURATA sulla chitarra su DUE banchi, e derivata dal peggiore dei due.
 *
 * Il primo valore scelto qui fu 0,38, misurato sulla corda modellata (Karplus-Strong):
 * giusti 0,16–0,30 contro sbagliati 0,46–1,00, con 0,08 di margine per lato. Sembrava
 * stretto ma sufficiente. Non lo era, e a dirlo è stato un banco più cattivo.
 *
 * Il Karplus-Strong ha armoniche PERFETTE, a n×f esatti, e un timbro morbido. Una corda
 * d'acciaio no: la rigidità stira le armoniche (n·f·√(1+Bn²)) e il timbro è molto più
 * brillante. Rifacendo la stessa misura su un banco così — che è quello che hai in mano,
 * non quello che è comodo simulare:
 *
 *                              senza soppressione      con soppressione degli armonici
 *   corda modellata   giusti      ≤ 0,317                  ≤ 0,000
 *                     sbagliati   ≥ 0,437                  ≥ 0,959       vuoto 0,12 → 0,96
 *   corda d'acciaio   giusti      ≤ 0,432                  ≤ 0,023
 *                     sbagliati   ≥ 0,501                  ≥ 0,416       vuoto 0,07 → 0,39
 *
 * La riga che conta è la terza: su una chitarra brillante gli accordi GIUSTI arrivavano
 * a 0,432, cioè sopra la soglia di 0,38 — l'app avrebbe detto "ripenna" a chi aveva
 * suonato bene, e la colpa non era della soglia. Era che gli armonici del basso venivano
 * contati come note: su quattro ottave di banda il 3° armonico è una quinta e il 5° una
 * terza maggiore, e su un accordo minore quella terza è precisamente la nota vietata.
 *
 * Tolti gli armonici, il pavimento dei giusti crolla da 0,43 a 0,02 e il vincolo diventa
 * l'intervallo 0,023–0,416 del banco d'acciaio. La soglia si mette in mezzo: 0,22, con
 * 0,20 di margine da entrambe le parti invece di 0,07.
 *
 * Resta un limite dichiarato: nessuno dei due banchi ha la stanza, il fruscio del
 * plettro o le risonanze della cassa, che aggiungono picchi NON armonici e quindi
 * alzeranno un po' il pavimento dei giusti. I 0,20 di margine servono a quello.
 */
export const SOGLIA_ESTRANEA = 0.22;

/**
 * Quanto suona forte la nota più estranea all'accordo.
 *
 * Serve dove la sola presenza non basta. Esempio vero: il La minore ha due corde che
 * suonano la stessa nota, quindi le giudicabili sono soltanto Do e Mi — e Do e Mi ci
 * sono anche in un Do maggiore. Chiedendo solo "ci sono le note attese?", un Do
 * lasciato suonare passava per La minore. Guardando anche cosa NON dovrebbe esserci,
 * il Sol del Do lo smaschera.
 *
 * @param {Ascoltatore} ascoltatore
 * @param {number[]} classiAmmesse classi di altezza che l'accordo può contenere
 */
export function energiaEstranea(ascoltatore, classiAmmesse) {
  const chroma = ascoltatore.chroma();
  const ammesse = new Set(classiAmmesse);
  let massimo = 0;
  for (let pc = 0; pc < 12; pc += 1) {
    if (!ammesse.has(pc) && chroma[pc] > massimo) massimo = chroma[pc];
  }
  return massimo;
}

/**
 * Quali corde si possono giudicare una per una.
 *
 * Un limite fisico, non un difetto del programma: se la corda A suona il Do un'ottava
 * sopra la corda C, la sua frequenza coincide col secondo armonico della C. Spegnendola,
 * lo spettro resta identico. Dirlo è meglio che dare un verde falso o un rosso ingiusto.
 */
export function verificabilita(frequenze) {
  return frequenze.map((hz, i) => {
    if (!hz) return { verificabile: false, motivo: 'corda smorzata: non deve suonare' };
    for (let j = 0; j < frequenze.length; j += 1) {
      const altra = frequenze[j];
      if (i === j || !altra) continue;
      for (let k = 1; k <= 4; k += 1) {
        if (Math.abs(1200 * Math.log2(hz / (altra * k))) < 60) {
          return {
            verificabile: false,
            mascheratoDa: j,
            ordine: k,
            motivo: k === 1
              ? 'suona la stessa nota di un\'altra corda'
              : `la sua nota coincide con un armonico di un'altra corda (${k}×)`,
          };
        }
      }
    }
    return { verificabile: true, motivo: '' };
  });
}

// ── Riconoscimento per confronto di modelli ──────────────────────────────────

const PESO = new Map([[0, 1.0], [3, 1.0], [4, 1.0], [6, 0.95], [10, 0.9], [11, 0.9],
  [2, 0.85], [5, 0.95], [9, 0.85], [8, 0.95], [7, 0.65]]);

/** Modello di chroma atteso per un nome di accordo. La quinta pesa meno: non definisce nulla. */
export function modello(nomeAccordo) {
  const atteso = classiAttese(nomeAccordo);
  if (!atteso) return null;
  const v = new Float32Array(12);
  const { fondamentale, intervalli } = atteso.scomposto;
  intervalli.forEach((intervallo) => {
    v[(fondamentale + intervallo) % 12] = PESO.get(intervallo) ?? 0.9;
  });
  return v;
}

function coseno(a, b) {
  let num = 0; let na = 0; let nb = 0;
  for (let i = 0; i < 12; i += 1) { num += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
  return na > 0 && nb > 0 ? num / Math.sqrt(na * nb) : 0;
}

/**
 * Classifica i nomi candidati rispetto a un chroma misurato.
 * @returns {{nome:string, punteggio:number}[]} dal più probabile in giù
 */
export function classifica(chroma, nomi) {
  const somma = chroma.reduce((a, b) => a + b, 0);
  if (somma <= 0) return [];
  return nomi
    .map((nome) => {
      const m = modello(nome);
      if (!m) return null;
      // Similarità meno la quota di energia caduta su note che l'accordo non contiene:
      // senza la penalità, un accordo "sottoinsieme" (Do dentro Do7) vince sempre.
      let estranea = 0;
      for (let i = 0; i < 12; i += 1) if (m[i] === 0) estranea += chroma[i];
      return { nome, punteggio: coseno(chroma, m) - 0.55 * (estranea / somma) };
    })
    .filter(Boolean)
    .sort((a, b) => b.punteggio - a.punteggio);
}
