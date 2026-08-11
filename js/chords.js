// Libreria accordi per chitarra in accordatura standard EADGBE.
//
// `tasti` è SEMPRE nell'ordine delle corde dalla 6ª alla 1ª — E A D G B E — cioè da
// sinistra a destra come nei diagrammi di tutti i libri, guardando la chitarra di fronte.
//   -1 = corda smorzata (la ✕ sopra il capotasto), 0 = corda a vuoto, n = tasto n
// `dita`: 1 indice, 2 medio, 3 anulare, 4 mignolo, 0 nessuno.
// `barre` = un dito solo che preme più corde: {tasto, da, a} con indici di corda 0..5.
//
// Sulla chitarra le corde smorzate sono NORMALI, non un'eccezione: il Do e il La non
// suonano il Mi basso, e suonarlo li fa diventare un'altra cosa. Sull'ukulele la ✕ era
// una rarità; qui è metà libreria.
//
// Ogni diteggiatura è verificata contro le note dell'accordo dal collaudo: il diagramma
// di un accordo sbagliato si impara in silenzio e non si disimpara più.

import { classiAttese, nomeClasse, nomeItaliano, scomponi } from './theory.js';

export const CORDE = ['E', 'A', 'D', 'G', 'B', 'E'];

/** Come si chiamano per numero: la 6ª è il Mi basso, la 1ª è il cantino. */
export const NUMERI_CORDA = ['6ª', '5ª', '4ª', '3ª', '2ª', '1ª'];

/**
 * Quanto è grossa ogni corda, in pixel da disegnare.
 *
 * Le proporzioni sono quelle vere di una muta leggera: .053 .042 .032 .024 .016 .012
 * di pollice, cioè la 6ª è quattro volte e mezzo la 1ª. Serve a rispondere senza parole
 * alla domanda che il numero da solo non risolve — *quale* corda pizzico — perché sulla
 * chitarra la risposta si vede a occhio: la più grossa è la 6ª e sta in alto.
 */
export const SPESSORE_CORDA = [5, 4, 3.2, 2.4, 1.7, 1.2];

/**
 * Dov'è fisicamente ogni corda, detto a parole.
 *
 * "6ª" è un numero, e a chi comincia non dice niente: bisogna sapere che si contano
 * dal basso verso l'alto, cioè al contrario di come si leggono i diagrammi. Questa
 * riga toglie di mezzo il problema invece di darlo per scontato.
 */
export const DOVE_CORDA = [
  'la più grossa, quella più in alto quando tieni la chitarra',
  'la seconda dall\'alto',
  'la terza dall\'alto',
  'la terza dal basso',
  'la seconda dal basso',
  'la più sottile, quella più in basso',
];

/** Semitoni delle corde a vuoto rispetto a Do, per la verifica delle note. */
export const CORDE_SEMITONI = [4, 9, 2, 7, 11, 4];

/**
 * Le altezze vere delle corde a vuoto, in numeri MIDI (Mi2 82,41 Hz = 40).
 *
 * Servono per una domanda che le sole classi di altezza non sanno rispondere: qual è la
 * nota più GRAVE di una presa. Di solito è quella della corda più grave che suona, e per
 * tutta la libreria scritta a mano è così — ma non sempre: in una presa alta la 5ª corda
 * a vuoto (La2) suona sotto la 6ª premuta al 10° tasto (Re3). Il basso di un accordo è
 * la nota più bassa che si sente, non quella che sta più a sinistra nel diagramma.
 */
export const CORDE_MIDI = [40, 45, 50, 55, 59, 64];

/** La classe di altezza della nota più grave che una presa produce davvero. */
export function classeDelBasso(tasti) {
  let minimo = Infinity;
  let classe = null;
  tasti.forEach((t, i) => {
    if (t < 0) return;
    const altezza = CORDE_MIDI[i] + t;
    if (altezza < minimo) { minimo = altezza; classe = (CORDE_SEMITONI[i] + t) % 12; }
  });
  return classe;
}

const A = (nome, esteso, tasti, dita, extra = {}) =>
  ({ id: nome, nome, esteso, tasti, dita, ...extra });

