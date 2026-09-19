// PRUEFUNG (Exit 1 bei Befund): historische Ligen Ebene 2-3 (app/history_ext.js + app/hist_ext.js) in Engine und Speicher.
//
//   node tools/historie_einbau_test.cjs              alle Pruefungen
//   node tools/historie_einbau_test.cjs --selbsttest dieselben Pruefungen gegen eine absichtlich kaputte Neufaltung
//                                                    (Abzug des alten Anteils fehlt) – MUSS durchfallen
//
// Headless wie tools/sim_headless.cjs; IndexedDB gibt es in Node nicht, also liefert IDBStore nur die Erweiterung –
// genau der Pfad, den die Mischung in app/idb_store.js abdecken muss.
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..') + '/';
const SELBST = process.argv.includes('--selbsttest');

global.window = global;
const store = {};
global.localStorage = { getItem: k => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); }, removeItem: k => { delete store[k]; } };
global.document = { getElementById: () => null };
global.LZString = { compressToUTF16: s => s, decompressFromUTF16: s => s };
['game_data.js', 'app/history_data.js', 'app/history_ext.js', 'app/hist_ext.js', 'app/idb_store.js', 'game_engine.js'].forEach(f =>
    (0, eval)(fs.readFileSync(ROOT + f, 'utf8').replace(/^const /gm, 'var ')));

const befunde = [];
const pruefe = (ok, text) => { console.log((ok ? '  ok   ' : '  FEHL ') + text); if (!ok) befunde.push(text); };
const kopie = o => JSON.parse(JSON.stringify(o));
// Vergleich ohne Schluesselreihenfolge (eine Neufaltung legt Ligen/Vereine in anderer Reihenfolge wieder an)
const kanon = o => JSON.stringify(o, (k, v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.keys(v).sort().map(x => [x, v[x]])) : v);

if (SELBST) {
    // Sabotage: alter Anteil der geteilten Ligen wird nicht abgezogen -> Neufaltung zaehlt doppelt
    const orig = Engine._foldHistExt;
    Engine._foldHistExt = function (A, x) { A.histExtSum = {}; return orig.call(this, A, x); };
}

