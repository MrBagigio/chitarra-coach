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

import { classiAttese, nomeClasse, scomponi } from './theory.js';

export const CORDE = ['E', 'A', 'D', 'G', 'B', 'E'];

/** Come si chiamano per numero: la 6ª è il Mi basso, la 1ª è il cantino. */
export const NUMERI_CORDA = ['6ª', '5ª', '4ª', '3ª', '2ª', '1ª'];

/** Semitoni delle corde a vuoto rispetto a Do, per la verifica delle note. */
export const CORDE_SEMITONI = [4, 9, 2, 7, 11, 4];

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
