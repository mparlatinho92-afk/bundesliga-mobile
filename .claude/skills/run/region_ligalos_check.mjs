// Steckbrief → Region antippen (App.showRegionClubs): alle heute ligalosen Vereine des Verbands stehen unter „– ohne Liga –“ (Nutzerbefund
// 15.11.2026: Baden hat 8 Amateurpokal-Teilnehmer, die Liste zeigte nur 3 – im Spiel Abgestiegene standen unter ihrer Startliga).
// Spielt zwei Saisons (damit Vereine ins Ligalose fallen), vergleicht je Landesverband die Zahl „ohne Liga“ mit den ligalosen Vereinen
// laut Engine. Desktop + Handy.   node .claude/skills/run/region_ligalos_check.mjs [--selbsttest]
import { chromium } from 'playwright';
const SELBST = process.argv.includes('--selbsttest');
const URL = `http://localhost:3334/${SELBST ? 'index.html' : 'template.html'}`;
const b = await chromium.launch(), befund = [];
const ok = (n, bed, txt) => { console.log(`${bed ? '✓' : '✗'} ${n}: ${txt}`); if (!bed) befund.push(n + ': ' + txt); };
for (const [name, opt] of [['Desktop', { viewport: { width: 1300, height: 900 } }], ['Handy', { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }]]) {
    const page = await (await b.newContext(opt)).newPage();
    const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
    await page.goto(URL, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 1000, null, { timeout: 90000 });
    const r = await page.evaluate(() => {
        for (let i = 0; i < 2; i++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
        const out = [];
        for (const reg of ['Baden', 'Südbaden', 'Württemberg', 'Westfalen', 'Niederrhein', 'Bayern']) {
            const soll = Object.values(GAME_DATA.teams).filter(t => Engine.teams[t.id] && !Engine.teams[t.id].leagueId && App._teamRegionenAnzeige(t).includes(reg)).length;
            const gewandert = Object.values(GAME_DATA.teams).filter(t => t.leagueId && Engine.teams[t.id] && !Engine.teams[t.id].leagueId && App._teamRegionenAnzeige(t).includes(reg)).length;
            App.showRegionClubs(reg, 'liga');
            const txt = document.getElementById('modal-body').innerText;
            const i = txt.indexOf('– ohne Liga –');
            const ist = i < 0 ? 0 : (txt.slice(i).split('\n').filter(z => /^\d+$/.test(z.trim()) || z.trim() === '–').length);
            out.push({ reg, soll, gewandert, ist });
        }
        return out;
    });
    const falsch = r.filter(x => x.ist !== x.soll);
    ok(`${name} ohne Liga`, !falsch.length && r.some(x => x.gewandert > 0), r.map(x => `${x.reg} ${x.ist}/${x.soll} (davon im Spiel abgestiegen ${x.gewandert})`).join(' · '));
    await page.screenshot({ path: `docs/rueckzug_saison/region_ligalos_${name}.png` });
    if (fehler.length) ok(`${name} JS-Fehler`, false, [...new Set(fehler)].join(' / '));
}
console.log((SELBST ? '[SELBSTTEST index.html] ' : '') + (befund.length ? `BEFUND (${befund.length})` : 'Bestanden'));
await b.close(); process.exit(befund.length ? 1 : 0);
