// Namenswechsel mit Termin (game_data team.umbenannt, Engine._umbenennungen) + Kobern-Schreibweisen, template.html, Desktop + Handy:
//   2025/26 heißt der Verein SGV Freiberg (Tabelle), nach Saisonwechsel + Speichern + Neuladen SGV Heilbronn-Freiberg (Tabelle,
//   Steckbrief „heute“), die abgelaufene Saison 2025/26 zeigt weiter SGV Freiberg, VEREINSNAMEN nennt „bis 2025/26 SGV Freiberg“,
//   die Suche findet den alten Namen als „früher · SGV Heilbronn-Freiberg“. Kobern: eine Linie mit 1985/86 und 2002/03.
//   node .claude/skills/run/umbenennung_check.mjs [port]       Screenshots nach docs/umbenennung/
//   node .claude/skills/run/umbenennung_check.mjs --selbsttest  Engine ohne _umbenennungen-Aufrufe + Historie vor v0.8.228.46 – muss durchfallen
//   (NICHT gegen git HEAD: seit v0.8.228.46 steht der Namenswechsel dort schon, die Gegenprobe meldete dann nichts)
import { chromium } from 'playwright';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest');
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334, OUT = 'docs/umbenennung/';
fs.mkdirSync(OUT, { recursive: true });
const ALT_ENGINE = SELBST ? fs.readFileSync('game_engine.js', 'utf8').split('this._umbenennungen();').join(';') : null;   // alle drei Aufrufe (Start, Laden, Saisonwechsel) – der Saisonwechsel allein heilt beim Neuladen
if (SELBST && ALT_ENGINE === fs.readFileSync('game_engine.js', 'utf8')) { console.log('SELBSTTEST: Anker in game_engine.js fehlt'); process.exit(1); }
const ALT_HIST = SELBST ? execSync('git show 72a3703:app/history_ext.js', { encoding: 'utf8', maxBuffer: 64 << 20 }) : null;   // v0.8.228.45: Kobern vor der Zusammenlegung
const ID = 'sgvfreiberg_910', ALT = 'SGV Freiberg', NEU = 'SGV Heilbronn-Freiberg', KOB = 'hist_fb_svuntermoselkobern';
const NEUE = ['hist_fa_arminiabielefelda', 'hist_fa_vflbochuma', 'hist_fa_dynamodresdenii', 'hist_fa_eintrachttrierii', 'hist_fb_atsvsebaldsbrueck',
    'hist_fa_tuschlodwigzuelpich', 'hist_fb_youngboysreutlingen', 'solingen03_1266', 'hist_fb_svuntermoselkobern', 'hist_fb_svgeislautern', 'hist_svroechlingvoelklingen'];