(async () => {
    Engine.init();
    const A = Engine.archive;
    pruefe(A.histRemap === Object.keys(HIST_EXT.remap).sort().join(','), 'Umhaenge-Guard gesetzt');
    const lief = await Engine._seedHistoryExt();
    const x = HistExt.loaded();
    pruefe(!!x, 'Erweiterung entpackt');
    if (!x) return ende();

    // 1. Daten
    const recs = Object.values(x.byKey);
    const zeilen = recs.reduce((a, r) => a + r.rows.length, 0);
    // Sollwerte aus dem Kopf der erzeugten Datei ("1227 Liga-Saisons, 22202 Vereinssaisons")
    const kopf = fs.readFileSync(ROOT + 'app/history_ext.js', 'utf8').match(/(\d+) Liga-Saisons, (\d+) Vereinssaisons/);
    pruefe(kopf && recs.length === +kopf[1] && zeilen === +kopf[2], `${kopf && kopf[1]} Liga-Saisons / ${kopf && kopf[2]} Zeilen entpackt (ist ${recs.length} / ${zeilen})`);
    const ohneName = new Set();
    recs.forEach(r => r.rows.forEach(z => { if (!GAME_DATA.teams[z.id] && !HISTORIC_CLUBS[z.id]) ohneName.add(z.id); }));
    pruefe(!ohneName.size, `jede ID hat einen Namen (${ohneName.size} ohne)`);
    const kaputt = recs.flatMap(r => r.rows).filter(z => ![z.s, z.u, z.n, z.gf, z.ga].every(Number.isFinite));
    pruefe(!kaputt.length, `S/U/N/Tore ueberall Zahlen (${kaputt.length} nicht)`);
    const falscheP2 = recs.flatMap(r => r.rows.filter(z => z.e && z.p2 && 2 * z.s + z.u !== z.p2[0]));
    pruefe(!falscheP2.length, `geschaetzte Zeilen treffen die amtlichen 2-Punkte-Werte (${falscheP2.length} daneben)`);

    // 2. Faltung
    pruefe(lief === true && A.histExtSeeded === HIST_EXT.version, 'Faltung gelaufen, Guard = Datenversion');
    const soll = {}; // lid -> Summe Spiele
    recs.forEach(r => { const vr = {}; (r.vr || []).forEach(v => v.rows.forEach(q => { vr[q.id] = q; }));
        // Vorgaenger einer heutigen Liga (ligaNachfolger) zaehlen zusaetzlich beim Nachfolger
        const ziele = [r.lid].concat((HIST_EXT.ligaNachfolger || {})[r.lid] || []);
        r.rows.forEach(z => { const q = vr[z.id] && !r.kumS ? vr[z.id] : null; ziele.forEach(l => { soll[l] = (soll[l] || 0) + z.s + z.u + z.n + (q ? q.s + q.u + q.n : 0); }); }); });
    const ist = lid => Object.values(A.ewige[lid] || {}).reduce((a, e) => a + e.p, 0);
    const extLids = Object.keys(HIST_EXT.ligen);
    pruefe(extLids.every(l => ist(l) === soll[l]), 'Ewige Tabelle je historischer Liga = Summe der Tabellen');
    const geteilt = Object.keys(soll).filter(l => !HIST_EXT.ligen[l]);
    pruefe(geteilt.length > 10 && geteilt.every(l => ist(l) === soll[l]), `Spiel-Ligen (3. Liga, Regional-/Oberligen): Vor-Sim-Start-Saisons in der Ewigen Tabelle (${geteilt.length} Ligen, abweichend: ${geteilt.filter(l => ist(l) !== soll[l]).join(',') || '-'})`);
    const nan = Object.values(A.ewige).flatMap(E => Object.values(E)).filter(e => !['p', 'w', 'd', 'l', 'gf', 'ga', 'pts'].every(f => Number.isFinite(e[f])));
    pruefe(!nan.length, `keine NaN-Eintraege (${nan.length})`);
    pruefe(Object.values(A.ewige).every(E => !Object.keys(E).some(id => HIST_EXT.remap[id])), 'keine alte DDR-ID mehr in den Ewigen Tabellen');

    // 3. Neufaltung bei neuer Datenversion: gleiches Ergebnis, gespielte Saisons der geteilten Liga bleiben
    const vorher = kopie(A.ewige);
    A.ewige['3'].__gespielt = { name: 'X', years: 3, p: 114, w: 50, d: 30, l: 34, gf: 150, ga: 120, pts: 180, titles: 1, promotions: 0 };
    const ver = HIST_EXT.version; HIST_EXT.version = ver + '-neu';
    await Engine._seedHistoryExt();
    HIST_EXT.version = ver;
    const g = A.ewige['3'].__gespielt; delete A.ewige['3'].__gespielt;
    pruefe(g && g.p === 114 && g.years === 3, 'gespielte Saison der 3. Liga ueberlebt die Neufaltung');
    pruefe(kanon(A.ewige) === kanon(vorher), 'Neufaltung = erste Faltung (nichts doppelt, nichts verloren)');

    // 4. Umhaengen alter Spielstaende
    const alt = Object.keys(HIST_EXT.remap)[0], neu = HIST_EXT.remap[alt];
    const B = { ewige: { ddr1: { [alt]: { name: 'alt', years: 2, p: 60, w: 20, d: 20, l: 20, gf: 70, ga: 70, pts: 80, titles: 0, promotions: 0 } } }, champions: { ddr1: [{ y: '1950/51', id: alt }] }, relStats: {} };
    Engine._remapArchiveIds(B, HIST_EXT.remap);
    pruefe(!B.ewige.ddr1[alt] && B.ewige.ddr1[neu] && B.ewige.ddr1[neu].p === 60 && B.champions.ddr1[0].id === neu, `Altstand: ${alt} -> ${neu}`);

    // 4b. Covid-Saisons: Vorrunde + Platzierungsrunden, Platz durchgezaehlt, Ewige Tabelle ohne Doppelzaehlung
    const covid = recs.filter(r => r.vr);
    pruefe(covid.length >= 9, `Saisons mit Vorrunde: ${covid.length}`);
    pruefe(covid.every(r => r.rows.map(z => z.rank).sort((a, b) => a - b).every((v, i) => v === i + 1) && r.rows.every(z => z.gr != null)),
        'Platz in jeder Covid-Saison lueckenlos durchgezaehlt, Platz in der Runde vorhanden');
    // Stichprobe Zaehlweise B (Oberliga Hamburg 2021/22: Endrunde nur Runde) – ein Verein, der sonst nie in 5-5 stand, waere
    // eindeutig; stattdessen Summe der Spiele der ganzen Liga gegen die Tabellen (Vorrunde dazu, wo die Endrunde sie nicht hat)
    const sollMitVr = lid => recs.filter(r => r.lid === lid || (HIST_EXT.ligaNachfolger || {})[r.lid] === lid).reduce((a, r) => { const vr = {}; (r.vr || []).forEach(v => v.rows.forEach(q => { vr[q.id] = q; }));
        return a + r.rows.reduce((b, z) => { const q = vr[z.id] && !r.kumS ? vr[z.id] : null; return b + z.s + z.u + z.n + (q ? q.s + q.u + q.n : 0); }, 0); }, 0);
    pruefe(['5-5', '5-11', '5-10'].every(l => ist(l) === sollMitVr(l)), `Ewige Tabelle mit Vorrunde (Hamburg nur Runde, Niederrhein gesamt, Westfalen gemischt): ${['5-5', '5-11', '5-10'].map(l => ist(l) + '/' + sollMitVr(l)).join(' ')}`);
    const tg = x => recs.filter(r => r.lid === '5-10' || (HIST_EXT.ligaNachfolger || {})[r.lid] === '5-10').reduce((a, r) => { const vr = {}; (r.vr || []).forEach(v => v.rows.forEach(q => { vr[q.id] = q; })); return a + r.rows.reduce((b, z) => b + z.gf + (vr[z.id] && !r.kumT ? vr[z.id].gf : 0), 0); }, 0);
    pruefe(Object.values(A.ewige['5-10']).reduce((a, e) => a + e.gf, 0) === tg(), 'Westfalen: Tore nicht doppelt (Endrunde enthaelt sie schon)');

    // 4c. Covid-Jahre 2019/20-2022/23: jede heutige Regional- und Oberliga hat ihre Saison (Bayern 2020/21 = Teil der
    //     Doppelsaison 2019-21), 2019/20 ist ueberall als abgebrochen oder Doppelsaison gekennzeichnet
    const LIDS45 = Object.keys(GAME_DATA.leagues).filter(l => [4, 5].includes(GAME_DATA.leagues[l].level));
    const fehlend = [];
    for (const y of ['2019/20', '2020/21', '2021/22', '2022/23']) for (const l of LIDS45) {
        const r = x.byKey[y + '|' + l];
        if (!r && !(y === '2020/21' && x.byKey['2019/20|' + l] && x.byKey['2019/20|' + l].doppel)) fehlend.push(y + ' ' + l);
    }
    pruefe(!fehlend.length, `Covid-Jahre vollstaendig fuer ${LIDS45.length} Regional-/Oberligen (fehlt: ${fehlend.join(', ') || '-'})`);
    const ohneKennung = LIDS45.filter(l => { const r = x.byKey['2019/20|' + l]; return r && !r.abbruch && !r.doppel; });
    pruefe(!ohneKennung.length, `2019/20 ueberall als abgebrochen/Doppelsaison gekennzeichnet (ohne: ${ohneKennung.join(', ') || '-'})`);
    const ungleichOhne = recs.filter(r => /^20(19|20)/.test(r.y) && !r.abbruch && (() => { const sp = r.rows.map(z => z.s + z.u + z.n); return Math.max(...sp) - Math.min(...sp) >= 2; })());
    pruefe(!ungleichOhne.length, `ungleiche Spielzahlen 2019-21 nur mit Abbruch-Kennung (${ungleichOhne.map(r => r.y + ' ' + r.lid).join(', ') || '-'})`);

    // 4d. Dubletten: derselbe Vereinsname darf nicht zweimal als verschiedener Verein vorkommen (tools/hist_dubletten.mjs,
    //     Zusammenlegung in tools/historie_einbau.mjs 1d + tools/hist_alias.json)
    const nameVon = id => HIST_EXT.vereine[id] || (GAME_DATA.teams[id] || {}).name || HISTORIC_CLUBS[id];
    const proName = {};
    new Set(recs.flatMap(r => r.rows.map(z => z.id).concat((r.vr || []).flatMap(v => v.rows.map(z => z.id))))).forEach(id => {
        const n = (nameVon(id) || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (n) (proName[n] = proName[n] || []).push(id);
    });
    // Absichtlich getrennte Namensvettern (Dry-Run 4b/4c, Doppelbelegung) tragen einen Zusatz an der ID: 2, _2, _nv, _dp
    const vetter = id => /^hist_.*(_nv|_dp|_?\d)$/.test(id);   // bewusst getrennter Namensvetter
    const doppelt = Object.values(proName).filter(a => a.length > 1 && !a.some(vetter));
    pruefe(!doppelt.length, `kein Vereinsname zweimal (${doppelt.slice(0, 5).map(a => nameVon(a[0]) + ': ' + a.join('+')).join(' | ') || '-'})`);

    // 4e. Fusionen (tools/hist_fusion.json): Vorgaenger behalten eigene IDs mit eigenen Zeilen, Nachfolger findet sie und umgekehrt
    if (SELBST) { const nf0 = Object.keys(HIST_EXT.fusion)[0]; HIST_EXT.fusion[nf0].vorgaenger = [nf0, 'hist_gibtsnicht']; }
    const zeilenVon = {};
    recs.forEach(r => r.rows.forEach(z => zeilenVon[z.id] = (zeilenVon[z.id] || 0) + 1));
    HISTORY_SEED.seasons.forEach(s => s.table.forEach(z => zeilenVon[z.id] = (zeilenVon[z.id] || 0) + 1));
    const F = HIST_EXT.fusion || {};
    const fFehl = [];
    for (const [nf, f] of Object.entries(F)) {
        if (!nameVon(nf)) fFehl.push(nf + ' ohne Namen');
        f.vorgaenger.forEach(v => {
            if (v === nf) fFehl.push(v + ' ist sein eigener Vorgaenger');
            if (!nameVon(v) || !zeilenVon[v]) fFehl.push(v + ' ohne Namen/Tabellenzeile');
            const n = HistExt.nachfolger(v); if (!n || n.id !== nf) fFehl.push(v + ': nachfolger() falsch');
        });
        const vg = HistExt.vorgaenger(nf); if (!vg || vg.ids.length !== f.vorgaenger.length) fFehl.push(nf + ': vorgaenger() falsch');
    }
    pruefe(Object.keys(F).length >= 3 && !fFehl.length, `Fusionen: ${Object.keys(F).length}, jeder Vorgaenger eigene ID mit Zeilen (${fFehl.slice(0, 4).join(' | ') || '-'})`);
    // MTV und ESV Ingolstadt spielten gleichzeitig – zusammengelegt waere die Liga doppelt belegt
    const zugleichIN = recs.some(r => r.rows.some(z => z.id === 'hist_mtvingolstadt') && r.rows.some(z => z.id === 'hist_fa_esvingolstadt'));
    pruefe(zugleichIN, 'MTV und ESV Ingolstadt stehen getrennt in derselben Tabelle');
    // Merseburg: SV Merseburg 99 (1991/92) = Chemie Buna Schkopau; "SV Merseburg" 1990/91 neben VfB bleibt eigener Verein
    const inT = (y, id) => recs.some(r => r.y === y && r.rows.some(z => z.id === id));
    pruefe(inT('1991/92', 'hist_chemiebunaschkopau') && inT('1990/91', 'hist_fa_svmerseburg') && inT('1990/91', 'vfbmerseburg_897'),
        'Merseburg: SV 99 bei Buna Schkopau, SV Merseburg 1990/91 neben VfB');
    // Reserven: A / Am. / Amat. / Amateure heissen II (ausser Jeddeloh II); Freiburger FC II nicht bei SC Freiburg II
    const altRes = Object.values(HIST_EXT.vereine).filter(n => /\s(A|Am\.?|Amat\.?|Amateure)$/.test(n) && !/jeddeloh/i.test(n));
    pruefe(!altRes.length, `Reserven heissen II (noch alt: ${altRes.slice(0, 4).join(', ') || '-'})`);
    pruefe(HIST_EXT.vereine.hist_fa_freiburgerfca === 'Freiburger FC II' && !inT('1965/66', 'scfreiburgii_903'), 'Freiburger FC II eigener Verein, nicht SC Freiburg II');

    // 4b. Oberligen 1994/95-2007/08 (Ebene 4, Nutzerwunsch 19.09.2026): vollstaendig, ohne angehaengte Aufstiegsrunden
    const H4 = Object.keys(HIST_EXT.ligen).filter(l => HIST_EXT.ligen[l].level === 4 && HIST_EXT.ligen[l].epoche === 'brd3');
    const saisonen = Array.from({ length: 14 }, (_, i) => { const y = 1994 + i; return y === 1999 ? '1999/2000' : `${y}/${String(y + 1).slice(-2)}`; });
    const h4fehlt = H4.flatMap(l => saisonen.filter(y => !x.byKey[y + '|' + l]).map(y => y + ' ' + l));
    pruefe(H4.length === 8 && !h4fehlt.length, `Oberligen 1994-2008: ${H4.length} Ligen x 14 Saisons (fehlt: ${h4fehlt.slice(0, 4).join(', ') || '-'})`);
    const staffelnVon = (y, l) => new Set((x.byKey[y + '|' + l] || { rows: [] }).rows.map(r => r.g || '')).size;
    const zweigleisig = saisonen.filter(y => staffelnVon(y, 'h4-nordost-oberliga') === 2).length + saisonen.filter(y => staffelnVon(y, 'h4-nord-oberliga') === (+y.slice(0, 4) < 2004 ? 2 : 1)).length;
    pruefe(zweigleisig === 28, `Staffeln: Nordost immer 2, Nord bis 2003/04 2 und danach 1 (${zweigleisig}/28 Saisons)`);
    // Aufstiegsrunden (Hessen 1998-2006, Nord 2007/08) hingen in der Quelle als Mini-Tabelle darunter: 3-5 Vereine, 2-4 Spiele
    const kurzeZeilen = H4.flatMap(l => saisonen.flatMap(y => {
        const rows = (x.byKey[y + '|' + l] || { rows: [] }).rows, sp = r => r.s + r.u + r.n, max = Math.max(...rows.map(sp));
        return rows.filter(r => sp(r) > 0 && 2 * sp(r) < max).map(r => y + ' ' + l + ' ' + (HIST_EXT.vereine[r.id] || r.id));
    }));
    pruefe(!kurzeZeilen.length, `keine Aufstiegsrunde als Staffel (${kurzeZeilen.slice(0, 3).join(', ') || '-'})`);
    const h4est = H4.flatMap(l => saisonen.flatMap(y => (x.byKey[y + '|' + l] || { rows: [] }).rows.filter(r => r.e)));
    pruefe(!h4est.length, `Oberligen 1994-2008 ohne geschaetzte S/U/N (${h4est.length})`);
    const leer = { rows: [] };
    const non01 = (x.byKey['2000/01|h4-nordost-oberliga'] || leer).rows.filter(r => r.g === 'Nord');
    pruefe(non01.length === 18 && non01.every(r => r.s + r.u + r.n === 34), `Nordost Nord 2000/01 aus Wikipedia: 18 Vereine, je 34 Spiele (f-archiv: 30)`);
    const nr99 = (x.byKey['1999/2000|h4-nordrhein-oberliga'] || leer).rows.length;
    pruefe(nr99 === 17, `Nordrhein 1999/2000 vollstaendig (${nr99}, f-archiv: 15)`);
    const lev = H4.flatMap(l => saisonen.filter(y => inT(y, 'bayer04leverkusen_1069')));
    pruefe(!lev.length, `"Bayer Leverkusen II." nicht beim Profiverein (${lev.join(', ') || '-'})`);
    pruefe(H4.every(l => (HIST_EXT.hoch1994 || {})[l]), 'jede Oberliga 1994-2008 hat ihre Regionalliga darueber (hoch1994)');

    // 4c. Heutige Liga als Nachfolger (ligaNachfolger): Ewige Tabelle und Meister ab 1978 wie bei Wikipedia, historische Liga
    // behaelt ihre eigene Tabelle. Nur eindeutige Faelle (Westfalen, BW, Hessen, Suedwest -> Rheinland-Pfalz/Saar).
    const NFM = HIST_EXT.ligaNachfolger || {};
    pruefe(Object.keys(NFM).length === 8 && Object.values(NFM).every(n => GAME_DATA.leagues[n]) && !['h4-nord-oberliga', 'h4-nordost-oberliga', 'h4-bayern-oberliga', 'h4-nordrhein-oberliga', 'h3-nord-regionalliga'].some(l => NFM[l]),
        `Liga-Nachfolger: 8 historische Ligen unter 4 heutigen, keine ohne eindeutigen Nachfolger (${Object.keys(NFM).length})`);
    const m7879 = (x.byKey['1978/79|h3-westfalen-oberliga'] || leer).rows.find(r => r.rank === 1);
    const e510 = m7879 && A.ewige['5-10'] && A.ewige['5-10'][m7879.id];
    pruefe(e510 && e510.titles >= 1 && A.ewige['h3-westfalen-oberliga'][m7879.id], `Oberliga Westfalen (5-10): Meister 1978/79 in der Ewigen Tabelle der heutigen Liga und der historischen (${m7879 && m7879.id})`);
    pruefe((x.champs['5-10'] || []).some(c => c.y === '1978/79') && (x.champs['5-1'] || []).some(c => c.y === '1994/95'), 'Meisterliste der heutigen Liga enthaelt die Vorgaenger-Meister (5-10 1978/79, 5-1 1994/95)');
    const doppelJahr = Object.values(NFM).filter((n, i, a) => a.indexOf(n) === i).filter(n => { const ys = recs.filter(r => r.lid === n || NFM[r.lid] === n).map(r => r.y); return new Set(ys).size !== ys.length; });
    pruefe(!doppelJahr.length, `keine Saison doppelt zwischen Vorgaenger und heutiger Liga (${doppelJahr.join(', ') || '-'})`);

    // 5. Speicher-Lesefunktionen mischen die Erweiterung ein (ohne IndexedDB)
    const t = await IDBStore.getSeasonTable('1971/72', 'h3-mittelrhein-verbandsliga');
    pruefe(t && t.rows.length > 10, 'getSeasonTable liefert historische Tabelle');
    const all = await IDBStore.getSeasonAll('1985/86');
    pruefe(all['h3-hessen-oberliga'] && all['h2d-ddrliga-ddrliga'], 'getSeasonAll liefert alle Ligen einer Saison');
    const keys42 = await IDBStore.listSeasonKeys('4-2');
    pruefe(keys42.includes('2008/09') && keys42.includes('2024/25'), `Regionalliga Nord: Saisons 2008/09-2024/25 waehlbar (${keys42.length})`);
    const keys3 = await IDBStore.listSeasonKeys('3');
    pruefe(keys3.includes('2008/09') && keys3.includes('2024/25'), `3. Liga: Saisons 2008/09-2024/25 waehlbar (${keys3.length})`);
    const ch = await IDBStore.getChampions('h2d-ddrliga-ddrliga');
    const ch7172 = ch.filter(c => c.y === '1971/72').length;
    pruefe(ch7172 === 5, `DDR-Liga 1971/72: fuenf Staffelsieger (${ch7172})`);
    const sa = await IDBStore.getTeamSeasons('scherford_1261', ['h3-westfalen-verbandsliga', 'h3-westfalen-oberliga']);
    pruefe(sa.length >= 5, `SC Herford: Saisons in Westfalen gefunden (${sa.length})`);
    const vl = await IDBStore.getTeamVerlauf('scherford_1261', ['h3-westfalen-verbandsliga']);
    const staffel = vl.sizes['h3-westfalen-verbandsliga'] && vl.sizes['h3-westfalen-verbandsliga']['1975/76'];
    pruefe(staffel >= 16 && staffel <= 18, `Ligaverlauf zaehlt die eigene Staffel, nicht beide (1975/76: ${staffel})`);
    ende();
})().catch(e => { console.error(e); process.exit(2); });

function ende() {
    if (SELBST) {
        console.log(befunde.length ? `\nSelbsttest bestanden: die Sabotage wurde erkannt (${befunde.length} Befund(e)).` : '\nSELBSTTEST FEHLGESCHLAGEN: die Sabotage blieb unbemerkt.');
        process.exit(befunde.length ? 0 : 1);
    }
    console.log(befunde.length ? `\n${befunde.length} Befund(e).` : '\nAlles gruen.');
    process.exit(befunde.length ? 1 : 0);
}
