// Teilnehmer-Hervorhebung + anklickbare Saisons (Nutzer 27.10.2026) im Browser (template.html).
// Zwei Saisons vorsimulieren (history-Fenster), dann klicken: Ewige Tabelle der Bundesliga (heute / Stepper / Archiv 1987/88
// + „Gesamtstand heute“), Meisterliste (Hervorhebung je Saison, Klick auf 1987/88), DFB-Pokal und Amateurpokal.
//   node .claude/skills/run/teilnehmer_check.mjs [port]
//   node .claude/skills/run/teilnehmer_check.mjs --selbsttest   _teilnehmerLiga liefert immer die heutigen → muss durchfallen
import { chromium } from 'playwright';
import fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/teilnehmer/';
fs.mkdirSync(OUT, { recursive: true });
const befund = [], soll = (ok, txt) => { if (!ok) befund.push(txt); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    await page.goto(`http://localhost:${PORT}/template.html`);
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
    await page.evaluate(() => {
        Engine.fastMode = true;
        for (let s = 0; s < 2; s++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
        Engine.fastMode = false; Engine.saveGame();
    });
    if (SELBST) await page.evaluate(() => { const echt = App._teilnehmerLiga; App._teilnehmerLiga = function (lids) { return echt.call(this, lids, null); }; });
    const live = await page.evaluate(() => Engine.getFormattedSeason());
    const zaehl = () => page.evaluate(() => ({ akt: document.querySelectorAll('#content tr.akt, #content .akt-row').length,
        leg: (document.querySelector('#content .akt-leg') || {}).textContent || '',
        ids: [...document.querySelectorAll('#ew-tab tr.akt .tmn')].map(e => e.dataset.full) }));
    const warte = sel => page.waitForFunction(s => !document.querySelector(s), sel, { timeout: 60000 }).catch(() => befund.push(`${geraet}: ${sel} bleibt stehen`));

    // 1) Ewige Tabelle Bundesliga, heute
    await page.evaluate(() => { App._navSaisonSetzen(null, '1'); App.ewigeSeasonIdx = null; App.tableView = 'ewige'; App.loadLeague('1'); });
    let z = await zaehl();
    const heute = await page.evaluate(() => Object.values(Engine.teams).filter(t => t.leagueId === '1').map(t => t.name).sort());
    console.log(`${geraet} Ewige heute: ${z.akt} hervorgehoben, Legende "${z.leg}"`);
    soll(z.akt === heute.length, `${geraet} Ewige heute: ${z.akt} statt ${heute.length} hervorgehoben`);
    soll(z.leg.includes(live), `${geraet} Ewige heute: Legende "${z.leg}" ohne ${live}`);
    await page.screenshot({ path: `${OUT}${geraet}-ewige-heute.png` });
    const breit = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (breit > 1) console.log(`   Hinweis: Seite ${breit}px breiter als der Bildschirm (Ewige Tabelle scrollt waagerecht)`);

    // 2) Stepper eine Saison zurück → Teilnehmer jener Saison (history-Fenster)
    await page.evaluate(() => App._ewigeNav(-1));
    z = await zaehl();
    const vor = await page.evaluate(() => { const h = Engine.history[App.ewigeSeasonIdx]; return { y: h.year, n: Object.values(h.teams).filter(t => t.leagueId === '1').map(t => t.name).sort() }; });
    console.log(`${geraet} Ewige Stepper ${vor.y}: ${z.akt} hervorgehoben, Legende "${z.leg}"`);
    soll(JSON.stringify(z.ids.sort()) === JSON.stringify(vor.n), `${geraet} Stepper ${vor.y}: Hervorhebung ≠ Teilnehmer ${vor.y}`);
    soll(JSON.stringify(vor.n) !== JSON.stringify(heute), `${geraet} Stepper: ${vor.y} und heute haben dieselben Vereine – Prüfung trennt nicht`);

    // 3) Archiv 1987/88 → Stand nach Saison, Teilnehmer von damals; dann „Gesamtstand heute“
    await page.evaluate(() => { App.ewigeSeasonIdx = null; App._sbSaisonGo('1', '1987/88'); App.tableView = 'ewige'; App.loadLeague('1'); });
    await warte('#ew-stand-lade');
    await page.waitForTimeout(300);
    z = await zaehl();
    console.log(`${geraet} Ewige Stand nach 1987/88: ${z.akt} hervorgehoben, Legende "${z.leg}", z. B. ${z.ids.slice(0, 4).join(', ')}`);
    soll(z.akt === 18, `${geraet} 1987/88: ${z.akt} statt 18 hervorgehoben`);
    soll(z.leg.includes('1987/88'), `${geraet} 1987/88: Legende "${z.leg}"`);
    soll(z.ids.some(n => /Werder/.test(n)) && z.ids.some(n => /Homburg/.test(n)), `${geraet} 1987/88: Werder/Homburg nicht hervorgehoben`);
    await page.screenshot({ path: `${OUT}${geraet}-ewige-1987.png` });
    await page.click('#ew-heute');
    await page.waitForTimeout(300);
    z = await zaehl();
    console.log(`${geraet} Gesamtstand heute (aus 1987/88): ${z.akt} hervorgehoben, Legende "${z.leg}"`);
    soll(z.akt === heute.length && z.leg.includes(live), `${geraet} Gesamtstand heute: ${z.akt} / "${z.leg}"`);

    // 4) Meisterliste. Spiel-Ligen haben den Reiter nur live und im history-Fenster (Archivansicht: Abschluss + Ewige),
    //    reine Archiv-Ligen (DDR-Oberliga) in jeder Saison.
    const chron = () => page.waitForFunction(() => document.querySelector('#sieger-chron .sg-saison'), null, { timeout: 60000 }).catch(() => befund.push(`${geraet}: Meister-Chronik lädt nicht`));
    const hervor = () => page.$$eval('#sieger-chron tr.akt td:nth-child(2) > span:first-of-type', els => [...new Set(els.map(e => e.textContent.trim()))]);
    // 4a) Bundesliga in der Saison davor (history-Fenster): hervorgehoben = Meister, die DAMALS in der Liga spielten
    await page.evaluate(() => { App._navSaisonSetzen(Engine.history[Engine.history.length - 1].year, '1'); App.tableView = 'sieger'; App.loadLeague('1'); });
    await chron();
    const mH = await hervor();
    const sollH = await page.evaluate(() => { const h = Engine.history[Engine.history.length - 1], drin = new Set(Object.entries(h.teams).filter(([, t]) => t.leagueId === '1').map(([id]) => id));
        return Object.keys((Engine.archive.ewige || {})['1'] || {}).filter(id => (Engine.archive.ewige['1'][id].titles || 0) > 0 && drin.has(id)).length; });
    console.log(`${geraet} BL-Meister in ${vor.y} hervorgehoben (${mH.length}, Soll ${sollH}): ${mH.slice(0, 6).join(', ')}`);
    soll(mH.length === sollH && sollH > 0, `${geraet} BL-Meister ${vor.y}: ${mH.length} statt ${sollH} hervorgehoben`);
    // 4a') Bundesliga 1987/88 (Archiv): Reiter „Meister“ anklicken – damalige BL-Vereine hervorgehoben
    await page.evaluate(() => { App._sbSaisonGo('1', '1987/88'); });
    await page.waitForFunction(() => [...document.querySelectorAll('#content button')].some(b => /Meister/.test(b.textContent)), null, { timeout: 60000 })
        .catch(() => befund.push(`${geraet}: Reiter Meister fehlt in der Archivansicht 1987/88`));
    await page.evaluate(() => [...document.querySelectorAll('#content button')].find(b => /Meister/.test(b.textContent)).click());
    await chron();
    await page.waitForTimeout(500);
    const mB = await hervor(), legB = await page.evaluate(() => (document.querySelector('#content .akt-leg') || {}).textContent || '');
    console.log(`${geraet} BL-Meister im Archiv 1987/88 hervorgehoben: ${mB.join(', ')} | Legende "${legB}"`);
    soll(mB.some(n => /Bayern/.test(n)) && mB.some(n => /Nürnberg/.test(n)) && mB.some(n => /Kaiserslautern/.test(n)), `${geraet} BL-Archiv 1987/88: Bayern/Nürnberg/Kaiserslautern fehlen`);
    soll(!mB.some(n => /Braunschweig|1860|Wolfsburg/.test(n)), `${geraet} BL-Archiv 1987/88: Braunschweig/1860/Wolfsburg (damals nicht in der BL) hervorgehoben`);
    soll(legB.includes('1987/88'), `${geraet} BL-Archiv 1987/88: Legende "${legB}"`);
    await page.screenshot({ path: `${OUT}${geraet}-meister-bl-1987.png` });
    // 4b) DDR-Oberliga 1987/88: Meister, die 1987/88 in der Oberliga spielten; Klick auf eine Saison
    await page.evaluate(() => { App._sbSaisonGo('ddr1', '1987/88'); App.tableView = 'sieger'; App.loadLeague('ddr1'); });
    await chron();
    await page.waitForTimeout(500);
    const mD = await hervor(), alleD = await page.$$eval('#sieger-chron tr td:nth-child(2) > span:first-of-type', els => new Set(els.map(e => e.textContent.trim())).size);
    const legD = await page.evaluate(() => (document.querySelector('#content .akt-leg') || {}).textContent || '');
    console.log(`${geraet} DDR-Meister in 1987/88 hervorgehoben (${mD.length} von ${alleD}): ${mD.join(', ')} | Legende "${legD}"`);
    soll(mD.length > 0 && mD.length < alleD, `${geraet} DDR 1987/88: ${mD.length} von ${alleD} hervorgehoben`);
    soll(mD.some(n => /Dresden/.test(n)) && mD.some(n => /Magdeburg/.test(n)), `${geraet} DDR 1987/88: Dresden/Magdeburg fehlen`);
    soll(legD.includes('1987/88'), `${geraet} DDR 1987/88: Legende "${legD}"`);
    await page.screenshot({ path: `${OUT}${geraet}-meister-ddr-1987.png` });
    await page.evaluate(() => { const td = [...document.querySelectorAll('#sieger-chron .sg-saison')].find(e => e.textContent.trim() === '1977/78'); td && td.click(); });
    await page.waitForTimeout(500);
    const nach = await page.evaluate(() => ({ y: App.viewArchivedSeason && App.viewArchivedSeason.y, tv: App.tableView, zeilen: document.querySelectorAll('#content table tbody tr').length }));
    console.log(`${geraet} Klick 1977/78 → Saison ${nach.y}, Ansicht ${nach.tv}, ${nach.zeilen} Tabellenzeilen`);
    soll(nach.y === '1977/78' && nach.tv === 'gesamt' && nach.zeilen >= 14, `${geraet} Klick 1977/78 landet falsch: ${JSON.stringify(nach)}`);

    // 5) DFB-Pokal: Ewige (Feld heute = 64), Sieger mit Klick in eine history-Saison
    await page.evaluate(() => { App._navSaisonSetzen(null, '1'); App.ewigeSeasonIdx = null; App.pokalTab = -2; App.showPokal(); });
    z = await zaehl();
    console.log(`${geraet} Pokal Ewige: ${z.akt} hervorgehoben, Legende "${z.leg}"`);
    soll(z.akt === 64, `${geraet} Pokal Ewige: ${z.akt} statt 64`);
    await page.evaluate(() => { App.pokalTab = -3; App.showPokal(); });
    const kl = await page.$$eval('#content .sg-saison', els => els.map(e => e.textContent.trim()));
    console.log(`${geraet} Pokal Sieger: anklickbar ${kl.join(', ')}`);
    soll(kl.length >= 2, `${geraet} Pokal Sieger: nur ${kl.length} Saisons anklickbar`);
    const ziel = await page.evaluate(() => Engine.history[Engine.history.length - 1].year);
    await page.evaluate(y => [...document.querySelectorAll('#content .sg-saison')].find(e => e.textContent.trim() === y).click(), ziel);
    await page.waitForTimeout(300);
    const pk = await page.evaluate(() => ({ h: App.viewHistoryOffset, tab: App.pokalTab, rn: (document.querySelector('.pokal-tab-btn.active') || {}).textContent }));
    console.log(`${geraet} Pokal Klick ${ziel} → history ${pk.h}, Reiter "${pk.rn}"`);
    soll(pk.h === await page.evaluate(() => Engine.history.length - 1) && /Finale/.test(pk.rn || ''), `${geraet} Pokal-Klick landet falsch: ${JSON.stringify(pk)}`);
    await page.screenshot({ path: `${OUT}${geraet}-pokal-saison.png` });

    // 6) Amateurpokal Ewige: Feld heute
    await page.evaluate(() => { App._navSaisonSetzen(null, '1'); App.amateurTab = -2; App.showAmateurpokal(); });
    z = await zaehl();
    const feld = await page.evaluate(() => App._teilnehmerCup('a', null).size);
    console.log(`${geraet} Amateurpokal Ewige: ${z.akt} hervorgehoben (Feld ${feld})`);
    soll(z.akt === feld && feld > 0, `${geraet} Amateurpokal: ${z.akt} statt ${feld}`);

    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST) { console.log(befund.length ? `Selbsttest bestanden: die Sabotage wurde erkannt (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
