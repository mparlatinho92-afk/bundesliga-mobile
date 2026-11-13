// Saisonergebnisse in Blöcken (ba_res_v66, Engine._resSchreiben/_resLesen, Tempo Stufe 2, 28.10.2026), template.html:
// Neuladen, älterer Auto-Save über neueren Blöcken, Export/Import, Saisonwechsel, fremde Kennung, alter Spielstand mit r, Tempo.
//   node .claude/skills/run/save_bloecke_check.mjs [port]
//   node .claude/skills/run/save_bloecke_check.mjs --selbsttest   _resSchreiben verliert den letzten Block – muss durchfallen
import { chromium } from 'playwright';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
const ctx = await browser.newContext();
const page = await ctx.newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message));
page.on('dialog', d => d.accept());
const URL = `http://localhost:${PORT}/template.html`;
const bereit = async () => { await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 }); await page.waitForTimeout(1200); };
const vorbereiten = () => page.evaluate(SELBST => {
    if (App.actionCfg) App.actionCfg.on = false;
    window.__fp = () => { const R = Engine.seasonResults; let h = 0; const s = JSON.stringify(R); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return { n: R.length, h }; };
    window.__lean = () => JSON.parse(Engine._decodeSave(localStorage.getItem('ba_save_v66')));
    window.__res = () => JSON.parse(localStorage.getItem('ba_res_v66') || 'null');
    if (SELBST) { const o = Engine._resSchreiben; Engine._resSchreiben = function () { const n = o.apply(this, arguments); if (this._resC && this._resC.c.length > 1) { this._resC.c.pop(); localStorage.setItem('ba_res_v66', JSON.stringify({ v: 1, sid: this._resC.sid, y: this._resC.y, n: this._resC.n, c: this._resC.c })); } return n; }; }
}, SELBST);
const neuLaden = async () => { await page.reload(); await bereit(); await vorbereiten(); };

await page.goto(URL); await bereit(); await vorbereiten();
// 1) 10 Spieltage: Blöcke statt r, Anzahl stimmt
let r = await page.evaluate(() => { for (let i = 0; i < 10; i++) Engine.playNextMatchday(); const L = __lean(), B = __res();
    return { fp: __fp(), rc: L.rc, hatR: 'r' in L, B: B && { sid: B.sid === Engine.saveId, y: B.y, n: B.n, bloecke: B.c.length } }; });
console.log('10 Spieltage:', JSON.stringify(r));
soll(r.rc === r.fp.n && !r.hatR && r.B && r.B.sid && r.B.n === r.fp.n, `Blöcke/rc falsch ${JSON.stringify(r)}`);
const fp10 = r.fp;

// 2) Neuladen: identische Ergebnisse
await neuLaden();
r = await page.evaluate(() => __fp());
console.log('nach Neuladen:', JSON.stringify(r), 'vorher', JSON.stringify(fp10));
soll(r.n === fp10.n && r.h === fp10.h, `Neuladen: Ergebnisse anders (${JSON.stringify(r)} statt ${JSON.stringify(fp10)})`);

// 3) älterer Auto-Save über neueren Blöcken: nur dessen Ergebnisse
r = await page.evaluate(async () => {
    Engine.playNextMatchday(); Engine.saveGame(); App.triggerAutoSave(); const alt = __fp();
    for (let i = 0; i < 5; i++) Engine.playNextMatchday();
    App.restoreAutoSave(); return { alt, jetzt: __fp(), md: Engine.currentMatchday };
});
console.log('Auto-Save zurück:', JSON.stringify(r));
soll(r.jetzt.n === r.alt.n && r.jetzt.h === r.alt.h, `Auto-Save: Ergebnisse passen nicht zum Stand (${JSON.stringify(r)})`);

