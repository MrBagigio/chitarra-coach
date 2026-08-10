// Tutte le posizioni possibili di un accordo sul manico.
//
// Serve a una cosa che si sente in quasi tutto il pop: lo stesso giro suonato due volte,
// la seconda più in alto. Non è un altro accordo — è lo stesso accordo in un'altra
// ottava, e sul manico è un'altra forma.
//
// Le posizioni NON sono scritte a mano: si cercano. Per ogni corda si guarda quali tasti
// danno una nota dell'accordo, si combinano, e si tiene solo ciò che una mano umana può
// premere davvero. Così ogni accordo ne ha, anche quelli che nessuno mette nei libri.

import { classiAttese } from './theory.js';
import { CORDE_SEMITONI } from './chords.js';

const MAX_TASTO = 12;
const MAX_APERTURA = 4;      // quanti tasti può coprire la mano
const MAX_DITA = 4;

/** Le note (in classi) che una diteggiatura produce. */
function classiDi(tasti, corde) {
  return tasti.map((t, i) => (t < 0 ? null : (corde[i] + t) % 12)).filter((v) => v !== null);
}

/** L'altezza media in semitoni: distingue una posizione aperta da una alta. */
function altezzaMedia(tasti, corde, midiCorde) {
  const note = tasti.map((t, i) => (t < 0 ? null : midiCorde[i] + t)).filter((v) => v !== null);
  return note.reduce((a, b) => a + b, 0) / note.length;
}

/**
 * Quante dita servono, riconoscendo il barré: se più corde premono lo STESSO tasto e
 * quel tasto è il più basso della presa, si contano come un dito solo.
 */
function costoDita(tasti) {
  const premuti = tasti.map((t, i) => ({ t, i })).filter((x) => x.t > 0);
  if (!premuti.length) return { dita: 0, barre: null };
  const minimo = Math.min(...premuti.map((x) => x.t));
  const suMinimo = premuti.filter((x) => x.t === minimo);
  if (suMinimo.length >= 2) {
    const da = Math.min(...suMinimo.map((x) => x.i));
    const a = Math.max(...suMinimo.map((x) => x.i));
    // Il barré copre un intervallo continuo: le corde in mezzo devono essere >= al tasto
    const copribile = tasti.slice(da, a + 1).every((t) => t >= minimo);
    if (copribile) {
      return { dita: 1 + premuti.filter((x) => x.t > minimo).length, barre: { tasto: minimo, da, a } };
    }
  }
  return { dita: premuti.length, barre: null };
}

/**
 * Genera le posizioni suonabili di un accordo.
 * @returns {{tasti:number[], dita:number[], barre:object|null, posizione:number,
 *            altezza:number, aperte:number, etichetta:string}[]}
 */
