// Rilevamento dell'altezza per l'accordatore.
//
// Due stadi, perché uno solo non basta sul telefono:
//   1. GROSSO — spettro dell'AnalyserNode + prodotto armonico (HPS). Individua la
//      fondamentale a ±6 Hz e, soprattutto, NON scambia il secondo armonico per la nota:
//      l'errore d'ottava è il modo classico in cui un accordatore fa accordare
//      benissimo la corda sbagliata.
//   2. FINE — autocorrelazione normalizzata in una finestra STRETTA attorno al candidato,
//      con interpolazione parabolica. Costa poco perché cerca solo lì, e dà la
//      risoluzione in centesimi che serve davvero (1 centesimo su La4 = 0,25 Hz).
//
// La FFT la fa il browser: la parte cara è già pagata.

const DB_MIN = -100;
const HZ_MIN = 70;      // sotto: rumore di stanza / bassi
const HZ_MAX = 1300;    // sopra: armonici, fischi
const ARMONICI_HPS = 4;

export class Rilevatore {
  constructor(analyser) {
    this.analyser = analyser;
    this.sr = analyser.context.sampleRate;
    this.tempo = new Float32Array(analyser.fftSize);
    this.spettro = new Float32Array(analyser.frequencyBinCount);
    this.storico = [];
    this.sogliaRms = 0.006;
    this.sogliaChiarezza = 0.55;
  }

  /** @returns {{hz:number|null, chiarezza:number, rms:number, silenzio:boolean}} */
  leggi() {
    const { analyser, tempo, spettro } = this;
    analyser.getFloatTimeDomainData(tempo);

    let somma = 0;
    let media = 0;
    for (let i = 0; i < tempo.length; i += 1) media += tempo[i];
    media /= tempo.length;
    for (let i = 0; i < tempo.length; i += 1) {
      const v = tempo[i] - media;
      tempo[i] = v;
      somma += v * v;
    }
    const rms = Math.sqrt(somma / tempo.length);
    if (rms < this.sogliaRms) {
      this.storico.length = 0;
      return { hz: null, chiarezza: 0, rms, silenzio: true };
    }

    analyser.getFloatFrequencyData(spettro);
    const grezzo = this._hps(spettro);
    if (!grezzo) return { hz: null, chiarezza: 0, rms, silenzio: false };

    const fine = this._autocorrelazione(grezzo);
    if (!fine || fine.chiarezza < this.sogliaChiarezza) {
      return { hz: null, chiarezza: fine ? fine.chiarezza : 0, rms, silenzio: false };
    }

    const stabile = this._stabilizza(fine.hz);
    return { hz: stabile, chiarezza: fine.chiarezza, rms, silenzio: false };
  }

  /**
   * Candidato grossolano: massimo del prodotto armonico dello spettro.
   *
   * La fondamentale pesa DOPPIO, e non è un dettaglio estetico. Con tutti gli armonici
   * a peso uguale, su un suono quasi puro (diapason, nota di riferimento, armonico
   * naturale) i candidati f, f/2, f/3 e f/4 ottengono lo stesso punteggio — in ognuno
   * c'è un solo termine vero e tre a fondo scala — e vince il più basso: misurato
   * 87 Hz su un Do4 di 261,63. Contando due volte la casella della presunta
   * fondamentale, il candidato che ha davvero energia nel proprio bin vince.
   */
  _hps(db) {
    const binHz = this.sr / this.analyser.fftSize;
    const primo = Math.max(1, Math.floor(HZ_MIN / binHz));
    const ultimo = Math.min(db.length - 1, Math.ceil(HZ_MAX / binHz));
    const val = (j) => {
      const v = db[j];
      return Number.isFinite(v) ? Math.max(DB_MIN, v) : DB_MIN;
    };
    let migliore = -Infinity;
    let indice = -1;
    for (let i = primo; i <= ultimo; i += 1) {
      let punteggio = val(i);                       // peso doppio: qui e nel ciclo sotto
      for (let k = 1; k <= ARMONICI_HPS; k += 1) {
        const j = i * k;
        if (j >= db.length) break;
        punteggio += val(j);
      }
      if (punteggio > migliore) { migliore = punteggio; indice = i; }
    }
    if (indice < 0) return null;
    return indice * binHz;
  }

