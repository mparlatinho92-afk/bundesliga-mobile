// Historischer DFB-Pokal 1935–2024/25 (app/pokal_hist_data.js, erzeugt von tools/pokal_hist_einbau.mjs): Summen für die Ewige
// Tabelle, Feld einer Saison (Hervorhebung) und die read-only Rundenansicht einer historischen Saison (App.pokalHistY).
Object.assign(App, {

// Name/Wappen/Klickbarkeit eines Vereins aus dem historischen Pokal (neue hist_pk_-Vereine kennt nur POKAL_HIST)
_pokalHistName: function(id) {
    return (Engine.teams[id] || GAME_DATA.teams[id] || {}).name || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id])
        || (typeof HIST_EXT !== 'undefined' && HIST_EXT.vereine && HIST_EXT.vereine[id]) || (POKAL_HIST.namen || {})[id] || id;
},
_pokalHistKlick: function(id) {
    return !!(Engine.teams[id] || GAME_DATA.teams[id] || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id])
        || (typeof HIST_EXT !== 'undefined' && HIST_EXT.vereine && HIST_EXT.vereine[id]));
},
_pokalHistDa: function() { return typeof POKAL_HIST !== 'undefined' && POKAL_HIST.saisons && POKAL_HIST.saisons.length; },
_pokalHistSaison: function(y) { return this._pokalHistDa() ? POKAL_HIST.saisons.find(s => s.y === y) || null : null; },

// Summen je Verein über alle historischen Saisons bis einschließlich bisY (null = alle) – gleiche Felder wie die Ewige Pokaltabelle.
// Unentschieden = Tore gleich (Elfmeterschießen zählt als U), Titel = Sieger des (letzten) Endspiels.
_pokalHistSumme: function(bisY) {
    if (!this._pokalHistDa()) return {};
    const C = this._pokalHistCache = this._pokalHistCache || {};
    const key = bisY || '*';
    if (C[key]) return C[key];
    const P = POKAL_HIST, et = {}, mk = id => et[id] || (et[id] = { wins: 0, seasons: 0, sp: 0, w: 0, d: 0, l: 0 });
    for (const s of P.saisons) {
        const feld = new Set();
        s.r.forEach(r => r.s.forEach(m => {
            const h = P.ids[m[0]], a = P.ids[m[1]], eh = mk(h), ea = mk(a);
            feld.add(h); feld.add(a);
            eh.sp++; ea.sp++;
            if (m[2] === m[3]) { eh.d++; ea.d++; } else if (m[2] > m[3]) { eh.w++; ea.l++; } else { ea.w++; eh.l++; }
        }));
        feld.forEach(id => et[id].seasons++);
        const fin = s.r.find(r => r.n === 'Finale');
        if (fin && fin.s.length) { const m = fin.s[fin.s.length - 1]; if (!(m[4] & 64)) mk(P.ids[m[4] & 32 ? m[1] : m[0]]).wins++; }
        if (bisY && s.y === bisY) break;
    }
    return (C[key] = et);
},
// Feld (alle Vereine mit mindestens einem gezählten Spiel) einer historischen Saison
_pokalHistFeld: function(y) {
    const s = this._pokalHistSaison(y); if (!s) return null;
    const out = new Set(); s.r.forEach(r => r.s.forEach(m => { out.add(POKAL_HIST.ids[m[0]]); out.add(POKAL_HIST.ids[m[1]]); }));
    return out;
},

// Klick auf eine historische Saison (Siegerliste): Rundenansicht, Reiter = Finale
_pokalHistGo: function(y) {
    const s = this._pokalHistSaison(y); if (!s) return;
    this.pokalHistY = y; this.viewHistoryOffset = null; this.viewArchivedSeason = null;
    this.pokalTab = s.r.length - 1;
    this.showPokal();
    if (this.updateStatus) this.updateStatus();
},
_pokalHistNav: function(dir) {
    const S = POKAL_HIST.saisons, i = S.findIndex(s => s.y === this.pokalHistY), j = i + dir;
    if (j < 0) return;
    if (j >= S.length) { this._pokalHistZu(); return; }             // nach 2024/25 kommt die laufende Saison
    const keepTab = this.pokalTab < 0 ? this.pokalTab : null;
    this._pokalHistGo(S[j].y);
    if (keepTab !== null) { this.pokalTab = keepTab; this.showPokal(); }
},
_pokalHistZu: function() { this.pokalHistY = null; if (this.pokalTab >= 0) this.pokalTab = -3; this.showPokal(); },

