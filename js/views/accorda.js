// Accordatore.
//
// Regola di progetto: l'accordatore non dice mai "a posto" per gentilezza — un picco
// fortunato dentro la soglia non è una corda accordata, e una spunta regalata fa
// accordare male.
//
// Ma la regola va applicata a come si comporta una corda VERA, non a come sarebbe
// comodo. Il nylon pizzicato parte crescente e cala mentre si spegne: attraversa la
// soglia più volte in un secondo. Pretendere 700 ms ININTERROTTI dentro 5 centesimi
// sembrava rigore ed era irraggiungibile — la corda non veniva mai dichiarata
// accordata e il passo del percorso non si chiudeva mai. Ora si SOMMANO 450 ms dentro
// tolleranza in una finestra di 1,6 s: stessa severità sul risultato, nessuna pretesa
// sulla stabilità istantanea.

import { aggiungi, h, scheda, titoloPagina, bottone } from '../ui.js';
import * as store from '../store.js';
import { ACCORDATURE, accordatura } from '../tunings.js';
import { NUMERI_CORDA, SPESSORE_CORDA, DOVE_CORDA } from '../chords.js';
import {
  Rilevatore, hzDaMidi, nota, centesimi, decisioneDisplay, spuntaDaTogliere, msDentroFinestra,
} from '../pitch.js';
import {
  apriMicrofono, chiudiMicrofono, microfonoAperto, sblocca,
  suonaNota, fermaNota, tieniSchermoAcceso, contesto as contestoAudio,
} from '../audio.js';
import { nomeItaliano } from '../theory.js';
import * as curriculum from '../curriculum.js';

const TOLLERANZA = 5;         // centesimi per dichiarare accordata una corda
const TOLLERANZA_USCITA = 12; // e per toglierle la spunta: isteresi, o lampeggia
const STABILE_MS = 450;       // quanto tempo dentro tolleranza serve, SOMMATO
const FINESTRA_MS = 1600;     // in quale finestra si somma
const ISTRUZIONI_CORDE = 'Sono disposte come le vedi guardando la chitarra: la 6ª più grossa a sinistra, la 1ª più sottile a destra. Tocca un riquadro per accordare solo quella corda, il tastino ♪ per sentire com\'è quando è giusta.';
const AGGANCIO_CENT = 400;    // oltre questo scarto la corda non è "quella"
const TENUTA_MS = 4000;       // per quanto resta a schermo l'ultima lettura buona

