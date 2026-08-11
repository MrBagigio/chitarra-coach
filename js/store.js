// Stato salvato sul telefono. Nessun server: se il localStorage non è disponibile
// (Safari in navigazione privata) l'app funziona comunque, solo non ricorda.

const CHIAVE = 'chitarra-coach/v1';

const VUOTO = () => ({
  versione: 3,
  accordatura: 'eadgbe',
  la4: 440,
  tema: 'scuro',
  obiettivoMinuti: 10,
  bpmPreferito: 70,
  latenzaMs: null,          // ritardo misurato del dispositivo, null = mai tarato
  ascoltoVivo: true,        // il microfono giudica il tempo durante gli esercizi
  ripasso: {},              // ripetizione spaziata: chiave → {scadenza, intervallo, …}
  braniMiei: [],            // spartiti di accordi importati dall'utente
  inciampi: {},             // idPasso → quante volte è stato ripetuto senza chiuderlo
  passiFatti: {},          // idPasso -> {il: iso, dati}
  accordi: {},             // idAccordo -> {esercizi, bpmMigliore, ultimo}
  minutiPerGiorno: {},     // 'YYYY-MM-DD' -> minuti
  ultimoGiorno: null,
  serie: 0,                // giorni consecutivi
  serieRecord: 0,
  visitato: false,
});

let stato = null;
const ascoltatori = new Set();

function carica() {
  try {
    const grezzo = localStorage.getItem(CHIAVE);
    if (!grezzo) return VUOTO();
    const letto = JSON.parse(grezzo);
    return { ...VUOTO(), ...letto };
  } catch {
    return VUOTO();
  }
}

export function dati() {
  if (!stato) stato = carica();
  return stato;
}

export function salva() {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify(dati()));
  } catch { /* spazio pieno o privata: si prosegue senza memoria */ }
  ascoltatori.forEach((f) => f(dati()));
}

export function osserva(f) {
  ascoltatori.add(f);
  return () => ascoltatori.delete(f);
}

export function imposta(campo, valore) {
  dati()[campo] = valore;
  salva();
}

const oggi = () => new Date().toISOString().slice(0, 10);

/** Un passo del percorso è fatto. Idempotente: rifarlo non falsa le statistiche. */
export function segnaPasso(id, extra = {}) {
  const d = dati();
  if (!d.passiFatti[id]) d.passiFatti[id] = { il: new Date().toISOString(), ...extra };
  else d.passiFatti[id] = { ...d.passiFatti[id], ...extra };
  salva();
}

export function annullaPasso(id) {
  delete dati().passiFatti[id];
  salva();
}

export function passoFatto(id) {
  return !!dati().passiFatti[id];
}

/** Registra un esercizio su un accordo: quante volte e a che velocità. */
export function segnaAccordo(id, { bpm = null, cambi = 0 } = {}) {
  const d = dati();
  const v = d.accordi[id] || { esercizi: 0, cambi: 0, bpmMigliore: 0, ultimo: null };
  v.esercizi += 1;
  v.cambi += cambi;
  if (bpm && bpm > v.bpmMigliore) v.bpmMigliore = bpm;
  v.ultimo = new Date().toISOString();
  d.accordi[id] = v;
  salva();
}

/** Minuti di pratica + serie di giorni consecutivi. */
export function segnaPratica(minuti) {
  const d = dati();
  const g = oggi();
  d.minutiPerGiorno[g] = Math.round(((d.minutiPerGiorno[g] || 0) + minuti) * 10) / 10;
  if (d.ultimoGiorno !== g) {
    const ieri = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    d.serie = d.ultimoGiorno === ieri ? d.serie + 1 : 1;
    d.serieRecord = Math.max(d.serieRecord, d.serie);
    d.ultimoGiorno = g;
  }
  salva();
}

/**
 * Segna un tentativo non riuscito su un passo.
 *
 * Non è statistica per far numero: è l'unica cosa che dice DOVE ci si blocca. Resta sul
 * telefono — nessuno la vede tranne te, e la si guarda in Altro.
 */
export function segnaInciampo(idPasso) {
  const d = dati();
  if (!d.inciampi) d.inciampi = {};
  d.inciampi[idPasso] = (d.inciampi[idPasso] || 0) + 1;
  salva();
}

export function inciampiOrdinati(limite = 5) {
  const d = dati();
  return Object.entries(d.inciampi || {})
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limite);
}

export function minutiOggi() {
  return dati().minutiPerGiorno[oggi()] || 0;
}

export function minutiTotali() {
  return Object.values(dati().minutiPerGiorno).reduce((a, b) => a + b, 0);
}

export function azzera() {
  stato = VUOTO();
  salva();
}

/** Minuti degli ultimi N giorni, dal più vecchio a oggi: alimenta il grafico. */
export function ultimiGiorni(n = 14) {
  const d = dati();
  const out = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const g = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
    out.push({ giorno: g, minuti: d.minutiPerGiorno[g] || 0, oggi: i === 0 });
  }
  return out;
}

// ── Backup ───────────────────────────────────────────────────────────────────
//
// Senza account non c'è nulla nel cloud: se cambi telefono o svuoti Safari, i progressi
// spariscono. Questo è l'unico modo per portarli via, e va detto invece di scoprirlo dopo.

export function esporta() {
  return JSON.stringify({ app: 'chitarra-coach', esportatoIl: new Date().toISOString(), dati: dati() }, null, 2);
}

/** @returns {{ok:boolean, motivo:string}} */
export function importa(testo) {
  let letto;
  try {
    letto = JSON.parse(testo);
  } catch {
    return { ok: false, motivo: 'Non è un file di backup valido (JSON illeggibile).' };
  }
  const corpo = letto && letto.app === 'chitarra-coach' ? letto.dati : letto;
  if (!corpo || typeof corpo !== 'object' || !('passiFatti' in corpo)) {
    return { ok: false, motivo: 'Il file non contiene un avanzamento di Chitarra Coach.' };
  }
  stato = { ...VUOTO(), ...corpo };
  salva();
  return { ok: true, motivo: `Ripristinati ${Object.keys(stato.passiFatti).length} passi.` };
}

/** Applica il tema scelto all'elemento radice. */
export function applicaTema() {
  const scelto = dati().tema || 'scuro';
  const scuroDiSistema = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effettivo = scelto === 'auto' ? (scuroDiSistema ? 'scuro' : 'chiaro') : scelto;
  document.documentElement.dataset.tema = effettivo;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', effettivo === 'chiaro' ? '#f7f1e8' : '#14100d');
}
