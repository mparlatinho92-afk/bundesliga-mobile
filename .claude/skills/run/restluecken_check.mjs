// Browser-Prüfung (26.10.2026): Restlücken der Verbandsligen + Wolfhagen/Darmstadt 98 II (docs/EBENE5_1994.md)
//   - Saisonauswahl der heutigen Liga lückenlos vom ersten Jahr bis 2024/25: Saarlandliga (2006–08 fussball.de),
//     Mittelrheinliga (2008–11 fussball.de, damals Ebene 6), Verbandsliga Mecklenburg-Vorpommern (2008/09 Wikipedia)
//   - die neuen Saisons öffnen eine volle Tabelle, Seite nicht breiter als der Bildschirm (Handy)
//   - FSV Rot-Weiß Wolfhagen in der Verbandsliga Nord, die Dublette FSV Wolfhagen weg
//   - SV Darmstadt 98 II in der Hessenliga als Reserve, Wappen lädt, alte Hessen-Saisons hängen an der Spiel-ID
// node .claude/skills/run/restluecken_check.mjs   (Server auf 3334; --selbsttest: game_data.js + history_ext.js aus git HEAD -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
const SELBST = process.argv.includes('--selbsttest');
const REV = process.argv.find(a => a.startsWith('--rev='))?.slice(6) || 'HEAD';
fs.mkdirSync('docs/restluecken', { recursive: true });
const ALT = SELBST ? Object.fromEntries(['game_data.js', 'app/history_ext.js'].map(f =>
    [f, execSync(`git show ${REV}:${f}`, { maxBuffer: 1 << 28 }).toString()])) : null;
