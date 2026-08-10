// Piccoli aiuti per costruire il DOM senza framework. Niente innerHTML con dati
// variabili: il testo passa sempre da textContent.

export function h(tag, attrs = {}, ...figli) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') n.className = v;
    else if (k === 'testo') n.textContent = v;
    else if (k === 'html') n.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (k === 'dati') Object.assign(n.dataset, v);
    else n.setAttribute(k, String(v));
  }
  figli.flat(9).forEach((f) => {
    if (f === null || f === undefined || f === false) return;
    n.appendChild(typeof f === 'object' ? f : document.createTextNode(String(f)));
  });
  return n;
}

/**
 * Aggiunge figli a un nodo saltando quelli assenti.
 *
 * `Element.append(null)` NON ignora il null: lo converte nella stringa "null" e te la
 * stampa in pagina. Con lo schema `condizione ? scheda(...) : null` — che è ovunque qui
 * dentro — significa la parola "null" sopra il titolo, e non se ne accorge nessun
 * controllo sul testo perché sono quattro caratteri in mezzo a mille.
 */
export function aggiungi(nodo, ...figli) {
  figli.flat(9).forEach((f) => {
    if (f === null || f === undefined || f === false || f === '') return;
    nodo.append(f);
  });
  return nodo;
}

export const scheda = (...figli) => h('section', { class: 'scheda' }, ...figli);

export const titoloPagina = (titolo, sottotitolo) => h('header', { class: 'testa-pagina' },
  h('h1', { testo: titolo }),
  sottotitolo ? h('p', { class: 'dim', testo: sottotitolo }) : null);

export const indietro = (hash, etichetta = 'Indietro') => h('a', { class: 'indietro', href: hash },
  h('span', { 'aria-hidden': 'true', testo: '‹' }), etichetta);

/**
 * Frecce per passare al precedente e al successivo senza uscire dalla scheda.
 *
 * Senza, per vedere l'accordo dopo bisogna tornare all'elenco, cercarlo e rientrare:
 * tre tocchi per un movimento che ne vuole uno. Vale ovunque ci sia un elemento dentro
 * una sequenza — accordi, passi del percorso, posizioni.
 *
 * @param {{href:string, etichetta:string}|null} prec
 * @param {{href:string, etichetta:string}|null} succ
 * @param {string} [contesto] dove ti trovi, es. "12 di 85"
 */
export function frecce(prec, succ, contesto = '', { tastiera = true } = {}) {
  const vai = (dove) => (dove ? h('a', {
    class: 'freccia',
    href: dove.href,
    'aria-label': dove.etichetta,
    title: dove.etichetta,
  }, h('span', { class: 'fr-segno', 'aria-hidden': 'true', testo: dove === prec ? '‹' : '›' }),
    h('span', { class: 'fr-nome', testo: dove.etichetta }))
    : h('span', { class: 'freccia vuota', 'aria-hidden': 'true' }));

  const box = h('nav', { class: 'frecce', 'aria-label': 'Scorri' },
    vai(prec),
    contesto ? h('span', { class: 'fr-contesto', testo: contesto }) : null,
    vai(succ));

  // Sul telefono si tocca, sul computer si usano le frecce della tastiera. Il legame
  // con la tastiera lo prende UNA sola coppia di frecce per schermata: se la stessa
  // schermata ne mostra due (in cima e in fondo), la seconda è solo da toccare —
  // altrimenti un tasto premuto navigherebbe due volte.
  box.smonta = () => {};
  if (tastiera) {
    const suTasto = (e) => {
      // `e.target` può non essere un Elemento (eventi sintetici, o la finestra stessa):
      // chiamare `.matches` a vuoto uccideva il gestore in silenzio e le frecce
      // smettevano di rispondere senza nessun errore visibile.
      const t = e.target;
      if (t && typeof t.matches === 'function' && t.matches('input, textarea, select')) return;
      if (e.key === 'ArrowLeft' && prec) window.location.hash = prec.href;
      if (e.key === 'ArrowRight' && succ) window.location.hash = succ.href;
    };
    window.addEventListener('keydown', suTasto);
    box.smonta = () => window.removeEventListener('keydown', suTasto);
  }
  return box;
}

export function bottone(etichetta, onclick, opzioni = {}) {
  return h('button', {
    class: `bottone${opzioni.classe ? ` ${opzioni.classe}` : ''}`,
    type: 'button',
    onclick,
    disabled: opzioni.disabilitato || false,
    testo: etichetta,
  });
}

export function anello(quota, etichetta, sotto) {
  const r = 46;
  const circonferenza = 2 * Math.PI * r;
  const q = Math.max(0, Math.min(1, quota));
  const svg = `
    <svg viewBox="0 0 110 110" class="anello" aria-hidden="true">
      <circle cx="55" cy="55" r="${r}" class="an-sfondo"/>
      <circle cx="55" cy="55" r="${r}" class="an-arco"
        stroke-dasharray="${circonferenza.toFixed(1)}"
        stroke-dashoffset="${(circonferenza * (1 - q)).toFixed(1)}"/>
    </svg>`;
  return h('div', { class: 'anello-box' },
    h('div', { class: 'anello-wrap', html: svg },
      h('div', { class: 'anello-testo' },
        h('strong', { testo: etichetta }),
        sotto ? h('small', { testo: sotto }) : null)));
}

/** Barra di avanzamento con etichetta accessibile. */
export function barra(quota, etichetta) {
  const q = Math.max(0, Math.min(1, quota));
  return h('div', {
    class: 'barra',
    role: 'progressbar',
    'aria-valuenow': Math.round(q * 100),
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-label': etichetta || 'avanzamento',
  }, h('span', { style: `width:${(q * 100).toFixed(1)}%` }));
}

export const plurale = (n, uno, molti) => `${n} ${n === 1 ? uno : molti}`;
