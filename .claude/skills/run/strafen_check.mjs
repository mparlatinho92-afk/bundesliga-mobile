// Punktabzug / Aufstiegsverzicht / Zwangsabstieg in der Anzeige (v0.8.228.77): Live-Tabelle (−n an der Punktzahl, „✋ Aufstiegsverzicht“),
// Archiv der Vorsaison (−n, Punkte = 3S+U−n, ⛔/✋ am Namen) und Saisonwechsel-Bericht (Reiter Art, Gruppe „Zwangsabstieg / Rückzug“).
// Desktop + Handy. node .claude/skills/run/strafen_check.mjs  -> docs/strafen/ ; Exit 1 = Befund
// --selbsttest: Engine.STRAFE_* auf 0 – dann MUSS die Prüfung durchfallen.
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import * as path from 'node:path';
const SHOT = path.resolve('../../../docs/strafen');
fs.mkdirSync(SHOT, { recursive: true });
const URL = process.env.HIST_URL || 'http://localhost:3334/template.html';
const SELBST = process.argv.includes('--selbsttest');
const browser = await chromium.launch({ headless: true });
const befunde = [];
const ok = (name, bed, txt) => { console.log(`${bed ? '✓' : '✗'} ${name}: ${txt}`); if (!bed) befunde.push(name + ': ' + txt); };

