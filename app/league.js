Object.assign(App, {
loadLeague: function(lid) {
    if (this.activeLeague !== lid) this.ewigeSeasonIdx = null;
    this.activeLeague = lid;
    localStorage.setItem('ba_lastLeague', lid);
    this.renderSidebar();
    const l = Engine.leagues[lid];
    const logo = leagueLogo(lid);
    document.getElementById('league-title').innerHTML = (logo ? `<img src="${logo}">` : '') + l.name;
    
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

    const teams = Object.values(teamData).filter(t => t.leagueId === lid);

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
    let html = '';
    if (dayResults.length > 0) {
        html += `<div style="padding:8px 15px 6px; background:#1a1a1a; border-bottom:1px solid #333; font-size:13px;">
            <span style="opacity:0.5; margin-right:10px;">Spieltag ${displayMd}</span>
            ${dayResults.map(r => {
                const hw = r.score1 > r.score2, aw = r.score2 > r.score1;
                return `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;margin-bottom:2px;">
                    <span style="color:${hw?'#4caf50':aw?'#f44336':'#ccc'}">${r.home}</span>
                    <b>${r.score1}:${r.score2}</b>
                    <span style="color:${aw?'#4caf50':hw?'#f44336':'#ccc'}">${r.away}</span>
                </span>`;
            }).join('')}
        </div>`;
    }
    const tv = this.tableView;
    const btn = (v, label) => `<button onclick="App.setTableView('${v}')" class="btn" style="padding:4px 12px;font-size:12px;background:${tv===v?'#555':'#333'};margin-right:4px;">${label}</button>`;
    html += `<div style="padding:6px 15px;background:#1a1a1a;border-bottom:1px solid #333;">
        ${btn('gesamt','Gesamt')}${btn('heim','Heim')}${btn('auswaerts','Auswärts')}${btn('ewige','Ewige Tabelle')}
    </div>`;
    if (tv === 'ewige') {
        html += this._renderEwigeTabelle(lid);
        document.getElementById('content').innerHTML = html;
        return;
    }
    html += `<table><thead><tr><th>Pl.</th><th>Mannschaft</th><th>Sp.</th><th>G.</th><th>U.</th><th>V.</th><th>Tore</th><th>Diff.</th><th>Pkt.</th><th></th></tr></thead><tbody>`;

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
        return ` <span style="font-size:12px;font-weight:bold;opacity:0.9">(${badges.map(b=>`<span style="color:${C[b]||'#ccc'}">${b}${A[b]||''}</span>`).join(', ')})</span>`;
    };

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
        let rowClass = "", infoText = "";

        if (l.level === 1) {
            if(rank <= 4) { rowClass = "row-cl"; infoText = "Champions League"; }
            else if(rank === 5) { rowClass = "row-el"; infoText = "Europa League"; }
            else if(rank === 6) { rowClass = "row-ecl"; infoText = "Conference League"; }
        }

        if (l.level > 1) {
            if (rank <= fixUp) {
                rowClass = "row-fix-up";
                const tgt = Engine.findTarget(t, l.level - 1, lid);
                infoText = tgt ? `▲ ${tgt.name}` : "▲ Aufstieg";
            } else if (rank <= fixUp + varUp) {
                rowClass = "row-var-up";
                const tgt = Engine.findTarget(t, l.level - 1, lid);
                infoText = tgt ? `⇄ ${tgt.name}` : "⇄ Relegation";
            }
        }

        if (revRank <= fixDown) {
            rowClass = "row-fix-down";
            const tgt = Engine.findTarget(t, l.level + 1, lid);
            infoText = tgt ? `▼ ${tgt.name}` : "▼ Abstieg";
        } else if (revRank <= fixDown + varDown) {
            rowClass = "row-var-down";
            const tgt = Engine.findTarget(t, l.level + 1, lid);
            infoText = tgt ? `▽ ${tgt.name}` : "▽ Abstieg?";
        }

        html += `<tr class="${tv==='gesamt' ? rowClass : ''}">
            <td style="text-align:center;font-weight:bold;">${displayRank}.</td>
            <td style="display:flex;align-items:center;gap:10px;">
                ${(t.thumb || GAME_DATA.teams[t.id]?.thumb) ? `<img src="${t.thumb || GAME_DATA.teams[t.id].thumb}" width="32" height="32" style="object-fit:contain;">` : ''}
                ${t.name}${badgeHtml(histBadgeMap ? histBadgeMap[t.id] : t.prevSeasonBadge)} <span style="font-size:11px;opacity:0.45;">${t.strength != null ? `(${t.strength})` : ''}</span>
            </td>
            <td>${s.p}</td>
            <td>${s.w}</td>
            <td>${s.d}</td>
            <td>${s.l}</td>
            <td>${s.gf}:${s.ga}</td>
            <td>${s.gf - s.ga}</td>
            <td><b>${s.pts}</b></td>
            <td style="font-size:12px;opacity:0.7;">${tv==='gesamt' ? infoText : ''}</td>
        </tr>`;
    });
    html += "</tbody></table>";
    document.getElementById('content').innerHTML = html;
},

nextStep: function() {
    this.matchdayViewIdx = null;
    this.zonesCache = null;
    if(Engine.playNextMatchday()) { this.loadLeague(this.activeLeague); this.updateStatus(); }
    else { alert("Saisonende erreicht."); }
},

simRest: function() {
    this.matchdayViewIdx = null;
    this.zonesCache = null;
    Engine.simulateFullSeason();
    this.loadLeague(this.activeLeague);
    this.updateStatus();
},

_renderEwigeTabelle: function(lid) {
    const history = Engine.history || [];
    const idx = this.ewigeSeasonIdx;
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
    const noPrev = (idx === null && history.length === 0) || idx === 0;
    const noNext = idx === null;
    const db = dis => dis ? ' disabled style="opacity:0.35;cursor:default;"' : '';

    let out = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:#1a1a1a;border-bottom:1px solid #333;font-size:13px;">
        <button onclick="App._ewigeNav(-1)" class="btn" style="padding:3px 10px;"${db(noPrev)}>◀</button>
        <span style="flex:1;text-align:center;opacity:0.85;font-weight:bold;">${seasonLabel(idx)}</span>
        <button onclick="App._ewigeNav(1)" class="btn" style="padding:3px 10px;"${db(noNext)}>▶</button>
    </div>`;

    if (!sorted.length) return out + '<div style="padding:20px;opacity:0.5;text-align:center;">Noch keine Daten.</div>';

    out += '<table><thead><tr><th>Pl.</th><th style="width:28px;"></th><th>Mannschaft</th><th title="Saisons in dieser Liga">Jahre</th><th title="Meistertitel / Ligenmeisterschaften">Titel</th><th title="Aufstiege aus dieser Liga">Aufstiege</th><th>Sp.</th><th>G.</th><th>U.</th><th>V.</th><th>Tore</th><th>Diff.</th><th>Pkt.</th><th>Pkt/Sp</th></tr></thead><tbody>';
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
            <td style="display:flex;align-items:center;gap:10px;">${thumb ? `<img src="${thumb}" width="32" height="32" style="object-fit:contain;">` : ''}${e.name}</td>
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
    this.loadLeague(this.activeLeague);
}

});
