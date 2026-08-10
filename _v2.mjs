import { posizioniDi } from './js/voicing.js';
import { classiAttese } from './js/theory.js';
import { CORDE_SEMITONI } from './js/chords.js';
const mostra = (t) => t.map(x => x < 0 ? 'x' : (x > 9 ? String.fromCharCode(97 + x - 10) : x)).join('');
let ko = 0;
for (const n of ['C','G','Am','F','D','E','Em','E7','Bm','Dm7','F#m','Bb','A','Cmaj7']) {
  const p = posizioniDi(n);
  const bad = p.filter(v => {
    const s = new Set(v.tasti.map((t,i)=> t<0?null:(CORDE_SEMITONI[i]+t)%12).filter(x=>x!==null));
    return !classiAttese(n).obbligatorie.every(pc => s.has(pc));
  });
  ko += bad.length;
  console.log(n.padEnd(6), p.map(v=>`${mostra(v.tasti)}(${v.etichetta.replace('posizione ','').replace('ª posizione','ª')})`).join(' '));
}
console.log(ko ? `✕ ${ko} posizioni non suonano l'accordo` : '✓ ogni posizione suona il suo accordo');
