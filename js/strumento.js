// I numeri fisici dello strumento.
//
// Questo file esiste per una regola imparata sbagliando: **i file-motore non devono
// contenere costanti dello strumento**. `audio.js` è motore — sa fare corde pizzicate,
// metronomi e microfoni — ma dentro ci stavano nascosti otto numeri che descrivono una
// chitarra e non un ukulele: la risonanza della cassa, il punto di pizzico, la velocità
// con cui la mano attraversa le corde.
//
// Finché stavano lì, il vincolo dichiarato nel documento d'avvio — «i file-motore non si
// toccano fra i due progetti» — era impossibile da rispettare, e non per pigrizia: erano
// gli stessi file a chiedere di essere diversi. Spostandoli qui, `audio.js` torna
// identico byte per byte fra chitarra e ukulele, e la differenza sta dove si vede.

export const STRUMENTO = {
  nome: 'chitarra acustica',

  /**
   * Dove pizzichi, in frazione della corda dal ponticello.
   *
   * Decide il timbro più di qualunque filtro: su una chitarra la mano sta sopra la buca,
   * a circa un quinto della corda. Più vicino al ponte — 0,26, che è il valore
   * dell'ukulele — esce un suono nasale che una chitarra non fa.
   */
  puntoPizzico: 0.2,

  /**
   * La cassa. Senza, una corda suona come un elastico.
   *
   * `corpo` è la risonanza d'aria (Helmholtz) e `aria` quella del piano armonico: su una
   * chitarra stanno a 100 e 215 Hz, su un ukulele molto più in alto perché la cassa è
   * piccola. Sono loro a dare il "petto" che un ukulele non ha.
   *
   * `taglio` è il passa-alto, e non è una questione di gusto: su un ukulele a 120 Hz non
   * toglie niente, perché la nota più grave è un Do a 261 Hz. Su una chitarra il Mi basso
   * sta a 82,41 Hz, e quel filtro avrebbe scavato via proprio le due corde per cui tutto
   * il resto del programma è stato allargato.
   */
  cassa: {
    corpo: 100,
    corpoQ: 1.2,
    corpoGain: 5,
    aria: 215,
    ariaQ: 1.0,
    ariaGain: 3,
    taglio: 55,
  },

  /**
   * Quanto ci mette la mano a passare da una corda alla successiva, in secondi.
   *
   * Sull'ukulele erano 28 ms: con quattro corde fa una spazzolata di 84 ms, che è giusta.
   * Su sei corde farebbero 140 ms, cioè un arpeggio lento travestito da pennata — a
   * 100 bpm si mangerebbe un quarto di battuta. Una mano vera attraversa sei corde in
   * 50–70 ms.
   */
  ritardoPennata: 0.012,
};
