// Lupe/Vereinssuche nach mehreren Saisons (Fix-Liste 12.11.2026: „zeigt nicht aktuelle Saison des Vereins, sondern die Saison am
// Sim-Anfang“). Ein Verein, der inzwischen ligalos ist, muss in der Unterzeile „ligalos“ zeigen, nicht seine Start-Liga.
// Getippt wird ins echte Suchfeld (#gs-input), gelesen das Dropdown (#gs-list).
//   node .claude/skills/run/lupe_ligalos_check.mjs [port] [saisons]
import { chromium } from 'playwright';
const zahlen = process.argv.slice(2).filter(a => /^\d+$/.test(a));
const PORT = zahlen[0] || 3334, N = +(zahlen[1] || 4);
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage(), fehler = [];
page.on('pageerror', e => fehler.push(e.message));
page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.teams && Object.keys(Engine.teams).length > 100, null, { timeout: 60000 });
const kand = await page.evaluate(N => {
    Engine.fastMode = true;
    for (let s = 0; s < N; s++) { Engine.simulateFullSeason(); Engine.processSeasonTransition(); }
    Engine.fastMode = false;
    // eindeutige Namen: sonst trifft die Suche mehrere Vereine
    const zahl = {}; Object.values(GAME_DATA.teams).forEach(t => { zahl[t.name] = (zahl[t.name] || 0) + 1; });
    const weg = Object.values(GAME_DATA.teams).filter(t => t.leagueId && Engine.teams[t.id] && Engine.teams[t.id].leagueId === null && zahl[t.name] === 1);
    const auf = Object.values(GAME_DATA.teams).filter(t => t.leagueId && Engine.teams[t.id] && Engine.teams[t.id].leagueId && Engine.teams[t.id].leagueId !== t.leagueId && zahl[t.name] === 1);
    return { weg: weg.slice(0, 3).map(t => ({ name: t.name, soll: 'ligalos' })),
             auf: auf.slice(0, 3).map(t => ({ name: t.name, soll: GAME_DATA.leagues[Engine.teams[t.id].leagueId].name })) };
}, N);
const befund = [];
for (const k of [...kand.weg, ...kand.auf]) {
    await page.evaluate(() => App._gsOpen && App._gsOpen());
    await page.fill('#gs-input', k.name);
    await page.evaluate(() => App._gsShow());
    const sub = await page.evaluate(name => {
        const it = [...document.querySelectorAll('#gs-list *')].find(e => e.children.length && e.textContent.includes(name));
        return it ? it.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : '(kein Treffer)';
    }, k.name);
    const ok = sub.includes(k.soll);
    console.log((ok ? 'OK    ' : 'FALSCH') + ' ' + k.name + ' → soll „' + k.soll + '“ · Dropdown: ' + sub);
    if (!ok) befund.push(k.name);
}
if (kand.weg.length < 3) befund.push(`nur ${kand.weg.length} ligalose Kandidaten – keine Aussage`);
if (fehler.length) befund.push('JS-Fehler: ' + fehler.join(' / '));
console.log(befund.length ? 'BEFUND: ' + befund.join(' · ') : 'Bestanden');
await browser.close();
process.exit(befund.length ? 1 : 0);
