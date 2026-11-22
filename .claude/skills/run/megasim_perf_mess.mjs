// Mega-Sim-Leistung im Browser (Nutzer 18.11.2026: 250 Saisons, Laptop laut + langsam, erst Browser-Schließen half).
// Misst je 10 Saisons ms/Saison + JS-Heap, danach Abschluss (Save, Schließen/Neuzeichnen) und CPU im Leerlauf.
//   node .claude/skills/run/megasim_perf_mess.mjs [saisons=100] [port]
import { chromium } from 'playwright';
const zahlen = process.argv.slice(2).filter(a => /^\d+$/.test(a));
const N = +(zahlen[0] || 100), PORT = zahlen[1] || 3334;
const browser = await chromium.launch({ args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'] });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const fehler = []; page.on('pageerror', e => fehler.push(e.message));
page.on('dialog', d => d.type() === 'prompt' ? d.accept(String(N)) : d.accept());
const cdp = await page.context().newCDPSession(page);
await cdp.send('Performance.enable');
const cpu = async () => { const m = (await cdp.send('Performance.getMetrics')).metrics; const g = k => (m.find(x => x.name === k) || {}).value || 0; return { task: g('TaskDuration'), script: g('ScriptDuration'), layout: g('LayoutDuration'), nodes: g('Nodes'), heap: g('JSHeapUsedSize') }; };
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
// --import <datei.json>: von einem echten Spielstand aus messen (Export-Datei des Nutzers, wird nur gelesen)
const imp = process.argv.indexOf('--import');
if (imp > 0) {
  const ti = Date.now();
  await page.setInputFiles('#importFileInput', process.argv[imp + 1]);
  await page.waitForFunction(() => /Importiert/.test((document.getElementById('save-status') || document.body).textContent), null, { timeout: 120000 }).catch(() => {});
  console.log(`Import: ${Date.now()-ti} ms, Saison ${await page.evaluate(() => Engine.getFormattedSeason())}`);
  // --neuplan: alter Export mit Spielplan, der nicht zur Ligazuordnung passt (v0.8.228.78: Ligaloser im Plan) → an Spieltag 0 neu aufbauen
  if (process.argv.includes('--neuplan')) console.log('Neuplan:', await page.evaluate(() => { if (Engine.currentMatchday !== 0) return 'nicht an Spieltag 0 – übersprungen'; Engine.resetSeason(); return 'ok'; }));
}
const t0 = Date.now();
await page.evaluate(() => App.megaSim());
let letzt = -1, c0 = await cpu();
while (true) {
  const z = await page.evaluate(() => ({ c: document.getElementById('megasim-counter').textContent, fertig: document.getElementById('megasim-summary').style.display === 'block', s: document.getElementById('megasim-season').textContent }));
  const done = parseInt(z.c) || 0;
  if (z.fertig) { console.log('Ende:', z.c, '|', z.s); break; }
  if (done !== letzt && done % 10 === 0) {
    letzt = done; const c = await cpu();
    console.log(`S${done}\t${z.s}\theap ${(c.heap/1e6)|0}MB\tnodes ${c.nodes}\tscript ${(c.script-c0.script).toFixed(1)}s layout ${(c.layout-c0.layout).toFixed(1)}s\twand ${((Date.now()-t0)/1000)|0}s`);
  }
  await page.waitForTimeout(250);
}
const tc = Date.now(); await page.evaluate(() => App._megaSimClose()); console.log(`Schließen+Neuzeichnen: ${Date.now()-tc} ms`);
// Leerlauf: 15 s nichts tun – wie viel CPU verbraucht die Seite noch?
await page.waitForTimeout(1000);
const a = await cpu(); await page.waitForTimeout(15000); const b = await cpu();
console.log(`Leerlauf 15 s: Task ${(b.task-a.task).toFixed(2)} s, Script ${(b.script-a.script).toFixed(2)} s, heap ${(b.heap/1e6)|0}MB, nodes ${b.nodes}`);
const est = await page.evaluate(async () => { const e = await navigator.storage.estimate(); let ls = 0; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); ls += (localStorage.getItem(k) || '').length; } return { idbMB: (e.usage/1e6).toFixed(1), lsMB: (ls*2/1e6).toFixed(1) }; });
console.log('Speicher:', est, '| Fehler:', fehler.slice(0, 3));
await browser.close();
