// Abschluss der Mega-Sim zerlegt (Nutzer 18.11.2026: 250 Saisons in 0:35, aber ~2 s Nachlauf am Ende).
// Misst je Schritt: ensureSeasonFriendlies, saveGame (gesamt + localStorage-Schreiben + Kompression), Zusammenfassung, Schließen.
//   node .claude/skills/run/megasim_abschluss_mess.mjs [saisons=250] [port] [--import <datei.json>]
import { chromium } from 'playwright';
const zahlen = process.argv.slice(2).filter(a => /^\d+$/.test(a));
const N = +(zahlen[0] || 250), PORT = zahlen[1] || 3334;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
const fehler = []; page.on('pageerror', e => fehler.push(e.message));
page.on('dialog', d => d.type() === 'prompt' ? d.accept(String(N)) : d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const imp = process.argv.indexOf('--import');
if (imp > 0) {
  await page.setInputFiles('#importFileInput', process.argv[imp + 1]);
  await page.waitForFunction(() => /Importiert/.test(document.body.textContent), null, { timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(1500);
  // neu laden: der Import ruft nur loadGame, den Spielplan baut erst Engine.init (Befund 18.11.2026) – so wie beim Nutzer im Alltag
  await page.reload();
  await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  console.log('Import ab', await page.evaluate(() => Engine.getFormattedSeason()));
}
await page.evaluate(() => {
  const M = window.__mess = [];
  const wrap = (obj, name, label) => { const f = obj[name]; if (typeof f !== 'function') return; obj[name] = function () { const t = performance.now(); try { return f.apply(this, arguments); } finally { M.push([label || name, performance.now() - t]); if (name === '_megaSimSummary') window.__summaryEnde = performance.now(); } }; };
  wrap(Engine, 'ensureSeasonFriendlies'); wrap(Engine, 'saveGame'); wrap(Engine, '_flushIdbPending');
  wrap(Engine, '_encodeSave', 'Kompression'); wrap(App, '_megaSimSummary'); wrap(App, 'renderSidebar'); wrap(App, 'loadLeague'); wrap(App, 'updateStatus');
  const ls = Storage.prototype.setItem; Storage.prototype.setItem = function (k, v) { const t = performance.now(); try { return ls.call(this, k, v); } finally { M.push(['localStorage ' + k + ' (' + (v.length * 2 / 1e6).toFixed(1) + ' MB)', performance.now() - t]); } };
  // Lauf-Ende erkennen: Zeitpunkt, an dem die letzte Saison fertig gerechnet war
  const sim = Engine.processSeasonTransition; Engine.processSeasonTransition = function () { const r = sim.apply(this, arguments); window.__letzteSaison = performance.now(); return r; };
});
await page.evaluate(() => App.megaSim());
await page.waitForFunction(() => document.getElementById('megasim-summary').style.display === 'block', null, { timeout: 600000, polling: 200 });
const r = await page.evaluate(async () => {
  const ende = performance.now(); const vorEnde = window.__mess.splice(0);
  // nächstes Bild abwarten = wann der Nutzer die Zusammenfassung sieht
  await new Promise(res => requestAnimationFrame(() => setTimeout(res, 0)));
  const bild = performance.now();
  const tc = performance.now(); App._megaSimClose(); await new Promise(res => requestAnimationFrame(() => setTimeout(res, 0))); const close = performance.now() - tc;
  return { bisZusammenfassung: Math.round(window.__summaryEnde - window.__letzteSaison), nachLetzterSaison: Math.round(bild - window.__letzteSaison), schritte: vorEnde.filter(x => x[1] > 5).map(x => x[0] + ' ' + Math.round(x[1]) + ' ms'), schliessen: Math.round(close), beimSchliessen: window.__mess.filter(x => x[1] > 5).map(x => x[0] + ' ' + Math.round(x[1]) + ' ms'), zaehler: document.getElementById('megasim-counter').textContent };
});
console.log(r.zaehler);
console.log(`Von letzter Saison bis Zusammenfassung im DOM: ${r.bisZusammenfassung} ms, bis nächstes Bild samt nachgezogenem Save: ${r.nachLetzterSaison} ms`);
console.log('Schritte > 5 ms (gesamter Lauf):\n  ' + r.schritte.join('\n  '));
console.log(`Schließen bis Bild: ${r.schliessen} ms\n  ` + r.beimSchliessen.join('\n  '));
console.log('Fehler:', fehler.slice(0, 3));
await browser.close();
