// Datenwachstum bei erweiterter Historie VOR dem Sim-Start – zwei Varianten:
//   A = volle Abschlusstabellen (ohne Einzelergebnisse) wie HISTORY_SEED heute
//   B = nur, was Ligaverlauf + Saison-Historie im Steckbrief brauchen (je Verein Liga+Platz, je Tabelle Staffelgröße)
//
// Teil 1 MISST die Kosten je Einheit an echten Daten (Seed, Engine-Archiv, lz-string wie im Spiel).
// Teil 2 RECHNET mit den Annahmen unten hoch – die sind geschätzt und stehen deshalb offen hier.
// Liegen echte Staffelzahlen vor: EPOCHEN/ANTEIL anpassen und neu laufen lassen.
//
//   node --expose-gc tools/historie_groesse.cjs            # Einheitskosten + Hochrechnung (~2 s)
//   node --expose-gc tools/historie_groesse.cjs --ddr      # zusätzlich DDR-Liga + Bezirksligen (Ebene 2/3 der DDR)
//   node --expose-gc tools/historie_groesse.cjs --anker    # zusätzlich Archivwachstum je Sim-Saison (~2,5 min)
//
// Ohne --expose-gc fehlt nur die Arbeitsspeicher-Messung. Ausgabe zusätzlich in tools/historie_groesse.json.
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = path.join(__dirname, '..') + '/';
const ANKER = process.argv.includes('--anker'), DDR = process.argv.includes('--ddr');

// ---------- ANNAHMEN (geschätzt) ----------
// Staffeln je Ebene und Epoche. Wert = Staffelzahl (Größe aus GROESSE) oder [Staffeln, Vereine je Staffel].
// Ebene 1 und die 2. Bundesliga ab 1974/75 liegen schon im Seed und zählen hier nicht.
const EPOCHEN = [
    [1963, 1973, { 2: 5,       3: [18, 16], 4: 40, 5: 70, 6: 110 }], // 5 Regionalligen / Amateurligen
    [1974, 1977, {             3: [15, 16], 4: 22, 5: 45, 6: 90 }],  // vor der Oberliga-Reform
    [1978, 1990, {             3: [8, 18],  4: 22, 5: 45, 6: 90 }],  // 8 Oberligen
    [1991, 1993, {             3: [11, 18], 4: 22, 5: 45, 6: 90 }],  // + NOFV-Oberliga Nord/Mitte/Süd
    [1994, 1999, {             3: [4, 18],  4: 10, 5: 22, 6: 45 }],  // 4 Regionalligen
    [2000, 2007, {             3: [2, 18],  4: 10, 5: 22, 6: 45 }],  // 2 Regionalligen
    [2008, 2011, {             3: [1, 20],  4: 3,  5: 14, 6: 30 }],  // 3. Liga, 3 Regionalligen
    [2012, 2024, {             3: [1, 20],  4: 5,  5: 14, 6: 32 }],  // 5 Regionalligen
];
// DDR (nur mit --ddr): Ebene 2 = DDR-Liga, Ebene 3 = 15 Bezirksligen. Endet 1990/91.
const EPOCHEN_DDR = [
    [1963, 1970, { 2: [2, 16], 3: [15, 15] }],
    [1971, 1983, { 2: [5, 12], 3: [15, 15] }],
    [1984, 1990, { 2: [2, 18], 3: [15, 15] }],
];
const GROESSE = { 2: 16, 3: 17, 4: 17, 5: 17, 6: 17 };      // Vereine je Staffel, wo die Epoche nichts angibt
// Anteil der Zeilen mit Vereinen aus unserem Spiel. Liga 1/2 gemessen ~0,95; die Regionalliga 1963–74
// hatte mehr heute kleine Vereine, deshalb darunter angesetzt.
const ANTEIL = { 2: 0.85, 3: 0.6, 4: 0.5, 5: 0.4, 6: 0.3 };
const ANTEIL_DDR = { 2: 0.5, 3: 0.3 };
const FREMD_JE_ZEILE = { 2: 0.08, 3: 0.12, 4: 0.15, 5: 0.18, 6: 0.2 }; // eindeutige fremde Vereine je fremder Zeile (brauchen Namen)
// Ewige-Tabelle-Einträge je Zeile: Liga 1/2 gemessen ~0,08; unter Ebene 2 fiel der Wert in der Simulation
// von 0,41 (3 Saisons) auf 0,16 (10 Saisons). Über 62 Jahre tiefer, Staffelreformen treiben ihn wieder hoch.
const EWIGE_JE_ZEILE = [0.04, 0.2];

