// IndexedDB-Upgrade v2 → v3 (Sicherungsplatz für „Multi-Sim rückgängig“, v0.8.236) mit ECHTEM altem Code (Nutzer 23.11.2026):
//  1) alter Monolith (DB v2) spielt 3 Saisons → Spielstand + Chronik
//  2) template.html (DB v3) im selben Profil: Version 3, Store „sicherung“, Chronik und Saison unverändert, Rückgängig läuft
//  3) alter Tab bleibt offen (alter Code gibt die Verbindung nicht frei): öffnet der neue Code trotzdem? (blockiertes Upgrade)
// Kein Server nötig: page.route liefert die Projektdateien unter einer festen Adresse aus.
//   node .claude/skills/run/idb_upgrade_check.mjs [alter-monolith.html]      Vorgabe: bundesliga-v0.8.235.2.html
//   node .claude/skills/run/idb_upgrade_check.mjs --selbsttest               löscht nach dem Upgrade eine Chronik-Zeile – muss durchfallen
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const SELBST = process.argv.includes('--selbsttest');
const ALT = process.argv.slice(2).find(a => a.endsWith('.html')) || 'bundesliga-v0.8.235.2.html';
const BASIS = 'http://ba.test/';
const befund = [], soll = (ok, t) => { console.log((ok ? '✓ ' : '✗ ') + t); if (!ok) befund.push(t); };
const TYP = { '.html': 'text/html', '.js': 'application/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg' };

