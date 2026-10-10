// EINBAU: Spielrekorde aus historischen Einzelspielen OFFLINE vorrechnen -> app/einzelspiele_data.js
//
//   node tools/einzelspiele_einbau.cjs            (Quellen und Zuordnung wie tools/einzelspiele_dryrun.cjs)
//
// Die App bekommt nicht die ~190.000 Spiele, sondern nur das Ergebnis in den Slot-Formaten von Engine._recordSeason:
//   t[id]  hs [diff, tore, gegentore, y, gegner]   hn [diff, gegentore, tore, y, gegner]   mg [summe, tore, gegentore, y, gegner]
//   l[lid] hs [diff, hoch, tief, y, sieger, verlierer]   – nur Spiel-Ligen (rein historische haben keine Rekordansicht)
//   cov[lid] {v: [[von,bis],…], t: [[von,bis],…]}   Startjahre der Saisons mit gegengeprüften Einzelspielen
//            v = jede Staffel der Saison vollständig und ohne Abweichung, t = nur ein Teil
//
// EIN SPIEL ZÄHLT NUR, WENN BEIDE VEREINE DIE GEGENPROBE BESTEHEN: ihre aus den Spielen nachgerechneten Tore,
// Gegentore und Spiele treffen die Abschlusstabelle des Spiels. Die Wikipedia-Daten tragen keine Sonderwertung –
// eine Wertung am Grünen Tisch ist nur an dieser Abweichung zu erkennen und darf kein "höchster Sieg" werden.
// Gleichstand: das FRÜHERE Spiel, wie _recMax2 bei chronologischer Messung.
const fs = require('fs');
const path = require('path');
const { zuordnungen, levelOf } = require('./einzelspiele_dryrun.cjs');
const ROOT = path.join(__dirname, '..') + path.sep;

const yr = y => parseInt(y) || 0;
const besser = (c, v, v2, y) => !c || v > c[0] || (v === c[0] && (v2 > c[1] || (v2 === c[1] && yr(y) < yr(c[3]))));
const t = {}, l = {}, saisons = {};       // saisons[lid][y] = {staffeln, sauber}
let spieleGenutzt = 0, spieleVerworfen = 0, staffeln = 0;

(async () => {
    await zuordnungen({}, (q, st, r) => {
        if (!r.t) return;
        staffeln++;
        const lid = r.t.lid, y = st.y;
        const verd = new Set(r.abwTore.concat(r.vereine.filter(v => !r.zu[v])));
        const s = ((saisons[lid] = saisons[lid] || {})[y] = saisons[lid][y] || { staffeln: new Set(), sauber: new Set(), genutzt: 0 });
        s.staffeln.add(r.t.key);
        if (!verd.size && st.spiele.length === r.vereine.length * (r.vereine.length - 1)) s.sauber.add(r.t.key);
        const spielLiga = !!GAME_DATA.leagues[lid];
        st.spiele.forEach(([h, a, th, tg]) => {
            if (verd.has(h) || verd.has(a)) { spieleVerworfen++; return; }
            spieleGenutzt++; s.genutzt++;
            const H = r.zu[h], A = r.zu[a];
            const seite = (id, opp, gf, ga) => {
                const o = t[id] || (t[id] = {});
                if (gf > ga && besser(o.hs, gf - ga, gf, y)) o.hs = [gf - ga, gf, ga, y, opp];
                if (ga > gf && besser(o.hn, ga - gf, ga, y)) o.hn = [ga - gf, ga, gf, y, opp];
                if (besser(o.mg, gf + ga, gf, y)) o.mg = [gf + ga, gf, ga, y, opp];
            };
            seite(H, A, th, tg); seite(A, H, tg, th);
            if (spielLiga && th !== tg) {
                const hoch = Math.max(th, tg), tief = Math.min(th, tg), L = l[lid] || (l[lid] = {});
                if (besser(L.hs, hoch - tief, hoch, y)) L.hs = [hoch - tief, hoch, tief, y, th > tg ? H : A, th > tg ? A : H];
            }
        });
    });

    // Abdeckung je Liga: alle Staffeln der Saison sauber = v, sonst t (sofern überhaupt Spiele genutzt wurden).
    // Die Zahl der Staffeln, die das Spiel für diese Saison hat, steht in den Tabellen – nicht jede hat eine Quelle.
    const staffelnImSpiel = {};
    HISTORY_SEED.seasons.forEach(s => { const g = new Set(s.table.map(r => r.g || '')); staffelnImSpiel[s.y + '|' + s.lid] = g.size; });
    Object.values(HistExt.loaded().byKey).forEach(r => { const k = r.y + '|' + r.lid; if (!staffelnImSpiel[k]) staffelnImSpiel[k] = new Set(r.rows.map(z => z.g || '')).size; });
    const bereiche = js => {
        const out = []; js.map(yr).sort((a, b) => a - b).forEach(j => { const b = out[out.length - 1]; if (b && j === b[1] + 1) b[1] = j; else out.push([j, j]); });
        return out;
    };
    const cov = {};
    for (const lid in saisons) {
        const v = [], tw = [];
        for (const y in saisons[lid]) {
            const s = saisons[lid][y];
            if (s.sauber.size && s.sauber.size >= (staffelnImSpiel[y + '|' + lid] || 1)) v.push(y);
            else if (s.genutzt) tw.push(y);
        }
        if (v.length || tw.length) cov[lid] = { v: bereiche(v), t: bereiche(tw) };
    }

    const daten = { v: '', t, l, cov };
    const json = JSON.stringify(daten);
    daten.v = require('crypto').createHash('sha1').update(json).digest('hex').slice(0, 10);
    const nT = Object.keys(t).length, nL = Object.keys(l).length;
    const kopf = `// ERZEUGT von tools/einzelspiele_einbau.cjs – nicht von Hand ändern.
// Spielrekorde (höchster Sieg / höchste Niederlage / torreichstes Spiel) aus historischen Einzelspielen VOR dem Sim-Start:
// Wikipedia-Kreuztabellen 1963/64–2002/03, openfootball ab 2010/11, fussball.de (Oberligen/Regionalligen ab 2001/02).
// ${spieleGenutzt} Spiele aus ${staffeln} Staffeln gegengeprüft genutzt, ${spieleVerworfen} verworfen (Verein bestand die Gegenprobe
// gegen die Abschlusstabelle nicht). ${nT} Vereine, ${nL} Spiel-Ligen. Gemischt wird in Engine._recordEinzelspiele.
// KEINE Serien: Kreuztabellen kennen keine Spieltagsreihenfolge.
`;
    fs.writeFileSync(ROOT + 'app/einzelspiele_data.js', kopf + 'const EINZELSPIELE_SEED = ' + JSON.stringify(daten) + ';\n');
    console.log(`app/einzelspiele_data.js: ${(fs.statSync(ROOT + 'app/einzelspiele_data.js').size / 1024).toFixed(0)} kB · Version ${daten.v}`);
    console.log(`Spiele genutzt ${spieleGenutzt}, verworfen ${spieleVerworfen} · Staffeln ${staffeln} · Vereine ${nT} · Spiel-Ligen ${nL}`);
    const fmt = c => c ? c.map(([a, b]) => a === b ? a : a + '–' + b).join(', ') : '';
    ['1', '2', '3'].forEach(lid => console.log(`  Liga ${lid}: vollständig ${fmt(cov[lid] && cov[lid].v)} | teilweise ${fmt(cov[lid] && cov[lid].t)} | hs ${JSON.stringify(l[lid] && l[lid].hs)}`));
})();
