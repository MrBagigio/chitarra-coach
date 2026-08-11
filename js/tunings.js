import { hzDaMidi } from './pitch.js';
import { trasponi } from './theory.js';

// Accordature della chitarra. `corde` va SEMPRE dalla 6ª (il Mi basso) alla 1ª (il Mi
// cantino): è l'ordine in cui si leggono i diagrammi di tutti i libri di accordi, cioè
// da sinistra a destra guardando lo strumento di fronte.
//
// Il Mi basso sta a 82,41 Hz. È il numero che decide mezzo programma: la banda in cui
// l'app cerca le note deve arrivare fin lì, e sull'ukulele non ci arrivava nemmeno da
// lontano (partiva da 240 Hz).

export const ACCORDATURE = [
  {
    id: 'eadgbe',
    nome: 'Standard EADGBE',
    dettaglio: 'Mi La Re Sol Si Mi — i diagrammi di questa app valgono per questa',
    corde: [
      { etichetta: 'E', midi: 40 },   //  82,41 Hz
      { etichetta: 'A', midi: 45 },   // 110,00
      { etichetta: 'D', midi: 50 },   // 146,83
      { etichetta: 'G', midi: 55 },   // 196,00
      { etichetta: 'B', midi: 59 },   // 246,94
      { etichetta: 'E', midi: 64 },   // 329,63
    ],
  },
  {
    id: 'dropd',
    nome: 'Drop D',
    dettaglio: 'Solo la 6ª scende di un tono, a Re. Gli accordi che non toccano la 6ª restano identici',
    corde: [
      { etichetta: 'D', midi: 38 },   // 73,42 Hz — la nota più grave che l'app deve saper leggere
      { etichetta: 'A', midi: 45 },
      { etichetta: 'D', midi: 50 },
      { etichetta: 'G', midi: 55 },
      { etichetta: 'B', midi: 59 },
      { etichetta: 'E', midi: 64 },
    ],
  },
  {
    id: 'mezzotono',
    nome: 'Mezzo tono sotto (Eb)',
    dettaglio: 'Tutto calato di un semitono: corde più morbide, voce più comoda. Le forme non cambiano, i nomi sì',
    corde: [
      { etichetta: 'Eb', midi: 39 },  // 77,78
      { etichetta: 'Ab', midi: 44 },
      { etichetta: 'Db', midi: 49 },
      { etichetta: 'Gb', midi: 54 },
      { etichetta: 'Bb', midi: 58 },
      { etichetta: 'Eb', midi: 63 },
    ],
  },
  {
    id: 'dadgad',
    nome: 'DADGAD',
    dettaglio: 'Accordatura modale del folk celtico — i diagrammi di questa app NON valgono',
    corde: [
      { etichetta: 'D', midi: 38 },
      { etichetta: 'A', midi: 45 },
      { etichetta: 'D', midi: 50 },
      { etichetta: 'G', midi: 55 },
      { etichetta: 'A', midi: 57 },
      { etichetta: 'D', midi: 62 },
    ],
  },
  {
    id: 'openg',
    nome: 'Open G (DGDGBD)',
    dettaglio: 'A vuoto suona un Sol maggiore: è lo slide e il blues — i diagrammi NON valgono',
    corde: [
      { etichetta: 'D', midi: 38 },
      { etichetta: 'G', midi: 43 },
      { etichetta: 'D', midi: 50 },
      { etichetta: 'G', midi: 55 },
      { etichetta: 'B', midi: 59 },
      { etichetta: 'D', midi: 62 },
    ],
  },
];

/** Fin dove si mette il capotasto mobile: oltre il settimo tasto non ci sta più la mano. */
export const CAPOTASTO_MAX = 7;

/**
 * Le frequenze che una presa produce DAVVERO, capotasto compreso.
 *
 * Esiste per un motivo che questo progetto ha già pagato una volta: il calcolo era
 * scritto a mano in otto viste diverse, tutte uguali. Aggiungere il capotasto in sette
 * su otto avrebbe lasciato in giro una schermata che ascolta le frequenze sbagliate —
 * cioè che dice "manca la 4ª corda" a chi sta suonando benissimo, e senza nessun errore
 * visibile da nessuna parte. È lo stesso difetto della finestra di analisi, e la cura è
 * la stessa: un posto solo che lo sa fare.
 *
 * Il capotasto alza tutto di N semitoni: la 6ª corda a vuoto col capotasto al 2° non è
 * più un Mi ma un Fa♯. Le FORME non cambiano — è tutto il punto del capotasto — cambia
 * quello che esce.
 */
export function frequenzeDi(tasti, tun, capotasto = 0, la4 = 440) {
  return tasti.map((t, i) => (t < 0 ? null : hzDaMidi(tun.corde[i].midi + capotasto + t, la4)));
}

/**
 * Come si chiama DAVVERO l'accordo che stai suonando, capotasto compreso.
 *
 * Sta qui accanto a `frequenzeDi` perché è la stessa domanda posta in un altro modo, e
 * perché dimenticarla è già costato: le frequenze erano state spostate col capotasto, le
 * CLASSI DI ALTEZZA ammesse no — quelle si ricavano dal nome, e il nome non era stato
 * trasposto. Risultato misurato: con il capotasto al 2° l'energia su note "estranee"
 * andava a 1,00 su ogni accordo suonato bene, cioè il giro a tuo tempo non sarebbe mai
 * avanzato. Le frequenze giuste non bastano se il nome resta quello della forma.
 */
export function nomeSuonato(nomeAccordo, capotasto = 0) {
  return capotasto ? trasponi(nomeAccordo, capotasto) : nomeAccordo;
}

export const PER_ID = new Map(ACCORDATURE.map((a) => [a.id, a]));

export function accordatura(id) {
  return PER_ID.get(id) || ACCORDATURE[0];
}

/** L'accordatura per cui sono scritti i diagrammi: le altre sono per accordare e basta. */
export const ID_DIAGRAMMI = 'eadgbe';
