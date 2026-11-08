// Punktabzug, Aufstiegsverzicht, Zwangsabstieg (Engine.STRAFE_*): simuliert N Saisons headless und vergleicht die Häufigkeit je
// Art mit dem Sollwert aus den Tabellen (= gemessene echte Anteile, tools/rueckzug_messung.cjs). Dazu: der Abzug überlebt
// „Spieltag rückgängig“ (Stats aus seasonResults neu + sortTables, wie app/save_manager.js), Ligalose landen im Amateurpokal.
// Aufruf: node tools/strafen_check.cjs [Saisons=40]   Exit 1 = Befund.   --selbsttest: Tabellen auf 0 – dann MUSS es durchfallen.
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f => (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const N = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '40');
const SELBST = process.argv.includes('--selbsttest');
Engine.init();
// Sollwerte immer aus den ECHTEN Tabellen (Kopie) – der Selbsttest nullt nur die Mechanik, nicht das Soll
const TAB = JSON.parse(JSON.stringify({ a: Engine.STRAFE_ABZUG, v: Engine.STRAFE_VERZICHT, z: Engine.STRAFE_ZWANG, r: Engine.STRAFE_RUECKZUG }));
const pSoll = (tab, lid) => { const l = Engine.leagues[lid], e = l && tab[l.level]; return e ? e[Engine._strafeOst(lid) ? 1 : 0] : 0; };
if (SELBST) ['STRAFE_ABZUG', 'STRAFE_VERZICHT', 'STRAFE_ZWANG', 'STRAFE_RUECKZUG'].forEach(k => { for (const l in Engine[k]) Engine[k][l] = [0, 0]; });
const befund = [];
const ist = { abzug: 0, verzicht: 0, zwang: 0, zwangLigalos: 0, zg: 0 }, soll = { abzug: 0, verzicht: 0, zwang: 0, zg: 0 }, zgArt = {};
let undoGeprueft = false;
for (let i = 0; i < N; i++) {
    // Sollwerte dieser Saison: Anteil × Mannschaften (Verzicht: je Aufstiegsplatz-Inhaber ≈ je Liga mit Aufstieg)
    Object.values(Engine.teams).forEach(t => { if (!t.leagueId) return;
        soll.abzug += pSoll(TAB.a, t.leagueId); soll.zwang += pSoll(TAB.z, t.leagueId); soll.zg += pSoll(TAB.r, t.leagueId); });
    Engine.simulateFullSeason();
    if (!undoGeprueft) {   // Rückgängig: Stats neu aufbauen wie undoLastMatchday, danach muss derselbe Abzug wieder stehen
        const vor = {}; Object.values(Engine.teams).forEach(t => { if (t.stats && t.stats.abzug) vor[t.id] = [t.stats.abzug, t.stats.pts]; });
        Object.values(Engine.teams).forEach(t => { t.stats = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, awayGf: 0 }; });
        const ap = (s, gf, ga) => { s.p++; s.gf += gf; s.ga += ga; if (gf > ga) { s.w++; s.pts += 3; } else if (gf < ga) s.l++; else { s.d++; s.pts += 1; } };
        Engine.seasonResults.forEach(r => { const h = Engine.teams[r.hId], a = Engine.teams[r.aId]; if (h && a && !r.an) { ap(h.stats, r.s1, r.s2); ap(a.stats, r.s2, r.s1); } });
        Engine.sortTables();
        const nach = {}; Object.values(Engine.teams).forEach(t => { if (t.stats && t.stats.abzug) nach[t.id] = [t.stats.abzug, t.stats.pts]; });
        const ok = JSON.stringify(vor) === JSON.stringify(nach) && Object.keys(vor).length > 0;
        console.log(`${ok ? '✓' : '✗'} Abzug nach „Rückgängig“ unverändert: ${Object.keys(vor).length} Vereine vorher, ${Object.keys(nach).length} nachher`);
        if (!ok) befund.push('Rückgängig verliert/ändert den Abzug');
        undoGeprueft = true;
    }
    const y = Engine.getFormattedSeason();
    // Rückzug während der Saison: steht letzter, A = 0 Spiele, Tabelle = nicht annullierte Ergebnisse (+ Abzug)
    Object.values(Engine.teams).filter(t => t.zg).forEach(t => {
        const ls = Object.values(Engine.teams).filter(x => x.leagueId === t.leagueId);
        const pts = {}; ls.forEach(x => pts[x.id] = 0);
        Engine.seasonResults.forEach(r => { if (r.lid !== t.leagueId || r.an) return; pts[r.hId] += r.s1 > r.s2 ? 3 : r.s1 === r.s2 ? 1 : 0; pts[r.aId] += r.s2 > r.s1 ? 3 : r.s1 === r.s2 ? 1 : 0; });
        const falschP = ls.filter(x => x.stats.pts !== pts[x.id] - (x.stats.abzug || 0)).length;
        // hinter allen nicht Zurückgezogenen; B: so viele Spiele wie die übrigen (kleine Ligen spielen mehr als eine Doppelrunde)
        const vollSp = Math.max(...ls.filter(x => !x.zg).map(x => x.stats.p)), nichtZg = ls.filter(x => !x.zg).length;
        const ok = t.rank > nichtZg && (t.zg.v !== 'A' || t.stats.p === 0) && !falschP && (t.zg.v !== 'B' || nichtZg < ls.length - 1 || t.stats.p === vollSp);
        if (!ok) befund.push(`${y} Rückzug ${t.name} (${t.zg.v}, nach Spiel ${t.zg.k}): Platz ${t.rank}/${ls.length}, Sp ${t.stats.p}, falsche Punkte bei ${falschP}`);
        zgArt[t.zg.v] = (zgArt[t.zg.v] || 0) + 1;
    });
    // Verzicht-Soll: je Liga mit Aufstieg der Anteil (Inhaber des ersten Aufstiegsplatzes)
    const zonen = Engine.calcZones();
    for (const lid in Engine.leagues) { const z = zonen[lid]; if (z && (z.fixUp || 0) > 0 && Engine.leagues[lid].level > 1) soll.verzicht += pSoll(TAB.v, lid); }
    Engine.processSeasonTransition();
    const st = (Engine.archive.strafen || {})[y] || [];
    st.forEach(s => { ist[s.art]++; if (s.art === 'zwang' && !s.nach) ist.zwangLigalos++; });
    // Ligalose aus dem Zwangsabstieg stehen im Amateurpokal der neuen Saison
    st.filter(s => s.art === 'zwang' && !s.nach).forEach(s => {
        const t = Engine.teams[s.id]; if (t && t.leagueId) befund.push(`${y} ${t.name}: ligalos erwartet, steht in ${t.leagueId}`);
    });
}
// Fester Fall: Zwangsabsteiger auf dem Relegationsplatz der 2. BL verliert die Relegation – zählte er doppelt, hätte die 2. BL 19
{
    Engine.simulateFullSeason();
    const t16 = Object.values(Engine.teams).filter(t => t.leagueId === '2').sort((a, b) => a.rank - b.rank)[15];
    const zahl = Engine._strafeZahl, spiel = Engine.simulateMatch;
    Engine._strafeZahl = function (id, art) { return SELBST ? zahl.call(this, id, art) : art === 'zwang' ? (id === t16.id ? 0 : 1) : art === 'zwangTief' ? 0.5 : 1; };
    Engine.simulateMatch = () => ({ score1: 0, score2: 1 });   // jede Relegation an den Unterklassigen
    Engine.processSeasonTransition();
    Engine._strafeZahl = zahl; Engine.simulateMatch = spiel;
    const n = lid => Object.values(Engine.teams).filter(t => t.leagueId === lid).length;
    const ok = n('1') === 18 && n('2') === 18 && n('3') === 20 && (SELBST || Engine.leagues[Engine.teams[t16.id].leagueId]?.level === 4);
    console.log(`${ok ? '✓' : '✗'} Zwangsabsteiger ${t16.name} auf Platz 16 der 2. BL, Relegation verloren: 1./2./3. Liga ${n('1')}/${n('2')}/${n('3')}, er spielt jetzt auf Ebene ${Engine.leagues[Engine.teams[t16.id].leagueId]?.level}`);
    if (!ok) befund.push('Relegationsplatz-Zwangsabsteiger: Ligagrößen ' + [n('1'), n('2'), n('3')].join('/'));
}
// Fester Fall „Die Zweite wird zur Ersten“: Erste (Ebene 4) mit Reserve eine Ebene tiefer wird Zwangsabsteiger -> die Erste übernimmt
// den Platz der Reserve, die Reserve wird ligalos; nie steht die Reserve danach über der Ersten
{
    Engine.simulateFullSeason();
    const lvl = t => (Engine.leagues[t.leagueId] || {}).level;
    // Erste auf Ebene 3–5, Reserve tiefer (genau 4/5 gibt es nach vielen Saisons nicht immer)
    const res = Object.values(Engine.teams).filter(r => r.isReserve && r.leagueId && Engine.teams[r.parentId] && Engine.teams[r.parentId].leagueId)
        .filter(r => { const e = lvl(Engine.teams[r.parentId]); return e >= 3 && e <= 5 && lvl(r) > e && lvl(r) <= e + 2; })
        .sort((a, b) => lvl(Engine.teams[a.parentId]) - lvl(Engine.teams[b.parentId]))[0];
    if (!res) { befund.push('kein Paar Erste (Ebene 3–5) / tiefere Reserve gefunden'); }
    else {
        const erste = Engine.teams[res.parentId], resLiga = res.leagueId, y = Engine.getFormattedSeason();
        const zahl = Engine._strafeZahl;
        Engine._strafeZahl = function (id, art) { return SELBST ? zahl.call(this, id, art) : art === 'zwang' ? (id === erste.id ? 0 : 1) : art === 'zwangTief' ? 0.5 : 1; };
        Engine.processSeasonTransition();
        Engine._strafeZahl = zahl;
        const st = (Engine.archive.strafen[y] || []);
        const eZ = st.find(s => s.id === erste.id && s.art === 'zwang'), rZ = st.find(s => s.id === res.id && s.art === 'platz');
        const ok = erste.leagueId === resLiga && !res.leagueId && eZ && eZ.tausch === res.id && rZ && rZ.fuer === erste.id;
        console.log(`${ok ? '✓' : '✗'} Zweite wird zur Ersten: ${erste.name} → ${Engine.leagues[erste.leagueId]?.name || 'ligalos'} (bisher Liga der ${res.name}: ${Engine.leagues[resLiga].name}), ${res.name} → ${res.leagueId ? Engine.leagues[res.leagueId].name : 'ligalos'}; archive: ${JSON.stringify([eZ, rZ])}`);
        if (!ok) befund.push('Zweite wird zur Ersten: ' + erste.name);
    }
    // Invariante über alle Vereine: keine Reserve über oder neben ihrer Ersten, die gerade Zwangsabsteiger war
    const bad = Object.values(Engine.teams).filter(r => r.isReserve && r.leagueId && Engine.teams[r.parentId] && !Engine.teams[r.parentId].nachbarStaffel
        && (Engine.archive.strafen[Engine.getFormattedSeason(Engine.currentSeasonOffset - 1)] || []).some(s => s.id === r.parentId && s.art === 'zwang')
        && (!Engine.teams[r.parentId].leagueId || lvl(r) <= lvl(Engine.teams[r.parentId])));
    console.log(`${bad.length ? '✗' : '✓'} keine Reserve über/neben ihrer zwangsabgestiegenen Ersten (${bad.map(r => r.name).join(', ') || '–'})`);
    if (bad.length) befund.push('Reserve über der Ersten: ' + bad.map(r => r.name).join(', '));
}
// „Spieltag rückgängig“ über den Rückzug hinweg (wie app/save_manager.js): Spieltag für Spieltag, bis ein Verein zurückzieht; dann den
// Spieltag zurücknehmen -> Rückzug weg, keine annullierten Spiele mehr; neu spielen -> Rückzug wieder da
{
    const zahl = Engine._strafeZahl;
    if (!SELBST) Engine._strafeZahl = function (id, art) { return art === 'rzs' ? 0 : zahl.call(this, id, art); };   // jeder hat einen Rückzugsplan
    if (Engine.currentMatchday >= Engine.totalMatchdays) Engine.processSeasonTransition();   // mit frischer Saison anfangen
    let X = null, mdX = 0;
    while (Engine.currentMatchday < Engine.totalMatchdays && !X) { Engine.playNextMatchday(); Engine.sortTables(); X = Object.values(Engine.teams).find(t => t.zg); mdX = Engine.currentMatchday; }
    if (!X) { console.log('✗ Rückgängig-Test: kein Rückzug ausgelöst'); befund.push('Rückgängig-Test: kein Rückzug'); }
    else {
        const vorZg = Object.values(Engine.teams).filter(t => t.zg).map(t => t.id).sort().join();
        // zurücknehmen wie undoLastMatchday
        const last = Engine.matchdayHistory[Engine.matchdayHistory.length - 1];
        Engine.seasonResults = Engine.seasonResults.slice(0, Engine.seasonResults.length - (last ? last.results.length : 0));
        Engine.matchdayHistory.pop(); Engine.currentMatchday--;
        Engine._rueckzugRueckgaengig();
        const ap = (s, gf, ga) => { s.p++; s.gf += gf; s.ga += ga; if (gf > ga) { s.w++; s.pts += 3; } else if (gf < ga) s.l++; else { s.d++; s.pts += 1; } };
        Object.values(Engine.teams).forEach(t => { t.stats = { p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, awayGf: 0 }; });
        Engine.seasonResults.forEach(r => { const h = Engine.teams[r.hId], a = Engine.teams[r.aId]; if (h && a && !r.an) { ap(h.stats, r.s1, r.s2); ap(a.stats, r.s2, r.s1); } });
        Engine.sortTables();
        const restZg = Object.values(Engine.teams).filter(t => t.zg && vorZg.split(',').includes(t.id) && t.id === X.id).length;
        const restAn = Engine.seasonResults.filter(r => r.an && (r.hId === X.id || r.aId === X.id)).length;
        Engine.playNextMatchday(); Engine.sortTables();
        const wieder = !!Engine.teams[X.id].zg;
        const ok = !restZg && !restAn && wieder;
        console.log(`${ok ? '✓' : '✗'} Rückzug ${X.name} an Termin ${mdX} (${X.zg ? X.zg.v : '?'}): nach „Rückgängig“ ${restZg ? 'noch zurückgezogen' : 'nicht mehr zurückgezogen'}, ${restAn} annullierte Spiele übrig; neu gespielt: ${wieder ? 'wieder zurückgezogen' : 'NICHT zurückgezogen'}`);
        if (!ok) befund.push('Rückgängig über den Rückzug: ' + X.name);
    }
    Engine._strafeZahl = zahl;
}
console.log(`\n${N} Saisons:`);
console.log(`  Rückzug während der Saison nach Wertungsart: ${JSON.stringify(zgArt)} (A annulliert, C Hinrunde, D bis Rückzug, B alles gewertet)`);
for (const art of ['abzug', 'verzicht', 'zwang', 'zg']) {
    const s = soll[art], i = ist[art];
    // Poisson-Toleranz: 3 Standardabweichungen, mindestens ±3
    const tol = Math.max(3, 3 * Math.sqrt(s));
    const ok = Math.abs(i - s) <= tol && !(s >= 3 && i === 0);
    console.log(`${ok ? '✓' : '✗'} ${art.padEnd(9)} ist ${String(i).padStart(4)}  soll ${s.toFixed(1).padStart(6)}  (±${tol.toFixed(1)})${art === 'zwang' ? `, davon ligalos ${ist.zwangLigalos}` : ''}`);
    if (!ok) befund.push(`${art}: ${i} statt ~${s.toFixed(1)}`);
}
console.log(befund.length ? `\n${befund.length} Befund(e)${SELBST ? ' – Selbsttest wie erwartet durchgefallen' : ''}:\n  ` + befund.slice(0, 8).join('\n  ') : '\nalles grün');
process.exit(befund.length ? 1 : 0);
