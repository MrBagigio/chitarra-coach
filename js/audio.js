// Un solo AudioContext per tutta l'app.
//
// Su iOS il contesto nasce "suspended" e si può sbloccare SOLO dentro un gesto dell'utente:
// per questo `sblocca()` va chiamata dal listener del tocco, non dopo un await.
// E il microfono va chiesto senza elaborazioni: eco, gain automatico e riduzione rumore
// riscrivono il segnale e un accordatore che misura un segnale riscritto misura il filtro.

import { FFT_ACCORDO } from './chroma.js';
import { STRUMENTO } from './strumento.js';

let ctx = null;
let micStream = null;
let analyser = null;
let sorgenteMic = null;

export function contesto() {
  if (!ctx) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctor({ latencyHint: 'interactive' });
  }
  return ctx;
}

/** Da chiamare dentro un gesto utente. Ritorna true se il contesto è attivo. */
export function sblocca() {
  const c = contesto();
  if (c.state !== 'running') c.resume();
  // Un impulso muto: su alcune versioni di iOS il solo resume() non basta.
  const osc = c.createOscillator();
  const g = c.createGain();
  g.gain.value = 0;
  osc.connect(g).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + 0.01);
  return c.state === 'running';
}

// ── Microfono ────────────────────────────────────────────────────────────────

export function microfonoDisponibile() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

/**
 * Apre il microfono e restituisce un AnalyserNode pronto per l'accordatore.
 * Rilancia l'errore originale: il nome (`NotAllowedError`, `NotFoundError`) serve
 * a dire all'utente cosa è andato storto invece di un generico "non funziona".
 */
export async function apriMicrofono() {
  if (analyser) return analyser;
  if (!microfonoDisponibile()) {
    const e = new Error('getUserMedia non disponibile');
    e.name = 'NotSupportedError';
    throw e;
  }
  const c = contesto();
  micStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      autoGainControl: false,
      noiseSuppression: false,
      channelCount: 1,
    },
  });
  if (c.state !== 'running') await c.resume();
  sorgenteMic = c.createMediaStreamSource(micStream);
  analyser = c.createAnalyser();
  analyser.fftSize = 4096;
  analyser.smoothingTimeConstant = 0;
  sorgenteMic.connect(analyser);
  return analyser;
}

/**
 * Un secondo (o terzo) analizzatore sullo STESSO microfono.
 *
 * Serve perché le due domande vogliono finestre diverse: per sapere QUANDO hai pennato
 * serve una finestra corta (poco ritardo, poca risoluzione in frequenza), per sapere
 * COSA hai suonato serve una finestra lunga (buona risoluzione, più ritardo). Con un
 * analizzatore solo si sceglie quale delle due misure sacrificare.
 */
export function nuovoAnalizzatore({ fftSize = 1024, smoothing = 0 } = {}) {
  if (!sorgenteMic) return null;
  const c = contesto();
  const a = c.createAnalyser();
  a.fftSize = fftSize;
  a.smoothingTimeConstant = smoothing;
  sorgenteMic.connect(a);
  return a;
}

/**
 * L'analizzatore per giudicare un accordo. Un posto solo, e non è pedanteria.
 *
 * La dimensione della finestra qui non è un parametro di gusto: sotto quel valore le due
 * note più vicine che lo strumento sa mettere in un accordo si fondono in un picco solo,
 * e il programma dichiara mute delle corde che stanno suonando. Il conto — quali sono
 * quelle due note, e quanti campioni servono per separarle — sta in `FFT_ACCORDO` dentro
 * chroma.js, perché dipende dallo strumento.
 *
 * Prima il numero era scritto a mano in tre viste diverse; bastava aggiornarne due per
 * lasciare in giro una schermata che accusa chi suona bene, senza nessun errore visibile.
 */
export function analizzatoreAccordo() {
  return nuovoAnalizzatore({ fftSize: FFT_ACCORDO });
}

export function chiudiMicrofono() {
  if (micStream) micStream.getTracks().forEach((t) => t.stop());
  micStream = null;
  analyser = null;
  sorgenteMic = null;
}

export function microfonoAperto() {
  return !!analyser;
}

// ── Nota di riferimento (accordatura a orecchio) ──────────────────────────────

let notaAttiva = null;

