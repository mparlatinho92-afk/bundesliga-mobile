Object.assign(App, {
  _mapObj:     null,
  _mapMarkers: [],
  _geoLyr:     null,
  _hullLyr:    null,
  _teamLyr:    null,
  _polyIndex:  {},
  _activeRegionId: null,
  _sbLeagueId: null,

  _sbSortAsc: false,
  _sbTeamId: null,

  _mapOpenSteckbrief: function(teamId) {
    this._sbTeamId = teamId;
    this._renderSteckbrief();
    document.getElementById('map-steckbrief').style.width = '270px';
    setTimeout(() => { if (this._mapObj) this._mapObj.invalidateSize(); }, 230);
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
      ? regs.map(r => `<span style="display:inline-block;background:#252540;padding:1px 6px;border-radius:3px;margin:1px 2px 1px 0">${r}</span>`).join('')
      : '<span style="color:#555">–</span>';

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
    let histHtml = `<div style="margin-top:12px;border-top:1px solid #2a2a3a;padding-top:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:11px;font-weight:bold;color:#888">SAISON-HISTORIE</span>
        <button onclick="App._sbToggleSort()" style="background:none;border:1px solid #444;border-radius:3px;color:#aaa;font-size:10px;padding:1px 6px;cursor:pointer">${arrow} ${this._sbSortAsc ? 'Älteste zuerst' : 'Neueste zuerst'}</button>
      </div>`;

    if (!sorted.length) {
      histHtml += '<div style="font-size:11px;color:#555">Keine Daten</div>';
    } else {
      for (const r of sorted) {
        const isAkt = r.isCurrent;
        const bg    = isAkt ? 'background:#1a2a1a;' : '';
        const bold  = isAkt ? 'font-weight:bold;' : '';
        const lv    = GAME_DATA.leagues[r.leagueId]?.level || 99;
        const dot   = `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${LC[lv]||'#888'};margin-right:4px;flex-shrink:0"></span>`;
        const click = r.isCurrent
          ? `onclick="App._mapGotoLeague()"`
          : `onclick="App._mapGotoSeason(${r.histIdx},'${r.leagueId}')"`;
        histHtml += `<div ${click} style="display:flex;align-items:center;gap:4px;padding:4px 6px;border-radius:4px;cursor:pointer;${bg}margin-bottom:1px" onmouseover="this.style.background='#1e2a3a'" onmouseout="this.style.background='${isAkt?'#1a2a1a':''}'">
          ${dot}
          <div style="flex:1;min-width:0">
            <div style="font-size:11px;${bold}color:#ddd;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${r.ligaName}</div>
            <div style="font-size:10px;color:#666">${r.year}</div>
          </div>
          <div style="font-size:11px;color:#aaa;flex-shrink:0">${r.rank !== '–' ? 'Pl. '+r.rank : '–'}</div>
        </div>`;
      }
    }
    histHtml += '</div>';
    document.getElementById('sb-hist').innerHTML = histHtml;
  },

  _sbToggleSort: function() {
    this._sbSortAsc = !this._sbSortAsc;
    this._renderSteckbrief();
  },

  _mapCloseSteckbrief: function() {
    document.getElementById('map-steckbrief').style.width = '0';
    setTimeout(() => { if (this._mapObj) this._mapObj.invalidateSize(); }, 230);
  },

  _mapGotoLeague: function() {
    if (!this._sbLeagueId) return;
    this.viewHistoryOffset = null;
    this.closeMap();
    this.loadLeague(this._sbLeagueId);
  },

  _mapGotoSeason: function(histIdx, leagueId) {
    this.viewHistoryOffset = histIdx;
    this.matchdayViewIdx = null;
    this.zonesCache = null;
    this.closeMap();
    this.loadLeague(leagueId);
    this.updateStatus();
  },

  showMap: function() {
    document.getElementById('map-overlay').style.display = 'flex';
    if (!this._mapObj) this._initMap();
    else setTimeout(() => this._mapObj.invalidateSize(), 50);
  },

  closeMap: function() {
    document.getElementById('map-overlay').style.display = 'none';
    document.getElementById('map-steckbrief').style.width = '0';
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

    // Poly-Index aufbauen
    for (const r of MAP_GEO_REGIONS)  this._polyIndex['geo_' + r.id] = r;
    for (const p of MAP_HULL_POLYS)   this._polyIndex[p.id] = p;

    // Teams vorbereiten
    const TC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555555',99:'#999999'};
    const TR = {1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:2,99:2};
    this._mapMarkers = [];
    for (const t of Object.values(GAME_DATA.teams)) {
      if (t.lat === 0 && t.lon === 0) continue;
      const liga  = GAME_DATA.leagues[t.leagueId];
      const level = liga?.level || 99;
      const col   = TC[level] || '#888';
      const tid = t.id;
      const m = L.circleMarker([t.lat, t.lon], {
        radius: TR[level] || 2, color: col, fillColor: col, fillOpacity: 0.85, weight: 1
      }).on('click', () => App._mapOpenSteckbrief(tid));
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
    if (!this._activeRegionId) return null;
    const ids = new Set([this._activeRegionId]);
    if (document.getElementById('map-chk-parents')?.checked)   this._mapGetParents(this._activeRegionId).forEach(i => ids.add(i));
    if (document.getElementById('map-chk-children')?.checked)  this._mapGetChildren(this._activeRegionId).forEach(i => ids.add(i));
    if (document.getElementById('map-chk-siblings')?.checked)  (MAP_SIBLING_MAP[this._activeRegionId] || []).forEach(i => ids.add(i));
    return ids;
  },
  _mapActiveExcelFilters: function() {
    if (!this._activeRegionId) return null;
    const ids = this._mapVisiblePolyIds();
    const filters = new Set();
    for (const id of ids) {
      const poly = this._polyIndex[id];
      if (poly?.excelFilter) poly.excelFilter.forEach(f => filters.add(f));
    }
    return filters.size > 0 ? filters : null;
  },

  // ── Geo-Grenzen ───────────────────────────────────────────────────────────
  _mapDrawGeo: function() {
    this._geoLyr.clearLayers();
    if (!document.getElementById('map-chk-geo')?.checked) return;
    const vis = this._mapVisiblePolyIds();
    const GS = {
      bundesland: {color:'#1a4fa8',fill:'#4488dd',fOp:0.04,w:2.5,op:0.6},
      ns_rb:      {color:'#1a7a35',fill:'#33aa55',fOp:0.07,w:1.8,op:0.7},
      nrw_vfb:    {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
      bw_vfb:     {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
      hh_base:    {color:'#1a4fa8',fill:'#4488dd',fOp:0.08,w:2.0,op:0.75},
      hh_outlier: {color:'#cc6600',fill:'#ff9900',fOp:0.18,w:2,op:0.85,dash:'6 3'},
      sonderfall: {color:'#cc0000',fill:'#ff4444',fOp:0.20,w:2,op:0.9,dash:'4 4'},
    };
    for (const r of MAP_GEO_REGIONS) {
      const geoId = 'geo_' + r.id;
      if (vis && !vis.has(geoId) && !vis.has(r.id)) continue;
      if (!r.geo?.geometry) continue;
      const s = GS[r.type] || GS['bundesland'];
      L.geoJSON(r.geo, { style: { color:s.color, weight:s.w||2, opacity:s.op||0.7,
        fillColor:s.fill, fillOpacity:s.fOp||0.05, dashArray:s.dash||null }
      }).bindPopup(`<b>${r.name}</b>`).addTo(this._geoLyr);
    }
  },

  // ── Konvexhüllen ──────────────────────────────────────────────────────────
  _mapDrawHulls: function() {
    this._hullLyr.clearLayers();
    if (!document.getElementById('map-chk-hull')?.checked) return;
    const vis = this._mapVisiblePolyIds();
    for (const p of MAP_HULL_POLYS) {
      if (vis && !vis.has(p.id)) continue;
      const s = p.style;
      const lp = L.polygon(p.hull, {
        color:s.color, weight:s.w, opacity:s.op, fillColor:s.fill, fillOpacity:s.fOp,
        dashArray:s.dashArray||null
      }).bindPopup(`<b>${p.label}</b><br><small>Stufe ${p.stufe}${p.geoVar?' · geo-variabel':''}</small>`);
      lp.addTo(this._hullLyr);
      if (p.geoVar && p.dividers?.length) {
        for (const seg of p.dividers)
          L.polyline(seg, { color:s.color, weight:1.5, opacity:0.85, dashArray:'6 4', interactive:false }).addTo(this._hullLyr);
      }
      if (p.stufe <= 3) {
        const cL = p.hull.reduce((s,x) => s+x[0], 0) / p.hull.length;
        const cO = p.hull.reduce((s,x) => s+x[1], 0) / p.hull.length;
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
    const lv      = document.getElementById('map-level')?.value || 'all';
    const showRes = document.getElementById('map-chk-res')?.checked;
    const rFilter = this._mapActiveExcelFilters();
    let vis = 0;
    for (const m of this._mapMarkers) {
      if (!showRes && m._reserve) continue;
      if (lv !== 'all' && String(m._level) !== lv) continue;
      if (q && !m._name.includes(q)) continue;
      if (rFilter && !m._regions.some(r => rFilter.has(r))) continue;
      m.addTo(this._teamLyr);
      vis++;
    }
    const el = document.getElementById('map-stat-vis');
    if (el) el.textContent = vis;
  },

  _mapDrawAll: function() { this._mapDrawGeo(); this._mapDrawHulls(); this._mapDrawTeams(); },

  // ── Region-Suchfeld ───────────────────────────────────────────────────────
  _mapAllRegions: null,
  _mapBuildRegionList: function() {
    const SC = {1:'#1a4fa8',2:'#1a7a35',3:'#b05000',4:'#7a00aa',5:'#8b0000'};
    const TL = {bundesland:'BL',ns_rb:'NS',nrw_vfb:'NRW',bw_vfb:'BW',hh_base:'HH',hh_outlier:'HH⚠',sonderfall:'⚠',hull:'Hülle'};
    this._mapAllRegions = [
      ...MAP_GEO_REGIONS.map(r => ({ id:'geo_'+r.id, label:r.name, type:r.type, stufe:r.stufe||2 })),
      ...MAP_HULL_POLYS.map(p => ({ id:p.id, label:p.label, type:'hull', stufe:p.stufe, geoVar:p.geoVar }))
    ];
    this._mapAllRegions._SC = SC;
    this._mapAllRegions._TL = TL;
  },
  _mapShowRegionList: function() {
    const q   = (document.getElementById('map-region-search')?.value || '').toLowerCase();
    const rl  = document.getElementById('map-region-list');
    if (!rl || !this._mapAllRegions) return;
    const SC  = this._mapAllRegions._SC;
    const TL  = this._mapAllRegions._TL;
    const shown = this._mapAllRegions.filter(r => !q || r.label.toLowerCase().includes(q)).slice(0, 40);
    rl.innerHTML = shown.map(r => {
      const col = SC[r.stufe] || '#888';
      const tl  = TL[r.type] || '';
      const act = r.id === this._activeRegionId ? 'background:#2a3a6a;' : '';
      return `<div style="padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:6px;${act}" onclick="App._mapSelectRegion('${r.id.replace(/'/g,"\\'")}','${r.label.replace(/'/g,"\\'")}')">` +
        `<span style="font-size:9px;padding:1px 4px;border-radius:3px;color:#fff;background:${col};flex-shrink:0">${tl} ${r.stufe}</span>` +
        `<span style="font-size:12px">${r.label}</span></div>`;
    }).join('') || '<div style="padding:8px 10px;color:#888;font-size:12px">Keine Treffer</div>';
    rl.style.display = 'block';
  },
  _mapSelectRegion: function(id, label) {
    this._activeRegionId = id;
    const inp = document.getElementById('map-region-search');
    if (inp) inp.value = label;
    document.getElementById('map-region-list').style.display = 'none';
    this._mapDrawAll();
  },
  _mapClearRegion: function() {
    this._activeRegionId = null;
    const inp = document.getElementById('map-region-search');
    if (inp) inp.value = '';
    this._mapDrawAll();
  },
});
