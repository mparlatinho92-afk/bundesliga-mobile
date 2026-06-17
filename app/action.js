// ── Action-Modus (UI/Config) ──────────────────────────────────────────────
// Layer 1 (Tag): Spieltage werden in Wochentage (Fr/Sa/So) aufgeteilt; "Woche" wird zu "Nächster Tag".
// Scope frei pro Liga wählbar; nicht gewählte Ligen laufen "spielfrei" mit (Engine löst sie am Spieltagsende auf).
Object.assign(App, {
    actionCfg: null,

    // Config laden (localStorage ba_action_cfg); Default: Profi-Ligen (Level 1–3) vorausgewählt.
    _loadActionCfg: function() {
        let cfg = null;
        try { cfg = JSON.parse(localStorage.getItem('ba_action_cfg') || 'null'); } catch (e) {}
        if (!cfg || typeof cfg !== 'object') {
            cfg = { on: false, leagues: {}, pokal: false, depth: 1 };
            Object.values(Engine.leagues || {}).forEach(l => { if (l.level <= 3) cfg.leagues[l.id] = true; });
        }
        cfg.leagues = cfg.leagues || {};
        if (cfg.depth !== 2) cfg.depth = 1;   // Altsave/Default: Tag-Tiefe
        this.actionCfg = cfg;
        return cfg;
    },
    _saveActionCfg: function() {
        try { localStorage.setItem('ba_action_cfg', JSON.stringify(this.actionCfg)); } catch (e) {}
    },

    // Action greift nur in der laufenden Saison-Live-Ansicht (kein Archiv/Testspiel) und wenn ≥1 Liga gewählt.
    actionActive: function() {
        const c = this.actionCfg || this._loadActionCfg();
        if (!c.on) return false;
        if (this.viewHistoryOffset !== null || this.tsView) return false;
        return !!c.pokal || Object.values(c.leagues).some(Boolean);
    },

    // Label des zuletzt gespielten Action-Tags (passend zu den gezeigten Ergebnissen) oder null.
    _actionDayLabel: function() {
        const st = Engine.actionState;
        if (!st || !st.days.length) return null;
        const i = Math.min(st.cursor, st.days.length) - 1; // cursor zeigt auf den nächsten Tag → -1 = zuletzt gespielt
        return st.days[Math.max(0, i)].label;
    },

    openActionSettings: function() {
        if (this._dotsClose) this._dotsClose();
        const c = this.actionCfg || this._loadActionCfg();
        const LEVEL_COLORS = ['#FFD700','#FF8C00','#FF4500','#CC2255','#9922AA','#5544DD','#2277FF','#00AACC'];
        const sorted = Object.values(Engine.leagues).sort((a, b) => {
            const pa = a.id.split('-').map(Number), pb = b.id.split('-').map(Number);
            for (let i = 0; i < Math.max(pa.length, pb.length); i++) { const d = (pa[i]||0) - (pb[i]||0); if (d) return d; }
            return 0;
        });
        let rows = '';
        sorted.forEach(l => {
            const col = LEVEL_COLORS[(l.level - 1) % LEVEL_COLORS.length];
            rows += `<label class="act-row"><input type="checkbox" ${c.leagues[l.id] ? 'checked' : ''} onchange="App._actionToggleLeague('${l.id}')"><span class="act-badge" style="background:${col}">${l.id}</span><span class="act-name">${l.name}</span></label>`;
        });
        const depth = c.depth || 1;
        const dBtn = (v, label) => `<button class="btn${depth===v?' act-depth-on':''}" onclick="App._actionSetDepth(${v})">${label}</button>`;
        const head = `
            <label class="act-master"><input type="checkbox" ${c.on ? 'checked' : ''} onchange="App._actionToggle(this.checked)"><b>Action-Modus aktiv</b></label>
            <div class="act-sub">Ein Spieltag wird in Teilschritten gespielt – „Woche" wird zu „Nächster Tag".</div>
            <div class="act-depth"><span>Tiefe:</span>${dBtn(1,'Tag (Fr/Sa/So)')}${dBtn(2,'Uhrzeit (15:30 …)')}</div>
            <div class="act-sub">${depth===2 ? 'Ein Klick = ein Anstoß-Slot (z.B. Sa 15:30), über alle gewählten Ligen gemeinsam.' : 'Ein Klick = ein Wochentag.'}</div>
            <label class="act-row"><input type="checkbox" ${c.pokal ? 'checked' : ''} onchange="App._actionTogglePokal(this.checked)"><span class="act-name">＋ DFB-Pokal (Dienstag/Mittwoch${depth===2?', 18:30 + 20:45':''})</span></label>
            <div class="act-quick"><button class="btn" onclick="App._actionQuickProfi()">Profi (1.–3.)</button><button class="btn" onclick="App._actionSelectAll(true)">Alle</button><button class="btn" onclick="App._actionSelectAll(false)">Keine</button></div>
            <div class="act-sub">Welche Ligen laufen im Action-Modus? Nicht gewählte spielen „spielfrei" mit und werden am Spieltagsende aufgelöst.</div>`;
        const lh = parseInt(localStorage.getItem('ba_action_listh') || '', 10) || 240;
        this.openModal('⚡ Action-Modus', head + `<div class="act-list" id="act-list" style="height:${lh}px">${rows}</div><div class="act-list-resizer" id="act-list-resizer" title="Höhe ziehen"></div>`);
        this._initActionListResize();
    },

    // Liga-Liste in der Höhe frei ziehbar (Mittelweg ein-/ausgeklappt), persistiert in ba_action_listh.
    _initActionListResize: function() {
        const list = document.getElementById('act-list');
        const rez = document.getElementById('act-list-resizer');
        if (!list || !rez) return;
        const clamp = h => Math.max(80, Math.min(Math.round(window.innerHeight * 0.7), h));
        let startY = 0, startH = 0, active = false;
        const onMove = e => { if (!active) return; list.style.height = clamp(startH + (e.clientY - startY)) + 'px'; e.preventDefault(); };
        const onUp = () => {
            if (!active) return;
            active = false; document.body.style.userSelect = '';
            localStorage.setItem('ba_action_listh', parseInt(list.style.height, 10));
            window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp);
        };
        rez.addEventListener('pointerdown', e => {
            active = true; startY = e.clientY; startH = list.getBoundingClientRect().height;
            document.body.style.userSelect = 'none';
            window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp);
            e.preventDefault();
        });
    },

    _actionToggle: function(on)        { (this.actionCfg || this._loadActionCfg()).on = !!on; this._saveActionCfg(); this.updateStatus(); },
    _actionSetDepth: function(v)       { (this.actionCfg || this._loadActionCfg()).depth = v; this._saveActionCfg(); this.openActionSettings(); },
    _actionTogglePokal: function(on)   { (this.actionCfg || this._loadActionCfg()).pokal = !!on; this._saveActionCfg(); },
    _actionToggleLeague: function(lid) { const c = this.actionCfg || this._loadActionCfg(); c.leagues[lid] = !c.leagues[lid]; this._saveActionCfg(); },
    _actionQuickProfi: function()      { const c = this.actionCfg || this._loadActionCfg(); c.leagues = {}; Object.values(Engine.leagues).forEach(l => { if (l.level <= 3) c.leagues[l.id] = true; }); this._saveActionCfg(); this.openActionSettings(); },
    _actionSelectAll: function(v)      { const c = this.actionCfg || this._loadActionCfg(); c.leagues = {}; if (v) Object.values(Engine.leagues).forEach(l => c.leagues[l.id] = true); this._saveActionCfg(); this.openActionSettings(); }
});
