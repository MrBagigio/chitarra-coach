// L'unico disegno dell'app, e il suo marchio.
//
// Serviva qualcosa che dicesse "questo è un posto dove si suona l'ukulele" senza
// scaricare un'immagine: è tutto SVG, nasce dai colori del tema e cambia con esso.
// La sagoma è quella vera — due lobi, la vita stretta, il manico lungo quanto la cassa —
// perché un ukulele disegnato male si riconosce peggio di uno non disegnato.

const NS = 'http://www.w3.org/2000/svg';

function el(nome, attrs = {}) {
  const n = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

/**
 * Ukulele di tre quarti, in linea, con le corde che vibrano se glielo si chiede.
 * @param {{vibra?:boolean, altezza?:number}} opt
 */
export function ukuleleDisegnato({ vibra = false, altezza = 132 } = {}) {
  const svg = el('svg', {
    viewBox: '0 0 120 210',
    class: `illustrazione${vibra ? ' vibra' : ''}`,
    role: 'img',
    'aria-label': 'Un ukulele',
  });
  svg.style.height = `${altezza}px`;

  // Cassa: due archi che si toccano nella vita. Un solo cerchio darebbe un banjo.
  svg.appendChild(el('path', {
    class: 'ill-cassa',
    d: 'M60 96c-19 0-31 13-31 30 0 22 15 40 31 40s31-18 31-40c0-17-12-30-31-30z'
       + 'M60 96c-15 0-25-10-25-22 0-14 11-24 25-24s25 10 25 24c0 12-10 22-25 22z',
  }));
  svg.appendChild(el('circle', { class: 'ill-buca', cx: 60, cy: 112, r: 11 }));
  svg.appendChild(el('rect', { class: 'ill-ponte', x: 47, y: 140, width: 26, height: 6, rx: 3 }));

  // Manico e paletta
  svg.appendChild(el('rect', { class: 'ill-manico', x: 52, y: 16, width: 16, height: 62, rx: 3 }));
  svg.appendChild(el('rect', { class: 'ill-paletta', x: 47, y: 6, width: 26, height: 16, rx: 5 }));
  [30, 42, 54, 66].forEach((y) => {
    svg.appendChild(el('line', { class: 'ill-tasto', x1: 52, y1: y, x2: 68, y2: y }));
  });
  [[51, 11], [69, 11], [51, 18], [69, 18]].forEach(([cx, cy]) => {
    svg.appendChild(el('circle', { class: 'ill-chiave', cx, cy, r: 2.6 }));
  });

  // Corde: dalla paletta al ponticello, con un ritardo diverso l'una dall'altra
  [54.5, 58, 62, 65.5].forEach((x, i) => {
    const corda = el('line', { class: 'ill-corda', x1: x, y1: 14, x2: x, y2: 143 });
    corda.style.setProperty('--ritardo', `${i * 0.09}s`);
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
  const svg = el('svg', { viewBox: '0 0 260 46', class: 'marchio', role: 'img', 'aria-label': 'Ukulele Coach' });
  const g = el('g', { class: 'mar-testo' });
  const testo = el('text', { x: 44, y: 26, class: 'mar-nome' });
  testo.textContent = 'Ukulele';
  const sotto = el('text', { x: 44, y: 40, class: 'mar-sotto' });
  sotto.textContent = 'COACH';
  g.appendChild(testo);
  g.appendChild(sotto);

  // Piccola cassa a sinistra: lo stesso profilo dell'illustrazione, in miniatura
  svg.appendChild(el('path', {
    class: 'mar-corpo',
    d: 'M20 20c-8 0-13 5.5-13 12.5S13 44 20 44s13-4.5 13-11.5S28 20 20 20z'
       + 'M20 20c-6 0-10-4-10-8.5S14 3 20 3s10 4 10 8.5S26 20 20 20z',
  }));
  svg.appendChild(el('circle', { class: 'mar-buca', cx: 20, cy: 30, r: 4.2 }));
  svg.appendChild(g);
  return svg;
}
