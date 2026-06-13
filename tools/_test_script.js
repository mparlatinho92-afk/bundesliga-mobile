
const TC={"1":"#cc0000","2":"#cc4400","3":"#bb7700","4":"#446600","5":"#1a7a35","6":"#006688","7":"#1a4fa8","8":"#555555","99":"#999999"};
const TR={"1":8,"2":7,"3":6,"4":5,"5":4,"6":3,"7":3,"8":2,"99":2};
const GS={"bundesland":{"color":"#1a4fa8","fill":"#4488dd","fOp":0.04,"w":2.5,"op":0.6},"ns_rb":{"color":"#1a4fa8","fill":"#4488dd","fOp":0.06,"w":2,"op":0.7},"nrw_vfb":{"color":"#1a4fa8","fill":"#4488dd","fOp":0.06,"w":2,"op":0.7},"bw_vfb":{"color":"#1a4fa8","fill":"#4488dd","fOp":0.06,"w":2,"op":0.7},"hh_base":{"color":"#1a4fa8","fill":"#4488dd","fOp":0.08,"w":2,"op":0.75},"hh_outlier":{"color":"#cc6600","fill":"#ff9900","fOp":0.18,"w":2,"op":0.85,"dashArray":"6 3"},"sonderfall":{"color":"#cc0000","fill":"#ff4444","fOp":0.2,"w":2,"op":0.9,"dashArray":"4 4"}};

const GEO_REGIONS = JSON.parse(document.getElementById('d-geo').textContent);
const HULL_POLYS  = JSON.parse(document.getElementById('d-hulls').textContent);
const TEAMS       = JSON.parse(document.getElementById('d-teams').textContent);
const HIER        = JSON.parse(document.getElementById('d-hier').textContent);
const SMAP        = JSON.parse(document.getElementById('d-sibs').textContent);

const map=L.map('map',{center:[51.2,10.4],zoom:6,preferCanvas:true});
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png',
  {attribution:'© OpenStreetMap © CARTO',maxZoom:19}).addTo(map);
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}{r}.png',
  {attribution:'',maxZoom:19,pane:'shadowPane'}).addTo(map);

const geoLyr  = L.layerGroup().addTo(map);
const hullLyr = L.layerGroup().addTo(map);
const teamLyr = L.layerGroup().addTo(map);

// ── Region-Filter-State ─────────────────────────────────────────────────────
let selectedPolyIds = new Set();
let hullMode = 'actual'; // 'actual' | 'voronoi'

// Eltern-Nachschlag
function getParents(id) {
  const parents = [];
  for (const [pid, children] of Object.entries(HIER))
    if (children.includes(id)) parents.push(pid, ...getParents(pid));
  return [...new Set(parents)];
}
function getChildren(id) {
  const ch = HIER[id] || [];
  return [...new Set([...ch, ...ch.flatMap(c=>getChildren(c))])];
}
function visiblePolyIds() {
  if (!selectedPolyIds.size) return null;
  const ids = new Set(selectedPolyIds);
  if (document.getElementById('chkParents').checked)
    for (const id of selectedPolyIds) getParents(id).forEach(i=>ids.add(i));
  if (document.getElementById('chkChildren').checked)
    for (const id of selectedPolyIds) getChildren(id).forEach(i=>ids.add(i));
  if (document.getElementById('chkSiblings').checked)
    for (const id of selectedPolyIds) (SMAP[id]||[]).forEach(i=>ids.add(i));
  return ids;
}

const POLY_INDEX = {};
function buildPolyIndex() {
  for (const r of GEO_REGIONS) POLY_INDEX['geo_'+r.id] = r;
  for (const p of HULL_POLYS)  POLY_INDEX[p.id] = p;
}
function getActiveExcelFilters() {
  if (!selectedPolyIds.size) return null;
  const ids = visiblePolyIds();
  const filters = new Set();
  for (const id of ids) {
    const poly = POLY_INDEX[id];
    if (poly?.excelFilter) poly.excelFilter.forEach(f=>filters.add(f));
  }
  return filters.size > 0 ? filters : null;
}

