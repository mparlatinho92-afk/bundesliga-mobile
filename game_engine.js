/**
 * BUNDESLIGA ARCHITECT - ENGINE V66 (THE FINAL CUT)
 * - FORMAT: Vollständig expandierter Code (keine versteckten Einzeiler).
 * - FIX: Explizite Routing-Regeln für Salmrohr, Engers & Co (Vorrang vor Regionen).
 * - LOGIK: Two-Pass Kaskade (Vorausberechnung + Ausführung) für exakte 18/20er Ligen.
 * - SAFETY: Anti-Teleportation (Nur 1 Level Sprung erlaubt).
 * - SORTING: Tie-Breaker nach Stärke verhindert Zufalls-Tabellen bei Saisonstart.
 */

const Engine = {
    startYear: 2025,
    currentSeasonOffset: 0, // 0 = 2025/26
    currentMatchday: 0,
    totalMatchdays: 34,
    fastMode: false,
    
    leagues: {},
    teams: {},
    history: [],
    // SPIELSTAND-KENNUNG. Die IndexedDB-Stores sind nach Fachgroessen geschluesselt ("y|lid", y) -
    // zwei Spielstaende teilen sich also denselben Schluesselraum. Ohne Kennung serviert ein neues
    // Spiel die Chronik des alten (ewige Tabellen, Siegerlisten, Saison-Archiv, Rekord-Backfill).
    // saveId steht im Save, wird bei jedem IDB-Schreibvorgang mitgeschrieben und beim Lesen gefiltert.
    // Der Zeitanteil (Date.now, base36) macht ausserdem nachpruefbar, WANN ein Stand begonnen wurde -
    // genau der Beleg, der bei "behobener Fehler ist zurueck" die Datenfrage in Minuten entscheidet.
    saveId: null,
    // Darf dieser Stand die Zeilen OHNE Kennung sehen (aus der Zeit vor v0.8.131)? Nur der Stand,
    // der beim Update schon existierte. Ein NEU begonnenes Spiel bekommt false und sieht sie nie.
    idbLegacy: false,
    archive: null, // Dauerhaftes Langzeit-Archiv {ewige, champions, relegation, relStats}. Summen dauerhaft; Chronik auf ARCHIVE_CHRONIK_CAP Saisons begrenzt
    ARCHIVE_CHRONIK_CAP: 100, // max. behaltene Chronik-Saisons (champions/relegation) – Performance/Speicher; Summen bleiben unbegrenzt
    _idbPending: null, // Puffer ungespeicherter Chronik-Saisons für IndexedDB (volle Chronik); Flush in saveGame
    verbandspokalPlan: null, // JSON-Plan aus tools/verbandspokal_planner (localStorage ba_vp_plan_v1)

    migrations: [],
    relegationResults: [],
    leagueStats: {},
    matchdayResults: [],
    matchdayHistory: [],
    seasonResults: [],
    friendlies: [],
    actionState: null, // Action-Modus: laufender Spieltag in Teilschritten (null = kein Spieltag offen)
    actionLive: null,  // depth 3: aktuell laufender Slot mit Halbzeit-Ständen (transient, aus actionState rekonstruiert)
    seasonSeed: null, // Seed für den deterministischen Saison-Spielplan (persistiert → fester Plan über Reloads)
    schedule: {}, // Spielplan (in-memory, deterministisch aus seasonSeed neu erzeugbar)
    pokal: null,
    amateurpokal: null, // Amateurpokal der ligalosen Vereine (ihr Ersatz für den Ligabetrieb) – s. initAmateurpokal
    debugLog: [],

    HARD_LINKS: {
        "3": ["4-1", "4-2", "4-3", "4-4", "4-5"],
        "4-1": ["5-1", "5-2", "5-3"],
        "4-2": ["5-4", "5-5", "5-6", "5-7"],
        "4-3": ["5-8", "5-9"],
        "4-4": ["5-10", "5-11", "5-12"],
        "4-5": ["5-13", "5-14"],
        "5-1": ["6-1", "6-2", "6-3"],
        "5-2": ["6-4", "6-5", "6-6"],
        "5-3": ["6-7", "6-8", "6-9"],
        "5-4": ["6-10", "6-11"],
        "5-5": ["6-12", "6-13"],
        "5-6": ["6-14", "6-15", "6-16", "6-17"],
        "5-7": ["6-18"],
        "5-8": ["6-19", "6-20", "6-21"],
        "5-9": ["6-22", "6-23", "6-24"],
        "5-10": ["6-25", "6-26"],
        "5-11": ["6-27", "6-28"],
        "5-12": ["6-29", "6-30"],
        "5-13": ["6-31", "6-32"],
        "5-14": ["6-33", "6-34", "6-35"],
        "6-1": ["7-1", "7-2"],
        "6-2": ["7-3", "7-4", "7-5"],
        "6-3": ["7-6", "7-7"],
        "6-21": ["7-8", "7-9"],
        "7-1": ["8-1", "8-2"],
        "7-2": ["8-3", "8-4"]
    },

    // Ligen die gemeinsam geo-balanciert werden
    // axis: "geo" = _heimatBalance: Vereine bleiben in ihrer homeStaffel, Ausgleich nach Preis
    //               gegen die echten Schwerpunkte der aktuellen Besetzung
    // axis: "lat" = einfache Nord→Süd-Sortierung (gleichmäßige Aufteilung)
    SIBLING_GROUPS: [
        { ids: ["5-8", "5-9"], axis: "geo" },
        { ids: ["5-13", "5-14"], axis: "lat" },
        { ids: ["6-10", "6-11"], axis: "geo" },
        { ids: ["6-12", "6-13"], axis: "geo" },
        { ids: ["6-25", "6-26"], axis: "geo" },
        { ids: ["6-27", "6-28"], axis: "geo" },
        { ids: ["6-29", "6-30"], axis: "geo" },
        { ids: ["6-31", "6-32"], axis: "geo" },
        { ids: ["6-33", "6-34", "6-35"], axis: "geo" },
        { ids: ["7-3", "7-4", "7-5"], axis: "geo" },
        { ids: ["7-6", "7-7"], axis: "geo" }
    ],

    // Mapping: Regions-String (aus team.regions) → Liga-ID
    // Iteration von hinten (spezifischster Eintrag zuerst)
    REGION_TO_LEAGUE_ID: {
        "Rheinhessen": "8-1", "Vorderpfalz": "8-2", "Nahe": "8-3", "Westpfalz": "8-4",
        "Südwest Ost": "7-1", "Südwest West": "7-2",
        "Rheinland West": "7-3", "Rheinland Mitte": "7-4", "Rheinland Ost": "7-5",
        "Saarland Nord-Ost": "7-6", "Saarland Süd-West": "7-7",
        "Südwestdeutscher Fußballverband": "6-1", "Fußballverband Rheinland": "6-2", "Saarland": "6-3",
        "Baden": "6-4", "Südbaden": "6-5", "Württemberg": "6-6",
        "Hessen Nord": "6-7", "Hessen Mitte": "6-8", "Hessen Süd": "6-9",
        "Schleswig": "6-10", "Holstein": "6-11", "Hammonia": "6-12", "Hansa": "6-13",
        "Weser-Ems": "6-14", "Lüneburg": "6-15", "Hannover": "6-16", "Braunschweig": "6-17",
        "Bremen": "6-18",
        "Mecklenburg-Vorpommern": "6-19", "Brandenburg": "6-20", "Berlin": "6-21",
        "Sachsen-Anhalt": "6-22", "Thüringen": "6-23", "Sachsen": "6-24",
        "Westfalen 1 (Münsterland/OWL)": "6-25", "Westfalen 2 (Südwestfalen)": "6-26",
        "Niederrhein 1 (Süd)": "6-27", "Niederrhein 2 (Nord)": "6-28",
        "Mittelrhein 1 (Ost)": "6-29", "Mittelrhein 2 (West)": "6-30",
        "Bayern Nordwest": "6-31", "Bayern Nordost": "6-32", "Bayern Mitte": "6-33",
        "Bayern Südwest": "6-34", "Bayern Südost": "6-35"
    },

    // LEAGUE_CENTERS wurde entfernt: die gepflegten Schwerpunkte lagen bis zu 121 km daneben
    // (6-32) und Berlin 7-8/7-9 trugen denselben Punkt. Seit _heimatBalance (v0.8.86) misst die
    // Balancierung gegen die ECHTEN Schwerpunkte der aktuellen Besetzung; die Tabelle war nur noch
    // Rückfall für eine Staffel ganz ohne Koordinaten – über 60 Saisons kein einziges Mal erreicht.

    DOWN_MAP: {}, 
    UP_MAP: {},

    // --- ROUTER V66 (Explizit + Verband) ---
    ROUTING_RULES: [
        // 1. HARDCODED FIXES (Die "Salmrohr-Klausel")
        // Diese Teams werden namentlich abgefangen, egal was in den Regionen steht.
        { 
            keys: ["Salmrohr", "Engers", "Karbach", "Koblenz", "Trier", "Mülheim-Kärlich", "Eisbachtal", "Ahrweiler"], 
            target: "Rheinlandliga" 
        },
        { 
            keys: ["Elversberg", "Saarbrücken", "Homburg", "Neunkirchen", "Völklingen", "Wiesbach", "Auersmacher"], 
            target: "Saarlandliga" 
        },
        
        // 2. VERBANDS-ZUWEISUNG (Daten-Basis)
        { keys: ["Fußballverband Rheinland"], target: "Rheinlandliga" },
        { keys: ["Südwestdeutscher Fußballverband"], target: "Verbandsliga Südwest" },
        { keys: ["Saarländischer Fußballverband"], target: "Saarlandliga" },

        // 3. REGIONALE FALLBACKS
        { keys: ["Saarland", "Saar"], target: "Saarlandliga" },
        { keys: ["Rheinland"], not: ["Pfalz", "Südwest", "Hessen"], target: "Rheinlandliga" },
        { keys: ["Südwest", "Pfalz", "Rheinhessen", "Nahe"], target: "Verbandsliga Südwest" },
        
        // 4. HAMBURG EXKLAVE
        { keys: ["Hamburg", "Altona", "Eimsbüttel"], target: "Oberliga Hamburg" }
    ],

    REGION_MAPPING: {
        "Regionalliga West": ["Westfalen", "Niederrhein", "Mittelrhein", "Nordrhein-Westfalen"],
        "Regionalliga Nordost": ["Berlin", "Brandenburg", "Mecklenburg-Vorpommern", "Sachsen", "Sachsen-Anhalt", "Thüringen"],
        "NOFV-Oberliga Nord": ["Berlin", "Brandenburg", "Mecklenburg-Vorpommern"],
        "NOFV-Oberliga Süd": ["Sachsen", "Sachsen-Anhalt", "Thüringen"],
        "Oberliga Niedersachsen": ["Niedersachsen"]
    },

    GEO_BLOCKED: ["Hamburg", "Saarland", "Berlin", "Bremen", "Hessen", "Südwest", "Baden", "Südbaden", "Württemberg", "Schleswig", "Niedersachsen", "Weser-Ems", "Lüneburg", "Hannover", "Braunschweig"],

    init: function() {
        if (typeof GAME_DATA === 'undefined') { alert("Daten fehlen!"); return false; }
        if (this.loadGame()) {
            console.log("Spielstand geladen.");
            const needsRebuild = Object.values(this.teams).some(t => !t.homeStats);
            if (needsRebuild && this.seasonResults.length > 0) {
                // homeStats/awayStats aus seasonResults rekonstruieren (alter Save ohne gespeicherte Stats)
                const apply = (s, gf, ga) => {
                    s.p++; s.gf += gf; s.ga += ga;
                    if (gf > ga) { s.w++; s.pts += 3; } else if (gf < ga) s.l++; else { s.d++; s.pts += 1; }
                };
                Object.values(this.teams).forEach(t => {
                    this.sanitizeTeam(t, GAME_DATA.teams[t.id]);
                    t.homeStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
                    t.awayStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
                });
                this.seasonResults.forEach(r => {
                    const h = this.teams[r.hId], a = this.teams[r.aId];
                    if (!h || !a) return;
                    apply(h.homeStats, r.s1, r.s2);
                    apply(a.awayStats, r.s2, r.s1);
                });
            } else {
                Object.values(this.teams).forEach(t => {
                    this.sanitizeTeam(t, GAME_DATA.teams[t.id]);
                    if(!t.homeStats) t.homeStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
                    if(!t.awayStats) t.awayStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
                });
            }
            const seedWasMissing = this.seasonSeed == null;
            if (!this.amateurpokal) this.initAmateurpokal();   // Altstand vor v0.8.71: Wettbewerb nachziehen
            this.generateSchedule(); // Spielplan deterministisch aus seasonSeed (Altsave: jetzt erzeugt)
            if (seedWasMissing) this.saveGame(); // Seed sofort festschreiben → Altsave reload-stabil
        }
        else {
            try {
                // Neues Spiel: eigene Kennung, und die Zeilen ohne Kennung gehoeren ihm NICHT.
                // Deshalb muss hier nichts geloescht werden - der alte Bestand wird unsichtbar, nicht
                // vernichtet. Wichtig, weil dieser Zweig auch bei einem BESCHAEDIGTEN Spielstand
                // feuert (loadGame faengt jeden Fehler ab): ein clear() wuerde dort die komplette
                // Chronik ausloeschen, obwohl vielleicht nur die Quota voll war.
                this.saveId = this._newSaveId();
                this.idbLegacy = false;
                this._applyIdbScope();
                this.history = [];
                this.archive = { ewige: {}, champions: {}, relegation: [], relStats: {} };
                this.currentSeasonOffset = 0;
                this.migrations = [];
                this.pokal = null;
                this.friendlies = [];
                this.leagues = JSON.parse(JSON.stringify(GAME_DATA.leagues));
                const rawTeams = {};
                Object.entries(GAME_DATA.teams).forEach(([id, t]) => {
                    rawTeams[id] = { id: t.id, name: t.name, leagueId: t.leagueId, regions: t.regions, lat: t.lat, lon: t.lon, isReserve: t.isReserve, parentId: t.parentId };
                });
                this.teams = rawTeams;
                // Ligalose bleiben ab v0.8.71 im State: leagueId=null ist ein gültiger Zustand (Amateurpokal
                // ist ihr Wettbewerb). Vorher wurden sie hier verworfen und existierten nur in GAME_DATA.
                Object.values(this.teams).forEach(t => {
                    if (GAME_DATA.teams[t.id]) t.thumb = GAME_DATA.teams[t.id].thumb;
                });
                this.calculateStrengths();
                this.generateDynamicTree(); 
                this.resetSeason();
                this.sortTables(); // Wichtig: Initiale Sortierung nach Stärke
            } catch (e) { console.error('Engine.init:', e); const el = document.getElementById('league-title'); if (el) el.innerText = 'Init-Fehler: ' + e.message; return false; }
        }
        this.generateDynamicTree();
        this.ensureSeasonFriendlies(); // Testspiele der aktuellen Saison sicherstellen (frisch + geladen)
        this._seedHistory(); // historische Abschlusstabellen in die ewige Statistik falten (idempotent)
        this._cupBackfill(); // dauerhafte Pokalsummen fuer Altstaende nachziehen (einmalig)
        this.loadVerbandspokalPlan();
        return true;
    },

    generateDynamicTree: function() {
        this.DOWN_MAP = JSON.parse(JSON.stringify(this.HARD_LINKS));
        this.UP_MAP = {};
        Object.keys(this.DOWN_MAP).forEach(p => this.DOWN_MAP[p].forEach(c => this.UP_MAP[c] = p));
    },

    _newSaveId: function() {
        return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
    },

    // Geltungsbereich an IDBStore durchreichen. MUSS nach jedem Laden und nach jedem Neustart laufen,
    // sonst liest die naechste Abfrage noch mit der Kennung des vorherigen Spielstands.
    _applyIdbScope: function() {
        if (typeof IDBStore !== 'undefined' && IDBStore.setScope) IDBStore.setScope(this.saveId, this.idbLegacy);
    },

    log: function(type, msg) {
        this.debugLog.push({ t: new Date().toLocaleTimeString(), season: this.getFormattedSeason ? this.getFormattedSeason() : '?', type, msg });
        if (this.debugLog.length > 1000) this.debugLog.shift();
    },

    sanityCheck: function() {
        const issues = [];
        if (!this.totalMatchdays || this.totalMatchdays < 2) issues.push(`totalMatchdays=${this.totalMatchdays}`);
        const counts = {};
        const orphans = [];
        Object.values(this.teams).forEach(t => {
            if (!t.leagueId) return;                       // ligalos = gültiger Zustand (Amateurpokal), kein Orphan
            if (!this.leagues[t.leagueId]) orphans.push(t);
            else counts[t.leagueId] = (counts[t.leagueId] || 0) + 1;
        });
        if (orphans.length) issues.push(`${orphans.length} Teams ohne Liga: ${orphans.slice(0,3).map(t=>t.name).join(', ')}`);
        Object.values(this.leagues).forEach(l => {
            if ((counts[l.id] || 0) < 2) issues.push(`${l.name}: ${counts[l.id] || 0} Teams`);
        });
        return issues;
    },

    getKeywords: function(name) {
        return name.replace(/(Liga|Verband|Landes|Bezirks|Kreis|Klasse|Staffel|Gruppe|Region|Ober|Nord|Süd|West|Ost|Mitte|1|2|3|\d+)/gi, "").split(/[\s\/-]+/).filter(w => w.length > 3);
    },

    resetSeason: function() {
        this.currentMatchday = 0;
        this._assignStartRanks(); // Saisonstart-Reihenfolge nach Vorsaison (Aufsteiger ans Ende)
        this.relegationResults = [];
        this.seasonResults = [];
        this.matchdayHistory = [];
        this.actionState = null; this.actionLive = null; // laufenden Action-Spieltag verwerfen
        this.seasonSeed = (Math.random() * 0xFFFFFFFF) >>> 0; // neuer Spielplan-Seed je Saison
        Object.values(this.teams).forEach(t => {
            t.stats     = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0, awayGf:0 };
            t.homeStats = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
            t.awayStats = { p:0, w:0, d:0, l:0, gf:0, ga:0, pts:0 };
        });
        this.generateSchedule();
        this.sortTables();
        if (!this.fastMode) {
            const issues = this.sanityCheck();
            if (issues.length) this.log('warn', `resetSeason: ${issues.join(' | ')}`);
            else this.log('info', `Saison gestartet — maxTag:${this.totalMatchdays} Teams:${Object.values(this.teams).length}`);
        }
        // Pokal sauber auf "noch nicht gespielt" zurückrollen; frische Auslosung kommt bei Spieltag 1 (initPokal)
        this.rollbackPokalToMatchday(0);
        this.rollbackAmateurToMatchday(0);
        // fastMode (Multi-Sim): KEIN Per-Saison-Save – sonst wird das wachsende Archiv jede Saison neu
        // serialisiert+komprimiert (linearer Slowdown). megaSim speichert am Ende (finish/cancel/exception).
        if (!this.fastMode) this.saveGame();
    },

    // Team → einer der 21 Landesverbände. Exakter Element-Match (nicht Substring):
    // verhindert dass 'Rheinland-Pfalz/Saar' fälschlich als 'Rheinland' zählt. Reihenfolge: spezifisch zuerst.
    _verbandOf: function(team) {
        const regs = team.regions || [];
        const VB = [
            ['Saarland',                ['Saarland']],
            ['Südbaden',                ['Südbaden']],
            ['Baden',                   ['Baden']],
            ['Württemberg',             ['Württemberg']],
            ['Hessen',                  ['Hessen']],
            ['Rheinland',               ['Fußballverband Rheinland','Rheinland Mitte','Rheinland West','Rheinland Ost','Rheinland']],
            ['Südwest',                 ['Südwestdeutscher Fußballverband','Vorderpfalz','Rheinhessen','Westpfalz','Nahe']],
            ['Schleswig-Holstein',      ['Schleswig-Holstein']],
            ['Hamburg',                 ['Hamburg']],
            ['Bremen',                  ['Bremen']],
            ['Niedersachsen',           ['Niedersachsen']],
            ['Mecklenburg-Vorpommern',  ['Mecklenburg-Vorpommern']],
            ['Brandenburg',             ['Brandenburg']],
            ['Berlin',                  ['Berlin']],
            ['Sachsen-Anhalt',          ['Sachsen-Anhalt']],
            ['Thüringen',               ['Thüringen']],
            ['Sachsen',                 ['Sachsen']],
            ['Westfalen',               ['Westfalen']],
            ['Niederrhein',             ['Niederrhein']],
            ['Mittelrhein',             ['Mittelrhein']],
            ['Bayern',                  ['Bayern']]
        ];
        for (const [vb, tags] of VB) if (regs.some(r => tags.includes(r))) return vb;
        return null;
    },

    // Verbandspokal: einfacher KO unter den Amateuren eines Verbands → emergenter Sieger (kein Bias).
    _simulateVerbandCup: function(ids) {
        return this._simulateVerbandCupAdvanced(ids, null);
    },

    // KO mit optionalen Freilosen (byeIds überspringen die erste Runde).
    _simulateVerbandCupAdvanced: function(ids, byeIds) {
        if (!ids || !ids.length) return null;
        const bye = byeIds instanceof Set ? byeIds : (byeIds ? new Set(byeIds) : new Set());
        const shuffle = arr => {
            for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
            return arr;
        };
        let pool = shuffle(ids.filter(id => this.teams[id]));
        if (!pool.length) return null;
        let pendingByes = pool.filter(id => bye.has(id));
        let fighters = pool.filter(id => !bye.has(id));
        const playRound = list => {
            const next = [];
            for (let i = 0; i < list.length; i += 2) {
                if (i + 1 >= list.length) { next.push(list[i]); continue; }
                const h = this.teams[list[i]], a = this.teams[list[i + 1]];
                if (!h || !a) { next.push(h ? list[i] : list[i + 1]); continue; }
                const res = this.simulateKnockoutMatch(h, a);
                let w;
                if (res.score1 !== res.score2) w = res.score1 > res.score2 ? list[i] : list[i + 1];
                else w = Math.random() < (h.strength || 50) / ((h.strength || 50) + (a.strength || 50)) ? list[i] : list[i + 1];
                next.push(w);
            }
            return next;
        };
        if (fighters.length > 1) fighters = playRound(fighters);
        else if (!fighters.length && pendingByes.length) fighters = pendingByes.splice(0);
        pool = shuffle(fighters.concat(pendingByes));
        pendingByes = [];
        while (pool.length > 1) pool = shuffle(playRound(pool));
        return pool[0] || null;
    },

    VP_PLAN_KEY: 'ba_vp_plan_v1',

    loadVerbandspokalPlan: function() {
        try {
            const raw = localStorage.getItem(this.VP_PLAN_KEY);
            this.verbandspokalPlan = raw ? JSON.parse(raw) : null;
        } catch (e) { this.verbandspokalPlan = null; }
        return this.verbandspokalPlan;
    },

    setVerbandspokalPlan: function(plan) {
        this.verbandspokalPlan = plan || null;
        if (plan) localStorage.setItem(this.VP_PLAN_KEY, JSON.stringify(plan));
        else localStorage.removeItem(this.VP_PLAN_KEY);
    },

    getVerbandspokalPlanInfo: function() {
        const p = this.verbandspokalPlan || this.loadVerbandspokalPlan();
        if (!p || !p._meta) return null;
        return {
            applies: this._vpPlanApplies(p),
            season: p._meta.planAppliesFromSeason,
            basis: p._meta.basisSeason,
            cups: (p.cups || []).length
        };
    },

    _vpPlanApplies: function(plan) {
        if (!plan || !plan._meta) return false;
        const m = plan._meta;
        if (m.planAppliesFromSeasonOffset != null && m.planAppliesFromSeasonOffset === this.currentSeasonOffset) return true;
        if (m.planAppliesFromSeason && m.planAppliesFromSeason === this.getFormattedSeason()) return true;
        return false;
    },

    // Slot-Regel → teamId zur Laufzeit (Platzhalter-Auflösung für VP-Plan).
    resolveVpSlot: function(rule) {
        if (!rule) return null;
        if (rule.type === 'ligalos' && rule.teamId) {
            const t = this.teams[rule.teamId];
            return (t && !t.isReserve) ? rule.teamId : null;
        }
        if (rule.leagueId && rule.rank) {
            const list = Object.values(this.teams).filter(t => !t.isReserve && t.leagueId === rule.leagueId)
                .sort((a, b) => (a.rank || 999) - (b.rank || 999));
            const t = list[rule.rank - 1];
            return t ? t.id : null;
        }
        return null;
    },

    _resolvePlanCupParticipants: function(cupDef, pros) {
        const ids = [], byeIds = new Set();
        for (const e of (cupDef.entries || [])) {
            const id = this.resolveVpSlot(e.rule) || e.resolvedTeamId;
            if (!id || pros.has(id) || !this.teams[id]) continue;
            if (ids.includes(id)) continue;
            ids.push(id);
            if (e.bye || e.zone === 'bye') byeIds.add(id);
        }
        return { ids, byeIds };
    },

    _vpWinnersFromPlan: function(plan, pros) {
        const winners = [], verbandMap = {};
        const EXTRA = ['Bayern', 'Niedersachsen', 'Westfalen'];
        const VB_ORDER = ['Saarland','Südbaden','Baden','Württemberg','Hessen','Rheinland','Südwest','Schleswig-Holstein','Hamburg','Bremen','Niedersachsen','Mecklenburg-Vorpommern','Brandenburg','Berlin','Sachsen-Anhalt','Thüringen','Sachsen','Westfalen','Niederrhein','Mittelrhein','Bayern'];
        const byVerband = {};
        for (const cup of (plan.cups || [])) {
            if (!cup.verband) continue;
            const { ids, byeIds } = this._resolvePlanCupParticipants(cup, pros);
            if (!ids.length) continue;
            const w = this._simulateVerbandCupAdvanced(ids, byeIds);
            if (!w) continue;
            (byVerband[cup.verband] = byVerband[cup.verband] || []).push({ winner: w, cupId: cup.cupId, ids, byeIds });
        }
        const addWinner = (id, vb) => {
            if (!id || winners.includes(id)) return;
            winners.push(id);
            verbandMap[id] = vb;
        };
        for (const vb of VB_ORDER) {
            const list = byVerband[vb] || [];
            if (!list.length) continue;
            addWinner(list[0].winner, vb);
            if (EXTRA.includes(vb)) {
                if (list.length > 1) addWinner(list[1].winner, vb);
                else {
                    const rest = list[0].ids.filter(x => x !== list[0].winner);
                    const w2 = this._simulateVerbandCupAdvanced(rest, list[0].byeIds);
                    addWinner(w2, vb);
                }
            }
        }
        return { winners, verbandMap };
    },

    _legacyVerbandCupWinners: function(pros) {
        const lvlOf = t => parseInt((t.leagueId || '0').split('-')[0]) || 0;
        const amateurs = Object.values(this.teams).filter(t => !t.isReserve && lvlOf(t) >= 4 && !pros.has(t.id));
        const groups = {};
        amateurs.forEach(t => { const vb = this._verbandOf(t); if (vb) (groups[vb] = groups[vb] || []).push(t.id); });
        const cupWinners = [], vpVerband = {};
        const EXTRA = ['Bayern', 'Niedersachsen', 'Westfalen'];
        Object.keys(groups).forEach(vb => {
            const w1 = this._simulateVerbandCup(groups[vb]);
            if (w1) { cupWinners.push(w1); vpVerband[w1] = vb; }
            if (EXTRA.includes(vb)) {
                const w2 = this._simulateVerbandCup(groups[vb].filter(x => x !== w1));
                if (w2) { cupWinners.push(w2); vpVerband[w2] = vb; }
            }
        });
        return { winners: cupWinners, verbandMap: vpVerband };
    },

    // Heimrecht für den unterklassigen Verein (höheres Level = unterklassig = Heim); gleiches Level → zufällig
    _pokalHomeFirst: function(idA, idB) {
        const lvl = id => parseInt((this.teams[id]?.leagueId || '0').split('-')[0]) || 0;
        const la = lvl(idA), lb = lvl(idB);
        if (la !== lb) return la > lb ? [idA, idB] : [idB, idA];
        return Math.random() < 0.5 ? [idA, idB] : [idB, idA];
    },

    initPokal: function() {
        const shuffle = arr => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };
        const lvlOf = t => parseInt((t.leagueId || '0').split('-')[0]) || 0;
        // Profis qualifizieren sich direkt: alle BL + 2.BL + Top-4 der 3. Liga (Vorsaison-Platzierung)
        const l1 = Object.values(this.teams).filter(t => !t.isReserve && t.leagueId === '1').map(t => t.id);
        const l2 = Object.values(this.teams).filter(t => !t.isReserve && t.leagueId === '2').map(t => t.id);
        const lastHist = (this.history && this.history.length) ? this.history[this.history.length - 1] : null;
        const prevRank = id => (lastHist && lastHist.teams[id] && lastHist.teams[id].leagueId === '3') ? (lastHist.teams[id].rank || 99) : 99;
        // Top-4 der 3. Liga: nach Vorsaison-Platz; ohne History (1. Saison) Fallback auf Stärke
        const l3top4 = Object.values(this.teams).filter(t => !t.isReserve && t.leagueId === '3')
            .sort((a, b) => prevRank(a.id) - prevRank(b.id) || (b.strength || 0) - (a.strength || 0))
            .slice(0, 4).map(t => t.id);
        const pros = new Set([...l1, ...l2, ...l3top4]);

        // Verbandspokalsieger: VP-Plan (ba_vp_plan_v1) wenn für diese Saison gültig, sonst Legacy-KO
        let cupWinners = [];
        const vpVerband = {};
        const vpPlan = this.verbandspokalPlan || this.loadVerbandspokalPlan();
        if (vpPlan && this._vpPlanApplies(vpPlan)) {
            const fromPlan = this._vpWinnersFromPlan(vpPlan, pros);
            cupWinners = fromPlan.winners;
            Object.assign(vpVerband, fromPlan.verbandMap);
        } else {
            const leg = this._legacyVerbandCupWinners(pros);
            cupWinners = leg.winners;
            Object.assign(vpVerband, leg.verbandMap);
        }

        const amateurs = Object.values(this.teams).filter(t => !t.isReserve && lvlOf(t) >= 4 && !pros.has(t.id));

        // Auf exakt 64 bringen – niemals 'undefined'-Paarungen
        let participants = [...new Set([...pros, ...cupWinners])];
        if (participants.length < 64) {
            const have = new Set(participants);
            const fill = shuffle(amateurs.map(t => t.id).filter(id => !have.has(id)));
            while (participants.length < 64 && fill.length) participants.push(fill.shift());
            if (participants.length < 64) {
                const more = shuffle(Object.values(this.teams).filter(t => !t.isReserve && !have.has(t.id) && !participants.includes(t.id)).map(t => t.id));
                while (participants.length < 64 && more.length) participants.push(more.shift());
            }
        }
        participants = shuffle(participants).slice(0, 64);

        // Qualifikations-Metadaten für Teilnehmerfeld-Badges
        const entrants = {};
        const setE = (ids, type) => ids.forEach(id => { if (!entrants[id]) entrants[id] = { type }; });
        setE(l1, 'BL'); setE(l2, '2BL'); setE(l3top4, '3L');
        cupWinners.forEach(id => { if (!entrants[id]) entrants[id] = { type: 'VP', verband: vpVerband[id] }; });
        participants.forEach(id => { if (!entrants[id]) entrants[id] = { type: 'fill' }; });

        // Lostöpfe (echtes DFB-Verfahren, KEIN Nord/Süd – national gibt es das nicht): nach Stärke seeden →
        // Topf 1 = stärkste Hälfte (BL + beste 2.BL), Topf 2 = schwächere Hälfte (auch schwache Profis landen hier).
        // Auslosung 1. Runde: jedes Topf-2-Team hat Heimrecht gegen ein zufällig gezogenes Topf-1-Team.
        const prevRankAny = id => (lastHist && lastHist.teams[id]) ? (lastHist.teams[id].rank || 50) : 50;
        const seeded = participants.slice().sort((a, b) =>
            lvlOf(this.teams[a]) - lvlOf(this.teams[b]) ||
            prevRankAny(a) - prevRankAny(b) ||
            (this.teams[b].strength || 0) - (this.teams[a].strength || 0));
        const half = Math.floor(seeded.length / 2);
        seeded.slice(0, half).forEach(id => { if (entrants[id]) entrants[id].topf = 1; });
        seeded.slice(half).forEach(id  => { if (entrants[id]) entrants[id].topf = 2; });
        const topf1 = shuffle(seeded.slice(0, half));   // stärkere Hälfte → Auswärts
        const topf2 = shuffle(seeded.slice(half));      // schwächere Hälfte → Heimrecht
        const r1 = [];
        for (let i = 0; i < Math.min(topf1.length, topf2.length); i++) {
            r1.push({ hId: topf2[i], aId: topf1[i], hGoals: null, aGoals: null, winnerId: null, nv: false, penalties: false });
        }
        this.pokal = {
            rounds: [
                { name: '1. Runde',      matchday: 2,  matches: r1, played: false },
                { name: '2. Runde',      matchday: 8,  matches: [], played: false },
                { name: 'Achtelfinale',  matchday: 14, matches: [], played: false },
                { name: 'Viertelfinale', matchday: 20, matches: [], played: false },
                { name: 'Halbfinale',    matchday: 27, matches: [], played: false },
                { name: 'Finale',        matchday: 34, matches: [], played: false }
            ],
            entrants: entrants,
            hasNewResults: false,
            winner: null
        };
        if (!this.fastMode) {
            const vpNote = (vpPlan && this._vpPlanApplies(vpPlan)) ? `VP-Plan ${vpPlan._meta.planAppliesFromSeason}` : 'Legacy-VP';
            this.log('info', `Pokal ausgelost: ${r1.length} Erstrundenspiele, ${cupWinners.length} VP-Sieger (${vpNote})`);
        }
    },

    // Pokal-Runden zurückrollen die nach Spieltag `md` lägen (für Spieltag-Undo / Saison-Reset).
    // Pokal läuft asynchron zur Liga – Runden an festen Spieltagen (2/8/14/20/27/34).
    rollbackPokalToMatchday: function(md) {
        if (!this.pokal) return;
        const rounds = this.pokal.rounds;
        rounds.forEach(r => {
            if (r.played && r.matchday > md) {
                r.played = false;
                r.matches.forEach(m => { m.hGoals = null; m.aGoals = null; m.winnerId = null; m.nv = false; m.penalties = false; });
            }
        });
        // Paarungen einer Runde existieren nur, wenn die Feeder-Runde gespielt ist
        for (let i = 1; i < rounds.length; i++) if (!rounds[i - 1].played) rounds[i].matches = [];
        const fin = rounds[rounds.length - 1];
        this.pokal.winner = fin.played ? (fin.matches[0]?.winnerId || null) : null;
        this.pokal.hasNewResults = false;
    },

    // Erwartete Tore beider Seiten - EIN Modell fuer Liga, DFB-Pokal, Verbandspokal und
    // Amateurpokal. Drei Wuerfel greifen ineinander:
    //
    // (1) NIVEAU: je tiefer die Spielklasse, desto mehr Tore. Das ist keine bessere Offensive,
    //     sondern eine schlechtere Defensive - unten wird gepatzt, nicht besser gestuermt.
    //     Traeger ist die ECHTE Staerke (ohne Tagesform), sonst schwankte das Niveau von Spiel
    //     zu Spiel. Staerke kommt aus der Ligaebene (calculateStrengths: 109 - 10*level).
    //
    //     KALIBRIERT AUF GEMESSENE WIRKLICHKEIT (nicht geschaetzt), Ebene 1-4 aus 15.024
    //     Einzelergebnissen (openfootball, bis 16 Saisons), Ebene 5-8 aus 195 Abschlusstabellen
    //     der Saison 2025/26 (FuPa). Werkzeuge: tools/torverteilung_real.mjs, tools/torschnitt_fupa.mjs.
    //
    //         Ebene   1     2     3     4     5     6     7     8      (9)   (10)  (11)
    //         real  3,04  2,79  2,73  3,04  3,66  3,87  4,04  4,34    4,60  4,72  4,96
    //
    //     Diese Kurve ist KEINE Gerade: Ebene 1-4 liegt flach bei ~2,7-3,1 und faellt in der
    //     3. Liga sogar unter die Bundesliga; erst an der Grenze Regionalliga/Oberliga springt
    //     sie um ~0,5 und steigt ab da um ~0,22 je Ebene. Das ist die Grenze zwischen bezahltem
    //     und Amateurfussball, und sie ist im selben Datensatz derselben Saison sichtbar
    //     (FuPa 2025/26: Ebene 4 = 3,21, Ebene 5 = 3,66) - also kein Quellen- oder Epochenartefakt.
    //     Deshalb GOAL_KNEE/GOAL_STEP: oberhalb der Grenze zaehlt nur GOAL_BASE, unterhalb kommt
    //     der Sprung plus der Zuschlag je Staerkepunkt.
    //
    //     Eine Gerade ueber alle acht Ebenen (2,74 + 0,0193 je Punkt) traf Ebene 1 und 5-8 zwar
    //     auf +-0,1, lag in der Halbprofi-Delle aber bis zu 0,67 daneben (3. Liga 3,40 statt
    //     2,73). Mit dem Knick bleiben ueberall <=0,25.
    //
    //     Die frueheren 2,8/0,028 liefen von Ebene 1 an linear hoch und lagen ab der 3. Liga
    //     0,6-1,0 Tore zu hoch (Ebene 8: 5,07 statt 4,34).
    //
    // (2) ABSTAND: je groesser der Klassenunterschied, desto mehr Tore INSGESAMT. Ein Favorit
    //     hoert nicht auf, wenn die Abwehr nicht mehr mitkommt.
    //
    // (3) VERTEILUNG: derselbe Abstand entscheidet ueber die AUFTEILUNG (Logistik). Bei Augenhoehe
    //     ~50:50, bei zwei Klassen Unterschied faellt fast alles auf eine Seite.
    //
    // eH/eA = Tagesform-Werte (inkl. Heimvorteil), sH/sA = echte Staerken.
    GOAL_BASE: 2.63,       // Grundniveau Ebene 1-4; mit Abstand+Ermuedung ~2,95 Tore/Spiel
    GOAL_KNEE: 69,         // Staerke der Grenze bezahlt/Amateur (Ebene 4 = Regionalliga)
    GOAL_STEP: 0.56,       // einmaliger Sprung unterhalb dieser Grenze
    GOAL_LEVEL: 0.0224,    // Zuschlag je Staerkepunkt UNTERHALB der Grenze -> Bezirksliga ~4,2
    GOAL_GAP: 0.02,        // Zuschlag je Punkt Klassenunterschied (gedeckelt bei 70)
    GOAL_SPLIT: 12,        // Logistik-Breite der Aufteilung: kleiner = einseitiger
    GOAL_DRAW: 0.28,       // Remis-Korrektur (s. simulateMatch)
    GOAL_SAT: 5,           // ab dem wievielten Tor einer Mannschaft die Ermuedung greift
    GOAL_FADE: 0.5,        // Ueberlebenswahrscheinlichkeit jedes weiteren Tores (s. _torZiehung)

    _goalRates: function(eH, eA, sH, sA) {
        const avg = ((sH || 50) + (sA || 50)) / 2;
        const unten = Math.max(0, this.GOAL_KNEE - avg);
        const basis = this.GOAL_BASE + (unten > 0 ? this.GOAL_STEP + unten * this.GOAL_LEVEL : 0);
        const d = eH - eA;
        const total = basis + Math.min(Math.abs(d), 70) * this.GOAL_GAP;
        const p = 1 / (1 + Math.exp(-d / this.GOAL_SPLIT));
        return { h: total * p, a: total * (1 - p) };
    },


    // Poisson-Sampler (Knuth). cap ist optional (Vorgabe 6); der einzige Aufrufer _torZiehung
    // zieht ungedeckelt und bremst den Schwanz stattdessen weich ab – s. dort, warum.
    _poisson: function(lambda, cap) {
        const L = Math.exp(-lambda); let k = 0, p = 1;
        do { k++; p *= Math.random(); } while (p > L);
        return Math.min(k - 1, cap == null ? 6 : cap);
    },

    // Torzahl EINER Mannschaft: Poisson + Ermuedung. Einzige Ziehstelle fuer Liga UND beide Pokale.
    //
    // Poisson allein hat einen zu fetten Schwanz. Gemessen bei praktisch gleichem Torschnitt
    // (Ebene 1: real 3,04 / Engine 3,16), Anteil Spiele mit >=X Toren einer Mannschaft:
    //
    //                 >=6      >=8     >=10     >=12    hoechster Wert
    //     real      1,98 %   0,21 %   0,00 %   0,00 %       9        (5211 Spiele)
    //     Poisson   4,41 %   0,59 %   0,07 %   0,03 %      12        (3060 Spiele)
    //
    // In 63 Bundesligasaisons (~19.400 Spielen) gab es GENAU EIN Spiel mit 12 Toren einer
    // Mannschaft. Die Engine schaffte das in einem Jahrzehnt, in den Oberligen (38.000 Spiele
    // je 10 Saisons) stand am Ende ein 16:0. Der Grund ist keine falsche Torerwartung, sondern
    // die Verteilung um sie herum: eine fuehrende Mannschaft laesst nach, Poisson nicht.
    //
    // Deshalb ueberlebt jedes Tor ab dem GOAL_SAT-ten nur noch mit GOAL_FADE. Das ist bewusst
    // KEIN Deckel - ein Cap war frueher eine Wand, hinter der sich alles auf exakt einer Zahl
    // stapelte (nach 500 Saisons stand in jedem Spielstand 9:0 als Rekord). Hier faellt die
    // Wahrscheinlichkeit stattdessen geometrisch: ein 10:0 bleibt moeglich, ein 16:0 braucht
    // elf Muenzwuerfe hintereinander und kommt praktisch nicht mehr vor.
    _torZiehung: function(lambda) {
        const k = this._poisson(lambda, Infinity);
        if (k <= this.GOAL_SAT) return k;
        let g = this.GOAL_SAT;
        for (let i = this.GOAL_SAT; i < k; i++) if (Math.random() < this.GOAL_FADE) g++;
        return g;
    },

    // Elfmeterschießen: Best-of-5 mit Früh-Abbruch (uneinholbar) + Sudden Death; Trefferquote ~70% leicht
    // stärkegewichtet. Gibt {h,a,winner} mit realistischem Schützen-Stand (4:2, 5:4, Sudden Death 7:6 …).
    _penaltyShootout: function(h, a) {
        const conv = s => Math.min(0.85, Math.max(0.60, 0.70 + ((s || 50) - 50) * 0.0025));
        const pH = conv(h && h.strength), pA = conv(a && a.strength);
        let gh = 0, ga = 0, kh = 0, ka = 0; // Tore + bereits geschossene Elfmeter je Team
        for (let i = 0; i < 5; i++) {
            if (Math.random() < pH) gh++; kh++;
            if (gh > ga + (5 - ka)) break;        // Heim uneinholbar vorn
            if (Math.random() < pA) ga++; ka++;
            if (ga > gh + (5 - kh)) break;        // Auswärts uneinholbar vorn
        }
        while (gh === ga) {                        // Sudden Death (je 1 Schuss, bis Entscheidung)
            const sh = Math.random() < pH ? 1 : 0, sa = Math.random() < pA ? 1 : 0;
            gh += sh; ga += sa;
        }
        return { h: gh, a: ga, winner: gh > ga ? 'h' : 'a' };
    },

    simulateKnockoutMatch: function(h, a, noise) {
        // noise = Tagesform-Rauschen (rundenabhängig, steuert Upset-Wahrscheinlichkeit). h = Heim (+3 Bonus).
        // Tore aus dem gemeinsamen Modell _goalRates (Niveau + Klassenunterschied), s. dort.
        noise = noise || 8;
        const eff1 = (h.strength || 50) + 3 + (Math.random() * 2 * noise - noise);
        const eff2 = (a.strength || 50) + (Math.random() * 2 * noise - noise);
        // Gemeinsames Tor-Modell mit der Liga (_goalRates): Niveau + Klassenunterschied.
        const rate = this._goalRates(eff1, eff2, h.strength || 50, a.strength || 50);
        const P = this._torZiehung.bind(this);
        // Gezogen wird ueber _torZiehung - Poisson MIT Ermuedung, dieselbe wie in der Liga.
        // Immer noch kein Deckel (der war eine Wand, s. dort); der Schwanz faellt jetzt nur
        // geometrisch statt Poisson-fett, sonst stuende auch im Pokal irgendwann ein 16:0.
        let g1 = P(rate.h), g2 = P(rate.a);
        if (g1 !== g2) return { score1: g1, score2: g2, decided: 'reg', winner: g1 > g2 ? 'h' : 'a' };
        // 90 min Remis → Verlängerung (geringere Torerwartung)
        g1 += P(rate.h * 0.33);
        g2 += P(rate.a * 0.33);
        if (g1 !== g2) return { score1: g1, score2: g2, decided: 'aet', winner: g1 > g2 ? 'h' : 'a' };
        // Weiter Remis → Elfmeterschießen (simulierter Schützen-Stand)
        const so = this._penaltyShootout(h, a);
        return { score1: g1, score2: g2, decided: 'pen', winner: so.winner, pso: `${so.h}:${so.a}` };
    },

    // Gestaffeltes KO-Spiel für den Action-Halbzeit-Modus: 2 Teile (1.HZ, Endstand 90′) bis 5 Teile
    // (+ Verlängerung 1./2. HZ + Elfmeter). parts[] = kumulative Zwischenstände; finales Ergebnis identisch zu simulateKnockoutMatch.
    _simulateKnockoutStaged: function(h, a, noise) {
        noise = noise || 8;
        const eff1 = (h.strength || 50) + 3 + (Math.random() * 2 * noise - noise);
        const eff2 = (a.strength || 50) + (Math.random() * 2 * noise - noise);
        // Gemeinsames Tor-Modell mit der Liga (_goalRates): Niveau + Klassenunterschied.
        const rate = this._goalRates(eff1, eff2, h.strength || 50, a.strength || 50);
        const P = this._torZiehung.bind(this);
        const splitH = g => { let x = 0; for (let i = 0; i < g; i++) if (Math.random() < 0.45) x++; return x; };
        // Gezogen wird ueber _torZiehung - Poisson MIT Ermuedung, dieselbe wie in der Liga.
        // Immer noch kein Deckel (der war eine Wand, s. dort); der Schwanz faellt jetzt nur
        // geometrisch statt Poisson-fett, sonst stuende auch im Pokal irgendwann ein 16:0.
        let g1 = P(rate.h), g2 = P(rate.a);
        const g1a = splitH(g1), g2a = splitH(g2);
        const parts = [{ label:'1. Halbzeit', h:g1a, a:g2a }, { label:'Endstand', h:g1, a:g2 }];
        if (g1 !== g2) return { parts, score1:g1, score2:g2, winner: g1>g2?'h':'a', decided:'reg' };
        parts[1].label = '90′';                                  // Remis nach 90 → Verlängerung
        const e1 = P(rate.h * 0.33), e2 = P(rate.a * 0.33);
        const e1a = splitH(e1), e2a = splitH(e2);
        parts.push({ label:'Verläng. 1. HZ', h:g1+e1a, a:g2+e2a });
        parts.push({ label:'n.V. (120′)', h:g1+e1, a:g2+e2 });
        g1 += e1; g2 += e2;
        if (g1 !== g2) return { parts, score1:g1, score2:g2, winner: g1>g2?'h':'a', decided:'aet' };
        const so = this._penaltyShootout(h, a);
        parts.push({ label:`Elfmeterschießen ${so.h}:${so.a}`, h:g1, a:g2, pso:`${so.h}:${so.a}` });
        return { parts, score1:g1, score2:g2, winner: so.winner, decided:'pen', pso:`${so.h}:${so.a}` };
    },

    // Teilmenge einer Pokalrunde spielen (Ergebnisse setzen) – für Action-Modus Di/Mi-Split.
    _playPokalMatches: function(roundIdx, matches) {
        // Rundenabhängige Upset-Stärke: frühe Runden mehr Pokalmagie, Endrunden Favoriten verlässlicher
        const NOISE = [16, 16, 12, 12, 9, 9];
        const noise = NOISE[roundIdx] != null ? NOISE[roundIdx] : 8;
        (matches || []).forEach(m => {
            const h = this.teams[m.hId], a = this.teams[m.aId];
            if (!h || !a) { m.winnerId = m.hId; return; }
            const res = this.simulateKnockoutMatch(h, a, noise);
            m.hGoals = res.score1; m.aGoals = res.score2;
            m.winnerId = res.winner === 'h' ? m.hId : m.aId;
            m.nv = res.decided === 'aet';        // nach Verlängerung entschieden
            m.penalties = res.decided === 'pen'; // im Elfmeterschießen entschieden
            m.pso = res.pso || null;             // Schützen-Stand (z.B. "5:4")
        });
        this.pokal.hasNewResults = true;
    },

    // Runde abschließen: played setzen + nächste Runde auslosen (oder Sieger küren).
    _advancePokalRound: function(roundIdx) {
        const round = this.pokal.rounds[roundIdx];
        round.played = true;
        const next = this.pokal.rounds[roundIdx + 1];
        if (next) {
            const winners = round.matches.map(m => m.winnerId).filter(Boolean);
            next.matches = [];
            // 2. Runde (aus roundIdx 0): weiterhin Heimrecht für Underdog; ab Achtelfinale neutrale Auslosungsreihenfolge
            for (let i = 0; i + 1 < winners.length; i += 2) {
                const pair = roundIdx === 0 ? this._pokalHomeFirst(winners[i], winners[i + 1]) : [winners[i], winners[i + 1]];
                next.matches.push({ hId: pair[0], aId: pair[1], hGoals: null, aGoals: null, winnerId: null, nv: false, penalties: false });
            }
        } else {
            this.pokal.winner = round.matches[0]?.winnerId || null;
        }
        this.log('info', `Pokal ${round.name} gespielt`);
    },

    simulatePokalRound: function(roundIdx) {
        const round = this.pokal.rounds[roundIdx];
        if (!round || round.played || !round.matches.length) return;
        this._playPokalMatches(roundIdx, round.matches);
        this._advancePokalRound(roundIdx);
    },

    // ── AMATEURPOKAL ─────────────────────────────────────────────────────────
    // Bundesweiter KO aller ligalosen Vereine – für sie der Ersatz für den Ligabetrieb, unabhängig von den
    // Verbandspokalen. Die 16 Sieger des Sechzehntelfinals (= die Achtelfinalisten) steigen in die Bodenliga
    // ihrer Heimat-Pyramide auf; danach wird nur noch der Titel ausgespielt.
    // Das Feld ist konstant (Auf-/Abstieg strikt 1:1), heute 261 → 5 Qualifikationsspiele auf 256.
    AMATEUR_ROUNDS: [
        { name: 'Qualifikation',     matchday: 2  },
        { name: '1. Runde',          matchday: 4  },
        { name: '2. Runde',          matchday: 7  },
        { name: '3. Runde',          matchday: 10 },  // ab hier 64 Teams → Bracket wie beim DFB-Pokal
        { name: 'Sechzehntelfinale', matchday: 14 },  // Sieger = Aufsteiger
        { name: 'Achtelfinale',      matchday: 18 },
        { name: 'Viertelfinale',     matchday: 23 },
        { name: 'Halbfinale',        matchday: 28 },
        { name: 'Finale',            matchday: 33 }
    ],
    AMATEUR_PROMO_ROUND: 4,   // Index des Sechzehntelfinals in AMATEUR_ROUNDS
    AMATEUR_BRACKET_ROUND: 3, // ab dieser Runde stehen 64 Teams → Bracket-Darstellung

    // Ziel-Bodenliga eines Aufsteigers. Wie homeFloorLeagueId, aber bei mehreren Kindstaffeln (Berlin 7-8/7-9,
    // rein per Auslosung ohne Geografie) die dünnere statt immer [0] – sonst bekäme Staffel 2 nie einen.
    amateurTargetLeagueId: function(team) {
        let id = this.resolveHomeLeagueId(team);
        if (!id || !this.leagues[id]) return null;
        let guard = 0;
        while (this.DOWN_MAP[id] && this.DOWN_MAP[id].length && guard++ < 12) {
            const kids = this.DOWN_MAP[id];
            if (kids.length === 1) { id = kids[0]; continue; }
            const size = lid => Object.values(this.teams).filter(t => t.leagueId === lid).length;
            id = kids.slice().sort((a, b) => size(a) - size(b))[0];
        }
        return id;
    },

    ligalosTeams: function() {
        return Object.values(this.teams).filter(t => !t.leagueId);
    },

    initAmateurpokal: function() {
        const ids = this.ligalosTeams().map(t => t.id);
        if (ids.length < 8) { this.amateurpokal = null; return; }
        const shuffle = arr => {
            for (let i = arr.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [arr[i], arr[j]] = [arr[j], arr[i]];
            }
            return arr;
        };
        // Setzliste nach Stärke (analog DFB-Lostöpfe): die schwächsten müssen in die Qualifikation, alle
        // anderen haben Freilos bis zur 1. Runde. Frisch Abgestiegene sind dadurch nie in der Quali.
        const seeded = ids.slice().sort((a, b) => (this.teams[b].strength || 0) - (this.teams[a].strength || 0));
        const pow2 = 1 << Math.floor(Math.log2(seeded.length));
        const qTeams = seeded.length - pow2;              // 261 → 5 Spiele, 10 Teams
        const qPool = shuffle(seeded.slice(seeded.length - qTeams * 2));
        const byes = seeded.slice(0, seeded.length - qTeams * 2);
        const q = [];
        for (let i = 0; i + 1 < qPool.length; i += 2)
            q.push({ hId: qPool[i], aId: qPool[i + 1], hGoals: null, aGoals: null, winnerId: null, nv: false, penalties: false });

        this.amateurpokal = {
            rounds: this.AMATEUR_ROUNDS.map((r, i) => ({
                name: r.name, matchday: r.matchday, matches: i === 0 ? q : [], played: q.length === 0 && i === 0
            })),
            byes: byes,
            field: ids.length,
            hasNewResults: false,
            winner: null,
            promoted: []
        };
        // Feld exakt 2er-Potenz (theoretisch): Quali entfällt, Freilose ziehen direkt in die 1. Runde
        if (!q.length) this._advanceAmateurRound(0);
        if (!this.fastMode) this.log('info', `Amateurpokal ausgelost: ${ids.length} Vereine, ${q.length} Qualifikationsspiele`);
    },

    _playAmateurMatches: function(roundIdx, matches) {
        // Alle Teilnehmer liegen auf derselben virtuellen Ebene → Rauschen erzeugt hier die Pokalmagie,
        // nicht der Klassenunterschied. Späte Runden laufen berechenbarer.
        const NOISE = [18, 16, 16, 14, 12, 12, 10, 9, 9];
        const noise = NOISE[roundIdx] != null ? NOISE[roundIdx] : 9;
        (matches || []).forEach(m => {
            const h = this.teams[m.hId], a = this.teams[m.aId];
            if (!h || !a) { m.winnerId = m.hId; return; }
            const res = this.simulateKnockoutMatch(h, a, noise);
            m.hGoals = res.score1; m.aGoals = res.score2;
            m.winnerId = res.winner === 'h' ? m.hId : m.aId;
            m.nv = res.decided === 'aet';
            m.penalties = res.decided === 'pen';
            m.pso = res.pso || null;
        });
        this.amateurpokal.hasNewResults = true;
    },

    _advanceAmateurRound: function(roundIdx) {
        const A = this.amateurpokal;
        const round = A.rounds[roundIdx];
        round.played = true;
        // Sechzehntelfinale gespielt → die 16 Sieger sind Achtelfinalisten UND Aufsteiger
        if (roundIdx === this.AMATEUR_PROMO_ROUND)
            A.promoted = round.matches.map(m => m.winnerId).filter(Boolean);
        const next = A.rounds[roundIdx + 1];
        if (!next) { A.winner = round.matches[0]?.winnerId || null; return; }
        let pool = round.matches.map(m => m.winnerId).filter(Boolean);
        if (roundIdx === 0) pool = pool.concat(A.byes || []);   // Freilose steigen zur 1. Runde ein
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }
        next.matches = [];
        for (let i = 0; i + 1 < pool.length; i += 2)
            next.matches.push({ hId: pool[i], aId: pool[i + 1], hGoals: null, aGoals: null, winnerId: null, nv: false, penalties: false });
        if (!this.fastMode) this.log('info', `Amateurpokal ${round.name} gespielt`);
    },

    simulateAmateurRound: function(roundIdx) {
        const A = this.amateurpokal;
        if (!A) return;
        const round = A.rounds[roundIdx];
        if (!round || round.played || !round.matches.length) return;
        this._playAmateurMatches(roundIdx, round.matches);
        this._advanceAmateurRound(roundIdx);
    },

    // Fällige Amateurpokal-Runden spielen (Normal- und Action-Modus). Holt bewusst ALLE überfälligen Runden
    // nach: bei einem Altstand entsteht der Wettbewerb mitten in der Saison, dann liegen Runden in der
    // Vergangenheit und würden sonst diese Saison nie gespielt (und es gäbe keine Aufsteiger).
    playDueAmateurRound: function(md) {
        if (!this.amateurpokal) return;
        for (let i = 0; i < this.amateurpokal.rounds.length; i++) {
            const r = this.amateurpokal.rounds[i];
            if (r.played || r.matchday > md) continue;
            this.simulateAmateurRound(i);
        }
    },

    rollbackAmateurToMatchday: function(md) {
        const A = this.amateurpokal;
        if (!A) return;
        A.rounds.forEach(r => {
            if (r.played && r.matchday > md) {
                r.played = false;
                r.matches.forEach(m => { m.hGoals = null; m.aGoals = null; m.winnerId = null; m.nv = false; m.penalties = false; m.pso = null; });
            }
        });
        for (let i = 1; i < A.rounds.length; i++) if (!A.rounds[i - 1].played) A.rounds[i].matches = [];
        const promo = A.rounds[this.AMATEUR_PROMO_ROUND];
        A.promoted = (promo && promo.played) ? promo.matches.map(m => m.winnerId).filter(Boolean) : [];
        const fin = A.rounds[A.rounds.length - 1];
        A.winner = fin.played ? (fin.matches[0]?.winnerId || null) : null;
        A.hasNewResults = false;
    },

    // Auf-/Abstieg aus dem Amateurpokal. Strikt 1:1 JE LIGA: für jeden Aufsteiger in Liga X verlässt der
    // Tabellenletzte von X die Pyramide. Dadurch kann keine Ligagröße wandern – Liga-Schutz und
    // Überschuss-Stopp der Kaskade können gar nicht anspringen. Läuft NACH der Kaskade (5b), damit nichts
    // umgelenkt wird, was dort gerade entschieden wurde.
    _applyAmateurPromotions: function() {
        const out = { up: [], down: [] };
        const A = this.amateurpokal;
        if (!A || !A.promoted || !A.promoted.length) return out;
        const byLeague = {};
        A.promoted.forEach(id => {
            const t = this.teams[id];
            if (!t || t.leagueId) return;                  // schon einsortiert → überspringen
            const tgt = this.amateurTargetLeagueId(t);
            if (!tgt || !this.leagues[tgt]) { this.log('warn', `Amateurpokal: keine Ziel-Bodenliga für ${t.name}`); return; }
            (byLeague[tgt] = byLeague[tgt] || []).push(t);
        });
        const mig = (t, from, to, typ) => this.migrations.push({
            team: t.name, id: t.id,
            from: from ? (this.leagues[from]?.name || from) : 'Amateurpokal',
            to:   to   ? (this.leagues[to]?.name   || to)   : 'Amateurpokal',
            toId: to, type: typ, sortId: from
        });
        // Absteiger aus dem ENDSTAND der gerade beendeten Saison bestimmen, nicht aus dem
        // aktuellen Ligabestand. 5b2 läuft nach der Abstiegskaskade, und dann stehen in der
        // Bodenliga bereits die Vereine, die eben erst aus der Liga darüber heruntergereicht
        // wurden – mit ihrem dort erreichten Rang. `rank` ist aber nur INNERHALB einer Liga
        // vergleichbar: ein Mittelrheinliga-Sechzehnter sortiert sich unter den Letzten der
        // Landesliga und verließ die Pyramide sofort wieder. Gemessen waren 58 % aller
        // Pyramiden-Abgänge solche Doppelabstiege in einem einzigen Sommer.
        // history[last].teams ist der Endstand vor allen Bewegungen – genau die Tabelle,
        // um die es geht.
        const endstand = (this.history[this.history.length - 1] || {}).teams || null;
        Object.entries(byLeague).forEach(([lid, ups]) => {
            const table = Object.values(this.teams)
                .filter(t => t.leagueId === lid && (!endstand || (endstand[t.id] && endstand[t.id].leagueId === lid)))
                .sort((a, b) => ((endstand ? endstand[a.id].rank : a.rank) || 999)
                              - ((endstand ? endstand[b.id].rank : b.rank) || 999));
            const downs = table.slice(-ups.length);        // die letzten N – bei N Aufsteigern
            downs.forEach(t => {
                mig(t, lid, null, 'down_amateur');
                t.leagueId = null; t.rank = 0;
                out.down.push(t);
            });
            const lvl = this.leagues[lid].level;
            ups.forEach(t => {
                t.leagueId = lid;
                // Auf die Zielliga neu ankern: Niveau der Liga minus dem üblichen Aufsteiger-Malus.
                t.strength = Math.max(1, Math.min(99, 109 - lvl * 10 - 8));
                mig(t, null, lid, 'up_amateur');
                out.up.push(t);
            });
        });
        if (out.up.length) this.log('info', `Amateurpokal: ${out.up.length} auf, ${out.down.length} ab`);
        return out;
    },

    // Deterministischer PRNG (mulberry32) – fester Spielplan über Reloads.
    _mulberry32: function(seed) {
        let a = seed >>> 0;
        return function() {
            a = (a + 0x6D2B79F5) | 0;
            let t = Math.imul(a ^ (a >>> 15), 1 | a);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    },
    // RNG aus seasonSeed; fehlt der Seed (frisch/Altsave), wird einmal einer erzeugt.
    _rng: function() {
        if (this.seasonSeed == null) this.seasonSeed = (Math.random() * 0xFFFFFFFF) >>> 0;
        return this._mulberry32(this.seasonSeed);
    },

    // Eine Hinrunde (vollständiges Round-Robin) als Spieltag-Liste: Berger-Paarungen + Greedy-H/A.
    // Gibt Array von Spieltagen, jeder = Array von {hId,aId,lid}. (n-1 Spieltage bei n Teams inkl. Freilos.)
    _buildRoundRobin: function(teams, lid) {
        const arr = [...teams];
        if (arr.length % 2 !== 0) arr.push(null);          // Freilos bei ungerader Anzahl
        const n = arr.length;
        const halfPairs = [];
        for (let r = 0; r < n - 1; r++) {
            const roundPairs = [];
            const rot = [arr[0]];
            for (let k = 1; k < n; k++) rot.push(arr[1 + ((r + k - 1) % (n - 1))]);
            for (let k = 0; k < n / 2; k++) {
                const t1 = rot[k], t2 = rot[n - 1 - k];
                if (t1 && t2) roundPairs.push([t1, t2, k]);
            }
            halfPairs.push(roundPairs);
        }
        const lastWasHome = {}, homeGames = {};
        return halfPairs.map(roundPairs => roundPairs.map(([t1, t2, k]) => {
            const p1 = lastWasHome[t1.id] === false ? 2 : lastWasHome[t1.id] === undefined ? 1 : 0;
            const p2 = lastWasHome[t2.id] === false ? 2 : lastWasHome[t2.id] === undefined ? 1 : 0;
            let h, a;
            if (p1 !== p2) { [h, a] = p1 > p2 ? [t1, t2] : [t2, t1]; }
            else if (p1 === 1) { [h, a] = k % 2 === 0 ? [t1, t2] : [t2, t1]; }
            else {
                const hc1 = homeGames[t1.id] || 0, hc2 = homeGames[t2.id] || 0;
                if (hc1 !== hc2) [h, a] = hc1 < hc2 ? [t1, t2] : [t2, t1];
                else [h, a] = k % 2 === 0 ? [t1, t2] : [t2, t1];
            }
            lastWasHome[h.id] = true; lastWasHome[a.id] = false;
            homeGames[h.id] = (homeGames[h.id] || 0) + 1;
            return { hId: h.id, aId: a.id, lid };
        }));
    },

    generateSchedule: function() {
        this.schedule = {};
        const rng = this._rng(); // deterministisch: gleicher Seed → gleicher Spielplan
        // Vorlauf: Spieltage je Round-Robin (n-1) und Hin+Rück-Basis je Liga; Zielwert = größte Liga
        const info = {};
        Object.keys(this.leagues).forEach(lid => {
            const cnt = Object.values(this.teams).filter(t => t.leagueId === lid).length;
            if (cnt < 2) return;
            const n = cnt % 2 ? cnt + 1 : cnt;
            info[lid] = { mdPerRound: n - 1 };
        });
        const targetMd = 34;     // Zielband ~30–38 (typische Vollsaison); Rumpf-Ligen runden dahin auf
        let maxMd = 0;
        Object.keys(this.leagues).forEach(lid => {
            const inf = info[lid]; if (!inf) return;
            const teams = Object.values(this.teams).filter(t => t.leagueId === lid);
            for (let i = teams.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [teams[i], teams[j]] = [teams[j], teams[i]]; }
            const firstHalf = this._buildRoundRobin(teams, lid);                          // Hinrunde
            const secondHalf = firstHalf.map(r => r.map(m => ({ hId: m.aId, aId: m.hId, lid }))); // Rückrunde (Heimrecht getauscht)
            // FIKTION: Rumpf-Ligen bekommen mehr vollständige Round-Robins, damit ihre Spieltagzahl ~ an die
            // großen Ligen kommt; dynamisch je Saison (Teamzahl), immer ganze Runden → jeder gegen jeden gleich oft.
            const numRounds = Math.min(6, Math.max(2, Math.round(targetMd / inf.mdPerRound)));
            const allRounds = [];
            for (let r = 0; r < numRounds; r++) allRounds.push(...(r % 2 === 0 ? firstHalf : secondHalf));
            this.leagues[lid].seasonLength = allRounds.length;
            for (let md = 1; md <= allRounds.length; md++) {
                if (!this.schedule[md]) this.schedule[md] = [];
                this.schedule[md].push(...allRounds[md - 1]);
            }
            if (allRounds.length > maxMd) maxMd = allRounds.length;
        });
        if (maxMd > 0) this.totalMatchdays = maxMd;
    },

    // Virtuelle Ebene der ligalosen Vereine. BEWUSST eine einzige Basis für alle, unabhängig davon wie tief
    // die Heimat-Pyramide reicht: sonst läge ein Ligaloser unter einer Level-6-Bodenliga bei 39 und einer
    // unter einer Level-8-Bodenliga bei 19 – 20 Punkte Spreizung im gemeinsamen Amateurpokal. Die richtige
    // Kaskade stellt sich beim Aufstieg von selbst her (Stärke wird auf die Zielliga neu geankert).
    LIGALOS_BASE: 30,
    LIGALOS_SPREAD: 8,

    // Einmalige Erstvergabe für Vereine ohne Stärke (Backfill aus Altsaves) – OHNE die Drift aus
    // calculateStrengths, die sonst bei jedem Reload alle Stärken Richtung Basis zöge.
    _seedStrength: function(t) {
        if (t.strength != null) return;
        if (t.leagueId && this.leagues[t.leagueId]) t.strength = Math.min(99, 109 - this.leagues[t.leagueId].level * 10);
        else t.strength = Math.max(1, this.LIGALOS_BASE + Math.round((Math.random() * 2 - 1) * this.LIGALOS_SPREAD));
    },

    calculateStrengths: function() {
        Object.values(this.teams).forEach(t => {
            if (!t.leagueId || !this.leagues[t.leagueId]) {
                // Erstvergabe streut um die Basis; danach normale Drift dorthin. Ein frisch abgestiegener
                // Verein bringt seine Bodenliga-Stärke mit und bleibt so 2–4 Saisons Amateurpokal-Favorit.
                if (t.strength == null) {
                    t.strength = Math.max(1, this.LIGALOS_BASE + Math.round((Math.random() * 2 - 1) * this.LIGALOS_SPREAD));
                    return;
                }
                // Drift zur Basis + Zufallsschritt. Ohne den Schritt zöge die Drift den ganzen Pool binnen
                // ~10 Saisons auf exakt die Basis zusammen (Ligalose haben keine Auf-/Abstiegs-Impulse) und
                // der Pokal wäre reine Lotterie. So pendelt das Feld um 30 ± 4 und hat echte Favoriten.
                t.strength = Math.max(1, Math.round((t.strength * 0.7) + (this.LIGALOS_BASE * 0.3) + (Math.random() * 2 - 1) * 3));
                return;
            }
            const lvl = this.leagues[t.leagueId].level;
            let base = Math.min(99, 109 - (lvl * 10));
            if (!t.strength) t.strength = base;
            t.strength = Math.min(99, Math.round((t.strength * 0.7) + (base * 0.3)));
        });
    },

    getFormattedSeason: function(offset) {
        if(offset === undefined) offset = this.currentSeasonOffset;
        const y = this.startYear + offset;
        return `${y}/${(y+1).toString().substr(2)}`;
    },

    // --- KALENDER (Phase 2): echte Daten + gestaffelte Wochen ---
    // Spiel-Wochenenden (Samstage) einer Saison: erster Sa ab 1. August bis erster Sa ab 1. Juni,
    // ohne Winterpause (18.12.–12.01.). Deterministisch, pro Saison-Offset gecacht.
    _weekendCache: {},
    matchWeekends: function(offset) {
        if (offset == null) offset = this.currentSeasonOffset;
        if (this._weekendCache[offset]) return this._weekendCache[offset];
        const y = this.startYear + offset;
        const firstSatFrom = (yr, mon, day) => { const d = new Date(yr, mon, day); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); return d; };
        const start = firstSatFrom(y, 7, 1);                                   // erster Samstag ab 1. August
        const end   = (() => { const d = new Date(y + 1, 5, 0); d.setDate(d.getDate() - ((d.getDay() + 1) % 7)); return d; })(); // letzter Samstag im Mai
        const winterFrom = new Date(y, 11, 18), winterTo = new Date(y + 1, 0, 12); // Winterpause
        const arr = [];
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 7)) {
            if (d >= winterFrom && d <= winterTo) continue;
            arr.push(new Date(d));
        }
        this._weekendCache[offset] = arr;
        return arr;
    },
    // Spieltag → Spielwochenende (Samstag-Date), gleichmäßig über die Saison verteilt (= Staffelung:
    // Ligen mit weniger Spieltagen bekommen größere Lücken, enden aber alle Ende Mai).
    matchdayWeekend: function(leagueId, md, offset) {
        if (md == null || md < 1) return null;
        const N = (this.leagues[leagueId] && this.leagues[leagueId].seasonLength) || this.totalMatchdays;
        const pool = this.matchWeekends(offset);
        const W = pool.length;
        if (!W) return null;
        const idx = N <= 1 ? 0 : Math.round((md - 1) / (N - 1) * (W - 1));
        return pool[Math.max(0, Math.min(idx, W - 1))];
    },

    // Ein fertiges Ergebnis (lid,hId,aId,s1,s2) auf Stats/Heim-Auswärts + seasonResults/matchdayResults anwenden.
    // Getrennt von der Simulation → Action-Halbzeit-Modus kann vorab simulieren und erst beim Endstand anwenden.
    _applyResult: function(r) {
        const h = this.teams[r.hId], a = this.teams[r.aId];
        if (!h || !a) return;
        const applyTo = (s, gf, ga) => {
            s.p++; s.gf += gf; s.ga += ga;
            if (gf > ga) { s.w++; s.pts += 3; }
            else if (gf < ga) { s.l++; }
            else { s.d++; s.pts += 1; }
        };
        applyTo(h.stats, r.s1, r.s2);
        applyTo(a.stats, r.s2, r.s1);
        if (!this.fastMode) {
            if (!h.homeStats) h.homeStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
            if (!a.awayStats) a.awayStats = { p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0 };
            applyTo(h.homeStats, r.s1, r.s2);
            applyTo(a.awayStats, r.s2, r.s1);
            a.stats.awayGf = (a.stats.awayGf || 0) + r.s2;
            this.matchdayResults.push({ leagueId: r.lid, home: h.name, away: a.name, score1: r.s1, score2: r.s2 });
        } else if (parseInt((r.lid || '99').split('-')[0]) <= 4) {
            this.matchdayResults.push({ leagueId: r.lid, home: h.name, away: a.name, score1: r.s1, score2: r.s2 });
        }
        this.seasonResults.push({ lid: r.lid, hId: r.hId, aId: r.aId, s1: r.s1, s2: r.s2 });
    },

    // Eine Match-Liste spielen: Ergebnis simulieren + anwenden. Von playNextMatchday UND Action genutzt.
    _playMatches: function(matches) {
        (matches || []).forEach(m => {
            const h = this.teams[m.hId], a = this.teams[m.aId];
            if (!h || !a) return;
            const res = this.simulateMatch(h, a);
            this._applyResult({ lid: m.lid, hId: m.hId, aId: m.aId, s1: res.score1, s2: res.score2 });
        });
    },

    // Halbzeit-Stand aus dem Endstand ableiten: je Team fallen seine Tore unabhängig mit ~45% in HZ1.
    _splitHalves: function(s1, s2) {
        const half = g => { let h = 0; for (let i = 0; i < g; i++) if (Math.random() < 0.45) h++; return h; };
        return { h1: half(s1), h2: half(s2) };
    },

    // Tor-Minuten für die Live-Konferenz: HZ-Tore (h1/h2) in Minute 1–45, 2.-HZ-Tore in 46–90 (kleine
    // Nachspielzeit-Chance 90–93). Gibt sortierte Events [{minute, side:'h'|'a'}] anhand der HZ-Aufteilung.
    _goalMinutes: function(s1, s2, h1, h2) {
        const ev = [], rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
        for (let i = 0; i < h1; i++) ev.push({ minute: rnd(1, 45), side: 'h' });
        for (let i = 0; i < s1 - h1; i++) ev.push({ minute: rnd(46, Math.random() < 0.12 ? 93 : 90), side: 'h' });
        for (let i = 0; i < h2; i++) ev.push({ minute: rnd(1, 45), side: 'a' });
        for (let i = 0; i < s2 - h2; i++) ev.push({ minute: rnd(46, Math.random() < 0.12 ? 93 : 90), side: 'a' });
        return ev.sort((a, b) => a.minute - b.minute);
    },

    // KO-Tor-Minuten für die Konferenz aus den kumulativen Phasen-Ständen (_simulateKnockoutStaged.parts):
    // 1.HZ 1–45, 2.HZ 46–90, Verläng. 1.HZ 91–105, Verläng. 2.HZ 106–120. Elfmeter = kein Spieltor (pso separat).
    _goalMinutesFromParts: function(parts) {
        const ev = [], rnd = (lo, hi) => lo + Math.floor(Math.random() * (hi - lo + 1));
        const wins = [[1,45],[46,90],[91,105],[106,120]];
        let prevH = 0, prevA = 0;
        for (let i = 0; i < parts.length && i < 4; i++) {
            const p = parts[i];
            for (let k = prevH; k < p.h; k++) ev.push({ minute: rnd(wins[i][0], wins[i][1]), side: 'h' });
            for (let k = prevA; k < p.a; k++) ev.push({ minute: rnd(wins[i][0], wins[i][1]), side: 'a' });
            prevH = p.h; prevA = p.a;
        }
        return ev.sort((a, b) => a.minute - b.minute);
    },

    // Kopf eines Spieltags: Zähler hoch, Pokal/Testspiele, Spielplan – gemeinsam für Normal+Action.
    _beginMatchday: function() {
        this.currentMatchday++;
        // Spieltag 1 = neue Saison → frischen Pokal aufbauen. Auch bei null (alter Spielstand).
        if (this.currentMatchday === 1 || !this.pokal) this.initPokal();
        if (this.currentMatchday === 1 || !this.amateurpokal) this.initAmateurpokal();
        // Winter-Testspiele automatisch nach Spieltag 17 (auch im Multi-Sim via simulateFullSeason)
        if (this.currentMatchday === 17) this.generateFriendlies('winter');
        this.matchdayResults = [];
        if (!this.schedule[this.currentMatchday]) this.generateSchedule();
    },

    playNextMatchday: function() {
        if (this.currentMatchday >= this.totalMatchdays) return false;
        this._beginMatchday();
        this._playMatches(this.schedule[this.currentMatchday] || []);
        if (!this.fastMode) this.sortTables();
        // Spieltag-Historie in BEIDEN Modi (für Archivierung der letzten 5 Saisons)
        if (this.matchdayResults.length) {
            this.matchdayHistory.push({ md: this.currentMatchday, results: this.matchdayResults.slice() });
            if (this.matchdayHistory.length > 40) this.matchdayHistory.shift(); // bis 38 Spieltage (20er-Ligen) komplett
        }
        if (this.pokal) {
            const ri = this.pokal.rounds.findIndex(r => r.matchday === this.currentMatchday && !r.played);
            if (ri !== -1) this.simulatePokalRound(ri);
        }
        this.playDueAmateurRound(this.currentMatchday);   // läuft im Hintergrund, keine Action/Konferenz
        if (!this.fastMode) this.saveGame();
        return true;
    },

    // ── Action-Modus (Layer 1 Tag / Layer 2 Uhrzeit) ─────────────────────────
    // Reale Anstoß-Slots je Level (Tag+Uhrzeit, w = typische Anzahl); Spiele werden proportional
    // zur Liga-Größe verteilt. _ = Level 5+ (Amateur). Recherche: bundesliga.com/kicker/diefalsche9/dfb.
    _ACTION_SLOTS: {
        1: [{d:'Fr',t:'20:30',w:1},{d:'Sa',t:'15:30',w:5},{d:'Sa',t:'18:30',w:1},{d:'So',t:'15:30',w:1},{d:'So',t:'17:30',w:1}],
        2: [{d:'Fr',t:'18:30',w:2},{d:'Sa',t:'13:00',w:3},{d:'Sa',t:'20:30',w:1},{d:'So',t:'13:30',w:3}],
        3: [{d:'Fr',t:'19:00',w:1},{d:'Sa',t:'14:00',w:6},{d:'Sa',t:'16:30',w:1},{d:'So',t:'13:30',w:1},{d:'So',t:'16:30',w:1}],
        4: [{d:'Fr',t:'19:00',w:1},{d:'Sa',t:'14:00',w:6},{d:'So',t:'14:00',w:2}],
        _: [{d:'Sa',t:'15:00',w:7},{d:'So',t:'15:00',w:2}]
    },
    _DAY_LABEL: { Fr:'Freitag', Sa:'Samstag', So:'Sonntag', Di:'Dienstag', Mi:'Mittwoch' },
    _DAY_ORDER: { Fr:1, Sa:2, So:3, Di:4, Mi:5 },
    _slotSort: (d, t) => (({ Fr:1, Sa:2, So:3, Di:4, Mi:5 })[d] || 9) * 10000 + parseInt(t.replace(':',''), 10),

    // Spiele proportional zu den Slot-Gewichten verteilen; Rest auf den stärksten Slot. → [{slot,matches}]
    _distributeToSlots: function(matches, slots) {
        const arr = matches.slice();
        for (let i = arr.length-1; i>0; i--) { const j = Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; }
        const totalW = slots.reduce((s,x)=>s+x.w,0) || 1;
        const counts = slots.map(s => Math.round(arr.length * s.w / totalW));
        let maxi = 0; slots.forEach((s,i) => { if (s.w > slots[maxi].w) maxi = i; });
        counts[maxi] += arr.length - counts.reduce((a,b)=>a+b,0);
        if (counts[maxi] < 0) counts[maxi] = 0;
        let idx = 0;
        return slots.map((s,i) => { const m = []; for (let k=0;k<counts[i] && idx<arr.length;k++) m.push(arr[idx++]); return { slot:s, matches:m }; });
    },

    // Spieltagsplan für den Action-Modus bauen: gewählte Ligen → Tag/Uhrzeit-Steps (depth), Rest → 'rest'.
    _buildActionPlan: function(cfg) {
        const md = this.currentMatchday;
        const depth = cfg.depth || 1;                          // 1 = Tag (Fr/Sa/So), 2 = Uhrzeit
        const rest = [], byLid = {}, slotMap = {};             // slotMap key "d|t" → {d,t,matches}
        (this.schedule[md] || []).forEach(m => {
            if (cfg.leagues && cfg.leagues[m.lid]) (byLid[m.lid] = byLid[m.lid] || []).push(m);
            else rest.push(m);
        });
        Object.entries(byLid).forEach(([lid, ms]) => {
            const lvl = (this.leagues[lid] || {}).level || 9;
            const slots = this._ACTION_SLOTS[lvl] || this._ACTION_SLOTS._;
            // depth 2/3 = je Uhrzeit-Slot; depth 1/4 = je Tag (bei 4 trägt jedes Match seine Anstoßzeit für die Konferenz)
            const bySlot = depth === 2 || depth === 3;
            this._distributeToSlots(ms, slots).forEach(({slot, matches}) => {
                if (!matches.length) return;
                const key = bySlot ? slot.d + '|' + slot.t : slot.d;
                const tagged = depth === 4 ? matches.map(m => ({ ...m, t: slot.t })) : matches;
                (slotMap[key] = slotMap[key] || { d:slot.d, t:slot.t, matches:[] }).matches.push(...tagged);
            });
        });
        const bySlot = depth === 2 || depth === 3;
        let dayList = Object.values(slotMap).map(s => ({
            key: s.d,
            label: bySlot ? `${s.d} ${s.t}` : this._DAY_LABEL[s.d],
            sort: bySlot ? this._slotSort(s.d, s.t) : this._DAY_ORDER[s.d] * 10000,
            matches: s.matches,
            halves: depth === 3,                                // depth 3: erst Halbzeit, dann Endstand
            conf: depth === 4                                   // depth 4: Echtzeit-Konferenz (Liga-Tage)
        }));
        if (cfg.pokal && this.pokal) {                          // Pokalrunde fällig → Di/Mi (+ depth2: 18:30/20:45)
            const ri = this.pokal.rounds.findIndex(r => r.matchday === md && !r.played);
            if (ri !== -1) {
                const n = this.pokal.rounds[ri].matches.length, half = Math.ceil(n / 2);
                const rng = (a, b) => Array.from({length: Math.max(0, b - a)}, (_, k) => a + k);
                const pdays = [];
                if (depth === 4) {                              // Konferenz: Di/Mi je Match einzeln mit Anstoßzeit
                    const confDay = (dKey, lo, hi) => {
                        const idx = rng(lo, hi); if (!idx.length) return;
                        const matches = idx.map((i, k) => ({ pokalIdx: i, t: (k === idx.length - 1 && idx.length > 1) ? '20:45' : '18:30' }));
                        pdays.push({ key:dKey, label:`${this._DAY_LABEL[dKey]} (Pokal)`, sort:this._slotSort(dKey,'18:30'), pokalRound:ri, conf:true, matches });
                    };
                    confDay('Di', 0, half); confDay('Mi', half, n);
                } else {
                    const dayBlock = (dKey, lo, hi) => {
                        const idx = rng(lo, hi); if (!idx.length) return;
                        if (depth >= 2 && idx.length > 1) {     // ein Topspiel 20:45, Rest 18:30
                            pdays.push({ key:dKey, label:`${dKey} 18:30 (Pokal)`, sort:this._slotSort(dKey,'18:30'), pokalRound:ri, pokalIdx:idx.slice(0,-1), matches:[] });
                            pdays.push({ key:dKey, label:`${dKey} 20:45 (Pokal)`, sort:this._slotSort(dKey,'20:45'), pokalRound:ri, pokalIdx:idx.slice(-1), matches:[] });
                        } else {
                            pdays.push({ key:dKey, label: depth>=2 ? `${dKey} 18:30 (Pokal)` : `${this._DAY_LABEL[dKey]} (Pokal)`, sort:this._slotSort(dKey,'18:30'), pokalRound:ri, pokalIdx:idx, matches:[] });
                        }
                    };
                    dayBlock('Di', 0, half); dayBlock('Mi', half, n);
                }
                if (pdays.length) { pdays[pdays.length - 1].pokalAdvance = true; pdays.forEach(d => { if (depth === 3) d.halves = true; dayList.push(d); }); }
            }
        }
        dayList.sort((a, b) => a.sort - b.sort);                 // gemeinsame Zeitachse über alle Ligen
        this.actionState = { md, days: dayList, cursor: 0, rest };
    },

    startActionMatchday: function(cfg) {
        if (this.currentMatchday >= this.totalMatchdays) return false;
        this._beginMatchday();
        this._buildActionPlan(cfg);
        return true;
    },

    // Einen Action-Tag spielen; nach dem letzten Tag finalisieren. Gibt {day, done, phase} zurück.
    // depth 3 (halves): erster Klick = Halbzeit (vorsimuliert, NICHT auf Tabelle), zweiter Klick = Endstand.
    playActionStep: function() {
        const st = this.actionState;
        if (!st) return null;
        const day = st.days[st.cursor];
        let phase = null;
        if (day) {
            if (day.pokalRound != null && day.halves) {
                // DFB-Pokal Halbzeit-Modus: gestaffelt 1.HZ → 90′ → (Verl. 1./2. HZ) → (Elfmeter); 2–5 Teile
                const r = this.pokal && this.pokal.rounds[day.pokalRound], idx = day.pokalIdx || [];
                if (!day.stage) {
                    const NOISE = [16,16,12,12,9,9]; const noise = NOISE[day.pokalRound] != null ? NOISE[day.pokalRound] : 8;
                    day.plive = idx.map(i => {
                        const m = r.matches[i], h = this.teams[m.hId], a = this.teams[m.aId];
                        if (!h || !a) return null;
                        const sim = this._simulateKnockoutStaged(h, a, noise);
                        return { i, hId:m.hId, aId:m.aId, home:h.name, away:a.name, parts:sim.parts, score1:sim.score1, score2:sim.score2, winner:sim.winner, decided:sim.decided, pso:sim.pso };
                    }).filter(Boolean);
                    day.maxParts = Math.max(...day.plive.map(x => x.parts.length), 2);
                    day.stage = 1; day.phase = 'HZ';
                    this.actionLive = { pokal:true, round: day.pokalRound, stage: 1, live: day.plive }; phase = 'HZ';
                } else {
                    day.stage++;
                    if (day.stage >= day.maxParts) {
                        // letzter Teil = finale Enthüllung + ins Bracket schreiben + ggf. Runde fortschreiben
                        day.plive.forEach(x => { const m = r.matches[x.i]; m.hGoals = x.score1; m.aGoals = x.score2; m.winnerId = x.winner==='h'?x.hId:x.aId; m.nv = x.decided==='aet'; m.penalties = x.decided==='pen'; m.pso = x.pso || null; });
                        this.pokal.hasNewResults = true;
                        if (day.pokalAdvance) this._advancePokalRound(day.pokalRound);
                        day.results = []; day.played = true; day.phase = 'FT'; this.actionLive = null; phase = 'FT';
                        if (!this.fastMode) this.sortTables();
                        st.cursor++;
                    } else {
                        this.actionLive = { pokal:true, round: day.pokalRound, stage: day.stage, live: day.plive }; phase = 'HZ';
                    }
                }
            } else if (day.pokalRound != null) {
                const r = this.pokal && this.pokal.rounds[day.pokalRound];
                if (r) { this._playPokalMatches(day.pokalRound, (day.pokalIdx || []).map(i => r.matches[i])); if (day.pokalAdvance) this._advancePokalRound(day.pokalRound); }
                day.results = []; day.played = true; st.cursor++;
                if (!this.fastMode) this.sortTables();
            } else if (day.halves && day.phase !== 'FT') {
                if (!day.phase) {
                    // Liga-Halbzeit: Endergebnisse vorab simulieren + HZ ableiten, aber NICHT auf die Tabelle anwenden
                    day.live = (day.matches || []).map(m => {
                        const h = this.teams[m.hId], a = this.teams[m.aId];
                        if (!h || !a) return null;
                        const res = this.simulateMatch(h, a);
                        const hz = this._splitHalves(res.score1, res.score2);
                        return { lid:m.lid, hId:m.hId, aId:m.aId, home:h.name, away:a.name, s1:res.score1, s2:res.score2, hz1:hz.h1, hz2:hz.h2 };
                    }).filter(Boolean);
                    day.phase = 'HZ'; this.actionLive = day.live; phase = 'HZ';
                } else {
                    const b = this.matchdayResults.length;
                    (day.live || []).forEach(r => this._applyResult(r));
                    day.results = this.matchdayResults.slice(b);
                    day.phase = 'FT'; day.played = true; this.actionLive = null; phase = 'FT';
                    if (!this.fastMode) this.sortTables();
                    st.cursor++;
                }
            } else {
                const b = this.matchdayResults.length; this._playMatches(day.matches); day.results = this.matchdayResults.slice(b);
                day.played = true; st.cursor++;
                if (!this.fastMode) this.sortTables();
            }
        }
        let done = false;
        if (st.cursor >= st.days.length) { this._finalizeActionMatchday(); done = true; }
        if (!this.fastMode) this.saveGame();
        return { day: day || null, done, phase };
    },

    _finalizeActionMatchday: function() {
        const st = this.actionState;
        this._playMatches(st.rest || []);                          // nicht gewählte Ligen in einem Rutsch
        if (!this.fastMode) this.sortTables();
        if (this.matchdayResults.length) {
            this.matchdayHistory.push({ md: st.md, results: this.matchdayResults.slice() });
            if (this.matchdayHistory.length > 40) this.matchdayHistory.shift();
        }
        const pokalHandled = st.days.some(d => d.pokalRound != null && d.played);
        if (this.pokal && !pokalHandled) {
            const ri = this.pokal.rounds.findIndex(r => r.matchday === st.md && !r.played);
            if (ri !== -1) this.simulatePokalRound(ri);
        }
        this.playDueAmateurRound(st.md);   // Amateurpokal ist nicht Teil des Action-Plans (bis zu 128 Partien/Runde)
        this.actionState = null;
    },

    // ── Live-Konferenz (depth 4) ──────────────────────────────────────────────
    // Tag vorsimulieren: Endstände + Tor-Minuten je Match; idempotent (Reload → gleiche Daten).
    // Liga-Tag → simulateMatch+HZ; Pokal-Tag (day.pokalRound) → _simulateKnockoutStaged (inkl. Verläng./Elfmeter).
    confPrepareDay: function(day) {
        if (day.live) return day.live;
        if (day.pokalRound != null) {
            const r = this.pokal.rounds[day.pokalRound];
            const NOISE = [16,16,12,12,9,9], noise = NOISE[day.pokalRound] != null ? NOISE[day.pokalRound] : 8;
            day.live = (day.matches || []).map(m => {
                const pm = r.matches[m.pokalIdx], h = this.teams[pm.hId], a = this.teams[pm.aId];
                if (!h || !a) return null;
                const sim = this._simulateKnockoutStaged(h, a, noise);
                return { ko:true, idx:m.pokalIdx, hId:pm.hId, aId:pm.aId, home:h.name, away:a.name, t:m.t,
                         s1:sim.score1, s2:sim.score2, winner:sim.winner, decided:sim.decided, pso:sim.pso,
                         events: this._goalMinutesFromParts(sim.parts) };
            }).filter(Boolean);
        } else {
            day.live = (day.matches || []).map(m => {
                const h = this.teams[m.hId], a = this.teams[m.aId];
                if (!h || !a) return null;
                const res = this.simulateMatch(h, a);
                const hz = this._splitHalves(res.score1, res.score2);
                return { lid:m.lid, hId:m.hId, aId:m.aId, home:h.name, away:a.name, t:m.t,
                         s1:res.score1, s2:res.score2, hz1:hz.h1, hz2:hz.h2,
                         events: this._goalMinutes(res.score1, res.score2, hz.h1, hz.h2) };
            }).filter(Boolean);
        }
        day.conf = 'running';
        if (!this.fastMode) this.saveGame();
        return day.live;
    },
    // Konferenz-Tag verbuchen: vorsimulierte Ergebnisse anwenden, cursor++, ggf. Spieltag finalisieren.
    confCommitDay: function() {
        const st = this.actionState; if (!st) return;
        const day = st.days[st.cursor]; if (!day || !day.conf || day.played) return;
        if (day.pokalRound != null) {                              // Pokal ins Bracket schreiben
            const r = this.pokal.rounds[day.pokalRound];
            (day.live || []).forEach(x => { const m = r.matches[x.idx]; m.hGoals = x.s1; m.aGoals = x.s2; m.winnerId = x.winner === 'h' ? x.hId : x.aId; m.nv = x.decided === 'aet'; m.penalties = x.decided === 'pen'; m.pso = x.pso || null; });
            this.pokal.hasNewResults = true;
            if (day.pokalAdvance) this._advancePokalRound(day.pokalRound);
            day.results = [];
        } else {
            const b = this.matchdayResults.length;
            (day.live || []).forEach(r => this._applyResult(r));
            day.results = this.matchdayResults.slice(b);
        }
        day.played = true; day.conf = 'done'; st.cursor++;
        if (!this.fastMode) this.sortTables();
        if (st.cursor >= st.days.length) this._finalizeActionMatchday();
        if (!this.fastMode) this.saveGame();
    },

    simulateFullSeason: function() {
        while(this.currentMatchday < this.totalMatchdays) { this.playNextMatchday(); }
        if (this.fastMode) this.sortTables();
    },

    // Saisonstart-Reihenfolge je Verein anhand Vorsaison-Platzierung in der NEUEN Liga:
    // Absteiger (kamen aus höherer Liga) oben, Verbleiber nach letztem Rang, Aufsteiger unten (~wie 16.).
    // Wird als finaler Tiebreaker in sortTables genutzt → greift v.a. an Tag 0 (alle Stats gleich).
    _assignStartRanks: function() {
        const prev = (this.history && this.history.length) ? this.history[this.history.length - 1].teams : null;
        const lvl = lid => (this.leagues[lid] ? this.leagues[lid].level : 99);
        Object.values(this.teams).forEach(t => {
            if (!t.leagueId) { t.startRank = 99999; return; }
            const curLvl = lvl(t.leagueId);
            const p = prev ? prev[t.id] : null;
            const pLid = p ? (Array.isArray(p) ? p[0] : p.leagueId) : null;
            const pRank = p ? (Array.isArray(p) ? p[1] : p.rank) || 50 : 50;
            if (pLid) {
                const prevLvl = lvl(pLid);
                const bucket = prevLvl < curLvl ? -1 : prevLvl > curLvl ? 1 : 0; // Absteiger oben, Aufsteiger unten
                t.startRank = bucket * 1000 + pRank;
            } else {
                t.startRank = 500 - (t.strength || 50); // ohne Vorsaison (1. Saison): nach Stärke
            }
        });
    },

    sortTables: function() {
        const buckets = {};
        Object.values(this.teams).forEach(t => {
            if(!t.leagueId) return;
            if(!buckets[t.leagueId]) buckets[t.leagueId] = [];
            buckets[t.leagueId].push(t);
        });
        Object.keys(buckets).forEach(lid => {
            const arr = buckets[lid];
            arr.sort((a,b) => {
                if (b.stats.pts !== a.stats.pts) return b.stats.pts - a.stats.pts;
                const da = a.stats.gf - a.stats.ga, db = b.stats.gf - b.stats.ga;
                if (db !== da) return db - da;
                if (b.stats.gf !== a.stats.gf) return b.stats.gf - a.stats.gf;
                return (a.startRank ?? 1e9) - (b.startRank ?? 1e9); // Tag 0 (alle Stats gleich): Vorsaison-Reihenfolge
            });
            // H2H-Tiebreaker innerhalb punktgleicher Gruppen (DFL Kriterien 3-5)
            const basicKey = t => `${t.stats.pts}_${t.stats.gf - t.stats.ga}_${t.stats.gf}`;
            let i = 0;
            while (i < arr.length) {
                let j = i + 1;
                while (j < arr.length && basicKey(arr[j]) === basicKey(arr[i])) j++;
                if (j - i > 1) {
                    const sorted = this.h2hTiebreak(arr.slice(i, j), lid);
                    arr.splice(i, j - i, ...sorted);
                }
                i = j;
            }
            arr.forEach((t, i) => t.rank = i + 1);
        });
    },

    h2hTiebreak: function(group, lid) {
        const ids = new Set(group.map(t => t.id));
        const h2h = {};
        group.forEach(t => { h2h[t.id] = { pts: 0, gd: 0, gf: 0, away: 0 }; });
        (this.seasonResults || []).forEach(r => {
            if (r.lid !== lid || !ids.has(r.hId) || !ids.has(r.aId)) return;
            h2h[r.hId].gf += r.s1; h2h[r.hId].gd += r.s1 - r.s2;
            h2h[r.aId].gf += r.s2; h2h[r.aId].gd += r.s2 - r.s1;
            h2h[r.aId].away += r.s2;
            if (r.s1 > r.s2) h2h[r.hId].pts += 3;
            else if (r.s1 < r.s2) h2h[r.aId].pts += 3;
            else { h2h[r.hId].pts++; h2h[r.aId].pts++; }
        });
        return [...group].sort((a, b) => {
            const ha = h2h[a.id], hb = h2h[b.id];
            if (hb.pts  !== ha.pts)  return hb.pts  - ha.pts;   // 3. H2H Punkte
            if (hb.gd   !== ha.gd)   return hb.gd   - ha.gd;    // 3. H2H Tordiff
            if (hb.gf   !== ha.gf)   return hb.gf   - ha.gf;    // 3. H2H Tore
            if (hb.away !== ha.away) return hb.away - ha.away;   // 4. H2H Auswärtstore
            const awa = a.stats.awayGf || 0, awb = b.stats.awayGf || 0;
            if (awb !== awa) return awb - awa;                    // 5. Alle Auswärtstore
            return (b.strength || 0) - (a.strength || 0);        // → geteilter Platz
        });
    },

    // Ligaspiel. Bis v0.8.128 wurde der Sieger ueber margin bestimmt und die Torzahl danach
    // GLEICHVERTEILT aus 1..4 gezogen - 4:0 war damit das hoechstmoegliche Ligaergebnis ueberhaupt,
    // und untere Ligen spielten genauso torarm wie die Bundesliga. Jetzt dasselbe Poisson-Modell
    // wie im Pokal (_goalRates). Remis entstehen dabei von selbst, der alte Sonderzweig entfaellt.
    simulateMatch: function(t1, t2) {
        const s1 = t1.strength || 50;
        const s2 = t2.strength || 50;
        const p1 = s1 + Math.random() * 40 - 20 + 3; // leichter Heimvorteil
        const p2 = s2 + Math.random() * 40 - 20;
        const r = this._goalRates(p1, p2, s1, s2);
        let g1 = this._torZiehung(r.h), g2 = this._torZiehung(r.a);
        // Remis-Korrektur (Dixon-Coles-Gedanke): zwei unabhaengige Poisson-Ziehungen liefern
        // systematisch zu wenige Unentschieden - reale Ligen haben ~25 %, das reine Modell ~17 %.
        // Knappe, torarme Ergebnisse werden deshalb anteilig auf Remis gezogen, mal nach oben
        // (1:0 -> 1:1), mal nach unten (1:0 -> 0:0), damit der Torschnitt nicht wegdriftet.
        // NUR in der Liga: im K.-o. ist ein Remis kein Ergebnis, sondern Verlaengerung.
        if (Math.abs(g1 - g2) === 1 && g1 + g2 <= 3 && Math.random() < this.GOAL_DRAW) {
            if (Math.random() < 0.5) { const m = Math.max(g1, g2); g1 = m; g2 = m; }
            else { const m = Math.min(g1, g2); g1 = m; g2 = m; }
        }
        return { score1: g1, score2: g2 };
    },

    // Luftlinie in km (Haversine) – für Testspiel-Nachbarn
    _distKm: function(a, b) {
        if (!a || !b || a.lat == null || b.lat == null) return Infinity;
        if ((a.lat === 0 && a.lon === 0) || (b.lat === 0 && b.lon === 0)) return Infinity;
        const R = 6371, toR = Math.PI / 180;
        const dLat = (b.lat - a.lat) * toR, dLon = (b.lon - a.lon) * toR;
        const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * toR) * Math.cos(b.lat * toR) * Math.sin(dLon / 2) ** 2;
        return 2 * R * Math.asin(Math.sqrt(h));
    },

    // Stärke für Testspiele; ligalose Vereine (kein leagueId/strength) bekommen 20 (< 8. Liga ≈ 29)
    _friendlyStrength: function(t) {
        if (t.strength != null) return t.strength;
        const lvl = (t.leagueId && this.leagues[t.leagueId]) ? this.leagues[t.leagueId].level : null;
        return lvl ? Math.min(99, Math.round(109 - lvl * 10)) : 20;
    },

    friendliesGenerated: function(window, season) {
        season = season || this.getFormattedSeason();
        return (this.friendlies || []).some(f => f.season === season && f.window === window);
    },

    // Nachbarliste eines Vereins (nächste K Teams nach Luftlinie). Koordinaten sind STATISCH →
    // einmal berechnen + cachen (entscheidend für Multi-Sim-Tempo, sonst O(Hosts×AlleTeams) pro Saison).
    _neighborList: function(host, all) {
        if (!this._nbrCache) this._nbrCache = {};
        if (this._nbrCache[host.id]) return this._nbrCache[host.id];
        const list = all.filter(o => o.id !== host.id)
            .map(o => ({ id: o.id, d: this._distKm(host, o) }))
            .filter(o => o.d !== Infinity)
            .sort((a, b) => a.d - b.d)
            .slice(0, 64); // 64 nächste reichen für 3 Spiele + Auffüllung weit über 50 km
        return (this._nbrCache[host.id] = list);
    },

    // Testspiele: 3 pro Profiverein (Liga 1-3, keine Reserve) gegen Nachbarn im 50-km-Umkreis
    // (jede Liga inkl. ligalos, keine 2. Mannschaften); <3 im Umkreis → mit Nächstgelegenen auffüllen.
    // Gegenseitigkeit: treffen sich zwei Profivereine, zählt das Spiel für beide. Nur letzte 5 Saisons behalten.
    generateFriendlies: function(window) {
        if (!this.friendlies) this.friendlies = [];
        if (this.friendliesGenerated(window)) return 0;
        const season = this.getFormattedSeason(), off = this.currentSeasonOffset;
        const RADIUS = 50, PER = 3;
        const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };
        const all = Object.values(this.teams).filter(t => !t.isReserve && t.lat != null && !(t.lat === 0 && t.lon === 0));
        const hosts = all.filter(t => t.leagueId === '1' || t.leagueId === '2' || t.leagueId === '3');
        const need = {}; hosts.forEach(h => need[h.id] = PER);
        const pairKey = (a, b) => a < b ? a + '|' + b : b + '|' + a;
        const pairs = new Set();
        let created = 0;
        shuffle(hosts.slice()).forEach(h => {
            if (need[h.id] <= 0) return;
            const ranked = this._neighborList(h, all);
            const pool = shuffle(ranked.filter(o => o.d <= RADIUS).map(o => o.id));
            const beyond = ranked.filter(o => o.d > RADIUS).map(o => o.id); // Nächstgelegene zuerst (Auffüllung)
            // Kandidat gültig, wenn Paarung neu ist und der Gegner kein bereits "voller" Profiverein ist
            // (Profis: need[x] definiert; <=0 → schon 3 Spiele → nicht erneut ziehen, sonst >3)
            const ok = x => !pairs.has(pairKey(h.id, x)) && !(need[x] != null && need[x] <= 0);
            const pick = () => {
                while (pool.length)   { const x = pool.shift();   if (ok(x)) return x; }
                while (beyond.length) { const x = beyond.shift(); if (ok(x)) return x; }
                return null;
            };
            while (need[h.id] > 0) {
                const oppId = pick();
                if (oppId == null) break;
                pairs.add(pairKey(h.id, oppId));
                const res = this.simulateMatch({ strength: this._friendlyStrength(this.teams[h.id]) }, { strength: this._friendlyStrength(this.teams[oppId]) });
                this.friendlies.push({ season, off, window, hId: h.id, aId: oppId, s1: res.score1, s2: res.score2 });
                created++;
                need[h.id]--;
                if (need[oppId] != null && need[oppId] > 0) need[oppId]--; // Gegenseitigkeit
            }
        });
        // Pruning: nur Testspiele der letzten 5 Saisons behalten (Speicher/Multi-Sim)
        this.friendlies = this.friendlies.filter(f => f.off == null || (off - f.off) < 5);
        return created;
    },

    // Automatik: Pre-Testspiele zu Saisonbeginn, Winter-Testspiele ab Spieltag 17 (kein Button nötig)
    ensureSeasonFriendlies: function() {
        this.generateFriendlies('pre');
        if (this.currentMatchday >= 17) this.generateFriendlies('winter');
    },

    getPromotionInfo: function() {
        const year = this.currentSeasonOffset % 3; 
        let direct = ["Regionalliga West", "Regionalliga Südwest"];
        let playoff = [];
        if(year === 0) { direct.push("Regionalliga Nord"); playoff = ["Regionalliga Nordost", "Regionalliga Bayern"]; }
        else if(year === 1) { direct.push("Regionalliga Nordost"); playoff = ["Regionalliga Nord", "Regionalliga Bayern"]; }
        else { direct.push("Regionalliga Bayern"); playoff = ["Regionalliga Nord", "Regionalliga Nordost"]; }
        return { direct: direct, playoff: playoff, year: year };
    },

    // Darf dieser Verein auf Ziel-Level aufsteigen? Spiegelt exakt die RESERVE-SPERRE in
    // processSeasonTransition (Schritt 5). Wird VOR der Planung gefragt, damit ein gesperrter
    // Meister seinen Platz an den Nächstplatzierten abgibt, statt ihn ersatzlos verfallen zu lassen.
    _darfAufsteigen: function(t, zielLvl) {
        if (!t || !t.isReserve) return true;
        if (zielLvl <= 2) return false;                 // II-Mannschaft nie in 2. BL oder höher
        if (!t.parentId) return true;
        const par = this.teams[t.parentId];
        if (!par || !par.leagueId) return true;
        return zielLvl > (this.leagues[par.leagueId]?.level || 0);  // nie neben/über dem Elternverein
    },

    // Tabelle einer Liga, aber nur die aufstiegsberechtigten Vereine – in Tabellenreihenfolge.
    // kand[0] = Aufsteiger, kand[2] = Relegationsteilnehmer. So ziehen Planung, Relegationsspiel
    // und Ausführung immer denselben Verein heran.
    _aufstiegsKandidaten: function(lid, zielLvl) {
        return Object.values(this.teams)
            .filter(t => t.leagueId === lid)
            .sort((a, b) => a.rank - b.rank)
            .filter(t => this._darfAufsteigen(t, zielLvl));
    },

    // Read-only Two-Pass: berechnet hypothetische Zonen ohne teams zu mutieren
    calcZones: function() {
        const promoInfo = this.getPromotionInfo();
        // Wie viele Amateurpokal-Aufsteiger steuern welche Bodenliga an? Steht erst nach dem
        // Sechzehntelfinale fest (A.promoted wird dort gefüllt); vorher bleibt die Zone leer.
        const amateurZiele = {};
        const _A = this.amateurpokal;
        if (_A && _A.promoted && _A.promoted.length) {
            for (const id of _A.promoted) {
                const t = this.teams[id];
                if (!t || t.leagueId) continue;
                const z = this.amateurTargetLeagueId(t);
                if (z) amateurZiele[z] = (amateurZiele[z] || 0) + 1;
            }
        }
        const sorted = Object.values(this.leagues).sort((a,b) => a.level - b.level);
        const lStats = {};
        Object.keys(this.leagues).forEach(lid => {
            lStats[lid] = { old: Object.values(this.teams).filter(t => t.leagueId === lid).length, pending_incoming: 0 };
        });
        const planned = [];

        // Phase 1: Fixe Slots
        for (const l of sorted) {
            const ts = Object.values(this.teams).filter(t => t.leagueId === l.id).sort((a,b) => (a.rank||99)-(b.rank||99));
            let up = 0, dn = 0;
            if      (l.level === 1) { dn = 2; }
            else if (l.level === 2) { up = 2; dn = 2; }
            else if (l.level === 3) { up = 2; dn = 4; }
            else if (l.level === 4) {
                up = 1; // immer 1 für korrekte Overflow-Cascade (Playoff vs. Direkt nur für Anzeige)
                dn = Math.min(3, (this.DOWN_MAP[l.id]||[]).length);
            }
            else if (this.DOWN_MAP[l.id]) { up = 1; dn = Math.min(3, this.DOWN_MAP[l.id].length); }
            else {
                // Bodenliga: unter ihr liegt keine Liga mehr, wohl aber der Amateurpokal. Wie viele
                // sie verlassen, steht erst fest, wenn das Sechzehntelfinale gespielt ist - vorher
                // ist noch niemand aufgestiegen, den sie ersetzen müsste. Ohne diesen Zweig zeigte
                // eine Bodenliga gar keine Abstiegszone, obwohl dort jede Saison Vereine
                // herausfallen (gemeldet an Landesliga Mittelrhein Staffel 2).
                up = 1;
                dn = amateurZiele[l.id] || 0;
            }

            for (let i = 0; i < up; i++) if (ts[i]) planned.push({ t:ts[i], type:'up', oldId:l.id, fromLvl:l.level });
            for (let i = 0; i < dn; i++) { const t = ts[ts.length-1-i]; if (t) planned.push({ t, type:'down', oldId:l.id, fromLvl:l.level }); }
        }
        planned.forEach(m => {
            const tgtLvl = m.type === 'up' ? m.fromLvl-1 : m.fromLvl+1;
            const tgt = this.findTarget(m.t, tgtLvl, m.oldId);
            if (tgt && lStats[tgt.id]) lStats[tgt.id].pending_incoming++;
        });

        // Phase 2: Variable Overflow
        for (const l of sorted) {
            const ts = Object.values(this.teams).filter(t => t.leagueId === l.id).sort((a,b) => (a.rank||99)-(b.rank||99));
            const st = lStats[l.id];
            const leavingUp  = planned.filter(m => m.oldId === l.id && m.type.includes('up')).length;
            const leavingDn  = planned.filter(m => m.oldId === l.id && m.type.includes('down')).length;
            const projected  = st.old - leavingUp - leavingDn + st.pending_incoming;
            let maxLim = l.max || (l.level <= 2 ? 18 : l.level === 3 ? 20 : (l.target||18)); // per-Liga-Band (game_data max)
            if (!this.DOWN_MAP[l.id] && l.level >= 5) maxLim = 999;
            const varDn = this.DOWN_MAP[l.id] ? Math.max(0, projected - maxLim) : 0;
            for (let i = 0; i < varDn; i++) {
                const idx = ts.length - 1 - leavingDn - i;
                if (idx >= 0 && !planned.find(m => m.t.id === ts[idx].id)) {
                    planned.push({ t:ts[idx], type:'down_var', oldId:l.id, fromLvl:l.level });
                    const tgt = this.findTarget(ts[idx], l.level+1, l.id);
                    if (tgt && lStats[tgt.id]) lStats[tgt.id].pending_incoming++;
                }
            }
        }

        // Ergebnis: Zone-Counts pro Liga
        const zones = {};
        Object.keys(this.leagues).forEach(lid => {
            const lvl = this.leagues[lid].level;
            const fixUpRaw = planned.filter(m => m.oldId === lid && m.type === 'up').length;
            const fixDown  = planned.filter(m => m.oldId === lid && m.type === 'down').length;
            const varDown  = planned.filter(m => m.oldId === lid && m.type === 'down_var').length;
            const isPlayoff4 = lvl === 4 && promoInfo.playoff.some(n => this.leagues[lid].name.includes(n));
            // Playoff-Liga: up=1 war nur für Overflow-Cascade; für Anzeige fixUp=0, varUp=1
            const fixUp = isPlayoff4 ? 0 : fixUpRaw;
            let varUp = 0, extraVarDown = 0;
            if      (lvl === 1) { extraVarDown = 1; }
            else if (lvl === 2) { varUp = 1; extraVarDown = 1; }
            else if (lvl === 3) { varUp = 1; }
            else if (isPlayoff4)  { varUp = 1; }
            zones[lid] = { fixUp, varUp, fixDown, varDown: varDown + extraVarDown };
        });
        return zones;
    },

    // --- TWO-PASS KASKADE (Vorausberechnung + Ausführung) ---
    processSeasonTransition: function() {
        const preIssues = this.sanityCheck();
        if (preIssues.length) this.log('warn', `Transition-Start: ${preIssues.join(' | ')}`);
        // 1. History Snapshot (inkl. abgeschlossenem Pokal)
        const leanTeams = {};
        // Ligalose bleiben aus dem Saison-Snapshot heraus (kein Ligabetrieb → keine Tabellenzeile); ihre
        // Saison steckt komplett im amateurpokal-Baum.
        Object.entries(this.teams).forEach(([id, t]) => { if (t.leagueId) leanTeams[id] = { id, leagueId: t.leagueId, rank: t.rank, stats: { ...t.stats }, name: t.name, thumb: t.thumb || null }; });
        this.history.push({ year: this.getFormattedSeason(), teams: leanTeams, pokal: this.pokal ? JSON.parse(JSON.stringify(this.pokal)) : null, amateurpokal: this.amateurpokal ? JSON.parse(JSON.stringify(this.amateurpokal)) : null, matchdayHistory: this.matchdayHistory.slice() });
        // In-Memory-Cap: nur letzte 50 Saisons behalten (= was saveGame persistiert) → kein unbegrenztes
        // Wachstum/GC-Druck bei Langzeit-MegaSim (Ursache für zunehmende ms/Saison).
        if (this.history.length > 50) this.history.splice(0, this.history.length - 50);

        this.migrations = [];
        this.relegationResults = [];
        this.leagueStats = {};
        const relegSurvivors = new Set();
        
        Object.keys(this.leagues).forEach(lid => {
            this.leagueStats[lid] = { 
                name: this.leagues[lid].name, target: this.leagues[lid].target, 
                old: Object.values(this.teams).filter(t => t.leagueId === lid).length,
                pending_incoming: 0, moveIn: 0, moveOut: 0
            };
        });

        // 2. Relegation & Playoffs simulieren
        const promoInfo = this.getPromotionInfo();
        let topReleResult = 'stay';
        let thirdReleResult = 'stay';
        let regioWinnerId = null;

        // A) 1. BL vs 2. BL
        const l1 = Object.values(this.leagues).find(l => l.level === 1);
        const l2 = Object.values(this.leagues).find(l => l.level === 2);
        if(l1 && l2) {
            const t1 = this.getTeamByRank(l1.id, 16);
            const t2 = this._aufstiegsKandidaten(l2.id, 1)[2];
            if(t1 && t2) {
                const res = this.simulateMatch(t1, t2);
                const winner = res.score1 >= res.score2 ? t1 : t2;
                this.relegationResults.push({ match: `1.BL/2.BL: ${t1.name} vs ${t2.name}`, result: `${res.score1}:${res.score2}`, winner: winner.name, winnerId: winner.id, hId: t1.id, aId: t2.id, color: "gold" });
                topReleResult = (winner === t2) ? 'swap' : 'stay';
                if (topReleResult === 'stay') relegSurvivors.add(t1.id);
            }
        }

        // B) 2. BL vs 3. Liga
        const l3 = Object.values(this.leagues).find(l => l.level === 3);
        if(l2 && l3) {
            const t1 = this.getTeamByRank(l2.id, 16);
            const t2 = this._aufstiegsKandidaten(l3.id, 2)[2];
            if(t1 && t2) {
                const res = this.simulateMatch(t1, t2);
                const winner = res.score1 >= res.score2 ? t1 : t2;
                this.relegationResults.push({ match: `2.BL/3.L: ${t1.name} vs ${t2.name}`, result: `${res.score1}:${res.score2}`, winner: winner.name, winnerId: winner.id, hId: t1.id, aId: t2.id, color: "silver" });
                thirdReleResult = (winner === t2) ? 'swap' : 'stay';
                if (thirdReleResult === 'stay') relegSurvivors.add(t1.id);
            }
        }

        // C) Regionalliga Playoffs
        let playoffTeams = [];
        Object.values(this.leagues).forEach(l => {
            if (promoInfo.playoff.includes(l.name)) {
                const t = this._aufstiegsKandidaten(l.id, 3)[0];
                if(t) playoffTeams.push({ team: t, leagueId: l.id });
            }
        });
        if (playoffTeams.length === 2) {
            const t1 = playoffTeams[0];
            const t2 = playoffTeams[1];
            const res = this.simulateMatch(t1.team, t2.team);
            this.relegationResults.push({ match: `Aufstieg 3.L: ${t1.team.name} vs ${t2.team.name}`, result: `${res.score1}:${res.score2}`, winner: res.score1 >= res.score2 ? t1.team.name : t2.team.name, winnerId: res.score1 >= res.score2 ? t1.team.id : t2.team.id, hId: t1.team.id, aId: t2.team.id, color: "#cd7f32" });
            regioWinnerId = (res.score1 >= res.score2) ? t1.leagueId : t2.leagueId;
        }
        // Direktaufsteiger der Regionalliga ins Relegations-Log
        Object.values(this.leagues).forEach(l => {
            if (promoInfo.direct.includes(l.name)) {
                const t = this._aufstiegsKandidaten(l.id, 3)[0];
                if (t) this.relegationResults.push({ match: l.name, result: '▲ Direktaufstieg', winner: t.name, winnerId: t.id, color: '#4CAF50' });
            }
        });

        const sortedLeagues = Object.values(this.leagues).sort((a,b) => a.level - b.level);
        let plannedMoves = []; 

        // 3. PHASE 1: PRE-FLIGHT (Alle Transfers planen & zählen)
        for (const l of sortedLeagues) {
            const teams = Object.values(this.teams).filter(t => t.leagueId === l.id).sort((a,b)=>a.rank-b.rank);
            // Aufstiegsberechtigte in Tabellenreihenfolge – gesperrte Reserven fallen raus, die
            // Dahinterliegenden rücken auf. Sonst verfällt der Platz und die Liga schrumpft.
            const kand = this._aufstiegsKandidaten(l.id, l.level - 1);
            let upSlots = 0, baseDownSlots = 0;

            if (l.level === 1) {
                baseDownSlots = 2;
                if(topReleResult === 'swap') plannedMoves.push({t:teams[15], type:'down_rele', oldId:l.id, fromLvl:1});
            }
            else if (l.level === 2) {
                upSlots = 2; baseDownSlots = 2;
                if(topReleResult === 'swap' && kand[2]) plannedMoves.push({t:kand[2], type:'up_rele', oldId:l.id, fromLvl:2});
                if(thirdReleResult === 'swap') plannedMoves.push({t:teams[15], type:'down_rele', oldId:l.id, fromLvl:2});
            }
            else if (l.level === 3) {
                baseDownSlots = 4; upSlots = 2;
                if(thirdReleResult === 'swap' && kand[2]) plannedMoves.push({t:kand[2], type:'up_rele', oldId:l.id, fromLvl:3});
            }
            else if (l.level === 4) {
                const isDirect = promoInfo.direct.includes(l.name);
                const isWinner = (l.id === regioWinnerId);
                if (isDirect || isWinner) upSlots = 1; else upSlots = 0;
                baseDownSlots = Math.min(3, this.DOWN_MAP[l.id].length);
            }
            else { upSlots = 1; baseDownSlots = this.DOWN_MAP[l.id] ? Math.min(3, this.DOWN_MAP[l.id].length) : 0; }

            // Fixe Transfers – aus kand statt aus teams, und nie denselben Verein zweimal
            // (der Relegationsplatz oben ist schon vergeben).
            let besetzt = 0;
            for(let i=0; i<kand.length && besetzt<upSlots; i++) {
                if(plannedMoves.find(m => m.t.id === kand[i].id)) continue;
                plannedMoves.push({t:kand[i], type:'up', oldId:l.id, fromLvl:l.level});
                besetzt++;
            }
            let abgestiegen = 0;
            for(let i=0; i<teams.length && abgestiegen<baseDownSlots; i++) {
                const team = teams[teams.length - 1 - i];
                if(plannedMoves.find(m => m.t.id === team.id)) continue;
                plannedMoves.push({t:team, type:'down', oldId:l.id, fromLvl:l.level});
                abgestiegen++;
            }
        }

        // PRE-FLIGHT AUSWERTUNG
        // Alle geplanten Moves (auf & ab) in pending_incoming des Ziels eintragen,
        // damit PHASE 2 und SCHRUMPF-SCHUTZ korrekte Prognosen rechnen können.
        plannedMoves.forEach(m => {
            const targetLvl = m.type.includes('up') ? m.fromLvl - 1 : m.fromLvl + 1;
            const target = this.findTarget(m.t, targetLvl, m.oldId);
            if(target && this.leagueStats[target.id]) {
                this.leagueStats[target.id].pending_incoming++;
            }
        });

        // 4. PHASE 2: VARIABLE KASKADE BERECHNEN & AUSFÜHREN
        for (const l of sortedLeagues) {
            const teams = Object.values(this.teams).filter(t => t.leagueId === l.id).sort((a,b)=>a.rank-b.rank);
            const stats = this.leagueStats[l.id];
            
            // Bereits geplante Abgänge
            const leavingUp = plannedMoves.filter(m => m.oldId === l.id && m.type.includes('up')).length;
            const leavingDownFix = plannedMoves.filter(m => m.oldId === l.id && m.type.includes('down')).length;
            
            // Zugänge von oben UND unten (beide in pending_incoming seit PRE-FLIGHT)
            const incoming = stats.pending_incoming;
            
            const projectedSize = stats.old - leavingUp - leavingDownFix + incoming;
            
            // HARTE LIMITS
            let maxLimit = l.max || (l.level === 3 ? 20 : 18); // per-Liga-Band (game_data max)
            if (!this.DOWN_MAP[l.id]) maxLimit = 999;

            let variableDownCount = Math.max(0, projectedSize - maxLimit);
            if (!this.DOWN_MAP[l.id]) variableDownCount = 0;

            // Variable Absteiger hinzufügen
            for(let i=0; i<variableDownCount; i++) {
                const idx = teams.length - 1 - leavingDownFix - i;
                if(idx >= 0) {
                    const team = teams[idx];
                    if(!plannedMoves.find(m => m.t.id === team.id)) {
                        const move = {t:team, type:'down_var', oldId:l.id, fromLvl:l.level};
                        plannedMoves.push(move);
                        
                        // Kaskade weitergeben!
                        const target = this.findTarget(team, l.level+1, l.id);
                        if(target && this.leagueStats[target.id]) this.leagueStats[target.id].pending_incoming++;
                    }
                }
            }
        }

        // 4b. SCHRUMPF-SCHUTZ: Fixe Abstiege kürzen wenn Liga unter Mindestgröße fällt
        for (const l of sortedLeagues) {
            // Band-min als Rückstellkraft nach unten (Abstiege canceln, wenn Liga unter min fiele).
            // Sicher gegen Balloon NUR weil das Überschuss-Ventil locker ist: varDn (=l.max) deckelt
            // oben, SCHRUMPF stützt unten → stabiles Band [min,max].
            const minSize = l.min || (l.level === 3 ? 20 : l.level === 4 ? 18 : 8);
            const stats = this.leagueStats[l.id];
            const leavingUp   = plannedMoves.filter(m => m.oldId === l.id && m.type.includes('up')).length;
            const leavingDown = plannedMoves.filter(m => m.oldId === l.id && m.type.includes('down')).length;
            // pending_incoming enthält jetzt alle Zu-/Abgänge aus PRE-FLIGHT (up & down)
            const realProjected = stats.old - leavingUp - leavingDown + stats.pending_incoming;
            if (realProjected < minSize) {
                const deficit = minSize - realProjected;
                // Nur fixe Abstiege (nicht Relegations-Abstiege) sind entfernbar
                const removable = plannedMoves.filter(m => m.oldId === l.id && m.type === 'down');
                // Zuletzt gepushte = best-platzierte Absteiger → die bleiben zuerst
                const toRemove = removable.slice(-Math.min(removable.length, deficit));
                toRemove.forEach(move => {
                    plannedMoves.splice(plannedMoves.indexOf(move), 1);
                    // Phantom-Fix: gestrichener Move → Zielliga-pending_incoming korrigieren
                    const tgt = this.findTarget(move.t, move.fromLvl + 1, move.oldId);
                    if (tgt && this.leagueStats[tgt.id]) {
                        this.leagueStats[tgt.id].pending_incoming = Math.max(0, this.leagueStats[tgt.id].pending_incoming - 1);
                    }
                });
            }
        }

        // 5. EXECUTE & SAFETY CHECK
        // Live-Zähler für Liga-Schutz und Überschuss-Stopp
        const runningCounts = {};
        Object.values(this.teams).forEach(t => { if (t.leagueId) runningCounts[t.leagueId] = (runningCounts[t.leagueId] || 0) + 1; });

        plannedMoves.forEach(m => {
            const targetLvl = m.type.includes('up') ? m.fromLvl - 1 : m.fromLvl + 1;

            // ANTI-TELEPORTATION: Kein Sprung über >1 Level
            if (Math.abs(targetLvl - m.fromLvl) !== 1) return;

            const target = this.findTarget(m.t, targetLvl, m.oldId);

            // SAFETY: Ziel-Level muss stimmen
            if (target && Math.abs(target.level - m.fromLvl) === 1 && target.id !== m.t.leagueId) {

                // RESERVE-SPERRE: II-Mannschaft nie in 2. Bundesliga oder höher; nicht auf gleichem/höherem Level als Elternverein
                if (m.t.isReserve && m.type.includes('up')) {
                    const tgtLvl = this.leagues[target.id]?.level || 99;
                    if (tgtLvl <= 2) {
                        this.log('info', `Reserve-Sperre (2BL): ${m.t.name} bleibt`);
                        return;
                    }
                    if (m.t.parentId) {
                        const par = this.teams[m.t.parentId];
                        if (par && par.leagueId && tgtLvl <= (this.leagues[par.leagueId]?.level || 0)) {
                            this.log('info', `Reserve-Sperre: ${m.t.name} bleibt unter ${par.name}`);
                            return;
                        }
                    }
                }

                // LIGA-SCHUTZ: Quell-Liga nicht unter 8 Teams schrumpfen lassen (sonst Rumpf-Ligen mit 6 Teams).
                // Überschüssige Auf-/Abstiege werden ausgesetzt, bis die Liga wieder Zuwachs von oben bekommt.
                if ((runningCounts[m.oldId] || 0) <= 8) {
                    this.log('info', `Liga-Schutz: ${m.t.name} bleibt (${this.leagues[m.oldId]?.name}: ${runningCounts[m.oldId]})`);
                    return;
                }
                // ÜBERSCHUSS-STOPP: Nur Level 6+ (Landesligen abwärts); Level 1-5 haben feste Zielgrößen via Kaskade
                // Sicherheitsventil (kein Band-Enforcer!): locker halten, sonst Stau nach oben.
                // Band-max wird pro Liga via eigenes varDn (maxLimit) erzwungen; hier nur Extrem-Überfüllung der Bodenligen stoppen.
                if (!m.type.includes('up') && (this.leagues[target.id]?.level || 99) >= 6) {
                    const lgMax = this.leagues[target.id]?.max || 18;
                    const cap = Math.min(lgMax + 3, 20);
                    if ((runningCounts[target.id] || 0) >= cap) {
                        this.log('info', `Überschuss-Stopp: ${m.t.name} bleibt in ${this.leagues[m.oldId]?.name}`);
                        return;
                    }
                }

                runningCounts[m.oldId] = Math.max(0, (runningCounts[m.oldId] || 0) - 1);
                runningCounts[target.id] = (runningCounts[target.id] || 0) + 1;
                if(this.leagueStats[m.oldId]) this.leagueStats[m.oldId].moveOut++;
                if(this.leagueStats[target.id]) this.leagueStats[target.id].moveIn++;
                m.t.leagueId = target.id;
                this.logMigration(m.t, m.oldId, target.id, m.type);
                if (m.type.includes('up')) m.t.strength = Math.max(1, m.t.strength - 8); else m.t.strength = Math.min(99, m.t.strength + 6);
            }
        });

        // 5b. Reserve-Cascade: Elternverein auf Reserve-Level abgestiegen → Reserve weiter runter.
        // GEO-BODEN: Eine Reserve darf nie unter den Boden ihrer Heimat-Pyramide rutschen. Nord/Ost-
        // Landesligen (Holstein/Hammonia/Berlin-Liga …) sind Bodenligen – Level 7/8 existieren nur im
        // Südwest/Berlin. Ohne Schutz schob 5b eine Nord-Reserve auf pLvl+1, das es im Norden nicht gibt;
        // findTarget kippte sie über den emptiest-Fallback in fremde Südwest-Bezirksligen (Geo-Check-Leck).
        Object.values(this.teams).forEach(t => {
            if (!t.isReserve || !t.parentId || !t.leagueId) return;
            const par = this.teams[t.parentId];
            if (!par || !par.leagueId) return;
            const rLvl = this.leagues[t.leagueId]?.level;
            const pLvl = this.leagues[par.leagueId]?.level;
            if (rLvl === undefined || pLvl === undefined) return;
            const floorId  = this.homeFloorLeagueId(t);
            const floorLvl = floorId && this.leagues[floorId] ? this.leagues[floorId].level : 99;
            // REPARATUR: Reserve steckt tiefer als ihr Heimat-Boden (= fremde Pyramide) → heim in den Boden.
            if (rLvl > floorLvl && floorId !== t.leagueId) {
                const old = t.leagueId;
                t.leagueId = floorId;
                this.log('info', `Geo-Reparatur Reserve: ${t.name} → ${this.leagues[floorId].name}`);
                this.logMigration(t, old, floorId, 'geo_fix');
                return;
            }
            if (rLvl > pLvl) return;
            // Cascade nur, wenn die Heimat-Pyramide das Ziel-Level pLvl+1 überhaupt hat (kein Cross-Region-Dump).
            if ((pLvl + 1) > floorLvl) return;
            const newTgt = this.findTarget(t, pLvl + 1, t.leagueId);
            if (newTgt && newTgt.id !== t.leagueId) {
                this.log('info', `Reserve-Cascade: ${t.name} → ${newTgt.name}`);
                const old = t.leagueId;
                t.leagueId = newTgt.id;
                this.logMigration(t, old, newTgt.id, 'down_reserve');
            }
        });

        // 5b2. Amateurpokal-Austausch (1:1 je Bodenliga) – bewusst NACH der Kaskade und nach 5b.
        const amateurMoves = this._applyAmateurPromotions();

        // 5c. Vorsaison-Abzeichen setzen (vor resetSeason, damit rank noch stimmt)
        const _movedUp   = new Set(plannedMoves.filter(m => m.type.includes('up')).map(m => m.t.id));
        const _movedDown = new Set(plannedMoves.filter(m => m.type.includes('down')).map(m => m.t.id));
        amateurMoves.up.forEach(t => _movedUp.add(t.id));
        amateurMoves.down.forEach(t => _movedDown.add(t.id));
        const _pokalW    = this.pokal && this.pokal.winner;
        const _amateurW  = this.amateurpokal && this.amateurpokal.winner;
        Object.values(this.teams).forEach(t => {
            const b = [];
            if      (_movedUp.has(t.id))   b.push('N');
            else if (_movedDown.has(t.id)) b.push('A');
            else if (relegSurvivors.has(t.id)) b.push('R');
            else if (t.rank === 1)         b.push('M');
            else if (t.rank === 2)         b.push('V');
            if (_pokalW && t.id === _pokalW) b.push('P');
            if (_amateurW && t.id === _amateurW) b.push('AP');
            t.prevSeasonBadge = b.length ? b : null;
        });

        this.balanceDynamicGroups();
        this.rebalanceBerlin();
        Object.keys(this.leagues).forEach(lid => {
            this.leagueStats[lid].new = Object.values(this.teams).filter(t => t.leagueId === lid).length;
        });

        const finalRelegation = this.relegationResults.slice();
        this.log('info', `Transition: ${this.migrations.length} Moves, Rele: ${finalRelegation.length}, geplant: ${plannedMoves.length}`);
        // Dauerhaftes Archiv fortschreiben (Snapshot = gerade gepushter history-Eintrag der fertigen Saison)
        this._archiveSeason(this.history[this.history.length - 1], finalRelegation);
        this.currentSeasonOffset++;
        this.resetSeason(); // Sortiert neu!
        const postIssues = this.sanityCheck();
        this.calculateStrengths();
        this.ensureSeasonFriendlies(); // Pre-Testspiele der neuen Saison (Stärken stehen jetzt)
        if (postIssues.length) this.log('error', `Post-Transition: ${postIssues.join(' | ')}`);
        return { migrations: this.migrations, stats: this.leagueStats, relegation: finalRelegation };
    },

    // Akkumuliert die gerade beendete Saison ins dauerhafte Archiv (nie getrimmt).
    // snap = letzter history-Eintrag {year, teams} der FERTIGEN Saison; this.teams hält bereits
    // die NEUE Ligazuordnung (Migrationen sind durch) → Aufstiegserkennung per Level-Vergleich.
    _archiveSeason: function(snap, finalRelegation) {
        if (!this.archive) this.archive = { ewige: {}, champions: {}, relegation: [], relStats: {} };
        const A = this.archive;
        if (!A.relStats) A.relStats = {};
        const year  = (snap && snap.year) || this.getFormattedSeason();
        const teams = (snap && snap.teams) || {};
        Object.entries(teams).forEach(([id, t]) => {
            const lid = t.leagueId;
            if (!lid || !t.stats) return;
            if (!A.ewige[lid]) A.ewige[lid] = {};
            let e = A.ewige[lid][id];
            if (!e) e = A.ewige[lid][id] = { name: t.name, years: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, titles: 0, promotions: 0 };
            if (t.name) e.name = t.name;
            const s = t.stats;
            e.years++; e.p += s.p||0; e.w += s.w||0; e.d += s.d||0; e.l += s.l||0;
            e.gf += s.gf||0; e.ga += s.ga||0; e.pts += s.pts||0;
            if (t.rank === 1) {
                e.titles++;
                (A.champions[lid] = A.champions[lid] || []).push({ y: year, id });
                if (!this._idbPending) this._idbPending = { champs: [], rels: [], tables: [] };
                this._idbPending.champs.push({ lid, y: year, id });
            }
            // Aufstieg: neue Liga niedrigeres Level als die gerade gespielte
            const curLvl = (this.leagues[lid] || {}).level;
            const nt = this.teams[id];
            if (nt && curLvl) {
                const nLvl = (this.leagues[nt.leagueId] || {}).level;
                if (nLvl && nLvl < curLvl) e.promotions++;
            }
        });
        // Volle Abschlusstabellen je Liga → IndexedDB (Season-Archiv-Browser, beliebige Saison anzeigbar)
        if (typeof IDBStore !== 'undefined') {
            const byLeague = {};
            Object.entries(teams).forEach(([id, t]) => {
                if (!t.leagueId || !t.stats) return;
                (byLeague[t.leagueId] = byLeague[t.leagueId] || []).push({ id, rank: t.rank || 0, s: t.stats.w||0, u: t.stats.d||0, n: t.stats.l||0, gf: t.stats.gf||0, ga: t.stats.ga||0 });
            });
            if (!this._idbPending) this._idbPending = { champs: [], rels: [], tables: [] };
            if (!this._idbPending.tables) this._idbPending.tables = [];
            for (const lid in byLeague) {
                byLeague[lid].sort((a, b) => (a.rank||999) - (b.rank||999));
                this._idbPending.tables.push({ key: year + '|' + lid, y: year, lid, rows: byLeague[lid] });
            }
        }
        // Relegation pro Saison (mit Herkunfts-Liga der Teilnehmer, aus dem Saison-Snapshot)
        if (finalRelegation && finalRelegation.length) {
            const enriched = finalRelegation.map(r => ({
                ...r,
                lH: r.hId ? (teams[r.hId] && teams[r.hId].leagueId) || null : null,
                lA: r.aId ? (teams[r.aId] && teams[r.aId].leagueId) || null : null,
                lW: r.winnerId ? (teams[r.winnerId] && teams[r.winnerId].leagueId) || null : null
            }));
            A.relegation.push({ y: year, results: enriched });
            if (!this._idbPending) this._idbPending = { champs: [], rels: [], tables: [] };
            this._idbPending.rels.push({ y: year, results: enriched });
            // Dauerhafte All-Time-Bilanz je Verein (nur echte Relegationsduelle mit Hin/Rück)
            const bump = (id, won) => {
                if (!id) return;
                const r = A.relStats[id] || (A.relStats[id] = { played: 0, won: 0, lost: 0 });
                r.played++; won ? r.won++ : r.lost++;
            };
            enriched.forEach(e => { if (e.hId && e.aId) { bump(e.hId, e.winnerId === e.hId); bump(e.aId, e.winnerId === e.aId); } });
        }
        this._cupSeason(A, snap, year);  // Pokale dauerhaft: Summen + Siegerchronik
        this._recordSeason(snap);   // Rekorde messen (einmal je Saison, s. REKORDE-Block)
        this._capArchiveChronik();
        this._archiveDirty = true; // Archiv verändert → beim nächsten saveGame in ba_arch_v66 schreiben
    },

    // GEGENSTUECK zu _archiveSeason: eine bereits archivierte Saison wieder herausrechnen.
    // Aufruf aus App.deleteCurrentSeason, und zwar BEVOR die Teams auf den Vorsaison-Stand
    // zurueckgesetzt werden - die Aufstiegserkennung vergleicht wie beim Archivieren die Liga aus
    // dem Snapshot mit der aktuellen Zuordnung in this.teams.
    //
    // Ohne diesen Rueckweg blieb die geloeschte Saison in der ewigen Tabelle, der Meisterchronik,
    // der Relegationsbilanz und den Pokalsummen stehen. Wer sie NEU spielte, bekam sie doppelt
    // gezaehlt - der champions-Store schreibt mit add, da entstuenden sogar zwei Meister fuer
    // dasselbe Jahr. Nicht ueber eine Merkliste "Jahr schon archiviert" loesen: dann wuerde die neu
    // gespielte Saison gar nicht mehr geschrieben und die ewige Tabelle zeigte fuer immer die Zahlen
    // des ersten Durchlaufs. Nichts stuerzt ab, alles ist falsch.
    //
    // NICHT umkehrbar sind die Rekorde: ein Maximum vergisst seine Vorgaenger. Sie behalten die
    // Saison, das Jahr wird in archive.delSeasons vermerkt und in den Rekordansichten angesagt.
    // Der Zaehler apUp (Aufstiege aus dem Amateurpokal) ist dagegen abziehbar und wird abgezogen.
    _unarchiveSeason: function(snap) {
        const A = this.archive;
        if (!A || !snap) return;
        const year = snap.year;
        const teams = snap.teams || {};
        Object.entries(teams).forEach(([id, t]) => {
            const lid = t.leagueId, s = t.stats;
            if (!lid || !s || !A.ewige[lid] || !A.ewige[lid][id]) return;
            const e = A.ewige[lid][id];
            e.years--; e.p -= s.p||0; e.w -= s.w||0; e.d -= s.d||0; e.l -= s.l||0;
            e.gf -= s.gf||0; e.ga -= s.ga||0; e.pts -= s.pts||0;
            if (t.rank === 1 && e.titles > 0) e.titles--;
            const curLvl = (this.leagues[lid] || {}).level;
            const nt = this.teams[id];
            if (nt && curLvl) {
                const nLvl = (this.leagues[nt.leagueId] || {}).level;
                if (nLvl && nLvl < curLvl && e.promotions > 0) e.promotions--;
            }
            if (e.years <= 0) delete A.ewige[lid][id];   // war die einzige Saison dieses Vereins hier
        });
        if (A.champions) for (const lid in A.champions)
            A.champions[lid] = A.champions[lid].filter(c => c.y !== year);
        // Relegation: Bilanz zurueckdrehen, dann den Chronik-Eintrag entfernen
        (A.relegation || []).filter(r => r.y === year).forEach(r => {
            (r.results || []).forEach(e => {
                if (!e.hId || !e.aId) return;
                [e.hId, e.aId].forEach(id => {
                    const st = A.relStats && A.relStats[id];
                    if (!st) return;
                    st.played--; if (e.winnerId === id) st.won--; else st.lost--;
                });
            });
        });
        A.relegation = (A.relegation || []).filter(r => r.y !== year);
        // Pokalsummen mit umgekehrtem Vorzeichen - dafuer hat _cupTotals den sign-Parameter
        this._cupTotals(A, snap.pokal, 'p', -1);
        this._cupTotals(A, snap.amateurpokal, 'a', -1);
        if (A.cupChampions) for (const k in A.cupChampions)
            A.cupChampions[k] = A.cupChampions[k].filter(c => c.y !== year);
        // Aufstiegszaehler des Amateurpokals (einziger hochzaehlender Rekordwert)
        const R = A.records;
        if (R && R.t && snap.amateurpokal && snap.amateurpokal.promoted) {
            snap.amateurpokal.promoted.forEach(id => {
                const o = R.t[id];
                if (o && o.apUp && o.apUp[0] > 0) { o.apUp[0]--; if (!o.apUp[0]) delete o.apUp; }
            });
        }
        // Verbandspokalsiege sind wie apUp ein ZAEHLER und muessen zurueck. MUSS nach der
        // R-Deklaration stehen - davor lief es in die temporale Todeszone von const.
        if (R && R.t && snap.pokal && snap.pokal.entrants) {
            Object.entries(snap.pokal.entrants).forEach(([id, e]) => {
                if (!e || e.type !== 'VP') return;
                const o = R.t[id];
                if (o && o.vp && o.vp[0] > 0) { o.vp[0]--; if (!o.vp[0]) delete o.vp; }
            });
        }
        // Noch nicht geschriebene IDB-Zeilen dieser Saison verwerfen, den Rest aus der DB loeschen
        const P = this._idbPending;
        if (P) {
            if (P.champs) P.champs = P.champs.filter(c => c.y !== year);
            if (P.rels)   P.rels   = P.rels.filter(r => r.y !== year);
            if (P.tables) P.tables = P.tables.filter(t => t.y !== year);
        }
        if (typeof IDBStore !== 'undefined' && IDBStore.deleteSeason) IDBStore.deleteSeason(year);
        (A.delSeasons = A.delSeasons || []).push(year);
        if (A.delSeasons.length > 20) A.delSeasons.shift();
        this._archiveDirty = true;
        this.log('warn', `Saison ${year} aus dem Archiv herausgerechnet (Rekorde behalten sie)`);
    },

    // Chronik (champions je Liga + relegation) auf die letzten ARCHIVE_CHRONIK_CAP Saisons begrenzen.
    // Begrenzt Speicher + Lade-/Speicherzeit (riesige unsichtbare Alt-Chronik). Die SUMMEN
    // (ewige inkl. titles, relStats) bleiben dauerhaft – Titel/Bilanz gehen NICHT verloren.
    _capArchiveChronik: function() {
        const A = this.archive;
        if (!A) return false;
        const CAP = this.ARCHIVE_CHRONIK_CAP || 100;
        let trimmed = false;
        if (A.champions) for (const lid in A.champions) {
            const arr = A.champions[lid];
            if (arr && arr.length > CAP) { arr.splice(0, arr.length - CAP); trimmed = true; }
        }
        if (Array.isArray(A.relegation) && A.relegation.length > CAP) { A.relegation.splice(0, A.relegation.length - CAP); trimmed = true; }
        // Pokalsieger wie die Liga-Meister kappen - die volle Chronik steht in IndexedDB.
        if (A.cupChampions) for (const k in A.cupChampions) {
            const arr = A.cupChampions[k];
            if (arr && arr.length > CAP) { arr.splice(0, arr.length - CAP); trimmed = true; }
        }
        return trimmed;
    },

    // ======================= DAUERHAFTE POKAL-SUMMEN ========================================
    // Die Ligen haben mit archive.ewige eine Summe, die jede je gespielte Saison enthaelt. Die
    // Pokale hatten das NICHT: "Ewige Pokaltabelle" und Siegerliste rechneten aus Engine.history,
    // also aus den letzten 50 Saisons - bei 600 gespielten Saisons zeigten sie 8 % davon, ohne
    // dass es irgendwo stand. archive.cups schliesst diese Luecke ab v0.8.127.
    //
    // Zaehlweise 1:1 wie in den Renderern, damit sich die Zahlen nicht still verschieben:
    // Teilnahme = in Runde 1 gelost (Amateurpokal zusaetzlich Freilose), Spiele nur aus gespielten
    // Runden, Unentschieden = gleiche Tore (auch wenn Elfmeter entschieden haben).
    _cupTotals: function(A, pk, key, sign) {
        if (!pk || !pk.rounds) return;
        const C = A.cups || (A.cups = {});
        const T = C[key] || (C[key] = {});
        const s = sign || 1;
        const mk = id => T[id] || (T[id] = { wins: 0, seasons: 0, sp: 0, w: 0, d: 0, l: 0 });
        const part = new Set();
        ((pk.rounds[0] || {}).matches || []).forEach(m => { if (m.hId) part.add(m.hId); if (m.aId) part.add(m.aId); });
        // Freilose gibt es nur im Amateurpokal - und nur im vollen Objekt: _leanAmateur wirft sie
        // beim Speichern weg. Ab hier werden sie mitgezaehlt, weil die Summe VOR dem Kuerzen entsteht.
        (pk.byes || []).forEach(id => { if (id) part.add(id); });
        part.forEach(id => { mk(id).seasons += s; });
        pk.rounds.forEach(rd => {
            if (!rd.played) return;
            (rd.matches || []).forEach(m => {
                if (!m.hId || !m.aId) return;
                const h = mk(m.hId), a = mk(m.aId);
                h.sp += s; a.sp += s;
                if (m.hGoals === m.aGoals)      { h.d += s; a.d += s; }
                else if (m.winnerId === m.hId)  { h.w += s; a.l += s; }
                else                            { a.w += s; h.l += s; }
            });
        });
        if (pk.winner) mk(pk.winner).wins += s;
    },

    // Beide Pokale einer fertigen Saison ins dauerhafte Archiv: Summen + Sieger. Die Sieger gehen
    // zusaetzlich in IndexedDB (Store 'champions' mit den Pseudo-Ligen __pokal__/__amateur__) -
    // dort steht die Chronik ungekappt, genau wie bei den Liga-Meistern.
    _cupSeason: function(A, snap, year) {
        [['p', snap && snap.pokal, '__pokal__'], ['a', snap && snap.amateurpokal, '__amateur__']].forEach(([key, pk, lid]) => {
            if (!pk) return;
            this._cupTotals(A, pk, key, 1);
            if (!pk.winner) return;
            const cc = A.cupChampions || (A.cupChampions = {});
            (cc[key] = cc[key] || []).push({ y: year, id: pk.winner });
            if (!this._idbPending) this._idbPending = { champs: [], rels: [], tables: [] };
            this._idbPending.champs.push({ lid: lid, y: year, id: pk.winner });
        });
    },

    // Einmaliger Nachlauf fuer bestehende Spielstaende: die Pokalsummen aus dem, was das
    // history-Fenster noch hergibt (bis zu 50 Saisons). Rein lokal, kein IndexedDB noetig - und
    // mit EIGENEM Guard (cups.bf), weil records.bf in Spielstaenden ab v0.8.125 laengst steht und
    // _recordBackfill dort gar nicht mehr laeuft. Alles davor ist unwiederbringlich weg: vor
    // v0.8.127 wurden Pokaldaten nirgends dauerhaft abgelegt.
    _cupBackfill: function() {
        const A = this.archive;
        if (!A) return;
        const C = A.cups || (A.cups = {});
        if (C.bf) return;
        (this.history || []).forEach(h => {
            this._cupTotals(A, h.pokal, 'p', 1);
            this._cupTotals(A, h.amateurpokal, 'a', 1);
            const cc = A.cupChampions || (A.cupChampions = {});
            if (h.pokal && h.pokal.winner) (cc.p = cc.p || []).push({ y: h.year, id: h.pokal.winner });
            if (h.amateurpokal && h.amateurpokal.winner) (cc.a = cc.a || []).push({ y: h.year, id: h.amateurpokal.winner });
        });
        this._capArchiveChronik();
        C.bf = 1;
        this._archiveDirty = true;
        this.log('info', `Pokalsummen aus ${(this.history || []).length} Saisons des History-Fensters uebernommen`);
    },

    // ======================= REKORDE ========================================================
    // Messstand-Prinzip: je Rekord genau EIN Slot [wert, ...beleg]. Der Speicher wächst NICHT mit
    // der Zahl der Saisons, nur mit der Zahl der Vereine (1262 × ~16 Slots ≈ 48 kB komprimiert).
    //
    // Gemessen wird ALLES genau einmal beim Saisonwechsel (_recordSeason aus _archiveSeason),
    // nie pro Spieltag. Grund: undoLastMatchday nimmt einen Spieltag zurück - einen bereits
    // gesetzten Rekord könnte es nicht zurücknehmen. Am Saisonende ist jeder Spieltag endgültig.
    // Serien laufen deshalb über einen Übertrag (_r) statt über einen Live-Zähler: _r hält die am
    // Saisonende OFFENE Serie, die in der Folgesaison weiterzählt.
    //
    // Punkte sind IMMER 3-Punkte-normalisiert (pts = 3*S+U, auch für die 2-Punkte-Ära, s.
    // _seedHistory) - deshalb steht bei jedem Punkterekord die Spielzahl im Beleg, und "Punkte je
    // Spiel" (ppg) ist der einzige über Ligagrößen und Epochen hinweg faire Vergleich.
    //
    // Slot-Layout (Wert immer an [0]):
    //   Verein  pts/ptsL [pts,y,lid,sp]   ppg [pkt/spiel,y,lid,sp]   gf/ga [tore,y,lid,sp]
    //           dif [diff,y,lid]          w [siege,y,lid,sp]         lvl [level,y,lid] (MINIMUM!)
    //           hs/hn [diff,gf,ga,y,opp]  mg [tore,gf,ga,y,opp]
    //           unb/win [n,y]             sameL [n,y,lid]            tit [n,y,lid]
    //           cup [rundenIdx,y]         (rundenIdx == rounds.length -> Pokalsieger)
    //   Liga    cPts/cPtsL [pts,y,id,sp]  lead [vorsprung,y,id]      gfS [ligatore,y]
    //           cRow [n,y,id]             hs [diff,hoch,tief,y,siegerId,verliererId]
    REC_VER: 1,

    _recMax: function(o, k, v, beleg) { if (v == null || !isFinite(v)) return; const c = o[k]; if (!c || v > c[0]) o[k] = [v].concat(beleg); },
    _recMin: function(o, k, v, beleg) { if (v == null || !isFinite(v)) return; const c = o[k]; if (!c || v < c[0]) o[k] = [v].concat(beleg); },
    // Maximum mit Stichentscheid: höchster Sieg = erst Differenz, bei Gleichstand mehr eigene Tore
    _recMax2: function(o, k, v, v2, beleg) { const c = o[k]; if (!c || v > c[0] || (v === c[0] && v2 > c[1])) o[k] = [v, v2].concat(beleg); },

    _recStore: function() {
        if (!this.archive) return null;
        const R = this.archive.records || (this.archive.records = { v: this.REC_VER, t: {}, l: {} });
        if (!R.t) R.t = {};
        if (!R.l) R.l = {};
        return R;
    },

    // Eine abgeschlossene Saison in die Rekorde falten. snap = history-Eintrag der FERTIGEN Saison
    // (enthält teams inkl. stats, matchdayHistory und pokal).
    _recordSeason: function(snap) {
        const R = this._recStore();
        if (!R) return;
        const year  = (snap && snap.year) || this.getFormattedSeason();
        const teams = (snap && snap.teams) || {};
        const T = id => R.t[id] || (R.t[id] = {});
        const L = id => R.l[id] || (R.l[id] = {});
        const byLeague = {};

        // (1) Aus der Abschlusstabelle: Saisonrekorde + Serien-Übertrag
        Object.entries(teams).forEach(([id, t]) => {
            const o = T(id), r = o._r || (o._r = {});
            const lid = t.leagueId, s = t.stats, sp = (s && s.p) || 0;
            if (!lid || !sp) { r.l = null; r.t = 0; r.u = 0; r.w = 0; return; } // ligalos: jede Serie reißt
            r.a = 0;                                        // in einer Liga -> Amateurpokal-Serie endet
            (byLeague[lid] = byLeague[lid] || []).push({ id: id, t: t, s: s });
            const pts = s.pts || 0, gf = s.gf || 0, ga = s.ga || 0;
            this._recMax(o, 'pts',  pts, [year, lid, sp]);
            this._recMin(o, 'ptsL', pts, [year, lid, sp]);
            this._recMax(o, 'ppg',  Math.round(pts / sp * 100) / 100, [year, lid, sp]);
            this._recMax(o, 'gf',   gf, [year, lid, sp]);
            this._recMin(o, 'ga',   ga, [year, lid, sp]);
            this._recMax(o, 'dif',  gf - ga, [year, lid]);
            this._recMax(o, 'w',    s.w || 0, [year, lid, sp]);
            const lvl = (this.leagues[lid] || {}).level;
            if (lvl) this._recMin(o, 'lvl', lvl, [year, lid]); // Minimum: kleinstes Level = höchste Ebene
            r.l = (r.l && r.l[0] === lid) ? [lid, r.l[1] + 1] : [lid, 1];
            this._recMax(o, 'sameL', r.l[1], [year, lid]);
            r.t = (t.rank === 1) ? (r.t || 0) + 1 : 0;
            if (r.t) this._recMax(o, 'tit', r.t, [year, lid]);
        });

        // (2) Liga-Rekorde aus derselben Tabelle
        for (const lid in byLeague) {
            const rows = byLeague[lid].sort((a, b) => (a.t.rank || 99) - (b.t.rank || 99));
            const lo = L(lid), lr = lo._r || (lo._r = {});
            const ch = rows[0], vi = rows[1];
            this._recMax(lo, 'gfS', rows.reduce((n, x) => n + (x.s.gf || 0), 0), [year]);
            if (ch && ch.t.rank === 1) {
                const sp = ch.s.p || 0, cp = ch.s.pts || 0;
                this._recMax(lo, 'cPts',  cp, [year, ch.id, sp]);
                this._recMin(lo, 'cPtsL', cp, [year, ch.id, sp]);
                if (vi) this._recMax(lo, 'lead', cp - (vi.s.pts || 0), [year, ch.id]);
                lr.c = (lr.c && lr.c[0] === ch.id) ? [ch.id, lr.c[1] + 1] : [ch.id, 1];
                this._recMax(lo, 'cRow', lr.c[1], [year, ch.id]);
            }
        }

        // (3) Aus den Einzelspielen: Spielrekorde + Serien innerhalb der Saison.
        // ~16.600 Partien pro Saison, der Durchlauf kostet ~2 ms - danach ist das Material weg
        // (der Save hält Spieltage nur 5 Saisons und nur bis Level 4).
        //
        // QUELLE IST seasonResults, NICHT snap.matchdayHistory. Die matchdayHistory ist im
        // fastMode unvollständig: _applyResult legt dort nur Ligen bis Ebene 4 ab. fastMode
        // läuft aber bei "Restsaison simulieren" (App.simRest) und im MegaSim - also in genau
        // den Saisons, die man NICHT Spieltag für Spieltag klickt. Folge: ab der Oberliga
        // abwärts entstand nie ein Spielrekord ausser in durchgeklickten Saisons. Gemessen
        // (tools/rek_check.cjs, je 3 Saisons): fastMode → Ebene 5-8 kein einziger Eintrag,
        // dieselbe Rechnung langsam → alle acht Ebenen. Im Spielstand sah das aus wie
        // "der höchste Sieg stammt in den unteren Ligen immer aus dem ersten Jahr".
        // seasonResults füllt _applyResult dagegen in BEIDEN Modi ungefiltert, es wird je
        // Saison geleert, von undoLastMatchday mitgeschnitten und trägt IDs statt Namen.
        const seq = {};
        (this.seasonResults || []).forEach(m => {
            const hId = m.hId, aId = m.aId;
            const s1 = m.s1 | 0, s2 = m.s2 | 0;
            if (m.lid && s1 !== s2) {
                const hoch = Math.max(s1, s2), tief = Math.min(s1, s2);
                const sieger = s1 > s2 ? hId : aId, verl = s1 > s2 ? aId : hId;
                this._recMax2(L(m.lid), 'hs', hoch - tief, hoch, [tief, year, sieger, verl]);
            }
            const seite = (id, opp, gf, ga) => {
                if (!id) return;
                const o = T(id);
                if (gf > ga) this._recMax2(o, 'hs', gf - ga, gf, [ga, year, opp]);
                if (ga > gf) this._recMax2(o, 'hn', ga - gf, ga, [gf, year, opp]);
                this._recMax2(o, 'mg', gf + ga, gf, [ga, year, opp]);
                (seq[id] = seq[id] || []).push(gf > ga ? 2 : gf === ga ? 1 : 0);
            };
            seite(hId, aId, s1, s2);
            seite(aId, hId, s2, s1);
        });
        for (const id in seq) {
            const o = T(id), r = o._r || (o._r = {});
            let cu = r.u || 0, cw = r.w || 0, bu = 0, bw = 0;
            seq[id].forEach(v => {
                cu = v >= 1 ? cu + 1 : 0; if (cu > bu) bu = cu;
                cw = v === 2 ? cw + 1 : 0; if (cw > bw) bw = cw;
            });
            r.u = cu; r.w = cw;
            this._recMax(o, 'unb', bu, [year]);
            this._recMax(o, 'win', bw, [year]);
        }

        // (4) Pokale: Wettbewerbsrekorde + weiteste Runde je Verein. Der Amateurpokal laeuft
        // durch dieselbe Rechnung - er hat denselben Aufbau (rounds/matches/winner), nur kennt er
        // keine Ligaebenen, weshalb 'sens' und 'low' dort von selbst leer bleiben.
        this._recordPokalSeason(R, snap && snap.pokal, teams, year, 'p');
        this._recordPokalSeason(R, snap && snap.amateurpokal, teams, year, 'a');
        this._recordVerbandspokal(R, snap && snap.pokal, year);
    },

    // Verbandspokal: der Wettbewerb selbst wird nicht ausgespielt und gespeichert - nur SIEGER
    // entstehen (_simulateVerbandCup) und ziehen in den DFB-Pokal ein. Genau die stehen aber in
    // pokal.entrants als {type:'VP', verband}. Spielrekorde sind daraus nicht zu holen, Titel schon.
    //
    // Bisher zaehlte der Steckbrief-Chip sie aus dem 50-Saisons-Fenster - nach 600 Saisons also 8 %.
    // Hier werden sie dauerhaft gezaehlt: vp = [anzahl, letztes Jahr, verband], vpRow = laengste
    // Serie. Beides sind ZAEHLER, duerfen also nie zweimal ueber dieselbe Saison laufen (Guard
    // cups.bf im Backfill) und werden von _unarchiveSeason wieder abgezogen.
    //
    // Sollte der Verbandspokal je wirklich ausgespielt werden, braucht es hier nichts Neues:
    // _recordPokalSeason(R, pk, teams, year, 'v') funktioniert unveraendert, sobald es Runden gibt.
    _recordVerbandspokal: function(R, pk, year) {
        if (!pk || !pk.entrants) return;
        const T = id => R.t[id] || (R.t[id] = {});
        const sieger = new Set();
        Object.entries(pk.entrants).forEach(([id, e]) => {
            if (!e || e.type !== 'VP') return;
            sieger.add(id);
            const o = T(id), rr = o._r || (o._r = {});
            o.vp = [((o.vp && o.vp[0]) || 0) + 1, year, e.verband || (o.vp && o.vp[2]) || null];
            rr.v = (rr.v || 0) + 1;
            this._recMax(o, 'vpRow', rr.v, [year]);
        });
        // Wer diesmal NICHT gewonnen hat, dessen Serie reisst
        for (const id in R.t) if (!sieger.has(id) && R.t[id]._r) R.t[id]._r.v = 0;
    },

    // Pokal-Rekorde EINER Saison. Ausgelagert, weil der Backfill dieselbe Rechnung ueber
    // Engine.history[].pokal fahren kann: dort liegen bis zu 50 Saisons mit VOLLSTAENDIGEN
    // Pokalspielen - anders als die Ligaspieltage, die nur 5 Saisons und nur bis Level 4 ueberleben.
    // Slots in records.p: hs [diff,hoch,tief,y,sieger,verlierer] · mg [tore,hoch,tief,y,hId,aId]
    //   sens [levelDiff,y,sieger,verlierer,lvlS,lvlV] · low [level,y,id] (groesste Levelzahl im
    //   Endspiel = tiefstklassiger Finalist) · gfS [tore,y] · pen [n,y] · tRow [n,y,id]
    _recordPokalSeason: function(R, pk, teams, year, key) {
        if (!pk || !pk.rounds) return;
        const K = key || 'p';                      // 'p' = DFB-Pokal, 'a' = Amateurpokal
        const slot = K === 'a' ? 'acup' : 'cup';   // weiteste Runde je Verein, getrennt je Wettbewerb
        const P = R[K] || (R[K] = {});
        const pr = P._r || (P._r = {});
        const T = id => R.t[id] || (R.t[id] = {});
        const lvlOf = id => (this.leagues[((teams || {})[id] || {}).leagueId] || {}).level || null;
        const reached = {};
        let tore = 0, elfer = 0;
        pk.rounds.forEach((rd, i) => (rd.matches || []).forEach(m => {
            if (m.hId) reached[m.hId] = i;
            if (m.aId) reached[m.aId] = i;
            if (!rd.played || m.hGoals == null || m.aGoals == null) return;
            const h = m.hGoals | 0, a = m.aGoals | 0;
            const hoch = Math.max(h, a), tief = Math.min(h, a);
            tore += h + a;
            if (m.penalties) elfer++;
            const sieger = m.winnerId || (h > a ? m.hId : a > h ? m.aId : null);
            const verl = sieger ? (sieger === m.hId ? m.aId : m.hId) : null;
            // Spielrekorde je Verein AUS POKALPARTIEN - eigene Slots (chs/chn/cmg), damit sie sich
            // nicht mit den Ligarekorden mischen: ein 9:0 gegen einen Viertligisten ist etwas
            // anderes als ein 4:0 in der Liga. Der Wettbewerb steht als letztes Belegfeld dabei.
            // Fuer die 261 dauerhaft ligalosen Vereine sind das ueberhaupt die einzigen Ergebnisse.
            const seite = (id, opp, gf, ga) => {
                if (!id) return;
                const o = T(id);
                if (gf > ga) this._recMax2(o, 'chs', gf - ga, gf, [ga, year, opp, K]);
                if (ga > gf) this._recMax2(o, 'chn', ga - gf, ga, [gf, year, opp, K]);
                this._recMax2(o, 'cmg', gf + ga, gf, [ga, year, opp, K]);
            };
            seite(m.hId, m.aId, h, a);
            seite(m.aId, m.hId, a, h);
            if (h !== a && sieger) this._recMax2(P, 'hs', hoch - tief, hoch, [tief, year, sieger, verl]);
            // NICHT _recMax2: dort landet der groessere Wert auf [1], das Ergebnis stuende dann
            // verdreht zur Reihenfolge Heim/Auswaerts im Beleg (0:8 wurde als 8:0 angezeigt).
            const cm = P.mg;
            if (!cm || (h + a) > cm[0] || ((h + a) === cm[0] && hoch > Math.max(cm[1], cm[2])))
                P.mg = [h + a, h, a, year, m.hId, m.aId];
            // Ueberraschung: Sieger aus der TIEFEREN Ebene (groessere Levelzahl) wirft den Hoeherklassigen
            const ls = lvlOf(sieger), lv = lvlOf(verl);
            if (sieger && ls && lv && ls > lv) this._recMax(P, 'sens', ls - lv, [year, sieger, verl, ls, lv]);
        }));
        if (pk.winner) reached[pk.winner] = pk.rounds.length;
        for (const id in reached) this._recMax(T(id), slot, reached[id], [year]);
        if (K === 'a') {
            // Wer im Amateurpokal auftaucht, war diese Saison ligalos - die Teilnahme IST die
            // Durststrecke. Deshalb wird sie hier gezaehlt und nicht in (1): dort fehlen die
            // ligalosen Vereine im IDB-Backfill komplett (season_tables kennt nur Ligavereine).
            for (const id in reached) {
                const o = T(id), rr = o._r || (o._r = {});
                rr.a = (rr.a || 0) + 1;
                this._recMax(o, 'apRow', rr.a, [year]);
            }
            // apUp ist ein ZAEHLER, kein Max-Slot: [anzahl, letztes Jahr]. Er darf deshalb nie
            // zweimal ueber dieselbe Saison laufen - dafuer sorgt der bf-Guard in _recordBackfill.
            (pk.promoted || []).forEach(id => {
                const o = T(id), rr = o._r || (o._r = {});
                o.apUp = [((o.apUp && o.apUp[0]) || 0) + 1, year];
                rr.a = 0;                                   // Aufstieg beendet die Durststrecke
            });
        }
        if (tore) this._recMax(P, 'gfS', tore, [year]);
        if (elfer) this._recMax(P, 'pen', elfer, [year]);
        const fin = pk.rounds[pk.rounds.length - 1];
        if (fin && fin.played) (fin.matches || []).forEach(m => {
            [m.hId, m.aId].forEach(id => { const l = lvlOf(id); if (l) this._recMax(P, 'low', l, [year, id]); });
        });
        if (pk.winner) {
            pr.c = (pr.c && pr.c[0] === pk.winner) ? [pk.winner, pr.c[1] + 1] : [pk.winner, 1];
            this._recMax(P, 'tRow', pr.c[1], [year, pk.winner]);
        }
    },

    // Einmaliger Nachlauf für bestehende Spielstände: alle Rekorde, die sich aus einer
    // ABSCHLUSSTABELLE ergeben, rückwirkend aus dem IndexedDB-Saisonarchiv (season_tables) füllen.
    // NICHT nachholbar sind die Spielrekorde (hs/hn/mg/unb/win): Einzelergebnisse alter Saisons
    // existieren nirgends mehr. Reicht zurück bis v0.8.27 (seitdem werden Tabellen archiviert).
    // Max/Min über dieselben Daten ist idempotent; der Guard R.bf schützt die Serien-Überträge (_r),
    // die als einzige hochzählen und daher kein zweites Mal laufen dürfen.
    _recordBackfill: function() {
        const R = this._recStore();
        if (!R || R.bf || this._recBfRunning) return;
        if (typeof IDBStore === 'undefined' || !IDBStore.scanSeasonTables) return;
        this._recBfRunning = true;
        const T = id => R.t[id] || (R.t[id] = {});
        const L = id => R.l[id] || (R.l[id] = {});
        const rows = [];
        IDBStore.scanSeasonTables(r => rows.push(r)).then(() => {
            const byYear = {};
            rows.forEach(r => (byYear[r.y] = byYear[r.y] || []).push(r));
            const years = Object.keys(byYear).sort(); // 'YYYY/YY' sortiert lexikografisch = chronologisch
            years.forEach(year => {
                const aktiv = {};
                byYear[year].forEach(tab => {
                    const lid = tab.lid, lvl = (this.leagues[lid] || {}).level;
                    const tr = (tab.rows || []).slice().sort((a, b) => (a.rank || 99) - (b.rank || 99));
                    const lo = L(lid), lr = lo._r || (lo._r = {});
                    let ligaTore = 0;
                    tr.forEach(row => {
                        const sp = (row.s || 0) + (row.u || 0) + (row.n || 0);
                        if (!sp) return;
                        const pts = 3 * (row.s || 0) + (row.u || 0); // 3-Punkte-Normalisierung wie _seedHistory
                        const gf = row.gf || 0, ga = row.ga || 0;
                        const o = T(row.id), rr = o._r || (o._r = {});
                        ligaTore += gf;
                        aktiv[row.id] = 1;
                        this._recMax(o, 'pts',  pts, [year, lid, sp]);
                        this._recMin(o, 'ptsL', pts, [year, lid, sp]);
                        this._recMax(o, 'ppg',  Math.round(pts / sp * 100) / 100, [year, lid, sp]);
                        this._recMax(o, 'gf',   gf, [year, lid, sp]);
                        this._recMin(o, 'ga',   ga, [year, lid, sp]);
                        this._recMax(o, 'dif',  gf - ga, [year, lid]);
                        this._recMax(o, 'w',    row.s || 0, [year, lid, sp]);
                        if (lvl) this._recMin(o, 'lvl', lvl, [year, lid]);
                        rr.l = (rr.l && rr.l[0] === lid) ? [lid, rr.l[1] + 1] : [lid, 1];
                        this._recMax(o, 'sameL', rr.l[1], [year, lid]);
                        rr.t = (row.rank === 1) ? (rr.t || 0) + 1 : 0;
                        if (rr.t) this._recMax(o, 'tit', rr.t, [year, lid]);
                    });
                    this._recMax(lo, 'gfS', ligaTore, [year]);
                    const ch = tr[0], vi = tr[1];
                    if (ch && ch.rank === 1) {
                        const sp = (ch.s || 0) + (ch.u || 0) + (ch.n || 0), cp = 3 * (ch.s || 0) + (ch.u || 0);
                        this._recMax(lo, 'cPts',  cp, [year, ch.id, sp]);
                        this._recMin(lo, 'cPtsL', cp, [year, ch.id, sp]);
                        if (vi) this._recMax(lo, 'lead', cp - (3 * (vi.s || 0) + (vi.u || 0)), [year, ch.id]);
                        lr.c = (lr.c && lr.c[0] === ch.id) ? [ch.id, lr.c[1] + 1] : [ch.id, 1];
                        this._recMax(lo, 'cRow', lr.c[1], [year, ch.id]);
                    }
                });
                // Wer in dieser Saison in keiner Tabelle stand, dessen Ligaserie reißt
                for (const id in R.t) if (!aktiv[id] && R.t[id]._r) { R.t[id]._r.l = null; R.t[id]._r.t = 0; }
            });
            // Pokal rueckwirkend: erst die historischen Sieger (POKAL_SEED 1935-2024/25, nur
            // Titel in Folge - Spieldaten gibt es dafuer nicht), dann das history-Fenster mit
            // vollstaendigen Pokalspielen. Reihenfolge = Chronologie, sonst stimmen die Serien nicht.
            const P = R.p || (R.p = {}), pr = P._r || (P._r = {});
            if (typeof POKAL_SEED !== 'undefined' && POKAL_SEED) {
                Object.keys(POKAL_SEED).sort().forEach(y => {
                    const id = POKAL_SEED[y];
                    if (!id) return;
                    pr.c = (pr.c && pr.c[0] === id) ? [id, pr.c[1] + 1] : [id, 1];
                    this._recMax(P, 'tRow', pr.c[1], [y, id]);
                });
            }
            (this.history || []).forEach(h => {
                this._recordPokalSeason(R, h.pokal, h.teams || {}, h.year, 'p');
                this._recordPokalSeason(R, h.amateurpokal, h.teams || {}, h.year, 'a');
                this._recordVerbandspokal(R, h.pokal, h.year);
            });
            R.bf = 1;
            this._recBfRunning = false;
            this._archiveDirty = true;
            this.log('info', `Rekorde: ${years.length} archivierte Saisons rückwirkend ausgewertet`);
        }, () => { this._recBfRunning = false; });
    },

    // Historische Abschlusstabellen (HISTORY_SEED) einmalig in die dauerhaften Summen falten.
    // Idempotent über archive.seededSeasons["y|lid"]. Original-Tabellen sind 2-Punkte-Ära →
    // wir speichern NICHT die Original-Punkte, sondern S/U/N (regel-unabhängig) und rechnen
    // pts = 3*S+U (3-Punkte-Normalisierung). Historischer rank/Meister bleibt Fakt (titles).
    // Volle Meister-Chronik → IndexedDB (historische Saisons sind alt → fallen sonst aus dem 100er-Cap).
    _seedHistory: function() {
        if (typeof HISTORY_SEED === 'undefined' || !HISTORY_SEED || !this.archive) return;
        const A = this.archive;
        if (!A.seededSeasons) A.seededSeasons = {};
        if (!A.ewige) A.ewige = {};
        const SEED_VER = HISTORY_SEED.version || 1;
        const idbChamps = [];
        const idbTables = [];
        let folded = 0;
        // (1) FOLD in die Summen (genau einmal je Saison, Guard seededSeasons)
        (HISTORY_SEED.seasons || []).forEach(seas => {
            const key = seas.y + '|' + seas.lid;
            if (A.seededSeasons[key]) return;
            const lid = seas.lid;
            if (!A.ewige[lid]) A.ewige[lid] = {};
            (seas.table || []).forEach(r => {
                const sp = r.s + r.u + r.n, pts = 3 * r.s + r.u; // 3-Punkte-Normalisierung
                if (sp === 0) return; // zurückgezogener Verein (z.B. RW Essen 1993/94) – kein Phantom-Jahr in der ewigen Tabelle
                let e = A.ewige[lid][r.id];
                if (!e) { const dn = (GAME_DATA.teams[r.id] || {}).name || (typeof HISTORIC_CLUBS !== 'undefined' && HISTORIC_CLUBS[r.id]) || r.id;
                    e = A.ewige[lid][r.id] = { name: dn, years: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, titles: 0, promotions: 0 }; }
                e.years++; e.p += sp; e.w += r.s; e.d += r.u; e.l += r.n; e.gf += r.gf; e.ga += r.ga; e.pts += pts;
                if (r.rank === 1) { e.titles++; idbChamps.push({ lid, y: seas.y, id: r.id }); } // Meister NUR bei Erst-Fold (kein Dup)
            });
            A.seededSeasons[key] = true;
            folded++;
        });
        // (2) IDB-Tabellen-PUSH – ENTKOPPELT vom Fold-Guard, eigener Versions-Flag. Greift auch bei
        // Saves, die schon gefaltet wurden (v0.8.26-Migration: Tabellen gab es da noch nicht) oder nach
        // reset(). put ist idempotent (key "y|lid"). Champions kommen aus Schritt (1) (nur Erst-Fold).
        const tablesStale = A.histTablesSeeded !== SEED_VER;
        if (tablesStale && typeof IDBStore !== 'undefined') {
            (HISTORY_SEED.seasons || []).forEach(seas => {
                idbTables.push({ key: seas.y + '|' + seas.lid, y: seas.y, lid: seas.lid, rows: (seas.table || []).map(r => { const o = { id: r.id, rank: r.rank, s: r.s, u: r.u, n: r.n, gf: r.gf, ga: r.ga }; if (r.g) o.g = r.g; return o; }) });
            });
            A.histTablesSeeded = SEED_VER;
        }
        // (2b) Echte Relegations-Playoffs (RELEGATION_SEED) → archive.relegation + relStats. Fold-once je Saison
        // (relSeededSeasons) für die additive Bilanz; IDB-Push idempotent (put, keyPath y) entkoppelt via
        // histRelSeeded. Herkunftsligen fix: Erstligist lH='1', Zweitligist lA='2', Sieger landet in der BL lW='1'
        // → erscheint in _renderRelegation/_leagueHasRelegation für die Ligen '1' und '2'.
        const idbRels = [];
        if (typeof RELEGATION_SEED !== 'undefined' && RELEGATION_SEED) {
            if (!A.relegation) A.relegation = [];
            if (!A.relStats) A.relStats = {};
            if (!A.relSeededSeasons) A.relSeededSeasons = {};
            const relStale = A.histRelSeeded !== (RELEGATION_SEED.version || 1);
            const bump = (id, won) => { if (!id) return; const s = A.relStats[id] || (A.relStats[id] = { played: 0, won: 0, lost: 0 }); s.played++; won ? s.won++ : s.lost++; };
            Object.entries(RELEGATION_SEED.seasons || {}).forEach(([y, v]) => {
                if (!v.h || !v.a) return;
                const results = [{ match: '1.BL/2.BL', result: v.result, winnerId: v.winnerId, hId: v.h, aId: v.a, color: 'gold', lH: '1', lA: '2', lW: '1' }];
                if (!A.relSeededSeasons[y]) {
                    A.relegation.push({ y, results });
                    bump(v.h, v.winnerId === v.h); bump(v.a, v.winnerId === v.a);
                    A.relSeededSeasons[y] = true; folded++;
                }
                if (relStale) idbRels.push({ y, results });
            });
            if (relStale) A.histRelSeeded = (RELEGATION_SEED.version || 1);
        }
        if (typeof IDBStore !== 'undefined') {
            if (idbChamps.length || idbRels.length) IDBStore.appendSeason(idbChamps, idbRels);
            const wr = idbTables.length ? IDBStore.putSeasonTables(idbTables) : null;
            // Rekord-Backfill erst NACH dem Schreiben der Seed-Tabellen anstossen: sonst stuenden die
            // historischen Abschlusstabellen noch nicht im Archiv, waeren aus den Rekorden fuer immer
            // raus (der bf-Guard laesst den Backfill nur ein einziges Mal laufen).
            const go = () => this._recordBackfill();
            if (wr && wr.then) wr.then(go, go); else go();
        }
        if (folded || tablesStale || idbRels.length) {
            this._archiveDirty = true; // ewige-Summen/Guards verändert → Archiv-Key neu schreiben
            this.saveGame(); // Guards + Summen persistieren → kein Doppel-Fold / kein Re-Push beim nächsten Laden
        }
    },

    // Altsave ohne Archiv: einmalig aus der (≤50) noch vorhandenen history seeden.
    // Bereits verworfene Saisons sind verloren; ab hier wird nichts mehr getrimmt.
    _rebuildArchiveFromHistory: function() {
        const A = { ewige: {}, champions: {}, relegation: [], relStats: {} };
        const hist = this.history || [];
        for (let i = 0; i < hist.length; i++) {
            const snap = hist[i];
            const nextTeams = i + 1 < hist.length ? hist[i + 1].teams : this.teams;
            Object.entries(snap.teams || {}).forEach(([id, t]) => {
                const lid = t.leagueId;
                if (!lid || !t.stats) return;
                if (!A.ewige[lid]) A.ewige[lid] = {};
                let e = A.ewige[lid][id];
                if (!e) e = A.ewige[lid][id] = { name: t.name, years: 0, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, titles: 0, promotions: 0 };
                if (t.name) e.name = t.name;
                const s = t.stats;
                e.years++; e.p += s.p||0; e.w += s.w||0; e.d += s.d||0; e.l += s.l||0;
                e.gf += s.gf||0; e.ga += s.ga||0; e.pts += s.pts||0;
                if (t.rank === 1) { e.titles++; (A.champions[lid] = A.champions[lid] || []).push({ y: snap.year, id }); }
                const curLvl = (this.leagues[lid] || {}).level;
                const nt = nextTeams && nextTeams[id];
                if (nt && curLvl) {
                    const nLvl = (this.leagues[nt.leagueId] || {}).level;
                    if (nLvl && nLvl < curLvl) e.promotions++;
                }
            });
        }
        return A;
    },

    getTeamByRank: function(lid, rank) {
        return Object.values(this.teams).filter(t => t.leagueId === lid).sort((a,b)=>a.rank-b.rank)[rank-1];
    },

    balanceDynamicGroups: function() {
        const siblingCovered = new Set();
        this.SIBLING_GROUPS.forEach(g => (g.ids||g).forEach(id => siblingCovered.add(id)));
        const groups = {};
        Object.values(this.leagues).forEach(l => {
            if (this.isGeoBlocked(l.name)) return;
            if (siblingCovered.has(l.id)) return;
            if (l.level >= 4) {
                const regionKey = l.region || 'misc';
                const nameKey = this.getKeywords(l.name).join('_');
                const key = `${l.level}_${regionKey}_${nameKey}`;
                if (!groups[key]) groups[key] = [];
                groups[key].push(l.id);
            }
        });
        Object.values(groups).forEach(ids => { if (ids.length > 1) this.balanceGroup(ids); });
        this.SIBLING_GROUPS.forEach(g => { const ids = g.ids||g; if (ids.length > 1) this.balanceGroup(ids, g.axis); });
    },

    // Berlin-Staffeln (7-8/7-9): keine Geografie → persistente Heimatstaffel (findTarget) hält die ewige
    // Tabelle sauber, driftet aber langsam. Diese SELTENE Korrektur greift nur bei großem Größen-Drift
    // (>MAXDIFF) und verschiebt minimal viele Vereine dauerhaft in die dünnere Staffel (neue Heimat).
    rebalanceBerlin: function() {
        const A = '7-8', B = '7-9', MAXDIFF = 2;
        if (!this.leagues[A] || !this.leagues[B]) return;
        const inLeague = id => Object.values(this.teams).filter(t => t.leagueId === id);
        let guard = 0;
        while (guard++ < 20) {
            const a = inLeague(A), b = inLeague(B);
            if (Math.abs(a.length - b.length) <= MAXDIFF) break;
            const big = a.length > b.length ? A : B;
            const small = big === A ? B : A;
            // table-letzten der vollen Staffel umtopfen (geringste Bindung) → neue Heimatstaffel
            const pool = inLeague(big).sort((x, y) => (x.rank || 0) - (y.rank || 0));
            const t = pool[pool.length - 1];
            if (!t) break;
            t.leagueId = small;
            t.berlinHome = small;
            this.log('info', `Berlin-Korrektur: ${t.name} → ${this.leagues[small].name} (neue Heimatstaffel)`);
            this.logMigration(t, big, small, 'berlin_fix');
        }
    },

    isGeoBlocked: function(name) { return this.GEO_BLOCKED.some(k => name.includes(k)); },

    dist2D: function(team, center) {
        const dlat = (team.lat || 0) - center.lat;
        const dlon = ((team.lon || 0) - center.lon) * 0.7;
        return Math.sqrt(dlat * dlat + dlon * dlon);
    },

    // ── Heimatstaffel: Standard ist BLEIBEN, korrigiert wird nur so viel wie nötig ───────────
    // Ersetzt die frühere Neuverteilung, die jede Saison die ganze Gruppe neu zusammenwarf und
    // damit keinen Begriff davon hatte, wo ein Verein hingehört (Inseln 4 → 28 über 12 Saisons).
    //
    // Sollgröße nach der Regel des Nutzers: bei m Vereinen und n Staffeln sind alle EXAKT m/n
    // groß; geht es nicht auf, tragen genau (m mod n) Staffeln einen mehr – und WELCHE das sind,
    // rotiert über die Saisons, damit nicht immer dieselbe den Rest schleppt.
    //
    // Zwei bewusste Vereinfachungen gegenüber dem Entwurf:
    //  * Gemessen wird gegen die ECHTEN Schwerpunkte der aktuellen Besetzung, nicht gegen
    //    LEAGUE_CENTERS. Die liegen teils >100 km daneben (Bayern Nordost 121 km) und waren
    //    genau die Ursache der Drift; so hängt die Balancierung nicht mehr an gepflegten Werten.
    //  * Ein dauerhafter Heimatwechsel braucht KEINEN Bilanzzähler je Staffelpaar. Er ist ohnehin
    //    nur erlaubt, wenn der Verein dem neuen Schwerpunkt näher liegt als seinem alten – die
    //    Grenze kann sich also nur dorthin bewegen, wo die Geografie es trägt, nicht beliebig.
    HEIMAT_FREMD_MAX: 3,   // so viele Fremdsaisons in Folge, dann zieht die Heimat nach

    _heimatBalance: function(ids) {
        const alle = [];
        ids.forEach(lid => Object.values(this.teams).forEach(t => { if (t.leagueId === lid) alle.push(t); }));
        if (!alle.length) return;
        const beweglich = t => t.lat && t.lon && t.lat !== 0 && t.lon !== 0;

        // Schwerpunkt einer Staffel aus ihrer JETZIGEN Besetzung
        const schwerpunkt = lid => {
            const a = alle.filter(t => t.leagueId === lid && beweglich(t));
            if (!a.length) return null;   // leere Staffel -> preis() liefert Infinity, nichts wird verschoben
            return { lat: a.reduce((s, t) => s + t.lat, 0) / a.length, lon: a.reduce((s, t) => s + t.lon, 0) / a.length };
        };
        // Heimat vergeben, wo sie fehlt. ZUERST die regions-Kette des Vereins fragen – sie ist
        // seine erklärte Heimat. Vorher erbte er einfach die Staffel, in der er gerade stand:
        // hatte ein Abstieg oder der Amateurpokal ihn falsch einsortiert, wurde dieser Zufall
        // dauerhaft und der Verein blieb für immer eine Insel (gemessen: 14 Vereine nach 40
        // Saisons, 1. FC Herzogenaurach 68 km vom Schwerpunkt statt 9 km).
        alle.forEach(t => {
            if (t.homeStaffel && ids.indexOf(t.homeStaffel) >= 0) return;
            const erklaert = this.resolveHomeLeagueId(t);
            t.homeStaffel = (erklaert && ids.indexOf(erklaert) >= 0) ? erklaert : t.leagueId;
        });

        // 1. Alle nach Hause – das ist der Normalfall, nicht die Ausnahme
        alle.forEach(t => { if (t.leagueId !== t.homeStaffel) t.leagueId = t.homeStaffel; });

        // 2. Sollgrößen: exakt m/n, Rest rotiert
        const m = alle.length, n = ids.length;
        const basis = Math.floor(m / n), rest = m % n;
        const versatz = ((this.currentSeasonOffset || 0) % n + n) % n;
        const soll = {};
        ids.forEach((lid, i) => { soll[lid] = basis + ((((i - versatz) % n + n) % n) < rest ? 1 : 0); });

        // 3. Ausgleich: so wenige Verschiebungen wie möglich, jeweils die billigste
        const zentren = {}; ids.forEach(lid => zentren[lid] = schwerpunkt(lid));
        const preis = (t, ziel, heim) => {
            const cz = zentren[ziel], ch = zentren[heim];
            if (!cz || !ch || !beweglich(t)) return Infinity;   // ohne Koordinate nicht verschieben
            return this.dist2D(t, cz) - this.dist2D(t, ch);
        };
        let schutz = 0;
        while (schutz++ < 200) {
            const groesse = {}; ids.forEach(l => groesse[l] = 0);
            alle.forEach(t => groesse[t.leagueId]++);
            const zuviel = ids.filter(l => groesse[l] > soll[l]).sort((a, b) => (groesse[b] - soll[b]) - (groesse[a] - soll[a]));
            const zuwenig = ids.filter(l => groesse[l] < soll[l]).sort((a, b) => (soll[a] - groesse[a]) - (soll[b] - groesse[b]));
            if (!zuviel.length || !zuwenig.length) break;
            const von = zuviel[0], nach = zuwenig[0];
            const kand = alle.filter(t => t.leagueId === von && beweglich(t));
            if (!kand.length) break;
            // Rangfolge – nie der Zufall: geografischer Preis, dann Reserve vor Elternverein,
            // dann wer kürzer daheim ist, zuletzt die ID (damit zwei Läufe dasselbe liefern).
            kand.sort((a, b) =>
                (preis(a, nach, von) - preis(b, nach, von)) ||
                ((b.isReserve ? 1 : 0) - (a.isReserve ? 1 : 0)) ||
                ((a.heimatSeit || 0) - (b.heimatSeit || 0)) ||
                (a.id < b.id ? -1 : 1));
            const t = kand[0];
            if (this.leagueStats[von]) this.leagueStats[von].moveOut++;
            if (this.leagueStats[nach]) this.leagueStats[nach].moveIn++;
            t.leagueId = nach;
            this.logMigration(t, von, nach, 'heimat_leihe');
        }

        // 4. Zähler fortschreiben und Heimat nachziehen, wo jemand dauerhaft fremd ist
        alle.forEach(t => {
            if (t.leagueId === t.homeStaffel) { t.fremdSeit = 0; t.heimatSeit = (t.heimatSeit || 0) + 1; return; }
            t.fremdSeit = (t.fremdSeit || 0) + 1;
            if (t.fremdSeit < this.HEIMAT_FREMD_MAX) return;
            // KEINE zusätzliche geografische Bedingung: der Ausgleich verleiht ohnehin immer den
            // billigsten Verein, dessen Preis ist also klein, aber positiv. Verlangte man hier
            // preis < 0, könnte der Wechsel nie eintreten – gemessen: 0 Wechsel in 40 Saisons,
            // während Lindenthal 8 Saisons in Folge fremd spielte. Die wiederholte Verschiebung
            // IST der Beleg, dass die alte Heimat nicht mehr passt. Gegen Grenzdrift wirkt statt
            // dessen, dass immer der geografisch billigste verliehen wird – die Grenze bewegt
            // sich damit nur dorthin, wo sie ohnehin am wenigsten kostet.
            this.log('info', `Heimatwechsel: ${t.name} → ${this.leagues[t.leagueId].name} (${t.fremdSeit} Saisons fremd)`);
            t.homeStaffel = t.leagueId;
            t.fremdSeit = 0; t.heimatSeit = 0;
        });
    },

    balanceGroup: function(ids, axis) {
        if (axis === 'geo') return this._heimatBalance(ids);
        // Einfache lat/lon-Sortierung (axis: 'lat' oder undefined)
        let fixedTeams = [], mobileTeams = [];
        ids.forEach(lid => {
            Object.values(this.teams).filter(t => t.leagueId === lid).forEach(t => {
                if (t.lat && t.lat !== 0) mobileTeams.push(t); else fixedTeams.push(t);
            });
        });
        if (mobileTeams.length === 0) return;
        mobileTeams.sort((a, b) => b.lat - a.lat);
        const totalTeamsLat = mobileTeams.length + fixedTeams.length;
        const fallbackPerLeague = Math.ceil(totalTeamsLat / ids.length);
        const GROWTH_CAP = 3;  // sanfte Korrektur: max. +3/Saison Richtung Ziel
        const oldSizeLat = {}; ids.forEach(lid => { oldSizeLat[lid] = [...mobileTeams, ...fixedTeams].filter(t => t.leagueId === lid).length; });
        let mobileIdx = 0;
        ids.forEach(lid => {
            const tgtRaw = (this.leagues[lid] && this.leagues[lid].target) || fallbackPerLeague;
            const tgt = Math.min(tgtRaw, oldSizeLat[lid] + GROWTH_CAP);
            const slots = Math.max(0, tgt - fixedTeams.filter(t => t.leagueId === lid).length);
            mobileTeams.slice(mobileIdx, mobileIdx + slots).forEach(t => {
                if (t.leagueId !== lid) {
                    if (this.leagueStats[t.leagueId]) this.leagueStats[t.leagueId].moveOut++;
                    if (this.leagueStats[lid]) this.leagueStats[lid].moveIn++;
                    t.leagueId = lid;
                    this.logMigration(t, lid, lid, 'geo');
                }
            });
            mobileIdx += slots;
        });
    },

    resolveHomeLeagueId: function(team) {
        const regions = team.regions || [];
        for (let i = regions.length - 1; i >= 0; i--) {
            const id = this.REGION_TO_LEAGUE_ID[regions[i]];
            if (id && this.leagues[id]) return id;
        }
        return null;
    },

    // Tiefste Liga (Boden) der Heimat-Pyramide eines Teams: homeLeagueId via regions, dann DOWN_MAP
    // abwärts bis kein Kind mehr. Nord/Ost-Landesligen sind Bodenligen (Level 7/8 nur Südwest/Berlin),
    // ihr Boden = Level 6. Dient als Sperre gegen Cross-Region-Abstieg in fremde Tiefpyramiden.
    homeFloorLeagueId: function(team) {
        let id = this.resolveHomeLeagueId(team);
        if (!id || !this.leagues[id]) return null;
        let guard = 0;
        while (this.DOWN_MAP[id] && this.DOWN_MAP[id].length && guard++ < 12) id = this.DOWN_MAP[id][0];
        return id;
    },

    findTarget: function(team, targetLevel, currentLeagueId) {
        const candidates = Object.values(this.leagues).filter(l => l.level === targetLevel);
        if (candidates.length === 0) return null;
        if (candidates.length === 1) return candidates[0];

        // 1. ID-ROUTING (Prio A): homeLeagueId via REGION_TO_LEAGUE_ID + UP_MAP
        const homeId = this.resolveHomeLeagueId(team);
        if (homeId && this.leagues[homeId]) {
            const homeLevel = this.leagues[homeId].level;
            if (homeLevel === targetLevel) return this.leagues[homeId];
            if (homeLevel > targetLevel) {
                let id = homeId;
                while (id && this.leagues[id] && this.leagues[id].level > targetLevel) {
                    id = this.UP_MAP[id];
                }
                if (id && this.leagues[id] && this.leagues[id].level === targetLevel) return this.leagues[id];
            }
        }

        // 2. ROUTER FALLBACK (Prio B)
        let searchRegions = [...(team.regions || [])];
        if (searchRegions.length === 0 && team.leagueId && this.leagues[team.leagueId]) {
            searchRegions = this.getKeywords(this.leagues[team.leagueId].name);
        }
        // Ein Verein ohne name/regions (aus game_data entfernt, s. loadGame) stand hier als
        // [undefined] in searchRegions und riss über r.includes(k) den GESAMTEN calcZones-Lauf
        // mit – und damit jede Ligatabelle. Name ersatzweise aus der id, Rest auf Strings filtern.
        const tName = typeof team.name === 'string' ? team.name : (team.id || '');
        searchRegions.push(tName);
        searchRegions = searchRegions.filter(r => typeof r === 'string');

        for (const route of this.ROUTING_RULES) {
            const matchesKey = searchRegions.some(r => route.keys.some(k => r.includes(k)));
            const matchesNot = route.not ? !searchRegions.some(r => route.not.some(n => r.includes(n))) : true;
            if (matchesKey && matchesNot) {
                const target = candidates.find(c => c.name.includes(route.target));
                if (target) return target;
            }
        }

        // 3. REGION MAPPING (Prio C)
        for (const candidate of candidates) {
            for (const [mapKey, mapValues] of Object.entries(this.REGION_MAPPING)) {
                if (candidate.name.includes(mapKey)) {
                    if (searchRegions.some(r => mapValues.some(v => r.includes(v)))) return candidate;
                }
            }
        }

        // 4. NAME MATCH (Prio D)
        const matches = candidates.filter(l => searchRegions.some(r => {
            if (r.includes("Rheinland-Pfalz") && l.name.includes("Rheinland")) return l.name.includes("Rheinland-Pfalz");
            return l.name.includes(r);
        }));
        if (matches.length > 0) {
            if (matches.length === 1) return matches[0];
            // Berlin-Staffeln: keine Regionalisierung → PERSISTENTE Heimatstaffel. Einmal vergeben (in die
            // dünnere), danach klebt sie (saubere ewige Tabelle); nur die seltene rebalanceBerlin-Korrektur
            // ändert sie. Bestandsvereine kehren nach Auf/Abstieg immer in ihre Heimatstaffel zurück.
            if (matches.length === 2 && matches.every(l => l.name.includes("Landesliga Berlin"))) {
                if (team.berlinHome && this.leagues[team.berlinHome] && matches.some(m => m.id === team.berlinHome)) {
                    return this.leagues[team.berlinHome];
                }
                const target = matches.sort((a, b) =>
                    Object.values(this.teams).filter(t => t.leagueId === a.id).length -
                    Object.values(this.teams).filter(t => t.leagueId === b.id).length
                )[0];
                team.berlinHome = target.id;
                return target;
            }
            // Nur Regionalliga Südwest als Südwest-Priorität – Verbandsliga Südwest soll nicht zu breit matchen
            if (searchRegions.some(r => r.includes("Südwest"))) {
                const rlMatch = matches.find(l => l.name === "Regionalliga Südwest");
                if (rlMatch) return rlMatch;
                const specific = matches.find(l => !l.name.includes("Südwest"));
                if (specific) return specific;
            }
            const hash = tName.split("").reduce((a,b)=>a+b.charCodeAt(0),0);
            return matches[hash % matches.length];
        }

        const currentLiga = this.leagues[team.leagueId];
        if (currentLiga) {
            const keywords = this.getKeywords(currentLiga.name);
            const nameMatch = candidates.find(l => keywords.some(k => l.name.includes(k)));
            if (nameMatch) return nameMatch;
        }
        return candidates.sort((a,b) =>
            Object.values(this.teams).filter(t=>t.leagueId===a.id).length -
            Object.values(this.teams).filter(t=>t.leagueId===b.id).length
        )[0] || null;
    },

    logMigration: function(t, f_id, to_id, typ) { 
        if (f_id === to_id) return; 
        const fromName = this.leagues[f_id] ? this.leagues[f_id].name : "Unbekannt";
        const toName   = this.leagues[to_id] ? this.leagues[to_id].name : "Unbekannt";
        this.migrations.push({ team: t.name, id: t.id, from: fromName, to: toName, toId: to_id, type: typ, sortId: f_id });
    },

    // Save-Format: 'LZ1'+UTF16-komprimiert. Fallback Klartext, falls LZString fehlt.
    _encodeSave: function(jsonStr) {
        try { if (typeof LZString !== 'undefined') return 'LZ1' + LZString.compressToUTF16(jsonStr); } catch(e) {}
        return jsonStr;
    },
    // Erkennt Format: 'LZ1'→dekomprimieren, sonst Klartext (alte Saves/Backups laden weiter).
    _decodeSave: function(stored) {
        if (stored == null) return stored;
        if (stored.slice(0, 3) === 'LZ1') {
            try { return LZString.decompressFromUTF16(stored.slice(3)); } catch(e) { return null; }
        }
        return stored;
    },

    // Gepufferte volle Chronik (_idbPending) nach IndexedDB spülen – LEICHT (nur IDB, kein localStorage/
    // Komprimieren). Während Multi-Sim periodisch aufrufbar, um RAM zu deckeln, ohne das Tempo zu kosten.
    _flushIdbPending: function() {
        if (this._idbPending && (this._idbPending.champs.length || this._idbPending.rels.length || (this._idbPending.tables && this._idbPending.tables.length)) && typeof IDBStore !== 'undefined') {
            const pend = this._idbPending; this._idbPending = { champs: [], rels: [], tables: [] };
            // resolve-sicher: bei blockiertem/​fehlendem IndexedDB no-op → gekappte localStorage-Chronik bleibt Fallback
            IDBStore.appendSeason(pend.champs, pend.rels);
            if (pend.tables && pend.tables.length) IDBStore.putSeasonTables(pend.tables);
        }
    },

    // Zweiter Tab hat die Sperre (App.initTabLock): NICHTS schreiben. localStorage UND IndexedDB
    // sind fuer alle Tabs derselben Seite dieselben - zwei laufende Engines wuerden sich sonst
    // gegenseitig ueberschreiben, und keine Spielstand-Kennung koennte das verhindern, weil beide
    // Tabs denselben Stand geladen haben.
    writeBlocked: false,

    saveGame: function() {
        if (this.writeBlocked) return;
        // Volle (ungekappte) Chronik async nach IndexedDB anhängen – unabhängig vom localStorage-Save,
        // daher VOR den frühen returns. Fehlt IDB, bleibt die gekappte localStorage-Chronik Fallback.
        this._flushIdbPending();
        const leanTeams = {};
        // Nur dynamische Felder speichern – sanitizeTeam lädt statische (name/lat/lon/regions/...) aus GAME_DATA
        // Ligalose müssen mitgespeichert werden: ihre individuelle Stärke ist die Währung des Amateurpokals
        // (frisch Abgestiegene bleiben Favoriten) und ginge sonst bei jedem Reload auf die Basis zurück.
        Object.values(this.teams).forEach(t => {
            if (t.leagueId) leanTeams[t.id] = { id: t.id, leagueId: t.leagueId, rank: t.rank || 0, stats: t.stats, strength: t.strength, prevSeasonBadge: t.prevSeasonBadge || null, startRank: t.startRank };
            else leanTeams[t.id] = { id: t.id, leagueId: null, strength: t.strength, prevSeasonBadge: t.prevSeasonBadge || null };
            // berlinHome ist die PERSISTENTE Heimatstaffel der Berlin-Staffeln (findTarget/rebalanceBerlin).
            // Sie steht nicht in GAME_DATA, sondern entsteht erst im Spiel – ohne sie hier vergisst der
            // Verein bei jedem Neuladen, wo er hingehört, und findTarget vergibt sie beim nächsten
            // Auf-/Abstieg neu an die dünnere Staffel. Genau das, was sie verhindern soll.
            // sanitizeTeam überschreibt sie nicht: es kopiert nur Felder, die es in GAME_DATA gibt.
            if (t.berlinHome) leanTeams[t.id].berlinHome = t.berlinHome;
            // Heimatstaffel + Zähler entstehen ebenfalls erst im Spiel (_heimatBalance) und stehen
            // nicht in GAME_DATA – ohne sie hier verlöre jeder Verein beim Neuladen seine Heimat.
            if (t.homeStaffel) {
                leanTeams[t.id].homeStaffel = t.homeStaffel;
                if (t.fremdSeit)  leanTeams[t.id].fremdSeit  = t.fremdSeit;
                if (t.heimatSeit) leanTeams[t.id].heimatSeit = t.heimatSeit;
            }
        });
        // leanMdH (laufende Saison, Top-4) – ändert sich pro Spieltag, bleibt im schlanken Save
        const leanMdH = this.matchdayHistory.map(mh => ({ md: mh.md, r: mh.results.filter(x => parseInt((x.leagueId||'99').split('-')[0]) <= 4).map(x => ({ l: x.leagueId, h: x.home, a: x.away, s1: x.score1, s2: x.score2 })) })).filter(mh => mh.r.length);
        // SCHLANKER Spieltag-Save: NUR die laufende Saison (Teams, Pokal, dh, actionState). OHNE history[] UND
        // OHNE Archiv – beide ändern sich nur beim SAISONWECHSEL → eigener Key ba_arch_v66, nur bei _archiveDirty.
        // → Spieltag-Save bleibt klein & konstant schnell, egal wie viele Saisons simuliert wurden (behebt "Woche"-Lag).
        const leanStr = this._encodeSave(JSON.stringify({sid: this.saveId, lg: this.idbLegacy ? 1 : 0, y: this.currentSeasonOffset, s:this.currentSeason, m:this.currentMatchday, t:leanTeams, r:this.seasonResults, p:this.pokal, ap:this.amateurpokal, dh:leanMdH, f:this.friendlies, as:this.actionState, sd:this.seasonSeed}));
        try { localStorage.setItem('ba_save_v66', leanStr); }
        catch(e) { try { localStorage.removeItem('ba_save_v66'); localStorage.setItem('ba_save_v66', leanStr); } catch(e2) { console.error("Save limit (Spielstand)"); } }
        if (this._archiveDirty) this._saveArchive();
    },

    // Archiv-Form des Amateurpokals: 260 Partien je Saison → kompakte Arrays statt benannter Felder (gleiche
    // Technik wie die Kompakt-Teams [leagueId,rank,w,d,l,gf,ga]). n.V./Elfmeterschießen gehen dabei verloren –
    // Sieger, Aufsteiger und die ewige Tabelle bleiben exakt rekonstruierbar.
    _leanAmateur: function(A) {
        return {
            w: A.winner || null,
            f: A.field || 0,
            p: A.promoted || [],
            r: (A.rounds || []).map(rd => [rd.played ? 1 : 0, (rd.matches || []).map(m => [m.hId, m.aId, m.hGoals, m.aGoals, m.winnerId])])
        };
    },
    _fatAmateur: function(L) {
        if (!L || !L.r) return L || null;            // schon im vollen Format
        return {
            winner: L.w || null, field: L.f || 0, promoted: L.p || [], byes: [], hasNewResults: false,
            rounds: L.r.map((rd, i) => ({
                name:     (this.AMATEUR_ROUNDS[i] || {}).name || `Runde ${i + 1}`,
                matchday: (this.AMATEUR_ROUNDS[i] || {}).matchday || 0,
                played:   !!rd[0],
                matches:  (rd[1] || []).map(m => ({ hId: m[0], aId: m[1], hGoals: m[2], aGoals: m[3], winnerId: m[4], nv: false, penalties: false }))
            }))
        };
    },

    // history[] (50 Saisons) + Archiv in eigenen Key ba_arch_v66 – nur bei Änderung (Saisonwechsel/Seed).
    // Quota-sicher: Chronik (champions/relegation) ältest-zuerst kürzen, Summen (ewige/relStats) bleiben.
    _saveArchive: function() {
        const leanMdHof = mh => (mh || []).map(x => ({ md: x.md, r: x.results.filter(g => parseInt((g.leagueId||'99').split('-')[0]) <= 4).map(g => ({ l: g.leagueId, h: g.home, a: g.away, s1: g.score1, s2: g.score2 })) })).filter(x => x.r.length);
        const recent = this.history.slice(-50);
        const leanHistory = recent.map((h, i, arr) => {
            const e = {
                year: h.year,
                teams: Object.fromEntries(Object.entries(h.teams).map(([id, t]) => [id, [
                    t.leagueId, t.rank||1, t.stats.w||0, t.stats.d||0, t.stats.l||0, t.stats.gf||0, t.stats.ga||0
                ]])),
                pokal: h.pokal || null,
                amateurpokal: h.amateurpokal ? this._leanAmateur(h.amateurpokal) : null
            };
            // Spieltage (schlank, Level ≤4) nur für die letzten 5 Saisons mitspeichern – ältere: nur Tabelle+Pokal
            if (i >= arr.length - 5 && h.matchdayHistory && h.matchdayHistory.length) {
                const m = leanMdHof(h.matchdayHistory);
                if (m.length) e.mdH = m;
            }
            return e;
        });
        // Komprimierung im Web Worker (off-thread) → KEIN Hauptthread-Freeze beim Saisonwechsel.
        // JSON-Snapshot synchron (~130ms), Komprimieren (~2s) im Worker; Hauptthread schreibt nur das Ergebnis.
        // Fallback (kein Worker) → _compressAsync komprimiert synchron via _encodeSave.
        const json = JSON.stringify({ h: leanHistory, ar: this.archive || {} });
        this._archiveDirty = false; // optimistisch; bei endgültigem Fehler unten wieder true
        const writeLZ = (lz) => {
            try { localStorage.setItem('ba_arch_v66', lz); return true; } catch(e) { return false; }
        };
        const compress = (typeof this._compressAsync === 'function') ? this._compressAsync(json) : Promise.resolve(this._encodeSave(json));
        compress.then(lz => {
            if (writeLZ(lz)) return;
            // Quota: Chronik (champions/relegation) ältest-zuerst kürzen + synchron neu schreiben (selten)
            const buildSync = () => this._encodeSave(JSON.stringify({ h: leanHistory, ar: this.archive || {} }));
            for (let i = 0; i < 15 && this._trimOldestArchive(); i++) { if (writeLZ(buildSync())) return; }
            if (this.archive) { this.archive.champions = {}; this.archive.relegation = []; }
            if (!writeLZ(buildSync())) { this._archiveDirty = true; console.error("Save limit – Archiv konnte nicht gespeichert werden"); }
        });
    },

    // Kürzt die ältesten Archiv-Chronik-Einträge (champions je Liga + relegation) um ~15 % je Aufruf.
    // Summen (ewige/relStats) bleiben unberührt. Gibt true zurück, solange noch gekürzt werden konnte.
    _trimOldestArchive: function() {
        const A = this.archive;
        if (!A) return false;
        let trimmed = false;
        if (Array.isArray(A.relegation) && A.relegation.length > 0) {
            A.relegation.splice(0, Math.max(1, Math.floor(A.relegation.length * 0.15)));
            trimmed = true;
        }
        if (A.champions) {
            for (const lid in A.champions) {
                const arr = A.champions[lid];
                if (arr && arr.length > 0) { arr.splice(0, Math.max(1, Math.floor(arr.length * 0.15))); trimmed = true; }
            }
        }
        return trimmed;
    },
    
    sanitizeTeam: function(t, ref) {
        if (!ref) return;
        const KEEP = new Set(['leagueId', 'id']);
        Object.keys(ref).forEach(f => { if (!KEEP.has(f)) t[f] = ref[f]; });
    },

    loadGame: function() {
        const d = localStorage.getItem('ba_save_v66');
        if(!d) return false;
        try {
            const s = JSON.parse(this._decodeSave(d));
            // Kennung uebernehmen. Ein Save ohne sid ist von vor v0.8.131 - er bekommt eine frische
            // Kennung und beansprucht dabei EINMALIG die vorhandenen Zeilen ohne Kennung (idbLegacy),
            // denn es gab bis dahin nur einen Spielstand. Ab dem naechsten Speichern steht beides drin.
            this.saveId = s.sid || this._newSaveId();
            this.idbLegacy = s.sid ? !!s.lg : true;
            this._applyIdbScope();
            this.currentSeasonOffset = s.y || 0; this.currentMatchday = s.m || 0; this.teams = s.t; this.seasonResults = s.r || []; this.pokal = s.p || null; this.amateurpokal = s.ap || null; this.friendlies = s.f || [];
            // history[] + Archiv aus eigenem Key ba_arch_v66 ({h, ar}). Migration: Altsave hatte h/ar im Haupt-Save
            // → dann _archiveDirty → wandert beim nächsten Speichern in ba_arch_v66. Backfill erst NACH leagues-Aufbau.
            this._archiveDirty = false;
            let arc = null;
            const ad = localStorage.getItem('ba_arch_v66');
            if (ad != null) { try { arc = JSON.parse(this._decodeSave(ad)) || null; } catch(eA) { arc = null; } }
            if (arc) { this.history = arc.h || []; this.archive = arc.ar || null; }
            else { // Migration aus altem Single-Key-Format (h/ar lagen im Haupt-Save)
                this.history = s.h || [];
                this.archive = s.ar || null;
                if (s.h || s.ar) this._archiveDirty = true;
            }
            this.seasonSeed = s.sd != null ? s.sd : null; // fester Spielplan-Seed (Altsave: null → einmal neu erzeugt)
            // Transiente Saison-/Transitionsdaten zurücksetzen (für Import ohne Reload sauber)
            this.migrations = []; this.relegationResults = []; this.matchdayResults = []; this.leagueStats = {};
            // Action-Modus: laufenden Spieltag fortsetzen; matchdayResults aus den bereits gespielten Tagen rekonstruieren
            this.actionState = s.as || null;
            this.actionLive = null;
            if (this.actionState && this.actionState.days) {
                this.matchdayResults = [].concat(...this.actionState.days.filter(d => d.played).map(d => d.results || []));
                const hz = this.actionState.days.find(d => d.phase === 'HZ'); // depth 3: laufende Halbzeit wiederherstellen
                if (hz) this.actionLive = hz.pokalRound != null
                    ? { pokal:true, round: hz.pokalRound, stage: hz.stage, live: hz.plive }
                    : (hz.live || null);
            }
            const fromLean = arr => (arr||[]).map(mh => ({ md: mh.md, results: mh.r.map(x => ({ leagueId: x.l, home: x.h, away: x.a, score1: x.s1, score2: x.s2 })) }));
            this.matchdayHistory = fromLean(s.dh);
            // BACKFILL Altsave (vor v0.8.71): ligalose Vereine waren gar nicht Teil des Saves, weil sie nicht
            // im State existierten. Fehlende GAME_DATA-Vereine nachziehen – ligalos bleibt ligalos, ein sonst
            // fehlender Ligaverein landet zurück in seiner Startliga (wie die Orphan-Auto-Heilung).
            Object.entries(GAME_DATA.teams).forEach(([id, ref]) => {
                if (this.teams[id]) return;
                this.teams[id] = { id: id, leagueId: ref.leagueId || null };
            });
            // Gegenstück zum Backfill: Vereine, die es in GAME_DATA nicht mehr gibt, aus dem Save
            // werfen. sanitizeTeam steigt bei fehlendem ref sofort aus – der Verein behielte nur,
            // was im Save stand (leagueId, rank, stats), also KEINEN Namen und KEINE regions.
            // Anlass war das Pinneberg-Dublett (ligalos), dann die Rot-Weiss-Darmstadt-Dublette
            // (v0.8.120, MIT Liga 5-3): dort baut findTarget searchRegions = [...regions, name]
            // zu [undefined] und wirft – und weil calcZones die ganze Pyramide durchrechnet, riss
            // dieser eine Verein JEDE Ligatabelle und den Saisonwechsel mit.
            // Beide Fälle waren Dublettenauflösungen, kein Datenverlust – aber nicht mehr still:
            // ein Verein mit Liga wird geloggt, damit die Streichung im Debug-Log nachlesbar ist.
            Object.keys(this.teams).forEach(id => {
                if (GAME_DATA.teams[id]) return;
                const ghostLid = this.teams[id].leagueId;
                delete this.teams[id];
                if (ghostLid) this.log('warn', `Verein ${id} steht nicht mehr in game_data (war ${ghostLid}) – aus dem Spielstand entfernt`);
            });
            Object.values(this.teams).forEach(t => this.sanitizeTeam(t, GAME_DATA.teams[t.id]));
            this.leagues = JSON.parse(JSON.stringify(GAME_DATA.leagues));
            Object.values(this.teams).forEach(t => this._seedStrength(t));   // Nachzügler aus dem Backfill
            this.history.forEach(h => {
                Object.entries(h.teams).forEach(([id, tv]) => {
                    let t;
                    if (Array.isArray(tv)) {
                        // Kompaktformat: [leagueId, rank, w, d, l, gf, ga]
                        t = { leagueId: tv[0], rank: tv[1], stats: { p: tv[2]+tv[3]+tv[4], w: tv[2], d: tv[3], l: tv[4], gf: tv[5], ga: tv[6], pts: tv[2]*3+tv[3], awayGf: 0 } };
                        h.teams[id] = t;
                    } else { t = tv; }
                    t.id = id;
                    t.prevSeasonBadge = t.psb || null; delete t.psb;
                    const ref = GAME_DATA.teams[id];
                    if (ref) { t.name = ref.name; t.thumb = ref.thumb; }
                    if (t.strength == null && t.leagueId && this.leagues[t.leagueId])
                        t.strength = Math.min(99, Math.round(109 - (this.leagues[t.leagueId].level * 10)));
                });
                if (h.mdH && !h.matchdayHistory) h.matchdayHistory = fromLean(h.mdH);
                if (h.amateurpokal) h.amateurpokal = this._fatAmateur(h.amateurpokal);
            });
            // Altsave ohne Archiv → einmalig aus (rehydrierter) history seeden (leagues stehen jetzt)
            if (!this.archive) { this.archive = this._rebuildArchiveFromHistory(); this._archiveDirty = true; }
            if (this._capArchiveChronik()) this._archiveDirty = true; // Riesen-Chronik begrenzen → ggf. neu schreiben
            this.loadVerbandspokalPlan();
            return true;
        } catch(e) { return false; }
    }
};