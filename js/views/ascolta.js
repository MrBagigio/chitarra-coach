// "Suona e ti dico cosa è uscito davvero".
//
// Due modi, e la differenza è dichiarata nella pagina perché cambia quanto ti puoi fidare:
//
//   verifica — sai già che accordo vuoi: il programma controlla che le note attese ci
//              siano tutte. Domanda facile, risposta affidabile, ed è quella utile:
//              l'errore vero del principiante è spegnere una corda col dito.
//
//   indovina — non gli dici niente e prova a dire che accordo è. Do6 e Lam7 sono le
//              STESSE note: la risposta è una classifica, non una sentenza.
//
// Sulla chitarra le corde "–" sono molte più che sull'ukulele, ed è onestà, non un
// peggioramento: con sei corde gli unisoni e le ottave sono la norma. In un Mi maggiore
// suonano tre Mi e due Si — le corde davvero giudicabili una per una sono tre.

import { aggiungi, h, scheda, titoloPagina, indietro, bottone } from '../ui.js';
import * as store from '../store.js';
import {
  ACCORDI, accordo, CORDE, NUMERI_CORDA, etichettaAccordo, nomeCanonico,
} from '../chords.js';
import { diagramma } from '../diagram.js';
import { accordatura, frequenzeDi } from '../tunings.js';
import { hzDaMidi } from '../pitch.js';
import { Ascoltatore, classifica, verificabilita } from '../chroma.js';
import {
  apriMicrofono, chiudiMicrofono, sblocca, suonaPennata, tieniSchermoAcceso, analizzatoreAccordo,
} from '../audio.js';
import { nomeClasse } from '../theory.js';
import * as curriculum from '../curriculum.js';

const RACCOLTA_MS = 380;      // quanto si ascolta dopo la pennata
const RIPOSO_MS = 450;        // pausa prima di accettare la pennata successiva
const RMS_MINIMO = 0.012;

