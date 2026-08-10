// Libreria accordi per ukulele in accordatura standard GCEA (soprano/concert/tenor).
//
// `tasti` è SEMPRE nell'ordine delle corde G C E A (come le vedi guardando il manico,
// da quella più vicina al viso a quella più vicina al pavimento).
//   -1 = corda smorzata, 0 = corda a vuoto, n = tasto n
// `dita` usa la numerazione classica: 1 indice, 2 medio, 3 anulare, 4 mignolo, 0 nessuno.
// `barre` = una sola dita che preme più corde: {tasto, da, a} con indici di corda 0..3.
//
// Ogni diteggiatura qui dentro è verificata contro le note dell'accordo: il diagramma
// di un accordo sbagliato si impara in silenzio e non si disimpara più.

import { classiAttese, nomeClasse, scomponi } from './theory.js';

export const CORDE = ['G', 'C', 'E', 'A'];

/** Semitoni delle corde a vuoto rispetto a Do, per la verifica delle note. */
export const CORDE_SEMITONI = [7, 0, 4, 9];

const A = (nome, esteso, tasti, dita, extra = {}) =>
  ({ id: nome, nome, esteso, tasti, dita, ...extra });

export const ACCORDI = [
  // ── Maggiori ────────────────────────────────────────────────────────────────
  A('C', 'Do maggiore', [0, 0, 0, 3], [0, 0, 0, 3], { difficolta: 1, famiglia: 'maggiore', suggerimento: 'Solo l\'anulare sul 3° tasto della corda A. È il primo accordo di tutti.' }),
  A('F', 'Fa maggiore', [2, 0, 1, 0], [2, 0, 1, 0], { difficolta: 1, famiglia: 'maggiore', suggerimento: 'Indice sul 1° tasto della E, medio sul 2° della G. Le due corde di mezzo restano libere.' }),
  A('G', 'Sol maggiore', [0, 2, 3, 2], [0, 1, 3, 2], { difficolta: 2, famiglia: 'maggiore', suggerimento: 'Un triangolo: indice C-2, medio A-2, anulare E-3. Tieni il polso basso.' }),
  A('A', 'La maggiore', [2, 1, 0, 0], [2, 1, 0, 0], { difficolta: 1, famiglia: 'maggiore', suggerimento: 'Indice C-1, medio G-2: stessa forma di Fa spostata di una corda.' }),
  A('D', 'Re maggiore', [2, 2, 2, 0], [1, 2, 3, 0], { difficolta: 3, famiglia: 'maggiore', suggerimento: 'Tre dita in fila sul 2° tasto. Se non ci stanno, prova indice+medio+anulare in diagonale o barra con l\'indice.' }),
  A('E', 'Mi maggiore', [4, 4, 4, 2], [0, 0, 0, 1], { difficolta: 4, famiglia: 'maggiore', barre: { tasto: 4, da: 0, a: 2 }, suggerimento: 'Barra le prime tre corde al 4° tasto con l\'anulare e metti l\'indice su A-2.' }),
  A('E-facile', 'Mi maggiore (versione facile)', [1, 4, 0, 2], [1, 4, 0, 2], { difficolta: 3, famiglia: 'maggiore', alias: 'E', suggerimento: 'Meno pieno ma molto più raggiungibile: indice G-1, mignolo C-4, medio A-2.' }),
  A('Bb', 'Sib maggiore', [3, 2, 1, 1], [3, 2, 1, 1], { difficolta: 4, famiglia: 'maggiore', barre: { tasto: 1, da: 2, a: 3 }, suggerimento: 'Il primo mezzo-barré: indice steso su E e A al 1° tasto, medio C-2, anulare G-3.' }),
  A('B', 'Si maggiore', [4, 3, 2, 2], [4, 3, 1, 1], { difficolta: 5, famiglia: 'maggiore', barre: { tasto: 2, da: 2, a: 3 }, suggerimento: 'Stessa forma di Sib, un tasto più su.' }),
  A('Eb', 'Mib maggiore', [3, 3, 3, 1], [2, 3, 4, 1], { difficolta: 4, famiglia: 'maggiore' }),
  A('Ab', 'Lab maggiore', [5, 3, 4, 3], [4, 1, 3, 2], { difficolta: 5, famiglia: 'maggiore' }),
  A('Db', 'Reb maggiore', [1, 1, 1, 4], [1, 1, 1, 4], { difficolta: 4, famiglia: 'maggiore', barre: { tasto: 1, da: 0, a: 2 } }),
  A('F#', 'Fa# maggiore', [3, 1, 2, 1], [3, 1, 2, 1], { difficolta: 4, famiglia: 'maggiore', barre: { tasto: 1, da: 1, a: 3 } }),

  // ── Minori ──────────────────────────────────────────────────────────────────
  A('Am', 'La minore', [2, 0, 0, 0], [2, 0, 0, 0], { difficolta: 1, famiglia: 'minore', suggerimento: 'Un dito solo, il medio sulla G al 2° tasto. Il compagno naturale di Do.' }),
  A('Dm', 'Re minore', [2, 2, 1, 0], [3, 2, 1, 0], { difficolta: 2, famiglia: 'minore', suggerimento: 'Indice E-1, medio C-2, anulare G-2: un piccolo grappolo in alto a sinistra.' }),
  A('Em', 'Mi minore', [0, 4, 3, 2], [0, 4, 3, 2], { difficolta: 3, famiglia: 'minore', suggerimento: 'Una scaletta in diagonale: A-2, E-3, C-4.' }),
  A('Gm', 'Sol minore', [0, 2, 3, 1], [0, 2, 3, 1], { difficolta: 3, famiglia: 'minore' }),
  A('Cm', 'Do minore', [0, 3, 3, 3], [0, 1, 1, 1], { difficolta: 3, famiglia: 'minore', barre: { tasto: 3, da: 1, a: 3 } }),
  A('Fm', 'Fa minore', [1, 0, 1, 3], [1, 0, 2, 4], { difficolta: 3, famiglia: 'minore' }),
  A('Bm', 'Si minore', [4, 2, 2, 2], [4, 1, 1, 1], { difficolta: 4, famiglia: 'minore', barre: { tasto: 2, da: 1, a: 3 } }),
  A('Bbm', 'Sib minore', [3, 1, 1, 1], [3, 1, 1, 1], { difficolta: 4, famiglia: 'minore', barre: { tasto: 1, da: 1, a: 3 } }),
  A('C#m', 'Do# minore', [1, 1, 0, 4], [1, 1, 0, 4], { difficolta: 4, famiglia: 'minore' }),
  A('Ebm', 'Mib minore', [3, 3, 2, 1], [4, 3, 2, 1], { difficolta: 4, famiglia: 'minore' }),
  A('F#m', 'Fa# minore', [2, 1, 2, 4], [2, 1, 3, 4], { difficolta: 4, famiglia: 'minore' }),
  A('G#m', 'Sol# minore', [1, 3, 4, 2], [1, 3, 4, 2], { difficolta: 5, famiglia: 'minore' }),

  // ── Settime di dominante ────────────────────────────────────────────────────
  A('C7', 'Do settima', [0, 0, 0, 1], [0, 0, 0, 1], { difficolta: 1, famiglia: 'settima', suggerimento: 'Come Do ma un dito solo al 1° tasto: chiede di andare verso Fa.' }),
  A('G7', 'Sol settima', [0, 2, 1, 2], [0, 2, 1, 3], { difficolta: 2, famiglia: 'settima', suggerimento: 'Il triangolo di Sol capovolto. Tira verso Do.' }),
  A('D7', 'Re settima', [2, 2, 2, 3], [1, 1, 1, 3], { difficolta: 4, famiglia: 'settima', barre: { tasto: 2, da: 0, a: 2 } }),
  A('D7-facile', 'Re settima (versione facile)', [2, 0, 2, 0], [1, 0, 2, 0], {
    difficolta: 2,
    famiglia: 'settima',
    omette: [0],
    suggerimento: 'Due dita e via: indice G-2, medio E-2. Il Re non c\'è: restano terza, quinta e settima, e l\'orecchio mette la fondamentale da sé. È una scelta normale, non una scorciatoia — ma se il basso non c\'è nel gruppo, usa la versione a barré.',
  }),
  A('A7', 'La settima', [0, 1, 0, 0], [0, 1, 0, 0], { difficolta: 1, famiglia: 'settima', suggerimento: 'Un dito, indice su C-1. Porta a Re o a Re minore.' }),
  A('E7', 'Mi settima', [1, 2, 0, 2], [1, 2, 0, 3], { difficolta: 3, famiglia: 'settima', suggerimento: 'La porta d\'ingresso di La minore.' }),
  A('F7', 'Fa settima', [2, 3, 1, 3], [2, 3, 1, 4], { difficolta: 4, famiglia: 'settima' }),
  A('B7', 'Si settima', [2, 3, 2, 2], [1, 3, 1, 1], { difficolta: 4, famiglia: 'settima', barre: { tasto: 2, da: 0, a: 3 }, suggerimento: 'Indice steso al 2° tasto su tutte, anulare sopra sulla C al 3°.' }),
  A('Bb7', 'Sib settima', [1, 2, 1, 1], [1, 2, 1, 1], { difficolta: 4, famiglia: 'settima', barre: { tasto: 1, da: 0, a: 3 } }),
  A('Eb7', 'Mib settima', [3, 3, 3, 4], [1, 1, 1, 4], { difficolta: 4, famiglia: 'settima', barre: { tasto: 3, da: 0, a: 2 } }),
  A('Ab7', 'Lab settima', [1, 3, 2, 3], [1, 3, 2, 4], { difficolta: 5, famiglia: 'settima' }),
  A('Db7', 'Reb settima', [1, 1, 1, 2], [1, 1, 1, 2], { difficolta: 4, famiglia: 'settima', barre: { tasto: 1, da: 0, a: 2 } }),
  A('F#7', 'Fa# settima', [3, 4, 2, 4], [2, 3, 1, 4], { difficolta: 5, famiglia: 'settima' }),

  // ── Minori settima ──────────────────────────────────────────────────────────
  A('Am7', 'La minore settima', [0, 0, 0, 0], [0, 0, 0, 0], { difficolta: 1, famiglia: 'minore settima', suggerimento: 'Nessun dito: le quattro corde a vuoto sono già un accordo.' }),
  A('Dm7', 'Re minore settima', [2, 2, 1, 3], [2, 3, 1, 4], { difficolta: 3, famiglia: 'minore settima' }),
  A('Em7', 'Mi minore settima', [0, 2, 0, 2], [0, 1, 0, 2], { difficolta: 2, famiglia: 'minore settima' }),
  A('Gm7', 'Sol minore settima', [0, 2, 1, 1], [0, 3, 1, 2], { difficolta: 3, famiglia: 'minore settima' }),
  A('Cm7', 'Do minore settima', [3, 3, 3, 3], [1, 1, 1, 1], { difficolta: 3, famiglia: 'minore settima', barre: { tasto: 3, da: 0, a: 3 }, suggerimento: 'Barré pieno al 3° tasto: un solo dito steso su tutte e quattro.' }),
  A('Bm7', 'Si minore settima', [2, 2, 2, 2], [1, 1, 1, 1], { difficolta: 3, famiglia: 'minore settima', barre: { tasto: 2, da: 0, a: 3 } }),
  A('Fm7', 'Fa minore settima', [1, 3, 1, 3], [1, 3, 2, 4], { difficolta: 4, famiglia: 'minore settima' }),
  A('Bbm7', 'Sib minore settima', [1, 1, 1, 1], [1, 1, 1, 1], { difficolta: 3, famiglia: 'minore settima', barre: { tasto: 1, da: 0, a: 3 } }),
  A('F#m7', 'Fa# minore settima', [2, 4, 2, 4], [1, 3, 2, 4], { difficolta: 5, famiglia: 'minore settima' }),

  // ── Maggiori settima ────────────────────────────────────────────────────────
  A('Cmaj7', 'Do maggiore settima', [0, 0, 0, 2], [0, 0, 0, 2], { difficolta: 1, famiglia: 'maggiore settima' }),
  A('Fmaj7', 'Fa maggiore settima', [2, 4, 1, 3], [2, 4, 1, 3], { difficolta: 4, famiglia: 'maggiore settima' }),
  A('Gmaj7', 'Sol maggiore settima', [0, 2, 2, 2], [0, 1, 1, 1], { difficolta: 2, famiglia: 'maggiore settima', barre: { tasto: 2, da: 1, a: 3 } }),
  A('Amaj7', 'La maggiore settima', [1, 1, 0, 0], [2, 1, 0, 0], { difficolta: 2, famiglia: 'maggiore settima' }),
  A('Dmaj7', 'Re maggiore settima', [2, 2, 2, 4], [1, 1, 1, 4], { difficolta: 4, famiglia: 'maggiore settima', barre: { tasto: 2, da: 0, a: 2 } }),
  A('Emaj7', 'Mi maggiore settima', [1, 3, 0, 2], [1, 3, 0, 2], { difficolta: 3, famiglia: 'maggiore settima' }),
  A('Bbmaj7', 'Sib maggiore settima', [3, 2, 1, 0], [3, 2, 1, 0], { difficolta: 3, famiglia: 'maggiore settima' }),

  // ── Sospese e seste (il colore) ─────────────────────────────────────────────
  A('Csus4', 'Do sospeso quarta', [0, 0, 1, 3], [0, 0, 1, 3], { difficolta: 2, famiglia: 'sospesa' }),
  A('Csus2', 'Do sospeso seconda', [0, 2, 3, 3], [0, 1, 2, 3], { difficolta: 3, famiglia: 'sospesa' }),
  A('Dsus4', 'Re sospeso quarta', [0, 2, 3, 0], [0, 1, 2, 0], { difficolta: 2, famiglia: 'sospesa' }),
  A('Dsus2', 'Re sospeso seconda', [2, 2, 0, 0], [1, 2, 0, 0], { difficolta: 2, famiglia: 'sospesa' }),
  A('Asus4', 'La sospeso quarta', [2, 2, 0, 0], [1, 2, 0, 0], { difficolta: 2, famiglia: 'sospesa', alias: 'Dsus2' }),
  A('Esus4', 'Mi sospeso quarta', [4, 4, 5, 2], [2, 3, 4, 1], { difficolta: 5, famiglia: 'sospesa' }),
  A('C6', 'Do sesta', [0, 0, 0, 0], [0, 0, 0, 0], { difficolta: 1, famiglia: 'sesta', alias: 'Am7' }),
  A('G6', 'Sol sesta', [0, 2, 0, 2], [0, 1, 0, 2], { difficolta: 2, famiglia: 'sesta', alias: 'Em7' }),
  A('A6', 'La sesta', [2, 4, 2, 4], [1, 3, 2, 4], { difficolta: 4, famiglia: 'sesta' }),
  A('Gsus4', 'Sol sospeso quarta', [0, 2, 3, 3], [0, 1, 2, 3], { difficolta: 3, famiglia: 'sospesa', alias: 'Csus2' }),
  A('Fsus2', 'Fa sospeso seconda', [0, 0, 1, 3], [0, 0, 1, 3], { difficolta: 2, famiglia: 'sospesa', alias: 'Csus4' }),

  // ── Minori seste ────────────────────────────────────────────────────────────
  A('Am6', 'La minore sesta', [2, 4, 2, 3], [2, 4, 1, 3], { difficolta: 4, famiglia: 'minore sesta' }),
  A('Dm6', 'Re minore sesta', [2, 2, 1, 2], [3, 2, 1, 4], { difficolta: 3, famiglia: 'minore sesta' }),
  A('Em6', 'Mi minore sesta', [0, 1, 0, 2], [0, 1, 0, 2], { difficolta: 2, famiglia: 'minore sesta' }),

  // ── Settime sospese: la settima che non decide se è allegra o triste ────────
  A('C7sus4', 'Do settima sospesa', [0, 0, 1, 1], [0, 0, 1, 2], { difficolta: 2, famiglia: 'settima sospesa' }),
  A('G7sus4', 'Sol settima sospesa', [0, 2, 1, 3], [0, 2, 1, 3], { difficolta: 3, famiglia: 'settima sospesa' }),
  A('D7sus4', 'Re settima sospesa', [2, 2, 3, 3], [1, 2, 3, 4], { difficolta: 4, famiglia: 'settima sospesa' }),

  // ── Nona aggiunta: il colore moderno a costo quasi zero ─────────────────────
  A('Cadd9', 'Do con nona aggiunta', [0, 2, 0, 3], [0, 1, 0, 3], { difficolta: 2, famiglia: 'nona aggiunta' }),
  A('Fadd9', 'Fa con nona aggiunta', [0, 0, 1, 0], [0, 0, 1, 0], { difficolta: 1, famiglia: 'nona aggiunta', suggerimento: 'Un dito solo, e suona molto più "grande" del Fa normale. Provalo al suo posto in un giro lento.' }),
  A('Gadd9', 'Sol con nona aggiunta', [2, 2, 3, 2], [1, 2, 4, 3], { difficolta: 4, famiglia: 'nona aggiunta' }),
  A('C9', 'Do nona', [0, 2, 0, 1], [0, 2, 0, 1], { difficolta: 2, famiglia: 'nona', suggerimento: 'Senza la fondamentale: sull\'ukulele si omette e l\'orecchio la mette da sé.' }),

  // ── Diminuite ed eccedenti: passaggi, non destinazioni ──────────────────────
  A('Cdim7', 'Do settima diminuita', [2, 3, 2, 3], [1, 3, 2, 4], { difficolta: 3, famiglia: 'diminuita', suggerimento: 'La stessa forma vale anche per Mib, Fa♯ e La diminuiti: la settima diminuita si ripete ogni tre tasti.' }),
  A('C#dim7', 'Do# settima diminuita', [0, 1, 0, 1], [0, 1, 0, 2], { difficolta: 2, famiglia: 'diminuita', suggerimento: 'Vale anche per Mi, Sol e Sib diminuiti.' }),
  A('Ddim7', 'Re settima diminuita', [1, 2, 1, 2], [1, 3, 2, 4], { difficolta: 3, famiglia: 'diminuita', suggerimento: 'Vale anche per Fa, Lab e Si diminuiti.' }),
  A('Caug', 'Do eccedente', [1, 0, 0, 3], [1, 0, 0, 3], { difficolta: 2, famiglia: 'eccedente', suggerimento: 'La stessa forma è anche Mi e Sol♯ eccedenti: l\'eccedente si ripete ogni quattro tasti.' }),
  A('Faug', 'Fa eccedente', [2, 1, 1, 0], [3, 1, 2, 0], { difficolta: 3, famiglia: 'eccedente' }),
  A('Daug', 'Re eccedente', [3, 2, 2, 1], [4, 2, 3, 1], { difficolta: 4, famiglia: 'eccedente' }),
  A('Ebaug', 'Mib eccedente', [0, 3, 3, 2], [0, 2, 3, 1], { difficolta: 3, famiglia: 'eccedente' }),

  // ── Posizioni alte: stesso accordo, altro colore ────────────────────────────
  A('C-alto', 'Do maggiore (5ª posizione)', [5, 4, 3, 3], [4, 3, 1, 2], { difficolta: 4, famiglia: 'maggiore', alias: 'C', posizione: 'alta', suggerimento: 'Stesse note del Do facile ma più squillanti: utile per far respirare un giro che si ripete.' }),
  A('F-alto', 'Fa maggiore (5ª posizione)', [5, 5, 5, 3], [3, 3, 3, 1], { difficolta: 5, famiglia: 'maggiore', alias: 'F', posizione: 'alta', barre: { tasto: 5, da: 0, a: 2 } }),
  A('G-alto', 'Sol maggiore (forma di Fa col barré)', [4, 2, 3, 2], [3, 1, 2, 1], {
    difficolta: 5,
    famiglia: 'maggiore',
    posizione: 'mobile',
    barre: { tasto: 2, da: 0, a: 3 },
    suggerimento: 'È il Fa con il capotasto finto: indice steso al 2° tasto su tutte e quattro, e sopra la forma del Fa. Spostando questa forma di un tasto ottieni Sol♯, di due La, e così via — è il primo accordo davvero MOBILE che impari.',
  }),
];

