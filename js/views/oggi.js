// Schermata di apertura: la risposta a "che faccio adesso", non un pannello di statistiche.

import { aggiungi, h, scheda, anello, plurale } from '../ui.js';
import * as store from '../store.js';
import * as curriculum from '../curriculum.js';
import { accordo, etichettaAccordo } from '../chords.js';
import { diagramma } from '../diagram.js';
import { icona } from '../icone.js';
import * as ripasso from '../ripasso.js';
import { chitarraDisegnata, marchio } from '../illustrazione.js';

export function monta(radice, ctx) {
  const d = store.dati();
  const prossimo = curriculum.prossimoPasso(d.passiFatti);
  const minuti = store.minutiOggi();
  const obiettivo = d.obiettivoMinuti || 10;
  const fatti = curriculum.PASSI.filter((p) => d.passiFatti[p.id]).length;
  const accordiVisti = curriculum.PASSI
    .filter((p) => p.tipo === 'accordo' && d.passiFatti[p.id])
    .map((p) => p.dati.accordo);
  const giorni = store.ultimiGiorni(14);
  const massimo = Math.max(1, ...giorni.map((g) => g.minuti));

  const ora = new Date().getHours();
  const saluto = ora < 6 ? 'Notte fonda' : ora < 12 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera';

  if (!d.visitato) aggiungi(radice, benvenuto());

  aggiungi(radice, 
    h('header', { class: 'testa-pagina' },
      marchio(),
      h('p', { class: 'occhiello', testo: saluto }),
      h('h1', { testo: `${obiettivo} minuti al giorno` }),
      h('p', { class: 'dim', testo: 'Meglio poco tutti i giorni che due ore la domenica: le dita imparano dormendo.' })),

    scheda(
      h('div', { class: 'oggi-riga' },
        anello(Math.min(1, minuti / obiettivo),
          `${minuti.toFixed(minuti % 1 ? 1 : 0)}′`,
          `su ${obiettivo}`),
        h('div', { class: 'oggi-numeri' },
          h('div', {}, h('strong', { testo: String(d.serie) }), h('small', { testo: plurale(d.serie, 'giorno di fila', 'giorni di fila') })),
          h('div', {}, h('strong', { testo: String(fatti) }), h('small', { testo: `passi su ${curriculum.PASSI.length}` })),
          h('div', {}, h('strong', { testo: String(accordiVisti.length) }), h('small', { testo: 'accordi studiati' })))),
      minuti === 0
        ? h('p', { class: 'dim piccolo', testo: 'Oggi non hai ancora suonato. Il cronometro parte quando avvii un esercizio.' })
        : null),

    schedaRipasso(d),

    prossimo
      ? scheda(
        h('p', { class: 'occhiello', testo: 'Il prossimo passo' }),
        h('h2', { class: 'senza-margine', testo: prossimo.titolo }),
        h('p', { class: 'dim piccolo', testo: prossimo.obiettivo }),
        h('a', { class: 'bottone grande', href: `#/passo/${prossimo.id}`, testo: 'Comincia' }))
      : scheda(
        h('h2', { testo: 'Percorso completato' }),
        h('p', { class: 'dim', testo: 'Da qui si va a orecchio: scegli un giro dalla libreria, alza il metronomo e trasporta in una tonalità nuova.' }),
        h('a', { class: 'bottone', href: '#/libreria', testo: 'Vai agli accordi' })),

    scheda(
      h('p', { class: 'occhiello', testo: 'Sempre a portata di mano' }),
      h('div', { class: 'griglia-scorciatoie' },
        scorciatoia('#/accorda', 'mirino', 'Accorda', 'Trenta secondi, prima di tutto'),
        scorciatoia('#/ascolta', 'orecchio', 'Verifica un accordo', 'Il microfono dice se le corde suonano tutte'),
        scorciatoia(`#/esercizio/cambio?acc=appresi&bpm=${d.bpmPreferito || 70}&battute=16`,
          'cambio', 'Cambi a sorteggio', 'Gli accordi che sai, in ordine casuale'),
        scorciatoia(`#/esercizio/ritmo?r=r-classico&acc=C&bpm=${d.bpmPreferito || 70}&battute=16`,
          'metronomo', 'Ritmo classico', 'Solo mano destra, sul Do'),
        scorciatoia('#/manico', 'manico', 'Manico', 'Dove sono le note e i gradi'),
        scorciatoia('#/libreria', 'nota', 'Libreria', 'Accordi, ritmi, brani'))),

    Object.keys(d.minutiPerGiorno).length
      ? scheda(
        h('p', { class: 'occhiello', testo: 'Ultimi 14 giorni' }),
        h('div', { class: 'grafico' }, ...giorni.map((g) => h('div', {
          class: `gr-col${g.oggi ? ' oggi' : ''}`, title: `${g.giorno}: ${g.minuti} minuti`,
        },
          h('span', { class: 'gr-barra', style: `height:${(g.minuti / massimo) * 100}%` }),
          h('small', { testo: g.giorno.slice(8) })))))
      : null,

    accordiVisti.length
      ? scheda(
        h('p', { class: 'occhiello', testo: 'Li hai già in mano' }),
        h('div', { class: 'fila-accordi' }, ...accordiVisti.map((id) => {
          const a = accordo(id);
          return a
            ? h('a', { class: 'mini', href: `#/libreria/${encodeURIComponent(a.id)}` },
              h('strong', { testo: etichettaAccordo(a) }), diagramma(a, { dita: true, tasti: 4 }))
            : null;
        })))
      : null,
  );

  return null;
}