export function monta(radice, ctx) {
  const d = store.dati();
  const tun = accordatura(d.accordatura);
  const idPasso = ctx.query.passo || null;
  const passo = idPasso ? curriculum.passo(idPasso) : null;
  const bersaglioIniziale = ctx.query.acc || passo?.dati.accordo || 'C';
  const daFare = Number(ctx.query.corretti || passo?.dati.corretti || 0);

  let modo = ctx.query.modo || (passo ? 'verifica' : 'verifica');
  let bersaglio = accordo(bersaglioIniziale) || accordo('C');
  let ascoltatore = null;
  let timer = null;
  let stato = 'spento';
  let inizioRaccolta = 0;
  let fineRiposo = 0;
  let corretti = 0;
  let giaConcluso = false;
  let vivo = true;

  const frequenze = () => frequenzeDi(bersaglio.tasti, tun, d.capotasto, d.la4);

  // ── testata ────────────────────────────────────────────────────────────────
  const selettore = h('select', {
    class: 'campo', 'aria-label': 'Accordo da verificare',
    onchange: (e) => { bersaglio = accordo(e.target.value); corretti = 0; disegnaBersaglio(); },
  }, ...ACCORDI.filter((a) => !a.posizione).map((a) => h('option', {
    value: a.id, selected: a.id === bersaglio.id, testo: `${etichettaAccordo(a)} — ${a.esteso}`,
  })));

  const diaBox = h('div', { class: 'accordo-grande' });
  const cordeBox = h('div', { class: 'note-corde ascolto' });
  const verdetto = h('p', { class: 'verdetto', testo: 'Accendi il microfono e pennalo.' });
  const notaNonGiudicabili = h('p', { class: 'dim piccolo nascosto' });
  const contatore = h('p', { class: 'dim piccolo' });
  const classificaBox = h('div', { class: 'classifica' });
  const chromaBox = h('div', { class: 'chroma' });
  const livello = h('div', { class: 'barra-livello' }, h('span'));

  const bottoniModo = h('div', { class: 'chips', role: 'group', 'aria-label': 'Modo' },
    ...[['verifica', 'Verifica un accordo'], ['indovina', 'Indovina che accordo è']].map(([v, et]) => h('button', {
      class: `chip${modo === v ? ' attiva' : ''}`, type: 'button', dati: { modo: v },
      onclick: () => { modo = v; aggiornaModo(); },
    }, et)));

  const bottoneMic = bottone('Accendi il microfono', accendi, { classe: 'grande' });
  const bottoneStop = bottone('Spegni il microfono', spegni, { classe: 'sottile nascosto' });
  const avviso = h('div', { class: 'avviso nascosto' });

  const schedaVerifica = scheda(
    h('p', { class: 'occhiello', testo: 'Accordo da controllare' }),
    passo ? null : selettore,
    diaBox,
    cordeBox,
    notaNonGiudicabili,
    verdetto,
    contatore,
    bottone('Ascolta com\'è quando è giusto', () => {
      sblocca();
      suonaPennata(frequenze());
    }, { classe: 'sottile' }),
  );

  const schedaIndovina = scheda(
    h('p', { class: 'occhiello', testo: 'Che accordo è' }),
    h('p', { class: 'dim piccolo', testo: 'Penna un accordo qualsiasi. Se due accordi hanno le stesse note (Do6 e Lam7, per esempio) compaiono entrambi: non è indecisione, è che sono lo stesso suono.' }),
    classificaBox,
    chromaBox,
  );

  aggiungi(radice, 
    idPasso ? h('div', { class: 'testa-riga' }, indietro(`#/passo/${idPasso}`, 'Passo')) : null,
    titoloPagina('Ascolta', 'Il microfono controlla quali note escono davvero dallo strumento.'),
    passo ? null : scheda(bottoniModo),
    schedaVerifica,
    schedaIndovina,
    scheda(h('p', { class: 'dim piccolo', testo: 'Livello del segnale' }), livello, bottoneMic, bottoneStop, avviso),
  );

  function aggiornaModo() {
    bottoniModo.querySelectorAll('[data-modo]').forEach((b) => b.classList.toggle('attiva', b.dataset.modo === modo));
    schedaVerifica.classList.toggle('nascosto', modo !== 'verifica');
    schedaIndovina.classList.toggle('nascosto', modo !== 'indovina');
  }
  aggiornaModo();

  function disegnaBersaglio() {
    diaBox.replaceChildren(diagramma(bersaglio, { tasti: 5 }));
    const controllabili = verificabilita(frequenze());
    cordeBox.replaceChildren(...CORDE.map((nome, i) => h('div', {
      class: `nc stato-attesa${controllabili[i].verificabile ? '' : ' non-giudicabile'}`,
      dati: { corda: String(i) },
    },
      h('small', { testo: `${NUMERI_CORDA[i]} ${nome}` }),
      h('strong', { class: 'nc-esito', testo: controllabili[i].verificabile ? '?' : '–' }),
      h('span', { class: 'dim piccolo', testo: bersaglio.tasti[i] < 0 ? 'muta' : (bersaglio.tasti[i] === 0 ? 'libera' : `tasto ${bersaglio.tasti[i]}`) }))));

    // Il perché di un "–" va detto sullo schermo: un tooltip su un telefono non esiste.
    const fuoriPortata = controllabili
      .map((c, i) => (c.verificabile || bersaglio.tasti[i] < 0 ? null : NUMERI_CORDA[i]))
      .filter(Boolean);
    notaNonGiudicabili.textContent = fuoriPortata.length
      ? `La ${fuoriPortata.join(', la ')} ${fuoriPortata.length > 1 ? 'sono segnate' : 'è segnata'} "–": suonano una nota che un'altra corda già produce, quindi spegnendole lo spettro non cambia e nessun programma può accorgersene. Non è un difetto, è fisica — e con sei corde capita spesso.`
      : '';
    notaNonGiudicabili.classList.toggle('nascosto', !fuoriPortata.length);
    aggiornaContatore();
  }

  function aggiornaContatore() {
    contatore.textContent = daFare
      ? `${corretti} su ${daFare} accordi puliti`
      : (corretti ? `${corretti} accordi puliti finora` : '');
  }

  disegnaBersaglio();

  // ── microfono ──────────────────────────────────────────────────────────────
  async function accendi() {
    sblocca();
    avviso.className = 'avviso neutro';
    avviso.textContent = 'Apertura del microfono…';
    try {
      await apriMicrofono();
      if (!vivo) { chiudiMicrofono(); return; }
      // Analizzatore DEDICATO, non quello dell'accordatore con la finestra cambiata sotto:
      // le due domande vogliono finestre diverse e cambiare la proprietà di un nodo
      // condiviso significa peggiorare l'altra misura di nascosto.
      ascoltatore = new Ascoltatore(analizzatoreAccordo());
      avviso.className = 'avviso nascosto';
      avviso.textContent = '';
      bottoneMic.classList.add('nascosto');
      bottoneStop.classList.remove('nascosto');
      tieniSchermoAcceso(true);
      stato = 'attesa';
      verdetto.textContent = 'Penna l\'accordo.';
      timer = setInterval(ciclo, 30);
    } catch (e) {
      avviso.className = 'avviso errore';
      avviso.textContent = e.name === 'NotAllowedError'
        ? 'Permesso negato. Su iPhone: Impostazioni › Safari › Microfono, poi ricarica.'
        : `Non riesco ad aprire il microfono (${e.name || 'errore'}).`;
    }
  }

  function spegni() {
    if (timer) clearInterval(timer);
    timer = null;
    ascoltatore = null;
    stato = 'spento';
    chiudiMicrofono();
    tieniSchermoAcceso(false);
    bottoneMic.classList.remove('nascosto');
    bottoneStop.classList.add('nascosto');
  }

  // ── ciclo: attesa → raccolta → verdetto ────────────────────────────────────
  function ciclo() {
    if (!ascoltatore) return;
    const rms = ascoltatore.campiona();
    livello.firstChild.style.width = `${Math.min(100, rms * 900).toFixed(0)}%`;
    const ora = performance.now();

    if (stato === 'attesa') {
      if (rms >= RMS_MINIMO && ora >= fineRiposo) {
        ascoltatore.azzera();
        ascoltatore.campiona();
        inizioRaccolta = ora;
        stato = 'raccolta';
        verdetto.textContent = 'Ascolto…';
        verdetto.className = 'verdetto';
      }
      return;
    }

    if (stato === 'raccolta' && ora - inizioRaccolta >= RACCOLTA_MS) {
      valuta();
      stato = 'attesa';
      fineRiposo = ora + RIPOSO_MS;
    }
  }

  function valuta() {
    if (modo === 'indovina') return valutaIndovina();
    const attese = frequenze();
    const v = ascoltatore.verifica(attese);
    const nomiCorde = CORDE;
    [...cordeBox.children].forEach((el, i) => {
      const giudicabile = v.controllabili[i].verificabile;
      const esito = el.querySelector('.nc-esito');
      el.classList.remove('stato-attesa', 'stato-ok', 'stato-no');
      if (!giudicabile) { esito.textContent = '–'; el.classList.add('stato-attesa'); return; }
      const presente = v.presenti[i];
      esito.textContent = presente ? '✓' : '✕';
      el.classList.add(presente ? 'stato-ok' : 'stato-no');
    });

    if (v.ok) {
      corretti += 1;
      verdetto.className = 'verdetto ok';
      verdetto.textContent = `Pulito: ci sono tutte le note di ${etichettaAccordo(bersaglio)}.`;
      aggiornaContatore();
      if (daFare && corretti >= daFare) concludi();
    } else {
      const mute = v.mancanti.map((m, i) => (m ? nomiCorde[i] : null)).filter(Boolean);
      verdetto.className = 'verdetto errore';
      verdetto.textContent = mute.length === 1
        ? `Non sento la corda ${mute[0]}: probabilmente un dito la sta sfiorando, oppure non preme abbastanza.`
        : `Non sento le corde ${mute.join(' e ')}. Rimetti le dita più curve e più vicine alla barretta.`;
      aggiornaContatore();
    }
  }

  function valutaIndovina() {
    const chroma = ascoltatore.chroma();
    const candidati = [...new Set(ACCORDI.filter((a) => !a.posizione).map((a) => nomeCanonico(a)))];
    const cls = classifica(chroma, candidati).slice(0, 4);
    classificaBox.replaceChildren(...cls.map((c, i) => {
      const acc = accordo(c.nome);
      return h('div', { class: `cl-riga${i === 0 ? ' primo' : ''}` },
        h('strong', { testo: c.nome }),
        h('span', { class: 'cl-barra' }, h('span', { style: `width:${Math.max(0, Math.min(1, c.punteggio)) * 100}%` })),
        h('small', { class: 'dim', testo: c.punteggio.toFixed(2) }),
        acc ? diagramma(acc, { dita: true, tasti: 4 }) : null);
    }));
    const max = Math.max(...chroma, 0.0001);
    chromaBox.replaceChildren(...Array.from({ length: 12 }, (_, pc) => h('div', { class: 'ch-col' },
      h('span', { class: 'ch-barra', style: `height:${(chroma[pc] / max) * 100}%` }),
      h('small', { testo: nomeClasse(pc) }))));
  }

  function concludi() {
    // Una volta sola. Prima ogni pennata pulita successiva alla soglia riaggiungeva la
    // scheda: cinque pennate lasciavano nove "Passo completato" impilati sotto.
    if (giaConcluso) return;
    giaConcluso = true;
    if (idPasso) store.segnaPasso(idPasso, { corretti });
    const prossimo = curriculum.prossimoPasso(store.dati().passiFatti);
    const box = scheda(
      h('h2', { class: 'ok', testo: 'Passo completato' }),
      h('p', { testo: `${corretti} accordi puliti verificati dal microfono, non dal tuo orecchio ottimista.` }),
      prossimo ? h('a', { class: 'bottone', href: `#/passo/${prossimo.id}`, testo: `Prossimo: ${prossimo.titolo}` }) : null,
    );
    radice.appendChild(box);
    box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    daFareRaggiunto();
  }

  function daFareRaggiunto() {
    contatore.classList.add('ok');
  }

  return () => { vivo = false; spegni(); };
}
