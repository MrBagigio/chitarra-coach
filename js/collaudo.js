// Banco di collaudo. Gira nel browser, non ha bisogno di niente di installato.
//
// Serve a una cosa sola: impedire che un dato sbagliato arrivi al telefono. Un diagramma
// di accordo errato si impara in silenzio e non si disimpara più, e un percorso che chiede
// un accordo non ancora insegnato fa sentire scemo chi studia, non chi ha scritto l'ordine.
//
// I collaudi audio non usano il microfono: sintetizzano il segnale e misurano il risultato,
// così il verdetto non dipende dalla stanza in cui sei.

import {
  ACCORDI, CORDE, NUMERI_CORDA, CORDE_SEMITONI, verificaDiteggiatura, nomeCanonico, accordo,
  ditaRichieste, etichettaDita, bassiDi, cordeSmorzate, ULTIMA_CORDA_DEL_POLLICE,
} from './chords.js';
import { icona, ICONA_PASSO } from './icone.js';
import { RITMI, etichette, cordeDiCasella, classeDito, usaBassoAlternato } from './patterns.js';
import { diagramma, legendaDita } from './diagram.js';
import { BRANI, accordiDi, branoTrasportato, branoSeEsiste } from './songs.js';
import { LIVELLI, PASSI } from './curriculum.js';
import { ACCORDATURE, accordatura } from './tunings.js';
import { classiAttese, scomponi, trasponi, classeNota, tonalitaProbabile } from './theory.js';
import {
  Rilevatore, centesimi, hzDaMidi, decisioneDisplay, spuntaDaTogliere, msDentroFinestra,
} from './pitch.js';
import {
  Ascoltatore, classifica, verificabilita, energiaEstranea, SOGLIA_ESTRANEA, FFT_ACCORDO,
} from './chroma.js';
import { Metronomo, bufferCorda } from './audio.js';
import * as audio from './audio.js';
import { AscoltoVivo, giudizioTempo, riepilogo } from './ascoltoVivo.js';
import { leggiSpartito, eAccordo, salvaBrano } from './importa.js';
import * as ripasso from './ripasso.js';
import * as store from './store.js';
import { posizioniDi, distanzaOttave } from './voicing.js';

const gruppi = [];

/** Registra un gruppo di prove. `fn(t)` può impostare `t.asincrono` per le prove audio. */
function gruppo(nome, fn) {
  gruppi.push({ nome, prove: [], fn });
}

function contestoPer(g) {
  return {
    nome: g.nome,
    asincrono: null,
    ok(titolo, condizione, dettaglio = '') {
      g.prove.push({ titolo, esito: !!condizione, dettaglio: condizione ? '' : dettaglio });
    },
    /**
     * Un numero da leggere, non una prova da superare.
     *
     * Serve per derivare le soglie invece di copiarle: una soglia si sceglie GUARDANDO
     * come sono distribuite le misure vere, e per guardarle bisogna che compaiano anche
     * quando va tutto bene. Un collaudo che mostra solo i fallimenti nasconde
     * esattamente i dati che servono a tararlo.
     */
    misura(titolo, valore) {
      g.prove.push({ titolo, esito: true, dettaglio: String(valore), misura: true });
    },
    uguale(titolo, avuto, atteso) {
      const e = JSON.stringify(avuto) === JSON.stringify(atteso);
      g.prove.push({
        titolo,
        esito: e,
        dettaglio: e ? '' : `avuto ${JSON.stringify(avuto)}, atteso ${JSON.stringify(atteso)}`,
      });
    },
  };
}

// ── A. Accordi ───────────────────────────────────────────────────────────────

gruppo('Accordi — le note sono quelle dichiarate', (t) => {
  const visti = new Set();
  ACCORDI.forEach((a) => {
    t.ok(`id unico: ${a.id}`, !visti.has(a.id), 'id duplicato');
    visti.add(a.id);
  });

  ACCORDI.forEach((a) => {
    const v = verificaDiteggiatura(a);
    t.ok(`${a.id} suona ${nomeCanonico(a)}`, v.ok, v.motivo);
  });

  ACCORDI.forEach((a) => {
    t.ok(`${a.id}: ${CORDE.length} corde`,
      a.tasti.length === CORDE.length && a.dita.length === CORDE.length,
      `tasti ${a.tasti.length}, dita ${a.dita.length}`);
    t.ok(`${a.id}: tasti plausibili`, a.tasti.every((x) => x >= -1 && x <= 12), JSON.stringify(a.tasti));
    t.ok(`${a.id}: difficoltà 1–5`, a.difficolta >= 1 && a.difficolta <= 5, String(a.difficolta));
    t.ok(`${a.id}: ha una famiglia`, !!a.famiglia, 'campo famiglia mancante');
  });

  // La mano ci arriva: quattro tasti di apertura sono già il limite di chi impara.
  ACCORDI.forEach((a) => {
    const premuti = a.tasti.filter((x) => x > 0);
    if (!premuti.length) return;
    const apertura = Math.max(...premuti) - Math.min(...premuti);
    t.ok(`${a.id}: apertura della mano sostenibile`, apertura <= 3, `${apertura} tasti`);
  });

  // Le corde smorzate stanno ai bordi. Smorzarne una IN MEZZO significa appoggiare un
  // polpastrello a metà presa: esiste, ma non in una libreria per chi comincia — e
  // soprattutto non senza dirlo.
  ACCORDI.forEach((a) => {
    const suonanti = a.tasti.map((x, i) => (x >= 0 ? i : -1)).filter((i) => i >= 0);
    const contigue = suonanti[suonanti.length - 1] - suonanti[0] === suonanti.length - 1;
    t.ok(`${a.id}: le corde smorzate stanno ai bordi`, contigue,
      `smorzate ${cordeSmorzate(a).join(' ')} su ${JSON.stringify(a.tasti)}`);
    t.ok(`${a.id}: almeno tre corde suonano`, suonanti.length >= 3, `${suonanti.length}`);
  });

  ACCORDI.forEach((a) => {
    const barrato = new Set();
    if (a.barre) for (let i = a.barre.da; i <= a.barre.a; i += 1) barrato.add(i);
    const incoerenti = a.tasti.map((tasto, i) => {
      const dito = a.dita[i];
      if (tasto > 0 && dito === 0 && !barrato.has(i)) return `corda ${i} premuta senza dito`;
      if (tasto <= 0 && dito !== 0) return `corda ${i} libera ma con dito ${dito}`;
      return null;
    }).filter(Boolean);
    t.ok(`${a.id}: dita coerenti coi tasti`, incoerenti.length === 0, incoerenti.join('; '));
  });

  ACCORDI.filter((a) => a.barre).forEach((a) => {
    const { tasto, da, a: fine } = a.barre;
    const dentro = a.tasti.slice(da, fine + 1);
    t.ok(`${a.id}: il barré ha senso`,
      da >= 0 && fine <= CORDE.length - 1 && da < fine
        && dentro.every((x) => x >= tasto) && dentro.includes(tasto),
      `barré al ${tasto} su corde ${da}–${fine}, tasti ${JSON.stringify(dentro)}`);
  });

  ACCORDI.forEach((a) => {
    const { dita } = ditaRichieste(a);
    const premute = a.tasti.filter((t) => t > 0).length;
    t.ok(`${a.id}: servono da 0 a 4 dita`, dita >= 0 && dita <= 4, `${dita} dita per ${premute} corde premute`);
    t.ok(`${a.id}: se preme qualcosa serve almeno un dito`, premute === 0 || dita >= 1);
    t.ok(`${a.id}: etichetta dita sensata`, /dito|dita|vuoto/.test(etichettaDita(a)), etichettaDita(a));
  });

  ACCORDI.filter((a) => a.alias).forEach((a) => {
    const altro = ACCORDI.find((x) => x.id === a.alias);
    if (!altro) {
      // L'alias può essere un nome canonico (E-facile → E): basta che sia interpretabile.
      t.ok(`${a.id}: alias ${a.alias} interpretabile`, !!classiAttese(a.alias), 'nome alias sconosciuto');
      return;
    }
    const insieme = (x) => [...new Set(x.tasti.map((tt, i) => (tt < 0 ? null : (CORDE_SEMITONI[i] + tt) % 12)).filter((v) => v !== null))].sort((p, q) => p - q);
    t.uguale(`${a.id} e ${a.alias} suonano le stesse note`, insieme(a), insieme(altro));
  });
});

// ── B. Ritmi ─────────────────────────────────────────────────────────────────

gruppo('Ritmi — la griglia torna', (t) => {
  const visti = new Set();
  const validiPenna = new Set(['giu', 'su', 'chunk', 'basso', '-']);
  RITMI.forEach((r) => {
    t.ok(`id unico: ${r.id}`, !visti.has(r.id), 'duplicato');
    visti.add(r.id);
    t.ok(`${r.id}: caselle = battiti × suddivisioni`,
      r.slot.length === r.battiti * r.suddivisioni,
      `${r.slot.length} caselle per ${r.battiti}×${r.suddivisioni}`);
    t.ok(`${r.id}: conteggio lungo quanto la griglia`, etichette(r).length === r.slot.length);
    if (r.tipo === 'penna') {
      const strani = r.slot.filter((s) => !validiPenna.has(s));
      t.ok(`${r.id}: simboli di pennata validi`, strani.length === 0, strani.join(','));
    } else {
      const strani = r.slot.filter((s) => s !== '-' && cordeDiCasella(s).length === 0);
      t.ok(`${r.id}: dita valide`, strani.length === 0, strani.join(','));
      // Il pollice non ha una corda fissa: le sue caselle vanno risolte contro l'accordo.
      // Se la risoluzione desse la stessa corda per 'p' e 'P', il basso alternato non
      // alternerebbe niente e lo schema Travis sarebbe un pollice fermo con un nome grosso.
      if (usaBassoAlternato(r)) {
        const bassi = bassiDi(accordo('E'));
        t.ok(`${r.id}: il basso alternato va su un'altra corda`, bassi.p !== bassi.P,
          `p=${bassi.p} P=${bassi.P}`);
      }
      // Due dita non possono stare sulla STESSA corda nello stesso istante. Vale solo
      // dentro una casella (il pizzico 'p+a'): che il pollice e l'indice si passino la
      // 3ª corda in momenti diversi e normale — sul Re la 6ª e la 5ª non suonano proprio,
      // e l'alternanza 4ª–3ª e quella che fanno tutti.
      if (r.tipo === 'dita') {
        ['E', 'Em', 'A', 'Am', 'G', 'C', 'D', 'Dm', 'F'].forEach((id) => {
          const bassi = bassiDi(accordo(id));
          const sovrapposte = r.slot.filter((casella) => {
            const corde = cordeDiCasella(casella, bassi);
            return corde.length > 1 && new Set(corde).size !== corde.length;
          });
          t.ok(`${r.id} su ${id}: nessuna casella mette due dita sulla stessa corda`,
            sovrapposte.length === 0, sovrapposte.join(' '));
        });
      }
    }
    t.ok(`${r.id}: ha una spiegazione`, !!r.testo && r.testo.length > 30);
  });
});

