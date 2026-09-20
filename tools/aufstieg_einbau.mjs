// EINBAU: tools/wiki_aufstiegsrunden_ids.json -> app/aufstieg_data.js (erzeugt, nie von Hand aendern)
//
//   node tools/wiki_aufstiegsrunden.mjs && node tools/wiki_aufstieg_zuordnung.mjs && node tools/aufstieg_einbau.mjs
//
// GRUNDSATZ (Nutzerentscheidung 20.09.2026): Aufstiegsrunden sind KEINE Liga-Saison. Sie duerfen nie in eine
// Ewige Tabelle fliessen – dort staenden sonst Ligafremde, und die in der Gruppe Gescheiterten waeren fuer ihr
// Scheitern mit einem Eintrag belohnt. Darum ein eigener Datentyp neben dem Pokal, mit eigener Statistik-Sparte
// (Teilnahmen/Aufstiege je Verein).
//
// Die 27 Saisons des bestehenden RELEGATION_SEED (1.BL<->2.BL) bleiben dessen Sache – gegengeprueft: beide Quellen
// nennen dort dieselben Paarungen, 27 von 27, keine Abweichung. Hier stehen sie mit `rs:1` und werden beim Falten
// uebersprungen, damit die Relegationsbilanz sie nicht doppelt zaehlt.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
globalThis.window = globalThis;
globalThis.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
globalThis.document = { getElementById: () => null };
globalThis.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
const lade = f => (0, eval)(fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/^const /gm, 'var '));
['game_data.js', 'app/history_data.js', 'app/history_ext.js'].forEach(lade);
const GD = globalThis.GAME_DATA, HC = globalThis.HISTORIC_CLUBS, REL = globalThis.RELEGATION_SEED;
const HEXT = globalThis.HIST_EXT;
const D = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_aufstiegsrunden_ids.json'), 'utf8'));

const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
const relJahre = new Set(Object.keys(REL.seasons || {}).map(y => parseInt(y)));
const bekannt = id => !!(GD.teams[id] || HC[id] || (HEXT.vereine || {})[id]);

// Namen der Vereine, die es sonst nirgends gibt (hist_ar_*) – die App braucht sie fuer die Anzeige
const eigene = {};
const merke = id => { if (!bekannt(id) && D.neu && D.neu[id]) eigene[id] = D.neu[id]; };

// Die laufende Spielsaison ist noch nicht gespielt: alles ab dem Jahr NACH der letzten Seed-Saison bleibt draußen.
// Sonst staende im Spiel am Start von 2025/26 schon das echte Relegationsergebnis dieser Saison.
const LETZTES = Math.max(...(globalThis.HISTORY_SEED.seasons || []).map(x => parseInt(x.y)));
let weggelassen = 0;

// Herkunftsliga je Teilnehmer: in welcher Liga stand dieser Verein in DIESER Saison? Steht in den
// Abschlusstabellen (Seed + Erweiterung) und ist derselbe Beleg, der schon die Vereinszuordnung trug.
// Ohne sie sieht eine Regionalliga ihre eigenen Aufstiegsduelle nicht: die Relegations-Ansicht filtert
// auf lH/lA/lW, und mit nur lW (Ziel-Liga) erscheint das Duell allein bei der Liga darueber.
const EXTTAB = JSON.parse(zlib.gunzipSync(Buffer.from(HEXT.gz, 'base64')).toString());
const ligaVon = {};   // "y|teamId" -> lid
const merkeLiga = (y, lid, rows) => (rows || []).forEach(r => { const k = y + '|' + r.id; if (!ligaVon[k]) ligaVon[k] = lid; });
(globalThis.HISTORY_SEED.seasons || []).forEach(x => merkeLiga(parseInt(x.y), x.lid, x.table));
EXTTAB.forEach(t => merkeLiga(parseInt(t.y), t.lid, t.rows));
const herkunft = (y, id) => ligaVon[y + '|' + id] || null;
let mitHerkunft = 0, ohneHerkunft = 0;