/**
 * Il ripasso dovuto oggi.
 *
 * È la sola parte dell'app che decide da sé cosa devi fare: il percorso è una linea
 * uguale per tutti, questo guarda cosa TU hai sbagliato e quando, e lo riporta a galla
 * il giorno in cui stavi per dimenticarlo.
 */
function schedaRipasso(d) {
  const dovuti = ripasso.dovuti({ limite: 6 });
  if (!dovuti.length) return null;
  const accordi = ripasso.accordiDaRipassare({ limite: 5 });
  const parametri = new URLSearchParams({
    acc: accordi.join(','),
    bpm: String(Math.max(50, (d.bpmPreferito || 70) - 8)),
    battute: '16',
    sorteggio: '1',
  });
  return scheda(
    h('div', { class: 'riga-tra' },
      h('p', { class: 'occhiello', testo: 'Da ripassare oggi' }),
      h('span', { class: 'pastiglia', testo: String(dovuti.length) })),
    h('div', { class: 'fila-ripasso' }, ...dovuti.map((v) => h('span', {
      class: `chip-ripasso${v.ritardo > 2 ? ' scaduto' : ''}`,
      title: v.ritardo > 0 ? `in ritardo di ${v.ritardo} giorni` : 'scade oggi',
      testo: ripasso.etichetta(v.chiave),
    }))),
    h('p', { class: 'dim piccolo', testo: 'Quello che hai fatto fatica a tenere torna dopo un giorno; quello che regge si dirada da solo fino a settimane.' }),
    accordi.length >= 2
      ? h('a', { class: 'bottone', href: `#/esercizio/cambio?${parametri}` }, icona('ripasso'), 'Ripassa adesso')
      : null,
  );
}

function benvenuto() {
  const box = scheda(
    h('div', { class: 'benvenuto-testa' }, chitarraDisegnata({ vibra: true, altezza: 150 })),
    h('p', { class: 'occhiello', testo: 'Benvenuto' }),
    h('h2', { class: 'senza-margine', testo: 'Come funziona, in trenta secondi' }),
    h('ul', { class: 'elenco' },
      h('li', { testo: `Il Percorso ti dice cosa studiare oggi: ${curriculum.LIVELLI.length} livelli in cui ogni passo aggiunge una difficoltà sola.` }),
      h('li', { testo: 'Accorda prima di ogni sessione: bastano trenta secondi e ti salva l\'orecchio.' }),
      h('li', { testo: 'Verifica usa il microfono per dirti quale corda non sta suonando — è l\'errore che da soli non si sente.' }),
      h('li', { testo: 'Tutto resta su questo telefono. Nessun account, nessun dato in uscita, funziona anche senza rete.' })),
    h('button', {
      class: 'bottone', type: 'button', testo: 'Ho capito, cominciamo',
      onclick: () => { store.imposta('visitato', true); box.remove(); },
    }),
  );
  return box;
}

function scorciatoia(hash, nomeIcona, titolo, testo) {
  return h('a', { class: 'scorciatoia', href: hash },
    h('span', { class: 'sc-icona' }, icona(nomeIcona)),
    h('span', {}, h('strong', { testo: titolo }), h('small', { class: 'dim', testo })));
}