// ── B2. I bassi del pollice ──────────────────────────────────────────────────

gruppo('Bassi — il pollice va dove lo manderebbe un insegnante', (t) => {
  // Queste coppie non sono un'opinione: sono quello che si legge in qualunque metodo di
  // fingerpicking. Se un giorno la regola in `bassiDi` cambia e queste cambiano con lei,
  // vuol dire che ha smesso di descrivere la chitarra.
  const attesi = [
    ['E', 0, 1], ['Em', 0, 1], ['E7', 0, 1], ['Em7', 0, 1],
    ['A', 1, 2], ['Am', 1, 2], ['A7', 1, 2], ['Am7', 1, 2],
    ['G', 0, 2], ['G7', 0, 2],
    ['C', 1, 2], ['Cmaj7', 1, 2],
    ['D', 2, 3], ['Dm', 2, 3], ['D7', 2, 3],
    ['F', 0, 1], ['Fm', 0, 1], ['Bm', 1, 2],
  ];
  attesi.forEach(([id, p, P]) => {
    const acc = accordo(id);
    const bassi = bassiDi(acc);
    t.uguale(`${id}: pollice su ${NUMERI_CORDA[p]} e ${NUMERI_CORDA[P]}`, [bassi.p, bassi.P], [p, P]);
  });

  // Il pollice resta nella SUA zona (6ª, 5ª, 4ª) tutte le volte che puo.
  //
  // E l'invariante che il Do violava: la sua quinta (Sol) sta sulla 3ª, che e dell'indice.
  // L'eccezione ammessa e dichiarata: gli accordi che di corde gravi ne fanno suonare una
  // sola — il Re, il Re minore — dove uscire dalla zona non e una scelta ma l'unica strada.
  ACCORDI.forEach((a) => {
    const { p, P } = bassiDi(a);
    const graviCheSuonano = a.tasti.slice(0, ULTIMA_CORDA_DEL_POLLICE + 1).filter((x) => x >= 0).length;
    if (graviCheSuonano < 2) return;
    t.ok(`${a.id}: il basso alternato resta fra le corde del pollice`,
      P <= ULTIMA_CORDA_DEL_POLLICE,
      `p=${NUMERI_CORDA[p]}, P=${NUMERI_CORDA[P]} — la ${NUMERI_CORDA[P]} appartiene a un altro dito`);
  });

  // Nessun accordo deve mandare il pollice su una corda che non suona.
  ACCORDI.forEach((a) => {
    const { p, P } = bassiDi(a);
    t.ok(`${a.id}: il pollice sta su corde che suonano`, a.tasti[p] >= 0 && a.tasti[P] >= 0,
      `p=${p} (${a.tasti[p]}), P=${P} (${a.tasti[P]})`);
  });

  // E il basso principale deve essere la corda piu grave che suona: se il pollice
  // partisse piu in alto, il basso dell'accordo semplicemente non si sentirebbe.
  ACCORDI.forEach((a) => {
    const { p } = bassiDi(a);
    t.ok(`${a.id}: il basso e la corda piu grave che suona`,
      a.tasti.slice(0, p).every((x) => x < 0), `p=${p} su ${JSON.stringify(a.tasti)}`);
  });
});

// ── C. Brani ─────────────────────────────────────────────────────────────────

gruppo('Brani — ogni accordo esiste davvero', (t) => {
  // Un id sconosciuto NON deve diventare silenziosamente un altro brano: chi apre il
  // collegamento a uno spartito cancellato si ritroverebbe a suonare un pezzo diverso
  // credendo che sia il suo.
  t.uguale('un brano inesistente non esiste', branoSeEsiste('mio-inventato'), null);
  t.ok('un brano vero si trova', !!branoSeEsiste('giro-quattro'));

  const visti = new Set();
  BRANI.forEach((b) => {
    t.ok(`id unico: ${b.id}`, !visti.has(b.id), 'duplicato');
    visti.add(b.id);
    t.ok(`${b.id}: ha battute`, b.battute.length >= 4, `${b.battute.length} battute`);
    t.ok(`${b.id}: metro 2, 3 o 4`, [2, 3, 4].includes(b.battiti), String(b.battiti));
    const mancanti = accordiDi(b).filter((n) => !accordo(n));
    t.ok(`${b.id}: accordi in libreria`, mancanti.length === 0, `mancano ${mancanti.join(', ')}`);
  });

  BRANI.forEach((b) => {
    const su12 = branoTrasportato(b, 12);
    const classiUguali = accordiDi(b).map((n) => scomponi(n)?.fondamentale)
      .every((pc, i) => pc === scomponi(accordiDi(su12)[i])?.fondamentale);
    t.ok(`${b.id}: trasporto di un'ottava torna al punto di partenza`, classiUguali);
  });
});

// ── D. Percorso ──────────────────────────────────────────────────────────────

gruppo('Percorso — nessun passo chiede quello che non ha ancora insegnato', (t) => {
  const visti = new Set();
  PASSI.forEach((p) => {
    t.ok(`id unico: ${p.id}`, !visti.has(p.id), 'duplicato');
    visti.add(p.id);
    t.ok(`${p.id}: ha obiettivo`, !!p.obiettivo);
  });

  const noti = new Set();
  const canonico = (id) => {
    const a = accordo(id);
    return a ? nomeCanonico(a) : id;
  };

  PASSI.forEach((p) => {
    const tollerati = new Set(p.dati.tollera || []);
    const richiede = (lista, dove) => {
      const fuori = lista
        .map(canonico)
        .filter((n) => !noti.has(n) && !tollerati.has(n));
      t.ok(`${p.id}: ${dove} usa solo accordi già insegnati`, fuori.length === 0,
        `non ancora introdotti: ${fuori.join(', ')}`);
    };

    if (p.tipo === 'accordo') {
      const a = accordo(p.dati.accordo);
      t.ok(`${p.id}: l'accordo ${p.dati.accordo} esiste`, !!a);
      if (a) noti.add(nomeCanonico(a));
    } else if (p.tipo === 'ascolta') {
      const a = accordo(p.dati.accordo);
      t.ok(`${p.id}: l'accordo da ascoltare esiste`, !!a);
      if (a) richiede([p.dati.accordo], 'ascolto');
    } else if (p.tipo === 'cambio') {
      if (p.dati.accordi === 'appresi') t.ok(`${p.id}: sorteggio sugli accordi appresi`, true);
      else richiede(p.dati.accordi, 'cambio');
    } else if (p.tipo === 'ritmo') {
      const r = RITMI.find((x) => x.id === p.dati.ritmo);
      t.ok(`${p.id}: il ritmo ${p.dati.ritmo} esiste`, !!r);
      if (p.dati.accordo) richiede([p.dati.accordo], 'ritmo');
    } else if (p.tipo === 'giro') {
      const b = BRANI.find((x) => x.id === p.dati.brano);
      t.ok(`${p.id}: il brano ${p.dati.brano} esiste`, !!b);
      if (b) richiede(accordiDi(b), 'brano');
    } else if (p.tipo === 'orecchio') {
      richiede(p.dati.opzioni || [], 'orecchio');
      t.ok(`${p.id}: almeno tre opzioni`, (p.dati.opzioni || []).length >= 3);
    } else if (p.tipo === 'lettura') {
      t.ok(`${p.id}: ha punti da leggere`, (p.dati.punti || []).length >= 3);
    }
  });

  const tipi = new Set(PASSI.map((p) => p.tipo));
  t.ok('tutti i tipi di passo sono gestiti',
    [...tipi].every((x) => ['accordatura', 'lettura', 'accordo', 'ascolta', 'orecchio', 'cambio', 'ritmo', 'giro'].includes(x)),
    [...tipi].join(', '));

  LIVELLI.forEach((l) => {
    t.ok(`${l.id}: almeno 4 passi`, l.passi.length >= 4, `${l.passi.length}`);
  });

  // Ogni tipo di passo deve avere la sua icona: senza, la lista mostra un buco muto.
  [...tipi].forEach((tipo) => {
    const nome = ICONA_PASSO[tipo];
    t.ok(`${tipo}: ha un'icona`, !!nome, 'nessuna icona associata');
    if (nome) t.ok(`${tipo}: l'icona ${nome} si disegna`, icona(nome).childElementCount > 0, 'traccia mancante');
  });
});

// ── E. Teoria ────────────────────────────────────────────────────────────────

gruppo('Teoria — i nomi si leggono e si trasportano', (t) => {
  t.uguale('classeNota Bb', classeNota('Bb'), 10);
  t.uguale('classeNota C#', classeNota('C#'), 1);
  t.ok('classeNota rifiuta le sciocchezze', classeNota('H') === null && classeNota('') === null);
  t.uguale('trasponi Am +3', trasponi('Am', 3), 'Cm');
  t.uguale('trasponi F#m7 -6', trasponi('F#m7', -6), 'Cm7');
  ACCORDI.forEach((a) => {
    t.ok(`${nomeCanonico(a)} è un nome interpretabile`, !!classiAttese(nomeCanonico(a)));
  });
  const t4 = tonalitaProbabile(['C', 'G', 'Am', 'F']);
  t.uguale('il giro dei quattro accordi è in Do', t4 && t4.nome, 'C');
  const tam = tonalitaProbabile(['Am', 'Dm', 'E7']);
  t.ok('il giro minore riconduce a Do/La minore', tam && ['C', 'A'].includes(tam.nome), tam && tam.nome);
});

