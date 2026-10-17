// Browser-Pruefung Seed v14 (17.10.2026): DDR-Oberliga 1949-55, 13 Seed-IDs beim heutigen Nachfolger.
// Archivtabellen zeigen den DAMALIGEN Namen (HISTORIC_NAMES), die Zeile fuehrt zum heutigen Verein, die Steckbriefe nennen den
// alten Namen, und die alte Seed-ID taucht in der Suche nicht mehr als eigener Verein auf.
// node .claude/skills/run/ddr_seed_check.mjs   Exit 1 = Befund
// --selbsttest: die neuen HISTORIC_NAMES-Eintraege werden vorher entfernt – dann MUSS die Pruefung durchfallen.
import { chromium } from 'playwright';
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));
const SAISONS = {
    '1949/50': { 'ZSG Union Halle': 'hallescherfc_821', 'BSG Gera-Süd': 'bsgwismutgera_861', 'ZSG Anker Wismar': 'fcankerwismar_721',
        'BSG Märkische Volksstimme Babelsberg': 'fortunababelsberg_754', 'ZSG Industrie Leipzig': 'bsgchemieleipzig_829',
        'BSG Franz Mehring Marga': 'hist_aktivistbrieske', 'ZSG Altenburg': 'hist_stahlaltenburg', 'BSG Motor Dessau': 'svdessau05_851',
        'BSG Eintracht "Hans Wendler" Stendal': '1fclokstendal_774' },
    '1950/51': { 'SV Deutsche Volkspolizei Dresden': 'sgdynamodresden_820', 'BSG Motor Gera': 'bsgwismutgera_861', 'BSG Turbine Weimar': 'sc1903weimar_896' },
    '1951/52': { 'BSG Motor Wismar': 'fcankerwismar_721', 'SV Vorwärts HVA Leipzig': '1fcfrankfurtoder_741' },
    // Seed v15: Chemie Karl-Marx-Stadt -> 1956 SC Motor = Chemnitzer FC
    '1954/55': { 'BSG Chemie Karl-Marx-Stadt': 'chemnitzerfc_827' },
    '1956': { 'SC Motor Karl-Marx-Stadt': 'chemnitzerfc_827' },
};
const STECKBRIEF = { hallescherfc_821: 'ZSG Union Halle', fcankerwismar_721: 'BSG Motor Wismar', sgdynamodresden_820: 'SV Deutsche Volkspolizei Dresden' };

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(String(e)));
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(ids => ids.forEach(id => { HISTORIC_NAMES[id] = (HISTORIC_NAMES[id] || []).filter(e => parseInt(e.from) > 1955 || (!e.from && !/Union Halle|Eintracht/.test(e.name))); }),
        ['hallescherfc_821', 'bsgwismutgera_861', 'fcankerwismar_721', 'fortunababelsberg_754', 'bsgchemieleipzig_829', 'hist_aktivistbrieske', 'hist_stahlaltenburg', 'svdessau05_851', '1fclokstendal_774', 'sgdynamodresden_820', 'sc1903weimar_896', 'chemnitzerfc_827', '1fcfrankfurtoder_741']);
    for (const [y, soll] of Object.entries(SAISONS)) {
        await page.evaluate(y => { App.viewArchivedSeason = { y, lid: 'ddr1' }; App.tableView = 'gesamt'; App.loadLeague('ddr1'); }, y);
        await warte(900);
        const r = await page.evaluate(() => { const c = document.getElementById('content'); return { txt: c ? c.innerText : '', html: c ? c.innerHTML : '' }; });
        for (const [alt, id] of Object.entries(soll)) {
            // Handy kuerzt lange Namen (_fitTeamNames), der volle Name steht dann in data-full
            const voll = 'data-full="' + alt.replace(/"/g, '&quot;') + '"';
            if (!r.txt.includes(alt) && !r.html.includes(voll)) befunde.push(`${name} ${y}: "${alt}" fehlt in der Tabelle`);
            if (!r.html.includes(id)) befunde.push(`${name} ${y}: Zeile fuehrt nicht zu ${id}`);
        }
        if (/hist_(vorwaertshvaleipzig|chemiekarlmarxstadt|ankerwismar|motorwismar|dvpdresden|gerasued|motorgera|unionhalle|motordessau|mvbabelsberg|industrieleipzig|turbineweimar|eintrachtstendal|franzmehringmarga|zsgaltenburg)\b/.test(r.html))
            befunde.push(`${name} ${y}: alte Seed-ID noch in der Tabelle`);
    }
    for (const [id, alt] of Object.entries(STECKBRIEF)) {
        await page.evaluate(id => App.showSteckbrief(id), id); await warte(900);
        const t = await page.evaluate(() => { const m = document.querySelector('.modal-content'); return m ? m.innerText : ''; });
        if (!t.includes(alt)) befunde.push(`${name} Steckbrief ${id}: "${alt}" fehlt`);
        if (/undefined|NaN/.test(t)) befunde.push(`${name} Steckbrief ${id}: undefined/NaN`);
        await page.evaluate(() => App.closeModal && App.closeModal());
    }
    // Suche: die umgehaengte Seed-ID ist kein eigener "ehemaliger Verein" mehr
    const such = await page.evaluate(() => { const H = HistExt.remap(); return ['hist_unionhalle', 'hist_ankerwismar', 'hist_dvpdresden', 'hist_franzmehringmarga'].filter(id => !H[id]); });
    if (such.length) befunde.push(`${name}: nicht in HIST_EXT.remap: ${such.join(', ')}`);
    if (fehler.length) befunde.push(`${name}: JS-Fehler ${fehler.slice(0, 3).join(' | ')}`);
    await ctx.close();
}
await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
await browser.close();
befunde.forEach(b => console.log('  FEHL ' + b));
if (SELBST) { console.log(befunde.length ? `Selbsttest bestanden (${befunde.length} Befunde)` : 'SELBSTTEST FEHLGESCHLAGEN'); process.exit(befunde.length ? 0 : 1); }
console.log(befunde.length ? `${befunde.length} Befund(e)` : 'Alles gruen');
process.exit(befunde.length ? 1 : 0);
