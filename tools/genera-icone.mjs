// Genera le icone PNG dell'app senza dipendenze (zlib è nel Node standard).
//
// Perché non basta un SVG nel manifest: iOS lo ignora per l'icona della schermata Home.
// Senza `apple-touch-icon` PNG, l'app aggiunta alla Home resta un riquadro vuoto o uno
// screenshot della pagina.
//
//   node tools/genera-icone.mjs

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const QUI = dirname(fileURLToPath(import.meta.url));
const DEST = join(QUI, '..', 'icons');
const SUPERCAMPIONE = 4;

const SFONDO = [0x18, 0x12, 0x0d];
const LEGNO = [0xe8, 0xa3, 0x3d];
const LEGNO_SCURO = [0xb9, 0x7a, 0x27];
const BUIO = [0x1c, 0x14, 0x0c];
const CORDA = [0xf6, 0xef, 0xe7];

const dist = (x, y, cx, cy) => Math.hypot(x - cx, y - cy);

function dentroRettangoloTondo(x, y, lato = 100, raggio = 23) {
  const cx = Math.min(Math.max(x, raggio), lato - raggio);
  const cy = Math.min(Math.max(y, raggio), lato - raggio);
  return dist(x, y, cx, cy) <= raggio;
}

/** Il disegno, in coordinate 0..100. Restituisce null dove è trasparente. */
function colore(x, y, { mascherabile }) {
  if (!mascherabile && !dentroRettangoloTondo(x, y)) return null;

  // Le icone mascherabili vengono ritagliate a cerchio dal sistema: il contenuto
  // sta nel 60% centrale, il resto è solo sfondo sacrificabile.
  let px = x;
  let py = y;
  if (mascherabile) {
    px = (x - 50) / 0.62 + 50;
    py = (y - 50) / 0.62 + 50;
    if (px < 0 || px > 100 || py < 0 || py > 100) return SFONDO;
  }

  const corpo = dist(px, py, 50, 68) <= 25.5 || dist(px, py, 50, 43) <= 18.5;
  const manico = Math.abs(px - 50) <= 6.2 && py >= 9 && py <= 46;
  const paletta = Math.abs(px - 50) <= 8.6 && py >= 6 && py <= 13;

  if (!corpo && !manico && !paletta) return mascherabile ? SFONDO : SFONDO;

  // Dettagli scuri sopra il legno, nell'ordine in cui li vedi.
  if (dist(px, py, 50, 62) <= 8.6) return BUIO;                                  // buca
  if (Math.abs(py - 74.5) <= 1.6 && Math.abs(px - 50) <= 10) return LEGNO_SCURO; // ponticello
  for (const t of [17.5, 24.5, 31.5, 38.5]) {                                    // tasti
    if (Math.abs(py - t) <= 0.7 && Math.abs(px - 50) <= 6.2) return LEGNO_SCURO;
  }
  for (const cx of [46.4, 48.8, 51.2, 53.6]) {                                   // corde
    if (Math.abs(px - cx) <= 0.42 && py >= 10 && py <= 74) return CORDA;
  }
  if (corpo && dist(px, py, 50, 68) > 24 && dist(px, py, 50, 43) > 17) return LEGNO_SCURO;
  return manico || paletta ? LEGNO_SCURO : LEGNO;
}

function pixel(lato, opzioni) {
  const passo = 100 / (lato * SUPERCAMPIONE);
  const righe = Buffer.alloc(lato * (lato * 4 + 1));
  let p = 0;
  for (let py = 0; py < lato; py += 1) {
    righe[p] = 0;                                     // filtro "none"
    p += 1;
    for (let px = 0; px < lato; px += 1) {
      let r = 0; let g = 0; let b = 0; let coperti = 0;
      for (let sy = 0; sy < SUPERCAMPIONE; sy += 1) {
        const y = (py * SUPERCAMPIONE + sy + 0.5) * passo;
        for (let sx = 0; sx < SUPERCAMPIONE; sx += 1) {
          const x = (px * SUPERCAMPIONE + sx + 0.5) * passo;
          const c = colore(x, y, opzioni);
          if (!c) continue;
          r += c[0]; g += c[1]; b += c[2]; coperti += 1;
        }
      }
      const campioni = SUPERCAMPIONE * SUPERCAMPIONE;
      if (coperti === 0) { righe.fill(0, p, p + 4); p += 4; continue; }
      righe[p] = Math.round(r / coperti);
      righe[p + 1] = Math.round(g / coperti);
      righe[p + 2] = Math.round(b / coperti);
      righe[p + 3] = Math.round((coperti / campioni) * 255);
      p += 4;
    }
  }
  return righe;
}

const CRC = (() => {
  const tabella = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    tabella[n] = c;
  }
  return (buf) => {
    let c = -1;
    for (let i = 0; i < buf.length; i += 1) c = tabella[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
})();

function blocco(tipo, dati) {
  const lung = Buffer.alloc(4);
  lung.writeUInt32BE(dati.length);
  const corpo = Buffer.concat([Buffer.from(tipo, 'ascii'), dati]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(CRC(corpo));
  return Buffer.concat([lung, corpo, crc]);
}

function scriviPng(percorso, lato, dati) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lato, 0);
  ihdr.writeUInt32BE(lato, 4);
  ihdr[8] = 8;      // bit per canale
  ihdr[9] = 6;      // RGBA
  writeFileSync(percorso, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    blocco('IHDR', ihdr),
    blocco('IDAT', deflateSync(dati, { level: 9 })),
    blocco('IEND', Buffer.alloc(0)),
  ]));
}

mkdirSync(DEST, { recursive: true });
for (const [nome, lato, opzioni] of [
  ['icon-180.png', 180, { mascherabile: false }],
  ['icon-192.png', 192, { mascherabile: false }],
  ['icon-512.png', 512, { mascherabile: false }],
  ['icon-maskable-512.png', 512, { mascherabile: true }],
]) {
  const percorso = join(DEST, nome);
  scriviPng(percorso, lato, pixel(lato, opzioni));
  console.log(`  icons/${nome}  (${lato}×${lato})`);
}
console.log('Fatto: ora l\'icona esiste anche su iOS.');
