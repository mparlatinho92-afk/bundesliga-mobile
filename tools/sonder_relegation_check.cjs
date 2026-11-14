// Prüfung der Sonder-Relegation (Engine._sonderRelegation, Nutzer 14.11.2026): freie Plätze in einer Bodenliga, die kein
// Amateurpokal-Aufsteiger füllt, gehen an die im Amateurpokal am weitesten gekommenen Ligalosen derselben Heimat – nie nach Stärke.
//   node tools/sonder_relegation_check.cjs [saisons=30]          Prüfung
//   node tools/sonder_relegation_check.cjs 30 --kaputt           Gegenprobe: der Stärkste rückt nach wie früher → muss durchfallen
//   node tools/sonder_relegation_check.cjs 40 --kaputt-reserve   Gegenprobe: Reserve-Sperre aus → muss durchfallen (6)
// Prüft je Saisonwechsel: (1) Aufsteiger ⊆ Teilnehmer, alle stehen danach in der Liga; (2) Spiele schlüssig (Sieger aus der Paarung,
// Aufsteiger = Sieger der letzten Spiele bzw. direkt); (3) kein Ligaloser außerhalb des Felds kam weiter als ein Teilnehmer
// (gleiche Heimat-Bodenliga); (4) jeder Nachrücker stammt aus einer Sonder-Relegation; (5) Pyramide schrumpft nicht
// (Vereine in Ligen vor/nach dem Wechsel, Fehlbetrag nur, wo es zu wenig Kandidaten gab).
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.window = global;
const _log = console.log; console.log = () => {}; console.warn = () => {};
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const N = +process.argv[2] || 30, KAPUTT = process.argv.includes('--kaputt'), KAPUTT_RES = process.argv.includes('--kaputt-reserve');
Engine.init();

