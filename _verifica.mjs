import { ACCORDI, verificaDiteggiatura, nomeCanonico, CORDE_SEMITONI, ditaRichieste } from './js/chords.js';
import { scomponi } from './js/theory.js';

let ko = 0;
for (const a of ACCORDI) {
  const v = verificaDiteggiatura(a);
  if (!v.ok) { console.log(`✕ ${a.id.padEnd(12)} ${v.motivo}`); ko++; }
  // coerenza barré
  if (a.barre) {
    const { tasto, da, a: fine } = a.barre;
    for (let i = da; i <= fine; i++) {
      if (a.tasti[i] >= 0 && a.tasti[i] < tasto) { console.log(`✕ ${a.id}: barré al ${tasto} ma corda ${i} è al tasto ${a.tasti[i]}`); ko++; }
    }
    if (!a.tasti.some((t, i) => i >= da && i <= fine && t === tasto)) { console.log(`✕ ${a.id}: barré dichiarato ma nessuna corda lo usa`); ko++; }
  }
  // lunghezze
  if (a.tasti.length !== 6) { console.log(`✕ ${a.id}: ${a.tasti.length} corde`); ko++; }
  if (a.dita.length !== 6) { console.log(`✕ ${a.id}: dita ${a.dita.length}`); ko++; }
  // un dito premuto deve avere un numero
  a.tasti.forEach((t, i) => { if (t > 0 && !a.dita[i]) { console.log(`✕ ${a.id}: corda ${i} premuta senza dito`); ko++; } });
  a.tasti.forEach((t, i) => { if (t <= 0 && a.dita[i]) { console.log(`✕ ${a.id}: corda ${i} non premuta ma ha dito ${a.dita[i]}`); ko++; } });
  const d = ditaRichieste(a);
  if (d.dita > 4) { console.log(`✕ ${a.id}: ${d.dita} dita`); ko++; }
  // apertura della mano
  const premuti = a.tasti.filter(t => t > 0);
  if (premuti.length) { const ap = Math.max(...premuti) - Math.min(...premuti); if (ap > 3) { console.log(`✕ ${a.id}: apertura ${ap} tasti`); ko++; } }
}
const ids = ACCORDI.map(a => a.id);
const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
if (dup.length) { console.log('✕ id doppi: ' + dup.join(',')); ko++; }
console.log(`\n${ACCORDI.length} accordi, ${ko} problemi`);