// ---------- Shims (headless, wie in CLAUDE.md) ----------
global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null };
global.window = global;
const idbTables = [];
const impl = {
    putSeasonTables: recs => { (recs || []).forEach(r => idbTables.push(r)); return Promise.resolve(); },
    scanSeasonTables: cb => { idbTables.forEach(r => cb(r)); return Promise.resolve(); },
    appendSeason: () => Promise.resolve(), setScope: () => {}, getScope: () => ({ sid: null, legacy: true }),
};
global.IDBStore = new Proxy(impl, { get: (t, k) => k in t ? t[k] : () => Promise.resolve([]) });
const load = f => eval.call(global, fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var '));

const kb = b => (b / 1024).toFixed(1) + ' KB', mb = b => (b / 1048576).toFixed(2) + ' MB';
const gz = s => zlib.gzipSync(Buffer.from(s, 'utf8'), { level: 9 }).length;
const utf8 = s => Buffer.byteLength(s, 'utf8');

load('app/lzstring.min.js');
const LZ = global.LZString;
const lzBytes = s => LZ.compressToUTF16(s).length * 2; // localStorage hält UTF-16
load('game_data.js');
const heap = () => { if (global.gc) { global.gc(); return process.memoryUsage().heapUsed; } return null; };
const h0 = heap();
load('app/history_data.js');
const h1 = heap();
load('game_engine.js');

// ---------- TEIL 1: Kosten je Einheit ----------
const src = fs.readFileSync(ROOT + 'app/history_data.js', 'utf8');
const S = HISTORY_SEED.seasons;
const rows = S.reduce((n, s) => n + s.table.length, 0);
const inGame = S.reduce((n, s) => n + s.table.filter(r => GAME_DATA.teams[r.id]).length, 0);
const seedSrc = (() => { // HISTORY_SEED im echten Quelltextformat (Einrückung, Leerzeichen)
    const i0 = src.indexOf('HISTORY_SEED'), a = src.lastIndexOf('\n', i0);
    let depth = 0;
    for (let j = src.indexOf('{', i0); j < src.length; j++) {
        if (src[j] === '{') depth++;
        else if (src[j] === '}' && !--depth) return src.slice(a, j + 1);
    }
    return '';
})();
const hc = typeof HISTORIC_CLUBS !== 'undefined' ? HISTORIC_CLUBS : {};
const ligaVereine = Object.values(GAME_DATA.teams).filter(t => t.leagueId).length;

Engine.init();
setTimeout(() => {
    const A = Engine.archive;
    const seedLids = new Set(S.map(s => s.lid));
    const ewSeed = Object.fromEntries([...seedLids].map(l => [l, A.ewige[l] || {}]));
    const ewSeedEntries = Object.values(ewSeed).reduce((n, l) => n + Object.keys(l).length, 0);
    const idbJ = JSON.stringify(idbTables.filter(t => seedLids.has(t.lid)).map(t => Object.assign({ sid: 'mf3k2a9x-4b7c1d' }, t)));
    const ssJ = JSON.stringify(A.seededSeasons || {});

    // Variante B im kompakten Format, am echten Seed gebaut: je Verein EIN String, Jahr implizit fortlaufend,
    // "ligaKürzel.platz" je Saison, Lücke = leeres Feld. Staffelgröße separat je (Jahr, Liga).
    const lidIdx = {}; let li = 0;
    const perTeam = {}, groessen = {};
    S.slice().sort((a, b) => parseInt(a.y) - parseInt(b.y)).forEach(s => {
        if (!(s.lid in lidIdx)) lidIdx[s.lid] = (li++).toString(36);
        const grp = {};
        s.table.forEach(r => { grp[r.g || ''] = (grp[r.g || ''] || 0) + 1; });
        groessen[parseInt(s.y) + lidIdx[s.lid]] = Object.values(grp).join('/');
        s.table.forEach(r => (perTeam[r.id] = perTeam[r.id] || []).push([parseInt(s.y), lidIdx[s.lid] + (r.g ? r.g[0] : '') + '.' + r.rank]));
    });
    const enc = list => { let out = String(list[0][0]), prev = list[0][0] - 1; list.forEach(([y, c]) => { out += ';'.repeat(y - prev) + c; prev = y; }); return out; };
    const bGame = {}; let bSeasons = 0;
    for (const id in perTeam) if (GAME_DATA.teams[id]) { bGame[id] = enc(perTeam[id]); bSeasons += perTeam[id].length; }
    const bJ = JSON.stringify(bGame), gJ = JSON.stringify(groessen);
    // Variante A "nur bei Bedarf laden": Zeilen als Listen, gzip-gepackt, base64 im Monolithen (DecompressionStream)
    const kompakt = JSON.stringify(S.map(s => [s.y, s.lid, s.table.map(r => r.g ? [r.rank, r.id, r.s, r.u, r.n, r.gf, r.ga, r.g] : [r.rank, r.id, r.s, r.u, r.n, r.gf, r.ga])]));

    const U = {
        seedSaisons: S.length, seedZeilen: rows, anteilImSpiel: +(inGame / rows).toFixed(3),
        quelltextJeZeile: +(utf8(seedSrc) / rows).toFixed(1), quelltextJeZeileGz: +(gz(seedSrc) / rows).toFixed(2),
        gepacktJeZeile: +(Math.ceil(gz(kompakt) * 4 / 3) / rows).toFixed(2),
        heapJeZeile: h0 != null ? Math.round((h1 - h0) / rows) : null,
        namenJeVerein: +(utf8(JSON.stringify(hc)) / Math.max(1, Object.keys(hc).length)).toFixed(1),
        idbJeZeile: +(utf8(idbJ) / rows).toFixed(1),
        ewigeJeEintragLZ: +(lzBytes(JSON.stringify(ewSeed)) / ewSeedEntries).toFixed(1),
        seededKeyJeTabelleLZ: +(lzBytes(ssJ) / Math.max(1, Object.keys(A.seededSeasons || {}).length)).toFixed(1),
        B_jeVereinssaison: +(utf8(bJ) / bSeasons).toFixed(2), B_jeVereinssaisonGz: +(gz(bJ) / bSeasons).toFixed(2),
        B_groesseJeTabelle: +(utf8(gJ) / S.length).toFixed(1),
        ligaVereine, idbJeSimSaison: Math.round(ligaVereine * utf8(idbJ) / rows),
    };
    console.log('=== TEIL 1: gemessen ===');
    console.log(JSON.stringify(U, null, 1));
    if (U.heapJeZeile == null) console.log('(Arbeitsspeicher nicht gemessen – mit node --expose-gc starten)');
    const heute = { datei: utf8(seedSrc), gzip: gz(seedSrc), heap: U.heapJeZeile != null ? rows * U.heapJeZeile : null };
    console.log('Heute im Seed:', rows, 'Zeilen,', S.length, 'Tabellen | Quelltext', kb(heute.datei), '| gzip', kb(heute.gzip),
        '| Archiv (nur Seed) LZ', kb(lzBytes(JSON.stringify(A))), '| IndexedDB je Sim-Saison ~', kb(U.idbJeSimSaison));

    let anker = null;
    if (ANKER) {
        const a0 = lzBytes(JSON.stringify(Engine.archive)), N = 10, t0 = Date.now();
        for (let i = 0; i < N; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
        anker = { lzJeSimSaison: Math.round((lzBytes(JSON.stringify(Engine.archive)) - a0) / N) };
        console.log(`Anker: ${N} Sim-Saisons (${((Date.now() - t0) / 1000).toFixed(0)} s) -> Archiv LZ +${kb(anker.lzJeSimSaison)} je Saison`);
    }

    // ---------- TEIL 2: Hochrechnung ----------
    // Zählt über alle Epochen und Ebenen 2..bis: Tabellen, Zeilen, Zeilen unserer Vereine, fremde Namen.
    const zaehle = (epochen, anteil, bis) => {
        const r = { T: 0, Z: 0, ZG: 0, F: 0 };
        epochen.forEach(([a, b, m]) => {
            const jahre = b - a + 1;
            for (const e in m) {
                if (+e > bis) continue;
                const [n, g] = Array.isArray(m[e]) ? m[e] : [m[e], GROESSE[e]];
                r.T += jahre * n; r.Z += jahre * n * g;
                r.ZG += jahre * n * g * anteil[e];
                r.F += jahre * n * g * (1 - anteil[e]) * FREMD_JE_ZEILE[e];
            }
        });
        return r;
    };
    const kosten = ({ T, Z, ZG, F }) => ({
        tabellen: T, zeilen: Z, unsereVereinssaisons: Math.round(ZG), fremdeNamen: Math.round(F),
        A_datei: Z * U.quelltextJeZeile + F * U.namenJeVerein,
        A_gzip: Z * U.quelltextJeZeileGz + F * U.namenJeVerein * 0.45,
        A_gepackt: Z * U.gepacktJeZeile + F * U.namenJeVerein,
        A_heap: U.heapJeZeile != null ? Z * U.heapJeZeile : null,
        A_idb: Z * U.idbJeZeile,
        A_localStorage: EWIGE_JE_ZEILE.map(q => Z * q * U.ewigeJeEintragLZ + T * U.seededKeyJeTabelleLZ),
        B_datei: ZG * U.B_jeVereinssaison + T * U.B_groesseJeTabelle + T / 20 * 45,   // + Staffelnamen
        B_gzip: ZG * U.B_jeVereinssaisonGz + T * U.B_groesseJeTabelle * 0.4 + T / 20 * 20,
    });
    const plus = (a, b) => ({ T: a.T + b.T, Z: a.Z + b.Z, ZG: a.ZG + b.ZG, F: a.F + b.F });
    const erg = [];
    [3, 4, 5, 6].forEach(bis => erg.push(Object.assign({ umfang: 'bis Ebene ' + bis }, kosten(zaehle(EPOCHEN, ANTEIL, bis)))));
    if (DDR) {
        const brd23 = zaehle(EPOCHEN, ANTEIL, 3), ddr23 = zaehle(EPOCHEN_DDR, ANTEIL_DDR, 3);
        erg.push(Object.assign({ umfang: 'nur DDR 2–3' }, kosten(ddr23)));
        erg.push(Object.assign({ umfang: 'Ebene 2–3 BRD+DDR' }, kosten(plus(brd23, ddr23))));
    }
    // --staffeln: gezaehlte Staffeln und Vereine aus tools/staffeln_ebene23.mjs statt der EPOCHEN-Annahmen
    if (process.argv.includes('--staffeln')) {
        const W = JSON.parse(fs.readFileSync(path.join(__dirname, 'staffeln_ebene23.json'), 'utf8'));
        const aus = (gebiet, anteil) => [2, 3].reduce((r, e) => {
            const s = W.summe[gebiet + ' ' + e];
            return s ? plus(r, { T: s.tabellen, Z: s.vereine, ZG: s.vereine * anteil[e], F: s.vereine * (1 - anteil[e]) * FREMD_JE_ZEILE[e] }) : r;
        }, { T: 0, Z: 0, ZG: 0, F: 0 });
        const brd = aus('BRD', ANTEIL), ddr = aus('DDR', ANTEIL_DDR);
        console.log(`\nWikipedia-Zaehlung vom ${W.stand}: ` + Object.entries(W.summe).map(([k, s]) => `${k}: ${s.tabellen} Staffeln / ${s.vereine} Vereinssaisons (${s.vereineGeschaetzt} geschaetzt)`).join(' | '));
        erg.push(Object.assign({ umfang: 'Wikipedia BRD 2–3' }, kosten(brd)));
        erg.push(Object.assign({ umfang: 'Wikipedia DDR 2–3' }, kosten(ddr)));
        erg.push(Object.assign({ umfang: 'Wikipedia BRD+DDR 2–3' }, kosten(plus(brd, ddr))));
    }
    console.log('\n=== TEIL 2: Hochrechnung 1963/64–2024/25 (Annahmen oben im Skript) ===');
    console.log('Umfang | Tabellen | Zeilen | unsere Vereinssaisons | fremde Namen || A Datei / gzip | A gepackt | A Arbeitsspeicher | A IndexedDB | A localStorage || B Datei / gzip');
    erg.forEach(z => console.log(`${z.umfang} | ${z.tabellen} | ${z.zeilen} | ${z.unsereVereinssaisons} | ${z.fremdeNamen} || `
        + `${mb(z.A_datei)} / ${mb(z.A_gzip)} | ${mb(z.A_gepackt)} | ${z.A_heap != null ? mb(z.A_heap) : '–'} | ${mb(z.A_idb)} | ${z.A_localStorage.map(mb).join('–')} || `
        + `${kb(z.B_datei)} / ${kb(z.B_gzip)}`));
    fs.writeFileSync(path.join(__dirname, 'historie_groesse.json'), JSON.stringify({
        annahmen: { EPOCHEN, EPOCHEN_DDR: DDR ? EPOCHEN_DDR : null, GROESSE, ANTEIL, ANTEIL_DDR, FREMD_JE_ZEILE, EWIGE_JE_ZEILE },
        gemessen: U, heute, anker, hochrechnung: erg }, null, 1));
    process.exit(0);
}, 300);
