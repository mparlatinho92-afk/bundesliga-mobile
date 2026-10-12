// Browser-Pruefung: Export-Dateiname traegt Saison, Version und Uhrzeit (App._exportName, v0.8.207), und die Saison im
// Namen ist die des exportierten Inhalts (Feld y). Spielt eine Saison durch, damit y != 0 geprueft wird.
// Exit 1 = Befund. --selbsttest: alter Name (nur Datum) - dann MUSS es durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';

const SELBST = process.argv.includes('--selbsttest');
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const page = await (await browser.newContext({ acceptDownloads: true })).newPage();
const fehler = [], befunde = [];
page.on('pageerror', e => fehler.push(String(e)));
await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 120000 });
// eine Saison durchspielen und speichern, damit der Stand y=1 traegt
await page.evaluate(() => { Engine.fastMode = true; Engine.simulateFullSeason(); Engine.processSeasonTransition(); Engine.saveGame(); });
if (SELBST) await page.evaluate(() => { App._exportName = (p) => p + '_' + new Date().toISOString().slice(0, 10) + '.json'; });
const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.evaluate(() => App.exportGameState())]);
const name = dl.suggestedFilename();
const pfad = await dl.path();
const inhalt = JSON.parse(fs.readFileSync(pfad, 'utf8'));
const erwartet = await page.evaluate(y => ({ saison: Engine.getFormattedSeason(y).replace('/', '-'), version: VERSION }), inhalt.y);
console.log(`Datei: ${name}   Inhalt y=${inhalt.y} -> ${erwartet.saison}, Version ${erwartet.version}`);
if (!/^bundesliga_\d{4}-\d{2}_v\d+\.\d+\.\d+_\d{4}-\d{2}-\d{2}_\d{4}\.json$/.test(name)) befunde.push('Name hat nicht die Form bundesliga_SAISON_vVERSION_DATUM_ZEIT.json');
if (!name.includes('_' + erwartet.saison + '_')) befunde.push(`Saison im Namen passt nicht zum Inhalt (${erwartet.saison})`);
if (!name.includes('_v' + erwartet.version + '_')) befunde.push(`Version fehlt (${erwartet.version})`);
if (inhalt.y !== 1) befunde.push(`Inhalt y=${inhalt.y}, erwartet 1`);
if (fehler.length) befunde.push('JS-Fehler ' + fehler[0]);
await browser.close();
console.log(befunde.length ? 'BEFUND:\n  ' + befunde.join('\n  ') : 'OK');
process.exit(befunde.length ? 1 : 0);