async function lauf(name, ctxOpt) {
    const ctx = await browser.newContext(ctxOpt);
    const page = await ctx.newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(String(e)));
    page.on('dialog', d => d.accept());
    await page.goto(URL, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 1000, null, { timeout: 60000 });
    if (SELBST) await page.evaluate(() => ['STRAFE_ABZUG', 'STRAFE_VERZICHT', 'STRAFE_ZWANG'].forEach(k => { for (const l in Engine[k]) Engine[k][l] = [0, 0]; }));
    // Saison durchspielen, bis es einen Verzicht gibt (höchstens 6 Saisons); Abzug und Zwang kommen dabei sicher vor
    const fund = await page.evaluate(() => {
        for (let i = 0; i < 6; i++) {
            Engine.simulateFullSeason(); Engine.sortTables();
            const z = Engine.calcZones();
            const verz = [];
            for (const lid in Engine.leagues) {
                const ts = Object.values(Engine.teams).filter(t => t.leagueId === lid).sort((a, b) => a.rank - b.rank);
                const az = Engine.aufstiegsZonen(lid, ts, z);
                for (const id in az) if (az[id] === 'verzicht') verz.push({ lid, id });
            }
            const abz = Object.values(Engine.teams).filter(t => t.leagueId && t.stats && t.stats.abzug).map(t => ({ lid: t.leagueId, id: t.id, n: t.stats.abzug }));
            if (verz.length || i === 5) return { y: Engine.getFormattedSeason(), verz, abz };
            Engine.processSeasonTransition();
        }
    });
    ok(`${name} Saison ${fund.y}: Fälle vorhanden`, fund.verz.length > 0 && fund.abz.length > 0, `${fund.verz.length} Verzicht, ${fund.abz.length} Punktabzug`);
    // Live-Tabelle: Abzug
    if (fund.abz.length) {
        const a = fund.abz[0];
        await page.evaluate(lid => { App.viewArchivedSeason = null; App.tableView = 'gesamt'; App.loadLeague(lid); }, a.lid);
        await page.waitForTimeout(600);
        const z = await page.evaluate(id => {
            const t = Engine.teams[id];
            const tr = [...document.querySelectorAll('#content table tbody tr')].find(r => { const m = r.querySelector('.tmn'); return m && m.dataset.full === t.name; });
            const sup = tr && tr.querySelector('sup.abz');
            return { sup: sup ? sup.textContent : null, pts: t.stats.pts, soll: 3 * t.stats.w + t.stats.d - t.stats.abzug };
        }, a.id);
        ok(`${name} Live-Tabelle Punktabzug`, z.sup === '−' + a.n && z.pts === z.soll, JSON.stringify(z));
        await page.screenshot({ path: path.join(SHOT, `live-abzug-${name}.png`) });
    }
    if (fund.verz.length) {
        const v = fund.verz[0];
        await page.evaluate(lid => { App.viewArchivedSeason = null; App.loadLeague(lid); }, v.lid);
        await page.waitForTimeout(600);
        const txt = await page.evaluate(id => { const t = Engine.teams[id]; const tr = [...document.querySelectorAll('#content table tbody tr')].find(r => { const m = r.querySelector('.tmn'); return m && m.dataset.full === t.name; }); return tr ? tr.querySelector('.inf').textContent : null; }, v.id);
        ok(`${name} Live-Tabelle Verzicht`, /Aufstiegsverzicht|Verz\./.test(txt || ''), String(txt).trim());
        await page.screenshot({ path: path.join(SHOT, `live-verzicht-${name}.png`) });
    }
    // Saisonwechsel, dann Archiv der Vorsaison
    const nach = await page.evaluate(y => { Engine.processSeasonTransition(); const s = (Engine.archive.strafen || {})[y] || []; return s; }, fund.y);
    const ab = nach.find(s => s.art === 'abzug'), zw = nach.find(s => s.art === 'zwang'), vz = nach.find(s => s.art === 'verzicht');
    ok(`${name} archive.strafen ${fund.y}`, !!(ab && vz), `${nach.filter(s => s.art === 'abzug').length} Abzug, ${nach.filter(s => s.art === 'verzicht').length} Verzicht, ${nach.filter(s => s.art === 'zwang').length} Zwang`);
    const archiv = async (s, pruef) => {
        await page.evaluate(([y, lid]) => { App.tableView = 'gesamt'; App.viewArchivedSeason = { y, lid }; App.loadLeague(lid); }, [fund.y, s.lid]);
        await page.waitForFunction(() => !/lädt…/.test(document.getElementById('content').textContent), null, { timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(600);
        return page.evaluate(([id, pruef]) => {
            const t = Engine.teams[id];
            const tr = [...document.querySelectorAll('#content table tbody tr')].find(r => { const m = r.querySelector('.tmn'); return m && m.dataset.full === t.name; });
            if (!tr) return { fehlt: true };
            const tds = tr.querySelectorAll('td');
            return { sup: (tr.querySelector('sup.abz') || {}).textContent || null, strf: (tr.querySelector('.strf') || {}).textContent || null,
                tip: (tr.querySelector('.strf') || {}).title || null, s: +tds[4].textContent, u: +tds[5].textContent, pts: parseInt(tds[9].textContent) };
        }, [s.id, pruef]);
    };
    if (ab) { const r = await archiv(ab); ok(`${name} Archiv Punktabzug`, r.sup === '−' + ab.n && r.pts === 3 * r.s + r.u - ab.n, JSON.stringify(r)); await page.screenshot({ path: path.join(SHOT, `archiv-abzug-${name}.png`) }); }
    if (vz) { const r = await archiv(vz); ok(`${name} Archiv Verzicht`, r.strf === '✋', JSON.stringify(r)); }
    if (zw) { const r = await archiv(zw); ok(`${name} Archiv Zwangsabstieg`, r.strf === '⛔' && /Zwangsabstieg/.test(r.tip || ''), JSON.stringify(r)); await page.screenshot({ path: path.join(SHOT, `archiv-zwang-${name}.png`) }); }
    // Saisonwechsel-Bericht: Reiter „Art“ anklicken, Gruppe Zwangsabstieg
    if (zw) {
        await page.evaluate(y => App.showSaisonwechsel(y), fund.y);
        await page.waitForTimeout(500);
        const reiter = page.locator('#sw-box .btn.sw-sort', { hasText: 'Art' });
        if (await reiter.count()) { await reiter.first().click(); await page.waitForTimeout(400); }
        const hat = await page.evaluate(() => /Zwangsabstieg \/ Rückzug/.test(document.getElementById('sw-box').textContent));
        ok(`${name} Saisonwechsel-Bericht (Reiter Art geklickt)`, hat, hat ? 'Gruppe „Zwangsabstieg / Rückzug“ da' : 'Gruppe fehlt');
        await page.screenshot({ path: path.join(SHOT, `bericht-zwang-${name}.png`) });
    }
    // „Die Zweite wird zur Ersten“: erzwungener Fall (Erste Ebene 4, Reserve Ebene 5), Benennung in beiden Archivtabellen und im Bericht
    const tf = await page.evaluate(sel => {
        Engine.simulateFullSeason(); Engine.sortTables();
        const lvl = t => (Engine.leagues[t.leagueId] || {}).level;
        const res = Object.values(Engine.teams).find(r => r.isReserve && r.leagueId && Engine.teams[r.parentId] && lvl(Engine.teams[r.parentId]) === 4 && lvl(r) === 5);
        if (!res) return null;
        const erste = Engine.teams[res.parentId], y = Engine.getFormattedSeason(), v = { erste: erste.id, eLid: erste.leagueId, res: res.id, rLid: res.leagueId, y };
        const zahl = Engine._strafeZahl;
        if (!sel) Engine._strafeZahl = function (id, art) { return art === 'zwang' ? (id === erste.id ? 0 : 1) : art === 'zwangTief' ? 0.5 : 1; };
        Engine.processSeasonTransition();
        Engine._strafeZahl = zahl;
        return v;
    }, SELBST);
    if (!tf) ok(`${name} Zweite wird zur Ersten`, false, 'kein Paar gefunden');
    else {
        const zeile = async (lid, id) => {
            const zu = page.locator('#modal .modal-header button', { hasText: 'Schließen' });
            if (await zu.isVisible().catch(() => false)) await zu.click();
            await page.evaluate(([y, lid]) => { App.tableView = 'gesamt'; App.viewArchivedSeason = { y, lid }; App.loadLeague(lid); }, [tf.y, lid]);
            await page.waitForFunction(() => !/lädt…/.test(document.getElementById('content').textContent), null, { timeout: 30000 }).catch(() => {});
            await page.waitForTimeout(600);
            return page.evaluate(id => { const t = Engine.teams[id];
                const tr = [...document.querySelectorAll('#content table tbody tr')].find(r => { const m = r.querySelector('.tmn'); return m && m.dataset.full === t.name; });
                if (tr) tr.scrollIntoView({ block: 'center' });
                return tr ? { txt: (tr.querySelector('.strf-txt') || {}).textContent || null, tip: (tr.querySelector('.strf') || {}).title || '' } : null; }, id);
        };
        const e = await zeile(tf.eLid, tf.erste);
        ok(`${name} Archiv Erste: „Zweite wird Erste“`, e && e.txt === 'Zweite wird Erste' && /die Zweite wird zur Ersten/.test(e.tip), JSON.stringify(e));
        await page.screenshot({ path: path.join(SHOT, `archiv-zweite-wird-erste-${name}.png`) });
        const r = await zeile(tf.rLid, tf.res);
        ok(`${name} Archiv Reserve: „Platz an die Erste“`, r && r.txt === 'Platz an die Erste' && /Die Zweite wird zur Ersten/.test(r.tip), JSON.stringify(r));
        await page.screenshot({ path: path.join(SHOT, `archiv-platz-an-die-erste-${name}.png`) });
        await page.evaluate(y => App.showSaisonwechsel(y), tf.y);
        await page.waitForTimeout(500);
        const reiter = page.locator('#sw-box .btn.sw-sort', { hasText: 'Art' });
        if (await reiter.count()) { await reiter.first().click(); await page.waitForTimeout(400); }
        const b = await page.evaluate(() => { const t = document.getElementById('sw-box').textContent; return { tausch: /Zwangsabstieg – die Zweite wird zur Ersten/.test(t), platz: /Reserve gibt ihren Platz an die Erste ab/.test(t) }; });
        ok(`${name} Bericht (Reiter Art geklickt): beide Gruppen`, b.tausch && b.platz, JSON.stringify(b));
        await page.screenshot({ path: path.join(SHOT, `bericht-zweite-wird-erste-${name}.png`) });
    }
    // Rückzug während der Saison (v0.8.228.78): annulliert (NOFV-Oberliga Süd) und „Restspiele gewertet“ (Nord), erzwungen
    const zg = await page.evaluate(sel => {
        const zu = document.querySelector('#modal'); if (zu) zu.style.display = 'none';
        if (Engine.currentMatchday >= Engine.totalMatchdays) Engine.processSeasonTransition();
        const mitte = lid => { const ts = Object.values(Engine.teams).filter(t => t.leagueId === lid).sort((a, b) => a.rank - b.rank); return ts[Math.floor(ts.length / 2)]; };
        const A = mitte('5-9'), B = mitte('5-8'), y = Engine.getFormattedSeason(), zahl = Engine._strafeZahl;
        window.__zgZahl = zahl;
        if (!sel) Engine._strafeZahl = function (id, art) {
            if (art === 'rzs') return id === A.id || id === B.id ? 0 : 1;
            if (art === 'rzsArt') return id === A.id ? 0 : 0.999;
            if (art === 'rzsWann') return 0.6;
            return zahl.call(this, id, art); };
        Engine.simulateFullSeason(); Engine.sortTables();
        return { A: A.id, B: B.id, y, An: A.name, Bn: B.name };
    }, SELBST);
    const liveZeile = async (lid, id) => {
        await page.evaluate(lid => { App.viewArchivedSeason = null; App.tableView = 'gesamt'; App.loadLeague(lid); }, lid);
        await page.waitForTimeout(600);
        return page.evaluate(id => { const t = Engine.teams[id], trs = [...document.querySelectorAll('#content table tbody tr')];
            const i = trs.findIndex(r => { const m = r.querySelector('.tmn'); return m && m.dataset.full === t.name; }), tr = trs[i];
            if (tr) tr.scrollIntoView({ block: 'center' });
            return tr ? { zg: (tr.querySelector('.zg') || {}).textContent || null, txt: (tr.querySelector('.strf-txt') || {}).textContent || null, letzter: i === trs.length - 1, sp: +tr.querySelectorAll('td')[3].textContent } : null; }, id);
    };
    const la = await liveZeile('5-9', zg.A);
    ok(`${name} Live Rückzug annulliert`, la && la.zg === 'zg.' && /alle Spiele annulliert/.test(la.txt || '') && la.letzter && la.sp === 0, JSON.stringify(la));
    await page.screenshot({ path: path.join(SHOT, `live-rueckzug-annulliert-${name}.png`) });
    const lb = await liveZeile('5-8', zg.B);
    ok(`${name} Live Rückzug gewertet`, lb && lb.zg === 'zg.' && /Restspiele 2:0/.test(lb.txt || '') && lb.letzter && lb.sp > 0, JSON.stringify(lb));
    await page.screenshot({ path: path.join(SHOT, `live-rueckzug-gewertet-${name}.png`) });
    await page.evaluate(() => { Engine.processSeasonTransition(); Engine._strafeZahl = window.__zgZahl; });
    // Archiv
    await page.evaluate(([y, lid]) => { App.tableView = 'gesamt'; App.viewArchivedSeason = { y, lid }; App.loadLeague(lid); }, [zg.y, '5-9']);
    await page.waitForFunction(() => !/lädt…/.test(document.getElementById('content').textContent), null, { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(600);
    const ar = await page.evaluate(id => { const t = Engine.teams[id]; const tr = [...document.querySelectorAll('#content table tbody tr')].find(r => { const m = r.querySelector('.tmn'); return m && m.dataset.full === t.name; });
        if (tr) tr.scrollIntoView({ block: 'center' });
        return tr ? { zg: (tr.querySelector('.zg') || {}).textContent || null, txt: (tr.querySelector('.strf-txt') || {}).textContent || null, tip: (tr.querySelector('.zg') || {}).title || '' } : null; }, zg.A);
    ok(`${name} Archiv Rückzug`, ar && ar.zg === 'zg.' && /annulliert/.test(ar.txt || '') && /danach/.test(ar.tip), JSON.stringify(ar));
    await page.screenshot({ path: path.join(SHOT, `archiv-rueckzug-${name}.png`) });
    // Ewige Tabelle: Reiter anklicken, Fußzeile „Anmerkungen“
    await page.evaluate(lid => { App.viewArchivedSeason = null; App.tableView = 'gesamt'; App.loadLeague(lid); }, '5-9');
    await page.waitForTimeout(500);
    await page.locator('#content button', { hasText: 'Ewige Tabelle' }).first().click();
    await page.waitForSelector('#ew-tab', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(500);
    const fn = await page.evaluate(() => { const e = document.querySelector('.ew-fn'); if (e) e.scrollIntoView({ block: 'center' }); return e ? e.textContent : null; });
    ok(`${name} Ewige Tabelle Fußzeile (Reiter geklickt)`, !!fn && fn.includes(zg.An) && /annulliert/.test(fn), (fn || 'keine Fußzeile').slice(0, 160));
    await page.screenshot({ path: path.join(SHOT, `ewige-fusszeile-${name}.png`) });
    await page.evaluate(y => App.showSaisonwechsel(y), zg.y);
    await page.waitForTimeout(500);
    const reiter2 = page.locator('#sw-box .btn.sw-sort', { hasText: 'Art' });
    if (await reiter2.count()) { await reiter2.first().click(); await page.waitForTimeout(400); }
    const bz = await page.evaluate(() => /Rückzug während der Saison/.test(document.getElementById('sw-box').textContent));
    ok(`${name} Bericht „Rückzug während der Saison“ (Reiter Art geklickt)`, bz, bz ? 'Gruppe da' : 'Gruppe fehlt');
    if (fehler.length) befunde.push(name + ': JS-Fehler ' + fehler.slice(0, 3).join(' | '));
    await ctx.close();
}
await lauf('desktop', { viewport: { width: 1280, height: 900 } });
await lauf('handy', { viewport: { width: 393, height: 851 }, deviceScaleFactor: 2.75, isMobile: true, hasTouch: true });
await browser.close();
console.log(befunde.length ? `\n${befunde.length} Befund(e)${SELBST ? ' – Selbsttest wie erwartet durchgefallen' : ''}` : '\nalles grün');
process.exit(befunde.length ? 1 : 0);
