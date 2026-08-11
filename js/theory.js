// Teoria minima ma vera: da qui si ricava COSA deve suonare un accordo, e quindi si può
// verificare che una diteggiatura sia giusta invece di fidarsi di come è stata copiata.
//
// Tutto è in classi di altezza (0 = Do, 1 = Do#, … 11 = Si): l'ottava non conta per
// dire se un accordo è quello che dichiara di essere.

export const NOMI = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const NOMI_BEMOLLE = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export const NOTE_IT = {
  C: 'Do', D: 'Re', E: 'Mi', F: 'Fa', G: 'Sol', A: 'La', B: 'Si',
};

const ALTERAZIONI = { '#': 1, '♯': 1, b: -1, '♭': -1 };
const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** Classe di altezza di un nome di nota ("Bb" → 10). null se non è una nota. */
export function classeNota(nome) {
  const m = /^([A-G])([#♯b♭]?)$/.exec(nome);
  if (!m) return null;
  return (BASE[m[1]] + (ALTERAZIONI[m[2]] || 0) + 12) % 12;
}

export function nomeClasse(pc, bemolli = false) {
  return (bemolli ? NOMI_BEMOLLE : NOMI)[((pc % 12) + 12) % 12];
}

export function nomeItaliano(nome) {
  const m = /^([A-G])([#♯b♭]?)$/.exec(nome);
  if (!m) return nome;
  const suffisso = m[2] === '' ? '' : (ALTERAZIONI[m[2]] > 0 ? '♯' : '♭');
  return NOTE_IT[m[1]] + suffisso;
}

/**
 * Intervalli di ogni qualità, in semitoni dalla fondamentale.
 * `omissibili` = gradi che una diteggiatura a 4 corde può legittimamente lasciare fuori
 * (la quinta non definisce nulla; la fondamentale la sente l'orecchio dal contesto).
 */
export const QUALITA = {
  '': { nome: 'maggiore', intervalli: [0, 4, 7], omissibili: [] },
  m: { nome: 'minore', intervalli: [0, 3, 7], omissibili: [] },
  // La quinta vuota non ha terza: non è né maggiore né minore, ed è una qualità a sé,
  // non un accordo incompleto. Sulla chitarra è due dita e una forma mobile.
  5: { nome: 'quinta vuota', intervalli: [0, 7], omissibili: [] },
  7: { nome: 'settima di dominante', intervalli: [0, 4, 7, 10], omissibili: [7] },
  m7: { nome: 'minore settima', intervalli: [0, 3, 7, 10], omissibili: [7] },
  maj7: { nome: 'maggiore settima', intervalli: [0, 4, 7, 11], omissibili: [7] },
  6: { nome: 'sesta', intervalli: [0, 4, 7, 9], omissibili: [7] },
  m6: { nome: 'minore sesta', intervalli: [0, 3, 7, 9], omissibili: [7] },
  sus4: { nome: 'sospesa di quarta', intervalli: [0, 5, 7], omissibili: [] },
  sus2: { nome: 'sospesa di seconda', intervalli: [0, 2, 7], omissibili: [] },
  '7sus4': { nome: 'settima sospesa', intervalli: [0, 5, 7, 10], omissibili: [7] },
  dim: { nome: 'diminuita', intervalli: [0, 3, 6], omissibili: [] },
  dim7: { nome: 'settima diminuita', intervalli: [0, 3, 6, 9], omissibili: [] },
  aug: { nome: 'eccedente', intervalli: [0, 4, 8], omissibili: [] },
  add9: { nome: 'con nona aggiunta', intervalli: [0, 2, 4, 7], omissibili: [7] },
  9: { nome: 'nona', intervalli: [0, 2, 4, 7, 10], omissibili: [0, 7] },
  m9: { nome: 'minore nona', intervalli: [0, 2, 3, 7, 10], omissibili: [0, 7] },
};

/**
 * Scompone "F#m7" in {fondamentale: 6, qualita: 'm7'}. null se il nome non si legge.
 *
 * Legge anche gli accordi con il BASSO DICHIARATO — "D/F#", "G/B", "C/E" — che prima
 * tornavano null, cioè non esistevano per il programma. Non sono un dettaglio da
 * completisti: il basso che scende di grado in grado sotto accordi che restano fermi è
 * il gesto più riconoscibile della chitarra pop, e senza saper leggere quel nome non si
 * poteva né metterlo in un giro né disegnarlo.
 */
export function scomponi(nomeAccordo) {
  const testo = String(nomeAccordo).trim();
  const barra = testo.indexOf('/');
  const parteAccordo = barra < 0 ? testo : testo.slice(0, barra);
  const parteBasso = barra < 0 ? null : testo.slice(barra + 1);

  const m = /^([A-G][#♯b♭]?)(.*)$/.exec(parteAccordo);
  if (!m) return null;
  const pc = classeNota(m[1].replace('♯', '#').replace('♭', 'b'));
  if (pc === null) return null;
  const coda = m[2].replace(/^maj$/, 'maj7').replace('Δ', 'maj7');
  if (!(coda in QUALITA)) return null;

  let basso = null;
  if (parteBasso !== null) {
    basso = classeNota(parteBasso.replace('♯', '#').replace('♭', 'b'));
    if (basso === null) return null;         // "C/pippo" non è un accordo
  }

  return {
    fondamentale: pc,
    nomeFondamentale: m[1],
    qualita: coda,
    ...QUALITA[coda],
    basso,
    nomeBasso: parteBasso,
  };
}

/**
 * Le classi di altezza che un accordo DEVE contenere.
 *
 * Il basso dichiarato entra fra le obbligatorie, non solo fra le ammesse: un Re con il
 * Fa♯ sotto è un accordo diverso da un Re, ed è proprio quella nota a farlo. Se mancasse,
 * quello che resta è un altro accordo — quindi pretenderla è la cosa giusta.
 */
export function classiAttese(nomeAccordo) {
  const s = scomponi(nomeAccordo);
  if (!s) return null;
  const obbligatorie = s.intervalli.filter((i) => !s.omissibili.includes(i))
    .map((i) => (s.fondamentale + i) % 12);
  const ammesse = s.intervalli.map((i) => (s.fondamentale + i) % 12);
  if (s.basso !== null) {
    if (!ammesse.includes(s.basso)) ammesse.push(s.basso);
    if (!obbligatorie.includes(s.basso)) obbligatorie.push(s.basso);
  }
  return { obbligatorie, ammesse, scomposto: s };
}

/** Trasporta un nome di accordo di N semitoni, mantenendo la qualità e il basso. */
export function trasponi(nomeAccordo, semitoni, bemolli = false) {
  const s = scomponi(nomeAccordo);
  if (!s) return nomeAccordo;
  const base = nomeClasse(s.fondamentale + semitoni, bemolli) + s.qualita;
  return s.basso === null ? base : `${base}/${nomeClasse(s.basso + semitoni, bemolli)}`;
}

// ── Scale e gradi ────────────────────────────────────────────────────────────

export const SCALE = {
  maggiore: { nome: 'Maggiore', gradi: [0, 2, 4, 5, 7, 9, 11] },
  minoreNaturale: { nome: 'Minore naturale', gradi: [0, 2, 3, 5, 7, 8, 10] },
  minoreArmonica: { nome: 'Minore armonica', gradi: [0, 2, 3, 5, 7, 8, 11] },
  pentatonicaMaggiore: { nome: 'Pentatonica maggiore', gradi: [0, 2, 4, 7, 9] },
  pentatonicaMinore: { nome: 'Pentatonica minore', gradi: [0, 3, 5, 7, 10] },
  blues: { nome: 'Blues', gradi: [0, 3, 5, 6, 7, 10] },
};

const GRADI_MAGGIORE = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'];
const QUALITA_GRADO = ['', 'm', 'm', '', '', 'm', 'dim'];

/** Gli accordi della tonalità: la ragione per cui bastano quattro accordi per canzone. */
export function accordiDellaTonalita(tonica, bemolli = false) {
  const pc = typeof tonica === 'number' ? tonica : classeNota(tonica);
  if (pc === null) return [];
  return SCALE.maggiore.gradi.map((g, i) => ({
    grado: GRADI_MAGGIORE[i],
    nome: nomeClasse(pc + g, bemolli) + QUALITA_GRADO[i],
  }));
}

/** In che tonalità sta un giro: quella che spiega più accordi (i doppioni non votano due volte). */
export function tonalitaProbabile(nomiAccordi) {
  const unici = [...new Set(nomiAccordi)];
  let migliore = null;
  for (let pc = 0; pc < 12; pc += 1) {
    const dentro = accordiDellaTonalita(pc).map((a) => a.nome);
    const punteggio = unici.filter((n) => {
      const s = scomponi(n);
      if (!s) return false;
      // Il V7 appartiene alla tonalità anche se la tabella dei gradi lo scrive senza settima.
      const semplificato = nomeClasse(s.fondamentale) + (s.qualita === '7' ? '' : s.qualita);
      return dentro.includes(n) || dentro.includes(semplificato);
    }).length;
    if (!migliore || punteggio > migliore.punteggio) migliore = { tonica: pc, punteggio };
  }
  return migliore && migliore.punteggio >= 2
    ? { ...migliore, nome: nomeClasse(migliore.tonica), su: unici.length }
    : null;
}