export const ACCORDI = [
  // ── Maggiori aperti ─────────────────────────────────────────────────────────
  A('E', 'Mi maggiore', [0, 2, 2, 1, 0, 0], [0, 2, 3, 1, 0, 0], { difficolta: 2, famiglia: 'maggiore', suggerimento: 'Tre dita, tutte e sei le corde suonano: è l\'accordo più pieno che esista sulla chitarra. Medio e anulare al 2° tasto su 5ª e 4ª, indice al 1° sulla 3ª.' }),
  A('A', 'La maggiore', [-1, 0, 2, 2, 2, 0], [0, 0, 1, 2, 3, 0], { difficolta: 2, famiglia: 'maggiore', suggerimento: 'Tre dita in fila al 2° tasto, dentro un solo spazio. Il Mi basso NON si suona: parti dalla 5ª.' }),
  A('D', 'Re maggiore', [-1, -1, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2], { difficolta: 2, famiglia: 'maggiore', suggerimento: 'Un triangolino sulle tre corde acute. Le due corde gravi restano zitte: se le suoni non è più un Re.' }),
  A('G', 'Sol maggiore', [3, 2, 0, 0, 0, 3], [2, 1, 0, 0, 0, 3], { difficolta: 3, famiglia: 'maggiore', suggerimento: 'La mano si apre: medio sulla 6ª al 3°, indice sulla 5ª al 2°, anulare sulla 1ª al 3°. Tutte e sei suonano.' }),
  A('C', 'Do maggiore', [-1, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0], { difficolta: 3, famiglia: 'maggiore', suggerimento: 'Una diagonale: anulare 5ª-3°, medio 4ª-2°, indice 2ª-1°. Il Mi basso resta fuori.' }),
  A('F', 'Fa maggiore', [1, 3, 3, 2, 1, 1], [1, 3, 4, 2, 1, 1], {
    difficolta: 5,
    famiglia: 'maggiore',
    barre: { tasto: 1, da: 0, a: 5 },
    suggerimento: 'Il barré completo: l\'indice steso schiaccia tutte e sei le corde al 1° tasto, e sopra ci vai con la forma del Mi. È il muro contro cui sbatte chiunque, ed è normale che per settimane ronzi. Ruota l\'indice appena sul fianco esterno e tieni il pollice basso, dietro il manico.',
  }),
  A('F-facile', 'Fa maggiore (versione a quattro corde)', [-1, -1, 3, 2, 1, 1], [0, 0, 3, 2, 1, 1], {
    difficolta: 3,
    famiglia: 'maggiore',
    alias: 'F',
    barre: { tasto: 1, da: 4, a: 5 },
    suggerimento: 'Mezzo barré sulle due corde acute e via: suona un Fa vero, senza il basso. Serve per non fermare la canzone mentre il barré grande matura.',
  }),
  A('Bb', 'Sib maggiore', [-1, 1, 3, 3, 3, 1], [0, 1, 2, 3, 4, 1], { difficolta: 5, famiglia: 'maggiore', barre: { tasto: 1, da: 1, a: 5 }, suggerimento: 'Il barré della forma di La: indice al 1° tasto dalla 5ª in giù, e tre dita al 3°.' }),
  A('B', 'Si maggiore', [-1, 2, 4, 4, 4, 2], [0, 1, 2, 3, 4, 1], { difficolta: 5, famiglia: 'maggiore', barre: { tasto: 2, da: 1, a: 5 }, suggerimento: 'Stessa forma del Sib spostata di due tasti. Più su vai, meno forza serve.' }),
  A('Eb', 'Mib maggiore', [-1, -1, 1, 3, 4, 3], [0, 0, 1, 2, 4, 3], { difficolta: 4, famiglia: 'maggiore' }),
  A('Ab', 'Lab maggiore', [4, 6, 6, 5, 4, 4], [1, 3, 4, 2, 1, 1], { difficolta: 5, famiglia: 'maggiore', barre: { tasto: 4, da: 0, a: 5 } }),
  A('Db', 'Reb maggiore', [-1, 4, 6, 6, 6, 4], [0, 1, 2, 3, 4, 1], { difficolta: 5, famiglia: 'maggiore', barre: { tasto: 4, da: 1, a: 5 } }),
  A('F#', 'Fa# maggiore', [2, 4, 4, 3, 2, 2], [1, 3, 4, 2, 1, 1], { difficolta: 5, famiglia: 'maggiore', barre: { tasto: 2, da: 0, a: 5 } }),

  // ── Minori ──────────────────────────────────────────────────────────────────
  A('Em', 'Mi minore', [0, 2, 2, 0, 0, 0], [0, 2, 3, 0, 0, 0], { difficolta: 1, famiglia: 'minore', suggerimento: 'Due dita e suonano tutte e sei le corde: è il primo accordo della chitarra, e il più bello da tenere premuto senza motivo.' }),
  A('Am', 'La minore', [-1, 0, 2, 2, 1, 0], [0, 0, 2, 3, 1, 0], { difficolta: 2, famiglia: 'minore', suggerimento: 'Come il Mi minore ma spostato di una corda, con l\'indice al 1° tasto della 2ª. Il Mi basso non si suona.' }),
  A('Dm', 'Re minore', [-1, -1, 0, 2, 3, 1], [0, 0, 0, 2, 3, 1], { difficolta: 2, famiglia: 'minore', suggerimento: 'Il Re con l\'indice che scende di un tasto sul cantino. Solo quattro corde.' }),
  A('Bm', 'Si minore', [-1, 2, 4, 4, 3, 2], [0, 1, 3, 4, 2, 1], { difficolta: 5, famiglia: 'minore', barre: { tasto: 2, da: 1, a: 5 }, suggerimento: 'Il secondo barré che incontri, ed è quello che serve in mezzo pop italiano.' }),
  A('Bm-facile', 'Si minore (versione a quattro corde)', [-1, -1, 4, 4, 3, 2], [0, 0, 3, 4, 2, 1], { difficolta: 3, famiglia: 'minore', alias: 'Bm', suggerimento: 'Le stesse note senza barré, suonando solo le quattro corde acute.' }),
  A('F#m', 'Fa# minore', [2, 4, 4, 2, 2, 2], [1, 3, 4, 1, 1, 1], { difficolta: 5, famiglia: 'minore', barre: { tasto: 2, da: 0, a: 5 }, suggerimento: 'Forma di Mi minore col barré: solo due dita in più dell\'indice. È il barré più facile di tutti — provalo prima del Fa.' }),
  A('Cm', 'Do minore', [-1, 3, 5, 5, 4, 3], [0, 1, 3, 4, 2, 1], { difficolta: 5, famiglia: 'minore', barre: { tasto: 3, da: 1, a: 5 } }),
  A('Gm', 'Sol minore', [3, 5, 5, 3, 3, 3], [1, 3, 4, 1, 1, 1], { difficolta: 4, famiglia: 'minore', barre: { tasto: 3, da: 0, a: 5 } }),
  A('Fm', 'Fa minore', [1, 3, 3, 1, 1, 1], [1, 3, 4, 1, 1, 1], { difficolta: 4, famiglia: 'minore', barre: { tasto: 1, da: 0, a: 5 } }),
  A('C#m', 'Do# minore', [-1, 4, 6, 6, 5, 4], [0, 1, 3, 4, 2, 1], { difficolta: 5, famiglia: 'minore', barre: { tasto: 4, da: 1, a: 5 } }),
  A('Ebm', 'Mib minore', [-1, -1, 1, 3, 4, 2], [0, 0, 1, 3, 4, 2], { difficolta: 4, famiglia: 'minore' }),
  A('G#m', 'Sol# minore', [4, 6, 6, 4, 4, 4], [1, 3, 4, 1, 1, 1], { difficolta: 5, famiglia: 'minore', barre: { tasto: 4, da: 0, a: 5 } }),
  A('Bbm', 'Sib minore', [-1, 1, 3, 3, 2, 1], [0, 1, 3, 4, 2, 1], { difficolta: 5, famiglia: 'minore', barre: { tasto: 1, da: 1, a: 5 } }),

  // ── Settime di dominante ────────────────────────────────────────────────────
  A('E7', 'Mi settima', [0, 2, 0, 1, 0, 0], [0, 2, 0, 1, 0, 0], { difficolta: 1, famiglia: 'settima', suggerimento: 'Il Mi maggiore a cui togli un dito. Tira verso il La e verso il La minore: è il blues in due dita.' }),
  A('A7', 'La settima', [-1, 0, 2, 0, 2, 0], [0, 0, 2, 0, 3, 0], { difficolta: 2, famiglia: 'settima', suggerimento: 'Il La a cui togli il dito di mezzo. Porta al Re.' }),
  A('D7', 'Re settima', [-1, -1, 0, 2, 1, 2], [0, 0, 0, 2, 1, 3], { difficolta: 2, famiglia: 'settima', suggerimento: 'Un triangolo capovolto rispetto al Re. Porta al Sol.' }),
  A('G7', 'Sol settima', [3, 2, 0, 0, 0, 1], [3, 2, 0, 0, 0, 1], { difficolta: 3, famiglia: 'settima', suggerimento: 'Il Sol con il cantino che scende dal 3° al 1° tasto. Chiede il Do e non accetta un no.' }),
  A('C7', 'Do settima', [-1, 3, 2, 3, 1, 0], [0, 3, 2, 4, 1, 0], { difficolta: 3, famiglia: 'settima', suggerimento: 'Il Do più il mignolo sulla 3ª al 3° tasto. La quinta non c\'è e non manca a nessuno.' }),
  A('B7', 'Si settima', [-1, 2, 1, 2, 0, 2], [0, 2, 1, 3, 0, 4], { difficolta: 4, famiglia: 'settima', suggerimento: 'Quattro dita sparse ma nessun barré: è la porta d\'ingresso del Mi, e la usa mezzo blues.' }),
  A('F7', 'Fa settima', [1, 3, 1, 2, 1, 1], [1, 3, 1, 2, 1, 1], { difficolta: 5, famiglia: 'settima', barre: { tasto: 1, da: 0, a: 5 } }),
  A('Bb7', 'Sib settima', [-1, 1, 3, 1, 3, 1], [0, 1, 3, 1, 4, 1], { difficolta: 5, famiglia: 'settima', barre: { tasto: 1, da: 1, a: 5 } }),
  A('Eb7', 'Mib settima', [-1, -1, 1, 3, 2, 3], [0, 0, 1, 3, 2, 4], { difficolta: 4, famiglia: 'settima' }),
  A('Ab7', 'Lab settima', [4, 6, 4, 5, 4, 4], [1, 3, 1, 2, 1, 1], { difficolta: 5, famiglia: 'settima', barre: { tasto: 4, da: 0, a: 5 } }),
  A('Db7', 'Reb settima', [-1, 4, 6, 4, 6, 4], [0, 1, 3, 1, 4, 1], { difficolta: 5, famiglia: 'settima', barre: { tasto: 4, da: 1, a: 5 } }),
  A('F#7', 'Fa# settima', [2, 4, 2, 3, 2, 2], [1, 3, 1, 2, 1, 1], { difficolta: 5, famiglia: 'settima', barre: { tasto: 2, da: 0, a: 5 } }),

  // ── Minori settima ──────────────────────────────────────────────────────────
  A('Em7', 'Mi minore settima', [0, 2, 0, 0, 0, 0], [0, 2, 0, 0, 0, 0], { difficolta: 1, famiglia: 'minore settima', suggerimento: 'Un dito solo, e suonano tutte e sei le corde. Nessun accordo rende tanto con così poco.' }),
  A('Am7', 'La minore settima', [-1, 0, 2, 0, 1, 0], [0, 0, 2, 0, 1, 0], { difficolta: 1, famiglia: 'minore settima', suggerimento: 'Il La minore a cui togli il dito di mezzo: due dita.' }),
  A('Dm7', 'Re minore settima', [-1, -1, 0, 2, 1, 1], [0, 0, 0, 3, 1, 1], { difficolta: 3, famiglia: 'minore settima', barre: { tasto: 1, da: 4, a: 5 }, suggerimento: 'Mezzo barré con l\'indice sulle due corde acute: è l\'allenamento onesto per il Fa.' }),
  A('Bm7', 'Si minore settima', [-1, 2, 0, 2, 0, 2], [0, 2, 0, 3, 0, 4], { difficolta: 3, famiglia: 'minore settima', suggerimento: 'Il Si minore senza barré: tre dita a corde alterne, e le corde a vuoto in mezzo suonano.' }),
  A('Gm7', 'Sol minore settima', [3, 5, 3, 3, 3, 3], [1, 3, 1, 1, 1, 1], { difficolta: 4, famiglia: 'minore settima', barre: { tasto: 3, da: 0, a: 5 } }),
  A('Cm7', 'Do minore settima', [-1, 3, 5, 3, 4, 3], [0, 1, 4, 1, 3, 1], { difficolta: 5, famiglia: 'minore settima', barre: { tasto: 3, da: 1, a: 5 } }),
  A('Fm7', 'Fa minore settima', [1, 3, 1, 1, 1, 1], [1, 3, 1, 1, 1, 1], { difficolta: 4, famiglia: 'minore settima', barre: { tasto: 1, da: 0, a: 5 } }),
  A('F#m7', 'Fa# minore settima', [2, 4, 2, 2, 2, 2], [1, 3, 1, 1, 1, 1], { difficolta: 4, famiglia: 'minore settima', barre: { tasto: 2, da: 0, a: 5 } }),
  A('Bbm7', 'Sib minore settima', [-1, 1, 3, 1, 2, 1], [0, 1, 3, 1, 2, 1], { difficolta: 5, famiglia: 'minore settima', barre: { tasto: 1, da: 1, a: 5 } }),

  // ── Maggiori settima ────────────────────────────────────────────────────────
  A('Cmaj7', 'Do maggiore settima', [-1, 3, 2, 0, 0, 0], [0, 3, 2, 0, 0, 0], { difficolta: 2, famiglia: 'maggiore settima', suggerimento: 'Il Do a cui togli l\'indice. Suona come un pomeriggio.' }),
  A('Fmaj7', 'Fa maggiore settima', [-1, -1, 3, 2, 1, 0], [0, 0, 3, 2, 1, 0], { difficolta: 2, famiglia: 'maggiore settima', suggerimento: 'Il Fa senza barré e senza fatica: quattro corde, tre dita. Nei giri lenti sta al posto del Fa.' }),
  A('Gmaj7', 'Sol maggiore settima', [3, 2, 0, 0, 0, 2], [3, 2, 0, 0, 0, 1], { difficolta: 3, famiglia: 'maggiore settima' }),
  A('Amaj7', 'La maggiore settima', [-1, 0, 2, 1, 2, 0], [0, 0, 3, 1, 2, 0], { difficolta: 3, famiglia: 'maggiore settima' }),
  A('Dmaj7', 'Re maggiore settima', [-1, -1, 0, 2, 2, 2], [0, 0, 0, 1, 1, 1], { difficolta: 3, famiglia: 'maggiore settima', barre: { tasto: 2, da: 3, a: 5 }, suggerimento: 'Un mezzo barré a tre corde: il primo passo verso il barré vero.' }),
  A('Emaj7', 'Mi maggiore settima', [0, 2, 1, 1, 0, 0], [0, 3, 1, 2, 0, 0], { difficolta: 3, famiglia: 'maggiore settima' }),
  A('Bbmaj7', 'Sib maggiore settima', [-1, 1, 3, 2, 3, 1], [0, 1, 4, 2, 3, 1], { difficolta: 5, famiglia: 'maggiore settima', barre: { tasto: 1, da: 1, a: 5 } }),

  // ── Sospese ─────────────────────────────────────────────────────────────────
  A('Dsus4', 'Re sospeso quarta', [-1, -1, 0, 2, 3, 3], [0, 0, 0, 1, 2, 4], { difficolta: 2, famiglia: 'sospesa', suggerimento: 'Il Re col mignolo aggiunto sul cantino. Alzarlo e toglierlo sopra un Re è metà del folk.' }),
  A('Dsus2', 'Re sospeso seconda', [-1, -1, 0, 2, 3, 0], [0, 0, 0, 1, 2, 0], { difficolta: 2, famiglia: 'sospesa' }),
  A('Asus4', 'La sospeso quarta', [-1, 0, 2, 2, 3, 0], [0, 0, 1, 2, 3, 0], { difficolta: 2, famiglia: 'sospesa' }),
  A('Asus2', 'La sospeso seconda', [-1, 0, 2, 2, 0, 0], [0, 0, 1, 2, 0, 0], { difficolta: 2, famiglia: 'sospesa' }),
  A('Esus4', 'Mi sospeso quarta', [0, 2, 2, 2, 0, 0], [0, 1, 2, 3, 0, 0], { difficolta: 2, famiglia: 'sospesa' }),
  A('Csus2', 'Do sospeso seconda', [-1, 3, 0, 0, 1, 3], [0, 2, 0, 0, 1, 4], { difficolta: 3, famiglia: 'sospesa' }),
  A('Csus4', 'Do sospeso quarta', [-1, 3, 3, 0, 1, 1], [0, 3, 4, 0, 1, 1], { difficolta: 3, famiglia: 'sospesa', barre: { tasto: 1, da: 4, a: 5 } }),
  A('Gsus4', 'Sol sospeso quarta', [3, 3, 0, 0, 1, 3], [2, 3, 0, 0, 1, 4], { difficolta: 4, famiglia: 'sospesa' }),

  // ── Settime sospese ─────────────────────────────────────────────────────────
  A('A7sus4', 'La settima sospesa', [-1, 0, 2, 0, 3, 0], [0, 0, 2, 0, 3, 0], { difficolta: 2, famiglia: 'settima sospesa' }),
  A('D7sus4', 'Re settima sospesa', [-1, -1, 0, 2, 1, 3], [0, 0, 0, 2, 1, 4], { difficolta: 3, famiglia: 'settima sospesa' }),
  A('E7sus4', 'Mi settima sospesa', [0, 2, 0, 2, 0, 0], [0, 2, 0, 3, 0, 0], { difficolta: 2, famiglia: 'settima sospesa' }),
  A('G7sus4', 'Sol settima sospesa', [3, 3, 0, 0, 1, 1], [2, 3, 0, 0, 1, 1], { difficolta: 4, famiglia: 'settima sospesa', barre: { tasto: 1, da: 4, a: 5 } }),

  // ── Seste ───────────────────────────────────────────────────────────────────
  A('G6', 'Sol sesta', [3, 2, 0, 0, 0, 0], [3, 2, 0, 0, 0, 0], { difficolta: 2, famiglia: 'sesta', suggerimento: 'Il Sol a cui togli il dito dal cantino: due dita e un colore diverso.' }),
  A('C6', 'Do sesta', [-1, 3, 2, 2, 1, 0], [0, 4, 2, 3, 1, 0], { difficolta: 3, famiglia: 'sesta' }),
  A('A6', 'La sesta', [-1, 0, 2, 2, 2, 2], [0, 0, 1, 1, 1, 1], { difficolta: 3, famiglia: 'sesta', barre: { tasto: 2, da: 2, a: 5 } }),
  A('Em6', 'Mi minore sesta', [0, 2, 2, 0, 2, 0], [0, 2, 3, 0, 4, 0], { difficolta: 3, famiglia: 'minore sesta' }),
  A('Am6', 'La minore sesta', [-1, 0, 2, 2, 1, 2], [0, 0, 2, 3, 1, 4], { difficolta: 3, famiglia: 'minore sesta' }),
  A('Dm6', 'Re minore sesta', [-1, -1, 0, 2, 0, 1], [0, 0, 0, 2, 0, 1], { difficolta: 2, famiglia: 'minore sesta' }),

  // ── Nona aggiunta e none ────────────────────────────────────────────────────
  A('Cadd9', 'Do con nona aggiunta', [-1, 3, 2, 0, 3, 0], [0, 2, 1, 0, 3, 0], { difficolta: 3, famiglia: 'nona aggiunta', suggerimento: 'Il Do con il mignolo sulla 2ª al 3° tasto. Da qui al Sol e al Re si muovono solo due dita: è il trucco di mille canzoni.' }),
  A('Gadd9', 'Sol con nona aggiunta', [3, 2, 0, 2, 0, 3], [2, 1, 0, 3, 0, 4], { difficolta: 4, famiglia: 'nona aggiunta' }),
  A('Aadd9', 'La con nona aggiunta', [-1, 0, 2, 4, 2, 0], [0, 0, 1, 4, 2, 0], { difficolta: 3, famiglia: 'nona aggiunta' }),
  A('Fadd9', 'Fa con nona aggiunta', [-1, -1, 3, 2, 1, 3], [0, 0, 3, 2, 1, 4], { difficolta: 3, famiglia: 'nona aggiunta' }),
  A('C9', 'Do nona', [-1, 3, 2, 3, 3, 3], [0, 2, 1, 3, 3, 3], { difficolta: 4, famiglia: 'nona', barre: { tasto: 3, da: 3, a: 5 } }),
  A('E9', 'Mi nona', [0, 2, 0, 1, 0, 2], [0, 2, 0, 1, 0, 3], { difficolta: 3, famiglia: 'nona' }),
  A('A9', 'La nona', [-1, 0, 2, 4, 2, 3], [0, 0, 1, 3, 2, 4], { difficolta: 4, famiglia: 'nona' }),

  // ── Diminuite ed eccedenti: passaggi, non destinazioni ──────────────────────
  A('Cdim7', 'Do settima diminuita', [-1, -1, 1, 2, 1, 2], [0, 0, 1, 3, 2, 4], { difficolta: 3, famiglia: 'diminuita', suggerimento: 'La stessa forma vale anche per Mib, Fa♯ e La diminuiti: la settima diminuita si ripete ogni tre tasti.' }),
  A('C#dim7', 'Do# settima diminuita', [-1, -1, 2, 3, 2, 3], [0, 0, 1, 3, 2, 4], { difficolta: 3, famiglia: 'diminuita', suggerimento: 'Vale anche per Mi, Sol e Sib diminuiti.' }),
  A('Ddim7', 'Re settima diminuita', [-1, -1, 0, 1, 0, 1], [0, 0, 0, 2, 0, 3], { difficolta: 2, famiglia: 'diminuita', suggerimento: 'Vale anche per Fa, Lab e Si diminuiti.' }),
  A('Caug', 'Do eccedente', [-1, 3, 2, 1, 1, 0], [0, 3, 2, 1, 1, 0], { difficolta: 3, famiglia: 'eccedente', barre: { tasto: 1, da: 3, a: 4 }, suggerimento: 'La stessa forma è anche Mi e Sol♯ eccedenti: l\'eccedente si ripete ogni quattro tasti.' }),
  A('Faug', 'Fa eccedente', [-1, -1, 3, 2, 2, 1], [0, 0, 4, 2, 3, 1], { difficolta: 3, famiglia: 'eccedente' }),
  A('Daug', 'Re eccedente', [-1, -1, 0, 3, 3, 2], [0, 0, 0, 2, 3, 1], { difficolta: 3, famiglia: 'eccedente' }),

  // ── Quinte vuote: due dita, e sotto ci sta mezzo repertorio ─────────────────
  A('E5', 'Mi quinta', [0, 2, 2, -1, -1, -1], [0, 1, 2, 0, 0, 0], { difficolta: 1, famiglia: 'quinta', suggerimento: 'Né allegro né triste: manca la terza, che è la nota che decide. Solo le tre corde gravi — le altre vanno smorzate col palmo.' }),
  A('A5', 'La quinta', [-1, 0, 2, 2, -1, -1], [0, 0, 1, 2, 0, 0], { difficolta: 1, famiglia: 'quinta' }),
  A('D5', 'Re quinta', [-1, -1, 0, 2, 3, -1], [0, 0, 0, 1, 3, 0], { difficolta: 2, famiglia: 'quinta' }),
  A('G5', 'Sol quinta', [3, 5, 5, -1, -1, -1], [1, 3, 4, 0, 0, 0], { difficolta: 2, famiglia: 'quinta', suggerimento: 'Questa forma è MOBILE: spostala di un tasto e cambia nome senza cambiare dita. Al 5° tasto è La, al 7° Si.' }),

  // ── Posizioni alte: stesso accordo, altro colore ────────────────────────────
  A('G-barre', 'Sol maggiore (barré al 3°)', [3, 5, 5, 4, 3, 3], [1, 3, 4, 2, 1, 1], {
    difficolta: 5,
    famiglia: 'maggiore',
    alias: 'G',
    posizione: 'mobile',
    barre: { tasto: 3, da: 0, a: 5 },
    suggerimento: 'È il Fa spostato di due tasti: la forma del Mi con il capotasto finto. Impararne una vuol dire impararle tutte — al 5° tasto è La, al 7° Si.',
  }),
  A('A-barre', 'La maggiore (barré al 5°)', [5, 7, 7, 6, 5, 5], [1, 3, 4, 2, 1, 1], { difficolta: 5, famiglia: 'maggiore', alias: 'A', posizione: 'mobile', barre: { tasto: 5, da: 0, a: 5 } }),
  A('C-alto', 'Do maggiore (barré al 3°)', [-1, 3, 5, 5, 5, 3], [0, 1, 2, 3, 4, 1], { difficolta: 5, famiglia: 'maggiore', alias: 'C', posizione: 'mobile', barre: { tasto: 3, da: 1, a: 5 }, suggerimento: 'La forma del La col barré. Stesse note del Do aperto, un\'ottava di brillantezza in più.' }),
  A('D-alto', 'Re maggiore (barré al 5°)', [-1, 5, 7, 7, 7, 5], [0, 1, 2, 3, 4, 1], { difficolta: 5, famiglia: 'maggiore', alias: 'D', posizione: 'mobile', barre: { tasto: 5, da: 1, a: 5 } }),

  // ── Con il basso dichiarato: il basso che cammina ───────────────────────────
  //
  // Il nome dopo la barra dice quale nota va SOTTO. Non sono accordi nuovi da imparare:
  // sono quelli che sai già, con una corda diversa al basso — e quasi sempre costano un
  // dito in più o in meno. Servono per una cosa sola, e si sente subito: il basso che
  // scende di grado in grado mentre sopra gli accordi restano quelli. Sol, Re con il
  // Fa♯ sotto, Mi minore: il basso fa Sol · Fa♯ · Mi, e la canzone sembra andare
  // da qualche parte invece di saltare.
  A('D/F#', 'Re maggiore con Fa# al basso', [2, 0, 0, 2, 3, 2], [4, 0, 0, 1, 3, 2], {
    difficolta: 3,
    famiglia: 'basso dichiarato',
    suggerimento: 'Il Re di sempre più il mignolo (o il pollice, se ti sporge sopra il manico) sulla 6ª al 2° tasto. Fra Sol e Mi minore è il gradino che manca.',
  }),
  A('G/B', 'Sol maggiore con Si al basso', [-1, 2, 0, 0, 0, 3], [0, 1, 0, 0, 0, 3], {
    difficolta: 2,
    famiglia: 'basso dichiarato',
    suggerimento: 'Due dita. È il Sol che scende verso il La minore senza far scendere anche te.',
  }),
  A('C/G', 'Do maggiore con Sol al basso', [3, 3, 2, 0, 1, 0], [3, 4, 2, 0, 1, 0], { difficolta: 4, famiglia: 'basso dichiarato' }),
  A('C/E', 'Do maggiore con Mi al basso', [0, 3, 2, 0, 1, 0], [0, 3, 2, 0, 1, 0], {
    difficolta: 3,
    famiglia: 'basso dichiarato',
    suggerimento: 'Il Do senza smorzare la 6ª: stessa mano sinistra, una corda in più. È il più economico di tutti.',
  }),
  A('D/A', 'Re maggiore con La al basso', [-1, 0, 0, 2, 3, 2], [0, 0, 0, 1, 3, 2], { difficolta: 2, famiglia: 'basso dichiarato' }),
  A('Am/G', 'La minore con Sol al basso', [3, 0, 2, 2, 1, 0], [4, 0, 2, 3, 1, 0], { difficolta: 3, famiglia: 'basso dichiarato' }),
  A('Em/B', 'Mi minore con Si al basso', [-1, 2, 2, 0, 0, 0], [0, 1, 2, 0, 0, 0], { difficolta: 2, famiglia: 'basso dichiarato' }),
  A('F/C', 'Fa maggiore con Do al basso', [-1, 3, 3, 2, 1, 1], [0, 3, 4, 2, 1, 1], { difficolta: 4, famiglia: 'basso dichiarato', barre: { tasto: 1, da: 4, a: 5 } }),
  A('G/D', 'Sol maggiore con Re al basso', [-1, -1, 0, 0, 0, 3], [0, 0, 0, 0, 0, 3], { difficolta: 1, famiglia: 'basso dichiarato', suggerimento: 'Un dito solo.' }),
  A('A/C#', 'La maggiore con Do# al basso', [-1, 4, 2, 2, 2, 0], [0, 4, 1, 2, 3, 0], { difficolta: 3, famiglia: 'basso dichiarato' }),
];

