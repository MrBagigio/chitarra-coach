// Accordature. `midi` in ordine di corda come le vedi sul manico (dalla più acuta
// alla più grave in altezza NON è garantito: sull'ukulele standard la G è più acuta
// della C — è la famosa "reentrant tuning", e non è un errore di battitura).

export const ACCORDATURE = [
  {
    id: 'gcea',
    nome: 'Standard GCEA',
    dettaglio: 'Soprano, concert, tenor — la G è più acuta della C',
    corde: [
      { etichetta: 'G', midi: 67 },
      { etichetta: 'C', midi: 60 },
      { etichetta: 'E', midi: 64 },
      { etichetta: 'A', midi: 69 },
    ],
  },
  {
    id: 'lowg',
    nome: 'Low-G',
    dettaglio: 'Come la standard ma con la G un\'ottava sotto',
    corde: [
      { etichetta: 'G', midi: 55 },
      { etichetta: 'C', midi: 60 },
      { etichetta: 'E', midi: 64 },
      { etichetta: 'A', midi: 69 },
    ],
  },
  {
    id: 'dgbe',
    nome: 'Baritono DGBE',
    dettaglio: 'Le quattro corde acute della chitarra — i diagrammi qui NON valgono',
    corde: [
      { etichetta: 'D', midi: 50 },
      { etichetta: 'G', midi: 55 },
      { etichetta: 'B', midi: 59 },
      { etichetta: 'E', midi: 64 },
    ],
  },
  {
    id: 'adfsb',
    nome: 'Accordatura in Re (ADF#B)',
    dettaglio: 'Un tono sopra la standard, suono più brillante',
    corde: [
      { etichetta: 'A', midi: 69 },
      { etichetta: 'D', midi: 62 },
      { etichetta: 'F#', midi: 66 },
      { etichetta: 'B', midi: 71 },
    ],
  },
];

export const PER_ID = new Map(ACCORDATURE.map((a) => [a.id, a]));

export function accordatura(id) {
  return PER_ID.get(id) || ACCORDATURE[0];
}
