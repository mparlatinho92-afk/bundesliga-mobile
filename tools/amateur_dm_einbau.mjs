// Deutsche Amateurmeisterschaft 1951–1998 -> app/amateur_dm_data.js  (ERZEUGT – nie von Hand ändern), s. docs/AMATEURMEISTERSCHAFT.md
//   node tools/wiki_pokal.mjs --amateur && node tools/wiki_pokal_zuordnung.mjs --amateur && node tools/amateur_dm_einbau.mjs
//   Prüfung: node tools/amateur_dm_test.cjs (mit --selbsttest)
//
// Je Jahr nur, wie weit jeder Teilnehmer kam (Anzeige im Steckbrief), plus das Finale. Einzelspiele bleiben in tools/wiki_amateur_ids.json.
// Stufe = letzte erreichte Runde: M Meister | F Finale | E Endrunde (1998: Dreiergruppe statt Finale, Rang dahinter) | HF | VF | AF
//   | G Gruppe (1953–55 Vorrunde, 1991–94 Nord/Süd) | VR Vorrunde/1. Runde mit mehr als 16 Vereinen | Q Ausscheidungsspiel 1956–64
// Rundennamen sind je Jahrgang verschieden ("1. Runde" ist 1971 das Achtelfinale, 1979 das Viertelfinale) – ohne festen Namen zählt die
// Vereinszahl der Runde.
// Format AMATEUR_DM: { version, namen:{hist_am_*: Name}, jahre:{ "1958": { t:[[id, stufe, damaliger Name]], f:[meister, vize, "3:2"] } } }
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(DIR, '..');
const D = JSON.parse(fs.readFileSync(path.join(DIR, 'wiki_amateur_ids.json'), 'utf8'));
const RANG = { M: 9, F: 8, E: 7, HF: 6, VF: 5, AF: 4, G: 3, VR: 2, Q: 1 };

