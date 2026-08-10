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
  {
    id: 'giro-c-am',
    titolo: 'Giro I–vi (Do · La minore)',
    genere: 'giro',
    bpm: 70,
    battiti: 4,
    battute: B('C C Am Am C C Am Am'),
    testo: 'Due accordi che distano un dito. Il primo giro che puoi suonare per intero.',
  },
  {
    id: 'giro-c-f',
    titolo: 'Giro I–IV (Do · Fa)',
    genere: 'giro',
    bpm: 70,
    battiti: 4,
    battute: B('C C F F C C F F'),
    testo: 'Il salto più comune di tutti: tonica e sottodominante.',
  },
  {
    id: 'giro-quattro',
    titolo: 'Il giro dei quattro accordi',
    genere: 'giro',
    bpm: 76,
    battiti: 4,
    battute: B('C G Am F C G Am F'),
    testo: 'I–V–vi–IV. Con questo in mano si accompagnano centinaia di canzoni pop, cambiando solo la velocità.',
  },
  {
    id: 'giro-50s',
    titolo: 'Giro anni \'50',
    genere: 'giro',
    bpm: 80,
    battiti: 4,
    battute: B('C Am F G C Am F G'),
    testo: 'I–vi–IV–V. Doo-wop, ballate da falò, mezzo Elvis.',
  },
  {
    id: 'giro-andaluso',
    titolo: 'Giro andaluso',
    genere: 'giro',
    bpm: 72,
    battiti: 4,
    battute: B('Am G F E7 Am G F E7'),
    testo: 'Scende di grado in grado e finisce in tensione. Suona spagnolo perché lo è.',
  },
  {
    id: 'giro-canone',
    titolo: 'Il giro del Canone',
    genere: 'giro',
    bpm: 74,
    battiti: 4,
    battute: B('C G Am Em F C F G'),
    testo: 'Pachelbel, 1680 circa, e da allora non ha mai smesso. Otto battute che si richiudono da sole.',
  },
  {
    id: 'giro-pop-minore',
    titolo: 'Giro pop in minore',
    genere: 'giro',
    bpm: 78,
    battiti: 4,
    battute: B('Am F C G Am F C G'),
    testo: 'Gli stessi quattro accordi del giro pop, ma partendo dal minore: cambia tutto l\'umore senza cambiare una posizione.',
  },
  {
    id: 'giro-ii-v-i',
    titolo: 'ii–V–I (il giro del jazz)',
    genere: 'giro',
    bpm: 76,
    battiti: 4,
    battute: B('Dm7 Dm7 G7 G7 Cmaj7 Cmaj7 Cmaj7 Cmaj7'),
    testo: 'Tre accordi che si passano la palla e chiudono. Su questo è costruito quasi tutto lo standard jazz.',
  },
  {
    id: 'blues-do',
    titolo: 'Blues di 12 battute in Do',
    genere: 'giro',
    bpm: 84,
    battiti: 4,
    battute: B('C7 C7 C7 C7 F7 F7 C7 C7 G7 F7 C7 G7'),
    testo: 'La forma più suonata del Novecento. Dodici battute, tre accordi, si ripete all\'infinito.',
  },
  {
    id: 'blues-sol',
    titolo: 'Blues di 12 battute in Sol',
    genere: 'giro',
    bpm: 88,
    battiti: 4,
    battute: B('G7 G7 G7 G7 C7 C7 G7 G7 D7 C7 G7 D7'),
    testo: 'La stessa forma spostata di tonalità: la prova che i numeri contano più dei nomi.',
  },
  {
    id: 'giro-am-dm',
    titolo: 'Giro minore (La minore)',
    genere: 'giro',
    bpm: 72,
    battiti: 4,
    battute: B('Am Am Dm Dm Am Am E7 E7'),
    testo: 'i–iv–i–V: il colore della musica popolare mediterranea.',
  },
  {
    id: 'giro-doowop-sol',
    titolo: 'Doo-wop in Sol',
    genere: 'giro',
    bpm: 80,
    battiti: 4,
    battute: B('G Em C D G Em C D'),
    testo: 'Lo stesso giro anni \'50 in un\'altra tonalità: serve a staccarsi dalla mano che conosce solo il Do.',
  },

  // ── Tradizionali ────────────────────────────────────────────────────────────
  {
    id: 'fra-martino',
    titolo: 'Fra Martino campanaro',
    genere: 'tradizionale',
    bpm: 92,
    battiti: 4,
    battute: B('C C C C C C G7 C'),
    testo: 'Due accordi in croce: perfetta per la primissima settimana.',
  },
  {
    id: 'vecchia-fattoria',
    titolo: 'Nella vecchia fattoria',
    genere: 'tradizionale',
    bpm: 100,
    battiti: 4,
    battute: B('C C F C C G7 C C'),
    testo: 'Aggiunge il Fa: è il motivo per cui il Fa si impara subito.',
  },
  {
    id: 'oh-susanna',
    titolo: 'Oh Susanna',
    genere: 'tradizionale',
    bpm: 104,
    battiti: 4,
    battute: B('C C C G7 C C G7 C'),
    testo: 'Tonica e dominante, ritmo allegro: ottima per provare il ritmo classico.',
  },
  {
    id: 'jingle-bells',
    titolo: 'Jingle Bells',
    genere: 'tradizionale',
    bpm: 108,
    battiti: 4,
    battute: B('C C C C F C G7 C'),
    testo: 'Del 1857. Tre accordi e un ritornello che sanno tutti: perfetta per suonare davanti a qualcuno la prima volta.',
  },
  {
    id: 'auld-lang-syne',
    titolo: 'Auld Lang Syne',
    genere: 'tradizionale',
    bpm: 88,
    battiti: 4,
    battute: B('C F C G7 C F C|G7 C'),
    testo: 'La canzone di capodanno. Ha una battuta con due accordi: è il primo cambio a metà battuta.',
  },
  {
    id: 'michael-row',
    titolo: 'Michael Row the Boat Ashore',
    genere: 'tradizionale',
    bpm: 92,
    battiti: 4,
    battute: B('C F C Am Dm C G7 C'),
    testo: 'Spiritual del 1860 circa. Sette accordi diversi in otto battute: è un ripasso di tutto il livello 4.',
  },
  {
    id: 'aura-lee',
    titolo: 'Aura Lee',
    genere: 'tradizionale',
    bpm: 84,
    battiti: 4,
    battute: B('C C Am Am Dm G7 C C'),
    testo: 'Del 1861. La melodia che un secolo dopo Elvis avrebbe riusato per Love Me Tender.',
  },
  {
    id: 'la-bamba',
    titolo: 'La Bamba (tradizionale)',
    genere: 'tradizionale',
    bpm: 96,
    battiti: 4,
    battute: B('C F G7 G7 C F G7 G7'),
    testo: 'Tre accordi in cerchio, non si ferma mai. Se regge questa, la mano destra c\'è.',
  },
  {
    id: 'cielito-lindo',
    titolo: 'Cielito lindo',
    genere: 'tradizionale',
    bpm: 100,
    battiti: 3,
    battute: B('C C G7 G7 G7 G7 C C'),
    testo: 'Valzer messicano del 1882. Due soli accordi e un tre quarti che invita a cantare.',
  },
  {
    id: 'bella-ciao',
    titolo: 'Bella ciao (tradizionale)',
    genere: 'tradizionale',
    bpm: 108,
    battiti: 4,
    battute: B('Am Am Dm Dm Am Am E7 E7 Am Am Dm Dm E7 E7 Am Am'),
    testo: 'Il primo brano in tonalità minore. Chiede La minore, Re minore e Mi settima.',
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
    id: 'amazing-grace',
    titolo: 'Amazing Grace',
    genere: 'tradizionale',
    bpm: 84,
    battiti: 3,
    battute: B('C C C7 F C C G7 G7 C C7 F C C G7 C C'),
    testo: 'In tre quarti. Il valzer costringe a contare: UN-due-tre.',
  },
  {
    id: 'tanti-auguri',
    titolo: 'Tanti auguri a te',
    genere: 'tradizionale',
    bpm: 96,
    battiti: 3,
    battute: B('C C G7 G7 C C7 F C G7 C'),
    testo: 'Serve più di quanto pensi. È in tre quarti e ha un Do settima che prepara il Fa.',
  },
  {
    id: 'ninna-nanna',
    titolo: 'Ninna nanna di Brahms',
    genere: 'tradizionale',
    bpm: 76,
    battiti: 3,
    battute: B('C C G7 C C C7 F C G7 C C C'),
    testo: 'Del 1868. Lentissima: è il brano giusto su cui provare gli arpeggi con le dita.',
  },
  {
    id: 'santa-lucia',
    titolo: 'Santa Lucia',
    genere: 'tradizionale',
    bpm: 88,
    battiti: 3,
    battute: B('C C G7 C F C G7 C C C G7 C'),
    testo: 'Barcarola napoletana del 1849. Valzer largo, adatto agli arpeggi.',
  },
  {
    id: 'scarborough',
    titolo: 'Scarborough Fair (tradizionale)',
    genere: 'tradizionale',
    bpm: 80,
    battiti: 3,
    battute: B('Am Am G Am Am C Am Am Am G Am Am C G Am Am'),
    testo: 'Valzer in minore, molto lento: si sente ogni cambio sporco.',
  },
  {
    id: 'rising-sun',
    titolo: 'House of the Rising Sun (tradizionale)',
    genere: 'tradizionale',
    bpm: 76,
    battiti: 3,
    battute: B('Am C D F Am C E7 E7 Am C D F Am E7 Am Am'),
    testo: 'Chiede il Re maggiore: tre dita sullo stesso tasto. È la prova del nove della mano sinistra.',
  },
  {
    id: 'ode-gioia',
    titolo: 'Inno alla gioia (Beethoven)',
    genere: 'tradizionale',
    bpm: 96,
    battiti: 4,
    battute: B('C C G7 C C C G7 C F C G7 C C G7 C C'),
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
