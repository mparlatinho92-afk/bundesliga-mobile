// Unsere 113 Null-Zeilen (Seed + HIST_EXT) gegen die fussball.de-Null-Zeilen (null_fbde.json) und die Einzelspiel-Zuordnung.
const fs = require('fs'); const ROOT = 'C:/Projekte/Bundesliga-Fussballsimulation HTML/';
global.window = global; global.localStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
global.document = { getElementById: () => null }; global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js','app/history_data.js','app/history_ext.js','app/hist_ext.js','app/idb_store.js','game_engine.js'].forEach(f => (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));
const FB = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const norm = s => String(s || '').toLowerCase().replace(/\bzg\.?$/, '').replace(/[^a-zäöüß]/g, '');
const yKurz = y => { const a = parseInt(y); return String(a % 100).padStart(2, '0') + '/' + String((a + 1) % 100).padStart(2, '0'); };
(async () => { Engine.init(); await Engine._seedHistoryExt(); const x = HistExt.loaded();
  const nm = id => (GAME_DATA.teams[id] || {}).name || HISTORIC_CLUBS[id] || id;
  const liste = [];
  HISTORY_SEED.seasons.forEach(s => s.table.forEach(r => { if (!(r.s + r.u + r.n)) liste.push({ y: s.y, lid: s.lid, id: r.id, name: nm(r.id), n: s.table.length, fe: 0, quelle: 'seed' }); }));
  for (const lid in x.byLid) for (const rec of x.byLid[lid]) for (const r of rec.rows) if (!(r.s + r.u + r.n))
    liste.push({ y: rec.y, lid, id: r.id, name: r.nm || nm(r.id), n: rec.rows.length, quelle: rec.fe !== undefined || parseInt(rec.y) >= 2001 ? 'ab2001' : 'vor2001', abbruch: !!rec.abbruch });
  const kat = {};
  for (const z of liste) {
    const yk = yKurz(z.y), kand = FB.filter(f => f.saison === yk && (norm(f.mannschaft).includes(norm(z.name)) || norm(z.name).includes(norm(f.mannschaft))) && f.phase === 'Hauptrunde');
    let k;
    if (z.abbruch) k = 'Saisonabbruch (Covid)';
    else if (!kand.length) k = parseInt(z.y) >= 2001 ? 'ab 2001, kein fbde-Treffer' : 'vor 2001, keine Spieldaten';
    else if (kand.some(f => f.mitTor)) k = 'fbde: Spiele vorhanden';
    else if (kand.some(f => f.staffelHatSpiele)) k = 'fbde: kein Spiel';
    else k = 'fbde: Staffel ohne Spieleliste';
    (kat[k] = kat[k] || []).push(`${z.y} ${z.lid} ${z.name}${kand[0] ? ' [' + kand[0].mannschaft + ' ' + kand[0].sp + ' Sp.' + (kand[0].hinweis ? ', ' + kand[0].hinweis : '') + ']' : ''}`);
  }
  for (const k in kat) { console.log(`\n${k}: ${kat[k].length}`); kat[k].forEach(s => console.log('   ', s)); }
})();
