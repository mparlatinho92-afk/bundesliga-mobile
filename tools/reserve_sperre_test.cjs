// PRUEFUNG (Exit 1 bei Befund): Aufstiegssperre fuer Reserven – Simulation UND Tabellenanzeige.
// Sheet-Punkt 18.10.2026: "Aufstieg in 2. Liga wird auch für 2. Mannschaften angezeigt, obwohl sie niemals
// aufsteigen können. nachrücker korrekt darstellen" – dazu: nie auf die Ebene der Ersten, und eine III nie
// auf die Ebene der II (Werder III / HSV III zeigen mit parentId auf die Erste, nicht auf die II).
//
//   node tools/reserve_sperre_test.cjs [saisons]   erzwungene Lagen + Dauerlauf
//   node tools/reserve_sperre_test.cjs --selbsttest   alte Regel (nur Erste, Zonen nach Platz) – MUSS durchfallen
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');
const N = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '40', 10);

global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
Engine.log = () => {};
if (SELBST) {
    // Stand vor dem Fix: nur die Erste sperrt, die Anzeige zaehlt Plaetze
    Engine._hoehereMannschaften = function(t) {
        const p = t && t.isReserve && t.parentId && this.teams[t.parentId];
        return p && p.leagueId ? [p] : [];
    };
    Engine.aufstiegsZonen = function(lid, teams, zonen) {
        const out = {}, z = zonen[lid];
        teams.forEach((t, i) => { if (i < z.fixUp) out[t.id] = 'fix'; else if (i < z.fixUp + z.varUp) out[t.id] = 'var'; });
        return out;
    };
}

const befunde = [];
const pruefe = (ok, text) => { console.log((ok ? '  ok   ' : '  FEHL ') + text); if (!ok) befunde.push(text); };
const T = () => Engine.teams, L = () => Engine.leagues;
const lv = t => t && t.leagueId ? L()[t.leagueId].level : null;
const tabelle = lid => Object.values(T()).filter(t => t.leagueId === lid).sort((a, b) => a.rank - b.rank);
// t auf Platz 1 seiner Liga setzen (Raenge tauschen)
const anDieSpitze = t => {
    const erster = tabelle(t.leagueId)[0];
    if (erster !== t) { const r = t.rank; t.rank = erster.rank; erster.rank = r; }
};
const nachUmstellung = () => { Engine.processSeasonTransition(); };

Engine.init();
Engine.simulateFullSeason();
const snap = JSON.stringify(Engine.teams);
const zuruecksetzen = () => { const s = JSON.parse(snap); Object.keys(s).forEach(id => Object.assign(Engine.teams[id], s[id])); };

// Lage 1: II auf Platz 1 der 3. Liga -> kein Aufstieg, Platz 2 und 3 ruecken nach (fix), Platz 4 Relegation
{
    const l3 = Object.values(L()).find(l => l.level === 3);
    const res = tabelle(l3.id).find(t => t.isReserve) ||
        (() => { const r = Object.values(T()).find(t => t.isReserve && !t.nachbarStaffel && lv(t) === 4); const alt = r.leagueId; r.leagueId = l3.id; r.rank = 0; return r; })();
    anDieSpitze(res);
    const tab = tabelle(l3.id);
    const z = Engine.calcZones()[l3.id];
    const az = Engine.aufstiegsZonen(l3.id, tab, Engine.calcZones());
    console.log(`Lage 1: ${res.name} Platz 1 der ${l3.name} (Zonen fix ${z.fixUp}, Relegation ${z.varUp})`);
    pruefe(az[res.id] !== 'fix' && az[res.id] !== 'var', 'Anzeige: II ohne ▲/⇄');
    pruefe(az[tab[1].id] === 'fix' && az[tab[2].id] === 'fix', 'Anzeige: Platz 2 und 3 steigen auf (Nachruecker)');
    pruefe(az[tab[3].id] === 'var', 'Anzeige: Platz 4 spielt Relegation');
    const ziel2 = tab.filter(t => az[t.id] === 'fix').map(t => t.id);
    nachUmstellung();
    pruefe(lv(T()[res.id]) === 3, 'Simulation: II bleibt in der 3. Liga');
    pruefe(ziel2.every(id => lv(T()[id]) === 2), 'Simulation: die angezeigten Aufsteiger stehen in der 2. Bundesliga');
    zuruecksetzen();
}

// Lage 2: Werder III auf Platz 1 einer Liga direkt unter der Ebene der II -> darf nicht hoch
for (const [iiiId, iiId] of [['svwerderbremeniii_460', null], ['hamburgersviii_507', null]]) {
    const iii = T()[iiiId];
    const ii = Object.values(T()).find(t => t.isReserve && t.parentId === iii.parentId && t !== iii);
    const lII = lv(ii), lIII = lv(iii);
    // III eine Ebene unter die II bringen, falls sie weiter unten steht
    if (lIII !== lII + 1) {
        const ziel = Engine.findTarget(iii, lII + 1, iii.leagueId);
        iii.leagueId = ziel.id; iii.rank = 0;
    }
    anDieSpitze(iii);
    const lid = iii.leagueId, tab = tabelle(lid);
    const z = Engine.calcZones()[lid];
    const az = Engine.aufstiegsZonen(lid, tab, Engine.calcZones());
    console.log(`Lage 2: ${iii.name} Platz 1 der ${L()[lid].name} (Ebene ${lv(iii)}), ${ii.name} Ebene ${lII}`);
    pruefe(Engine._darfAufsteigen(iii, lII) === false, '_darfAufsteigen: III nie auf die Ebene der II');
    pruefe(az[iii.id] !== 'fix' && az[iii.id] !== 'var', 'Anzeige: III ohne ▲');
    pruefe(z.fixUp === 0 || az[tab[1].id] === 'fix', 'Anzeige: Platz 2 rueckt nach');
    nachUmstellung();
    pruefe(lv(T()[iii.id]) > lv(T()[ii.id]), `Simulation: ${iii.name} bleibt unter der II (III ${lv(T()[iii.id])}, II ${lv(T()[ii.id])})`);
    zuruecksetzen();
}

