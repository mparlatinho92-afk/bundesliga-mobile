// Gegenprobe der Pokal-Einzelspiele (tools/wiki_pokal.json) gegen die offizielle "Ewige Tabelle des DFB-Pokals" (de.wikipedia).
//   node tools/pokal_ewig_vergleich.mjs              Vergleich je Verein über das Wikipedia-Linkziel (prüft das PARSEN, nicht die IDs)
//   node tools/pokal_ewig_vergleich.mjs --ids        zusätzlich über die zugeordneten IDs (tools/wiki_pokal_ids.json)
//   node tools/pokal_ewig_vergleich.mjs --selbsttest ein Spiel weglassen – muss als Abweichung auffallen
//
// Zählweise wie die offizielle Tabelle: alle Hauptrunden inkl. Wiederholungsspiele, Unentschieden = Tore nach 90/120 Minuten
// gleich (Elfmeterschießen zählt als U). Freilose und Spiele ohne Tore zählen nicht.
// Stand der Tabelle steht in ihrem Kopf ("Stand: 2. September 2026") – Saisons danach werden abgeschnitten (STAND_BIS).
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const CACHE = path.join(process.env.TEMP || os.tmpdir(), 'pokal_wiki_cache');
const SELBST = process.argv.includes('--selbsttest'), IDS = process.argv.includes('--ids');
const D = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_pokal.json'), 'utf8'));
const RUNDEN = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_pokal_runden.json'), 'utf8'));
const OHNE = new Set(RUNDEN.ohne || []), WERTUNG = RUNDEN.wertung || {};

