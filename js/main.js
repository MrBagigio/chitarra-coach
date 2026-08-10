// Router e telaio dell'app. Rotte via hash (#/...) perché GitHub Pages serve file
// statici da una sottocartella: senza server che riscrive gli URL, i percorsi veri
// darebbero 404 a ogni ricarica.

import * as store from './store.js';
import { icona } from './icone.js';
import { registraBraniUtente } from './songs.js';
import { branoMio } from './importa.js';
import { chiudiMicrofono, fermaNota, tieniSchermoAcceso } from './audio.js';

import * as vOggi from './views/oggi.js';
import * as vAccorda from './views/accorda.js';
import * as vAscolta from './views/ascolta.js';
import * as vOrecchio from './views/orecchio.js';
import * as vPercorso from './views/percorso.js';
import * as vPasso from './views/passo.js';
import * as vLibreria from './views/libreria.js';
import * as vManico from './views/manico.js';
import * as vImporta from './views/importa.js';
import * as vGiri from './views/giri.js';
import * as vEsercizio from './views/esercizio.js';
import * as vLibero from './views/libero.js';
import * as vImpostazioni from './views/impostazioni.js';

const ROTTE = [
  { schema: ['oggi'], vista: vOggi, tab: 'oggi' },
  { schema: ['accorda'], vista: vAccorda, tab: 'accorda' },
  { schema: ['ascolta'], vista: vAscolta, tab: 'ascolta' },
  { schema: ['orecchio'], vista: vOrecchio, tab: 'percorso' },
  { schema: ['percorso'], vista: vPercorso, tab: 'percorso' },
  { schema: ['passo', ':id'], vista: vPasso, tab: 'percorso' },
  { schema: ['libreria'], vista: vLibreria, tab: 'libreria' },
  { schema: ['libreria', ':id'], vista: vLibreria, tab: 'libreria' },
  { schema: ['manico'], vista: vManico, tab: 'libreria' },
  { schema: ['importa'], vista: vImporta, tab: 'libreria' },
  { schema: ['giri'], vista: vGiri, tab: 'libreria' },
  { schema: ['esercizio', ':modo'], vista: vEsercizio, tab: 'percorso' },
  { schema: ['libero'], vista: vLibero, tab: 'percorso' },
  { schema: ['impostazioni'], vista: vImpostazioni, tab: 'impostazioni' },
];

const TAB = [
  { id: 'oggi', hash: '#/oggi', etichetta: 'Oggi', icona: 'casa' },
  { id: 'accorda', hash: '#/accorda', etichetta: 'Accorda', icona: 'diapason' },
  { id: 'ascolta', hash: '#/ascolta', etichetta: 'Verifica', icona: 'microfono' },
  { id: 'percorso', hash: '#/percorso', etichetta: 'Percorso', icona: 'scala' },
  { id: 'libreria', hash: '#/libreria', etichetta: 'Accordi', icona: 'manico' },
  { id: 'impostazioni', hash: '#/impostazioni', etichetta: 'Altro', icona: 'cursori' },
];

let smontaCorrente = null;
const contenuto = document.getElementById('contenuto');
const barra = document.getElementById('tabbar');

