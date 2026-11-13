// Multi-Saison (App.megaSim) im Browser, template.html (Nutzer 28.10.2026: lief bis 3501, Knopf unklar):
// Vorgabe 10 + Ziel-Saison, Obergrenze 250, 0 startet nichts, Knopf beim ZWEITEN Lauf wieder „Stoppen“ und stoppt wirklich.
//   node .claude/skills/run/megasim_check.mjs [port]
//   node .claude/skills/run/megasim_check.mjs --selbsttest   alter Fehler nachgestellt (Knopf bleibt „Schließen“) – muss durchfallen
import { chromium } from 'playwright';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 412, height: 915 } });
const fehler = []; page.on('pageerror', e => fehler.push(e.message));
let antwort = '3', frage = '';
page.on('dialog', d => { if (d.type() === 'prompt') { frage = d.message() + ' [' + d.defaultValue() + ']'; d.accept(antwort); } else d.accept(); });
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const zustand = () => page.evaluate(() => ({ c: document.getElementById('megasim-counter').textContent, b: document.getElementById('megasim-btn').textContent,
    auf: document.getElementById('megasim-overlay').style.display, s: Engine.getFormattedSeason() }));
const fertig = () => page.waitForFunction(() => document.getElementById('megasim-summary').style.display === 'block', null, { timeout: 300000 });

// 1) 3 Saisons: Frage nennt Vorgabe 10 + Zielsaison, Zähler „/ 3 Saisons · bis 2027/28“, Ergebnis ✓ 3
await page.evaluate(() => App.megaSim());
await page.waitForFunction(() => /\/ 3 Saisons/.test(document.getElementById('megasim-counter').textContent));
let z = await zustand();
console.log(`Frage: ${frage.replace(/\n/g, ' / ')}\nLauf 1: ${z.c} | Knopf ${z.b}`);
soll(/\[10\]$/.test(frage) && /10 Saisons = bis 2034\/35/.test(frage) && /250/.test(frage), `Frage ohne Vorgabe 10/Ziel/Obergrenze: ${frage}`);
soll(/bis 2027\/28/.test(z.c) && /Stoppen/.test(z.b), `Lauf 1: Zähler/Knopf falsch: ${JSON.stringify(z)}`);
await fertig(); z = await zustand();
console.log(`Lauf 1 Ende: ${z.c} | Knopf ${z.b} | Saison jetzt ${z.s}`);
soll(/✓ 3 Saisons/.test(z.c) && z.b === 'Schließen', `Lauf 1 Ende falsch: ${JSON.stringify(z)}`);
await page.evaluate(() => App._megaSimClose());

// 2) Zweiter Lauf, 50 Saisons: Knopf muss wieder „Stoppen“ sein und den Lauf beenden (alter Fehler: „Schließen“, rechnete weiter)
antwort = '50';
if (SELBST) await page.evaluate(() => { const alt = App.megaSim; App.megaSim = function () { alt.call(this); const b = document.getElementById('megasim-btn'); b.textContent = 'Schließen'; b.onclick = () => { document.getElementById('megasim-overlay').style.display = 'none'; }; }; });
await page.evaluate(() => App.megaSim());
await page.waitForFunction(() => /^1 \/ 50/.test(document.getElementById('megasim-counter').textContent), null, { timeout: 60000 });
z = await zustand();
console.log(`Lauf 2: ${z.c} | Knopf ${z.b}`);
soll(/Stoppen/.test(z.b), `Lauf 2: Knopf heißt „${z.b}“ statt Stoppen`);
// Uhr (Gesamtdauer): läuft mit, steht am Ende als „Gesamtdauer“ und bleibt dann stehen
const uhr = () => page.evaluate(() => (document.getElementById('megasim-uhr') || {}).textContent || '');
const u1 = await uhr(); await page.waitForTimeout(2200); const u2 = await uhr();
console.log(`Uhr: ${u1} → ${u2}`);
soll(/^⏱ \d+:\d\d$/.test(u1) && u2 !== u1, `Uhr läuft nicht mit (${u1} → ${u2})`);
await page.click('#megasim-btn');
// die laufende Saison wird noch fertig gerechnet, danach darf sich nichts mehr bewegen
await page.waitForFunction(() => document.getElementById('megasim-summary').style.display === 'block', null, { timeout: 20000 }).catch(() => {});
const nachKlick = await page.evaluate(() => Engine.getFormattedSeason());
await page.waitForTimeout(4000);
z = await zustand();
const spaeter = await page.evaluate(() => Engine.getFormattedSeason());
console.log(`Lauf 2 nach Stoppen: ${z.c} | Saison ${nachKlick} → 4 s später ${spaeter}`);
soll(/Gestoppt nach \d+ von 50 Saisons/.test(z.c), `Lauf 2: kein „Gestoppt nach … von 50“: ${z.c}`);
soll(spaeter === nachKlick, `Lauf 2 rechnet nach dem Klick weiter (${nachKlick} → ${spaeter})`);
const u3 = await uhr(); await page.waitForTimeout(1500); const u4 = await uhr();
console.log(`Uhr am Ende: ${u3} | 1,5 s später ${u4}`);
soll(/^⏱ Gesamtdauer \d+:\d\d$/.test(u3) && u3 === u4, `Uhr am Ende falsch oder läuft weiter (${u3} → ${u4})`);
if (SELBST) await page.evaluate(() => { App._megaSimCancelled = true; });   // Hintergrundlauf der Sabotage beenden
await page.evaluate(() => App._megaSimClose());

// 3) Obergrenze: 999 → 250; 4) 0 → startet nicht
antwort = '999';
await page.evaluate(() => App.megaSim());
await page.waitForFunction(() => /\/ 250 Saisons/.test(document.getElementById('megasim-counter').textContent), null, { timeout: 10000 }).catch(() => {});
z = await zustand();
console.log(`999 eingegeben: ${z.c}`);
soll(/\/ 250 Saisons/.test(z.c), `Obergrenze greift nicht: ${z.c}`);
await page.click('#megasim-btn'); await fertig(); await page.evaluate(() => App._megaSimClose());
antwort = '0';
const vor = await page.evaluate(() => Engine.getFormattedSeason());
await page.evaluate(() => App.megaSim()); await page.waitForTimeout(1500);
z = await zustand();
soll(z.auf === 'none' && z.s === vor, `0 eingegeben startet doch: ${JSON.stringify(z)}`);
if (fehler.length) befund.push(`JS-Fehler ${fehler.join(' / ')}`);
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
