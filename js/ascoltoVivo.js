// Ascolto mentre suoni: QUANDO hai pennato e SE l'accordo era quello.
//
// È la differenza fra un libro con un metronomo e un insegnante. Il metronomo dice il
// tempo; questo modulo guarda cosa hai fatto tu rispetto a quel tempo.
//
// Due misure separate, con due gradi di fiducia diversi — ed è giusto dichiararli:
//
//   IL TEMPO si misura bene. Un attacco di pennata è un salto netto di energia nello
//   spettro, e l'istante lo confrontiamo con la griglia del metronomo, che vive sullo
//   stesso orologio audio. Lo scarto in millisecondi è un numero vero.
//
//   L'ACCORDO si VERIFICA, non si indovina. Sappiamo già quale dovrebbe essere: si
//   controlla che le sue note ci siano. È la domanda facile, ed è quella che serve.
//
// Il ritardo del telefono (uscita → aria → microfono) non è zero e cambia da modello a
// modello: si misura una volta con `taraLatenza()` facendo sentire all'app un suo stesso
// suono. Senza taratura si userebbe una stima, e tutti i tuoi tempi sarebbero spostati
// della stessa quantità: sembreresti sempre in ritardo per colpa dell'hardware.

import { contesto, nuovoAnalizzatore } from './audio.js';
import { Ascoltatore } from './chroma.js';

// La banda dell'attacco parte da 75 Hz e non da 200 come sull'ukulele: su una chitarra
// una pennata comincia dalle corde gravi, e il Mi basso sta a 82,4 Hz. Con la banda vecchia
// l'attacco di una pennata in giù veniva visto solo quando la mano arrivava a metà corde —
// cioè qualche millisecondo dopo, sistematicamente.
// Sotto i 75 Hz non si scende: lì c'è il rimbombo della stanza e il tonfo della mano
// sulla cassa, che non sono pennate.
const BANDA_MIN = 75;
const BANDA_MAX = 1100;         // sopra: il click del metronomo e i fruscii
const PAUSA_MINIMA_S = 0.075;   // due pennate più vicine di così sono la stessa
const STORICO_FLUSSO = 24;
const FATTORE_SOGLIA = 2.4;
const FLUSSO_MINIMO = 0.0022;

export class AscoltoVivo {
  /**
   * @param {AnalyserNode} veloce finestra corta: serve a datare l'attacco
   * @param {AnalyserNode} lento finestra lunga: serve a leggere le note
   */
  constructor(veloce, lento) {
    this.a = veloce;
    this.sr = veloce.context.sampleRate;
    this.spettro = new Float32Array(veloce.frequencyBinCount);
    this.precedente = new Float32Array(veloce.frequencyBinCount);
    this.primaVolta = true;
    this.binHz = this.sr / veloce.fftSize;
    this.da = Math.max(1, Math.floor(BANDA_MIN / this.binHz));
    this.a2 = Math.min(veloce.frequencyBinCount - 1, Math.ceil(BANDA_MAX / this.binHz));
    this.storico = [];
    this.ultimoAttacco = -1;
    this.ascoltatore = lento ? new Ascoltatore(lento) : null;
    // Ritardo di analisi: la finestra guarda indietro, quindi l'attacco è già passato
    // quando lo vediamo.
    //
    // "Mezza finestra" sembra la risposta ovvia ed è sbagliata: l'attacco non si vede
    // appena entra nella finestra, si vede quando ne ha riempito abbastanza da far
    // salire l'energia sopra la soglia. Misurato iniettando pennate a istanti noti,
    // il ritardo vero è ~1,2 finestre, non mezza — e la mia stima lasciava tutti in
    // ritardo di 17 ms uguali per tutti. Costante, quindi correggibile.
    this.ritardoAnalisi = (veloce.fftSize / this.sr) * 1.2;
    this.latenza = 0;
    this.livello = 0;
  }

  /** Il ritardo misurato del dispositivo, in secondi (0 se non tarato). */
  impostaLatenza(secondi) {
    this.latenza = Number.isFinite(secondi) ? secondi : 0;
  }

  /**
   * Da chiamare spesso (ogni 10–20 ms). Restituisce l'attacco se ne ha appena visto uno.
   * @returns {{quando:number, forza:number}|null}
   */
  ascolta() {
    const c = contesto();
    const { spettro, precedente } = this;
    this.a.getFloatFrequencyData(spettro);

    let flusso = 0;
    for (let i = this.da; i <= this.a2; i += 1) {
      const ora = Number.isFinite(spettro[i]) ? 10 ** (spettro[i] / 20) : 0;
      const prima = precedente[i];
      if (ora > prima) flusso += ora - prima;      // solo le salite: un attacco è energia che ARRIVA
      precedente[i] = ora;
    }
    flusso /= (this.a2 - this.da + 1);
    // Livello grezzo per la spia "ti sto sentendo": senza, una barra ferma farebbe
    // credere che il microfono sia morto proprio mentre funziona.
    this.livello = Math.min(1, flusso / (FLUSSO_MINIMO * 8));

    if (this.primaVolta) { this.primaVolta = false; return null; }

    this.storico.push(flusso);
    if (this.storico.length > STORICO_FLUSSO) this.storico.shift();
    if (this.storico.length < 6) return null;

    // Soglia adattiva sulla mediana: una stanza rumorosa alza il pavimento, e una soglia
    // fissa o non vedrebbe più niente o vedrebbe attacchi ovunque.
    const ordinati = [...this.storico].sort((x, y) => x - y);
    const mediana = ordinati[Math.floor(ordinati.length / 2)];
    const soglia = Math.max(FLUSSO_MINIMO, mediana * FATTORE_SOGLIA);

    const adesso = c.currentTime;
    if (flusso < soglia) return null;
    if (this.ultimoAttacco > 0 && adesso - this.ultimoAttacco < PAUSA_MINIMA_S) return null;
    this.ultimoAttacco = adesso;

    return { quando: adesso - this.ritardoAnalisi - this.latenza, forza: flusso / soglia };
  }

