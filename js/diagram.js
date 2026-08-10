// Disegno del diagramma accordo in SVG.
//
// Convenzione: manico in verticale, corde da sinistra a destra E A D G B E (dalla 6ª alla
// 1ª), capotasto in alto. È la vista che hai guardando lo strumento di fronte — la stessa
// dei libri di accordi. Il diagramma si adatta: se l'accordo vive al 4° tasto la finestra
// scorre e lo dichiara ("4fr"), invece di disegnare quattro tasti vuoti.
//
// Il numero di corde si legge da `CORDE.length`, mai scritto a mano: questo file è lo
// stesso dell'ukulele a quattro corde, e deve restarlo.

import { CORDE, tastoMassimo, etichettaAccordo } from './chords.js';

const NS = 'http://www.w3.org/2000/svg';

function el(nome, attrs = {}) {
  const nodo = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attrs)) nodo.setAttribute(k, String(v));
  return nodo;
}

/**
 * @param {object} acc accordo da chords.js
 * @param {object} opt {tasti: quanti tasti mostrare, dita: mostrare i numeri, scala}
 * @returns {SVGElement}
 */
export function diagramma(acc, opt = {}) {
  const nTasti = opt.tasti ?? 4;
  const mostraDita = opt.dita ?? true;
  const max = tastoMassimo(acc);

  // Finestra: parte dal capotasto se possibile, altrimenti scorre per contenere l'accordo.
  const primo = max > nTasti ? Math.max(1, Math.min(...acc.tasti.filter((t) => t > 0))) : 1;
  const conCapotasto = primo === 1;

  // Il raggio del pallino si RICAVA dal passo delle corde, non si sceglie a parte.
  // Con passo 22 e raggio 9 due dita sullo stesso tasto lasciavano 4 pixel di aria e il
  // Sib diventava una macchia: il barré, due pallini e i numeri tutti addosso.
  const ultima = CORDE.length - 1;
  const L = 27;              // passo fra le corde
  const H = 30;              // passo fra i tasti
  const R = L * 0.34;        // raggio del pallino: ~34% del passo lascia respiro fra due dita
  const padX = 22;
  const padTop = 28;         // spazio per o/x sopra il capotasto
  const larghezza = padX * 2 + L * ultima;
  const altezza = padTop + H * nTasti + 26;

  const svg = el('svg', {
    viewBox: `0 0 ${larghezza} ${altezza}`,
    class: 'diagramma',
    role: 'img',
    'aria-label': `Diagramma di ${acc.nome}, ${acc.esteso}`,
  });

  const x = (i) => padX + i * L;
  const yTasto = (t) => padTop + (t - primo + 1) * H;   // linea inferiore del tasto t
  const yCentro = (t) => yTasto(t) - H / 2;

  // Capotasto (spesso) oppure barra di tasto normale in cima
  if (conCapotasto) {
    svg.appendChild(el('rect', {
      x: x(0) - 1, y: padTop - 5, width: L * ultima + 2, height: 5, rx: 1.5, class: 'd-capotasto',
    }));
  } else {
    svg.appendChild(el('line', {
      x1: x(0), y1: padTop, x2: x(ultima), y2: padTop, class: 'd-tasto',
    }));
    const et = el('text', { x: 6, y: yCentro(primo) + 4, class: 'd-posizione' });
    et.textContent = `${primo}fr`;
    svg.appendChild(et);
  }

  for (let t = 1; t <= nTasti; t += 1) {
    svg.appendChild(el('line', {
      x1: x(0), y1: padTop + t * H, x2: x(ultima), y2: padTop + t * H, class: 'd-tasto',
    }));
  }
  for (let i = 0; i < CORDE.length; i += 1) {
    svg.appendChild(el('line', {
      x1: x(i), y1: padTop, x2: x(i), y2: padTop + nTasti * H, class: 'd-corda',
    }));
  }

  // Barré: una capsula sotto i pallini, così si legge "un dito solo".
  // Il colore del dito si applica solo se i numeri sono visibili: senza numeri il
  // colore resterebbe l'unico portatore dell'informazione, e chi non lo distingue
  // perderebbe tutto invece di perdere una scorciatoia.
  const tinta = (dito) => (mostraDita && dito ? ` dito-${dito}` : '');

  const barrate = new Set();
  if (acc.barre && acc.barre.tasto >= primo && acc.barre.tasto < primo + nTasti) {
    const { tasto, da, a } = acc.barre;
    svg.appendChild(el('rect', {
      x: x(da) - R, y: yCentro(tasto) - R, width: (a - da) * L + R * 2, height: R * 2,
      rx: R, class: `d-barre${tinta(acc.dita?.[da] || 1)}`,
    }));
    // Le corde tenute dalla barra NON prendono anche il pallino: è un dito solo, e
    // disegnarne tre sopra la capsula fa una macchia che si legge come "tre dita".
    // Il numero va una volta sola, all'inizio della barra.
    for (let i = da; i <= a; i += 1) if (acc.tasti[i] === tasto) barrate.add(i);
    if (mostraDita) {
      const dito = acc.dita?.[da] || 1;
      const n = el('text', { x: x(da), y: yCentro(tasto) + 4.5, class: 'd-dito' });
      n.textContent = dito;
      svg.appendChild(n);
    }
  }

  acc.tasti.forEach((t, i) => {
    if (t < 0) {
      const x0 = x(i);
      const y0 = padTop - 12;
      svg.appendChild(el('path', {
        d: `M${x0 - 5} ${y0 - 5}L${x0 + 5} ${y0 + 5}M${x0 + 5} ${y0 - 5}L${x0 - 5} ${y0 + 5}`,
        class: 'd-muta',
      }));
      return;
    }
    if (t === 0) {
      svg.appendChild(el('circle', { cx: x(i), cy: padTop - 12, r: 5, class: 'd-vuota' }));
      return;
    }
    if (t < primo || t >= primo + nTasti) return;
    if (barrate.has(i)) return;                       // già coperta dalla capsula del barré
    svg.appendChild(el('circle', {
      cx: x(i), cy: yCentro(t), r: R, class: `d-punto${tinta(acc.dita?.[i])}`,
    }));
    if (mostraDita && acc.dita?.[i]) {
      const n = el('text', { x: x(i), y: yCentro(t) + 4.5, class: 'd-dito' });
      n.textContent = acc.dita[i];
      svg.appendChild(n);
    }
  });

  // Nomi delle corde sotto il manico
  CORDE.forEach((nome, i) => {
    const n = el('text', { x: x(i), y: padTop + nTasti * H + 18, class: 'd-corda-nome' });
    n.textContent = nome;
    svg.appendChild(n);
  });

  return svg;
}

