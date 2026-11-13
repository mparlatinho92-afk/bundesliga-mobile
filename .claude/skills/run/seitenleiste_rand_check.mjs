import { chromium } from 'playwright';
const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1400, height: 900 } })).newPage();
await p.goto('http://localhost:3334/template.html');
await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
await p.waitForTimeout(800);
console.log(JSON.stringify(await p.evaluate(() => {
  const sb = document.getElementById('sidebar'), r = sb.getBoundingClientRect();
  const scroller = [...sb.querySelectorAll('*')].find(e => e.scrollHeight > e.clientHeight + 5 && /auto|scroll/.test(getComputedStyle(e).overflowY));
  const sr = scroller.getBoundingClientRect();
  const sbw = scroller.offsetWidth - scroller.clientWidth;
  const out = [];
  for (const dx of [2, 5, 8, 12]) { const e = document.elementFromPoint(r.right - dx, 450); out.push([dx, e.id || e.className || e.tagName]); }
  return { sidebar: [r.left, r.right], scroller: scroller.id || scroller.className, scrollerRight: sr.right, scrollbarBreite: sbw, treffer: out };
})));
await p.screenshot({ path: 'docs/pokal-ansicht/ist-seitenleiste-rand.png', clip: { x: 180, y: 300, width: 160, height: 300 } });
await b.close();
