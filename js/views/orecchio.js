// Allenamento dell'orecchio: si sente, non si guarda.
//
// Il suono è sintetizzato dalle frequenze reali delle corde con la diteggiatura vera,
// quindi quello che senti è la stessa disposizione di note che avrai sotto le dita —
// non un accordo di pianoforte con le note in un altro ordine.

import { aggiungi, h, scheda, titoloPagina, indietro, bottone } from '../ui.js';
import * as store from '../store.js';
import { accordo, etichettaAccordo } from '../chords.js';
import { diagramma } from '../diagram.js';
import { accordatura, frequenzeDi } from '../tunings.js';
import { hzDaMidi } from '../pitch.js';
import { sblocca, suonaPennata, fermaNota } from '../audio.js';
import { scomponi } from '../theory.js';
import * as curriculum from '../curriculum.js';

export function monta(radice, ctx) {
  const d = store.dati();
  const tun = accordatura(d.accordatura);
  const idPasso = ctx.query.passo || null;
  const passo = idPasso ? curriculum.passo(idPasso) : null;
  const dati = passo?.dati || {};

  const modo = ctx.query.modo || dati.modo || 'maggiore-minore';
  const pool = (ctx.query.opzioni || dati.opzioni || ['C', 'Am', 'F', 'Dm']).toString().split(',');
  const quanteScelte = Number(ctx.query.scelte || dati.scelte || 3);
  const daFare = Number(ctx.query.corrette || dati.corrette || 6);

  let corrette = 0;
  let tentativi = 0;
  let corrente = null;
  let scelte = [];
  let risposto = false;
  let giaConcluso = false;

  const domanda = h('h2', { class: 'senza-margine', testo: modo === 'maggiore-minore' ? 'Maggiore o minore?' : 'Quale accordo è?' });
  const opzioniBox = h('div', { class: 'quiz-opzioni' });
  const esito = h('p', { class: 'piccolo' });
  const punteggio = h('div', { class: 'riga-tra' },
    h('strong', { class: 'es-conta' }), h('span', { class: 'dim piccolo' }));
  const rivelato = h('div', { class: 'rivelato nascosto' });

  const suona = bottone('▶ Suona', () => riproduci(), { classe: 'grande' });
  const avanti = bottone('Prossimo', () => nuovo(), { classe: 'sottile nascosto' });

  aggiungi(radice, 
    idPasso ? h('div', { class: 'testa-riga' }, indietro(`#/passo/${idPasso}`, 'Passo')) : null,
    titoloPagina('Orecchio', 'Nessun diagramma: solo il suono. È l\'esercizio che rende veloce imparare le canzoni.'),
    scheda(punteggio, domanda, suona, opzioniBox, esito, rivelato, avanti),
    scheda(h('p', { class: 'dim piccolo', testo: 'Consiglio: prima di rispondere prova a canticchiare la nota più bassa. Il maggiore "apre", il minore "chiude". Se sbagli, riascolta subito la risposta giusta — è lì che l\'orecchio impara.' })),
  );

  function frequenze(acc) {
    return frequenzeDi(acc.tasti, tun, d.capotasto, d.la4);
  }

  function riproduci() {
    sblocca();
    if (corrente) suonaPennata(frequenze(corrente));
  }

  function nuovo() {
    risposto = false;
    rivelato.classList.add('nascosto');
    avanti.classList.add('nascosto');
    esito.textContent = '';
    esito.className = 'piccolo';

    const disponibili = pool.map((id) => accordo(id)).filter(Boolean);
    corrente = disponibili[Math.floor(Math.random() * disponibili.length)];

    if (modo === 'maggiore-minore') {
      scelte = ['maggiore', 'minore'];
    } else {
      const altri = disponibili.filter((a) => a.id !== corrente.id);
      const mescolati = altri.sort(() => Math.random() - 0.5).slice(0, Math.max(1, quanteScelte - 1));
      scelte = [corrente, ...mescolati].sort(() => Math.random() - 0.5).map((a) => a.id);
    }

    opzioniBox.replaceChildren(...scelte.map((s) => h('button', {
      class: 'bottone sottile', type: 'button', onclick: (e) => rispondi(s, e.currentTarget),
    }, modo === 'maggiore-minore' ? s : etichettaAccordo(accordo(s)))));

    aggiornaPunteggio();
    riproduci();
  }

  function giusta() {
    if (modo !== 'maggiore-minore') return corrente.id;
    const s = scomponi(corrente.id);
    return s && s.intervalli.includes(3) ? 'minore' : 'maggiore';
  }

  function rispondi(valore, bottoneScelto) {
    if (risposto) return;
    risposto = true;
    tentativi += 1;
    const atteso = giusta();
    const ok = valore === atteso;
    if (ok) corrette += 1;
    bottoneScelto.classList.add(ok ? 'giusta' : 'sbagliata');
    esito.className = `piccolo ${ok ? 'ok' : 'errore'}`;
    esito.textContent = ok
      ? `Esatto: era ${etichettaAccordo(corrente)}.`
      : `Era ${etichettaAccordo(corrente)} (${atteso}). Riascoltalo subito: è adesso che si impara.`;
    rivelato.classList.remove('nascosto');
    rivelato.replaceChildren(
      h('div', { class: 'accordo-medio' }, diagramma(corrente, { tasti: 5 })),
      bottone('▶ Riascolta', riproduci, { classe: 'sottile' }),
    );
    avanti.classList.remove('nascosto');
    aggiornaPunteggio();
    if (corrette >= daFare) concludi();
  }

  function aggiornaPunteggio() {
    punteggio.children[0].textContent = `${corrette} / ${daFare}`;
    punteggio.children[1].textContent = tentativi ? `${Math.round((corrette / tentativi) * 100)}% di risposte esatte` : '';
  }

  function concludi() {
    if (giaConcluso) return;         // una volta sola, non a ogni risposta successiva
    giaConcluso = true;
    if (idPasso) store.segnaPasso(idPasso, { corrette, tentativi });
    const prossimo = curriculum.prossimoPasso(store.dati().passiFatti);
    const box = scheda(
      h('h2', { class: 'ok', testo: 'Passo completato' }),
      h('p', { testo: `${corrette} risposte esatte su ${tentativi} tentativi.` }),
      prossimo ? h('a', { class: 'bottone', href: `#/passo/${prossimo.id}`, testo: `Prossimo: ${prossimo.titolo}` }) : null,
      h('a', { class: 'bottone sottile', href: '#/percorso', testo: 'Torna al percorso' }),
    );
    radice.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  nuovo();
  return () => fermaNota();
}
