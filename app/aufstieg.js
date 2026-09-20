// ── AUFSTIEGSRUNDEN ──────────────────────────────────────────────────────────
// Eigener Wettbewerbs-Einstieg neben DFB-Pokal und Amateurpokal (activeLeague '__aufstieg__'), Daten aus
// AUFSTIEG_SEED (app/aufstieg_data.js). Reiter: je Ziel-Liga eine Chronik + Bilanz.
//
// WARUM EIGENER EINSTIEG statt einer Liga-Ansicht (Nutzerentscheidung 20.09.2026): eine Aufstiegsrunde ist keine
// Liga-Saison. In ihren Gruppen stehen Vereine aus verschiedenen Ligen nebeneinander, und wer dort scheiterte,
// hätte in einer Ewigen Tabelle einen Eintrag für sein Scheitern. Deshalb fließt hier nichts in `ewige`.
//
// Markup bewusst aus den bestehenden Ansichten: .pokal-tabs für die Reiter, .ltab für die Gruppentabellen,
// .statcols für Chronik + Seitenspalte – damit gilt die Mobil-Anpassung aus template.html unverändert mit.
Object.assign(App, {

// Ziel-Liga → Beschriftung des Reiters
_AUF_ZIELE: [['1', '1. Bundesliga'], ['2', '2. Bundesliga'], ['3', '3. Liga']],

showAufstieg: function() {
    this.activeLeague = '__aufstieg__';
    this.viewArchivedSeason = null;
    this.viewHistoryOffset = null;
    try { localStorage.setItem('ba_lastLeague', '__aufstieg__'); } catch (e) {}
    this.renderSidebar();
    const t = document.getElementById('league-title');
    if (t) t.innerHTML = '<span class="lt-name">⬆ Aufstiegsrunden</span>';
    if (this.aufTab == null) this.aufTab = '1';

    const btn = (v, label) => `<button onclick="App.switchAufstiegTab('${v}')" class="pokal-tab-btn${this.aufTab === v ? ' active' : ''}">${label}</button>`;
    const tabs = `<div class="pokal-tabs">${this._AUF_ZIELE.map(([z, n]) => btn(z, n)).join('')}${btn('bilanz', '📊 Bilanz')}</div>`;
    const el = document.getElementById('content');
    if (!el) return;
    if (typeof AUFSTIEG_SEED === 'undefined') {
        el.innerHTML = tabs + '<div style="padding:20px;opacity:0.5;">Keine Aufstiegsrunden-Daten geladen.</div>';
        return;
    }
    el.innerHTML = tabs + (this.aufTab === 'bilanz' ? this._renderAufstiegBilanz() : this._renderAufstiegChronik(this.aufTab));
    this._applyScroll();
},

switchAufstiegTab: function(v) { this.aufTab = v; this.showAufstieg(); },

// Anzeigename eines Teilnehmers: era-echt (Vereine hießen damals anders), sonst heutiger Name,
// sonst historischer Verein, sonst der Name aus AUFSTIEG_SEED.vereine (nur dort geführte Vereine)
_aufName: function(id, y) {
    // _histClubName erwartet den Saison-STRING ("1965/66"), nicht das Startjahr
    const sy = typeof y === 'number' ? this._aufSaison(y) : y;
    return (this._histClubName && sy && this._histClubName(id, sy))
        || (Engine.teams[id] || GAME_DATA.teams[id] || {}).name
        || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[id])
        || ((AUFSTIEG_SEED.vereine || {})[id]) || id;
},
_aufSaison: function(y) { return y === 1999 ? '1999/2000' : y + '/' + String(y + 1).slice(-2); },
_aufChip: function(id, y, extra) {
    const th = (Engine.teams[id] || GAME_DATA.teams[id] || {}).thumb;
    return `<span onclick="App.showSteckbrief('${id}')" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;min-width:0;max-width:100%"`
        + ` onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">`
        + (th ? `<img src="${th}" width="16" height="16" style="object-fit:contain;flex-shrink:0">` : '')
        + `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this._aufName(id, y)}</span>`
        + (extra || '') + '</span>';
},

// AUFSTIEGSPLAN der Regionalligen: welcher Staffelmeister steigt direkt auf, welche muessen in die
// Relegation? Die Regel rotiert im Dreijahreszyklus (Engine.getPromotionInfo) – West und Suedwest immer
// direkt, Nord/Nordost/Bayern im Wechsel. Gerechnet wird mit DERSELBEN Funktion wie die Simulation,
// sonst zeigt der Plan etwas anderes an als das Spiel dann tut.
_renderAufstiegPlan: function() {
    if (typeof Engine === 'undefined' || typeof Engine.getPromotionInfo !== 'function') return '';
    const off = Engine.currentSeasonOffset || 0;
    const von = Math.max(0, off - 3), bis = off + 5;
    const kurz = n => n.replace('Regionalliga ', '');
    let zeilen = '';
    for (let o = von; o <= bis; o++) {
        const i = Engine.getPromotionInfo(o);
        const s = Engine.getFormattedSeason(o);
        const jetzt = o === off;
        zeilen += `<tr${jetzt ? ' style="background:rgba(103,58,183,0.18)"' : ''}>`
            + `<td style="white-space:nowrap;${jetzt ? 'font-weight:bold' : ''}">${s}${jetzt ? ' <span style="font-size:10px;opacity:0.7">läuft</span>' : ''}</td>`
            + `<td style="color:#4caf50">${i.direct.map(kurz).join(', ')}</td>`
            + `<td style="color:#ff9800">${i.playoff.map(kurz).join(' vs ')}</td></tr>`;
    }
    return `<div style="padding:12px 15px;border-bottom:1px solid var(--border);">`
        + `<div style="font-weight:bold;margin-bottom:2px;">Aufstiegsplan der Regionalligen</div>`
        + `<div style="font-size:11px;opacity:0.55;margin-bottom:6px;">West und Südwest steigen immer direkt auf. `
        + `Nord, Nordost und Bayern wechseln sich ab: einer direkt, die beiden anderen spielen die Relegation gegeneinander.</div>`
        + `<table class="ltab" style="width:100%"><thead><tr>`
        + `<th style="width:86px">Saison</th><th>direkt auf</th><th>Relegation</th>`
        + `</tr></thead><tbody>${zeilen}</tbody></table></div>`;
},

// Gespielte Saisons des laufenden Spielstands – dieselbe Ansicht wie die Historie, damit nicht nur
// Vergangenes hier steht. Quelle ist archive.relegation (die Engine schreibt dort jede Entscheidung).
_gespielteRunden: function(ziel) {
    const A = (typeof Engine !== 'undefined' && Engine.archive) || {};
    const letztes = this._aufLetztesSeedJahr();
    const zielVon = m => /^1\.BL\/2\.BL/.test(m) ? '1' : /^2\.BL\/3\.L/.test(m) ? '2' : /^Aufstieg 3\.L/.test(m) ? '3' : null;
    return (A.relegation || []).map(r => {
        const y = parseInt(r.y) || 0;
        if (y <= letztes) return null;                       // Historie kommt aus AUFSTIEG_SEED
        const eig = (r.results || []).filter(e => !e.aufstieg && zielVon(e.match || '') === ziel);
        const direkt = ziel === '3' ? (r.results || []).filter(e => /Direktaufstieg/.test(e.result || '')) : [];
        if (!eig.length && !direkt.length) return null;
        return { y, du: eig.map(e => ({ h: e.hId, a: e.aId, g: e.result, w: e.winnerId === e.hId ? 1 : 0 })),
            di: direkt.map(e => e.winnerId).filter(Boolean), gespielt: 1 };
    }).filter(Boolean).sort((a, b) => b.y - a.y);
},
_aufLetztesSeedJahr: function() {
    if (this._aufSeedMax == null) this._aufSeedMax = (AUFSTIEG_SEED.runden || []).reduce((a, r) => Math.max(a, r.y), 0);
    return this._aufSeedMax;
},

// Chronik einer Ziel-Liga: Runden von neu nach alt, je Runde Gruppen, Duelle, Direktaufsteiger
_renderAufstiegChronik: function(ziel) {
    const hist = (AUFSTIEG_SEED.runden || []).filter(r => r.ziel === ziel);
    const runden = this._gespielteRunden(ziel).concat(hist.sort((a, b) => b.y - a.y));
    if (!runden.length) return '<div style="padding:20px;opacity:0.5;">Keine Runden erfasst.</div>';
    const zn = (this._AUF_ZIELE.find(z => z[0] === ziel) || [, ziel])[1];
    const gesp = runden.filter(r => r.gespielt).length;
    const kopf = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);">`
        + `<span style="opacity:0.5;font-size:12px;">${runden.length} Saisons · Aufstieg in die ${zn}`
        + (gesp ? ` · <span style="color:#4caf50">${gesp} davon gespielt</span>` : '') + `</span></div>`;
    // Der Aufstiegsplan gehoert zur 3. Liga: dort entscheidet die Rotation, wer direkt aufsteigt
    const plan = ziel === '3' ? this._renderAufstiegPlan() : '';

    const body = runden.map(r => {
        const y = r.y;
        let inner = '';
        // Gruppen: eine Tabelle je Gruppe. Aufsteiger grün hinterlegt wie in der Liga-Tabelle.
        (r.gr || []).forEach((g, gi) => {
            const zeilen = g.map(z => {
                const pkt = 2 * z.s + z.u;   // 2-Punkte-Ära bis 1995; die Runden liegen fast alle davor
                return `<tr${z.a ? ' style="background:rgba(76,175,80,0.14)"' : ''}>`
                    + `<td style="text-align:center;opacity:0.6">${z.r}</td>`
                    + `<td>${this._aufChip(z.i, y)}</td>`
                    + `<td style="text-align:center">${z.s + z.u + z.n}</td>`
                    + `<td style="text-align:center">${z.s}</td><td style="text-align:center">${z.u}</td><td style="text-align:center">${z.n}</td>`
                    + `<td style="text-align:center;white-space:nowrap">${z.gf}:${z.ga}</td>`
                    + `<td style="text-align:center;font-weight:bold">${y < 1995 ? pkt + ':' + ((z.s + z.u + z.n) * 2 - pkt) : 3 * z.s + z.u}</td>`
                    + `<td style="font-size:11px;color:#4caf50">${z.a ? '▲' : ''}</td></tr>`;
            }).join('');
            inner += `<div style="font-size:11px;opacity:0.55;margin:10px 0 4px 2px;">${(r.gr.length > 1 ? 'Gruppe ' + (gi + 1) : 'Gruppenphase')}</div>`
                + `<table class="ltab" style="width:100%"><thead><tr>`
                + `<th style="width:28px">Pl.</th><th>Mannschaft</th><th style="width:30px">Sp</th>`
                + `<th style="width:26px">S</th><th style="width:26px">U</th><th style="width:26px">N</th>`
                + `<th style="width:56px">Tore</th><th style="width:48px">Pkt</th><th style="width:22px"></th>`
                + `</tr></thead><tbody>${zeilen}</tbody></table>`;
        });
        // K.-o.-Duelle. Stehen sie neben einer Gruppenphase, sind es Entscheidungsspiele und brauchen eine
        // eigene Zeile – sonst liest man sie als Teil der letzten Gruppentabelle.
        if ((r.du || []).length && (r.gr || []).length)
            inner += `<div style="font-size:11px;opacity:0.55;margin:10px 0 4px 2px;">Entscheidungsspiel${r.du.length > 1 ? 'e' : ''}</div>`;
        (r.du || []).forEach(d => {
            const erg = d.g || [d.hi, d.re].filter(Boolean).join(', ');
            const det = d.g && (d.hi || d.re) ? ` <span style="opacity:0.45;font-size:11px">(${[d.hi, d.re].filter(Boolean).join(', ')})</span>` : '';
            inner += `<div style="display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid var(--border);font-size:13px;">`
                + `<span style="flex:1;min-width:0;overflow:hidden;${d.w ? 'font-weight:bold' : ''}">${this._aufChip(d.h, y)}</span>`
                + `<span style="opacity:0.35;flex-shrink:0">vs</span>`
                + `<span style="flex:1;min-width:0;overflow:hidden;${d.w ? '' : 'font-weight:bold'}">${this._aufChip(d.a, y)}</span>`
                + `<span style="flex-shrink:0;white-space:nowrap;text-align:right">${erg}${det}</span></div>`;
        });
        // Einzelspiele (ab 2008 im Aufstieg zur 2. Bundesliga)
        (r.sp || []).forEach(d => {
            inner += `<div style="display:flex;align-items:center;gap:8px;padding:5px 2px;border-bottom:1px solid var(--border);font-size:13px;">`
                + `<span style="flex:1;min-width:0;overflow:hidden;${d.w ? 'font-weight:bold' : ''}">${this._aufChip(d.h, y)}</span>`
                + `<span style="opacity:0.35;flex-shrink:0">vs</span>`
                + `<span style="flex:1;min-width:0;overflow:hidden;${d.w ? '' : 'font-weight:bold'}">${this._aufChip(d.a, y)}</span>`
                + `<span style="flex-shrink:0;white-space:nowrap;text-align:right">${d.e || ''}</span></div>`;
        });
        // Direktaufsteiger – Kontext, keine Teilnahme an der Runde (zählen deshalb nicht in die Bilanz)
        if (r.di && r.di.length) {
            inner += `<div style="margin-top:8px;font-size:12px;display:flex;flex-wrap:wrap;gap:4px 14px;align-items:center;">`
                + `<span style="opacity:0.45;font-size:11px;">Direkt aufgestiegen:</span>`
                + r.di.map(id => this._aufChip(id, y)).join('') + '</div>';
        }
        return `<div style="padding:12px 15px;border-bottom:1px solid var(--border);">`
            + `<div style="font-weight:bold;margin-bottom:2px;">${this._aufSaison(y)}`
            + (r.gespielt ? ' <span style="font-size:10px;color:#4caf50;font-weight:normal">gespielt</span>' : '')
            + `</div>${inner}</div>`;
    }).join('');

    return kopf + plan + body + this._histQuelleAufstieg();
},

