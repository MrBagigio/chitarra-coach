// Tutte le posizioni possibili di un accordo sul manico.
//
// Serve a una cosa che si sente in quasi tutto il pop: lo stesso giro suonato due volte,
// la seconda più in alto. Non è un altro accordo — è lo stesso accordo in un'altra
// ottava, e sul manico è un'altra forma.
//
// Le posizioni NON sono scritte a mano: si cercano. Per ogni corda si guarda quali tasti
// danno una nota dell'accordo, si combinano, e si tiene solo ciò che una mano umana può
// premere davvero. Così ogni accordo ne ha, anche quelli che nessuno mette nei libri.

import { classiAttese, nomeClasse } from './theory.js';
import { CORDE_SEMITONI } from './chords.js';

const MAX_TASTO = 12;
const MAX_APERTURA = 4;      // quanti tasti può coprire la mano
const MAX_DITA = 4;
const MINIME_SUONANTI = 4;   // sotto le quattro corde non è più un accordo, è un bicordo

/**
 * Prese che la mano non può fare, per quanto le note siano giuste.
 *
 * Il caso: due corde sullo stesso tasto minimo, e in mezzo corde premute PIÙ SU. Se il
 * barré è possibile va bene — l'indice passa sotto e le altre dita gli stanno sopra, è
 * esattamente come si suona un Do diminuito. Ma se in mezzo c'è una corda a VUOTO, il
 * barré la spegnerebbe: allora il dito di destra deve raggiungere il tasto basso passando
 * sotto le dita già premute più in alto, e quella è una contorsione, non una diteggiatura.
 *
 * Senza questo controllo la ricerca proponeva 1-0-3-2-1-x come "il Fa in posizione
 * aperta": note giuste, mano impossibile.
 *
 * Attenzione a non confondere questo caso con il Sim7 (x20202), dove le corde in mezzo
 * sono a vuoto ma nessuna è premuta più in alto: lì bastano tre dita separate e si suona
 * tutti i giorni.
 */
function manoImpossibile(tasti) {
  const premuti = tasti.map((t, i) => ({ t, i })).filter((x) => x.t > 0);
  if (premuti.length < 2) return false;
  const minimo = Math.min(...premuti.map((x) => x.t));
  const suMinimo = premuti.filter((x) => x.t === minimo);
  if (suMinimo.length < 2) return false;
  const da = suMinimo[0].i;
  const a = suMinimo[suMinimo.length - 1].i;
  const inMezzo = tasti.slice(da + 1, a);
  const barrabile = inMezzo.every((t) => t >= minimo);
  if (barrabile) return false;                       // l'indice fa da capotasto: si suona
  return inMezzo.some((t) => t > minimo);            // deve passare sotto: non si suona
}

/**
 * Le corde smorzate stanno solo ai BORDI.
 *
 * Sulla chitarra smorzare è normale — il Do non suona il Mi basso — ma smorzare una corda
 * IN MEZZO a due che suonano richiede di appoggiare un polpastrello a metà presa, e non è
 * roba da chi sta imparando. Generando anche quelle, la ricerca produceva forme che sulla
 * carta suonano l'accordo e sotto le dita non si tengono.
 */
function smorzateSoloAiBordi(tasti) {
  const suonanti = tasti.map((t, i) => (t >= 0 ? i : -1)).filter((i) => i >= 0);
  if (suonanti.length < MINIME_SUONANTI) return false;
  return suonanti[suonanti.length - 1] - suonanti[0] === suonanti.length - 1;
}

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
export function posizioniDi(nomeAccordo, { corde = CORDE_SEMITONI, midiCorde = [40, 45, 50, 55, 59, 64], limite = 6 } = {}) {
  const atteso = classiAttese(nomeAccordo);
  if (!atteso) return [];
  const ammesse = new Set(atteso.ammesse);
  const obbligatorie = atteso.obbligatorie;
  const fondamentale = atteso.scomposto.fondamentale;

  // Candidati per corda: ogni tasto che dia una nota dell'accordo, più il silenzio.
  // Il −1 non c'era: senza, sulla chitarra non si sarebbe potuto generare nemmeno il Do
  // di tutti (x32010), perché la 6ª non si suona.
  const candidati = corde.map((base) => {
    const lista = [-1];
    for (let t = 0; t <= MAX_TASTO; t += 1) if (ammesse.has((base + t) % 12)) lista.push(t);
    return lista;
  });

  const trovate = [];
  const viste = new Set();

  const combina = (corda, presa) => {
    if (corda === corde.length) {
      if (!smorzateSoloAiBordi(presa)) return;
      if (manoImpossibile(presa)) return;
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
        suonanti: presa.filter((t) => t >= 0).length,
        nDita: dita,
        basso: bassoE(presa, corde, midiCorde),
        bassoFondamentale: bassoE(presa, corde, midiCorde) === fondamentale,
      });
      return;
    }
    candidati[corda].forEach((t) => combina(corda + 1, [...presa, t]));
  };
  combina(0, []);

  // Ordine: più in basso sul manico, poi la FONDAMENTALE AL BASSO, poi più corde che suonano.
  //
  // I due criteri in mezzo sono entrambi arrivati con la chitarra, e in quest'ordine:
  //
  //   Le corde che suonano contano più delle dita. Con il solo "meno dita", ereditato
  //   dall'ukulele dove non si smorza niente, il Sol veniva rappresentato da x2000x — un
  //   dito, quattro corde, tecnicamente un Sol e praticamente nessun Sol.
  //
  //   Ma il basso viene prima ancora. Contando solo le corde, vinceva 032010: un Do con
  //   il Mi al basso. Suona sei corde ed è un accordo legittimo, però è un RIVOLTO, e
  //   proporlo come "il Do" a chi impara è insegnare la cosa sbagliata. Le forme che
  //   tutti conoscono hanno la fondamentale sotto — è per questo che sono quelle.
  trovate.sort((a, b) => (a.posizione - b.posizione)
    || (b.bassoFondamentale - a.bassoFondamentale)
    || (b.suonanti - a.suonanti)
    || (a.nDita - b.nDita)
    || (b.aperte - a.aperte));

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
    if (zona === 0 || v.nDita > 4) return;
    // Stessa scala di valori dell'ordinamento: prima il basso giusto, poi quante corde
    // suonano, e solo a parità di entrambi la più acuta — che è il motivo per cui
    // questa funzione esiste.
    const meglio = (x, y) => (x.bassoFondamentale !== y.bassoFondamentale ? x.bassoFondamentale
      : (x.suonanti !== y.suonanti ? x.suonanti > y.suonanti : x.altezza > y.altezza));
    if (meglio(v, attuale)) perZona.set(zona, v);
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
  const dita = tasti.map(() => 0);
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

/**
 * Il basso che NON è la fondamentale va detto.
 *
 * Sulla chitarra è normale che la corda più grave suoni la terza o la quinta invece della
 * fondamentale: è un rivolto, suona diverso e in mezzo a un giro può essere proprio quello
 * che serve. Ma chi impara deve saperlo, altrimenti crede che quella sia "la" forma.
 */
function etichettaPosizione(v, bemolli = false) {
  const base = zonaDi(v) === 0 ? 'posizione aperta' : `${v.posizione}ª posizione`;
  return v.bassoFondamentale ? base : `${base} · basso ${nomeClasse(v.basso, bemolli)}`;
}

/** Di quante ottave differiscono due posizioni: è la domanda "lo stesso giro più in alto". */
export function distanzaOttave(a, b) {
  return (b.altezza - a.altezza) / 12;
}
