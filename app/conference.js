// ── Action-Modus Layer 4: Live-Konferenz (Echtzeit) ───────────────────────
// Spielminuten laufen in Sekunden ab (1 Min = 1 Sek, Speed wählbar). Spiele starten zu ihrer realen
// Anstoßzeit → laufen versetzt parallel. Auto-Skip überspringt Leerzeit (nur wenn KEIN Spiel läuft).
// Lieblingsverein + Antippen pinnt Spiele oben mit Tor-Verlauf. Pokal inkl. Verlängerung/Elfmeter.
Object.assign(App, {
    _conf: null,
    _CONF_SPEEDS: [1, 2, 5, 10],
    _favTeam: null,

    _fmtClock: m => `${Math.floor(m / 60)}:${String(Math.floor(m) % 60).padStart(2, '0')}`,
    _loadFav: function() { if (this._favTeam === null) this._favTeam = localStorage.getItem('ba_fav_team') || ''; return this._favTeam; },

    startConference: function(day) {
        this._loadFav();
        const live = Engine.confPrepareDay(day);
        if (!live.length) { Engine.confCommitDay(); this._afterConf(); return; }
        const pmin = t => { const [h, m] = (t || '15:30').split(':').map(Number); return h * 60 + m; };
        const endOff = m => m.ko ? (m.decided === 'pen' ? 132 : m.decided === 'aet' ? 125 : 95) : 95;
        const matches = live.map((x, i) => ({ ...x, mi: i, kick: pmin(x.t), endOff: endOff(x), shown: { h: 0, a: 0 }, revealed: 0, psoShown: false }));
        const startMin = Math.min(...matches.map(m => m.kick));
        const endMin = Math.max(...matches.map(m => m.kick + m.endOff));
        this._conf = { day, matches, clock: startMin, startMin, endMin, speed: 1, playing: true, autoskip: true, pinned: new Set(), ticker: [], raf: 0, lastTs: 0, lastMin: -1, done: false };
        document.getElementById('conf-overlay').style.display = 'flex';
        this._confRender();
        this._conf.raf = requestAnimationFrame(t => this._confTick(t));
    },

    _confTick: function(ts) {
        const c = this._conf; if (!c) return;
        if (c.playing && !c.done) {
            if (c.lastTs) c.clock = Math.min(c.endMin, c.clock + c.speed * (ts - c.lastTs) / 1000);
            c.lastTs = ts;
            // Auto-Skip: nur wenn gerade KEIN Spiel läuft → Leerzeit zur nächsten Anstoßwelle (bzw. ans Ende) springen
            if (c.autoskip) {
                const anyLive = c.matches.some(m => { const o = c.clock - m.kick; return o >= 0 && o < m.endOff; });
                if (!anyLive) {
                    const next = Math.min(Infinity, ...c.matches.filter(m => m.kick > c.clock + 0.01).map(m => m.kick));
                    c.clock = next === Infinity ? c.endMin : next;
                }
            }
            const flashed = this._confReveal();
            if (c.clock >= c.endMin) { c.done = true; this._confRender(); }
            else if (flashed || Math.floor(c.clock) !== c.lastMin) { c.lastMin = Math.floor(c.clock); this._confRender(); }
        } else { c.lastTs = ts; }
        c.raf = requestAnimationFrame(t => this._confTick(t));
    },

    // Tor-Events enthüllen deren Minute erreicht ist; Ticker + Stand hochzählen. true = neues Tor (Flash).
    _confReveal: function() {
        const c = this._conf; let goal = false;
        c.matches.forEach(m => {
            const off = c.clock - m.kick;
            const shownMin = off >= m.endOff ? 999 : off;
            while (m.revealed < m.events.length && m.events[m.revealed].minute <= shownMin) {
                const e = m.events[m.revealed++];
                if (e.side === 'h') m.shown.h++; else m.shown.a++;
                m.lastGoal = e.minute;
                c.ticker.unshift({ minute: e.minute, home: m.home, away: m.away, score: `${m.shown.h}:${m.shown.a}`, side: e.side, ko: m.ko });
                goal = true;
            }
            // Pokal-Elfmeterschießen am Spielende in den Ticker
            if (m.ko && m.decided === 'pen' && !m.psoShown && off >= m.endOff) {
                m.psoShown = true;
                c.ticker.unshift({ minute: 'i.E.', home: m.home, away: m.away, score: m.pso || '', side: m.winner, pso: true });
                goal = true;
            }
        });
        return goal;
    },

    setConfSpeed: function(s) { if (this._conf) { this._conf.speed = s; this._confRender(); } },
    toggleConfPlay: function() { const c = this._conf; if (!c) return; c.playing = !c.playing; c.lastTs = 0; this._confRender(); },
    toggleConfSkip: function() { const c = this._conf; if (!c) return; c.autoskip = !c.autoskip; this._confRender(); },
    confSkip: function() { const c = this._conf; if (!c) return; c.clock = c.endMin; this._confReveal(); c.done = true; this._confRender(); },
    confTogglePin: function(mi) { const c = this._conf; if (!c) return; c.pinned.has(mi) ? c.pinned.delete(mi) : c.pinned.add(mi); this._confRender(); },
    confSetFav: function(id, ev) { if (ev) ev.stopPropagation(); this._favTeam = (this._favTeam === id) ? '' : id; localStorage.setItem('ba_fav_team', this._favTeam); this._confRender(); },

    closeConference: function() {
        const c = this._conf; if (!c) return;
        if (!c.done && !confirm('Konferenz abbrechen und Ergebnisse sofort verbuchen?')) return;
        if (c.raf) cancelAnimationFrame(c.raf);
        if (!c.done) { c.clock = c.endMin; this._confReveal(); }
        Engine.confCommitDay();
        document.getElementById('conf-overlay').style.display = 'none';
        this._conf = null;
        this._afterConf();
    },
    _afterConf: function() {
        this._captureScroll();
        this.activeLeague === '__pokal__' ? this.showPokal() : this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    // Status/Score eines Matches zum aktuellen Konferenz-Stand
    _confMatchState: function(m) {
        const off = this._conf.clock - m.kick;
        if (off < 0) return { off, score: '–:–', live: false, finished: false, st: `<span class="conf-kick">↻ ${m.t}</span>` };
        const score = `${m.shown.h}:${m.shown.a}`;
        if (off >= m.endOff) {
            let note = 'Abpfiff';
            if (m.ko) note = m.decided === 'pen' ? `i.E. ${m.pso || ''}` : m.decided === 'aet' ? 'n.V.' : 'Abpfiff';
            return { off, score, live: false, finished: true, st: `<span class="conf-ft">${note}</span>` };
        }
        let lbl = Math.max(1, Math.ceil(off)) + "'";
        if (m.ko && off > 90) lbl = (off >= 120 ? 'Elfm.' : Math.ceil(off) + "' n.V.");
        return { off, score, live: true, finished: false, st: `<span class="conf-min">${lbl}</span>` };
    },

    _confMatchRow: function(m, detail) {
        const wp = id => { const th = GAME_DATA.teams[id]?.thumb; return th ? `<img src="${th}" class="res-wp" loading="lazy">` : '<span class="res-wp"></span>'; };
        const s = this._confMatchState(m);
        const fav = this._favTeam && (m.hId === this._favTeam || m.aId === this._favTeam);
        const pinned = this._conf.pinned.has(m.mi);
        let det = '';
        if (detail) {
            const goals = m.events.slice(0, m.revealed).map(e => `<span class="conf-g">${e.minute}' ${e.side === 'h' ? m.home : m.away}</span>`).join('');
            const star = id => `<button class="conf-star${this._favTeam === id ? ' on' : ''}" onclick="App.confSetFav('${id}',event)" title="Mein Verein">★ ${GAME_DATA.teams[id]?.name || id}</button>`;
            det = `<div class="conf-detail">${goals || '<span style="opacity:0.4">noch keine Tore</span>'}<div class="conf-stars">${star(m.hId)}${star(m.aId)}</div></div>`;
        }
        return `<div class="conf-row${s.live ? ' conf-live' : ''}${fav ? ' conf-fav' : ''}" onclick="App.confTogglePin(${m.mi})">
            <span class="conf-pin">${pinned || fav ? '📌' : ''}</span>
            <span class="conf-h">${m.home}${wp(m.hId)}</span>
            <b class="conf-sc">${s.score}</b>
            <span class="conf-a">${wp(m.aId)}${m.away}</span>
            <span class="conf-st">${s.st}</span>
        </div>${det}`;
    },

    _confRender: function() {
        const c = this._conf; if (!c) return;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
        set('conf-clock', this._fmtClock(c.clock));
        set('conf-daylabel', (c.day && this._DAY_LABEL && this._DAY_LABEL[c.day.key]) ? this._DAY_LABEL[c.day.key] + (c.day.pokalRound != null ? ' · Pokal' : '') : (c.day?.label || ''));
        const sb = document.getElementById('conf-speeds');
        if (sb) sb.innerHTML = this._CONF_SPEEDS.map(s => `<button class="conf-spd${c.speed === s ? ' on' : ''}" onclick="App.setConfSpeed(${s})">${s}×</button>`).join('') +
            `<button class="conf-spd${c.autoskip ? ' on' : ''}" onclick="App.toggleConfSkip()" title="Leerzeit überspringen">⏩</button>` +
            `<button class="conf-spd" onclick="App.confSkip()" title="Sofort durchrechnen">⏭</button>`;
        set('conf-play', c.done ? '✓' : c.playing ? '⏸' : '▶');
        set('conf-close', c.done ? 'Fertig →' : '✕ Abbrechen');

        const body = document.getElementById('conf-body'); if (!body) return;
        const isPin = m => c.pinned.has(m.mi) || (this._favTeam && (m.hId === this._favTeam || m.aId === this._favTeam));
        const pins = c.matches.filter(isPin), rest = c.matches.filter(m => !isPin(m));
        let html = '';
        if (pins.length) html += `<div class="conf-pinsec"><div class="conf-liga">📌 Angepinnt</div>${pins.map(m => this._confMatchRow(m, true)).join('')}</div>`;
        // restliche Spiele nach Liga gruppiert
        const byLid = {};
        rest.forEach(m => (byLid[m.lid || '__pokal__'] = byLid[m.lid || '__pokal__'] || []).push(m));
        const lids = Object.keys(byLid).sort((a, b) => a === '__pokal__' ? 1 : b === '__pokal__' ? -1 : a.split('-').map(Number).reduce((s, x, i) => s || x - (b.split('-').map(Number)[i] || 0), 0));
        lids.forEach(lid => {
            html += `<div class="conf-liga">${lid === '__pokal__' ? 'DFB-Pokal' : (Engine.leagues[lid]?.name || lid)}</div>`;
            byLid[lid].forEach(m => html += this._confMatchRow(m, false));
        });
        const tickHtml = c.ticker.length
            ? c.ticker.map(t => t.pso
                ? `<div class="conf-tick"><b>i.E.</b> 🥅 <span class="${t.side === 'h' ? 'tk-h' : ''}">${t.home}</span> <b>${t.score}</b> <span class="${t.side === 'a' ? 'tk-h' : ''}">${t.away}</span></div>`
                : `<div class="conf-tick"><b>${t.minute}'</b> ⚽ <span class="${t.side === 'h' ? 'tk-h' : ''}">${t.home}</span> <b>${t.score}</b> <span class="${t.side === 'a' ? 'tk-h' : ''}">${t.away}</span></div>`).join('')
            : '<div class="conf-tick" style="opacity:0.4">Noch keine Tore…</div>';
        body.innerHTML = `<div class="conf-matches">${html}</div><div class="conf-ticker"><div class="conf-ticker-hd">⚽ Ticker</div>${tickHtml}</div>`;
    }
});