// Lage 3: die II steigt in die Liga der III ab -> die III muss im selben Durchgang weichen
{
    const iii = T()['svwerderbremeniii_460'];
    const ii = Object.values(T()).find(t => t.isReserve && t.parentId === iii.parentId && t !== iii);
    // III direkt unter die II, II ans Tabellenende
    const ziel = Engine.findTarget(iii, lv(ii) + 1, iii.leagueId);
    iii.leagueId = ziel.id;
    const t2 = tabelle(ii.leagueId); const letzter = t2[t2.length - 1];
    if (letzter !== ii) { const r = ii.rank; ii.rank = letzter.rank; letzter.rank = r; }
    iii.rank = 0; anDieSpitze(iii);
    console.log(`Lage 3: ${ii.name} Letzter der ${L()[ii.leagueId].name}, ${iii.name} Platz 1 der ${L()[iii.leagueId].name}`);
    const tab = tabelle(iii.leagueId), az = Engine.aufstiegsZonen(iii.leagueId, tab, Engine.calcZones());
    pruefe(az[iii.id] === 'gesperrt', 'Anzeige: III gesperrt, weil die II in ihre Ziel-Ebene absteigt');
    const zweiter = tab[1], zLvl = lv(zweiter);
    pruefe(az[zweiter.id] === 'fix', 'Anzeige: Platz 2 rueckt nach');
    nachUmstellung();
    pruefe(lv(T()[ii.id]) < lv(T()[iii.id]), `Simulation: nach dem Abstieg der II steht die III tiefer (II ${lv(T()[ii.id])}, III ${lv(T()[iii.id])})`);
    pruefe(lv(T()[zweiter.id]) === zLvl - 1, `Simulation: ${zweiter.name} (Platz 2) steigt auf`);
    zuruecksetzen();
}

// Dauerlauf: kein AUFSTIEG bringt eine Reserve auf/ueber eine hoehere Mannschaft (Sonderregel nachbarStaffel:
// gleiche Ebene erlaubt). Nicht geprueft: die Erste steigt in die Bodenliga ihrer II ab, und darunter gibt es
// keine Liga mehr – das kommt auch im Stand vor dem Fix vor und hat mit dem Aufstieg nichts zu tun.
Engine.init();
let fehl = [], hinweise = [];
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();
    const vorher = {};
    Object.values(T()).forEach(t => { if (t.isReserve && t.leagueId) vorher[t.id] = lv(t); });
    // Anzeige gegen Simulation: wer als ▲ markiert ist, steht nach der Umstellung eine Ebene hoeher
    const zonen = Engine.calcZones(), angezeigt = [];
    Object.keys(L()).forEach(lid => {
        const tab = tabelle(lid), az = Engine.aufstiegsZonen(lid, tab, zonen);
        tab.forEach(t => { if (az[t.id] === 'fix' && t.isReserve) angezeigt.push([t.id, lv(t)]); });
    });
    const logs = [];
    Engine.log = (lvl, msg) => logs.push(String(msg));
    Engine.processSeasonTransition();
    Engine.log = () => {};
    angezeigt.forEach(([id, alt]) => { const t = T()[id]; if (lv(t) !== alt - 1) {
        // Liga-Schutz (Quell-Liga <= 8) haelt JEDEN Aufsteiger zurueck, nicht nur Reserven – nur Hinweis
        if (logs.some(m => m.includes(t.name) && m.startsWith('Liga-Schutz'))) { hinweise.push(`Saison ${s + 1}: ${t.name} (Liga-Schutz)`); return; }
        fehl.push(`Saison ${s + 1}: ${t.name} als Aufsteiger angezeigt, steht aber auf Ebene ${lv(t)} statt ${alt - 1}`);
        logs.filter(m => m.includes(t.name)).forEach(m => console.log('       Engine: ' + m));
    } });
    Object.values(T()).forEach(t => {
        if (!t.isReserve || !t.leagueId || !(lv(t) < vorher[t.id])) return;   // nur Aufsteiger
        Engine._hoehereMannschaften(t).forEach(h => {
            const zu = t.nachbarStaffel && h.id === t.parentId ? lv(t) < lv(h) : lv(t) <= lv(h);
            if (zu) fehl.push(`Saison ${s + 1}: ${t.name} (Ebene ${lv(t)}) nicht unter ${h.name} (Ebene ${lv(h)})`);
        });
    });
}
pruefe(!fehl.length, `Dauerlauf ${N} Saisons: kein Aufstieg auf/ueber eine hoehere Mannschaft, keine falsche ▲` + (fehl.length ? ` – ${fehl.length}×, z. B. ${fehl[0]}` : ''));

if (hinweise.length) console.log(`  Hinweis: ${hinweise.length}× vom Liga-Schutz gehalten (betrifft alle Vereine), z. B. ${hinweise[0]}`);
console.log(befunde.length ? `\n${befunde.length} Befund(e).` : '\nAlles gruen.');
process.exit(befunde.length ? 1 : 0);
