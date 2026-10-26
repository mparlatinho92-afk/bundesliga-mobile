// Browser-Prüfung (Nutzer 25.10.2026 „a“): Saarlandliga zeigt ihre Vorgänger Amateurliga Saarland 1963–78 und Verbandsliga Saar
// 1978–94, Hessenliga die Amateurliga Hessen 1963–78 – in Saisonauswahl, Ewiger Tabelle und per Klick in eine alte Saison.
// node .claude/skills/run/saar_hessen_vorgaenger.mjs   (Server auf 3334; --selbsttest: Vorgänger abgehängt -> MUSS durchfallen)
import { chromium } from 'playwright';
import * as fs from 'node:fs';
const SELBST = process.argv.includes('--selbsttest');
fs.mkdirSync('docs/saar-hessen', { recursive: true });
const b = await chromium.launch(); const bef = [], err = [];
for (const [art, opt] of [['desktop', { viewport: { width: 1400, height: 900 } }],
                          ['handy', { viewport: { width: 393, height: 851 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2.75 }]]) {
    const ctx = await b.newContext(opt), p = await ctx.newPage(); const B = t => bef.push(art + ': ' + t);
    p.on('pageerror', e => err.push(art + ': ' + String(e)));
    await p.goto('http://localhost:3334/template.html', { waitUntil: 'load', timeout: 60000 });
    await p.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded === HIST_EXT.version, null, { timeout: 120000 });
    if (SELBST) await p.evaluate(() => { ['h3-saarland-amateurliga', 'h4-saarland-verbandsliga', 'h3-hessen-amateurliga'].forEach(l => delete HIST_EXT.ligaNachfolger[l]); });
    for (const [lid, vorg, erst, probe] of [['6-3', ['h3-saarland-amateurliga', 'h4-saarland-verbandsliga'], '1963/64', '1985/86'], ['5-3', ['h3-hessen-amateurliga'], '1963/64', '1970/71']]) {
        const st = await p.evaluate(async ([lid, probe]) => { App.viewArchivedSeason = null; App.viewHistoryOffset = null; App.tableView = 'gesamt'; App.loadLeague(lid);
            const L = await App._allSeasonsList(); const e = L.find(x => x.y === probe); return { erste: L[0] && L[0].y, n: L.length, probeLid: e && e.lid }; }, [lid, probe]);
        if (st.erste !== erst) B(`${lid} Saisonauswahl beginnt ${st.erste}, soll ${erst}`);
        // Ewige Tabelle: Verein, der NUR in der Amateurliga spielte, zählt mit (SV St. Ingbert 24 seit der Zusammenlegung der Schreibweisen 25.10.2026, Germania Wiesbaden 8 Saisons)
        const [vid, soll] = lid === '6-3' ? ['hist_fa_svstingbert', 24] : ['hist_fa_germaniawiesbaden', 8];
        const ew = await p.evaluate(([lid, vid]) => ((Engine.archive.ewige[lid] || {})[vid] || {}).years || 0, [lid, vid]);
        if (ew !== soll) B(`${lid} Ewige Tabelle ${vid}: ${ew} Saisons, soll ${soll}`);
        // Klick in eine alte Saison über die heutige Liga: zeigt die Tabelle der Vorgängerliga
        if (!st.probeLid || !vorg.includes(st.probeLid)) B(`${lid} ${probe} in der Saisonauswahl: ${st.probeLid}`);
        await p.evaluate(([lid, y, v]) => App._gotoSeason(y, 'arch', null, v || lid), [lid, probe, st.probeLid]);
        await p.waitForFunction(() => document.querySelector('#content table.ltab') || /keine archivierte/.test(document.getElementById('content').textContent), null, { timeout: 60000 });
        const z = await p.evaluate(() => ({ zeilen: document.querySelectorAll('#content table.ltab tbody tr').length, kopf: (document.querySelector('#content h2, #content .arch-head, #content') || {}).textContent.slice(0, 200), breit: document.documentElement.scrollWidth - window.innerWidth }));
        if (z.zeilen < 10) B(`${lid} ${probe}: ${z.zeilen} Tabellenzeilen`);
        if (z.breit > 2) B(`${lid} ${probe}: Seite ${z.breit}px zu breit`);
        await p.screenshot({ path: `docs/saar-hessen/${lid}-${probe.slice(0, 4)}-${art}${SELBST ? '-selbsttest' : ''}.png` });
        // Ewige Tabelle anzeigen (heute) mit Vorgänger-Hinweis
        // wie das Spiel: zurück in die laufende Saison (_gotoSeason live), dann Reiter Ewige Tabelle; warten, bis sie gezeichnet ist
        await p.evaluate(([lid]) => { App.tableView = 'ewige'; App._gotoSeason(null, 'live', null, lid); }, [lid]);
        await p.waitForFunction(() => document.querySelector('#content .vorg-hinweis') && document.querySelectorAll('#content table tbody tr').length > 20, null, { timeout: 60000 }).catch(() => {});
        // nur der Hinweis über der Ewigen Tabelle zählt (die Pyramide nennt „Verbandsliga Saarland Nord-Ost“ immer)
        const t = await p.evaluate(() => ((document.querySelector('#content .vorg-hinweis') || {}).textContent || ''));
        const nm = lid === '6-3' ? /Amateurliga Saarland.*Verbandsliga Saar/ : /Amateurliga Hessen/;
        if (!nm.test(t)) B(`${lid} Vorgänger-Hinweis: „${t.slice(0, 160)}“`);
        await p.evaluate(() => { const h = document.querySelector('#content .vorg-hinweis'); if (h) h.scrollIntoView(); });
        await p.screenshot({ path: `docs/saar-hessen/${lid}-ewige-${art}${SELBST ? '-selbsttest' : ''}.png` });
    }
    await ctx.close();
}
await b.close();
if (err.length) bef.push('JS-Fehler: ' + err.slice(0, 3).join(' | '));
console.log(bef.length ? `BEFUND (${bef.length})\n  ` + bef.join('\n  ') : 'OK'); process.exit(bef.length ? 1 : 0);
