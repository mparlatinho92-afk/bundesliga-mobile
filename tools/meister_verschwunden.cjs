// Meister, die nach ihrem Titel in keiner Tabelle mehr auftauchen und keinen Verbleib haben (keine Fusion, kein
// Nachfolger ausserhalb, kein Spielverein) – Spur fuer fehlende Verbindungen (Nutzer 25.10.2026: „warum sollte ein
// Meister fuer immer verschwinden“, Anlass SG Dachwig/Doellstaedt -> FC An der Fahner Hoehe).
// Je Fall: Kandidaten = Vereine mit einem gemeinsamen Ortswort, die in den zwei Folgesaisons neu auftauchen.
// node tools/meister_verschwunden.cjs  -> docs/meister-verschwunden/liste.txt
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const R = path.join(__dirname, '..') + '/';
const ld = f => eval.call(global, fs.readFileSync(R + f, 'utf8').replace(/^const /gm, 'var '));
ld('game_data.js'); ld('app/history_data.js'); ld('app/history_ext.js');
const ext = JSON.parse(zlib.gunzipSync(Buffer.from(HIST_EXT.gz, 'base64')).toString());
const RM = HIST_EXT.remap || {};
const recs = HISTORY_SEED.seasons.map(s => ({ y: parseInt(s.y), lid: s.lid, rows: s.table }))
    .concat(ext.map(t => ({ y: parseInt(t.y), lid: t.lid, rows: t.rows })));
const S = 2025;
const name = id => (GAME_DATA.teams[id] || {}).name || HIST_EXT.vereine[id] || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id]) || id;
const liga = lid => (GAME_DATA.leagues[lid] || HIST_EXT.ligen[lid] || {}).name || lid;
const jahre = {}, wo = {};
recs.forEach(r => r.rows.forEach(z => { const id = RM[z.id] || z.id; (jahre[id] = jahre[id] || new Set()).add(r.y); (wo[id + '|' + r.y] = wo[id + '|' + r.y] || []).push(r.lid); }));
for (const id in GAME_DATA.teams) if (GAME_DATA.teams[id].leagueId) { (jahre[id] = jahre[id] || new Set()).add(S); wo[id + '|' + S] = [GAME_DATA.teams[id].leagueId]; }
const vg = new Set(Object.values(HIST_EXT.fusion || {}).flatMap(f => f.vorgaenger)), X = HIST_EXT.nachfolgerExtern || {};
const STOP = new Set('sv fc sg tsv vfb vfl sc fsv ssv tus spvgg bsg sportfreunde eintracht union borussia germania fortuna viktoria concordia blau weiss weiß rot grün gelb schwarz 1 e v ev 03 04 05 06 07 08 09 ii iii amateure motor stahl chemie empor aktivist dynamo lok lokomotive einheit traktor turbine vorwärts wismut fortschritt aufbau post rotation 1. fsg jsg djk kickers sportclub verein fußball fussball city mitte süd nord ost west'.split(' '));
const worte = n => String(n).toLowerCase().replace(/[^a-zäöüß0-9 -]/g, ' ').split(/[\s/-]+/).filter(w => w.length > 3 && !STOP.has(w) && !/^\d+$/.test(w));
const faelle = [];
recs.forEach(r => {
    if (r.y >= S - 1) return;
    r.rows.forEach(z => {
        if (z.rank !== 1) return;
        const id = RM[z.id] || z.id;
        if (GAME_DATA.teams[id] || vg.has(id) || X[id]) return;
        if ([...jahre[id]].some(j => j > r.y)) return;
        // Abkuerzungen der Quelle („Braunsch.“, „Arm.“, „Watzenb.“): Ortswort passt auch als Vorsilbe (mind. 4 Zeichen)
        const w = worte(name(id).replace(/\./g, ' '));
        const passt = n => worte(n).some(x => w.some(v => x === v || (v.length >= 4 && x.startsWith(v)) || (x.length >= 4 && v.startsWith(x))));
        const spanne = k => { const a = [...jahre[k]].sort((p, q) => p - q); return a[0] + '–' + a[a.length - 1]; };
        const kand = Object.keys(jahre).filter(k => k !== id && passt(name(k)) && ([r.y + 1, r.y + 2].some(j => jahre[k].has(j)) || GAME_DATA.teams[k]))
            .slice(0, 8).map(k => `${name(k)} [${k}] ${spanne(k)}${GAME_DATA.teams[k] ? ' (Spielverein)' : ''}: ${(wo[k + '|' + (r.y + 1)] || wo[k + '|' + (r.y + 2)] || []).map(liga).join(', ')}`);
        const alt = [...jahre[id]].sort((a, b) => a - b);
        faelle.push({ y: r.y, txt: `${r.y}/${String(r.y + 1).slice(-2)}  ${liga(r.lid)}  –  ${name(id)} [${id}]  (Saisons ${alt[0]}–${alt[alt.length - 1]}, ${alt.length}×)\n`
            + (kand.length ? kand.map(k => '      ? ' + k).join('\n') : '      (kein Kandidat im Bestand)') });
    });
});
faelle.sort((a, b) => b.y - a.y);
fs.mkdirSync(R + 'docs/meister-verschwunden', { recursive: true });
fs.writeFileSync(R + 'docs/meister-verschwunden/liste.txt', `Meister ohne Folgesaison und ohne Verbleib (${faelle.length}) – Stand ${new Date().toISOString().slice(0, 10)}\n`
    + 'Kandidat = Verein mit gemeinsamem Ortswort, der in den zwei Folgesaisons erstmals auftaucht\n\n' + faelle.map(f => f.txt).join('\n') + '\n');
console.log(faelle.length + ' Faelle, mit Kandidat: ' + faelle.filter(f => !/kein Kandidat/.test(f.txt)).length);