const runden = [];
for (const a of D.abschnitte) {
    if (a.y > LETZTES) { weggelassen++; continue; }
    const r = { y: a.y, ziel: a.ziel };
    if (a.gruppen.length) r.gr = a.gruppen.map(g => g.rows.map(z => {
        merke(z.id);
        const o = { i: z.id, r: z.rank, s: z.s, u: z.u, n: z.n, gf: z.gf, ga: z.ga };
        if (z.auf) o.a = 1;
        return o;
    }));
    const duell = (x, rs) => { merke(x.hId); merke(x.aId);
        const o = { h: x.hId, a: x.aId }; if (x.ges) o.g = x.ges; if (x.hin) o.hi = x.hin; if (x.rueck) o.re = x.rueck;
        if (x.siegerIstHeim) o.w = 1; if (rs) o.rs = 1;
        const lh = herkunft(a.y, x.hId), la = herkunft(a.y, x.aId);
        if (lh) o.lh = lh; if (la) o.la = la;
        lh && la ? mitHerkunft++ : ohneHerkunft++;
        return o; };
    // K.-o.-Duelle. Ziel '1' in einer RELEGATION_SEED-Saison: markiert, nicht doppelt gefaltet.
    if (a.duelle.length) r.du = a.duelle.map(x => duell(x, a.ziel === '1' && relJahre.has(a.y)));
    // Spiele einer Gruppenphase – NIE ein Duell mit Sieger (sonst zaehlt die Bilanz sechs Relegationen)
    if (a.gruppenspiele && a.gruppenspiele.length) r.gs = a.gruppenspiele.map(x => duell(x, 0));
    if (a.spiele.length) r.sp = a.spiele.map(x => { merke(x.hId); merke(x.aId);
        return { h: x.hId, a: x.aId, e: x.erg, w: x.siegerIstHeim ? 1 : 0 }; });
    if (a.direktIds && a.direktIds.length) { a.direktIds.forEach(x => merke(x.id));
        r.di = a.direktIds.map(x => x.id);
        const dl = a.direktIds.map(x => herkunft(a.y, x.id));
        if (dl.some(Boolean)) r.dl = dl;   // Herkunftsliga je Direktaufsteiger (gleiche Reihenfolge wie di)
    }
    // Begruendungen aus den Fussnoten (Verzicht, fehlende Lizenz, Reserve) – erklaeren die Luecke,
    // wenn ein Meister nicht in der Aufstiegsrunde steht
    const fn = (a.fnIds || []).filter(f => f.txt);
    if (fn.length) r.fn = fn.map(f => (f.id ? { i: f.id, t: f.txt } : { t: f.txt }));
    runden.push(r);
}

// Eine ID, die weder game_data noch ein historischer Verein noch hier benannt ist, wuerde als roher Schluessel angezeigt
const namenlos = [...new Set(runden.flatMap(r => [
    ...(r.gr || []).flat().map(z => z.i), ...(r.du || []).flatMap(d => [d.h, d.a]),
    ...(r.gs || []).flatMap(d => [d.h, d.a]), ...(r.sp || []).flatMap(d => [d.h, d.a]), ...(r.di || [])]))]
    .filter(id => !bekannt(id) && !eigene[id]);
if (namenlos.length) throw new Error('IDs ohne Namen: ' + namenlos.join(', '));

const json = JSON.stringify(runden);
const version = crypto.createHash('sha1').update(json).digest('hex').slice(0, 10);
const zahl = {
    runden: runden.length,
    gruppen: runden.reduce((a, r) => a + (r.gr || []).length, 0),
    gruppenzeilen: runden.reduce((a, r) => a + (r.gr || []).reduce((b, g) => b + g.length, 0), 0),
    duelle: runden.reduce((a, r) => a + (r.du || []).length, 0),
    hinweise: runden.reduce((a, r) => a + (r.fn || []).length, 0),
    hinweiseZugeordnet: runden.reduce((a, r) => a + (r.fn || []).filter(f => f.i).length, 0),
    davonSeed: runden.reduce((a, r) => a + (r.du || []).filter(d => d.rs).length, 0),
    gruppenspiele: runden.reduce((a, r) => a + (r.gs || []).length, 0),
    spiele: runden.reduce((a, r) => a + (r.sp || []).length, 0),
    direkt: runden.reduce((a, r) => a + (r.di || []).length, 0),
};

