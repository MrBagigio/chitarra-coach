// Il motore degli esercizi: cambio accordi, ritmo/arpeggio, giro o brano.
//
// Onestà dichiarata: il programma NON sente se hai suonato bene — per quello c'è la
// sezione Ascolta, che il microfono ce l'ha. Qui si misura il tempo, la velocità e quante
// battute hai tenuto, cioè quello che un metronomo con la memoria può misurare davvero.
// Il giudizio sulla pulizia resta a te, e la scheda finale te lo chiede invece di
// inventarselo.

import { aggiungi, h, scheda, indietro, bottone, barra, plurale } from '../ui.js';
import * as store from '../store.js';
import { accordo, etichettaAccordo, CORDE } from '../chords.js';
import { schedaAccordo } from '../diagram.js';
import { ritmo as ritmoPerId, etichette, simbolo, cordeDiCasella, classeDito } from '../patterns.js';
import { branoSeEsiste, accordiDi, branoTrasportato, tonalitaDi } from '../songs.js';
import {
  Metronomo, sblocca, tieniSchermoAcceso, apriMicrofono, chiudiMicrofono, nuovoAnalizzatore,
  microfonoAperto, contesto as contestoAudio,
} from '../audio.js';
import { AscoltoVivo, giudizioTempo, riepilogo, taraLatenza } from '../ascoltoVivo.js';
import { accordatura } from '../tunings.js';
import { hzDaMidi } from '../pitch.js';
import { nomeClasse } from '../theory.js';
import * as ripasso from '../ripasso.js';
import { icona } from '../icone.js';
import * as curriculum from '../curriculum.js';

const BATTUTA_CONTO = 1;      // una battuta di lancio prima di contare
const BPM_MAX = 180;
const BPM_MIN = 40;