// Kopfleiste der historischen Saison: ◀ Saison ▶ + zurück zur laufenden
_pokalHistLeiste: function() {
    const S = POKAL_HIST.saisons, i = S.findIndex(s => s.y === this.pokalHistY);
    const db = dis => dis ? ' disabled style="opacity:0.35;cursor:default;padding:3px 10px;"' : ' style="padding:3px 10px;"';
    return `<div class="pk-hist-leiste" style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;">
        <button class="btn" onclick="App._pokalHistNav(-1)"${db(i <= 0)}>◀</button>
        <span style="flex:1;text-align:center;font-weight:bold;opacity:0.85;white-space:nowrap">${/^19[34]/.test(this.pokalHistY) ? 'Tschammerpokal' : 'DFB-Pokal'} ${this.pokalHistY} <span style="font-weight:normal;color:var(--muted)">(Archiv)</span></span>
        <button class="btn" onclick="App._pokalHistNav(1)" style="padding:3px 10px;">▶</button>
        <button class="btn" onclick="App._pokalHistZu()" style="padding:3px 10px;font-size:12px;white-space:nowrap">Laufende Saison</button>
    </div>`;
},

// Eine Runde einer historischen Saison (read-only): Heim – Ergebnis – Gast, Sieger fett, n.V./i.E./Wiederholung/Hin/Rück
_pokalHistRunde: function(ri) {
    const s = this._pokalHistSaison(this.pokalHistY), r = s && s.r[ri];
    if (!r) return '<div style="padding:20px;opacity:0.5;">Keine Daten.</div>';
    const P = POKAL_HIST;
    const team = (id, cls) => {
        const t = Engine.teams[id] || GAME_DATA.teams[id], img = t && t.thumb ? `<img src="${t.thumb}" width="18" height="18" loading="lazy" style="object-fit:contain;vertical-align:middle;margin-right:4px;flex-shrink:0;">` : '';
        const n = this._pokalHistName(id);
        return `<div class="pm-team ${cls}">${img}${this._pokalHistKlick(id) ? `<span onclick="App.showSteckbrief('${id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${n}</span>` : `<span>${n}</span>`}</div>`;
    };
    let out = `<div class="pm-status">${r.n} · ${r.s.length} ${r.s.length === 1 ? 'Spiel' : 'Spiele'}</div><div class="pokal-matches"><div class="pm-header"><span class="pm-home">Heim</span><span class="pm-score"></span><span class="pm-away">Auswärts</span></div>`;
    r.s.forEach(m => {
        const f = m[4], offen = f & 64, gast = f & 32;
        const hC = offen ? '' : gast ? 'loser' : 'winner', aC = offen ? '' : gast ? 'winner' : 'loser';
        const note = [f & 4 ? 'Wdh.' : '', f & 8 ? 'Hinspiel' : '', f & 16 ? 'Rückspiel' : '', f & 2 && m[5] ? `${m[5][0]}:${m[5][1]} i.E.` : (f & 1 ? 'n.V.' : '')].filter(Boolean).join(' · ');
        out += `<div class="pokal-match">${team(P.ids[m[0]], 'pm-home ' + hC)}<div class="pm-score">${m[2]} : ${m[3]}${note ? `<div style="font-size:9px;font-weight:normal;color:var(--muted);">${note}</div>` : ''}</div>${team(P.ids[m[1]], 'pm-away ' + aC)}</div>`;
    });
    return out + '</div>';
},