export function suonaNota(hz, durata = 1.6) {
  fermaNota();
  const c = contesto();
  const t0 = c.currentTime;
  const g = c.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.22, t0 + 0.02);
  g.gain.setTargetAtTime(0.0001, t0 + durata * 0.5, durata * 0.3);
  g.connect(c.destination);

  // Fondamentale + due armonici: un seno puro è difficile da confrontare a orecchio.
  const parziali = [[1, 1], [2, 0.28], [3, 0.12]];
  const osc = parziali.map(([mult, amp]) => {
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz * mult;
    const ga = c.createGain();
    ga.gain.value = amp;
    o.connect(ga).connect(g);
    o.start(t0);
    o.stop(t0 + durata + 0.4);
    return o;
  });
  notaAttiva = { osc, g };
  return notaAttiva;
}

// ── Corda pizzicata: modello fisico, non oscillatori ─────────────────────────
//
// Prima qui c'erano quattro onde triangolari sovrapposte. Suonavano come un giocattolo,
// ed è il segno che si riconosce a orecchio di un'app fatta in casa: le note giuste,
// il timbro di un citofono.
//
// Adesso è Karplus-Strong: un colpo di rumore dentro un anello di ritardo lungo un
// periodo, con un filtro che ammorbidisce ogni giro. È il modo in cui si comporta una
// corda vera — le armoniche alte muoiono prima delle basse — e infatti suona pizzicato.
// Non è un campione registrato: è un modello. Sopra ci passa un filtro di risonanza che
// imita la cassa, perché una corda senza cassa suona sottile.

const cacheCorde = new Map();

/**
 * Genera (e ricicla) il buffer di una corda pizzicata a una data frequenza.
 * Esportata perché il banco di collaudo possa MISURARE il suono che esce davvero,
 * invece di controllare che la funzione esista.
 */
export function bufferCorda(hz, durata = 2.4, brillantezza = 0.5) {
  const c = contesto();
  const chiave = `${Math.round(hz * 10)}|${durata}|${brillantezza}`;
  const salvato = cacheCorde.get(chiave);
  if (salvato) return salvato;

  const sr = c.sampleRate;
  const campioni = Math.floor(sr * durata);
  const buffer = c.createBuffer(1, campioni, sr);
  const y = buffer.getChannelData(0);

  // Lunghezza dell'anello, con ritardo FRAZIONARIO.
  //
  // Il periodo in campioni quasi mai è un numero intero, e il filtro di media dentro
  // l'anello aggiunge da sé mezzo campione di ritardo. Arrotondando e basta, il Sol4
  // usciva calante di 15 centesimi — più di quanto l'accordatore stesso accetti come
  // "intonato". Qui si prende la parte intera e si recupera la frazione mescolando due
  // campioni adiacenti, che è un ritardo frazionario a interpolazione lineare.
  const ritardo = sr / hz;
  const n = Math.max(2, Math.floor(ritardo - 0.5));
  const frazione = ritardo - 0.5 - n;

  // Perdita per giro dell'anello.
  //
  // Il calcolo va fatto sul TEMPO, non sul giro: l'anello viene percorso `hz` volte al
  // secondo, quindi una perdita fissa per giro smorza tanto più in fretta quanto la nota
  // è acuta — al quadrato. Con la prima formula il La5 si spegneva in due decimi di
  // secondo e il collaudo non riusciva nemmeno a misurarne l'altezza.
  // Qui si sceglie prima quanto deve durare (tau), poi si ricava la perdita.
  const tau = Math.max(0.9, Math.min(3.5, 2.6 * (220 / hz) ** 0.35));
  const smorzamento = Math.exp(-1 / (tau * hz));

  // Dove si pizzica decide il timbro, e il punto e' un dato dello strumento: vedi
  // `puntoPizzico` in strumento.js.
  const puntoPizzico = STRUMENTO.puntoPizzico;
  let precedente = 0;
  const avvio = Math.min(campioni, n + 2);
  for (let i = 0; i < avvio; i += 1) {
    const t = i / avvio;
    const triangolo = t < puntoPizzico ? t / puntoPizzico : (1 - t) / (1 - puntoPizzico);
    const grezzo = Math.random() * 2 - 1;
    precedente = precedente * (1 - brillantezza) + grezzo * brillantezza;
    y[i] = (triangolo - 0.5) * 1.6 + precedente * 0.22;
  }

  for (let i = avvio; i < campioni; i += 1) {
    const a = 0.5 * (y[i - n] + y[i - n - 1]);        // filtro passa-basso dell'anello
    const b = 0.5 * (y[i - n - 1] + y[i - n - 2]);
    y[i] = smorzamento * (a * (1 - frazione) + b * frazione);
  }

  // Coda: evita il taglio netto in fondo al buffer.
  const coda = Math.floor(sr * 0.05);
  for (let i = 0; i < coda; i += 1) y[campioni - coda + i] *= 1 - i / coda;

  cacheCorde.set(chiave, buffer);
  return buffer;
}

