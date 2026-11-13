// Spielstand importieren (wie der Nutzer über 📂 Importieren) und für einen Verein die Aufstiege der Ewigen Tabellen
// (archive.ewige[lid][id].promotions) gegen seinen Ligaverlauf (history-Fenster + Engine.teams) legen.
//   node .claude/skills/run/save_aufstieg_probe.mjs <spielstand.json> <teamId> [port]
import { chromium } from 'playwright';
const [DATEI, ID, PORT = 3334] = process.argv.slice(2);
const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message)); p.on('dialog', d => d.accept());
await p.goto(`http://localhost:${PORT}/template.html`);
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
await p.setInputFiles('#importFileInput', DATEI);
await p.waitForFunction(() => Engine.history && Engine.history.length > 5, null, { timeout: 120000 }).catch(() => {});
await p.waitForTimeout(5000);
const r = await p.evaluate(id => {
    const lv = l => (Engine.leagues[l] || {}).level, nm = l => (Engine.leagues[l] || {}).name || l;
    const verlauf = Engine.history.map(h => { const t = h.teams[id]; return { y: h.year, lid: t ? t.leagueId : null, rank: t ? t.rank : null }; });
    verlauf.push({ y: Engine.getFormattedSeason() + ' (lfd.)', lid: Engine.teams[id] ? Engine.teams[id].leagueId : null });
    const auf = [];
    for (let i = 0; i + 1 < verlauf.length; i++) { const a = verlauf[i], n = verlauf[i + 1];
        if (a.lid && n.lid && lv(n.lid) < lv(a.lid)) auf.push(`${a.y} ${nm(a.lid)} Pl.${a.rank} → ${nm(n.lid)}`); }
    const ew = {}; for (const l in Engine.archive.ewige) { const e = Engine.archive.ewige[l][id]; if (e) ew[l + ' ' + nm(l)] = { years: e.years, titles: e.titles, promotions: e.promotions }; }
    const RT = (Engine.archive.records || {}).t || {}; const apHist = Engine.history.filter(h => h.amateurpokal && (h.amateurpokal.promoted || h.amateurpokal.p || []).includes(id)).map(h => h.year);
    const apTeil = Engine.history.filter(h => { const A = h.amateurpokal; return A && (A.rounds || A.r || []).some(rd => (rd.matches || rd[1] || []).some(m => Array.isArray(m) ? (m[0] === id || m[1] === id) : (m.hId === id || m.aId === id))); }).map(h => h.year);
    return { apUp: RT[id] && RT[id].apUp, apAufstiegInHistory: apHist, apTeilnahmen: apTeil.length, cupsA: (Engine.archive.cups && Engine.archive.cups.a || {})[id], recBf: Engine.archive.records && Engine.archive.records.bf, saison: Engine.getFormattedSeason(), fenster: `${Engine.history[0].year}–${Engine.history[Engine.history.length - 1].year}`,
             verlauf: verlauf.filter(v => v.lid).map(v => `${v.y}:${v.lid}/${v.rank}`).join(' '), auf, ew };
}, ID);
console.log(JSON.stringify(r, null, 1));
await p.evaluate(() => { App.showAmateurpokal(); App.switchAmateurTab(-2); }); await p.waitForTimeout(800);
console.log('Amateurpokal-Ewige:', await p.evaluate(id => { const t = document.getElementById('ap-ew'); if (!t) return 'keine Tabelle'; const ths = [...t.querySelectorAll('thead th')].map(x => x.textContent.trim()); const ci = ths.findIndex(x => x.startsWith('Aufstiege')); const tr = [...t.querySelectorAll('tbody tr')].find(r => (r.querySelector('td.tm span')?.getAttribute('onclick') || '').includes(id)); return tr ? 'Aufstiege = ' + tr.children[ci].textContent.trim() : 'Verein nicht in der Tabelle'; }, ID));
console.log('Nachrücker gesamt:', await p.evaluate(() => Engine.history.reduce((s, h) => s + (((h.amateurpokal || {}).nachrueck || (h.amateurpokal || {}).n || []).length), 0)));
if (fehler.length) console.log('JS:', [...new Set(fehler)].join(' / '));
await b.close();