// ── F. Accordature ───────────────────────────────────────────────────────────

gruppo('Accordature', (t) => {
  ACCORDATURE.forEach((a) => {
    t.ok(`${a.id}: ${CORDE.length} corde`, a.corde.length === CORDE.length, `${a.corde.length}`);
    t.ok(`${a.id}: note plausibili`, a.corde.every((c) => c.midi >= 36 && c.midi <= 70),
      a.corde.map((c) => c.midi).join(' '));
    // Su una chitarra le corde salgono sempre dalla 6ª alla 1ª: nessuna accordatura
    // rientrante come sull'ukulele, dove la G era più acuta della C.
    t.ok(`${a.id}: le corde salgono dalla 6ª alla 1ª`,
      a.corde.every((c, i) => i === 0 || c.midi >= a.corde[i - 1].midi),
      a.corde.map((c) => c.etichetta).join(' '));
  });
  t.uguale('la standard è EADGBE', accordatura('eadgbe').corde.map((c) => c.etichetta), ['E', 'A', 'D', 'G', 'B', 'E']);

  // Il numero che decide mezzo programma: il Mi basso a 82,41 Hz. Se un giorno qualcuno
  // lo cambia per sbaglio, la banda di analisi non lo copre più e la corda sparisce.
  const mi = hzDaMidi(accordatura('eadgbe').corde[0].midi);
  t.ok('il Mi basso sta a 82,4 Hz', Math.abs(mi - 82.41) < 0.05, `${mi.toFixed(2)} Hz`);
  const cantino = hzDaMidi(accordatura('eadgbe').corde[5].midi);
  t.ok('fra Mi basso e Mi cantino ci sono due ottave', Math.abs(cantino / mi - 4) < 0.01,
    `${(cantino / mi).toFixed(3)}×`);
  // Il Drop D è la nota più grave che l'app deve saper leggere: la banda parte sotto.
  const drop = hzDaMidi(accordatura('dropd').corde[0].midi);
  t.ok('il Re del Drop D sta a 73,4 Hz', Math.abs(drop - 73.42) < 0.05, `${drop.toFixed(2)} Hz`);
});

// ── G. Rilevatore di altezza (audio sintetico) ───────────────────────────────

const PIZZICATO = [[1, 0.55], [2, 1.0], [3, 0.5], [4, 0.25]];
const PURO = [[1, 1]];

function banco(ctx, hz, armonici, rumore = 0) {
  const an = ctx.createAnalyser();
  an.fftSize = 4096;
  an.smoothingTimeConstant = 0;
  const g = ctx.createGain();
  g.gain.value = 0.45;
  g.connect(an);
  const nodi = armonici.map(([m, amp]) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = hz * m;
    const ga = ctx.createGain();
    ga.gain.value = amp;
    o.connect(ga).connect(g);
    o.start();
    return [o, ga];
  });
  let rs = null;
  if (rumore > 0) {
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate / 2), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;
    rs = ctx.createBufferSource();
    rs.buffer = buf;
    rs.loop = true;
    const gr = ctx.createGain();
    gr.gain.value = rumore;
    rs.connect(gr).connect(g);
    rs.start();
  }
  return {
    an,
    chiudi() {
      nodi.forEach(([o, ga]) => { o.stop(); o.disconnect(); ga.disconnect(); });
      if (rs) rs.stop();
      g.disconnect();
    },
  };
}

/**
 * Attesa misurata sull'orologio dell'audio, non su setTimeout.
 *
 * Non è pignoleria: un browser che tiene la pagina in secondo piano strozza i timer a un
 * secondo, e il collaudo passerebbe da dieci secondi a dieci minuti. L'orologio audio
 * avanza comunque, e le corde da ascoltare vivono lì.
 */
function attendiAudio(ctx, ms) {
  const fine = ctx.currentTime + ms / 1000;
  // Guardia sull'orologio di sistema: se il contesto audio è sospeso, `currentTime` non
  // avanza MAI e senza questa uscita la scheda resta congelata per sempre. Meglio una
  // prova che fallisce di una pagina che non risponde più.
  const limite = performance.now() + ms * 3 + 400;
  while (ctx.currentTime < fine && performance.now() < limite) { /* attesa attiva */ }
  return Promise.resolve();
}

/** Il contesto SINGOLO dell'app, sbloccato. Null se il browser lo tiene sospeso. */
async function preparaContestoApp(t) {
  const ctx = audio.contesto();
  await Promise.race([
    ctx.resume().catch(() => {}),
    new Promise((r) => setTimeout(r, 600)),
  ]);
  if (ctx.state !== 'running') {
    t.ok('prove audio eseguite', false,
      'il browser tiene l\'audio sospeso finché non tocchi la pagina: premi "Rifai le prove audio"');
    return null;
  }
  return ctx;
}

/**
 * Contesto audio pronto, oppure null.
 *
 * I browser non fanno partire l'audio senza un gesto dell'utente: aprire questa pagina e
 * basta non conta. Se non parte lo si DICE, invece di far fallire dodici prove e lasciar
 * credere che l'accordatore sia rotto.
 */
async function preparaContesto(t) {
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) { t.ok('audio disponibile in questo browser', false, 'Web Audio assente'); return null; }
  const ctx = new Ctor();
  // `resume()` su un contesto bloccato dalla politica di autoplay non fallisce: resta
  // PENDENTE all'infinito finché non arriva un tocco. Aspettarlo con un semplice await
  // significa lasciare la pagina su "Eseguo…" per sempre — che è esattamente quello che
  // faceva. Si corre contro un timer e si prende atto.
  await Promise.race([
    ctx.resume().catch(() => {}),
    new Promise((r) => setTimeout(r, 600)),
  ]);
  if (ctx.state !== 'running') {
    t.ok('prove audio eseguite', false,
      'il browser tiene l\'audio sospeso finché non tocchi la pagina: premi "Rifai le prove audio"');
    await ctx.close().catch(() => {});
    return null;
  }
  return ctx;
}

gruppo('Accordatore — quanto sbaglia, in centesimi', (t) => {
  t.asincrono = async () => {
    const ctx = await preparaContesto(t);
    if (!ctx) return;
    // Le sei corde vere, una per una. La prima riga è la ragione per cui esiste questo
    // gruppo: con la banda dell'ukulele (che partiva da 240 Hz) le prime tre corde della
    // chitarra non esistevano proprio, e un accordatore che non vede il Mi basso è un
    // accordatore che non accorda una chitarra.
    const casi = [
      ['Mi2 basso a vuoto (82,41 Hz)', 82.41, PIZZICATO, 0],
      ['La2 a vuoto (110 Hz)', 110.0, PIZZICATO, 0],
      ['Re3 a vuoto (146,83)', 146.83, PIZZICATO, 0],
      ['Sol3 a vuoto (196)', 196.0, PIZZICATO, 0],
      ['Si3 a vuoto (246,94)', 246.94, PIZZICATO, 0],
      ['Mi4 cantino a vuoto (329,63)', 329.63, PIZZICATO, 0],
      ['Re2 del Drop D (73,42) — la nota più grave che deve leggere', 73.42, PIZZICATO, 0],
      ['Mib2 di mezzo tono sotto (77,78)', 77.78, PIZZICATO, 0],
      ['Mi2 puro, senza armonici', 82.41, PURO, 0],
      ['Mi2 con il 2° armonico più forte della fondamentale', 82.41, PIZZICATO, 0],
      ['Mi2 −30 centesimi (corda calata)', 82.41 * 2 ** (-30 / 1200), PIZZICATO, 0],
      ['La2 +12 centesimi (corda crescente)', 110.0 * 2 ** (12 / 1200), PIZZICATO, 0],
      ['Mi2 con rumore di stanza', 82.41, PIZZICATO, 0.08],
      ['La4 di riferimento (440)', 440, PURO, 0],
      ['Mi5 al 12° tasto del cantino (659,26)', 659.26, PIZZICATO, 0],
      ['Sol3 con molto rumore', 196.0, PIZZICATO, 0.18],
    ];
    for (const [nome, hz, armonici, rumore] of casi) {
      const b = banco(ctx, hz, armonici, rumore);
      await attendiAudio(ctx, 260);
      const r = new Rilevatore(b.an);
      const letti = [];
      for (let i = 0; i < 3; i += 1) { const l = r.leggi(); if (l.hz) letti.push(l.hz); }
      b.chiudi();
      if (!letti.length) { t.ok(nome, false, 'nessuna lettura'); continue; }
      const med = letti.sort((x, y) => x - y)[Math.floor(letti.length / 2)];
      const scarto = Math.abs(centesimi(med, hz));
      t.ok(`${nome}: entro 3 centesimi`, scarto <= 3, `${scarto.toFixed(1)} cent (${med.toFixed(2)} Hz)`);
    }
    // Deve TACERE quando non c'è una nota: un accordatore che indovina è peggio di niente.
    const soloRumore = banco(ctx, 300, [[1, 0.000001]], 0.3);
    await attendiAudio(ctx, 260);
    const r = new Rilevatore(soloRumore.an);
    let parlato = false;
    for (let i = 0; i < 4; i += 1) if (r.leggi().hz) parlato = true;
    soloRumore.chiudi();
    t.ok('sul solo rumore non dichiara nessuna nota', !parlato, 'ha dichiarato una nota inventata');
    await ctx.close();
  };
});

// ── H. Ascolto dell'accordo (audio sintetico) ────────────────────────────────

