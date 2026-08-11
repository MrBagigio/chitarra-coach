// Libreria accordi: griglia filtrabile e scheda di dettaglio.
//
// I filtri interrogano SOLO gli elementi che portano l'attributo `data-famiglia`.
// Selezionare per classe qui dentro è già costato caro in un altro progetto: prende
// anche i fratelli che hanno la stessa classe per motivi di stile e il filtro si avvelena.

import { aggiungi, h, scheda, titoloPagina, indietro, bottone, frecce } from '../ui.js';
import * as store from '../store.js';
import { ACCORDI, accordo, noteSuonate, CORDE, etichettaAccordo, nomeCanonico, etichettaDita } from '../chords.js';
import { nomeItaliano } from '../theory.js';
import { icona } from '../icone.js';
import { braniMiei } from '../importa.js';
import { posizioniDi, distanzaOttave } from '../voicing.js';
import { diagramma, legendaDita, NOMI_DITA } from '../diagram.js';
import { BRANI, accordiDi } from '../songs.js';
import { RITMI, SIMBOLI, etichette } from '../patterns.js';
import { accordatura, ID_DIAGRAMMI, frequenzeDi } from '../tunings.js';
import { hzDaMidi } from '../pitch.js';
import { sblocca, suonaPennata } from '../audio.js';
import * as curriculum from '../curriculum.js';

const FAMIGLIE = ['tutti', 'maggiore', 'minore', 'settima', 'minore settima', 'maggiore settima', 'sospesa', 'sesta'];

/**
 * Il filtro sopravvive all'uscita dalla griglia.
 *
 * Prima entrando in un accordo e tornando indietro si ripartiva da "Tutti": chi stava
 * scorrendo i minori doveva rifiltrare ogni volta. E serve anche alla scheda di
 * dettaglio, che con le frecce deve scorrere la lista che hai davanti, non tutte le
 * ottantacinque diteggiature.
 */
const filtro = { famiglia: 'tutti', soloFacili: false, testo: '' };

function listaFiltrata() {
  return ACCORDI.filter((a) => {
    if (filtro.famiglia !== 'tutti' && a.famiglia !== filtro.famiglia) return false;
    if (filtro.soloFacili && (a.difficolta || 3) > 2) return false;
    if (!filtro.testo) return true;
    return `${a.nome} ${a.esteso}`.toLowerCase().includes(filtro.testo);
  });
}

export function monta(radice, ctx) {
  if (ctx.parametri.id) return dettaglio(radice, ctx);
  return griglia(radice, ctx);
}

// ── griglia ──────────────────────────────────────────────────────────────────

