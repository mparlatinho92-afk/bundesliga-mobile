// Historischer DFB-Pokal (Tschammerpokal 1935–43, DFB-Pokal 1952/53–2024/25) -> app/pokal_hist_data.js  (ERZEUGT – nie von Hand ändern)
//   node tools/wiki_pokal.mjs && node tools/wiki_pokal_zuordnung.mjs && node tools/pokal_hist_einbau.mjs
//   Gegenprobe: node tools/pokal_ewig_vergleich.mjs --ids (offizielle Ewige Tabelle), Prüfung node tools/pokal_hist_test.cjs
//
// Nur was die offizielle Ewige Tabelle zählt: Hauptrunden ohne Qualifikations-/Ausscheidungsspiele (tools/wiki_pokal_runden.json
// "ohne"), am grünen Tisch gewertete Spiele mit dem gewerteten Ergebnis ("wertung"). Spiele ohne Tore (Freilos, kampflos) fallen weg.
// Letzte Saison = die vor dem Sim-Start (GAME_DATA.startYear bzw. 2025 -> bis 2024/25); danach zählt der Spielstand selbst.
//
// Format POKAL_HIST: { version, ids:[…], namen:{hist_pk_*: Name}, saisons:[{ y, r:[{ n:Rundenname, s:[[h, a, hg, ag, f]] }] }] }
//   h/a = Index in ids, f = Bitfeld 1 n.V. | 2 Elfmeterschießen (dann ie:[h,a] als 6. Feld) | 4 Wiederholungsspiel | 8 Hinspiel | 16 Rückspiel
//   | 32 Gast kommt weiter (sonst Heim, sofern entschieden) | 64 nicht entschieden (Wiederholung folgt / Hinspiel)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const D = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_pokal_ids.json'), 'utf8'));
const RUNDEN = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_pokal_runden.json'), 'utf8'));
const OHNE = new Set(RUNDEN.ohne || []), WERTUNG = RUNDEN.wertung || {};
const BIS = 2024;   // letzte historische Saison 2024/25 (Sim-Start 2025/26)
const jahr = y => /\//.test(y) ? parseInt(y) : parseInt(y) - 1;

const ids = [], idx = {};
const ix = id => { if (!(id in idx)) { idx[id] = ids.length; ids.push(id); } return idx[id]; };
const namen = {};
let spiele = 0, weg = 0;
const saisons = [];
for (const s of D.saisons) {
    if (jahr(s.y) > BIS) continue;
    const runden = [];
    for (const r of s.runden) {
        if (OHNE.has(s.y + '|' + r.name)) continue;
        // "Achtelfinale · Wiederholungsspiele" gehört zum Achtelfinale; "Die Spiele · Halbfinalspiele" (1957) heißt Halbfinale
        const wdh = /Wiederholung/i.test(r.name);
        let n = r.name.replace(/\s*·\s*Wiederholungs?spiel(e)?$/i, '').replace(/^Die Spiele\s*·\s*/, '').replace(/Halbfinalspiele/, 'Halbfinale')
            .replace(/^(\d)\. Runde$/, '$1. Hauptrunde');
        let ziel = runden.find(x => x.n === n);
        if (!ziel) { ziel = { n, s: [] }; runden.push(ziel); }
        for (const sp0 of r.spiele) {
            const w = WERTUNG[s.y + '|' + sp0.h + '|' + sp0.a];
            const sp = w ? { ...sp0, hg: w[0], ag: w[1] } : sp0;
            if (sp.hg == null || sp.ag == null) { weg++; continue; }
            let f = (sp.nv ? 1 : 0) | (sp.ie ? 2 : 0) | (wdh ? 4 : 0) | (sp.hin ? 8 : 0) | (sp.rueck ? 16 : 0);
            if (sp.sieger === 'a') f |= 32; else if (sp.sieger !== 'h') f |= 64;
            const z = [ix(sp.hId), ix(sp.aId), sp.hg, sp.ag, f];
            if (sp.ie) z.push(sp.ie);
            ziel.s.push(z);
            spiele++;
            [[sp.hId, sp.h], [sp.aId, sp.a]].forEach(([id, nm]) => { if (/^hist_pk_/.test(id) && !namen[id]) namen[id] = (D.neu && D.neu[id]) || nm; });
        }
    }
    saisons.push({ y: s.y, r: runden.filter(x => x.s.length) });
}
const daten = { ids, namen, saisons };
const json = JSON.stringify(daten);
const version = crypto.createHash('sha1').update(json).digest('hex').slice(0, 10);
const kopf = `// ERZEUGT von tools/pokal_hist_einbau.mjs – nie von Hand ändern.\n// Historischer DFB-Pokal ${saisons[0].y}–${saisons[saisons.length - 1].y}: alle Hauptrunden-Spiele aus de.wikipedia (Saisonartikel),\n// Zählweise wie die offizielle Ewige Tabelle des DFB-Pokals. Format siehe Kopf von tools/pokal_hist_einbau.mjs.\n`;
fs.writeFileSync(path.join(ROOT, 'app', 'pokal_hist_data.js'), kopf + `const POKAL_HIST = ${JSON.stringify({ version, ...daten })};\n`);
console.log(`${saisons.length} Saisons, ${spiele} Spiele (${weg} ohne Tore weggelassen), ${ids.length} Vereine (${Object.keys(namen).length} neu) | ${(json.length / 1024).toFixed(0)} kB | Version ${version}`);
console.log('-> app/pokal_hist_data.js');
