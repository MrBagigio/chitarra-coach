// Il percorso: livelli in ordine, con l'avanzamento e il passo dove sei rimasto.
//
// I livelli successivi si vedono e si aprono comunque: bloccarli sarebbe finto rigore —
// chi vuole sbirciare il barré al terzo giorno lo fa e torna indietro da sé. Il percorso
// è un consiglio sull'ordine, non un cancello.

import { aggiungi, h, scheda, titoloPagina, barra } from '../ui.js';
import * as store from '../store.js';
import * as curriculum from '../curriculum.js';
import { icona, ICONA_PASSO } from '../icone.js';

const NOMI_TIPO = {
  accordatura: 'accordatura',
  lettura: 'da leggere',
  accordo: 'forma nuova',
  ascolta: 'controllo al microfono',
  orecchio: 'allenamento d\'orecchio',
  cambio: 'cambio',
  ritmo: 'mano destra',
  giro: 'da suonare',
};

export function monta(radice, ctx) {
  const d = store.dati();
  const fatti = d.passiFatti;
  const prossimo = curriculum.prossimoPasso(fatti);
  const totale = curriculum.PASSI.length;
  const quanti = curriculum.PASSI.filter((p) => fatti[p.id]).length;

  aggiungi(radice, 
    titoloPagina('Percorso', `${curriculum.LIVELLI.length} livelli, ${totale} passi, uno alla volta. Ogni passo aggiunge una difficoltà sola.`),
    scheda(
      h('div', { class: 'riga-tra' },
        h('strong', { testo: `${quanti} passi su ${totale}` }),
        h('span', { class: 'dim', testo: `${Math.round((quanti / totale) * 100)}%` })),
      barra(quanti / totale, 'avanzamento del percorso'),
      prossimo
        ? h('a', { class: 'bottone', href: `#/passo/${prossimo.id}`, testo: `Riprendi: ${prossimo.titolo}` })
        : h('p', { class: 'ok', testo: 'Percorso completato.' })),
  );

  curriculum.LIVELLI.forEach((liv) => {
    const av = curriculum.avanzamentoLivello(liv, fatti);
    const aperto = !!prossimo && liv.id === prossimo.livello;
    const dettagli = h('details', { class: 'livello', open: aperto ? 'open' : null },
      h('summary', {},
        h('div', { class: 'liv-testa' },
          h('div', {},
            h('strong', { testo: liv.nome }),
            h('span', { class: 'dim piccolo blocco', testo: liv.sottotitolo })),
          h('span', { class: `liv-conta${av.quota === 1 ? ' ok' : ''}`, testo: `${av.fatti}/${av.totale}` })),
        barra(av.quota, `avanzamento ${liv.nome}`)),
      h('ol', { class: 'passi' }, ...liv.passi.map((p) => rigaPasso(p, !!fatti[p.id], prossimo?.id === p.id))),
    );
    radice.appendChild(dettagli);
  });

  return null;
}

function rigaPasso(p, fatto, corrente) {
  return h('li', { class: `passo${fatto ? ' fatto' : ''}${corrente ? ' corrente' : ''}` },
    h('a', { href: `#/passo/${p.id}` },
      h('span', { class: 'passo-icona' }, icona(fatto ? 'spunta' : (ICONA_PASSO[p.tipo] || 'nota'))),
      h('span', { class: 'passo-testo' },
        h('strong', { testo: p.titolo }),
        h('small', { class: 'dim', testo: `${NOMI_TIPO[p.tipo]} · ${p.obiettivo}` })),
      h('span', { class: 'passo-freccia', 'aria-hidden': 'true', testo: '›' })));
}
