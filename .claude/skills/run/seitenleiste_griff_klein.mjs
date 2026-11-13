// Griff der Seitenleiste im kleinen Fenster (Mobil-Layout ohne Touch) und am Handy: liegt er über dem Rand der Ligenliste?
//   node .claude/skills/run/seitenleiste_griff_klein.mjs [port]
import { chromium } from 'playwright';
const PORT = process.argv[2] || 3334;
const browser = await chromium.launch();
const faelle = [['Desktop gross', { viewport: { width: 1280, height: 800 } }], ['Desktop klein', { viewport: { width: 700, height: 800 } }],
    ['Handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true }]];
for (const [name, opt] of faelle) {
    const p = await (await browser.newContext(opt)).newPage();
    await p.goto(`http://localhost:${PORT}/template.html`);
    await p.waitForFunction(() => typeof Engine !== 'undefined' && document.getElementById('sidebar'), null, { timeout: 90000 });
    await p.waitForTimeout(600);
    const zu = await p.evaluate(() => { const e = document.elementFromPoint(3, 400); return e && (e.id || e.className); });
    await p.evaluate(() => { const sb = document.getElementById('sidebar'); if (getComputedStyle(sb).position === 'fixed') { const b = document.getElementById('btn-menu'); b && b.click(); } });
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => {
        const sb = document.getElementById('sidebar').getBoundingClientRect(), y = sb.top + sb.height * 0.6;
        const at = x => { const e = document.elementFromPoint(x, y); return e ? (e.id || String(e.className).slice(0, 20)) : null; };
        return { offen: document.getElementById('sidebar').classList.contains('open'), rand: Math.round(sb.right), innen2: at(sb.right - 2), innen6: at(sb.right - 6), aussen: at(sb.right + 3) };
    });
    const ok = r.innen2 !== 'sidebar-resizer' && r.innen6 !== 'sidebar-resizer' && zu !== 'sidebar-resizer';
    console.log(`${ok ? 'OK  ' : 'FEHL'} ${name}: zugeklappt x=3 → ${zu} | ${JSON.stringify(r)}`);
}
await browser.close();
