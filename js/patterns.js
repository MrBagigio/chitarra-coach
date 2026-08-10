// Ritmi di pennata e schemi di arpeggio.
//
// Una battuta è divisa in caselle: `suddivisioni` dice quante per battito.
//   suddivisioni 2 → ottavi   (1 e 2 e 3 e 4 e)
//   suddivisioni 3 → terzine  (1 tri o-la 2 tri o-la …) e serve per shuffle e 6/8
//
// Due tipi di schema:
//   tipo 'penna' — la mano destra spazzola tutte le corde
//     giu   pennata in basso (dorso dell'indice o pollice)
//     su    pennata in alto (polpastrello dell'indice)
//     chunk pennata in basso smorzata col palmo: fa "cià", non una nota
//     -     mano ferma (il tempo passa comunque: è la parte che si sbaglia di più)
//   tipo 'dita' — ogni casella dice QUALE corda con QUALE dito
//     p pollice (corda G)  ·  i indice (C)  ·  m medio (E)  ·  a anulare (A)
//     più combinazioni tipo 'p+a' per il pizzico

export const CORDA_DI_DITO = { p: 0, i: 1, m: 2, a: 3 };

const R = (id, nome, extra) => ({
  id, nome, tipo: 'penna', battiti: 4, suddivisioni: 2, difficolta: 2, ...extra,
});

export const RITMI = [
  R('r-giu4', 'Quattro in giù', {
    slot: ['giu', '-', 'giu', '-', 'giu', '-', 'giu', '-'],
    difficolta: 1,
    testo: 'Una pennata per battito. Serve a mettere il piede a tempo, non a suonare bene.',
  }),
  R('r-otto', 'Otto pennate', {
    slot: ['giu', 'su', 'giu', 'su', 'giu', 'su', 'giu', 'su'],
    difficolta: 1,
    testo: 'Giù-su continuo. Il polso oscilla come un metronomo: da qui nascono tutti gli altri ritmi, che sono questo con dei buchi.',
  }),
  R('r-classico', 'Il classico (D DU UDU)', {
    slot: ['giu', '-', 'giu', 'su', '-', 'su', 'giu', 'su'],
    testo: 'Il ritmo più usato sull\'ukulele. Regola unica: la mano non si ferma mai. Nei buchi passa comunque, senza toccare le corde. Se la fermi, il tempo si perde.',
  }),
  R('r-ballata', 'Ballata (D D DU DU)', {
    slot: ['giu', '-', 'giu', '-', 'giu', 'su', 'giu', 'su'],
    testo: 'Calma sui primi due battiti, si apre sugli ultimi due. Buono per i pezzi lenti.',
  }),
  R('r-chunk', 'Con lo stop', {
    slot: ['giu', 'su', 'chunk', 'su', 'giu', 'su', 'chunk', 'su'],
    difficolta: 3,
    testo: 'Sul 2 e sul 4 il palmo appoggia sulle corde nello stesso momento della pennata: esce un colpo secco. È il groove.',
  }),
  R('r-reggae', 'Reggae (solo i controtempi)', {
    slot: ['-', 'su', '-', 'su', '-', 'su', '-', 'su'],
    difficolta: 3,
    testo: 'Sui battiti pieni non suoni niente. Contare a voce "1 e 2 e" e suonare solo sulle "e" è tutto l\'esercizio.',
  }),
  R('r-valzer', 'Valzer', {
    battiti: 3,
    slot: ['giu', '-', 'giu', 'su', 'giu', 'su'],
    testo: 'Tre battiti per battuta: UN-due-tre. Il primo è più forte.',
  }),
  R('r-shuffle', 'Shuffle (terzine zoppe)', {
    suddivisioni: 3,
    slot: ['giu', '-', 'su', 'giu', '-', 'su', 'giu', '-', 'su', 'giu', '-', 'su'],
    difficolta: 3,
    testo: 'Il battito si divide in TRE e tu ne suoni la prima e la terza: lungo-corto, lungo-corto. È l\'andatura del blues, e non si ottiene suonando ottavi più svelti.',
  }),
  R('r-terzine', 'Terzine piene', {
    suddivisioni: 3,
    slot: ['giu', 'su', 'giu', 'su', 'giu', 'su', 'giu', 'su', 'giu', 'su', 'giu', 'su'],
    difficolta: 4,
    testo: 'Tre pennate per battito, alternate. L\'accento cade a rotazione su giù e su: è quello che confonde, ed è anche quello che fa girare il ritmo.',
  }),
  R('r-sei-otto', 'Sei ottavi (barcarola)', {
    battiti: 2,
    suddivisioni: 3,
    slot: ['giu', '-', 'su', 'giu', 'su', 'su'],
    difficolta: 3,
    testo: 'Due battiti grandi, ognuno diviso in tre. Il dondolio delle ninne nanne e di metà del folk irlandese.',
  }),
  R('r-marcia', 'Marcia (accento sul 2 e sul 4)', {
    slot: ['giu', '-', 'chunk', '-', 'giu', '-', 'chunk', '-'],
    difficolta: 2,
    testo: 'Nudo e crudo: uno e tre suonano, due e quattro schioccano. Prima di aggiungere le pennate in su, questo deve essere solido.',
  }),

  // ── Arpeggi: le dita, non la spazzola ───────────────────────────────────────
  R('a-pima', 'Arpeggio p-i-m-a', {
    tipo: 'dita',
    slot: ['p', 'i', 'm', 'a', 'p', 'i', 'm', 'a'],
    difficolta: 2,
    testo: 'Pollice sulla G, indice sulla C, medio sulla E, anulare sulla A. Ogni dito ha la SUA corda e non la lascia: è la regola che rende l\'arpeggio automatico.',
  }),
  R('a-pami', 'Arpeggio p-a-m-i', {
    tipo: 'dita',
    slot: ['p', 'a', 'm', 'i', 'p', 'a', 'm', 'i'],
    difficolta: 3,
    testo: 'Come il precedente ma torna indietro: sale col pollice e scende. Suona più dolce perché finisce vicino al grave.',
  }),
  R('a-pizzico', 'Pizzico e arpeggio', {
    tipo: 'dita',
    slot: ['p+a', '-', 'i', 'm', 'p', '-', 'i', 'm'],
    difficolta: 3,
    testo: 'Sul battito pollice e anulare pizzicano insieme (le due corde esterne), poi le due di mezzo riempiono. È l\'accompagnamento delle ballate.',
  }),
  R('a-alternato', 'Pollice alternato', {
    tipo: 'dita',
    slot: ['p', 'm', 'i', 'm', 'p', 'm', 'i', 'm'],
    difficolta: 4,
    testo: 'Il pollice tiene il passo mentre le altre dita fanno la melodia. È l\'indipendenza delle mani: lentissimo all\'inizio, o non si impara.',
  }),
  R('a-valzer', 'Arpeggio da valzer', {
    tipo: 'dita',
    battiti: 3,
    slot: ['p', '-', 'i', 'm', 'a', 'm'],
    difficolta: 3,
    testo: 'Basso sul primo battito, poi le dita salgono. Tre quarti: UN-due-tre.',
  }),
];