const befund = [], soll = (ok, t) => { if (!ok) befund.push(t); };
const browser = await chromium.launch();
for (const [geraet, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                             ['handy', { viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.6 }]]) {
    const ctx = await browser.newContext(opt), page = await ctx.newPage(), fehler = [];
    page.on('pageerror', e => fehler.push(e.message));
    page.on('dialog', d => d.accept());
    if (ALT_ENGINE) await page.route('**/game_engine.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: ALT_ENGINE }));
    if (ALT_HIST) await page.route('**/app/history_ext.js', r => r.fulfill({ status: 200, contentType: 'application/javascript', body: ALT_HIST }));
    const laden = async () => {
        await page.goto(`http://localhost:${PORT}/template.html`);
        await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
    };
    const tabelle = (lid, off) => page.evaluate(([lid, off]) => {
        document.getElementById('modal').style.display = 'none';
        App.viewArchivedSeason = null; App.matchdayViewIdx = null; App.tsView = null; App.tableView = 'gesamt';
        App.viewHistoryOffset = off; App.loadLeague(lid);
        return document.getElementById('content')?.textContent || '';
    }, [lid, off]);
    const steckbrief = async id => {
        await page.evaluate(id => App.showSteckbrief(id), id);
        await page.waitForTimeout(1500);
        return page.evaluate(() => (document.querySelector('.modal-content')?.textContent || '').replace(/\s+/g, ' '));
    };
    // Wappen des Vereins in der gezeigten Tabelle: 'alt' (sgvfreiberg_910.png) oder 'neu' (…_ab2026.png), geladen
    const wappen = () => page.evaluate(() => [...document.querySelectorAll('#content img')].filter(i => i.src.includes('sgvfreiberg_910'))
        .map(i => (i.src.includes('_ab2026') ? 'neu' : 'alt') + (i.complete && i.naturalWidth > 0 ? '' : ':kaputt')));
    await laden();
    // 1) Startsaison: alter Name, altes Wappen
    const lid0 = await page.evaluate(id => Engine.teams[id].leagueId, ID);
    const t0 = await tabelle(lid0, null);
    soll(t0.includes(ALT) && !t0.includes(NEU), `${geraet} 2025/26 Tabelle ${lid0}: ${t0.includes(NEU) ? 'schon neuer Name' : 'Verein fehlt'}`);
    await page.waitForTimeout(300);
    const w0 = await wappen();
    soll(w0.length && w0.every(w => w === 'alt'), `${geraet} 2025/26 Wappen in der Tabelle: ${JSON.stringify(w0)}`);
    // 2) Saison durchspielen, wechseln, speichern, neu laden
    await page.evaluate(async () => { Engine.simulateFullSeason(); Engine.processSeasonTransition(); Engine.saveGame(); await new Promise(r => setTimeout(r, 3000)); });
    await laden();
    const st = await page.evaluate(id => ({ y: Engine.getFormattedSeason(), lid: Engine.teams[id].leagueId, n: Engine.teams[id].name,
        idx: Engine.history.findIndex(h => h.year === '2025/26') }), ID);
    soll(st.y === '2026/27', `${geraet} nach Neuladen Saison ${st.y}`);
    soll(st.n === NEU, `${geraet} 2026/27 Engine-Name ${st.n}`);
    const t1 = await tabelle(st.lid, null);
    soll(t1.includes(NEU), `${geraet} 2026/27 Tabelle ${st.lid} ohne ${NEU}`);
    await page.waitForTimeout(300);
    const w1 = await wappen();
    soll(w1.length && w1.every(w => w === 'neu'), `${geraet} 2026/27 Wappen in der Tabelle: ${JSON.stringify(w1)}`);
    if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-2026-tabelle.png` });
    // 3) abgelaufene Sim-Saison 2025/26 (Snapshot aus Engine.history nach dem Laden)
    soll(st.idx >= 0, `${geraet} 2025/26 nicht in Engine.history`);
    if (st.idx >= 0) {
        const t2 = await tabelle(lid0, st.idx);
        soll(t2.includes(ALT) && !t2.includes(NEU), `${geraet} Archiv 2025/26: ${t2.includes(NEU) ? 'zeigt neuen Namen' : 'Verein fehlt'}`);
        await page.waitForTimeout(300);
        const w2 = await wappen();
        soll(w2.length && w2.every(w => w === 'alt'), `${geraet} Archiv 2025/26 Wappen: ${JSON.stringify(w2)}`);
        if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-2025-archiv.png` });
    }
    // 4) Steckbrief: heute neuer Name, VEREINSNAMEN bis 2025/26 alter
    const sb = await steckbrief(ID);
    soll(sb.includes(NEU), `${geraet} Steckbrief ohne ${NEU}`);
    soll(/bis 2025\/26\s*SGV Freiberg/.test(sb), `${geraet} Steckbrief VEREINSNAMEN ohne „bis 2025/26 SGV Freiberg“`);
    if (!SELBST) await page.screenshot({ path: `${OUT}${geraet}-steckbrief.png` });
    // 5) Suche: alter Name als früher · neuer Name (getippt)
    await page.evaluate(() => { document.getElementById('modal').style.display = 'none'; });
    if (!(await page.evaluate(() => document.getElementById('gs-wrap')?.classList.contains('open')))) { await page.click('#gs-icon'); await page.waitForTimeout(300); }
    await page.fill('#gs-input', ''); await page.type('#gs-input', 'SGV Freiberg'); await page.waitForTimeout(200);
    const treffer = await page.evaluate(() => [...document.querySelectorAll('#gs-list div[onclick]')].map(d => [...(d.querySelector(':scope > div')?.children || [])].map(x => x.textContent).join(' | ')));
    soll(treffer.some(t => t === `${ALT} | früher · ${NEU}`), `${geraet} Suche „SGV Freiberg“: ${JSON.stringify(treffer)}`);
    await page.keyboard.press('Escape').catch(() => {});
    // 6) Kobern: eine Linie, 1985/86 (Verbandsliga Rheinland) und 2002/03 dabei
    const kb = await steckbrief(KOB);
    soll(/1985\/86/.test(kb) && /2002\/03/.test(kb), `${geraet} Steckbrief Kobern ohne 1985/86 oder 2002/03`);
    // 7) Wappen der 11 Neuen aus v0.8.228.45 (FM, fupa, Reserve = Erste): Steckbrief zeigt ein geladenes Bild
    for (const id of NEUE) {
        await steckbrief(id);
        const ok = await page.evaluate(id => [...document.querySelectorAll('.modal-content img')].some(i => i.src.includes(id) && i.complete && i.naturalWidth > 0), id);
        soll(ok, `${geraet} Steckbrief ${id} ohne geladenes Wappen`);
    }
    if ((await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)) > 1) befund.push(`${geraet} Seite breiter als der Bildschirm`);
    if (fehler.length) befund.push(`${geraet}: JS-Fehler ${fehler.join(' / ')}`);
    await ctx.close();
    if (SELBST) break;
}
await browser.close();
if (SELBST && !befund.some(b => b.includes('Kobern'))) befund.length = 0;   // beide Hälften müssen anschlagen
if (SELBST) { befund.forEach(b => console.log('  ' + b)); console.log(befund.length ? `Selbsttest bestanden: der alte Code fällt durch (${befund.length} Befund(e)).` : 'SELBSTTEST DURCHGEFALLEN'); process.exit(befund.length ? 0 : 1); }
befund.forEach(b => console.log('FEHLER ' + b));
console.log(befund.length ? `${befund.length} Befund(e)` : 'Alles gruen.');
process.exit(befund.length ? 1 : 0);