  /** Raffinamento: correlazione normalizzata nei dintorni del candidato. */
  _autocorrelazione(hzCandidato) {
    const { tempo, sr } = this;
    const lagIdeale = sr / hzCandidato;
    const lagMin = Math.max(8, Math.floor(lagIdeale / 1.35));
    const lagMax = Math.min(Math.floor(sr / HZ_MIN), Math.ceil(lagIdeale * 1.35));
    if (lagMax <= lagMin + 2) return null;

    const finestra = Math.min(2048, tempo.length - lagMax - 1);
    if (finestra < 256) return null;

    let energia0 = 0;
    for (let i = 0; i < finestra; i += 1) energia0 += tempo[i] * tempo[i];
    if (energia0 <= 0) return null;

    const curva = new Float32Array(lagMax - lagMin + 1);
    let miglioreVal = -Infinity;
    let miglioreLag = -1;
    for (let lag = lagMin; lag <= lagMax; lag += 1) {
      let cross = 0;
      let energia = 0;
      for (let i = 0; i < finestra; i += 1) {
        const b = tempo[i + lag];
        cross += tempo[i] * b;
        energia += b * b;
      }
      const norm = energia > 0 ? cross / Math.sqrt(energia0 * energia) : 0;
      curva[lag - lagMin] = norm;
      if (norm > miglioreVal) { miglioreVal = norm; miglioreLag = lag; }
    }
    if (miglioreLag < 0) return null;

    // Qui NON c'è un controllo di sotto-ottava, e non per dimenticanza: la finestra di
    // ricerca è ±35% attorno al candidato, quindi il doppio del periodo cade sempre
    // fuori e un controllo del genere non potrebbe mai scattare — sarebbe una rassicurazione
    // finta. L'errore d'ottava lo previene lo stadio grosso, che guarda tutti gli armonici.

    // Interpolazione parabolica sul picco: senza, la risoluzione è un campione
    // (su La4 a 48 kHz vale ~8 centesimi, cioè un accordatore che mente di poco).
    const i0 = miglioreLag - lagMin;
    let lag = miglioreLag;
    if (i0 > 0 && i0 < curva.length - 1) {
      const y1 = curva[i0 - 1];
      const y2 = curva[i0];
      const y3 = curva[i0 + 1];
      const den = 2 * (2 * y2 - y1 - y3);
      if (den !== 0) lag += (y3 - y1) / den;
    }
    const hz = this.sr / lag;
    if (hz < HZ_MIN || hz > HZ_MAX) return null;
    return { hz, chiarezza: Math.max(0, Math.min(1, miglioreVal)) };
  }

  /** Mediana su 5 letture: uccide il singolo campione impazzito senza aggiungere ritardo percepibile. */
  _stabilizza(hz) {
    this.storico.push(hz);
    if (this.storico.length > 5) this.storico.shift();
    const ord = [...this.storico].sort((a, b) => a - b);
    const mediana = ord[Math.floor(ord.length / 2)];
    // Scarta il salto assurdo (dito che tocca la corda, colpo sulla cassa)
    if (Math.abs(hz - mediana) / mediana > 0.12) return mediana;
    return hz;
  }
}

// ── Note e centesimi ─────────────────────────────────────────────────────────

export const NOMI = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** Numero MIDI (frazionario) di una frequenza, dato il La4 di riferimento. */
export function midiDaHz(hz, la4 = 440) {
  return 69 + 12 * Math.log2(hz / la4);
}

export function hzDaMidi(midi, la4 = 440) {
  return la4 * 2 ** ((midi - 69) / 12);
}

