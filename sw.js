// Service worker: l'app deve partire anche senza rete (in treno, in cantina, in tenda).
//
// Strategia: cache-first per gli asset, con aggiornamento in sottofondo. Per le
// navigazioni si prova la rete e si ricade su index.html — le rotte sono tutte
// dopo il cancelletto, quindi c'è un solo documento da servire.
//
// Strategia: RETE PRIMA per il codice, cache prima solo per le icone.
//
// La cache-first era la scelta ovvia e sbagliata: obbliga ad alzare `VERSIONE` a ogni
// rilascio, e il giorno che te ne dimentichi il telefono continua a servire il file di
// ieri senza dire niente. È già successo due volte in questo progetto — una in sviluppo
// (un fix che sembrava non funzionare) e una in produzione (mezza app vecchia e mezza
// nuova, pagina bianca). Un rimedio che dipende dalla memoria di chi rilascia non è un
// rimedio.
//
// Adesso: si prova la rete con un tetto di 2,5 secondi, e la cache è la RISERVA. Online
// hai sempre l'ultima versione senza dover ricordare niente; offline, o con la rete che
// non risponde, parte comunque tutto. Costa una manciata di millisecondi all'avvio: per
// 31 file statici è un prezzo onesto.

const VERSIONE = 'uke-v7';
const ATTESA_RETE_MS = 2500;
const RISORSE = [
  './',
  'index.html',
  'app.webmanifest',
  'css/app.css',
  'js/main.js',
  'js/ui.js',
  'js/icone.js',
  'js/store.js',
  'js/audio.js',
  'js/pitch.js',
  'js/chroma.js',
  'js/ascoltoVivo.js',
  'js/theory.js',
  'js/ripasso.js',
  'js/importa.js',
  'js/illustrazione.js',
  'js/voicing.js',
  'js/views/libero.js',
  'js/views/giri.js',
  'js/views/importa.js',
  'js/ascoltoVivo.js',
  'js/ripasso.js',
  'js/importa.js',
  'js/icone.js',
  'js/chords.js',
  'js/diagram.js',
  'js/tunings.js',
  'js/patterns.js',
  'js/songs.js',
  'js/curriculum.js',
  'js/views/oggi.js',
  'js/views/accorda.js',
  'js/views/ascolta.js',
  'js/views/orecchio.js',
  'js/views/percorso.js',
  'js/views/passo.js',
  'js/views/esercizio.js',
  'js/views/libreria.js',
  'js/views/manico.js',
  'js/views/importa.js',
  'js/views/giri.js',
  'js/views/impostazioni.js',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
];

// Il banco di collaudo NON va in cache: servirebbe la versione di ieri e si finirebbe
// per collaudare il codice vecchio credendo di provare quello nuovo.
const MAI_IN_CACHE = /collaudo/;

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSIONE);
    // addAll fallisce tutto se un file manca: qui si aggiunge uno per uno così
    // un'icona assente non impedisce all'app di funzionare offline.
    await Promise.all(RISORSE.map((r) => cache.add(new Request(r, { cache: 'reload' })).catch(() => null)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const nomi = await caches.keys();
    await Promise.all(nomi.filter((n) => n !== VERSIONE).map((n) => caches.delete(n)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const richiesta = e.request;
  if (richiesta.method !== 'GET') return;
  const url = new URL(richiesta.url);
  if (url.origin !== self.location.origin) return;
  if (MAI_IN_CACHE.test(url.pathname)) return;

  // Le icone non cambiano mai contenuto a parità di nome: lì la cache prima è giusta.
  const immutabile = /\/icons\//.test(url.pathname);

  e.respondWith((async () => {
    const cache = await caches.open(VERSIONE);

    if (immutabile) {
      const salvato = await cache.match(richiesta);
      if (salvato) return salvato;
    }

    const risposta = await conTetto(fetch(richiesta), ATTESA_RETE_MS);
    if (risposta && risposta.ok) {
      cache.put(richiesta, risposta.clone()).catch(() => {});
      return risposta;
    }

    const riserva = await cache.match(richiesta)
      || (richiesta.mode === 'navigate' ? (await cache.match('index.html')) || (await cache.match('./')) : null);
    return riserva || risposta || Response.error();
  })());
});

/** La promessa, oppure null se ci mette troppo o fallisce. Mai un'attesa senza fine. */
function conTetto(promessa, ms) {
  return Promise.race([
    promessa.catch(() => null),
    new Promise((risolvi) => setTimeout(() => risolvi(null), ms)),
  ]);
}
