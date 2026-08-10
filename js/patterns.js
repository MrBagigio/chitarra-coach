// Ritmi di pennata e schemi di arpeggio.
//
// Una battuta è divisa in caselle: `suddivisioni` dice quante per battito.
//   suddivisioni 2 → ottavi   (1 e 2 e 3 e 4 e)
//   suddivisioni 3 → terzine  (1 tri o-la 2 tri o-la …) e serve per shuffle e 6/8
//
// Due tipi di schema:
//   tipo 'penna' — la mano destra spazzola le corde
//     giu   pennata in basso (plettro o dorso delle unghie)
//     su    pennata in alto
//     chunk pennata smorzata col palmo: fa "cià", non una nota
//     -     mano ferma (il tempo passa comunque: è la parte che si sbaglia di più)
//   tipo 'dita' — ogni casella dice QUALE corda con QUALE dito
//     p pollice sul basso dell'accordo  ·  i indice (3ª)  ·  m medio (2ª)  ·  a anulare (1ª)
//     P pollice sul basso ALTERNATO     ·  più combinazioni tipo 'p+a' per il pizzico
//
// ── Il pollice non ha una corda fissa, e questa è la differenza vera ──────────
//
// Sull'ukulele ogni dito aveva la sua corda e non la lasciava mai: quattro dita, quattro
// corde, fine. Sulla chitarra le corde sono sei e le dita restano quattro, quindi il
// pollice si prende TRE corde e ci cammina sopra. Dove va dipende dall'accordo: sul Mi
// parte dalla 6ª, sul La dalla 5ª, sul Re dalla 4ª. Suonare sempre la 6ª vorrebbe dire
// mettere un Mi sotto a un Re maggiore, che non è un colore: è un errore.
//
// Per questo le caselle del pollice sono simboliche — 'p' e 'P' — e vengono risolte in
// numeri di corda contro l'accordo che si sta suonando, non scritte qui.

/** Dita che hanno una corda fissa. Il pollice no: vedi sopra. */
export const CORDA_DI_DITO = { i: 3, m: 4, a: 5 };

/** Le due caselle del pollice, da risolvere contro l'accordo. */
export const BASSI = { p: 'basso', P: 'basso alternato' };

const R = (id, nome, extra) => ({
  id, nome, tipo: 'penna', battiti: 4, suddivisioni: 2, difficolta: 2, ...extra,
});