const LIGEN = [
    { lid: '6-3', neu: [2006, 2007, 2008], zeig: 2007 },
    { lid: '5-12', neu: [2008, 2009, 2010, 2011], zeig: 2009 },
    { lid: '6-19', neu: [2008], zeig: 2008 },
    // Verbandsliga Saar Süd-West 2020/21: bei fussball.de nicht mehr im Menü, aus FuPa (tools/fupa_ergaenzung.mjs, 26.10.2026)
    { lid: '7-7', neu: [2020], zeig: 2020 },
    // Vorlaeufer aus f-archiv (+ FuPa-Luecken), je Staffel eine Liga unter der heutigen (26.10.2026): Saisonauswahl lueckenlos ab
    // dem ersten Jahr, Tabelle eines alten Jahres oeffnet; vorg = die neuen Jahre stehen unter einer Vorgaenger-ID
    { lid: '8-1', vorg: true, von: 1978, zeig: 1985 }, { lid: '8-4', vorg: true, von: 1978, zeig: 1995 },
    { lid: '7-1', vorg: true, von: 1989, zeig: 1990 }, { lid: '6-8', vorg: true, von: 1994, zeig: 1998 },
    { lid: '6-18', vorg: true, von: 1978, zeig: 1980 }, { lid: '6-33', vorg: true, von: 1994, zeig: 2002, ohne: [2020] },
    { lid: '6-30', vorg: true, von: 1980, zeig: 1994 },
];
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
const b = await chromium.launch(); const bef = [], err = [];
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    if (ALT) for (const [f, txt] of Object.entries(ALT)) await p.route('**/' + f, r => r.fulfill({ body: txt, contentType: 'application/javascript' }));
    await p.goto('http://localhost:3334/template.html', { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 180000 });
    for (const f of LIGEN) {
        const L = await p.evaluate(async lid => { App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.tableView = 'gesamt'; App.loadLeague(lid);
            return (await App._allSeasonsList()).map(e => [e.y, e.lid || lid]); }, f.lid);
        const ys = L.map(e => +String(e[0]).slice(0, 4)).filter(y => y <= 2024);
        const luecke = []; for (let y = Math.min(...ys); y <= 2024; y++) if (!ys.includes(y) && !(f.ohne || []).includes(y)) luecke.push(saison(y));   // ohne: Bayern-Doppelsaison 2019-21
        if (luecke.length) B(`${f.lid} Saisonauswahl hat Lücken: ${luecke.join(', ')}`);
        if (f.vorg) { if (Math.min(...ys) > f.von) B(`${f.lid} Saisonauswahl beginnt ${saison(Math.min(...ys))}, soll ${saison(f.von)}`); }
        else {
            const falsch = f.neu.filter(y => (L.find(e => e[0] === saison(y)) || [])[1] !== f.lid);
            if (falsch.length) B(`${f.lid} neue Saisons nicht unter der Liga selbst: ${falsch.map(saison).join(', ')}`);
        }
        const eintrag = L.find(e => e[0] === saison(f.zeig));
        if (!eintrag) { B(`${f.lid} ${saison(f.zeig)} fehlt in der Saisonauswahl`); continue; }
        await p.evaluate(([y, lid]) => App._gotoSeason(y, 'arch', null, lid), [saison(f.zeig), eintrag[1]]);
        await p.waitForFunction(() => document.querySelector('#content table.ltab') || /keine archivierte/.test(document.getElementById('content').textContent), null, { timeout: 60000 });
        await p.waitForTimeout(300);
        const st = await p.evaluate(() => ({ zeilen: document.querySelectorAll('#content table.ltab tbody tr').length,
            breit: document.documentElement.scrollWidth - window.innerWidth }));
        if (st.zeilen < 14) B(`${f.lid} ${saison(f.zeig)}: ${st.zeilen} Tabellenzeilen`);
        if (st.breit > 2) B(`${f.lid} ${saison(f.zeig)}: Seite ${st.breit}px zu breit`);
        await p.screenshot({ path: `docs/restluecken/${f.lid}-${f.zeig}-${art}${SELBST ? '-selbsttest' : ''}.png` });
    }
    // Wolfhagen und Darmstadt 98 II in der laufenden Saison
    const t = await p.evaluate(() => {
        const T = id => Engine.teams[id] || null;
        const w = T('fsvrotweisswolfhagen_1028'), d = T('svdarmstadt98ii_1265');
        return { w: w && w.leagueId, dub: !!T('fsvwolfshagen_1068'), d: d && [d.leagueId, d.isReserve, d.parentId],
            ewige: ['h4-hessen-landesliga', '6-9'].map(l => (((Engine.archive.ewige || {})[l] || {})['svdarmstadt98ii_1265'] || {}).years || 0) };
    });
    if (t.w !== '6-7') B(`Rot-Weiß Wolfhagen in ${t.w}, soll 6-7`);
    if (t.dub) B('Dublette fsvwolfshagen_1068 noch im Spiel');
    if (!t.d || t.d[0] !== '5-3' || !t.d[1] || t.d[2] !== 'svdarmstadt98_988') B(`Darmstadt 98 II: ${JSON.stringify(t.d)}`);
    // vorher hist_wk_svdarmstadt98ii: Landesliga Hessen 1982–86, Verbandsliga Süd 2003–14
    if (t.ewige.join() !== '4,11') B(`Darmstadt 98 II an der Spiel-ID: Landesliga/Verbandsliga Süd ${t.ewige.join('/')} Saisons, soll 4/11`);
    await p.evaluate(() => { App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.tableView = 'gesamt'; App.loadLeague('5-3'); });
    await p.waitForSelector('#content table.ltab tbody tr', { timeout: 30000 }); await p.waitForTimeout(500);
    const z = await p.evaluate(() => { const tr = [...document.querySelectorAll('#content table.ltab tbody tr')].find(r => /Darmstadt 98 II|Darmstadt II|SVD II/.test(r.textContent));
        const img = tr && tr.querySelector('img'); return { da: !!tr, wappen: img ? img.complete && img.naturalWidth > 0 : false, breit: document.documentElement.scrollWidth - window.innerWidth }; });
    if (!z.da) B('Hessenliga-Tabelle ohne Darmstadt 98 II');
    else if (!z.wappen) B('Darmstadt 98 II ohne geladenes Wappen');
    if (z.breit > 2) B(`Hessenliga: Seite ${z.breit}px zu breit`);
    await p.screenshot({ path: `docs/restluecken/hessenliga-${art}${SELBST ? '-selbsttest' : ''}.png` });
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK'); process.exit(bef.length ? 1 : 0);
