// "Le canzoni che voglio suonare io."
//
// Incolli gli accordi di un pezzo, l'app li interpreta e ci suoni sopra col metronomo,
// i diagrammi e il trasporto. Nessuna licenza da comprare, niente che esca dal telefono:
// quello che scrivi resta qui.

import { aggiungi, h, scheda, titoloPagina, indietro, bottone } from '../ui.js';
import * as store from '../store.js';
import { leggiSpartito, salvaBrano, braniMiei, cancellaBrano } from '../importa.js';
import { accordo, etichettaAccordo } from '../chords.js';
import { diagramma } from '../diagram.js';
import { tonalitaProbabile, nomeClasse } from '../theory.js';
import { icona } from '../icone.js';

const ESEMPIO = `| C | Am | F | G |
| C | Am | F | G |
| F | G | C | Am |
| F | G | C | C |`;

export function monta(radice, ctx) {
  let letto = { battute: [], accordi: [], avvisi: [], formato: '' };

  const titolo = h('input', { type: 'text', class: 'campo', placeholder: 'Titolo (per ritrovarla)', 'aria-label': 'Titolo' });
  const area = h('textarea', {
    class: 'campo area-spartito', rows: 9, spellcheck: 'false',
    placeholder: 'Incolla qui gli accordi…', 'aria-label': 'Spartito di accordi',
    oninput: () => rileggi(),
  });

  const selBattiti = h('select', { class: 'campo', 'aria-label': 'Metro', onchange: () => rileggi() },
    h('option', { value: '4', testo: 'Quattro quarti' }),
    h('option', { value: '3', testo: 'Tre quarti (valzer)' }),
    h('option', { value: '2', testo: 'Sei ottavi' }));

  const selDurata = h('select', { class: 'campo', 'aria-label': 'Battute per accordo', onchange: () => rileggi() },
    h('option', { value: '1', testo: '1 battuta per accordo' }),
    h('option', { value: '2', testo: '2 battute per accordo' }),
    h('option', { value: '4', testo: '4 battute per accordo' }));

  const valoreBpm = h('strong', { class: 'es-bpm', testo: '76 bpm' });
  const cursoreBpm = h('input', {
    type: 'range', min: 40, max: 160, step: 2, value: 76, class: 'cursore', 'aria-label': 'Velocità',
    oninput: (e) => { valoreBpm.textContent = `${e.target.value} bpm`; },
  });

  const avvisi = h('div', {});
  const anteprima = h('div', { class: 'es-mappa statica' });
  const riassunto = h('p', { class: 'dim piccolo' });
  const diagrammi = h('div', { class: 'fila-accordi' });
  const elenco = h('div', {});

  const salva = bottone('Salva e suonala', () => {
    if (!letto.battute.length) return;
    const b = salvaBrano({
      titolo: titolo.value,
      battute: letto.battute,
      battiti: Number(selBattiti.value),
      bpm: Number(cursoreBpm.value),
      testo: area.value,
    });
    ctx.vaiA(`#/esercizio/giro?b=${b.id}&bpm=${b.bpm}`);
  }, { classe: 'grande', disabilitato: true });

  aggiungi(radice,
    h('div', { class: 'testa-riga' }, indietro('#/libreria', 'Accordi')),
    titoloPagina('I tuoi spartiti', 'Incolla gli accordi di una canzone e suonaci sopra. Restano su questo telefono.'),

    scheda(
      titolo,
      area,
      h('div', { class: 'riga-campi' }, selBattiti, selDurata),
      h('div', { class: 'riga-tra' }, h('span', { class: 'dim piccolo', testo: 'Velocità' }), valoreBpm),
      cursoreBpm,
      bottone('Mettici un esempio', () => { area.value = ESEMPIO; titolo.value = titolo.value || 'Il giro dei quattro accordi'; rileggi(); }, { classe: 'sottile' })),

    scheda(
      h('p', { class: 'occhiello', testo: 'Come lo leggo' }),
      riassunto,
      avvisi,
      anteprima,
      diagrammi,
      salva),

    scheda(
      h('p', { class: 'occhiello', testo: 'Formati che capisco' }),
      h('ul', { class: 'elenco' },
        h('li', {}, h('strong', { testo: 'Con le stanghette — il migliore: ' }), 'è l\'unico che dice quanto dura ogni accordo. ', h('code', { testo: '| C | Am | F | G |' })),
        h('li', {}, h('strong', { testo: 'Fra parentesi quadre: ' }), h('code', { testo: '[C]Fra Mar[G7]tino' })),
        h('li', {}, h('strong', { testo: 'Accordi sopra le parole: ' }), 'le righe fatte di soli accordi vengono lette, quelle col testo saltate.'),
        h('li', {}, h('strong', { testo: 'Elenco secco: ' }), h('code', { testo: 'C Am F G' }), ' — una battuta per accordo, salvo che tu dica altrimenti qui sopra.')),
      h('p', { class: 'dim piccolo', testo: 'Riconosco maggiori, minori, settime, sospese, seste, none, diminuite ed eccedenti: da C a F#m7b5 passando per Bb, D7sus4 e Cadd9. Quello che non capisco te lo dico invece di saltarlo in silenzio.' })),

    elenco,
  );

  function rileggi() {
    letto = leggiSpartito(area.value, { battutePerAccordo: Number(selDurata.value) });
    const usati = letto.accordi.filter((a) => accordo(a));
    const senzaDiagramma = letto.accordi.filter((a) => !accordo(a));
    const t = tonalitaProbabile(letto.accordi);

    riassunto.textContent = letto.battute.length
      ? `${letto.battute.length} battute · ${letto.accordi.length} accordi diversi · letto come "${letto.formato}"${t ? ` · tonalità probabile: ${nomeClasse(t.tonica)}` : ''}`
      : 'Incolla qualcosa qui sopra.';

    avvisi.replaceChildren(...letto.avvisi.map((a) => h('p', { class: 'avviso attenzione', testo: a })),
      ...(senzaDiagramma.length
        ? [h('p', { class: 'avviso attenzione', testo: `Di ${senzaDiagramma.join(', ')} non ho il diagramma: potrai comunque suonarli, ma non te li disegno.` })]
        : []));

    anteprima.replaceChildren(...letto.battute.slice(0, 64).map((c, i) => h('div', { class: 'bat' },
      h('small', { testo: String(i + 1) }), h('strong', { testo: c.replace('|', ' ') }))));

    diagrammi.replaceChildren(...usati.map((id) => {
      const a = accordo(id);
      return h('div', { class: 'mini' }, h('strong', { testo: etichettaAccordo(a) }), diagramma(a, { dita: true }));
    }));

    salva.disabled = letto.battute.length < 2;
  }

  function disegnaElenco() {
    const miei = braniMiei();
    if (!miei.length) { elenco.replaceChildren(); return; }
    elenco.replaceChildren(scheda(
      h('p', { class: 'occhiello', testo: `I tuoi ${miei.length} spartiti` }),
      h('ul', { class: 'elenco-magro' }, ...miei.map((b) => h('li', { class: 'riga-mio' },
        h('a', { href: `#/esercizio/giro?b=${b.id}&bpm=${b.bpm}` },
          h('strong', { testo: b.titolo }),
          h('small', { class: 'dim blocco', testo: `${b.battute.length} battute · ${b.bpm} bpm` })),
        bottone('Elimina', () => {
          if (cancellando === b.id) { cancellaBrano(b.id); cancellando = null; disegnaElenco(); }
          else { cancellando = b.id; disegnaElenco(); }
        }, { classe: `sottile stretto${cancellando === b.id ? ' pericolo' : ''}` })))),
      cancellando ? h('p', { class: 'dim piccolo', testo: 'Tocca "Elimina" una seconda volta per confermare.' }) : null,
    ));
  }

  let cancellando = null;
  rileggi();
  disegnaElenco();
  return null;
}
