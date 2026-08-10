// La scheda di un passo del percorso: cosa devi fare, come si fa, e il pulsante
// che ti porta dentro l'esercizio giusto già configurato.

import { aggiungi, h, scheda, indietro, bottone, frecce } from '../ui.js';
import * as store from '../store.js';
import * as curriculum from '../curriculum.js';
import { accordo, noteSuonate, CORDE } from '../chords.js';
import { diagramma, legendaDita, NOMI_DITA } from '../diagram.js';
import { ritmo as ritmoPerId, etichette, simbolo, cordeDiCasella, classeDito } from '../patterns.js';
import { brano as branoPerId } from '../songs.js';
import { accordatura } from '../tunings.js';
import { hzDaMidi } from '../pitch.js';
import { sblocca, suonaPennata } from '../audio.js';

export function monta(radice, ctx) {
  const p = curriculum.passo(ctx.parametri.id);
  if (!p) {
    aggiungi(radice, scheda(h('h2', { testo: 'Passo inesistente' }),
      h('a', { class: 'bottone', href: '#/percorso', testo: 'Torna al percorso' })));
    return null;
  }
  const livello = curriculum.LIVELLI.find((l) => l.id === p.livello);
  const fatto = store.passoFatto(p.id);

  // Anche qui si scorre senza tornare all'elenco: sbirciare il passo dopo o rifare
  // quello prima è un gesto continuo, non un viaggio di andata e ritorno.
  const indice = curriculum.PASSI.findIndex((x) => x.id === p.id);
  const verso = (delta) => {
    const altro = curriculum.PASSI[indice + delta];
    return altro ? { href: `#/passo/${altro.id}`, etichetta: altro.titolo } : null;
  };
  const navigatore = frecce(verso(-1), verso(1), `passo ${indice + 1} di ${curriculum.PASSI.length}`);

  aggiungi(radice,
    h('div', { class: 'testa-riga' }, indietro('#/percorso', 'Percorso')),
    navigatore,
    h('header', { class: 'testa-pagina' },
      h('p', { class: 'occhiello', testo: livello.nome }),
      h('h1', { testo: p.titolo }),
      fatto ? h('p', { class: 'ok piccolo', testo: '✓ già completato' }) : null),
    p.testo ? scheda(h('p', { testo: p.testo })) : null,
  );

  if (p.tipo === 'accordatura') montaAccordatura(radice, p);
  if (p.tipo === 'lettura') montaLettura(radice, p);
  if (p.tipo === 'accordo') montaAccordo(radice, p);
  if (p.tipo === 'ascolta') montaAvvio(radice, p, avvioAscolto(p));
  if (p.tipo === 'orecchio') montaAvvio(radice, p, avvioOrecchio(p));
  if (p.tipo === 'cambio') montaAvvio(radice, p, avvioCambio(p));
  if (p.tipo === 'ritmo') montaAvvio(radice, p, avvioRitmo(p));
  if (p.tipo === 'giro') montaAvvio(radice, p, avvioGiro(p));

  aggiungi(radice, scheda(
    h('p', { class: 'dim piccolo', testo: `Obiettivo: ${p.obiettivo}` }),
    fatto
      ? bottone('Togli il completamento', () => { store.annullaPasso(p.id); ctx.vaiA(`#/passo/${p.id}`); }, { classe: 'sottile' })
      : null,
  ));
  // La pulizia dell'ascolto tastiera VA restituita. Restituendo null, ogni visita a un
  // passo lasciava un ascoltatore appeso alla finestra per sempre: dopo tre passi, una
  // freccia premuta navigava tre passi in un colpo — da qualunque schermata dell'app.
  return () => navigatore.smonta();
}

// ── tipi di passo ────────────────────────────────────────────────────────────

function montaAccordatura(radice, p) {
  aggiungi(radice, scheda(
    h('p', { testo: 'Questo passo si chiude da sé: quando in una sessione hai portato tutte e quattro le corde entro 5 centesimi, l\'accordatore lo segna.' }),
    h('a', { class: 'bottone grande', href: '#/accorda', testo: 'Apri l\'accordatore' }),
    // Via d'uscita dichiarata, non scorciatoia nascosta: chi accorda a orecchio o con
    // un accordatore a pinza ha comunque accordato, e restare bloccato al passo zero
    // per mancanza di microfono sarebbe assurdo. Si segna COME l'ha fatto.
    store.passoFatto(p.id) ? null : bottone('L\'ho accordato in un altro modo', () => {
      store.segnaPasso(p.id, { modo: 'dichiarato' });
      segnaEProsegui(radice, p);
    }, { classe: 'sottile' }),
    h('p', { class: 'dim piccolo', testo: 'A orecchio, con un accordatore a pinza o con un\'altra app: va benissimo. Serve solo che lo strumento sia accordato prima di suonare.' }),
  ));
}