/**
 * Filtro che imita il corpo dello strumento: senza, la corda suona come un elastico.
 *
 * Le tre frequenze sono un dato dello strumento, non del motore: stanno in strumento.js
 * con il motivo per cui valgono quello che valgono.
 */
function cassa() {
  const c = contesto();
  const corpo = c.createBiquadFilter();
  corpo.type = 'peaking';
  corpo.frequency.value = STRUMENTO.cassa.corpo;
  corpo.Q.value = STRUMENTO.cassa.corpoQ;
  corpo.gain.value = STRUMENTO.cassa.corpoGain;
  const aria = c.createBiquadFilter();
  aria.type = 'peaking';
  aria.frequency.value = STRUMENTO.cassa.aria;
  aria.Q.value = STRUMENTO.cassa.ariaQ;
  aria.gain.value = STRUMENTO.cassa.ariaGain;
  const taglio = c.createBiquadFilter();
  taglio.type = 'highpass';
  taglio.frequency.value = STRUMENTO.cassa.taglio;
  corpo.connect(aria).connect(taglio);
  return { ingresso: corpo, uscita: taglio };
}

// `ritardo` e' il tempo fra una corda e la successiva, e dipende da quante corde ha lo
// strumento: sta in strumento.js.
export function suonaPennata(listaHz, { ritardo = STRUMENTO.ritardoPennata, durata = 2.4, volume = 0.5, verso = 'giu' } = {}) {
  const c = contesto();
  const t0 = c.currentTime + 0.02;
  const { ingresso, uscita } = cassa();
  const finale = c.createGain();
  finale.gain.value = volume;
  uscita.connect(finale).connect(c.destination);

  const ordine = verso === 'su' ? [...listaHz.keys()].reverse() : [...listaHz.keys()];
  ordine.forEach((i, posizione) => {
    const hz = listaHz[i];
    if (!hz) return;
    const quando = t0 + posizione * ritardo;
    const sorgente = c.createBufferSource();
    sorgente.buffer = bufferCorda(hz, durata, verso === 'su' ? 0.62 : 0.5);
    const g = c.createGain();
    // Le corde toccate per prime suonano appena più forte: è la mano, non un bug.
    g.gain.value = 0.9 - posizione * 0.06;
    sorgente.connect(g).connect(ingresso);
    sorgente.start(quando);
  });
}

/** Una corda sola, per la scheda accordo e per il ripasso. */
export function suonaCorda(hz, { durata = 2.4, volume = 0.5 } = {}) {
  if (!hz) return;
  suonaPennata([hz], { durata, volume });
}

export function fermaNota() {
  if (!notaAttiva) return;
  const c = contesto();
  try {
    notaAttiva.g.gain.cancelScheduledValues(c.currentTime);
    notaAttiva.g.gain.setTargetAtTime(0.0001, c.currentTime, 0.02);
    notaAttiva.osc.forEach((o) => o.stop(c.currentTime + 0.1));
  } catch { /* già fermata */ }
  notaAttiva = null;
}

// ── Metronomo ────────────────────────────────────────────────────────────────

/**
 * Metronomo con programmazione anticipata: i click si mettono in coda nel tempo
 * dell'audio, non nel tempo di setInterval. Senza questo, sul telefono il tempo
 * balla ogni volta che la pagina ridisegna — e un esercizio di ritmo su un
 * metronomo che balla insegna a sbagliare.
 */
export class Metronomo {
  constructor({ bpm = 70, suddivisioni = 2, battitiPerBattuta = 4, onPassoAudio = null } = {}) {
    this.bpm = bpm;
    this.suddivisioni = suddivisioni;            // 2 = ottavi (1 e 2 e ...)
    this.battitiPerBattuta = battitiPerBattuta;  // 4 = quattro quarti, 3 = valzer
    this.onPassoAudio = onPassoAudio;   // (info) => void, chiamato alla programmazione
    this.attivo = false;
    this.passo = 0;                     // indice di suddivisione dall'avvio
    this.prossimo = 0;
    this.coda = [];
    this.griglia = [];                  // ultimi passi programmati: serve a giudicare il tempo
    this._timer = null;
    this.volumeClick = 0.5;
    this.clickSuddivisioni = false;     // se true suona anche gli ottavi
  }

