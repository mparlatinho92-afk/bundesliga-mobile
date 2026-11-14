// ── AMATEURPOKAL ─────────────────────────────────────────────────────────────
// Ansicht des bundesweiten KO-Wettbewerbs der ligalosen Vereine (Engine.amateurpokal). Er ersetzt für sie
// den Ligabetrieb und damit die frühere reine "Ligalose Vereine"-Liste (Teilnehmerfeld-Tab).
// Markup und Klassen sind bewusst vom DFB-Pokal übernommen (pokal-tabs/pokal-matches/pm-*), inkl. Bracket:
// renderPokalBracket rechnet mit 64 Teams → wir übergeben die Runden ab Engine.AMATEUR_BRACKET_ROUND.
Object.assign(App, {

showAmateurpokal: function() {
    if (this.activeLeague !== '__amateur__') this._amaStandAn = false;   // „Stand zeigen“ bei jedem Öffnen wieder aus
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

    // Reiter wie beim DFB-Pokal (App._cupReiter): oben Saison | Ewige Tabelle | Sieger | Rekorde | Aufsteiger, darunter die Runden
    // Sonder-Relegation (-8) nach dem Finale – sie findet auch zeitlich danach statt (Saisonwechsel)
    const runden = A ? [[-1, 'Teilnehmerfeld'], [-7, 'Stand']].concat(A.rounds.map((r, i) => [i, r.name, !r.played && !r.matches.length]), [[-8, 'Sonder-Relegation']]) : [];
    const tabsHtml = this._cupReiter('App.switchAmateurTab', this.amateurTab, [[-2, 'Ewige Tabelle'], [-3, '🏆 Sieger'], [-6, 'Rekorde'], [-5, 'Aufsteiger']], runden);

    if (this.amateurTab === -2) {
        document.getElementById('content').innerHTML = tabsHtml + this._renderEwigeAmateurTabelle();
        this._fitTeamNames(); this._ewRegler('ap-ew');   // Handy: Kürzel + Schieberegler wie die Ewige Tabelle der Ligen
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
    if (this.amateurTab === -7) {
        const ids = this._amaTeilnehmer(A).map(t => t.id);
        document.getElementById('content').innerHTML = tabsHtml + '<div style="padding:16px">' + this._cupStandAnsicht(A, ids, id => { const t = Engine.teams[id]; return (t && Engine._verbandOf && Engine._verbandOf(t)) || ''; }) + '</div>';
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
    if (this.amateurTab === -8) {
        document.getElementById('content').innerHTML = tabsHtml + this._renderAmateurSonder(A);
        this._applyScroll(); return;
    }

    const round = A.rounds[this.amateurTab];
    let matchHtml;
    if (!round || (!round.played && !round.matches.length)) {
        matchHtml = '<div style="padding:20px;opacity:0.5;">Diese Runde wurde noch nicht gespielt.</div>';
    } else {
        const pFeat = this._pokalFeat(round, new Set());
        matchHtml = '<div class="pokal-matches"><div class="pm-header"><span class="pm-home">Heim</span><span class="pm-score"></span><span class="pm-away">Auswärts</span></div>';
        // Termin je Spiel wie beim DFB-Pokal (Engine.amateurAnstoss, gemessene Amateur-Anstoßzeiten), nur laufende Saison:
        // Partien nach Tag/Uhrzeit sortiert, davor Blöcke je Tag und Anstoß (Nutzer 29.10.2026)
        const ans = round.matches.map((m, mi) => this.viewHistoryOffset === null ? Engine.amateurAnstoss(this.amateurTab, mi) : null);
        const reihe = round.matches.map((m, mi) => mi);
        const mitZeit = ans.length && ans.every(Boolean);
        if (mitZeit) reihe.sort((x, y) => Engine._slotSort(ans[x].d, ans[x].t) - Engine._slotSort(ans[y].d, ans[y].t) || x - y);
        let blockTag = '', blockZeit = '';
        reihe.forEach(mi => {
            const at = ans[mi];
            if (mitZeit) {
                const tag = (Engine._DAY_LABEL[at.d] || at.d) + (at.datum ? ', ' + this._pokalTerminText(at, true).slice(3) : '');
                if (tag !== blockTag) { matchHtml += `<div class="pm-tag">${tag}</div>`; blockTag = tag; blockZeit = ''; }
                if (at.t !== blockZeit) { matchHtml += `<div class="pm-zeit">${at.t} Uhr</div>`; blockZeit = at.t; }
            }
            matchHtml += this._amateurMatchRow(round.matches[mi], mi, pFeat);
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
    // Zeitraum der Runde aus den Anstoßterminen ("Sa 08.08. – Mo 10.08."), wie beim DFB-Pokal
    const ts = (r && this.viewHistoryOffset === null) ? r.matches.map((m, i) => Engine.amateurAnstoss(this.amateurTab, i)).filter(a => a && a.datum).sort((a, b) => a.datum - b.datum) : [];
    const tagTxt = a => this._pokalTerminText(a, true);
    const spanne = ts.length ? ' · ' + (tagTxt(ts[0]) === tagTxt(ts[ts.length - 1]) ? tagTxt(ts[0]) : `${tagTxt(ts[0])} – ${tagTxt(ts[ts.length - 1])}`) : '';
    const roundStatus = (r && (r.played || r.matches.length))
        ? `<div class="pm-status">${r.name} · ${r.matches.length} Partien${spanne} · ${r.played ? '✓ Abgeschlossen' : 'Ausstehend'}</div>` : '';

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

// Teilnehmerfeld = die ligalosen Vereine. Zeigt die Bodenliga, in die ein Aufstieg führen würde – das macht den
// Wettbewerb erst lesbar. Seit 05.11.2026 (Fix-Liste „Pokal“): Absteiger der Vorsaison markiert (▼ + Filter), Gruppe
// Regionalverband / Landesverband / keine, Sortierung Stärke / Name; der Stand (Filter „Noch dabei“, Sortierung „Runde“,
// Rundenmarke) nur mit dem Häkchen „Stand zeigen“ – kein Spoiler beim Öffnen.
// Teilnehmer: laufende Saison = die heute ligalosen Vereine; vergangene Saison = wer damals in den Runden stand (auch
// Freilose stehen in der 1. Runde). Vorher lief auch das Archiv über ligalosTeams() – wer seitdem aufstieg, fehlte (Nutzer
// 13.11.2026: Neustadt/Orla im Feld 2100/01). Stärke bleibt die heutige.
_amaTeilnehmer: function(A) {
    if (this.viewHistoryOffset === null || !A) return Engine.ligalosTeams ? Engine.ligalosTeams() : [];
    const ids = new Set();
    (A.rounds || []).forEach(rd => (rd.matches || []).forEach(m => { if (m.hId) ids.add(m.hId); if (m.aId) ids.add(m.aId); }));
    return [...ids].map(id => Engine.teams[id] || GAME_DATA.teams[id]).filter(Boolean);
},
_renderAmateurFeld: function(A) {
    const teams = this._amaTeilnehmer(A);
    if (!teams.length) return '<div style="padding:20px;opacity:0.5;">Keine ligalosen Vereine.</div>';
    const o = this._amaFeld = Object.assign({ zeigen: 'alle', gruppe: 'rv', sort: 'staerke' }, this._amaFeld);
    const an = !!this._amaStandAn && !!A;
    if (!an && o.zeigen === 'drin') o.zeigen = 'alle';
    if (!an && o.sort === 'runde') o.sort = 'staerke';
    const prevIdx = this.viewHistoryOffset !== null ? this.viewHistoryOffset - 1 : Engine.history.length - 1;
    const vor = (Engine.history[prevIdx] || {}).teams || {};
    const abVon = id => (vor[id] && vor[id].leagueId) || null;   // vorige Saison noch in einer Liga = Absteiger
    const st = {}; if (an) teams.forEach(t => st[t.id] = this._cupStand(A, t.id));
    const drin = t => !(st[t.id] && st[t.id].aus);
    const nAb = teams.filter(t => abVon(t.id)).length, nDrin = an ? teams.filter(drin).length : 0;
    const img = t => { const s = t?.thumb || ''; return s ? `<img src="${s}" width="18" height="18" loading="lazy" style="object-fit:contain;vertical-align:middle;flex-shrink:0;">` : ''; };
    const promoted = new Set((A && A.promoted) || []), nachr = new Set((A && A.nachrueck) || []);
    const knopf = (feld, wert, text) => `<button onclick="App._amaFeldSet('${feld}','${wert}')" class="btn" style="padding:3px 10px;font-size:12px;background:${o[feld] === wert ? 'var(--border)' : 'var(--panel-3)'};color:var(--text);white-space:nowrap">${text}</button>`;
    const leiste = (label, knoepfe) => `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:3px 0"><span style="font-size:11px;color:var(--muted);min-width:68px">${label}</span>${knoepfe.join('')}</div>`;
    const q = A && A.rounds && A.rounds[0] && A.rounds[0].name === 'Qualifikation' ? (A.rounds[0].matches || []).length : 0;
    let out = `<div style="padding:8px 16px 0;font-size:12px;color:var(--muted);line-height:1.5;">
        ${teams.length} ligalose Vereine, davon <b style="color:var(--text)">${nAb} Absteiger</b> der Vorsaison (▼). Sie spielen keinen Ligabetrieb – der Amateurpokal ist ihr Wettbewerb.
        Die 16 Sieger des Sechzehntelfinals steigen in die genannte Bodenliga auf.
        <details style="margin-top:4px"><summary style="cursor:pointer;color:var(--c-link)">Wer muss in die Qualifikation?</summary>
        <div style="padding:4px 0 2px">Setzliste nach Stärke: Die 1. Runde braucht eine Zweierpotenz an Vereinen (${1 << Math.floor(Math.log2((A && A.field) || teams.length))}). Bei ${(A && A.field) || teams.length} Vereinen
        spielen die schwächsten ${q ? q * 2 : 'überzähligen'} in der Qualifikation${q ? ` (${q} Spiele)` : ''} um die letzten Plätze, alle anderen haben ein Freilos.
        Frisch Abgestiegene sind dadurch praktisch nie in der Qualifikation.</div></details>
    </div><div style="padding:8px 16px 0">${this._cupStandHaken('ama', an)}`;
    out += leiste('Zeigen', [knopf('zeigen', 'alle', `Alle ${teams.length}`)].concat(an ? [knopf('zeigen', 'drin', `Noch dabei ${nDrin}`)] : []).concat([knopf('zeigen', 'ab', `▼ Absteiger ${nAb}`)]));
    out += leiste('Gruppe', [knopf('gruppe', 'rv', 'Regionalverband'), knopf('gruppe', 'lv', 'Landesverband'), knopf('gruppe', 'keine', 'keine')]);
    out += leiste('Sortierung', [knopf('sort', 'staerke', 'Stärke')].concat(an ? [knopf('sort', 'runde', 'Runde')] : []).concat([knopf('sort', 'name', 'Name')]));
    out += `</div><div style="padding:0 16px 16px;">`;
    const liste = teams.filter(t => o.zeigen === 'ab' ? abVon(t.id) : o.zeigen === 'drin' ? drin(t) : true);
    const tiefe = t => { const s = st[t.id]; return s && s.sieg ? 99 : s && s.aus ? s.r : 50 + this._cupNaechste(A, s); };
    const cmp = o.sort === 'name' ? (a, b) => a.name.localeCompare(b.name, 'de')
        : o.sort === 'runde' ? (a, b) => tiefe(b) - tiefe(a) || (b.strength || 0) - (a.strength || 0)
        : (a, b) => (b.strength || 0) - (a.strength || 0) || a.name.localeCompare(b.name, 'de');
    const grp = t => o.gruppe === 'keine' ? '' : o.gruppe === 'lv' ? ((Engine._verbandOf && Engine._verbandOf(t)) || 'Ohne Verband') : (this._regionalverband(t) || 'Ohne Verband');   // echter Regionalverband statt Regionalliga-Gebiet (regions[0])
    const byVb = {};
    liste.forEach(t => { const k = grp(t); (byVb[k] = byVb[k] || []).push(t); });
    if (!liste.length) out += `<div style="padding:12px 0;opacity:0.5">Keine Vereine.</div>`;
    Object.keys(byVb).sort((a, b) => a.localeCompare(b, 'de')).forEach(vb => {
        const list = byVb[vb].slice().sort(cmp);
        out += `<div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding:10px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px;">${o.gruppe === 'rv' ? this._rvLogo(vb, 16) : ''}${vb || 'ALLE'} <span style="opacity:0.7;font-weight:normal">(${list.length})</span></div>`;
        list.forEach(t => {
            const tgt = Engine.amateurTargetLeagueId ? Engine.amateurTargetLeagueId(t) : null;
            const tgtName = tgt && Engine.leagues[tgt] ? Engine.leagues[tgt].name : '—';
            const up = promoted.has(t.id) ? `<span style="flex-shrink:0;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:3px;background:var(--c-var-up);color:#fff;">AUF</span>`
                : nachr.has(t.id) ? `<span title="Nachrücker für einen Zwangsabsteiger – ohne Pokalplatz in die Liga" style="flex-shrink:0;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:3px;border:1px solid var(--c-var-up);color:var(--c-var-up);">NR</span>` : '';
            const ab = abVon(t.id);
            const abz = ab ? `<span title="Absteiger der Vorsaison aus ${(Engine.leagues[ab] || {}).name || ab}" style="flex-shrink:0;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:3px;background:var(--c-fix-down);color:#fff;white-space:nowrap">▼ ${this._nameKurz ? this._nameKurz(ab) : ab}</span>` : '';
            out += `<div style="display:flex;align-items:center;gap:6px;padding:4px 0;font-size:13px;min-width:0;${an && !drin(t) ? 'opacity:0.5;' : ''}">
                ${img(t)}
                <span onclick="App.showSteckbrief('${t.id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${t.name}</span>
                ${an ? '' : `<span style="flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;opacity:0.5;">${tgtName}</span>`}
                ${abz}<span style="flex-shrink:0;font-size:11px;opacity:0.35;">${t.strength != null ? `(${t.strength})` : ''}</span>${up}${an ? this._cupStandPill(A, t.id) : ''}
            </div>`;
        });
    });
    return out + '</div>';
},
_amaFeldSet: function(feld, wert) { this._amaFeld = Object.assign({}, this._amaFeld, { [feld]: wert }); this.showAmateurpokal(); },

// Reiter „Sonder-Relegation“ (Nutzer 14.11.2026): je Bodenliga, in der ein Zwangsabsteiger/Rückzieher ins Ligalose einen Platz frei
// machte und kein Amateurpokal-Aufsteiger hinkam, spielen die im Pokal am weitesten gekommenen Ligalosen derselben Heimat
// (Engine._sonderRelegation, Daten A.sonder im Saison-Schnappschuss). Ohne „Stand zeigen“ nur Feld + Paarungen (kein Spoiler),
// mit Häkchen Umschalter Halbfinale | Finale | Endstand.
_SR_ART: { zwang: 'Zwangsabstieg aus', zg: 'Rückzug während der Saison aus', platz: 'gibt den Platz an die Erste ab –' },
_amaSonderSet: function(w) { this._amaSonderZeige = w; this.showAmateurpokal(); },
_renderAmateurSonder: function(A) {
    const SR = (A && A.sonder) || [];
    const hinweis = t => `<div style="padding:16px;font-size:13px;line-height:1.5;color:var(--muted)">${t}</div>`;
    const regel = `<details style="margin-top:6px"><summary style="cursor:pointer;color:var(--c-link)">Wie funktioniert die Sonder-Relegation?</summary>
        <div style="padding:4px 0 2px">Steigt ein Verein aus nicht-sportlichen Gründen ins Ligalose ab (Zwangsabstieg, Rückzug) und kommt kein Amateurpokal-Aufsteiger in seine Bodenliga,
        spielen die Ligalosen derselben Heimat um den freien Platz, die im Amateurpokal am weitesten kamen. Bei gleicher Runde zählt das Ausscheidungsspiel
        (i.E. vor knapper vor hoher Niederlage), dann das Los. Ein Platz: Halbfinale und Finale. Mehrere Plätze: nur so viele Spiele wie nötig, die Besten steigen direkt auf.</div></details>`;
    if (!SR.length) {
        const alt = (A && A.nachrueck) || [];
        if (alt.length) return hinweis(`In dieser Saison rückten ${alt.length} Vereine nach dem früheren Verfahren (nach Stärke) für Zwangsabsteiger nach – eine Sonder-Relegation gab es noch nicht. Sie stehen im Reiter „Aufsteiger“.${regel}`);
        const live = this.viewHistoryOffset === null;
        return hinweis((live ? 'Die Sonder-Relegation wird beim Saisonwechsel nach dem Finale ausgespielt – erst dann steht fest, welche Plätze frei sind. Die Spiele vergangener Saisons stehen in deren Amateurpokal.'
            : 'In dieser Saison gab es keine Sonder-Relegation: Jeder frei gewordene Platz wurde über den Amateurpokal-Aufstieg ausgeglichen.') + regel);
    }
    const an = !!this._amaStandAn;
    const zeige = this._amaSonderZeige || 'hf';
    const tm = id => Engine.teams[id] || GAME_DATA.teams[id];
    const img = t => { const s = t?.thumb || GAME_DATA.teams[t?.id]?.thumb || ''; return s ? `<img src="${s}" width="18" height="18" loading="lazy" style="object-fit:contain;vertical-align:middle;flex-shrink:0;">` : '<span style="width:18px;flex-shrink:0"></span>'; };
    const lname = lid => (Engine.leagues[lid] || {}).name || lid;
    const knopf = (w, t) => `<button onclick="App._amaSonderSet('${w}')" class="btn" style="padding:3px 10px;font-size:12px;background:${zeige === w ? 'var(--border)' : 'var(--panel-3)'};color:var(--text);white-space:nowrap">${t}</button>`;
    const nAuf = SR.reduce((s, x) => s + x.auf.length, 0);
    let out = `<div style="padding:8px 16px 0;font-size:12px;color:var(--muted);line-height:1.5;">${SR.length} Sonder-Relegation${SR.length > 1 ? 'en' : ''} nach dem Finale, ${nAuf} Aufsteiger. Gespielt beim Saisonwechsel, Einzelspiel mit Verlängerung und Elfmeterschießen.${regel}</div>
        <div style="padding:8px 16px 0">${this._cupStandHaken('ama', an)}${an ? `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;padding:3px 0"><span style="font-size:11px;color:var(--muted);min-width:68px">Zeigen</span>${knopf('hf', 'Halbfinale')}${knopf('f', 'Finale')}${knopf('end', 'Endstand')}</div>` : ''}</div>
        <div style="padding:0 16px 16px">`;
    const kopf = t => `<div style="font-size:11px;font-weight:bold;opacity:0.55;letter-spacing:1px;padding:12px 0 4px">${t}</div>`;
    SR.forEach(sr => {
        const auf = new Set(sr.auf);
        out += `<div style="margin-top:14px;padding:10px 12px;background:var(--panel-2);border-left:3px solid var(--c-var-up);border-radius:4px;min-width:0">
            <div style="font-weight:bold;font-size:14px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${lname(sr.lid)} <span style="font-weight:normal;font-size:12px;color:var(--muted)">· ${sr.frei} ${sr.frei > 1 ? 'Plätze' : 'Platz'} frei</span></div>
            <div style="font-size:12px;color:var(--muted);line-height:1.5;padding-top:2px">Frei durch: ${(sr.ausl || []).map(a => `<span onclick="App.showSteckbrief('${a.id}')" style="cursor:pointer;color:var(--text)">${tm(a.id)?.name || a.id}</span> (${this._SR_ART[a.art] || 'Abgang aus'} ${lname(a.lid)})`).join(' · ') || '–'}${sr.ap ? ` · ${sr.ap} weitere${sr.ap > 1 ? '' : 'r'} Platz über den Amateurpokal-Aufstieg ausgeglichen` : ''}${sr.nb ? '<br>Keine Ligalosen aus dieser Staffel – Kandidaten aus der Nachbarstaffel.' : ''}</div>`;
        // Feld mit Auswahlgrund
        out += kopf(`TEILNEHMER (${sr.kand.length})`);
        sr.kand.forEach((c, i) => {
            const t = tm(c.id), geg = c.g ? (tm(c.g)?.name || c.g) : '';
            const grund = c.r ? `Aus ${c.r} · ${c.e}${c.x === 'ie' ? ' i.E.' : c.x === 'nv' ? ' n.V.' : ''} gegen ${geg}` : 'ohne Spiel im Amateurpokal';
            const mark = an && zeige === 'end' ? (auf.has(c.id) ? '<span style="flex-shrink:0;color:var(--c-var-up);font-weight:bold">↗</span>' : '<span style="flex-shrink:0;opacity:0.35">·</span>') : '';
            out += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px;min-width:0;${an && zeige === 'end' && !auf.has(c.id) ? 'opacity:0.6' : ''}">
                <span style="flex-shrink:0;width:16px;text-align:right;font-size:11px;opacity:0.5">${i + 1}.</span>${mark}${img(t)}
                <span style="display:flex;flex-direction:column;flex:1 1 auto;min-width:0">
                    <span onclick="App.showSteckbrief('${c.id}')" style="cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t?.name || c.id}</span>
                    <span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--muted)">${grund}</span>
                </span>
            </div>`;
        });
        const hf = sr.spiele.filter(m => m.r === 'Halbfinale'), fi = sr.spiele.filter(m => m.r === 'Finale');
        const direkt = sr.auf.filter(id => !sr.spiele.some(m => m.hId === id || m.aId === id));
        const zeilen = ms => `<div class="pokal-matches">${ms.map((m, i) => this._amateurMatchRow(an ? m : Object.assign({}, m, { hGoals: null, aGoals: null, winnerId: null }), i, null)).join('')}</div>`;
        if (!an) {   // ohne Stand: nur Paarungen, nichts Entschiedenes
            if (direkt.length) out += kopf('STEIGEN DIREKT AUF') + `<div style="font-size:12px">${direkt.map(id => tm(id)?.name || id).join(' · ')}</div>`;
            if (hf.length) out += kopf('HALBFINALE') + zeilen(hf);
            if (fi.length) out += kopf('FINALE') + (hf.length && sr.frei === 1 ? '<div style="font-size:12px;color:var(--muted)">' + (hf.length === 1 ? 'Sieger des Halbfinals gegen den Ersten des Felds (Freilos)' : 'Sieger der beiden Halbfinals') + '</div>' : zeilen(fi));
            if (!sr.spiele.length && !direkt.length) out += '<div style="font-size:12px;color:var(--muted)">Keine Kandidaten.</div>';
        } else if (zeige === 'hf') {
            out += kopf('HALBFINALE') + (hf.length ? zeilen(hf) : `<div style="font-size:12px;color:var(--muted)">Kein Halbfinale nötig${direkt.length ? ' – direkt auf: ' + direkt.map(id => tm(id)?.name || id).join(' · ') : ''}.</div>`);
        } else if (zeige === 'f') {
            out += kopf('FINALE') + (fi.length ? zeilen(fi) : `<div style="font-size:12px;color:var(--muted)">Kein Finale nötig – ${sr.frei > 1 ? 'die Halbfinalsieger steigen auf' : 'Aufstieg ohne Spiel'}.</div>`);
        } else {
            out += kopf(`AUFSTEIGER (${sr.auf.length})`) + sr.auf.map(id => { const t = tm(id), w = sr.spiele.slice().reverse().find(m => m.hId === id || m.aId === id);   // letztes Spiel = gewonnenes
                return `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px;min-width:0"><span style="flex-shrink:0;color:var(--c-var-up);font-weight:bold">↗</span>${img(t)}<span style="display:flex;flex-direction:column;flex:1 1 auto;min-width:0"><span onclick="App.showSteckbrief('${id}')" style="cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t?.name || id}</span><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:11px;color:var(--muted)">${w ? (w.r === 'Finale' ? 'Finalsieger' : 'Sieger ' + w.r) : 'direkt'} → ${lname(sr.lid)}</span></span></div>`; }).join('')
                + (sr.auf.length < sr.frei ? `<div style="font-size:12px;color:var(--muted)">${sr.frei - sr.auf.length} Platz/Plätze blieben frei – zu wenige Kandidaten.</div>` : '');
        }
        out += '</div>';
    });
    return out + '</div>';
},

// Aufsteiger-Tab: die 16 Sieger des Sechzehntelfinals mit ihrer Zielliga – und wer dort weichen muss.
_renderAmateurAufsteiger: function(A) {
    if (!A || !A.promoted || !A.promoted.length)
        return '<div style="padding:20px;opacity:0.5;">Das Sechzehntelfinale ist noch nicht gespielt – die Aufsteiger stehen noch nicht fest.</div>';
    const tm = id => Engine.teams[id] || GAME_DATA.teams[id];
    // Vergangene Saison (Nutzer 13.11.2026, SV Westfalia Soest stand als Auf- UND Absteiger): Zielliga und Absteiger aus den
    // Schnappschüssen der Saison und der Folgesaison, nicht aus Engine.teams von heute.
    const hi = Engine.history.findIndex(h => h.amateurpokal === A);
    const snap = hi >= 0 ? (Engine.history[hi].teams || {}) : null;
    const folge = hi >= 0 ? ((Engine.history[hi + 1] || {}).teams || Engine.teams) : null;
    const byLeague = {};
    A.promoted.forEach(id => {
        const t = tm(id); if (!t) return;
        const tgt = folge ? ((folge[id] && folge[id].leagueId) || (Engine.amateurTargetLeagueId ? Engine.amateurTargetLeagueId(t) : null))
            : (Engine.amateurTargetLeagueId && !t.leagueId) ? Engine.amateurTargetLeagueId(t) : t.leagueId;
        (byLeague[tgt || '?'] = byLeague[tgt || '?'] || []).push(t);
    });
    const img = t => { const s = t?.thumb || GAME_DATA.teams[t?.id]?.thumb || ''; return s ? `<img src="${s}" width="18" height="18" loading="lazy" style="object-fit:contain;vertical-align:middle;flex-shrink:0;">` : ''; };
    let out = `<div style="padding:8px 16px;font-size:12px;color:var(--muted);line-height:1.5;">
        ${A.promoted.length} Aufsteiger. Je Bodenliga gilt 1:1 – für jeden Aufsteiger verlässt der Tabellenletzte die Pyramide, die Ligagröße bleibt unverändert.
    </div><div style="padding:0 16px 16px;">`;
    Object.keys(byLeague).sort((a, b) => (Engine.leagues[a]?.name || a).localeCompare(Engine.leagues[b]?.name || b, 'de')).forEach(lid => {
        const lg = Engine.leagues[lid];
        const ups = byLeague[lid];
        // Laufende Saison: Absteiger-Vorschau = die letzten N der aktuellen Tabelle (steht erst nach dem letzten Spieltag fest).
        // Vergangene Saison: wer die Liga damals wirklich ins Ligalose verließ (Endplatz aus dem Schnappschuss).
        const downs = snap
            ? Object.keys(snap).filter(id => snap[id] && snap[id].leagueId === lid && !(folge[id] && folge[id].leagueId) && tm(id))
                .map(id => Object.assign({}, tm(id), { id, rank: snap[id].rank })).sort((a, b) => (a.rank || 999) - (b.rank || 999))
            : Object.values(Engine.teams).filter(t => t.leagueId === lid).sort((a, b) => (a.rank || 999) - (b.rank || 999)).slice(-ups.length);
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
    // Nachrücker (Nutzer 13.11.2026): ohne Pokalplatz aus dem Ligalosen in die Liga, weil ein Zwangsabsteiger Platz machte
    // und kein Pokalaufsteiger in dessen Bodenliga kam. Stehen erst nach dem Saisonwechsel fest (A.nachrueck im Snapshot).
    const nr = (A.nachrueck || []).map(tm).filter(Boolean);
    if (nr.length) {
        const zielLiga = t => { const f = folge ? folge[t.id] : null; return f && f.leagueId; };
        out += `<div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding:14px 0 6px;border-bottom:1px solid var(--border);margin-bottom:4px;">NACHRÜCKER (${nr.length})</div>
            <div style="font-size:12px;color:var(--muted);line-height:1.5;padding:2px 0 4px">Ohne Pokalplatz in die Liga: Ein Zwangsabsteiger machte Platz, und kein Pokalaufsteiger kam in seine Bodenliga. ${A.sonder ? 'Ausgespielt in der <span onclick="App.switchAmateurTab(-8)" style="cursor:pointer;color:var(--c-link)">Sonder-Relegation</span>.' : 'Nachgerückt nach dem früheren Verfahren (Stärke).'} Zählt als Aufstieg aus dem Amateurpokal.</div>`;
        nr.forEach(t => { const z = zielLiga(t);
            out += `<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:13px;min-width:0;">
                <span style="flex-shrink:0;color:var(--c-var-up);font-weight:bold;">↗</span>${img(t)}
                <span onclick="App.showSteckbrief('${t.id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${t.name}</span>
                ${z ? `<span style="flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:10px;opacity:0.5;">${(Engine.leagues[z] || {}).name || z}</span>` : ''}
                <span title="Nachrücker für einen Zwangsabsteiger" style="flex-shrink:0;font-size:9px;font-weight:bold;padding:1px 5px;border-radius:3px;border:1px solid var(--c-var-up);color:var(--c-var-up);">NR</span>
            </div>`; });
    }
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
    // Hervorhebung: Feld der angezeigten Saison; Saison anklickbar, wenn ihre Runden im Spielstand liegen
    const hIdx = this.viewHistoryOffset, teil = this._teilnehmerCup('a', hIdx) || new Set();
    const hatRunden = y => y === Engine.getFormattedSeason() ? !!Engine.amateurpokal : (Engine.history || []).some(h => h.year === y && h.amateurpokal && h.amateurpokal.rounds);
    let out = teil.size ? `<div style="padding:6px 16px 0;">${this._aktLegende(hIdx == null ? null : Engine.history[hIdx]?.year)}</div>` : '';
    out += `<div style="display:flex;flex-wrap:wrap;gap:24px;padding:16px;">`;
    out += `<div style="flex:2 1 260px;min-width:0;">
        <div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:6px;">
            SIEGER <button onclick="App._toggleAmateurSiegerSort()" style="background:none;border:1px solid var(--border);border-radius:3px;color:var(--muted);font-size:10px;padding:1px 6px;cursor:pointer;margin-left:6px;">${sort === 'desc' ? 'neueste zuerst' : 'älteste zuerst'}</button>
        </div>`;
    list.forEach(e => {
        out += `<div class="${teil.has(e.id) ? 'akt-row' : ''}" style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px;min-width:0;">
            ${hatRunden(e.season) ? `<span class="sg-saison" onclick="App._amateurSaisonGo('${e.season}')" title="Amateurpokal ${e.season}" style="flex-shrink:0;width:64px;font-size:12px;">${e.season}</span>` : `<span style="flex-shrink:0;width:64px;opacity:0.55;font-size:12px;">${e.season}</span>`}
            ${e.thumb ? `<img src="${e.thumb}" width="18" height="18" loading="lazy" style="object-fit:contain;flex-shrink:0;">` : ''}
            <span onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${e.name}</span>
        </div>`;
    });
    out += `</div><div style="flex:1 1 200px;min-width:0;">
        <div style="font-size:11px;font-weight:bold;opacity:0.5;letter-spacing:1px;padding-bottom:6px;border-bottom:1px solid var(--border);margin-bottom:6px;">REKORDSIEGER</div>`;
    recList.forEach(([id, r]) => {
        out += `<div class="${teil.has(id) ? 'akt-row' : ''}" style="display:flex;align-items:center;gap:8px;padding:3px 0;font-size:13px;min-width:0;">
            <span style="flex-shrink:0;width:22px;text-align:right;color:var(--c-gold);font-weight:bold;">${r.n}</span>
            ${r.thumb ? `<img src="${r.thumb}" width="18" height="18" loading="lazy" style="object-fit:contain;flex-shrink:0;">` : ''}
            <span onclick="App.showSteckbrief('${id}')" style="cursor:pointer;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${r.name}</span>
        </div>`;
    });
    return out + '</div></div>';
},
// Klick auf eine Saison der Amateurpokal-Siegerliste: diese Saison, Reiter = letzte ausgeloste Runde
_amateurSaisonGo: function(y) {
    const i = Engine.history.findIndex(h => h.year === y);
    this.viewHistoryOffset = y === Engine.getFormattedSeason() || i < 0 ? null : i;
    this.viewArchivedSeason = null; this.matchdayViewIdx = null;
    const A = this.viewHistoryOffset === null ? Engine.amateurpokal : Engine.history[i].amateurpokal;
    const r = A ? A.rounds.map((x, k) => x.matches.length ? k : -1).filter(k => k >= 0) : [];
    this.amateurTab = r.length ? r[r.length - 1] : -1;
    this.showAmateurpokal();
    if (this.updateStatus) this.updateStatus();
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
    // Aufstiege aus dem Amateurpokal (Fix-Liste 12.11.2026): dauerhafter Zähler archive.records.t[id].apUp = [Anzahl, letztes Jahr],
    // zählt beim Saisonwechsel (_recordSeason) – die Aufsteiger der laufenden Saison (ab dem Sechzehntelfinale) kommen oben drauf
    const RT = (Engine.archive && Engine.archive.records && Engine.archive.records.t) || {};
    for (const id in RT) if (RT[id] && RT[id].apUp && RT[id].apUp[0] > 0) { mk(id); et[id].auf = RT[id].apUp[0]; }
    ((Engine.amateurpokal && Engine.amateurpokal.promoted) || []).forEach(id => { mk(id); et[id].auf = (et[id].auf || 0) + 1; });
    let rows = Object.entries(et).map(([id, e]) => {
        const t = Engine.teams[id] || GAME_DATA.teams[id];
        const pts = e.w * 3 + e.d;
        return { id, name: t?.name || id, thumb: t?.thumb || null, ...e, pts, pps: e.sp > 0 ? pts / e.sp : 0 };
    });
    if (!rows.length) return '<div style="padding:20px;opacity:0.5;text-align:center;">Noch keine Amateurpokal-Daten vorhanden.</div>';
    // Hervorhebung: die Tabelle zeigt immer den Gesamtstand heute → laufendes Feld
    const teil = this._teilnehmerCup('a', null) || new Set();
    const fns = {
        wins: (a,b) => b.wins - a.wins || b.pts - a.pts,
        pts:  (a,b) => b.pts - a.pts,
        pps:  (a,b) => b.pps - a.pps,
        auf:  (a,b) => (b.auf || 0) - (a.auf || 0) || b.pts - a.pts,
        w:    (a,b) => b.w - a.w,
        d:    (a,b) => b.d - a.d,
        l:    (a,b) => b.l - a.l,
        sp:   (a,b) => b.sp - a.sp,
        seasons: (a,b) => b.seasons - a.seasons,
        name: (a,b) => a.name.localeCompare(b.name, 'de')
    };
    rows.sort((a, b) => sort.dir * (fns[sort.col] || fns.wins)(a, b));
    const th = (col, label, tip) => {
        const active = sort.col === col;
        return `<th onclick="App._amateurSortBy('${col}')"${tip ? ` title="${tip}"` : ''} style="cursor:pointer;white-space:nowrap;${active ? 'color:var(--c-link);' : ''}">${label}${active ? (sort.dir === 1 ? ' ▼' : ' ▲') : ''}</th>`;
    };
    // Alle Spalten auch auf dem Handy, Reihenfolge wie die Ewige Tabelle der Ligen und des DFB-Pokals (Nutzer 31.10.2026)
    let out = `${teil.size ? `<div style="padding:6px 15px;border-bottom:1px solid var(--border);">${this._aktLegende(null)}</div>` : ''}<table class="ptbl" id="ap-ew"><thead><tr>
        <th>Pl.</th><th style="width:28px;"></th>
        ${th('name','Mannschaft')}${th('seasons','Jahre','Teilnahmen')}${th('wins','Titel','Pokalsiege')}${th('auf','Aufstiege','Aufstiege aus dem Amateurpokal in die Bodenliga')}
        ${th('sp','Sp.')}${th('w','G.')}${th('d','U.')}${th('l','V.')}${th('pts','Pkt.')}${th('pps','Pkt/Sp')}
    </tr></thead><tbody>`;
    rows.forEach((e, i) => {
        out += `<tr${teil.has(e.id) ? ' class="akt"' : ''}>
            <td style="text-align:center;font-weight:bold;">${i + 1}.</td>
            <td class="wpc">${e.thumb ? `<img src="${e.thumb}" class="wp" loading="lazy">` : ''}</td>
            <td class="tm"><span class="tmn" data-full="${this._attr(e.name)}" data-short="${this._attr(this._teamShort(e.id, e.name))}" onclick="App.showSteckbrief('${e.id}')" style="cursor:pointer" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration=''">${e.name}</span></td>
            <td style="text-align:center;">${e.seasons}</td>
            <td style="text-align:center;">${e.wins > 0 ? `<span style="color:var(--c-gold);font-weight:bold;">${e.wins}</span>` : '<span style="opacity:0.3;">—</span>'}</td>
            <td style="text-align:center;">${e.auf > 0 ? `<span style="color:#4caf50;font-weight:bold;">${e.auf}</span>` : '<span style="opacity:0.3;">—</span>'}</td>
            <td>${e.sp}</td><td>${e.w}</td><td>${e.d}</td><td>${e.l}</td>
            <td><b>${e.pts}</b></td>
            <td style="opacity:0.7;">${e.pps > 0 ? e.pps.toFixed(2) : '—'}</td>
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