function griglia(radice) {
  const contenitore = h('div', { class: 'griglia-accordi' });

  const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Filtra per famiglia' },
    ...FAMIGLIE.map((f) => h('button', {
      class: `chip${f === filtro.famiglia ? ' attiva' : ''}`,
      type: 'button',
      dati: { famiglia: f },
      onclick: () => { filtro.famiglia = f; aggiornaChips(); disegna(); },
    }, f === 'tutti' ? 'Tutti' : f)));

  function aggiornaChips() {
    chips.querySelectorAll('[data-famiglia]').forEach((b) => {
      b.classList.toggle('attiva', b.dataset.famiglia === filtro.famiglia);
    });
  }

  const cerca = h('input', {
    type: 'search', class: 'campo', placeholder: 'Cerca: C, Am, Fa maggiore…',
    'aria-label': 'Cerca un accordo', value: filtro.testo,
    oninput: (e) => { filtro.testo = e.target.value.trim().toLowerCase(); disegna(); },
  });

  const facili = h('label', { class: 'opzione' },
    h('input', {
      type: 'checkbox',
      checked: filtro.soloFacili ? 'checked' : null,
      onchange: (e) => { filtro.soloFacili = e.target.checked; disegna(); },
    }),
    h('span', { testo: 'Solo quelli facili (1–2 dita)' }));

  const conteggio = h('p', { class: 'dim piccolo' });

  aggiungi(radice, 
    titoloPagina('Accordi', `${ACCORDI.length} diteggiature per accordatura standard EADGBE, tutte verificate contro le note dell'accordo.`),
    scheda(
      h('div', { class: 'griglia-scorciatoie' },
        h('a', { class: 'scorciatoia', href: '#/manico' },
          h('span', { class: 'sc-icona' }, icona('manico')),
          h('span', {}, h('strong', { testo: 'Vedi il manico intero' }), h('small', { class: 'dim', testo: 'Note, scale e gradi della tonalità' }))),
        h('a', { class: 'scorciatoia', href: '#/giri' },
          h('span', { class: 'sc-icona' }, icona('cambio')),
          h('span', {}, h('strong', { testo: 'Costruisci un giro' }), h('small', { class: 'dim', testo: 'Scegli la tonalità, tocca i gradi, suonalo anche un\'ottava sopra' }))),
        h('a', { class: 'scorciatoia', href: '#/importa' },
          h('span', { class: 'sc-icona' }, icona('spartito')),
          h('span', {}, h('strong', { testo: 'I tuoi spartiti' }), h('small', { class: 'dim', testo: 'Incolla gli accordi di una canzone e suonaci sopra' }))))),
    scheda(cerca, chips, facili, conteggio),
    contenitore,
    sezioneBrani(),
    sezioneRitmi(),
  );

  function disegna() {
    const lista = listaFiltrata();
    conteggio.textContent = lista.length
      ? `${lista.length} accordi`
      : 'Nessun accordo con questi filtri.';
    contenitore.replaceChildren(...lista.map((a) => h('a', {
      class: 'cella-accordo', href: `#/libreria/${encodeURIComponent(a.id)}`,
    },
      h('div', { class: 'ca-nome' }, h('strong', { testo: etichettaAccordo(a) }),
        a.posizione || /-(facile|alto)$/.test(a.id)
          ? h('span', { class: 'tag-variante', testo: /facile/.test(a.id) ? 'facile' : 'alt' })
          : null),
      diagramma(a, { dita: true }),
      h('small', { class: 'dim', testo: etichettaDita(a) }))));
  }

  disegna();
  return null;
}

/** Giri e brani apribili fuori dal percorso: la voglia di suonare non segue i livelli. */
function sezioneBrani() {
  const gruppi = [
    ['I tuoi spartiti', braniMiei()],
    ['Giri armonici', BRANI.filter((b) => b.genere === 'giro')],
    ['Brani tradizionali', BRANI.filter((b) => b.genere === 'tradizionale')],
  ].filter(([, lista]) => lista.length);
  return scheda(
    h('p', { class: 'occhiello', testo: 'Suona subito' }),
    ...gruppi.flatMap(([nome, lista]) => [
      h('h2', { class: 'piccolo-titolo', testo: nome }),
      h('ul', { class: 'elenco-magro' }, ...lista.map((b) => h('li', { class: 'riga-brano' },
        h('a', { href: `#/esercizio/giro?b=${b.id}&bpm=${b.bpm}` },
          h('strong', { testo: b.titolo }),
          h('small', { class: 'dim blocco', testo: `${accordiDi(b).join(' · ')} — ${b.bpm} bpm${b.battiti === 3 ? ' · valzer' : ''}` })),
        h('a', {
          class: 'bottone sottile stretto',
          href: `#/libero?b=${b.id}`,
          title: 'Senza metronomo: avanza quando l\'accordo è giusto',
        }, 'a tuo tempo')))),
    ]),
  );
}

/** Ritmi provabili su un accordo qualsiasi (parte dal Do, che sanno tutti). */
function sezioneRitmi() {
  return scheda(
    h('p', { class: 'occhiello', testo: 'Ritmi di pennata' }),
    h('ul', { class: 'elenco-magro' }, ...RITMI.map((r) => {
      const et = etichette(r);
      return h('li', {},
        h('a', { href: `#/esercizio/ritmo?r=${r.id}&acc=C&bpm=${60 + r.difficolta * 6}&battute=16` },
          h('strong', { testo: r.nome }),
          h('span', { class: 'ritmo-inline', testo: r.slot.map((s, i) => (s === '-' ? '·' : SIMBOLI[s])).join(' ') }),
          h('small', { class: 'dim blocco', testo: `${r.battiti === 3 ? 'tre quarti' : 'quattro quarti'} · conta ${et.join(' ')}` })));
    })),
  );
}

// ── dettaglio ────────────────────────────────────────────────────────────────