  /**
   * La casella della griglia più vicina a un istante, con lo scarto in secondi.
   * È il metro con cui si dice "sei arrivato 90 ms in ritardo sul terzo battito":
   * i tempi vengono dall'orologio dell'audio, gli stessi con cui è stato suonato il click.
   */
  piuVicino(tempo) {
    let migliore = null;
    for (const info of this.griglia) {
      const scarto = tempo - info.quando;
      if (!migliore || Math.abs(scarto) < Math.abs(migliore.scarto)) migliore = { info, scarto };
    }
    return migliore;
  }

  get durataPasso() {
    return 60 / this.bpm / this.suddivisioni;
  }

  avvia() {
    if (this.attivo) return;
    const c = contesto();
    this.attivo = true;
    this.passo = 0;
    this.coda = [];
    this.griglia = [];
    this.prossimo = c.currentTime + 0.12;
    this._timer = setInterval(() => this._programma(), 25);
    this._programma();
  }

  ferma() {
    this.attivo = false;
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    this.coda = [];
  }

  /** Stato ritmico al momento presente, per l'animazione (letto in rAF). */
  posizioneOra() {
    const c = contesto();
    let ultimo = null;
    while (this.coda.length && this.coda[0].quando <= c.currentTime) ultimo = this.coda.shift();
    return ultimo;
  }

  _programma() {
    const c = contesto();
    const perBattito = this.suddivisioni;
    const perBattuta = perBattito * this.battitiPerBattuta;
    while (this.prossimo < c.currentTime + 0.15) {
      const dentro = ((this.passo % perBattuta) + perBattuta) % perBattuta;
      const suBattito = dentro % perBattito === 0;
      const info = {
        passo: this.passo,
        quando: this.prossimo,
        suBattito,
        slot: dentro,                                  // casella nella griglia del ritmo
        battuta: Math.floor(this.passo / perBattuta),  // quante battute dall'avvio
        battito: Math.floor(dentro / perBattito),
        sub: dentro % perBattito,
        accento: dentro === 0,
      };
      if (suBattito || this.clickSuddivisioni) this._click(this.prossimo, info.accento, suBattito);
      this.coda.push(info);
      this.griglia.push(info);
      if (this.griglia.length > 96) this.griglia.shift();
      if (this.onPassoAudio) this.onPassoAudio(info);
      this.prossimo += this.durataPasso;
      this.passo += 1;
    }
  }

  /**
   * Il click sta SOPRA la banda in cui l'app ascolta le corde (vedi chroma.js).
   *
   * Non è una scelta di gusto: se il metronomo suona dall'altoparlante mentre il
   * microfono è aperto, il microfono lo sente. Un click che cade in mezzo alle
   * fondamentali dello strumento verrebbe contato come una pennata — l'esercizio
   * risulterebbe suonato benissimo anche a strumento appoggiato sul tavolo.
   * A 2,6–3,5 kHz resta chiarissimo per l'orecchio e quasi assente dove si misura.
   */
  _click(quando, accento, suBattito) {
    const c = contesto();
    const o = c.createOscillator();
    const g = c.createGain();
    const passaAlto = c.createBiquadFilter();
    passaAlto.type = 'highpass';
    passaAlto.frequency.value = 1800;
    o.type = 'square';
    o.frequency.value = accento ? 3520 : (suBattito ? 2960 : 2490);
    const picco = this.volumeClick * (accento ? 1 : (suBattito ? 0.62 : 0.3));
    g.gain.setValueAtTime(0, quando);
    g.gain.linearRampToValueAtTime(picco, quando + 0.0015);
    g.gain.exponentialRampToValueAtTime(0.0001, quando + 0.032);
    o.connect(g).connect(passaAlto).connect(c.destination);
    o.start(quando);
    o.stop(quando + 0.05);
  }
}

// ── Schermo sveglio durante l'esercizio ──────────────────────────────────────

let sentinella = null;

export async function tieniSchermoAcceso(vero) {
  try {
    if (vero && 'wakeLock' in navigator && !sentinella) {
      sentinella = await navigator.wakeLock.request('screen');
      sentinella.addEventListener('release', () => { sentinella = null; });
    } else if (!vero && sentinella) {
      await sentinella.release();
      sentinella = null;
    }
  } catch { /* non supportato o negato: si continua, lo schermo si spegnerà */ }
}
