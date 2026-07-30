// ── Live-Tabelle (Action-Modus) ────────────────────────────────────────────
// Rechnet laufende Zwischenstände provisorisch auf die amtliche Tabelle: "wie stünde
// die Liga, wenn es jetzt so ausginge". Rein lesend – nichts wird auf Engine.teams
// geschrieben, verbucht wird weiterhin nur von der Engine (_applyResult/confCommitDay).
//
// Zwei Aufrufer:
//   Tiefe 3 (Halbzeit)   app/league.js  – Standings zeigen HZ-Stände mitgerechnet
//   Tiefe 4 (Konferenz)  app/conference.js – dritte Spalte im Overlay, tickt mit jedem Tor
Object.assign(App, {

    // teams: [{id, rank, stats}] einer Liga · scores: [{hId,aId,s1,s2}] NUR angepfiffener Partien
    // → { stats, rank:{id:n}, delta:{id:n}, playing:Set, live:{id:{gf,ga,oppId}}, teams:[sortiert] }
    // delta > 0 = gegenüber der amtlichen Tabelle nach oben geklettert.
    // live = laufende Partie je Team AUS DESSEN SICHT (eigene Tore zuerst) – Basis fürs Score-Chip.
    _liveTable: function(teams, scores) {
        const st = {}, playing = new Set(), live = {};
        teams.forEach(t => {
            const s = t.stats || {};
            st[t.id] = { p:s.p||0, w:s.w||0, d:s.d||0, l:s.l||0, gf:s.gf||0, ga:s.ga||0, pts:s.pts||0 };
        });
        // Punktvergabe identisch zu Engine._applyResult (3/1/0) – hier nur auf der Kopie
        const add = (id, gf, ga) => {
            const s = st[id]; if (!s) return;
            s.p++; s.gf += gf; s.ga += ga;
            if (gf > ga) { s.w++; s.pts += 3; } else if (gf < ga) { s.l++; } else { s.d++; s.pts++; }
        };
        (scores || []).forEach(m => {
            if (!st[m.hId] || !st[m.aId]) return;
            add(m.hId, m.s1, m.s2); add(m.aId, m.s2, m.s1);
            playing.add(m.hId); playing.add(m.aId);
            live[m.hId] = { gf: m.s1, ga: m.s2, oppId: m.aId };
            live[m.aId] = { gf: m.s2, ga: m.s1, oppId: m.hId };
        });
        // Sortierung wie Engine.sortTables (Pkt > Diff > Tore). Bewusst OHNE H2H/startRank:
        // ein Zwischenstand ist keine amtliche Platzierung, und H2H würde bei laufenden
        // Spielen ohnehin mit einem Ergebnis rechnen, das noch fallen kann.
        // Gleichstand → amtlicher Rang, damit die Reihenfolge nicht zufällig springt.
        const order = teams.slice().sort((a, b) => {
            const sa = st[a.id], sb = st[b.id];
            return sb.pts - sa.pts || (sb.gf - sb.ga) - (sa.gf - sa.ga) || sb.gf - sa.gf
                || (a.rank || 99) - (b.rank || 99);
        });
        const rank = {}, delta = {};
        order.forEach((t, i) => { rank[t.id] = i + 1; delta[t.id] = (t.rank != null) ? t.rank - (i + 1) : 0; });
        return { stats: st, rank, delta, playing, live, teams: order };
    },

    // Score-Chip einer laufenden Partie (Flashscore-Optik): Stand aus Sicht der Mannschaft,
    // eigene Tore zuerst. Grün = führt, Gelb = unentschieden, Rot = liegt zurück.
    _liveChip: function(l) {
        if (!l) return '';
        const c = l.gf > l.ga ? 'win' : l.gf === l.ga ? 'drw' : 'los';
        const opp = (Engine.teams[l.oppId] || {}).name || '';
        return `<span class="lvt-sc ${c}" title="läuft: ${l.gf}:${l.ga} gegen ${this._attr(opp)}">${l.gf}:${l.ga}</span>`;
    },

    // Rang-Veränderung als Pfeil ('' bei 0) – gemeinsame Optik in Standings und Overlay.
    _liveDelta: function(d) {
        if (!d) return '';
        return d > 0 ? `<span class="lvt-up">▲${d}</span>` : `<span class="lvt-dn">▼${-d}</span>`;
    },

    // Laufende Zwischenstände einer Liga aus dem Halbzeit-Modus (Tiefe 3).
    // [] wenn keine Halbzeit läuft – Aufrufer schaltet die Live-Ansicht dann ab.
    _liveScoresHz: function(lid) {
        if (!Array.isArray(Engine.actionLive)) return [];
        return Engine.actionLive.filter(r => r.lid === lid)
            .map(r => ({ hId: r.hId, aId: r.aId, s1: r.hz1, s2: r.hz2 }));
    },

    // Laufende Zwischenstände einer Liga aus der Konferenz (Tiefe 4): alle bereits
    // angepfiffenen Partien mit ihrem AKTUELL sichtbaren Stand (m.shown) – noch nicht
    // angestoßene Spiele zählen nicht mit, genau wie in einer echten Livetabelle.
    _liveScoresConf: function(lid) {
        const c = this._conf; if (!c) return [];
        return c.matches.filter(m => !m.ko && m.lid === lid && (c.clock - m.kick) >= 0)
            .map(m => ({ hId: m.hId, aId: m.aId, s1: m.shown.h, s2: m.shown.a }));
    },

    // Kompakte Live-Tabelle als HTML (Konferenz-Overlay): Pl · Team · Sp · Diff · Pkt.
    // Zonenfarben aus Engine.calcZones – dieselben tr-Klassen wie die große Tabelle.
    _liveTableHtml: function(lid) {
        const teams = Object.values(Engine.teams).filter(t => t.leagueId === lid);
        if (teams.length < 2) return '';
        const lt = this._liveTable(teams, this._liveScoresConf(lid));
        if (!this.zonesCache) this.zonesCache = Engine.calcZones();
        const z = this.zonesCache[lid] || { fixUp:0, varUp:0, fixDown:0, varDown:0 };
        const lvl = (Engine.leagues[lid] || {}).level, n = lt.teams.length;
        const rows = lt.teams.map((t, i) => {
            const pos = i + 1, rev = n - i, s = lt.stats[t.id];
            let cls = '';
            if (lvl === 1 && pos <= 4) cls = 'row-cl';
            else if (lvl === 1 && pos === 5) cls = 'row-el';
            else if (lvl > 1 && pos <= z.fixUp) cls = 'row-fix-up';
            else if (lvl > 1 && pos <= z.fixUp + z.varUp) cls = 'row-var-up';
            if (rev <= z.fixDown) cls = 'row-fix-down';
            else if (rev <= z.fixDown + z.varDown) cls = 'row-var-down';
            const diff = s.gf - s.ga, plays = lt.playing.has(t.id);
            // Sp/Diff/Pkt rot, solange die Partie läuft – diese Zahlen sind noch in Bewegung
            const nc = plays ? 'c lvt-num' : 'c';
            return `<tr class="${cls}${plays ? ' lvt-play' : ''}">
                <td class="lvt-pl">${pos}.${this._liveDelta(lt.delta[t.id])}</td>
                <td class="lvt-tm${plays ? ' lvt-tm-live' : ''}">${this._liveChip(lt.live[t.id])}${t.name}</td>
                <td class="${nc}">${s.p}</td>
                <td class="${nc}">${diff > 0 ? '+' + diff : diff}</td>
                <td class="${nc}"><b>${s.pts}</b></td>
            </tr>`;
        }).join('');
        return `<table class="lvt-tab"><thead><tr>
                <th>Pl</th><th>Mannschaft</th><th class="c">Sp</th><th class="c">Diff</th><th class="c">Pkt</th>
            </tr></thead><tbody>${rows}</tbody></table>`;
    },

    // Ligen mit laufenden Liga-Partien in der Konferenz (Pokal hat keine Tabelle),
    // sortiert nach Level → höchste Liga zuerst.
    _liveConfLeagues: function() {
        const c = this._conf; if (!c) return [];
        const ids = [...new Set(c.matches.filter(m => !m.ko && m.lid).map(m => m.lid))];
        return ids.sort((a, b) => ((Engine.leagues[a] || {}).level || 99) - ((Engine.leagues[b] || {}).level || 99));
    },

    // Konferenz-Spalte: Liga-Umschalter + Tabelle. Default = Liga des Lieblingsvereins,
    // sonst höchste beteiligte Liga.
    _liveConfPanel: function() {
        const lids = this._liveConfLeagues();
        if (!lids.length) return '';
        if (!this._liveLid || lids.indexOf(this._liveLid) < 0) {
            const fav = this._favTeam && Engine.teams[this._favTeam];
            this._liveLid = (fav && lids.indexOf(fav.leagueId) >= 0) ? fav.leagueId : lids[0];
        }
        const tabs = lids.length > 1
            ? `<div class="lvt-tabs">${lids.map(id => `<button class="lvt-tb${id === this._liveLid ? ' on' : ''}" onclick="App._liveSetLid('${id}')">${(Engine.leagues[id] || {}).name || id}</button>`).join('')}</div>`
            : '';
        return `<div class="conf-live">
            <div class="conf-ticker-hd">⚡ Live-Tabelle${lids.length === 1 ? ' · ' + ((Engine.leagues[this._liveLid] || {}).name || '') : ''}</div>
            ${tabs}${this._liveTableHtml(this._liveLid)}
        </div>`;
    },

    _liveSetLid: function(lid) { this._liveLid = lid; this._confRender(); }
});