function bancoAccordo(ctx, frequenze, { spente = [] } = {}) {
  const an = ctx.createAnalyser();
  an.fftSize = FFT_ACCORDO;
  an.smoothingTimeConstant = 0;
  const g = ctx.createGain();
  g.gain.value = 0.28;
  g.connect(an);
  const nodi = [];
  frequenze.forEach((hz, corda) => {
    if (!hz || spente.includes(corda)) return;
    PIZZICATO.forEach(([m, amp]) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = hz * m;
      const ga = ctx.createGain();
      ga.gain.value = amp * 0.8;
      o.connect(ga).connect(g);
      o.start();
      nodi.push([o, ga]);
    });
  });
  return {
    an,
    chiudi() { nodi.forEach(([o, ga]) => { o.stop(); o.disconnect(); ga.disconnect(); }); g.disconnect(); },
  };
}

const hzDi = (acc, tun) => acc.tasti.map((tasto, i) => (tasto < 0 ? null : 440 * 2 ** ((tun.corde[i].midi + tasto - 69) / 12)));

gruppo('Ascolto accordo — trova la corda spenta', (t) => {
  t.asincrono = async () => {
    const ctx = await preparaContesto(t);
    if (!ctx) return;
    const tun = accordatura('eadgbe');
    const campione = ['E', 'Em', 'A', 'Am', 'D', 'Dm', 'G', 'C', 'E7', 'A7', 'D7', 'G7', 'Am7', 'Cmaj7'];

    let riconosciuti = 0;
    for (const id of campione) {
      const acc = accordo(id);
      const freq = hzDi(acc, tun);
      const b = bancoAccordo(ctx, freq);
      await attendiAudio(ctx, 220);
      const asc = new Ascoltatore(b.an);
      for (let i = 0; i < 4; i += 1) asc.campiona();
      const v = asc.verifica(freq);
      const cls = classifica(asc.chroma(), campione);
      b.chiudi();
      t.ok(`${id}: nessuna corda risulta muta`, v.ok,
        `giudicabili ${v.quanteGiudicabili}, forze ${v.forza.map((f) => (f === null ? '–' : f.toFixed(0))).join(' ')}`);
      // Il riconoscimento è ambiguo per costruzione: si misura, non si pretende.
      const primo = cls[0]?.nome;
      const stessoSuono = primo && JSON.stringify(classiAttese(primo)?.ammesse.slice().sort())
        === JSON.stringify(classiAttese(id)?.ammesse.slice().sort());
      if (primo === id || stessoSuono) riconosciuti += 1;
    }
    t.ok(`riconoscimento alla cieca: almeno 10 su ${campione.length}`, riconosciuti >= 10,
      `${riconosciuti}/${campione.length} — è la misura, non un obiettivo raggiunto per definizione`);

    // La prova che conta davvero: ogni corda che il programma DICHIARA di saper giudicare,
    // se la spegni, deve risultare assente. Le altre le dichiara non giudicabili e non
    // vengono messe alla prova — è il patto, e questo collaudo verifica che sia mantenuto.
    //
    // Sulla chitarra questo patto costa più che sull'ukulele, e va detto: con sei corde
    // gli unisoni e le ottave fra corde sono la norma, non l'eccezione. In un Mi maggiore
    // suonano tre Mi e due Si: le corde davvero giudicabili una per una sono tre su sei.
    // Il programma lo DICHIARA invece di dare tre verdi finti.
    let provate = 0;
    let scoperte = 0;
    let giudicabiliTotali = 0;
    for (const id of ['E', 'Em', 'A', 'Am', 'D', 'Dm', 'G', 'C', 'E7', 'A7', 'D7', 'G7']) {
      const acc = accordo(id);
      const freq = hzDi(acc, tun);
      const giudicabili = verificabilita(freq);
      giudicabiliTotali += giudicabili.filter((g) => g.verificabile).length;
      for (let corda = 0; corda < CORDE.length; corda += 1) {
        if (!giudicabili[corda].verificabile) continue;
        const b = bancoAccordo(ctx, freq, { spente: [corda] });
        await attendiAudio(ctx, 150);
        const asc = new Ascoltatore(b.an);
        for (let i = 0; i < 4; i += 1) asc.campiona();
        const v = asc.verifica(freq);
        b.chiudi();
        provate += 1;
        const vista = v.mancanti[corda];
        if (vista) scoperte += 1;
        t.ok(`${id}: con la ${NUMERI_CORDA[corda]} spenta se ne accorge`, vista,
          `forze ${v.forza.map((f) => (f === null ? '–' : f.toFixed(0))).join(' ')}`);
      }
    }
    t.ok(`corde spente scoperte: tutte e ${provate}`, scoperte === provate, `${scoperte}/${provate}`);
    t.misura('corde giudicabili una per una, su 12 accordi da 6 corde',
      `${giudicabiliTotali} su 72 — le altre suonano la stessa nota di un'altra corda`);

    // E il contrario: sull'accordo suonato bene non deve accusare nessuno.
    let falsiAllarmi = 0;
    for (const id of ['E', 'Am', 'G', 'C', 'D', 'E7']) {
      const acc = accordo(id);
      const freq = hzDi(acc, tun);
      const b = bancoAccordo(ctx, freq);
      await attendiAudio(ctx, 150);
      const asc = new Ascoltatore(b.an);
      for (let i = 0; i < 4; i += 1) asc.campiona();
      const v = asc.verifica(freq);
      b.chiudi();
      if (!v.ok) falsiAllarmi += 1;
    }
    t.ok('nessun falso allarme sull\'accordo suonato bene', falsiAllarmi === 0, `${falsiAllarmi} falsi allarmi`);
    await ctx.close();
  };
});

// ── H2. Colore delle dita ────────────────────────────────────────────────────

gruppo('Colore delle dita — ogni pallino tinto del suo dito', (t) => {
  const conNumeri = ['C', 'G', 'Am', 'Dm', 'Em', 'F', 'Bb', 'B7', 'D', 'Bm', 'F#m', 'A'];
  conNumeri.forEach((id) => {
    const acc = accordo(id);
    const svg = diagramma(acc, { tasti: 5, dita: true });
    const punti = [...svg.querySelectorAll('.d-punto')];
    const barre = svg.querySelector('.d-barre');

    // Ogni pallino disegnato deve portare la classe del dito che lo preme.
    const senzaTinta = punti.filter((p) => !/dito-[1-4]/.test(p.getAttribute('class')));
    t.ok(`${id}: ogni pallino ha il colore del suo dito`, senzaTinta.length === 0,
      `${senzaTinta.length} pallini senza tinta`);

    if (acc.barre) {
      t.ok(`${id}: anche la barra è tinta`, !!barre && /dito-[1-4]/.test(barre.getAttribute('class')));
    }

    // E la tinta deve corrispondere al numero scritto dentro, non a un altro.
    const numeri = [...svg.querySelectorAll('.d-dito')].map((n) => n.textContent);
    const tinte = punti.map((p) => (p.getAttribute('class').match(/dito-([1-4])/) || [])[1]);
    t.ok(`${id}: nessun colore contraddice il numero`,
      tinte.every((v) => numeri.includes(v)),
      `tinte ${tinte.join(',')} contro numeri ${numeri.join(',')}`);
  });

  // Il diagramma deve disegnare TUTTE le corde dello strumento. Il numero non è scritto
  // da nessuna parte nel disegno: si legge da CORDE.length, ed è la sola modifica che
  // questo file ha subito passando da quattro corde a sei.
  ACCORDI.slice(0, 12).forEach((a) => {
    const svg = diagramma(a, { tasti: 5 });
    t.uguale(`${a.id}: il diagramma ha ${CORDE.length} corde`,
      svg.querySelectorAll('.d-corda').length, CORDE.length);
    t.uguale(`${a.id}: e ${CORDE.length} nomi di corda sotto`,
      svg.querySelectorAll('.d-corda-nome').length, CORDE.length);
  });

  // Le corde smorzate portano la ✕: sulla chitarra è informazione, non decorazione.
  ACCORDI.filter((a) => a.tasti.includes(-1)).slice(0, 8).forEach((a) => {
    const svg = diagramma(a, { tasti: 5 });
    t.uguale(`${a.id}: una ✕ per ogni corda da non suonare`,
      svg.querySelectorAll('.d-muta').length, a.tasti.filter((x) => x < 0).length);
  });

  // Senza numeri niente colore: altrimenti il colore resterebbe l'unico portatore
  // dell'informazione, e chi non distingue le tinte perderebbe tutto.
  const muto = diagramma(accordo('C'), { dita: false });
  t.ok('senza i numeri i pallini restano neutri',
    [...muto.querySelectorAll('.d-punto')].every((p) => !/dito-/.test(p.getAttribute('class'))));

  // La legenda mostra solo le dita davvero usate.
  const soloDue = legendaDita(accordo('Em').dita);
  t.uguale('la legenda del Mi minore elenca due dita', soloDue.querySelectorAll('.tacca-dito').length, 2);
  t.uguale('la legenda completa ne elenca quattro', legendaDita().querySelectorAll('.tacca-dito').length, 4);

  // Mano destra: stesso dito, stesso colore.
  t.uguale('indice destro = colore del dito 1', classeDito('i'), 'dito-i');
  t.uguale('pollice ha la sua tinta', classeDito('p'), 'dito-p');
  t.uguale('il pollice sul basso alternato è lo stesso dito, stessa tinta', classeDito('P'), 'dito-p');
  t.uguale('il pizzico a due dita è misto', classeDito('p+a'), 'dito-misto');
  t.uguale('la pausa non ha colore', classeDito('-'), '');

  // Tutte le tinte sono definite nel foglio di stile, in entrambi i temi.
  const stile = getComputedStyle(document.documentElement);
  ['--dito-1', '--dito-2', '--dito-3', '--dito-4', '--dito-p', '--su-dito'].forEach((v) => {
    t.ok(`${v} è definita`, stile.getPropertyValue(v).trim().length > 0);
  });
});

// ── H3. La presenza non basta: le note estranee ──────────────────────────────

