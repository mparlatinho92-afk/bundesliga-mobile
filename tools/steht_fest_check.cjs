// Prüfung Schritt 3 (Nutzer 14.11.2026): „steht fest“-Kennzeichen (Engine.stehtFest) kommen nie zu früh.
// Je Saison und Liga wird jeder Liga-Spieltag nachgerechnet (stehtFest(lid, md)) und am Ende gegen den echten Ausgang gehalten:
//   meister → Endplatz 1 · cl/el/ecl → Endplatz ≤ 4/5/6 (Bundesliga, mindestens sicher) · auf → in der Folgesaison höher · rele_up → am Saisonende im
//   Relegationsplatz (aufstiegsZonen 'var') · rele_down → Endplatz 16 (Liga 1/2) · ab → in der Folgesaison tiefer oder ligalos
//   (Ausnahme: ein Zwangsabsteiger derselben Liga hat ihn gerettet – wie Havelse 2026; gezählt, nicht als Fehler)
// Dazu: einmal fest bleibt fest (Spieltag für Spieltag), und es gibt genug Fälle (sonst keine Aussage).
//   node tools/steht_fest_check.cjs [saisons=8]
//   node tools/steht_fest_check.cjs 4 --kaputt    Gegenprobe: Restspiele ignoriert (alles stünde sofort fest) → muss durchfallen
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.window = global;
const _log = console.log; console.log = () => {}; console.warn = () => {};
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const N = +process.argv[2] || 8, KAPUTT = process.argv.includes('--kaputt');
Engine.init();
const LOG = []; { const ol = Engine.log; Engine.log = function (lv, msg) { LOG.push(String(msg)); return ol.apply(this, arguments); }; }
const logZu = id => { const nm = (Engine.teams[id] || {}).name || id; return LOG.filter(m => m.includes(nm)).slice(0, 3).join(' / ') || 'kein Log'; };
if (KAPUTT) {   // Restspiele verstecken: Spielplan nur bis zum angefragten Spieltag – dann stünde alles sofort fest
    const orig = Engine.stehtFest;
    Engine.stehtFest = function (lid, md, z) {
        if (md == null) return orig.call(this, lid, md, z);
        const s = this.schedule, kurz = {};
        Object.entries(s).forEach(([k, ms]) => kurz[k] = (ms || []).filter(m => m.lid !== lid || (m.md || 0) <= md));
        this.schedule = kurz; try { return orig.call(this, lid, md, z); } finally { this.schedule = s; }
    };
}
const fehler = [], f = s => { if (fehler.length < 30) fehler.push(s); else fehler.length++; };
const zahl = {}, gerettet = { n: 0 };
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason(); Engine.sortTables();
    const y = Engine.getFormattedSeason(), zonen = Engine.calcZones();
    const fest = {};   // lid -> id -> { art, md }
    const vorher = {};
    for (const lid of Object.keys(Engine.leagues)) {
        const L = (Engine.kalender && Engine.kalender.liga[lid]) || [];
        const mds = L.length || 0;
        if (!mds) continue;
        const merk = {};
        let prev = {};
        for (let md = 1; md <= mds; md++) {
            const st = Engine.stehtFest(lid, md, zonen);
            Object.entries(prev).forEach(([id, a]) => { if (st[id] !== a && !(a === 'rele_up' && st[id] === 'auf') && !(['cl', 'el', 'ecl'].includes(a) && (String(st[id]).startsWith('meister') || ['cl', 'el'].includes(st[id]))) && !(a === 'rele_down' && st[id] === 'ab') && !(['auf', 'rele_up'].includes(a) && String(st[id]).startsWith('meister')) && !(a.startsWith('meister') && String(st[id]).startsWith('meister') && (md === mds || st[id] === 'meister_nein')) && !((a === 'ab' || a === 'rele_down' || a === 'auf' || a === 'rele_up') && md === mds))
                f(`${y} ${lid} ${id}: ${a} an Spieltag ${md - 1}, an ${md} ${st[id] || 'nichts'}`); });
            Object.entries(st).forEach(([id, a]) => { if (!merk[id] || merk[id].art !== a) merk[id] = { art: a, md }; });
            prev = st;
        }
        fest[lid] = merk;
    }
    // Ausgang vor dem Wechsel
    const lvlVor = {}, rank = {}, size = {}, az = {};
    Object.values(Engine.teams).forEach(t => { if (t.leagueId) { lvlVor[t.id] = Engine.leagues[t.leagueId].level; rank[t.id] = t.rank; } });
    Object.keys(Engine.leagues).forEach(lid => { const ts = Object.values(Engine.teams).filter(t => t.leagueId === lid).sort((a, b) => a.rank - b.rank);
        size[lid] = ts.length; Object.assign(az, Engine.aufstiegsZonen(lid, ts, zonen)); });
    LOG.length = 0;
    Engine.processSeasonTransition();
    const zwangId = new Set(((Engine.archive.strafen || {})[y] || []).filter(x => x.art === 'zwang' || x.art === 'zg').map(x => x.id));
    const zwangLiga = new Set(((Engine.archive.strafen || {})[y] || []).filter(x => x.art === 'zwang' || x.art === 'zg' || x.art === 'platz').map(x => x.lid));   // platz: „Zweite wird zur Ersten“ belegt einen Abstiegsplatz
    const lvlNach = id => { const t = Engine.teams[id]; return t && t.leagueId ? Engine.leagues[t.leagueId].level : 99; };
    Object.entries(fest).forEach(([lid, m]) => Object.entries(m).forEach(([id, { art, md }]) => {
        zahl[art] = (zahl[art] || 0) + 1;
        const r = rank[id], vor = lvlVor[id], nach = lvlNach(id), tag = `${y} ${Engine.leagues[lid].name} ${id} (${art} ab Spieltag ${md}, Endplatz ${r}/${size[lid]})`;
        if (art.startsWith('meister') && r !== 1) f(tag + ': nicht Meister');
        if (art === 'meister_auf' && !(nach < vor) && !zwangId.has(id)) f(tag + `: Meister mit ✓, aber nicht aufgestiegen (Ebene ${vor} → ${nach}) – ${logZu(id)}`);
        if (art === 'meister_nein' && nach < vor) f(tag + ': Meister mit ✗, aber aufgestiegen');
        if (art === 'meister_rele' && az[id] !== 'var') f(tag + `: Meister mit ↕, am Ende ${az[id] || 'kein'} statt Aufstiegsspiel`);
        if (art === 'cl' && r > 4) f(tag + ': keine Champions League');
        if (art === 'el' && r > 5) f(tag + ': keine Europa League');
        if (art === 'ecl' && r > 6) f(tag + ': kein Europaplatz');
        if (art === 'auf' && !(nach < vor) && !zwangId.has(id)) f(tag + `: nicht aufgestiegen (Ebene ${vor} → ${nach}) – ${logZu(id)}`);
        if (art === 'rele_up' && az[id] !== 'var') f(tag + `: am Ende ${az[id] || 'kein'} statt Relegation`);
        if (art === 'rele_down' && r !== size[lid] - 2) f(tag + ': nicht Platz 16');
        if (art === 'ab' && !(nach > vor)) { if (zwangLiga.has(lid)) gerettet.n++; else f(tag + `: nicht abgestiegen (Ebene ${vor} → ${nach}, jetzt ${(Engine.teams[id] || {}).leagueId}) – ${logZu(id)}`); }
    }));
}
console.log = _log;
console.log(`${N} Saisons: ${Object.entries(zahl).map(([a, c]) => a + ' ' + c).join(', ')}; durch Zwangsabsteiger gerettet ${gerettet.n}`);
['auf', 'ab'].forEach(a => { if ((zahl[a] || 0) < 3) fehler.push(`nur ${zahl[a] || 0} × ${a} – keine Aussage`); });
console.log(fehler.length ? `BEFUND (${fehler.length}):\n  ` + fehler.filter(Boolean).join('\n  ') + (fehler.length > 30 ? `\n  … ${fehler.length - 30} weitere` : '') : 'Bestanden');
process.exit(fehler.length ? 1 : 0);