export const NOMI_DITA = ['', 'indice', 'medio', 'anulare', 'mignolo'];

/**
 * La legenda dei colori. Va messa dove i colori compaiono per la prima volta, non
 * ovunque: una legenda ripetuta su ogni schermata è rumore, una assente è un enigma.
 * @param {number[]} soloQueste mostra solo le dita davvero usate dall'accordo
 */
export function legendaDita(soloQueste = null) {
  const box = document.createElement('div');
  box.className = 'legenda-dita';
  const dita = soloQueste && soloQueste.length
    ? [...new Set(soloQueste)].filter((n) => n >= 1 && n <= 4).sort((a, b) => a - b)
    : [1, 2, 3, 4];
  dita.forEach((n) => {
    const t = document.createElement('span');
    t.className = `tacca-dito d${n}`;
    const pallino = document.createElement('i');
    pallino.textContent = String(n);
    t.appendChild(pallino);
    t.appendChild(document.createTextNode(NOMI_DITA[n]));
    box.appendChild(t);
  });
  return box;
}

/** Scheda accordo compatta: diagramma + nome. Usata nelle griglie e nel drill. */
export function schedaAccordo(acc, opt = {}) {
  const box = document.createElement(opt.tag ?? 'div');
  box.className = `scheda-accordo${opt.classe ? ` ${opt.classe}` : ''}`;
  const testa = document.createElement('div');
  testa.className = 'sa-nome';
  testa.textContent = etichettaAccordo(acc);
  box.appendChild(testa);
  box.appendChild(diagramma(acc, opt));
  if (opt.sottotitolo !== false) {
    const sub = document.createElement('div');
    sub.className = 'sa-sub';
    sub.textContent = acc.esteso;
    box.appendChild(sub);
  }
  return box;
}
