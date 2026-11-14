// Zwangsabstiege der Ebenen 3–4 nach Grund zählen (Nutzer 14.11.2026: „recherchieren, indem du zählst“ – statt 50:50 schätzen).
// Quelle: Saisonartikel der deutschen Wikipedia (3. Liga, Regionalligen 2008/09–2025/26). Je Artikel die Sätze mit Insolvenz /
// Lizenz / Zulassung / Rückzug / Zwangsabstieg herausziehen -> tools/_dryrun/zwangsabstieg_saetze.txt (Rohbefund zum Durchsehen).
// Die eigentliche Zählung steht von Hand geprüft in docs/rueckzug_messung/zwangsabstieg_gruende.md.
//   node tools/zwangsabstieg_gruende.cjs        (Zwischenspeicher tools/_dryrun/wiki_saison_cache.json, 1 s Pause je Abruf)
const fs = require('fs'), path = require('path'), https = require('https');
const R = path.join(__dirname, '..') + '/', DRY = R + 'tools/_dryrun/';
fs.mkdirSync(DRY, { recursive: true });
const CACHE = DRY + 'wiki_saison_cache.json', OUT = DRY + 'zwangsabstieg_saetze.txt';
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, 'utf8')) : {};
for (const k of Object.keys(cache)) if (cache[k] === null || cache[k] === '__429') delete cache[k];   // Fehlschläge neu holen
const UA = 'BundesligaSimulation-Recherche/1.0 (privates Simulationsprojekt)';
const s = y => `${y}/${String((y + 1) % 100).padStart(2, '0')}`;
const titel = [];
for (let y = 2008; y <= 2025; y++) {
    titel.push(['3. Liga', `3. Fußball-Liga ${s(y)}`]);
    if (y <= 2011) { titel.push(['RL (3 Staffeln)', `Fußball-Regionalliga ${s(y)}`]); continue; }   // bis 2011/12 ein Artikel für Nord/West/Süd
    ['Nord', 'Nordost', 'West', 'Südwest', 'Bayern'].forEach(r => titel.push([`RL ${r}`, `Fußball-Regionalliga ${r} ${s(y)}`]));
}
const hole = t => new Promise((ok, nein) => {
    if (cache[t] !== undefined) return ok(cache[t]);
    const q = `/w/api.php?action=parse&page=${encodeURIComponent(t)}&prop=wikitext&redirects=1&format=json&formatversion=2`;
    https.get({ hostname: 'de.wikipedia.org', path: q, headers: { 'User-Agent': UA } }, res => {
        let d = ''; res.on('data', c => d += c);
        res.on('end', () => { if (res.statusCode === 429) return ok('__429'); try { const j = JSON.parse(d); cache[t] = j.parse ? j.parse.wikitext : null; ok(cache[t]); } catch (e) { nein(e); } });
    }).on('error', nein);
});
const pause = ms => new Promise(r => setTimeout(r, ms));
const klar = w => w.replace(/<ref[^>]*\/>/g, '').replace(/<ref[\s\S]*?<\/ref>/g, '').replace(/\{\{[^{}]*\}\}/g, '')
    .replace(/\[\[(?:[^|\]]*\|)?([^\]]*)\]\]/g, '$1').replace(/'''?/g, '').replace(/<[^>]+>/g, '');
const KEY = /insolven|lizenz|zulassung|zurückgezogen|zurückziehen|rückzug|zwangsabst|abgemeldet|abmeldung|spielbetrieb eingestellt|planinsolvenz/i;
(async () => {
    const out = []; let fehlt = 0;
    for (const [liga, t] of titel) {
        const neu = cache[t] === undefined;
        let w = null;
        for (let v = 0; v < 6; v++) {   // Wikipedia drosselt (429): warten und erneut
            try { w = await hole(t); } catch (e) { w = null; }
            if (w !== '__429') break;
            await pause(15000 * (v + 1));
        }
        if (w === '__429') w = null;
        if (neu) { fs.writeFileSync(CACHE, JSON.stringify(cache)); await pause(2500); }
        if (!w) { fehlt++; out.push(`### ${t}: (kein Artikel)`); continue; }
        const saetze = klar(w).split(/(?<=[.!?])\s+|\n+/).filter(x => KEY.test(x) && x.length < 600);
        out.push(`### ${liga} ${t.slice(-7)}  (${saetze.length})`);
        [...new Set(saetze)].forEach(x => out.push('  - ' + x.trim()));
    }
    fs.writeFileSync(OUT, out.join('\n') + '\n');
    console.log(`${titel.length} Artikel, ${fehlt} fehlen -> ${OUT}`);
})();
