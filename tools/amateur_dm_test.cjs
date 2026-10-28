// Prüfung app/amateur_dm_data.js (Deutsche Amateurmeisterschaft), s. docs/AMATEURMEISTERSCHAFT.md
//   node tools/amateur_dm_test.cjs              Exit 1 bei Befund
//   node tools/amateur_dm_test.cjs --selbsttest dieselben Prüfungen gegen absichtlich verdorbene Daten – müssen ALLE anschlagen
// Gegenquelle für Meister + Vize: Endspieltabelle des Hauptartikels (tools/wiki_amateur_sieger.json), nicht die Saisonartikel,
// aus denen der Einbau stammt. Dazu: jede ID auflösbar, Reserve passt zum damaligen Namen, genau ein Meister je Jahr.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.window = global;
for (const f of ['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/amateur_dm_data.js'])
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '));
const REF = JSON.parse(fs.readFileSync(ROOT + 'tools/wiki_amateur_sieger.json', 'utf8')).jahre;
const QUELLE = JSON.parse(fs.readFileSync(ROOT + 'tools/wiki_amateur_ids.json', 'utf8'));

const nameVon = (D, id) => (GAME_DATA.teams[id] || {}).name || (HISTORIC_CLUBS || {})[id] || HIST_EXT.vereine[id] || D.namen[id] || null;
const norm = s => String(s || '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/\(a(mateure)?\)|\bamateure\b|\bam\.|\s\/\s/g, ' ').replace(/[^a-z0-9]+/g, '');
// alle Schreibungen (Name + Link) einer ID in einem Jahr, aus den Einzelspielen
const schreibungen = {};
QUELLE.saisons.forEach(s => s.runden.forEach(r => {
    r.spiele.forEach(sp => [[sp.hId, sp.h, sp.hL], [sp.aId, sp.a, sp.aL]].forEach(([id, n, l]) => {
        const k = s.y + '|' + id; (schreibungen[k] = schreibungen[k] || new Set()).add(norm(n)); if (l) schreibungen[k].add(norm(l)); }));
    (r.tabelle || []).forEach(v => { const k = s.y + '|' + v.id; (schreibungen[k] = schreibungen[k] || new Set()).add(norm(v.name)); });
}));
const woerter = s => String(s).toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .split(/[^a-z]+/).filter(w => w.length >= 4 && w !== 'amateure');
// Rückrichtung: die Wörter der Spiel-Schreibung (nur normiert gespeichert) stecken im Referenznamen
const roh = {};
QUELLE.saisons.forEach(s => s.runden.forEach(r => r.spiele.forEach(sp => [sp.h, sp.a, sp.hL, sp.aL].forEach(n => { if (n) roh[norm(n)] = n; }))));
const woerterNorm = (s, rn) => { const w = woerter(roh[s] || ''); return w.length > 0 && w.every(x => norm(rn).includes(x)); };
const RES = /\((A|Am\.?)\)|\bAmateure\b|\sAm(at)?\.?$|\s(II|2)$|\bII\b/;

function pruefe(D) {
    const bef = [];
    const ys = Object.keys(D.jahre);
    if (ys.length !== 48 || ys[0] !== '1951' || ys[ys.length - 1] !== '1998') bef.push(`Jahre ${ys.length} (${ys[0]}–${ys[ys.length - 1]}) statt 48 (1951–1998)`);
    for (const y of ys) {
        const j = D.jahre[y], M = j.t.filter(x => x[1] === 'M'), ref = REF[y];
        if (M.length !== 1) { bef.push(`${y}: ${M.length} Meister`); continue; }
        if (j.t.length < 3) bef.push(`${y}: nur ${j.t.length} Teilnehmer`);
        // Schreibweisen weichen ab ("Bremen 1860" / "ATSV Bremen 1860", "SC Jülich 1910" / "SC Jülich 10"): alle Wörter ab 4 Buchstaben
        // der einen Schreibung stecken in der anderen – in einer der beiden Richtungen
        const passt = (id, r) => !!r && [r.name, r.link].filter(Boolean).some(rn => [...(schreibungen[y + '|' + id] || [])].some(s =>
            woerter(rn).every(w => s.includes(w)) || woerterNorm(s, rn)));
        if (ref && !passt(M[0][0], ref.meister)) bef.push(`${y}: Meister ${nameVon(D, M[0][0])} ≠ Hauptartikel ${ref.meister.name}`);
        const F = j.t.filter(x => x[1] === 'F');
        if (y !== '1998' && (F.length !== 1 || !passt(F[0][0], ref.vize))) bef.push(`${y}: Vize ${F.map(x => nameVon(D, x[0])).join('/') || '–'} ≠ Hauptartikel ${ref.vize.name}`);
        if (j.f && j.f[0] !== M[0][0]) bef.push(`${y}: Finale nennt einen anderen Meister`);
        const ids = new Set();
        j.t.forEach(([id, st, nm]) => {
            if (ids.has(id)) bef.push(`${y}: ${id} doppelt`); ids.add(id);
            const n = nameVon(D, id);
            if (!n) bef.push(`${y}: ${id} ohne Namen`);
            else if (RES.test(nm) !== / II$| Amateure$/.test(n)) bef.push(`${y}: Reserve passt nicht – ${nm} -> ${n}`);
        });
    }
    return bef;
}

if (process.argv.includes('--selbsttest')) {
    const kopie = () => JSON.parse(JSON.stringify(AMATEUR_DM));
    const faelle = {
        'Meister und Vize vertauscht': D => { const j = D.jahre['1958']; j.t.find(x => x[1] === 'M')[1] = 'X'; j.t.find(x => x[1] === 'F')[1] = 'M'; j.t.find(x => x[1] === 'X')[1] = 'F'; },
        // eine Reserve OHNE Finale, damit nicht schon der Meister-/Vize-Abgleich anschlägt
        'Reserve bei der Ersten': D => { for (const j of Object.values(D.jahre)) { const e = j.t.find(x => !/^[MF]$/.test(x[1]) && x[0] === 'svwerderbremenii_442');
            if (e) { e[0] = 'svwerderbremen_440'; return; } } throw new Error('kein Werder-II-Eintrag ohne Finale'); },
        'ID ohne Namen': D => { D.jahre['1953'].t[3][0] = 'gibtsnicht_1'; },
        'Jahr fehlt': D => { delete D.jahre['1998']; },
        'zwei Meister': D => { D.jahre['1970'].t[2][1] = 'M'; },
    };
    let ok = true;
    for (const [n, f] of Object.entries(faelle)) { const D = kopie(); f(D); const b = pruefe(D); console.log(`${b.length ? 'schlägt an' : 'BLEIBT GRÜN'}  ${n}${b.length ? ' – ' + b[0] : ''}`); if (!b.length) ok = false; }
    const sauber = pruefe(AMATEUR_DM);
    console.log(ok && !sauber.length ? 'Selbsttest OK' : 'Selbsttest FEHLGESCHLAGEN'); process.exit(ok && !sauber.length ? 0 : 1);
}
const b = pruefe(AMATEUR_DM);
const n = Object.values(AMATEUR_DM.jahre).reduce((a, j) => a + j.t.length, 0);
console.log(`${Object.keys(AMATEUR_DM.jahre).length} Jahre, ${n} Teilnahmen, Meister/Vize gegen Hauptartikel geprüft`);
b.forEach(x => console.log('BEFUND ' + x));
console.log(b.length ? `${b.length} Befunde` : 'OK');
process.exit(b.length ? 1 : 0);
