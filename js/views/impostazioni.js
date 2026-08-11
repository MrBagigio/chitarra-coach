import { aggiungi, h, scheda, titoloPagina, bottone } from '../ui.js';
import * as store from '../store.js';
import { trasponi } from '../theory.js';
import { ACCORDATURE, CAPOTASTO_MAX } from '../tunings.js';
import * as curriculum from '../curriculum.js';
import { icona } from '../icone.js';

export function monta(radice, ctx) {
  const d = store.dati();
  const inApp = window.matchMedia('(display-mode: standalone)').matches;

  const selAccordatura = h('select', {
    class: 'campo', 'aria-label': 'Accordatura predefinita',
    onchange: (e) => store.imposta('accordatura', e.target.value),
  }, ...ACCORDATURE.map((a) => h('option', { value: a.id, selected: a.id === d.accordatura, testo: a.nome })));

  /**
   * Il capotasto mobile.
   *
   * Non e' un accessorio da elenco: e' il modo in cui si suonano le canzoni in tonalita'
   * scomode con le forme che si sanno gia'. Una canzone in Sib col capotasto al 3° si
   * suona con le forme di Sol.
   *
   * Per il programma cambia una cosa sola, ma cambia dappertutto: le frequenze che si
   * aspetta dal microfono si alzano di altrettanti semitoni. Se non si alzassero, con il
   * capotasto messo l'app direbbe "manca questa corda" a ogni accordo suonato bene.
   */
  const selCapotasto = h('select', {
    class: 'campo', 'aria-label': 'Capotasto mobile',
    onchange: (e) => { store.imposta('capotasto', Number(e.target.value)); notaCapotasto(); },
  }, ...Array.from({ length: CAPOTASTO_MAX + 1 }, (_, n) => h('option', {
    value: String(n), selected: n === d.capotasto, testo: n === 0 ? 'Nessuno' : `Al ${n}° tasto`,
  })));

  const capotastoDice = h('p', { class: 'dim piccolo' });
  function notaCapotasto() {
    const n = store.dati().capotasto;
    capotastoDice.textContent = n === 0
      ? 'Le forme e i nomi degli accordi coincidono: quello che vedi e quello che senti.'
      : `Con il capotasto al ${n}° tasto le FORME non cambiano, cambia quello che esce: la forma del Sol suona ${trasponi('G', n)}, quella del Do suona ${trasponi('C', n)}. Il microfono lo sa e si aspetta le note giuste. L'accordatore invece no: per accordare, togli il capotasto.`;
  }
  notaCapotasto();

  const selTema = h('select', {
    class: 'campo', 'aria-label': 'Tema',
    onchange: (e) => { store.imposta('tema', e.target.value); store.applicaTema(); },
  },
    h('option', { value: 'scuro', selected: d.tema === 'scuro', testo: 'Scuro (predefinito)' }),
    h('option', { value: 'chiaro', selected: d.tema === 'chiaro', testo: 'Chiaro — per suonare al sole' }),
    h('option', { value: 'auto', selected: d.tema === 'auto', testo: 'Come il telefono' }));

  const valoreLa = h('strong', { testo: `${d.la4} Hz` });
  const cursoreLa = h('input', {
    type: 'range', min: 432, max: 446, step: 1, value: d.la4, class: 'cursore',
    'aria-label': 'Frequenza di riferimento del La4',
    oninput: (e) => {
      const v = Number(e.target.value);
      valoreLa.textContent = `${v} Hz`;
      store.imposta('la4', v);
    },
  });

  const valoreObiettivo = h('strong', { testo: `${d.obiettivoMinuti} minuti` });
  const cursoreObiettivo = h('input', {
    type: 'range', min: 5, max: 45, step: 5, value: d.obiettivoMinuti, class: 'cursore',
    'aria-label': 'Obiettivo giornaliero in minuti',
    oninput: (e) => {
      const v = Number(e.target.value);
      valoreObiettivo.textContent = `${v} minuti`;
      store.imposta('obiettivoMinuti', v);
    },
  });

  const minuti = store.minutiTotali();
  const passiFatti = curriculum.PASSI.filter((p) => d.passiFatti[p.id]).length;
  const giorni = store.ultimiGiorni(14);
  const massimo = Math.max(1, ...giorni.map((g) => g.minuti));
  const inciampi = store.inciampiOrdinati(5);

  aggiungi(radice, 
    titoloPagina('Altro', 'Tutto resta su questo telefono: non c\'è nessun server dietro.'),

    scheda(
      h('p', { class: 'occhiello', testo: 'Strumenti' }),
      h('div', { class: 'griglia-scorciatoie' },
        collegamento('#/manico', 'manico', 'Manico', 'Dove sono le note, scale e gradi'),
        collegamento('#/importa', 'spartito', 'I tuoi spartiti', 'Incolla gli accordi di una canzone'),
        collegamento('#/ascolta', 'orecchio', 'Verifica al microfono', 'Controlla che l\'accordo suoni davvero'),
        collegamento('collaudo.html', 'prova', 'Banco di collaudo', 'Le prove automatiche di dati e algoritmi'))),

    scheda(
      h('p', { class: 'occhiello', testo: 'Ultimi 14 giorni' }),
      h('div', { class: 'grafico' }, ...giorni.map((g) => h('div', { class: `gr-col${g.oggi ? ' oggi' : ''}`, title: `${g.giorno}: ${g.minuti} minuti` },
        h('span', { class: 'gr-barra', style: `height:${(g.minuti / massimo) * 100}%` }),
        h('small', { testo: g.giorno.slice(8) })))),
      h('ul', { class: 'elenco-magro' },
        h('li', { testo: `${minuti.toFixed(minuti % 1 ? 1 : 0)} minuti di esercizio in totale` }),
        h('li', { testo: `${passiFatti} passi su ${curriculum.PASSI.length}` }),
        h('li', { testo: `serie attuale: ${d.serie} giorni · record: ${d.serieRecord}` }),
        h('li', { testo: `giorni in cui hai suonato: ${Object.keys(d.minutiPerGiorno).length}` }))),

    inciampi.length
      ? scheda(
        h('p', { class: 'occhiello', testo: 'Dove ti sei bloccato' }),
        h('p', { class: 'dim piccolo', testo: 'I passi che hai ripetuto senza chiuderli. Non è un rimprovero: è l\'unico dato che dice dove serve rallentare o cambiare strada. Resta su questo telefono.' }),
        h('ul', { class: 'elenco-magro' }, ...inciampi.map(([id, n]) => {
          const p = curriculum.passo(id);
          return h('li', {}, h('a', { href: `#/passo/${id}` },
            h('strong', { testo: p ? p.titolo : id }),
            h('small', { class: 'dim blocco', testo: `${n} tentativi non riusciti` })));
        })))
      : null,

    scheda(
      h('p', { class: 'occhiello', testo: 'Ascolto e microfono' }),
      h('div', { class: 'riga-tra' },
        h('span', { testo: 'Ritardo del dispositivo' }),
        h('strong', { testo: d.latenzaMs === null ? 'non misurato' : `${Math.round(d.latenzaMs)} ms` })),
      h('p', { class: 'dim piccolo', testo: 'Il percorso uscita → altoparlante → aria → microfono non è istantaneo e cambia da telefono a telefono. Finché non è misurato, il giudizio sul tempo usa una stima di 90 ms e potrebbe farti sembrare in ritardo per colpa dell\'hardware. Si misura dentro un esercizio, col pulsante "Misura il ritardo del telefono".' }),
      d.latenzaMs !== null
        ? bottone('Dimentica la misura', () => { store.imposta('latenzaMs', null); ctx.vaiA('#/impostazioni'); }, { classe: 'sottile' })
        : null),

    scheda(
      h('p', { class: 'occhiello', testo: 'Aspetto' }),
      selTema),

    scheda(
      h('p', { class: 'occhiello', testo: 'Accordatura' }),
      selAccordatura,
      h('p', { class: 'dim piccolo', testo: 'I diagrammi degli accordi valgono per la standard EADGBE. Il Drop D e il mezzo tono sotto non cambiano le forme, solo i nomi; con DADGAD e Open G restano validi accordatore, ritmi e metronomo, non le posizioni.' })),

    scheda(
      h('p', { class: 'occhiello', testo: 'Capotasto mobile' }),
      selCapotasto,
      capotastoDice),

    scheda(
      h('p', { class: 'occhiello', testo: 'Riferimento di intonazione' }),
      h('div', { class: 'riga-tra' }, h('span', { testo: 'La4' }), valoreLa),
      cursoreLa,
      h('p', { class: 'dim piccolo', testo: '440 Hz è lo standard. Cambialo solo se devi suonare con qualcuno accordato diversamente.' })),

    scheda(
      h('p', { class: 'occhiello', testo: 'Obiettivo giornaliero' }),
      h('div', { class: 'riga-tra' }, h('span', { testo: 'Ogni giorno' }), valoreObiettivo),
      cursoreObiettivo,
      h('p', { class: 'dim piccolo', testo: 'Meglio poco tutti i giorni che molto una volta a settimana: le dita consolidano dormendo.' })),

    scheda(
      h('p', { class: 'occhiello', testo: 'Installala sull\'iPhone' }),
      inApp
        ? h('p', { class: 'ok', testo: 'Stai già usando l\'app installata.' })
        : h('ol', { class: 'elenco' },
          h('li', { testo: 'Apri questa pagina in Safari (non in un browser dentro un\'altra app).' }),
          h('li', { testo: 'Tocca il pulsante Condividi, quello con la freccia verso l\'alto.' }),
          h('li', { testo: 'Scegli "Aggiungi alla schermata Home".' }),
          h('li', { testo: 'Da quel momento parte a schermo pieno e funziona anche senza rete.' })),
      h('p', { class: 'dim piccolo', testo: 'Il microfono chiede il permesso la prima volta. Se lo neghi, si riattiva da Impostazioni › Safari › Microfono.' })),

    scheda(
      h('p', { class: 'occhiello', testo: 'Backup dei progressi' }),
      h('p', { class: 'dim piccolo', testo: 'Non c\'è nessun account: se cambi telefono o svuoti i dati di Safari, l\'avanzamento sparisce. Questo è l\'unico modo per portarlo via.' }),
      bottone('Scarica il backup', scaricaBackup, { classe: 'sottile' }),
      bottone('Ripristina da un backup', () => chiediRipristino(radice, ctx), { classe: 'sottile' })),

    scheda(
      h('p', { class: 'occhiello', testo: 'Ricominciare da zero' }),
      h('p', { class: 'dim piccolo', testo: 'Cancella passi completati, minuti e statistiche degli accordi. Non si può annullare.' }),
      bottone('Azzera i miei progressi', () => chiediAzzeramento(radice, ctx), { classe: 'sottile pericolo' })),

    scheda(
      h('p', { class: 'dim piccolo', testo: 'Chitarra Coach · pagina statica, nessun account, nessun dato in uscita. Accordatore: spettro con prodotto armonico e raffinamento per autocorrelazione, provato fino al Mi basso di 82,41 Hz. Verifica accordo: ricerca dei picchi alle frequenze attese su una finestra di 8192 campioni — sotto, sulle corde gravi due note vicine si fondono in una sola.' })),
  );
  return null;
}

