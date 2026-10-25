// Browser-Prüfung (25.10.2026): Verbandsligen Ebene 5 1994–~2001 aus f-archiv (docs/EBENE5_1994.md)
//   - Saisonauswahl der heutigen Liga lückenlos über die neuen Jahre (Verbandsliga Südwest 1994/95–2002/03, Saarlandliga bis 2005/06)
//   - alte Saison öffnet die Tabelle der Vorgängerliga, darüber steht die Oberliga als Liga darüber (Pyramide)
//   - Meister 1998/99 ist verlinkt und der Klick führt in die Oberliga 1999/2000 (Mainz 05 II, VfB Theley)
//   - Ewige Tabelle zählt Vereine, die NUR in den neuen Jahren dort spielten (SV Weingarten 2, Alkonia Hüttigweiler 8)
//   - Handy: Seite nicht breiter als der Bildschirm
// node .claude/skills/run/ebene5_check.mjs   (Server auf 3334; --selbsttest: die neuen Vorgänger abgehängt -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/ebene5', { recursive: true });
const FAELLE = [
    { lid: '6-1', vorg: 'h5-suedwest-verbandsliga', von: 1994, bis: 2002, meister: '1fsvmainz05ii_297', oben: 'h4-suedwest-oberliga', nur: ['hist_fa_svweingarten', 2] },
    { lid: '6-3', vorg: 'h5-saarland-verbandsliga', von: 1994, bis: 2005, meister: 'vfbtheley_266', oben: 'h4-suedwest-oberliga', nur: ['hist_fa_alkoniahuettigweiler', 8] },
];
const saison = y => y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`;
const b = await chromium.launch(); const bef = [], err = [];
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    await p.goto('http://localhost:3334/template.html', { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 180000 });
    if (SELBST) await p.evaluate(v => v.forEach(l => delete HIST_EXT.ligaNachfolger[l]), FAELLE.map(f => f.vorg));
    for (const f of FAELLE) {
        const L = await p.evaluate(async lid => { App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.tableView = 'gesamt'; App.loadLeague(lid);
            return (await App._allSeasonsList()).map(e => [e.y, e.lid]); }, f.lid);
        const fehlt = [];
        for (let y = f.von; y <= f.bis; y++) { const e = L.find(x => x[0] === saison(y)); if (!e || e[1] !== f.vorg) fehlt.push(saison(y)); }
        if (fehlt.length) B(`${f.lid} Saisonauswahl ohne ${f.vorg}: ${fehlt.join(', ')}`);
        // 1998/99 öffnen wie das Spiel (Saisonwahl)
        await p.evaluate(([y, v, lid]) => App._gotoSeason(y, 'arch', null, v || lid), ['1998/99', L.find(x => x[0] === '1998/99')?.[1], f.lid]);
        await p.waitForFunction(() => document.querySelector('#content table.ltab') || /keine archivierte/.test(document.getElementById('content').textContent), null, { timeout: 60000 });
        await p.waitForTimeout(300);
        const st = await p.evaluate(m => ({ zeilen: document.querySelectorAll('#content table.ltab tbody tr').length,
            nav: (document.querySelector('#content .pyr-nav, #content [class*="pyr"]') || document.getElementById('content')).textContent.slice(0, 400),
            breit: document.documentElement.scrollWidth - window.innerWidth, aktiv: App.activeLeague,
            erster: (() => { const tr = document.querySelector('#content table.ltab tbody tr'); return tr ? tr.textContent : ''; })() }), f.meister);
        if (st.zeilen < 14) B(`${f.lid} 1998/99: ${st.zeilen} Tabellenzeilen`);
        if (!/Oberliga Südwest/.test(st.nav)) B(`${f.lid} 1998/99: keine Oberliga Südwest als Liga darüber`);
        if (st.breit > 2) B(`${f.lid} 1998/99: Seite ${st.breit}px zu breit`);
        await p.screenshot({ path: `docs/ebene5/${f.lid}-1998-${art}${SELBST ? '-selbsttest' : ''}.png` });
        // Meister-Aufstieg klicken (Handy: Kurzform) -> Oberliga 1999/2000
        const link = p.locator('#content table.ltab tbody tr').first().locator(art === 'handy' ? '.iarr' : '.itxt');
        if (await link.count()) { await link.first().click(); await p.waitForTimeout(800);
            const z = await p.evaluate(() => ({ lid: App.activeLeague, y: App.viewArchivedSeason && App.viewArchivedSeason.y }));
            if (z.lid !== f.oben || z.y !== '1999/2000') B(`${f.lid} Klick auf den Meister-Aufstieg 1998/99: ${JSON.stringify(z)}`);
        } else B(`${f.lid} 1998/99: Meister ohne Auf-/Abstiegsangabe`);
        // Ewige Tabelle zählt den Verein, der nur in den neuen Jahren spielte
        const [vid, soll] = f.nur;
        const ew = await p.evaluate(([lid, vid]) => ((Engine.archive.ewige[lid] || {})[vid] || {}).years || 0, [f.lid, vid]);
        if (ew !== soll) B(`${f.lid} Ewige Tabelle ${vid}: ${ew} Saisons, soll ${soll}`);
    }
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK'); process.exit(bef.length ? 1 : 0);