const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route(BASIS + '**', r => {
    const rel = decodeURIComponent(new URL(r.request().url()).pathname).replace(/^\//, '');
    const f = path.join(ROOT, rel);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ status: 200, contentType: TYP[path.extname(f)] || 'application/octet-stream', body: fs.readFileSync(f) });
});
const fehler = [];
const neueSeite = async () => { const p = await ctx.newPage(); p.on('pageerror', e => fehler.push(e.message)); p.on('dialog', d => d.type() === 'prompt' ? d.accept(p.__antwort || '3') : d.accept()); return p; };
const bereit = p => p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 90000 }).then(() => p.waitForTimeout(1500));
const dbStand = (p, bis) => p.evaluate(async bis => {
    const db = await new Promise((res, rej) => { const q = indexedDB.open('ba_archive_v1'); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
    const zaehl = st => new Promise(r => { const q = db.transaction(st, 'readonly').objectStore(st).getAll(); q.onsuccess = () => r(q.result.filter(x => !bis || (parseInt(x.y) || 0) < bis).length); });
    const out = { version: db.version, stores: [...db.objectStoreNames].sort(), champions: await zaehl('champions'), season_tables: await zaehl('season_tables'), relegation: await zaehl('relegation') };
    db.close(); return out;
}, bis || 0);

// 1) alter Stand
const alt = await neueSeite();
await alt.goto(BASIS + ALT); await bereit(alt);
await alt.evaluate(() => App.megaSim());
await alt.waitForFunction(() => document.getElementById('megasim-summary').style.display === 'block', null, { timeout: 300000 });
await alt.evaluate(() => App._megaSimClose());
await alt.waitForTimeout(1500);
const vor = await dbStand(alt);
const saisonVor = await alt.evaluate(() => Engine.getFormattedSeason());
console.log(`alt (${ALT}): Saison ${saisonVor}, DB ${JSON.stringify(vor)}`);
soll(vor.version === 2 && !vor.stores.includes('sicherung') && vor.season_tables > 0, 'Ausgangslage: DB v2 mit Chronik, ohne Sicherungsplatz');

// 3) alter Tab bleibt OFFEN, neuer Code öffnet daneben (Upgrade muss auf den alten Tab warten)
const neu = await neueSeite();
await neu.goto(BASIS + 'template.html'); await bereit(neu);
// Die Datenbank KANN hier nicht öffnen (alter Code gibt nicht frei) – erwartet: Hinweis in der Statuszeile, und die Multi-Sim
// hängt nicht bei „Sichere den Spielstand …“, sondern fragt sofort (ohne rückgängig) und läuft durch.
const status = await neu.evaluate(() => (document.getElementById('saveStatus') || {}).textContent || '');
console.log('neuer Tab bei offenem altem Tab – Statuszeile:', status);
soll(/Datenbank-Update wartet/.test(status), '3: Hinweis „ältere Tabs schließen“ in der Statuszeile');
const fragen = []; neu.on('dialog', d => fragen.push(d.message()));
neu.__antwort = '1';
await neu.evaluate(() => App.megaSim());
const lief = await neu.waitForFunction(() => document.getElementById('megasim-summary').style.display === 'block', null, { timeout: 60000 }).then(() => true, () => false);
const blockFrage = fragen.find(f => /Sicherung/.test(f)) || '';
soll(lief && /ältere Tabs/.test(blockFrage), `3: Multi-Sim hängt nicht, fragt nach (${blockFrage.split('\n')[0] || 'keine Frage'}) und läuft durch (${lief})`);
soll(await neu.evaluate(() => !document.getElementById('megasim-undo') && !App._megaSichGueltig()), '3: ohne Sicherung kein Rückgängig-Knopf');
const saisonNachBlock = await neu.evaluate(() => Engine.getFormattedSeason());
await neu.evaluate(() => App._megaSimClose());
await alt.close();
// Jetzt läuft das Upgrade; die im blockierten Zustand gepufferten Chronik-Zeilen werden erst JETZT geschrieben – abwarten,
// sonst verwirft das Neuladen sie (beim Nutzer: neuen Tab vor dem alten schließen = diese Saisons fehlen im Archiv)
await neu.evaluate(() => IDBStore.available()); await neu.waitForTimeout(2000);

// 2) Upgrade-Ergebnis
await neu.reload(); await bereit(neu);
if (SELBST) await neu.evaluate(() => new Promise(r => { const q = indexedDB.open('ba_archive_v1'); q.onsuccess = () => { const t = q.result.transaction('season_tables', 'readwrite'); const c = t.objectStore('season_tables').openCursor(); c.onsuccess = e => { if (e.target.result) e.target.result.delete(); }; t.oncomplete = () => { q.result.close(); r(); }; }; }));
const bis = parseInt(saisonVor);   // nur Saisons VOR dem Lauf im blockierten Tab – die gehörten dem alten Stand
const nachAlt = await dbStand(neu, bis), nach = await dbStand(neu);
const saisonNach = await neu.evaluate(() => Engine.getFormattedSeason());
console.log(`neu (template.html): Saison ${saisonNach}, DB ${JSON.stringify(nach)}`);
soll(nach.version === 3 && nach.stores.includes('sicherung'), '2: DB auf v3, Store „sicherung“ angelegt');
soll(nachAlt.champions === vor.champions && nachAlt.season_tables === vor.season_tables && nachAlt.relegation === vor.relegation, `2: alte Chronik unverändert (${vor.season_tables} / ${nachAlt.season_tables} Tabellen; dazu ${nach.season_tables - nachAlt.season_tables} aus dem Lauf im blockierten Tab)`);
soll(saisonNach === saisonNachBlock, `2: Spielstand übernommen (${saisonVor} + Lauf im blockierten Tab = ${saisonNachBlock} / ${saisonNach})`);

// Rückgängig mit dem übernommenen Stand
neu.__antwort = '2';
await neu.evaluate(() => App.megaSim());
await neu.waitForFunction(() => document.getElementById('megasim-summary').style.display === 'block', null, { timeout: 300000 });
await neu.evaluate(() => App._megaSimClose());
const nachLauf = await neu.evaluate(() => Engine.getFormattedSeason());
await Promise.all([neu.waitForEvent('load', { timeout: 120000 }), neu.click('#btn-undo')]);
await bereit(neu);
const zurueck = await dbStand(neu), saisonZ = await neu.evaluate(() => Engine.getFormattedSeason());
soll(nachLauf !== saisonNach && saisonZ === saisonNach && zurueck.season_tables === nach.season_tables && zurueck.champions === nach.champions,
    `2: Multi-Sim rückgängig auf dem übernommenen Stand (${saisonNach} → ${nachLauf} → ${saisonZ}, Tabellen ${nach.season_tables}/${zurueck.season_tables})`);

soll(!fehler.length, 'keine JS-Fehler ' + fehler.slice(0, 3).join(' | '));
await browser.close();
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles grün.');
process.exit(befund.length ? 1 : 0);