// 4) Export enthält alle Ergebnisse als r, Import daraus lädt sie, nächster Save schreibt wieder Blöcke
r = await page.evaluate(() => {
    for (let i = 0; i < 4; i++) Engine.playNextMatchday();
    const vor = __fp(), datei = JSON.parse(App._mergedSaveJson(localStorage.getItem('ba_save_v66')));
    localStorage.setItem('ba_save_v66', Engine._encodeSave(JSON.stringify(datei))); localStorage.removeItem('ba_res_v66');
    Engine.loadGame(); const nachImport = __fp(); Engine.saveGame();
    return { vor, exportR: datei.r ? datei.r.length : null, exportRc: 'rc' in datei, nachImport, blockeDanach: (__res() || {}).n, leanRc: __lean().rc };
});
console.log('Export/Import:', JSON.stringify(r));
soll(r.exportR === r.vor.n && !r.exportRc && r.nachImport.h === r.vor.h && r.blockeDanach === r.vor.n && r.leanRc === r.vor.n, `Export/Import falsch ${JSON.stringify(r)}`);

// 5) alter Spielstand (r im Spieltag-Save, kein ba_res_v66) lädt weiter
r = await page.evaluate(() => {
    const vor = __fp(), L = __lean(); L.r = Engine.seasonResults; delete L.rc;
    localStorage.setItem('ba_save_v66', Engine._encodeSave(JSON.stringify(L))); localStorage.removeItem('ba_res_v66');
    Engine.loadGame(); return { vor, nach: __fp() };
});
console.log('alter Stand mit r:', JSON.stringify(r));
soll(r.nach.h === r.vor.h && r.nach.n === r.vor.n, `alter Stand: Ergebnisse verloren ${JSON.stringify(r)}`);

// 6) fremde Kennung in den Blöcken -> KEINE fremden Ergebnisse, Fehler im Debug-Log
r = await page.evaluate(() => {
    Engine.saveGame(); const B = __res(); B.sid = 'fremder-stand'; localStorage.setItem('ba_res_v66', JSON.stringify(B));
    Engine.loadGame(); const n = Engine.seasonResults.length;
    const log = (Engine.logs || Engine.debugLog || []).slice(-5).map(x => JSON.stringify(x)).join(' ');
    return { n, log: /ba_res_v66/.test(log) };
});
console.log('fremde Kennung:', JSON.stringify(r));
soll(r.n === 0, `fremde Kennung: ${r.n} Ergebnisse übernommen`);

// 7) Saisonwechsel: neue Saison startet leer, keine alten Ergebnisse
await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await bereit(); await vorbereiten();
r = await page.evaluate(() => {
    while (Engine.playNextMatchday()) {}
    const t = performance.now(); Engine.saveGame(); const saveEnde = performance.now() - t;
    const nEnde = Engine.seasonResults.length;
    Engine.processSeasonTransition(); Engine.saveGame(); Engine.loadGame();
    return { saveEnde: Math.round(saveEnde), nEnde, nachWechsel: Engine.seasonResults.length, B: __res() && { n: __res().n, y: __res().y }, y: Engine.currentSeasonOffset };
});
console.log('Saisonwechsel:', JSON.stringify(r));
soll(r.nachWechsel === 0 && r.B && r.B.n === 0 && r.B.y === r.y, `Saisonwechsel: alte Ergebnisse ${JSON.stringify(r)}`);

// 8) Tempo: Save am Saisonende (nach dem ersten Block) – vorher ~470 ms
r = await page.evaluate(() => {
    while (Engine.playNextMatchday() && Engine.currentMatchday < 59) {}
    Engine.saveGame(); Engine.playNextMatchday();
    const t = performance.now(); Engine.seasonResults.push(Engine.seasonResults[0]); Engine.saveGame(); const ms = performance.now() - t; Engine.seasonResults.pop(); Engine.saveGame();
    return { md: Engine.currentMatchday, n: Engine.seasonResults.length, ms: Math.round(ms) };
});
console.log('Tempo Save Saisonende:', JSON.stringify(r));
soll(r.ms < 200, `Save am Saisonende ${r.ms} ms`);
if (fehler.length) befund.push(`JS-Fehler ${fehler.join(' / ')}`);
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