export const RITMI = [
  R('r-giu4', 'Quattro in giù', {
    slot: ['giu', '-', 'giu', '-', 'giu', '-', 'giu', '-'],
    difficolta: 1,
    testo: 'Una pennata per battito. Serve a mettere il piede a tempo, non a suonare bene. Parti sempre dalla corda giusta: sul Do e sul La il Mi basso non si suona.',
  }),
  R('r-otto', 'Otto pennate', {
    slot: ['giu', 'su', 'giu', 'su', 'giu', 'su', 'giu', 'su'],
    difficolta: 1,
    testo: 'Giù-su continuo. Il polso oscilla come un metronomo: da qui nascono tutti gli altri ritmi, che sono questo con dei buchi. In su non serve arrivare fino in fondo: bastano le tre corde acute.',
  }),
  R('r-classico', 'Il classico (D DU UDU)', {
    slot: ['giu', '-', 'giu', 'su', '-', 'su', 'giu', 'su'],
    testo: 'Il ritmo più usato al mondo. Regola unica: la mano non si ferma mai. Nei buchi passa comunque, senza toccare le corde. Se la fermi, il tempo si perde.',
  }),
  R('r-ballata', 'Ballata (D D DU DU)', {
    slot: ['giu', '-', 'giu', '-', 'giu', 'su', 'giu', 'su'],
    testo: 'Calma sui primi due battiti, si apre sugli ultimi due. Buono per i pezzi lenti.',
  }),
  R('r-chunk', 'Con lo stop', {
    slot: ['giu', 'su', 'chunk', 'su', 'giu', 'su', 'chunk', 'su'],
    difficolta: 3,
    testo: 'Sul 2 e sul 4 il palmo appoggia sulle corde nello stesso momento della pennata: esce un colpo secco. Sulla chitarra acustica il colpo si sente anche sulla cassa, ed è metà del groove.',
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
  R('r-bassoaccordo', 'Basso e accordo', {
    slot: ['basso', '-', 'giu', '-', 'basso', '-', 'giu', '-'],
    difficolta: 2,
    testo: 'Sul 1 e sul 3 suoni SOLO la corda del basso, sul 2 e sul 4 l\'accordo intero. È l\'accompagnamento country e da falò, e insegna la cosa che serve di più: sapere sempre dov\'è il basso dell\'accordo che stai tenendo.',
  }),

  // ── Arpeggi: le dita, non la spazzola ───────────────────────────────────────
  R('a-pima', 'Arpeggio p-i-m-a', {
    tipo: 'dita',
    slot: ['p', 'i', 'm', 'a', 'p', 'i', 'm', 'a'],
    difficolta: 2,
    testo: 'Pollice sul basso dell\'accordo, indice sulla 3ª, medio sulla 2ª, anulare sulla 1ª. Le tre dita hanno la LORO corda e non la lasciano mai: è la regola che rende l\'arpeggio automatico. Solo il pollice si sposta.',
  }),
  R('a-pami', 'Arpeggio p-a-m-i', {
    tipo: 'dita',
    slot: ['p', 'a', 'm', 'i', 'p', 'a', 'm', 'i'],
    difficolta: 2,
    testo: 'Come il precedente ma torna indietro: sale col pollice e scende. Suona più dolce perché finisce vicino al grave.',
  }),
  R('a-pizzico', 'Pizzico e arpeggio', {
    tipo: 'dita',
    slot: ['p+a', '-', 'i', 'm', 'p', '-', 'i', 'm'],
    difficolta: 3,
    testo: 'Sul battito pollice e anulare pizzicano insieme (basso e cantino), poi le due di mezzo riempiono. È l\'accompagnamento delle ballate.',
  }),
  R('a-basso-alternato', 'Pollice alternato (senza dita)', {
    tipo: 'dita',
    slot: ['p', '-', 'P', '-', 'p', '-', 'P', '-'],
    difficolta: 2,
    testo: 'Solo il pollice, che va avanti e indietro fra le due corde del basso. Sembra niente e non lo è: finché questo non cammina da solo, senza guardarlo, il Travis non parte. Fallo per intere canzoni senza aggiungere altro.',
  }),
  R('a-travis', 'Travis picking', {
    tipo: 'dita',
    slot: ['p', 'i', 'P', 'm', 'p', 'a', 'P', 'm'],
    difficolta: 5,
    testo: 'Il pollice continua ad alternare i bassi mentre le altre dita entrano negli spazi in mezzo. Non si impara a velocità ridotta di un ritmo intero: si impara aggiungendo UN dito alla volta al pollice che già cammina. È il suono di mezzo folk americano.',
  }),
  R('a-travis-semplice', 'Travis, primo passo', {
    tipo: 'dita',
    slot: ['p', '-', 'P', 'm', 'p', '-', 'P', 'm'],
    difficolta: 4,
    testo: 'Il pollice alternato più UN dito solo, il medio, in mezzo alla seconda e alla quarta pulsazione. Quando questo è automatico si aggiunge l\'indice.',
  }),
  R('a-valzer', 'Arpeggio da valzer', {
    tipo: 'dita',
    battiti: 3,
    slot: ['p', '-', 'i', 'm', 'a', 'm'],
    difficolta: 3,
    testo: 'Basso sul primo battito, poi le dita salgono. Tre quarti: UN-due-tre.',
  }),
  R('a-sei-otto', 'Arpeggio in 6/8', {
    tipo: 'dita',
    battiti: 2,
    suddivisioni: 3,
    slot: ['p', 'i', 'm', 'a', 'm', 'i'],
    difficolta: 3,
    testo: 'Sale e scende dentro un dondolio a sei. Il pollice cade solo sul primo di ogni gruppo.',
  }),
];

export const PER_ID = new Map(RITMI.map((r) => [r.id, r]));

export function ritmo(id) {
  return PER_ID.get(id) || RITMI[0];
}

export const SIMBOLI = {
  giu: '↓', su: '↑', chunk: '✕', basso: '↓ᵇ', '-': '·',
};

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

/**
 * Simbolo da disegnare in una casella.
 *
 * Le due caselle del pollice devono restare DISTINGUIBILI a colpo d'occhio, altrimenti
 * uno schema Travis si legge come "pollice, pollice, pollice" e sparisce proprio la cosa
 * che lo definisce: che le due pennate del pollice vanno su corde diverse.
 */
export function simbolo(r, valore) {
  if (valore === '-') return '·';
  if (r.tipo !== 'dita') return SIMBOLI[valore] || valore;
  if (valore === 'p') return 'P';
  if (valore === 'P') return 'P2';
  return valore.toUpperCase();
}

/**
 * Corde toccate da una casella d'arpeggio: serve al disegno e al collaudo.
 *
 * `bassi` arriva dall'accordo (vedi `bassiDi` in chords.js): senza, il pollice non
 * saprebbe dove andare. Il valore di riserva serve solo perché una chiamata senza
 * accordo non debba esplodere.
 */
export function cordeDiCasella(valore, bassi = { p: 0, P: 2 }) {
  if (valore === '-') return [];
  return valore.split('+')
    .map((d) => (d in bassi ? bassi[d] : CORDA_DI_DITO[d]))
    .filter((n) => n !== undefined);
}

/**
 * La classe di colore di una casella d'arpeggio.
 *
 * Stesse tinte della mano sinistra, per lo stesso dito: l'indice è ambra sia che prema
 * un tasto sia che pizzichi una corda. Un colore per dito, non un colore per mano.
 * Le due caselle del pollice condividono la tinta perché sono lo stesso dito — a
 * distinguerle ci pensa il simbolo.
 */
export function classeDito(valore) {
  if (valore === '-') return '';
  const dita = valore.split('+');
  if (dita.length > 1) return 'dito-misto';
  const d = dita[0];
  if (d === 'p' || d === 'P') return 'dito-p';
  return CORDA_DI_DITO[d] === undefined ? '' : `dito-${d}`;
}

/** Uno schema usa il pollice alternato? Serve a spiegarlo dove compare. */
export function usaBassoAlternato(r) {
  return r.tipo === 'dita' && r.slot.some((s) => s.split('+').includes('P'));
}