  /** Comincia a raccogliere lo spettro per giudicare l'accordo di questo attacco. */
  apriFinestraAccordo() {
    if (this.ascoltatore) this.ascoltatore.azzera();
  }

  campionaAccordo() {
    if (this.ascoltatore) this.ascoltatore.campiona();
  }

  /** @returns {{ok:boolean, mancanti:boolean[], controllabili:object[]}|null} */
  giudicaAccordo(frequenzeAttese) {
    if (!this.ascoltatore || !frequenzeAttese) return null;
    return this.ascoltatore.verifica(frequenzeAttese);
  }
}

/**
 * Misura il ritardo del dispositivo: l'app suona un colpo e ascolta quando lo sente.
 *
 * È l'unico modo onesto di avere millisecondi che vogliano dire qualcosa. Il percorso
 * uscita audio → altoparlante → aria → microfono → analisi vale in genere fra 30 e 250 ms
 * a seconda del telefono: senza toglierlo, chiunque risulterebbe cronicamente in ritardo,
 * e sarebbe colpa nostra, non sua.
 *
 * @returns {Promise<{ok:boolean, latenza:number, misure:number[], motivo:string}>}
 */
export async function taraLatenza({ colpi = 5 } = {}) {
  const c = contesto();
  const veloce = nuovoAnalizzatore({ fftSize: 1024 });
  if (!veloce) return { ok: false, latenza: 0, misure: [], motivo: 'microfono non aperto' };

  const rilevatore = new AscoltoVivo(veloce, null);
  const attesi = [];
  const t0 = c.currentTime + 0.5;
  const passo = 0.6;

  for (let i = 0; i < colpi; i += 1) {
    const quando = t0 + i * passo;
    attesi.push(quando);
    // Colpo DENTRO la banda che il rilevatore guarda: il click del metronomo sta apposta
    // fuori banda, quindi per tararsi non servirebbe a niente.
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(760, quando);
    o.frequency.exponentialRampToValueAtTime(380, quando + 0.05);
    g.gain.setValueAtTime(0, quando);
    g.gain.linearRampToValueAtTime(0.5, quando + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, quando + 0.09);
    o.connect(g).connect(c.destination);
    o.start(quando);
    o.stop(quando + 0.12);
  }

  const visti = [];
  const fine = t0 + colpi * passo + 0.4;
  await new Promise((risolvi) => {
    const timer = setInterval(() => {
      const attacco = rilevatore.ascolta();
      if (attacco) visti.push(attacco.quando);
      if (c.currentTime > fine) { clearInterval(timer); risolvi(); }
    }, 12);
  });

  const misure = [];
  attesi.forEach((atteso) => {
    const vicino = visti
      .map((v) => ({ v, d: v - atteso }))
      .filter((x) => x.d > -0.05 && x.d < 0.5)
      .sort((x, y) => x.d - y.d)[0];
    if (vicino) misure.push(vicino.d);
  });

  if (misure.length < Math.ceil(colpi / 2)) {
    return {
      ok: false,
      latenza: 0,
      misure,
      motivo: `ho sentito solo ${misure.length} colpi su ${colpi}: alza il volume del telefono e rifallo in una stanza silenziosa, senza cuffie`,
    };
  }
  const ordinate = misure.sort((x, y) => x - y);
  const latenza = ordinate[Math.floor(ordinate.length / 2)];
  return { ok: true, latenza, misure: ordinate, motivo: `${Math.round(latenza * 1000)} ms` };
}

/** Come si chiama uno scarto, in parole. Le soglie sono quelle che si sentono davvero. */
export function giudizioTempo(scartoSecondi) {
  const ms = scartoSecondi * 1000;
  const a = Math.abs(ms);
  if (a <= 35) return { classe: 'preciso', testo: 'a tempo' };
  if (a <= 80) return { classe: 'quasi', testo: ms > 0 ? 'appena in ritardo' : 'appena in anticipo' };
  return { classe: 'fuori', testo: ms > 0 ? 'in ritardo' : 'in anticipo' };
}

/** Il verdetto complessivo di una sessione ascoltata. */
export function riepilogo(colpi) {
  const validi = colpi.filter((c) => c.scarto !== null);
  if (!validi.length) {
    return {
      colpi: 0, precisi: 0, quotaPrecisi: 0, scartoMedio: 0, tendenza: 0,
      accordiGiusti: 0, accordiValutati: 0, quotaAccordi: 0,
    };
  }
  const precisi = validi.filter((c) => Math.abs(c.scarto) <= 0.08).length;
  const somma = validi.reduce((a, c) => a + c.scarto, 0);
  const valutati = colpi.filter((c) => c.accordoOk !== null);
  const giusti = valutati.filter((c) => c.accordoOk).length;
  return {
    colpi: validi.length,
    precisi,
    quotaPrecisi: precisi / validi.length,
    scartoMedio: somma / validi.length,
    // La tendenza è la media CON segno: dice se sei sistematicamente avanti o indietro,
    // che è un difetto diverso dall'essere impreciso e si corregge in modo diverso.
    tendenza: somma / validi.length,
    accordiValutati: valutati.length,
    accordiGiusti: giusti,
    quotaAccordi: valutati.length ? giusti / valutati.length : 0,
  };
}
