# Chitarra Coach — documento d'avvio

Consegna dalla sessione che ha costruito **Ukulele Coach**
(`C:\Users\alexg\Documents\ukulele-coach` → <https://mrbagigio.github.io/ukulele-coach/>).

Obiettivo: la stessa cosa per **chitarra acustica**. PWA statica su GitHub Pages,
installabile su iPhone, niente server, niente account, funziona senza rete.

---

## 1. La decisione da prendere per prima

Il motore dell'ukulele **non è specifico dell'ukulele**. Rilevamento dell'altezza,
riconoscimento dell'attacco, metronomo sul clock audio, verifica dell'accordo dal
microfono, ripetizione spaziata, importazione di spartiti, teoria musicale: nessuno di
questi sa quante corde ha lo strumento.

Quello che è specifico sta in **quattro file di dati** e in **tre punti di codice**.

Quindi le strade sono due, e vanno decise ADESSO perché dopo costano:

**A — Fork con motore condiviso** *(consigliata)*
Repo nuovo `chitarra-coach`, si copiano i file-motore **identici**, si riscrivono i dati.
I due prodotti restano separati (due URL, due icone, due percorsi didattici), ma un difetto
trovato nel motore si corregge copiando un file, non riscrivendolo.
Vincolo da rispettare: i file-motore **non si toccano** nella copia se non per la
generalizzazione a N corde, che va poi riportata anche nell'ukulele.

**B — Una sola app, due strumenti**
Si generalizza `ukulele-coach` e si aggiunge un selettore di strumento. Un motore solo, un
collaudo solo, un rilascio solo. Costo: l'app già installata sulla Home cambia faccia, e la
libreria accordi raddoppia dentro lo stesso prodotto.

> Perché A e non B: l'utente ha chiesto **un'app** per la chitarra, non un'app che fa due
> cose. Ma il rischio di A è reale e documentato — vedi la memoria
> `feedback_same_logic_two_places`: la stessa logica in due posti produce bug a raffica.
> Si accetta solo tenendo i file-motore **byte per byte uguali** e verificandolo.

---

## 2. Cosa si riusa, file per file

Da `C:\Users\alexg\Documents\ukulele-coach\js\`:

| File | Riuso | Cosa cambia |
|---|---|---|
| `pitch.js` | **identico** | niente (già provato fino a 146 Hz, la chitarra scende a 82) |
| `audio.js` | **identico** | niente — Karplus-Strong, metronomo, microfono, analizzatori |
| `ascoltoVivo.js` | quasi identico | **banda di attacco 200–1100 → ~75–1100** |
| `chroma.js` | quasi identico | **banda 240–950 → ~75–950** (vedi §3) |
| `theory.js` | **identico** | niente |
| `ui.js` `icone.js` `illustrazione.js` | identico / ridisegno | l'illustrazione va rifatta a forma di chitarra |
| `store.js` `ripasso.js` `importa.js` | **identico** | niente |
| `diagram.js` | generalizzare | oggi assume 4 corde; deve leggere `CORDE.length` |
| `voicing.js` | generalizzare | `combina()` si ferma a `corda === 4`; deve fermarsi a N |
| `collaudo.js` | struttura identica | i casi vanno riscritti sui dati della chitarra |
| `chords.js` `curriculum.js` `songs.js` `tunings.js` | **da riscrivere** | sono i dati dello strumento |
| `views/*` | quasi identici | testi e percorsi cambiano, la struttura no |

**Il collaudo è la cosa più preziosa da portare.** `collaudo.html` esegue ~2000 prove nel
browser senza niente di installato, e ha trovato una ventina di difetti veri. La sua parte
di infrastruttura (gruppi, attesa sull'orologio audio, microfono sintetico) si copia com'è.

---

## 3. Le tre differenze tecniche vere

**a) Il Mi basso a 82 Hz.** È la differenza che conta. La verifica dell'accordo lavora oggi
in 240–950 Hz perché le fondamentali dell'ukulele stanno lì. Sulla chitarra le due corde
gravi (E2 82,4 Hz, A2 110 Hz) cadono **fuori banda**: verificate così non esisterebbero.
Allargando la banda entrano più armonici, quindi vanno **rimisurate** la soglia dei picchi
e quella dell'energia estranea (oggi 0,30, misurata su ukulele: giusto 0,00–0,08,
sbagliato 0,76–1,00). **Non copiare quei numeri: rifare la misura.**

**b) Sei corde invece di quattro.** Cambia `CORDE`, `CORDE_SEMITONI`, la larghezza del
diagramma, la ricerca delle posizioni, e soprattutto: sulla chitarra **le corde smorzate
sono normali** (la ✕ sopra il capotasto), mentre sull'ukulele erano un'eccezione. La
funzione `verificabilita()` diventa più importante, non meno: con sei corde gli unisoni e
gli ottavi fra corde sono frequentissimi (Mi basso e Mi cantino sono a due ottave).

**c) La pedagogia è diversa.** L'ukulele parte da accordi a un dito; la chitarra parte da
Em (due dita) e sbatte contro il **barré** al secondo mese — che è il vero muro, e merita
un livello dedicato con esercizi di forza e di rotazione del polso. Il fingerpicking
(Travis picking, pollice alternato sui bassi) pesa molto di più.
Accordatura standard **EADGBE**; prevedere Drop D e mezzo tono sotto.

---

## 4. Le lezioni già pagate — non ripagarle

Sono errori veri fatti costruendo l'ukulele, ciascuno costato ore:

1. **Il service worker serve il file di ieri.** Cache-first obbliga ad alzare un numero di
   versione a ogni rilascio; il giorno che te ne dimentichi, il telefono serve il vecchio in
   silenzio. → **rete-prima con tetto 2,5 s, cache come riserva**; in locale il SW non si
   registra affatto. E in `index.html` una rete di sicurezza inline che, se la pagina resta
   vuota, svuota cache e SW e ricarica **una volta sola**.
2. **`Element.append(null)` stampa la parola "null" in pagina.** Serve un helper che filtri.
3. **Il programma sente sé stesso.** Il click del metronomo a 880 Hz cadeva fra le
   fondamentali e veniva contato come una pennata dell'utente: l'esercizio risultava
   perfetto a strumento sul tavolo. → l'emissione va **fuori dalla banda di misura**
   (click a 2,5–3,5 kHz), e va verificato in dB, non dato per buono.
4. **Il conteggio non può stare su `requestAnimationFrame`**: i frame si fermano appena la
   pagina non è in primo piano mentre il metronomo continua. → timer, e battuta **assoluta**
   dallo scheduler.
5. **Un requisito che sembra rigore può essere fisicamente irraggiungibile.** «700 ms
   ininterrotti entro 5 centesimi» non si ottiene su una corda vera, che parte crescente e
   cala. → si **somma** il tempo dentro tolleranza in una finestra.
6. **Presenza ≠ correttezza.** Se il microfono DECIDE, non basta «ci sono le note attese»:
   serve anche «non c'è quello che non dovrebbe esserci».
7. **Le soglie si derivano, non si copiano da una run fortunata.**
8. **Verificare tutto tranne guardare non serve.** 1300 prove verdi e zero screenshot: i
   difetti sopravvissuti erano tutti e soli quelli visibili a occhio.
9. **Ogni risorsa agganciata alla finestra va staccata** quando la vista muore.
10. Il build di GitHub Pages **a volte non parte**: va forzato con
    `gh api -X POST repos/.../pages/builds` e atteso confrontando lo `sha`.

---

## 5. Il metodo di verifica che ha funzionato

- **Microfono sintetico attraverso la vera `getUserMedia`**: si costruisce un
  `MediaStreamDestination`, gli si suonano dentro accordi generati da `bufferCorda()`, e si
  sovrascrive `navigator.mediaDevices.getUserMedia`. Passa per lo stesso codice del
  microfono vero. Serve a provare accordatore, verifica accordo e ascolto vivo **senza
  strumento**.
- **Attese sull'orologio audio, non su `setTimeout`** (un browser strozza i timer a 1 s
  quando la pagina non è in primo piano) — ma **mai attesa attiva** se di mezzo c'è un
  `MediaStream`: la pipeline media ha bisogno del ciclo degli eventi (misurato: 0 pennate
  su 6 con busy-wait, 6 su 6 con `setInterval`).
- **Screenshot veri** con il MCP `chrome-devtools`: `new_page` → `resize_page` 390×844 →
  `take_screenshot`, e con dati finti realistici in `localStorage`, non a stato vuoto.

---

## 6. Ricetta di pubblicazione

```bash
gh repo create chitarra-coach --public
git push -u origin main            # da questa cartella il push NON è bloccato dal hook
gh api -X POST repos/MrBagigio/chitarra-coach/pages --input pages.json   # JSON SENZA BOM
```
`pages.json` = `{"source":{"branch":"main","path":"/"},"build_type":"legacy"}` — scritto col
tool Write, perché `Out-File -Encoding utf8` di PowerShell 5.1 aggiunge il BOM e GitHub
risponde `400 Problems parsing JSON`.

Poi attendere confrontando lo `sha`, forzando il build se non parte.

---

## 7. Primo messaggio suggerito per la chat nuova

> Leggi `AVVIO.md` in questa cartella. Costruiamo Chitarra Coach seguendo la strada A
> (fork con motore condiviso da `C:\Users\alexg\Documents\ukulele-coach`). Comincia dal
> motore e dal collaudo: prima fai passare l'accordatore sulle sei corde con Mi basso a
> 82 Hz, e **rimisura** le soglie della verifica accordo invece di copiarle. Non scrivere
> una riga di curriculum finché il collaudo audio non è verde.
