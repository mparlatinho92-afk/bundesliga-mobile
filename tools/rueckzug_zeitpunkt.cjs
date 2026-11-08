// Rückzug WÄHREND der Saison in echt: wie stehen zurückgezogene Mannschaften in der Abschlusstabelle? (fussball.de 2001/02–2024/25,
// alle Hauptrunden-Staffeln, G:\Meine Ablage\fussball.de\<verband>\tabellen.csv). Sp = gewertete Spiele, voll = 2·(n−1):
//   0             -> alles annulliert
//   1 … n−1       -> nur (Teile der) Hinrunde gewertet, Rest gestrichen
//   n … voll−1    -> bis in die Rückrunde gewertet, Rest gestrichen
//   voll          -> alle Spiele gewertet (Restspiele mit Wertung für den Gegner)
// Aufruf: node tools/rueckzug_zeitpunkt.cjs   -> Zusammenfassung je Ebenen-Gruppe (Spielklasse) im Terminal + docs/rueckzug_saison/zeitpunkt.txt
const fs = require('fs'), path = require('path');
const G = process.env.FBDE_DIR || 'G:\\Meine Ablage\\fussball.de';
const OUT = path.join(__dirname, '..', 'docs', 'rueckzug_saison');
fs.mkdirSync(OUT, { recursive: true });
const gruppe = kl => /^(Bundesliga|2\.Bundesliga|3\.Liga|Regionalliga)$/.test(kl) ? '1 Profi/RL' : /Oberliga|Verbandsliga|Landesliga/.test(kl) ? '2 OL/VL/LL' : /Bezirk/.test(kl) ? '3 Bezirk' : '4 Kreis u. a.';
const z = {}, bsp = [];
for (const v of fs.readdirSync(G)) {
    const p = path.join(G, v, 'tabellen.csv');
    if (v === 'wikipedia' || /_pokale$/.test(v) || !fs.existsSync(p)) continue;
    const L = fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/), kopf = L[0].split(';');
    const st = {};
    L.slice(1).filter(Boolean).forEach(r => { const t = r.split(';'), o = {}; kopf.forEach((k, i) => o[k] = t[i]); if ((o.phase || 'Hauptrunde') === 'Hauptrunde') (st[o.staffel_id] = st[o.staffel_id] || []).push(o); });
    for (const sid in st) {
        const rows = st[sid], n = rows.length, voll = 2 * (n - 1);
        const maxSp = Math.max(...rows.map(r => +r.spiele || 0));
        if (maxSp < voll - 2) continue;   // Einfachrunde, Abbruch o. Ä. – nicht vergleichbar
        for (const r of rows) {
            if (!(/zur.ckgezogen/i.test(r.hinweis || '') || / zg\.?$/.test(r.mannschaft))) continue;
            const sp = +r.spiele || 0, g = gruppe(r.spielklasse);
            const k = sp === 0 ? 'annulliert' : sp < n ? 'nur Hinrunde' : sp < voll ? 'bis in die Rückrunde' : 'alle gewertet';
            const c = z[g] || (z[g] = { annulliert: 0, 'nur Hinrunde': 0, 'bis in die Rückrunde': 0, 'alle gewertet': 0 });
            c[k]++;
            if (bsp.length < 300) bsp.push(`${g} | ${v} ${r.saison} ${r.spielklasse} ${r.staffel}: ${r.mannschaft} ${sp}/${voll} Sp. → ${k}`);
        }
    }
}
const L = ['# Rückzug während der Saison – wie werten die Verbände? (node tools/rueckzug_zeitpunkt.cjs, ' + new Date().toISOString().slice(0, 10) + ')', ''];
for (const g of Object.keys(z).sort()) {
    const c = z[g], s = Object.values(c).reduce((a, b) => a + b, 0);
    L.push(`${g.padEnd(14)} ${String(s).padStart(5)} Fälle: ` + Object.entries(c).map(([k, n]) => `${k} ${n} (${(100 * n / s).toFixed(0)} %)`).join(' · '));
}
fs.writeFileSync(path.join(OUT, 'zeitpunkt.txt'), L.concat(['', ...bsp]).join('\n') + '\n');
console.log(L.join('\n'));
