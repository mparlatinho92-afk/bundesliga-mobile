// Alle „↘ Rückzug“-Zeilen des Archivs (vor dem Sim-Start), mit der ECHTEN Anzeige gerendert (template.html), und je Fall
// ein Datenbefund: Wo steht der Verein danach? Steht in der Folgesaison derselben Liga ein NEUER Verein mit ähnlichem Namen
// (= vermutlich derselbe Verein unter fremder ID, wie TSG Meißen → FC Meißen)? Taucht er nach einer Lücke wieder auf?
//   node .claude/skills/run/rueckzug_scan.mjs [port]     → tools/_dryrun/rueckzug_scan.txt (+ .json)
import { chromium } from 'playwright';
import fs from 'node:fs';
const PORT = process.argv.slice(2).find(a => /^\d+$/.test(a)) || 3334;
const browser = await chromium.launch();
const page = await (await browser.newContext({ viewport: { width: 1400, height: 1000 } })).newPage();
const fehler = []; page.on('pageerror', e => fehler.push(e.message)); page.on('dialog', d => d.accept());
await page.goto(`http://localhost:${PORT}/template.html`);
await page.waitForFunction(() => typeof Engine !== 'undefined' && Engine.archive && Engine.archive.histExtSeeded, null, { timeout: 90000 });
const keys = await page.evaluate(async () => { const x = await HistExt.load(); const sy = Engine.startYear || 2025;
    return Object.values(x.byKey).filter(t => parseInt(t.y) < sy).map(t => [t.lid, t.y]); });
console.log(keys.length, 'Liga-Saisons');
const faelle = []; let n = 0;
for (const [lid, y] of keys) {
    if (++n % 250 === 0) console.log(n, '…', faelle.length, 'Rückzüge');
    await page.evaluate(() => document.querySelectorAll('.ltab').forEach(t => t.dataset.alt = '1'));
    await page.evaluate(([lid, y]) => App._sbSaisonGo(lid, y), [lid, y]);
    await page.waitForFunction(() => document.querySelector('.ltab:not([data-alt]) tbody tr'), null, { timeout: 15000 }).catch(() => {});
    const r = await page.evaluate(([lid, y]) => {
        const out = [];
        document.querySelectorAll('.ltab:not([data-alt]) tbody tr').forEach(tr => {
            const t = tr.querySelector('.inf .itxt'); if (!t || !/Rückzug|Verbleib unbekannt|umbenannt/.test(t.textContent)) return;
            const m = tr.querySelector('.tmn') && tr.querySelector('.tmn').getAttribute('onclick').match(/'([^']+)'/);
            out.push({ lid, y, id: m && m[1], name: (tr.querySelector('.tmn') || {}).textContent.trim(), txt: t.textContent.trim(),
                tip: (tr.querySelector('.inf') || {}).title || '' });
        });
        return out;
    }, [lid, y]);
    faelle.push(...r);
}
// „✎ umbenannt in …“ (seit 31.10.2026) getrennt: Liste zum Durchsehen, kein Datenbefund nötig
const umb = faelle.filter(f => /umbenannt/.test(f.txt));
faelle.splice(0, faelle.length, ...faelle.filter(f => !/umbenannt/.test(f.txt)));
// Datenbefund je Fall
const befund = await page.evaluate((faelle) => {
    const x = HistExt.loaded(), nx = s => App._nextSeasonStr(s);
    const inS = s => { const m = {}; Object.values(x.byKey).filter(t => t.y === s).forEach(t => t.rows.forEach(q => { if (m[q.id] == null || App._archLevelOf(t.lid) < App._archLevelOf(m[q.id])) m[q.id] = t.lid; })); return m; };
    const cache = {}, I = s => cache[s] || (cache[s] = inS(s));
    const nm = id => (App._histClubName ? App._histClubName(id) : null) || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id]) || (GAME_DATA.teams[id] || {}).name || id;
    const tok = s => String(s).toLowerCase().replace(/[^a-zäöüß0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4 && !/^(verein|sport|fußball|fussball|turn|union|eintracht|borussia|germania|viktoria|concordia|alemannia|rot|weiß|blau|grün|schwarz|stahl|motor|chemie|aktivist|dynamo|lokomotive|empor|traktor|einheit|fortschritt|vorwärts|aufbau|post|turbine)$/.test(w));
    return faelle.map(f => {
        const s1 = nx(f.y), s2 = nx(s1), a = I(f.y), b = I(s1), c = I(s2);
        const lvl = App._archLevelOf(f.lid), n1 = b[f.id], n2 = c[f.id];
        const tk = tok(nm(f.id));
        // neue Vereine der Folgesaison auf derselben oder höherer Ebene mit gemeinsamem Namensbestandteil
        const neu = Object.keys(b).filter(id => a[id] == null && App._archLevelOf(b[id]) <= lvl && tok(nm(id)).some(w => tk.includes(w))).map(id => `${nm(id)} [${id}] in ${b[id]}`);
        return Object.assign(f, { lvl, n1: n1 ? `${n1} (E${App._archLevelOf(n1)})` : '—', n2: n2 ? `${n2} (E${App._archLevelOf(n2)})` : '—',
            zurueck: !!(n2 && App._archLevelOf(n2) <= lvl), neu });
    });
}, faelle);
const zeile = f => `${f.y}  ${f.lid}  #${f.id} ${f.name}: „${f.txt}“  danach ${f.n1}, übernächste ${f.n2}${f.zurueck ? '  ZURÜCK' : ''}${f.neu.length ? '\n      ähnlich neu: ' + f.neu.join('; ') : ''}`;
const verd = befund.filter(f => f.neu.length || f.zurueck), rest = befund.filter(f => !(f.neu.length || f.zurueck));
fs.writeFileSync('tools/_dryrun/rueckzug_scan.json', JSON.stringify(befund, null, 1));
fs.writeFileSync('tools/_dryrun/rueckzug_scan.txt', `${befund.length} Rückzüge in ${keys.length} Liga-Saisons\n\nVERDÄCHTIG (${verd.length}): ähnlicher neuer Name auf derselben Ebene oder übernächste Saison wieder da\n`
    + verd.map(zeile).join('\n') + `\n\nUNAUFFÄLLIG (${rest.length})\n` + rest.map(zeile).join('\n') + '\n');
fs.writeFileSync('tools/_dryrun/umbenannt_scan.txt', `${umb.length} „umbenannt“-Zeilen\n` + umb.map(f => `${f.y}  ${f.lid}  #${f.id} ${f.name}: „${f.txt}“`).join('\n') + '\n');
console.log(`${umb.length} Umbenennungen, ${befund.length} Rückzüge, verdächtig ${verd.length}, JS-Fehler ${fehler.length}`);
await browser.close();
