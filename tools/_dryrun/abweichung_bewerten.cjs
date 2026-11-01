// Quellenabweichungen bewerten (01.11.2026, Nutzer „ja tu das“): tools/hist_quellen_abweichung.json – passt der GEWÄHLTE Wert oder ein
// ABWEICHENDER besser? Drei Prüfsteine, unabhängig von beiden Varianten:
//   Spiele  S+U+N = Spiele laut f-archiv            Punkte  2S+U = Plus- und 2N+U = Minuspunkte (bis 1994/95), 3S+U ab 1995/96
//   Summe   in der Tabelle Summe Siege = Summe Niederlagen (mit genau dieser Variante, alle anderen Zeilen wie im Spiel)
// Klassen: WECHSELN (Alternative besteht, gewählter Wert nicht) · BLEIBT (gewählter besteht, Alternative nicht) · BEIDE (beide bestehen –
// gleiche Punkte, andere Verteilung; Summe entscheidet, sonst offen) · KEINE (keine besteht) · OHNE (Alternative hat kein S/U/N, z. B. f-archiv-Punkte)
//   node tools/_dryrun/abweichung_bewerten.cjs   → tools/_dryrun/abweichung_bewertung.txt
const fs = require('fs'), path = require('path');
const T = path.join(__dirname, '..');
const A = JSON.parse(fs.readFileSync(path.join(T, 'hist_quellen_abweichung.json'), 'utf8')).zeilen;
const SEED = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed_erweiterung.json'), 'utf8')).seasons;
const tab = {}; SEED.forEach(s => { tab[parseInt(s.y) + '|' + s.lid] = s; });
const pruef = (v, r, y) => {
    if (!v || v.s == null) return null;
    const sp = r.sp, p = r.p2 || [], zwei = y < 1995;
    const spOk = sp == null || v.s + v.u + v.n === sp;
    // Punkte: p2 = [plus, minus] (2-Punkte-Ära), sonst p (Punkte der Saison; ab 1995/96 3-Punkte-Regel). Ohne p prüfte die erste Fassung
    // nach 1995 nur die Spiele – Jahn Regensburg A 2003/04 und FC Eilenburg 2007/08 wären falsch umgestellt worden
    const pktOk = p[0] != null ? (zwei ? 2 * v.s + v.u === p[0] && (p[1] == null || 2 * v.n + v.u === p[1]) : 3 * v.s + v.u === p[0])
        : r.p != null ? ((zwei ? 2 : 3) * v.s + v.u === r.p) : true;
    return { spOk, pktOk, ok: spOk && pktOk };
};
const summe = (t, r, v) => {   // Summe Siege - Summe Niederlagen derselben Staffel mit Variante v in Zeile r
    const g = r.g || ''; let d = 0, est = 0;
    for (const q of t.table) { if ((q.g || '') !== g) continue; const w = q === r ? v : q; if (q !== r && q.est) est++; d += (w.s || 0) - (w.n || 0); }
    return { d, est };
};
const out = { WECHSELN: [], BEIDE_SUMME: [], BEIDE_OFFEN: [], BLEIBT: [], KEINE: [], OHNE: [] };
for (const e of A) {
    const y = parseInt(e.saison), t = tab[y + '|' + e.lid]; if (!t) { out.KEINE.push(`${e.saison} ${e.lid} ${e.verein}: Tabelle fehlt`); continue; }
    const r = t.table.find(q => q.rank === e.platz && q.nm === e.verein) || t.table.find(q => q.id === e.id && q.rank === e.platz);
    if (!r) { out.KEINE.push(`${e.saison} ${e.lid} ${e.verein}: Zeile fehlt`); continue; }
    const g = pruef(r, r, y), alts = e.abweichend.filter(a => a.s != null);
    const fmt = v => `${v.s}-${v.u}-${v.n}`, kopf = `${e.saison} ${e.lid.replace(/-bezirksliga|-landesliga|-verbandsliga|-oberliga/, '')} Pl.${e.platz} ${e.verein} (Sp ${r.sp}, Pkt ${(r.p2 || []).join(':')})`;
    if (!alts.length) { out.OHNE.push(`${kopf}: gewählt ${fmt(r)}${g.ok ? ' ✓' : ' ✗'} | ${e.abweichend.map(a => a.quelle + ' ' + (a.grund || '')).join('; ')}`); continue; }
    for (const a of alts) {
        const k = pruef(a, r, y);
        const zeile = `${kopf}: gewählt ${fmt(r)} ${g.ok ? '✓' : '✗'}${r.est ? ' (geschätzt)' : ''} · ${a.quelle} ${fmt(a)} ${k.ok ? '✓' : '✗'}`;
        // Punkte sprechen für die Alternative, die Tabellensumme (S = N) aber für den gewählten Wert → vermutlich Punktabzug (die amtlichen
        // Punkte enthalten ihn, die Spielergebnisse nicht): nicht wechseln (Dresdner SC 2003/04, Viktoria Aschaffenburg 2004/05)
        if (k.ok && !g.ok) { const sg = summe(t, r, r), sa = summe(t, r, a);
            if (!sg.est && sg.d === 0 && sa.d !== 0 && g.spOk) out.BEIDE_OFFEN.push(`${zeile} · Summe S−N: gewählt 0, Alternative ${sa.d} → Punktabzug?`);
            else out.WECHSELN.push(`${zeile} · Summe S−N: gewählt ${sg.d}, Alternative ${sa.d}${sg.est ? ` (${sg.est} Schätzzeilen)` : ''}`); }
        else if (!k.ok && g.ok) out.BLEIBT.push(zeile);
        else if (!k.ok && !g.ok) out.KEINE.push(zeile);
        else {
            const sg = summe(t, r, r), sa = summe(t, r, a);
            const z2 = `${zeile} · Summe S−N: gewählt ${sg.d}, Alternative ${sa.d}${sg.est ? ` (${sg.est} Schätzzeilen in der Staffel)` : ''}`;
            if (!sg.est && sa.d === 0 && sg.d !== 0) out.BEIDE_SUMME.push('→ Alternative: ' + z2);
            else if (!sg.est && sg.d === 0 && sa.d !== 0) out.BEIDE_SUMME.push('→ bleibt: ' + z2);
            else out.BEIDE_OFFEN.push(z2);
        }
    }
}
const txt = Object.entries(out).map(([k, v]) => `== ${k}: ${v.length}\n` + v.join('\n')).join('\n\n') + '\n';
fs.writeFileSync(path.join(__dirname, 'abweichung_bewertung.txt'), txt);
console.log(Object.entries(out).map(([k, v]) => k + ' ' + v.length).join(', '));
