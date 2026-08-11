// Giro a tuo tempo: nessun metronomo, avanza il microfono.
//
// È l'altra metà dell'esercizio col metronomo, e serve prima di quello. Col metronomo
// il tempo comanda e tu insegui; qui comandi tu: l'accordo successivo compare solo
// quando quello attuale è uscito davvero, e non c'è nessuna fretta addosso. Si gira
// finché vuoi.
//
// La misura che ne esce è quella che usano gli insegnanti: QUANTO CI METTI a fare un
// cambio. Non è una stima — è il tempo fra quando l'accordo è comparso e quando le sue
// note sono arrivate al microfono.

import { aggiungi, h, scheda, indietro, bottone } from '../ui.js';
import * as store from '../store.js';
import { accordo, etichettaAccordo, CORDE } from '../chords.js';
import { schedaAccordo } from '../diagram.js';
import { branoSeEsiste, branoTrasportato } from '../songs.js';
import { accordatura, frequenzeDi, nomeSuonato } from '../tunings.js';
import { hzDaMidi } from '../pitch.js';
import { verificabilita, energiaEstranea, SOGLIA_ESTRANEA } from '../chroma.js';
import { classiAttese } from '../theory.js';
import {
  apriMicrofono, chiudiMicrofono, sblocca, tieniSchermoAcceso, nuovoAnalizzatore, analizzatoreAccordo,
  contesto as contestoAudio,
} from '../audio.js';
import { AscoltoVivo } from '../ascoltoVivo.js';
import * as ripasso from '../ripasso.js';

const FINESTRA_MS = 260;      // quanto si ascolta dopo la pennata prima di giudicare
const RIPOSO_MS = 420;        // pausa dopo un cambio riuscito: la corda sta ancora suonando

