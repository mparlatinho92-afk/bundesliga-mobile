// Ligatabelle: Veränderung zum letzten Spieltag (Nutzer 29.10.2026: „grüner Pfeil hoch, roter Pfeil runter und in Klammern die
// alte Platzierung“), template.html, Desktop + Handy. Vor dem Spieltag wird die echte Tabelle abgelesen (Platz mit Gleichstand wie
// die Anzeige), dann „Woche“ geklickt, bis die Liga gespielt hat – jede Zeile muss Pfeil, Farbe, Differenz und „(alter Platz)“
// genau gegen den abgelesenen Platz zeigen; gleicher Platz = kein Pfeil. Bundesliga + eine Amateurliga, dazu Spieltag 1 ohne Pfeile.
//   node .claude/skills/run/platz_delta_check.mjs [port]       Screenshots nach docs/platz-delta/
//   node .claude/skills/run/platz_delta_check.mjs --selbsttest  _platzVorher rechnet den letzten Spieltag nicht heraus – muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/platz-delta/';
fs.mkdirSync(OUT, { recursive: true });
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
// angezeigte Tabelle: je Zeile Verein (aus dem Steckbrief-Link), Platz, Pfeil-Text, Klasse
const lies = page => page.evaluate(() => [...document.querySelectorAll('.ltab tbody tr')].map(tr => {
    const td = tr.querySelector('td'), d = td && td.querySelector('.pl-delta');
    const link = tr.querySelector('[onclick*="showSteckbrief"]');
    return { id: link ? (link.getAttribute('onclick').match(/showSteckbrief\('([^']+)'/) || [])[1] : null,
             platz: parseInt(td ? td.textContent : ''), delta: d ? d.textContent : '', up: !!(d && d.classList.contains('lvt-up')), dn: !!(d && d.classList.contains('lvt-dn')) };
}).filter(z => z.id));
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 1000 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { const o = App._platzVorher; App._platzVorher = function (lid, teams) { const R = Engine.seasonResults; Engine.seasonResults = []; try { return o.call(this, lid, teams) || Object.fromEntries(teams.map((t, i) => [t.id, i + 1])); } finally { Engine.seasonResults = R; } }; });
    const zeige = lid => page.evaluate(lid => { document.getElementById('modal').style.display = 'none'; App.viewHistoryOffset = null; App.matchdayViewIdx = null; App.tsView = null; App.tableView = 'gesamt'; App.resultsCollapsed = true; App.loadLeague(lid); }, lid);
    const gespielt = lid => page.evaluate(lid => (Engine.seasonResults || []).filter(r => r.lid === lid).length, lid);
    for (const lid of ['1', '7-1']) {
        // vor dem ersten Spieltag der Liga: keine Pfeile
        await zeige(lid);
        if ((await gespielt(lid)) === 0) soll(!(await lies(page)).some(z => z.delta), `${geraet} ${lid}: Pfeile vor dem ersten Spieltag`);
        // bis zum 4. Spieltag der Liga spielen, dann vorher/nachher vergleichen
        await page.evaluate(lid => { let g = 0; const n = () => (Engine.seasonResults || []).filter(r => r.lid === lid).length, t = Object.values(Engine.teams).filter(x => x.leagueId === lid).length;
            while (n() < 3 * Math.floor(t / 2) && g++ < 40) Engine.playNextMatchday(); }, lid);
        await zeige(lid);
        const vorher = Object.fromEntries((await lies(page)).map(z => [z.id, z.platz]));
        const n0 = await gespielt(lid);
        let g = 0;
        while ((await gespielt(lid)) === n0 && g++ < 6) { await page.locator('button', { hasText: /^Woche$/ }).first().click(); await page.waitForTimeout(800); }
        await zeige(lid); await page.waitForTimeout(300);
        const nach = await lies(page);
        let falsch = 0, beispiel = '', mitPfeil = 0;
        for (const z of nach) {
            const alt = vorher[z.id], d = alt - z.platz;
            const sollTxt = d === 0 ? '' : `${d > 0 ? '▲' : '▼'}${Math.abs(d)}(${alt})`;
            const ok = z.delta === sollTxt && (d > 0 ? z.up && !z.dn : d < 0 ? z.dn && !z.up : true);
            if (!ok) { falsch++; beispiel = beispiel || `${z.id}: ${z.platz}. „${z.delta}“, erwartet „${sollTxt}“`; }
            if (z.delta) mitPfeil++;
        }
        soll(nach.length > 8 && !falsch, `${geraet} ${lid}: ${falsch} von ${nach.length} Zeilen falsch, z. B. ${beispiel}`);
        soll(mitPfeil > 0, `${geraet} ${lid}: keine einzige Veränderung angezeigt`);
        if (!SELBST) { const tab = await page.$('.ltab'); if (tab) await tab.screenshot({ path: `${OUT}${geraet}-${lid === '1' ? 'bundesliga' : 'amateur'}.png` }); }
    }
    if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} Seite breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { befund.slice(0, 4).forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