function analizza(hash) {
  const grezzo = (hash || '').replace(/^#\/?/, '');
  const [percorsoParte, queryParte] = grezzo.split('?');
  const pezzi = percorsoParte.split('/').filter(Boolean).map(decodeURIComponent);
  const query = {};
  new URLSearchParams(queryParte || '').forEach((v, k) => { query[k] = v; });
  return { pezzi, query };
}

function trovaRotta(pezzi) {
  for (const r of ROTTE) {
    if (r.schema.length !== pezzi.length) continue;
    const parametri = {};
    let ok = true;
    r.schema.forEach((s, i) => {
      if (s.startsWith(':')) parametri[s.slice(1)] = pezzi[i];
      else if (s !== pezzi[i]) ok = false;
    });
    if (ok) return { ...r, parametri };
  }
  return null;
}

function vaiA(hash) {
  if (window.location.hash === hash) rendi();
  else window.location.hash = hash;
}

function disegnaTab(attivo) {
  barra.replaceChildren(...TAB.map((t) => {
    const a = document.createElement('a');
    a.href = t.hash;
    a.className = `tab${t.id === attivo ? ' attivo' : ''}`;
    a.setAttribute('aria-current', t.id === attivo ? 'page' : 'false');
    a.appendChild(icona(t.icona));
    const et = document.createElement('span');
    et.textContent = t.etichetta;
    a.appendChild(et);
    return a;
  }));
}

function rendi() {
  const { pezzi, query } = analizza(window.location.hash);
  if (!pezzi.length) { window.location.hash = '#/oggi'; return; }
  const rotta = trovaRotta(pezzi);

  if (smontaCorrente) { try { smontaCorrente(); } catch { /* la vista è già andata */ } }
  smontaCorrente = null;
  fermaNota();
  tieniSchermoAcceso(false);
  contenuto.replaceChildren();
  contenuto.scrollTop = 0;
  window.scrollTo(0, 0);

  if (!rotta) {
    const p = document.createElement('div');
    p.className = 'scheda';
    p.innerHTML = '<h2>Pagina non trovata</h2><p class="dim">Il collegamento non porta da nessuna parte.</p><a class="bottone" href="#/oggi">Torna a Oggi</a>';
    contenuto.appendChild(p);
    disegnaTab('oggi');
    return;
  }

  disegnaTab(rotta.tab);
  document.body.dataset.vista = rotta.tab;
  smontaCorrente = rotta.vista.monta(contenuto, { parametri: rotta.parametri, query, vaiA }) || null;
}

window.addEventListener('hashchange', rendi);

// L'accordatore tiene aperto il microfono: se l'app va in secondo piano si chiude,
// altrimenti iOS lascia il pallino rosso acceso e la batteria se ne accorge.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    chiudiMicrofono();
    fermaNota();
    tieniSchermoAcceso(false);
    if (['accorda', 'ascolta'].includes(document.body.dataset.vista)) rendi();
  }
});

// Registrazione del service worker: relativa, così funziona in sottocartella.
//
// In locale NON si registra, e se c'era si disinstalla: la cache-first serve la copia
// precedente del file appena modificato, quindi si collauda il codice di ieri credendo
// di provare la modifica di adesso. In produzione (github.io) invece serve, ed è quello
// che fa partire l'app senza rete.
const inLocale = ['localhost', '127.0.0.1', '::1'].includes(location.hostname);

if ('serviceWorker' in navigator && inLocale) {
  navigator.serviceWorker.getRegistrations()
    .then((lista) => lista.forEach((r) => r.unregister()))
    .catch(() => {});
  if (window.caches) caches.keys().then((n) => n.forEach((k) => caches.delete(k))).catch(() => {});
}

if ('serviceWorker' in navigator && !inLocale && location.protocol !== 'file:') {
  // Quando un service worker NUOVO prende il comando, i moduli già caricati vengono dalla
  // versione precedente: si ricarica una volta sola, così tutta la pagina parla la stessa
  // lingua. Senza questo, l'aggiornamento si vede solo alla seconda apertura — e nel
  // frattempo può mostrare un miscuglio di due versioni.
  let giaRicaricato = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (giaRicaricato) return;
    giaRicaricato = true;
    window.location.reload();
  });
  window.addEventListener('load', () => {
    const radice = new URL('../', import.meta.url);
    navigator.serviceWorker
      .register(new URL('sw.js', radice), { scope: radice.pathname })
      .then((reg) => reg.update())
      .catch(() => { /* offline non disponibile: l'app funziona comunque online */ });
  });
}

store.dati();
store.applicaTema();
registraBraniUtente(branoMio);
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => store.applicaTema());
rendi();
