# Chitarra Coach

Accordatore, verifica al microfono e percorso di studio per chitarra acustica. Pagina
statica: nessun server, nessun account, niente esce dal telefono. Si installa sulla
schermata Home dell'iPhone e funziona anche senza rete.

Nasce come fork di [Ukulele Coach](https://github.com/MrBagigio/ukulele-coach): il motore
è lo stesso, i dati e la pedagogia no. Cosa è cambiato davvero — e perché — sta in
[§ Le tre differenze vere](#le-tre-differenze-vere).

## Cosa c'è dentro

**Accordatore.** Microfono → spettro → prodotto armonico per trovare la fondamentale
(→ nessun errore d'ottava) → autocorrelazione normalizzata in una finestra stretta con
interpolazione parabolica per la risoluzione in centesimi. Verde solo se lo scarto sta
entro 5 centesimi per 700 ms *sommati* in una finestra: una corda vera parte crescente e
cala, e "700 ms ininterrotti" non si ottiene. Cinque accordature (standard EADGBE, Drop D,
mezzo tono sotto, DADGAD, Open G), La4 regolabile 432–446 Hz, nota di riferimento per
accordare a orecchio. Ogni corda porta il suo numero, perché su una chitarra le corde
chiamate "E" sono due.

**Verifica al microfono.** Suoni l'accordo e ti dice **quale corda non sta suonando** —
l'errore vero del principiante non è sbagliare accordo, è spegnere una corda col dito e
non accorgersene. Cerca un *picco* alle frequenze attese, non semplicemente energia. E
quando una corda non è giudicabile (la sua nota coincide con quella di un'altra o con un
suo armonico) **lo dichiara** invece di dare un verde falso: su sei corde capita spesso —
in un Mi maggiore suonano tre Mi e due Si, e le corde davvero giudicabili una per una sono
tre su sei. Misurato su dodici accordi: 40 corde giudicabili su 72.

**Percorso.** 9 livelli, 104 passi, in un ordine dove ogni passo aggiunge **una**
difficoltà sola. Si parte dal Mi minore (due dita, sei corde che suonano), non dal Do
(tre dita *e* una corda da smorzare: due difficoltà insieme). Il **barré ha un livello
suo**, perché è lì che si smette. Il **fingerpicking** arriva prima del barré, non dopo.

**Libreria.** 93 diteggiature verificate contro le note che l'accordo dichiara — il
collaudo rifiuta di pubblicare un diagramma che non suona quello che dice. Più le
posizioni alternative sul manico, cercate e non scritte a mano.

## Le tre differenze vere

Il motore dell'ukulele non è specifico dell'ukulele: rilevamento dell'altezza, metronomo
sul clock audio, ripetizione spaziata, teoria, importazione di spartiti non sanno quante
corde ha lo strumento. Tre cose però hanno dovuto cambiare, e sono le uniche che contano.

### 1. Il Mi basso a 82,41 Hz

La verifica dell'accordo lavorava in 240–950 Hz, dove stanno tutte le fondamentali
dell'ukulele. Sulla chitarra le due corde gravi (Mi2 82,41 · La2 110) cadono **fuori
banda**: verificate così non esisterebbero. La banda è ora **70–950 Hz** — sotto il Re2
del Drop D (73,42), che è la nota più grave che l'app deve saper leggere.

Allargare in basso non è gratis, ed è il conto che spiega tutto il resto: la banda vecchia
copriva meno di due ottave, quindi l'unico armonico che entrava era il secondo, che cade
sulla stessa classe di altezza della fondamentale e non sporca niente. Da 70 a 950 Hz ci
sono quasi quattro ottave: del Mi basso entrano dentro anche il 3° armonico (una quinta) e
il 5° (una **terza maggiore**) — cioè, su un accordo minore, esattamente la nota che non
deve esserci.

**`pitch.js` invece non è stato toccato di una riga**, e passa tutte le prove sul Mi basso
a 82,41 Hz e sul Re del Drop D. Era la previsione del documento d'avvio, ed era giusta.

### 2. Due difetti che la soglia nascondeva

La soglia dell'energia estranea andava rimisurata. Rimisurandola sono usciti due difetti
sotto, e nessuno dei due era una soglia.

**Primo: la finestra troppo corta.** Due picchi vicini nello spettro si distinguono solo
se distano più o meno quanto è largo il lobo della finestra. Le due note più vicine che
una chitarra mette in basso sono **Si2 (123,47 Hz) e Re3 (146,83): 23 Hz**. Con 4096
campioni a 44,1 kHz una casella vale 10,8 Hz — quelle due note stanno a due caselle e **si
fondono in una gobba sola**, e il programma dichiarava mute delle corde che suonavano.

| finestra | corde dichiarate mute per sbaglio | vuoto fra giusti e sbagliati |
|---|---|---|
| 4096 (93 ms) | Sol, Mi7, Sol7 — due corde ciascuno | −0,05 · **sovrapposti** |
| 8192 (186 ms) | nessuna | +0,12 |
| 16384 (372 ms) | nessuna | +0,12, con il doppio del ritardo |

Con 4096 le due popolazioni si sovrappongono: **nessuna soglia avrebbe potuto separarle**.

**Secondo: gli armonici contati come note.** Sistemata la finestra, il margine restava di
0,08 per lato — stretto, e con una ragione strutturale. Su quattro ottave di banda, del
Mi basso entrano dentro il 3° armonico (una **quinta**) e il 5° (una **terza maggiore**):
su un accordo minore quella terza è precisamente la nota vietata. Il pavimento degli
accordi giusti era alto per costruzione.

A dire quanto fosse grave è stato un banco nuovo. Il Karplus-Strong ha armoniche perfette
e timbro morbido; una corda d'acciaio ha la rigidità che stira le armoniche
(n·f·√(1+Bn²)) e un timbro molto più brillante. Rifacendo la misura su quello:

| banco | soppressione armonici | accordi giusti | accordi sbagliati | vuoto |
|---|---|---|---|---|
| acciaio brillante | no | ≤ **0,432** | ≥ 0,501 | **0,069** |
| acciaio brillante | **sì** | ≤ 0,000 | ≥ 0,416 | **0,416** |
| Karplus-Strong | no | ≤ 0,317 | ≥ 0,437 | 0,120 |
| Karplus-Strong | **sì** | ≤ 0,000 | ≥ 0,970 | 0,970 |

La riga che conta è la prima: **con la soglia a 0,38 e una chitarra brillante, gli accordi
GIUSTI arrivavano a 0,432** — l'app avrebbe detto «ripenna» a chi aveva suonato bene, e
nessuna delle prove precedenti se ne sarebbe accorta.

La cura è riconoscere gli armonici: un picco che sta a un multiplo intero esatto di un
picco più grave non è una nota che stai suonando. Tolti, il pavimento crolla da 0,43 a
0,00 e la soglia scende a **0,22**, con **0,22 di margine sopra e 0,20 sotto** invece di
0,08 e 0,08.

Tre numeri, e ognuno ha una ragione fisica invece di una taratura:

- **tolleranza 25 centesimi** — la rigidità di una corda avvolta grave (B ≈ 1e-4) porta
  l'ottava armonica 5,5 centesimi sopra il suo posto teorico; ma una settima minore
  temperata cade 31 centesimi sotto la settima armonica, e oltre quella soglia il
  programma comincerebbe a cancellare note davvero suonate. La misura è piatta da 15 a 40.
- **il genitore può essere fino a 6 dB più debole del figlio** — su una corda pizzicata la
  seconda armonica è spesso più forte della fondamentale. Pretendere un genitore più forte
  faceva scendere il guadagno da 0,39 a 0,03.
- **fino al 12° parziale** — si ricava: la nota più grave è il Re2 del Drop D a 73,42 Hz,
  la banda finisce a 950, e 950/73,42 fa 12,9. Fermandosi all'8° restava un fantasma
  preciso: l'**11ª armonica** cade 551 centesimi sopra, cioè quasi in mezzo fra la quarta
  e il tritono, e arrotonda al tritono — un Mi basso da solo "conteneva" un La♯ a 0,296 che
  nessuno aveva suonato. Lo ha trovato la prova nuova, il giorno stesso in cui è nata.

`Ascoltatore` **si rifiuta di nascere** con una finestra più corta, e c'è un solo punto che
la crea (`analizzatoreAccordo`): il numero era scritto a mano in tre viste, e bastava
aggiornarne due per lasciare in giro una schermata che accusa chi suona bene.

### 3. Sei corde, e la ✕ come argomento

Sull'ukulele la corda smorzata era un'eccezione; qui è metà libreria. Suonare il Mi basso
su un Do non lo rende più pieno: lo trasforma in un rivolto, e chi impara non se ne accorge
da solo. Il percorso ha un passo dedicato a *come* si smorza, e la verifica al microfono è
il modo più rapido per scoprire che stai suonando la 6ª credendo di no.

Il **pollice** non ha più una corda fissa: se ne prende tre e ci cammina sopra, e dove va
dipende dall'accordo. La regola è calcolata, non scritta a mano — la quinta dell'accordo
fra le corde del basso — e dà 6ª/5ª sul Mi, 5ª/4ª sul La e sul Do, 4ª/3ª sul Re:
esattamente quello che si legge in qualunque metodo.

## Il collaudo

`collaudo.html` esegue **~3200 prove** nel browser, senza niente di installato e senza
microfono: verifica i dati (accordi, ritmi, brani, ordine del percorso) e misura gli
algoritmi audio su segnali sintetizzati, così il verdetto non dipende dalla stanza.

Due gruppi meritano una riga a parte, perché sono nati da domande a cui non bastava
rispondere «sembra funzionare»:

- **Corda d'acciaio** — lo stesso confronto degli altri gruppi, ma su un banco con le
  armoniche stirate dalla rigidità e il timbro brillante. È il banco *vincolante*: la
  soglia si deriva da lui, non dal modello comodo, perché è lui che assomiglia allo
  strumento che hai in mano. Contiene anche la prova più diretta del meccanismo — un Mi
  basso **da solo** non deve contenere nessun'altra nota.
- **Disturbi che prima erano fuori banda** — allargando l'analisi fino a 70 Hz per vedere
  il Mi basso, ci sono entrati dentro il ronzio della rete e il rimbombo della stanza.
  Il gruppo verifica che non diventino note, e misura di quanto sbaglia l'accordatore col
  rimbombo addosso (meno di 12 centesimi su tutte e sei le corde, mai un errore d'ottava).
  Le soglie di sensibilità **non** sono state cambiate: misurate, non serviva.

Le righe con ▸ sono **misure, non prove**: restano visibili anche col filtro "mostra solo
quello che non va", perché sono i numeri da cui si derivano le soglie. Una soglia si
sceglie guardando come sono distribuite le misure vere, e per guardarle devono comparire
anche quando va tutto bene.

> **Il gruppo "Ascolto vivo" ha bisogno che la scheda sia in PRIMO PIANO.** Il browser
> porta i timer di una pagina nascosta a un colpo al secondo, e un attacco di pennata dura
> cinquanta millisecondi: con quella cadenza non si misura niente, per quanto il codice sia
> giusto (misurato: 10 ms per giro a pagina visibile, esattamente 1000 a pagina nascosta).
> In quel caso il collaudo dichiara **"PROVA NON ESEGUITA, non fallita"** e offre il
> pulsante per rifare. Non è un difetto da cercare nel codice.

Misurato con la scheda in vista, sul microfono sintetico: **6 pennate su 6 riconosciute,
scarto sistematico +1,2 ms, dispersione 1,8 ms.**

## Provare in locale

```bash
node tools/serve.mjs
```

Poi `http://localhost:4178` per l'app e `http://localhost:4178/collaudo.html` per il
collaudo. In locale il service worker **non** si registra e se c'era si disinstalla: la
cache servirebbe la copia precedente del file appena modificato, e si collauderebbe il
codice di ieri credendo di provare la modifica di adesso.

Le icone si rigenerano con `node tools/genera-icone.mjs` (nessuna dipendenza).

## Struttura

```
js/
  pitch.js        rilevamento dell'altezza — IDENTICO all'ukulele
  audio.js        contesto, microfono, corda pizzicata (Karplus-Strong), metronomo
  chroma.js       verifica dell'accordo, chroma, energia estranea — banda e finestra qui
  ascoltoVivo.js  quando penni e se l'accordo era quello
  theory.js       accordi, scale, gradi, trasporto
  chords.js       ⟵ dati dello strumento: 93 diteggiature per EADGBE
  tunings.js      ⟵ dati dello strumento: 5 accordature
  patterns.js     ⟵ dati dello strumento: ritmi e arpeggi, col pollice alternato
  curriculum.js   ⟵ dati dello strumento: 9 livelli, 104 passi
  songs.js        ⟵ dati dello strumento: 37 giri e brani tradizionali
  voicing.js      cerca le posizioni sul manico invece di elencarle
  diagram.js      disegno del diagramma — legge CORDE.length, non sa quante sono
  collaudo.js     il banco di prova
  views/          una vista per schermata
```

I file **non** marcati con ⟵ sono il motore, e sono gli stessi dell'ukulele a meno delle
generalizzazioni a N corde. Un difetto trovato qui va riportato là, e viceversa: la stessa
logica in due posti produce bug a raffica se le due copie divergono in silenzio.

## Privacy

Il microfono non lascia mai il telefono: nessun audio viene registrato, salvato o spedito.
L'avanzamento sta in `localStorage`, si esporta e si importa come file JSON.