_histQuelleAufstieg: function() {
    return '<div style="padding:10px 15px;font-size:11px;opacity:0.4;">Quelle: Wikipedia („Aufstieg zur Fußball-Bundesliga“, '
        + '„Aufstieg zur 2. Fußball-Bundesliga“, „Aufstieg zur 3. Fußball-Liga“)</div>';
},

// Bilanz: Teilnahmen und Erfolge je Verein – die eigene Statistik-Sparte, KEINE ewige Tabelle
_renderAufstiegBilanz: function() {
    const st = (Engine.archive && Engine.archive.aufstieg) || {};
    const rows = Object.entries(st).map(([id, v]) => ({ id, t: v.t, s: v.s }))
        .sort((a, b) => b.t - a.t || b.s - a.s || this._aufName(a.id).localeCompare(this._aufName(b.id)));
    if (!rows.length) return '<div style="padding:20px;opacity:0.5;">Noch keine Bilanz gefaltet.</div>';
    const ges = rows.reduce((a, r) => a + r.t, 0);
    const kopf = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);">`
        + `<span style="opacity:0.5;font-size:12px;">${rows.length} Vereine · ${ges} Teilnahmen</span></div>`;
    const body = rows.map((r, i) => `<tr>`
        + `<td style="text-align:center;opacity:0.5">${i + 1}</td>`
        + `<td>${this._aufChip(r.id)}</td>`
        + `<td style="text-align:center;font-weight:bold">${r.t}</td>`
        + `<td style="text-align:center;color:#4caf50">${r.s}</td>`
        + `<td style="text-align:center;opacity:0.6">${r.t - r.s}</td></tr>`).join('');
    return kopf + `<table class="ltab" style="width:100%"><thead><tr>`
        + `<th style="width:34px">#</th><th>Verein</th><th style="width:62px">Runden</th>`
        + `<th style="width:56px" title="Aufstieg geschafft / Duell gewonnen">Erfolg</th>`
        + `<th style="width:56px" title="in der Runde gescheitert">daneben</th></tr></thead><tbody>${body}</tbody></table>`
        + `<div style="padding:10px 15px;font-size:11px;opacity:0.45;">Gezählt wird die Teilnahme an einer Aufstiegsrunde oder `
        + `einem Entscheidungsspiel – je Saison einmal, auch wer Gruppe und Duell bestritt. Direktaufsteiger stehen `
        + `hier nicht: sie mussten nicht durch die Runde. Diese Zahlen fließen in keine Ewige Tabelle.</div>`;
},

});
