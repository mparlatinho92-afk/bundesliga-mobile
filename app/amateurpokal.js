// ── AMATEURPOKAL ─────────────────────────────────────────────────────────────
// Ansicht des bundesweiten KO-Wettbewerbs der ligalosen Vereine (Engine.amateurpokal). Er ersetzt für sie
// den Ligabetrieb und damit die frühere reine "Ligalose Vereine"-Liste (Teilnehmerfeld-Tab).
// Markup und Klassen sind bewusst vom DFB-Pokal übernommen (pokal-tabs/pokal-matches/pm-*), inkl. Bracket:
// renderPokalBracket rechnet mit 64 Teams → wir übergeben die Runden ab Engine.AMATEUR_BRACKET_ROUND.
Object.assign(App, {

showAmateurpokal: function() {
    this.activeLeague = '__amateur__';
    this.viewArchivedSeason = null;
    localStorage.setItem('ba_lastLeague', '__amateur__');
    const histEntry = this.viewHistoryOffset !== null ? Engine.history[this.viewHistoryOffset] : null;
    const A = (histEntry?.amateurpokal) || Engine.amateurpokal;
    if (this.viewHistoryOffset === null && Engine.amateurpokal) Engine.amateurpokal.hasNewResults = false;
    this.renderSidebar();
    document.getElementById('league-title').innerHTML = `<span class="lt-name">🏅 Amateurpokal</span>`;
    if (this.amateurTab == null) this.amateurTab = -1;
    if (this.amateurMatchesOpen == null) this.amateurMatchesOpen = true;   // wie beim DFB-Pokal aufgeklappt starten

    const tabBtn = (i, label, dis) =>
        `<button onclick="App.switchAmateurTab(${i})" class="pokal-tab-btn${this.amateurTab === i ? ' active' : ''}"${dis ? ' disabled' : ''}>${label}</button>`;
    const fixedTabs = tabBtn(-2, '🏆 Ewige Tabelle') + tabBtn(-3, '🥇 Sieger') + tabBtn(-6, '📏 Rekorde') + tabBtn(-5, '⬆ Aufsteiger') + tabBtn(-1, 'Teilnehmerfeld');
    const roundTabs = A ? A.rounds.map((r, i) => tabBtn(i, r.name, !r.played && !r.matches.length)).join('') : '';
    const tabsHtml = `<div class="pokal-tabs">${fixedTabs}${roundTabs}</div>`;

    if (this.amateurTab === -2) {
        document.getElementById('content').innerHTML = tabsHtml + this._renderEwigeAmateurTabelle();
        this._applyScroll(); return;
    }
    if (this.amateurTab === -3) {
        document.getElementById('content').innerHTML = tabsHtml + this._renderAmateurSiegerliste();
        this._applyScroll(); return;
    }
    if (this.amateurTab === -1) {
        document.getElementById('content').innerHTML = tabsHtml + this._renderAmateurFeld(A);
        this._applyScroll(); return;
    }
    if (this.amateurTab === -6) {
        document.getElementById('content').innerHTML = tabsHtml + this._renderPokalRecords('a');
        this._applyScroll(); return;
    }
    if (!A) {
        document.getElementById('content').innerHTML = tabsHtml + `<div style="padding:20px;opacity:0.5;">Kein Amateurpokal aktiv.</div>`;
        return;
    }
    if (this.amateurTab === -5) {
        document.getElementById('content').innerHTML = tabsHtml + this._renderAmateurAufsteiger(A);
        this._applyScroll(); return;
    }

    const round = A.rounds[this.amateurTab];
    let matchHtml;
    if (!round || (!round.played && !round.matches.length)) {
        matchHtml = '<div style="padding:20px;opacity:0.5;">Diese Runde wurde noch nicht gespielt.</div>';
    } else {
        const pFeat = this._pokalFeat(round, new Set());
        matchHtml = '<div class="pokal-matches"><div class="pm-header"><span class="pm-home">Heim</span><span class="pm-score"></span><span class="pm-away">Auswärts</span></div>';
        round.matches.forEach((m, mi) => {
            matchHtml += this._amateurMatchRow(m, mi, pFeat);
        });
        matchHtml += '</div>';
    }

    // Der Sechzehntelfinal-Tab trägt die eigentliche Pointe des Wettbewerbs → Hinweis direkt darüber.
    const promoNote = this.amateurTab === Engine.AMATEUR_PROMO_ROUND
        ? `<div style="margin:12px 16px 0;padding:10px 12px;background:var(--panel-2);border-left:3px solid var(--c-var-up);border-radius:4px;font-size:12px;line-height:1.5;">
             <b>Aufstiegsrunde.</b> Die ${round?.matches.length || 16} Sieger erreichen das Achtelfinale und steigen zur nächsten Saison in die Bodenliga ihrer Region auf.
             Dort verlässt jeweils der Tabellenletzte die Pyramide.
           </div>` : '';

    const winnerHtml = A.winner ? (() => {
        const wt = Engine.teams[A.winner] || GAME_DATA.teams[A.winner];
        return `<div style="margin:16px;padding:16px;background:var(--win-box-bg);border:2px solid var(--c-gold);border-radius:8px;font-size:18px;font-weight:bold;text-align:center;">🏅 Amateurpokalsieger: <span onclick="App.showSteckbrief('${A.winner}')" style="cursor:pointer;text-decoration:underline">${wt?.name || A.winner}</span></div>`;
    })() : '';

    const r = A.rounds[this.amateurTab];
    const roundStatus = (r && (r.played || r.matches.length))
        ? `<div class="pm-status">${r.name} · ${r.matches.length} Partien · ${r.played ? '✓ Abgeschlossen' : 'Ausstehend'}</div>` : '';

    // Bracket erst ab 64 Teams – davor wären es bis zu 128 Paarungen pro Spalte.
    const bracketRounds = A.rounds.slice(Engine.AMATEUR_BRACKET_ROUND);
    const bracketReady = bracketRounds.length && (bracketRounds[0].played || bracketRounds[0].matches.length);
    const bracketHtml = bracketReady
        ? `<div style="border-top:1px solid var(--border);padding:16px;">
             <div style="font-size:12px;opacity:0.5;margin-bottom:10px;letter-spacing:1px;">BRACKET AB DER 3. RUNDE (64 VEREINE)</div>
             ${this.renderPokalBracket({ rounds: bracketRounds })}
           </div>` : '';

    document.getElementById('content').innerHTML = `
        ${tabsHtml}
        ${promoNote}
        ${roundStatus}
        <div class="pm-toggle" onclick="App.toggleAmateurMatches()">
            <span>Ergebnisse (${r?.matches.length || 0} Partien)</span>
            <span class="pm-toggle-arrow ${this.amateurMatchesOpen ? 'open' : ''}">▼</span>
        </div>
        ${this.amateurMatchesOpen ? `<div style="padding:0 16px 16px;">${matchHtml}</div>` : ''}
        ${winnerHtml}
        ${bracketHtml}`;
    this._applyScroll();
},

switchAmateurTab: function(i) { this.amateurTab = i; this.amateurMatchesOpen = true; this.showAmateurpokal(); },
toggleAmateurMatches: function() { this.amateurMatchesOpen = !this.amateurMatchesOpen; this.showAmateurpokal(); },

// Eine Partie-Zeile. Alle Teilnehmer sind ligalos → statt der Liga steht die Heimatregion an der Zeile.
_amateurMatchRow: function(m, mi, pFeat) {
    const tm = id => Engine.teams[id] || GAME_DATA.teams[id];
    const h = tm(m.hId), a = tm(m.aId);
    const img = t => { const s = t?.thumb || GAME_DATA.teams[t?.id]?.thumb || ''; return s ? `<img src="${s}" width="18" height="18" loading="lazy" style="object-fit:contain;vertical-align:middle;margin-right:4px;flex-shrink:0;">` : ''; };
    const reg = t => (t?.regions && t.regions[t.regions.length - 1]) || '';
    const played = m.hGoals != null;
    const hCls = played ? (m.winnerId === m.hId ? 'winner' : 'loser') : '';
    const aCls = played ? (m.winnerId === m.aId ? 'winner' : 'loser') : '';
    const score = played ? `${m.hGoals} : ${m.aGoals}` : '– : –';
    const decid = played ? (m.nv ? 'n.V.' : m.penalties ? (m.pso ? `${m.pso} i.E.` : 'i.E.') : '') : '';
    const noteHtml = decid ? `<div style="font-size:9px;font-weight:normal;color:var(--muted);">${decid}</div>` : '';
    const side = (t, id, cls) => `<div class="pm-team ${cls}">${img(t)}<span onclick="App.showSteckbrief('${id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${t?.name || id}</span><span style="font-size:11px;opacity:0.45;">${t?.strength != null ? ` (${t.strength})` : ''}</span><span class="pm-liga">${reg(t)}</span></div>`;
    const hl = (pFeat && pFeat.i === mi) ? this._pokalHeadline(m, h, a, pFeat.k) : '';
    const row = `<div class="pokal-match${hl ? ' pm-nb' : ''}">
        ${side(h, m.hId, 'pm-home ' + hCls)}
        <div class="pm-score">${score}${noteHtml}</div>
        ${side(a, m.aId, 'pm-away ' + aCls)}
    </div>`;
    return hl ? `<div class="pm-wrap">${row}<div class="pm-line">🏅 <b>${this._pokalFeatLabel(pFeat.k)}</b> · ${hl}</div></div>` : row;
},

// Teilnehmerfeld = die ligalosen Vereine, nach Landesverband gruppiert. Zeigt zusätzlich die Bodenliga,
// in die ein Aufstieg führen würde – das macht den Wettbewerb erst lesbar.
_renderAmateurFeld: function(A) {
    const teams = Engine.ligalosTeams ? Engine.ligalosTeams() : [];
    if (!teams.length) return '<div style="padding:20px;opacity:0.5;">Keine ligalosen Vereine.</div>';
    const byVb = {};
    teams.forEach(t => { const vb = (t.regions && t.regions[0]) || 'Ohne Region'; (byVb[vb] = byVb[vb] || []).push(t); });
    const img = t => { const s = t?.thumb || ''; return s ? `<img src="${s}" width="18" height="18" loading="lazy" style="object-fit:contain;vertical-align:middle;flex-shrink:0;">` : ''; };
    const promoted = new Set((A && A.promoted) || []);
    let out = `<div style="padding:8px 16px;font-size:12px;color:var(--muted);line-height:1.5;">
        ${teams.length} ligalose Vereine. Sie spielen keinen Ligabetrieb – der Amateurpokal ist ihr Wettbewerb.
        Die 16 Sieger des Sechzehntelfinals steigen in die genannte Bodenliga auf.
    </div><div style="padding:0 16px 16px;">`;
    Object.keys(byVb).sort((a, b) => a.localeCompare(b, 'de')).forEach(vb => {
        const list = byVb[vb].slice().sort((a, b) => (b.strength || 0) - (a.strength || 0) || a.name.localeCompare(b.name, 'de'));
        out += `<div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px;">${vb} <span style="opacity:0.7;font-weight:normal">(${list.length})</span></div>`;
        list.forEach(t => {
            const tgt = Engine.amateurTargetLeagueId ? Engine.amateurTargetLeagueId(t) : null;
            const tgtName = tgt && Engine.leagues[tgt] ? Engine.leagues[tgt].name : '—';
            const up = promoted.has(t.id) ? `<span style="flex-shrink:0;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:3px;background:var(--c-var-up);color:#fff;">AUF</span>` : '';
            out += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px;min-width:0;">
                ${img(t)}
                <span onclick="App.showSteckbrief('${t.id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${t.name}</span>
                <span style="flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;opacity:0.5;">${tgtName}</span>
                <span style="flex-shrink:0;font-size:11px;opacity:0.35;">${t.strength != null ? `(${t.strength})` : ''}</span>${up}
            </div>`;
        });
    });
    return out + '</div>';
},

// Aufsteiger-Tab: die 16 Sieger des Sechzehntelfinals mit ihrer Zielliga – und wer dort weichen muss.
_renderAmateurAufsteiger: function(A) {
    if (!A || !A.promoted || !A.promoted.length)
        return '<div style="padding:20px;opacity:0.5;">Das Sechzehntelfinale ist noch nicht gespielt – die Aufsteiger stehen noch nicht fest.</div>';
    const tm = id => Engine.teams[id] || GAME_DATA.teams[id];
    const byLeague = {};
    A.promoted.forEach(id => {
        const t = tm(id); if (!t) return;
        const tgt = (Engine.amateurTargetLeagueId && !t.leagueId) ? Engine.amateurTargetLeagueId(t) : t.leagueId;
        (byLeague[tgt || '?'] = byLeague[tgt || '?'] || []).push(t);
    });
    const img = t => { const s = t?.thumb || GAME_DATA.teams[t?.id]?.thumb || ''; return s ? `<img src="${s}" width="18" height="18" loading="lazy" style="object-fit:contain;vertical-align:middle;flex-shrink:0;">` : ''; };
    let out = `<div style="padding:8px 16px;font-size:12px;color:var(--muted);line-height:1.5;">
        ${A.promoted.length} Aufsteiger. Je Bodenliga gilt 1:1 – für jeden Aufsteiger verlässt der Tabellenletzte die Pyramide, die Ligagröße bleibt unverändert.
    </div><div style="padding:0 16px 16px;">`;
    Object.keys(byLeague).sort((a, b) => (Engine.leagues[a]?.name || a).localeCompare(Engine.leagues[b]?.name || b, 'de')).forEach(lid => {
        const lg = Engine.leagues[lid];
        const ups = byLeague[lid];
        // Absteiger-Vorschau: die letzten N der aktuellen Tabelle (steht erst nach dem letzten Spieltag fest)
        const table = Object.values(Engine.teams).filter(t => t.leagueId === lid).sort((a, b) => (a.rank || 999) - (b.rank || 999));
        const downs = table.slice(-ups.length);
        out += `<div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px;">${lg?.name || lid}</div>`;
        ups.forEach(t => {
            out += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px;min-width:0;">
                <span style="flex-shrink:0;color:var(--c-var-up);font-weight:bold;">▲</span>${img(t)}
                <span onclick="App.showSteckbrief('${t.id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.name}</span>
            </div>`;
        });
        downs.forEach(t => {
            out += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px;min-width:0;opacity:0.75;">
                <span style="flex-shrink:0;color:var(--c-var-down);font-weight:bold;">▼</span>${img(t)}
                <span onclick="App.showSteckbrief('${t.id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.name}</span>
                <span style="flex-shrink:0;font-size:10px;opacity:0.5;">${t.rank ? t.rank + '.' : ''}</span>
            </div>`;
        });
    });
    return out + '</div>';
},

// Siegerliste (Meisterverlauf) – analog _renderPokalSiegerliste, ohne historischen Seed (den gibt es hier nicht).
_renderAmateurSiegerliste: function() {
    const sort = this._amateurSiegerSort || 'desc';
    const entries = [], seen = new Set();
    // Dauerhafte Chronik (IndexedDB, ungekappt) + gekappte localStorage-Chronik + history-Fenster,
    // vereinigt ueber das Saisonjahr. Vor v0.8.127 zaehlte hier nur das 50er-Fenster.
    const addWin = (year, id) => {
        if (!id || seen.has(year)) return;
        const t = Engine.teams[id] || GAME_DATA.teams[id];
        entries.push({ season: year, id, name: t?.name || id, thumb: t?.thumb || null });
        seen.add(year);
    };
    this._fillCupChronik('a');
    ((this._cupChronik && this._cupChronik.a) || []).forEach(c => addWin(c.y, c.id));
    ((Engine.archive?.cupChampions?.a) || []).forEach(c => addWin(c.y, c.id));
    (Engine.history || []).forEach(snap => addWin(snap.year, snap.amateurpokal?.winner));
    if (Engine.amateurpokal?.winner) addWin(Engine.getFormattedSeason(), Engine.amateurpokal.winner);
    entries.sort((a, b) => String(a.season).localeCompare(String(b.season)));
    if (!entries.length) return '<div style="padding:20px;opacity:0.5;">Noch kein Amateurpokal entschieden.</div>';
    const rec = {};
    entries.forEach(e => { (rec[e.id] = rec[e.id] || { name: e.name, thumb: e.thumb, n: 0 }).n++; });
    const recList = Object.entries(rec).sort((a, b) => b[1].n - a[1].n || a[1].name.localeCompare(b[1].name, 'de'));
    const list = sort === 'desc' ? entries.slice().reverse() : entries;
    let out = `<div style="display:flex;flex-wrap:wrap;gap:24px;padding:16px;">`;
    out += `<div style="flex:2 1 260px;min-width:0;">
        <div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:6px;">
            SIEGER <button onclick="App._toggleAmateurSiegerSort()" style="background:none;border:1px solid var(--border);border-radius:3px;color:var(--muted);font-size:10px;padding:1px 6px;cursor:pointer;margin-left:6px;">${sort === 'desc' ? 'neueste zuerst' : 'älteste zuerst'}</button>
        </div>`;
    list.forEach(e => {
        out += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px;min-width:0;">
            <span style="flex-shrink:0;width:64px;opacity:0.55;font-size:12px;">${e.season}</span>
            ${e.thumb ? `<img src="${e.thumb}" width="18" height="18" loading="lazy" style="object-fit:contain;flex-shrink:0;">` : ''}
            <span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.name}</span>
        </div>`;
    });
    out += `</div><div style="flex:1 1 200px;min-width:0;">
        <div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:6px;">REKORDSIEGER</div>`;
    recList.forEach(([id, r]) => {
        out += `<div style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px;min-width:0;">
            <span style="flex-shrink:0;width:22px;text-align:right;color:var(--c-gold);font-weight:bold;">${r.n}</span>
            ${r.thumb ? `<img src="${r.thumb}" width="18" height="18" loading="lazy" style="object-fit:contain;flex-shrink:0;">` : ''}
            <span onclick="App.showSteckbrief('${id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.name}</span>
        </div>`;
    });
    return out + '</div></div>';
},
_toggleAmateurSiegerSort: function() {
    this._amateurSiegerSort = this._amateurSiegerSort === 'asc' ? 'desc' : 'asc';
    this.showAmateurpokal();
},

// Ewige Amateurpokal-Tabelle – gleiche Rechnung wie _renderEwigePokalTabelle, eigener Sortier-State.
_renderEwigeAmateurTabelle: function() {
    const history = Engine.history || [];
    const sort = this._amateurSort || { col: 'wins', dir: 1 };
    const et = {};
    const mk = id => { if (!et[id]) et[id] = { wins: 0, seasons: 0, sp: 0, w: 0, d: 0, l: 0 }; };
    const addCup = A => {
        if (!A || !A.rounds) return;
        const part = new Set();
        (A.rounds[0]?.matches || []).forEach(m => { part.add(m.hId); part.add(m.aId); });
        (A.byes || []).forEach(id => part.add(id));
        part.forEach(id => { mk(id); et[id].seasons++; });
        A.rounds.forEach(round => {
            if (!round.played) return;
            round.matches.forEach(m => {
                mk(m.hId); mk(m.aId);
                const draw = m.hGoals === m.aGoals;
                const hWon = m.winnerId === m.hId;
                et[m.hId].sp++; et[m.aId].sp++;
                if (draw)      { et[m.hId].d++; et[m.aId].d++; }
                else if (hWon) { et[m.hId].w++; et[m.aId].l++; }
                else           { et[m.aId].w++; et[m.hId].l++; }
            });
        });
        if (A.winner) { mk(A.winner); et[A.winner].wins++; }
    };
    // Basis sind die dauerhaften Summen (Engine.archive.cups.a) - bis v0.8.126 wurde hier nur das
    // 50er-history-Fenster aufaddiert, die "ewige" Tabelle war also ein rollendes Fenster.
    const perm = (Engine.archive && Engine.archive.cups && Engine.archive.cups.a) || {};
    for (const id in perm) { mk(id); const q = perm[id]; ['wins','seasons','sp','w','d','l'].forEach(k => et[id][k] += (q[k] || 0)); }
    addCup(Engine.amateurpokal);   // laufender Wettbewerb, noch nicht archiviert
    let rows = Object.entries(et).map(([id, e]) => {
        const t = Engine.teams[id] || GAME_DATA.teams[id];
        const pts = e.w * 3 + e.d;
        return { id, name: t?.name || id, thumb: t?.thumb || null, ...e, pts, pps: e.sp > 0 ? pts / e.sp : 0 };
    });
    if (!rows.length) return '<div style="padding:20px;opacity:0.5;text-align:center;">Noch keine Amateurpokal-Daten vorhanden.</div>';
    const fns = {
        wins: (a,b) => b.wins - a.wins || b.pts - a.pts,
        pts:  (a,b) => b.pts - a.pts,
        pps:  (a,b) => b.pps - a.pps,
        w:    (a,b) => b.w - a.w,
        d:    (a,b) => b.d - a.d,
        l:    (a,b) => b.l - a.l,
        sp:   (a,b) => b.sp - a.sp,
        seasons: (a,b) => b.seasons - a.seasons,
        name: (a,b) => a.name.localeCompare(b.name, 'de')
    };
    rows.sort((a, b) => sort.dir * (fns[sort.col] || fns.wins)(a, b));
    const th = (col, label, cls = '') => {
        const active = sort.col === col;
        return `<th onclick="App._amateurSortBy('${col}')" class="${cls}" style="cursor:pointer;${active ? 'color:var(--c-link);' : ''}">${label}${active ? (sort.dir === 1 ? ' ▼' : ' ▲') : ''}</th>`;
    };
    let out = `<style>
.ptbl .pc-md{display:none}.ptbl .pc-lg{display:none}
@media(min-width:500px){.ptbl .pc-md{display:table-cell}}
@media(min-width:720px){.ptbl .pc-lg{display:table-cell}}
</style><table class="ptbl"><thead><tr>
        <th>Pl.</th><th style="width:28px;"></th>
        ${th('name','Mannschaft')}${th('wins','🏅')}${th('pts','Pkt.')}
        ${th('w','S','pc-md')}${th('d','U','pc-md')}${th('l','N','pc-md')}
        ${th('pps','Pkt./Sp.','pc-md')}${th('sp','Sp.','pc-lg')}${th('seasons','Sais.','pc-lg')}
    </tr></thead><tbody>`;
    rows.forEach((e, i) => {
        out += `<tr>
            <td style="text-align:center;font-weight:bold;">${i + 1}.</td>
            <td class="wpc">${e.thumb ? `<img src="${e.thumb}" class="wp" loading="lazy">` : ''}</td>
            <td class="tm"><span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span></td>
            <td style="text-align:center;">${e.wins > 0 ? `<span style="color:var(--c-gold);font-weight:bold;">${e.wins}</span>` : '<span style="opacity:0.3;">—</span>'}</td>
            <td><b>${e.pts}</b></td>
            <td class="pc-md">${e.w}</td><td class="pc-md">${e.d}</td><td class="pc-md">${e.l}</td>
            <td class="pc-md" style="opacity:0.7;">${e.pps > 0 ? e.pps.toFixed(2) : '—'}</td>
            <td class="pc-lg">${e.sp}</td><td class="pc-lg">${e.seasons}</td>
        </tr>`;
    });
    return out + '</tbody></table>';
},
_amateurSortBy: function(col) {
    if (!this._amateurSort) this._amateurSort = { col: 'wins', dir: 1 };
    if (this._amateurSort.col === col) this._amateurSort.dir *= -1;
    else { this._amateurSort.col = col; this._amateurSort.dir = 1; }
    this.showAmateurpokal();
},

// Wie weit kam ein Verein in EINEM Amateurpokal? → {reached,won} oder null (nicht dabei gewesen).
// Der Amateurpokal ERSETZT für ligalose Vereine den Ligabetrieb, darum speist das Ergebnis
// dieselbe SAISON-HISTORIE wie eine Ligasaison (App._sbHistRowHtml) statt einer eigenen Liste.
_amateurSeasonResult: function(A, teamId) {
    if (!A || !A.rounds) return null;
    const SHORT = { 'Qualifikation':'Quali', '1. Runde':'1.R', '2. Runde':'2.R', '3. Runde':'3.R', 'Sechzehntelfinale':'S16', 'Achtelfinale':'AF', 'Viertelfinale':'VF', 'Halbfinale':'HF', 'Finale':'Finale' };
    let last = null, out = null;
    A.rounds.forEach(r => {
        if (!r.played) return;
        const m = r.matches.find(x => x.hId === teamId || x.aId === teamId);
        if (!m) return;
        last = r.name;
        if (m.winnerId !== teamId) out = r.name;
    });
    if (!last) return null;
    const won = A.winner === teamId;
    return { reached: won ? 'Sieger' : (out ? (SHORT[out] || out) : (SHORT[last] || last)), won };
}

});