/**
 * Verifica che una diteggiatura suoni davvero l'accordo che dichiara.
 *
 * È la rete che impedisce di pubblicare un diagramma sbagliato: un accordo errato si
 * impara in silenzio, si ripete per mesi e non si disimpara più.
 *
 * @returns {{ok:boolean, mancanti:string[], estranee:string[], motivo:string}}
 */
export function verificaDiteggiatura(acc) {
  const nome = nomeCanonico(acc);
  const atteso = classiAttese(nome);
  if (!atteso) return { ok: false, mancanti: [], estranee: [], motivo: `nome non interpretabile: ${nome}` };

  const suonate = new Set(acc.tasti
    .map((t, i) => (t < 0 ? null : (CORDE_SEMITONI[i] + t) % 12))
    .filter((v) => v !== null));

  // `omette` è la sola scusa ammessa per una nota assente, e va scritta nell'accordo:
  // così una voicing senza fondamentale resta una scelta dichiarata invece di un errore
  // che passa perché nessuno controlla.
  const scusate = new Set((acc.omette || []).map((i) => (atteso.scomposto.fondamentale + i) % 12));
  const mancanti = atteso.obbligatorie
    .filter((pc) => !suonate.has(pc) && !scusate.has(pc))
    .map((pc) => nomeClasse(pc));
  const estranee = [...suonate].filter((pc) => !atteso.ammesse.includes(pc)).map((pc) => nomeClasse(pc));
  const ok = mancanti.length === 0 && estranee.length === 0;
  return {
    ok,
    mancanti,
    estranee,
    motivo: ok ? 'coerente' : [
      mancanti.length ? `mancano ${mancanti.join(', ')}` : '',
      estranee.length ? `suonano note estranee ${estranee.join(', ')}` : '',
    ].filter(Boolean).join(' e '),
  };
}

