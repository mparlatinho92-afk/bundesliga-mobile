// Browser-Pruefung: Liga- und Staffelnamen wie damals (Sheet 24.10.2026)
//   - Oberliga Nord 1994-2004: Staffeln „Hamburg/Schleswig-Holstein“ / „Niedersachsen/Bremen“ statt 1/2 (Archiv, Steckbrief-Verlauf, Navigation)
//   - Berlin 1991/92 „Landesliga Berlin“, Nordbaden 1978-94 „Verbandsliga Baden“ (Steckbrief)
//   - Handy: keine waagerechte Seitenverschiebung durch die langen Staffelnamen
// node .claude/skills/run/liganamen_check.mjs   (--selbsttest: Staffel wieder „1“ -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/liganamen', { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const bef = [], err = [];
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage();
    const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    await p.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && typeof HIST_EXT !== 'undefined' && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    await p.evaluate(() => HistExt.load());
    if (SELBST) await p.evaluate(() => { Object.values(HistExt.loaded().byKey).forEach(r => { if (r.lid === 'h4-nord-oberliga') r.rows.forEach(z => { if (z.g === 'Hamburg/Schleswig-Holstein') z.g = '1'; }); }); App._staffelIdx = null;
        App._histNamenEintrag = () => null; });   // Sabotage auch fuer die Namen je Saison
    // 1. Archiv Oberliga Nord 1999/2000: Staffelkoepfe
    await p.evaluate(() => { App.viewArchivedSeason = { y: '1999/2000', lid: 'h4-nord-oberliga' }; App.loadLeague('h4-nord-oberliga'); });
    await p.waitForTimeout(600);
    const koepfe = await p.evaluate(() => [...document.querySelectorAll('div')].map(d => d.textContent.trim()).filter(t => /^Staffel /.test(t) && t.length < 60));
    for (const s of ['Staffel Hamburg/Schleswig-Holstein', 'Staffel Niedersachsen/Bremen'])
        if (!koepfe.includes(s)) B(`Archiv: Kopf „${s}“ fehlt (${[...new Set(koepfe)].join(' | ') || 'keine'})`);
    if (art === 'handy') { const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) B(`Archiv: Seite ${w}px breiter als der Bildschirm`); }
    await p.screenshot({ path: `docs/liganamen/oberliga-nord-${art}${SELBST ? '-selbsttest' : ''}.png`, fullPage: false });
    // 2. Steckbrief-Verlauf: Liganame mit Staffel / damaliger Liganame
    const verlauf = await p.evaluate(() => ({
        altona: App._staffelName('h4-nord-oberliga', '1999/2000', 'tsvaltenholz_668'),
        emden: App._staffelName('h4-nord-oberliga', '1999/2000', 'kickersemden_551'),
        baden: App._leagueName('h4-nordbaden-amateurliga'),
        // Name je Saison, EINE Liga (keine eigene ID fuer 1991/92 bzw. 1977/78)
        berlin91: App._staffelName('h4-berlin-verbandsliga', '1991/92', HistExt.loaded().byKey['1991/92|h4-berlin-verbandsliga'].rows[0].id),
        berlin92: App._archLeagueName('h4-berlin-verbandsliga', 1992), badenliga: App._archLeagueName('h3-nordbaden-amateurliga', 1977),
        nordbaden76: App._archLeagueName('h3-nordbaden-amateurliga', 1976), kurz91: App._histKurzName('h4-berlin-verbandsliga', 1991),
        eigeneId: !!App._histLeague('h4-berlin-landesliga'), hinweis: (App._vorgaengerHinweis(['6-21']).match(/Vorgänger-Ligen: ([^<–]*–[^<]*)/) || [])[1] || '',
    }));
    if (verlauf.altona !== 'Oberliga Nord Hamburg/Schleswig-Holstein') B('Steckbrief Altenholz 1999/2000: ' + verlauf.altona);
    if (verlauf.emden !== 'Oberliga Nord Niedersachsen/Bremen') B('Steckbrief Emden 1999/2000: ' + verlauf.emden);
    if (verlauf.baden !== 'Verbandsliga Baden') B('Verbandsliga Baden: ' + verlauf.baden);
    if (!/^Landesliga Berlin Staffel \S+$|^Landesliga Berlin \S+$/.test(verlauf.berlin91)) B('Steckbrief Berlin 1991/92: ' + verlauf.berlin91);
    if (verlauf.berlin92 !== 'Verbandsliga Berlin') B('Berlin 1992/93: ' + verlauf.berlin92);
    if (verlauf.badenliga !== 'Badenliga' || verlauf.nordbaden76 !== 'Amateurliga Nordbaden') B(`Nordbaden 1977/76: ${verlauf.badenliga} / ${verlauf.nordbaden76}`);
    if (verlauf.kurz91 !== 'LL Berlin') B('Pyramiden-Kuerzel Berlin 1991/92: ' + verlauf.kurz91);
    if (verlauf.eigeneId) B('Landesliga Berlin hat eine eigene Liga-ID (soll nur Name je Saison sein)');
    if (!/Landesliga Berlin 1991–92/.test(verlauf.hinweis) || !/Verbandsliga Berlin 1992–94/.test(verlauf.hinweis)) B('Vorgaenger-Hinweis Berlin-Liga: ' + verlauf.hinweis);
    // Archivkopf 1991/92 Berlin zeigt den damaligen Namen
    await p.evaluate(() => { App.viewArchivedSeason = { y: '1991/92', lid: 'h4-berlin-verbandsliga' }; App.loadLeague('h4-berlin-verbandsliga'); });
    await p.waitForTimeout(600);
    const titel = await p.evaluate(() => (document.querySelector('#league-title .lt-name') || {}).textContent);
    if (titel !== 'Landesliga Berlin') B('Archivkopf Berlin 1991/92: ' + titel);
    const vermerk = await p.evaluate(() => ([...document.querySelectorAll('#content div')].filter(d => !d.querySelector('div')).map(d => d.textContent).find(t => /: damals Ebene/.test(t) && t.length < 200) || ''));
    if (!/^Landesliga Berlin 1991–92: damals Ebene 4/.test(vermerk)) B('Vermerk Berlin 1991/92: ' + vermerk);
    await p.screenshot({ path: `docs/liganamen/berlin-1991-${art}${SELBST ? '-selbsttest' : ''}.png` });
    // 3. Steckbrief oeffnen (Altona), Handy darf nicht waagerecht scrollen
    await p.evaluate(() => App.showSteckbrief('altona93_484')); await p.waitForTimeout(800);
    if (art === 'handy') { const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) B(`Steckbrief: Seite ${w}px breiter als der Bildschirm`); }
    await p.screenshot({ path: `docs/liganamen/steckbrief-altona-${art}${SELBST ? '-selbsttest' : ''}.png` });
    await p.evaluate(() => { document.getElementById('modal').style.display = 'none'; });
    // 4. Ligapyramide 1999/2000: Kaestchen „OL Nord HH/SH“ / „OL Nord NI/HB“ (Laenderkuerzel, ganz sichtbar), voller Name im Tooltip
    await p.evaluate(() => App.showPyramide('1999/2000')); await p.waitForTimeout(1500);
    const pyr = await p.evaluate(() => [...document.querySelectorAll('#pyr-canvas *')].filter(e => !e.children.length && /^OL Nord /.test(e.textContent.trim()))
        .map(e => ({ t: e.textContent.trim(), abgeschnitten: e.scrollWidth > e.clientWidth + 1, title: e.closest('[title]') ? e.closest('[title]').title : '' })));
    console.log(art, 'Pyramide:', JSON.stringify(pyr));
    for (const [k, voll] of [['OL Nord HH/SH', 'Hamburg/Schleswig-Holstein'], ['OL Nord NI/HB', 'Niedersachsen/Bremen']]) {
        const x = pyr.find(z => z.t === k);
        if (!x) B(`Pyramide: Kaestchen „${k}“ fehlt ` + JSON.stringify(pyr));
        else { if (x.abgeschnitten) B(`Pyramide: „${k}“ abgeschnitten`); if (!x.title.includes(voll)) B(`Pyramide: Tooltip ohne „${voll}“: ${x.title}`); }
    }
    if (art === 'handy') { const w = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth); if (w > 2) B(`Pyramide: Seite ${w}px breiter als der Bildschirm`); }
    await p.screenshot({ path: `docs/liganamen/pyramide-1999-${art}${SELBST ? '-selbsttest' : ''}.png` });
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK');
process.exit(bef.length ? 1 : 0);