/**
 * Le triadi diminuite, tutte e dodici, da UNA forma sola.
 *
 * Non sono scritte a mano una per una perché sono letteralmente la stessa presa spostata:
 * fondamentale sulla 5ª corda, e sopra il disegno n · n+1 · n+2 · n+1 sulle quattro corde
 * di mezzo. Scriverne dodici copie sarebbe stato dodici volte il rischio di sbagliarne una,
 * per zero informazione in più — e il collaudo le verifica comunque una per una, come
 * tutte le altre.
 *
 * Servono per un motivo preciso: sono il SETTIMO grado di ogni tonalità. Il costruttore di
 * giri mostra "i sette accordi della tonalità" e finora l'ultimo era spento in tutte e
 * dodici, perché in libreria c'erano solo le settime diminuite (Do dim7) e non le triadi
 * (Do dim), che sono un altro accordo. Un elenco che promette sette e ne dà sei.
 */
const DIMINUITE = Array.from({ length: 12 }, (_, n) => {
  const pc = (CORDE_SEMITONI[1] + n) % 12;      // fondamentale sulla 5ª corda al tasto n
  const nome = `${nomeClasse(pc)}dim`;
  const esteso = `${nomeItaliano(nomeClasse(pc))} diminuito`;
  const extra = {
    difficolta: 3,
    famiglia: 'diminuita',
    posizione: 'mobile',
    suggerimento: 'Una forma sola che vale per tutte e dodici: spostandola di un tasto cambia nome. Si usa di passaggio, quasi mai come destinazione.',
  };

  // La forma normale, fondamentale sulla 5ª corda.
  if (n + 2 <= 12) {
    return A(nome, esteso, [-1, n, n + 1, n + 2, n + 1, -1],
      // Con la fondamentale a vuoto l'indice è libero e la mano si chiude più naturale.
      n === 0 ? [0, 0, 1, 3, 2, 0] : [0, 1, 2, 4, 3, 0], extra);
  }

  // Sol♯ è l'unico che sulla 5ª corda finirebbe al 13° tasto, cioè fuori dal manico che
  // l'app disegna. Lo si prende con la fondamentale sulla 6ª: stesse tre note, un'altra
  // presa. Il caso non l'ho previsto scrivendolo — l'ha trovato il collaudo, che controlla
  // che nessun accordo chieda tasti che non esistono.
  const m = ((pc - CORDE_SEMITONI[0]) % 12 + 12) % 12;
  return A(nome, esteso, [m, m + 1, m + 2, m, -1, -1], [1, 2, 3, 1, 0, 0],
    { ...extra, barre: { tasto: m, da: 0, a: 3 } });
});

