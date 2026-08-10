// Importazione di spartiti di accordi scritti da te.
//
// È la risposta onesta al problema del catalogo: le canzoni che uno vuole davvero suonare
// sono protette e licenziarle costa quanto un'azienda. Ma la SEQUENZA di accordi che ti
// scrivi da solo è tua, resta sul tuo telefono e non passa da nessuna parte — e con quella
// l'app diventa utile su qualunque pezzo, non solo sui trenta tradizionali che porta.
//
// Riconosce i tre modi in cui la gente scrive gli accordi:
//   1. a righe alternate — accordi sopra, parole sotto
//   2. in linea         — [C]Fra Mar[G7]tino
//   3. solo accordi     — C F G7 G7   oppure   | C | Am | F | G |

import { scomponi, trasponi } from './theory.js';
import * as store from './store.js';

const RIPULISCI = /[()–—,;]/g;

/** È un accordo? Lo decide la teoria, non un elenco scritto a mano. */
export function eAccordo(parola) {
  const pulita = parola.replace(RIPULISCI, '').trim();
  if (!pulita || pulita.length > 10) return null;
  return scomponi(pulita) ? pulita : null;
}

function soloAccordi(riga) {
  const parole = riga.trim().split(/\s+/).filter(Boolean);
  if (!parole.length) return false;
  const riconosciute = parole.filter((p) => eAccordo(p)).length;
  return riconosciute === parole.length;
}

/**
 * Legge un testo e ne ricava una successione di battute.
 * @returns {{battute:string[], accordi:string[], avvisi:string[], formato:string}}
 */
export function leggiSpartito(testo, { battutePerAccordo = 1 } = {}) {
  const avvisi = [];
  const righe = String(testo || '').split(/\r?\n/);
  let formato = 'elenco';
  let sequenza = [];       // ogni voce = una battuta, con eventuale 'A|B'
  const nonRiconosciute = new Set();

  const inLinea = /\[([^\]]{1,10})\]/g;
  const conParentesi = righe.some((r) => inLinea.test(r));
  inLinea.lastIndex = 0;

  if (conParentesi) {
    formato = 'in linea';
    righe.forEach((r) => {
      let m;
      const re = /\[([^\]]{1,10})\]/g;
      while ((m = re.exec(r)) !== null) {
        const a = eAccordo(m[1]);
        if (a) sequenza.push(a);
        else nonRiconosciute.add(m[1]);
      }
    });
  } else {
    const righeAccordi = righe.filter((r) => r.trim() && soloAccordi(r));
    if (righeAccordi.length && righeAccordi.length < righe.filter((r) => r.trim()).length) {
      formato = 'accordi sopra le parole';
    }
    const daLeggere = righeAccordi.length ? righeAccordi : righe;
    daLeggere.forEach((r) => {
      // La barra verticale, se c'è, è il confine di battuta: è l'informazione più preziosa
      // di tutto lo spartito, perché è l'unica che dice quanto dura ogni accordo.
      if (r.includes('|')) {
        formato = 'battute separate da |';
        r.split('|').forEach((cella) => {
          const dentro = cella.trim().split(/\s+/).map(eAccordo).filter(Boolean);
          if (dentro.length === 1) sequenza.push(dentro[0]);
          else if (dentro.length >= 2) sequenza.push(dentro.slice(0, 2).join('|'));
        });
      } else {
        r.trim().split(/\s+/).forEach((p) => {
          const a = eAccordo(p);
          if (a) sequenza.push(a);
          else if (p.trim() && righeAccordi.length) nonRiconosciute.add(p.trim());
        });
      }
    });
  }

  if (formato !== 'battute separate da |' && battutePerAccordo > 1) {
    sequenza = sequenza.flatMap((a) => Array(battutePerAccordo).fill(a));
  }

  if (!sequenza.length) avvisi.push('Non ho trovato nessun accordo. Controlla che siano scritti con la lettera maiuscola: C, Am, F#m7, Bb.');
  if (nonRiconosciute.size) {
    avvisi.push(`Non ho capito: ${[...nonRiconosciute].slice(0, 6).join(', ')}${nonRiconosciute.size > 6 ? '…' : ''}. Li ho saltati.`);
  }
  if (formato !== 'battute separate da |' && sequenza.length) {
    avvisi.push('Nello spartito non c\'erano le stanghette di battuta, quindi ho dato una battuta a ogni accordo. Se non torna, usa il formato con le barre: | C | Am | F | G |');
  }

  const accordi = [...new Set(sequenza.flatMap((c) => c.split('|')))];
  return { battute: sequenza, accordi, avvisi, formato };
}

// ── Archivio dei brani tuoi ──────────────────────────────────────────────────

const PREFISSO = 'mio-';

export function braniMiei() {
  return store.dati().braniMiei || [];
}

export function salvaBrano({ titolo, battute, battiti = 4, bpm = 76, testo = '' }) {
  const d = store.dati();
  if (!d.braniMiei) d.braniMiei = [];

  // Stessa musica, stesso brano. Il costruttore di giri salva a ogni "Suona": senza
  // questo controllo, provare tre volte lo stesso giro lasciava tre "Giro in C"
  // identici nell'elenco, e dopo mezz'ora la lista era illeggibile.
  const impronta = `${battute.join(' ')}|${battiti}`;
  const esistente = d.braniMiei.find((b) => `${b.battute.join(' ')}|${b.battiti}` === impronta);
  if (esistente) {
    esistente.bpm = bpm;
    store.salva();
    return esistente;
  }

  const id = `${PREFISSO}${Date.now().toString(36)}`;
  const brano = {
    id,
    titolo: titolo.trim() || 'Senza titolo',
    genere: 'mio',
    battiti,
    bpm,
    battute,
    testo: 'Spartito tuo, salvato su questo telefono.',
    sorgente: testo,
  };
  d.braniMiei.push(brano);
  store.salva();
  return brano;
}

export function cancellaBrano(id) {
  const d = store.dati();
  d.braniMiei = (d.braniMiei || []).filter((b) => b.id !== id);
  store.salva();
}

export function branoMio(id) {
  return braniMiei().find((b) => b.id === id) || null;
}

export const eMio = (id) => String(id).startsWith(PREFISSO);

/** Trasporta uno spartito già salvato, in modo permanente. */
export function trasportaBrano(id, semitoni) {
  const b = branoMio(id);
  if (!b) return null;
  b.battute = b.battute.map((cella) => cella.split('|').map((c) => trasponi(c, semitoni)).join('|'));
  store.salva();
  return b;
}
