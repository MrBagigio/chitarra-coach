// Ripetizione spaziata: quello che hai sbagliato torna, quello che sai si dirada.
//
// Il percorso da solo è una linea: impari il Fa al livello 2 e non lo rivedi più finché
// non compare in un brano. Ma le dita dimenticano, e dimenticano proprio quello che è
// costato fatica. Questo modulo tiene il conto e riporta a galla al momento giusto.
//
// L'algoritmo è un SM-2 accorciato: ogni voce ha un intervallo in giorni e una "facilità"
// che cresce quando va bene e crolla quando va male. Non serve di meglio — la precisione
// di un modello di memoria si perde comunque nel rumore di quanto hai dormito.

import * as store from './store.js';
import { accordo, etichettaAccordo } from './chords.js';
import { PER_ID as PER_ID_RITMI } from './patterns.js';

const FACILITA_MIN = 1.3;
const FACILITA_MAX = 2.8;
const FACILITA_INIZIALE = 2.0;

const oggi = () => new Date().toISOString().slice(0, 10);
const giornoPiu = (giorni) => new Date(Date.now() + giorni * 86400000).toISOString().slice(0, 10);
const giorniFra = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);

export const chiaveAccordo = (id) => `accordo:${id}`;
export const chiaveCambio = (a, b) => `cambio:${[a, b].sort().join('>')}`;
export const chiaveRitmo = (id) => `ritmo:${id}`;

function voce(chiave) {
  const d = store.dati();
  if (!d.ripasso) d.ripasso = {};
  if (!d.ripasso[chiave]) {
    d.ripasso[chiave] = {
      intervallo: 0,
      facilita: FACILITA_INIZIALE,
      scadenza: oggi(),
      tentativi: 0,
      errori: 0,
      ultimo: null,
      bpmMigliore: 0,
    };
  }
  return d.ripasso[chiave];
}

/**
 * Registra com'è andata e ricalcola quando rivedere.
 * @param {string} chiave
 * @param {'pulito'|'quasi'|'sporco'} esito
 */
export function registra(chiave, esito, { bpm = 0 } = {}) {
  const v = voce(chiave);
  v.tentativi += 1;
  v.ultimo = oggi();
  if (bpm > v.bpmMigliore && esito !== 'sporco') v.bpmMigliore = bpm;

  if (esito === 'sporco') {
    v.errori += 1;
    v.facilita = Math.max(FACILITA_MIN, v.facilita - 0.2);
    v.intervallo = 1;                       // domani, non fra una settimana
  } else if (esito === 'quasi') {
    v.facilita = Math.max(FACILITA_MIN, v.facilita - 0.05);
    v.intervallo = v.intervallo <= 1 ? 2 : Math.round(v.intervallo * 1.2);
  } else {
    v.facilita = Math.min(FACILITA_MAX, v.facilita + 0.1);
    v.intervallo = v.intervallo === 0 ? 1 : (v.intervallo === 1 ? 3 : Math.round(v.intervallo * v.facilita));
  }
  v.intervallo = Math.max(1, Math.min(120, v.intervallo));
  v.scadenza = giornoPiu(v.intervallo);
  store.salva();
  // Copia, non il riferimento all'oggetto salvato: chi riceve il risultato non deve
  // poter modificare l'archivio per sbaglio, e due letture successive devono poter
  // essere confrontate fra loro invece di essere lo stesso oggetto mutato due volte.
  return { ...v };
}

/** Quello che scade oggi o prima, dal più in ritardo al meno. */
export function dovuti({ limite = 8 } = {}) {
  const d = store.dati();
  const g = oggi();
  return Object.entries(d.ripasso || {})
    .map(([chiave, v]) => ({ chiave, ...v, ritardo: giorniFra(v.scadenza, g) }))
    .filter((x) => x.ritardo >= 0 && x.tentativi > 0)
    .sort((a, b) => (b.ritardo - a.ritardo) || (a.facilita - b.facilita))
    .slice(0, limite);
}

/** Quanti ne aspettano, senza limite: serve al numero sulla schermata di apertura. */
export function quantiDovuti() {
  return dovuti({ limite: 999 }).length;
}

/** Gli accordi coinvolti in ciò che è dovuto: alimentano un esercizio di cambi mirato. */
export function accordiDaRipassare({ limite = 6 } = {}) {
  const visti = [];
  dovuti({ limite: 999 }).forEach((v) => {
    const [tipo, resto] = v.chiave.split(':');
    if (tipo === 'accordo') { if (!visti.includes(resto)) visti.push(resto); }
    if (tipo === 'cambio') resto.split('>').forEach((id) => { if (!visti.includes(id)) visti.push(id); });
  });
  return visti.filter((id) => accordo(id)).slice(0, limite);
}

/** Come si chiama una voce di ripasso sullo schermo. */
export function etichetta(chiave) {
  const [tipo, resto] = chiave.split(':');
  if (tipo === 'accordo') {
    const a = accordo(resto);
    return a ? etichettaAccordo(a) : resto;
  }
  if (tipo === 'cambio') {
    return resto.split('>').map((id) => {
      const a = accordo(id);
      return a ? etichettaAccordo(a) : id;
    }).join(' ↔ ');
  }
  if (tipo === 'ritmo') {
    const r = PER_ID_RITMI.get(resto);
    return r ? r.nome : resto;
  }
  return resto;
}

export function tipoDi(chiave) {
  return chiave.split(':')[0];
}

/**
 * Registra quello che un esercizio ha toccato DAVVERO.
 *
 * @param {string[]} accordi gli accordi suonati
 * @param {string[][]} coppie i cambi realmente avvenuti, in coppie consecutive
 *
 * Prima le coppie venivano generate combinando tutti con tutti: otto accordi facevano
 * ventotto voci di ripasso, e ventuno di quei cambi non li avevi mai suonati. La lista
 * "da ripassare oggi" si riempiva di roba inventata e smetteva di voler dire qualcosa.
 * Ora le coppie le dichiara l'esercizio, che sa quali cambi ha davvero mostrato.
 */
export function registraEsercizio({ accordi = [], coppie = [], ritmo = null, esito = 'pulito', bpm = 0 }) {
  accordi.forEach((id) => registra(chiaveAccordo(id), esito, { bpm }));
  const viste = new Set();
  coppie.forEach(([a, b]) => {
    if (!a || !b || a === b) return;
    const chiave = chiaveCambio(a, b);
    if (viste.has(chiave)) return;
    viste.add(chiave);
    registra(chiave, esito, { bpm });
  });
  if (ritmo) registra(chiaveRitmo(ritmo), esito, { bpm });
}
