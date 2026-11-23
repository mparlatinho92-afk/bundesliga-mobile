// Multi-Sim rückgängig + Chronik-Zurückschneiden beim Import (Nutzer 23.11.2026), template.html:
//  A) Lauf ab der Saisonmitte → ↩ (Kopfzeile) stellt Spielstand, Archiv, Ergebnisse UND IndexedDB-Chronik exakt wieder her
//  B) Sicherung verfällt nach dem nächsten Spieltag (↩ ist dann wieder „Spieltag rückgängig“)
//  C) Import eines älteren Exports derselben Kennung schneidet die späteren Saisons aus der Chronik
//   node .claude/skills/run/megasim_rueckgaengig_check.mjs [port]
//   node .claude/skills/run/megasim_rueckgaengig_check.mjs --selbsttest   IDBStore.deleteAb wirkungslos – A und C müssen durchfallen
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const befund = [], soll = (ok, t) => { console.log((ok ? '✓ ' : '✗ ') + t); if (!ok) befund.push(t); };
const browser = await chromium.launch();
const ctx = await browser.newContext({ acceptDownloads: true });
const page = await ctx.newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message));
let antwort = '3';
page.on('dialog', d => d.type() === 'prompt' ? d.accept(antwort) : d.accept());
const bereit = async () => { await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 }); await page.waitForTimeout(1200); };
const sabotage = () => SELBST && page.evaluate(() => { IDBStore.deleteAb = () => Promise.resolve(0); });
// Fingerabdruck: Saison/Spieltag, Ergebnisse, Ewige Tabelle 1. Liga, Chronik-Zeilen dieses Spielstands je Store
const abdruck = () => page.evaluate(async () => {
    const h = s => { let x = 0; for (let i = 0; i < s.length; i++) x = (x * 31 + s.charCodeAt(i)) | 0; return x; };
    const db = await new Promise(r => { const q = indexedDB.open('ba_archive_v1'); q.onsuccess = () => r(q.result); });
    const zaehl = st => new Promise(r => { const q = db.transaction(st, 'readonly').objectStore(st).getAll(); q.onsuccess = () => { const a = q.result.filter(x => x.sid === Engine.saveId); r({ n: a.length, max: a.reduce((m, x) => Math.max(m, parseInt(x.y) || 0), 0) }); }; });
    const chronik = { champions: await zaehl('champions'), season_tables: await zaehl('season_tables'), relegation: await zaehl('relegation') };
    db.close();
    return { saison: Engine.getFormattedSeason(), md: Engine.currentMatchday, res: h(JSON.stringify(Engine.seasonResults)), resN: Engine.seasonResults.length,
        ewige: h(JSON.stringify((Engine.archive && Engine.archive.ewige && Engine.archive.ewige['1']) || {})), hist: Engine.history.length, chronik };
});
const multiSim = async n => {
    antwort = String(n);
    await page.evaluate(() => App.megaSim());
    await page.waitForFunction(() => document.getElementById('megasim-summary').style.display === 'block', null, { timeout: 300000 });
};

await page.goto(`http://localhost:${PORT}/template.html`); await bereit();
await page.evaluate(() => { if (App.actionCfg) App.actionCfg.on = false; for (let i = 0; i < 8; i++) App.nextStep(); });
await page.waitForTimeout(800);

// A) rückgängig
const vor = await abdruck();
await multiSim(3);
const knopfImFenster = await page.evaluate(() => !!document.getElementById('megasim-undo'));
await page.evaluate(() => App._megaSimClose());
const nach = await abdruck();
const kopf = await page.evaluate(() => { const b = document.getElementById('btn-undo'); return { aus: b.disabled, title: b.title }; });
console.log('vor ', JSON.stringify(vor)); console.log('nach', JSON.stringify(nach));
soll(nach.saison !== vor.saison && nach.chronik.season_tables.n > vor.chronik.season_tables.n, `A: Lauf hat simuliert (${vor.saison} → ${nach.saison})`);
soll(knopfImFenster, 'A: Rückgängig-Knopf in der Zusammenfassung');
soll(!kopf.aus && /Multi-Sim rückgängig/.test(kopf.title), `A: ↩ in der Kopfzeile aktiv: ${JSON.stringify(kopf)}`);
await sabotage();
await Promise.all([page.waitForEvent('load', { timeout: 120000 }), page.click('#btn-undo')]);
await bereit();
const zurueck = await abdruck();
console.log('zur.', JSON.stringify(zurueck));
for (const k of ['saison', 'md', 'res', 'resN', 'ewige', 'hist']) soll(zurueck[k] === vor[k], `A: ${k} wie vor dem Lauf (${vor[k]} / ${zurueck[k]})`);
soll(JSON.stringify(zurueck.chronik) === JSON.stringify(vor.chronik), `A: Chronik wie vor dem Lauf ${JSON.stringify(vor.chronik)} / ${JSON.stringify(zurueck.chronik)}`);
soll(await page.evaluate(() => !App._megaSichGueltig() && localStorage.getItem('ba_megasich_v1') === null), 'A: Marke danach weg');

// B) Verfall nach einem Spieltag
await multiSim(1);
await page.evaluate(() => App._megaSimClose());
const gueltig1 = await page.evaluate(() => !!App._megaSichGueltig());
await page.evaluate(() => App.nextStep()); await page.waitForTimeout(600);
const b2 = await page.evaluate(() => ({ g: !!App._megaSichGueltig(), title: document.getElementById('btn-undo').title }));
soll(gueltig1 && !b2.g && /Letzten Spieltag/.test(b2.title), `B: gültig direkt nach dem Lauf (${gueltig1}), verfallen nach einem Spieltag (${JSON.stringify(b2)})`);

// C) Import eines älteren Exports schneidet die Chronik
await multiSim(1); await page.evaluate(() => App._megaSimClose());   // Saison zu Ende → sauberer Saisonstart für den Export
await page.waitForTimeout(800);
const dl = page.waitForEvent('download');
await page.evaluate(() => App.exportGameState());
const datei = path.join(os.tmpdir(), 'megasim_rueck_export.json');
await (await dl).saveAs(datei);
const beimExport = await abdruck();
await multiSim(2); await page.evaluate(() => App._megaSimClose());
const spaeter = await abdruck();
await sabotage();
await page.setInputFiles('#importFileInput', datei);
await page.waitForFunction(() => /Importiert/.test(document.body.textContent), null, { timeout: 120000 }).catch(() => {});
await page.waitForTimeout(2500);
const importiert = await abdruck();
console.log('Export', JSON.stringify(beimExport.chronik), '| später', JSON.stringify(spaeter.chronik), '| nach Import', JSON.stringify(importiert.chronik));
soll(spaeter.chronik.season_tables.n > beimExport.chronik.season_tables.n, 'C: nach dem Export kamen Saisons dazu');
soll(JSON.stringify(importiert.chronik) === JSON.stringify(beimExport.chronik), `C: Chronik nach Import = Stand beim Export`);
fs.rmSync(datei, { force: true });

soll(!fehler.length, 'keine JS-Fehler ' + fehler.slice(0, 3).join(' | '));
await browser.close();
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles grün.');
process.exit(befund.length ? 1 : 0);