function collegamento(href, nomeIcona, titolo, testo) {
  return h('a', { class: 'scorciatoia', href },
    h('span', { class: 'sc-icona' }, icona(nomeIcona)),
    h('span', {}, h('strong', { testo: titolo }), h('small', { class: 'dim', testo })));
}

function scaricaBackup() {
  const blob = new Blob([store.esporta()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chitarra-coach-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function chiediRipristino(radice, ctx) {
  const area = h('textarea', {
    class: 'campo', rows: 5, placeholder: 'Incolla qui il contenuto del file di backup…',
    'aria-label': 'Contenuto del backup',
  });
  const file = h('input', {
    type: 'file', accept: 'application/json,.json', class: 'campo',
    onchange: async (e) => {
      const f = e.target.files[0];
      if (f) area.value = await f.text();
    },
  });
  const esito = h('p', { class: 'piccolo' });
  const box = scheda(
    h('p', { class: 'occhiello', testo: 'Ripristino' }),
    file,
    area,
    bottone('Ripristina (sovrascrive tutto)', () => {
      const r = store.importa(area.value);
      esito.className = `piccolo ${r.ok ? 'ok' : 'errore'}`;
      esito.textContent = r.motivo;
      if (r.ok) { store.applicaTema(); setTimeout(() => ctx.vaiA('#/oggi'), 900); }
    }),
    bottone('Annulla', () => box.remove(), { classe: 'sottile' }),
    esito,
  );
  radice.appendChild(box);
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function chiediAzzeramento(radice, ctx) {
  const box = scheda(
    h('p', { testo: 'Sicuro? Perdi tutto l\'avanzamento del percorso. Se non l\'hai già fatto, scarica prima il backup.' }),
    h('div', { class: 'es-scelte' },
      bottone('Sì, azzera', () => { store.azzera(); store.applicaTema(); ctx.vaiA('#/oggi'); }, { classe: 'pericolo' }),
      bottone('Annulla', () => box.remove(), { classe: 'sottile' })),
  );
  radice.appendChild(box);
  box.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}
