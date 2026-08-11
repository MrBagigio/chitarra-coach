// Giri armonici e brani su cui suonare.
//
// Qui c'è SOLO la successione degli accordi: nessun testo, nessuna melodia trascritta.
// I brani sono tradizionali o di pubblico dominio, più una serie di "giri" che non sono
// canzoni ma gli scheletri su cui è costruita metà della musica popolare.
//
// `battute` = una voce per battuta. 'C' = tutta la battuta su Do, 'C|G' = mezza e mezza.

import { trasponi, tonalitaProbabile } from './theory.js';

const B = (s) => s.trim().split(/\s+/);

export const BRANI = [
  // ── Giri di studio ──────────────────────────────────────────────────────────
  //
  // Quasi tutti in Sol e in Mi minore, non in Do. Non è una preferenza estetica: sulla
  // chitarra il Do vero (x32010) salta il Mi basso e il Fa chiede il barré, mentre Sol,
  // Re, Mi minore e La minore suonano a corde piene con due o tre dita. È il motivo per
  // cui mezza musica popolare per chitarra è scritta in Sol e in Re: lo strumento è
  // costruito così.
  {
    id: 'giro-em-g',
    titolo: 'Giro i–III (Mi minore · Sol)',
    genere: 'giro',
    bpm: 68,
    battiti: 4,
    battute: B('Em Em G G Em Em G G'),
    testo: 'Due accordi che si suonano tutte e sei le corde e chiedono due dita in croce. È il primo giro che puoi tenere per intero senza fermarti a pensare.',
  },
  {
    id: 'giro-em-am',
    titolo: 'Giro i–iv (Mi minore · La minore)',
    genere: 'giro',
    bpm: 70,
    battiti: 4,
    battute: B('Em Em Am Am Em Em Am Am'),
    testo: 'La stessa forma spostata di una corda: la mano fa lo stesso movimento e cambia posto. Attenzione al Mi basso, che sul La minore NON si suona.',
  },
  {
    id: 'giro-g-d',
    titolo: 'Giro I–V (Sol · Re)',
    genere: 'giro',
    bpm: 74,
    battiti: 4,
    battute: B('G G D D G G D D'),
    testo: 'Tonica e dominante, il salto che chiude ogni frase. Fra i due la mano attraversa mezzo manico: è il primo cambio che va davvero allenato.',
  },
  {
    id: 'giro-g-c-d',
    titolo: 'Giro I–IV–V (Sol · Do · Re)',
    genere: 'giro',
    bpm: 76,
    battiti: 4,
    battute: B('G G C C G G D D'),
    testo: 'Tre accordi e ci suoni un secolo di musica popolare. In Sol, perché in Do il terzo grado sarebbe un Fa col barré.',
  },
  {
    id: 'giro-quattro',
    titolo: 'Il giro dei quattro accordi',
    genere: 'giro',
    bpm: 78,
    battiti: 4,
    battute: B('G D Em C G D Em C'),
    testo: 'I–V–vi–IV in Sol. Con questo in mano si accompagnano centinaia di canzoni pop cambiando solo la velocità. È il giro più redditizio che esista.',
  },
  {
    id: 'giro-quattro-cadd9',
    titolo: 'Il giro dei quattro accordi, versione pigra',
    genere: 'giro',
    bpm: 78,
    battiti: 4,
    battute: B('G D Em Cadd9 G D Em Cadd9'),
    testo: 'Lo stesso giro tenendo anulare e mignolo INCOLLATI sul 3° tasto delle due corde acute per tutti e quattro gli accordi. Si muovono solo due dita invece di sei: è il trucco che fa suonare fluido un principiante, e non è una scorciatoia — lo fanno tutti.',
  },
  {
    id: 'giro-50s',
    titolo: 'Giro anni \'50',
    genere: 'giro',
    bpm: 80,
    battiti: 4,
    battute: B('G Em C D G Em C D'),
    testo: 'I–vi–IV–V. Doo-wop, ballate da falò, mezzo Elvis.',
  },
  {
    id: 'giro-andaluso',
    titolo: 'Giro andaluso',
    genere: 'giro',
    bpm: 72,
    battiti: 4,
    battute: B('Em D C B7 Em D C B7'),
    testo: 'Scende di grado in grado e finisce in tensione. Suona spagnolo perché lo è. In Mi minore invece che in La minore: così l\'ultimo accordo è un Si settima e non un Fa col barré.',
  },
  {
    id: 'giro-canone',
    titolo: 'Il giro del Canone',
    genere: 'giro',
    bpm: 74,
    battiti: 4,
    battute: B('G D Em Bm C G C D'),
    testo: 'Pachelbel, 1680 circa, e da allora non ha mai smesso. Otto battute che si richiudono da sole. C\'è un Si minore in mezzo: è il giro che ti costringe al barré.',
  },
  {
    id: 'giro-pop-minore',
    titolo: 'Giro pop in minore',
    genere: 'giro',
    bpm: 78,
    battiti: 4,
    battute: B('Em C G D Em C G D'),
    testo: 'Gli stessi quattro accordi del giro pop, ma partendo dal minore: cambia tutto l\'umore senza cambiare una posizione.',
  },
  {
    id: 'giro-ii-v-i',
    titolo: 'ii–V–I (il giro del jazz)',
    genere: 'giro',
    bpm: 76,
    battiti: 4,
    battute: B('Am7 Am7 D7 D7 Gmaj7 Gmaj7 Gmaj7 Gmaj7'),
    testo: 'Tre accordi che si passano la palla e chiudono. Su questo è costruito quasi tutto lo standard jazz.',
  },
  {
    id: 'blues-mi',
    titolo: 'Blues di 12 battute in Mi',
    genere: 'giro',
    bpm: 84,
    battiti: 4,
    battute: B('E7 E7 E7 E7 A7 A7 E7 E7 B7 A7 E7 B7'),
    testo: 'La forma più suonata del Novecento, nella tonalità in cui la chitarra la suona da sempre: il Mi settima usa tutte e sei le corde e le corde a vuoto suonano dentro l\'accordo. Dodici battute, tre accordi, non finisce mai.',
  },
  {
    id: 'blues-la',
    titolo: 'Blues di 12 battute in La',
    genere: 'giro',
    bpm: 88,
    battiti: 4,
    battute: B('A7 A7 A7 A7 D7 D7 A7 A7 E7 D7 A7 E7'),
    testo: 'La stessa forma spostata di tonalità: la prova che nel blues contano i numeri, non i nomi.',
  },
  {
    id: 'giro-basso-scendente',
    titolo: 'Il basso che scende',
    genere: 'giro',
    bpm: 68,
    battiti: 4,
    battute: B('G D/F# Em D C G/B Am D'),
    testo: 'Sopra cambiano gli accordi, sotto il basso scende un gradino alla volta: Sol · Fa# · Mi · Re · Do · Si · La · Fa#. È il gesto piu riconoscibile della chitarra pop, e non e un accordo nuovo da imparare: sono quelli che sai gia, con una corda diversa sotto. Suonalo lento e ascolta solo la corda piu grave.',
  },
  {
    id: 'giro-sospesi',
    titolo: 'Il Re che respira (Re · Resus4 · Resus2)',
    genere: 'giro',
    bpm: 66,
    battiti: 4,
    battute: B('D Dsus4 D Dsus2 D Dsus4 D Dsus2'),
    testo: 'Un accordo solo con il mignolo che sale e scende sul cantino. Non è un cambio di accordo: è lo stesso accordo che si muove. Da qui nasce mezzo folk.',
  },

  // ── Tradizionali ────────────────────────────────────────────────────────────
  {
    id: 'fra-martino',
    titolo: 'Fra Martino campanaro',
    genere: 'tradizionale',
    bpm: 92,
    battiti: 4,
    battute: B('G G G G G G D7 G'),
    testo: 'Due accordi in croce: perfetta per la primissima settimana.',
  },
  {
    id: 'down-in-the-valley',
    titolo: 'Down in the Valley',
    genere: 'tradizionale',
    bpm: 84,
    battiti: 3,
    battute: B('G G G G D7 D7 D7 D7 D7 D7 D7 D7 G G G G'),
    testo: 'Appalachiana, in tre quarti. Due soli accordi tenuti a lungo: serve a sentire il valzer, non a cambiare in fretta.',
  },
  {
    id: 'vecchia-fattoria',
    titolo: 'Nella vecchia fattoria',
    genere: 'tradizionale',
    bpm: 100,
    battiti: 4,
    battute: B('G G C G G D7 G G'),
    testo: 'Aggiunge il Do: tre accordi e una melodia che sanno tutti a memoria.',
  },
  {
    id: 'oh-susanna',
    titolo: 'Oh Susanna',
    genere: 'tradizionale',
    bpm: 104,
    battiti: 4,
    battute: B('G G G D7 G G D7 G'),
    testo: 'Tonica e dominante, ritmo allegro: ottima per provare il ritmo classico.',
  },
  {
    id: 'jingle-bells',
    titolo: 'Jingle Bells',
    genere: 'tradizionale',
    bpm: 108,
    battiti: 4,
    battute: B('G G G G C G D7 G'),
    testo: 'Del 1857. Tre accordi e un ritornello che sanno tutti: perfetta per suonare davanti a qualcuno la prima volta.',
  },
  {
    id: 'auld-lang-syne',
    titolo: 'Auld Lang Syne',
    genere: 'tradizionale',
    bpm: 88,
    battiti: 4,
    battute: B('G C G D7 G C G|D7 G'),
    testo: 'La canzone di capodanno. Ha una battuta con due accordi: è il primo cambio a metà battuta.',
  },
  {
    id: 'sloop-john-b',
    titolo: 'Sloop John B (tradizionale)',
    genere: 'tradizionale',
    bpm: 96,
    battiti: 4,
    battute: B('G G G G G G D7 D7 G G C C G D7 G G'),
    testo: 'Canzone di mare delle Bahamas, raccolta nel 1916. Tre accordi e sedici battute: la prima cosa lunga che puoi suonare senza fermarti.',
  },
  {
    id: 'molly-malone',
    titolo: 'Molly Malone',
    genere: 'tradizionale',
    bpm: 92,
    battiti: 3,
    battute: B('G Em Am D7 G Em Am|D7 G'),
    testo: 'Dublino, XIX secolo. Valzer con quattro accordi che scendono: è il primo brano dove i cambi arrivano davvero uno dopo l\'altro.',
  },
  {
    id: 'michael-row',
    titolo: 'Michael Row the Boat Ashore',
    genere: 'tradizionale',
    bpm: 92,
    battiti: 4,
    battute: B('G C G Em Am G D7 G'),
    testo: 'Spiritual del 1860 circa. Cinque accordi diversi in otto battute: è un ripasso di tutto quello che sai.',
  },
  {
    id: 'aura-lee',
    titolo: 'Aura Lee',
    genere: 'tradizionale',
    bpm: 84,
    battiti: 4,
    battute: B('G G Em Em Am D7 G G'),
    testo: 'Del 1861. La melodia che un secolo dopo Elvis avrebbe riusato per Love Me Tender.',
  },
  {
    id: 'water-is-wide',
    titolo: 'The Water Is Wide',
    genere: 'tradizionale',
    bpm: 68,
    battiti: 4,
    battute: B('G G Em Em C C G G Am Am C C G D7 G G'),
    testo: 'Scozzese, XVII secolo. Lentissima e tutta su corde piene: è il brano su cui l\'arpeggio con le dita rende di più.',
  },
  {
    id: 'la-bamba',
    titolo: 'La Bamba (tradizionale)',
    genere: 'tradizionale',
    bpm: 96,
    battiti: 4,
    battute: B('G C D7 D7 G C D7 D7'),
    testo: 'Tre accordi in cerchio, non si ferma mai. Se regge questa, la mano destra c\'è.',
  },
  {
    id: 'cielito-lindo',
    titolo: 'Cielito lindo',
    genere: 'tradizionale',
    bpm: 100,
    battiti: 3,
    battute: B('G G D7 D7 D7 D7 G G'),
    testo: 'Valzer messicano del 1882. Due soli accordi e un tre quarti che invita a cantare.',
  },
  {
    id: 'bella-ciao',
    titolo: 'Bella ciao (tradizionale)',
    genere: 'tradizionale',
    bpm: 108,
    battiti: 4,
    battute: B('Am Am Dm Dm Am Am E7 E7 Am Am Dm Dm E7 E7 Am Am'),
    testo: 'Il primo brano in tonalità minore. La minore, Re minore e Mi settima: tutti e tre a due o tre dita.',
  },
  {
    id: 'greensleeves',
    titolo: 'Greensleeves',
    genere: 'tradizionale',
    bpm: 96,
    battiti: 3,
    battute: B('Am Am G G Am Am E7 E7 Am Am G G Am E7 Am Am'),
    testo: 'Inglese, XVI secolo. Valzer in minore che alterna due accordi e chiude con la settima: la melodia la conosci di sicuro.',
  },
  {
    id: 'scarborough',
    titolo: 'Scarborough Fair (tradizionale)',
    genere: 'tradizionale',
    bpm: 80,
    battiti: 3,
    battute: B('Am Am G Am Am C Am Am Am G Am Am C G Am Am'),
    testo: 'Valzer in minore, molto lento: si sente ogni cambio sporco. È anche il brano da fingerpicking per eccellenza.',
  },
  {
    id: 'rising-sun',
    titolo: 'House of the Rising Sun (tradizionale)',
    genere: 'tradizionale',
    bpm: 76,
    battiti: 3,
    battute: B('Am C D F Am C E7 E7 Am C D F Am E7 Am Am'),
    testo: 'Sei ottavi e un Fa in mezzo: è il brano che ti mette davanti al barré senza scampo. Finché non regge, fallo col Fa a quattro corde.',
  },
  {
    id: 'amazing-grace',
    titolo: 'Amazing Grace',
    genere: 'tradizionale',
    bpm: 84,
    battiti: 3,
    battute: B('G G G7 C G G D7 D7 G G7 C G G D7 G G'),
    testo: 'In tre quarti. Il valzer costringe a contare: UN-due-tre. Il Sol settima in mezzo tira verso il Do.',
  },
  {
    id: 'tanti-auguri',
    titolo: 'Tanti auguri a te',
    genere: 'tradizionale',
    bpm: 96,
    battiti: 3,
    battute: B('G G D7 D7 G G7 C G D7 G'),
    testo: 'Serve più di quanto pensi. È in tre quarti e ha un Sol settima che prepara il Do.',
  },
  {
    id: 'ninna-nanna',
    titolo: 'Ninna nanna di Brahms',
    genere: 'tradizionale',
    bpm: 76,
    battiti: 3,
    battute: B('G G D7 G G G7 C G D7 G G G'),
    testo: 'Del 1868. Lentissima: è il brano giusto su cui provare gli arpeggi con le dita.',
  },
  {
    id: 'santa-lucia',
    titolo: 'Santa Lucia',
    genere: 'tradizionale',
    bpm: 88,
    battiti: 3,
    battute: B('G G D7 G C G D7 G G G D7 G'),
    testo: 'Barcarola napoletana del 1849. Valzer largo, adatto agli arpeggi.',
  },
  {
    id: 'wildwood-flower',
    titolo: 'Wildwood Flower',
    genere: 'tradizionale',
    bpm: 92,
    battiti: 4,
    battute: B('C C C C G7 G7 C C C C F F C G7 C C'),
    testo: 'Del 1860, resa celebre dalla Carter Family. È il pezzo con cui si impara il basso alternato: il pollice cammina mentre le altre dita fanno la melodia.',
  },
  {
    id: 'ode-gioia',
    titolo: 'Inno alla gioia (Beethoven)',
    genere: 'tradizionale',
    bpm: 96,
    battiti: 4,
    battute: B('G G D7 G G G D7 G C G D7 G G D7 G G'),
    testo: 'Melodia che tutti riconoscono su un accompagnamento elementare.',
  },
];

