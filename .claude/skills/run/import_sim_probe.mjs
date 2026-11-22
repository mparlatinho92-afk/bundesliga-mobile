// Export importieren und eine Saison rechnen: läuft die Simulation nach dem Import weiter?
// (Nutzer 18.11.2026: Mega-Sim nach Import eines frischen v0.8.235.1-Exports → „Exception nach 0 Saisons“)
//   node .claude/skills/run/import_sim_probe.mjs <export.json> [port]
import { chromium } from 'playwright';
const DATEI = process.argv[2], PORT = process.argv[3] || 3334;
const browser = await chromium.launch();
const page = await browser.newPage();
page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
await page.setInputFiles('#importFileInput', DATEI);
await page.waitForFunction(() => /Importiert/.test(document.body.textContent), null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(1500);
const r = await page.evaluate(() => {
  const ohne = Object.values(Engine.teams).filter(t => !t.stats);
  let bad = null;
  const alt = Engine._applyResult;
  Engine._applyResult = function (r) {
    const h = this.teams[r.hId], a = this.teams[r.aId];
    if (h && a && (!h.stats || !a.stats) && !bad) { const x = !h.stats ? h : a; bad = { r, id: x.id, name: x.name, lid: x.leagueId, gd: (GAME_DATA.teams[x.id] || {}).leagueId }; }
    return alt.call(this, r);
  };
  Engine.fastMode = true;
  let ex = null;
  const s0 = Engine.getFormattedSeason();
  try { Engine.simulateFullSeason(); Engine.processSeasonTransition(); } catch (e) { ex = String(e.stack).split('\n').slice(0, 4).join(' / '); }
  return { saison: s0, md: Engine.currentMatchday, ohneStats: ohne.length, ohneStatsMitLiga: ohne.filter(t => t.leagueId).length, bad, ex, danach: Engine.getFormattedSeason() };
});
console.log(JSON.stringify(r, null, 1));
await browser.close();
process.exit(r.ex ? 1 : 0);