function montaLettura(radice, p) {
  const { punti = [], quiz = [] } = p.dati;
  aggiungi(radice, scheda(h('ul', { class: 'elenco' }, ...punti.map((t) => h('li', { testo: t })))));

  if (!quiz.length) {
    aggiungi(radice, scheda(bottone(store.passoFatto(p.id) ? 'Già letto' : 'Letto, avanti',
      () => segnaEProsegui(radice, p), { classe: 'grande', disabilitato: store.passoFatto(p.id) })));
    return;
  }

  const dom = quiz[0];
  const esito = h('p', { class: 'piccolo' });
  const opzioni = h('div', { class: 'quiz-opzioni' }, ...dom.opzioni.map((testo, i) => h('button', {
    class: 'bottone sottile',
    type: 'button',
    onclick: (e) => {
      [...opzioni.children].forEach((b) => b.classList.remove('giusta', 'sbagliata'));
      if (i === dom.giusta) {
        e.currentTarget.classList.add('giusta');
        esito.className = 'piccolo ok';
        esito.textContent = dom.perche;
        segnaEProsegui(radice, p);
      } else {
        e.currentTarget.classList.add('sbagliata');
        esito.className = 'piccolo errore';
        esito.textContent = 'Non è questa. Rileggi il punto sopra e riprova.';
      }
    },
  }, testo)));

  aggiungi(radice, scheda(h('h2', { class: 'piccolo-titolo', testo: dom.d }), opzioni, esito));
}

function montaAccordo(radice, p) {
  const acc = accordo(p.dati.accordo);
  if (!acc) return;
  const bersaglio = p.dati.ripetizioni || 8;
  let fatte = 0;

  const dia = h('div', { class: 'accordo-grande' }, diagramma(acc, { tasti: 5 }));
  const note = noteSuonate(acc);
  const d = store.dati();
  const tun = accordatura(d.accordatura);

  const contatore = h('div', { class: 'contatore', testo: `0 / ${bersaglio}` });
  const tocca = bottone('Suonato pulito', () => {
    fatte = Math.min(bersaglio, fatte + 1);
    contatore.textContent = `${fatte} / ${bersaglio}`;
    if (fatte >= bersaglio) {
      contatore.classList.add('ok');
      segnaEProsegui(radice, p);
    }
  }, { classe: 'grande' });

  aggiungi(radice, scheda(
    dia,
    h('div', { class: 'note-corde' }, ...acc.tasti.map((t, i) => h('div', { class: 'nc' },
      h('small', { testo: CORDE[i] }),
      h('strong', { testo: t < 0 ? '✕' : (t === 0 ? 'libera' : `tasto ${t}`) }),
      h('span', { class: 'dim', testo: note[i] || '' }),
      h('span', {
        class: `piccolo nc-dito${acc.dita?.[i] ? ` dito-${acc.dita[i]}` : ' dim'}`,
        testo: acc.dita?.[i] ? NOMI_DITA[acc.dita[i]] : '',
      })))),
    legendaDita(acc.dita),
    acc.suggerimento ? h('p', { class: 'consiglio', testo: acc.suggerimento }) : null,
    bottone('Ascolta com\'è', () => {
      sblocca();
      const hz = acc.tasti.map((t, i) => (t < 0 ? null : hzDaMidi(tun.corde[i].midi + t, d.la4)));
      suonaPennata(hz);
    }, { classe: 'sottile' }),
  ));

  aggiungi(radice, scheda(
    h('p', { class: 'dim piccolo', testo: 'Premi, penna, togli le dita, rimetti. Conta solo se suonano tutte e quattro le corde senza ronzii.' }),
    contatore,
    tocca,
  ));
}

function montaAvvio(radice, p, avvio) {
  aggiungi(radice, scheda(
    ...avvio.anteprima,
    h('a', { class: 'bottone grande', href: avvio.hash, testo: avvio.etichetta }),
  ));
}

function avvioAscolto(p) {
  const acc = accordo(p.dati.accordo);
  const parametri = new URLSearchParams({ acc: p.dati.accordo, corretti: String(p.dati.corretti || 4), passo: p.id });
  return {
    hash: `#/ascolta?${parametri}`,
    etichetta: 'Fatti ascoltare dal microfono',
    anteprima: [
      acc ? h('div', { class: 'anteprima-accordi' }, h('div', { class: 'ap' },
        h('strong', { testo: acc.nome }), diagramma(acc))) : null,
      h('p', { class: 'dim piccolo', testo: 'Il programma non giudica il suono: controlla che le quattro note previste ci siano tutte. Se una corda è spenta dal dito, te lo dice — ed è l\'errore che da soli non si sente.' }),
    ],
  };
}