ACCORDI.push(...DIMINUITE);

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

  // Il basso dichiarato dev'essere davvero AL BASSO.
  //
  // Controllare che la nota ci sia non basta e non basterebbe mai: un Re maggiore
  // contiene già il Fa♯, quindi "D/F#" passerebbe con qualunque Re. Quello che lo rende
  // un altro accordo è che il Fa♯ stia sotto tutto il resto — è lì che si sente il basso
  // che scende. Quindi si guarda la corda più grave che suona, non l'insieme delle note.
  const b = atteso.scomposto.basso;
  const bassoVero = classeDelBasso(acc.tasti);
  const bassoSbagliato = b !== null && b !== undefined && bassoVero !== b;

  const ok = mancanti.length === 0 && estranee.length === 0 && !bassoSbagliato;
  return {
    ok,
    mancanti,
    estranee,
    bassoSbagliato,
    motivo: ok ? 'coerente' : [
      mancanti.length ? `mancano ${mancanti.join(', ')}` : '',
      estranee.length ? `suonano note estranee ${estranee.join(', ')}` : '',
      bassoSbagliato ? `il basso dovrebbe essere ${nomeClasse(b)} e invece è ${bassoVero === null ? 'niente' : nomeClasse(bassoVero)}` : '',
    ].filter(Boolean).join(' e '),
  };
}

