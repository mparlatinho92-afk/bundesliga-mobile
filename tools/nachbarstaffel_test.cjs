// PRUEFUNG (Exit 1 bei Befund): Sonderregel nachbarStaffel (FC Internationale 1980 II, Nutzer 11.10.2026):
// "der zweiten mannschaft erlauben in der nachbarstaffel zu spielen. nie eine ebene drüber, nie selbe staffel".
//
//   node tools/nachbarstaffel_test.cjs [saisons]   Dauerlauf + drei erzwungene Lagen
//   node tools/nachbarstaffel_test.cjs --selbsttest   dieselben Pruefungen ohne _nachbarStaffelRegel – MUSS durchfallen
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');
const N = parseInt(process.argv.find(a => /^\d+$/.test(a)) || '80', 10);

global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
Engine.log = () => {};
if (SELBST) Engine._nachbarStaffelRegel = () => {};

const II = 'fcinternationale1980ii_792', I = 'fcinternationale1980_806';
const befunde = [];
const pruefe = (ok, text) => { console.log((ok ? '  ok   ' : '  FEHL ') + text); if (!ok) befunde.push(text); };
const lage = () => {
    const t = Engine.teams[II], p = Engine.teams[I];
    const lv = id => id ? Engine.leagues[id].level : null;
    return { r: t.leagueId, p: p.leagueId, rl: lv(t.leagueId), pl: lv(p.leagueId) };
};
const verstoss = z => z.r && z.p && (z.rl < z.pl || z.r === z.p);

Engine.init();
pruefe(GAME_DATA.teams[II].isReserve === true && GAME_DATA.teams[II].nachbarStaffel === true, 'game_data: II ist Reserve mit nachbarStaffel');
pruefe(GAME_DATA.teams[I].leagueId !== GAME_DATA.teams[II].leagueId, 'Sim-Start: getrennte Staffeln (wie 2025/26)');

// 1. Dauerlauf
let gleicheEbene = 0, fehl = [];
for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason(); Engine.processSeasonTransition();
    const z = lage();
    if (verstoss(z)) fehl.push(`Saison ${s + 1}: II ${z.r} / I ${z.p}`);
    if (z.r && z.rl === z.pl) gleicheEbene++;
}
pruefe(!fehl.length, `Dauerlauf ${N} Saisons: nie drüber, nie dieselbe Staffel` + (fehl.length ? ' – ' + fehl.slice(0, 3).join(', ') : ''));
console.log(`        (davon ${gleicheEbene} Saisons auf derselben Ebene)`);

// 2. Erzwungene Lagen – jeweils frisch, dann eine Transition
function erzwinge(name, setze) {
    Engine.init();
    setze(Engine.teams[II], Engine.teams[I]);
    Engine.simulateFullSeason();
    setze(Engine.teams[II], Engine.teams[I], true);
    const vorher = {}; Object.values(Engine.teams).forEach(t => { if (t.leagueId) vorher[t.leagueId] = (vorher[t.leagueId] || 0) + 1; });
    Engine.processSeasonTransition();
    const z = lage();
    pruefe(!verstoss(z), `${name}: danach II ${z.r} / I ${z.p}`);
    return z;
}
// a) beide in derselben Staffel (alter Spielstand vor v0.8.197 hatte genau das)
erzwinge('dieselbe Staffel', (t, p) => { t.leagueId = '7-9'; p.leagueId = '7-9'; });
// b) die Erste steigt aus der Berlin-Liga in die Staffel der Zweiten ab
erzwinge('Erste steigt in die Staffel der Zweiten ab', (t, p, nach) => {
    p.leagueId = '6-21'; t.leagueId = '7-9';
    if (nach) { p.rank = Object.values(Engine.teams).filter(x => x.leagueId === '6-21').length; }
});
// c) die Zweite wird Meister, die Erste spielt Berlin-Liga: dort gibt es keine Nachbarstaffel -> kein Aufstieg
erzwinge('Zweite Meister unter der Berlin-Liga der Ersten', (t, p, nach) => {
    p.leagueId = '6-21'; t.leagueId = '7-9';
    if (nach) { const l = Object.values(Engine.teams).filter(x => x.leagueId === '7-9'); l.forEach(x => { if (x.rank === 1) x.rank = t.rank; }); t.rank = 1; }
});
// d) _darfAufsteigen direkt
Engine.init();
Engine.teams[I].leagueId = '6-21';
pruefe(Engine._darfAufsteigen(Engine.teams[II], 6) === false, '_darfAufsteigen: nicht in die Berlin-Liga der Ersten (keine Nachbarstaffel)');
Engine.teams[I].leagueId = '7-8';
pruefe(Engine._darfAufsteigen(Engine.teams[II], 7) === true, '_darfAufsteigen: Landesliga neben der Ersten erlaubt');
pruefe(Engine._darfAufsteigen(Engine.teams[II], 6) === false, '_darfAufsteigen: nie über die Erste');

console.log(befunde.length ? `\nBEFUND (${befunde.length})` : '\nOK');
process.exit(befunde.length ? 1 : 0);
