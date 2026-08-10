// Ascolto dell'accordo: verifica quali note stanno davvero suonando.
//
// Due domande diverse, e la differenza conta:
//
//   verifica(atteso)  — "le quattro note che dovrebbero suonare ci sono tutte?"
//                       Domanda facile e onesta, perché sappiamo ESATTAMENTE quali
//                       frequenze aspettarci (accordatura + tasti). È anche la domanda
//                       giusta: l'errore del principiante non è suonare un altro accordo,
//                       è spegnere una corda col dito e non accorgersene.
//
//   riconosci()       — "che accordo è?" Domanda difficile e ambigua: sull'ukulele Do6 e
//                       Lam7 sono LE STESSE quattro note, e nessun programma può
//                       distinguerli. Torna una classifica, non una sentenza.
//
// Banda di analisi 240–950 Hz: ci stanno tutte le fondamentali dell'ukulele (Do4 261 →
// La5 880) e si tagliano fuori quasi tutti gli armonici alti. Il secondo armonico che
// resta dentro cade sulla stessa classe di altezza della sua fondamentale, quindi non
// sporca il conto.

import { classiAttese } from './theory.js';

const HZ_MIN = 240;
const HZ_MAX = 950;
const SOGLIA_PICCO_DB = 30;     // quanto sotto il picco più forte un picco conta ancora
const SOGLIA_NOTA_DB = 26;      // quanto sotto il picco più forte una nota è "presente"
const TOLLERANZA_CENT = 65;     // quanto può essere scordata e contare lo stesso

export class Ascoltatore {
  constructor(analyser) {
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

  /** Vettore di 12 classi di altezza, normalizzato al massimo. */
  chroma() {
    const { lista, massimo } = this.picchi();
    const v = new Float32Array(12);
    if (!lista.length) return v;
    lista.forEach(({ hz, db }) => {
      const midi = 69 + 12 * Math.log2(hz / 440);
      const pc = ((Math.round(midi) % 12) + 12) % 12;
      // Peso lineare rispetto al picco più forte: 0 dB → 1, −26 dB → 0.
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

/**
 * Soglia sotto la quale l'energia su note estranee è solo il rumore degli armonici.
 *
 * Misurata, non scelta: su accordi suonati bene sta fra 0,00 e 0,08; su un accordo
 * diverso da quello atteso fra 0,76 e 1,00. A 0,30 c'è un fattore quattro di margine
 * da entrambe le parti.
 */
export const SOGLIA_ESTRANEA = 0.3;

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
