// Browser-Pruefung Saisonkalender: Termin != Liga-Spieltag (app/core.js _kalInfo) + Datumsfeld/Raster (app/kalender.js).
// - echte Termine geladen (app/kalender_data.js): 1. Bundesliga 2025/26 Spieltag 1 = Sa 23.08.2025
// - rechts in der Kopfzeile der Spieltag der GEWAEHLTEN Liga, das Datum im Chip (#kal-chip); pausiert die Liga,
//   nennt der Chip den Grund und wann es weitergeht
// - Spieltag-Auswahl listet je Liga nur ihre Spieltage (1..n), Formpunkte/Ergebnis-Ueberschrift nennen den
//   Liga-Spieltag, Vorschau den naechsten Liga-Spieltag mit Datum
// - Raster: Chip klappt es auf; BL-Zeile hat 34 Felder, davon md gespielt; Klick auf ein gespieltes Feld oeffnet
//   den Spieltag, Klick auf einen Liganamen waehlt die Liga, Ebene 4 klappt auf
// - Desktop + Handy (keine waagerechte Seitenverschiebung, Liganame bleibt sichtbar), keine JS-Fehler
// node .claude/skills/run/kalender_check.mjs  -> Screenshots nach docs/kalender-konzept/check/ ; Exit 1 = Befund
// --selbsttest: _kalInfo liefert null und der Chip bleibt leer -> MUSS durchfallen.
// Achtung: der Selbsttest ueberschreibt die Screenshots – danach den normalen Lauf wiederholen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const SHOT = path.resolve('docs/kalender-konzept/check');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
const befunde = [];
const warte = ms => new Promise(r => setTimeout(r, ms));
// erwartete Datumsanzeigen, unabhaengig nachgerechnet
const p2 = n => String(n).padStart(2, '0');
const dk = iso => { const [, m, d] = iso.split('-'); return `${d}.${m}.`; };
const wt = iso => ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][new Date(iso + 'T12:00:00').getDay()];
const span = iso => { if (!iso) return '??'; const d = new Date(iso + 'T12:00:00');
    if (d.getDay() === 3) return `Mi ${p2(d.getDate())}.${p2(d.getMonth() + 1)}.`;
    const fr = new Date(d); fr.setDate(d.getDate() - 1); const so = new Date(d); so.setDate(d.getDate() + 1);
    return fr.getMonth() === so.getMonth() ? `${p2(fr.getDate())}.–${p2(so.getDate())}.${p2(so.getMonth() + 1)}.` : `${p2(fr.getDate())}.${p2(fr.getMonth() + 1)}.–${p2(so.getDate())}.${p2(so.getMonth() + 1)}.`; };

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = [];
    page.on('pageerror', e => fehler.push(String(e)));
    page.on('dialog', d => d.accept());
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof App !== 'undefined' && App.activeLeague && document.querySelectorAll('#league-list .league-item').length > 3, null, { timeout: 60000 });
    await warte(800);
    if (SELBST) await page.evaluate(() => { App._kalInfo = () => null; App._kalChip = () => {}; });
    const pruef = (was, ok, info) => { if (!ok) befunde.push(`${name}: ${was} ${info ? JSON.stringify(info).slice(0, 400) : ''}`); };
    const kopf = () => page.evaluate(() => document.getElementById('season-info').innerText);
    const chip = () => page.evaluate(() => { const c = document.getElementById('kal-chip'); return c && c.style.display !== 'none' ? (c.innerText + ' | ' + c.title).replace(/\s+/g, ' ') : ''; });   // Handy zeigt nur "frei", der Grund steht im title

    const basis = await page.evaluate(() => ({
        kal: Engine._kalAktiv(), seed: typeof KALENDER_SEED !== 'undefined',
        y: Engine.startYear + Engine.currentSeasonOffset,
        bl1: Engine.kalender && Engine.kalender.liga['1'] ? Engine.kalender.slots[Engine.kalender.liga['1'][0] - 1] : null,
    }));
    pruef('Kalender aktiv + Daten geladen', basis.kal && basis.seed, basis);
    if (basis.y === 2025) pruef('1. Bundesliga 2025/26 beginnt am 23.08.2025 (echter Termin)', basis.bl1 === '2025-08-23', basis);
    await page.evaluate(() => { App.loadLeague('1'); App.updateStatus(); });
    await warte(300);
    const c0 = await chip(), k0 = await kopf();
    pruef('vor dem 1. Termin: Kopf "Start", Chip "Saisonstart" + erster BL-Spieltag', k0.includes('Start') && c0.includes('Saisonstart') && c0.includes(dk(basis.bl1 || '')), { k0, c0 });

    // ersten Termin spielen: die Bundesliga spielt da noch nicht (Regionalligen zuerst)
    await page.click('#btn-play'); await warte(900);
    const t1 = await page.evaluate(() => ({ t: Engine.currentMatchday, md: Engine.ligaMd('1'), iso: Engine.kalender.slots[Engine.currentMatchday - 1] }));
    const c1 = await chip(), k1 = await kopf();
    if (t1.md === 0) pruef('BL pausiert am 1. Termin: Chip nennt Datum, Grund und Weiter-Termin; Kopf ohne Spieltag',
        c1.includes(dk(t1.iso)) && c1.includes('Saison beginnt erst') && c1.includes(`weiter Sa ${dk(basis.bl1 || '')}`) && !/\d+\. ST/.test(k1), { c1, k1 });
    await page.screenshot({ path: path.join(SHOT, `${name}-spielfrei.png`) });

    // weiterspielen, bis die Bundesliga 3 Spieltage hat und der Termin selbst einer ist, an dem sie spielt
    for (let i = 0; i < 40; i++) {
        const s = await page.evaluate(() => ({ md: Engine.ligaMd('1'), spielt: Engine.ligaTermin('1', Engine.ligaMd('1')) === Engine.currentMatchday }));
        if (s.md >= 3 && s.spielt) break;
        await page.click('#btn-play'); await warte(700);
    }
    await page.evaluate(() => { App.tableView = 'gesamt'; App.loadLeague('1'); });
    await warte(400);
    const r = await page.evaluate(() => {
        const t = Engine.currentMatchday, md = Engine.ligaMd('1');
        const zeilen = [...document.querySelectorAll('.ltab tbody tr')];
        const dots = zeilen.map(z => [...z.querySelectorAll('.fdot')].map(d => d.title));
        const vor = [...document.querySelectorAll('#md-feed div')].map(d => d.innerText).find(s => s.startsWith('Vorschau')) || '';
        const erg = [...document.querySelectorAll('#md-feed span')].map(d => d.innerText).find(s => /^Spieltag \d+/.test(s)) || '';
        return { t, md, iso: Engine.kalender.slots[t - 1], naechst: Engine.kalender.slots[Engine.ligaNaechsterTermin('1') - 1], dots, vor, erg };
    });
    pruef('Termin und Spieltag fallen auseinander (sonst prueft der Lauf nichts)', r.t > r.md, r);
    const k3 = await kopf(), c3 = await chip();
    pruef('Kopf = Liga-Spieltag, Chip = Datum des Termins', k3.includes(`${r.md}. ST`) && !k3.includes(`${r.t}. ST`) && c3.includes(`${wt(r.iso)} ${dk(r.iso)}`), { k3, c3, r: { t: r.t, md: r.md, iso: r.iso } });
    pruef('Ergebnis-Ueberschrift = Liga-Spieltag', r.erg.startsWith(`Spieltag ${r.md}`), r.erg);
    pruef('Formpunkte nennen den Liga-Spieltag', r.dots.length && r.dots.every(d => d.length === r.md && d[0].startsWith(r.md + '. Spieltag:')), r.dots.slice(0, 2));
    pruef('Vorschau = naechster Liga-Spieltag mit Datum', r.vor.includes(`Spieltag ${r.md + 1}`) && r.vor.includes(span(r.naechst)), r.vor);
    const lay = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, titel: document.getElementById('league-title').getBoundingClientRect().width, chipR: document.getElementById('kal-chip').getBoundingClientRect().right }));
    pruef('keine waagerechte Seitenverschiebung, Liganame sichtbar, Chip im Bild', lay.sw <= lay.iw + 1 && lay.titel > 60 && lay.chipR <= lay.iw, lay);
    await page.screenshot({ path: path.join(SHOT, `${name}-spieltag.png`) });

    // Spieltag-Auswahl: genau "Spieltag 1..md" plus Aktuell/Testspiele
    await page.click('#season-info [onclick*="_openMatchdayPicker"], #season-info span:last-child');
    await warte(300);
    const pick = await page.evaluate(() => [...document.querySelectorAll('#spicker .dots-item')].map(d => d.innerText));
    const sp = pick.filter(s => s.startsWith('Spieltag'));
    pruef('Auswahl listet die Liga-Spieltage 1..n', sp.length === r.md && sp.every((s, i) => s.startsWith(`Spieltag ${r.md - i} `)), pick);
    const ziel = await page.locator('#spicker .dots-item', { hasText: /^Spieltag 1 / }).count();
    if (ziel) {
        await page.locator('#spicker .dots-item', { hasText: /^Spieltag 1 / }).first().click(); await warte(400);
        const kz = await kopf(), cz = await chip();
        pruef('Klick auf "Spieltag 1": Kopf 1. ST, Chip mit dessen Datum', kz.includes('1. ST') && cz.includes(dk(basis.bl1 || '')), { kz, cz });
        await page.screenshot({ path: path.join(SHOT, `${name}-auswahl.png`) });
    } else pruef('Eintrag "Spieltag 1" in der Auswahl', false, pick);
    await page.evaluate(() => { App._selectMatchday(null); });
    await warte(300);

    // Raster: Chip klappt auf
    await page.click('#kal-chip'); await warte(400);
    const g = await page.evaluate(() => {
        const p = document.getElementById('kal-panel');
        const bl = p.querySelector('tr[data-l="1"]');
        const z = bl ? [...bl.querySelectorAll('td.kal-c')] : [];
        return { offen: p.style.display === 'block' && p.offsetHeight > 100,
                 felder: z.filter(td => td.innerText.trim()).length, gesp: z.filter(td => td.classList.contains('kal-gesp')).length,
                 next: z.filter(td => td.classList.contains('kal-next')).length,
                 zeilen: [...p.querySelectorAll('tbody tr[data-l], tbody tr[data-c]')].map(t => t.dataset.l || t.dataset.c).slice(0, 6),
                 ebenen: [...p.querySelectorAll('tr.kal-ebene')].length, sw: document.documentElement.scrollWidth, iw: innerWidth };
    });
    pruef('Raster offen, Im Blick 1/2/3/DFB-Pokal', g.offen && ['1', '2', '3', 'dfb'].every(x => g.zeilen.includes(x)), g);
    pruef('BL-Zeile: 34 Spieltage, md gespielt, genau ein naechster', g.felder === 34 && g.gesp === r.md && g.next === 1, g);
    pruef('Raster verschiebt die Seite nicht waagerecht', g.sw <= g.iw + 1, g);
    pruef('Sammelzeilen fuer Ebene 4-8', g.ebenen === 5, g);
    await page.screenshot({ path: path.join(SHOT, `${name}-raster.png`) });
    // Klick auf BL-Spieltag 2 -> Spieltag-Ansicht
    if (g.gesp >= 2) {
        await page.locator('#kal-panel tr[data-l="1"] td.kal-gesp').nth(1).click(); await warte(500);
        const k2 = await kopf();
        pruef('Klick auf gespieltes Feld 2 oeffnet BL-Spieltag 2', k2.includes('2. ST') && await page.evaluate(() => App.matchdayViewIdx !== null), k2);
    }
    if (g.ebenen) {
        await page.locator('#kal-panel tr.kal-ebene[data-e="4"] td.kal-name').click(); await warte(300);
        const sub = await page.evaluate(() => document.querySelectorAll('#kal-panel tr.kal-sub').length);
        pruef('Ebene 4 klappt 5 Ligen auf', sub === 5, sub);
        await page.locator('#kal-panel tr[data-l="2"] td.kal-name').click(); await warte(500);
        const al = await page.evaluate(() => ({ a: App.activeLeague, sel: !!document.querySelector('#kal-panel tr.kal-sel[data-l="2"]') }));
        pruef('Klick auf "2. Bundesliga" waehlt die Liga und markiert die Zeile', al.a === '2' && al.sel, al);
        await page.screenshot({ path: path.join(SHOT, `${name}-raster-ebene4.png`) });
    }
    await page.evaluate(() => { try { localStorage.removeItem('ba_kal_auf'); } catch (e) {} });
    pruef('keine JS-Fehler', !fehler.length, fehler);
    await ctx.close();
}

await lauf('desktop', { viewport: { width: 1400, height: 900 } });
await lauf('handy', { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
await browser.close();
if (befunde.length) { console.log('BEFUND:\n  ' + befunde.join('\n  ')); process.exit(1); }
console.log('alles gruen' + (SELBST ? '  (Selbsttest haette durchfallen muessen!)' : ''));
process.exit(SELBST ? 1 : 0);
