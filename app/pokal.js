Object.assign(App, {
showPokal: function() {
    this.activeLeague = '__pokal__';
    this.viewArchivedSeason = null; // Pokal hat keine archivierten Liga-Tabellen
    localStorage.setItem('ba_lastLeague', '__pokal__');
    // Aus History lesen wenn Archiv-Modus, sonst aktuellen Pokal
    const histEntry = this.viewHistoryOffset !== null ? Engine.history[this.viewHistoryOffset] : null;
    const pokal = (histEntry?.pokal) || Engine.pokal;
    if (this.viewHistoryOffset === null && Engine.pokal) { Engine.pokal.hasNewResults = false; Engine.saveGame(); }
    this.renderSidebar();
    document.getElementById('league-title').innerHTML = `<img src="${DFB_POKAL_BASE64}"><span class="lt-name">DFB-Pokal</span>`;
    const ewigeTabBtn = `<button onclick="App.switchPokalTab(-2)" class="pokal-tab-btn${this.pokalTab===-2?' active':''}">🏆 Ewige Tabelle</button>`;
    const siegTabBtn  = `<button onclick="App.switchPokalTab(-3)" class="pokal-tab-btn${this.pokalTab===-3?' active':''}">🥇 Sieger</button>`;
    const rekTabBtn   = `<button onclick="App.switchPokalTab(-5)" class="pokal-tab-btn${this.pokalTab===-5?' active':''}">📏 Rekorde</button>`;
    const _extraRoundTabs = p => p ? `<button onclick="App.switchPokalTab(-1)" class="pokal-tab-btn">Teilnehmerfeld</button><button onclick="App.switchPokalTab(-4)" class="pokal-tab-btn">Lostöpfe</button>` + p.rounds.map((r,i)=>`<button onclick="App.switchPokalTab(${i})" class="pokal-tab-btn">${r.name}</button>`).join('') : '';
    if (this.pokalTab === -2) {
        document.getElementById('content').innerHTML = `<div class="pokal-tabs">${ewigeTabBtn}${siegTabBtn}${rekTabBtn}${_extraRoundTabs(pokal)}</div>` + this._renderEwigePokalTabelle();
        this._applyScroll(); return;
    }
    if (this.pokalTab === -5) {
        document.getElementById('content').innerHTML = `<div class="pokal-tabs">${ewigeTabBtn}${siegTabBtn}${rekTabBtn}${_extraRoundTabs(pokal)}</div>` + this._renderPokalRecords();
        this._applyScroll(); return;
    }
    if (this.pokalTab === -3) {
        document.getElementById('content').innerHTML = `<div class="pokal-tabs">${ewigeTabBtn}${siegTabBtn}${rekTabBtn}${_extraRoundTabs(pokal)}</div>` + this._renderPokalSiegerliste();
        this._applyScroll(); return;
    }
    if (!pokal) {
        document.getElementById('content').innerHTML = `<div class="pokal-tabs">${ewigeTabBtn}${siegTabBtn}${rekTabBtn}</div><div style="padding:20px;opacity:0.5;">Kein Pokal aktiv. Starte eine neue Saison via Reset.</div>`;
        return;
    }
    const pThumb = t => t?.thumb || GAME_DATA.teams[t?.id]?.thumb || '';
    const pImg = (t, size) => { const s = pThumb(t); return s ? `<img src="${s}" width="${size}" height="${size}" loading="lazy" style="object-fit:contain;vertical-align:middle;margin-right:4px;flex-shrink:0;">` : ''; };
    const pLiga = t => Engine.leagues[t?.leagueId]?.name || '';
    const teilnehmerBtn = `<button onclick="App.switchPokalTab(-1)" class="pokal-tab-btn${this.pokalTab === -1 ? ' active' : ''}">Teilnehmerfeld</button>`;
    const lostoepfeBtn  = `<button onclick="App.switchPokalTab(-4)" class="pokal-tab-btn${this.pokalTab === -4 ? ' active' : ''}">Lostöpfe</button>`;
    const tabsHtml = ewigeTabBtn + siegTabBtn + rekTabBtn + teilnehmerBtn + lostoepfeBtn + pokal.rounds.map((r, i) => {
        const disabled = !r.played && !r.matches.length;
        return `<button onclick="App.switchPokalTab(${i})" class="pokal-tab-btn${this.pokalTab === i ? ' active' : ''}"${disabled ? ' disabled' : ''}>${r.name}</button>`;
    }).join('');
    let matchHtml = '';
    if (this.pokalTab === -1) {
        // Teilnehmerfeld: nach Qualifikationsgrund gruppiert (Bundesliga / 2.BL / 3.Liga / Vertreter der Landesverbände je Verband)
        // → Liga (aktuelle Saison) steht seitlich am Verein, der Verband ist die Überschrift
        const allIds = [];
        (pokal.rounds[0]?.matches || []).forEach(m => { allIds.push(m.hId, m.aId); });
        const entOf = id => (pokal.entrants && pokal.entrants[id]) || {};
        const teamObj = id => Engine.teams[id] || GAME_DATA.teams[id];
        const prevHistIdx = this.viewHistoryOffset !== null ? this.viewHistoryOffset - 1 : Engine.history.length - 1;
        const prevTeams = Engine.history[prevHistIdx]?.teams || {};
        const prevRank = id => prevTeams[id]?.rank ?? 999;
        const lvlOf = id => Engine.leagues[teamObj(id)?.leagueId]?.level ?? 99;
        const topfBadge = id => {
            const e = entOf(id);
            if (!e.topf) return '';
            const col = e.topf === 1 ? '#7a1a1a' : '#1a3a7a';
            return `<span title="Lostopf" style="flex-shrink:0;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:3px;background:${col};color:#fff;margin-left:2px;white-space:nowrap">T${e.topf}</span>`;
        };
        // Verein-Zeile: Wappen · Name(schrumpfbar) · Liga(seitlich) · Stärke · Topf – nowrap, kein Überlauf auf Mobile
        const teamRow = id => {
            const t = teamObj(id);
            const liga = Engine.leagues[t?.leagueId]?.name || '';
            return `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px;min-width:0">${pImg(t, 18)}<span onclick="App.showSteckbrief('${id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${t?.name || id}</span><span style="flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;opacity:0.5">${liga}</span><span style="flex-shrink:0;font-size:11px;opacity:0.35;">${t?.strength != null ? `(${t.strength})` : ''}</span>${topfBadge(id)}</div>`;
        };
        // Sortierung nach Vorsaison-Platzierung (startRank: Absteiger oben, Aufsteiger ans Ende); Fallback ohne startRank
        const sortKey = id => { const t = teamObj(id); return (t && t.startRank != null) ? t.startRank : (lvlOf(id) * 1000 + prevRank(id)); };
        const group = (heading, ids, sub) => {
            if (!ids.length) return '';
            const ordered = ids.slice().sort((a, b) => sortKey(a) - sortKey(b));
            const hStyle = sub
                ? 'font-size:12px;font-weight:bold;padding:6px 0 2px;'
                : 'font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding:8px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px;';
            return `<div class="pokal-teiln-liga"><div style="${hStyle}">${heading} <span style="opacity:0.5;font-weight:normal">(${ids.length})</span></div>${ordered.map(teamRow).join('')}</div>`;
        };
        const byType = ty => allIds.filter(id => entOf(id).type === ty);
        matchHtml = '<div class="pokal-teiln">';
        matchHtml += group('Bundesliga', byType('BL'));
        matchHtml += group('2. Bundesliga', byType('2BL'));
        matchHtml += group('3. Liga (Top 4)', byType('3L'));
        // Vertreter der Landesverbände → je Verband eine Untergruppe (alphabetisch)
        const vpIds = byType('VP');
        if (vpIds.length) {
            const byVb = {};
            vpIds.forEach(id => { const vb = entOf(id).verband || 'Sonstige'; (byVb[vb] = byVb[vb] || []).push(id); });
            matchHtml += `<div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding:10px 0 4px;border-bottom:1px solid var(--border);margin-bottom:2px;">VERTRETER DER LANDESVERBÄNDE <span style="opacity:0.7;">(${vpIds.length})</span></div>`;
            Object.keys(byVb).sort((a, b) => a.localeCompare(b, 'de')).forEach(vb => { matchHtml += group(vb, byVb[vb], true); });
        }
        // Auffüller (Sim-Artefakt, falls < 64 sportlich qualifiziert)
        const fillIds = allIds.filter(id => { const ty = entOf(id).type; return ty !== 'BL' && ty !== '2BL' && ty !== '3L' && ty !== 'VP'; });
        matchHtml += group('Weitere Qualifikanten', fillIds);
        matchHtml += '</div>';
    } else if (this.pokalTab === -4) {
        matchHtml = this._renderLostoepfe(pokal);
    } else {
        const round = pokal.rounds[this.pokalTab];
        if (!round || (!round.played && !round.matches.length)) {
            matchHtml = '<div style="padding:20px;opacity:0.5;">Diese Runde wurde noch nicht gespielt.</div>';
        } else {
            // Action-Modus: Di/Mi-Wochentag je noch offenem Spiel dieser Runde (für Vorschau-Tag)
            let pokalDayOf = null;
            if (Engine.actionState && this.viewHistoryOffset === null) {
                const pd = Engine.actionState.days.filter(d => d.pokalRound === this.pokalTab);
                if (pd.length) { pokalDayOf = {}; pd.forEach(d => (d.pokalIdx || []).forEach(i => pokalDayOf[i] = d.label)); }
            }
            // Halbzeit-Modus: laufende gestaffelte Zwischenstände dieser Runde (1.HZ→Endstand→Verl.→Elfm.)
            let liveOf = null, liveStage = 0;
            const al = Engine.actionLive;
            if (al && al.pokal && al.round === this.pokalTab && this.viewHistoryOffset === null) {
                liveOf = {}; liveStage = al.stage; (al.live || []).forEach(en => liveOf[en.i] = en);
            }
            // Auffälligste Partie der Runde (Klassensprung/Krimi) → eine Schlagzeile.
            // Spoiler-Sperre: Partien, deren Endstand noch gestaffelt enthüllt wird, sind ausgenommen.
            const spoil = new Set();
            if (liveOf) Object.keys(liveOf).forEach(i => { if (liveStage < liveOf[i].parts.length) spoil.add(+i); });
            const pFeat = this._pokalFeat(round, spoil);
            matchHtml = '<div class="pokal-matches"><div class="pm-header"><span class="pm-home">Heim</span><span class="pm-score"></span><span class="pm-away">Auswärts</span></div>';
            round.matches.forEach((m, mi) => {
                const h = Engine.teams[m.hId], a = Engine.teams[m.aId];
                let hCls = '', aCls = '', score = '– : –', noteHtml = '';
                const en = liveOf && liveOf[mi];
                if (en) {
                    const parts = en.parts, part = parts[Math.min(liveStage, parts.length) - 1], decided = liveStage >= parts.length;
                    hCls = decided ? (en.winner === 'h' ? 'winner' : 'loser') : '';
                    aCls = decided ? (en.winner === 'a' ? 'winner' : 'loser') : '';
                    score = `${part.h} : ${part.a}`;
                    const lbl = part.label + (decided && en.decided === 'pen' ? ' · i.E.' : '');
                    noteHtml = `<div style="font-size:9px;font-weight:normal;color:var(--c-var-up);">${lbl}</div>`;
                } else {
                    const played = m.hGoals != null;          // pro Spiel enthüllen (Di-Ergebnisse sofort sichtbar)
                    hCls = played ? (m.winnerId === m.hId ? 'winner' : 'loser') : '';
                    aCls = played ? (m.winnerId === m.aId ? 'winner' : 'loser') : '';
                    score = played ? `${m.hGoals} : ${m.aGoals}` : '– : –';
                    const decid = played ? (m.nv ? 'n.V.' : m.penalties ? (m.pso ? `${m.pso} i.E.` : 'i.E.') : '') : '';
                    const dayTag = (!played && pokalDayOf && pokalDayOf[mi]) ? pokalDayOf[mi].replace(' (Pokal)', '') : '';
                    if (decid || dayTag) noteHtml = `<div style="font-size:9px;font-weight:normal;color:var(--muted);">${decid || dayTag}</div>`;
                }
                const hl = (pFeat && pFeat.i === mi) ? this._pokalHeadline(m, h, a, pFeat.k) : '';
                const row = `<div class="pokal-match${hl ? ' pm-nb' : ''}">
                    <div class="pm-team pm-home ${hCls}">${pImg(h,18)}<span onclick="App.showSteckbrief('${m.hId}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${h?.name || m.hId}</span><span style="font-size:11px;opacity:0.45;">${h?.strength != null ? ` (${h.strength})` : ''}</span><span class="pm-liga">${pLiga(h)}</span></div>
                    <div class="pm-score">${score}${noteHtml}</div>
                    <div class="pm-team pm-away ${aCls}">${pImg(a,18)}<span onclick="App.showSteckbrief('${m.aId}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${a?.name || m.aId}</span><span style="font-size:11px;opacity:0.45;">${a?.strength != null ? ` (${a.strength})` : ''}</span><span class="pm-liga">${pLiga(a)}</span></div>
                </div>`;
                matchHtml += hl
                    ? `<div class="pm-wrap">${row}<div class="pm-line">🏆 <b>${this._pokalFeatLabel(pFeat.k)}</b> · ${hl}</div></div>`
                    : row;
            });
            matchHtml += '</div>';
        }
    }
    const winnerHtml = pokal.winner ? (() => {
        const wt = Engine.teams[pokal.winner];
        return `<div style="margin:16px;padding:16px;background:var(--win-box-bg);border:2px solid var(--c-gold);border-radius:8px;font-size:18px;font-weight:bold;text-align:center;">🏆 Pokalsieger: <span onclick="App.showSteckbrief('${pokal.winner}')" style="cursor:pointer;text-decoration:underline">${wt?.name || pokal.winner}</span>${wt?.strength != null ? `<span style="font-size:14px;opacity:0.5;"> (${wt.strength})</span>` : ''}</div>`;
    })() : '';
    const roundStatus = (() => {
        if (this.pokalTab < 0) return '';
        const r = pokal.rounds[this.pokalTab];
        if (!r || (!r.played && !r.matches.length)) return '';
        const statusStr = r.played ? '✓ Abgeschlossen' : 'Ausstehend';
        return `<div class="pm-status">${r.name} · ${r.matches.length} Partien · ${statusStr}</div>`;
    })();
    const matchSection = this.pokalTab < 0
        ? `<div style="padding:16px;">${matchHtml}</div>`
        : `<div class="pm-toggle" onclick="App.togglePokalMatches()">
            <span>Ergebnisse (${pokal.rounds[this.pokalTab]?.matches.length || 0} Partien)</span>
            <span class="pm-toggle-arrow ${this.pokalMatchesOpen ? 'open' : ''}">▼</span>
           </div>
           ${this.pokalMatchesOpen ? `<div style="padding:0 16px 16px;">${matchHtml}</div>` : ''}`;
    document.getElementById('content').innerHTML = `
        <div class="pokal-tabs">${tabsHtml}</div>
        ${roundStatus}
        ${matchSection}
        ${winnerHtml}
        <div style="border-top:1px solid var(--border);padding:16px;">
            <div style="font-size:12px;opacity:0.5;margin-bottom:10px;letter-spacing:1px;">BRACKET</div>
            ${this.renderPokalBracket(pokal)}
        </div>`;
    this._applyScroll();
},

switchPokalTab: function(i) { this.pokalTab = i; this.pokalMatchesOpen = true; this.showPokal(); },

// Lostöpfe-Übersicht: 2 Töpfe nach Stärke (kein Nord/Süd – das kennt der DFB-Pokal national nicht)
_renderLostoepfe: function(pokal) {
    if (!pokal || !pokal.entrants) return '<div style="padding:20px;opacity:0.5;">Keine Auslosung vorhanden.</div>';
    const ids = Object.keys(pokal.entrants).filter(id => pokal.entrants[id].topf);
    if (!ids.length) return '<div style="padding:20px;opacity:0.5;">Für diese Saison sind keine Lostöpfe gespeichert (älterer Spielstand).</div>';
    const lvlOf = t => parseInt((t?.leagueId || '99').split('-')[0]) || 99;
    const pThumb = t => t?.thumb || GAME_DATA.teams[t?.id]?.thumb || '';
    const renderTopf = (n, title, desc) => {
        const list = ids.filter(id => pokal.entrants[id].topf === n)
            .map(id => Engine.teams[id] || GAME_DATA.teams[id])
            .filter(Boolean)
            .sort((a, b) => lvlOf(a) - lvlOf(b) || (b.strength || 0) - (a.strength || 0));
        let h = `<div style="flex:1;min-width:240px"><div style="font-weight:bold;font-size:13px;margin-bottom:2px">${title} <span style="opacity:0.5;font-size:11px">(${list.length})</span></div><div style="font-size:11px;opacity:0.5;margin-bottom:8px">${desc}</div>`;
        list.forEach(t => {
            const s = pThumb(t);
            h += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px">${s ? `<img src="${s}" width="18" height="18" style="object-fit:contain;vertical-align:middle;flex-shrink:0">` : ''}<span onclick="App.showSteckbrief('${t.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${t.name}</span><span style="font-size:10px;opacity:0.4">${Engine.leagues[t.leagueId]?.name || ''}</span></div>`;
        });
        return h + '</div>';
    };
    return `<div style="padding:12px">
        <div style="font-size:11px;opacity:0.6;margin-bottom:12px;line-height:1.5">Auslosung 1. Runde: jedes <b>Topf-2</b>-Team (Heimrecht) wird gegen ein zufälliges <b>Topf-1</b>-Team gezogen. Kein Nord/Süd – das gibt es im DFB-Pokal national nicht.</div>
        <div style="display:flex;flex-wrap:wrap;gap:28px">
            ${renderTopf(1, '🟥 Topf 1 – Setzlager', 'Stärkste Hälfte: Bundesliga + beste 2.&nbsp;Bundesliga')}
            ${renderTopf(2, '🟦 Topf 2 – Heimrecht', 'Schwächere Hälfte: schwache 2.BL/3.&nbsp;Liga, Verbandspokalsieger, Amateure')}
        </div></div>`;
},
togglePokalMatches: function() { this.pokalMatchesOpen = !this.pokalMatchesOpen; this.showPokal(); },

_pokalSortBy: function(col) {
    if (!this._pokalSort) this._pokalSort = { col: 'wins', dir: 1 };
    if (this._pokalSort.col === col) this._pokalSort.dir *= -1;
    else { this._pokalSort.col = col; this._pokalSort.dir = 1; }
    this.showPokal();
},

_renderEwigePokalTabelle: function() {
    const history = Engine.history || [];
    const seasonSync = this.viewHistoryOffset !== null;
    const idx = seasonSync ? this.viewHistoryOffset : this.ewigeSeasonIdx;
    const sort = this._pokalSort || { col: 'wins', dir: 1 };

    const computeTable = upToIdx => {
        const et = {};
        const mk = id => { if (!et[id]) et[id] = { wins: 0, seasons: 0, sp: 0, w: 0, d: 0, l: 0 }; };
        const addPokal = (p, sg) => {
            if (!p) return;
            const s = sg || 1;
            const part = new Set();
            (p.rounds[0]?.matches || []).forEach(m => { part.add(m.hId); part.add(m.aId); });
            part.forEach(id => { mk(id); et[id].seasons += s; });
            p.rounds.forEach(round => {
                if (!round.played) return;
                round.matches.forEach(m => {
                    mk(m.hId); mk(m.aId);
                    const draw = m.hGoals === m.aGoals;
                    const hWon = m.winnerId === m.hId;
                    et[m.hId].sp += s; et[m.aId].sp += s;
                    if (draw)      { et[m.hId].d += s; et[m.aId].d += s; }
                    else if (hWon) { et[m.hId].w += s; et[m.aId].l += s; }
                    else           { et[m.aId].w += s; et[m.hId].l += s; }
                });
            });
            if (p.winner) { mk(p.winner); et[p.winner].wins += s; }
        };
        // Basis sind die DAUERHAFTEN Summen (Engine.archive.cups.p, jede je archivierte Saison).
        // Bis v0.8.126 wurde hier nur das 50er-history-Fenster aufaddiert - die "ewige" Tabelle war
        // damit ein rollendes Fenster. Der Saison-Stepper zieht jetzt die juengeren Fenster-Saisons
        // wieder ab, statt die aelteren gar nicht erst zu kennen.
        const perm = (Engine.archive && Engine.archive.cups && Engine.archive.cups.p) || {};
        for (const id in perm) { mk(id); const q = perm[id]; ['wins','seasons','sp','w','d','l'].forEach(k => et[id][k] += (q[k] || 0)); }
        if (upToIdx === null) addPokal(Engine.pokal, 1);
        else for (let i = history.length - 1; i > upToIdx; i--) addPokal(history[i].pokal, -1);
        const rows = Object.entries(et).filter(([, e]) => e.seasons > 0 || e.sp > 0).map(([id, e]) => {
            const t = Engine.teams[id] || GAME_DATA.teams[id];
            const pts = e.w * 3 + e.d;
            return { id, name: t?.name || id, ...e, pts, pps: e.sp > 0 ? pts / e.sp : 0 };
        });
        rows.sort((a, b) => b.wins - a.wins || b.pts - a.pts);
        const ranks = {};
        rows.forEach((e, i) => ranks[e.id] = i + 1);
        return { rows, ranks };
    };

    const { rows, ranks } = computeTable(idx);
    const prevIdx = idx === null ? (history.length > 0 ? history.length - 1 : null) : idx - 1;
    const prevRanks = prevIdx !== null && prevIdx >= 0 ? computeTable(prevIdx).ranks : null;

    // Anwenden der Nutzersortierung
    const fns = {
        wins:    (a,b) => b.wins - a.wins || b.pts - a.pts,
        pts:     (a,b) => b.pts - a.pts,
        pps:     (a,b) => b.pps - a.pps,
        w:       (a,b) => b.w - a.w,
        d:       (a,b) => b.d - a.d,
        l:       (a,b) => b.l - a.l,
        sp:      (a,b) => b.sp - a.sp,
        seasons: (a,b) => b.seasons - a.seasons,
        name:    (a,b) => a.name.localeCompare(b.name),
    };
    rows.sort((a, b) => sort.dir * (fns[sort.col] || fns.wins)(a, b));

    const seasonLabel = i => i === null ? 'Aktuell' : (history[i] ? history[i].year : `Saison ${i + 1}`);
    let out = `<style>
.ptbl .pc-md{display:none}.ptbl .pc-lg{display:none}
@media(min-width:500px){.ptbl .pc-md{display:table-cell}}
@media(min-width:720px){.ptbl .pc-lg{display:table-cell}}
</style>`;

    if (seasonSync) {
        out += `<div style="padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;text-align:center;">
            <span style="opacity:0.85;font-weight:bold;">Stand nach Saison ${seasonLabel(idx)}</span>
            <span style="opacity:0.4;font-size:11px;margin-left:8px;">(folgt Saisonansicht)</span>
        </div>`;
    } else {
        const noPrev = (idx === null && history.length === 0) || idx === 0;
        const noNext = idx === null;
        const db = dis => dis ? ' disabled style="opacity:0.35;cursor:default;"' : '';
        out += `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);font-size:13px;">
            <button onclick="App._ewigeNav(-1)" class="btn" style="padding:3px 10px;"${db(noPrev)}>◀</button>
            <span style="flex:1;text-align:center;opacity:0.85;font-weight:bold;">${seasonLabel(idx)}</span>
            <button onclick="App._ewigeNav(1)" class="btn" style="padding:3px 10px;"${db(noNext)}>▶</button>
        </div>`;
    }

    if (!rows.length) return out + '<div style="padding:20px;opacity:0.5;text-align:center;">Noch keine Pokaldaten vorhanden.</div>';

    const th = (col, label, cls='') => {
        const active = sort.col === col;
        const arrow = active ? (sort.dir === 1 ? ' ▼' : ' ▲') : '';
        return `<th onclick="App._pokalSortBy('${col}')" class="${cls}" style="cursor:pointer;${active?'color:var(--c-link);':''}">${label}${arrow}</th>`;
    };
    out += `<table class="ptbl"><thead><tr>
        <th>Pl.</th><th style="width:28px;"></th><th></th>
        ${th('name','Mannschaft')}
        ${th('wins','🏆')}
        ${th('pts','Pkt.')}
        ${th('w','S','pc-md')}
        ${th('d','U','pc-md')}
        ${th('l','N','pc-md')}
        ${th('pps','Pkt./Sp.','pc-md')}
        ${th('sp','Sp.','pc-lg')}
        ${th('seasons','Sais.','pc-lg')}
    </tr></thead><tbody>`;

    rows.forEach((e, i) => {
        const t = Engine.teams[e.id] || GAME_DATA.teams[e.id];
        const thumb = t?.thumb || null;
        let arrow = '';
        if (prevRanks) {
            const rk = ranks[e.id];
            const pr = prevRanks[e.id];
            if (pr != null) {
                const diff = pr - rk;
                if      (diff > 0) arrow = `<span style="color:#4caf50;font-size:11px;font-weight:bold;">▲${diff}</span>`;
                else if (diff < 0) arrow = `<span style="color:#f44336;font-size:11px;font-weight:bold;">▼${Math.abs(diff)}</span>`;
                else               arrow = `<span style="opacity:0.25;font-size:11px;">—</span>`;
            } else {
                arrow = `<span style="color:var(--c-gold);font-size:10px;font-weight:bold;">NEU</span>`;
            }
        }
        const winsHtml = e.wins > 0 ? `<span style="color:var(--c-gold);font-weight:bold;">${e.wins}</span>` : `<span style="opacity:0.3;">—</span>`;
        out += `<tr>
            <td style="text-align:center;font-weight:bold;">${i + 1}.</td>
            <td style="text-align:center;">${arrow}</td>
            <td class="wpc">${thumb ? `<img src="${thumb}" class="wp" loading="lazy">` : ''}</td>
            <td class="tm"><span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span></td>
            <td style="text-align:center;">${winsHtml}</td>
            <td><b>${e.pts}</b></td>
            <td class="pc-md">${e.w}</td>
            <td class="pc-md">${e.d}</td>
            <td class="pc-md">${e.l}</td>
            <td class="pc-md" style="opacity:0.7;">${e.pps > 0 ? e.pps.toFixed(2) : '—'}</td>
            <td class="pc-lg">${e.sp}</td>
            <td class="pc-lg">${e.seasons}</td>
        </tr>`;
    });
    return out + '</tbody></table>';
},

// Volle Siegerchronik EINES Pokals aus IndexedDB nachladen (Pseudo-Ligen __pokal__/__amateur__).
// Die localStorage-Chronik ist auf ARCHIVE_CHRONIK_CAP Saisons gekappt - erst hiermit wird die
// Siegerliste wirklich unbegrenzt. Ergebnis wird gecacht, das Nachladen rendert die Ansicht neu
// (der Cache verhindert die Endlosschleife).
_fillCupChronik: function(key) {
    this._cupChronik = this._cupChronik || {};
    if (this._cupChronik[key] || typeof IDBStore === 'undefined') return;
    IDBStore.getChampions(key === 'a' ? '__amateur__' : '__pokal__').then(rows => {
        this._cupChronik[key] = rows || [];
        if (rows && rows.length) { key === 'a' ? this.showAmateurpokal() : this.showPokal(); }
    }, () => { this._cupChronik[key] = []; });
},

_renderPokalSiegerliste: function() {
    const sort = this._siegerSort || 'desc';
    const entries = [];
    const seen = new Set();   // Saisons des laufenden Spielstands haben Vorrang vor dem hist. Seed

    // Dauerhafte Siegerchronik (archive.cupChampions.p, auf ARCHIVE_CHRONIK_CAP gekappt) UND das
    // history-Fenster - die Vereinigung ueber das Saisonjahr, damit weder Alt- noch Neustand fehlt.
    // Die vollstaendige Chronik liegt in IndexedDB und wird von _fillCupChronik nachgeladen.
    const addWin = (year, id) => {
        if (!id || seen.has(year)) return;
        const t = Engine.teams[id] || GAME_DATA.teams[id];
        entries.push({ season: year, id, name: t?.name || id, thumb: t?.thumb || null });
        seen.add(year);
    };
    this._fillCupChronik('p');
    ((this._cupChronik && this._cupChronik.p) || []).forEach(c => addWin(c.y, c.id));
    ((Engine.archive?.cupChampions?.p) || []).forEach(c => addWin(c.y, c.id));
    Engine.history.forEach(snap => addWin(snap.year, snap.pokal?.winner));
    if (Engine.pokal?.winner) {
        const id = Engine.pokal.winner;
        const t = Engine.teams[id] || GAME_DATA.teams[id];
        entries.push({ season: Engine.getFormattedSeason(), id, name: t?.name || id, thumb: t?.thumb || null });
        seen.add(Engine.getFormattedSeason());
    }
    // Rückwirkend: historische DFB-Pokal-Sieger (Saisons, die der Spielstand nicht selbst hat).
    // Seed-Wert = teamId (klickbar, mit Wappen) oder Klartextname (alte/ausländische Klubs, nur Anzeige).
    if (typeof POKAL_SEED !== 'undefined') {
        // Seed-Wert = teamId (klickbar, mit Wappen), hist_-Klub (klickbar via HISTORIC_CLUBS) oder Klartext (nur Anzeige)
        const hc = v => (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[v]) || null;
        Object.keys(POKAL_SEED).forEach(season => {
            if (seen.has(season)) return;
            const v = POKAL_SEED[season], t = GAME_DATA.teams[v], h = hc(v);
            entries.push({ season, id: (t || h) ? v : null, name: t ? t.name : (h || v), thumb: t?.thumb || null });
        });
    }

    const yr = s => parseInt((s || '').split('/')[0]) || 0;
    entries.sort((a, b) => sort === 'desc' ? yr(b.season) - yr(a.season) : yr(a.season) - yr(b.season));

    const counts = {};
    entries.forEach(e => { const k = e.id || e.name; if (!counts[k]) counts[k] = { id: e.id, count: 0, name: e.name, thumb: e.thumb }; counts[k].count++; });
    const top = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 7);

    const sortBtn = `<button onclick="App._toggleSiegerSort()" class="btn" style="padding:3px 10px;font-size:12px;">${sort === 'desc' ? '▼ Neueste zuerst' : '▲ Älteste zuerst'}</button>`;
    const header = `<div style="display:flex;align-items:center;gap:8px;padding:8px 15px;background:var(--panel-2);border-bottom:1px solid var(--border);"><span style="opacity:0.5;font-size:12px;">${entries.length} Einträge</span><div style="flex:1;"></div>${sortBtn}</div>`;

    if (!entries.length) return header + '<div style="padding:20px;opacity:0.5;">Noch kein Pokalsieger vorhanden.</div>';

    const rowsHtml = entries.map(e => `<tr>
        <td style="opacity:0.6;white-space:nowrap;">${e.season}</td>
        <td style="display:flex;align-items:center;gap:8px;">${e.thumb?`<img src="${e.thumb}" class="wp-s" loading="lazy">`:''}${e.id?`<span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span>`:`<span style="opacity:0.7">${e.name}</span>`}</td>
    </tr>`).join('');

    const rankHtml = top.map((v, i) => `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:12px;">
        <span style="opacity:0.4;width:14px;text-align:right;flex-shrink:0;">${i+1}.</span>
        ${v.thumb?`<img src="${v.thumb}" width="16" height="16" style="object-fit:contain;flex-shrink:0;">`:''}
        <span ${v.id?`onclick="App.showSteckbrief('${v.id}')" style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;cursor:pointer"`:`style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"`} onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${v.name}</span>
        <span style="color:var(--c-gold);font-weight:bold;flex-shrink:0;">${v.count}×</span>
    </div>`).join('');

    return header + `<div style="display:flex;align-items:flex-start;">
        <div style="flex:1;overflow:hidden;min-width:0;"><table><thead><tr><th>Saison</th><th>Pokalsieger</th></tr></thead><tbody>${rowsHtml}</tbody></table></div>
        <div style="width:170px;flex-shrink:0;padding:12px;border-left:1px solid var(--border);background:var(--panel-3);">
            <div style="font-size:10px;opacity:0.4;letter-spacing:1px;margin-bottom:8px;">REKORDSIEGER</div>
            ${rankHtml}
        </div>
    </div>`;
},

renderPokalBracket: function(pokal) {
    const MATCH_H = 62, R1 = 32;
    const CONTAINER_H = R1 * (MATCH_H + 6);
    const bThumb = t => t?.thumb || GAME_DATA.teams[t?.id]?.thumb || '';
    const bImg = t => { const s = bThumb(t); return s ? `<img src="${s}" width="13" height="13" style="object-fit:contain;vertical-align:middle;margin-right:2px;flex-shrink:0;">` : ''; };
    const lShort = lid => (Engine.leagues[lid]?.name || '').replace('1. Bundesliga','1.BL').replace('2. Bundesliga','2.BL').replace('3. Liga','3.Liga').replace('Regionalliga','RL').replace('Oberliga','OL').replace('liga','L.').replace('Liga','L.');
    let html = `<div style="display:flex;gap:6px;overflow-x:auto;height:${CONTAINER_H}px;padding-bottom:8px;">`;
    pokal.rounds.forEach((round, ri) => {
        const n = Math.pow(2, 5 - ri);
        const spacing = CONTAINER_H / n;
        html += `<div style="flex:0 0 230px;position:relative;height:${CONTAINER_H}px;">`;
        html += `<div style="position:absolute;top:0;left:0;right:0;text-align:center;font-size:10px;opacity:0.45;padding:2px 0;">${round.name}</div>`;
        for (let i = 0; i < n; i++) {
            const top = Math.round(i * spacing + (spacing - MATCH_H) / 2);
            const m = round.matches[i];
            const h = m ? Engine.teams[m.hId] : null;
            const a = m ? Engine.teams[m.aId] : null;
            const played = round.played;
            const hWon = played && m?.winnerId === m?.hId;
            const aWon = played && m?.winnerId === m?.aId;
            const borderCol = played ? 'var(--c-win)' : (m ? 'var(--bracket-bd)' : 'var(--bracket-bd-empty)');
            const decid = played ? (m?.nv ? 'n.V.' : m?.penalties ? 'n.E.' : '') : '';
            const teamRow = (t, id, won, goals) => {
                const nameStyle = won ? 'font-weight:bold;color:var(--c-win);' : played ? 'color:var(--muted);' : '';
                const score = played && goals !== null ? ` <b>${goals}</b>` : '';
                const neMark = won && decid ? ` <span style="font-size:8px;color:var(--muted);font-weight:normal;">${decid}</span>` : '';
                const league = t ? lShort(t.leagueId) : '';
                const str = t?.strength != null ? `<span style="font-size:9px;color:var(--muted);"> (${t.strength})</span>` : '';
                return `<div style="display:flex;align-items:center;gap:2px;white-space:nowrap;overflow:hidden;">
                    ${bImg(t)}<span onclick="App.showSteckbrief('${id}')" style="font-size:10px;overflow:hidden;text-overflow:ellipsis;cursor:pointer;${nameStyle}">${t?.name || (m ? '?' : '')}${score}${neMark}</span>${str}
                </div>
                <div style="font-size:9px;color:var(--muted);padding-left:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${league}</div>`;
            };
            html += `<div style="position:absolute;top:${top}px;left:2px;right:2px;height:${MATCH_H}px;background:var(--bracket-bg);border-radius:3px;border-left:2px solid ${borderCol};padding:4px 5px;box-sizing:border-box;overflow:hidden;">`;
            html += teamRow(h, m?.hId, hWon, m?.hGoals ?? null);
            html += `<div style="height:4px;"></div>`;
            html += teamRow(a, m?.aId, aWon, m?.aGoals ?? null);
            html += '</div>';
        }
        html += '</div>';
    });
    html += '</div>';
    return html;
},

// DFB-Pokal-Weg eines Teams über alle Saisons (History + aktueller Pokal) als HTML – für den Steckbrief.
_teamPokalVerlauf: function(teamId) {
    const ROUND_SHORT = { '1. Runde':'1.R', '2. Runde':'2.R', 'Achtelfinale':'AF', 'Viertelfinale':'VF', 'Halbfinale':'HF', 'Finale':'Finale' };
    const seasons = [];
    const collect = (pokal, year) => {
        if (!pokal || !pokal.rounds) return;
        const matches = [];
        pokal.rounds.forEach(r => {
            (r.matches || []).forEach(m => {
                if (m.hId !== teamId && m.aId !== teamId) return;
                const isH = m.hId === teamId;
                const oppId = isH ? m.aId : m.hId;
                const opp = (typeof Engine !== 'undefined' ? Engine.teams[oppId] : null) || GAME_DATA.teams[oppId];
                matches.push({
                    round: ROUND_SHORT[r.name] || r.name,
                    opp: opp?.name || '?', oppId,
                    gf: r.played ? (isH ? m.hGoals : m.aGoals) : null,
                    ga: r.played ? (isH ? m.aGoals : m.hGoals) : null,
                    won: r.played && m.winnerId === teamId,
                    nv: !!m.nv,
                    pen: !!m.penalties,
                    played: r.played
                });
            });
        });
        if (matches.length) seasons.push({ year, matches, wonCup: pokal.winner === teamId });
    };
    (Engine.history || []).forEach(h => collect(h.pokal, h.year));
    collect(Engine.pokal, Engine.getFormattedSeason ? Engine.getFormattedSeason() : 'Aktuell');
    if (!seasons.length) return '';

    let html = `<div style="border-top:1px solid var(--border);padding-top:6px;margin-top:6px"><div style="font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:4px">DFB-POKAL-VERLAUF</div>`;
    seasons.slice().reverse().forEach(s => {
        const last = s.matches[s.matches.length - 1];
        const badge = s.wonCup ? '🏆 Sieger' : (last && last.played ? (last.won ? '' : 'aus in ' + last.round) : 'läuft');
        html += `<div style="margin-bottom:6px"><div style="display:flex;gap:8px;align-items:baseline;font-size:11px;margin-bottom:2px"><b>${s.year}</b>${badge ? `<span style="color:var(--muted)">${badge}</span>` : ''}</div>`;
        s.matches.forEach(m => {
            const res = m.played ? `${m.gf}:${m.ga}${m.nv ? ' n.V.' : m.pen ? ' n.E.' : ''}` : '–:–';
            const col = !m.played ? 'var(--muted)' : (m.won ? 'var(--c-win)' : 'var(--c-fix-down)');
            html += `<div style="display:flex;gap:6px;font-size:10px;padding:1px 0;color:var(--muted)"><span style="flex:0 0 38px">${m.round}</span><span style="flex:0 0 48px;color:${col};font-weight:bold">${res}</span><span onclick="App.showSteckbrief('${m.oppId}')" style="flex:1;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.opp}</span></div>`;
        });
        html += `</div>`;
    });
    html += '</div>';
    return html;
}

});
