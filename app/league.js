Object.assign(App, {
loadLeague: function(lid) {
    if (lid === '__ligalos__') return this.showLeagueless();
    if (this.activeLeague !== lid) { this.ewigeSeasonIdx = null; if (this.viewArchivedSeason) this.viewArchivedSeason = { y: this.viewArchivedSeason.y, lid }; }
    this.activeLeague = lid;
    localStorage.setItem('ba_lastLeague', lid);
    this.renderSidebar();
    const l = Engine.leagues[lid];
    const logo = leagueLogo(lid);
    document.getElementById('league-title').innerHTML = (logo ? `<img src="${logo}">` : '') + `<span class="lt-name">${l.name}</span>`;

    // Archivierte Saison (außerhalb 50er-Fenster, aus IndexedDB): read-only Abschlusstabelle
    if (this.viewArchivedSeason) { this._renderArchivedSeason(lid, this.viewArchivedSeason.y); return; }

    // Testspiel-Pseudo-Spieltag: zeigt Paarungen statt Tabelle
    if (this.tsView) { document.getElementById('content').innerHTML = this._renderLeagueFriendlies(lid, this.tsView); return; }

    let teamData = Engine.teams;
    let histBadgeMap = null;
    // Badges in einer Historien-Saison = Status der VORSAISON (amtierender Meister/Vize, Auf-/Absteiger,
    // Pokalsieger) – wie in der laufenden Tabelle. Daher Vergleich mit der VORIGEN Snapshot-Saison.
    if (this.viewHistoryOffset !== null && Engine.history[this.viewHistoryOffset]) {
        teamData = Engine.history[this.viewHistoryOffset].teams;
        const hIdx  = this.viewHistoryOffset;
        const hSnap = Engine.history[hIdx];
        const prevSnap = Engine.history[hIdx - 1];                 // Vorsaison
        const prevT = prevSnap ? prevSnap.teams : null;
        const prevPokalW = (prevSnap && prevSnap.pokal && prevSnap.pokal.winner) || null;
        const lvlOf = lg => (Engine.leagues[lg] || {}).level;
        histBadgeMap = {};
        Object.entries(hSnap.teams).forEach(([id, ht]) => {
            const curLvl = lvlOf(ht.leagueId);
            const pt = prevT ? prevT[id] : null;
            const b = [];
            if (pt) {
                const prevLvl = lvlOf(pt.leagueId);
                if (prevLvl != null && curLvl != null && prevLvl !== curLvl) {
                    b.push(prevLvl > curLvl ? 'N' : 'A');         // war tiefer→aufgestiegen, war höher→abgestiegen
                } else {
                    if      (pt.rank === 1) b.push('M');           // amtierender Meister
                    else if (pt.rank === 2) b.push('V');
                    else if (curLvl <= 2 && pt.rank === 16) b.push('R');
                }
            }
            if (prevPokalW && prevPokalW === id) b.push('P');      // amtierender Pokalsieger
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
    // Spiel-Feed (Ergebnisse + Vorschau) sammeln → höhenverstellbarer Container (#md-feed), Reihenfolge nach Priorität
    let feed = '';
    // Klickbarer Teamname im Ergebnis-Feed → Steckbrief
    const nameSpan = (id, label, extra) => id
        ? `<span onclick="event.stopPropagation();App.showSteckbrief('${id}')" style="cursor:pointer;${extra||''}" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${label}</span>`
        : `<span style="${extra||''}">${label}</span>`;
    // Live: laufende Halbzeit (depth 3) – Zwischenstand dieser Liga, oben & hervorgehoben (zählt noch nicht zur Tabelle)
    const live = (Array.isArray(Engine.actionLive) && this.viewHistoryOffset === null && this.matchdayViewIdx === null)
        ? Engine.actionLive.filter(r => r.lid === lid) : [];
    if (live.length) {
        const byName = {}; teams.forEach(t => byName[t.name] = t);
        const wp = nm => { const t = byName[nm], th = t && (t.thumb || GAME_DATA.teams[t.id]?.thumb); return th ? `<img src="${th}" class="res-wp" loading="lazy">` : '<span class="res-wp"></span>'; };
        const liveSlot = Engine.actionState && Engine.actionState.days[Engine.actionState.cursor];
        feed += `<div style="background:var(--row-cur-bg);border-bottom:1px solid var(--border);font-size:13px;">
            <div style="padding:6px 15px 2px;color:var(--c-var-up);font-weight:bold;">⏱ Halbzeit · ${liveSlot ? liveSlot.label : ''}</div>
            <div class="reslist" style="padding:2px 12px 8px;">
                ${live.map(r => `<div class="res-row${this._flashResults && this._flashResults.has(r.home + '|' + r.away) ? ' res-new' : ''}">
                    <span class="res-h">${nameSpan(byName[r.home]?.id, r.home)}${wp(r.home)}</span>
                    <b class="res-sc">${r.hz1}:${r.hz2}</b>
                    <span class="res-a">${wp(r.away)}${nameSpan(byName[r.away]?.id, r.away)}</span>
                </div>`).join('')}
            </div>
        </div>`;
    }
    if (dayResults.length > 0) {
        const rc = this.resultsCollapsed;
        feed += `<div style="background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;">
            <div onclick="App._toggleResults()" style="padding:6px 15px 6px;cursor:pointer;display:flex;align-items:center;justify-content:space-between;user-select:none;">
                <span style="opacity:0.5;">Spieltag ${displayMd}${actDay ? ` · ${actDay}` : ''}</span>
                <span style="font-size:10px;color:var(--muted);">${rc ? '▾ einblenden' : '▴'}</span>
            </div>
            ${!rc ? `<div class="reslist" style="padding:4px 12px 8px;">
                ${(() => {
                    const byName = {}; teams.forEach(t => byName[t.name] = t);
                    const wp = nm => { const t = byName[nm], th = t && (t.thumb || GAME_DATA.teams[t.id]?.thumb); return th ? `<img src="${th}" class="res-wp" loading="lazy">` : '<span class="res-wp"></span>'; };
                    return dayResults.map(r => {
                        const hw = r.score1 > r.score2, aw = r.score2 > r.score1;
                        const nw = this._flashResults && this._flashResults.has(r.home + '|' + r.away) ? ' res-new' : '';
                        return `<div class="res-row${nw}">
                            <span class="res-h">${nameSpan(byName[r.home]?.id, r.home, `color:${hw?'var(--c-win)':aw?'var(--c-fix-down)':'var(--text)'}`)}${wp(r.home)}</span>
                            <b class="res-sc">${r.score1}:${r.score2}</b>
                            <span class="res-a">${wp(r.away)}${nameSpan(byName[r.away]?.id, r.away, `color:${aw?'var(--c-win)':hw?'var(--c-fix-down)':'var(--text)'}`)}</span>
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
        const pwp = id => { const t = byId[id], th = (t && t.thumb) || GAME_DATA.teams[id]?.thumb; return th ? `<img src="${th}" class="res-wp" loading="lazy">` : '<span class="res-wp"></span>'; };
        const rowsFor = ms => ms.map(m => `<div class="res-row prev-row">
                    <span class="res-h">${nameSpan(m.hId, pnm(m.hId))}${pwp(m.hId)}</span>
                    <b class="res-sc">–:–</b>
                    <span class="res-a">${pwp(m.aId)}${nameSpan(m.aId, pnm(m.aId))}</span>
                </div>`).join('');
        const body = up.groups.map(g =>
            (g.day ? `<div style="padding:4px 15px 0;font-size:11px;opacity:0.45;">${g.day}</div>` : '') +
            `<div class="reslist" style="padding:2px 12px 6px;">${rowsFor(g.matches)}</div>`
        ).join('');
        feed += `<div style="background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;">
            <div style="padding:6px 15px 2px;opacity:0.5;">Vorschau · Spieltag ${up.md}</div>${body}</div>`;
    }
    if (feed) {
        const fh = parseInt(localStorage.getItem('ba_mdfeed_h') || '', 10) || 0; // 0 = unbegrenzt (kein Scroll)
        html += `<div class="md-feed" id="md-feed"${fh ? ` style="max-height:${fh}px"` : ''}>${feed}</div><div class="md-feed-resizer" id="md-feed-resizer" title="Höhe ziehen"></div>`;
    }
    const tv = this.tableView;
    const btn = (v, label) => `<button onclick="App.setTableView('${v}')" class="btn" style="padding:4px 12px;font-size:12px;background:${tv===v?'var(--border)':'var(--panel-3)'};color:var(--text);margin-right:4px;">${label}</button>`;
    html += `<div style="padding:6px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);">
        ${btn('gesamt','Gesamt')}${btn('heim','Heim')}${btn('auswaerts','Auswärts')}${btn('ewige','Ewige Tabelle')}${btn('sieger','🏆 Sieger')}${this._leagueHasRelegation(lid) ? btn('relegation','⚔ Relegation') : ''}
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
        this._fillSiegerChronik(lid); // volle Chronik async aus IndexedDB
        this._fitLeagueButtons();
        return;
    }
    if (tv === 'relegation') {
        html += this._renderRelegation(lid);
        document.getElementById('content').innerHTML = html;
        this._fillRelegationChronik(lid); // volle Chronik async aus IndexedDB
        this._fitLeagueButtons();
        return;
    }
    // Spalten mit data-col + (global gemerkter) ziehbarer Breite; jeder Kopf hat einen Resize-Griff (.colrz)
    const cw = this._colWidths();
    const COLS = [
        { id:'pl', label:'Pl.' }, { id:'wp', label:'' }, { id:'team', label:'Mannschaft' },
        { id:'sp', label:'Sp', c:1 }, { id:'g', label:'G', c:1 }, { id:'u', label:'U', c:1 }, { id:'v', label:'V', c:1 },
        { id:'tore', label:'Tore', c:1 }, { id:'diff', label:'Diff', c:1 }, { id:'pkt', label:'Pkt', c:1 }, { id:'form', label:'Form', c:1 }, { id:'info', label:'' }
    ];
    const thHtml = COLS.map(col => {
        const w = cw[col.id];
        const st = w ? `width:${w}px;min-width:${w}px;max-width:${w}px;` : '';
        return `<th class="${col.c?'c ':''}colh" data-col="${col.id}" style="${st}">${col.label}<span class="colrz" title="Breite ziehen · Doppelklick = Standard"></span></th>`;
    }).join('');
    const teamMax = cw.team ? ` style="max-width:${cw.team}px"` : '';
    html += `<table class="ltab"><thead><tr>${thHtml}</tr></thead><tbody>`;

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
        // Archiv-Teams sind lean (ohne regions) → für findTarget aus GAME_DATA anreichern, sonst falsches Auf-/Abstiegs-Routing
        const ft = (t.regions && t.regions.length) ? t : { ...t, regions: (GAME_DATA.teams[t.id] || Engine.teams[t.id] || {}).regions || [] };

        if (l.level === 1) {
            if(rank <= 4) { rowClass = "row-cl"; infoText = "Champions League"; infoCompact = "CL"; infoCol = "var(--c-cl)"; }
            else if(rank === 5) { rowClass = "row-el"; infoText = "Europa League"; infoCompact = "EL"; infoCol = "var(--c-el)"; }
            else if(rank === 6) { rowClass = "row-ecl"; infoText = "Conference League"; infoCompact = "ECL"; infoCol = "var(--c-ecl)"; }
        }

        if (l.level > 1) {
            if (rank <= fixUp) {
                rowClass = "row-fix-up";
                const tgt = Engine.findTarget(ft, l.level - 1, lid);
                infoText = tgt ? `▲ ${tgt.name}` : "▲ Aufstieg"; infoCompact = tgt ? `▲ ${tgt.id}` : "▲"; infoCol = "var(--c-fix-up)";
            } else if (rank <= fixUp + varUp) {
                rowClass = "row-var-up";
                const tgt = Engine.findTarget(ft, l.level - 1, lid);
                infoText = tgt ? `⇄ ${tgt.name}` : "⇄ Relegation"; infoCompact = tgt ? `⇄ ${tgt.id}` : "⇄"; infoCol = "var(--c-var-up)";
            }
        }

        if (revRank <= fixDown) {
            rowClass = "row-fix-down";
            const tgt = Engine.findTarget(ft, l.level + 1, lid);
            infoText = tgt ? `▼ ${tgt.name}` : "▼ Abstieg"; infoCompact = tgt ? `▼ ${tgt.id}` : "▼"; infoCol = "var(--c-fix-down)";
        } else if (revRank <= fixDown + varDown) {
            rowClass = "row-var-down";
            const tgt = Engine.findTarget(ft, l.level + 1, lid);
            infoText = tgt ? `▽ ${tgt.name}` : "▽ Abstieg?"; infoCompact = tgt ? `▽ ${tgt.id}` : "▽"; infoCol = "var(--c-var-down)";
        }

        let rankCls = '';
        if (this._rankBefore && tv === 'gesamt') {
            const old = this._rankBefore[t.id];
            if (old != null && t.rank != null && old !== t.rank) rankCls = t.rank < old ? ' rank-up' : ' rank-down';
        }
        html += `<tr class="${tv==='gesamt' ? rowClass : ''}${rankCls}">
            <td style="text-align:center;font-weight:bold;">${displayRank}.</td>
            <td class="wpc">${(t.thumb || GAME_DATA.teams[t.id]?.thumb) ? `<img src="${t.thumb || GAME_DATA.teams[t.id].thumb}" class="wp" loading="lazy">` : ''}</td>
            <td class="tm"${teamMax}>
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
    this._captureScroll(); // Scroll-Position erhalten → Änderung erscheint an Ort und Stelle, kein Sprung
    // Live-Konferenz: Ränge VOR dem Klick merken → bewegte Teams danach kurz hervorheben (einmalig konsumiert)
    this._rankBefore = {}; Object.values(Engine.teams).forEach(t => { this._rankBefore[t.id] = t.rank; });
    // Pokal-Ansicht muss via showPokal aktualisiert werden (loadLeague rendert '__pokal__' nicht)
    const refresh = () => { this.activeLeague === '__pokal__' ? this.showPokal() : this.loadLeague(this.activeLeague); };
    // Welche Ergebnisse sind durch DIESEN Klick neu? → sie blitzen kurz auf
    const flashStep = res => {
        this._flashResults = new Set();
        if (res && res.phase === 'HZ') (Array.isArray(Engine.actionLive) ? Engine.actionLive : []).forEach(r => this._flashResults.add(r.home + '|' + r.away));
        else if (res && res.day && res.day.results) res.day.results.forEach(r => this._flashResults.add(r.home + '|' + r.away));
    };
    // Laufenden Action-Spieltag IMMER in Action-Schritten zu Ende spielen → Scope-Änderungen greifen erst
    // am nächsten Spieltag (sauber, kein Doppel-Spieltag wenn man mittendrin den Modus umstellt).
    // depth 4: Konferenz-Tag → Echtzeit-Konferenz öffnen statt Sofort-Reveal (commit am Ende der Konferenz)
    const confDay = () => { const d = Engine.actionState && Engine.actionState.days[Engine.actionState.cursor]; return (d && d.conf && !d.played) ? d : null; };
    if (Engine.actionState) {
        const d = confDay(); if (d) { this.startConference(d); return; }
        flashStep(Engine.playActionStep());
        this.triggerAutoSave(); refresh(); this.updateStatus();
        return;
    }
    // Neuer Spieltag: Action-Modus (ein Klick = ein Tag) oder normal (ganzer Spieltag)
    if (this.actionActive()) {
        if (!Engine.startActionMatchday(this.actionCfg)) { alert("Saisonende erreicht."); return; }
        const d = confDay(); if (d) { this.startConference(d); return; }
        flashStep(Engine.playActionStep());
        this.triggerAutoSave(); refresh(); this.updateStatus();
        return;
    }
    if(Engine.playNextMatchday()) {
        this._flashResults = new Set((Engine.matchdayResults || []).map(r => r.home + '|' + r.away));
        this.triggerAutoSave(); refresh(); this.updateStatus();
    }
    else { alert("Saisonende erreicht."); }
},

// Noch nicht gespielte Spiele einer Liga (max. ein Spieltag): im Action-Spieltag die offenen Partien
// (cursor.. + rest), sonst der komplette kommende Spieltag. Nur laufende Live-Ansicht.
_upcomingFixtures: function(lid) {
    if (this.viewHistoryOffset !== null || this.matchdayViewIdx !== null || this.tsView) return null;
    const st = Engine.actionState;
    if (st && st.md != null) {
        // laufender Spieltag: offene Partien dieser Liga, nach Action-Tag gruppiert (Wochentag).
        // Laufende Halbzeit (phase 'HZ') NICHT als Vorschau – steht schon im Live-Block.
        const groups = [];
        for (let i = st.cursor; i < st.days.length; i++) {
            if (st.days[i].phase === 'HZ') continue;
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

// Spiel-Feed (#md-feed) höhenverstellbar: Mittelding zwischen eingeklappt und alles sichtbar.
// Drag-Griff (Maus+Touch), max-height + internes Scrollen, persistiert in ba_mdfeed_h (0 = unbegrenzt).
_initMdFeedResize: function() {
    const feed = document.getElementById('md-feed');
    const rez = document.getElementById('md-feed-resizer');
    if (!feed || !rez || rez.dataset.bound) return;
    rez.dataset.bound = '1';
    const clamp = h => Math.max(60, Math.min(Math.round(window.innerHeight * 0.7), h));
    let startY = 0, startH = 0, active = false;
    const onMove = e => { if (!active) return; feed.style.maxHeight = clamp(startH + (e.clientY - startY)) + 'px'; e.preventDefault(); };
    const onUp = () => {
        if (!active) return;
        active = false; document.body.style.userSelect = '';
        localStorage.setItem('ba_mdfeed_h', parseInt(feed.style.maxHeight, 10) || 0);
        window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
    };
    rez.addEventListener('pointerdown', e => {
        active = true; startY = e.clientY; startH = feed.getBoundingClientRect().height;
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
        e.preventDefault();
    });
    // Doppelklick auf den Griff → zurück auf "alles sichtbar"
    rez.addEventListener('dblclick', () => { feed.style.maxHeight = 'none'; localStorage.setItem('ba_mdfeed_h', 0); });
},

// ── Tabellen-Spaltenbreiten (global, ziehbar) ────────────────────────────
_colWidths: function() { try { return JSON.parse(localStorage.getItem('ba_coltab_w') || '{}') || {}; } catch (e) { return {}; } },
_setColWidth: function(col, w, persist) {
    w = Math.round(Math.max(20, w));
    document.querySelectorAll(`.ltab th[data-col="${col}"]`).forEach(th => { th.style.width = th.style.minWidth = th.style.maxWidth = w + 'px'; });
    if (col === 'team') document.querySelectorAll('.ltab td.tm').forEach(td => { td.style.maxWidth = w + 'px'; });
    if (persist) { const cw = this._colWidths(); cw[col] = w; localStorage.setItem('ba_coltab_w', JSON.stringify(cw)); }
},
_resetColWidth: function(col) { const cw = this._colWidths(); delete cw[col]; localStorage.setItem('ba_coltab_w', JSON.stringify(cw)); this.loadLeague(this.activeLeague); },

// Spaltengriffe (.colrz): Drag = Breite (Maus+Touch), Doppeltipp = Standard. Einmalige Delegation am document.
// (preventDefault auf pointerdown unterdrückt natives dblclick → Doppeltipp selbst erkennen.)
_initColResize: function() {
    if (this._colResizeBound) return;
    this._colResizeBound = true;
    let th = null, startX = 0, startW = 0, col = null, moved = false;
    const onMove = e => { if (!th) return; if (Math.abs(e.clientX - startX) > 2) moved = true; this._setColWidth(col, startW + (e.clientX - startX), false); e.preventDefault(); };
    const onUp = e => {
        if (!th) return;
        const c = col;
        window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
        th = null; document.body.style.userSelect = '';
        if (moved) { this._setColWidth(c, startW + (e.clientX - startX), true); return; }
        // kein Drag → Doppeltipp-Erkennung für Reset
        const now = Date.now(), last = this._colTap;
        if (last && last.col === c && now - last.t < 350) { this._colTap = null; this._resetColWidth(c); }
        else this._colTap = { col: c, t: now };
    };
    document.addEventListener('pointerdown', e => {
        const h = e.target.closest && e.target.closest('.ltab .colrz'); if (!h) return;
        th = h.closest('th'); col = th.dataset.col; startX = e.clientX; startW = th.getBoundingClientRect().width; moved = false;
        document.body.style.userSelect = 'none';
        window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
        e.preventDefault(); e.stopPropagation();
    });
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
    this._initMdFeedResize(); // Spiel-Feed-Höhengriff (in allen loadLeague-Pfaden nach Render aufgerufen)
    this._initColResize();    // Spalten-Breitengriffe (einmalige Delegation)
    this._applyScroll();      // ggf. gemerkte Scroll-Position wiederherstellen (flüssiger Klick)
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

    // Dauerhaftes Archiv (alle abgeschlossenen Saisons) als vollständige Basis.
    // Saison-Stepper rechnet die jüngeren (im 50-Fenster liegenden) Saisons exakt wieder heraus.
    const cloneArchive = () => {
        const et = {};
        const src = (Engine.archive && Engine.archive.ewige && Engine.archive.ewige[lid]) || {};
        for (const [id, a] of Object.entries(src)) et[id] = { ...a };
        return et;
    };
    const accumulate = (et, teams, nextTeams, sign, statsOnly) => {
        Object.entries(teams || {}).forEach(([id, t]) => {
            if (t.leagueId !== lid || !t.stats) return;
            let e = et[id];
            if (!e) e = et[id] = { name: t.name, years:0, p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0, titles:0, promotions:0 };
            if (t.name) e.name = t.name;
            const s = t.stats;
            e.years += sign; e.p += sign*(s.p||0); e.w += sign*(s.w||0); e.d += sign*(s.d||0);
            e.l += sign*(s.l||0); e.gf += sign*(s.gf||0); e.ga += sign*(s.ga||0); e.pts += sign*(s.pts||0);
            if (statsOnly) return; // laufende Saison: keine Titel/Aufstiege werten
            if (t.rank === 1) e.titles += sign;
            const nt = nextTeams && nextTeams[id];
            if (nt && curLevel) {
                const nLvl = (Engine.leagues[nt.leagueId] || {}).level;
                if (nLvl && nLvl < curLevel) e.promotions += sign;
            }
        });
    };
    const tableAsOf = (X) => {
        const et = cloneArchive();
        if (X === null) {
            // laufende, noch nicht abgeschlossene Saison oben drauf (nur Stats)
            const cur = {};
            Object.values(Engine.teams || {}).filter(t => t.leagueId === lid).forEach(t => cur[t.id] = t);
            accumulate(et, cur, null, +1, true);
        } else {
            // Stand NACH Saison X = Archiv minus aller jüngeren Fenster-Saisons
            for (let i = X + 1; i < history.length; i++) {
                const nextTeams = i + 1 < history.length ? history[i + 1].teams : Engine.teams;
                accumulate(et, history[i].teams, nextTeams, -1, false);
            }
        }
        for (const id of Object.keys(et)) if (et[id].years <= 0) delete et[id];
        return et;
    };
    const finalize = (et) => {
        const sorted = Object.entries(et).map(([id, e]) => ({ id, ...e }))
            .sort((a, b) => b.pts-a.pts || (b.gf-b.ga)-(a.gf-a.ga) || b.gf-a.gf || b.years-a.years);
        const ranks = {};
        sorted.forEach((e, i) => ranks[e.id] = i + 1);
        return { sorted, ranks };
    };

    const { sorted, ranks } = finalize(tableAsOf(idx));
    let prevRanks = null;
    if (idx === null)      prevRanks = finalize(cloneArchive()).ranks;        // vor laufender Saison
    else if (idx - 1 >= 0) prevRanks = finalize(tableAsOf(idx - 1)).ranks;

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
            <td class="wpc">${thumb ? `<img src="${thumb}" class="wp" loading="lazy">` : ''}</td>
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
    // Titel-Rangliste DAUERHAFT aus den Summen (ewige.titles) – synchron, sofort sichtbar
    const ewige = (Engine.archive && Engine.archive.ewige && Engine.archive.ewige[lid]) || {};
    const top = Object.entries(ewige).map(([id, e]) => ({
            id, count: e.titles || 0,
            name: (Engine.teams[id] || GAME_DATA.teams[id] || {}).name || e.name,
            thumb: (Engine.teams[id] || GAME_DATA.teams[id] || {}).thumb || null
        })).filter(t => t.count > 0).sort((a, b) => b.count - a.count).slice(0, 7);
    const rankHtml = top.map((v, i) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;">
        <span style="opacity:0.4;width:14px;text-align:right;flex-shrink:0;">${i+1}.</span>
        ${v.thumb?`<img src="${v.thumb}" width="16" height="16" style="object-fit:contain;flex-shrink:0;">`:''}
        <span onclick="App.showSteckbrief('${v.id}')" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${v.name}</span>
        <span style="color:#ffd700;font-weight:bold;flex-shrink:0;">${v.count}×</span>
    </div>`).join('') || '<div style="opacity:0.4;font-size:11px">–</div>';

    const sortBtn = `<button onclick="App._toggleSiegerSort()" class="btn" style="padding:3px 10px;font-size:12px;">${sort === 'desc' ? '▼ Neueste zuerst' : '▲ Älteste zuerst'}</button>`;
    const header = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);"><span id="sieger-count" style="opacity:0.5;font-size:12px;">…</span><div style="flex:1;"></div>${sortBtn}</div>`;

    // Volle Meister-Chronik async aus IndexedDB (Fallback: gekappte Archiv-Chronik) → _fillSiegerChronik nach Insert
    return header + `<div class="statcols">
        <div class="statcols-main"><table><thead><tr><th>Saison</th><th>Sieger</th></tr></thead><tbody id="sieger-chron"><tr><td colspan="2" style="opacity:0.5;padding:12px">Chronik lädt…</td></tr></tbody></table></div>
        <div class="statcols-side">
            <div style="font-size:10px;opacity:0.4;letter-spacing:1px;margin-bottom:8px;">RANGLISTE</div>
            ${rankHtml}
        </div>
    </div>`;
},

// Füllt die Sieger-Chronik async aus IndexedDB (volle Chronik); Fallback: gekappte Engine.archive-Chronik
_fillSiegerChronik: function(lid) {
    const tb = document.getElementById('sieger-chron');
    if (!tb) return;
    const sort = this._siegerSort || 'desc';
    const render = (champs) => {
        if (document.getElementById('sieger-chron') !== tb) return; // Ansicht inzwischen gewechselt
        if (!champs || !champs.length) champs = (Engine.archive && Engine.archive.champions && Engine.archive.champions[lid]) || [];
        const entries = champs.map(c => { const live = Engine.teams[c.id] || GAME_DATA.teams[c.id]; return { season: c.y, id: c.id, name: live?.name || c.id, thumb: live?.thumb || GAME_DATA.teams[c.id]?.thumb || null }; });
        if (Engine.currentMatchday >= Engine.totalMatchdays) {
            const champ = Object.values(Engine.teams).find(t => t.leagueId === lid && t.rank === 1);
            const cur = Engine.getFormattedSeason();
            if (champ && !entries.some(e => e.season === cur)) entries.push({ season: cur, id: champ.id, name: champ.name, thumb: champ.thumb || GAME_DATA.teams[champ.id]?.thumb || null });
        }
        const yr = s => parseInt((s || '').split('/')[0]) || 0;
        entries.sort((a, b) => sort === 'desc' ? yr(b.season) - yr(a.season) : yr(a.season) - yr(b.season));
        const cnt = document.getElementById('sieger-count'); if (cnt) cnt.textContent = entries.length + ' Einträge';
        tb.innerHTML = entries.length
            ? entries.map(e => `<tr><td style="opacity:0.6;white-space:nowrap;">${e.season}</td><td style="display:flex;align-items:center;gap:8px;">${e.thumb?`<img src="${e.thumb}" class="wp-s" loading="lazy">`:''}<span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span></td></tr>`).join('')
            : '<tr><td colspan="2" style="opacity:0.5;padding:12px">Keine Daten</td></tr>';
    };
    if (typeof IDBStore !== 'undefined') IDBStore.getChampions(lid).then(render).catch(() => render(null));
    else render(null);
},

// Hat diese Liga archivierte Relegationsdaten (als Teilnehmer-Herkunft)? → Tab-Button anzeigen
_leagueHasRelegation: function(lid) {
    const rel = (Engine.archive && Engine.archive.relegation) || [];
    return rel.some(snap => snap.results.some(e => e.lH === lid || e.lA === lid || e.lW === lid));
},

// Kompaktes Liga-Kürzel (für enge Labels, z.B. mobile Relegations-Ansicht):
// Top-Ligen → 1./2. BL, 3. L; sonst LEAGUE_SHORT bzw. NAV_GROUP_TAGS-Präfix (Regionalliga→RL …)
_ligaShort: function(lid) {
    if (!lid) return '–';
    if (lid === '1') return '1. BL';
    if (lid === '2') return '2. BL';
    if (lid === '3') return '3. L';
    if (this.LEAGUE_SHORT && this.LEAGUE_SHORT[lid]) return this.LEAGUE_SHORT[lid];
    const nm = (GAME_DATA.leagues[lid] || {}).name || lid;
    const first = nm.split(' ')[0];
    if (this.NAV_GROUP_TAGS && this.NAV_GROUP_TAGS[first]) return nm.replace(first, this.NAV_GROUP_TAGS[first]);
    return nm;
},

// Sonderfälle, wo die "letztes Wort = Stadt"-Heuristik scheitert oder die Stadt mehrdeutig ist
_TEAM_SHORT_OVERRIDE: {
    '1. FC Union Berlin': 'Union', 'Hertha BSC': 'Hertha', 'FC Bayern München': 'Bayern',
    'TSV 1860 München': '1860', 'Hamburger SV': 'Hamburg', 'Karlsruher SC': 'Karlsruhe',
    'Borussia Mönchengladbach': 'Gladbach', 'FC St. Pauli': 'St. Pauli',
},
// Kurzer Teamname für enge Mobil-Labels: Stadt/Kurzform (letztes Wort, Gründungsjahre/Nummern entfernt),
// mit Override für mehrdeutige Fälle. Reserve-Suffix (II/III) bleibt erhalten.
_teamShort: function(id) {
    const nm = (GAME_DATA.teams[id] || {}).name || id;
    if (this._TEAM_SHORT_OVERRIDE[nm]) return this._TEAM_SHORT_OVERRIDE[nm];
    const tok = nm.split(' ');
    let suffix = '';
    if (tok.length > 1 && /^(II|III|IV|U\d+)$/.test(tok[tok.length - 1])) suffix = ' ' + tok.pop();
    while (tok.length > 1 && /^\d+$/.test(tok[tok.length - 1])) tok.pop(); // 04, 05, 96, 1846 …
    return (tok[tok.length - 1] || nm) + suffix;
},

// Relegations-Ansicht: BILANZ (Summen) synchron, Saison-für-Saison-Chronik async aus IndexedDB
_renderRelegation: function(lid) {
    const sort = this._siegerSort || 'desc';
    // BILANZ (ALL-TIME) synchron: Team-Set aus der (gekappten) Chronik, Zahlen aus relStats
    const relS = (Engine.archive && Engine.archive.relStats) || {};
    const capped = (Engine.archive && Engine.archive.relegation) || [];
    const relIds = new Set();
    capped.forEach(s => (s.results || []).forEach(e => { if ((e.lH === lid || e.lA === lid || e.lW === lid) && e.hId && e.aId) { relIds.add(e.hId); relIds.add(e.aId); } }));
    const topRel = [...relIds].map(id => ({ id, played: (relS[id] || {}).played || 0, won: (relS[id] || {}).won || 0, lost: (relS[id] || {}).lost || 0 }))
        .filter(r => r.played > 0).sort((a, b) => b.played - a.played || b.won - a.won).slice(0, 8);
    const relRankHtml = topRel.map((v, i) => {
        const nm = (Engine.teams[v.id] || GAME_DATA.teams[v.id] || {}).name || v.id;
        const th = (Engine.teams[v.id] || GAME_DATA.teams[v.id] || {}).thumb;
        return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;">
            <span style="opacity:0.4;width:14px;text-align:right;flex-shrink:0;">${i+1}.</span>
            ${th?`<img src="${th}" width="16" height="16" style="object-fit:contain;flex-shrink:0;">`:''}
            <span onclick="App.showSteckbrief('${v.id}')" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${nm}</span>
            <span style="flex-shrink:0;font-weight:bold;" title="${v.played} Teilnahmen: ${v.won} gewonnen / ${v.lost} verloren"><span style="color:var(--text)">${v.played}×</span> <span style="color:#4caf50;font-size:11px">${v.won}↑</span> <span style="color:#f44336;font-size:11px">${v.lost}↓</span></span>
        </div>`;
    }).join('');

    const sortBtn = `<button onclick="App._toggleSiegerSort()" class="btn" style="padding:3px 10px;font-size:12px;">${sort === 'desc' ? '▼ Neueste zuerst' : '▲ Älteste zuerst'}</button>`;
    const header = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);"><span id="rel-count" style="opacity:0.5;font-size:12px;">…</span><div style="flex:1;"></div>${sortBtn}</div>`;

    return header + `<div class="statcols">
        <div class="statcols-main" id="rel-chron"><div style="padding:12px;opacity:0.5">Chronik lädt…</div></div>
        <div class="statcols-side">
            <div style="font-size:10px;opacity:0.4;letter-spacing:1px;margin-bottom:8px;">BILANZ (ALL-TIME)</div>
            ${relRankHtml || '<div style="opacity:0.4;font-size:11px">–</div>'}
        </div>
    </div>`;
},

// Füllt die Relegations-Chronik async aus IndexedDB (volle Chronik); Fallback: gekappte Engine.archive-Chronik
_fillRelegationChronik: function(lid) {
    const el = document.getElementById('rel-chron');
    if (!el) return;
    const sort = this._siegerSort || 'desc';
    const mob = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(max-width:768px), (pointer:coarse)').matches;
    const nameOf = id => mob ? this._teamShort(id) : ((Engine.teams[id] || GAME_DATA.teams[id] || {}).name || id);
    const ligaOf = l => this._ligaShort(l);
    const yr = s => parseInt((s || '').split('/')[0]) || 0;
    const teamChip = (id, lFrom) => {
        const thumb = (Engine.teams[id] || GAME_DATA.teams[id] || {}).thumb;
        return `<span onclick="App.showSteckbrief('${id}')" style="display:inline-flex;align-items:center;gap:5px;cursor:pointer;min-width:0" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">`
            + `${thumb?`<img src="${thumb}" width="16" height="16" style="object-fit:contain;flex-shrink:0">`:''}`
            + `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${nameOf(id)}</span>`
            + `<span style="opacity:0.45;font-size:10px;flex-shrink:0">${ligaOf(lFrom)}</span></span>`;
    };
    const render = (rel) => {
        if (document.getElementById('rel-chron') !== el) return; // Ansicht inzwischen gewechselt
        if (!rel || !rel.length) rel = (Engine.archive && Engine.archive.relegation) || [];
        const seasons = rel
            .map(snap => ({ y: snap.y, results: (snap.results || []).filter(e => e.lH === lid || e.lA === lid || e.lW === lid) }))
            .filter(s => s.results.length)
            .sort((a, b) => sort === 'desc' ? yr(b.y) - yr(a.y) : yr(a.y) - yr(b.y));
        const cnt = document.getElementById('rel-count'); if (cnt) cnt.textContent = seasons.length + ' Saison' + (seasons.length === 1 ? '' : 's') + ' mit Relegation';
        if (!seasons.length) { el.innerHTML = '<div style="padding:20px;opacity:0.5;">Noch keine Relegationsdaten (greift ab dieser Version prospektiv).</div>'; return; }
        let body = '';
        seasons.forEach(s => {
            let rows = '';
            s.results.forEach(e => {
                const win = e.winnerId;
                if (e.hId && e.aId) {
                    const homeWin = win === e.hId;
                    const h = `<span style="${homeWin?'color:#ffd700;font-weight:bold':''}">${teamChip(e.hId, e.lH)}</span>`;
                    const a = `<span style="${!homeWin?'color:#ffd700;font-weight:bold':''}">${teamChip(e.aId, e.lA)}</span>`;
                    rows += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:12px;flex-wrap:wrap">
                        <span style="flex:1;min-width:0;display:flex;align-items:center;gap:6px">${h}<span style="opacity:0.4">vs</span>${a}</span>
                        <span style="flex-shrink:0;font-weight:bold;color:var(--text)">${e.result || ''}</span></div>`;
                } else {
                    rows += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:12px">
                        <span style="flex:1;min-width:0;display:flex;align-items:center;gap:6px"><span style="color:#4caf50;font-weight:bold">${teamChip(win, e.lW)}</span></span>
                        <span style="flex-shrink:0;color:var(--muted)">${e.result || e.match || ''}</span></div>`;
                }
            });
            body += `<div style="padding:6px 15px;border-bottom:1px solid var(--border)"><div style="font-size:11px;font-weight:bold;opacity:0.6;margin-bottom:2px">${s.y}</div>${rows}</div>`;
        });
        el.innerHTML = body;
    };
    if (typeof IDBStore !== 'undefined') IDBStore.getRelegation().then(render).catch(() => render(null));
    else render(null);
},

// Read-only Abschlusstabelle einer archivierten Saison (aus IndexedDB season_tables).
// Punkte epochenecht: bis 1994/95 = 2-Punkte (2*s+u), ab 1995/96 = 3-Punkte (3*s+u). Sortierung = hist. rank.
// Era-Vereinsname für eine archivierte Saison (aus HISTORIC_NAMES), sonst null → heutiger Name.
// Vergleich über das Saison-Startjahr (y und from/to sind "YYYY/YY").
_histClubName: function(id, y) {
    if (typeof HISTORIC_NAMES === 'undefined' || !HISTORIC_NAMES[id]) return null;
    const sy = parseInt((y || '').split('/')[0]) || 0;
    for (const e of HISTORIC_NAMES[id]) {
        const from = e.from ? (parseInt(e.from.split('/')[0]) || 0) : -Infinity;
        const to   = e.to   ? (parseInt(e.to.split('/')[0])   || 0) : Infinity;
        if (sy >= from && sy <= to) return e.name;
    }
    return null;
},

_renderArchivedSeason: function(lid, y) {
    const content = document.getElementById('content');
    if (content) content.innerHTML = '<div style="padding:20px;color:var(--muted)">Abschlusstabelle lädt…</div>';
    const py = this._prevSeasonStr(y), ny = this._nextSeasonStr(y);
    // Badges = Status der VORSAISON (amtierender Meister M / Vize V / Aufsteiger N↑ / Absteiger A↓ /
    // Relegations-Überlebender R / Pokalsieger P) – aus Vergleich mit X-1. Zonenfarben dagegen = Ergebnis
    // DIESER Saison (Auf-/Abstieg/Relegation) – aus Vergleich mit X+1. R-Epoche: 1982/83–1990/91 & ab 2008/09.
    const render = (rec, prevInfo, hasPrev, prevCount1, nextLvl, hasNext) => {
        if (this.viewArchivedSeason?.y !== y || this.activeLeague !== lid) return; // Ansicht inzwischen gewechselt
        const c = document.getElementById('content'); if (!c) return;
        if (!rec || !rec.rows || !rec.rows.length) {
            c.innerHTML = `<div style="padding:20px;color:var(--muted)">Für ${y} liegt für diese Liga keine archivierte Abschlusstabelle vor.</div>`;
            if (this._applyScroll) this._applyScroll(); return;
        }
        const sy = parseInt((y || '').split('/')[0]) || 0;
        const twoPt = sy < 1995;
        const lvl = (Engine.leagues[lid] || {}).level || (lid === '1' ? 1 : lid === '2' ? 2 : 99);
        const eraRel = yr => (yr >= 1982 && yr <= 1990) || yr >= 2008; // Bundesliga↔2.BL-Relegation
        const playoffEra = eraRel(sy), prevPlayoff = eraRel(sy - 1);
        // Badge = Vorsaison-Status (Vergleich mit X-1)
        const badgeFor = (r) => {
            const pi = prevInfo[r.id]; const b = [];
            if (hasPrev) {
                if (pi && pi.level !== lvl) b.push(pi.level > lvl ? 'N' : 'A');           // Vorjahr tiefer→aufgestiegen, höher→abgestiegen
                else if (pi && pi.level === lvl) {
                    if (pi.rank === 1) b.push('M');                                       // amtierender Meister/Staffelsieger
                    else if (pi.rank === 2) b.push('V');
                    else if (prevPlayoff && ((lvl === 1 && pi.rank === prevCount1 - 2) || (lvl === 2 && pi.rank === 3))) b.push('R');
                } else if (!pi && lvl === 2) b.push('N');                                 // Vorjahr nicht in 1./2.BL → Aufsteiger aus der 3. Ebene
            }
            if (typeof POKAL_SEED !== 'undefined' && POKAL_SEED[py] === r.id) b.push('P'); // amtierender Pokalsieger
            return b.length ? b : null;
        };
        // Zonenfarbe + Ligapyramiden-Verknüpfung = Ergebnis DIESER Saison (Vergleich mit X+1): wohin auf-/abgestiegen.
        // Zielliga-Name EPOCHENECHT (_tierName): vor 1974 Regionalliga statt 2.BL, tiefer Amateurliga/Oberliga je nach Jahr.
        const COL = { 'row-fix-up': 'var(--c-fix-up)', 'row-fix-down': 'var(--c-fix-down)', 'row-var-up': 'var(--c-var-up)', 'row-var-down': 'var(--c-var-down)' };
        const tname = lv => this._tierName(lv, sy);
        const infoFor = (r, groupCount) => {
            if (!hasNext) return null;
            const nl = nextLvl[r.id];
            if (nl != null && nl < lvl) return { cls: 'row-fix-up', full: `▲ ${tname(nl)}`, compact: `▲ ${nl}` };          // aufgestiegen
            if (nl != null && nl > lvl) return { cls: 'row-fix-down', full: `▼ ${tname(nl)}`, compact: `▼ ${nl}` };        // abgestiegen (erfasste tiefere Liga)
            if (nl == null && lvl <= 2) return { cls: 'row-fix-down', full: `▼ ${tname(lvl + 1)}`, compact: `▼ ${lvl + 1}` }; // in NICHT erfasste tiefere Ebene abgestiegen
            if (nl === lvl && playoffEra && ((lvl === 1 && r.rank === groupCount - 2) || (lvl === 2 && r.rank === 3)))
                return { cls: lvl === 1 ? 'row-var-down' : 'row-var-up', full: '⇄ Relegation', compact: '⇄' };              // Relegation (überlebt)
            return null;
        };
        const BC = { M: '#ffd700', V: '#b0b0b0', N: '#4caf50', A: '#f44336', R: '#ff9800', P: '#9c6af7' };
        const BA = { N: ' ↑', A: ' ↓' };
        const badgeHtml = b => b ? ` <span style="font-size:12px;font-weight:bold;opacity:0.9">(${b.map(x => `<span style="color:${BC[x] || 'var(--text)'}">${x}${BA[x] || ''}</span>`).join(', ')})</span>` : '';

        const rowHtml = (r, i, groupCount) => {
            const pl = r.rank || (i + 1), sp = r.s + r.u + r.n, pts = (twoPt ? 2 : 3) * r.s + r.u, diff = r.gf - r.ga;
            const tdCol = diff > 0 ? 'var(--c-win)' : diff < 0 ? 'var(--c-fix-down)' : 'var(--muted)';
            const nm = this._histClubName(r.id, y) || (Engine.teams[r.id] || GAME_DATA.teams[r.id] || {}).name
                || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[r.id]) || r.id;
            const thumb = (Engine.teams[r.id] || GAME_DATA.teams[r.id] || {}).thumb;
            const badges = badgeFor(r), champ = pl === 1, info = infoFor(r, groupCount);
            const infCell = info
                ? `<span class="itxt">${info.full}</span><span class="iarr" style="color:${COL[info.cls] || 'var(--muted)'}" onclick="App._toggleInfo(this,event)" title="${info.full}" data-c="${info.compact}" data-f="${info.full}">${info.compact}</span>`
                : '';
            return `<tr class="${info ? info.cls : ''}" style="border-bottom:1px solid var(--border);border-left:3px solid ${champ ? '#f0c040' : 'transparent'};">
                <td style="padding:4px 6px;text-align:center;font-weight:bold">${pl}</td>
                <td class="wpc">${thumb ? `<img src="${thumb}" class="wp" loading="lazy">` : ''}</td>
                <td class="tm"><span onclick="App.showSteckbrief('${r.id}')" style="cursor:pointer;${champ ? 'font-weight:bold' : ''}" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${nm}</span>${badgeHtml(badges)}</td>
                <td class="c">${sp}</td><td class="c">${r.s}</td><td class="c">${r.u}</td><td class="c">${r.n}</td>
                <td class="c">${r.gf}:${r.ga}</td><td class="c" style="color:${tdCol}">${diff > 0 ? '+' : ''}${diff}</td>
                <td class="c" style="font-weight:bold">${pts}</td>
                <td class="inf" style="font-size:12px;opacity:0.8;">${infCell}</td></tr>`;
        };
        const head = `<thead><tr><th style="text-align:center">Pl.</th><th></th><th>Mannschaft</th><th class="c">Sp</th><th class="c">S</th><th class="c">U</th><th class="c">N</th><th class="c">Tore</th><th class="c">Diff</th><th class="c">Pkt</th><th></th></tr></thead>`;
        const tableHtml = (rows) => { const sorted = rows.slice().sort((a, b) => (a.rank || 999) - (b.rank || 999)); return `<table class="ltab">${head}<tbody>${sorted.map((r, i) => rowHtml(r, i, sorted.length)).join('')}</tbody></table>`; };
        const isGrouped = rec.rows.some(r => r.g);
        let inner;
        if (isGrouped) {
            const byG = {}; rec.rows.forEach(r => (byG[r.g] = byG[r.g] || []).push(r));
            const labels = ['Nord', 'Süd'].filter(g => byG[g]).concat(Object.keys(byG).filter(g => !['Nord', 'Süd'].includes(g)));
            inner = labels.map(g => `<div style="padding:6px 15px;background:var(--panel-3);border-bottom:1px solid var(--border);font-weight:bold;font-size:13px">Gruppe ${g}</div>${tableHtml(byG[g])}`).join('');
        } else {
            inner = tableHtml(rec.rows);
        }
        c.innerHTML = this._renderArchivedPyramidNav(lid, y)
            + `<div style="padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;color:var(--muted)">📜 Archiv · Abschlusstabelle ${y}${isGrouped ? ' · Nord/Süd' : ''}${twoPt ? ' · 2-Punkte-Ära' : ''}</div>` + inner;
        if (this._applyScroll) this._applyScroll();
    };
    // Vor- (Badges) + Folgesaison (Zonenfarben) laden; deren Fehlen darf die Ansicht nicht killen.
    if (typeof IDBStore === 'undefined') { render(null, {}, false, 0, {}, false); return; }
    const safe = p => p.then(x => x).catch(() => null);
    const get = (yy, ll) => yy ? safe(IDBStore.getSeasonTable(yy, ll)) : Promise.resolve(null);
    Promise.all([IDBStore.getSeasonTable(y, lid), get(py, '1'), get(py, '2'), get(ny, '1'), get(ny, '2')])
        .then(([rec, p1, p2, n1, n2]) => {
            const prevInfo = {}; let hasPrev = false, prevCount1 = 0;
            [['1', p1], ['2', p2]].forEach(([pl, t]) => { if (t && t.rows && t.rows.length) { hasPrev = true; if (pl === '1') prevCount1 = t.rows.length; t.rows.forEach(r => { prevInfo[r.id] = { level: parseInt(pl), rank: r.rank }; }); } });
            const nextLvl = {}; let hasNext = false;
            [['1', n1], ['2', n2]].forEach(([nl, t]) => { if (t && t.rows && t.rows.length) { hasNext = true; t.rows.forEach(r => { nextLvl[r.id] = parseInt(nl); }); } });
            render(rec, prevInfo, hasPrev, prevCount1, nextLvl, hasNext);
        }).catch(() => render(null, {}, false, 0, {}, false));
},

// Vor-/Folgesaison-Label im Stored-Format ("1986/87"↔"1985/86"/"1987/88"; Sonderfall Jahrtausendwende "1999/2000").
_prevSeasonStr: function(y) {
    const sy = parseInt((y || '').split('/')[0]); if (!sy) return null;
    const py = sy - 1;
    return py === 1999 ? '1999/2000' : `${py}/${String(py + 1).slice(-2)}`;
},
_nextSeasonStr: function(y) {
    const sy = parseInt((y || '').split('/')[0]); if (!sy) return null;
    const ny = sy + 1;
    return ny === 1999 ? '1999/2000' : `${ny}/${String(ny + 1).slice(-2)}`;
},

// Epochenechter Liga-Name einer Ebene für ein Saison-Startjahr (deutsche Fußball-Pyramide):
// Ebene 2 war vor 1974/75 die Regionalliga (erst danach 2. Bundesliga); Ebene 3 Amateurliga→Oberliga→
// Regionalliga→3. Liga je nach Epoche. Genutzt in Info-Spalte + Archiv-Navleiste.
_tierName: function(level, year) {
    if (level <= 1) return '1. Bundesliga';
    if (level === 2) return year < 1974 ? 'Regionalliga' : '2. Bundesliga';
    if (level === 3) return year < 1978 ? 'Amateurliga' : year < 1994 ? 'Oberliga' : year < 2008 ? 'Regionalliga' : '3. Liga';
    return 'tiefere Liga';
},

// Liga-Pyramiden-Navleiste für die Archiv-Ansicht (↑ höhere / aktuelle / ↓ tiefere Ebene), epochenechte Namen.
// Navigierbar nur Ebenen mit Archivdaten (1.BL immer ab 1963, 2.BL ab 1974/75); sonst Label (z.B. Regionalliga/Amateurliga).
_renderArchivedPyramidNav: function(lid, y) {
    const sy = parseInt((y || '').split('/')[0]) || 0;
    const curLvl = (Engine.leagues[lid] || {}).level || (lid === '1' ? 1 : 2);
    const hasData = lv => lv === 1 || (lv === 2 && sy >= 1974);
    const cell = (lv, type) => {
        const name = this._tierName(lv, sy);
        const sym = type === 'up' ? '↑ ' : type === 'down' ? '↓ ' : '';
        const bg = type === 'up' ? '#1b5e20' : type === 'down' ? '#b71c1c' : '#546e7a';
        const bord = type === 'curr' ? 'border:2px solid #90caf9;font-weight:bold;' : 'border:2px solid transparent;';
        const base = `flex:1;min-width:0;background:${bg};color:#fff;padding:4px 6px;font-size:10px;border-radius:4px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center;${bord}`;
        if (type !== 'curr' && hasData(lv)) return `<button onclick="App.loadLeague('${lv}')" class="btn" style="${base}">${sym}${name}</button>`;
        const dim = type !== 'curr' && !hasData(lv) ? 'opacity:0.5;' : '';
        return `<div class="btn" style="${base}${dim}cursor:default;" title="${type !== 'curr' && !hasData(lv) ? 'keine Archivdaten' : ''}">${sym}${name}</div>`;
    };
    const row = inner => `<div style="display:flex;margin-bottom:3px;">${inner}</div>`;
    let h = `<div style="background:var(--panel-3);border-bottom:1px solid var(--border);padding:4px 8px;">`;
    if (curLvl > 1) h += row(cell(curLvl - 1, 'up'));
    h += row(cell(curLvl, 'curr'));
    h += `<div style="display:flex;">${cell(curLvl + 1, 'down')}</div>`;
    return h + '</div>';
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

// ── Ligalose Vereine (kein Ligabetrieb): eigene Uebersicht mit Regionen ───────
Object.assign(App, {
showLeagueless: function() {
    this.activeLeague = '__ligalos__';
    localStorage.setItem('ba_lastLeague', '__ligalos__');
    this.tsView = null; this.matchdayViewIdx = null; this.viewHistoryOffset = null; this.ewigeSeasonIdx = null;
    this.renderSidebar();
    document.getElementById('league-title').innerHTML = `<span class="lt-name">Ligalose Vereine</span>`;
    const teams = Object.entries(GAME_DATA.teams)
        .map(([id, t]) => (t.id ? t : { ...t, id }))
        .filter(t => !t.leagueId);
    const byName = this._ligalosSort === 'name';
    teams.sort((a, b) => byName
        ? a.name.localeCompare(b.name, 'de')
        : ((a.regions || []).join(' ').localeCompare((b.regions || []).join(' '), 'de') || a.name.localeCompare(b.name, 'de')));
    const toggle = `<button onclick="App._ligalosToggleSort()" style="background:none;border:1px solid var(--border);border-radius:3px;color:var(--muted);font-size:11px;padding:2px 8px;cursor:pointer;margin-left:8px">Sortierung: ${byName ? 'Name' : 'Region'}</button>`;
    let rows = '', prevG = null;
    for (const t of teams) {
        if (!byName) {
            const g = (t.regions || ['—'])[0];
            if (g !== prevG) { rows += `<div style="font-weight:bold;padding:8px 8px 3px;color:var(--c-gold);font-size:12px;border-bottom:1px solid var(--border)">${g}</div>`; prevG = g; }
        }
        const th = t.thumb || GAME_DATA.teams[t.id]?.thumb;
        const wp = th ? `<img src="${th}" style="height:26px;width:auto;max-width:40px;object-fit:contain;flex-shrink:0" loading="lazy">` : '<span style="width:26px;flex-shrink:0"></span>';
        const regs = (t.regions || []).join(' · ');
        rows += `<div style="display:flex;align-items:center;gap:8px;padding:4px 8px;border-bottom:1px solid var(--border)">${wp}`
            + `<span onclick="App.showSteckbrief('${t.id}')" style="flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${t.name}</span>`
            + `<span style="flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--muted);font-size:11px;text-align:right">${regs}</span></div>`;
    }
    document.getElementById('content').innerHTML =
        `<div style="padding:8px;display:flex;align-items:center;flex-wrap:wrap;font-size:13px;color:var(--muted)">${teams.length} ligalose Vereine (kein Ligabetrieb)${toggle}</div><div>${rows}</div>`;
    this._applyScroll();
},
_ligalosToggleSort: function() {
    this._ligalosSort = this._ligalosSort === 'name' ? 'region' : 'name';
    this.showLeagueless();
},
});