if (KAPUTT) {   // Gegenprobe: erster Aufsteiger wird durch den stärksten Ligalosen außerhalb des Felds ersetzt
    const orig = Engine._sonderRelegation;
    Engine._sonderRelegation = function (lid, k, A, aus) {
        const r = orig.call(this, lid, k, A, aus), feld = new Set(r.kand.map(c => c.id));
        const st = Object.values(this.teams).filter(t => !t.leagueId && !feld.has(t.id) && this.amateurTargetLeagueId(t) === lid)
            .sort((a, b) => (b.strength || 0) - (a.strength || 0))[0];
        if (st && r.auf.length) r.auf[0] = st.id;
        return r;
    };
}
if (KAPUTT_RES) {   // Gegenprobe Reserve-Sperre: während der Auswahl darf jeder aufsteigen
    const orig = Engine._sonderRelegation, darf = Engine._darfAufsteigen;
    Engine._sonderRelegation = function (...a) { this._darfAufsteigen = () => true; try { return orig.apply(this, a); } finally { this._darfAufsteigen = darf; } };
}
const fehler = [], f = (s) => { if (fehler.length < 40) fehler.push(s); else fehler.length++; };
let nRes = 0, nSR = 0, nAuf = 0, nSpiele = 0, nNb = 0, nKurz = 0, formate = {};
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();
    const vorher = Object.values(Engine.teams).filter(t => t.leagueId).length;
    const A = JSON.parse(JSON.stringify(Engine.amateurpokal || {}));
    const tiefe = id => { let r = -1; (A.rounds || []).forEach((rd, i) => (rd.matches || []).forEach(m => { if (m.winnerId != null && (m.hId === id || m.aId === id)) r = i; })); return r; };
    const ligalosVorher = new Set(Object.values(Engine.teams).filter(t => !t.leagueId).map(t => t.id));
    Engine.processSeasonTransition();
    const nachher = Object.values(Engine.teams).filter(t => t.leagueId).length;
    const snap = (Engine.history[Engine.history.length - 1] || {}).amateurpokal || {};
    const SR = snap.sonder || [], jahr = Engine.history[Engine.history.length - 1].year;
    let kurz = 0;
    SR.forEach(sr => {
        nSR++; nAuf += sr.auf.length; nSpiele += sr.spiele.length; if (sr.nb) nNb++;
        const key = `frei ${sr.frei} · ${sr.kand.length} Kand. → ${sr.spiele.map(m => m.r[0]).join('') || 'direkt'}`; formate[key] = (formate[key] || 0) + 1;
        const lname = (Engine.leagues[sr.lid] || {}).name || sr.lid;
        if (sr.auf.length < sr.frei) { kurz += sr.frei - sr.auf.length; nKurz++; if (sr.kand.length >= sr.frei) f(`${jahr} ${lname}: ${sr.frei} frei, ${sr.kand.length} Kandidaten, aber nur ${sr.auf.length} auf`); }
        const feld = new Set(sr.kand.map(c => c.id));
        sr.auf.forEach(id => {
            if (!feld.has(id)) f(`${jahr} ${lname}: Aufsteiger ${Engine.teams[id].name} war nicht im Feld`);
            // danach darf der Staffel-Ausgleich ihn in die Nachbarstaffel (gleicher Elternknoten) schieben
            const ist = Engine.teams[id].leagueId;
            if (ist !== sr.lid && !(ist && Engine.UP_MAP[ist] === Engine.UP_MAP[sr.lid])) f(`${jahr} ${lname}: Aufsteiger ${Engine.teams[id].name} steht in ${Engine.teams[id].leagueId}`);
            // (6) Reserve-Sperre: nie neben/über die Erste
            const t6 = Engine.teams[id];
            if (t6.isReserve) { nRes++; const par = Engine.teams[t6.parentId], pl = par && Engine.leagues[par.leagueId] ? Engine.leagues[par.leagueId].level : 0, rl = (Engine.leagues[ist] || {}).level || 0;
                if (pl && rl <= pl && !t6.nachbarStaffel) f(`${jahr} ${lname}: Reserve ${t6.name} (Ebene ${rl}) neben/über der Ersten (Ebene ${pl})`); }
        });
        sr.spiele.forEach(m => { if (m.winnerId !== m.hId && m.winnerId !== m.aId) f(`${jahr} ${lname}: Sieger nicht aus der Paarung`); });
        const fin = sr.spiele.filter(m => m.r === 'Finale');
        if (sr.frei === 1 && fin.length === 1 && sr.auf[0] !== fin[0].winnerId) f(`${jahr} ${lname}: Aufsteiger ≠ Finalsieger`);
        // (3) keiner außerhalb des Felds kam weiter als der schwächste Teilnehmer
        if (!sr.nb) {
            const minT = Math.min(...sr.kand.map(c => tiefe(c.id)));
            ligalosVorher.forEach(id => {
                const t = Engine.teams[id];
                if (feld.has(id) || t.leagueId || Engine.amateurTargetLeagueId(t) !== sr.lid || !Engine._darfAufsteigen(t, (Engine.leagues[sr.lid] || {}).level)) return;
                if (tiefe(id) > minT) f(`${jahr} ${lname}: ${t.name} kam weiter (Runde ${tiefe(id)}) als ein Teilnehmer (${minT}), fehlt im Feld`);
            });
        }
    });
    const ausSR = new Set(SR.flatMap(sr => sr.auf));
    (snap.nachrueck || []).forEach(id => { if (!ausSR.has(id)) f(`${jahr}: Nachrücker ${Engine.teams[id].name} ohne Sonder-Relegation`); });
    if (nachher < vorher - kurz) f(`${jahr}: Pyramide ${vorher} → ${nachher} (erklärt nur ${kurz} durch fehlende Kandidaten)`);
}
console.log = _log;
console.log(`${N} Saisons: ${nSR} Sonder-Relegationen, ${nAuf} Aufsteiger, ${nSpiele} Spiele, ${nNb}× Nachbarstaffel, ${nKurz}× zu wenig Kandidaten, ${nRes} Reserven aufgestiegen${KAPUTT ? '  [GEGENPROBE --kaputt]' : ''}`);
Object.entries(formate).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${String(v).padStart(4)}  ${k}`));
if (fehler.length) { console.log(`❌ ${fehler.length} Befunde:`); fehler.slice(0, 40).forEach(x => console.log('  ' + x)); process.exit(1); }
if (nSR < 3) { console.log('⚠ weniger als 3 Sonder-Relegationen – keine Aussage'); process.exit(1); }
console.log('✅ alle Prüfungen bestanden');