/**
 * Il nome vero dell'accordo, senza il suffisso della variante: E-facile → E, C-alto → C.
 * NON usa `alias`, che significa un'altra cosa: "suona le stesse note di", come C6 e Am7,
 * che sono due nomi legittimi e diversi dello stesso suono.
 */
export function nomeCanonico(acc) {
  return String(acc.id).replace(/-(facile|alto)$/, '');
}

/** Come si scrive l'accordo sullo schermo: la variante non va mostrata come nome. */
export function etichettaAccordo(acc) {
  return acc.etichetta || nomeCanonico(acc);
}

/** La qualità leggibile ricavata dal nome, non copiata a mano. */
export function qualitaDi(acc) {
  const s = scomponi(nomeCanonico(acc));
  return s ? s.nome : '';
}

export const PER_ID = new Map(ACCORDI.map((a) => [a.id, a]));

/** Accordo per id, con fallback sul nome senza suffisso "-facile". */
export function accordo(id) {
  return PER_ID.get(id) || PER_ID.get(String(id).replace(/-facile$/, '')) || null;
}

/**
 * Le note che suonano davvero, in ordine di corda.
 *
 * La scrittura segue il nome dell'accordo: in Sib le note si chiamano Sib Re Fa, non
 * La♯ Re Fa. Non è pignoleria — chi legge uno spartito cerca quelle lettere lì.
 */
