Object.assign(App, {
  _mapObj:     null,
  _mapMarkers: [],
  _hullLyr:    null,
  _admLyr:     null,
  _lblLyr:     null,
  _teamLyr:    null,
  _polyIndex:  {},
  _selectedPolyIds: null,
  _sbLeagueId: null,

  _sbSortAsc: false,
  _sbTeamId: null,

  _mclSort: 'liga',

  _sosHistIdx: null,
  _sosLeagueId: null,
  _sosSeasonList: [],
  _sosKbHandler: null,
  _sosTouchStartX: null,

  _mapOpenSteckbrief: function(teamId) {
    this._sbTeamId = teamId;
    this._renderSteckbrief();
    const sb = document.getElementById('map-steckbrief');
    sb.style.width = '300px';
    sb.style.overflowY = 'hidden';
    setTimeout(() => { sb.style.overflowY = 'auto'; if (this._mapObj) this._mapObj.invalidateSize(); }, 240);
  },

  _renderSteckbrief: function() {
    const teamId = this._sbTeamId;
    const t = GAME_DATA.teams[teamId];
    if (!t) return;
    // Die LAUFENDE Liga steht in Engine.teams – GAME_DATA hält den Sim-Start fest und altert
    // damit sofort: 597 von 1264 Vereinen spielen nach 44 Saisons woanders, und 261 sind
    // ligalos (leagueId null, Amateurpokal). Der Steckbrief zeigte allen davon ihre Liga von
    // 2025/26, also z.B. "Bremen-Liga" für einen Verein, der längst aus der Pyramide ist.
    const engT = (typeof Engine !== 'undefined' && Engine.teams) ? Engine.teams[teamId] : null;
    const curLeagueId = engT ? (engT.leagueId || null) : (t.leagueId || null);
    const ligalos = !curLeagueId;
    const liga  = GAME_DATA.leagues[curLeagueId];
    const level = liga?.level || 99;
    const LC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555',99:'#777'};

    // Wappen
    const wImg = document.getElementById('sb-wappen');
    if (t.thumb) { wImg.src = t.thumb; wImg.style.display = 'block'; }
    else wImg.style.display = 'none';

    document.getElementById('sb-name').textContent = t.name;
    document.getElementById('sb-liga').textContent = liga?.name || (ligalos ? '🏅 Amateurpokal' : '–');
    document.getElementById('sb-level').innerHTML = liga
      ? `<span style="font-size:11px;padding:2px 7px;border-radius:3px;background:${LC[level]};color:#fff">Level ${level}</span>`
      : '';

    const regs = MAP_TEAM_REGIONS[t.name] || [];
    document.getElementById('sb-regionen').innerHTML = regs.length
      ? regs.map(r => {
          const safe = r.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
          return `<span onclick="App._mapRegionLinkFromSb('${safe}')" title="Vereine dieser Region anzeigen" style="display:inline-block;background:var(--chip-bg);color:var(--text);padding:1px 6px;border-radius:3px;margin:1px 2px 1px 0;cursor:pointer" onmouseover="this.style.outline='1px solid var(--c-link,#4fc3f7)'" onmouseout="this.style.outline='none'">${r}</span>`;
        }).join('')
      : '<span style="color:var(--muted)">–</span>';

    document.getElementById('sb-stadion').innerHTML = this._stadionHtml(t, true);
    document.getElementById('sb-coord').textContent = `${t.lat.toFixed(5)}, ${t.lon.toFixed(5)}`;

    this._sbLeagueId = curLeagueId;
    document.getElementById('sb-goto').style.display = this._sbLeagueId ? 'block' : 'none';

    // ── Saison-Historie ────────────────────────────────────────────────────
    // Einträge aufbauen: vergangene Saisons aus Engine.history + aktuelle Saison
    const rows = [];
    const hist = (typeof Engine !== 'undefined' && Engine.history) ? Engine.history : [];
    hist.forEach((h, idx) => {
      const ht = h.teams?.[teamId];
      if (!ht?.leagueId) return;
      const l = GAME_DATA.leagues[ht.leagueId];
      rows.push({ year: h.year || `Saison ${idx+1}`, leagueId: ht.leagueId, ligaName: l?.name || ht.leagueId, rank: ht.rank || '–', histIdx: idx, isCurrent: false });
    });
    // Aktuelle Saison – auch für Ligalose, sonst fehlt die laufende Zeile ganz
    rows.push({ year: (typeof Engine !== 'undefined' ? Engine.currentSeason : '–') || 'Aktuell',
                leagueId: curLeagueId, ligaName: liga?.name || '🏅 Amateurpokal',
                rank: engT?.rank || '–', histIdx: null, isCurrent: true });

    const sorted = this._sbSortAsc ? rows.slice() : rows.slice().reverse();

    const arrow = this._sbSortAsc ? '▲' : '▼';
    let histHtml = `<div style="border-top:1px solid var(--border);padding-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;font-weight:bold;color:var(--muted)">SAISON-HISTORIE</span>
        <button onclick="App._sbToggleSort()" style="background:none;border:1px solid var(--border);border-radius:3px;color:var(--muted);font-size:10px;padding:1px 6px;cursor:pointer">${arrow} ${this._sbSortAsc ? 'Älteste zuerst' : 'Neueste zuerst'}</button>
      </div>`;

    if (!sorted.length) {
      histHtml += '<div style="font-size:11px;color:var(--muted)">Keine Daten</div>';
    } else {
      for (const r of sorted) {
        const isAkt = r.isCurrent;
        const bg    = isAkt ? 'var(--row-cur-bg)' : '';
        const bold  = isAkt ? 'font-weight:bold;' : '';
        const lv    = GAME_DATA.leagues[r.leagueId]?.level || 99;
        const dot   = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LC[lv]||'var(--muted)'};margin-right:4px;flex-shrink:0"></span>`;
        // Ohne Liga (ligalos) gibt es keine Tabelle zum Aufschlagen – Zeile bleibt stumm
        const click = !r.leagueId ? ''
          : r.isCurrent ? `onclick="App._mapShowSeasonOverlay(null,'${r.leagueId}')"`
          : `onclick="App._mapShowSeasonOverlay(${r.histIdx},'${r.leagueId}')"`;
        histHtml += `<div ${click} style="display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:4px;cursor:${r.leagueId ? 'pointer' : 'default'};background:${bg};margin-bottom:1px" onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='${isAkt?'var(--row-cur-bg)':''}'">
          ${dot}
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;${bold}color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.ligaName}</div>
            <div style="font-size:10px;color:var(--muted)">${r.year}</div>
          </div>
          <div style="font-size:11px;color:var(--muted);flex-shrink:0">${r.rank !== '–' ? 'Pl. '+r.rank : '–'}</div>
        </div>`;
      }
    }
    histHtml += '</div>';

    // ── Liga-Häufigkeit → eigenes Element sb-freq ─────────────────────────
    const ligaCount = {};
    for (const r of rows) {
      if (!ligaCount[r.leagueId]) ligaCount[r.leagueId] = { name: r.ligaName, count: 0, level: GAME_DATA.leagues[r.leagueId]?.level || 99 };
      ligaCount[r.leagueId].count++;
    }
    const ligaSorted = Object.values(ligaCount).sort((a, b) => a.level - b.level || b.count - a.count);
    let freqHtml = '';
    if (ligaSorted.length > 1) {
      freqHtml = `<div style="border-top:1px solid var(--border);padding-top:8px;margin-bottom:4px">
        <div style="font-size:11px;font-weight:bold;color:var(--muted);margin-bottom:5px">LIGA-HÄUFIGKEIT</div>`;
      for (const l of ligaSorted) {
        const col = (LC[l.level] || '#777');
        const bar = Math.round((l.count / rows.length) * 80);
        freqHtml += `<div style="margin-bottom:3px">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:1px">
            <span style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px">${l.name}</span>
            <span style="flex-shrink:0;margin-left:4px;color:var(--muted)">${l.count}×</span>
          </div>
          <div style="height:4px;border-radius:2px;background:var(--border)">
            <div style="height:100%;width:${bar}px;max-width:100%;border-radius:2px;background:${col}"></div>
          </div>
        </div>`;
      }
      freqHtml += '</div>';
    }
    document.getElementById('sb-freq').innerHTML = freqHtml;

    // ── Saison-Historie → scrollbares sb-hist ─────────────────────────────
    document.getElementById('sb-hist').innerHTML = histHtml;
  },

  _sbToggleSort: function() {
    this._sbSortAsc = !this._sbSortAsc;
    this._renderSteckbrief();
  },

  _mapCloseSteckbrief: function() {
    const sb = document.getElementById('map-steckbrief');
    sb.style.overflowY = 'hidden';
    sb.style.width = '0';
    this._sbTeamId = null;
    setTimeout(() => { if (this._mapObj) this._mapObj.invalidateSize(); }, 240);
  },

  _mapGotoLeague: function() {
    if (!this._sbLeagueId) return;
    this.viewHistoryOffset = null;
    this.closeMap();
    this.loadLeague(this._sbLeagueId);
  },

  _mapShowSeasonOverlay: function(histIdx, leagueId) {
    // Saison-Liste aus Vereinshistorie des Steckbrief-Teams aufbauen
    const teamId = this._sbTeamId;
    this._sosSeasonList = [];
    if (typeof Engine !== 'undefined' && teamId) {
      Engine.history.forEach((h, idx) => {
        if (h.teams[teamId]?.leagueId) this._sosSeasonList.push(idx);
      });
      if (Engine.teams[teamId]?.leagueId) this._sosSeasonList.push(null);
    }
    this._sosHistIdx = histIdx;
    this._sosRender();
    document.getElementById('map-season-overlay').style.display = 'block';

    // Keyboard
    if (this._sosKbHandler) document.removeEventListener('keydown', this._sosKbHandler);
    this._sosKbHandler = (e) => {
      if (document.getElementById('map-season-overlay').style.display === 'none') return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); this._sosPrev(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); this._sosNext(); }
      else if (e.key === 'Escape') this._mapCloseSeasonOverlay();
    };
    document.addEventListener('keydown', this._sosKbHandler);

    // Touch-Swipe auf dem Card
    const card = document.getElementById('sos-card');
    card.ontouchstart = (e) => { this._sosTouchStartX = e.touches[0].clientX; };
    card.ontouchend   = (e) => {
      if (this._sosTouchStartX === null) return;
      const dx = e.changedTouches[0].clientX - this._sosTouchStartX;
      this._sosTouchStartX = null;
      if (Math.abs(dx) < 40) return;
      if (dx > 0) this._sosPrev(); else this._sosNext();
    };
  },

  _sosRender: function() {
    const histIdx  = this._sosHistIdx;
    const teamId   = this._sbTeamId;
    const pos      = this._sosSeasonList.indexOf(histIdx);
    const total    = this._sosSeasonList.length;

    const teamsData = histIdx === null
      ? (typeof Engine !== 'undefined' ? Engine.teams : {})
      : (typeof Engine !== 'undefined' ? Engine.history[histIdx]?.teams || {} : {});

    // leagueId aus den Team-Daten dieser Saison ableiten
    const leagueId = teamsData[teamId]?.leagueId || null;
    const league = leagueId ? GAME_DATA.leagues[leagueId] : null;
    const year   = histIdx === null
      ? ((typeof Engine !== 'undefined' && Engine.currentSeason) || 'Aktuell')
      : ((typeof Engine !== 'undefined' && Engine.history[histIdx]?.year) || `Saison ${histIdx+1}`);

    const rows = leagueId
      ? Object.values(teamsData).filter(t => t.leagueId === leagueId).sort((a, b) => (a.rank || 999) - (b.rank || 999))
      : [];

    // Auf-/Abstieg: leagueId in Folgesaison vergleichen
    let nextTeams = null;
    if (histIdx !== null && typeof Engine !== 'undefined') {
      nextTeams = histIdx + 1 < Engine.history.length
        ? Engine.history[histIdx + 1].teams
        : Engine.teams;
    }
    const getMv = (teamId, curLid) => {
      if (!nextTeams) return null;
      const nLid = nextTeams[teamId]?.leagueId;
      if (!nLid || nLid === curLid) return null;
      const cLv = GAME_DATA.leagues[curLid]?.level || 99;
      const nLv = GAME_DATA.leagues[nLid]?.level  || 99;
      return nLv < cLv ? 'up' : nLv > cLv ? 'down' : null;
    };

    // Nav-Buttons
    const prevBtn = document.getElementById('sos-prev');
    const nextBtn = document.getElementById('sos-next');
    prevBtn.disabled = pos <= 0;
    nextBtn.disabled = pos >= total - 1;
    prevBtn.style.opacity = pos <= 0 ? '0.2' : '0.8';
    nextBtn.style.opacity = pos >= total - 1 ? '0.2' : '0.8';

    const teamName = GAME_DATA.teams[teamId]?.name || '';
    document.getElementById('sos-title').textContent = `${league?.name || leagueId || '–'}  ·  ${year}`;
    document.getElementById('sos-counter').textContent = total > 1 ? `${teamName}  –  Saison ${pos+1} / ${total}` : teamName;

    const LC  = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555',99:'#777'};
    const col = LC[league?.level || 99] || '#777';

    let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">
      <thead><tr style="border-bottom:1px solid var(--border);color:var(--muted);position:sticky;top:0;background:var(--panel-3);z-index:1">
        <th style="padding:5px 4px;width:26px"></th>
        <th style="padding:5px 4px;text-align:center;width:26px">#</th>
        <th style="padding:5px 8px;text-align:left">Mannschaft</th>
        <th style="padding:5px 4px;text-align:center;width:26px">Sp</th>
        <th style="padding:5px 4px;text-align:center;width:22px">S</th>
        <th style="padding:5px 4px;text-align:center;width:22px">U</th>
        <th style="padding:5px 4px;text-align:center;width:22px">N</th>
        <th style="padding:5px 4px;text-align:center;width:48px">Tore</th>
        <th style="padding:5px 4px;text-align:center;width:34px">TD</th>
        <th style="padding:5px 8px;text-align:center;width:34px">Pkt</th>
      </tr></thead><tbody>`;

    for (const t of rows) {
      const isHl = t.id === this._sbTeamId;
      const mv   = getMv(t.id, t.leagueId);
      const isM  = t.rank === 1;
      let bg = '';
      if (isHl)          bg = 'background:#1a2040;';
      else if (mv==='up')   bg = 'background:rgba(0,100,0,0.28);';
      else if (mv==='down') bg = 'background:rgba(139,0,0,0.28);';
      const bl   = isM ? 'border-left:3px solid #f0c040;' : 'border-left:3px solid transparent;';
      const fw   = isHl ? 'font-weight:bold;' : '';
      const s    = t.stats || {};
      const tore = s.gf !== undefined ? `${s.gf}:${s.ga}` : '–';
      const diff = s.gf !== undefined ? s.gf - s.ga : null;
      const tdTxt = diff === null ? '–' : (diff > 0 ? '+' : '') + diff;
      const tdCol = diff === null ? '#aaa' : diff > 0 ? '#4caf50' : diff < 0 ? '#f44336' : '#aaa';
      const name  = GAME_DATA.teams[t.id]?.name || t.id;
      const thumb = GAME_DATA.teams[t.id]?.thumb;
      const wImg  = thumb ? `<img src="${thumb}" loading="lazy" style="width:20px;height:20px;object-fit:contain;display:block;margin:auto">` : '';
      let badge = '';
      if (isM)         badge += `<span style="font-size:10px;color:#f0c040;margin-left:3px">★</span>`;
      if (mv==='up')   badge += `<span style="font-size:10px;color:#4caf50;margin-left:3px">↑</span>`;
      if (mv==='down') badge += `<span style="font-size:10px;color:#f44336;margin-left:3px">↓</span>`;

      html += `<tr style="${bg}${bl}border-bottom:1px solid var(--border)">
        <td style="padding:3px 4px;text-align:center">${wImg}</td>
        <td style="padding:3px 4px;text-align:center;color:${col};font-weight:bold">${t.rank || '–'}</td>
        <td style="padding:3px 8px;${fw}color:${isHl?'#f0c040':'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:180px" title="${name}">${name}${badge}</td>
        <td style="padding:3px 4px;text-align:center;color:var(--muted)">${s.p ?? '–'}</td>
        <td style="padding:3px 4px;text-align:center;color:var(--muted)">${s.w ?? '–'}</td>
        <td style="padding:3px 4px;text-align:center;color:var(--muted)">${s.d ?? '–'}</td>
        <td style="padding:3px 4px;text-align:center;color:var(--muted)">${s.l ?? '–'}</td>
        <td style="padding:3px 4px;text-align:center;color:var(--muted)">${tore}</td>
        <td style="padding:3px 4px;text-align:center;color:${tdCol}">${tdTxt}</td>
        <td style="padding:3px 8px;text-align:center;${fw}color:${isHl?'#fff':'var(--text)'}">${s.pts ?? '–'}</td>
      </tr>`;
    }

    if (!rows.length) html += `<tr><td colspan="10" style="padding:20px;text-align:center;color:var(--muted)">Keine Daten</td></tr>`;
    html += '</tbody></table>';
    document.getElementById('sos-body').innerHTML = html;
  },

  _sosPrev: function() {
    const pos = this._sosSeasonList.indexOf(this._sosHistIdx);
    if (pos <= 0) return;
    this._sosHistIdx = this._sosSeasonList[pos - 1];
    this._sosRender();
  },

  _sosNext: function() {
    const pos = this._sosSeasonList.indexOf(this._sosHistIdx);
    if (pos >= this._sosSeasonList.length - 1) return;
    this._sosHistIdx = this._sosSeasonList[pos + 1];
    this._sosRender();
  },

  _mapCloseSeasonOverlay: function(event) {
    if (event && event.currentTarget !== event.target) return;
    document.getElementById('map-season-overlay').style.display = 'none';
    if (this._sosKbHandler) {
      document.removeEventListener('keydown', this._sosKbHandler);
      this._sosKbHandler = null;
    }
  },

  _mapGotoSeason: function(histIdx, leagueId) {
    this._mapShowSeasonOverlay(histIdx, leagueId);
  },

  showMap: function() {
    localStorage.setItem('ba_map_open', '1');
    document.getElementById('map-overlay').style.display = 'flex';
    if (!this._mapObj) this._initMap();
    else setTimeout(() => this._mapObj.invalidateSize(), 50);
    // Immer auffrischen, auch direkt nach _initMap: das baut die Punkte aus dem Engine-Stand,
    // der Umschalter steht beim Öffnen aber auf Sim-Start. Ohne den Aufruf zeigte die frisch
    // geöffnete Karte die Farben der laufenden Saison unter der Beschriftung "Sim-Start".
    this._mapRefreshLevels();
  },

  closeMap: function() {
    localStorage.removeItem('ba_map_open');
    document.getElementById('map-overlay').style.display = 'none';
    document.getElementById('map-steckbrief').style.width = '0';
    document.getElementById('map-season-overlay').style.display = 'none';
    document.getElementById('map-clublist-overlay').style.display = 'none';
    this._sbTeamId = null;
    if (this._sosKbHandler) { document.removeEventListener('keydown', this._sosKbHandler); this._sosKbHandler = null; }
  },

  _initMap: function() {
    if (typeof L === 'undefined') {
      document.getElementById('map-leaflet').innerHTML =
        '<div style="padding:40px;color:#f44;text-align:center">Leaflet nicht geladen – Internetverbindung erforderlich.</div>';
      return;
    }

    const map = L.map('map-leaflet', { center: [51.2, 10.4], zoom: 6, preferCanvas: true });
    // Kartenhintergrund: drei Esri-Ebenen ohne Schluessel und ohne Referer. Die beiden Vorgaenger
    // scheiterten an ihren Bedingungen, nicht an der Technik: CARTO bestempelt seine kostenlosen
    // Basemaps quer ueber jede Kachel mit "API KEY REQUIRED" (Status 200, trotzdem unbrauchbar -
    // ueber eine Statuspruefung nie zu finden, nur im Bild sichtbar), und tile.openstreetmap.org
    // verlangt einen Referer, den Firefox bei strengem Tracking-Schutz auch auf https entfernt und
    // den eine per file:// geoeffnete Datei nie sendet -> 403 "referer is required".
    //
    // ACHTUNG: ArcGIS legt die Kacheln als {z}/{y}/{x} ab, vertauscht gegenueber Leaflets Vorgabe.
    //
    // Alle maxNativeZoom-Werte sind GEMESSEN, nicht geschaetzt: die Dienste antworten auch jenseits
    // ihrer Daten mit Status 200 und liefern eine immer gleich grosse Platzhalter-Kachel. Erst die
    // Byte-Groesse verraet das Ende (Graustufen 16, Relief 13, Beschriftung 15). Darueber skaliert
    // Leaflet die letzte echte Kachel hoch, statt Leere zu zeigen.
    //
    // (1) Helle Graustufenkarte als Traeger: reicht bis Zoom 16 und liefert Strassen und
    //     Stadtstruktur - ohne sie waere jedes Hineinzoomen in eine Stadt nur Unschaerfe.
    // (2) Gelaendeschattierung halbtransparent darueber: gibt der Uebersicht Tiefe. Ihre Daten
    //     enden bei 13, ihr Unschaerfe-Anteil verblasst beim Zoomen ueber dem scharfen Untergrund.
    // (3) Beschriftung getrennt im shadowPane, also UEBER den Regionsflaechen statt darunter.
    //     tileSize 128 + zoomOffset 1 holt die naechsttiefere Stufe und zeigt sie halb so gross -
    //     die Ortsnamen treten hinter die eigenen Regionsnamen zurueck. Nur hier, nicht bei (1):
    //     sonst vervierfachten sich die Anfragen der grossen Ebene.
    const ESRI = 'https://services.arcgisonline.com/ArcGIS/rest/services/';
    L.tileLayer(ESRI + 'Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      { attribution: 'Esri, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende',
        maxZoom: 19, maxNativeZoom: 16 }).addTo(map);
    L.tileLayer(ESRI + 'World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
      { attribution: '', maxZoom: 19, maxNativeZoom: 13, opacity: 0.5 }).addTo(map);
    L.tileLayer(ESRI + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      { attribution: '', maxZoom: 19, maxNativeZoom: 15,
        tileSize: 128, zoomOffset: 1, pane: 'shadowPane' }).addTo(map);

    this._mapObj  = map;
    this._hullLyr = L.layerGroup().addTo(map);
    this._admLyr  = L.layerGroup().addTo(map);
    this._teamLyr = L.layerGroup().addTo(map);
    this._lblLyr  = L.layerGroup().addTo(map);
    // Gemeinden erst ab Zoom 8; Punktgröße und Namen hängen ebenfalls am Zoom,
    // die Namen zusätzlich am Ausschnitt (Überlappungsprüfung in Bildschirmkoordinaten)
    map.on('zoomend', () => { App._mapDrawAdmin(); App._mapScaleMarkers(); App._mapUpdateLabels(); });
    map.on('moveend', () => App._mapUpdateLabels());

    this._selectedPolyIds = new Set();

    // Dropdown schließen bei Klick außerhalb des Filter-Systems
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#map-region-search, #map-region-list')) {
        const rl = document.getElementById('map-region-list');
        if (rl) rl.style.display = 'none';
        App._mapUpdateSelectionLabel();
      }
    });

    // Poly-Index aufbauen
    for (const p of MAP_REGIONS)      this._polyIndex[p.id] = p;

    // Teams vorbereiten
    const TC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555555',99:'#999999'};
    const TR = {1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:2,99:2};
    // Gleichstandort-Jitter: Teams mit identischen Koordinaten leicht versetzen
    const coordIdx = {};
    for (const t of Object.values(GAME_DATA.teams)) {
      if (t.lat === 0 && t.lon === 0) continue;
      const key = `${t.lat},${t.lon}`;
      (coordIdx[key] = coordIdx[key] || []).push(t.id);
    }
    const jitter = {};
    for (const ids of Object.values(coordIdx)) {
      if (ids.length < 2) continue;
      ids.forEach((id, i) => {
        const a = (2 * Math.PI * i) / ids.length;
        jitter[id] = [0.003 * Math.cos(a), 0.003 * Math.sin(a)];
      });
    }
    this._mapMarkers = [];
    const eng = typeof Engine !== 'undefined' ? Engine.teams : null;
    for (const t of Object.values(GAME_DATA.teams)) {
      if (t.lat === 0 && t.lon === 0) continue;
      // Kennt die Engine den Verein, gilt IHR Stand - auch wenn er null ist. Ein ligaloser
      // Verein fiel sonst auf seine Liga von 2025/26 zurueck und wurde in deren Farbe gemalt.
      const curLeagueId = eng?.[t.id] ? (eng[t.id].leagueId || null) : t.leagueId;
      const liga  = GAME_DATA.leagues[curLeagueId];
      const level = liga?.level || 99;
      const col   = TC[level] || '#888';
      const tid = t.id;
      const [dLat, dLon] = jitter[tid] || [0, 0];
      // Fehlzuordnung? Der Verein liegt nicht in der Fläche einer seiner eigenen Regionen –
      // unvermeidliche Folge der Kreis-Mehrheitsregel (ein Kreis wandert komplett zur Staffel,
      // in der er überwiegend liegt). Rot + dicker Rand, damit man die Stellen sofort findet.
      const miss = (typeof MAP_MISFITS !== 'undefined') ? MAP_MISFITS[t.name] : null;
      const m = miss
        ? L.circleMarker([t.lat + dLat, t.lon + dLon], {
            radius: Math.max(TR[level] || 2, 5), color: '#000', fillColor: '#ff1744',
            fillOpacity: 1, weight: 2
          }).bindTooltip(`⚠ ${t.name}<br>liegt nicht in: ${miss.join(', ')}`,
                         { className: 'map-tip', sticky: true })
            .on('click', () => App._mapOpenSteckbrief(tid))
        : L.circleMarker([t.lat + dLat, t.lon + dLon], {
            radius: TR[level] || 2, color: col, fillColor: col, fillOpacity: 0.85, weight: 1
          }).on('click', () => App._mapOpenSteckbrief(tid));
      m._misfit    = !!miss;
      m._baseR     = miss ? Math.max(TR[level] || 2, 4) : (TR[level] || 2);
      m._labelText = t.name;
      m._teamId   = tid;
      m._name     = t.name.toLowerCase();
      m._level    = level;
      m._lid      = curLeagueId;      // fuer den Liga-Filter, s. _mapDrawTeams
      m._reserve  = !!(t.isReserve || t.parentId);
      m._regions  = MAP_TEAM_REGIONS[t.name] || [];
      this._mapMarkers.push(m);
    }

    // Staffelzuordnung für den gewählten Saisonstand setzen (app/map_saison.js) – füllt
    // m._regions und den Waben-Cache. Muss nach dem Poly-Index laufen.
    if (this._mapApplySaisonToMarkers) this._mapApplySaisonToMarkers();
    this._mapUpdateSaisonSchalter();

    setTimeout(() => { map.invalidateSize(); this._mapDrawAll(); }, 80);
    this._mapBuildRegionList();
  },

  // Schalter nur anbieten, wenn es zwei verschiedene Stände gibt; sonst nur den Hinweis,
  // dass noch nichts gewandert ist.
  _mapUpdateSaisonSchalter: function() {
    const box = document.getElementById('map-saison');
    if (!box) return;
    const n = this._mapSaisonDelta ? this._mapSaisonDelta() : 0;
    box.style.display = this._mapSaisonVerfuegbar && this._mapSaisonVerfuegbar() ? 'flex' : 'none';
    const b = document.getElementById('map-saison-aktuell');
    if (b) {
      b.disabled = n === 0;
      b.style.opacity = n === 0 ? '0.45' : '1';
      b.title = n === 0 ? 'Noch kein Verein hat die Staffel gewechselt'
                        : n + ' Vereine spielen in einer anderen Staffel als am Sim-Start';
    }
  },

  // ── Eltern / Kinder / Geschwister ─────────────────────────────────────────
  _mapGetParents: function(id) {
    const p = [];
    for (const [pid, ch] of Object.entries(MAP_HIER))
      if (ch.includes(id)) p.push(pid, ...this._mapGetParents(pid));
    return [...new Set(p)];
  },
  _mapGetChildren: function(id) {
    const ch = MAP_HIER[id] || [];
    return [...new Set([...ch, ...ch.flatMap(c => this._mapGetChildren(c))])];
  },
  _mapVisiblePolyIds: function() {
    if (!this._selectedPolyIds?.size) return null;
    const ids = new Set(this._selectedPolyIds);
    if (document.getElementById('map-chk-parents')?.checked)
      for (const id of this._selectedPolyIds) this._mapGetParents(id).forEach(i => ids.add(i));
    if (document.getElementById('map-chk-children')?.checked)
      for (const id of this._selectedPolyIds) this._mapGetChildren(id).forEach(i => ids.add(i));
    if (document.getElementById('map-chk-siblings')?.checked)
      for (const id of this._selectedPolyIds) (MAP_SIBLING_MAP[id] || []).forEach(i => ids.add(i));
    return ids;
  },
  _mapActiveExcelFilters: function() {
    if (!this._selectedPolyIds?.size) return null;
    const ids = this._mapVisiblePolyIds();
    const filters = new Set();
    for (const id of ids) {
      const poly = this._polyIndex[id];
      if (poly?.excelFilter) poly.excelFilter.forEach(f => filters.add(f));
    }
    return filters.size > 0 ? filters : null;
  },
  _mapTogglePoly: function(id) {
    if (!this._selectedPolyIds) this._selectedPolyIds = new Set();
    if (this._selectedPolyIds.has(id)) this._selectedPolyIds.delete(id);
    else this._selectedPolyIds.add(id);
    this._mapUpdateSelectionLabel();
    this._mapDrawAll();
  },
  _mapUpdateSelectionLabel: function() {
    const inp = document.getElementById('map-region-search');
    if (!inp) return;
    const n = this._selectedPolyIds?.size || 0;
    const btn = document.getElementById('map-clublist-btn');
    if (btn) { btn.disabled = n === 0; btn.style.opacity = n === 0 ? '0.4' : '1'; }
    if (n === 0) { inp.value = ''; return; }
    if (n === 1) {
      const id = [...this._selectedPolyIds][0];
      const r = this._mapAllRegions?.find(x => x.id === id);
      inp.value = r?.label || id;
    } else {
      inp.value = `${n} ausgewählt`;
    }
  },

  // ── Geo-Grenzen ───────────────────────────────────────────────────────────

  // ── Konvexhüllen ──────────────────────────────────────────────────────────
  // Stil je Ebene – früher an jeder Hülle mitgeliefert, jetzt einmal hier.
  // s4/s5 nutzen bewusst DIESELBE Farbe wie s3 und unterscheiden sich nur über die
  // Strichelung: Rheinland-Pfalz/Saar ist der einzige Verband mit fünf Ebenen, und mit
  // eigenen Farben für s4/s5 war es die einzige Gegend der Karte mit Violett und Dunkelrot.
  // Hierarchie über Linienart statt über neue Farbtöne.
  // Farben aus der Google-Earth-Abstimmung mit dem Nutzer (Datei "Spielkarte – Abgleich"):
  // Verbände schwarze Kontur mit blauer Füllung, Unterregionen schwarze Kontur mit gelber.
  // Unterschieden wird NICHT nach Ebene, sondern danach, ob die Region einen Verband mit
  // anderen teilt (split) – genau die Trennung, die auch der KML-Export benutzt.
  // Die Füllung ist in Google Earth deckend gesetzt; auf der Webkarte würde das die Kacheln
  // zudecken, deshalb hier dieselbe Farbe mit kartentauglicher Deckkraft.
  _REGION_STYLE: {
    verband: { color:'#000', fill:'#0055ff', fOp:0.10, w:2.2, op:0.85 },
    unter:   { color:'#000', fill:'#ffff00', fOp:0.20, w:1.2, op:0.75, dash:'5 3' }
  },

  // Regionsflächen zeichnen. Quelle: MAP_REGIONS aus app/map_regions.js – eine fertige
  // Geometrie je Region (amtliche Kreisgrenzen, wo es sie gibt; Marching Squares für die
  // 15 Unterteilungen, die real keine Grenze haben). Ersetzt die vier Hüllen-Varianten.
  _mapDrawRegions: function() {
    this._hullLyr.clearLayers();
    if (!document.getElementById('map-chk-hull')?.checked) return;
    const vis = this._mapVisiblePolyIds();
    const hasSel = !!this._selectedPolyIds?.size;
    // Ebenen-Filter (die L-Auswahl min–max). Bisher dünnte sie nur die Vereinspunkte aus,
    // während weiterhin ALLE fünf Regionsstufen übereinander lagen. Eine Ebene ist aber eine
    // Perspektive: auf Bezirksliga-Ebene will man die Bezirksliga-Flächen sehen und von allem
    // darüber nur den Rahmen. Ebene einer Region = Level ihrer Liga (REGION_TO_LEAGUE_ID),
    // sonst stufe+3 – die Regionsstufen 1–5 entsprechen genau den Liga-Ebenen 4–8.
    const lmin = +(document.getElementById('map-level-min')?.value || 1);
    const lmax = +(document.getElementById('map-level-max')?.value || 8);
    const lvlOf = p => {
      const lid = (typeof Engine !== 'undefined' && Engine.REGION_TO_LEAGUE_ID)
        ? Engine.REGION_TO_LEAGUE_ID[p.label] : null;
      const L = lid && Engine.leagues && Engine.leagues[lid];
      return L ? L.level : p.stufe + 3;
    };
    for (const p of MAP_REGIONS) {
      // Dynamisch geteilte Regionen kommen im gewählten Saisonstand aus den Waben
      // (app/map_saison.js); alles andere behält die gebaute Geometrie.
      const lv = lvlOf(p);
      if (lv > lmax) continue;              // unter der Auswahl: gar nicht zeichnen
      const rahmen = lv < lmin;             // über der Auswahl: nur Umriss, keine Füllung
      const geo = (this._mapRegionGeo && this._mapRegionGeo(p)) || p.geo;
      if (!geo || !geo.length) continue;
      const inVis = vis && vis.has(p.id);
      const s = (p.split && p.split.length) ? this._REGION_STYLE.unter : this._REGION_STYLE.verband;
      const fOp = hasSel ? (inVis ? Math.min(s.fOp * 4, 0.4) : 0.005) : s.fOp;
      const w   = hasSel ? (inVis ? s.w + 1.5 : 0.5) : s.w;
      const op  = hasSel ? (inVis ? 1.0 : 0.12) : s.op;
      const col = hasSel && !inVis ? '#666' : s.color;
      const style = { color:col, weight: rahmen ? Math.max(1, w * 0.6) : w,
        opacity: rahmen ? op * 0.55 : op, fillColor:s.fill,
        fillOpacity: rahmen ? 0 : fOp, dashArray: rahmen ? '5 4' : (s.dash || null) };
      // geo = [[Außenring, Loch, …], …] – L.polygon nimmt genau diese Verschachtelung
      for (const rings of geo) {
        L.polygon(rings, style)
          .on('click', () => App._mapTogglePoly(p.id))
          .bindTooltip(`${p.label}`, {sticky:true, className:'map-tip'})
          .addTo(this._hullLyr);
      }
      if (p.stufe <= 3 && (!hasSel || inVis)) {
        // Beschriftung in die größte Teilfläche setzen
        const main = geo.reduce((a,b) => (a[0].length > b[0].length ? a : b))[0];
        const cL = main.reduce((a,x) => a+x[0], 0) / main.length;
        const cO = main.reduce((a,x) => a+x[1], 0) / main.length;
        const icon = L.divIcon({ className:'', iconAnchor:[0,0],
          html:`<div style="font-size:${p.stufe===1?11:p.stufe===2?10:9}px;color:${s.color};font-weight:bold;white-space:nowrap;text-shadow:1px 1px 0 #fff,-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff;pointer-events:none;transform:translate(-50%,-50%)">${p.label}</div>`});
        L.marker([cL,cO], { icon, interactive:false, zIndexOffset:-1000 }).addTo(this._hullLyr);
      }
    }
  },

  // ── Vereinspunkte ─────────────────────────────────────────────────────────
  // Liga-Auswahl einmalig befuellen: nach Ebene gruppiert, innerhalb der Ebene alphabetisch.
  // Der Ligabaum steht in Engine.leagues (GAME_DATA nur als Rueckfall), damit die Liste zur
  // laufenden Partie passt und nicht zum Sim-Start.
  _mapFillLigaSelect: function() {
    const sel = document.getElementById('map-liga');
    if (!sel || sel.dataset.gefuellt) return;
    const src = (typeof Engine !== 'undefined' && Engine.leagues) || GAME_DATA.leagues;
    const nachEbene = {};
    Object.values(src).forEach(l => { (nachEbene[l.level] = nachEbene[l.level] || []).push(l); });
    let html = '<option value="">alle Ligen</option>';
    Object.keys(nachEbene).map(Number).sort((a, b) => a - b).forEach(lv => {
      html += '<optgroup label="Ebene ' + lv + '">';
      nachEbene[lv].sort((a, b) => a.name.localeCompare(b.name, 'de'))
        .forEach(l => { html += '<option value="' + l.id + '">' + l.name + '</option>'; });
      html += '</optgroup>';
    });
    sel.innerHTML = html;
    sel.dataset.gefuellt = '1';
  },

  _mapDrawTeams: function() {
    this._mapFillLigaSelect();
    this._teamLyr.clearLayers();
    if (!document.getElementById('map-chk-teams')?.checked) return;
    const q       = (document.getElementById('map-search')?.value || '').toLowerCase();
    const lvMin   = parseInt(document.getElementById('map-level-min')?.value) || 1;
    const lvMax   = parseInt(document.getElementById('map-level-max')?.value) || 8;
    const showRes = document.getElementById('map-chk-res')?.checked;
    // Eine einzelne Staffel sehen zu wollen ist der haeufigste Wunsch an eine Ligakarte - der
    // Ebenen-Bereich daneben ist dafuer zu grob (eine Ebene hat bis zu 20 parallele Staffeln).
    const ligaSel = document.getElementById('map-liga')?.value || '';
    const rFilter = this._mapActiveExcelFilters();
    let vis = 0;
    for (const m of this._mapMarkers) {
      const nameMatch = q && m._name.includes(q);
      if (!showRes && m._reserve && !nameMatch) continue;
      if (m._level >= 1 && m._level <= 8 && (m._level < lvMin || m._level > lvMax)) continue;
      if (ligaSel && m._lid !== ligaSel) continue;
      if (q && !nameMatch) continue;
      if (rFilter && !m._regions.some(r => rFilter.has(r))) continue;
      m.addTo(this._teamLyr);
      vis++;
    }
    const el = document.getElementById('map-stat-vis');
    if (el) el.textContent = vis;
    this._mapScaleMarkers();
    this._mapUpdateLabels();
  },

  // ── Sichtbarkeit: Punktgröße und Namen nach Zoomstufe ────────────────────
  // Auf Deutschland-Ansicht wären 1264 beschriftete Punkte unlesbar, beim Hineinzoomen
  // dagegen verschwinden 2-px-Punkte. Beides skaliert deshalb mit dem Zoom – so wie man
  // es von Kartendiensten kennt.
  _mapScaleMarkers: function() {
    const z = this._mapObj ? this._mapObj.getZoom() : 6;
    const f = Math.max(1, Math.min(3.2, 1 + (z - 6) * 0.30));
    for (const m of this._mapMarkers) {
      const base = m._baseR || 3;
      const r = base * f;
      m.setRadius(r);
      m.setStyle({ weight: m._misfit ? Math.min(3, 1.5 * f) : (z >= 9 ? 1.5 : 1) });
    }
  },

  _MAP_LABEL_ZOOM: 9,       // ab hier Namen einblenden
  _MAP_LABEL_MAX:  90,      // Obergrenze, damit dichte Ballungsräume nicht zulaufen
  // Namen werden nur gesetzt, solange sie sich nicht überlappen: höhere Liga zuerst,
  // dann wird jeder Kandidat gegen die bereits belegten Rechtecke geprüft (klassisches
  // Label-Placement). Dadurch bleiben in Ballungsräumen die wichtigsten Vereine lesbar.
  _mapUpdateLabels: function() {
    if (!this._lblLyr) return;
    this._lblLyr.clearLayers();
    const map = this._mapObj;
    if (!map || map.getZoom() < this._MAP_LABEL_ZOOM) return;
    if (!document.getElementById('map-chk-teams')?.checked) return;
    const b = map.getBounds();
    const cand = this._mapMarkers
      .filter(m => this._teamLyr.hasLayer(m) && b.contains(m.getLatLng()))
      .sort((x, y) => (x._level - y._level) || (x._misfit === y._misfit ? 0 : x._misfit ? -1 : 1));
    const boxen = [];
    for (const m of cand) {
      if (boxen.length >= this._MAP_LABEL_MAX) break;
      const p = map.latLngToContainerPoint(m.getLatLng());
      const w = m._labelText.length * 6.2 + 8, h = 15;
      const x0 = p.x + 9, y0 = p.y - h / 2;
      const box = [x0, y0, x0 + w, y0 + h];
      if (boxen.some(o => box[0] < o[2] && box[2] > o[0] && box[1] < o[3] && box[3] > o[1])) continue;
      boxen.push(box);
      L.marker(m.getLatLng(), {
        interactive: false, zIndexOffset: -500,
        icon: L.divIcon({ className: '', iconAnchor: [-9, 7],
          html: `<span class="map-lbl${m._misfit ? ' map-lbl-miss' : ''}">${m._labelText}</span>` })
      }).addTo(this._lblLyr);
    }
  },

  // ── Amtliche Verwaltungsgrenzen als Referenz-Ebenen ──────────────────────
  // Reine Orientierung: Kreise und Gemeinden beeinflussen die Verbandsflächen nicht,
  // sie zeigen nur, wo die echten Grenzen liegen. Deshalb ohne Füllung gezeichnet –
  // sie liegen über den Regionsflächen und dürfen deren Farbe nicht zudecken.
  // Gemeinden gibt es nur in den 21 Kreisen, die zwischen zwei Verbänden geteilt sind
  // (überall sonst folgt die Verbandsgrenze ohnehin exakt der Kreisgrenze).
  _mapDrawAdmin: function() {
    this._admLyr.clearLayers();
    const zoom = this._mapObj ? this._mapObj.getZoom() : 6;
    if (document.getElementById('map-chk-kreise')?.checked && typeof MAP_KREISE !== 'undefined') {
      for (const k of MAP_KREISE)
        for (const rings of k.geo)
          // Bewusst #000 statt eines Grautons: Die Karte hat IMMER helle Kacheln, die Linien
          // dürfen dem App-Theme also nicht folgen. Ein neutrales Grau würde der
          // Theme-Normalisierer (tools/check_theme_colors.cjs) zudem in var(--muted)
          // umschreiben – im Dark-Theme wäre das helles Grau auf hellem Grund.
          // Schwarz und Weiß sind dort ausdrücklich als Kontrastfarben ausgenommen.
          L.polygon(rings, { color:'#000', weight:1.1, opacity:0.75, fill:false, interactive:true })
            .bindTooltip(k.name, {sticky:true, className:'map-tip'}).addTo(this._admLyr);
    }
    // Gemeinden erst ab Zoom 8 – 931 Polygone auf Deutschland-Ansicht wären nur Grieß
    if (document.getElementById('map-chk-gemeinden')?.checked && typeof MAP_GEMEINDEN !== 'undefined' && zoom >= 8) {
      for (const g of MAP_GEMEINDEN)
        for (const rings of g.geo)
          L.polygon(rings, { color:'#0d6b8a', weight:0.9, opacity:0.9, fill:false, dashArray:'4 2', interactive:true })
            .bindTooltip(`${g.name}${g.kreis ? ' · ' + g.kreis : ''}`, {sticky:true, className:'map-tip'}).addTo(this._admLyr);
    }
    this._mapDrawWaben();
  },

  // ── Wabengrenzen: die Voronoi-Zelle jedes Vereins offenlegen ─────────────
  // Diagnose-Ebene. Eine Staffelfläche ist die VEREINIGUNG der Waben ihrer Vereine; liegt eine
  // Wabe mitten im Gebiet einer anderen Staffel, entsteht dort ein Loch. Ohne diese Ebene sieht
  // man nur das Loch, nicht seinen Verursacher – mit ihr nennt der Tooltip ihn beim Namen.
  // Die Waben selbst hängen ausschließlich an den Vereinskoordinaten und ändern sich nie; nur
  // ihre Staffelzugehörigkeit wechselt. Deshalb ist die Ebene unabhängig vom Saisonstand,
  // der Tooltip zeigt die Staffel aber im gewählten Stand an.
  _mapDrawWaben: function() {
    if (!document.getElementById('map-chk-waben')?.checked) return;
    if (typeof MAP_WABEN === 'undefined') return;
    const staffelVon = (name, id) => {
      if (typeof this._mapStaffelKette !== 'function') return '';
      const kette = this._mapStaffelKette(name, id) || [];
      let best = '', bs = -1;
      for (const lb of kette) {
        const p = this._polyIndex && this._polyIndex[this._mapIdOf(lb)];
        if (p && p.stufe > bs) { bs = p.stufe; best = lb; }
      }
      return best;
    };
    const idVon = {};
    if (typeof Engine !== 'undefined' && Engine.teams)
      for (const t of Object.values(Engine.teams)) idVon[t.name] = t.id;
    for (const vb in MAP_WABEN) {
      const { pts, cells } = MAP_WABEN[vb];
      for (const name in cells) {
        const st = staffelVon(name, idVon[name]);
        for (const ring of cells[name]) {
          // Magenta bewusst kräftig: liegt über Regionsfüllung, Kreisschwarz und Gemeindeblau
          // und muss sich von allen dreien unterscheiden. Kein Grauton – der Theme-Normalisierer
          // (tools/check_theme_colors.cjs) schriebe ihn in var(--muted) um, und die Karte hat
          // immer helle Kacheln, unabhängig vom App-Theme.
          L.polygon(ring.map(i => pts[i]), { color:'#c026a8', weight:0.7, opacity:0.75, fill:false, interactive:true })
            .bindTooltip(`${name}${st ? ' · ' + st : ''}`, {sticky:true, className:'map-tip'}).addTo(this._admLyr);
        }
      }
    }
  },

  _mapDrawAll: function() { this._mapDrawRegions(); this._mapDrawAdmin(); this._mapDrawTeams(); },

  // ── Saison-Sync: Marker-Farben an Engine-State anpassen ──────────────────
  _mapRefreshLevels: function() {
    if (!this._mapMarkers?.length) return;
    const TC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555555',99:'#999999'};
    const TR = {1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:2,99:2};
    // Sim-Start zeigt die Ligen aus game_data, "Aktuell" die der laufenden Saison. Ohne diese
    // Fallunterscheidung las die Funktion immer den Engine-Stand – beide Ansichten hatten
    // dieselben Punktfarben, obwohl sich die Ligazugehörigkeit über die Saisons ändert.
    const start = this._mapSaison === 'start';
    const eng = (!start && typeof Engine !== 'undefined') ? Engine.teams : null;
    for (const m of this._mapMarkers) {
      const gd = GAME_DATA.teams[m._teamId];
      if (!gd) continue;
      const lid = eng?.[m._teamId] ? (eng[m._teamId].leagueId || null) : gd.leagueId;
      const lv = GAME_DATA.leagues[lid]?.level || 99;
      m._level = lv;
      m._lid = lid;                   // sonst filterte die Karte nach der Liga der anderen Saison
      // _baseR mitziehen, nicht nur radius: _mapScaleMarkers rechnet den Zoom-Radius aus
      // _baseR und überschrieb einen hier gesetzten radius sofort wieder – die Punktgröße
      // änderte sich dadurch nie.
      m._baseR = m._misfit ? Math.max(TR[lv] || 2, 4) : (TR[lv] || 2);
      // Fehlsitzer bleiben rot mit schwarzem Rand, sonst geht die Warnung beim Refresh verloren.
      const col = m._misfit ? '#ff1744' : (TC[lv] || '#888');
      m.setStyle({ color: m._misfit ? '#000' : col, fillColor: col, radius: m._baseR });
    }
    this._mapDrawTeams();
  },

  // ── Region-Suchfeld ───────────────────────────────────────────────────────
  _mapAllRegions: null,
  _mapBuildRegionList: function() {
    const SC = {1:'#1a4fa8',2:'#1a7a35',3:'#b05000',4:'#7a00aa',5:'#8b0000',vw:'#005f8e'};
    const TL = {hull:'Hülle', vw:'VW'};
    const raw = [
      ...MAP_REGIONS.map(p => ({
        id:    p.id,
        label: p.label,
        type:  'hull',
        stufe: p.stufe
      }))
    ];
    // Alphabetisch sortiert, VW-Einträge oben
    raw.sort((a, b) => {
      const aVw = a.type === 'vw', bVw = b.type === 'vw';
      if (aVw !== bVw) return aVw ? -1 : 1;
      return a.label.localeCompare(b.label, 'de');
    });
    this._mapAllRegions = raw;
    this._mapAllRegions._SC = SC;
    this._mapAllRegions._TL = TL;
  },
  _mapToggleTypeFilter: function(type) {
    if (!this._selectedPolyIds) this._selectedPolyIds = new Set();
    const ofType = this._mapAllRegions.filter(r => r.type === type).map(r => r.id);
    const allSel = ofType.every(id => this._selectedPolyIds.has(id));
    if (allSel) ofType.forEach(id => this._selectedPolyIds.delete(id));
    else        ofType.forEach(id => this._selectedPolyIds.add(id));
    this._mapUpdateSelectionLabel();
    this._mapShowRegionList();
    this._mapDrawAll();
  },
  _mapShowRegionList: function() {
    const inp = document.getElementById('map-region-search');
    const rl  = document.getElementById('map-region-list');
    if (!rl || !this._mapAllRegions) return;
    const raw = inp?.value || '';
    const q   = /^\d+ ausgewählt$/.test(raw) ? '' : raw.toLowerCase();
    const SC  = this._mapAllRegions._SC;
    const TL  = this._mapAllRegions._TL;

    // Alle vorkommenden Typen in Reihenfolge ihres ersten Auftretens
    const typeOrder = [];
    for (const r of this._mapAllRegions)
      if (!typeOrder.includes(r.type)) typeOrder.push(r.type);

    const shown = this._mapAllRegions.filter(r => !q || r.label.toLowerCase().includes(q));

    // Chip-Zustand: alle selektiert = voll, teilweise = halb, keiner = aus
    const chips = typeOrder.map(t => {
      const lbl     = TL[t] || t;
      const col     = SC[t] || SC[parseInt(t)] || '#555';
      const ofType  = this._mapAllRegions.filter(r => r.type === t);
      const selCount= ofType.filter(r => this._selectedPolyIds?.has(r.id)).length;
      const allSel  = selCount === ofType.length;
      const someSel = selCount > 0 && !allSel;
      const bg      = allSel ? col : someSel ? col + '88' : 'var(--panel-2)';
      const border  = allSel || someSel ? col : 'var(--border)';
      const txt     = allSel || someSel ? '#fff' : 'var(--text)';
      const extra   = someSel ? 'opacity:0.75' : '';
      return `<span title="${selCount}/${ofType.length}" style="display:inline-block;padding:2px 7px;border-radius:10px;font-size:10px;font-weight:bold;color:${txt};background:${bg};border:1px solid ${border};cursor:pointer;user-select:none;${extra}" onclick="App._mapToggleTypeFilter('${t}')">${lbl}</span>`;
    }).join(' ');
    const filterBar = `<div style="padding:6px 10px;display:flex;flex-wrap:wrap;gap:4px;border-bottom:1px solid var(--border)">${chips}</div>`;

    const hasSel = !!this._selectedPolyIds?.size;
    const clearRow = hasSel
      ? `<div style="padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:6px;border-bottom:1px solid var(--border);color:#f88" onclick="App._mapClearRegion()">` +
        `<span style="font-size:9px;padding:1px 4px;border-radius:3px;color:#fff;background:#aa3333;flex-shrink:0">✕</span>` +
        `<span style="font-size:12px">Alle abwählen</span></div>`
      : '';

    rl.innerHTML = filterBar + clearRow + (shown.map(r => {
      const col = SC[r.stufe] || 'var(--muted)';
      const tl  = TL[r.type] || TL['hull'];
      const sel = this._selectedPolyIds?.has(r.id);
      const bg  = sel ? 'background:#1e3a6a;' : '';
      const chk = sel ? '<span style="color:#4fc3f7;font-weight:bold;margin-right:2px">✓</span>' : '';
      return `<div style="padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:6px;${bg}" onclick="App._mapSelectRegion('${r.id.replace(/'/g,"\\'")}')">` +
        `<span style="font-size:9px;padding:1px 4px;border-radius:3px;color:#fff;background:${col};flex-shrink:0">${tl}</span>` +
        `${chk}<span style="font-size:12px">${r.label}</span></div>`;
    }).join('') || '<div style="padding:8px 10px;color:var(--muted);font-size:12px">Keine Treffer</div>');
    rl.style.display = 'block';
  },
  _mapSelectRegion: function(id) {
    if (!this._selectedPolyIds) this._selectedPolyIds = new Set();
    if (this._selectedPolyIds.has(id)) this._selectedPolyIds.delete(id);
    else this._selectedPolyIds.add(id);
    this._mapUpdateSelectionLabel();
    this._mapShowRegionList();
    this._mapDrawAll();
  },
  _mapClearRegion: function() {
    if (this._selectedPolyIds) this._selectedPolyIds.clear();
    this._mapUpdateSelectionLabel();
    this._mapShowRegionList();
    this._mapDrawAll();
  },

  // ── Vereinsliste der Regionsauswahl ───────────────────────────────────────
  _mclCollect: function() {
    const rFilter = this._mapActiveExcelFilters();
    if (!rFilter) return [];
    const eng     = typeof Engine !== 'undefined' ? Engine.teams : null;
    const showRes = document.getElementById('map-chk-res')?.checked;
    const seen = new Set();
    const out  = [];
    for (const m of this._mapMarkers) {
      if (!showRes && m._reserve) continue;
      if (!m._regions.some(r => rFilter.has(r))) continue;
      if (seen.has(m._teamId)) continue;
      seen.add(m._teamId);
      const gd  = GAME_DATA.teams[m._teamId];
      if (!gd) continue;
      const lid = eng?.[m._teamId] ? (eng[m._teamId].leagueId || null) : gd.leagueId;
      const lg  = lid ? GAME_DATA.leagues[lid] : null;
      out.push({
        id: m._teamId, name: gd.name, thumb: gd.thumb,
        leagueId: lid, ligaName: lg?.name || '– ohne Liga –',
        level: lg?.level || 99,
        strength: Math.round(eng?.[m._teamId]?.strength || 0)
      });
    }
    return out;
  },

  _mapShowClubList: function() {
    if (!this._selectedPolyIds?.size) return;
    this._mclRender();
    document.getElementById('map-clublist-overlay').style.display = 'block';
  },

  _mapCloseClubList: function(event) {
    if (event && event.currentTarget !== event.target) return;
    document.getElementById('map-clublist-overlay').style.display = 'none';
  },

  _mclSetSort: function(mode) {
    this._mclSort = mode;
    this._mclRender();
  },

  _mclOpen: function(teamId) {
    this._mapCloseClubList();
    this._mapOpenSteckbrief(teamId);
  },

  // Region-Chip im Steckbrief → Region auf Karte auswählen + Vereinsliste öffnen
  _mapRegionLinkFromSb: function(regionStr) {
    const ids = [];
    for (const [id, poly] of Object.entries(this._polyIndex))
      if (poly?.excelFilter?.includes(regionStr)) ids.push(id);
    if (!ids.length) return;
    this._selectedPolyIds = new Set(ids);
    this._mapUpdateSelectionLabel();
    this._mapDrawAll();
    this._mapCloseSteckbrief();
    this._mapShowClubList();
  },

  _mclRender: function() {
    const LC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555',99:'#777'};
    const teams = this._mclCollect();
    const byLiga = this._mclSort === 'liga';

    document.getElementById('mcl-title').textContent = `Vereine in Auswahl (${teams.length})`;

    // Sortier-Buttons spiegeln den aktiven Modus
    for (const [mode, id] of [['liga','mcl-sort-liga'],['strength','mcl-sort-strength']]) {
      const b = document.getElementById(id);
      if (!b) continue;
      const on = this._mclSort === mode;
      b.style.background = on ? '#1a4fa8' : 'var(--panel-2)';
      b.style.color      = on ? '#fff' : 'var(--muted)';
      b.style.borderColor= on ? '#1a4fa8' : 'var(--border)';
    }

    if (!teams.length) {
      document.getElementById('mcl-body').innerHTML =
        '<div style="padding:24px;text-align:center;color:var(--muted)">Keine Vereine in dieser Auswahl</div>';
      return;
    }

    teams.sort((a, b) => byLiga
      ? (a.level - b.level || a.ligaName.localeCompare(b.ligaName, 'de') || b.strength - a.strength || a.name.localeCompare(b.name, 'de'))
      : (b.strength - a.strength || a.level - b.level || a.name.localeCompare(b.name, 'de')));

    let html = '';
    let curLiga = null;
    for (const t of teams) {
      if (byLiga && t.leagueId !== curLiga) {
        curLiga = t.leagueId;
        html += `<div style="display:flex;align-items:center;gap:6px;padding:7px 12px 3px;font-size:11px;font-weight:bold;color:var(--muted);position:sticky;top:0;background:var(--panel-3);z-index:1">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${LC[t.level]||'var(--panel-2)'};flex-shrink:0"></span>${t.ligaName}</div>`;
      }
      const wImg = t.thumb ? `<img src="${t.thumb}" loading="lazy" style="width:22px;height:22px;object-fit:contain;flex-shrink:0">` : '<span style="width:22px;flex-shrink:0"></span>';
      const dot  = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LC[t.level]||'var(--panel-2)'};flex-shrink:0"></span>`;
      html += `<div onclick="App._mclOpen('${t.id}')" style="display:flex;align-items:center;gap:8px;padding:5px 12px;cursor:pointer;border-bottom:1px solid var(--border)"
        onmouseover="this.style.background='var(--hover-bg,#1e3a6a44)'" onmouseout="this.style.background=''">
        ${wImg}
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t.name}</div>
          ${byLiga ? '' : `<div style="font-size:10px;color:var(--muted);display:flex;align-items:center;gap:4px">${dot}${t.ligaName}</div>`}
        </div>
        <div style="flex-shrink:0;text-align:right">
          <div style="font-size:13px;font-weight:bold;color:var(--text)">${t.strength || '–'}</div>
          <div style="font-size:9px;color:var(--muted)">Stärke</div>
        </div>
      </div>`;
    }
    document.getElementById('mcl-body').innerHTML = html;
  },
});

// Karte nach App.init() wiederherstellen wenn sie beim letzten Reload offen war
(function() {
  const _orig = App.init;
  App.init = function() {
    _orig.apply(this, arguments);
    if (localStorage.getItem('ba_map_open') === '1') {
      setTimeout(() => App.showMap(), 100);
    }
  };
})();