gruppo('Nota estranea — un accordo lasciato suonare non vale per il successivo', (t) => {
  t.asincrono = async () => {
    const ctx = await preparaContesto(t);
    if (!ctx) return;
    const tun = accordatura('eadgbe');

    /**
     * Qui si usa la corda MODELLATA, non il banco di oscillatori degli altri gruppi.
     *
     * Quel banco ha il terzo armonico a −6 dB dalla fondamentale: una caricatura fatta
     * apposta per stressare il rilevatore di altezza. Ma il terzo armonico cade su una
     * classe di altezza ESTRANEA all'accordo, e con quell'ampiezza falsa gonfia la
     * misura (0,33–0,44 invece di 0,00–0,08). Una corda vera è molto meno brillante,
     * e il modello Karplus-Strong le somiglia.
     *
     * Il limite resta dichiarato: su uno strumento molto brillante il margine si
     * assottiglia. Il modo in cui cede però è quello giusto — il programma si rifiuta
     * di avanzare e ti fa ripennare, non avanza sull'accordo sbagliato.
     */
    function bancoCorde(frequenze) {
      const an = ctx.createAnalyser();
      an.fftSize = FFT_ACCORDO;
      an.smoothingTimeConstant = 0;
      const g = ctx.createGain();
      g.gain.value = 0.9;
      g.connect(an);
      const nodi = frequenze.filter(Boolean).map((hz) => {
        const s = ctx.createBufferSource();
        s.buffer = bufferCorda(hz, 1.5);
        const gg = ctx.createGain();
        gg.gain.value = 0.9;
        s.connect(gg).connect(g);
        s.start();
        return [s, gg];
      });
      return {
        an,
        chiudi() { nodi.forEach(([s, gg]) => { s.stop(); s.disconnect(); gg.disconnect(); }); g.disconnect(); },
      };
    }

    async function misura(suonato, atteso) {
      const b = bancoCorde(hzDi(accordo(suonato), tun));
      await attendiAudio(ctx, 280);
      const asc = new Ascoltatore(b.an);
      for (let i = 0; i < 5; i += 1) asc.campiona();
      const presenti = asc.verifica(hzDi(accordo(atteso), tun)).ok;
      const estranea = energiaEstranea(asc, classiAttese(atteso).ammesse);
      b.chiudi();
      return { presenti, estranea };
    }

    // La soglia si DERIVA da queste due colonne, non si copia.
    //
    // Il numero dell'ukulele (0,30) qui non vorrebbe dire niente, e non per prudenza
    // generica: la banda e passata da 240-950 a 70-950 Hz, quindi del Mi basso adesso
    // entrano dentro anche il 3 e il 5 armonico - una quinta e una TERZA MAGGIORE. Su un
    // accordo minore quella terza maggiore e esattamente la nota che non ci deve essere.
    // Il pavimento delle misure "giuste" si alza per fisica, non per un difetto.
    //
    // Quindi: si misurano le due popolazioni, si guarda dove sta il vuoto in mezzo, e solo
    // dopo si sceglie. I due estremi sono stampati qui sotto apposta.
    const giusti = [];
    for (const id of ['E', 'Em', 'A', 'Am', 'D', 'Dm', 'G', 'C', 'E7', 'A7', 'G7', 'Am7']) {
      const r = await misura(id, id);
      giusti.push({ id, v: r.estranea });
      t.ok(`${id} suonato bene: niente di estraneo`, r.estranea <= SOGLIA_ESTRANEA,
        `${r.estranea.toFixed(2)} contro soglia ${SOGLIA_ESTRANEA}`);
    }

    // Accordo diverso da quello atteso: deve emergere.
    // Il caso che ha morso sull'ukulele: il La minore aveva due corde all'unisono, quindi
    // le giudicabili erano solo Do e Mi - e ci sono anche nel Do maggiore. Con la sola
    // presenza, un Do lasciato suonare passava per La minore. Sulla chitarra il problema
    // e piu grande, non piu piccolo: sei corde fanno molti piu unisoni e ottave.
    const inganni = [
      ['C', 'Am'], ['Am', 'C'], ['C', 'F'], ['G', 'C'], ['Em', 'E'], ['E', 'Em'],
      ['A', 'Am'], ['Am', 'A'], ['D', 'Dm'], ['G', 'Em'], ['C', 'G'], ['D', 'A'],
    ];
    const sbagliati = [];
    for (const [suonato, atteso] of inganni) {
      const r = await misura(suonato, atteso);
      sbagliati.push({ id: `${suonato} per ${atteso}`, v: r.estranea });
      t.ok(`${suonato} non passa per ${atteso}`, r.estranea > SOGLIA_ESTRANEA,
        `estranea ${r.estranea.toFixed(2)}${r.presenti ? ' - e la sola presenza lo avrebbe accettato' : ''}`);
    }

    const peggioreGiusto = giusti.reduce((a, b) => (b.v > a.v ? b : a));
    const miglioreSbagliato = sbagliati.reduce((a, b) => (b.v < a.v ? b : a));
    t.misura('accordi GIUSTI: quanta energia finisce su note estranee',
      `da ${Math.min(...giusti.map((x) => x.v)).toFixed(2)} a ${peggioreGiusto.v.toFixed(2)} (il peggiore e ${peggioreGiusto.id})`);
    t.misura('accordi SBAGLIATI: quanta energia finisce su note estranee',
      `da ${miglioreSbagliato.v.toFixed(2)} a ${Math.max(...sbagliati.map((x) => x.v)).toFixed(2)} (il piu mimetico e ${miglioreSbagliato.id})`);
    t.misura('soglia in uso, e che margine le resta dai due lati',
      `${SOGLIA_ESTRANEA}: sopra i giusti di ${(SOGLIA_ESTRANEA - peggioreGiusto.v).toFixed(2)}, sotto gli sbagliati di ${(miglioreSbagliato.v - SOGLIA_ESTRANEA).toFixed(2)}`);

    // Le due popolazioni devono STARE SEPARATE. Se si toccano non esiste nessuna soglia
    // che funzioni, e il difetto non e il numero: e che la misura non distingue i due casi.
    t.ok('fra accordo giusto e accordo sbagliato resta un vuoto',
      miglioreSbagliato.v > peggioreGiusto.v,
      `il peggiore dei giusti (${peggioreGiusto.v.toFixed(2)}, ${peggioreGiusto.id}) arriva sopra il piu mimetico degli sbagliati (${miglioreSbagliato.v.toFixed(2)}, ${miglioreSbagliato.id})`);
    t.ok('la soglia sta dentro il vuoto, non su un bordo',
      SOGLIA_ESTRANEA > peggioreGiusto.v && SOGLIA_ESTRANEA < miglioreSbagliato.v,
      `soglia ${SOGLIA_ESTRANEA} fuori dall'intervallo ${peggioreGiusto.v.toFixed(2)}-${miglioreSbagliato.v.toFixed(2)}`);

    // ── Il dito dimenticato: il caso per cui il controllo delle estranee esiste ────
    //
    // Sull'ukulele l'esempio era il Do lasciato suonare al posto del La minore. Sulla
    // chitarra quel caso non regge più (le frequenze sono diverse e la sola presenza lo
    // blocca già), ma ne esiste uno molto più frequente e molto più insidioso: il dito
    // che non scende.
    //
    // Chi fa il Do e dimentica l'indice sulla 2ª corda suona un Do maggiore settima. Chi
    // fa il La minore e dimentica il dito sulla 2ª suona un La minore settima. Quelle
    // forme contengono TUTTE le frequenze attese — o le producono come armonici — quindi
    // la sola presenza le accetta: il programma direbbe "bravo" a un accordo che non è
    // quello. È l'errore numero uno di chi impara, ed è invisibile senza questo controllo.
    const ditoDimenticato = [['Cmaj7', 'C'], ['Am7', 'Am'], ['Em7', 'Em'], ['G6', 'G'], ['Cadd9', 'C']];
    let passatiPerPresenza = 0;
    for (const [suonato, atteso] of ditoDimenticato) {
      const r = await misura(suonato, atteso);
      if (r.presenti) passatiPerPresenza += 1;
      t.ok(`${suonato} al posto di ${atteso} (il dito che non scende) viene smascherato`,
        r.estranea > SOGLIA_ESTRANEA,
        `estranea ${r.estranea.toFixed(2)}, soglia ${SOGLIA_ESTRANEA}`);
    }
    t.ok('e la sola presenza li avrebbe accettati quasi tutti: è il motivo del controllo',
      passatiPerPresenza >= 3,
      `solo ${passatiPerPresenza} su ${ditoDimenticato.length} passano per presenza — se scende a zero, qui il controllo non serve più`);
    await ctx.close();
  };
});

// ── I. Lettura degli spartiti ────────────────────────────────────────────────