export function monta(radice, ctx) {
  const d = store.dati();
  const tun = accordatura(d.accordatura);
  const originale = branoSeEsiste(ctx.query.b);

  if (!originale) {
    aggiungi(radice, scheda(
      h('h2', { testo: 'Questo giro non c\'è più' }),
      h('a', { class: 'bottone sottile', href: '#/libreria', testo: 'Torna agli accordi' }),
    ));
    return null;
  }

  const trasporto = Number(ctx.query.tr || 0);
  const brano = branoTrasportato(originale, trasporto);

  // Le battute diventano una fila di accordi da fare uno dopo l'altro.
  // Le ripetizioni consecutive si fondono: qui si esercita il CAMBIO, e "fai Do, poi
  // rifai Do" non è un cambio — sarebbe solo una pennata in più da aspettare.
  const sequenza = [];
  brano.battute.forEach((cella) => {
    cella.split('|').forEach((nome) => {
      if (!nome) return;
      if (sequenza.length && sequenza[sequenza.length - 1] === nome) return;
      sequenza.push(nome);
    });
  });
  const senzaDiagramma = [...new Set(sequenza)].filter((n) => !accordo(n));

  let indice = 0;
  let giriFatti = 0;
  let cambi = 0;
  const tempiPerCambio = new Map();     // "C>F" → [ms, ms, …]
  let mostratoDa = 0;
  let ascolto = null;
  let timer = null;
  let finestra = null;
  let riposoFinoA = 0;
  let attivo = false;
  let vivo = true;

  const frequenzeDi = (nome) => {
    const acc = accordo(nome);
    if (!acc) return null;
    return frequenzeDi(acc.tasti, tun, d.capotasto, d.la4);
  };

  // ── schermo ────────────────────────────────────────────────────────────────
  const oraBox = h('div', { class: 'es-accordo attuale' });
  const poiBox = h('div', { class: 'es-accordo prossimo' });
  const mappa = h('div', { class: 'es-mappa' });
  const verdetto = h('p', { class: 'verdetto', testo: 'Accendi il microfono e suona il primo accordo.' });
  const cordeBox = h('div', { class: 'note-corde ascolto' });
  // Non un trattino: da solo, in grassetto grande, sembra un pezzo rotto (già visto
  // nell'accordatore). Prima del primo cambio non c'è un tempo da mostrare, c'è uno stato.
  const cronometro = h('strong', { class: 'es-conta dim', testo: 'pronto' });
  const contatori = h('span', { class: 'dim piccolo' });
  const livello = h('div', { class: 'barra-livello' }, h('span'));

  const avvia = bottone('Accendi il microfono e comincia', () => (attivo ? ferma() : parti()), { classe: 'grande' });
  const salta = bottone('Salta questo', () => avanza(true), { classe: 'sottile nascosto' });
  const esitoBox = h('div', {});

  aggiungi(radice,
    h('div', { class: 'testa-riga' }, indietro('#/libreria', 'Accordi')),
    h('header', { class: 'testa-pagina' },
      h('p', { class: 'occhiello', testo: 'A tuo tempo' }),
      h('h1', { testo: brano.titolo }),
      h('p', {
        class: 'dim',
        testo: `${sequenza.length} cambi in cerchio, senza metronomo. Avanza da solo quando l'accordo esce giusto: gira finché vuoi.`,
      })),

    senzaDiagramma.length
      ? scheda(h('p', { class: 'avviso attenzione', testo: `Di ${senzaDiagramma.join(', ')} non ho il diagramma: li salto.` }))
      : null,

    scheda(
      h('div', { class: 'es-duo' }, oraBox, poiBox),
      h('div', { class: 'riga-tra' }, cronometro, contatori),
      cordeBox,
      verdetto),

    scheda(mappa),

    scheda(livello, avvia, salta),

    scheda(h('p', {
      class: 'dim piccolo',
      testo: 'Il tempo che vedi è quanto ci hai messo a fare il cambio: dal momento in cui l\'accordo è comparso a quando le sue note sono arrivate al microfono. È la misura che conta davvero — la velocità con il metronomo arriva da sola quando questa scende.',
    })),

    esitoBox,
  );

  function disegna() {
    const nome = sequenza[indice];
    const prossimo = sequenza[(indice + 1) % sequenza.length];
    const acc = accordo(nome);
    const accP = accordo(prossimo);

    oraBox.replaceChildren(
      h('span', { class: 'es-etichetta', testo: 'suona questo' }),
      acc ? schedaAccordo(acc, { sottotitolo: false }) : h('p', { class: 'es-mancante', testo: nome }));
    poiBox.replaceChildren(
      h('span', { class: 'es-etichetta', testo: 'poi' }),
      accP ? schedaAccordo(accP, { sottotitolo: false, dita: false }) : h('p', { class: 'es-mancante', testo: prossimo }));

    mappa.replaceChildren(...sequenza.map((n, i) => h('div', {
      class: `bat${i === indice ? ' attiva' : ''}${i < indice ? ' passata' : ''}`,
    }, h('small', { testo: String(i + 1) }), h('strong', { testo: n }))));
    const attiva = mappa.children[indice];
    if (attiva) attiva.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });

    const freq = frequenzeDi(nome);
    const giudicabili = freq ? verificabilita(freq) : null;
    cordeBox.replaceChildren(...CORDE.map((et, i) => h('div', {
      class: `nc stato-attesa${giudicabili && !giudicabili[i].verificabile ? ' non-giudicabile' : ''}`,
    },
      h('small', { testo: et }),
      h('strong', { class: 'nc-esito', testo: giudicabili && !giudicabili[i].verificabile ? '–' : '?' }))));

    aggiornaContatori();
  }

  function aggiornaContatori() {
    contatori.textContent = `${giriFatti} giri · ${cambi} cambi`;
  }

  // ── ciclo ──────────────────────────────────────────────────────────────────
  async function parti() {
    sblocca();
    try {
      await apriMicrofono();
      if (!vivo) { chiudiMicrofono(); return; }
      ascolto = new AscoltoVivo(nuovoAnalizzatore({ fftSize: 1024 }), analizzatoreAccordo());
      ascolto.impostaLatenza(0);              // qui non si misura il tempo contro una griglia
    } catch (e) {
      verdetto.className = 'verdetto errore';
      verdetto.textContent = e.name === 'NotAllowedError'
        ? 'Permesso negato. Su iPhone: Impostazioni › Safari › Microfono, poi ricarica.'
        : `Non riesco ad aprire il microfono (${e.name || 'errore'}).`;
      return;
    }
    attivo = true;
    mostratoDa = performance.now();
    tieniSchermoAcceso(true);
    avvia.textContent = 'Basta così';
    salta.classList.remove('nascosto');
    verdetto.className = 'verdetto';
    verdetto.textContent = 'Vai: suona l\'accordo che vedi.';
    timer = setInterval(ciclo, 25);
  }

  function ferma() {
    attivo = false;
    if (timer) clearInterval(timer);
    timer = null;
    ascolto = null;
    finestra = null;
    chiudiMicrofono();
    tieniSchermoAcceso(false);
    avvia.textContent = 'Riprendi';
    salta.classList.add('nascosto');
    if (cambi > 0) esitoBox.replaceChildren(schedaRiepilogo());
  }

  function ciclo() {
    if (!ascolto) return;
    const ora = performance.now();

    if (finestra) {
      ascolto.campionaAccordo();
      if (contestoAudio().currentTime >= finestra.fine) valuta();
      return;
    }

    const attacco = ascolto.ascolta();
    livello.firstChild.style.width = `${Math.round(ascolto.livello * 100)}%`;
    // Dopo un cambio riuscito la corda sta ancora suonando: senza pausa il suo stesso
    // decadimento farebbe scattare subito il cambio successivo.
    if (ora < riposoFinoA) return;
    if (!attacco) return;
    const freq = frequenzeDi(sequenza[indice]);
    if (!freq) { avanza(true); return; }
    ascolto.apriFinestraAccordo();
    ascolto.campionaAccordo();
    finestra = { fine: contestoAudio().currentTime + FINESTRA_MS / 1000, freq, nome: sequenza[indice] };
  }

  function valuta() {
    const { freq, nome } = finestra;
    finestra = null;
    const v = ascolto.giudicaAccordo(freq);
    if (!v) return;
    // Qui la presenza non basta: è il microfono a decidere se andare avanti, quindi
    // deve anche NON sentire note che l'accordo non ha. Senza, un accordo lasciato
    // suonare faceva scattare da solo il passo successivo.
    // Il nome va TRASPOSTO dal capotasto prima di chiedere quali note sono ammesse:
    // con il capotasto al 2° la forma del Sol suona un La, e le note ammesse sono
    // quelle del La. Senza, ogni nota suonata risulterebbe estranea.
    const ammesse = classiAttese(nomeSuonato(nome, d.capotasto));
    const estranea = ammesse ? energiaEstranea(ascolto.ascoltatore, ammesse.ammesse) : 0;

    [...cordeBox.children].forEach((el, i) => {
      const giudicabile = v.controllabili[i].verificabile;
      const esito = el.querySelector('.nc-esito');
      el.classList.remove('stato-attesa', 'stato-ok', 'stato-no');
      if (!giudicabile) { esito.textContent = '–'; el.classList.add('stato-attesa'); return; }
      esito.textContent = v.presenti[i] ? '✓' : '✕';
      el.classList.add(v.presenti[i] ? 'stato-ok' : 'stato-no');
    });

    if (v.ok && estranea <= SOGLIA_ESTRANEA) { avanza(false); return; }

    const mute = v.mancanti.map((m, i) => (m ? CORDE[i] : null)).filter(Boolean);
    verdetto.className = 'verdetto errore';
    if (mute.length) {
      verdetto.textContent = `Manca la corda ${mute.join(' e ')} — sistema il dito e ripennalo, non ti muovo finché non esce.`;
    } else if (estranea > SOGLIA_ESTRANEA) {
      verdetto.textContent = 'Sento una nota che in questo accordo non c\'entra: forse è quello di prima che sta ancora suonando, oppure un dito sulla corda sbagliata. Smorza le corde e ripennalo.';
    } else {
      verdetto.textContent = 'Non è ancora quello: controlla le dita e ripennalo.';
    }
    riposoFinoA = performance.now() + 250;
  }

  function avanza(saltato) {
    const ora = performance.now();
    const da = sequenza[indice];
    const a = sequenza[(indice + 1) % sequenza.length];

    if (!saltato) {
      const impiegato = ora - mostratoDa;
      const chiave = `${da}>${a}`;
      if (!tempiPerCambio.has(chiave)) tempiPerCambio.set(chiave, []);
      tempiPerCambio.get(chiave).push(impiegato);
      cambi += 1;
      cronometro.className = 'es-conta';
      cronometro.textContent = `${(impiegato / 1000).toFixed(1)} s`;
      verdetto.className = 'verdetto ok';
      verdetto.textContent = `${etichettaAccordo(accordo(da)) || da} preso in ${(impiegato / 1000).toFixed(1)} s. Ora ${a}.`;
      blip();
    } else {
      verdetto.className = 'verdetto';
      verdetto.textContent = 'Saltato.';
    }

    indice = (indice + 1) % sequenza.length;
    if (indice === 0) giriFatti += 1;
    mostratoDa = ora;
    riposoFinoA = ora + RIPOSO_MS;
    disegna();
  }

  /** Conferma acustica fuori dalla banda di ascolto, come nell'accordatore. */
  function blip() {
    const c = contestoAudio();
    const t0 = c.currentTime + 0.01;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = 3100;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.12, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.06);
    o.connect(g).connect(c.destination);
    o.start(t0);
    o.stop(t0 + 0.08);
  }

  // ── riepilogo ──────────────────────────────────────────────────────────────
  function schedaRiepilogo() {
    const righe = [...tempiPerCambio.entries()]
      .map(([chiave, tempi]) => ({
        chiave,
        medio: tempi.reduce((x, y) => x + y, 0) / tempi.length,
        volte: tempi.length,
      }))
      .sort((x, y) => y.medio - x.medio);
    const totale = righe.reduce((s, r) => s + r.medio * r.volte, 0);
    const conteggio = righe.reduce((s, r) => s + r.volte, 0);
    const massimo = righe.length ? righe[0].medio : 1;

    // Il cambio più lento va a finire nel ripasso: è quello su cui serve tornare.
    righe.slice(0, 3).forEach((r) => {
      const [da, a] = r.chiave.split('>');
      if (accordo(da) && accordo(a)) {
        ripasso.registra(ripasso.chiaveCambio(da, a), r.medio > 2500 ? 'sporco' : (r.medio > 1500 ? 'quasi' : 'pulito'));
      }
    });

    return scheda(
      h('h2', { class: 'ok', testo: `${giriFatti} giri, ${cambi} cambi` }),
      h('p', { testo: `Tempo medio per cambio: ${(totale / Math.max(1, conteggio) / 1000).toFixed(1)} s.` }),
      h('p', { class: 'occhiello', testo: 'I cambi, dal più lento' }),
      h('div', { class: 'classifica' }, ...righe.slice(0, 8).map((r) => h('div', { class: 'cl-riga' },
        h('strong', { testo: r.chiave.replace('>', ' → ') }),
        h('span', { class: 'cl-barra' }, h('span', { style: `width:${(r.medio / massimo) * 100}%` })),
        h('small', { class: 'dim', testo: `${(r.medio / 1000).toFixed(1)} s` }),
        h('small', { class: 'dim', testo: `×${r.volte}` })))),
      h('p', {
        class: 'dim piccolo',
        testo: 'I tre più lenti sono finiti nel ripasso: te li ritrovi nella schermata di apertura fra un giorno o due.',
      }),
      h('a', {
        class: 'bottone sottile',
        href: `#/esercizio/giro?b=${originale.id}&bpm=${brano.bpm}`,
        testo: 'Ora provalo col metronomo',
      }),
    );
  }

  disegna();
  return () => {
    vivo = false;
    ferma();
    chiudiMicrofono();
  };
}