/** Nota più vicina + scarto in centesimi. */
export function nota(hz, la4 = 440) {
  const m = midiDaHz(hz, la4);
  const intero = Math.round(m);
  return {
    midi: intero,
    nome: NOMI[((intero % 12) + 12) % 12],
    ottava: Math.floor(intero / 12) - 1,
    centesimi: (m - intero) * 100,
  };
}

/** Centesimi fra la lettura e una frequenza bersaglio. */
export function centesimi(hz, bersaglio) {
  return 1200 * Math.log2(hz / bersaglio);
}

// ── Le due decisioni dell'accordatore ────────────────────────────────────────
//
// Stanno qui, fuori dalla vista e senza DOM, perché sono le due che hanno sbagliato:
// una funzione pura si può mettere sotto collaudo, un ramo dentro un ciclo di disegno no.

/**
 * Cosa mostrare, dato lo stato del microfono.
 *
 * Il caso che è sfuggito è il terzo: né una nota né silenzio, ma RUMORE — la corda che
 * ronza mentre giri la chiave. L'azzeramento stava dentro il ramo del silenzio, quindi
 * lì il display restava congelato sull'ultima misura e continuava a dire "A POSTO"
 * all'infinito, mentre non stava misurando niente.
 *
 * @returns {'misura'|'tenuta'|'azzera-silenzio'|'azzera-rumore'}
 */
export function decisioneDisplay({ hz, silenzio, ultimaDa, tenutaMs }) {
  if (hz) return 'misura';
  if (ultimaDa !== null && ultimaDa < tenutaMs) return 'tenuta';
  return silenzio ? 'azzera-silenzio' : 'azzera-rumore';
}

/**
 * Quanti millisecondi, nell'ultima finestra, la corda è stata dentro tolleranza.
 *
 * Serve al posto di "ininterrottamente per 700 ms", che sembrava ragionevole ed era
 * quasi irraggiungibile: una corda di nylon pizzicata parte crescente e cala mentre
 * si spegne, quindi attraversa la soglia più volte in un secondo. Bastava un singolo
 * campione fuori e il conteggio ripartiva da zero — la corda non veniva mai dichiarata
 * accordata, e il passo del percorso non si chiudeva mai.
 *
 * Qui invece si SOMMA il tempo passato dentro nell'ultima finestra: gli attraversamenti
 * non azzerano niente, e una corda davvero intonata accumula in fretta.
 *
 * @param {Array<{t:number, dentro:boolean}>} campioni potato sul posto
 * @returns {number} millisecondi dentro tolleranza
 */
export function msDentroFinestra(campioni, ora, durataFinestra) {
  while (campioni.length && ora - campioni[0].t > durataFinestra) campioni.shift();
  let totale = 0;
  for (let i = 1; i < campioni.length; i += 1) {
    if (campioni[i - 1].dentro) totale += campioni[i].t - campioni[i - 1].t;
  }
  return totale;
}

/**
 * Se togliere la spunta a una corda già dichiarata accordata.
 *
 * Prima non si toglieva mai: bastava che una corda fosse stata a posto una volta e
 * restava verde anche calata di mezzo semitono, fino a dichiarare "tutte a posto" su
 * uno strumento scordato. La soglia per uscire è più larga di quella per entrare,
 * altrimenti sul confine la spunta lampeggerebbe.
 */
export function spuntaDaTogliere({ giaFatta, scarto, tolleranzaUscita, aggancio = 200 }) {
  if (!giaFatta) return false;
  // Oltre un certo scarto non è più quella corda che sta suonando: è un'altra, presa
  // per questa dal riconoscimento automatico mentre giravi la sua chiave. Toglierle la
  // spunta sarebbe punire la corda sbagliata — ed è il motivo per cui, accordando la
  // quarta, ogni tanto ne saltava via una già fatta.
  if (Math.abs(scarto) > aggancio) return false;
  return Math.abs(scarto) > tolleranzaUscita;
}
