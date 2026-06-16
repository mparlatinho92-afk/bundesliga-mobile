Object.assign(App, {
loadLeague: function(lid) {
    if (this.activeLeague !== lid) this.ewigeSeasonIdx = null;
    this.activeLeague = lid;
    localStorage.setItem('ba_lastLeague', lid);
    this.renderSidebar();
    const l = Engine.leagues[lid];
    const logo = leagueLogo(lid);
    document.getElementById('league-title').innerHTML = (logo ? `<img src="${logo}">` : '') + l.name;

    // Testspiel-Pseudo-Spieltag: zeigt Paarungen statt Tabelle
    if (this.tsView) { document.getElementById('content').innerHTML = this._renderLeagueFriendlies(lid, this.tsView); return; }

    let teamData = Engine.teams;
    let histBadgeMap = null;
    if (this.viewHistoryOffset !== null && Engine.history[this.viewHistoryOffset]) {
        teamData = Engine.history[this.viewHistoryOffset].teams;
        const hIdx  = this.viewHistoryOffset;
        const hSnap = Engine.history[hIdx];
        const nextT = (Engine.history[hIdx + 1] || {}).teams || Engine.teams;
        const pokalW = (hSnap.pokal && hSnap.pokal.winner) || null;
        histBadgeMap = {};
        Object.entries(hSnap.teams).forEach(([id, ht]) => {
            const nt = nextT[id];
            const curLvl = (Engine.leagues[ht.leagueId] || {}).level;
            const b = [];
            if (nt && nt.leagueId !== ht.leagueId) {
                const nxtLvl = (Engine.leagues[nt.leagueId] || {}).level;
                if (nxtLvl != null && curLvl != null) {
                    if (nxtLvl < curLvl) b.push('N');
                    else if (nxtLvl > curLvl) b.push('A');
                }
            } else {
                if      (ht.rank === 1) b.push('M');
                else if (ht.rank === 2) b.push('V');
                else if (curLvl <= 2 && ht.rank === 16) b.push('R');
            }
            if (pokalW && pokalW === id) b.push('P');
            histBadgeMap[id] = b.length ? b : null;
        });
    }

    // id aus dem Key rekonstruieren: alte History-Snapshots (vor v0.4.4) speicherten kein t.id
    // → ohne das wären Steckbrief-Link, Wappen-Fallback und Badges in Archiv-Saisons kaputt
    const teams = Object.entries(teamData)
        .map(([id, t]) => (t.id ? t : { ...t, id }))
        .filter(t => t.leagueId === lid);

    const mdHist = this.viewHistoryOffset !== null
        ? (Engine.history[this.viewHistoryOffset]?.matchdayHistory || [])
        : Engine.matchdayHistory;

    // Reconstruct standings by cumulating results from mdHist[0..matchdayViewIdx]
    let reconstructed = null;
    if (this.matchdayViewIdx !== null) {
        const applyR = (s, gf, ga) => { s.p++; s.gf+=gf; s.ga+=ga; if(gf>ga){s.w++;s.pts+=3;}else if(gf<ga)s.l++;else{s.d++;s.pts++;} };
        const map = {};
        for (let i = 0; i <= this.matchdayViewIdx && i < mdHist.length; i++) {
            (mdHist[i]?.results||[]).filter(r => r.leagueId === lid).forEach(r => {
                const mk = n => { if(!map[n]) map[n] = { stats:{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}, homeStats:{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}, awayStats:{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0} }; };
                mk(r.home); mk(r.away);
                applyR(map[r.home].stats, r.score1, r.score2);
                applyR(map[r.home].homeStats, r.score1, r.score2);
                applyR(map[r.away].stats, r.score2, r.score1);
                applyR(map[r.away].awayStats, r.score2, r.score1);
            });
        }
        if (teams.some(t => map[t.name])) {
            reconstructed = map;
            teams.sort((a,b) => {
                const sa = reconstructed[a.name]?.stats||{pts:0,gf:0,ga:0};
                const sb = reconstructed[b.name]?.stats||{pts:0,gf:0,ga:0};
                return sb.pts-sa.pts || (sb.gf-sb.ga)-(sa.gf-sa.ga) || sb.gf-sa.gf;
            });
        } else {
            teams.sort((a,b) => (a.rank||99) - (b.rank||99) || (b.strength||0) - (a.strength||0));
        }
    } else {
        teams.sort((a,b) => (a.rank||99) - (b.rank||99) || (b.strength||0) - (a.strength||0));
    }

    // Helper: get the right stats object for a team
    const getS = (t, view) => {
        const r = reconstructed?.[t.name];
        if (r) return view==='heim' ? r.homeStats : view==='auswaerts' ? r.awayStats : r.stats;
        return (view==='heim' ? t.homeStats : view==='auswaerts' ? t.awayStats : t.stats) || t.stats;
    };

    const dayResults = this.matchdayViewIdx !== null
        ? (mdHist[this.matchdayViewIdx]?.results || []).filter(r => r.leagueId === lid)
        : this.viewHistoryOffset === null
            ? (Engine.matchdayResults || []).filter(r => r.leagueId === lid)
            : [];
    const displayMd = this.matchdayViewIdx !== null
        ? (mdHist[this.matchdayViewIdx]?.md ?? '?')
        : Engine.currentMatchday;
    let html = this._renderLeaguePyramidNav(lid);
    // Action-Modus (laufende Live-Ansicht): aktueller Tag + "spielfrei"-Hinweis für nicht gewählte Ligen
    const actDay = (Engine.actionState && this.viewHistoryOffset === null && this.matchdayViewIdx === null && this.actionActive()) ? this._actionDayLabel() : null;
    if (actDay && !(this.actionCfg && this.actionCfg.leagues[lid])) {
        html += `<div class="act-banner">⚽ Heute spielfrei – diese Liga läuft im Action-Modus nicht mit · Spieltag ${Engine.currentMatchday} · ${actDay}</div>`;
    }
    if (dayResults.length > 0) {
        const rc = this.resultsCollapsed;
        html += `<div style="background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;">
            <div onclick="App._toggleResults()" style="padding:6px 15px 6px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;">
                <span style="opacity:0.5;">Spieltag ${displayMd}${actDay ? ` · ${actDay}` : ''}</span>
                <span style="font-size:10px;color:var(--muted);">${rc ? '▾ einblenden' : '▴'}</span>
            </div>
            ${!rc ? `<div class="reslist" style="padding:4px 12px 8px;">
                ${(() => {
                    const byName = {}; teams.forEach(t => byName[t.name] = t);
                    const wp = nm => { const t = byName[nm], th = t && (t.thumb || GAME_DATA.teams[t.id]?.thumb); return th ? `<img src="${th}" class="res-wp">` : '<span class="res-wp"></span>'; };
                    return dayResults.map(r => {
                        const hw = r.score1 > r.score2, aw = r.score2 > r.score1;
                        return `<div class="res-row">
                            <span class="res-h"><span style="color:${hw?'var(--c-win)':aw?'var(--c-fix-down)':'var(--text)'}">${r.home}</span>${wp(r.home)}</span>
                            <b class="res-sc">${r.score1}:${r.score2}</b>
                            <span class="res-a">${wp(r.away)}<span style="color:${aw?'var(--c-win)':hw?'var(--c-fix-down)':'var(--text)'}">${r.away}</span></span>
                        </div>`;
                    }).join('');
                })()}
            </div>` : ''}
        </div>`;
    }
    // Vorschau: noch nicht gespielte Spiele (max. ein Spieltag) – Action-Rest oder kompletter kommender Spieltag
    const up = this._upcomingFixtures(lid);
    if (up) {
        const byId = {}; teams.forEach(t => byId[t.id] = t);
        const pnm = id => (byId[id] || GAME_DATA.teams[id] || {}).name || id;
        const pwp = id => { const t = byId[id], th = (t && t.thumb) || GAME_DATA.teams[id]?.thumb; return th ? `<img src="${th}" class="res-wp">` : '<span class="res-wp"></span>'; };
        const rowsFor = ms => ms.map(m => `<div class="res-row prev-row">
                    <span class="res-h"><span>${pnm(m.hId)}</span>${pwp(m.hId)}</span>
                    <b class="res-sc">–:–</b>
                    <span class="res-a">${pwp(m.aId)}<span>${pnm(m.aId)}</span></span>
                </div>`).join('');
        const body = up.groups.map(g =>
            (g.day ? `<div style="padding:4px 15px 0;font-size:11px;opacity:0.45;">${g.day}</div>` : '') +
            `<div class="reslist" style="padding:2px 12px 6px;">${rowsFor(g.matches)}</div>`
        ).join('');
        html += `<div style="background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;">
            <div style="padding:6px 15px 2px;opacity:0.5;">Vorschau · Spieltag ${up.md}</div>${body}</div>`;
    }
    const tv = this.tableView;
    const btn = (v, label) => `<button onclick="App.setTableView('${v}')" class="btn" style="padding:4px 12px;font-size:12px;background:${tv===v?'var(--border)':'var(--panel-3)'};color:var(--text);margin-right:4px;">${label}</button>`;
    html += `<div style="padding:6px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);">
        ${btn('gesamt','Gesamt')}${btn('heim','Heim')}${btn('auswaerts','Auswärts')}${btn('ewige','Ewige Tabelle')}${btn('sieger','🏆 Sieger')}
    </div>`;
    if (tv === 'ewige') {
        html += this._renderEwigeTabelle(lid);
        document.getElementById('content').innerHTML = html;
        this._fitLeagueButtons();
        return;
    }
    if (tv === 'sieger') {
        html += this._renderSiegerliste(lid);
        document.getElementById('content').innerHTML = html;
        this._fitLeagueButtons();
        return;
    }
    html += `<table class="ltab"><thead><tr><th>Pl.</th><th></th><th>Mannschaft</th><th class="c">Sp</th><th class="c">G</th><th class="c">U</th><th class="c">V</th><th class="c">Tore</th><th class="c">Diff</th><th class="c">Pkt</th><th class="c">Form</th><th></th></tr></thead><tbody>`;

    const count = teams.length;
    if (!this.zonesCache) this.zonesCache = Engine.calcZones();
    const _z = (this.zonesCache[lid]) || { fixUp:0, varUp:0, fixDown:0, varDown:0 };
    const fixUp = _z.fixUp, varUp = _z.varUp, fixDown = _z.fixDown, varDown = _z.varDown;

    // Für Heim/Auswärts: neu sortieren (nur Display, Gesamtrang bleibt für Zonen)
    let displayTeams = [...teams];
    if (tv !== 'gesamt') {
        displayTeams.sort((a, b) => {
            const sa = getS(a, tv), sb = getS(b, tv);
            if (sb.pts !== sa.pts) return sb.pts - sa.pts;
            const da = sa.gf-sa.ga, db = sb.gf-sb.ga;
            if (db !== da) return db - da;
            return sb.gf - sa.gf;
        });
    }

    const badgeHtml = badges => {
        if (!badges || !badges.length) return '';
        const C = { M:'#ffd700', V:'#b0b0b0', N:'#4caf50', A:'#f44336', P:'#9c6af7', R:'#ff9800' };
        const A = { N:' ↑', A:' ↓' };
        return ` <span style="font-size:12px;font-weight:bold;opacity:0.9">(${badges.map(b=>`<span style="color:${C[b]||'var(--text)'}">${b}${A[b]||''}</span>`).join(', ')})</span>`;
    };

    // Form: die letzten 5 Spiele VOR dem angezeigten Spieltag (Spieltag 17 → bis 16; die aktuelle Runde
    // steht schon oben in der Ergebnis-Liste). Live = seasonResults (ID, alle Ligen, reload-fest; letztes
    // Spiel je Team = aktueller Tag → weglassen); Rückblick = mdHist mit md < displayMd. Archiv: keine Form.
    let formMap = null;
    if (this.viewHistoryOffset === null && !this.tsView) {
        const acc = {}; teams.forEach(t => acc[t.id] = []);
        const res = (gf, ga) => gf > ga ? 'W' : gf < ga ? 'L' : 'D';
        formMap = {};
        if (this.matchdayViewIdx === null) {
            (Engine.seasonResults || []).forEach(r => {
                if (r.lid !== lid) return;
                if (acc[r.hId]) acc[r.hId].push(res(r.s1, r.s2));
                if (acc[r.aId]) acc[r.aId].push(res(r.s2, r.s1));
            });
            teams.forEach(t => formMap[t.id] = acc[t.id].slice(0, -1).slice(-5).reverse());
        } else {
            const nameToId = {}; teams.forEach(t => nameToId[t.name] = t.id);
            for (let i = 0; i < mdHist.length; i++) {
                if ((mdHist[i]?.md ?? 0) >= displayMd) continue;
                (mdHist[i].results || []).filter(r => r.leagueId === lid).forEach(r => {
                    if (acc[nameToId[r.home]]) acc[nameToId[r.home]].push(res(r.score1, r.score2));
                    if (acc[nameToId[r.away]]) acc[nameToId[r.away]].push(res(r.score2, r.score1));
                });
            }
            teams.forEach(t => formMap[t.id] = acc[t.id].slice(-5).reverse());
        }
    }
    const FCOL = { W:'var(--c-win)', D:'var(--c-gold)', L:'var(--c-fix-down)' };
    const formHtml = f => f && f.length ? `<span class="frm">${f.map((x,i)=>`<i class="fdot${i?'':' fdot-cur'}" style="background:${FCOL[x]}"></i>`).join('')}</span>` : '';

    let displayRank = 1;
    displayTeams.forEach((t, i) => {
        const rank = reconstructed ? (teams.indexOf(t) + 1) : t.rank;
        if (i > 0) {
            const p = displayTeams[i-1];
            const ps = getS(p, tv), ts = getS(t, tv);
            const tied = ts.pts === ps.pts && (ts.gf-ts.ga) === (ps.gf-ps.ga) && ts.gf === ps.gf;
            if (!tied) displayRank = i + 1;
        }
        const s = getS(t, tv);
        const revRank = count - teams.indexOf(t); // revRank nach Gesamtrang
        let rowClass = "", infoText = "", infoCompact = "", infoCol = "";

        if (l.level === 1) {
            if(rank <= 4) { rowClass = "row-cl"; infoText = "Champions League"; infoCompact = "CL"; infoCol = "var(--c-cl)"; }
            else if(rank === 5) { rowClass = "row-el"; infoText = "Europa League"; infoCompact = "EL"; infoCol = "var(--c-el)"; }
            else if(rank === 6) { rowClass = "row-ecl"; infoText = "Conference League"; infoCompact = "ECL"; infoCol = "var(--c-ecl)"; }
        }

        if (l.level > 1) {
            if (rank <= fixUp) {
                rowClass = "row-fix-up";
                const tgt = Engine.findTarget(t, l.level - 1, lid);
                infoText = tgt ? `▲ ${tgt.name}` : "▲ Aufstieg"; infoCompact = tgt ? `▲ ${tgt.id}` : "▲"; infoCol = "var(--c-fix-up)";
            } else if (rank <= fixUp + varUp) {
                rowClass = "row-var-up";
                const tgt = Engine.findTarget(t, l.level - 1, lid);
                infoText = tgt ? `⇄ ${tgt.name}` : "⇄ Relegation"; infoCompact = tgt ? `⇄ ${tgt.id}` : "⇄"; infoCol = "var(--c-var-up)";
            }
        }

        if (revRank <= fixDown) {
            rowClass = "row-fix-down";
            const tgt = Engine.findTarget(t, l.level + 1, lid);
            infoText = tgt ? `▼ ${tgt.name}` : "▼ Abstieg"; infoCompact = tgt ? `▼ ${tgt.id}` : "▼"; infoCol = "var(--c-fix-down)";
        } else if (revRank <= fixDown + varDown) {
            rowClass = "row-var-down";
            const tgt = Engine.findTarget(t, l.level + 1, lid);
            infoText = tgt ? `▽ ${tgt.name}` : "▽ Abstieg?"; infoCompact = tgt ? `▽ ${tgt.id}` : "▽"; infoCol = "var(--c-var-down)";
        }

        html += `<tr class="${tv==='gesamt' ? rowClass : ''}">
            <td style="text-align:center;font-weight:bold;">${displayRank}.</td>
            <td class="wpc">${(t.thumb || GAME_DATA.teams[t.id]?.thumb) ? `<img src="${t.thumb || GAME_DATA.teams[t.id].thumb}" class="wp">` : ''}</td>
            <td class="tm">
                <span onclick="App.showSteckbrief('${t.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${t.name}</span>${badgeHtml(histBadgeMap ? histBadgeMap[t.id] : t.prevSeasonBadge)} <span style="font-size:11px;opacity:0.45;">${t.strength != null ? `(${t.strength})` : ''}</span>
            </td>
            <td class="c">${s.p}</td>
            <td class="c">${s.w}</td>
            <td class="c">${s.d}</td>
            <td class="c">${s.l}</td>
            <td class="c">${s.gf}:${s.ga}</td>
            <td class="c">${s.gf - s.ga}</td>
            <td class="c"><b>${s.pts}</b></td>
            <td class="c frm-td">${formHtml(formMap ? formMap[t.id] : null)}</td>
            <td class="inf" style="font-size:12px;opacity:0.8;">${tv==='gesamt' && infoText ? `<span class="itxt">${infoText}</span><span class="iarr" style="color:${infoCol}" onclick="App._toggleInfo(this,event)" title="${infoText}" data-c="${infoCompact}" data-f="${infoText}">${infoCompact}</span>` : ''}</td>
        </tr>`;
    });
    html += "</tbody></table>";
    document.getElementById('content').innerHTML = html;
    this._fitLeagueButtons();
},

// Mobil: Auf-/Abstiegs-Kürzel (Pfeil + Ziel-Liga-ID) antippen/halten → voller Zielliganame, erneut → zurück
_toggleInfo: function(el, ev) {
    if (ev) ev.stopPropagation();
    const c = el.getAttribute('data-c'), f = el.getAttribute('data-f');
    el.textContent = el.textContent.trim() === f ? c : f;
},

nextStep: function() {
    this.matchdayViewIdx = null;
    this.zonesCache = null;
    this.tsView = null;
    // Pokal-Ansicht muss via showPokal aktualisiert werden (loadLeague rendert '__pokal__' nicht)
    const refresh = () => { this.activeLeague === '__pokal__' ? this.showPokal() : this.loadLeague(this.activeLeague); };
    // Laufenden Action-Spieltag IMMER in Action-Schritten zu Ende spielen → Scope-Änderungen greifen erst
    // am nächsten Spieltag (sauber, kein Doppel-Spieltag wenn man mittendrin den Modus umstellt).
    if (Engine.actionState) {
        Engine.playActionStep();
        this.triggerAutoSave(); refresh(); this.updateStatus();
        return;
    }
    // Neuer Spieltag: Action-Modus (ein Klick = ein Tag) oder normal (ganzer Spieltag)
    if (this.actionActive()) {
        if (!Engine.startActionMatchday(this.actionCfg)) { alert("Saisonende erreicht."); return; }
        Engine.playActionStep();
        this.triggerAutoSave(); refresh(); this.updateStatus();
        return;
    }
    if(Engine.playNextMatchday()) { this.triggerAutoSave(); refresh(); this.updateStatus(); }
    else { alert("Saisonende erreicht."); }
},

// Noch nicht gespielte Spiele einer Liga (max. ein Spieltag): im Action-Spieltag die offenen Partien
// (cursor.. + rest), sonst der komplette kommende Spieltag. Nur laufende Live-Ansicht.
_upcomingFixtures: function(lid) {
    if (this.viewHistoryOffset !== null || this.matchdayViewIdx !== null || this.tsView) return null;
    const st = Engine.actionState;
    if (st && st.md != null) {
        // laufender Spieltag: offene Partien dieser Liga, nach Action-Tag gruppiert (Wochentag)
        const groups = [];
        for (let i = st.cursor; i < st.days.length; i++) {
            const dm = (st.days[i].matches || []).filter(m => m.lid === lid);
            if (dm.length) groups.push({ day: st.days[i].label, matches: dm });
        }
        const restM = (st.rest || []).filter(m => m.lid === lid);
        if (restM.length) groups.push({ day: null, matches: restM });
        return groups.length ? { md: st.md, groups } : null;
    }
    const next = Engine.currentMatchday + 1;
    if (next > Engine.totalMatchdays) return null;
    if (!Engine.schedule[next]) Engine.generateSchedule();
    const ms = (Engine.schedule[next] || []).filter(m => m.lid === lid);
    return ms.length ? { md: next, groups: [{ day: null, matches: ms }] } : null;
},

// Liga-Ansicht der Testspiele: jeder Verein der Liga mit seinen Spielen des Fensters (Heim+Auswärts)
_renderLeagueFriendlies: function(lid, window) {
    const off = this.viewHistoryOffset;
    const season = off !== null ? (Engine.history[off]?.year) : Engine.getFormattedSeason();
    const teamData = off !== null ? (Engine.history[off]?.teams || {}) : Engine.teams;
    const fs = (Engine.friendlies || []).filter(f => f.season === season && f.window === window);
    const label = window === 'pre' ? 'Sommer-Vorbereitung (vor dem 1. Spieltag)' : 'Winterpause (nach Spieltag 17)';
    let html = `<div style="padding:6px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;"><b>⚽ Testspiele</b> – ${label} · ${season}</div>`;
    const teams = Object.entries(teamData).map(([id, t]) => (t.id ? t : { ...t, id })).filter(t => t.leagueId === lid && !t.isReserve).sort((a, b) => (b.strength || 0) - (a.strength || 0));
    const rows = teams.map(t => {
        const games = fs.filter(f => f.hId === t.id || f.aId === t.id);
        if (!games.length) return '';
        const thumb = t.thumb || GAME_DATA.teams[t.id]?.thumb;
        let g = `<div style="margin-bottom:10px"><div style="font-weight:bold;font-size:13px;margin-bottom:3px;display:flex;align-items:center;gap:6px">${thumb ? `<img src="${thumb}" width="18" height="18" style="object-fit:contain;flex-shrink:0">` : ''}<span onclick="App.showSteckbrief('${t.id}')" style="cursor:pointer">${t.name}</span></div>`;
        games.forEach(f => {
            const home = f.hId === t.id, oppId = home ? f.aId : f.hId;
            const opp = Engine.teams[oppId] || GAME_DATA.teams[oppId];
            const gf = home ? f.s1 : f.s2, ga = home ? f.s2 : f.s1;
            const col = gf > ga ? 'var(--c-win)' : gf < ga ? 'var(--c-fix-down)' : 'var(--muted)';
            g += `<div style="display:flex;align-items:center;gap:8px;font-size:12px;padding:2px 0 2px 24px;color:var(--muted)"><span style="width:14px;opacity:0.5">${home ? 'H' : 'A'}</span><span style="color:${col};font-weight:bold;width:34px">${gf}:${ga}</span><span onclick="App.showSteckbrief('${oppId}')" style="cursor:pointer;color:var(--text)">${opp?.name || oppId}</span><span style="opacity:0.4;font-size:10px">${Engine.leagues[opp?.leagueId]?.name || 'ligalos'}</span></div>`;
        });
        return g + '</div>';
    }).filter(Boolean).join('');
    return html + (rows ? `<div style="padding:8px 15px">${rows}</div>` : '<div style="padding:20px;opacity:0.5">Keine Testspiele in diesem Fenster.</div>');
},

simRest: function() {
    const btn = document.getElementById('btn-saison');
    if (btn) { btn.disabled = true; btn.textContent = '⏳'; }
    this.matchdayViewIdx = null;
    this.zonesCache = null;
    const self = this;
    setTimeout(() => {
        Engine.fastMode = true;
        Engine.simulateFullSeason();
        Engine.fastMode = false;
        Engine.saveGame();
        self.loadLeague(self.activeLeague);
        self.updateStatus();
    }, 0);
},

_toggleResults: function() {
    this.resultsCollapsed = !this.resultsCollapsed;
    this.loadLeague(this.activeLeague);
},

toggleNavCollapsed: function() {
    this.navCollapsed = !this.navCollapsed;
    this.loadLeague(this.activeLeague);
},

_renderLeaguePyramidNav: function(lid) {
    const l = Engine.leagues[lid];
    if (!l) return '';

    let parentId = Engine.UP_MAP[lid];
    if (!parentId && l.level > 1) {
        const up = Object.values(Engine.leagues).filter(lg => lg.level === l.level - 1);
        if (up.length === 1) parentId = up[0].id;
    }
    const parentLeague = parentId ? Engine.leagues[parentId] : null;

    let siblings;
    if (parentId && Engine.DOWN_MAP[parentId]) {
        siblings = Engine.DOWN_MAP[parentId].map(id => Engine.leagues[id]).filter(Boolean);
    } else {
        siblings = Object.values(Engine.leagues).filter(lg => lg.level === l.level);
    }

    let children = (Engine.DOWN_MAP[lid] || []).map(id => Engine.leagues[id]).filter(Boolean);
    if (!children.length) {
        const dn = Object.values(Engine.leagues).filter(lg => lg.level === l.level + 1);
        if (dn.length === 1) children = dn;
    }

    const escA = s => String(s).replace(/&/g,'&amp;').replace(/"/g,'&quot;');
    const sym = type => type==='up' ? '↑ ' : type==='down' ? '↓ ' : '';
    const mkBtn = (league, type, g) => {
        const active = league.id === lid;
        const bg = type==='up' ? '#1b5e20' : type==='down' ? '#b71c1c' : active ? '#546e7a' : '#2d3e46';
        const bord = (type==='curr' && active) ? 'border:2px solid #90caf9;font-weight:bold;' : 'border:2px solid transparent;';
        const full  = Engine.leagues[league.id]?.name || league.id;
        const base = `onclick="App.loadLeague('${league.id}')" class="btn ligaNavBtn" style="flex:1;min-width:0;background:${bg};color:#fff;padding:4px ${g ? '4px' : '6px'};font-size:10px;border-radius:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;${bord}"`;
        if (g) {
            // Gruppen-Modus: Tag (z.B. "RL") trägt Pfeil+Prefix, Button zeigt nur die Region.
            // LEAGUE_SHORT[id] darf das Region-Label überschreiben (z.B. lange Namen kürzen).
            const region = full.startsWith(g.prefix) ? full.slice(g.prefix.length) : full;
            const short = (this.LEAGUE_SHORT && this.LEAGUE_SHORT[league.id]) || region;
            return `<button ${base} data-grouped="1" data-full="${escA(full)}" data-short="${escA(short)}">${short}</button>`;
        }
        const short = (this.LEAGUE_SHORT && this.LEAGUE_SHORT[league.id]) || full;
        // Kein Auto-Abkürzen: ohne manuelles Kürzel = voller Name. Start mit Kürzel (kein Overflow-Flash); _fitLeagueButtons() rüstet auf vollen Namen auf, wenn Platz ist.
        return `<button ${base} data-sym="${escA(sym(type))}" data-full="${escA(full)}" data-short="${escA(short)}">${sym(type)}${short}</button>`;
    };

    // Gemeinsames Tag für Blöcke mit gleichem Prefix (spart pro Button die Wortwiederholung) – nur ab 4 Ligen sinnvoll
    const groupTagFor = lgs => {
        if (lgs.length < 4) return null;
        const first = (Engine.leagues[lgs[0].id]?.name || '').split(' ')[0];
        if (!this.NAV_GROUP_TAGS[first]) return null;
        if (!lgs.every(l => (Engine.leagues[l.id]?.name || '').startsWith(first + ' '))) return null;
        return { prefix: first + ' ', tag: this.NAV_GROUP_TAGS[first] };
    };
    const renderRow = (lgs, type, mb) => {
        const g = groupTagFor(lgs);
        const btns = lgs.map(l => mkBtn(l, type, g)).join('');
        // Gruppen-Zeilen dürfen die Außengrenzen leicht ins Nav-Padding ausdehnen (mehr px pro Button, kein Überlauf), Abstand minimal enger
        const wrap = inner => `<div class="navrow"${g ? ` data-tag="${escA(g.tag)}" data-tagarrow="${escA(sym(type))}"` : ''} style="display:flex;gap:${g ? '3px;margin-left:-7px;margin-right:-7px;' : '4px;'}${mb ? 'margin-bottom:3px;' : ''}">${inner}</div>`;
        if (!g) return wrap(btns);
        const tag = `<span class="navGroupTag" style="display:none;flex:0 0 auto;align-items:center;justify-content:center;background:#37474f;color:#cfd8dc;font-size:10px;font-weight:bold;padding:4px 7px;border-radius:4px;border:2px solid transparent;white-space:nowrap;">${sym(type)}${g.tag}</span>`;
        return wrap(tag + btns);
    };

    const col = this.navCollapsed;
    const togBtn = `<button onclick="App.toggleNavCollapsed()" class="btn" style="background:none;border:1px solid var(--border);color:var(--muted);font-size:10px;padding:1px 6px;border-radius:3px;">${col ? '▾ Liga' : '▴'}</button>`;

    let h = `<div style="background:var(--panel-3);border-bottom:1px solid var(--border);padding:3px 8px 4px;">`;
    if (col) {
        h += `<div style="display:flex;justify-content:flex-end;">${togBtn}</div>`;
    } else {
        h += `<div style="display:flex;justify-content:flex-end;padding-bottom:3px;">${togBtn}</div>`;
        if (parentLeague) h += renderRow([parentLeague], 'up', true);
        h += renderRow(siblings, 'curr', children.length > 0);
        if (children.length) h += renderRow(children, 'down', false);
    }
    return h + '</div>';
},

// Prefix → Tag für gemeinsame Block-Labels im Liga-Baum (siehe renderRow/groupTagFor).
// Greift nur, wenn ALLE Ligen eines Blocks (≥4) denselben Prefix haben.
NAV_GROUP_TAGS: { "Regionalliga": "RL", "Landesliga": "LL", "Oberliga": "OL", "Verbandsliga": "VL", "Bezirksliga": "BzL" },

// Manuelle Liga-Kürzel (id → Abkürzung), erzeugt vom Liga-Kürzel Editor (tools/liga-kuerzel-editor.html).
// Greift in mkBtn als bevorzugtes Kürzel; ohne Eintrag = voller Liga-Name (kein Auto-Abkürzen).
LEAGUE_SHORT: {
    "5-1": "OL RLP/Saar",
    "5-2": "OL Baden-W.",
    "5-4": "OL S-H",
    "5-5": "OL HH",
    "5-6": "OL NS",
    "5-7": "Bremen",
    "5-10": "OL Westfalen",
    "5-11": "OL Niederrhein",
    "6-1": "VL Südwest",
    "6-4": "VL Baden",
    "6-5": "VL Südbaden",
    "6-6": "VL Württemberg",
    "6-7": "VL Hessen Nord",
    "6-8": "VL Hessen Mitte",
    "6-9": "VL Hessen Süd",
    "6-12": "LL Hamburg Hammonia",
    "6-13": "LL Hamburg Hansa",
    "6-17": "Braunschw.",
    "6-19": "VL Meckl.-Vpom.",
    "6-22": "VL Sachsen-A.",
    "6-27": "LL Niederrhein Gruppe 1",
    "6-28": "LL Niederrhein Gruppe 2",
    "6-29": "LL Mittelrhein Staffel 1",
    "6-30": "LL Mittelrhein Staffel 2",
    "6-33": "LL Bayern Mitte",
    "6-34": "LL Bayern SW",
    "6-35": "LL Bayern SO",
    "7-3": "BL Rhld West",
    "7-4": "BL Rhld Mitte",
    "7-5": "BL Rhld Ost",
    "7-6": "VL Saarland Nord-Ost",
    "7-7": "VL Saarland Süd-West",
},

// Responsive Beschriftung: zeigt vollen Liga-Namen, wenn er in den Button passt – sonst das Kürzel.
// Läuft nach jedem Nav-Render (DOM muss stehen) + bei Viewport-Resize.
_fitLeagueButtons: function() {
    // Gruppen-Zeilen (z.B. Regionalliga-5er): vollen Namen versuchen; passt nicht → "RL"-Tag + nur Region.
    document.querySelectorAll('.navrow[data-tag]').forEach(row => {
        const tagEl = row.querySelector('.navGroupTag');
        const gbtns = row.querySelectorAll('.ligaNavBtn[data-grouped]');
        if (tagEl) tagEl.style.display = 'none';
        gbtns.forEach(b => { b.textContent = b.getAttribute('data-full'); });
        const allFull = [...gbtns].every(b => b.scrollWidth <= b.clientWidth + 1);
        if (!allFull && tagEl) {
            tagEl.style.display = 'inline-flex';
            gbtns.forEach(b => { b.textContent = b.getAttribute('data-short'); });
        }
    });
    // Normale (nicht gruppierte) Buttons
    document.querySelectorAll('.ligaNavBtn:not([data-grouped])').forEach(btn => {
        const sym = btn.getAttribute('data-sym') || '';
        const full = btn.getAttribute('data-full') || '';
        const short = btn.getAttribute('data-short') || '';
        btn.textContent = sym + full;                       // erst vollen Namen versuchen
        if (btn.scrollWidth > btn.clientWidth + 1) {        // passt nicht → Kürzel
            btn.textContent = sym + short;
        }
    });
    if (!this._fitResizeBound) {                            // einmalig: bei Resize neu anpassen
        this._fitResizeBound = true;
        window.addEventListener('resize', () => {
            clearTimeout(this._fitResizeTimer);
            this._fitResizeTimer = setTimeout(() => this._fitLeagueButtons(), 120);
        });
    }
},

_renderEwigeTabelle: function(lid) {
    const history = Engine.history || [];
    // Wenn Season-Browser aktiv: ewige Tabelle mit Season-Ansicht synchronisieren
    const seasonSync = this.viewHistoryOffset !== null;
    const idx = seasonSync ? this.viewHistoryOffset : this.ewigeSeasonIdx;
    const curLevel = (Engine.leagues[lid] || {}).level;

    const computeTable = (upToIdx) => {
        const et = {};
        const mk = (id, name) => {
            if (!et[id]) et[id] = { name, years:0, p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0, titles:0, promotions:0 };
        };
        const limit = upToIdx === null ? history.length : Math.min(upToIdx + 1, history.length);
        for (let i = 0; i < limit; i++) {
            const nextTeams = i + 1 < history.length ? history[i + 1].teams : Engine.teams;
            Object.entries(history[i].teams || {}).forEach(([id, t]) => {
                if (t.leagueId !== lid || !t.stats) return;
                mk(id, t.name);
                const e = et[id], s = t.stats;
                e.years++; e.p+=s.p||0; e.w+=s.w||0; e.d+=s.d||0;
                e.l+=s.l||0; e.gf+=s.gf||0; e.ga+=s.ga||0; e.pts+=s.pts||0;
                if (t.rank === 1) e.titles++;
                const nt = nextTeams[id];
                if (nt && curLevel) {
                    const nLvl = (Engine.leagues[nt.leagueId] || {}).level;
                    if (nLvl && nLvl < curLevel) e.promotions++;
                }
            });
        }
        if (upToIdx === null) {
            Object.values(Engine.teams || {}).filter(t => t.leagueId === lid).forEach(t => {
                mk(t.id, t.name);
                const e = et[t.id], s = t.stats || {};
                e.years++; e.p+=s.p||0; e.w+=s.w||0; e.d+=s.d||0;
                e.l+=s.l||0; e.gf+=s.gf||0; e.ga+=s.ga||0; e.pts+=s.pts||0;
            });
        }
        const sorted = Object.entries(et).map(([id, e]) => ({ id, ...e }))
            .sort((a, b) => b.pts-a.pts || (b.gf-b.ga)-(a.gf-a.ga) || b.gf-a.gf || b.years-a.years);
        const ranks = {};
        sorted.forEach((e, i) => ranks[e.id] = i + 1);
        return { sorted, ranks };
    };

    const { sorted, ranks } = computeTable(idx);
    const prevIdx = idx === null ? (history.length > 0 ? history.length - 1 : null) : idx - 1;
    const prevRanks = (prevIdx !== null && prevIdx >= 0) ? computeTable(prevIdx).ranks : null;

    const seasonLabel = i => i === null ? 'Aktuell' : (history[i] ? history[i].year : `Saison ${i+1}`);

    let out;
    if (seasonSync) {
        out = `<div style="padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;text-align:center;">
            <span style="opacity:0.85;font-weight:bold;">Stand nach Saison ${seasonLabel(idx)}</span>
            <span style="opacity:0.4;font-size:11px;margin-left:8px;">(folgt Saisonansicht)</span>
        </div>`;
    } else {
        const noPrev = (idx === null && history.length === 0) || idx === 0;
        const noNext = idx === null;
        const db = dis => dis ? ' disabled style="opacity:0.35;cursor:default;"' : '';
        out = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;">
            <button onclick="App._ewigeNav(-1)" class="btn" style="padding:3px 10px;"${db(noPrev)}>◀</button>
            <span style="flex:1;text-align:center;opacity:0.85;font-weight:bold;">${seasonLabel(idx)}</span>
            <button onclick="App._ewigeNav(1)" class="btn" style="padding:3px 10px;"${db(noNext)}>▶</button>
        </div>`;
    }

    if (!sorted.length) return out + '<div style="padding:20px;opacity:0.5;text-align:center;">Noch keine Daten.</div>';

    out += '<table><thead><tr><th>Pl.</th><th style="width:28px;"></th><th></th><th>Mannschaft</th><th title="Saisons in dieser Liga">Jahre</th><th title="Meistertitel / Ligenmeisterschaften">Titel</th><th title="Aufstiege aus dieser Liga">Aufstiege</th><th>Sp.</th><th>G.</th><th>U.</th><th>V.</th><th>Tore</th><th>Diff.</th><th>Pkt.</th><th>Pkt/Sp</th></tr></thead><tbody>';
    sorted.forEach((e, i) => {
        const thumb = (Engine.teams[e.id] || {}).thumb || (GAME_DATA.teams[e.id] || {}).thumb || null;
        const pps = e.p > 0 ? (e.pts / e.p).toFixed(2) : '—';
        let arrow = '';
        if (prevRanks) {
            if (prevRanks[e.id] != null) {
                const diff = prevRanks[e.id] - (i + 1);
                if      (diff > 0) arrow = `<span style="color:#4caf50;font-size:11px;font-weight:bold;">▲${diff}</span>`;
                else if (diff < 0) arrow = `<span style="color:#f44336;font-size:11px;font-weight:bold;">▼${Math.abs(diff)}</span>`;
                else               arrow = `<span style="opacity:0.25;font-size:11px;">—</span>`;
            } else {
                arrow = `<span style="color:#ffd700;font-size:10px;font-weight:bold;">NEU</span>`;
            }
        }
        const titlesHtml = e.titles > 0
            ? `<span style="color:#ffd700;font-weight:bold;">${e.titles}</span>`
            : `<span style="opacity:0.3;">—</span>`;
        const promoHtml = e.promotions > 0
            ? `<span style="color:#4caf50;font-weight:bold;">${e.promotions}</span>`
            : `<span style="opacity:0.3;">—</span>`;
        out += `<tr>
            <td style="text-align:center;font-weight:bold;">${i + 1}.</td>
            <td style="text-align:center;">${arrow}</td>
            <td class="wpc">${thumb ? `<img src="${thumb}" class="wp">` : ''}</td>
            <td class="tm"><span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span></td>
            <td style="text-align:center;">${e.years}</td>
            <td style="text-align:center;">${titlesHtml}</td>
            <td style="text-align:center;">${promoHtml}</td>
            <td>${e.p}</td><td>${e.w}</td><td>${e.d}</td><td>${e.l}</td>
            <td>${e.gf}:${e.ga}</td><td>${e.gf - e.ga}</td>
            <td><b>${e.pts}</b></td>
            <td style="opacity:0.7;">${pps}</td>
        </tr>`;
    });
    return out + '</tbody></table>';
},

_toggleSiegerSort: function() {
    this._siegerSort = (this._siegerSort || 'desc') === 'desc' ? 'asc' : 'desc';
    this.activeLeague === '__pokal__' ? this.showPokal() : this.loadLeague(this.activeLeague);
},

_renderSiegerliste: function(lid) {
    const sort = this._siegerSort || 'desc';
    const entries = [];

    Engine.history.forEach(snap => {
        const found = Object.entries(snap.teams).find(([, t]) => t.leagueId === lid && t.rank === 1);
        if (found) {
            const [id, t] = found;
            const live = Engine.teams[id] || GAME_DATA.teams[id];
            entries.push({ season: snap.year, id, name: live?.name || t.name, thumb: live?.thumb || GAME_DATA.teams[id]?.thumb || null });
        }
    });
    if (Engine.currentMatchday >= Engine.totalMatchdays) {
        const champ = Object.values(Engine.teams).find(t => t.leagueId === lid && t.rank === 1);
        if (champ) entries.push({ season: Engine.getFormattedSeason(), id: champ.id, name: champ.name, thumb: champ.thumb || GAME_DATA.teams[champ.id]?.thumb || null });
    }

    const yr = s => parseInt((s || '').split('/')[0]) || 0;
    entries.sort((a, b) => sort === 'desc' ? yr(b.season) - yr(a.season) : yr(a.season) - yr(b.season));

    const counts = {};
    entries.forEach(e => { if (!counts[e.id]) counts[e.id] = { id: e.id, count: 0, name: e.name, thumb: e.thumb }; counts[e.id].count++; });
    const top = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 7);

    const sortBtn = `<button onclick="App._toggleSiegerSort()" class="btn" style="padding:3px 10px;font-size:12px;">${sort === 'desc' ? '▼ Neueste zuerst' : '▲ Älteste zuerst'}</button>`;
    const header = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);"><span style="opacity:0.5;font-size:12px;">${entries.length} Einträge</span><div style="flex:1;"></div>${sortBtn}</div>`;

    if (!entries.length) return header + '<div style="padding:20px;opacity:0.5;">Keine Daten vorhanden.</div>';

    const rowsHtml = entries.map(e => `<tr>
        <td style="opacity:0.6;white-space:nowrap;">${e.season}</td>
        <td style="display:flex;align-items:center;gap:8px;">${e.thumb?`<img src="${e.thumb}" class="wp-s">`:''}<span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span></td>
    </tr>`).join('');

    const rankHtml = top.map((v, i) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;">
        <span style="opacity:0.4;width:14px;text-align:right;flex-shrink:0;">${i+1}.</span>
        ${v.thumb?`<img src="${v.thumb}" width="16" height="16" style="object-fit:contain;flex-shrink:0;">`:''}
        <span onclick="App.showSteckbrief('${v.id}')" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${v.name}</span>
        <span style="color:#ffd700;font-weight:bold;flex-shrink:0;">${v.count}×</span>
    </div>`).join('');

    return header + `<div style="display:flex;align-items:flex-start;">
        <div style="flex:1;overflow:hidden;min-width:0;"><table><thead><tr><th>Saison</th><th>Sieger</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
        <div style="width:170px;flex-shrink:0;padding:12px;border-left:1px solid var(--border);background:var(--panel-3);">
            <div style="font-size:10px;opacity:0.4;letter-spacing:1px;margin-bottom:8px;">RANGLISTE</div>
            ${rankHtml}
        </div>
    </div>`;
},

_ewigeNav: function(dir) {
    const history = Engine.history || [];
    if (dir === -1) {
        this.ewigeSeasonIdx = this.ewigeSeasonIdx === null
            ? history.length - 1
            : Math.max(0, this.ewigeSeasonIdx - 1);
    } else {
        this.ewigeSeasonIdx = (this.ewigeSeasonIdx >= history.length - 1)
            ? null
            : this.ewigeSeasonIdx + 1;
    }
    this.activeLeague === '__pokal__' ? this.showPokal() : this.loadLeague(this.activeLeague);
}

});