// ── Echte Grenzen ───────────────────────────────────────────────────────────
function drawGeo() {
  geoLyr.clearLayers();
  if (!document.getElementById('chkGeo').checked) return;
  const vis = visiblePolyIds();
  const hasSel = selectedPolyIds.size > 0;
  for (const r of GEO_REGIONS) {
    if (!r.geo?.geometry) continue;
    const geoId = 'geo_' + r.id;
    const inVis = vis && (vis.has(geoId) || vis.has(r.id));
    const s = GS[r.type] || GS['bundesland'];
    const fOp = hasSel ? (inVis ? Math.min((s.fOp||0.05)*6,0.38) : 0.01) : (s.fOp||0.05);
    const w   = hasSel ? (inVis ? (s.w||2)+1.5 : 0.7) : (s.w||2);
    const op  = hasSel ? (inVis ? 1.0 : 0.18) : (s.op||0.7);
    const col = hasSel && !inVis ? '#777' : s.color;
    L.geoJSON(r.geo, {
      style:{color:col,weight:w,opacity:op,fillColor:s.fill,fillOpacity:fOp,dashArray:s.dashArray||null}
    }).on('click',()=>togglePoly(geoId))
      .bindTooltip(r.name+(r.note?' · '+r.note:''),{sticky:true,className:'map-tip'})
      .addTo(geoLyr);
  }
}

// ── Konvexhüllen ────────────────────────────────────────────────────────────
function drawHulls() {
  hullLyr.clearLayers();
  if (!document.getElementById('chkHull').checked) return;
  const vis = visiblePolyIds();
  const hasSel = selectedPolyIds.size > 0;
  for (const p of HULL_POLYS) {
    const inVis = vis && vis.has(p.id);
    const s = p.style;
    const fOp = hasSel ? (inVis ? Math.min(s.fOp*4,0.4) : 0.005) : s.fOp;
    const w   = hasSel ? (inVis ? s.w+1.5 : 0.5) : s.w;
    const op  = hasSel ? (inVis ? 1.0 : 0.12) : s.op;
    const col = hasSel && !inVis ? '#666' : s.color;
    const hull = hullMode==='voronoi' ? (p.voronoiHull||p.hull) : p.hull;
    L.polygon(hull,{
      color:col,weight:w,opacity:op,fillColor:s.fill,fillOpacity:fOp,dashArray:s.dashArray||null
    }).on('click',()=>togglePoly(p.id))
      .bindTooltip(p.label+' (Stufe '+p.stufe+')',{sticky:true,className:'map-tip'})
      .addTo(hullLyr);
    if (p.geoVar && p.dividers?.length && (!hasSel||inVis)) {
      for (const seg of p.dividers)
        L.polyline(seg,{color:s.color,weight:1.5,opacity:0.85,dashArray:'6 4',interactive:false}).addTo(hullLyr);
    }
    if (p.stufe<=3 && (!hasSel||inVis)) {
      const cL=hull.reduce((a,x)=>a+x[0],0)/hull.length;
      const cO=hull.reduce((a,x)=>a+x[1],0)/hull.length;
      L.marker([cL,cO],{icon:L.divIcon({className:'',iconAnchor:[0,0],
        html:'<div style="font-size:'+(p.stufe===1?11:p.stufe===2?10:9)+'px;color:'+s.color+';font-weight:bold;white-space:nowrap;text-shadow:1px 1px 0 #fff,-1px -1px 0 #fff,1px -1px 0 #fff,-1px 1px 0 #fff;pointer-events:none;transform:translate(-50%,-50%)">'+p.label+'</div>'}),
        interactive:false,zIndexOffset:-1000}).addTo(hullLyr);
    }
  }
}
function toggleHullMode() {
  hullMode = hullMode==='actual' ? 'voronoi' : 'actual';
  const btn=document.getElementById('hull-mode-btn');
  if (btn) btn.style.background=hullMode==='voronoi'?'#e8f5e9':'#fff';
  drawHulls();
}

