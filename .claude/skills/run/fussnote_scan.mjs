// Alle Fußnoten „Ligawechsel + neuer Name“ im Archiv (vor dem Sim-Start), mit der echten Anzeige gerendert (template.html).
//   node .claude/skills/run/fussnote_scan.mjs [port]     → tools/_dryrun/fussnote_scan.txt
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
const keys = await page.evaluate(async () => { const x = await HistExt.load(); const sy = Engine.startYear || 2025;
    return Object.values(x.byKey).filter(t => parseInt(t.y) < sy).map(t => [t.lid, t.y]); });
const out = [];
for (const [lid, y] of keys) {
    await page.evaluate(() => document.querySelectorAll('.ltab').forEach(t => t.dataset.alt = '1'));
    await page.evaluate(([lid, y]) => App._sbSaisonGo(lid, y), [lid, y]);
    await page.waitForFunction(() => document.querySelector('.ltab:not([data-alt]) tbody tr'), null, { timeout: 15000 }).catch(() => {});
    const r = await page.evaluate(() => [...document.querySelectorAll('.ltab:not([data-alt]) tbody tr')].filter(tr => tr.querySelector('.imk')).map(tr => ({
        id: (tr.querySelector('.tmn').getAttribute('onclick').match(/'([^']+)'/) || [])[1], txt: tr.querySelector('.itxt').textContent.trim(),
        fn: (document.querySelector('.ifn') || {}).textContent })));
    r.forEach(x => out.push(Object.assign({ lid, y }, x)));
}
fs.writeFileSync('tools/_dryrun/fussnote_scan.txt', `${out.length} Fußnoten in ${keys.length} Liga-Saisons, JS-Fehler ${fehler.length}\n`
    + out.map(f => `${f.y}  ${f.lid}  #${f.id}: „${f.txt}“`).join('\n') + '\n');
console.log(out.length, 'Fußnoten, JS-Fehler', fehler.length, fehler.slice(0, 3).join(' | '));
await browser.close();