export function noteSuonate(acc) {
  const bemolli = /b/.test(nomeCanonico(acc)) || /^(dim|dim7)$/.test(scomponi(nomeCanonico(acc))?.qualita || '');
  return acc.tasti.map((t, i) => (t < 0 ? null : nomeClasse((CORDE_SEMITONI[i] + t) % 12, bemolli)));
}

/**
 * Quante dita servono davvero. Per chi impara è l'informazione utile: "due dita" dice
 * più di "difficoltà 2 su 5", che è un'opinione travestita da numero.
 */
export function ditaRichieste(acc) {
  const usate = new Set();
  let barrate = 0;
  acc.tasti.forEach((t, i) => {
    if (t <= 0) return;
    const dentroBarre = acc.barre && i >= acc.barre.da && i <= acc.barre.a && t === acc.barre.tasto;
    if (dentroBarre) { barrate = 1; return; }
    usate.add(acc.dita?.[i] || `c${i}`);
  });
  return { dita: usate.size + barrate, barre: !!acc.barre };
}

/** Etichetta breve: "1 dito", "3 dita", "barré". */
export function etichettaDita(acc) {
  const { dita, barre } = ditaRichieste(acc);
  if (dita === 0) return 'a vuoto';
  if (barre) return `barré · ${dita} ${dita === 1 ? 'dito' : 'dita'}`;
  return `${dita} ${dita === 1 ? 'dito' : 'dita'}`;
}

/** Tasto più alto usato: decide la finestra del diagramma. */
export function tastoMassimo(acc) {
  return Math.max(0, ...acc.tasti.filter((t) => t > 0));
}
