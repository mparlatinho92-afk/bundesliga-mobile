/* Zeitgleiche Schlussspieltage aus der FuPa-Messung in game_engine.js eintragen (Block SCHLUSS-START … SCHLUSS-END).
 *
 *   node tools/schlussspieltage_fupa.mjs      # Messung -> tools/schlussspieltage_fupa.json
 *   node tools/schlussspieltage_einbau.mjs    # -> Engine._ACTION_SCHLUSS
 *
 * Regeln (Nutzer 17.10.2026, „ja so umbauen, wie vorgeschlagen“):
 *   1. Letzter Spieltag zeitgleich, wenn 2025/26 >= 80 % der Spiele denselben Anstoß hatten (Nachholspiele senken den Anteil).
 *   2. Vorletzter Spieltag zeitgleich nur, wenn er es in BEIDEN Saisons war (>= 80 %). Dann auch der letzte – eine Liga, die
 *      schon den vorletzten Spieltag zeitgleich ansetzt, tut es am letzten erst recht (Verbandsliga Württemberg 2025/26:
 *      letzter 75 % wegen Nachholspielen, vorletzter 88 %).
 *   Anstoß = häufigster Anstoß dieses Spieltags 2025/26 (Wochentag + Uhrzeit).
 * Ohne Messwert bleibt eine Liga draußen = normal verteilte Anstoßzeiten. */
import fs from 'fs';
const M = JSON.parse(fs.readFileSync('tools/schlussspieltage_fupa.json', 'utf8'));
const TAGE = ['Fr', 'Sa', 'So', 'Di', 'Mi'];   // die das Spiel kennt (_DAY_ORDER)
const out = {}, bericht = [];
for (const [lid, L] of Object.entries(M)) {
    const a = L.saisons['2025-26'], b = L.saisons['2024-25'];
    if (!a) { bericht.push(`${lid} ${L.name}: keine Messung -> normal`); continue; }
    const r = (s, off) => s && s.find(x => x.vonLetztem === off);
    const slot = x => { const [d, t] = x.anstoss.split(' '); if (!TAGE.includes(d)) throw new Error(`${lid}: Tag ${d} kennt das Spiel nicht`); return { d, t }; };
    const l = r(a, 0), v = r(a, 1), vb = r(b, 1);
    const vorletzter = v && vb && v.anteil >= 0.8 && vb.anteil >= 0.8;
    const e = {};
    if (l && (l.anteil >= 0.8 || vorletzter)) e[0] = slot(l);
    if (vorletzter) e[1] = slot(v);
    if (Object.keys(e).length) out[lid] = e;
    bericht.push(`${lid} ${L.name}: letzter ${l ? Math.round(l.anteil * 100) + '% ' + l.anstoss : '-'}, vorletzter ${v ? Math.round(v.anteil * 100) + '%' : '-'}/${vb ? Math.round(vb.anteil * 100) + '%' : '-'} -> ${e[0] ? 'letzter ' + e[0].d + ' ' + e[0].t : 'letzter normal'}${e[1] ? ', vorletzter ' + e[1].d + ' ' + e[1].t : ''}`);
}
const zeile = Object.entries(out).map(([lid, e]) => `'${lid}': {${Object.entries(e).map(([k, s]) => `${k}: {d:'${s.d}',t:'${s.t}'}`).join(', ')}}`);
const block = '    // SCHLUSS-START\n    _ACTION_SCHLUSS: {\n        ' + zeile.join(',\n        ') + '\n    },\n    // SCHLUSS-END';
const F = 'game_engine.js', roh = fs.readFileSync(F, 'utf8'), crlf = roh.includes('\r\n');
let s = roh.split('\r\n').join('\n');
const re = /    \/\/ SCHLUSS-START\n[\s\S]*?    \/\/ SCHLUSS-END/;
if (!re.test(s)) throw new Error('Block SCHLUSS-START/END fehlt in game_engine.js');
s = s.replace(re, block);
fs.writeFileSync(F, crlf ? s.split('\n').join('\r\n') : s);
console.log(bericht.join('\n'));
console.log(`\n-> ${Object.keys(out).length} von ${Object.keys(M).length} Ligen mit zeitgleichem Schluss, davon ${Object.values(out).filter(e => e[1]).length} auch am vorletzten Spieltag`);
