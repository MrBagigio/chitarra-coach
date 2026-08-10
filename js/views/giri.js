// Costruttore di giri: scegli la tonalità, tocca i gradi, suona.
//
// È il ponte fra la teoria e le dita. Il percorso spiega che un giro è fatto di NUMERI
// (I–V–vi–IV) e non di nomi: qui quei numeri diventano bottoni, e cambiando tonalità la
// stessa sequenza si riscrive da sola. Chi ha capito il meccanismo lo vede muoversi.

import { aggiungi, h, scheda, titoloPagina, indietro, bottone } from '../ui.js';
import * as store from '../store.js';
import { accordo, etichettaAccordo } from '../chords.js';
import { diagramma } from '../diagram.js';
import { NOMI, nomeClasse, accordiDellaTonalita } from '../theory.js';
import { salvaBrano } from '../importa.js';
import { sblocca, suonaPennata } from '../audio.js';
import { accordatura } from '../tunings.js';
import { hzDaMidi } from '../pitch.js';
import { posizioniDi } from '../voicing.js';

// I gradi come li usa la musica popolare, non come li elenca un manuale.
const MODELLI = [
  { nome: 'Il giro dei quattro accordi', gradi: [0, 4, 5, 3], testo: 'I–V–vi–IV. Mezza classifica degli ultimi cinquant\'anni.' },
  { nome: 'Anni \'50', gradi: [0, 5, 3, 4], testo: 'I–vi–IV–V. Doo-wop e ballate.' },
  { nome: 'Ritornello pop', gradi: [5, 3, 0, 4], testo: 'vi–IV–I–V. Lo stesso giro che parte dal minore: suona più drammatico.' },
  { nome: 'Canone', gradi: [0, 4, 5, 2, 3, 0, 3, 4], testo: 'Pachelbel, e da allora non ha più smesso.' },
  { nome: 'ii–V–I', gradi: [1, 4, 0, 0], testo: 'Il giro del jazz: si passa la palla e chiude.' },
  { nome: 'Andaluso', gradi: [5, 4, 3, 4], testo: 'vi–V–IV–V: scende e resta in tensione.' },
  { nome: 'Blues di 12', gradi: [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4], testo: 'La forma più suonata del Novecento.' },
];