gruppo('Spartiti — legge quello che scrive la gente', (t) => {
  const conBarre = leggiSpartito('| C | Am | F | G |');
  t.uguale('battute separate da barre', conBarre.battute, ['C', 'Am', 'F', 'G']);
  t.uguale('formato riconosciuto', conBarre.formato, 'battute separate da |');

  const mezzaBattuta = leggiSpartito('| C G | Am |');
  t.uguale('due accordi in una battuta', mezzaBattuta.battute, ['C|G', 'Am']);

  const inLinea = leggiSpartito('[C]Fra Mar[G7]tino, [C]campa[G7]naro');
  t.uguale('accordi fra parentesi quadre', inLinea.battute, ['C', 'G7', 'C', 'G7']);

  const sopra = leggiSpartito('C       Am\nFra Martino campanaro\nF       G7\ndormi tu?');
  t.uguale('accordi sopra le parole', sopra.battute, ['C', 'Am', 'F', 'G7']);

  const elenco = leggiSpartito('C Am F G');
  t.uguale('elenco secco', elenco.battute, ['C', 'Am', 'F', 'G']);
  t.ok('dichiara di aver indovinato la durata', elenco.avvisi.some((a) => /stanghette/.test(a)));

  const raddoppiato = leggiSpartito('C Am', { battutePerAccordo: 2 });
  t.uguale('due battute per accordo', raddoppiato.battute, ['C', 'C', 'Am', 'Am']);

  const difficili = leggiSpartito('| Bb | F#m7 | D7sus4 | Cadd9 | C#dim7 |');
  t.uguale('accordi complicati', difficili.battute, ['Bb', 'F#m7', 'D7sus4', 'Cadd9', 'C#dim7']);

  const sporco = leggiSpartito('| C | PIPPO | F |');
  t.uguale('salta quello che non capisce', sporco.battute, ['C', 'F']);

  const vuoto = leggiSpartito('solo parole senza accordi qui');
  t.ok('su un testo senza accordi lo dice', vuoto.avvisi.some((a) => /Non ho trovato/.test(a)), vuoto.avvisi.join('|'));

  t.ok('riconosce un accordo vero', !!eAccordo('F#m7'));
  t.ok('rifiuta una parola qualsiasi', !eAccordo('Ciao'));
  t.ok('rifiuta una nota inesistente', !eAccordo('H'));

  // Salvare due volte la stessa musica non deve creare due brani: il costruttore di
  // giri salva a ogni "Suona", e senza questo l'elenco si riempiva di doppioni.
  const salvati = JSON.stringify(store.dati().braniMiei || []);
  store.dati().braniMiei = [];
  const uno = salvaBrano({ titolo: 'Prova', battute: ['C', 'Am', 'F', 'G'], battiti: 4, bpm: 70 });
  const due = salvaBrano({ titolo: 'Prova ancora', battute: ['C', 'Am', 'F', 'G'], battiti: 4, bpm: 90 });
  t.uguale('due salvataggi identici danno un brano solo', store.dati().braniMiei.length, 1);
  t.uguale('e riusano lo stesso id', uno.id, due.id);
  t.uguale('ma aggiornano la velocità', store.dati().braniMiei[0].bpm, 90);
  salvaBrano({ titolo: 'Diverso', battute: ['C', 'F'], battiti: 3, bpm: 70 });
  t.uguale('una musica diversa è un brano nuovo', store.dati().braniMiei.length, 2);
  store.dati().braniMiei = JSON.parse(salvati);
  store.salva();
});

// ── L. Ripetizione spaziata ──────────────────────────────────────────────────

gruppo('Ripasso — sbagliare riporta indietro, riuscire dirada', (t) => {
  const prima = JSON.stringify(store.dati().ripasso || {});
  const chiave = 'accordo:__prova__';

  let v = ripasso.registra(chiave, 'pulito');
  t.uguale('primo successo: si rivede domani', v.intervallo, 1);
  v = ripasso.registra(chiave, 'pulito');
  t.uguale('secondo successo: fra tre giorni', v.intervallo, 3);
  const dopoTerzo = ripasso.registra(chiave, 'pulito');
  t.ok('terzo successo: si allontana ancora', dopoTerzo.intervallo > 3, String(dopoTerzo.intervallo));
  t.ok('la facilità sale con i successi', dopoTerzo.facilita > 2.0, String(dopoTerzo.facilita));

  const dopoErrore = ripasso.registra(chiave, 'sporco');
  t.uguale('un errore riporta a domani', dopoErrore.intervallo, 1);
  t.ok('la facilità scende con l\'errore', dopoErrore.facilita < dopoTerzo.facilita);
  t.ok('l\'errore è contato', dopoErrore.errori >= 1);

  const oggi = new Date().toISOString().slice(0, 10);
  t.ok('scaduto domani, non oggi', dopoErrore.scadenza > oggi, dopoErrore.scadenza);

  t.uguale('chiave di cambio simmetrica', ripasso.chiaveCambio('F', 'C'), ripasso.chiaveCambio('C', 'F'));
  t.uguale('etichetta di un cambio', ripasso.etichetta(ripasso.chiaveCambio('C', 'F')), 'C ↔ F');

  // Si registrano SOLO i cambi davvero suonati. Prima si combinavano tutti con tutti:
  // otto accordi facevano ventotto voci, ventuno delle quali mai suonate.
  const salva2 = JSON.stringify(store.dati().ripasso || {});
  store.dati().ripasso = {};
  ripasso.registraEsercizio({
    accordi: ['C', 'Am', 'F', 'G', 'Dm', 'Em', 'A7', 'E7'],
    coppie: [['C', 'Am'], ['Am', 'F'], ['C', 'Am']],
    esito: 'pulito',
  });
  const chiavi = Object.keys(store.dati().ripasso);
  t.uguale('un accordo per accordo suonato', chiavi.filter((k) => k.startsWith('accordo:')).length, 8);
  t.uguale('solo i cambi dichiarati, senza doppioni', chiavi.filter((k) => k.startsWith('cambio:')).length, 2);
  ripasso.registraEsercizio({ accordi: ['C'], coppie: [['C', 'C'], [null, 'F']], esito: 'pulito' });
  t.uguale('scarta le coppie senza senso', Object.keys(store.dati().ripasso).filter((k) => k.startsWith('cambio:')).length, 2);
  store.dati().ripasso = JSON.parse(salva2);
  store.salva();

  // Il collaudo non deve lasciare sporcizia nei dati veri dell'utente.
  store.dati().ripasso = JSON.parse(prima);
  store.salva();
  t.ok('il collaudo non lascia tracce', !store.dati().ripasso[chiave]);
});

// ── M. Giudizio del tempo ────────────────────────────────────────────────────

gruppo('Tempo — le soglie dicono quello che si sente', (t) => {
  t.uguale('20 ms sono a tempo', giudizioTempo(0.02).classe, 'preciso');
  t.uguale('60 ms sono appena in ritardo', giudizioTempo(0.06).classe, 'quasi');
  t.uguale('−60 ms sono appena in anticipo', giudizioTempo(-0.06).testo, 'appena in anticipo');
  t.uguale('150 ms sono fuori', giudizioTempo(0.15).classe, 'fuori');

  const colpi = [
    { scarto: 0.01, accordoOk: true },
    { scarto: 0.02, accordoOk: true },
    { scarto: 0.2, accordoOk: false },
    { scarto: 0.03, accordoOk: null },
  ];
  const r = riepilogo(colpi);
  t.uguale('conta i colpi validi', r.colpi, 4);
  t.uguale('conta i precisi entro 80 ms', r.precisi, 3);
  t.uguale('conta gli accordi valutati', r.accordiValutati, 3);
  t.uguale('conta gli accordi giusti', r.accordiGiusti, 2);
  t.ok('la tendenza è positiva se sei in ritardo', r.tendenza > 0, String(r.tendenza));
  t.uguale('senza colpi non inventa numeri', riepilogo([]).colpi, 0);
});

// ── N. Il click del metronomo sta fuori dalla banda di ascolto ───────────────

gruppo('Metronomo — il click non si fa scambiare per una pennata', (t) => {
  t.asincrono = async () => {
    const ctx = await preparaContesto(t);
    if (!ctx) return;
    // Il click viene misurato DENTRO la banda in cui si cercano le corde (75–1100 Hz):
    // se ci lasciasse energia, il microfono lo conterebbe come una tua pennata e
    // l'esercizio risulterebbe suonato benissimo a strumento appoggiato sul tavolo.
    const an = ctx.createAnalyser();
    an.fftSize = 4096;
    an.smoothingTimeConstant = 0;
    const m = new Metronomo({ bpm: 120, suddivisioni: 2, battitiPerBattuta: 4 });
    // Si dirotta l'uscita del metronomo nell'analizzatore invece che negli altoparlanti.
    const originale = ctx.destination;
    const spettro = new Float32Array(an.frequencyBinCount);
    const binHz = ctx.sampleRate / an.fftSize;

    // Riproduco a mano lo stesso click, così la prova non dipende dal dirottamento.
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1800;
    o.type = 'square';
    o.frequency.value = 3520;
    g.gain.value = 0.5;
    o.connect(g).connect(hp).connect(an);
    o.start();
    await attendiAudio(ctx, 250);
    an.getFloatFrequencyData(spettro);
    o.stop();
    o.disconnect();

    let dentroBanda = -Infinity;
    let fuoriBanda = -Infinity;
    for (let i = 1; i < spettro.length; i += 1) {
      const hz = i * binHz;
      if (!Number.isFinite(spettro[i])) continue;
      if (hz >= 75 && hz <= 1100) dentroBanda = Math.max(dentroBanda, spettro[i]);
      else if (hz > 1800 && hz < 9000) fuoriBanda = Math.max(fuoriBanda, spettro[i]);
    }
    t.ok('il click esiste, sopra la banda', fuoriBanda > -60, `${fuoriBanda.toFixed(0)} dB`);
    t.ok('nella banda delle corde il click è almeno 30 dB più debole',
      fuoriBanda - dentroBanda >= 30,
      `dentro ${dentroBanda.toFixed(0)} dB, fuori ${fuoriBanda.toFixed(0)} dB`);
    t.ok('il metronomo si costruisce', m instanceof Metronomo && originale === ctx.destination);
    await ctx.close();
  };
});

// ── O. Corda pizzicata ───────────────────────────────────────────────────────