export function monta(radice, ctx) {
  const d = store.dati();
  let acc = accordatura(d.accordatura);
  let cordaScelta = null;             // null = riconoscimento automatico
  let rilevatore = null;
  // Anche qui un timer e non requestAnimationFrame: la misura non deve dipendere dal
  // fatto che il telefono stia disegnando. 40 letture al secondo bastano per la lancetta
  // e non lasciano l'accordatore fermo su un valore vecchio quando i frame rallentano.
  let timer = null;
  let centEsposti = 0;
  const maiFatte = new Set();   // corde accordate almeno una volta in questa sessione
  const campioni = [];          // storia recente dentro/fuori tolleranza
  let cordaMisurata = null;
  let ultima = null;            // ultima lettura valida, per la tenuta
  let silenzioFinoA = 0;        // mentre suona il riferimento non si misura
  const fatte = new Set();
  let vivo = true;

  const bersagli = () => acc.corde.map((c) => ({ ...c, hz: hzDaMidi(c.midi, d.la4) }));

  // ── struttura ──────────────────────────────────────────────────────────────
  const selettore = h('select', {
    class: 'campo', 'aria-label': 'Accordatura',
    onchange: (e) => {
      store.imposta('accordatura', e.target.value);
      acc = accordatura(e.target.value);
      cordaScelta = null;
      fatte.clear();
      maiFatte.clear();
      campioni.length = 0;
      cordaMisurata = null;
      disegnaCorde();
      aggiornaModo();
      dettaglio.textContent = acc.dettaglio;
    },
  }, ...ACCORDATURE.map((a) => h('option', { value: a.id, selected: a.id === acc.id, testo: a.nome })));

  const dettaglio = h('p', { class: 'dim piccolo', testo: acc.dettaglio });

  // A riposo NON si scrive un trattino: un rettangolo bianco a mezz'aria sembra un guasto,
  // e questa è la prima schermata che si apre. Si scrive cosa fare.
  const notaGrande = h('div', { class: 'tn-nota vuota', testo: 'Pizzica' });
  const notaIt = h('div', { class: 'tn-nota-it', testo: 'una corda alla volta, senza premere niente' });
  // L'istruzione grande è la cosa più importante di questa schermata: mentre accordi
  // guardi le tue mani, non lo schermo, e quello che coglie l'occhio di lato è una
  // parola grossa e un colore — non una freccina in fondo alla pagina.
  const azione = h('div', { class: 'tn-azione', testo: '' });
  const hzTesto = h('div', { class: 'tn-hz', testo: '' });
  const centTesto = h('div', { class: 'tn-cent', testo: '' });

  const lancetta = h('div', { class: 'tn-lancetta' });
  const quadrante = h('div', { class: 'tn-quadrante spento' },
    h('div', { class: 'tn-zona' }),
    h('div', { class: 'tn-zero' }),
    h('div', { class: 'tn-tacche' },
      ...[-50, -25, 0, 25, 50].map((v) => h('span', { class: v === 0 ? 'centro' : '', testo: v === 0 ? '' : String(v) }))),
    lancetta);

  // Barra del livello. Risponde alla domanda che prima non si poteva nemmeno fare:
  // "non mi sente perché suono troppo piano, o perché non capisce quello che suono?"
  // Sono due problemi con due rimedi opposti — avvicinare il telefono, oppure lasciar
  // smettere la corda di ronzare — e senza questa barra erano indistinguibili.
  // La tacca segna dove sta la soglia del silenzio in QUESTA stanza: quando la barra la
  // supera, l'app sta misurando; quando resta sotto, sta zitta per un motivo onesto.
  const livelloBarra = h('div', { class: 'tn-livello-barra' });
  const livelloSoglia = h('div', { class: 'tn-livello-soglia' });
  const livelloTesto = h('div', { class: 'tn-livello-testo', testo: 'microfono spento' });
  const livello = h('div', { class: 'tn-livello spento' },
    h('div', { class: 'tn-livello-pista' }, livelloBarra, livelloSoglia), livelloTesto);

  // Niente più freccine "allenta / tendi" sotto il quadrante: dicevano la stessa cosa
  // della parola grossa, ma su lati opposti (la lancetta va a sinistra, l'istruzione
  // stava a destra) e in mezzo secondo di occhiata sembravano contraddirsi.
  const misuratore = h('div', { class: 'tn-misuratore' },
    notaGrande, notaIt, quadrante, azione, h('div', { class: 'tn-riga' }, hzTesto, centTesto), livello);

  const modo = h('p', { class: 'tn-modo' });
  const corde = h('div', { class: 'tn-corde' });
  const avviso = h('div', { class: 'avviso nascosto' });
  const esito = h('p', { class: 'dim piccolo', testo: ISTRUZIONI_CORDE });

  // Con il capotasto messo le corde a vuoto non sono più quelle: la 6ª col capotasto al
  // 2° suona Fa♯, non Mi. Questo accordatore misura le corde VERE, quindi le direbbe
  // tutte crescenti di due semitoni. Meglio dirlo qui che lasciarlo scoprire girando
  // le chiavi — ed è anche il consiglio giusto: con il capotasto le corde si tendono, e
  // accordare così porta lo strumento fuori appena lo togli.
  const avvisoCapotasto = d.capotasto
    ? h('p', {
      class: 'avviso attenzione',
      testo: `Hai il capotasto al ${d.capotasto}° tasto: toglilo per accordare. Con il capotasto messo le corde suonano ${d.capotasto} semitoni più in alto, e l'accordatore te le direbbe tutte crescenti.`,
    })
    : null;

  const bottoneMic = bottone('Attiva il microfono', avviaMic, { classe: 'grande' });
  const bottoneStop = bottone('Chiudi il microfono', () => { fermaTutto(); statoMic(false); }, { classe: 'sottile nascosto' });

  // Ordine pensato per il pollice: il pulsante che accende sta sotto il quadrante, non
  // in fondo alla pagina, e le corde da toccare vengono dopo. In coda un consiglio vero
  // invece di spazio vuoto: chi apre l'accordatore la prima volta non sa in che ordine
  // si accorda, e nessuno glielo dice.
  aggiungi(radice,
    titoloPagina('Accordatore', 'Serve il microfono: resta tutto sul telefono, niente esce da qui.'),
    scheda(h('div', { class: 'riga-campi' }, selettore), dettaglio),
    scheda(misuratore, bottoneMic, bottoneStop, avviso, avvisoCapotasto, modo, corde, esito),
    scheda(
      h('p', { class: 'occhiello', testo: 'Se è la prima volta' }),
      h('ol', { class: 'elenco' },
        h('li', { testo: 'Pizzica una corda sola e lasciala suonare: se le tocchi tutte insieme il programma non sa quale stai accordando.' }),
        h('li', { testo: 'Se la nota è troppo bassa la chiave va girata per TENDERE la corda; se è troppo alta si allenta. La freccia accesa te lo dice.' }),
        h('li', { testo: 'Arriva sempre alla nota salendo: se sei andato oltre, allenta sotto e risali. La corda tiene meglio l\'accordatura.' }),
        h('li', { testo: 'Una corda nuova scende per giorni: rifallo prima di ogni sessione finché non si assesta.' }))),
  );

  function statoMic(aperto) {
    bottoneMic.classList.toggle('nascosto', aperto);
    bottoneStop.classList.toggle('nascosto', !aperto);
  }

  function mostraAvviso(testo, tono = 'attenzione') {
    avviso.className = `avviso ${tono}`;
    avviso.textContent = testo;
  }

  // ── corde ──────────────────────────────────────────────────────────────────
  //
  // Due azioni diverse su due bersagli diversi, e prima erano lo stesso bottone:
  // toccare una corda SCEGLIE quella corda (e il secondo tocco torna in automatico),
  // il tastino con la nota la fa SENTIRE. Prima un tocco solo faceva entrambe le cose,
  // quindi chi voleva riascoltare la nota usciva dalla modalità manuale senza volerlo.
  function disegnaCorde() {
    corde.replaceChildren(...bersagli().map((c, i) => {
      const scelta = cordaScelta === i;
      return h('div', {
        // "ok" = a posto adesso. "gia" = l'hai accordata in questa sessione ma è
        // scesa un po': è lo stato normale delle corde nuove, e va distinto dal
        // non averla mai toccata.
        class: `tn-corda${fatte.has(i) ? ' ok' : (maiFatte.has(i) ? ' gia' : '')}${scelta ? ' scelta' : ''}`,
        dati: { corda: String(i) },
      },
        h('button', {
          class: 'tn-corda-scegli',
          type: 'button',
          'aria-pressed': scelta ? 'true' : 'false',
          onclick: () => {
            cordaScelta = scelta ? null : i;
            disegnaCorde();
            aggiornaModo();
          },
        },
          // Il numero di corda, non solo la lettera: su una chitarra le corde chiamate
          // "E" sono DUE, la 6ª e la 1ª, a due ottave di distanza. Distinguerle per la
          // sola frequenza scritta piccola sotto è chiedere a chi impara di fare un
          // conto che il programma può fare per lui.
          // Il filo disegnato grosso quanto la corda vera. È la parte che risponde
          // davvero alla domanda "quale pizzico": il numero va imparato, lo spessore
          // si riconosce guardando lo strumento, senza sapere niente.
          h('span', { class: 'tn-filo', style: `height:${SPESSORE_CORDA[i]}px` }),
          h('strong', {}, h('span', { class: 'tn-numero', testo: NUMERI_CORDA[i] }), c.etichetta),
          h('span', { class: 'tn-spunta', testo: fatte.has(i) ? '✓' : (maiFatte.has(i) ? '·' : '') })),
        h('button', {
          class: 'tn-corda-suona',
          type: 'button',
          'aria-label': `Ascolta la ${NUMERI_CORDA[i]} corda, ${c.etichetta}`,
          onclick: () => {
            sblocca();
            suonaNota(c.hz, 1.8);
            // Finché suona il riferimento la misura si FERMA: altrimenti il microfono
            // sente la nota dell'app e l'accordatore accorda sé stesso — segnerebbe
            // "a posto" con lo strumento in custodia.
            silenzioFinoA = performance.now() + 2100;
            misuratore.classList.add('riferimento');
            notaIt.textContent = `sto suonando il ${nomeItaliano(c.etichetta)} giusto — confrontalo a orecchio`;
          },
        }, '♪'));
    }));
  }

  /**
   * Quando fissi una corda, la cosa da dire non è come si chiama: è DOVE STA.
   *
   * "Sto ascoltando solo la corda E" non serviva: di corde chiamate E ce ne sono due, e
   * comunque il nome non dice quale pizzicare. Nemmeno il numero basta da solo, perché
   * le corde si contano dal basso verso l'alto — al contrario di come si leggono i
   * diagrammi. Quindi si dice a parole: la più grossa, la seconda dall'alto, la più
   * sottile.
   */
  function aggiornaModo() {
    const nome = cordaScelta === null ? null : bersagli()[cordaScelta].etichetta;
    modo.textContent = nome
      ? `Pizzica la ${NUMERI_CORDA[cordaScelta]} corda — ${DOVE_CORDA[cordaScelta]}. Sto ascoltando solo lei; tocca di nuovo il riquadro per tornare in automatico.`
      : 'Riconoscimento automatico: capisce da sé quale corda hai pizzicato. Tocca un riquadro per fissarne una.';
    modo.className = `tn-modo${nome ? ' manuale' : ''}`;
  }

  disegnaCorde();
  aggiornaModo();

  // ── microfono ──────────────────────────────────────────────────────────────
  async function avviaMic() {
    sblocca();                               // dentro il gesto: su iOS non è rinviabile
    mostraAvviso('Apertura del microfono…', 'neutro');
    try {
      const analyser = await apriMicrofono();
      if (!vivo) { chiudiMicrofono(); return; }
      rilevatore = new Rilevatore(analyser);
      avviso.className = 'avviso nascosto';
      avviso.textContent = '';
      statoMic(true);
      tieniSchermoAcceso(true);
      if (timer) clearInterval(timer);
      timer = setInterval(ciclo, 25);
    } catch (e) {
      statoMic(false);
      mostraAvviso(spiegaErrore(e), 'errore');
    }
  }

  function spiegaErrore(e) {
    const inApp = window.matchMedia('(display-mode: standalone)').matches;
    switch (e.name) {
      case 'NotAllowedError':
        return 'Permesso negato. Su iPhone: Impostazioni › Safari › Microfono, oppure ricarica la pagina e scegli "Consenti". '
          + (inApp ? 'Se hai aperto l\'app dalla schermata Home, prova una volta da Safari per dare il permesso.' : '');
      case 'NotFoundError':
        return 'Nessun microfono trovato su questo dispositivo.';
      case 'NotSupportedError':
        return 'Questo browser non consente l\'accesso al microfono. Serve una connessione sicura (https) e un browser recente.';
      default:
        return `Non riesco ad aprire il microfono (${e.name || 'errore'}). Puoi comunque accordare a orecchio toccando le corde qui sopra.`;
    }
  }

  function fermaTutto() {
    if (timer) clearInterval(timer);
    timer = null;
    rilevatore = null;
    chiudiMicrofono();
    fermaNota();
    tieniSchermoAcceso(false);
  }

  // ── ciclo di misura ────────────────────────────────────────────────────────
  //
  // La corda pizzicata si spegne in un paio di secondi, e mentre giri la chiave non
  // suona. Prima la lettura spariva subito e tornava "Pizzica": si girava la chiave
  // alla cieca, senza sapere se si stava andando nel verso giusto. Adesso l'ultima
  // lettura buona RESTA per qualche secondo, marcata come tenuta.
  function ciclo() {
    if (!rilevatore) return;
    const ora = performance.now();

    // Sordina durante la nota di riferimento: si legge lo spettro solo per non far
    // accumulare storia sporca al rilevatore, ma non si aggiorna niente a schermo.
    if (ora < silenzioFinoA) {
      rilevatore.leggi();
      return;
    }
    if (misuratore.classList.contains('riferimento')) {
      misuratore.classList.remove('riferimento');
      notaIt.textContent = 'ora pizzica la corda vera';
    }

    const lettura = rilevatore.leggi();
    mostraLivello(lettura);

    if (!lettura.hz) {
      // La decisione sta in `pitch.js`, sotto collaudo: è il punto in cui l'accordatore
      // ha già sbagliato una volta, restando congelato su "A POSTO" mentre sentiva solo
      // il ronzio della corda che stavo accordando.
      const cosaFare = decisioneDisplay({
        hz: lettura.hz,
        silenzio: lettura.silenzio,
        ultimaDa: ultima ? ora - ultima.quando : null,
        tenutaMs: TENUTA_MS,
      });
      if (cosaFare === 'tenuta') {
        misuratore.classList.add('tenuta');
        notaIt.textContent = `ultima lettura di ${((ora - ultima.quando) / 1000).toFixed(1)} s fa — gira la chiave e ripizzica`;
        return;
      }
      azzeraMisura(cosaFare === 'azzera-silenzio'
        ? 'una corda alla volta, senza premere niente'
        : 'sento un suono ma non è una nota chiara: aspetta che la corda smetta di ronzare e ripizzica');
      return;
    }

    const lista = bersagli();
    let indice = cordaScelta;
    if (indice === null) {
      let migliore = Infinity;
      lista.forEach((c, i) => {
        const s = Math.abs(centesimi(lettura.hz, c.hz));
        if (s < migliore) { migliore = s; indice = i; }
      });
      if (migliore > AGGANCIO_CENT) indice = null;
    }

    const n = nota(lettura.hz, d.la4);
    misuratore.classList.remove('tenuta');
    notaGrande.classList.remove('vuota');
    notaGrande.textContent = indice !== null ? lista[indice].etichetta : n.nome;
    notaIt.textContent = indice !== null
      ? `${NUMERI_CORDA[indice]} corda · ${nomeItaliano(lista[indice].etichetta)}`
      : `nota rilevata: ${nomeItaliano(n.nome)}${n.ottava ? ` (${n.nome}${n.ottava})` : ''}`;
    hzTesto.textContent = `${lettura.hz.toFixed(1)} Hz`;

    const scarto = indice !== null
      ? centesimi(lettura.hz, lista[indice].hz)
      : n.centesimi;
    centTesto.textContent = `${scarto >= 0 ? '+' : ''}${scarto.toFixed(0)} cent`;
    muoviLancetta(scarto, 0.25);
    ultima = { quando: ora, scarto, indice };

    const dentro = Math.abs(scarto) <= TOLLERANZA;
    const vicino = Math.abs(scarto) <= TOLLERANZA * 4;
    quadrante.className = `tn-quadrante ${dentro ? 'ok' : (vicino ? 'vicino' : 'lontano')}`;

    // La parola grossa: quello che devi FARE con la mano, non dov'è la lancetta.
    // "Tira" e "allenta" sono azioni sulla chiave; il verso della lancetta è una
    // conseguenza, e chi sta accordando per la prima volta non deve tradurla.
    azione.textContent = dentro ? 'A POSTO' : (scarto < 0 ? 'TIRA' : 'ALLENTA');
    azione.className = `tn-azione ${dentro ? 'ok' : (scarto < 0 ? 'tira' : 'allenta')}${vicino && !dentro ? ' quasi' : ''}`;

    if (indice !== null) {
      // Il tempo dentro tolleranza si accumula per corda: cambiando corda si riparte.
      if (indice !== cordaMisurata) { cordaMisurata = indice; campioni.length = 0; }
      campioni.push({ t: ora, dentro });
      const accumulato = msDentroFinestra(campioni, ora, FINESTRA_MS);
      if (accumulato >= STABILE_MS && !fatte.has(indice)) {
        fatte.add(indice);
        maiFatte.add(indice);
        blip();
        disegnaCorde();
        controllaCompletamento();
      }
    }

    if (!dentro) {
      // La spunta si TOGLIE se la corda torna fuori.
      //
      // Prima restava verde per sempre: bastava che una corda fosse stata a posto una
      // volta e l'app continuava a dirlo anche con la corda calata di mezzo semitono,
      // fino a dichiarare "tutte a posto" su uno strumento scordato. La soglia per
      // toglierla è più larga di quella per metterla (12 contro 5 centesimi), altrimenti
      // la spunta lampeggerebbe sul confine.
      if (indice !== null && spuntaDaTogliere({
        giaFatta: fatte.has(indice), scarto, tolleranzaUscita: TOLLERANZA_USCITA,
      })) {
        fatte.delete(indice);
        disegnaCorde();
        aggiornaEsito();
      }
    }
  }

  /**
   * La barra del livello, aggiornata a OGNI giro — anche, anzi soprattutto, quando non
   * c'è nessuna nota da mostrare. È lì che serve: quando l'app tace.
   *
   * Il testo dice una cosa sola e concreta, quella che si può fare adesso. "Troppo
   * piano" con la barra sotto la tacca vuol dire avvicina il telefono o pizzica più
   * deciso; se invece la barra supera la tacca e la nota non compare, il problema non è
   * il volume ed è giusto che l'app lo dica.
   */
  function mostraLivello(lettura) {
    livello.classList.remove('spento');
    const q = Math.round(lettura.livello * 100);
    livelloBarra.style.width = `${q}%`;
    // Dove cade la soglia sulla stessa scala della barra: così la tacca e la barra
    // parlano della stessa grandezza invece di essere due disegni scollegati.
    livelloSoglia.style.left = `${Math.round(rilevatore.livello(lettura.soglia) * 100)}%`;
    const passa = lettura.rms >= lettura.soglia;
    livello.classList.toggle('scarso', !passa);
    livello.classList.toggle('forte', q >= 92);
    if (!passa) livelloTesto.textContent = 'troppo piano — avvicina il telefono o pizzica più deciso';
    else if (q >= 92) livelloTesto.textContent = 'fortissimo — allontana un po\' il telefono';
    else livelloTesto.textContent = 'ti sento';
  }

  function azzeraMisura(messaggio) {
    ultima = null;
    misuratore.classList.remove('tenuta');
    notaIt.textContent = messaggio;
    hzTesto.textContent = '';
    centTesto.textContent = '';
    notaGrande.textContent = 'Pizzica';
    notaGrande.classList.add('vuota');
    quadrante.className = 'tn-quadrante spento';
    azione.textContent = '';
    azione.className = 'tn-azione';
    muoviLancetta(0, 0.12);
  }

  /**
   * Il segnale acustico quando la corda entra in accordatura.
   *
   * Sta a 3,1 kHz, cioè SOPRA la banda in cui si cercano le corde: un conferma-tono
   * dentro la banda verrebbe risentito dal microfono e riconosciuto come una nota,
   * e l'accordatore finirebbe per accordare sé stesso. Serve perché mentre accordi
   * guardi le mani: il verde sullo schermo non lo vedi, il "blip" lo senti.
   */
  function blip() {
    const c = contestoAudio();
    const t0 = c.currentTime + 0.01;
    [0, 0.09].forEach((ritardo) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = 3100;
      g.gain.setValueAtTime(0, t0 + ritardo);
      g.gain.linearRampToValueAtTime(0.16, t0 + ritardo + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + ritardo + 0.075);
      o.connect(g).connect(c.destination);
      o.start(t0 + ritardo);
      o.stop(t0 + ritardo + 0.1);
    });
  }

  function muoviLancetta(cent, morbidezza) {
    const limite = 50;
    const bersaglio = Math.max(-limite, Math.min(limite, cent));
    centEsposti += (bersaglio - centEsposti) * morbidezza;
    // In percentuale del quadrante, non della lancetta: translateX(%) userebbe la
    // larghezza della lancetta stessa e la farebbe muovere di quattro pixel.
    lancetta.style.left = `${(50 + (centEsposti / limite) * 48).toFixed(2)}%`;
    lancetta.classList.toggle('fuori', Math.abs(cent) > limite);
  }

  function aggiornaEsito() {
    if (maiFatte.size === 0) {
      esito.className = 'dim piccolo';
      esito.textContent = ISTRUZIONI_CORDE;
      return;
    }
    if (maiFatte.size < acc.corde.length) {
      const mancano = acc.corde
        .map((c, i) => (maiFatte.has(i) ? null : `${NUMERI_CORDA[i]} (${c.etichetta})`))
        .filter(Boolean);
      esito.className = 'dim piccolo';
      esito.textContent = `${maiFatte.size} su ${acc.corde.length} — manca ${mancano.join(', ')}.`;
      return;
    }
    esito.className = 'dim piccolo ok';
    esito.textContent = fatte.size === acc.corde.length
      ? 'Tutte a posto. Buona sessione.'
      : 'Le hai accordate tutte e quattro. Qualcuna è già scesa un po\': è normale con le corde nuove.';
  }

  function controllaCompletamento() {
    aggiornaEsito();
    // Il passo si chiude su `maiFatte`, non su `fatte`.
    //
    // `fatte` è lo stato ADESSO, e mentre accordi la quarta corda la prima può già
    // essere scesa di un pelo: pretendere che tutte e quattro siano dentro nello stesso
    // istante non chiudeva mai il passo su uno strumento vero. Quello che è vero, e che
    // basta dire, è "in questa sessione le hai accordate tutte e quattro".
    if (maiFatte.size < acc.corde.length) return;
    if (!store.passoFatto('l0-accorda')) {
      store.segnaPasso('l0-accorda', { accordatura: acc.id });
      const p = curriculum.passo('l0-accorda');
      radice.appendChild(scheda(
        h('p', { class: 'ok', testo: `Passo completato: ${p.titolo}` }),
        h('a', { class: 'bottone', href: '#/percorso', testo: 'Vai al percorso' }),
      ));
    }
  }

  if (microfonoAperto()) avviaMic();

  return () => { vivo = false; fermaTutto(); };
}
