Object.assign(App, {
  _mapObj:     null,
  _mapMarkers: [],
  _geoLyr:     null,
  _hullLyr:    null,
  _teamLyr:    null,
  _polyIndex:  {},
  _selectedPolyIds: null,
  _hullMode:   'actual',
  _sbLeagueId: null,

  _sbSortAsc: false,
  _sbTeamId: null,

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
    const liga  = GAME_DATA.leagues[t.leagueId];
    const level = liga?.level || 99;
    const LC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555',99:'#777'};

    // Wappen
    const wImg = document.getElementById('sb-wappen');
    if (t.thumb) { wImg.src = t.thumb; wImg.style.display = 'block'; }
    else wImg.style.display = 'none';

    document.getElementById('sb-name').textContent = t.name;
    document.getElementById('sb-liga').textContent = liga?.name || '–';
    document.getElementById('sb-level').innerHTML = liga
      ? `<span style="font-size:11px;padding:2px 7px;border-radius:3px;background:${LC[level]};color:#fff">Level ${level}</span>`
      : '';

    const regs = MAP_TEAM_REGIONS[t.name] || [];
    document.getElementById('sb-regionen').innerHTML = regs.length
      ? regs.map(r => `<span style="display:inline-block;background:var(--chip-bg);color:var(--text);padding:1px 6px;border-radius:3px;margin:1px 2px 1px 0">${r}</span>`).join('')
      : '<span style="color:var(--muted)">–</span>';

    document.getElementById('sb-coord').textContent = `${t.lat.toFixed(5)}, ${t.lon.toFixed(5)}`;

    this._sbLeagueId = t.leagueId || null;
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
    // Aktuelle Saison
    if (t.leagueId) {
      const curT = typeof Engine !== 'undefined' ? Engine.teams[teamId] : null;
      rows.push({ year: (typeof Engine !== 'undefined' ? Engine.currentSeason : '–') || 'Aktuell', leagueId: t.leagueId, ligaName: liga?.name || t.leagueId, rank: curT?.rank || '–', histIdx: null, isCurrent: true });
    }

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
        const click = r.isCurrent
          ? `onclick="App._mapShowSeasonOverlay(null,'${r.leagueId}')"`
          : `onclick="App._mapShowSeasonOverlay(${r.histIdx},'${r.leagueId}')"`;
        histHtml += `<div ${click} style="display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:4px;cursor:pointer;background:${bg};margin-bottom:1px" onmouseover="this.style.background='var(--hover-bg)'" onmouseout="this.style.background='${isAkt?'var(--row-cur-bg)':''}'">
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
    else {
      this._mapRefreshLevels();
      setTimeout(() => this._mapObj.invalidateSize(), 50);
    }
  },

  closeMap: function() {
    localStorage.removeItem('ba_map_open');
    document.getElementById('map-overlay').style.display = 'none';
    document.getElementById('map-steckbrief').style.width = '0';
    document.getElementById('map-season-overlay').style.display = 'none';
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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
      { attribution: '', maxZoom: 19, pane: 'shadowPane' }).addTo(map);

    this._mapObj  = map;
    this._geoLyr  = L.layerGroup().addTo(map);
    this._hullLyr = L.layerGroup().addTo(map);
    this._teamLyr = L.layerGroup().addTo(map);

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
    for (const r of MAP_GEO_REGIONS)  this._polyIndex['geo_' + r.id] = r;
    for (const p of MAP_HULL_POLYS)   this._polyIndex[p.id] = p;

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
      const curLeagueId = eng?.[t.id]?.leagueId || t.leagueId;
      const liga  = GAME_DATA.leagues[curLeagueId];
      const level = liga?.level || 99;
      const col   = TC[level] || '#888';
      const tid = t.id;
      const [dLat, dLon] = jitter[tid] || [0, 0];
      const m = L.circleMarker([t.lat + dLat, t.lon + dLon], {
        radius: TR[level] || 2, color: col, fillColor: col, fillOpacity: 0.85, weight: 1
      }).on('click', () => App._mapOpenSteckbrief(tid));
      m._teamId   = tid;
      m._name     = t.name.toLowerCase();
      m._level    = level;
      m._reserve  = !!(t.isReserve || t.parentId);
      m._regions  = MAP_TEAM_REGIONS[t.name] || [];
      this._mapMarkers.push(m);
    }

    setTimeout(() => { map.invalidateSize(); this._mapDrawAll(); }, 80);
    this._mapBuildRegionList();
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
  _mapDrawGeo: function() {
    this._geoLyr.clearLayers();
    if (!document.getElementById('map-chk-geo')?.checked) return;
    const vis = this._mapVisiblePolyIds();
    const hasSel = !!this._selectedPolyIds?.size;
    const GS = {
      bundesland: {color:'#1a4fa8',fill:'#4488dd',fOp:0.04,w:2.5,op:0.6},
      ns_rb:      {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
      nrw_vfb:    {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
      rlp_vfb:    {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
      bw_vfb:     {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
      hh_base:    {color:'#1a4fa8',fill:'#4488dd',fOp:0.08,w:2.0,op:0.75},
      hh_outlier: {color:'#cc6600',fill:'#ff9900',fOp:0.18,w:2,op:0.85,dash:'6 3'},
      sonderfall: {color:'#cc0000',fill:'#ff4444',fOp:0.20,w:2,op:0.9,dash:'4 4'},
    };
    for (const r of MAP_GEO_REGIONS) {
      if (!r.geo?.geometry) continue;
      const geoId = 'geo_' + r.id;
      const inVis = vis && (vis.has(geoId) || vis.has(r.id));
      const s = GS[r.type] || GS['bundesland'];
      const fOp  = hasSel ? (inVis ? Math.min(s.fOp * 6, 0.38) : 0.01) : s.fOp;
      const w    = hasSel ? (inVis ? (s.w||2) + 1.5 : 0.7) : s.w||2;
      const op   = hasSel ? (inVis ? 1.0 : 0.18) : s.op||0.7;
      const col  = hasSel && !inVis ? '#777' : s.color;
      L.geoJSON(r.geo, { style: { color:col, weight:w, opacity:op,
        fillColor:s.fill, fillOpacity:fOp, dashArray:s.dash||null }
      }).on('click', () => App._mapTogglePoly(geoId))
        .bindTooltip(r.name, {sticky:true, className:'map-tip'})
        .addTo(this._geoLyr);
    }
  },

  // ── Konvexhüllen ──────────────────────────────────────────────────────────
  _mapDrawHulls: function() {
    this._hullLyr.clearLayers();
    if (!document.getElementById('map-chk-hull')?.checked) return;
    const vis = this._mapVisiblePolyIds();
    const hasSel = !!this._selectedPolyIds?.size;
    for (const p of MAP_HULL_POLYS) {
      const inVis = vis && vis.has(p.id);
      const s = p.style;
      const fOp  = hasSel ? (inVis ? Math.min(s.fOp * 4, 0.4) : 0.005) : s.fOp;
      const w    = hasSel ? (inVis ? s.w + 1.5 : 0.5) : s.w;
      const op   = hasSel ? (inVis ? 1.0 : 0.12) : s.op;
      const col  = hasSel && !inVis ? '#666' : s.color;
      const hull = this._hullMode === 'voronoi' ? (p.voronoiHull || p.hull)
               : this._hullMode === 'full'    ? (p.fullHull    || p.hull)
               :                                 (p.seasonHull  || p.hull);
      const isMulti = Array.isArray(hull[0]?.[0]);
      const style = { color:col, weight:w, opacity:op, fillColor:s.fill, fillOpacity:fOp, dashArray:s.dashArray||null };
      if (isMulti) {
        L.geoJSON({ type:'Feature', geometry:{ type:'MultiPolygon',
          coordinates: hull.map(ring => [ring.map(([lat,lon]) => [lon,lat])]) }},
          { style: () => style })
          .on('click', () => App._mapTogglePoly(p.id))
          .bindTooltip(`${p.label}`, {sticky:true, className:'map-tip'})
          .addTo(this._hullLyr);
      } else {
        L.polygon(hull, style)
          .on('click', () => App._mapTogglePoly(p.id))
          .bindTooltip(`${p.label}`, {sticky:true, className:'map-tip'})
          .addTo(this._hullLyr);
      }
      if (p.geoVar && p.dividers?.length && (!hasSel || inVis)) {
        for (const seg of p.dividers)
          L.polyline(seg, { color:s.color, weight:1.5, opacity:0.85, dashArray:'6 4', interactive:false }).addTo(this._hullLyr);
      }
      if (p.stufe <= 3 && (!hasSel || inVis)) {
        const mainRing = isMulti ? hull.reduce((a,b) => a.length>b.length?a:b) : hull;
        const cL = mainRing.reduce((a,x) => a+x[0], 0) / mainRing.length;
        const cO = mainRing.reduce((a,x) => a+x[1], 0) / mainRing.length;
        const icon = L.divIcon({ className:'', iconAnchor:[0,0],
          html:`<div style="font-size:${p.stufe===1?11:p.stufe===2?10:9}px;color:${s.color};font-weight:bold;white-space:nowrap;text-shadow:1px 1px 0 #fff,-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff;pointer-events:none;transform:translate(-50%,-50%)">${p.label}</div>`});
        L.marker([cL,cO], { icon, interactive:false, zIndexOffset:-1000 }).addTo(this._hullLyr);
      }
    }
  },

  // ── Vereinspunkte ─────────────────────────────────────────────────────────
  _mapDrawTeams: function() {
    this._teamLyr.clearLayers();
    if (!document.getElementById('map-chk-teams')?.checked) return;
    const q       = (document.getElementById('map-search')?.value || '').toLowerCase();
    const lvMin   = parseInt(document.getElementById('map-level-min')?.value) || 1;
    const lvMax   = parseInt(document.getElementById('map-level-max')?.value) || 8;
    const showRes = document.getElementById('map-chk-res')?.checked;
    const rFilter = this._mapActiveExcelFilters();
    let vis = 0;
    for (const m of this._mapMarkers) {
      const nameMatch = q && m._name.includes(q);
      if (!showRes && m._reserve && !nameMatch) continue;
      if (m._level >= 1 && m._level <= 8 && (m._level < lvMin || m._level > lvMax)) continue;
      if (q && !nameMatch) continue;
      if (rFilter && !m._regions.some(r => rFilter.has(r))) continue;
      m.addTo(this._teamLyr);
      vis++;
    }
    const el = document.getElementById('map-stat-vis');
    if (el) el.textContent = vis;
  },

  _mapDrawAll: function() { this._mapDrawGeo(); this._mapDrawHulls(); this._mapDrawTeams(); },

  // ── Saison-Sync: Marker-Farben an Engine-State anpassen ──────────────────
  _mapRefreshLevels: function() {
    if (!this._mapMarkers?.length) return;
    const TC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555555',99:'#999999'};
    const TR = {1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:2,99:2};
    const eng = typeof Engine !== 'undefined' ? Engine.teams : null;
    for (const m of this._mapMarkers) {
      const gd = GAME_DATA.teams[m._teamId];
      if (!gd) continue;
      const lid = eng?.[m._teamId]?.leagueId || gd.leagueId;
      const lv = GAME_DATA.leagues[lid]?.level || 99;
      m._level = lv;
      const col = TC[lv] || '#888';
      m.setStyle({ color: col, fillColor: col, radius: TR[lv] || 2 });
    }
    this._mapDrawTeams();
  },

  // ── Hüllen-Modus (faktisch ↔ Voronoi) ───────────────────────────────────
  _mapToggleHullMode: function() {
    this._hullMode = this._hullMode === 'actual' ? 'full' : this._hullMode === 'full' ? 'voronoi' : 'actual';
    const btn = document.getElementById('map-hull-mode-btn');
    const labels = {actual:'Saison', full:'Gesamt', voronoi:'Voronoi'};
    const bgs    = {actual:'#252540', full:'#2a2010', voronoi:'#1a3a2a'};
    if (btn) { btn.textContent = labels[this._hullMode]; btn.style.background = bgs[this._hullMode]; }
    this._mapDrawHulls();
  },

  // ── Region-Suchfeld ───────────────────────────────────────────────────────
  _mapAllRegions: null,
  _mapBuildRegionList: function() {
    const SC = {1:'#1a4fa8',2:'#1a7a35',3:'#b05000',4:'#7a00aa',5:'#8b0000',vw:'#005f8e'};
    const TL = {bundesland:'BL',ns_rb:'NS',nrw_vfb:'NRW',rlp_vfb:'RLP',bw_vfb:'BW',hh_base:'HH',hh_outlier:'HH⚠',sonderfall:'⚠',hull:'Hülle',vw:'VW'};
    const raw = [
      ...MAP_GEO_REGIONS.map(r => ({ id:'geo_'+r.id, label:r.name, type:r.type, stufe:r.stufe||2 })),
      ...MAP_HULL_POLYS.map(p => ({
        id:    p.id,
        label: p.label,
        type:  p.id.startsWith('rb_') ? 'vw' : 'hull',
        stufe: p.id.startsWith('rb_') ? 'vw' : p.stufe,
        geoVar:p.geoVar
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
