// Handy-Ansicht im Browser nachstellen – so nah am echten Gerät, wie es ohne Gerät geht.
//
// Warum nicht einfach das Browser-Fenster schmal ziehen: ein schmales Desktop-Fenster hat
// `pointer:fine` und DPR 1. Das Projekt schaltet das Mobil-Layout aber über
// `@media (max-width:768px), (pointer:coarse)` – ein Touch-Gerät bekommt es IMMER. Ohne
// `hasTouch` misst man also ein Layout, das auf dem Handy so nie erscheint.
//
// Gemessenes Zielgerät (aus einem Screenshot rückgerechnet: Zeilenhöhe 45 CSS px entsprach
// 157 Gerätepixeln → DPR 3,5 → 1272/3,5): 363 CSS px breit.
//
// Was hiermit NICHT geprüft werden kann: echte Finger (Tap-Ziele, Wischen, Pull-to-Refresh),
// die Systemleisten des Handys und der gerätespezifische localStorage/Spielstand.
//
//   node tools/handy_shot.mjs                       # aktueller Stand (template.html)
//   node tools/handy_shot.mjs --file index.html     # letzter Build
//   node tools/handy_shot.mjs --w 412 --out x.png   # anderes Gerät
//   node tools/handy_shot.mjs --sim --liga 3        # eine Saison simulieren, Liga wählen
//   node tools/handy_shot.mjs --save shots/_save.json --colw '{"sp":118}'
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';

const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i < 0 ? d : process.argv[i + 1]; };
const has = n => process.argv.includes('--' + n);

export const PHONE = { width: 363, height: 806, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true };

export async function shot(opts = {}) {
    const o = {
        file: 'template.html', port: 3334, out: null, w: null, dsf: null,
        save: null, colw: null, liga: null, sim: false, ...opts
    };
    const browser = o.browser || await chromium.launch({ headless: true, args: ['--no-sandbox'] });
    const ctx = await browser.newContext({
        ...PHONE,
        viewport: { width: +(o.w || PHONE.width), height: +(o.height || PHONE.height) },
        deviceScaleFactor: +(o.dsf || PHONE.deviceScaleFactor)
    });
    const page = await ctx.newPage();
    const errs = []; page.on('pageerror', e => errs.push(String(e)));
    await page.goto(`http://localhost:${o.port}/${o.file}`, { waitUntil: 'domcontentloaded' });
    if (o.save) await page.evaluate(v => localStorage.setItem('ba_save_v66', v), fs.readFileSync(o.save, 'utf8'));
    if (o.colw) await page.evaluate(v => localStorage.setItem('ba_coltab_w', v), o.colw);
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2500);
    if (o.sim) { await page.evaluate(() => Engine.simulateFullSeason()); await page.waitForTimeout(500); }
    if (o.liga) { await page.evaluate(l => App.loadLeague(l), o.liga); await page.waitForTimeout(1200); }
    const info = await page.evaluate(() => {
        const t = document.querySelector('table.ltab'), c = document.getElementById('content');
        if (!t || !c) return { table: null };
        const r = id => { const e = t.querySelector(`th[data-col="${id}"]`); return e ? Math.round(e.getBoundingClientRect().right) : null; };
        return {
            vw: innerWidth, liga: document.getElementById('league-title')?.innerText.trim(),
            tabelle: Math.round(t.getBoundingClientRect().width),
            sichtbar: c.clientWidth, gebraucht: c.scrollWidth,
            pktRechts: r('pkt'), formRechts: r('form'), infoRechts: r('info')
        };
    });
    info.abgeschnitten = info.gebraucht > info.sichtbar ? (info.gebraucht - info.sichtbar) + ' px' : 'nein';
    if (errs.length) info.jsFehler = errs[0];
    if (o.out) { fs.mkdirSync(path.dirname(o.out), { recursive: true }); await page.screenshot({ path: o.out }); }
    if (!o.browser) await browser.close(); else await ctx.close();
    return info;
}

const isMain = !!(process.argv[1] && process.argv[1].endsWith('handy_shot.mjs'));
if (isMain) {
    const out = arg('out', null);
    const info = await shot({
        file: arg('file', 'template.html'), port: +arg('port', 3334), out,
        w: arg('w', null), dsf: arg('dsf', null), save: arg('save', null),
        colw: arg('colw', null), liga: arg('liga', null), sim: has('sim')
    });
    console.log(JSON.stringify(info, null, 1));
    if (out) console.log('Bild:', path.resolve(out));
}