function avvioOrecchio(p) {
  const parametri = new URLSearchParams({
    modo: p.dati.modo,
    opzioni: (p.dati.opzioni || []).join(','),
    scelte: String(p.dati.scelte || 3),
    corrette: String(p.dati.corrette || 6),
    passo: p.id,
  });
  return {
    hash: `#/orecchio?${parametri}`,
    etichetta: 'Comincia l\'ascolto',
    anteprima: [
      h('p', { class: 'dim piccolo', testo: `${p.dati.opzioni.length} accordi in gioco. Nessun diagramma finché non hai risposto.` }),
    ],
  };
}

function avvioCambio(p) {
  const lista = p.dati.accordi === 'appresi'
    ? curriculum.accordiAppresi(store.dati().passiFatti)
    : p.dati.accordi;
  const parametri = new URLSearchParams({
    acc: p.dati.accordi === 'appresi' ? 'appresi' : lista.join(','),
    bpm: String(p.dati.bpm),
    battute: String(p.dati.battute),
    passo: p.id,
    ...(p.dati.sorteggio ? { sorteggio: '1' } : {}),
    ...(p.dati.salita ? { salita: String(p.dati.salita) } : {}),
  });
  return {
    hash: `#/esercizio/cambio?${parametri}`,
    etichetta: `Esercita il cambio a ${p.dati.bpm} bpm`,
    anteprima: [h('div', { class: 'anteprima-accordi' },
      ...lista.map((id) => {
        const a = accordo(id);
        return a ? h('div', { class: 'ap' }, h('strong', { testo: a.nome }), diagramma(a, { dita: true })) : null;
      }))],
  };
}

function avvioRitmo(p) {
  const r = ritmoPerId(p.dati.ritmo);
  const et = etichette(r);
  const parametri = new URLSearchParams({
    r: r.id,
    acc: p.dati.accordo || 'null',
    bpm: String(p.dati.bpm),
    battute: String(p.dati.battute),
    passo: p.id,
  });
  const arpeggio = r.tipo === 'dita';
  return {
    hash: `#/esercizio/ritmo?${parametri}`,
    etichetta: `${arpeggio ? 'Prova l\'arpeggio' : 'Prova il ritmo'} a ${p.dati.bpm} bpm`,
    anteprima: [
      h('div', { class: `es-griglia statica${arpeggio ? ' arpeggio' : ''}` }, ...r.slot.map((s, i) => {
        const corde = arpeggio ? cordeDiCasella(s) : [];
        return h('div', { class: `cella s-${s === '-' ? 'pausa' : (arpeggio ? 'dito' : s)}` },
          h('span', { class: `cella-freccia ${classeDito(s)}`, testo: simbolo(r, s) }),
          corde.length ? h('span', { class: 'cella-corde', testo: corde.map((c) => CORDE[c]).join('+') }) : null,
          h('span', { class: 'cella-conto', testo: et[i] }));
      })),
      h('p', {
        class: 'dim piccolo',
        testo: arpeggio
          ? 'P pollice (corda G) · I indice (C) · M medio (E) · A anulare (A) · · dito fermo'
          : '↓ giù · ↑ su · ✕ colpo smorzato · · mano ferma',
      }),
    ],
  };
}

function avvioGiro(p) {
  const b = branoPerId(p.dati.brano);
  const parametri = new URLSearchParams({
    b: b.id,
    bpm: String(p.dati.bpm || b.bpm),
    battute: String(p.dati.battute || b.battute.length),
    passo: p.id,
  });
  return {
    hash: `#/esercizio/giro?${parametri}`,
    etichetta: `Suona ${b.titolo}`,
    anteprima: [
      h('div', { class: 'es-mappa statica' }, ...b.battute.map((c, i) => h('div', { class: 'bat' },
        h('small', { testo: String(i + 1) }), h('strong', { testo: c.replace('|', ' ') })))),
    ],
  };
}

// ── chiusura comune ──────────────────────────────────────────────────────────

function segnaEProsegui(radice, p) {
  const primo = !store.passoFatto(p.id);
  store.segnaPasso(p.id);
  if (!primo) return;
  const prossimo = curriculum.prossimoPasso(store.dati().passiFatti);
  const box = scheda(
    h('h2', { class: 'ok', testo: 'Passo completato' }),
    prossimo
      ? h('a', { class: 'bottone', href: `#/passo/${prossimo.id}`, testo: `Prossimo: ${prossimo.titolo}` })
      : h('p', { testo: 'Percorso finito. Da qui in poi si va a orecchio.' }),
    h('a', { class: 'bottone sottile', href: '#/percorso', testo: 'Torna al percorso' }),
  );
  radice.appendChild(box);
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
