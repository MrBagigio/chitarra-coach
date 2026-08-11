// L'unico disegno dell'app, e il suo marchio.
//
// Serviva qualcosa che dicesse "questo è un posto dove si suona la chitarra" senza
// scaricare un'immagine: è tutto SVG, nasce dai colori del tema e cambia con esso.
//
// Le proporzioni non sono quelle dell'ukulele rimpicciolite. Su una chitarra il manico è
// lungo quasi quanto la cassa, il lobo inferiore è molto più largo di quello superiore e
// la vita è stretta; la paletta porta sei chiavi, tre per lato. Cambiare solo il numero
// delle corde su una sagoma da ukulele darebbe un ukulele con sei corde, che è
// esattamente la cosa che si riconosce come sbagliata senza saper dire perché.

const NS = 'http://www.w3.org/2000/svg';

function el(nome, attrs = {}) {
  const n = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

/**
 * Chitarra acustica di tre quarti, in linea, con le corde che vibrano se glielo si chiede.
 * @param {{vibra?:boolean, altezza?:number}} opt
 */
export function chitarraDisegnata({ vibra = false, altezza = 132 } = {}) {
  const svg = el('svg', {
    viewBox: '0 0 120 210',
    class: `illustrazione${vibra ? ' vibra' : ''}`,
    role: 'img',
    'aria-label': 'Una chitarra acustica',
  });
  svg.style.height = `${altezza}px`;

  // Cassa: UN profilo solo, non due cerchi.
  //
  // La prima versione erano due archi tangenti, come sull'ukulele. Su un ukulele funziona
  // — la cassa è davvero quasi un otto — ma su una chitarra si legge come un pupazzo di
  // neve: due palle attaccate in un punto. Nessuna misura se ne accorge, si vede e basta.
  //
  // Le proporzioni sono quelle vere di una dreadnought, e sorprendono: lobo inferiore 39
  // cm, vita 28, lobo superiore 29. La vita è larga quasi quanto la spalla — è per questo
  // che una chitarra ha un profilo continuo e non una strozzatura. Qui, in unità del
  // disegno: 34 · 21 · 26 di semilarghezza.
  svg.appendChild(el('path', {
    class: 'ill-cassa',
    d: 'M60 82C74 82 86 92 86 106C86 120 81 126 81 138C81 150 94 152 94 168'
       + 'C94 190 79 204 60 204C41 204 26 190 26 168C26 152 39 150 39 138'
       + 'C39 126 34 120 34 106C34 92 46 82 60 82Z',
  }));
  // La buca sta SOTTO la vita, in cima al lobo grande. Messa sopra — dove finisce
  // copiando le coordinate da un ukulele — la chitarra diventa un liuto.
  svg.appendChild(el('circle', { class: 'ill-buca', cx: 60, cy: 152, r: 12 }));
  svg.appendChild(el('rect', { class: 'ill-ponte', x: 44, y: 180, width: 32, height: 6, rx: 3 }));

  // Manico lungo e paletta con sei chiavi, tre per lato.
  svg.appendChild(el('rect', { class: 'ill-manico', x: 51, y: 16, width: 18, height: 76, rx: 3 }));
  svg.appendChild(el('rect', { class: 'ill-paletta', x: 46, y: 4, width: 28, height: 18, rx: 5 }));
  [30, 42, 54, 66, 78].forEach((y) => {
    svg.appendChild(el('line', { class: 'ill-tasto', x1: 51, y1: y, x2: 69, y2: y }));
  });
  [[43, 8], [43, 14], [43, 20], [77, 8], [77, 14], [77, 20]].forEach(([cx, cy]) => {
    svg.appendChild(el('circle', { class: 'ill-chiave', cx, cy, r: 2.4 }));
  });

  // Sei corde, dalla paletta al ponticello, con un ritardo diverso l'una dall'altra
  [53, 55.8, 58.6, 61.4, 64.2, 67].forEach((x, i) => {
    const corda = el('line', { class: 'ill-corda', x1: x, y1: 12, x2: x, y2: 183 });
    corda.style.setProperty('--ritardo', `${i * 0.07}s`);
    svg.appendChild(corda);
  });

  return svg;
}

/**
 * Il marchio: il nome disegnato, non scritto col carattere di sistema.
 *
 * È il posto dove un carattere proprio conta davvero — due parole in cima alla pagina —
 * e l'unico che si può fare senza spedire un file di font da cinquanta chilobyte.
 */
export function marchio() {
  const svg = el('svg', { viewBox: '0 0 260 46', class: 'marchio', role: 'img', 'aria-label': 'Chitarra Coach' });
  const g = el('g', { class: 'mar-testo' });
  const testo = el('text', { x: 44, y: 26, class: 'mar-nome' });
  testo.textContent = 'Chitarra';
  const sotto = el('text', { x: 44, y: 40, class: 'mar-sotto' });
  sotto.textContent = 'COACH';
  g.appendChild(testo);
  g.appendChild(sotto);

  // Piccola cassa a sinistra: lo stesso profilo dell'illustrazione, in miniatura —
  // compreso il lobo di sotto più largo di quello di sopra, che è quello che la fa
  // leggere come una chitarra e non come un ukulele ingrandito.
  svg.appendChild(el('path', {
    class: 'mar-corpo',
    d: 'M20 3C24.8 3 28.9 6.4 28.9 11.3C28.9 16.1 27.2 18.2 27.2 22.3'
       + 'C27.2 26.4 31.7 27.1 31.7 32.6C31.7 40.2 26.5 45 20 45'
       + 'C13.5 45 8.3 40.2 8.3 32.6C8.3 27.1 12.8 26.4 12.8 22.3'
       + 'C12.8 18.2 11.1 16.1 11.1 11.3C11.1 6.4 15.2 3 20 3Z',
  }));
  svg.appendChild(el('circle', { class: 'mar-buca', cx: 20, cy: 27, r: 4 }));
  svg.appendChild(g);
  return svg;
}