// Pokalrekorde aus den historischen Spielen (Nutzer 28.10.2026), einmal gerechnet und beim Anzeigen mit den Sim-Rekorden
// gemischt (_pokalRekMisch) – der Spielstand bleibt unberührt. Slots und Stichentscheid wie Engine._recordPokalSeason:
// P = {hs, mg, gfS, pen, tRow}, t[id] = {chs, chn, cmg, cupH}. cupH = [Abstand zum Titel (0 = Sieger), Saison, Rundenname],
// weil die Rundenzahl über die Epochen wechselt. Überraschung/tiefstklassiger Finalist fehlen: keine Ligaebenen je Saison.
_pokalHistRek: function() {
    if (this._phRek || !this._pokalHistDa()) return this._phRek || null;
    const P = {}, t = {}, ids = POKAL_HIST.ids, T = id => t[id] || (t[id] = {});
    const max = (o, k, v, b) => { const c = o[k]; if (!c || v > c[0]) o[k] = [v].concat(b); };
    const max2 = (o, k, v, v2, b) => { const c = o[k]; if (!c || v > c[0] || (v === c[0] && v2 > c[1])) o[k] = [v, v2].concat(b); };
    const seite = (id, opp, gf, ga, y) => {
        const o = T(id);
        if (gf > ga) max2(o, 'chs', gf - ga, gf, [ga, y, opp, 'p']);
        if (ga > gf) max2(o, 'chn', ga - gf, ga, [gf, y, opp, 'p']);
        max2(o, 'cmg', gf + ga, gf, [ga, y, opp, 'p']);
    };
    let serie = null;
    POKAL_HIST.saisons.forEach(s => {
        const reach = {}, n = s.r.length;
        let tore = 0, elfer = 0;
        s.r.forEach((r, ri) => r.s.forEach(m => {
            const h = ids[m[0]], a = ids[m[1]], hg = m[2], ag = m[3], hoch = Math.max(hg, ag), tief = Math.min(hg, ag);
            reach[h] = ri; reach[a] = ri;
            tore += hg + ag; if (m[4] & 2) elfer++;
            seite(h, a, hg, ag, s.y); seite(a, h, ag, hg, s.y);
            if (hg !== ag) max2(P, 'hs', hoch - tief, hoch, [tief, s.y, hg > ag ? h : a, hg > ag ? a : h]);
            const cm = P.mg;
            if (!cm || hg + ag > cm[0] || (hg + ag === cm[0] && hoch > Math.max(cm[1], cm[2]))) P.mg = [hg + ag, hg, ag, s.y, h, a];
        }));
        const fin = s.r[n - 1], fm = fin && fin.s[fin.s.length - 1];
        if (fm && fin.n === 'Finale' && !(fm[4] & 64)) {
            const sg = ids[fm[4] & 32 ? fm[1] : fm[0]];
            reach[sg] = n;
            serie = serie && serie[0] === sg ? [sg, serie[1] + 1] : [sg, 1];   // Titel in Folge (sonst erst nach dem 1. Saisonwechsel)
            max(P, 'tRow', serie[1], [s.y, sg]);
        }
        for (const id in reach) {
            const d = n - reach[id], o = T(id);
            if (!o.cupH || d < o.cupH[0]) o.cupH = [d, s.y, d ? s.r[reach[id]].n : ''];
        }
        if (tore) max(P, 'gfS', tore, [s.y]);
        if (elfer) max(P, 'pen', elfer, [s.y]);
    });
    return (this._phRek = { P, t });
},

// Sim-Rekord gegen historischen: die Simulation gewinnt nur mit einem ECHT besseren Wert, bei Gleichstand bleibt der ältere.
// art: 1 = nur Wert, 2 = Wert + Stichentscheid [1], 'mg' = Tore + höheres Einzelergebnis
_pokalRekMisch: function(sim, hist, art) {
    if (!sim) return hist || null;
    if (!hist) return sim;
    if (sim[0] !== hist[0]) return sim[0] > hist[0] ? sim : hist;
    if (art === 2) return sim[1] > hist[1] ? sim : hist;
    if (art === 'mg') return Math.max(sim[1], sim[2]) > Math.max(hist[1], hist[2]) ? sim : hist;
    return hist;
},
});