// ── Vereinspunkte ───────────────────────────────────────────────────────────
function drawTeams() {
  teamLyr.clearLayers();
  if (!document.getElementById('chkTeams').checked){document.getElementById('sV').textContent='(aus)';return;}
  const q=document.getElementById('teamSearch').value.toLowerCase();
  const lvMin=parseInt(document.getElementById('lvl-min').value)||1;
  const lvMax=parseInt(document.getElementById('lvl-max').value)||8;
  const showR=document.getElementById('chkR').checked;
  const regionFilter=getActiveExcelFilters();
  let vis=0;
  for(const t of TEAMS){
    const nameMatch=q&&t.name.toLowerCase().includes(q);
    if(!showR&&t.isReserve&&!nameMatch)continue;
    if(t.level>=1&&t.level<=8&&(t.level<lvMin||t.level>lvMax))continue;
    if(q&&!nameMatch)continue;
    if(regionFilter&&!t.regions.some(r=>regionFilter.has(r)))continue;
    const col=TC[t.level]||'#888', r=TR[t.level]||3;
    L.circleMarker([t.lat,t.lon],{
      radius:r,color:t.fromEuroplan?'#1a7a35':col,
      fillColor:col,fillOpacity:0.85,weight:t.fromEuroplan?2:1
    }).bindTooltip('<b>'+t.name+'</b><br>'+t.liga,{sticky:true,className:'map-tip'})
      .bindPopup('<div class="pname">'+t.name+'</div><div class="pliga">Level '+t.level+' – '+t.liga+'</div><div class="pcoord">'+t.lat.toFixed(5)+', '+t.lon.toFixed(5)+'</div>'+(t.fromEuroplan?'<div class="pep">✓ europlan</div>':'')).addTo(teamLyr);
    vis++;
  }
  document.getElementById('sV').textContent=vis;
}

function drawAll(){drawGeo();drawHulls();drawTeams();}

// ── Region-Suchfeld & Liste ─────────────────────────────────────────────────
// Alle Regionen mit ID und Label zusammenfassen
const ALL_REGIONS = [
  ...GEO_REGIONS.map(r=>({id:'geo_'+r.id, label:r.name, type:r.type, stufe:r.stufe||2})),
  ...HULL_POLYS.map(p=>({id:p.id, label:p.label, type:'hull', stufe:p.stufe, geoVar:p.geoVar}))
];

const STUFE_COLORS={1:'#1a4fa8',2:'#1a7a35',3:'#b05000',4:'#7a00aa',5:'#8b0000'};
const TYPE_LABELS={bundesland:'BL',ns_rb:'NS',nrw_vfb:'NRW',bw_vfb:'BW',hh_base:'HH',hh_outlier:'HH⚠',sonderfall:'⚠',hull:'Hülle'};

function buildRegionList(filter='') {
  const rl=document.getElementById('regionList');
  const q=filter.toLowerCase();
  const shown=ALL_REGIONS.filter(r=>!q||r.label.toLowerCase().includes(q)).slice(0,40);
  rl.innerHTML=shown.map(r=>{
    const col=STUFE_COLORS[r.stufe]||'#888';
    const tl=TYPE_LABELS[r.type]||'';
    const sel=selectedPolyIds.has(r.id);
    const bg=sel?'background:#1e3a6a;color:#fff':'';
    const chk=sel?'<span style="color:#4fc3f7;font-weight:bold;margin-right:2px">✓</span>':'';
    return '<div class="rItem" style="'+bg+'" onclick="togglePoly(''+r.id.replace(/'/g,"\'")+'')">'+
      '<span class="rBadge" style="background:'+col+'">'+tl+' '+r.stufe+'</span>'+chk+
      '<span>'+r.label+'</span></div>';
  }).join('');
  if(!shown.length)rl.innerHTML='<div class="rItem" style="color:#999">Keine Treffer</div>';
  rl.style.display='block';
}
function filterRegionList(){buildRegionList(document.getElementById('regionSearch').value);}
function showRegionList(){buildRegionList(document.getElementById('regionSearch').value);}
function hideRL(){document.getElementById('regionList').style.display='none';}

function updateSelectionLabel(){
  const inp=document.getElementById('regionSearch');
  if(!inp) return;
  const n=selectedPolyIds.size;
  if(n===0){inp.value='';return;}
  if(n===1){const id=[...selectedPolyIds][0];const r=ALL_REGIONS.find(x=>x.id===id);inp.value=r?.label||id;}
  else inp.value=n+' ausgewählt';
}
function togglePoly(id){
  if(selectedPolyIds.has(id)) selectedPolyIds.delete(id);
  else selectedPolyIds.add(id);
  updateSelectionLabel();
  drawAll();
}
function clearRegionFilter(){
  selectedPolyIds.clear();
  document.getElementById('regionSearch').value='';
  drawAll();
}

// ── Init ───────────────────────────────────────────────────────────────────
buildPolyIndex();
drawAll();
document.getElementById('sT').textContent=TEAMS.length;