const kopf = `// ERZEUGT von tools/aufstieg_einbau.mjs – nicht von Hand ändern.
// Aufstiegsrunden, Entscheidungsspiele und Relegation zu Bundesliga, 2. Bundesliga und 3. Liga (Quelle: Wikipedia,
// die drei Sammelartikel "Aufstieg zur ..."), ${saison(Math.min(...runden.map(r => r.y)))}–${saison(Math.max(...runden.map(r => r.y)))}.
// ${zahl.runden} Runden: ${zahl.gruppen} Gruppen (${zahl.gruppenzeilen} Zeilen), ${zahl.duelle} K.-o.-Duelle, ${zahl.gruppenspiele} Gruppenspiele,
// ${zahl.spiele} Einzelspiele, ${zahl.direkt} Direktaufsteiger.
//
// KEINE Liga-Saison: fliesst NIE in eine Ewige Tabelle (dort staenden Ligafremde, und Gescheiterte bekaemen einen
// Eintrag fuer ihr Scheitern). Eigene Statistik-Sparte: Teilnahmen und Aufstiege je Verein.
// Felder je Runde: y Saison-Startjahr | ziel Liga, in die aufgestiegen wird | gr Gruppen [[Zeilen]] | du K.-o.-Duelle
//   | gs Spiele einer Gruppenphase (kein Duell!) | sp Einzelspiele | di Direktaufsteiger
// Zeile: i ID, r Platz, s/u/n, gf/ga, a=1 aufgestiegen. Duell: h/a IDs, g Gesamt, hi/re Hin/Rueck, w=1 Heim gewann,
//   rs=1 steht schon im RELEGATION_SEED (dort gefaltet, hier nur zur Anzeige).
`;
const out = kopf + 'var AUFSTIEG_SEED = {\n'
    + `    version: ${JSON.stringify(version)},\n`
    + `    vereine: ${JSON.stringify(eigene)},\n`
    + `    runden: [\n${runden.map(r => '        ' + JSON.stringify(r)).join(',\n')}\n    ]\n};\n`;
fs.writeFileSync(path.join(ROOT, 'app/aufstieg_data.js'), out);

console.log('Runden ' + zahl.runden + ' | Gruppen ' + zahl.gruppen + ' (' + zahl.gruppenzeilen + ' Zeilen)'
    + ' | Duelle ' + zahl.duelle + ' (davon ' + zahl.davonSeed + ' schon im RELEGATION_SEED)'
    + ' | Gruppenspiele ' + zahl.gruppenspiele + ' | Einzelspiele ' + zahl.spiele + ' | Direkt ' + zahl.direkt);
console.log('Herkunftsliga der Duell-Teilnehmer: ' + mitHerkunft + ' vollstaendig, ' + ohneHerkunft + ' unvollstaendig');
console.log('Hinweise aus Fussnoten: ' + zahl.hinweise + ' (davon ' + zahl.hinweiseZugeordnet + ' einem Verein zugeordnet)');
console.log('nicht uebernommen (laufende/kuenftige Saison nach ' + saison(LETZTES) + '): ' + weggelassen + ' Runden');
console.log('eigene Vereinsnamen: ' + Object.keys(eigene).length + (Object.keys(eigene).length ? ' (' + Object.values(eigene).join(', ') + ')' : ''));
console.log('app/aufstieg_data.js ' + (out.length / 1024).toFixed(0) + ' KB, version ' + version);
