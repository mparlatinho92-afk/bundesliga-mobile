// Zeichnet einen Kartenausschnitt der WABEN als PNG - zum Hinschauen, bevor gebaut wird.
// Die Waben stehen in app/map_regions.js (MAP_WABEN: {Verband:{pts,cells}}); --src zeigt auf
// eine andere Fassung (z.B. eine Sicherung von vorher), --json auf einen Prototyp-Dump
// {Name: [[[lat,lon],…]]}. Ausgabe landet in Karte-Vorschau/ im Projektordner.
//
//   node tools/waben_zoom.mjs Westfalen 51.5 8.5 90 soest
//   node tools/waben_zoom.mjs Westfalen 51.5 8.5 90 soest_alt --src=Karte-Vorschau/map_regions_VORHER.js
//   node tools/waben_zoom.mjs - 52.05 12.2 90 dessau_gem --json=Karte-Vorschau/B_sachsen_anhalt.json
//   node tools/waben_zoom.mjs --vergleich a.png b.png "vorher" "nachher" vgl_soest
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const OUT  = path.join(ROOT, 'Karte-Vorschau');
fs.mkdirSync(OUT, { recursive: true });
const W = 1400, H = 1000;
const COL = ['#e57373','#64b5f6','#81c784','#ffd54f','#ba68c8','#4db6ac','#ff8a65','#a1887f',
             '#90a4ae','#f06292','#9575cd','#4dd0e1','#aed581','#ffb74d'];
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
// Farbe aus dem NAMEN, nicht aus der Reihenfolge: sonst faerbt derselbe Verein in zwei
// Ausschnitten verschieden und der Vergleich taeuscht.
const farbe = nm => { let h = 0; for (let i = 0; i < nm.length; i++) h = (h * 31 + nm.charCodeAt(i)) >>> 0;
                      return COL[h % COL.length]; };

async function shot(html, name, w = W, h = H) {
  const f = path.join(OUT, name + '.html');
  fs.writeFileSync(f, html);
  const br = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const p = await (await br.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2 })).newPage();
  await p.goto(pathToFileURL(f).href);
  await p.waitForTimeout(300);
  const png = path.join(OUT, name + '.png');
  await p.screenshot({ path: png, fullPage: true });
  await br.close();
  fs.unlinkSync(f);
  console.log('->', png);
  return png;
}

// ── Vergleich: zwei fertige PNG nebeneinander, gleiche Breite ───────────────
if (process.argv[2] === '--vergleich') {
  const [a, b, t1, t2, name] = process.argv.slice(3);
  const url = f => pathToFileURL(path.resolve(f)).href;
  const half = t => `<div style="width:700px"><div style="padding:6px 10px;font:bold 16px sans-serif">${esc(t)}</div>`;
  await shot(`<body style="margin:0;background:#fff"><div style="display:flex">
    ${half(t1)}<img src="${url(a)}" style="width:700px"></div>
    <div style="border-left:3px solid #222">${half(t2)}<img src="${url(b)}" style="width:700px"></div></div>
    </div></body>`, name, W, 560);
  process.exit(0);
}

// ── Ausschnitt zeichnen ────────────────────────────────────────────────────
const [vb, latC, lonC, span, name] = [process.argv[2], +process.argv[3], +process.argv[4],
                                      +process.argv[5], process.argv[6]];
const arg = k => (process.argv.find(a => a.startsWith('--' + k + '=')) || '').split('=').slice(1).join('=');
const titel = arg('titel');
const rad = d => d * Math.PI / 180, kx = 111.32 * Math.cos(rad(latC)), ky = 110.57, sc = W / span;
const X = lo => (lo - lonC) * kx * sc + W / 2, Y = la => H / 2 - (la - latC) * ky * sc;

// Zellen als [[ring,…],…] je Name einsammeln - egal ob aus MAP_WABEN oder aus einem JSON-Dump
let cells = {};
if (arg('json')) {
  const j = JSON.parse(fs.readFileSync(arg('json'), 'utf8'));
  for (const n in j) cells[n] = j[n].flat();
} else {
  const src = arg('src') || 'app/map_regions.js';
  // (0,eval) = indirekter Aufruf: nur so entstehen im ESM-Modul globale Bindings (const -> var)
  (0, eval)(fs.readFileSync(src, 'utf8').replace(/^const /gm, 'var '));
  const W2 = globalThis.MAP_WABEN[vb];
  if (!W2) { console.error('Verband ohne Waben:', vb, '- vorhanden:', Object.keys(globalThis.MAP_WABEN).join(', ')); process.exit(1); }
  for (const n in W2.cells) cells[n] = W2.cells[n].map(r => r.map(i => W2.pts[i]));
}

let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#fff">`;
let sichtbar = 0;
const marken = [];   // Flaechenbeschriftung: ohne sie sieht man nicht, WESSEN Wabe das ist
for (const nm in cells) {
  const col = farbe(nm);
  let d = '', vis = false, best = null;
  for (const ring of cells[nm]) {
    const P = ring.map(([la, lo]) => [X(lo), Y(la)]);
    if (P.some(p => p[0] > -100 && p[0] < W + 100 && p[1] > -100 && p[1] < H + 100)) vis = true;
    d += 'M' + P.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L') + 'Z';
    // Schwerpunkt des im Bild liegenden Teils - der Ring selbst kann weit draussen liegen
    const K = P.filter(p => p[0] > 0 && p[0] < W && p[1] > 0 && p[1] < H);
    if (K.length > 2) {
      const c = K.reduce((a, p) => [a[0] + p[0], a[1] + p[1]], [0, 0]).map(v => v / K.length);
      if (!best || K.length > best.n) best = { x: c[0], y: c[1], n: K.length };
    }
  }
  if (!vis) continue;
  sichtbar++;
  svg += `<path d="${d}" fill="${col}" fill-opacity="0.45" stroke="#333" stroke-width="1.2" fill-rule="evenodd"/>`;
  if (best) marken.push({ nm, x: best.x, y: best.y });
}
for (const m of marken)
  svg += `<text x="${m.x.toFixed(0)}" y="${m.y.toFixed(0)}" font-size="15" font-family="sans-serif"`
       + ` font-weight="bold" fill="#111" text-anchor="middle" paint-order="stroke"`
       + ` stroke="#fff" stroke-width="4">${esc(m.nm)}</text>`;
// Vereinspunkte aus game_data - der Bezugspunkt, ohne den man die Fläche nicht beurteilen kann
(0, eval)(fs.readFileSync('game_data.js', 'utf8').replace(/^const /gm, 'var '));
for (const id in globalThis.GAME_DATA.teams) {
  const t = globalThis.GAME_DATA.teams[id];
  if (t.lat == null) continue;
  const x = X(t.lon), y = Y(t.lat);
  if (x < 0 || x > W || y < 0 || y > H) continue;
  svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" fill="#000"/>`
       + `<text x="${(x+6).toFixed(1)}" y="${(y-4).toFixed(1)}" font-size="12" font-family="sans-serif">${esc(t.name)}</text>`;
}
if (titel) svg += `<text x="12" y="26" font-size="20" font-family="sans-serif" font-weight="bold">${esc(titel)}</text>`;
svg += '</svg>';
console.log(sichtbar, 'Waben im Ausschnitt');
await shot(`<body style="margin:0">${svg}</body>`, name);