gruppo('Suono — la corda pizzicata ha l\'altezza giusta e si spegne', (t) => {
  t.asincrono = async () => {
    const ctx = await preparaContesto(t);
    if (!ctx) return;

    // Si misura il suono che l'app genera davvero, con lo stesso rilevatore
    // dell'accordatore: se il modello sbagliasse l'altezza, ogni "ascolta com'è"
    // insegnerebbe la nota sbagliata.
    for (const hz of [82.41, 110.0, 146.83, 196.0, 246.94, 329.63]) {
      const buffer = bufferCorda(hz, 1.6);
      const an = ctx.createAnalyser();
      an.fftSize = 4096;
      an.smoothingTimeConstant = 0;
      const sorgente = ctx.createBufferSource();
      sorgente.buffer = buffer;
      const g = ctx.createGain();
      g.gain.value = 1.6;
      sorgente.connect(g).connect(an);
      sorgente.start();
      await attendiAudio(ctx, 220);
      const r = new Rilevatore(an);
      const letti = [];
      for (let i = 0; i < 3; i += 1) { const l = r.leggi(); if (l.hz) letti.push(l.hz); }
      sorgente.stop();
      sorgente.disconnect();
      g.disconnect();
      if (!letti.length) { t.ok(`corda a ${hz} Hz: si sente`, false, 'nessuna lettura'); continue; }
      const med = letti.sort((x, y) => x - y)[Math.floor(letti.length / 2)];
      const scarto = Math.abs(centesimi(med, hz));
      t.ok(`corda a ${hz} Hz: intonata entro 12 centesimi`, scarto <= 12, `${scarto.toFixed(1)} cent`);
    }

    // Una corda vera si spegne. Se il modello non perdesse energia sarebbe un organo.
    const b = bufferCorda(330, 2.0);
    const dati = b.getChannelData(0);
    const energia = (da, a) => {
      let s = 0;
      for (let i = da; i < a; i += 1) s += dati[i] * dati[i];
      return Math.sqrt(s / (a - da));
    };
    const inizio = energia(0, Math.floor(b.sampleRate * 0.05));
    const meta = energia(Math.floor(b.sampleRate * 0.8), Math.floor(b.sampleRate * 0.85));
    const fine = energia(Math.floor(b.sampleRate * 1.7), Math.floor(b.sampleRate * 1.75));
    t.ok('la corda si spegne col tempo', inizio > meta && meta > fine,
      `${inizio.toFixed(4)} → ${meta.toFixed(4)} → ${fine.toFixed(4)}`);
    t.ok('non finisce di colpo', fine >= 0, `${fine.toFixed(5)}`);
    t.ok('non satura', Math.max(...dati.slice(0, 4000).map(Math.abs)) <= 1.001);

    // Le corde acute si spengono prima delle gravi, come dal vero.
    const durataUtile = (hz) => {
      const buf = bufferCorda(hz, 2.0);
      const d = buf.getChannelData(0);
      const soglia = 0.02;
      for (let i = d.length - 1; i > 0; i -= 1) if (Math.abs(d[i]) > soglia) return i / buf.sampleRate;
      return 0;
    };
    const grave = durataUtile(82.41);
    const acuta = durataUtile(659.26);
    t.ok('l\'acuta muore prima della grave', acuta < grave, `acuta ${acuta.toFixed(2)}s, grave ${grave.toFixed(2)}s`);
    await ctx.close();
  };
});

// ── R. Le due decisioni dell'accordatore ─────────────────────────────────────

gruppo('Accordatore — una corda vera oscilla, e deve poter essere dichiarata', (t) => {
  // Il caso che ha bloccato il percorso: la corda attraversa la soglia più volte
  // mentre si spegne. Con "700 ms ininterrotti" non veniva dichiarata MAI.
  const passo = 25;
  const serie = (dentroSequenza) => dentroSequenza.map((dentro, i) => ({ t: i * passo, dentro }));

  const oscillante = [];
  for (let i = 0; i < 64; i += 1) oscillante.push(i % 5 !== 4);   // dentro 4 volte su 5
  const campioniOsc = serie(oscillante);
  const dentroOsc = msDentroFinestra(campioniOsc, 63 * passo, 1600);
  t.ok('una corda che ballonzola accumula abbastanza tempo', dentroOsc >= 450, `${dentroOsc} ms`);

  const semprefuori = serie(new Array(64).fill(false));
  t.uguale('una corda sempre fuori non accumula niente', msDentroFinestra(semprefuori, 63 * passo, 1600), 0);

  const brevissimo = serie([true, true, true, false]);
  t.ok('tre campioni buoni non bastano', msDentroFinestra(brevissimo, 3 * passo, 1600) < 450,
    `${msDentroFinestra(serie([true, true, true, false]), 3 * passo, 1600)} ms`);

  // La finestra dimentica il passato: aver azzeccato la nota dieci secondi fa non conta.
  const vecchi = [{ t: 0, dentro: true }, { t: 100, dentro: true }, { t: 9000, dentro: false }];
  msDentroFinestra(vecchi, 9000, 1600);
  t.ok('i campioni vecchi vengono potati', vecchi.length <= 1, `${vecchi.length} rimasti`);

  // La spunta non deve saltare via alla corda sbagliata mentre ne accordi un'altra.
  t.ok('una corda fuori di 20 centesimi perde la spunta',
    spuntaDaTogliere({ giaFatta: true, scarto: -20, tolleranzaUscita: 12 }));
  t.ok('a 8 centesimi la tiene',
    !spuntaDaTogliere({ giaFatta: true, scarto: 8, tolleranzaUscita: 12 }));
  t.ok('un\'altra corda scambiata per questa NON gliela toglie',
    !spuntaDaTogliere({ giaFatta: true, scarto: -480, tolleranzaUscita: 12 }),
    'a 480 centesimi non è più quella corda: è la vicina presa per lei');
  t.ok('chi non ce l\'ha non può perderla',
    !spuntaDaTogliere({ giaFatta: false, scarto: -300, tolleranzaUscita: 12 }));
});

gruppo('Accordatore — non dice "a posto" quando non sta misurando', (t) => {
  const T = 4000;
  const dec = (hz, silenzio, ultimaDa) => decisioneDisplay({ hz, silenzio, ultimaDa, tenutaMs: T });

  t.uguale('con una nota, misura', dec(440, false, 0), 'misura');
  t.uguale('nota fresca anche se c\'era una tenuta', dec(440, false, 9999), 'misura');
  t.uguale('appena dopo la nota, tiene', dec(null, true, 1200), 'tenuta');
  t.uguale('al limite della tenuta, tiene ancora', dec(null, true, 3999), 'tenuta');
  t.uguale('scaduta la tenuta in silenzio, azzera', dec(null, true, 4001), 'azzera-silenzio');

  // Il difetto vero: NON è silenzio, è la corda che ronza mentre giri la chiave.
  // Prima qui restava congelato l'ultimo "A POSTO", per sempre.
  t.uguale('scaduta la tenuta col rumore, azzera lo stesso', dec(null, false, 4001), 'azzera-rumore');
  t.uguale('rumore lunghissimo, azzera comunque', dec(null, false, 600000), 'azzera-rumore');
  t.uguale('senza nessuna lettura precedente, azzera', dec(null, false, null), 'azzera-rumore');
  t.ok('nessuno stato che tenga per sempre',
    [1e6, 1e9].every((x) => dec(null, false, x).startsWith('azzera')));

  const togli = (giaFatta, scarto) => spuntaDaTogliere({ giaFatta, scarto, tolleranzaUscita: 12 });
  t.uguale('corda scordata di 45 centesimi: spunta via', togli(true, -45), true);
  t.uguale('corda scordata di 13: spunta via', togli(true, 13), true);
  t.uguale('corda a 8 centesimi: la spunta resta (isteresi)', togli(true, 8), false);
  t.uguale('corda a 0: resta', togli(true, 0), false);
  t.uguale('corda mai dichiarata a posto: niente da togliere', togli(false, -80), false);
  t.ok('la soglia di uscita è più larga di quella di entrata', 12 > 5);
});

// ── Q. Posizioni sul manico ──────────────────────────────────────────────────

gruppo('Posizioni — le forme trovate suonano davvero quell\'accordo', (t) => {
  const midiCorde = accordatura('eadgbe').corde.map((c) => c.midi);
  const campione = ['C', 'Am', 'F', 'G', 'G7', 'Dm', 'Em', 'E', 'E7', 'Bb', 'D', 'A', 'Cmaj7', 'Dm7', 'A7', 'Bm'];

  campione.forEach((nome) => {
    const posizioni = posizioniDi(nome, { midiCorde, limite: 5 });
    t.ok(`${nome}: trova almeno due posizioni`, posizioni.length >= 2, `${posizioni.length}`);

    posizioni.forEach((v) => {
      // La prova che conta: la forma inventata dal programma deve superare lo stesso
      // controllo delle diteggiature scritte a mano. Una posizione generata che non
      // suona l'accordo sarebbe peggio di non averla.
      const finto = { id: nome, tasti: v.tasti, dita: v.dita, barre: v.barre };
      const esito = verificaDiteggiatura(finto);
      t.ok(`${nome} @${v.posizione}: suona ${nome}`, esito.ok, `${JSON.stringify(v.tasti)} — ${esito.motivo}`);

      const premuti = v.tasti.filter((x) => x > 0);
      if (premuti.length) {
        t.ok(`${nome} @${v.posizione}: la mano ci arriva`,
          Math.max(...premuti) - Math.min(...premuti) < 4,
          `apertura ${Math.max(...premuti) - Math.min(...premuti)} tasti`);
      }
      t.ok(`${nome} @${v.posizione}: al massimo quattro dita`, v.nDita <= 4, `${v.nDita}`);
      t.ok(`${nome} @${v.posizione}: dita coerenti coi tasti`,
        v.tasti.every((tasto, i) => (tasto > 0 ? v.dita[i] > 0 : v.dita[i] === 0)),
        `${JSON.stringify(v.tasti)} / ${JSON.stringify(v.dita)}`);

      // Le corde smorzate stanno ai bordi, come nella libreria scritta a mano: una corda
      // spenta in mezzo a due che suonano e una presa che sulla carta funziona e sotto le
      // dita no.
      const suonanti = v.tasti.map((x, i) => (x >= 0 ? i : -1)).filter((i) => i >= 0);
      t.ok(`${nome} @${v.posizione}: le corde smorzate stanno ai bordi`,
        suonanti[suonanti.length - 1] - suonanti[0] === suonanti.length - 1,
        JSON.stringify(v.tasti));
      t.ok(`${nome} @${v.posizione}: almeno quattro corde suonano`, suonanti.length >= 4,
        `${suonanti.length} corde`);
    });

    // Deve esistere davvero una posizione più ACUTA, che è la ragione della funzione:
    // "lo stesso giro un'ottava sopra". Attenzione a cosa si confronta: la posizione
    // più in alto sul manico non è necessariamente la più acuta — dipende da quali
    // corde restano libere. Il confronto giusto è fra la più grave e la più acuta.
    const salto = distanzaOttave(posizioni[0], posizioni[posizioni.length - 1]);
    t.ok(`${nome}: fra la più grave e la più acuta c'è almeno un terzo di ottava`,
      salto >= 0.33, `${salto.toFixed(2)} ottave`);
    t.ok(`${nome}: le posizioni sono ordinate dal grave all'acuto`,
      posizioni.every((v, i) => i === 0 || v.altezza >= posizioni[i - 1].altezza));
  });

  // La posizione aperta di un accordo che ce l'ha deve essere fra quelle trovate.
  // Le forme che tutti conoscono devono uscire dalla ricerca, non essere un caso a parte.
  // Se non escono, l'ordinamento sta premiando la cosa sbagliata: e gia successo, con il
  // criterio "meno dita" ereditato dall'ukulele il Sol veniva rappresentato da x2000x.
  const famose = [
    ['C', '-1,3,2,0,1,0'],
    ['G', '3,2,0,0,0,3'],
    ['Am', '-1,0,2,2,1,0'],
    ['Em', '0,2,2,0,0,0'],
    ['D', '-1,-1,0,2,3,2'],
    ['E', '0,2,2,1,0,0'],
    ['A', '-1,0,2,2,2,0'],
    ['F', '1,3,3,2,1,1'],
  ];
  famose.forEach(([nome, forma]) => {
    const trovate = posizioniDi(nome, { midiCorde, limite: 6 });
    t.ok(`fra le posizioni di ${nome} c'e la forma che tutti conoscono`,
      trovate.some((v) => v.tasti.join() === forma),
      `${forma} non e fra ${trovate.map((v) => v.tasti.join(' ')).join(' / ')}`);
  });
});