/**
 * Il nome vero dell'accordo, senza il suffisso della variante: F-facile → F, C-alto → C.
 * NON usa `alias`, che significa un'altra cosa: "suona le stesse note di".
 */
export function nomeCanonico(acc) {
  return String(acc.id).replace(/-(facile|alto|barre)$/, '');
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

/**
 * Accordo per id, con due riserve: il suffisso "-facile" e la SCRITTURA ENARMONICA.
 *
 * La seconda ha morso davvero. Il costruttore di giri chiede i sette gradi della tonalità
 * e li scrive con i diesis, perché è quello che fa `accordiDellaTonalita`: in Fa maggiore
 * il quarto grado esce come "A#". In libreria quell'accordo però si chiama "Bb", che è il
 * nome giusto in quella tonalità. Risultato: nelle tonalità con i bemolli — Fa, Sib, Mib,
 * Lab, Reb — due o tre gradi risultavano SPENTI, e non c'era modo di metterli nel giro.
 *
 * Sib e La♯ sono la stessa altezza scritta in due modi, quindi cercare l'altra scrittura
 * non è indovinare: è leggere lo stesso accordo con l'altro alfabeto.
 */
export function accordo(id) {
  const diretto = PER_ID.get(id) || PER_ID.get(String(id).replace(/-facile$/, ''));
  if (diretto) return diretto;
  const s = scomponi(id);
  if (!s) return null;
  return PER_ID.get(nomeClasse(s.fondamentale, true) + s.qualita)
    || PER_ID.get(nomeClasse(s.fondamentale, false) + s.qualita)
    || null;
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

/**
 * Quante corde si smorzano, e quali.
 *
 * Sulla chitarra non è un dettaglio: suonare il Mi basso su un Do lo trasforma in
 * un Do con il basso sbagliato, e chi impara non se ne accorge da solo. La ✕ va detta,
 * non solo disegnata.
 */
export function cordeSmorzate(acc) {
  return acc.tasti.map((t, i) => (t < 0 ? NUMERI_CORDA[i] : null)).filter(Boolean);
}

/** Da quale corda parte la pennata: la prima che non è smorzata. */
export function primaCordaSuonata(acc) {
  const i = acc.tasti.findIndex((t) => t >= 0);
  return i < 0 ? 0 : i;
}

/** Le corde che il pollice può prendersi: la 6ª, la 5ª e la 4ª. Le altre sono di i, m, a. */
export const ULTIMA_CORDA_DEL_POLLICE = 2;

/**
 * Le due corde su cui cammina il pollice: `p` il basso, `P` il basso alternato.
 *
 * Il basso è la corda più grave che suona. L'alternato si cerca in questo ordine:
 *
 *   1. la QUINTA dell'accordo, fra le corde del basso (6ª, 5ª, 4ª). Fondamentale e
 *      quinta sono le due note che reggono l'accordo senza dirne il colore: il pollice
 *      può andare avanti e indietro senza mai contraddire quello che fanno le dita sopra.
 *   2. se lì la quinta non c'è, la prima corda del basso che suona. Sul Do la quinta
 *      (Sol) sta sulla 3ª, e la 3ª è dell'INDICE: mandarci il pollice significa mettere
 *      due dita sulla stessa corda nello stesso momento. Si ripiega sulla 4ª, che è poi
 *      esattamente l'alternanza 5ª–4ª che si legge in qualunque metodo.
 *   3. solo per gli accordi che di corde gravi ne hanno una sola — il Re, il Re minore —
 *      si esce dalla zona del pollice e si va sulla 3ª. Lì è giusto: la 5ª e la 6ª non
 *      suonano proprio, e l'alternanza 4ª–3ª è quella che fanno tutti.
 *
 * Il caso del Do non è teorico: è saltato fuori guardando la schermata dell'arpeggio,
 * dove il pollice e l'indice si ritrovavano tutti e due sulla 3ª corda.
 */
export function bassiDi(acc) {
  const p = primaCordaSuonata(acc);
  const s = scomponi(nomeCanonico(acc));
  const quinta = s ? (s.fondamentale + 7) % 12 : null;
  const suona = (i) => acc.tasti[i] >= 0;
  const eQuinta = (i) => quinta !== null && (CORDE_SEMITONI[i] + acc.tasti[i]) % 12 === quinta;

  const cerca = (fino, filtro) => {
    for (let i = p + 1; i <= fino; i += 1) if (suona(i) && filtro(i)) return i;
    return -1;
  };
  const ultima = acc.tasti.length - 1;
  const alternato = [
    cerca(ULTIMA_CORDA_DEL_POLLICE, eQuinta),
    cerca(ULTIMA_CORDA_DEL_POLLICE, () => true),
    cerca(ultima, eQuinta),
    cerca(ultima, () => true),
  ].find((i) => i >= 0);

  return { p, P: alternato === undefined ? p : alternato };
}
