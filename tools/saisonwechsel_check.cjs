// node tools/saisonwechsel_check.cjs [--kaputt]  – Exit 0 = Ableitung trifft jeden echten Wechsel (Herkunft + Zielebene)
// Abgeleitete Bewegungen (App._swBewegungen) gegen Engine.migrations des echten Saisonwechsels.
// Gegenprobe (--kaputt): Folgesaison = dieselbe Saison → muss durchfallen.
const fs = require('fs');
const ROOT = require('path').join(__dirname, '..') + '/';
global.localStorage = { getItem:()=>null, setItem:()=>{}, removeItem:()=>{} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16:s=>s, decompressFromUTF16:s=>s };
['game_data.js','app/history_data.js','game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT+f,'utf8').replace(/^const /gm,'var ')));
global.App = {};
eval.call(global, fs.readFileSync(ROOT + 'app/saisonwechsel.js', 'utf8'));
const kaputt = process.argv.includes('--kaputt');
Engine.init();
let fehler = 0;
const snaps = [];
for (let s = 0; s < 3; s++) {
    Engine.simulateFullSeason();
    const r = Engine.processSeasonTransition();
    const y = Engine.history[Engine.history.length - 1].year;
    const st = {}; Object.entries(r.stats).forEach(([l, s]) => st[l] = { old: s.old, neu: s.new });
    snaps.push({ y, mig: r.migrations.map(m => ({ ...m })), st });
}
// Erst NACH allen Wechseln ableiten: ältere Saisons laufen dann über history[i+1], die jüngste über Engine.teams
for (const { y, mig, st } of snaps) {
    if (kaputt) { const H = Engine.history; const i = H.findIndex(h => h.year === y); if (H[i + 1]) H[i + 1] = { ...H[i + 1], teams: H[i].teams }; }
    const d = App._swBewegungen(y);
    const ab = new Map(d.moves.map(m => [m.id, m]));
    // Netto je Verein aus der Engine-Liste (ein Verein kann mehrfach geschoben werden: erste Herkunft, letztes Ziel)
    const net = new Map();
    mig.forEach(m => { const e = net.get(m.id); net.set(m.id, { von: e ? e.von : (m.sortId || null), nach: m.toId || null, typ: m.type }); });
    let nachsort = 0, schein = 0, fehlt = 0, falsch = 0, typ = 0;
    for (const [id, e] of net) {
        if (e.von === e.nach) continue;
        const a = ab.get(id);
        if (!a) { const H = Engine.history, i = H.findIndex(h => h.year === y); const v = H[i].teams[id] && H[i].teams[id].leagueId; const n = H[i+1] ? (H[i+1].teams[id] && H[i+1].teams[id].leagueId) : (Engine.teams[id] && Engine.teams[id].leagueId); if (v === n && e.typ === 'heimat_leihe') schein++; else fehlt++; continue; }
        const L = l => l && Engine.leagues[l] ? Engine.leagues[l].level : null; // Herkunft: Ebene vergleichen – das Protokoll schreibt bei Heimat-Leihen die Heimatstaffel statt der gespielten Nachbarstaffel
        if (L(a.von) !== L(e.von) || L(a.nach) !== L(e.nach)) { falsch++; console.log('   falsch:', a.name, e.von, '->', e.nach, '/ abgeleitet', a.von, '->', a.nach); } else if (a.nach !== e.nach) nachsort++;
        const grob = t => t.includes('amateur') ? 'ama' : t.includes('up') ? 'up' : t.includes('down') ? 'down' : 'x';
        const grobA = a.art.startsWith('ama') ? 'ama' : a.art.includes('up') ? 'up' : a.art.includes('down') ? 'down' : 'x';
        if (grob(e.typ) !== 'x' && grob(e.typ) !== grobA) typ++;
    }
    const extra = d.moves.filter(m => !net.has(m.id));
    const arten = {}; d.moves.forEach(m => arten[m.art] = (arten[m.art] || 0) + 1);
    console.log(`${y} → ${d.next}: Engine ${net.size}, abgeleitet ${d.moves.length}, fehlt ${fehlt}, Schein-Leihe ${schein}, nachsortiert ${nachsort}, falsch ${falsch}, Art ${typ}, nur abgeleitet ${extra.length}`, JSON.stringify(arten));
    if (extra.length) console.log('   nur abgeleitet:', extra.slice(0, 5).map(m => `${m.name} ${m.von}→${m.nach} ${m.art}`).join(' | '));
    // Meister = je Liga genau einer (Platz 1); VP = alle VP-Einträge des Folge-Pokals, 2. Startplatz nur bei Verbänden mit zwei
    const H2 = Engine.history, i2 = H2.findIndex(h => h.year === y), vor = H2[i2].teams;
    const ligen = new Set(Object.values(vor).map(t => t.leagueId));
    const pk = H2[i2 + 1] ? H2[i2 + 1].pokal : Engine.pokal;
    const vpSoll = Object.values(pk.entrants).filter(e => e.type === 'VP');
    const proVb = {}; vpSoll.forEach(e => proVb[e.verband] = (proVb[e.verband] || 0) + 1);
    const zweitSoll = Object.values(proVb).filter(n => n > 1).length;
    const meisterOk = d.meister.length === ligen.size && new Set(d.meister.map(m => m.lid)).size === ligen.size;
    const vpOk = d.vp.length === vpSoll.length && d.vp.filter(m => m.zweit).length === zweitSoll && d.vp.length > 0;
    console.log(`   Meister ${d.meister.length}/${ligen.size} ${meisterOk ? 'ok' : 'FEHLER'} · VP ${d.vp.length}/${vpSoll.length}, 2. Startplatz ${d.vp.filter(m => m.zweit).map(m => m.lv).join('+')} ${vpOk ? 'ok' : 'FEHLER'}`);
    // Ligagrößen: vorher/nachher gegen die Engine-Statistik (old/new), und vorher − raus + rein = nachher
    let grFehl = 0, bilanzFehl = 0;
    for (const l in st) {
        if ((d.vorN[l] || 0) !== st[l].old || (d.nachN[l] || 0) !== st[l].neu) grFehl++;
        const rein = d.moves.filter(m => m.nach === l).length, raus = d.moves.filter(m => m.von === l).length;
        if ((d.vorN[l] || 0) - raus + rein !== (d.nachN[l] || 0)) bilanzFehl++;
    }
    console.log(`   Ligagrößen: ${Object.keys(st).length} Ligen, gegen Engine abweichend ${grFehl}, Bilanz falsch ${bilanzFehl}`);
    if (fehlt || falsch || typ || !d.moves.length || !meisterOk || !vpOk || grFehl || bilanzFehl) fehler++;
}
console.log(fehler ? `FEHLER in ${fehler} Saisons` : 'OK');
process.exit(fehler ? 1 : 0);
