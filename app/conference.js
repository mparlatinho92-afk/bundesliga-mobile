// ── Action-Modus Layer 4: Live-Konferenz (Echtzeit) ───────────────────────
// Spielminuten laufen in Sekunden ab (1 Min = 1 Sek, Speed wählbar). Spiele starten zu ihrer realen
// Anstoßzeit → laufen versetzt parallel. Tor-Ticker + Live-Stände. Ergebnisse werden am Ende verbucht.
Object.assign(App, {
    _conf: null,
    _CONF_SPEEDS: [1, 2, 5, 10],

    _fmtClock: m => `${Math.floor(m / 60)}:${String(Math.floor(m) % 60).padStart(2, '0')}`,

    startConference: function(day) {
        const live = Engine.confPrepareDay(day);
        if (!live.length) { Engine.confCommitDay(); this._afterConf(); return; }
        const pmin = t => { const [h, m] = (t || '15:30').split(':').map(Number); return h * 60 + m; };
        const matches = live.map(x => ({ ...x, kick: pmin(x.t), shown: { h: 0, a: 0 }, revealed: 0 }));
        const startMin = Math.min(...matches.map(m => m.kick));
        const endMin = Math.max(...matches.map(m => m.kick + 95));   // 90' + bis 5' Nachspielzeit
        this._conf = { day, matches, clock: startMin, startMin, endMin, speed: 1, playing: true, ticker: [], raf: 0, lastTs: 0, lastMin: -1, done: false };
        document.getElementById('conf-overlay').style.display = 'flex';
        this._confRender();
        this._conf.raf = requestAnimationFrame(t => this._confTick(t));
    },

    _confTick: function(ts) {
        const c = this._conf; if (!c) return;
        if (c.playing && !c.done) {
            if (c.lastTs) c.clock = Math.min(c.endMin, c.clock + c.speed * (ts - c.lastTs) / 1000);
            c.lastTs = ts;
            const flashed = this._confReveal();
            if (c.clock >= c.endMin) { c.done = true; this._confRender(); }
            else if (flashed || Math.floor(c.clock) !== c.lastMin) { c.lastMin = Math.floor(c.clock); this._confRender(); }
        } else { c.lastTs = ts; }
        c.raf = requestAnimationFrame(t => this._confTick(t));
    },

    // Tor-Events enthüllen, deren Minute erreicht ist; Ticker + Stand hochzählen. true = neues Tor (Flash).
    _confReveal: function() {
        const c = this._conf; let goal = false;
        c.matches.forEach(m => {
            const off = c.clock - m.kick;
            const shownMin = off >= 93 ? 999 : off;
            while (m.revealed < m.events.length && m.events[m.revealed].minute <= shownMin) {
                const e = m.events[m.revealed++];
                if (e.side === 'h') m.shown.h++; else m.shown.a++;
                c.ticker.unshift({ minute: e.minute, home: m.home, away: m.away, score: `${m.shown.h}:${m.shown.a}`, side: e.side, lid: m.lid });
                goal = true;
            }
        });
        return goal;
    },

    setConfSpeed: function(s) { if (this._conf) { this._conf.speed = s; this._confRender(); } },
    toggleConfPlay: function() { const c = this._conf; if (!c) return; c.playing = !c.playing; c.lastTs = 0; this._confRender(); },
    confSkip: function() {       // sofort ans Ende: alle Tore enthüllen
        const c = this._conf; if (!c) return;
        c.clock = c.endMin; this._confReveal(); c.done = true; this._confRender();
    },
    closeConference: function() {
        const c = this._conf; if (!c) return;
        if (!c.done && !confirm('Konferenz abbrechen und Ergebnisse sofort verbuchen?')) return;
        if (c.raf) cancelAnimationFrame(c.raf);
        if (!c.done) this._confReveal();
        Engine.confCommitDay();
        document.getElementById('conf-overlay').style.display = 'none';
        this._conf = null;
        this._afterConf();
    },
    _afterConf: function() {
        // weitere Konferenz-Tage desselben Spieltags? sonst zurück zur Liga/Pokal (mit Flash der neuen Ergebnisse)
        this._captureScroll();
        this.activeLeague === '__pokal__' ? this.showPokal() : this.loadLeague(this.activeLeague);
        this.updateStatus();
    },

    _confRender: function() {
        const c = this._conf; if (!c) return;
        const body = document.getElementById('conf-body');
        const head = document.getElementById('conf-clock');
        if (head) head.textContent = this._fmtClock(c.clock);
        const dl = document.getElementById('conf-daylabel');
        if (dl) dl.textContent = (c.day && this._DAY_LABEL && this._DAY_LABEL[c.day.key]) ? this._DAY_LABEL[c.day.key] : (c.day?.label || '');
        // Speed-Buttons + Play/Pause
        const sb = document.getElementById('conf-speeds');
        if (sb) sb.innerHTML = this._CONF_SPEEDS.map(s => `<button class="conf-spd${c.speed === s ? ' on' : ''}" onclick="App.setConfSpeed(${s})">${s}×</button>`).join('') +
            `<button class="conf-spd" onclick="App.confSkip()" title="Sofort ans Ende">⏭</button>`;
        const pp = document.getElementById('conf-play');
        if (pp) pp.textContent = c.done ? '✓' : c.playing ? '⏸' : '▶';
        const closeBtn = document.getElementById('conf-close');
        if (closeBtn) closeBtn.textContent = c.done ? 'Fertig →' : '✕ Abbrechen';

        if (!body) return;
        // Live-Spiele nach Liga gruppiert
        const byLid = {};
        c.matches.forEach(m => (byLid[m.lid] = byLid[m.lid] || []).push(m));
        const lidsSorted = Object.keys(byLid).sort((a, b) => a.split('-').map(Number).reduce((s, x, i) => s || x - (b.split('-').map(Number)[i] || 0), 0));
        const wp = id => { const th = GAME_DATA.teams[id]?.thumb; return th ? `<img src="${th}" class="res-wp" loading="lazy">` : '<span class="res-wp"></span>'; };
        let matchesHtml = '';
        lidsSorted.forEach(lid => {
            matchesHtml += `<div class="conf-liga">${Engine.leagues[lid]?.name || lid}</div>`;
            byLid[lid].forEach(m => {
                const off = c.clock - m.kick;
                let stat, live = false;
                if (off < 0) stat = `<span class="conf-kick">↻ ${m.t}</span>`;
                else if (off >= 93) stat = `<span class="conf-ft">Abpfiff</span>`;
                else { stat = `<span class="conf-min">${Math.max(1, Math.ceil(off))}'</span>`; live = true; }
                const sc = off < 0 ? '–:–' : `${m.shown.h}:${m.shown.a}`;
                matchesHtml += `<div class="conf-row${live ? ' conf-live' : ''}">
                    <span class="conf-h">${m.home}${wp(m.hId)}</span>
                    <b class="conf-sc">${sc}</b>
                    <span class="conf-a">${wp(m.aId)}${m.away}</span>
                    <span class="conf-st">${stat}</span>
                </div>`;
            });
        });
        // Tor-Ticker
        const tickHtml = c.ticker.length
            ? c.ticker.map(t => `<div class="conf-tick"><b>${t.minute}'</b> ⚽ <span class="${t.side === 'h' ? 'tk-h' : ''}">${t.home}</span> <b>${t.score}</b> <span class="${t.side === 'a' ? 'tk-h' : ''}">${t.away}</span></div>`).join('')
            : '<div class="conf-tick" style="opacity:0.4">Noch keine Tore…</div>';
        body.innerHTML = `<div class="conf-matches">${matchesHtml}</div><div class="conf-ticker"><div class="conf-ticker-hd">⚽ Ticker</div>${tickHtml}</div>`;
    }
});