export const PER_ID = new Map(RITMI.map((r) => [r.id, r]));

export function ritmo(id) {
  return PER_ID.get(id) || RITMI[0];
}

export const SIMBOLI = { giu: '↓', su: '↑', chunk: '✕', '-': '·' };

/** Come si conta la battuta a voce alta. */
export function etichette(r) {
  const perBattito = r.suddivisioni === 3 ? ['', 'tri', 'o-la'] : ['', 'e'];
  const numeri = ['1', '2', '3', '4', '5', '6'];
  const out = [];
  for (let b = 0; b < r.battiti; b += 1) {
    for (let s = 0; s < r.suddivisioni; s += 1) {
      out.push(s === 0 ? numeri[b] : perBattito[s]);
    }
  }
  return out;
}

/** Simbolo da disegnare in una casella, sia per la spazzola che per le dita. */
export function simbolo(r, valore) {
  if (valore === '-') return '·';
  return r.tipo === 'dita' ? valore.toUpperCase() : SIMBOLI[valore] || valore;
}

/** Corde toccate da una casella d'arpeggio: serve al disegno e al collaudo. */
export function cordeDiCasella(valore) {
  if (valore === '-') return [];
  return valore.split('+').map((d) => CORDA_DI_DITO[d]).filter((n) => n !== undefined);
}

/**
 * La classe di colore di una casella d'arpeggio.
 *
 * Stesse tinte della mano sinistra, per lo stesso dito: l'indice è ambra sia che prema
 * un tasto sia che pizzichi una corda. Un colore per dito, non un colore per mano.
 */
export function classeDito(valore) {
  if (valore === '-') return '';
  const dita = valore.split('+');
  if (dita.length > 1) return 'dito-misto';
  return CORDA_DI_DITO[dita[0]] === undefined ? '' : `dito-${dita[0]}`;
}
