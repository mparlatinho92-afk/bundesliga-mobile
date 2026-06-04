Object.assign(App, {
  _mapObj: null,

  showMap: function() {
    document.getElementById('map-overlay').style.display = 'flex';
    if (!this._mapObj) this._initMap();
    else setTimeout(() => this._mapObj.invalidateSize(), 50);
  },

  closeMap: function() {
    document.getElementById('map-overlay').style.display = 'none';
  },

  _initMap: function() {
    if (typeof L === 'undefined') {
      document.getElementById('map-leaflet').innerHTML =
        '<div style="padding:40px;color:#f44;text-align:center">Leaflet nicht geladen – Internetverbindung erforderlich.</div>';
      return;
    }

    const TC = {1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555555',99:'#999999'};
    const TR = {1:8,2:7,3:6,4:5,5:4,6:3,7:2,8:2,99:2};

    const map = L.map('map-leaflet', { center: [51.2, 10.4], zoom: 6, preferCanvas: true });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
      { attribution: '© OpenStreetMap © CARTO', maxZoom: 19 }).addTo(map);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
      { attribution: '', maxZoom: 19, pane: 'shadowPane' }).addTo(map);

    this._mapObj = map;
    this._mapMarkers = [];

    for (const t of Object.values(GAME_DATA.teams)) {
      if (t.lat === 0 && t.lon === 0) continue;
      const liga  = GAME_DATA.leagues[t.leagueId];
      const level = liga?.level || 99;
      const col   = TC[level] || '#888';
      const m = L.circleMarker([t.lat, t.lon], {
        radius: TR[level] || 2, color: col, fillColor: col, fillOpacity: 0.85, weight: 1
      }).bindPopup(`<b>${t.name}</b><br><span style="font-size:11px;color:#666">${liga?.name || '–'} · Level ${level}</span>`);
      m._teamName  = t.name.toLowerCase();
      m._teamLevel = level;
      m.addTo(map);
      this._mapMarkers.push(m);
    }

    setTimeout(() => map.invalidateSize(), 80);
    this._applyMapFilter();
  },

  _applyMapFilter: function() {
    if (!this._mapObj) return;
    const q  = (document.getElementById('map-search')?.value || '').toLowerCase();
    const lv = document.getElementById('map-level')?.value || 'all';
    for (const m of (this._mapMarkers || [])) {
      const show = (!q || m._teamName.includes(q)) &&
                   (lv === 'all' || String(m._teamLevel) === lv);
      show ? m.addTo(this._mapObj) : m.remove();
    }
  },
});