function dettaglio(radice, ctx) {
  const acc = accordo(decodeURIComponent(ctx.parametri.id));
  if (!acc) {
    aggiungi(radice, scheda(h('h2', { testo: 'Accordo non trovato' }),
      h('a', { class: 'bottone', href: '#/libreria', testo: 'Torna alla libreria' })));
    return null;
  }
  const d = store.dati();
  const tun = accordatura(d.accordatura);
  const note = noteSuonate(acc);
  const statistiche = d.accordi[acc.id];

  // Due cose diverse, tenute separate: altre diteggiature dello STESSO accordo, e accordi
  // con un altro nome che suonano le stesse note (Do6 e Lam7 sono lo stesso suono).
  const altreDiteggiature = ACCORDI.filter((a) => a.id !== acc.id && nomeCanonico(a) === nomeCanonico(acc));
  const stessoSuono = ACCORDI.filter((a) => a.id !== acc.id
    && nomeCanonico(a) !== nomeCanonico(acc)
    && (a.alias === acc.id || acc.alias === a.id));

  // Le frecce scorrono la lista che avevi davanti, non tutte le 85 diteggiature:
  // se stavi guardando i minori, "successivo" deve restare fra i minori.
  const scorribile = listaFiltrata().some((a) => a.id === acc.id) ? listaFiltrata() : ACCORDI;
  const posizione = scorribile.findIndex((a) => a.id === acc.id);
  const verso = (delta) => {
    const altro = scorribile[(posizione + delta + scorribile.length) % scorribile.length];
    return altro && altro.id !== acc.id
      ? { href: `#/libreria/${encodeURIComponent(altro.id)}`, etichetta: etichettaAccordo(altro) }
      : null;
  };
  const navigatore = frecce(verso(-1), verso(1), `${posizione + 1} di ${scorribile.length}`);

  const usatoIn = BRANI.filter((b) => accordiDi(b).includes(acc.id));
  const passoRelativo = curriculum.PASSI.find((p) => p.tipo === 'accordo' && p.dati.accordo === acc.id);

  aggiungi(radice,
    h('div', { class: 'testa-riga' }, indietro('#/libreria', 'Accordi')),
    navigatore,
    h('header', { class: 'testa-pagina' },
      h('h1', { testo: etichettaAccordo(acc) }),
      h('p', { class: 'dim', testo: `${acc.esteso} · difficoltà ${acc.difficolta || 3}/5` }),
      h('p', { class: 'dim piccolo', testo: `Note: ${[...new Set(note.filter(Boolean))].map(nomeItaliano).join(' · ')}` })),

    scheda(
      h('div', { class: 'accordo-grande' }, diagramma(acc, { tasti: Math.max(4, Math.min(5, tastoAlto(acc))) })),
      bottone('Ascolta com\'è', () => {
        sblocca();
        suonaPennata(frequenzeDi(acc.tasti, tun, d.capotasto, d.la4));
      }, { classe: 'grande' }),
      tun.id !== ID_DIAGRAMMI
        ? h('p', { class: 'avviso attenzione', testo: `Attenzione: hai scelto l'accordatura ${tun.nome}. I diagrammi valgono per la standard EADGBE — su un'altra accordatura queste posizioni danno altre note.` })
        : null),

    scheda(
      h('p', { class: 'occhiello', testo: 'Corda per corda' }),
      h('div', { class: 'note-corde' }, ...acc.tasti.map((t, i) => h('div', { class: 'nc' },
        h('small', { testo: CORDE[i] }),
        h('strong', { testo: t < 0 ? '✕' : (t === 0 ? 'libera' : `tasto ${t}`) }),
        h('span', { class: 'dim', testo: note[i] ? nomeItaliano(note[i]) : '—' }),
        h('span', {
          class: `piccolo nc-dito${acc.dita?.[i] ? ` dito-${acc.dita[i]}` : ' dim'}`,
          testo: acc.dita?.[i] ? NOMI_DITA[acc.dita[i]] : '',
        })))),
      legendaDita(acc.dita),
      acc.barre ? h('p', { class: 'dim piccolo', testo: `Barré: un dito solo al ${acc.barre.tasto}° tasto su ${acc.barre.a - acc.barre.da + 1} corde.` }) : null),

    acc.suggerimento ? scheda(h('p', { class: 'consiglio', testo: acc.suggerimento })) : null,

    altreDiteggiature.length
      ? scheda(h('p', { class: 'occhiello', testo: `Altri modi di fare ${etichettaAccordo(acc)}` }),
        h('div', { class: 'fila-accordi' }, ...altreDiteggiature.map((v) => h('a', {
          class: 'mini', href: `#/libreria/${encodeURIComponent(v.id)}`,
        }, h('strong', { testo: v.esteso.includes('(') ? v.esteso.split('(')[1].replace(')', '') : etichettaAccordo(v) }),
          diagramma(v, { dita: true })))))
      : null,

    stessoSuono.length
      ? scheda(h('p', { class: 'occhiello', testo: 'Le stesse identiche note, con un altro nome' }),
        h('p', { class: 'dim piccolo', testo: 'Non è un doppione: dipende da quale nota fa da fondamentale nel brano. Le dita non cambiano.' }),
        h('div', { class: 'fila-accordi' }, ...stessoSuono.map((v) => h('a', {
          class: 'mini', href: `#/libreria/${encodeURIComponent(v.id)}`,
        }, h('strong', { testo: etichettaAccordo(v) }), diagramma(v, { dita: true })))))
      : null,

    schedaPosizioni(acc, tun),

    scheda(h('a', {
      class: 'bottone sottile',
      href: `#/ascolta?acc=${encodeURIComponent(acc.id)}`,
    }, icona('orecchio'), 'Fallo verificare dal microfono')),

    statistiche
      ? scheda(h('p', { class: 'occhiello', testo: 'Cosa hai fatto su questo accordo' }),
        h('p', { testo: `${statistiche.esercizi} esercizi · velocità migliore ${statistiche.bpmMigliore || '—'} bpm` }))
      : null,

    passoRelativo
      ? scheda(h('a', { class: 'bottone', href: `#/passo/${passoRelativo.id}`, testo: `Passo del percorso: ${passoRelativo.titolo}` }))
      : null,

    usatoIn.length
      ? scheda(h('p', { class: 'occhiello', testo: 'Serve in' }),
        h('ul', { class: 'elenco-magro' }, ...usatoIn.map((b) => h('li', {},
          h('a', { href: `#/esercizio/giro?b=${b.id}&bpm=${b.bpm}`, testo: b.titolo })))))
      : null,

    frecce(verso(-1), verso(1), '', { tastiera: false }),
  );
  // Le frecce ascoltano la tastiera: vanno staccate uscendo, altrimenti restano
  // attaccate alla finestra e continuano a rispondere da un'altra schermata.
  return () => navigatore.smonta();
}