export const PER_ID = new Map(BRANI.map((b) => [b.id, b]));

/**
 * Un brano per id, cercando anche fra quelli importati dall'utente.
 *
 * La ricerca fra i brani propri è iniettata da `importa.js` all'avvio invece di essere
 * importata qui: così questo modulo resta dati puri e non tira dentro il `localStorage`
 * — il che permette al banco di collaudo di verificarlo senza uno stato salvato.
 */
let cercaBraniUtente = () => null;

export function registraBraniUtente(funzione) {
  cercaBraniUtente = funzione;
}

export function brano(id) {
  return PER_ID.get(id) || cercaBraniUtente(id) || BRANI[0];
}

export function branoSeEsiste(id) {
  return PER_ID.get(id) || cercaBraniUtente(id) || null;
}

/** Tutti gli accordi che un brano richiede, in ordine di prima comparsa. */
export function accordiDi(b) {
  const visti = [];
  b.battute.forEach((cella) => {
    cella.split('|').forEach((c) => { if (c && !visti.includes(c)) visti.push(c); });
  });
  return visti;
}

/** Il brano trasportato di N semitoni: stessa struttura, nomi nuovi. */
export function branoTrasportato(b, semitoni, bemolli = false) {
  if (!semitoni) return b;
  return {
    ...b,
    battute: b.battute.map((cella) => cella.split('|').map((c) => trasponi(c, semitoni, bemolli)).join('|')),
    trasportoDi: semitoni,
  };
}

export function tonalitaDi(b) {
  return tonalitaProbabile(accordiDi(b));
}
