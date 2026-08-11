// Il manico intero: dove sono le note.
//
// Serve a rispondere a una domanda che i diagrammi non affrontano mai — "perché proprio
// lì?" — e a rendere visibile che un accordo è una forma spostabile, non una posizione
// da imparare a memoria.

import { aggiungi, h, scheda, titoloPagina } from '../ui.js';
import * as store from '../store.js';
import { ACCORDI, accordo, etichettaAccordo, nomeCanonico } from '../chords.js';
import { accordatura } from '../tunings.js';
import { NOMI, SCALE, nomeClasse, classiAttese, accordiDellaTonalita } from '../theory.js';

const NS = 'http://www.w3.org/2000/svg';
const TASTI = 12;
const SEGNI = [3, 5, 7, 10, 12];

function el(nome, attrs = {}) {
  const n = document.createElementNS(NS, nome);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
}

export function monta(radice, ctx) {
  const d = store.dati();
  const tun = accordatura(d.accordatura);

  let modo = 'scala';
  let tonica = 0;                 // Do
  let scala = 'maggiore';
  let idAccordo = 'C';

  const tela = h('div', { class: 'manico-box' });
  const legenda = h('div', { class: 'legenda' });
  const gradi = h('div', { class: 'gradi' });

  const selModo = h('select', {
    class: 'campo', 'aria-label': 'Cosa mostrare',
    onchange: (e) => { modo = e.target.value; aggiornaComandi(); disegna(); },
  },
    h('option', { value: 'scala', testo: 'Una scala' }),
    h('option', { value: 'accordo', testo: 'Le note di un accordo' }),
    h('option', { value: 'tutte', testo: 'Tutte le note' }));

  const selTonica = h('select', {
    class: 'campo', 'aria-label': 'Nota di partenza',
    onchange: (e) => { tonica = Number(e.target.value); disegna(); },
  }, ...NOMI.map((n, i) => h('option', { value: i, selected: i === tonica, testo: n })));

  const selScala = h('select', {
    class: 'campo', 'aria-label': 'Tipo di scala',
    onchange: (e) => { scala = e.target.value; disegna(); },
  }, ...Object.entries(SCALE).map(([k, v]) => h('option', { value: k, selected: k === scala, testo: v.nome })));

  const selAccordo = h('select', {
    class: 'campo', 'aria-label': 'Accordo',
    onchange: (e) => { idAccordo = e.target.value; disegna(); },
  }, ...[...new Set(ACCORDI.filter((a) => !a.posizione).map((a) => nomeCanonico(a)))]
    .map((n) => h('option', { value: n, selected: n === idAccordo, testo: n })));

  const rigaScala = h('div', { class: 'riga-campi' }, selTonica, selScala);
  const rigaAccordo = h('div', { class: 'riga-campi nascosto' }, selAccordo);

  function aggiornaComandi() {
    rigaScala.classList.toggle('nascosto', modo !== 'scala');
    rigaAccordo.classList.toggle('nascosto', modo !== 'accordo');
  }

  aggiungi(radice, 
    titoloPagina('Manico', `${TASTI} tasti, accordatura ${tun.nome}. Le note sono queste, sempre.`),
    scheda(selModo, rigaScala, rigaAccordo),
    scheda(tela, legenda),
    gradi,
    scheda(h('p', { class: 'dim piccolo', testo: 'I pallini sul bordo (3, 5, 7, 10, 12) sono i segni che trovi anche sul manico vero. Al 12° tasto le note ricominciano da capo un\'ottava sopra: è il punto in cui la corda è divisa a metà.' })),
  );
  aggiornaComandi();

  function insiemeAttivo() {
    if (modo === 'tutte') return { classi: new Set(NOMI.map((_, i) => i)), radice: null, gradiMap: new Map() };
    if (modo === 'accordo') {
      const a = classiAttese(idAccordo);
      const s = a?.scomposto;
      const g = new Map();
      if (s) s.intervalli.forEach((iv) => g.set((s.fondamentale + iv) % 12, nomeGrado(iv)));
      return { classi: new Set(a ? a.ammesse : []), radice: s ? s.fondamentale : null, gradiMap: g };
    }
    const gr = SCALE[scala].gradi;
    const g = new Map();
    gr.forEach((iv, i) => g.set((tonica + iv) % 12, String(i + 1)));
    return { classi: new Set(gr.map((iv) => (tonica + iv) % 12)), radice: tonica, gradiMap: g };
  }

  function nomeGrado(intervallo) {
    return ({
      0: 'F', 2: '9', 3: '3m', 4: '3', 5: '4', 6: '5♭', 7: '5', 8: '5♯', 9: '6', 10: '7', 11: '7+',
    })[intervallo] || String(intervallo);
  }

  function disegna() {
    const { classi, radice: pcRadice, gradiMap } = insiemeAttivo();
    const L = 44;      // larghezza di un tasto
    const H = 30;      // distanza fra le corde
    const padX = 26;
    const padY = 22;
    // Quante corde ha lo strumento si legge dall'ACCORDATURA, non si scrive a mano.
    // Erano quattro scritte a mano in tre punti, ereditate dall'ukulele: il manico
    // dichiarava "accordatura Standard EADGBE" e ne disegnava quattro, saltando la 2ª e
    // la 1ª — cioè proprio le due corde su cui si suona la melodia. La pagina si
    // disegnava senza errori, quindi nessun controllo automatico se n'era accorto: si
    // vedeva solo guardandola.
    const nCorde = tun.corde.length;

    /**
     * Il capotasto mobile sul manico, e la cosa che avevo capito male.
     *
     * Avevo detto che con il capotasto il manico mostra le note sbagliate. Non e' vero, e
     * vale la pena scriverlo: un capotasto NON cambia l'altezza di una nota premuta sopra
     * di lui. Il 5° tasto della 6ª corda e' un La con il capotasto e senza. Quello che
     * cambia e' altro, e sono due cose:
     *
     *   la corda "a vuoto" non e' piu' a vuoto: suona il tasto dove sta il capotasto;
     *   i tasti sotto il capotasto non esistono piu', non ci arrivi.
     *
     * Quindi i nomi delle note restano tutti giusti: manca solo dire dove sta il
     * capotasto e spegnere quello che c'e' sotto.
     */
    const capo = d.capotasto || 0;
    // Quale tasto suona davvero la colonna `t`: la colonna 0 e' la corda "a vuoto", che
    // con il capotasto messo suona il tasto del capotasto.
    const tastoSuonante = (t) => (t === 0 ? capo : t);
    const raggiungibile = (t) => t === 0 || t >= capo;
    const ultima = nCorde - 1;
    const larghezza = padX + L * (TASTI + 1) + 12;
    const altezza = padY * 2 + H * ultima;

    const svg = el('svg', {
      viewBox: `0 0 ${larghezza} ${altezza}`,
      class: 'manico',
      role: 'img',
      'aria-label': 'Diagramma del manico',
    });
    svg.style.minWidth = `${larghezza * 0.62}px`;

    const x = (tasto) => padX + L * tasto + L / 2;
    const y = (corda) => padY + H * corda;

    // capotasto + barrette
    svg.appendChild(el('rect', { x: padX - 4, y: padY - 8, width: 5, height: H * ultima + 16, class: 'm-capotasto' }));
    for (let t = 1; t <= TASTI; t += 1) {
      svg.appendChild(el('line', { x1: padX + L * t, y1: padY - 8, x2: padX + L * t, y2: padY + H * ultima + 8, class: 'm-tasto' }));
    }
    SEGNI.forEach((t) => {
      const cy = padY + H * (ultima / 2);
      if (t === 12) {
        svg.appendChild(el('circle', { cx: x(t), cy: cy - 12, r: 3.4, class: 'm-segno' }));
        svg.appendChild(el('circle', { cx: x(t), cy: cy + 12, r: 3.4, class: 'm-segno' }));
      } else {
        svg.appendChild(el('circle', { cx: x(t), cy, r: 3.6, class: 'm-segno' }));
      }
    });
    for (let c = 0; c < nCorde; c += 1) {
      svg.appendChild(el('line', { x1: padX - 2, y1: y(c), x2: padX + L * (TASTI + 1), y2: y(c), class: 'm-corda' }));
      const et = el('text', { x: 10, y: y(c) + 4, class: 'm-etichetta' });
      // L'etichetta viene dall'ACCORDATURA scelta, non dalla costante GCEA: con il
      // baritono le note disegnate erano quelle giuste (D G B E) ma di fianco c'era
      // scritto G C E A, e un manico che contraddice sé stesso è peggio di niente.
      et.textContent = tun.corde[c].etichetta;
      svg.appendChild(et);
    }
    // La zona che il capotasto rende irraggiungibile, e il capotasto stesso.
    if (capo > 0) {
      svg.appendChild(el('rect', {
        x: padX, y: padY - 10, width: L * capo, height: H * ultima + 20, class: 'm-spenta',
      }));
      svg.appendChild(el('rect', {
        x: padX + L * capo - 4, y: padY - 10, width: 6, height: H * ultima + 20,
        rx: 3, class: 'm-capotasto-mobile',
      }));
    }

    for (let t = 0; t <= TASTI; t += 1) {
      const n = el('text', { x: x(t), y: altezza - 4, class: 'm-numero' });
      n.textContent = String(t);
      svg.appendChild(n);
    }

    for (let c = 0; c < nCorde; c += 1) {
      for (let t = 0; t <= TASTI; t += 1) {
        if (!raggiungibile(t)) continue;              // sotto il capotasto non ci arrivi
        const pc = (tun.corde[c].midi + tastoSuonante(t)) % 12;
        if (!classi.has(pc)) continue;
        const gruppo = el('g', { class: `m-nota${pc === pcRadice ? ' radice' : ''}` });
        gruppo.appendChild(el('circle', { cx: x(t), cy: y(c), r: 11 }));
        const testo = el('text', { x: x(t), y: y(c) + 4 });
        testo.textContent = modo === 'tutte' ? nomeClasse(pc) : (gradiMap.get(pc) || nomeClasse(pc));
        gruppo.appendChild(testo);
        svg.appendChild(gruppo);
      }
    }

    tela.replaceChildren(svg);

    if (modo === 'scala') {
      const acc = accordiDellaTonalita(tonica);
      legenda.replaceChildren(h('p', { class: 'dim piccolo', testo: 'Il numero dentro il pallino è il grado della scala: 1 è la nota di partenza.' }));
      gradi.replaceChildren(scheda(
        h('p', { class: 'occhiello', testo: `Gli accordi della tonalità di ${nomeClasse(tonica)}` }),
        h('div', { class: 'fila-gradi' }, ...acc.map((g) => {
          const a = accordo(g.nome);
          return h(a ? 'a' : 'div', {
            class: `grado${a ? '' : ' assente'}`,
            href: a ? `#/libreria/${encodeURIComponent(a.id)}` : null,
          }, h('small', { testo: g.grado }), h('strong', { testo: g.nome }));
        })),
        h('p', { class: 'dim piccolo', testo: 'Questi sette accordi bastano per quasi tutte le canzoni in questa tonalità. I quattro più usati sono I, IV, V e vi.' }),
      ));
    } else if (modo === 'accordo') {
      const a = accordo(idAccordo);
      legenda.replaceChildren(h('p', { class: 'dim piccolo', testo: 'F = fondamentale, 3 = terza, 5 = quinta, 7 = settima. Ovunque trovi queste note stai suonando questo accordo: le posizioni comode sono solo quelle in cui ci arrivano le dita.' }));
      gradi.replaceChildren(a ? scheda(
        h('p', { class: 'occhiello', testo: 'La posizione che userai' }),
        h('a', { class: 'bottone sottile', href: `#/libreria/${encodeURIComponent(a.id)}`, testo: `Vai a ${etichettaAccordo(a)}` }),
      ) : null);
    } else {
      legenda.replaceChildren(h('p', { class: 'dim piccolo', testo: 'Tutte le note del manico. Le stesse sette lettere che si ripetono ogni dodici tasti.' }));
      gradi.replaceChildren();
    }
  }

  disegna();
  return null;
}