/**
 * Lo stesso accordo lungo tutto il manico.
 *
 * È la risposta a "il giro dei pop è in due ottave diverse": non sono altri accordi,
 * è lo stesso accordo più in alto. Le posizioni non sono scritte a mano — si cercano
 * sul manico e si tiene solo ciò che una mano può davvero premere.
 */
function schedaPosizioni(acc, tun) {
  if (tun.id !== ID_DIAGRAMMI) return null;
  const posizioni = posizioniDi(nomeCanonico(acc), {
    midiCorde: tun.corde.map((c) => c.midi),
    limite: 5,
  });
  if (posizioni.length < 2) return null;
  const base = posizioni[0];

  return scheda(
    h('p', { class: 'occhiello', testo: 'Lo stesso accordo lungo il manico' }),
    h('p', { class: 'dim piccolo', testo: 'Stesse note, altra altezza. Suonare un giro prima in basso e poi qui sopra è quello che fa "aprire" il ritornello in mezzo pop che conosci.' }),
    h('div', { class: 'fila-accordi' }, ...posizioni.map((v) => {
      const ottave = distanzaOttave(base, v);
      const finto = {
        id: acc.id, nome: acc.nome, esteso: acc.esteso,
        tasti: v.tasti, dita: v.dita, barre: v.barre,
      };
      return h('div', { class: 'mini posizione' },
        h('strong', { testo: v.etichetta }),
        diagramma(finto, { tasti: 5 }),
        h('small', { class: 'dim', testo: ottave >= 0.4 ? `+${ottave.toFixed(1)} ottave` : 'riferimento' }));
    })),
  );
}

function tastoAlto(acc) {
  const max = Math.max(0, ...acc.tasti.filter((t) => t > 0));
  return max <= 4 ? 4 : 5;
}