export function monta(radice, ctx) {
  const d = store.dati();
  const tun = accordatura(d.accordatura);

  let tonica = 0;
  let sequenza = [];          // indici di grado (0..6)
  let bpm = 76;
  let battiti = 4;
  let ottavaAlta = false;

  const gradiBox = h('div', { class: 'fila-gradi' });
  const sequenzaBox = h('div', { class: 'es-mappa statica' });
  const diagrammiBox = h('div', { class: 'fila-accordi' });
  const modelliBox = h('div', { class: 'chips' });
  const nota = h('p', { class: 'dim piccolo' });

  const selTonica = h('select', {
    class: 'campo', 'aria-label': 'Tonalità',
    onchange: (e) => { tonica = Number(e.target.value); disegna(); },
  }, ...NOMI.map((n, i) => h('option', { value: i, selected: i === tonica, testo: `Tonalità di ${n}` })));

  const selBattiti = h('select', {
    class: 'campo', 'aria-label': 'Metro',
    onchange: (e) => { battiti = Number(e.target.value); },
  },
    h('option', { value: '4', testo: 'Quattro quarti' }),
    h('option', { value: '3', testo: 'Tre quarti' }));

  const valoreBpm = h('strong', { class: 'es-bpm', testo: `${bpm} bpm` });
  const cursoreBpm = h('input', {
    type: 'range', min: 40, max: 160, step: 2, value: bpm, class: 'cursore', 'aria-label': 'Velocità',
    oninput: (e) => { bpm = Number(e.target.value); valoreBpm.textContent = `${bpm} bpm`; },
  });

  const interruttoreOttava = h('label', { class: 'opzione' },
    h('input', {
      type: 'checkbox',
      onchange: (e) => { ottavaAlta = e.target.checked; disegna(); },
    }),
    h('span', {}, 'Mostra le posizioni ', h('strong', { testo: 'un\'ottava sopra' })));

  aggiungi(radice,
    h('div', { class: 'testa-riga' }, indietro('#/libreria', 'Accordi')),
    titoloPagina('Costruisci un giro', 'Scegli la tonalità, tocca i gradi. Cambiando tonalità la sequenza si riscrive da sola: è quello che vuol dire "un giro è fatto di numeri".'),

    scheda(
      selTonica,
      h('p', { class: 'occhiello', testo: 'I sette accordi della tonalità' }),
      gradiBox,
      nota),

    scheda(
      h('p', { class: 'occhiello', testo: 'Giri già pronti' }),
      modelliBox),

    scheda(
      h('div', { class: 'riga-tra' },
        h('p', { class: 'occhiello', testo: 'Il tuo giro' }),
        bottone('Svuota', () => { sequenza = []; disegna(); }, { classe: 'sottile stretto' })),
      sequenzaBox,
      diagrammiBox,
      interruttoreOttava,
      h('div', { class: 'riga-campi' }, selBattiti),
      h('div', { class: 'riga-tra' }, h('span', { class: 'dim piccolo', testo: 'Velocità' }), valoreBpm),
      cursoreBpm,
      h('div', { class: 'es-duetto-bottoni' },
        bottone('Suona col metronomo', suona, { classe: 'grande' }),
        bottone('Ascolta', anteprima, { classe: 'sottile' })),
      bottone('Suonalo a tuo tempo (senza metronomo)', () => suona(true), { classe: 'sottile' })),
  );

  function accordiTonalita() {
    return accordiDellaTonalita(tonica).map((g) => ({ ...g, acc: accordo(g.nome) }));
  }

  function disegna() {
    const lista = accordiTonalita();

    gradiBox.replaceChildren(...lista.map((g, i) => h('button', {
      class: `grado bottone-grado${g.acc ? '' : ' assente'}`,
      type: 'button',
      disabled: !g.acc,
      onclick: () => { sequenza.push(i); disegna(); },
    }, h('small', { testo: g.grado }), h('strong', { testo: g.nome }))));

    const senza = lista.filter((g) => !g.acc).map((g) => g.nome);
    nota.textContent = senza.length
      ? `Di ${senza.join(', ')} non ho il diagramma: è il grado diminuito, che nella musica popolare non si usa quasi mai.`
      : 'Tocca un accordo per aggiungerlo al giro. I quattro più usati sono I, IV, V e vi.';

    modelliBox.replaceChildren(...MODELLI.map((m) => h('button', {
      class: 'chip', type: 'button', title: m.testo,
      onclick: () => { sequenza = [...m.gradi]; disegna(); },
    }, m.nome)));

    sequenzaBox.replaceChildren(...(sequenza.length
      ? sequenza.map((g, i) => h('div', {
        class: 'bat cliccabile',
        title: 'togli questa battuta',
        onclick: () => { sequenza.splice(i, 1); disegna(); },
      }, h('small', { testo: String(i + 1) }), h('strong', { testo: lista[g].nome })))
      : [h('p', { class: 'dim piccolo', testo: 'Vuoto: tocca i gradi qui sopra o scegli un giro pronto.' })]));

    const usati = [...new Set(sequenza)].map((g) => lista[g]).filter((g) => g.acc);
    diagrammiBox.replaceChildren(...usati.map((g) => {
      const forma = ottavaAlta ? posizioneAlta(g.acc) : g.acc;
      return h('div', { class: 'mini' },
        h('strong', { testo: etichettaAccordo(g.acc) }),
        diagramma(forma, { dita: true, tasti: 5 }),
        h('small', { class: 'dim', testo: ottavaAlta ? 'più in alto' : 'aperto' }));
    }));
  }

  /**
   * La posizione più ACUTA fra quelle trovate: è il "secondo giro" del ritornello.
   * Non la più alta sul manico — non è la stessa cosa, perché una presa al 5° tasto
   * con due corde libere può suonare più grave di una al 2°.
   */
  function posizioneAlta(acc) {
    const posizioni = posizioniDi(acc.id, { midiCorde: tun.corde.map((c) => c.midi), limite: 6 });
    if (posizioni.length < 2) return acc;
    const alta = posizioni[posizioni.length - 1];
    return { ...acc, tasti: alta.tasti, dita: alta.dita, barre: alta.barre };
  }

  function battute() {
    const lista = accordiTonalita();
    return sequenza.map((g) => lista[g].nome);
  }

  function anteprima() {
    sblocca();
    const lista = accordiTonalita();
    const passi = sequenza.slice(0, 8);
    passi.forEach((g, i) => {
      const acc = lista[g].acc;
      if (!acc) return;
      const forma = ottavaAlta ? posizioneAlta(acc) : acc;
      setTimeout(() => {
        suonaPennata(forma.tasti.map((t, k) => (t < 0 ? null : hzDaMidi(tun.corde[k].midi + t, d.la4))),
          { durata: 1.4, volume: 0.42 });
      }, i * 620);
    });
  }

  function suona(aTuoTempo = false) {
    if (sequenza.length < 2) return;
    const lista = accordiTonalita();
    const brano = salvaBrano({
      titolo: `Giro in ${nomeClasse(tonica)}${ottavaAlta ? ' (in alto)' : ''}`,
      battute: battute(),
      battiti,
      bpm,
      testo: sequenza.map((g) => lista[g].grado).join(' '),
    });
    ctx.vaiA(aTuoTempo ? `#/libero?b=${brano.id}` : `#/esercizio/giro?b=${brano.id}&bpm=${bpm}`);
  }

  disegna();
  return null;
}
