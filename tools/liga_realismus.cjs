/* Wie realistisch ist der LIGABETRIEB - abseits der Tore?
 *
 *   node tools/liga_realismus.cjs [saisons]
 *
 * Das Tormodell ist inzwischen gegen echte Daten geprueft (tools/tor_pruefung.cjs). Diese Datei
 * fragt das Gleiche fuer alles andere: Punkte, Titel, Auf- und Abstieg, Serien. Gemessen wird
 * gegen bekannte Bundesliga-Kennzahlen (Quellen im Text), damit die Antwort belegt ist und nicht
 * aus dem Bauch kommt.
 *
 * Hintergrund: calculateStrengths setzt fuer Vereine IN einer Liga
 *     staerke = 0,7*alt + 0,3*(109 - 10*ebene)
 * ohne jeden Zufallsanteil. Zwei Vereine, die lange in derselben Liga stehen, haben damit exakt
 * dieselbe Staerke - es gibt keine dauerhaft grossen und kleinen Klubs. Fuer LIGALOSE Vereine
 * steht in derselben Funktion ein Zufallsschritt, ausdruecklich damit der Pokal "echte Favoriten"
 * hat. Fuer Ligavereine wurde derselbe Gedanke nie angewendet.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..') + path.sep;
const _ls = {};
global.localStorage = { getItem: k => (k in _ls ? _ls[k] : null), setItem: (k, v) => { _ls[k] = String(v); }, removeItem: k => { delete _ls[k]; } };
global.document = { getElementById: () => null, querySelector: () => null };
global.window = global;
global.performance = { now: () => Date.now() };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
global.indexedDB = undefined;
['game_data.js', 'app/history_data.js', 'game_engine.js'].forEach(f =>
    eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const N = parseInt(process.argv[2] || '30', 10);
process.argv.slice(3).forEach(arg => {
    const m = arg.match(/^([A-Z_]+)=(-?[\d.]+)$/);
    if (!m || !(m[1] in Engine)) { console.error('Unbrauchbar: ' + arg); process.exit(1); }
    Engine[m[1]] = +m[2];
});
Engine._groesse = null;                       // Cache verwerfen, sonst greift STR_IDENT nicht
Engine.init(); Engine.fastMode = true;
const knoepfe = Object.keys(Engine).filter(k => /^STR_/.test(k)).map(k => k + ' ' + Engine[k]).join(' | ');

// DURCHLAESSIGKEIT: welche Ebene hat ein Verein je erreicht, gemessen an seiner STARTebene?
// Der Nutzer haelt diesen Reiz ausdruecklich hoch - "dass nach 100, 200 Jahren ein Oberligist auf
// einmal in der Bundesliga spielt". Eine dauerhafte Vereinsgroesse kann das zubetonieren: wer
// permanent unter dem Schnitt seiner Liga liegt, gewinnt sie nie und steigt nie auf. Deshalb ist
// das hier eine harte Nebenbedingung, keine Nebennotiz.
const startLvl = {}, bestLvl = {}, ersteBL = {};
Object.values(GAME_DATA.teams).forEach(t => {
    const L = GAME_DATA.leagues[t.leagueId];
    if (L) { startLvl[t.id] = L.level; bestLvl[t.id] = L.level; }
});

const meister = {};                 // teamId -> Titel in Liga 1
const serie = { akt: null, laenge: 0, best: 0, bestId: null };
let sumPktM = 0, sumPktL = 0, sumSpanne = 0, saisons = 0;
const spread = {};                  // Ebene -> Staerkespanne am Ende
let aufsteiger = 0, direktRunter = 0;
let vorLiga = {};                   // teamId -> leagueId der Vorsaison

for (let s = 0; s < N; s++) {
    Engine.simulateFullSeason();
    Engine.sortTables();

    // Liga 1: Meister, Punkte, Spanne
    const liga1 = Object.values(Engine.teams).filter(t => t.leagueId === '1')
        .sort((a, b) => (a.rank || 99) - (b.rank || 99));
    if (liga1.length > 4) {
        const m = liga1[0], l = liga1[liga1.length - 1];
        meister[m.id] = (meister[m.id] || 0) + 1;
        serie.laenge = (serie.akt === m.id) ? serie.laenge + 1 : 1;
        serie.akt = m.id;
        if (serie.laenge > serie.best) { serie.best = serie.laenge; serie.bestId = m.id; }
        sumPktM += m.stats.pts; sumPktL += l.stats.pts;
        sumSpanne += m.stats.pts - l.stats.pts;
        saisons++;
    }

    // Durchlaessigkeit mitschreiben
    Object.values(Engine.teams).forEach(t => {
        const L = Engine.leagues[t.leagueId]; if (!L || bestLvl[t.id] == null) return;
        if (L.level < bestLvl[t.id]) bestLvl[t.id] = L.level;
        if (L.level === 1 && ersteBL[t.id] == null) ersteBL[t.id] = s + 1;
    });

    // Staerkespanne je Ebene
    Object.values(Engine.teams).forEach(t => {
        const L = Engine.leagues[t.leagueId]; if (!L) return;
        const sp = spread[L.level] || (spread[L.level] = { min: 99, max: 0 });
        sp.min = Math.min(sp.min, t.strength); sp.max = Math.max(sp.max, t.strength);
    });

    // Aufsteiger: wer war letzte Saison eine Ebene tiefer und steigt sofort wieder ab?
    const jetzt = {};
    Object.values(Engine.teams).forEach(t => { if (t.leagueId) jetzt[t.id] = t.leagueId; });
    const lvl = lid => (Engine.leagues[lid] ? Engine.leagues[lid].level : 99);
    Engine.processSeasonTransition();
    const danach = {};
    Object.values(Engine.teams).forEach(t => { if (t.leagueId) danach[t.id] = t.leagueId; });
    for (const id in jetzt) {
        if (!vorLiga[id] || !danach[id]) continue;
        if (lvl(vorLiga[id]) > lvl(jetzt[id])) {          // war voriges Jahr tiefer = Aufsteiger
            aufsteiger++;
            if (lvl(danach[id]) > lvl(jetzt[id])) direktRunter++;
        }
    }
    vorLiga = jetzt;
}

const titel = Object.values(meister).sort((a, b) => b - a);
console.log(`\n${N} Saisons   |   ${knoepfe}\n`);
console.log('=== 1. Bundesliga: Punkte und Titel ===');
console.log(`  Meister   Ø ${(sumPktM / saisons).toFixed(1)} Punkte    (real ~72, Spanne 64-91)`);
console.log(`  Letzter   Ø ${(sumPktL / saisons).toFixed(1)} Punkte    (real ~21, Spanne 8-30)`);
console.log(`  Abstand   Ø ${(sumSpanne / saisons).toFixed(1)} Punkte    (real ~51)`);
console.log(`  verschiedene Meister: ${Object.keys(meister).length} in ${saisons} Saisons   (real 8 in 30)`);
console.log(`  meiste Titel eines Vereins: ${titel[0]}   (real Bayern 20 von 30)`);
console.log(`  laengste Titelserie: ${serie.best}   (real 11)`);

console.log('\n=== Staerkespanne je Ebene (ueber alle Saisons) ===');
Object.keys(spread).map(Number).sort((a, b) => a - b).forEach(l => {
    const sp = spread[l];
    console.log(`  Ebene ${l}: ${sp.min} bis ${sp.max}  (Breite ${sp.max - sp.min})`);
});

// DRIFT: wie weit hat sich ein Verein von seiner Startebene entfernt? Das ist die Textur, die
// der Nutzer aus seinem eigenen Spielstand kennt - Vergleichswerte aus 214 gespielten Saisons
// (Downloads/bundesliga_2026-09-06.json, alte Engine ohne Vereinsgroesse):
//   -4:2  -3:10  -2:46  -1:168  0:373  +1:136  +2:52  +3:12  +4:4  ligalos:196
// (negativ = hochgeklettert). Die Vereinsgroesse macht diese Verteilung zwangslaeufig enger -
// grosse Vereine bleiben oben, kleine unten. Wie viel enger, ist eine Design-Entscheidung und
// gehoert gemessen, nicht geschaetzt.
const REF = { '-4': 2, '-3': 10, '-2': 46, '-1': 168, '0': 373, '1': 136, '2': 52, '3': 12, '4': 4, 'ligalos': 196 };
console.log('\n=== Drift gegenueber der Startebene ===');
console.log('  (negativ = hochgeklettert; real = echter Spielstand nach 214 Saisons)');
const dr = {};
Object.keys(startLvl).forEach(id => {
    const t = Engine.teams[id];
    const L = t && t.leagueId && Engine.leagues[t.leagueId];
    const k = L ? String(L.level - startLvl[id]) : 'ligalos';
    dr[k] = (dr[k] || 0) + 1;
});
['-4', '-3', '-2', '-1', '0', '1', '2', '3', '4', 'ligalos'].forEach(k => {
    const n = dr[k] || 0, r = REF[k] || 0;
    console.log(`  ${k.padStart(8)} : ${String(n).padStart(4)}  (real ${String(r).padStart(4)})  ${'#'.repeat(Math.round(n / 6))}`);
});

console.log('\n=== Durchlaessigkeit der Pyramide ===');
console.log('  (Startebene -> hoechste je erreichte Ebene; der Reiz, dass ein Kleiner ganz nach oben kommt)');
const stufen = [1, 2, 3, 4, 5, 6, 7, 8];
console.log('  Start | Vereine | je Ebene 1 | je Ebene <=2 | je Ebene <=3 | Ø Saisons bis Ebene 1');
stufen.forEach(sl => {
    const ids = Object.keys(startLvl).filter(id => startLvl[id] === sl);
    if (!ids.length) return;
    const bis = k => ids.filter(id => bestLvl[id] <= k).length;
    const jahre = ids.filter(id => ersteBL[id] != null).map(id => ersteBL[id]);
    const oe = jahre.length ? (jahre.reduce((a, b) => a + b, 0) / jahre.length).toFixed(0) : '-';
    console.log(`  ${String(sl).padStart(5)} | ${String(ids.length).padStart(7)} | `
        + `${String(bis(1)).padStart(10)} | ${String(bis(2)).padStart(12)} | ${String(bis(3)).padStart(12)} | ${String(oe).padStart(6)}`);
});

console.log('\n=== Aufsteiger ===');
console.log(`  ${aufsteiger} Aufstiege, davon ${direktRunter} sofort wieder abgestiegen `
    + `= ${(direktRunter / Math.max(1, aufsteiger) * 100).toFixed(1)} %   (real Bundesliga ~35-40 %)`);