export function monta(radice, ctx) {
  const modo = ctx.parametri.modo;
  const q = ctx.query;
  const idPasso = q.passo || null;
  const passo = idPasso ? curriculum.passo(idPasso) : null;

  const cfg = configura(modo, q);
  if (!cfg) {
    const branoMancante = modo === 'giro' && q.b;
    aggiungi(radice, scheda(
      h('h2', { testo: branoMancante ? 'Questo brano non c\'è più' : 'Esercizio sconosciuto' }),
      h('p', {
        class: 'dim piccolo',
        testo: branoMancante
          ? 'Probabilmente era uno spartito tuo che hai cancellato. Non te ne faccio suonare un altro al posto suo senza dirtelo.'
          : 'Il collegamento non corrisponde a nessun esercizio.',
      }),
      branoMancante ? h('a', { class: 'bottone', href: '#/importa', testo: 'I tuoi spartiti' }) : null,
      h('a', { class: 'bottone sottile', href: '#/percorso', testo: 'Torna al percorso' }),
    ));
    return null;
  }

  let bpm = Number(q.bpm) || cfg.bpm || store.dati().bpmPreferito || 70;
  let salita = Number(q.salita || 0);
  const obiettivoBattute = Number(q.battute) || cfg.battute || 16;

  let metronomo = null;
  // Il conteggio delle battute gira su un timer, NON su requestAnimationFrame: i frame
  // si fermano appena la pagina non è in primo piano (o lo schermo si abbassa) mentre il
  // metronomo continua a suonare — l'esercizio andrebbe avanti nelle orecchie e resterebbe
  // fermo sullo schermo, senza mai arrivare all'obiettivo.
  let timer = null;
  let temporizzatoreAscolto = null;
  let battutaCorrente = -1;
  let battuteFatte = 0;
  let iniziato = 0;
  let secondiSuonati = 0;
  let completato = false;
  let bpmIniziale = bpm;
  const battiti = [];           // per il tap tempo

  const tornaA = idPasso ? `#/passo/${idPasso}` : '#/percorso';
  const conta = h('div', { class: 'es-conta', testo: `0 / ${obiettivoBattute}` });
  const avanzamento = barra(0, 'battute completate');
  const stato = h('p', { class: 'dim piccolo', testo: 'Premi Avvia: la prima battuta è di lancio.' });

  const palco = h('div', { class: 'es-palco' });
  const luci = h('div', { class: 'es-battiti' });

  const cursoreBpm = h('input', {
    type: 'range', min: BPM_MIN, max: BPM_MAX, step: 2, value: bpm, class: 'cursore',
    'aria-label': 'Velocità in battiti per minuto',
    oninput: (e) => impostaBpm(Number(e.target.value)),
  });
  const valoreBpm = h('strong', { class: 'es-bpm', testo: `${bpm} bpm` });

  const tapTempo = bottone('Tocca il tempo', () => {
    const ora = performance.now();
    while (battiti.length && ora - battiti[battiti.length - 1] > 2500) battiti.length = 0;
    battiti.push(ora);
    if (battiti.length > 5) battiti.shift();
    if (battiti.length >= 2) {
      const intervalli = battiti.slice(1).map((v, i) => v - battiti[i]);
      const medio = intervalli.reduce((a, b) => a + b, 0) / intervalli.length;
      impostaBpm(Math.round(Math.max(BPM_MIN, Math.min(BPM_MAX, 60000 / medio))));
      stato.textContent = `Tempo preso dai tuoi tocchi: ${bpm} bpm.`;
    } else {
      stato.textContent = 'Continua a toccare a tempo…';
    }
  }, { classe: 'sottile' });

  const interruttoreOttavi = h('label', { class: 'opzione' },
    h('input', {
      type: 'checkbox',
      onchange: (e) => { if (metronomo) metronomo.clickSuddivisioni = e.target.checked; },
    }),
    h('span', { testo: cfg.suddivisioni === 3 ? 'Click su tutte le terzine' : 'Click anche sugli ottavi' }));

  const interruttoreSalita = h('label', { class: 'opzione' },
    h('input', {
      type: 'checkbox',
      checked: salita > 0 ? 'checked' : null,
      onchange: (e) => {
        salita = e.target.checked ? (salita || 4) : 0;
        notaSalita.textContent = salita ? `+${salita} bpm ogni 8 battute` : '';
      },
    }),
    h('span', { testo: 'Aumenta la velocità da solo' }));
  const notaSalita = h('small', { class: 'dim', testo: salita ? `+${salita} bpm ogni 8 battute` : '' });

  // ── ascolto vivo ───────────────────────────────────────────────────────────
  const d = store.dati();
  const tun = accordatura(d.accordatura);
  let ascolto = null;
  let colpi = [];               // un elemento per pennata sentita
  let coppieSuonate = [];       // i cambi realmente mostrati, per il ripasso
  let finestraAccordo = null;   // {fine, battuta, atteso}
  let vivo = true;

  const spiaAccordo = h('span', { class: 'spia-accordo' });
  const spiaTempo = h('div', { class: 'spia-tempo nascosto' },
    h('span', { class: 'spia-scarto', testo: '' }),
    h('span', { class: 'spia-parola', testo: 'penna: ti dico quanto sei preciso' }),
    spiaAccordo);
  const statoAscolto = h('p', { class: 'dim piccolo' });

  const interruttoreAscolto = h('label', { class: 'opzione' },
    h('input', {
      type: 'checkbox',
      checked: d.ascoltoVivo ? 'checked' : null,
      onchange: (e) => {
        store.imposta('ascoltoVivo', e.target.checked);
        aggiornaStatoAscolto();
      },
    }),
    h('span', {}, 'Ascoltami mentre suono ', h('small', { class: 'dim', testo: '(microfono)' })));

  function aggiornaStatoAscolto() {
    const acceso = interruttoreAscolto.querySelector('input').checked;
    const tarato = store.dati().latenzaMs !== null;
    statoAscolto.textContent = !acceso
      ? 'Il programma conta solo le battute: il giudizio sulla pulizia resta tuo.'
      : (tarato
        ? `Misuro quando penni e se l'accordo è quello. Ritardo del telefono: ${Math.round(store.dati().latenzaMs)} ms.`
        : 'Prima di fidarti dei millisecondi, misura il ritardo del tuo telefono qui sotto: senza, risulterai sempre in ritardo per colpa dell\'hardware.');
    bottoneTara.classList.toggle('nascosto', !acceso || tarato);
    spiaTempo.classList.toggle('nascosto', !acceso);
  }

  const bottoneTara = bottone('Misura il ritardo del telefono', async () => {
    bottoneTara.disabled = true;
    statoAscolto.textContent = 'Alza il volume e stai in silenzio: sto facendo suonare cinque colpi e li riascolto…';
    try {
      sblocca();
      await apriMicrofono();
      const esito = await taraLatenza();
      if (esito.ok) {
        store.imposta('latenzaMs', esito.latenza * 1000);
        statoAscolto.textContent = `Ritardo misurato: ${Math.round(esito.latenza * 1000)} ms. Ora i millisecondi vogliono dire qualcosa.`;
        bottoneTara.classList.add('nascosto');
      } else {
        statoAscolto.textContent = `Taratura non riuscita — ${esito.motivo}`;
      }
    } catch (e) {
      statoAscolto.textContent = `Microfono non disponibile (${e.name || 'errore'}): l'esercizio funziona lo stesso, senza il giudizio sul tempo.`;
    } finally {
      bottoneTara.disabled = false;
    }
  }, { classe: 'sottile' });

  const avvia = bottone('Avvia', () => (metronomo?.attivo ? ferma() : parti()), { classe: 'grande' });
  const esitoBox = h('div', {});

  aggiungi(radice, 
    h('div', { class: 'testa-riga' }, indietro(tornaA, passo ? 'Passo' : 'Percorso')),
    h('header', { class: 'testa-pagina' },
      h('h1', { testo: cfg.titolo }),
      h('p', { class: 'dim', testo: cfg.sottotitolo })),
    cfg.comandi ? scheda(...cfg.comandi(() => ridisegna())) : null,
    scheda(palco, luci, spiaTempo),
    scheda(
      h('div', { class: 'es-riga-conta' }, conta, valoreBpm),
      avanzamento,
      h('div', { class: 'es-comandi' }, cursoreBpm),
      h('div', { class: 'es-opzioni' }, interruttoreAscolto, interruttoreOttavi, interruttoreSalita, notaSalita),
      h('div', { class: 'es-duetto-bottoni' }, avvia, tapTempo),
      stato,
      statoAscolto,
      bottoneTara),
    cfg.nota ? scheda(h('p', { class: 'dim piccolo', testo: cfg.nota })) : null,
    modo === 'giro' && q.b
      ? scheda(
        h('p', { class: 'occhiello', testo: 'Troppo veloce?' }),
        h('p', { class: 'dim piccolo', testo: 'Prova senza metronomo: l\'accordo successivo compare solo quando quello attuale esce giusto, e giri finché vuoi.' }),
        h('a', { class: 'bottone sottile', href: `#/libero?b=${q.b}${q.tr ? `&tr=${q.tr}` : ''}`, testo: 'Suonalo a tuo tempo' }))
      : null,
    esitoBox,
  );

  cfg.disegnaPalco(palco);
  disegnaLuci(-1);
  aggiornaStatoAscolto();

  function ridisegna() {
    cfg.disegnaPalco(palco);
    disegnaLuci(-1);
  }

  function impostaBpm(v) {
    bpm = Math.max(BPM_MIN, Math.min(BPM_MAX, v));
    cursoreBpm.value = bpm;
    valoreBpm.textContent = `${bpm} bpm`;
    if (metronomo) metronomo.bpm = bpm;
    store.imposta('bpmPreferito', bpm);
  }

  function disegnaLuci(slotAttivo) {
    const et = cfg.etichetteSlot;
    if (luci.children.length !== et.length) {
      luci.replaceChildren(...et.map((testo, i) => h('span', {
        class: `luce${i % cfg.suddivisioni === 0 ? ' forte' : ''}`, testo,
      })));
    }
    [...luci.children].forEach((el, i) => el.classList.toggle('accesa', i === slotAttivo));
  }

  async function avviaAscolto() {
    if (!interruttoreAscolto.querySelector('input').checked) { ascolto = null; return; }
    try {
      await apriMicrofono();
      if (!vivo) return;
      const veloce = nuovoAnalizzatore({ fftSize: 1024 });
      const lento = nuovoAnalizzatore({ fftSize: 4096 });
      ascolto = new AscoltoVivo(veloce, lento);
      const ms = store.dati().latenzaMs;
      // Senza taratura si usa una stima prudente invece di zero: zero sarebbe una bugia
      // comoda, e farebbe risultare tutti in ritardo di un tempo che non è loro.
      ascolto.impostaLatenza((ms === null ? 90 : ms) / 1000);
    } catch (e) {
      ascolto = null;
      statoAscolto.textContent = `Microfono non disponibile (${e.name || 'errore'}): vado avanti senza giudicare il tempo.`;
    }
  }

  function parti() {
    sblocca();
    tieniSchermoAcceso(true);
    colpi = [];
    coppieSuonate = [];
    finestraAccordo = null;
    avviaAscolto();
    battutaCorrente = -1;
    battuteFatte = 0;
    bpmIniziale = bpm;
    metronomo = new Metronomo({ bpm, suddivisioni: cfg.suddivisioni, battitiPerBattuta: cfg.battiti });
    metronomo.clickSuddivisioni = interruttoreOttavi.querySelector('input').checked;
    metronomo.avvia();
    iniziato = performance.now();
    avvia.textContent = 'Ferma';
    stato.textContent = 'Battuta di lancio: ascolta e attacca al prossimo "1".';
    // Due frequenze diverse: il disegno può andare a 25 al secondo, l'orecchio no.
    // Un attacco di pennata dura pochi millisecondi e a 40 ms se ne perdono.
    timer = setInterval(ciclo, 40);
    if (temporizzatoreAscolto) clearInterval(temporizzatoreAscolto);
    temporizzatoreAscolto = setInterval(cicloAscolto, 12);
    ciclo();
  }

  function ferma() {
    if (metronomo) metronomo.ferma();
    metronomo = null;
    if (timer) clearInterval(timer);
    timer = null;
    if (temporizzatoreAscolto) clearInterval(temporizzatoreAscolto);
    temporizzatoreAscolto = null;
    if (iniziato) { secondiSuonati += (performance.now() - iniziato) / 1000; iniziato = 0; }
    tieniSchermoAcceso(false);
    avvia.textContent = 'Avvia';
    disegnaLuci(-1);
    if (!completato) stato.textContent = 'Fermo. Riprendi quando vuoi: il conteggio riparte da zero.';
  }

  function ciclo() {
    if (!metronomo) return;
    const ora = metronomo.posizioneOra();
    if (!ora) return;
    disegnaLuci(ora.slot);

    if (ora.battuta !== battutaCorrente) {
      battutaCorrente = ora.battuta;
      const utili = battutaCorrente - BATTUTA_CONTO;
      if (utili >= 0) {
        battuteFatte = Math.min(obiettivoBattute, utili);
        cfg.cambiaBattuta(utili);
        // I cambi VERI, quelli che hai avuto davanti: alimentano il ripasso.
        if (cfg.accordoDellaBattuta) {
          const prima = cfg.accordoDellaBattuta(Math.max(0, utili - 1));
          const adesso = cfg.accordoDellaBattuta(utili);
          if (prima && adesso && prima.id !== adesso.id) coppieSuonate.push([prima.id, adesso.id]);
        }
        conta.textContent = `${battuteFatte} / ${obiettivoBattute}`;
        const quota = battuteFatte / obiettivoBattute;
        avanzamento.querySelector('span').style.width = `${quota * 100}%`;
        avanzamento.setAttribute('aria-valuenow', Math.round(quota * 100));
        if (utili === 0) stato.textContent = 'Via.';
        if (salita && utili > 0 && utili % 8 === 0 && bpm < BPM_MAX) {
          impostaBpm(bpm + salita);
          stato.textContent = `Salita automatica: ${bpm} bpm.`;
        }
        if (utili >= obiettivoBattute && !completato) finisci();
      } else {
        cfg.cambiaBattuta(0, true);
      }
    }
  }

  // ── il ciclo dell'orecchio ─────────────────────────────────────────────────
  //
  // Gira a 12 ms, cinque volte più fitto del ciclo che disegna: un attacco di pennata
  // dura pochi millisecondi e a 40 ms se ne perde una su tre. Non fa niente di pesante:
  // legge lo spettro e confronta un numero.
  function cicloAscolto() {
    if (!ascolto || !metronomo) return;
    // Se l'app va in secondo piano il microfono viene chiuso (giustamente: il pallino
    // rosso non deve restare acceso). L'esercizio però continua a suonare, e senza
    // accorgersene misurerebbe il nulla: meglio dirlo che dare un verdetto su niente.
    if (!microfonoAperto()) {
      ascolto = null;
      statoAscolto.textContent = 'Il microfono si è chiuso quando l\'app è passata in secondo piano: da qui in poi conto le battute ma non giudico più il tempo. Ferma e riavvia per riascoltare.';
      spiaTempo.classList.add('nascosto');
      return;
    }

    if (finestraAccordo) {
      ascolto.campionaAccordo();
      if (contestoAudio().currentTime >= finestraAccordo.fine) chiudiFinestraAccordo();
    }

    const attacco = ascolto.ascolta();
    if (!attacco) return;
    const vicino = metronomo.piuVicino(attacco.quando);
    if (!vicino) return;

    const utili = vicino.info.battuta - BATTUTA_CONTO;
    if (utili < 0 || utili >= obiettivoBattute) return;    // il lancio non si giudica

    const atteso = cfg.accordoDellaBattuta ? cfg.accordoDellaBattuta(utili) : null;
    const colpo = {
      battuta: utili,
      slot: vicino.info.slot,
      scarto: vicino.scarto,
      accordoOk: null,
      atteso: atteso ? atteso.id : null,
    };
    colpi.push(colpo);
    mostraScarto(vicino.scarto);

    // L'accordo si giudica solo sul primo colpo della battuta: è lì che avviene il
    // cambio, ed è l'unico momento in cui sbagliarlo significa qualcosa. Sulle pennate
    // successive la mano sinistra è ferma e verificare di nuovo direbbe la stessa cosa.
    if (atteso && vicino.info.slot === 0) {
      ascolto.apriFinestraAccordo();
      finestraAccordo = { fine: contestoAudio().currentTime + 0.22, colpo, atteso };
    }
  }

  function chiudiFinestraAccordo() {
    const { colpo, atteso } = finestraAccordo;
    finestraAccordo = null;
    const frequenze = atteso.tasti.map((t, i) => (t < 0 ? null : hzDaMidi(tun.corde[i].midi + t, d.la4)));
    const v = ascolto.giudicaAccordo(frequenze);
    if (!v) return;
    colpo.accordoOk = v.ok;
    spiaAccordo.textContent = v.ok ? '✓' : '✕';
    spiaAccordo.className = `spia-accordo ${v.ok ? 'ok' : 'no'}`;
  }

  function mostraScarto(scarto) {
    const g = giudizioTempo(scarto);
    const ms = Math.round(scarto * 1000);
    spiaTempo.className = `spia-tempo ${g.classe}`;
    spiaTempo.children[0].textContent = `${ms >= 0 ? '+' : ''}${ms} ms`;
    spiaTempo.children[1].textContent = g.testo;
    spiaTempo.classList.remove('lampo');
    void spiaTempo.offsetWidth;                  // riavvia l'animazione anche a colpi ravvicinati
    spiaTempo.classList.add('lampo');
  }

  function finisci() {
    completato = true;
    ferma();
    stato.textContent = bpm > bpmIniziale
      ? `Obiettivo raggiunto: ${plurale(obiettivoBattute, 'battuta', 'battute')}, da ${bpmIniziale} a ${bpm} bpm.`
      : `Obiettivo raggiunto: ${plurale(obiettivoBattute, 'battuta', 'battute')} a ${bpm} bpm.`;
    cfg.accordiCoinvolti.forEach((id) => store.segnaAccordo(id, { bpm, cambi: obiettivoBattute }));
    esitoBox.replaceChildren(schedaEsito());
    esitoBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function schedaEsito() {
    const r = riepilogo(colpi);
    if (!r.colpi) return schedaGiudizioTuo('Non ho sentito pennate: o il microfono è spento, o il telefono è troppo lontano dallo strumento.');

    const tarato = store.dati().latenzaMs !== null;
    const tendenzaMs = Math.round(r.tendenza * 1000);
    const percentuale = Math.round(r.quotaPrecisi * 100);
    const percAccordi = r.accordiValutati ? Math.round(r.quotaAccordi * 100) : null;

    // Il verdetto è la CONGIUNZIONE delle due misure, non la loro media: suonare a tempo
    // gli accordi sbagliati non è mezzo esercizio riuscito.
    const esitoMisurato = (percentuale >= 75 && (percAccordi === null || percAccordi >= 75))
      ? 'pulito'
      : ((percentuale >= 50 && (percAccordi === null || percAccordi >= 50)) ? 'quasi' : 'sporco');

    const consiglio = [];
    if (Math.abs(tendenzaMs) > 45) {
      consiglio.push(tendenzaMs > 0
        ? `Sei sistematicamente ${tendenzaMs} ms in RITARDO: non è imprecisione, è che parti quando senti il click invece di partire con lui. Comincia il movimento mezzo battito prima.`
        : `Sei sistematicamente ${Math.abs(tendenzaMs)} ms in ANTICIPO: stai correndo. Conta ad alta voce e appoggiati al click invece di tirarlo.`);
    }
    if (percAccordi !== null && percAccordi < 75) {
      consiglio.push('Gli accordi non arrivano completi sul cambio: la mano sinistra parte troppo tardi. Fai il movimento a vuoto, senza pennare, finché non cade da solo.');
    }
    if (!tarato) {
      consiglio.push('Il ritardo del telefono non è ancora misurato: la tendenza qui sopra può essere sua e non tua. Misuralo una volta e questi numeri diventano tuoi.');
    }

    return scheda(
      h('h2', { class: 'ok', testo: 'Fatto — e questa volta ti ho ascoltato' }),
      h('div', { class: 'misure' },
        misura(`${percentuale}%`, `pennate a tempo su ${r.colpi}`, percentuale >= 75 ? 'ok' : (percentuale >= 50 ? 'quasi' : 'no')),
        percAccordi !== null
          ? misura(`${percAccordi}%`, `accordi giusti su ${r.accordiValutati} cambi`, percAccordi >= 75 ? 'ok' : (percAccordi >= 50 ? 'quasi' : 'no'))
          : null,
        misura(`${tendenzaMs >= 0 ? '+' : ''}${tendenzaMs} ms`, tendenzaMs > 0 ? 'tendenza al ritardo' : 'tendenza all\'anticipo',
          Math.abs(tendenzaMs) <= 45 ? 'ok' : 'quasi')),
      istogrammaColpi(),
      ...consiglio.map((testo) => h('p', { class: 'consiglio', testo })),
      h('p', { class: 'dim piccolo', testo: 'Misurati: quando hai pennato e se le note dell\'accordo c\'erano. NON misurati: il suono, la pressione delle dita, i ronzii. Quelli restano orecchio tuo.' }),
      h('div', { class: 'es-scelte' },
        h('button', {
          class: 'bottone', type: 'button', onclick: () => rispondi(esitoMisurato),
        }, esitoMisurato === 'sporco' ? 'Va bene, rifaccio più lento' : 'Registra'),
        h('button', {
          class: 'bottone sottile', type: 'button', onclick: () => esitoBox.replaceChildren(schedaGiudizioTuo()),
        }, 'Giudico io')),
    );
  }

  function misura(valore, etichetta, classe) {
    return h('div', { class: `misura ${classe}` },
      h('strong', { testo: valore }), h('small', { testo: etichetta }));
  }

  /** Una barra per battuta: si vede a colpo d'occhio DOVE è andata storta. */
  function istogrammaColpi() {
    const perBattuta = new Map();
    colpi.forEach((c) => {
      if (!perBattuta.has(c.battuta)) perBattuta.set(c.battuta, []);
      perBattuta.get(c.battuta).push(c);
    });
    const barre = [];
    for (let b = 0; b < obiettivoBattute; b += 1) {
      const dentro = perBattuta.get(b) || [];
      const medio = dentro.length ? dentro.reduce((a, c) => a + Math.abs(c.scarto), 0) / dentro.length : null;
      const sbagliato = dentro.some((c) => c.accordoOk === false);
      const classe = medio === null ? 'vuota' : (sbagliato ? 'no' : (medio <= 0.035 ? 'ok' : (medio <= 0.08 ? 'quasi' : 'no')));
      barre.push(h('span', {
        class: `bat-barra ${classe}`,
        title: medio === null ? `battuta ${b + 1}: niente` : `battuta ${b + 1}: ${Math.round(medio * 1000)} ms`,
      }));
    }
    return h('div', {},
      h('p', { class: 'occhiello', testo: 'Battuta per battuta' }),
      h('div', { class: 'istogramma' }, ...barre));
  }

  function schedaGiudizioTuo(premessa) {
    return scheda(
      h('h2', { class: 'ok', testo: 'Fatto' }),
      premessa ? h('p', { class: 'dim piccolo', testo: premessa }) : null,
      h('div', { class: 'es-giudizio' },
        h('p', { testo: 'Com\'è andata? Il programma sente il tempo, non le tue dita.' }),
        h('div', { class: 'es-scelte' },
          ...[
            ['Pulito', 'pulito', 'Segna il passo come fatto e propone il prossimo.'],
            ['Quasi', 'quasi', 'Segna il passo ma tieni questa velocità un altro giorno.'],
            ['Sporco', 'sporco', 'Non lo segna: rifallo 6 bpm più lento.'],
          ].map(([et, val, spiega]) => h('button', {
            class: 'bottone sottile', type: 'button', title: spiega, onclick: () => rispondi(val),
          }, et)))),
    );
  }

  function rispondi(val) {
    // La ripetizione spaziata si nutre di QUESTO: l'accordo andato male torna domani,
    // quello che regge si dirada da solo.
    ripasso.registraEsercizio({
      accordi: cfg.accordiCoinvolti,
      coppie: coppieSuonate,
      ritmo: cfg.idRitmo || null,
      esito: val,
      bpm,
    });
    if (val === 'sporco') {
      if (idPasso) store.segnaInciampo(idPasso);
      impostaBpm(bpm - 6);
      completato = false;
      esitoBox.replaceChildren(scheda(
        h('p', { testo: `Velocità abbassata a ${bpm} bpm. Rifallo: pulito e lento vale più di veloce e sporco.` }),
        bottone('Riprova', () => { esitoBox.replaceChildren(); parti(); }, { classe: 'grande' }),
      ));
      return;
    }
    if (idPasso) store.segnaPasso(idPasso, { bpm, esito: val });
    const prossimo = curriculum.prossimoPasso(store.dati().passiFatti);
    esitoBox.replaceChildren(scheda(
      h('h2', { class: 'ok', testo: idPasso ? 'Passo completato' : 'Registrato' }),
      val === 'quasi' ? h('p', { class: 'dim piccolo', testo: 'Segnato. Prima di alzare la velocità, ripetilo domani a questo bpm.' }) : null,
      prossimo
        ? h('a', { class: 'bottone', href: `#/passo/${prossimo.id}`, testo: `Prossimo: ${prossimo.titolo}` })
        : h('p', { testo: 'Hai finito il percorso. Da qui si va a orecchio.' }),
      h('a', { class: 'bottone sottile', href: '#/percorso', testo: 'Torna al percorso' }),
    ));
  }

  return () => {
    vivo = false;
    ferma();
    ascolto = null;
    chiudiMicrofono();
    const minuti = secondiSuonati / 60;
    if (minuti >= 0.4) store.segnaPratica(Math.round(minuti * 10) / 10);
  };
}

// ── configurazioni per modo ──────────────────────────────────────────────────

function configura(modo, q) {
  if (modo === 'cambio') return modoCambio(q);
  if (modo === 'ritmo') return modoRitmo(q);
  if (modo === 'giro') return modoGiro(q);
  return null;
}

function elencoAccordi(q) {
  if (q.acc === 'appresi') return curriculum.accordiAppresi(store.dati().passiFatti);
  const lista = (q.acc || 'C,Am').split(',').map((s) => s.trim()).filter(Boolean);
  return lista.length >= 2 ? lista : ['C', 'Am'];
}

function modoCambio(q) {
  const lista = elencoAccordi(q);
  const sorteggio = q.acc === 'appresi' || q.sorteggio === '1';
  const attuale = h('div', { class: 'es-accordo attuale' });
  const successivo = h('div', { class: 'es-accordo prossimo' });
  const sequenza = [];
  let ultimo = -1;

  const prendi = (i) => {
    if (!sorteggio) return lista[i % lista.length];
    while (sequenza.length <= i + 2) {
      let k = Math.floor(Math.random() * lista.length);
      if (lista.length > 1 && k === ultimo) k = (k + 1) % lista.length;
      ultimo = k;
      sequenza.push(lista[k]);
    }
    return sequenza[i];
  };

  function mostra(i) {
    const a = accordo(prendi(i));
    const b = accordo(prendi(i + 1));
    attuale.replaceChildren(
      h('span', { class: 'es-etichetta', testo: 'ora' }),
      a ? schedaAccordo(a, { sottotitolo: false }) : h('p', { testo: '—' }));
    successivo.replaceChildren(
      h('span', { class: 'es-etichetta', testo: 'poi' }),
      b ? schedaAccordo(b, { sottotitolo: false, dita: false }) : h('p', { testo: '—' }));
  }

  return {
    titolo: 'Cambio accordi',
    sottotitolo: sorteggio
      ? `${lista.length} accordi in ordine casuale: un cambio a ogni battuta`
      : `${lista.join(' ↔ ')} — un cambio a ogni battuta`,
    battiti: 4,
    suddivisioni: 2,
    etichetteSlot: ['1', 'e', '2', 'e', '3', 'e', '4', 'e'],
    bpm: Number(q.bpm) || 60,
    battute: Number(q.battute) || 16,
    accordiCoinvolti: lista,
    nota: 'Il trucco non è muovere le dita più in fretta: è staccarle mezza pennata PRIMA della fine della battuta. La mano destra continua, la sinistra è già in viaggio.',
    accordoDellaBattuta: (i) => accordo(prendi(i)),
    disegnaPalco(palco) {
      palco.className = 'es-palco duetto';
      palco.replaceChildren(attuale, successivo);
      mostra(0);
    },
    cambiaBattuta(indice, lancio = false) { mostra(lancio ? 0 : indice); },
  };
}

function modoRitmo(q) {
  const r = ritmoPerId(q.r);
  const acc = q.acc && q.acc !== 'null' ? accordo(q.acc) : null;
  const griglia = h('div', { class: 'es-griglia' });
  const et = etichette(r);

  return {
    titolo: r.nome,
    sottotitolo: `${acc ? `Su ${etichettaAccordo(acc)}` : 'A corde libere'} — ${r.tipo === 'dita' ? 'arpeggio con le dita' : 'mano destra'}`,
    battiti: r.battiti,
    suddivisioni: r.suddivisioni,
    etichetteSlot: et,
    bpm: Number(q.bpm) || 70,
    battute: Number(q.battute) || 16,
    accordiCoinvolti: acc ? [acc.id] : [],
    idRitmo: r.id,
    nota: r.testo,
    accordoDellaBattuta: () => acc,
    disegnaPalco(palco) {
      palco.className = `es-palco ritmo${r.tipo === 'dita' ? ' arpeggio' : ''}`;
      griglia.replaceChildren(...r.slot.map((s, i) => {
        const corde = r.tipo === 'dita' ? cordeDiCasella(s) : [];
        return h('div', { class: `cella s-${classeCasella(r, s)}` },
          h('span', { class: `cella-freccia ${classeDito(s)}`, testo: simbolo(r, s) }),
          corde.length ? h('span', { class: 'cella-corde', testo: corde.map((c) => CORDE[c]).join('+') }) : null,
          h('span', { class: 'cella-conto', testo: et[i] }));
      }));
      palco.replaceChildren(
        acc ? schedaAccordo(acc, { sottotitolo: false }) : h('div', { class: 'es-vuote', testo: 'corde libere' }),
        griglia);
    },
    cambiaBattuta() { /* il ritmo non cambia da una battuta all'altra */ },
  };
}

function classeCasella(r, s) {
  if (s === '-') return 'pausa';
  return r.tipo === 'dita' ? 'dito' : s;
}

function modoGiro(q) {
  // Se il brano non c'è, si DICE. `brano()` ricade sul primo dell'elenco, e un
  // collegamento a uno spartito cancellato faceva partire un pezzo diverso senza una
  // parola: si suonava un'altra cosa credendo di suonare la propria.
  const originale = branoSeEsiste(q.b);
  if (!originale) return null;
  let trasporto = Number(q.tr || 0);
  let b = branoTrasportato(originale, trasporto);
  const mappa = h('div', { class: 'es-mappa' });
  const oraBox = h('div', { class: 'es-accordo attuale' });
  const poiBox = h('div', { class: 'es-accordo prossimo' });
  const infoTonalita = h('small', { class: 'dim' });
  let ultimoIndice = 0;

  const cella = (i) => b.battute[i % b.battute.length];
  const primoDi = (c) => c.split('|')[0];

  function evidenzia(i) {
    ultimoIndice = i;
    const idx = i % b.battute.length;
    [...mappa.children].forEach((el, k) => el.classList.toggle('attiva', k === idx));
    const a = accordo(primoDi(cella(idx)));
    const p = accordo(primoDi(cella(idx + 1)));
    oraBox.replaceChildren(h('span', { class: 'es-etichetta', testo: 'ora' }),
      a ? schedaAccordo(a, { sottotitolo: false }) : h('p', { class: 'es-mancante', testo: cella(idx) }));
    poiBox.replaceChildren(h('span', { class: 'es-etichetta', testo: 'poi' }),
      p ? schedaAccordo(p, { sottotitolo: false, dita: false }) : h('p', { class: 'es-mancante', testo: cella(idx + 1) }));
    const attiva = mappa.children[idx];
    if (attiva) attiva.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
  }

  function costruisciMappa() {
    mappa.replaceChildren(...b.battute.map((c, i) => h('div', { class: 'bat', dati: { i: String(i) } },
      h('small', { testo: String(i + 1) }), h('strong', { testo: c.replace('|', ' ') }))));
    const t = tonalitaDi(b);
    const mancanti = accordiDi(b).filter((n) => !accordo(n));
    infoTonalita.textContent = [
      t ? `Tonalità: ${nomeClasse(t.tonica)}` : '',
      trasporto ? `trasportato di ${trasporto > 0 ? '+' : ''}${trasporto} semitoni` : '',
      mancanti.length ? `⚠ non ho il diagramma di ${mancanti.join(', ')}` : '',
    ].filter(Boolean).join(' · ');
  }

  return {
    titolo: originale.titolo,
    sottotitolo: `${originale.battiti === 3 ? 'Tre quarti' : originale.battiti === 2 ? 'Sei ottavi' : 'Quattro quarti'} · ${originale.battute.length} battute`,
    battiti: originale.battiti,
    suddivisioni: 2,
    etichetteSlot: originale.battiti === 3 ? ['1', 'e', '2', 'e', '3', 'e']
      : originale.battiti === 2 ? ['1', 'e', '2', 'e'] : ['1', 'e', '2', 'e', '3', 'e', '4', 'e'],
    bpm: Number(q.bpm) || originale.bpm,
    battute: Number(q.battute) || originale.battute.length,
    accordiCoinvolti: accordiDi(originale),
    nota: originale.testo,
    accordoDellaBattuta: (i) => accordo(primoDi(cella(i))),
    comandi(ridisegna) {
      const valore = h('strong', { class: 'es-bpm' });
      const aggiorna = (delta) => {
        trasporto = Math.max(-6, Math.min(6, trasporto + delta));
        b = branoTrasportato(originale, trasporto);
        valore.textContent = trasporto === 0 ? 'tonalità originale' : `${trasporto > 0 ? '+' : ''}${trasporto} semitoni`;
        costruisciMappa();
        evidenzia(ultimoIndice);
        ridisegna();
      };
      const box = h('div', { class: 'riga-tra' },
        bottone('−1', () => aggiorna(-1), { classe: 'sottile stretto' }),
        valore,
        bottone('+1', () => aggiorna(1), { classe: 'sottile stretto' }));
      aggiorna(0);
      return [
        h('p', { class: 'occhiello', testo: 'Trasporta' }),
        box,
        infoTonalita,
        h('p', { class: 'dim piccolo', testo: 'Sposta tutti gli accordi insieme: la canzone resta la stessa, cambia solo l\'altezza. Serve quando è troppo alta o troppo bassa per la tua voce.' }),
      ];
    },
    disegnaPalco(palco) {
      palco.className = 'es-palco giro';
      costruisciMappa();
      palco.replaceChildren(h('div', { class: 'es-duo' }, oraBox, poiBox), mappa);
      evidenzia(ultimoIndice);
    },
    cambiaBattuta(indice, lancio = false) { evidenzia(lancio ? 0 : indice); },
  };
}