const stufeVon = (name, nVereine, mitTabelle) => {
    const n = name.replace(/\s*·.*$/, '').replace(/\s*\(.*$/, '');
    if (/^Finale/.test(n)) return 'F';
    if (/Halbfinale|Platz 3/.test(n)) return 'HF';
    if (/Viertelfinale/.test(n)) return 'VF';
    if (/Achtelfinale/.test(n)) return 'AF';
    if (/Ausscheidung/.test(n)) return 'Q';
    if (/Teilnehm/.test(n)) return 'E';                 // 1998: die Dreiergruppe (Tabelle + Spiele) steht unter "Teilnehmende Mannschaften"
    if (/Gruppe/.test(name) || mitTabelle) return 'G';
    return nVereine === 16 ? 'AF' : nVereine === 8 ? 'VF' : 'VR';
};

const namen = {}, jahre = {}, probleme = [];
for (const s of D.saisons) {
    const t = new Map();   // id -> [stufe, Name]
    const setze = (id, st, nm) => { const a = t.get(id); if (!a || RANG[st] > RANG[a[0]]) t.set(id, [st, a ? a[1] : nm]);
        if (/^hist_am_/.test(id) && !namen[id]) namen[id] = (D.neu && D.neu[id]) || nm; };
    // Vereinszahl je Grundrunde (Wiederholungsspiele zählen zur Runde davor)
    const zahl = {};
    s.runden.forEach(r => { const g = r.name.replace(/\s*·.*$/, ''); const z = zahl[g] = zahl[g] || new Set();
        r.spiele.forEach(sp => { z.add(sp.hId); z.add(sp.aId); }); (r.tabelle || []).forEach(v => z.add(v.id)); });
    for (const r of s.runden) {
        const st = stufeVon(r.name, zahl[r.name.replace(/\s*·.*$/, '')].size, !!(r.tabelle || []).length);
        r.spiele.forEach(sp => { setze(sp.hId, st, sp.h); setze(sp.aId, st, sp.a); });
        (r.tabelle || []).forEach(v => setze(v.id, st, v.name));
    }
    // Finale / Meister: Infobox-Meister unter den Finalisten (Link oder Name); Reserve: Infobox verlinkt oft die Erste
    const fin = s.runden.filter(r => /^Finale/.test(r.name)).flatMap(r => r.spiele);
    const finIds = [...new Set(fin.flatMap(sp => [sp.hId, sp.aId]))];
    const M = s.meister || {};
    const treffer = id => fin.some(sp => (sp.hId === id && (sp.hL === M.link || sp.h === M.name || (M.link && sp.h.startsWith(M.link))))
        || (sp.aId === id && (sp.aL === M.link || sp.a === M.name || (M.link && sp.a.startsWith(M.link)))));
    let meister = null, vize = null, erg = '';
    if (finIds.length === 2) {
        const tr = finIds.filter(treffer);
        if (tr.length === 1) meister = tr[0];
        // Gegenprobe aus den Toren: Hin-/Rückspiel 1977–79 nach Summe, Wiederholungsspiel (1960, 1974) nach dem letzten Spiel
        const tore = id => fin.reduce((a, sp) => a + (sp.hId === id ? sp.hg : sp.ag), 0);
        const zweiSpiele = fin.length === 2 && fin[0].hId === fin[1].aId;
        const letzt = fin[fin.length - 1];
        const sieger = zweiSpiele && !fin[0].nv && tore(finIds[0]) !== tore(finIds[1]) ? (tore(finIds[0]) > tore(finIds[1]) ? finIds[0] : finIds[1])
            : letzt.sieger === 'h' ? letzt.hId : letzt.sieger === 'a' ? letzt.aId : null;
        if (!meister) { meister = sieger; probleme.push(`${s.y}: Infobox-Meister "${M.name}" nicht namensgleich unter den Finalisten – aus den Toren: ${sieger}`); }
        else if (sieger && sieger !== meister) probleme.push(`${s.y}: FEHLER Infobox-Meister ≠ Sieger aus den Toren`);
        vize = finIds.find(id => id !== meister);
        // Ergebnis aus Sicht des Meisters, alle Finalspiele (Wiederholung, Hin/Rück)
        erg = fin.map(sp => { const m = sp.hId === meister; const a = m ? sp.hg : sp.ag, b = m ? sp.ag : sp.hg;
            return `${a}:${b}${sp.ie ? ` i.E. ${m ? sp.ie[0] : sp.ie[1]}:${m ? sp.ie[1] : sp.ie[0]}` : sp.nv ? ' n.V.' : ''}`; }).join(', ');
    } else if (t.size && [...t.values()].some(a => a[0] === 'E')) {
        // 1998: Gruppe statt Finale – Meister = Infobox, Rang aus der Reihenfolge Punkte/Tore der drei Spiele
        const tr = [...t.keys()].filter(id => s.runden.some(r => r.spiele.some(sp => (sp.hId === id && (sp.hL === M.link || sp.h === M.name)) || (sp.aId === id && (sp.aL === M.link || sp.a === M.name)))));
        if (tr.length === 1) meister = tr[0]; else probleme.push(`${s.y}: Endrunde ohne eindeutigen Meister`);
    } else probleme.push(`${s.y}: kein Finale mit zwei Vereinen (${finIds.length})`);
    if (meister) t.get(meister)[0] = 'M';
    jahre[s.y] = { t: [...t].map(([id, [st, nm]]) => [id, st, nm]).sort((a, b) => RANG[b[1]] - RANG[a[1]]), ...(vize ? { f: [meister, vize, erg] } : meister ? { f: [meister, null, ''] } : {}) };
    // Gegenprobe: jeder Verein der Teilnehmerliste steht in einem Spiel oder einer Gruppentabelle (Reserve-Link auf die Erste ausgenommen)
    (s.teilnehmer || []).forEach(v => { if (!t.has(v.id) && ![...t.values()].some(([, nm]) => nm.startsWith(v.name.replace(/^SV /, '')) || nm.startsWith(v.name)))
        probleme.push(`${s.y}: Teilnehmer ${v.name} [${v.id}] ohne Spiel`); });
}

// Neue Pokal-IDs (hist_pk_*) haben ihren Namen nur in app/pokal_hist_data.js – die Anzeige soll ohne den Pokal auskommen
{
    const ctx = {}; vm.createContext(ctx);
    vm.runInContext(fs.readFileSync(path.join(ROOT, 'app', 'pokal_hist_data.js'), 'utf8').replace(/^const /gm, 'var '), ctx);
    Object.values(jahre).forEach(j => j.t.forEach(([id, , nm]) => { if (/^hist_pk_/.test(id) && !namen[id]) namen[id] = (ctx.POKAL_HIST.namen || {})[id] || nm; }));
}
const daten = { namen, jahre };
const json = JSON.stringify(daten);
const version = crypto.createHash('sha1').update(json).digest('hex').slice(0, 10);
const ys = Object.keys(jahre);
const kopf = `// ERZEUGT von tools/amateur_dm_einbau.mjs – nie von Hand ändern.\n// Deutsche Amateurmeisterschaft ${ys[0]}–${ys[ys.length - 1]} (de.wikipedia, Saisonartikel): je Jahr Teilnehmer mit erreichter Runde + Finale.\n// Format siehe Kopf von tools/amateur_dm_einbau.mjs. Anzeige: app/amateur_dm.js (Steckbrief, ganz unten).\n`;
fs.writeFileSync(path.join(ROOT, 'app', 'amateur_dm_data.js'), kopf + `const AMATEUR_DM = ${JSON.stringify({ version, ...daten })};\n`);
const nT = Object.values(jahre).reduce((a, j) => a + j.t.length, 0), vereine = new Set(Object.values(jahre).flatMap(j => j.t.map(x => x[0])));
console.log(`${ys.length} Jahre, ${nT} Teilnahmen, ${vereine.size} Vereine (${Object.keys(namen).length} neu) | ${(json.length / 1024).toFixed(1)} kB | Version ${version}`);
probleme.forEach(p => console.log('HINWEIS ' + p));
console.log('-> app/amateur_dm_data.js');