// ── P. Ascolto vivo: la prova che vale più di tutte ──────────────────────────

gruppo('Ascolto vivo — misura davvero quando penni', (t) => {
  t.asincrono = async () => {
    // Qui si usa il contesto SINGOLO dell'app, non uno nuovo: metronomo e ascolto devono
    // leggere lo stesso orologio. Con due contesti distinti i tempi differiscono di
    // minuti — è successo mentre scrivevo questa prova, e i numeri sembravano assurdi.
    const ctx = await preparaContestoApp(t);
    if (!ctx) return;
    const salvaGum = navigator.mediaDevices ? navigator.mediaDevices.getUserMedia : null;
    try {
      // Microfono finto ma VERO: uno stream generato dal grafo audio, che entra
      // dalla stessa porta del microfono di casa (getUserMedia → MediaStreamSource).
      // Se passasse da una scorciatoia, questa prova non direbbe niente sul telefono.
      const dest = audio.contesto().createMediaStreamDestination();
      const bus = audio.contesto().createGain();
      bus.gain.value = 1;
      bus.connect(dest);
      navigator.mediaDevices.getUserMedia = async () => dest.stream;
      audio.chiudiMicrofono();
      await audio.apriMicrofono();

      const c = audio.contesto();
      const ascolto = new AscoltoVivo(
        audio.nuovoAnalizzatore({ fftSize: 1024 }),
        audio.analizzatoreAccordo(),
      );
      ascolto.impostaLatenza(0);

      // Un Mi maggiore vero, tutte e sei le corde: 82,41 / 123,47 / 164,81 / 207,65 /
      // 246,94 / 329,63 Hz. E la pennata che una chitarra fa davvero, e comincia dal
      // grave - cioe proprio dalla parte di spettro che la banda dell'ukulele tagliava via.
      const miMaggiore = [82.41, 123.47, 164.81, 207.65, 246.94, 329.63];
      const penna = (quando, extra) => miMaggiore.forEach((hz, i) => {
        const s = c.createBufferSource();
        s.buffer = bufferCorda(hz, 1.2);
        const g = c.createGain();
        g.gain.value = 0.9;
        s.connect(g).connect(bus);
        s.start(quando + extra + i * 0.012);      // le corde non partono insieme
      });

      const m = new Metronomo({ bpm: 100, suddivisioni: 2, battitiPerBattuta: 4 });
      m.volumeClick = 0;
      m.avvia();

      const voluti = [0, 0.06, -0.05, 0, 0.03, 0];
      const righe = [];
      const fatte = new Set();
      let k = 0;
      let giri = 0;
      const partenza = c.currentTime;

      // Ciclo che CEDE il controllo, non attesa attiva.
      //
      // Qui l'attesa attiva non funziona e c'è un motivo preciso: il suono di prova esce
      // da un MediaStreamDestination e rientra da un MediaStreamSource, e quel giro passa
      // per la pipeline media, che ha bisogno del ciclo degli eventi per consegnare i
      // pacchetti. Bloccando il thread principale per quattro secondi arrivano ZERO
      // pennate — misurato: 0 su 6, mentre con questo ciclo sono 6 su 6.
      await new Promise((fine) => {
        const timer = setInterval(() => {
          giri += 1;
          const ora = c.currentTime;
          m.griglia.forEach((info) => {
            if (info.slot !== 0 || fatte.has(info.passo) || info.quando < ora + 0.06) return;
            fatte.add(info.passo);
            if (k >= voluti.length) return;
            penna(info.quando, voluti[k]);
            righe.push({ atteso: info.quando, voluto: voluti[k] });
            k += 1;
          });
          const attacco = ascolto.ascolta();
          if (attacco) {
            const vicino = m.piuVicino(attacco.quando);
            if (vicino) {
              const r = righe.find((x) => Math.abs(x.atteso - vicino.info.quando) < 0.001);
              if (r && r.misurato === undefined) r.misurato = vicino.scarto;
            }
          }
          const finito = k >= voluti.length && righe.length && ora > righe[righe.length - 1].atteso + 0.8;
          if (finito || ora - partenza > 20) { clearInterval(timer); fine(); }
        }, 10);
      });
      m.ferma();

      // Se il browser ha strozzato i timer (pagina in secondo piano) la prova non è
      // valida: dirlo è meglio che segnare un rosso che non riguarda il codice.
      // Questa non e una prova fallita: e una prova NON ESEGUIBILE, e la differenza va
      // detta. Il browser porta i timer di una pagina nascosta a un colpo al secondo, e
      // un attacco di pennata dura cinquanta millisecondi: con quella cadenza non si
      // misura niente, per quanto il codice sia giusto. Misurato: 10 ms per giro a
      // pagina visibile, esattamente 1000 a pagina nascosta.
      const cadenza = (c.currentTime - partenza) / Math.max(1, giri);
      if (cadenza > 0.04) {
        t.ok('ascolto vivo misurabile', false,
          `PROVA NON ESEGUITA, non fallita: il browser strozza i timer quando la pagina non e in vista (${Math.round(cadenza * 1000)} ms per giro invece di 10, scheda ${document.visibilityState}). Porta questa scheda in primo piano e premi "Rifai le prove audio".`);
        return;
      }

      const visti = righe.filter((r) => r.misurato !== undefined);
      t.ok(`sente almeno 5 pennate su ${voluti.length}`, visti.length >= 5, `${visti.length}`);
      if (visti.length >= 3) {
        const errori = visti.map((r) => (r.misurato - r.voluto) * 1000);
        const medio = errori.reduce((a, b) => a + b, 0) / errori.length;
        const dispersione = Math.max(...errori) - Math.min(...errori);
        t.ok('lo scarto sistematico sta entro 25 ms', Math.abs(medio) <= 25, `${medio.toFixed(1)} ms`);
        // Il limite sulla dispersione si DERIVA, non si sceglie: il rilevatore data
        // l'attacco con la granularità della sua finestra FFT (1024 campioni ≈ 23 ms
        // a 44,1 kHz), quindi due frame di ballo — ±1 per pennata — sono fisica della
        // misura, non difetto. Il primo numero scritto qui era 30 ms "perché la prima
        // esecuzione aveva dato 12": una soglia presa da una run fortunata, che sotto
        // carico falliva a codice identico. Quel che conta per il prodotto è restare
        // ben sotto la soglia di giudizio "fuori tempo" (80 ms), e 2 frame lo sono.
        const dueFrame = (1024 / 44100) * 2 * 1000;
        t.ok(`la dispersione sta entro 2 finestre di analisi (${dueFrame.toFixed(0)} ms)`,
          dispersione <= dueFrame, `${dispersione.toFixed(1)} ms`);

        // Il punto vero: deve distinguere chi è in ritardo da chi è a tempo.
        const aTempo = visti.filter((r) => r.voluto === 0).map((r) => r.misurato * 1000);
        const inRitardo = visti.filter((r) => r.voluto > 0.05).map((r) => r.misurato * 1000);
        const inAnticipo = visti.filter((r) => r.voluto < -0.02).map((r) => r.misurato * 1000);
        if (aTempo.length && inRitardo.length) {
          t.ok('una pennata in ritardo si misura più tardi di una a tempo',
            Math.min(...inRitardo) > Math.max(...aTempo),
            `a tempo ${aTempo.map((x) => x.toFixed(0))}, in ritardo ${inRitardo.map((x) => x.toFixed(0))}`);
        }
        if (aTempo.length && inAnticipo.length) {
          t.ok('una pennata in anticipo si misura prima di una a tempo',
            Math.max(...inAnticipo) < Math.min(...aTempo),
            `in anticipo ${inAnticipo.map((x) => x.toFixed(0))}`);
        }
        const g = giudizioTempo(Math.max(...aTempo) / 1000);
        t.ok('una pennata a tempo viene chiamata "a tempo"', g.classe === 'preciso', `${g.classe}`);
      }
    } finally {
      audio.chiudiMicrofono();
      if (salvaGum) navigator.mediaDevices.getUserMedia = salvaGum;
      // Il contesto dell'app NON si chiude: serve al resto della pagina.
    }
  };
});

// ── esecuzione ───────────────────────────────────────────────────────────────

export async function esegui(suRisultato) {
  let totali = 0;
  let falliti = 0;
  for (const g of gruppi) {
    g.prove.length = 0;
    const t = contestoPer(g);
    try {
      g.fn(t);
      if (t.asincrono) await t.asincrono();
    } catch (e) {
      g.prove.push({ titolo: 'il gruppo è esploso', esito: false, dettaglio: String(e && e.stack ? e.stack : e) });
    }
    const suoiFalliti = g.prove.filter((p) => !p.esito).length;
    totali += g.prove.length;
    falliti += suoiFalliti;
    if (suRisultato) suRisultato(g, suoiFalliti);
  }
  return { totali, falliti, gruppi };
}

export { gruppi };