export function posizioniDi(nomeAccordo, { corde = CORDE_SEMITONI, midiCorde = [67, 60, 64, 69], limite = 6 } = {}) {
  const atteso = classiAttese(nomeAccordo);
  if (!atteso) return [];
  const ammesse = new Set(atteso.ammesse);
  const obbligatorie = atteso.obbligatorie;
  const fondamentale = atteso.scomposto.fondamentale;

  // Candidati per corda: ogni tasto che dia una nota dell'accordo.
  const candidati = corde.map((base) => {
    const lista = [];
    for (let t = 0; t <= MAX_TASTO; t += 1) if (ammesse.has((base + t) % 12)) lista.push(t);
    return lista;
  });

  const trovate = [];
  const viste = new Set();

  const combina = (corda, presa) => {
    if (corda === 4) {
      const premuti = presa.filter((t) => t > 0);
      if (premuti.length) {
        const apertura = Math.max(...premuti) - Math.min(...premuti);
        if (apertura >= MAX_APERTURA) return;
      }
      const suonate = new Set(classiDi(presa, corde));
      if (!obbligatorie.every((pc) => suonate.has(pc))) return;
      const { dita, barre } = costoDita(presa);
      if (dita > MAX_DITA) return;

      const chiave = presa.join(',');
      if (viste.has(chiave)) return;
      viste.add(chiave);

      const posizione = premuti.length ? Math.min(...premuti) : 0;
      trovate.push({
        tasti: [...presa],
        barre,
        dita: numeraDita(presa, barre),
        posizione,
        altezza: altezzaMedia(presa, corde, midiCorde),
        aperte: presa.filter((t) => t === 0).length,
        nDita: dita,
        bassoFondamentale: bassoE(presa, corde, midiCorde) === fondamentale,
      });
      return;
    }
    candidati[corda].forEach((t) => combina(corda + 1, [...presa, t]));
  };
  combina(0, []);

  // Ordine: prima quello che si suona più facilmente e più in basso.
  trovate.sort((a, b) => (a.posizione - b.posizione)
    || (a.nDita - b.nDita)
    || (b.aperte - a.aperte)
    || (b.bassoFondamentale - a.bassoFondamentale));

  // Una posizione per "zona" del manico: dieci varianti della stessa presa non servono.
  //
  // Quale tenere per zona non è indifferente. Tenendo la più FACILE, le zone alte
  // finivano rappresentate da prese con due corde libere — che stanno in alto sul manico
  // ma suonano grave, e l'effetto "stesso giro un'ottava sopra" spariva. Dalla zona 1 in
  // su si tiene quindi la più ACUTA; nella zona aperta si tiene la più facile, perché lì
  // la forma che tutti conoscono vale più di mezzo tono in più.
  const perZona = new Map();
  trovate.forEach((v) => {
    const zona = zonaDi(v);
    const attuale = perZona.get(zona);
    if (!attuale) { perZona.set(zona, v); return; }
    if (zona > 0 && v.altezza > attuale.altezza && v.nDita <= 4) perZona.set(zona, v);
  });

  const perAltezza = [...perZona.values()].sort((a, b) => a.altezza - b.altezza);

  // Si campiona lungo TUTTO l'arco, non si taglia in cima.
  //
  // Prima c'era uno `slice(0, limite)` dopo l'ordinamento dal grave all'acuto: teneva le
  // cinque posizioni più gravi e buttava via le più acute — cioè esattamente quelle per
  // cui esiste questa funzione. Il primo e l'ultimo ci sono sempre; in mezzo si prende a
  // passo regolare.
  if (perAltezza.length <= limite) {
    return perAltezza.map((v) => ({ ...v, etichetta: etichettaPosizione(v) }));
  }
  const scelte = [];
  for (let i = 0; i < limite; i += 1) {
    const k = Math.round((i * (perAltezza.length - 1)) / (limite - 1));
    if (!scelte.includes(perAltezza[k])) scelte.push(perAltezza[k]);
  }
  return scelte.map((v) => ({ ...v, etichetta: etichettaPosizione(v) }));
}

function bassoE(tasti, corde, midiCorde) {
  let minMidi = Infinity;
  let classe = null;
  tasti.forEach((t, i) => {
    if (t < 0) return;
    const m = midiCorde[i] + t;
    if (m < minMidi) { minMidi = m; classe = (corde[i] + t) % 12; }
  });
  return classe;
}

/** Numeri delle dita plausibili: indice al tasto più basso, poi in ordine. */
function numeraDita(tasti, barre) {
  const dita = [0, 0, 0, 0];
  const premuti = tasti.map((t, i) => ({ t, i })).filter((x) => x.t > 0)
    .sort((a, b) => a.t - b.t || a.i - b.i);
  let prossimo = 1;
  const perTasto = new Map();
  premuti.forEach(({ t, i }) => {
    if (barre && t === barre.tasto && i >= barre.da && i <= barre.a) { dita[i] = 1; return; }
    if (!perTasto.has(t)) {
      prossimo = Math.min(4, Math.max(prossimo, barre && t > barre.tasto ? 2 : prossimo));
      perTasto.set(t, prossimo);
      prossimo += 1;
    }
    dita[i] = perTasto.get(t);
  });
  return dita;
}

/**
 * In quale "zona" del manico sta la mano.
 *
 * La posizione aperta è una categoria a sé, non la zona più bassa: il Do di tutti è
 * [0 0 0 3], che ha il dito al terzo tasto ma con tre corde libere — misurandolo dal
 * tasto premuto finiva in zona 1 e veniva scartato in favore di una presa più acuta.
 * Quella forma però è la prima che si impara e non può sparire dall'elenco.
 */
function zonaDi(v) {
  const premuti = v.tasti.filter((t) => t > 0);
  const aperte = v.tasti.filter((t) => t === 0).length;
  if (aperte >= 1 && (!premuti.length || Math.max(...premuti) <= 4)) return 0;
  return Math.floor(v.posizione / 3) + 1;
}

function etichettaPosizione(v) {
  if (zonaDi(v) === 0) return 'posizione aperta';
  return `${v.posizione}ª posizione`;
}

/** Di quante ottave differiscono due posizioni: è la domanda "lo stesso giro più in alto". */
export function distanzaOttave(a, b) {
  return (b.altezza - a.altezza) / 12;
}
