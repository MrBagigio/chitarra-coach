// Icone dell'app: SVG inline a tratto, tutte nello stesso stile e nel colore corrente.
//
// Prima qui c'erano le emoji. Sembrano gratis e non lo sono: il telefono le disegna con
// la SUA tavolozza — 🎸 esce rosa, 🔁 blu, 👂 rosa carne — e in una schermata costruita
// su due colori caldi diventano adesivi appiccicati sopra. Un set disegnato a mano costa
// venti righe e tiene insieme tutto lo schermo.
//
// Griglia 24×24, tratto 1.7, estremi arrotondati: le stesse regole per tutte, altrimenti
// non sono un set ma una collezione.

const NS = 'http://www.w3.org/2000/svg';

const TRACCE = {
  // ── sezioni ────────────────────────────────────────────────────────────────
  casa: 'M3 11.2 12 4l9 7.2V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  diapason: 'M8.5 3v6.5a3.5 3.5 0 0 0 7 0V3M12 13.2V21',
  microfono: 'M12 3a2.6 2.6 0 0 1 2.6 2.6v5.6a2.6 2.6 0 0 1-5.2 0V5.6A2.6 2.6 0 0 1 12 3M5.8 11.2a6.2 6.2 0 0 0 12.4 0M12 17.4V21M9 21h6',
  scala: 'M3 20h4v-4.5h4.5V11h4.5V6.5H21',
  manico: 'M6.5 3h11v18h-11zM6.5 8.2h11M6.5 13h11M6.5 17.6h11M10.2 3v18M13.8 3v18',
  cursori: 'M4 7.5h9M17 7.5h3M4 16.5h3M11 16.5h9',
  cursoriPunti: 'M15 7.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0M7 16.5a2 2 0 1 0 4 0 2 2 0 1 0-4 0',

  // ── tipi di passo ──────────────────────────────────────────────────────────
  mirino: 'M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2',
  mirinoCerchi: 'M4.8 12a7.2 7.2 0 1 0 14.4 0 7.2 7.2 0 1 0-14.4 0M9.4 12a2.6 2.6 0 1 0 5.2 0 2.6 2.6 0 1 0-5.2 0',
  libro: 'M4 5.2A2.2 2.2 0 0 1 6.2 3H11v18H6.2A2.2 2.2 0 0 1 4 18.8zM20 5.2A2.2 2.2 0 0 0 17.8 3H13v18h4.8a2.2 2.2 0 0 0 2.2-2.2z',
  dita: 'M5 4h14M5 4v16M9.7 4v16M14.3 4v16M19 4v16M5 9.4h14M5 14.8h14',
  ditaPunto: 'M12 12.1a2.4 2.4 0 1 0 4.8 0 2.4 2.4 0 1 0-4.8 0',
  // "Verifica" è un'onda, non un orecchio: a 22 pixel il padiglione auricolare diventa
  // uno scarabocchio, mentre cinque barre di altezza diversa si leggono anche piccole
  // e dicono la cosa giusta — un suono che viene misurato.
  orecchio: 'M3.5 10.4v3.2M7.7 7.2v9.6M12 4.4v15.2M16.3 8.6v6.8M20.5 10.8v2.4',
  cuffie: 'M4 14.2v-2.2a8 8 0 0 1 16 0v2.2M4.2 14a2 2 0 0 1 2 2v2.2a2 2 0 0 1-4 0V16a2 2 0 0 1 2-2M19.8 14a2 2 0 0 1 2 2v2.2a2 2 0 0 1-4 0V16a2 2 0 0 1 2-2',
  cambio: 'M4 9.5A8 8 0 0 1 17.6 5.2L20 7.4M20 3v4.4h-4.4M20 14.5A8 8 0 0 1 6.4 18.8L4 16.6M4 21v-4.4h4.4',
  metronomo: 'M10 3.4h4l4.2 17.2H5.8zM7.6 15h8.8M12 6.4 8.4 15',
  nota: 'M9.4 17.6V5.2l9.2-2v11.6M9.4 17.6a2.7 2.7 0 1 1-2.7-2.7 2.7 2.7 0 0 1 2.7 2.7M18.6 14.8a2.7 2.7 0 1 1-2.7-2.7 2.7 2.7 0 0 1 2.7 2.7',
  spunta: 'M4.5 12.6 9.4 17.5 19.5 6.6',
  prova: 'M9.5 3v6.4L4.8 18a2.2 2.2 0 0 0 1.9 3.3h10.6a2.2 2.2 0 0 0 1.9-3.3L14.5 9.4V3M8.5 3h7M8 14.5h8',
  salvataggio: 'M12 3v11M8 10.5l4 3.5 4-3.5M4.5 17.5v1.8A1.7 1.7 0 0 0 6.2 21h11.6a1.7 1.7 0 0 0 1.7-1.7v-1.8',
  spartito: 'M4.5 4.2h15v15.6h-15zM8 8.2h8M8 12h8M8 15.8h5',
  ripasso: 'M4 12a8 8 0 1 0 2.4-5.7M4 3.4V8h4.6M12 7.6V12l3 1.8',
};

/** Nomi composti: alcune icone sono fatte di due tracce, per non riempirle di curve. */
const COMPOSTE = {
  mirino: ['mirino', 'mirinoCerchi'],
  dita: ['dita', 'ditaPunto'],
  cursori: ['cursori', 'cursoriPunti'],
};

/**
 * @param {string} nome chiave in TRACCE o COMPOSTE
 * @param {{classe?:string, riempi?:boolean}} opt
 * @returns {SVGElement}
 */
export function icona(nome, opt = {}) {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', `icona${opt.classe ? ` ${opt.classe}` : ''}`);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const parti = COMPOSTE[nome] || [nome];
  parti.forEach((p, i) => {
    const d = TRACCE[p];
    if (!d) return;
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', d);
    // La seconda traccia delle composte è il "pieno": il pallino del dito, il centro del
    // mirino, i pomelli dei cursori. Riempirla la distingue senza aggiungere un colore.
    if (i > 0 && COMPOSTE[nome]) path.setAttribute('class', 'piena');
    svg.appendChild(path);
  });
  return svg;
}

/** L'icona giusta per un tipo di passo del percorso. */
export const ICONA_PASSO = {
  accordatura: 'mirino',
  lettura: 'libro',
  accordo: 'dita',
  ascolta: 'orecchio',
  orecchio: 'cuffie',
  cambio: 'cambio',
  ritmo: 'metronomo',
  giro: 'nota',
};