// ---------- offizielle Tabelle ----------
let txt = path.join(CACHE, 'ewige.txt');
if (!fs.existsSync(txt)) {
    const r = await fetch('https://de.wikipedia.org/w/index.php?title=Ewige_Tabelle_des_DFB-Pokals&action=raw', { headers: { 'User-Agent': 'BundesligaSim-Research/1.0' } });
    fs.writeFileSync(txt, await r.text());
}
txt = fs.readFileSync(txt, 'utf8');
const stand = (txt.match(/Stand:\s*([^'<]+)/) || [])[1] || '?';
const offiziell = {}, doppelt = [];
// Je Tabellenzeile (zwischen "|-"): Zellen über "||" bzw. Zeilenanfang "|" trennen. Die Vereinszelle erkennt man an
// style="text-align:left" (NICHT an der Platzzahl: bei Gleichstand steht sie als rowspan nur in der ersten Zeile).
// Verein = erster Link, der keine Datei ist (ohne Link der Klartext), danach Bundesland, J, Sp., S, U, N, T, GT.
for (const zeile of txt.split(/\n\|-[^\n]*\n/)) {
    const zellen = zeile.replace(/\n\|/g, '||').split('||').map(z => z.trim());
    const ci = zellen.findIndex(z => /text-align:left/.test(z));
    if (ci < 0 || ci > 2) continue;
    const vz = zellen[ci].replace(/\[\[Datei:[^\]]*\]\]/g, '').replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '');
    const l = vz.match(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/);
    const name = l ? l[1].trim() : vz.replace(/^[^|]*style="[^"]*"\s*\|/, '').replace(/\{\{[^}]*\}\}/g, '').trim();
    const anz = l ? (l[2] || l[1]).trim() : name;
    const z = zellen.slice(ci + 2, ci + 9).map(x => parseInt(x.replace(/[^0-9]/g, ''), 10));
    if (z.some(isNaN)) continue;
    let k2; const k = name + (/\((A|Am\.?)\)|Amateure|\bII\b/.test(anz) && !/\bII\b|#/.test(name) ? ' [Res]' : '');
    if (offiziell[k]) { doppelt.push(k); offiziell[k + " / " + anz] = offiziell[k]; delete offiziell[k]; k2 = k + " / " + anz + " (2)"; } else k2 = k;
    offiziell[k2] = { j: z[0], sp: z[1], s: z[2], u: z[3], n: z[4], t: z[5], gt: z[6] };
}

// ---------- eigene Summen ----------
// Stand 2.9.2026 = 2026/27 nur die 1. Hauptrunde
const STAND_BIS = { y: '2026/27', runden: ['1. Hauptrunde'] };
const eigen = {}, ids = IDS ? JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_pokal_ids.json'), 'utf8')) : null;
let weg = SELBST ? 1 : 0;
// Reserve über den angezeigten Namen: [[1. FC Köln|1. FC Köln (A)]] ist nicht die Erste
const schl = (link, name) => (link || name) + (link && /\((A|Am\.?)\)|Amateure|\sAm\.?$|\bII\b/.test(name) && !/\bII\b|#/.test(link) ? ' [Res]' : '');
D.saisons.forEach((s, si) => s.runden.forEach((r, ri) => {
    if (OHNE.has(s.y + '|' + r.name)) return;
    if (s.y === STAND_BIS.y && !STAND_BIS.runden.some(x => r.name.startsWith(x))) return;
    r.spiele.forEach((sp0, k) => { let sp = sp0;
        const w = WERTUNG[s.y + '|' + sp.h + '|' + sp.a];
        if (w) sp = { ...sp, hg: w[0], ag: w[1] };
        if (sp.hg == null || sp.ag == null) return;
        if (weg && s.y === '1985/86') { weg = 0; return; }   // Selbsttest: ein Spiel fehlt
        const seiten = IDS ? [ids.saisons[si].runden[ri].spiele[k].hId, ids.saisons[si].runden[ri].spiele[k].aId] : [schl(sp.hL, sp.h), schl(sp.aL, sp.a)];
        [[seiten[0], sp.hg, sp.ag], [seiten[1], sp.ag, sp.hg]].forEach(([k2, f, g]) => {
            const e = eigen[k2] = eigen[k2] || { sp: 0, s: 0, u: 0, n: 0, t: 0, gt: 0, jahre: new Set() };
            e.sp++; e.t += f; e.gt += g; e.jahre.add(s.y);
            if (f > g) e.s++; else if (f < g) e.n++; else e.u++;
        });
    });
}));

// ---------- Vergleich ----------
// Über IDs: offizielle Zeile → ID über die Links, die im eigenen Datenbestand auf diese ID zeigen
let linkZuId = {};
if (IDS) ids.saisons.forEach(s => s.runden.forEach(r => r.spiele.forEach(sp => {
    [[schl(sp.hL, sp.h), sp.hId], [schl(sp.aL, sp.a), sp.aId]].forEach(([l, id]) => (linkZuId[l] = linkZuId[l] || new Set()).add(id));
})));
const feld = ['sp', 's', 'u', 'n', 't', 'gt'];
let gleich = 0, abw = [], fehlt = [];
for (const [verein, o] of Object.entries(offiziell)) {
    let e;
    if (IDS) {
        const idSet = linkZuId[verein];
        if (!idSet) { fehlt.push(verein); continue; }
        if (idSet.size > 1) { abw.push({ verein, txt: 'Link zeigt auf mehrere IDs: ' + [...idSet].join(', ') }); continue; }
        e = eigen[[...idSet][0]];
    } else e = eigen[verein];
    if (!e) { fehlt.push(verein); continue; }
    const d = feld.filter(f => e[f] !== o[f]);
    if (!d.length) { gleich++; continue; }
    abw.push({ verein, txt: d.map(f => `${f} ${e[f]}≠${o[f]}`).join(', '), diff: d.reduce((a, f) => a + Math.abs(e[f] - o[f]), 0) });
}
const nurEigen = Object.keys(eigen).filter(k => !IDS && !offiziell[k]);
console.log("doppelte Schluessel offiziell: " + doppelt.join(" | "));
const sum = (o, f) => Object.values(o).reduce((a, e) => a + e[f], 0);
console.log(`Offizielle Tabelle (Stand ${stand}): ${Object.keys(offiziell).length} Vereine | eigene Summen: ${Object.keys(eigen).length}`);
console.log(`Summen offiziell: ${sum(offiziell, 'sp') / 2} Spiele, ${sum(offiziell, 't')} Tore | eigene: ${sum(eigen, 'sp') / 2} Spiele, ${sum(eigen, 't')} Tore`);
console.log(`gleich ${gleich} | abweichend ${abw.length} | offiziell, aber bei uns nicht gefunden ${fehlt.length} | nur bei uns ${nurEigen.length}`);
if (SELBST) {
    console.log(abw.length ? `Selbsttest bestanden: das fehlende Spiel fällt auf (${abw.length} Abweichung(en)).` : 'SELBSTTEST DURCHGEFALLEN');
    process.exit(abw.length ? 0 : 1);
}
abw.sort((a, b) => (b.diff || 99) - (a.diff || 99)).slice(0, 60).forEach(a => console.log('  ≠ ' + a.verein.padEnd(38) + a.txt));
if (fehlt.length) console.log('  nicht gefunden: ' + fehlt.slice(0, 60).join(' | '));
if (nurEigen.length) console.log('  nur bei uns: ' + nurEigen.slice(0, 60).join(' | '));
fs.writeFileSync(path.join(DIR, '_dryrun', 'pokal_ewig_vergleich.txt'),
    abw.map(a => a.verein + '\t' + a.txt).join('\n') + '\n\nnicht gefunden\n' + fehlt.join('\n') + '\n\nnur bei uns\n' + nurEigen.join('\n'));
process.exit(abw.length || fehlt.length ? 1 : 0);
