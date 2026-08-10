# Ukulele Coach

Accordatore, verifica al microfono e percorso di studio per ukulele. Pagina statica:
nessun server, nessun account, niente esce dal telefono. Si installa sulla schermata Home
dell'iPhone e funziona anche senza rete.

<https://mrbagigio.github.io/ukulele-coach/>

## Cosa c'è dentro

**Accordatore.** Microfono → spettro → prodotto armonico per trovare la fondamentale
(→ nessun errore d'ottava) → autocorrelazione normalizzata in una finestra stretta con
interpolazione parabolica per la risoluzione in centesimi. Verde solo se lo scarto sta
entro 5 centesimi per 700 ms di fila: un picco fortunato non è una corda accordata.
Quattro accordature (standard GCEA, low-G, baritono DGBE, in Re), La4 regolabile
432–446 Hz, nota di riferimento per accordare a orecchio.

**Verifica al microfono.** Suoni l'accordo e ti dice **quale corda non sta suonando** —
l'errore vero del principiante non è sbagliare accordo, è spegnere una corda col dito e
non accorgersene. Cerca un *picco* alle frequenze attese, non semplicemente energia:
misurando l'energia grezza, la falda di una nota vicina riempie la casella di una corda
muta. E quando una corda non è giudicabile (la sua nota coincide con quella di un'altra o
con un suo armonico) **lo dichiara** invece di dare un verde falso. C'è anche il modo
"indovina che accordo è", che restituisce una classifica e non una sentenza: su un ukulele
Do6 e Lam7 sono le stesse quattro note e nessun programma può distinguerli.

**Percorso.** 8 livelli, 83 passi, in un ordine dove ogni passo aggiunge **una** difficoltà
sola: un accordo nuovo non arriva insieme a un ritmo nuovo. Il Fa viene prima del Sol
perché costa due dita invece di tre. Tipi di passo: accordatura, scheda da leggere con
domanda di controllo, forma nuova, controllo al microfono, allenamento d'orecchio, cambio a
tempo, ritmo o arpeggio, giro/brano. L'ordine non è un'opinione: il collaudo verifica che
nessun passo chieda un accordo non ancora insegnato, e le eccezioni vanno dichiarate.

**Accordi.** 85 diteggiature con diagramma SVG (dita numerate, corde a vuoto, barré,
finestra che scorre oltre il 4° tasto), ognuna **verificata contro le note dell'accordo**.
Si possono ascoltare. Le voicing senza fondamentale (il Re7 facile) sono dichiarate, non
nascoste.

**Manico.** Dodici tasti con le note, per scale, gradi o accordi, più i sette accordi della
tonalità: serve a capire *perché* una forma sta lì, e che è spostabile.

**Orecchio.** Maggiore contro minore, e riconoscimento fra più accordi. Il suono è
sintetizzato dalle frequenze vere delle corde con la diteggiatura vera.

**Esercizi.** Metronomo programmato sul clock audio (non su `setInterval`, altrimenti il
tempo balla appena la pagina ridisegna), battuta di lancio, conteggio, 40–180 bpm, tap
tempo, aumento automatico della velocità.

- *cambio accordi* — due o più accordi, uno per battuta, con il prossimo già in vista
- *ritmo* — griglia con ↓ ↑ ✕ in ottavi o terzine (shuffle, 6/8, valzer)
- *arpeggio* — le stesse caselle ma con p-i-m-a e la corda di ciascun dito
- *giro/brano* — mappa delle battute che scorre, con **trasporto** ±6 semitoni

**Onestà dichiarata:** negli esercizi il programma non sente se hai suonato bene — per
quello c'è Verifica, che il microfono ce l'ha. Lì si misura tempo, velocità e battute
tenute. La pulizia la giudichi tu, e a fine esercizio te lo chiede invece di inventarselo:
se rispondi "sporco" abbassa di 6 bpm e non segna il passo.

**Altro.** Tema scuro/chiaro/di sistema, obiettivo giornaliero, grafico degli ultimi 14
giorni, backup ed esportazione dei progressi (senza account non c'è nulla nel cloud: se
svuoti Safari sparisce tutto, e va detto prima).

## Collaudo

```bash
node tools/serve.mjs
```

Poi <http://localhost:4178/collaudo.html>: **1591 prove** che girano nel browser, senza
niente da installare.

- ogni diteggiatura suona davvero le note del suo nome (fondamentale, terza, settima…),
  dita coerenti coi tasti, barré sensato
- ogni brano usa solo accordi che esistono; il trasporto di un'ottava torna al punto di partenza
- **nessun passo del percorso chiede un accordo non ancora insegnato**
- l'accordatore entro 3 centesimi su onda pura, su pizzicato con secondo armonico
  dominante, con fondamentale debole, scordato e con rumore — e tace sul rumore puro
- la verifica accordo scopre **33 corde spente su 33** fra quelle che dichiara giudicabili,
  senza falsi allarmi sull'accordo suonato bene

I collaudi audio non usano il microfono: sintetizzano il segnale, così il verdetto non
dipende dalla stanza. Le attese sono misurate sull'orologio dell'audio e non su
`setTimeout`, che un browser strozza a un secondo quando la pagina non è in primo piano.

## Provarla in locale

```bash
node tools/serve.mjs
```

Serve un server vero: i moduli ES non si caricano da `file://`. In locale il service worker
**non** viene registrato (e se c'era si disinstalla): la cache-first serve la copia
precedente del file appena modificato, e si finisce per collaudare il codice di ieri —
è già successo, ed è costato mezz'ora di diagnosi su un bug che non esisteva.

## Rigenerare le icone

```bash
node tools/genera-icone.mjs
```

PNG scritti a mano (zlib + CRC, supersampling 4×) senza dipendenze: iOS **ignora** le icone
SVG del manifest e senza `apple-touch-icon` PNG l'app in Home resta un riquadro vuoto.

## Pubblicare

Tutti i file sono statici e i percorsi relativi, quindi funziona anche da sottocartella.
Le rotte stanno dopo il `#`, così una ricarica non dà 404. Il microfono richiede `https`:
GitHub Pages lo è già.

Il service worker va in **rete per primo** (tetto 2,5 s) e usa la cache come riserva: online
prendi sempre l'ultima versione senza dover ricordare niente, offline parte comunque tutto.
La cache-first era la scelta ovvia e sbagliata — obbliga ad alzare `VERSIONE` a ogni
rilascio, e il giorno che te ne dimentichi il telefono serve il file di ieri in silenzio.
È successo due volte qui: una in sviluppo (un fix che sembrava inerte) e una in produzione
(mezza app vecchia e mezza nuova → pagina bianca). `index.html` porta comunque una rete di
sicurezza inline che, se la pagina resta vuota o un modulo non combacia, svuota cache e
service worker e ricarica una volta sola.

## Struttura

```
index.html          guscio, meta iOS
collaudo.html       banco di prova (escluso dalla cache del service worker)
app.webmanifest     nome, icone, standalone
sw.js               cache offline (VERSIONE da alzare a ogni rilascio)
css/app.css         tema scuro e chiaro, nessun font esterno
js/
  main.js           router a hash + telaio
  ui.js             costruttori DOM
  store.js          stato su localStorage, backup, tema
  audio.js          AudioContext, microfono, metronomo, note
  pitch.js          rilevamento dell'altezza + centesimi
  chroma.js         verifica accordo e riconoscimento
  theory.js         note, qualità, gradi, trasporto
  chords.js         85 accordi, verificati contro la teoria
  diagram.js        diagramma SVG
  tunings.js        4 accordature
  patterns.js       16 fra ritmi e arpeggi
  songs.js          30 giri e brani (tradizionali / pubblico dominio)
  curriculum.js     8 livelli, 83 passi
  icone.js          set di icone SVG a tratto (niente emoji: il telefono le colora a modo suo)
  collaudo.js       le 1591 prove
  views/            oggi, accorda, ascolta, orecchio, percorso, passo,
                    esercizio, libreria, manico, impostazioni
tools/
  serve.mjs         server statico per lo sviluppo
  genera-icone.mjs  PNG delle icone
```

Nei brani c'è **solo la successione degli accordi**, e sono tutti tradizionali o di pubblico
dominio: nessun testo, nessuna melodia trascritta.
