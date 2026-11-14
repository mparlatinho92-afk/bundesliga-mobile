// Prüfung Schritt 2 (Nutzer 14.11.2026): Sonder-Abstiege stehen zu einem realistischen Zeitpunkt fest und werden gemeldet
// (Engine.sonderMeldungen / _zwangPlan). Prüft headless über N Saisons:
//   (1) Die Meldungen am Saisonende sind GENAU die Zwangsabsteiger, die der Saisonwechsel zieht (archive.strafen art zwang),
//       samt Grund (g) – keine Meldung ohne Abstieg, kein Abstieg ohne Meldung.
//   (2) Zeitpunkt: Insolvenz bei 25–85 % der eigenen Spiele, kein Lizenzantrag bei 70–85 %, Lizenz/Abmeldung erst nach dem
//       letzten Spiel; Insolvenz/Antrag nur auf Ebene 3–4.
//   (3) „Spieltag rückgängig“: werden Ergebnisse zurückgenommen, verschwinden spätere Meldungen wieder.
//   (4) Verteilung der Arten je Ebene grob wie gezählt (ZWANG_ART) – nur bei genug Fällen.
//   node tools/sonder_meldung_check.cjs [saisons=40]
//   node tools/sonder_meldung_check.cjs 20 --kaputt    Gegenprobe: Meldung mit eigenem Würfel statt _strafeZahl → muss durchfallen
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.window = global;
const _log = console.log; console.log = () => {}; console.warn = () => {};
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const N = +process.argv[2] || 40, KAPUTT = process.argv.includes('--kaputt');
Engine.init();
if (KAPUTT) {   // Gegenprobe: eigener Würfel – Meldung und Saisonwechsel entscheiden nicht mehr dasselbe
    const orig = Engine._zwangPlan;
    Engine._zwangPlan = function (t, n) { const r = orig.call(this, t, n); if (r) return r;
        const l = this.leagues[t.leagueId]; return l && this._strafeZahl(t.id, 'anders') < this._strafeP(this.STRAFE_ZWANG, l.id) ? { art: 'lizenz', k: 2 * (n - 1) } : null; };
}
const fehler = [], f = s => { if (fehler.length < 30) fehler.push(s); else fehler.length++; };
const arten = {}, n = { meld: 0, zwang: 0, zg: 0, undo: 0 };
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();
    const y = Engine.getFormattedSeason();
    // (1)+(2) alle Meldungen am Saisonende
    const meld = new Map();
    Object.values(Engine.leagues).forEach(l => {
        const size = Object.values(Engine.teams).filter(t => t.leagueId === l.id).length, voll = 2 * Math.max(1, size - 1);
        Engine.sonderMeldungen(l.id).forEach(m => {
            if (m.art === 'zg') { n.zg++; return; }
            meld.set(m.id, m); n.meld++;
            (arten[l.level] = arten[l.level] || {})[m.art] = (arten[l.level][m.art] || 0) + 1;
            const q = m.k / voll;
            if (m.art === 'insolvenz' && (q < 0.24 || q > 0.86)) f(`${y} ${m.id}: Insolvenz bei ${(100 * q).toFixed(0)} %`);
            if (m.art === 'antrag' && (q < 0.69 || q > 0.86)) f(`${y} ${m.id}: kein Antrag bei ${(100 * q).toFixed(0)} %`);
            if ((m.art === 'lizenz' || m.art === 'abmeldung') && Engine.kalender && m.t !== (Engine.kalender.liga[l.id] || []).slice(-1)[0]) f(`${y} ${m.id}: ${m.art} nicht am letzten Spieltag gemeldet`);
            if ((m.art === 'insolvenz' || m.art === 'antrag') && ![3, 4].includes(l.level)) f(`${y} ${m.id}: ${m.art} auf Ebene ${l.level}`);
            if (m.art === 'lizenz' && l.level > 4) f(`${y} ${m.id}: Lizenz auf Ebene ${l.level}`);
            if (!m.md) f(`${y} ${m.id}: kein Spieltag`);
        });
    });
    // Diagnose für Abweichungen: wer zieht im Saisonwechsel das Zwangs-Los (1b), hat aber keine Meldung?
    const diag = {};
    Object.values(Engine.teams).forEach(t => { const l = Engine.leagues[t.leagueId]; if (!l || t.zg || meld.has(t.id)) return;
        const p = Engine._strafeP(Engine.STRAFE_ZWANG, l.id); if (!p || Engine._strafeZahl(t.id, 'zwang') >= p) return;
        const arr = Object.values(Engine.teams).filter(x => x.leagueId === l.id), g = Engine.seasonResults.filter(r => r.lid === l.id && (r.hId === t.id || r.aId === t.id)).length;
        diag[t.id] = `Liga ${l.id} n=${arr.length} gespielt ${g} Rückzugsplan ${JSON.stringify(Engine._rueckzugPlan(t, arr.length))} Plan ${JSON.stringify(Engine._zwangPlan(t, arr.length))}`; });
    // (3) Rückgängig: Ergebnisse auf die Hälfte kürzen -> Meldungen mit k > eigene Spiele verschwinden
    const SR = Engine.seasonResults, halb = SR.slice(0, Math.floor(SR.length / 2));
    const cmd = Engine.currentMatchday;
    Engine.seasonResults = halb; Engine.currentMatchday = Math.floor(cmd / 2);   // wie „Spieltag rückgängig“: Termin UND Ergebnisse zurück
    Object.values(Engine.leagues).forEach(l => Engine.sonderMeldungen(l.id).forEach(m => {
        if (m.art === 'zg') return;
        const g = halb.filter(r => r.lid === l.id && (r.hId === m.id || r.aId === m.id)).length;
        if (['lizenz', 'abmeldung'].includes(m.art)) f(`${y} ${m.id}: ${m.art} schon zur Saisonmitte gemeldet`);
        else if (g < m.k) f(`${y} ${m.id}: Meldung trotz ${g} < ${m.k} Spielen nach Rückgängig`); else n.undo++;
    }));
    Engine.seasonResults = SR; Engine.currentMatchday = cmd; Engine._smCache = {};
    Engine.processSeasonTransition();
    const st = (Engine.archive.strafen || {})[y] || [];
    const zw = st.filter(x => x.art === 'zwang');
    n.zwang += zw.length;
    zw.forEach(x => { const m = meld.get(x.id);
        if (!m) f(`${y} ${x.id}: Zwangsabstieg ohne Meldung – ${diag[x.id] || 'kein Zwangs-Los vor dem Wechsel'}`); else if (x.g !== m.art) f(`${y} ${x.id}: Grund ${x.g} ≠ Meldung ${m.art}`); meld.delete(x.id); });
    meld.forEach(m => f(`${y} ${m.id}: Meldung ${m.art}, aber kein Zwangsabstieg`));
}
// (4) Verteilung
const soll = { 3: { insolvenz: .15 }, 4: { insolvenz: .30, antrag: .35 } };
Object.entries(soll).forEach(([lv, s]) => { const a = arten[lv] || {}, sum = Object.values(a).reduce((x, y) => x + y, 0);
    if (sum < 12) return;
    Object.entries(s).forEach(([art, q]) => { const ist = (a[art] || 0) / sum; if (Math.abs(ist - q) > 0.25) f(`Ebene ${lv}: ${art} ${(100 * ist).toFixed(0)} % statt ~${100 * q} % (n=${sum})`); }); });
console.log = _log;
console.log(`${N} Saisons: ${n.meld} Zwangsabstiegs-Meldungen, ${n.zwang} Zwangsabstiege im Saisonwechsel, ${n.zg} Rückzüge, ${n.undo} Meldungen überstehen das Kürzen zu Recht`);
Object.keys(arten).sort((a, b) => a - b).forEach(lv => console.log(`  Ebene ${lv}: ${Object.entries(arten[lv]).map(([a, c]) => a + ' ' + c).join(', ')}`));
if (n.meld < 3) fehler.push(`nur ${n.meld} Meldungen – keine Aussage`);
console.log(fehler.length ? `BEFUND (${fehler.length}):\n  ` + fehler.filter(Boolean).join('\n  ') + (fehler.length > 30 ? `\n  … ${fehler.length - 30} weitere` : '') : 'Bestanden');
process.exit(fehler.length ? 1 : 0);
