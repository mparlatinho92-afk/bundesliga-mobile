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
    archive: null, // Dauerhaftes Langzeit-Archiv {ewige, champions, relegation} – nie getrimmt (Gegenstück zum 50-Saison-Cap von history)

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
    // axis: "geo" = Zentroid-basierte 2D-Zuweisung via LEAGUE_CENTERS
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

    // Geografische Schwerpunkte der Sibling-Ligen für axis:'geo'-Balancierung
    LEAGUE_CENTERS: {
        "5-8":  { lat: 52.8, lon: 13.1 },  "5-9":  { lat: 51.0, lon: 12.0 },
        "5-13": { lat: 49.5, lon: 11.0 }, "5-14": { lat: 48.3, lon: 11.5 },
        "6-10": { lat: 54.5, lon: 9.2 },  "6-11": { lat: 54.1, lon: 10.3 },
        "6-12": { lat: 53.65, lon: 9.9 }, "6-13": { lat: 53.5, lon: 10.15 },
        "6-25": { lat: 51.7, lon: 8.1 },  "6-26": { lat: 51.1, lon: 7.9 },
        "6-27": { lat: 51.2, lon: 6.7 },  "6-28": { lat: 51.6, lon: 6.6 },
        "6-29": { lat: 50.7, lon: 7.1 },  "6-30": { lat: 50.7, lon: 6.5 },
        "6-31": { lat: 49.5, lon: 10.6 }, "6-32": { lat: 49.7, lon: 12.8 },
        "6-33": { lat: 48.7, lon: 11.4 }, "6-34": { lat: 47.9, lon: 10.8 }, "6-35": { lat: 47.9, lon: 12.3 },
        "7-3":  { lat: 50.1, lon: 6.6 },  "7-4":  { lat: 50.3, lon: 7.0 },  "7-5":  { lat: 50.6, lon: 7.5 },
        "7-6":  { lat: 49.5, lon: 7.0 },  "7-7":  { lat: 49.2, lon: 6.8 },
        "7-8":  { lat: 52.52, lon: 13.4 },"7-9":  { lat: 52.52, lon: 13.4 }
    },

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
            this.generateSchedule(); // Spielplan deterministisch aus seasonSeed (Altsave: jetzt erzeugt)
            if (seedWasMissing) this.saveGame(); // Seed sofort festschreiben → Altsave reload-stabil
        }
        else {
            try {
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
                const activeTeams = {};
                Object.values(this.teams).forEach(t => { 
                    if (t.leagueId) {
                        if(GAME_DATA.teams[t.id]) t.thumb = GAME_DATA.teams[t.id].thumb;
                        activeTeams[t.id] = t; 
                    }
                });
                this.teams = activeTeams;
                this.calculateStrengths();
                this.generateDynamicTree(); 
                this.resetSeason();
                this.sortTables(); // Wichtig: Initiale Sortierung nach Stärke
            } catch (e) { console.error('Engine.init:', e); const el = document.getElementById('league-title'); if (el) el.innerText = 'Init-Fehler: ' + e.message; return false; }
        }
        this.generateDynamicTree();
        this.ensureSeasonFriendlies(); // Testspiele der aktuellen Saison sicherstellen (frisch + geladen)
        return true;
    },

    generateDynamicTree: function() {
        this.DOWN_MAP = JSON.parse(JSON.stringify(this.HARD_LINKS));
        this.UP_MAP = {};
        Object.keys(this.DOWN_MAP).forEach(p => this.DOWN_MAP[p].forEach(c => this.UP_MAP[c] = p));
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
            if (!t.leagueId || !this.leagues[t.leagueId]) orphans.push(t);
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
        this.saveGame();
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
        if (!ids || !ids.length) return null;
        let pool = ids.slice();
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
        while (pool.length > 1) {
            const next = [];
            for (let i = 0; i < pool.length; i += 2) {
                if (i + 1 >= pool.length) { next.push(pool[i]); continue; }   // Freilos bei ungerader Anzahl
                const h = this.teams[pool[i]], a = this.teams[pool[i + 1]];
                if (!h || !a) { next.push(h ? pool[i] : pool[i + 1]); continue; }
                const res = this.simulateKnockoutMatch(h, a);
                let w;
                if (res.score1 !== res.score2) w = res.score1 > res.score2 ? pool[i] : pool[i + 1];
                else w = Math.random() < (h.strength || 50) / ((h.strength || 50) + (a.strength || 50)) ? pool[i] : pool[i + 1];
                next.push(w);
            }
            pool = next;
        }
        return pool[0];
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

        // Verbandspokalsieger: je Landesverband ein simulierter Amateur-KO (Level >=4, nicht schon qualifiziert)
        const amateurs = Object.values(this.teams).filter(t => !t.isReserve && lvlOf(t) >= 4 && !pros.has(t.id));
        const groups = {};
        amateurs.forEach(t => { const vb = this._verbandOf(t); if (vb) (groups[vb] = groups[vb] || []).push(t.id); });
        const cupWinners = [];
        const vpVerband = {}; // teamId → Landesverband (für Teilnehmerfeld-Badge)
        const EXTRA = ['Bayern', 'Niedersachsen', 'Westfalen']; // größte Verbände → 2. Startplatz
        Object.keys(groups).forEach(vb => {
            const w1 = this._simulateVerbandCup(groups[vb]);
            if (w1) { cupWinners.push(w1); vpVerband[w1] = vb; }
            if (EXTRA.includes(vb)) { const w2 = this._simulateVerbandCup(groups[vb].filter(x => x !== w1)); if (w2) { cupWinners.push(w2); vpVerband[w2] = vb; } }
        });

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
        if (!this.fastMode) this.log('info', `Pokal ausgelost: ${r1.length} Erstrundenspiele, ${cupWinners.length} Verbandspokalsieger`);
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

    // Poisson-Sampler (Knuth), gedeckelt – realistische, fußballtypische Toranzahlen
    _poisson: function(lambda, cap) {
        const L = Math.exp(-lambda); let k = 0, p = 1;
        do { k++; p *= Math.random(); } while (p > L);
        return Math.min(k - 1, cap == null ? 6 : cap);
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
        // Tore via Poisson: erwartete Tore steigen moderat mit der Tagesform-Differenz (kein Basketball mehr).
        noise = noise || 8;
        const eff1 = (h.strength || 50) + 3 + (Math.random() * 2 * noise - noise);
        const eff2 = (a.strength || 50) + (Math.random() * 2 * noise - noise);
        const favH = eff1 >= eff2;
        const ad = Math.min(Math.abs(eff1 - eff2), 55);
        // Erwartete Tore skalieren mit dem Klassenunterschied: ebenbürtig ~1.4, großer Abstand bis ~4.7
        // → Kantersiege (6:0, 7:1) sind bei klarem Favoriten wahrscheinlich, bei Augenhöhe sehr selten.
        const lamHi = 1.4 + ad * 0.06;
        const lamLo = Math.max(0.15, 1.1 - ad * 0.022); // Außenseiter: ~1.1 bis fast 0
        const P = this._poisson.bind(this);
        let g1 = P(favH ? lamHi : lamLo, 9), g2 = P(favH ? lamLo : lamHi, 9);
        if (g1 !== g2) return { score1: g1, score2: g2, decided: 'reg', winner: g1 > g2 ? 'h' : 'a' };
        // 90 min Remis → Verlängerung (geringere Torerwartung)
        g1 += P((favH ? lamHi : lamLo) * 0.33, 3);
        g2 += P((favH ? lamLo : lamHi) * 0.33, 3);
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
        const favH = eff1 >= eff2;
        const ad = Math.min(Math.abs(eff1 - eff2), 55);
        const lamHi = 1.4 + ad * 0.06, lamLo = Math.max(0.15, 1.1 - ad * 0.022);
        const P = this._poisson.bind(this);
        const splitH = g => { let x = 0; for (let i = 0; i < g; i++) if (Math.random() < 0.45) x++; return x; };
        let g1 = P(favH ? lamHi : lamLo, 9), g2 = P(favH ? lamLo : lamHi, 9);
        const g1a = splitH(g1), g2a = splitH(g2);
        const parts = [{ label:'1. Halbzeit', h:g1a, a:g2a }, { label:'Endstand', h:g1, a:g2 }];
        if (g1 !== g2) return { parts, score1:g1, score2:g2, winner: g1>g2?'h':'a', decided:'reg' };
        parts[1].label = '90′';                                  // Remis nach 90 → Verlängerung
        const e1 = P((favH ? lamHi : lamLo) * 0.33, 3), e2 = P((favH ? lamLo : lamHi) * 0.33, 3);
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

    calculateStrengths: function() {
        Object.values(this.teams).forEach(t => {
            if (!t.leagueId || !this.leagues[t.leagueId]) { t.strength = 40; return; }
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

    simulateMatch: function(t1, t2) {
        const s1 = t1.strength || 50;
        const s2 = t2.strength || 50;
        const p1 = s1 + Math.random() * 40 - 20 + 3; // leichter Heimvorteil
        const p2 = s2 + Math.random() * 40 - 20;
        const margin = p1 - p2;
        if (Math.abs(margin) < 6) {
            const g = Math.random() < 0.45 ? 0 : Math.random() < 0.65 ? 1 : 2;
            return { score1: g, score2: g };
        }
        const homeWins = margin > 0;
        const abs = Math.abs(margin);
        // Torzahl des Siegers skaliert mit dem Leistungsvorsprung
        const maxWg = abs > 28 ? 4 : abs > 16 ? 3 : 2;
        const wg = Math.floor(Math.random() * maxWg) + 1;
        const lg = Math.floor(Math.random() * wg); // 0 bis wg-1
        return homeWins ? { score1: wg, score2: lg } : { score1: lg, score2: wg };
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

    // Read-only Two-Pass: berechnet hypothetische Zonen ohne teams zu mutieren
    calcZones: function() {
        const promoInfo = this.getPromotionInfo();
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
            else { up = 1; dn = this.DOWN_MAP[l.id] ? Math.min(3, this.DOWN_MAP[l.id].length) : 0; }

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
        Object.entries(this.teams).forEach(([id, t]) => { leanTeams[id] = { id, leagueId: t.leagueId, rank: t.rank, stats: { ...t.stats }, name: t.name, thumb: t.thumb || null }; });
        this.history.push({ year: this.getFormattedSeason(), teams: leanTeams, pokal: this.pokal ? JSON.parse(JSON.stringify(this.pokal)) : null, matchdayHistory: this.matchdayHistory.slice() });
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
            const t2 = this.getTeamByRank(l2.id, 3);
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
            const t2 = this.getTeamByRank(l3.id, 3);
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
                const t = this.getTeamByRank(l.id, 1);
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
                const t = this.getTeamByRank(l.id, 1);
                if (t) this.relegationResults.push({ match: l.name, result: '▲ Direktaufstieg', winner: t.name, winnerId: t.id, color: '#4CAF50' });
            }
        });

        const sortedLeagues = Object.values(this.leagues).sort((a,b) => a.level - b.level);
        let plannedMoves = []; 

        // 3. PHASE 1: PRE-FLIGHT (Alle Transfers planen & zählen)
        for (const l of sortedLeagues) {
            const teams = Object.values(this.teams).filter(t => t.leagueId === l.id).sort((a,b)=>a.rank-b.rank);
            let upSlots = 0, baseDownSlots = 0;

            if (l.level === 1) { 
                baseDownSlots = 2; 
                if(topReleResult === 'swap') plannedMoves.push({t:teams[15], type:'down_rele', oldId:l.id, fromLvl:1});
            }
            else if (l.level === 2) { 
                upSlots = 2; baseDownSlots = 2; 
                if(topReleResult === 'swap') plannedMoves.push({t:teams[2], type:'up_rele', oldId:l.id, fromLvl:2});
                if(thirdReleResult === 'swap') plannedMoves.push({t:teams[15], type:'down_rele', oldId:l.id, fromLvl:2});
            }
            else if (l.level === 3) {
                baseDownSlots = 4; upSlots = 2; 
                if(thirdReleResult === 'swap') plannedMoves.push({t:teams[2], type:'up_rele', oldId:l.id, fromLvl:3});
            }
            else if (l.level === 4) {
                const isDirect = promoInfo.direct.includes(l.name);
                const isWinner = (l.id === regioWinnerId);
                if (isDirect || isWinner) upSlots = 1; else upSlots = 0;
                baseDownSlots = Math.min(3, this.DOWN_MAP[l.id].length);
            }
            else { upSlots = 1; baseDownSlots = this.DOWN_MAP[l.id] ? Math.min(3, this.DOWN_MAP[l.id].length) : 0; }

            // Fixe Transfers
            for(let i=0; i<upSlots; i++) if(teams[i]) plannedMoves.push({t:teams[i], type:'up', oldId:l.id, fromLvl:l.level});
            for(let i=0; i<baseDownSlots; i++) {
                const team = teams[teams.length - 1 - i];
                if(team) plannedMoves.push({t:team, type:'down', oldId:l.id, fromLvl:l.level});
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

        // 5c. Vorsaison-Abzeichen setzen (vor resetSeason, damit rank noch stimmt)
        const _movedUp   = new Set(plannedMoves.filter(m => m.type.includes('up')).map(m => m.t.id));
        const _movedDown = new Set(plannedMoves.filter(m => m.type.includes('down')).map(m => m.t.id));
        const _pokalW    = this.pokal && this.pokal.winner;
        Object.values(this.teams).forEach(t => {
            const b = [];
            if      (_movedUp.has(t.id))   b.push('N');
            else if (_movedDown.has(t.id)) b.push('A');
            else if (relegSurvivors.has(t.id)) b.push('R');
            else if (t.rank === 1)         b.push('M');
            else if (t.rank === 2)         b.push('V');
            if (_pokalW && t.id === _pokalW) b.push('P');
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
            }
            // Aufstieg: neue Liga niedrigeres Level als die gerade gespielte
            const curLvl = (this.leagues[lid] || {}).level;
            const nt = this.teams[id];
            if (nt && curLvl) {
                const nLvl = (this.leagues[nt.leagueId] || {}).level;
                if (nLvl && nLvl < curLvl) e.promotions++;
            }
        });
        // Relegation pro Saison (mit Herkunfts-Liga der Teilnehmer, aus dem Saison-Snapshot)
        if (finalRelegation && finalRelegation.length) {
            const enriched = finalRelegation.map(r => ({
                ...r,
                lH: r.hId ? (teams[r.hId] && teams[r.hId].leagueId) || null : null,
                lA: r.aId ? (teams[r.aId] && teams[r.aId].leagueId) || null : null,
                lW: r.winnerId ? (teams[r.winnerId] && teams[r.winnerId].leagueId) || null : null
            }));
            A.relegation.push({ y: year, results: enriched });
            // Dauerhafte All-Time-Bilanz je Verein (nur echte Relegationsduelle mit Hin/Rück)
            const bump = (id, won) => {
                if (!id) return;
                const r = A.relStats[id] || (A.relStats[id] = { played: 0, won: 0, lost: 0 });
                r.played++; won ? r.won++ : r.lost++;
            };
            enriched.forEach(e => { if (e.hId && e.aId) { bump(e.hId, e.winnerId === e.hId); bump(e.aId, e.winnerId === e.aId); } });
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

    balanceGroup: function(ids, axis) {
        if (axis === 'geo') {
            // Zentroid-basierte Zuweisung: jedes Team zum nächsten Liga-Zentrum
            let allTeams = [];
            ids.forEach(lid => Object.values(this.teams).filter(t => t.leagueId === lid).forEach(t => allTeams.push(t)));
            const mobile = allTeams.filter(t => t.lat && t.lon && t.lat !== 0 && t.lon !== 0);
            const fixed  = allTeams.filter(t => !mobile.includes(t));
            if (mobile.length === 0) return;

            const totalTeams = allTeams.length;
            const GROWTH_CAP = 3;  // sanfte Korrektur: Liga wächst max. +3/Saison Richtung Ziel (kein 6→10-Sprung)
            const targets = {};
            ids.forEach(lid => {
                const raw = (this.leagues[lid] && this.leagues[lid].target) || Math.ceil(totalTeams / ids.length);
                const oldSize = allTeams.filter(t => t.leagueId === lid).length;
                targets[lid] = Math.min(raw, oldSize + GROWTH_CAP);  // nur Wachstum deckeln; Schrumpfen auf Ziel normal
            });
            const slots = {};
            ids.forEach(lid => { slots[lid] = Math.max(0, targets[lid] - fixed.filter(f => f.leagueId === lid).length); });

            // Sortiere nach Stärke der Präferenz (Teams mit klarer erster Wahl zuerst)
            mobile.sort((a, b) => {
                const da = Math.min(...ids.map(lid => this.LEAGUE_CENTERS[lid] ? this.dist2D(a, this.LEAGUE_CENTERS[lid]) : Infinity));
                const db = Math.min(...ids.map(lid => this.LEAGUE_CENTERS[lid] ? this.dist2D(b, this.LEAGUE_CENTERS[lid]) : Infinity));
                return da - db;
            });

            const assigned = {};
            ids.forEach(lid => { assigned[lid] = 0; });

            mobile.forEach(t => {
                const ranked = [...ids].sort((a, b) => {
                    const ca = this.LEAGUE_CENTERS[a], cb = this.LEAGUE_CENTERS[b];
                    const da = ca ? this.dist2D(t, ca) : Infinity;
                    const db = cb ? this.dist2D(t, cb) : Infinity;
                    return da - db;
                });
                for (const lid of ranked) {
                    if (assigned[lid] < slots[lid]) {
                        assigned[lid]++;
                        if (t.leagueId !== lid) {
                            if (this.leagueStats[t.leagueId]) this.leagueStats[t.leagueId].moveOut++;
                            if (this.leagueStats[lid]) this.leagueStats[lid].moveIn++;
                            t.leagueId = lid;
                            this.logMigration(t, lid, lid, 'geo');
                        }
                        break;
                    }
                }
            });

            // Boden-Klammer: keine Geschwister-Staffel unter 8 ausdünnen. Dünne Regionen dürfen klein
            // sein (Geo-Realität), aber nie Rumpf <8 → notfalls das dem Defizit-Zentrum nächste mobile
            // Team vom vollsten Nachbarn nachziehen.
            const FLOOR = 8;
            const cnt = lid => allTeams.filter(t => t.leagueId === lid).length;
            let guard = 0;
            while (guard++ < 60) {
                const deficient = ids.filter(lid => cnt(lid) < FLOOR);
                if (!deficient.length) break;
                const lid = deficient[0];
                const donor = ids.filter(d => d !== lid && cnt(d) > FLOOR).sort((a, b) => cnt(b) - cnt(a))[0];
                if (!donor) break; // Gruppe insgesamt zu klein – nicht heilbar
                const center = this.LEAGUE_CENTERS[lid];
                const pool = mobile.filter(t => t.leagueId === donor);
                if (!pool.length) break;
                pool.sort((a, b) => (center ? this.dist2D(a, center) : 0) - (center ? this.dist2D(b, center) : 0));
                const t = pool[0];
                if (this.leagueStats[donor]) this.leagueStats[donor].moveOut++;
                if (this.leagueStats[lid]) this.leagueStats[lid].moveIn++;
                t.leagueId = lid;
                this.logMigration(t, lid, lid, 'floor');
            }
            return;
        }

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
        searchRegions.push(team.name);

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
            const hash = team.name.split("").reduce((a,b)=>a+b.charCodeAt(0),0);
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

    saveGame: function() {
        const leanTeams = {};
        // Nur dynamische Felder speichern – sanitizeTeam lädt statische (name/lat/lon/regions/...) aus GAME_DATA
        Object.values(this.teams).forEach(t => { if(t.leagueId) leanTeams[t.id] = { id: t.id, leagueId: t.leagueId, rank: t.rank || 0, stats: t.stats, strength: t.strength, prevSeasonBadge: t.prevSeasonBadge || null, startRank: t.startRank }; });
        // name wird beim Laden aus GAME_DATA wiederhergestellt → nicht speichern
        // Teams als 7-Element-Array: [leagueId, rank, w, d, l, gf, ga] – ~40 Bytes statt ~150 pro Team
        const leanMdHof = mh => (mh || []).map(x => ({ md: x.md, r: x.results.filter(g => parseInt((g.leagueId||'99').split('-')[0]) <= 4).map(g => ({ l: g.leagueId, h: g.home, a: g.away, s1: g.score1, s2: g.score2 })) })).filter(x => x.r.length);
        const recent = this.history.slice(-50);
        const leanHistory = recent.map((h, i, arr) => {
            const e = {
                year: h.year,
                teams: Object.fromEntries(Object.entries(h.teams).map(([id, t]) => [id, [
                    t.leagueId, t.rank||1, t.stats.w||0, t.stats.d||0, t.stats.l||0, t.stats.gf||0, t.stats.ga||0
                ]])),
                pokal: h.pokal || null
            };
            // Spieltage (schlank, Level ≤4) nur für die letzten 5 Saisons mitspeichern – ältere: nur Tabelle+Pokal
            if (i >= arr.length - 5 && h.matchdayHistory && h.matchdayHistory.length) {
                const m = leanMdHof(h.matchdayHistory);
                if (m.length) e.mdH = m;
            }
            return e;
        });
        // leanMdH auf Top-4 begrenzen – Unterliga-Tagesergebnisse werden im UI nicht historisch angezeigt
        const leanMdH = this.matchdayHistory.map(mh => ({ md: mh.md, r: mh.results.filter(x => parseInt((x.leagueId||'99').split('-')[0]) <= 4).map(x => ({ l: x.leagueId, h: x.home, a: x.away, s1: x.score1, s2: x.score2 })) })).filter(mh => mh.r.length);
        const build = () => this._encodeSave(JSON.stringify({y: this.currentSeasonOffset, s:this.currentSeason, m:this.currentMatchday, t:leanTeams, h:leanHistory, r:this.seasonResults, p:this.pokal, dh:leanMdH, f:this.friendlies, as:this.actionState, sd:this.seasonSeed, ar:this.archive}));
        // Quota-sicher: bei vollem localStorage das Archiv-CHRONIK (champions/relegation) schrittweise
        // von den ältesten Einträgen kürzen – die SUMMEN (ewige inkl. titles, relStats) bleiben dauerhaft.
        // Niemals den vorhandenen Save löschen (setItem ist atomar → bei Fehler bleibt der alte Stand erhalten).
        try { localStorage.setItem('ba_save_v66', build()); return; } catch(e) {}
        for (let i = 0; i < 15 && this._trimOldestArchive(); i++) {
            try { localStorage.setItem('ba_save_v66', build()); return; } catch(e2) {}
        }
        // Notnagel: Chronik ganz leeren (Summen bleiben), letzter Versuch – sonst alten Save behalten
        if (this.archive) { this.archive.champions = {}; this.archive.relegation = []; }
        try { localStorage.setItem('ba_save_v66', build()); } catch(e3) { console.error("Save limit – Stand konnte nicht gespeichert werden, alter Stand bleibt erhalten"); }
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
            const s = JSON.parse(this._decodeSave(d)); this.currentSeasonOffset = s.y || 0; this.currentMatchday = s.m || 0; this.teams = s.t; this.history = s.h || []; this.seasonResults = s.r || []; this.pokal = s.p || null; this.friendlies = s.f || [];
            this.archive = s.ar || null; // Backfill aus history erst NACH leagues-Aufbau (s.u.)
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
            Object.values(this.teams).forEach(t => this.sanitizeTeam(t, GAME_DATA.teams[t.id]));
            this.leagues = JSON.parse(JSON.stringify(GAME_DATA.leagues));
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
            });
            // Altsave ohne Archiv → einmalig aus (rehydrierter) history seeden (leagues stehen jetzt)
            if (!this.archive) this.archive = this._rebuildArchiveFromHistory();
            return true;
        } catch(e) { return false; }
    }
};