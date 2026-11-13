// Probe: Archiv-Navigation einer Spiel-Liga in Saisons, in denen es sie (noch) nicht gab bzw. auf anderer Ebene spielte.
// node .claude/skills/run/pyramide_fehlliga_probe.mjs [lid ...]   -> je Saison: Reihen der Navleiste + „Auf dieser Ebene spielten“
import { chromium } from 'playwright';
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const LIDS = process.argv.slice(2).length ? process.argv.slice(2) : ['6-24'];
const JAHRE = (process.env.JAHRE || '1989,1990,1991,1995,2001,2005,2008').split(',').map(Number);
const browser = await chromium.launch({ headless: true });
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
for (const lid of LIDS) for (const j of JAHRE) {
    const y = j + '/' + String((j + 1) % 100).padStart(2, '0');
    await page.evaluate(([lid, y]) => { App.tableView = 'gesamt'; App.viewArchivedSeason = { y, lid }; App.loadLeague(lid); }, [lid, y]);
    await page.waitForFunction(() => !/lädt…/.test(document.getElementById('content').textContent), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
        const c = document.getElementById('content');
        const reihen = [...c.querySelectorAll('.navleiste > div')].slice(1).map(d => [...d.querySelectorAll('.navknopf')].map(b => b.title || b.textContent.trim()).join(' | '));
        const leer = /keine archivierte Abschlusstabelle/.test(c.textContent);
        const vorschlag = [...c.querySelectorAll('button.btn')].filter(b => /viewArchivedSeason/.test(b.getAttribute('onclick') || '')).map(b => b.textContent.trim());
        return { reihen, leer, vorschlag };
    });
    console.log(`\n${lid} ${y}${r.leer ? '  (keine Tabelle)' : ''}`);
    r.reihen.forEach((z, i) => console.log(`   ${['oben', 'Ebene', 'unten'][i] || 'unten'}: ${z}`));
    if (r.vorschlag.length) console.log('   Auf dieser Ebene: ' + r.vorschlag.join(' | '));
}
await browser.close();
