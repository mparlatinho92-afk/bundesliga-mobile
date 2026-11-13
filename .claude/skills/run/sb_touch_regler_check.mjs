// Touch-Schieberegler der Ligenliste (Handy): vorhanden, ziehen scrollt die Liste, Zeilen daneben bleiben antippbar.
//   node .claude/skills/run/sb_touch_regler_check.mjs [port] → docs/pokal-ansicht/bau-sb-regler.png
import { chromium } from 'playwright';
const PORT = process.argv[2] || 3334;
const browser = await chromium.launch();
const p = await (await browser.newContext({ viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 })).newPage();
const fehler = []; p.on('pageerror', e => fehler.push(e.message));
await p.goto(`http://localhost:${PORT}/template.html`);
await p.waitForFunction(() => typeof Engine !== 'undefined' && document.getElementById('sidebar'), null, { timeout: 90000 });
await p.waitForTimeout(600);
await p.evaluate(() => document.getElementById('btn-menu').click()); await p.waitForTimeout(500);
// alle Gruppen aufklappen, damit die Liste lang ist
await p.evaluate(() => { document.querySelectorAll('#league-list .nav-grp-hd, #league-list [onclick*="toggle"]').forEach(e => { try { e.click(); } catch (x) {} }); });
await p.waitForTimeout(400);
const vor = await p.evaluate(() => { const l = document.getElementById('league-list'), g = document.getElementById('sb-regler'); return { da: !!g, sichtbar: g && g.style.display !== 'none', max: l.scrollHeight - l.clientHeight, top: l.scrollTop, box: g && g.getBoundingClientRect().toJSON() }; });
console.log((vor.da && vor.sichtbar && vor.max > 0 ? 'OK  ' : 'FEHL') + ' Regler da und sichtbar', JSON.stringify(vor));
await p.screenshot({ path: 'docs/pokal-ansicht/bau-sb-regler.png' });
if (vor.box) {
    const x = vor.box.x + vor.box.width / 2, y = vor.box.y + 20;
    await p.mouse.move(x, y); await p.mouse.down(); await p.mouse.move(x, y + 300, { steps: 8 }); await p.mouse.up();
    const nach = await p.evaluate(() => { const l = document.getElementById('league-list'); return { top: l.scrollTop, gtop: document.getElementById('sb-regler').getBoundingClientRect().top }; });
    console.log((nach.top > vor.top + 50 ? 'OK  ' : 'FEHL') + ' Ziehen scrollt die Liste', JSON.stringify(nach));
    const neben = await p.evaluate(() => { const g = document.getElementById('sb-regler').getBoundingClientRect(); const e = document.elementFromPoint(g.left - 30, g.top + 20); return e && (e.className || e.id); });
    console.log((neben && !/sb-regler/.test(neben) ? 'OK  ' : 'FEHL') + ' links neben dem Regler bleibt die Zeile antippbar: ' + neben);
}
console.log(fehler.length ? 'JS-Fehler: ' + fehler.join(' | ') : 'keine JS-Fehler');
await browser.close();
