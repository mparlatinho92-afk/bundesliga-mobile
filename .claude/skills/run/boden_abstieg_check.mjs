// Bodenliga-Abstiege in der Tabelle (Fix-Liste 12.11.2026: „Bodenliga-Abstiege werden in ihren Tabellen nicht angezeigt“).
// Soll: nach dem Amateurpokal-Sechzehntelfinale zeigt jede Ziel-Bodenliga so viele ▼-Zeilen wie Aufsteiger zu ihr kommen,
// live UND im Archiv der Saison. Geprüft wird die Live-Tabelle nach Klick auf „Weiter“ wie der Nutzer und die Archivtabelle.
//   node .claude/skills/run/boden_abstieg_check.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1400, height: 900 } }), page = await ctx.newPage(), fehler = [];
page.on('pageerror', e => fehler.push(e.message));
page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const zaehle = () => page.evaluate(() => {
    const rows = [...document.querySelectorAll('tr.row-fix-down, tr.row-var-down')];
    const txt = [...document.querySelectorAll('#content td, #content span')].map(e => e.textContent).filter(t => /▼|▽/.test(t));
    return { rows: rows.length, txt: [...new Set(txt)].slice(0, 4) };
});
// bis zum Sechzehntelfinale per Klick-Funktion des Nutzers
const ziel = await page.evaluate(async () => {
    let g = 0;
    while (!(Engine.amateurpokal && Engine.amateurpokal.promoted && Engine.amateurpokal.promoted.length) && g++ < 60) App.nextStep();
    const z = {};
    for (const id of Engine.amateurpokal.promoted) { const l = Engine.amateurTargetLeagueId(Engine.teams[id]); z[l] = (z[l] || 0) + 1; }
    return { md: Engine.currentMatchday, z };
});
console.log('Sechzehntelfinale nach Spieltag', ziel.md, '·', Object.keys(ziel.z).length, 'Zielligen');
const ids = Object.keys(ziel.z).slice(0, 4);
for (const lid of ids) {
    await page.evaluate(lid => App.loadLeague(lid), lid); await page.waitForTimeout(300);
    const r = await zaehle();
    console.log('LIVE ', lid, 'soll', ziel.z[lid], 'ist', r.rows, r.txt.join(' | '));
}
// Saison zu Ende, Saisonwechsel, dann Archiv der Vorsaison
await page.evaluate(() => { Engine.fastMode = true; Engine.simulateFullSeason(); Engine.fastMode = false; App.loadLeague(App.activeLeague); });
for (const lid of ids) {
    await page.evaluate(lid => App.loadLeague(lid), lid); await page.waitForTimeout(300);
    const r = await zaehle();
    console.log('ENDE ', lid, 'soll', ziel.z[lid], 'ist', r.rows, r.txt.join(' | '));
}
// Saisonwechsel wie im Spiel (Engine-Teil), dann je Liga eine Saison zurückblättern wie der Nutzer (prevSeason)
await page.evaluate(() => { Engine.processSeasonTransition(); App.zonesCache = null; });
for (const lid of ids) {
    await page.evaluate(lid => { App.viewHistoryOffset = null; App.viewArchivedSeason = null; App.loadLeague(lid); }, lid);
    await page.waitForTimeout(300);
    await page.evaluate(() => App.prevSeason()); await page.waitForTimeout(1200);
    const r = await zaehle();
    const wo = await page.evaluate(() => JSON.stringify({ off: App.viewHistoryOffset, arch: App.viewArchivedSeason, lid: App.activeLeague }));
    console.log('ARCH ', lid, 'soll', ziel.z[lid], 'ist', r.rows, r.txt.join(' | '), wo);
    if (process.argv.includes('--debug')) console.log(await page.evaluate(lid => {
        const tr = [...document.querySelectorAll('#content table.ltab tbody tr')];
        const h = Engine.history[Engine.history.length - 1];
        const ab = Object.entries(h.teams || {}).filter(([id, x]) => (x.leagueId || x.l) === lid).length;
        const promo = (h.amateurpokal || {}).promoted || [];
        const weg = Object.values(Engine.teams).filter(t => t.leagueId === null && h.teams && h.teams[t.id] && (h.teams[t.id].leagueId || h.teams[t.id].l) === lid).map(t => t.name);
        return 'Zeilen ' + tr.length + ' · hist-Teams ' + ab + ' · jetzt ligalos aus der Liga: ' + weg.join(', ') + '\n   ' +
            tr.slice(-3).map(x => x.textContent.replace(/\s+/g, ' ').trim().slice(0, 90)).join('\n   ') + '\n   hist-Keys ' + Object.keys(h).join(',') + ' · Beispiel ' + JSON.stringify(Object.values(h.teams || {})[0]);
    }, lid));
}
if (fehler.length) console.log('JS-Fehler:', fehler.join(' / '));
await browser.close();
