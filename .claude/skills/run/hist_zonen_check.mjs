// Abgeschlossene Sim-Saison (App.viewHistoryOffset): stimmen die ▲/▼-Zeilen mit dem, was wirklich passierte?
// Wirklich = Liga des Vereins in der Folgesaison (nächster history-Eintrag bzw. laufende Saison): höhere Ebene = ▲,
// tiefere Ebene oder ligalos = ▼. Gezählt je Liga über ALLE Ligen der Saison.
//   node .claude/skills/run/hist_zonen_check.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage(), fehler = [];
page.on('pageerror', e => fehler.push(e.message));
page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const r = await page.evaluate(() => {
    Engine.fastMode = true; Engine.simulateFullSeason(); Engine.processSeasonTransition(); Engine.fastMode = false;
    App.zonesCache = null;
    const hIdx = Engine.history.length - 1, H = Engine.history[hIdx].teams;
    const lvl = l => (Engine.leagues[l] || {}).level;
    const aus = { ligen: 0, falsch: 0, beispiele: [], art: {} };
    for (const lid of Object.keys(Engine.leagues)) {
        const ids = Object.entries(H).filter(([, t]) => t.leagueId === lid).map(([id]) => id);
        if (!ids.length) continue;
        const sollUp = ids.filter(id => Engine.teams[id] && Engine.teams[id].leagueId && lvl(Engine.teams[id].leagueId) < lvl(lid)).length;
        const sollDn = ids.filter(id => Engine.teams[id] && (!Engine.teams[id].leagueId || lvl(Engine.teams[id].leagueId) > lvl(lid))).length;
        App.viewHistoryOffset = hIdx; App.viewArchivedSeason = null; App.matchdayViewIdx = null; App.tableView = 'gesamt';
        App.loadLeague(lid);
        const istUp = document.querySelectorAll('#content tr.row-fix-up, #content tr.row-var-up').length;
        const istDn = document.querySelectorAll('#content tr.row-fix-down, #content tr.row-var-down').length;
        aus.ligen++;
        if (istUp !== sollUp || istDn !== sollDn) {
            aus.falsch++;
            const k = 'Ebene ' + lvl(lid) + ((Engine.DOWN_MAP[lid] || []).length ? '' : ' (Boden)');
            aus.art[k] = (aus.art[k] || 0) + 1;
            if (aus.beispiele.length < 8) aus.beispiele.push(`${Engine.leagues[lid].name}: ▲ ${istUp}/${sollUp} ▼ ${istDn}/${sollDn}`);
        }
    }
    return aus;
});
console.log(`Ligen ${r.ligen} · falsch markiert ${r.falsch}`);
console.log('je Ebene:', JSON.stringify(r.art));
r.beispiele.forEach(b => console.log('  ' + b + '   (ist/soll)'));
if (fehler.length) console.log('JS-Fehler:', [...new Set(fehler)].slice(0, 3).join(' / '));
await browser.close();
