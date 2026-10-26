// Browser-Pruefung der Fusionen (tools/hist_fusion.json) gegen template.html: Steckbrief-Block VORGAENGER / AUFGEGANGEN IN
// und Vorgaenger-Linien im Ligaverlauf, Desktop + Handy, dunkel + hell.
// node .claude/skills/run/fusion_check.mjs   -> Screenshots nach docs/fusion/ ; Exit 1 = Befund
// --selbsttest: HIST_EXT.fusion wird vorher geleert – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/fusion');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));

async function lauf(name, ctxOpt, theme) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('console', m => { if (m.type() === 'error') fehler.push(m.text()); });
    page.on('pageerror', e => fehler.push(String(e)));
    await page.addInitScript(t => { localStorage.setItem('theme', t); localStorage.setItem('ba_sb_verlauf_hist', '1'); }, theme);
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => { HIST_EXT.fusion = {}; HIST_EXT.nachfolgerExtern = {}; });
    const faelle = [
        { id: 'fcingolstadt04_4', block: 'VORGÄNGER', linien: 2, namen: ['MTV Ingolstadt', 'ESV Ingolstadt'] },
        { id: 'hist_bsv07schwenningen', block: 'VORGÄNGER', linien: 2, namen: ['VfR Schwenningen', 'SC Schwenningen'] },
        { id: 'hist_fa_vfrschwenningen', block: 'AUFGEGANGEN IN', linien: 0, namen: ['BSV 07 Schwenningen'] },
        { id: 'vfbmerseburg_897', block: 'VORGÄNGER', linien: 1, namen: ['Buna Schkopau'] },
        // DDR (v0.8.213): Ewige Tabellen + fussball-ddr.de; Einheit -> KKW (Anschluss 1968) -> Greifswalder FC (1990)
        { id: 'hist_fa_kkwgreifswald', block: 'AUFGEGANGEN IN', linien: 1, namen: ['Greifswalder FC', 'KKW Nord Greifswald', 'Einheit Greifswald'] },
        // zwei Fusionen mit eigenem Jahr je Vorgaenger (jahrJe, 17.10.2026): Jahr steht dann in der Zeile, nicht im Kopf
        { id: 'greifswalderfc_699', block: 'VORGÄNGER · Fusionen', linien: 2, namen: ['KKW Greifswald', 'FC Pommern Greifswald', '1990 ·', '2015 ·'] },
        { id: 'fcviktoriakoeln_1071', block: 'VORGÄNGER · Fusionen', linien: 2, namen: ['SC Brück', 'FC Junkersdorf', '1994 ·', '2011 ·'] },
        { id: 'hist_fa_fcjunkersdorf', block: 'AUFGEGANGEN IN', linien: 0, namen: ['Viktoria Köln', 'Fusion 2011'] },
        // Flensburg (17.10.2026): Spiel-ID trug bis 2003 Flensburg 08; jetzt Weiche 2007+, Flensburg 08 eigene Linie 1963-2016
        { id: 'scweicheflensburg08_641', block: 'VORGÄNGER · Fusionen', linien: 2, namen: ['Flensburg 08', 'TSV Weiche-West', '1972 ·', '2017 ·', 'ETSV Weiche'] },
        { id: 'skgrodgau1888_1060', block: 'VORGÄNGER · Fusion 2014', linien: 2, namen: ['TGM SV Jügesheim', 'TGS Jügesheim'] },
        // Remscheid: Marathon + BV 08 -> VfB Remscheid 1971 -> FC Remscheid 1990 (vorher stand Marathon direkt beim FC)
        { id: 'fcremscheid_1158', block: 'VORGÄNGER · Fusion 1990', linien: 1, namen: ['VfB Remscheid'] },
        { id: 'hist_fa_vfbremscheid', block: 'VORGÄNGER · Fusion 1971', linien: 2, namen: ['Marathon Remscheid', 'BV Remscheid', 'AUFGEGANGEN IN'] },
        { id: 'sv09arnstadt_845', block: 'VORGÄNGER', linien: 1, namen: ['Motor Rudisleben'] },
        // Nutzer 25.10.2026: Thüringenliga-Meister 2015/16 verzichtete auf die Oberliga und ging am 1.7.2016 mit Fortuna Gräfentonna
        // (nicht im Bestand) in den FC An der Fahner Höhe auf (Wikipedia FC An der Fahner Höhe)
        { id: 'fcanderfahnerhoehe_859', block: 'VORGÄNGER', linien: 1, namen: ['Dachwig'] },
        { id: 'hist_fb_fcsgblauweissdachwigdoellstaedt', block: 'AUFGEGANGEN IN', linien: 0, namen: ['Fahner Höhe', 'Fusion 2016'] },
        // FC Gießen = umbenannte Teutonia Watzenborn-Steinberg, VfB Gießen 2018 aufgenommen (Wikipedia FC Gießen, Nutzer 25.10.2026)
        { id: 'fcgiessen_996', block: 'VORGÄNGER', linien: 1, namen: ['VfB Gießen'] },
        { id: 'hist_fa_vfbgiessen', block: 'AUFGEGANGEN IN', linien: 0, namen: ['FC Gießen', 'Fusion 2018'] },
        // Umbenennungskette Empor -> Chemie Glas (1967) -> Chemie IW (1977): eine ID, damalige Namen sichtbar
        { id: 'hist_fa_chemieiwilmenau', block: 'VEREINSNAMEN', linien: 0, namen: ['Empor Ilmenau', 'Chemie Glas Ilmenau'] },
        // Nachfolger ausserhalb des Spiels (tools/hist_nachfolger.json, v0.8.217): heute / seit Jahr / Nachfolger + aufgeloest
        { id: 'hist_motorsteinach', block: 'VEREINSNAMEN', linien: 0, namen: ['SV 08 Steinach', 'nicht im Spiel'] },
        { id: 'hist_fa_chemielauscha', block: 'VEREINSNAMEN', linien: 0, namen: ['seit 2019', 'SG Lauscha'] },
        { id: 'hist_fa_lokcottbus', block: 'VEREINSNAMEN', linien: 0, namen: ['aufgelöst', 'Nachfolger', 'FSV Cottbus 99'] },
        // Schwerin (Nutzer 26.10.2026, Wikipedia FC Mecklenburg Schwerin): SG Dynamo -> 17.04.1990 PSV -> 1991 1. FSV -> 1997 FC Eintracht;
        // die SG Dynamo von heute ist 2003 neu gegründet und behält nur ihre eigenen Saisons
        { id: 'hist_fa_1fsvschwerin', block: 'AUFGEGANGEN IN', linien: 0, namen: ['Dynamo Schwerin', 'Polizei-SV Schwerin', 'PSV Schwerin', 'Fusion 1997', 'DDR-Liga'] },
        // verschwundene Meister (26.10.2026): Umbenennung mit damaligem Namen, Rückzug als Verbleib, Umbenennung 1990 + Fusion 2015
        { id: 'hist_fa_fcdossenheim', block: 'VEREINSNAMEN', linien: 0, namen: ['Sportfreunde Dossenheim', '1971/72'] },
        { id: 'hist_fb_tsvneuenkirch', block: 'VEREINSNAMEN', linien: 0, namen: ['TSV Neuenkirchen', 'Rückzug 2004'] },
        { id: 'hist_fa_motorsteinbachhallenberg', block: 'VEREINSNAMEN', linien: 0, namen: ['Grün-Weiß Steinbach', 'FC Steinbach-Hallenberg'] },
        { id: 'sgdynamoschwerin_714', block: 'KOORDINATEN', linien: 0, namen: ['Verbandsliga'], ohne: ['DDR-Liga'] },
    ];
    for (const f of faelle) {
        await page.evaluate(id => App.showSteckbrief(id), f.id);
        await page.waitForFunction(() => document.querySelector('#sbvl-svg') || (document.getElementById('sb-verlauf') && document.getElementById('sb-verlauf').dataset.done), null, { timeout: 15000 }).catch(() => {});
        await warte(600);
        const r = await page.evaluate(() => {
            const mc = document.querySelector('.modal-content'), txt = mc ? mc.innerText : '';
            const linien = document.querySelectorAll('#sbvl-svg path[stroke-dasharray]').length;
            const ueber = mc ? [...mc.querySelectorAll('span,div')].filter(e => e.getBoundingClientRect().right > window.innerWidth + 1).length : 0;
            return { txt, linien, ueber };
        });
        const tag = `${name} ${f.id}`;
        if (!r.txt.includes(f.block)) befunde.push(`${tag}: Block "${f.block}" fehlt`);
        f.namen.forEach(n => { if (!r.txt.includes(n)) befunde.push(`${tag}: "${n}" fehlt`); });
        (f.ohne || []).forEach(n => { if (r.txt.includes(n)) befunde.push(`${tag}: "${n}" steht noch drin`); });
        if (r.linien !== f.linien) befunde.push(`${tag}: ${r.linien} Vorgaenger-Linien statt ${f.linien}`);
        if (r.ueber) befunde.push(`${tag}: ${r.ueber} Elemente ragen rechts aus dem Bild`);
        // historische Vereine ohne Koordinaten zeigten "KOORDINATEN undefined, undefined" (behoben v0.8.215)
        if (/undefined|NaN/.test(r.txt)) befunde.push(`${tag}: "undefined"/"NaN" im Steckbrief`);
        const box = await page.$('.modal-content');
        if (box) await box.evaluate(e => { const v = document.getElementById('sb-verlauf'); if (v) v.scrollIntoView({ block: 'center' }); });
        if (!SELBST) await page.screenshot({ path: path.join(SHOT, `${name}-${f.id}.png`) });   // Selbsttest-Bilder wuerden die echten ueberschreiben
        await page.evaluate(() => App.closeModal && App.closeModal());
    }
    if (fehler.length) befunde.push(`${name}: JS-Fehler ${fehler.slice(0, 3).join(' | ')}`);
    await ctx.close();
}

await lauf('desktop-dunkel', { viewport: { width: 1400, height: 900 } }, 'dark');
await lauf('handy-hell', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, 'light');
await browser.close();
befunde.forEach(b => console.log('  FEHL ' + b));
if (SELBST) { console.log(befunde.length ? `Selbsttest bestanden (${befunde.length} Befunde)` : 'SELBSTTEST FEHLGESCHLAGEN'); process.exit(befunde.length ? 0 : 1); }
console.log(befunde.length ? `${befunde.length} Befund(e)` : `Alles gruen – Screenshots in ${SHOT}`);
process.exit(befunde.length ? 1 : 0);
