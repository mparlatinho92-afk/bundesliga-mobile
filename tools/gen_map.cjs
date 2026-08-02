/**
 * Generiert tools/koordinaten_karte.html
 * Echte Verbandsgrenzen (aus build_geo.cjs) + Konvexhüllen pro Spielregion.
 * Filter: einzelne Polygone + Eltern/Kinder auswählen.
 */

const fs   = require('fs');
const path = require('path');
const XLSX = require('xlsx');

// ── Daten laden ────────────────────────────────────────────────────────────────
const src = fs.readFileSync(path.join(__dirname,'..','game_data.js'),'utf8');
eval(src.replace('const GAME_DATA','var GAME_DATA'));

const wb   = XLSX.readFile(path.join(__dirname,'..','Tournament Manager 2023 neu - Vereine Übersicht Ligen Zuordnung.xlsx'));
const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
const coordMap = {};
for (const t of Object.values(GAME_DATA.teams))
  if (!(t.lat===0&&t.lon===0)) coordMap[t.name]={lat:t.lat,lon:t.lon};

// rawCoordMap: alle Koordinaten inkl. Fehler (lat=0,lon=0) – für Hüll-Berechnung mit Fehler-Sichtbarkeit
const rawCoordMap = {};
for (const t of Object.values(GAME_DATA.teams))
  rawCoordMap[t.name]={lat:t.lat,lon:t.lon};

// Excel nutzt "1.FC" ohne Leerzeichen, game_data nutzt "1. FC" → normalisieren
const normExcelName = s => s.replace(/\.(?=[A-ZÜÄÖA-Z0-9])/g, '. ').replace(/\s+/g,' ').trim();
// Regionen-Korrekturen für Teams die im Excel fehlen oder falsche s1-s5 Werte haben
// Format: name → {s1, s2, s3, s4, s5} – überschreibt Excel-Werte nach dem Einlesen
const REGION_OVERRIDES = {
  'SKV Rot-Weiß Darmstadt': { s1:'Regionalliga Südwest', s2:'Hessen', s3:'Hessen Süd', s4:'', s5:'' },
};

const MANUAL_ALIASES = {
  'SV Laubach':               'SG Vordereifel/SV Laubach',
  'Sportfreunde Neitersen':   'SG Neitersen/Altenkirchen',
  'FK Pirmasens':             'FK 03 Pirmasens',
  'VfR Fischeln':             'VfR Krefeld-Fischeln',
  'Arminia Bielefeld':        'DSC Arminia Bielefeld',
  'TSV Emmelshausen':         'FC Emmelshausen-Karbach',
  'FV Lebach':                'SG Lebach-Landsweiler',
  'Schwaben Augsburg':        'TSV Schwaben Augsburg',
  'SV Viktoria Aschaffenburg':'SV Viktoria 01 Aschaffenburg',
};

const excelTeams = rows.filter(r=>r.__EMPTY_1).map(r=>{
  const rawName = r.__EMPTY_1;
  const normName = normExcelName(rawName);
  const alias = MANUAL_ALIASES[rawName] || MANUAL_ALIASES[normName] || null;
  const coord = coordMap[rawName] || coordMap[normName] || (alias ? coordMap[alias] : null) || null;
  const resolvedName = alias && coordMap[alias] ? alias
    : coord ? (coordMap[normName] ? normName : rawName) : rawName;
  const rawCoord = rawCoordMap[resolvedName] || rawCoordMap[rawName] || rawCoordMap[normName] || null;
  return { name: resolvedName,
    s1:r['Regionen-Stufe 1']||'', s2:r['Regionen-Stufe 2']||'',
    s3:r['Regionen-Stufe 3']||'', s4:r['Regionen-Stufe 4']||'', s5:r['Regionen-Stufe 5']||'',
    coord, rawCoord };
}).filter(t=>t.coord||t.rawCoord);

// REGION_OVERRIDES anwenden: überschreibt s1-s5 für spezifische Teams
// (für Teams die im Excel fehlen oder falsche Regionen-Werte haben)
for (const t of excelTeams) {
  const ov = REGION_OVERRIDES[t.name];
  if (ov) { if(ov.s1!==undefined)t.s1=ov.s1; if(ov.s2!==undefined)t.s2=ov.s2; if(ov.s3!==undefined)t.s3=ov.s3; if(ov.s4!==undefined)t.s4=ov.s4; if(ov.s5!==undefined)t.s5=ov.s5; }
}
// REGION_OVERRIDES auch für game_data-Teams die nicht im Excel stehen
for (const [name, ov] of Object.entries(REGION_OVERRIDES)) {
  if (!excelTeams.find(t => t.name === name)) {
    const gdt = Object.values(GAME_DATA.teams).find(t => t.name === name);
    if (gdt) {
      const rc = rawCoordMap[name];
      excelTeams.push({ name, s1:ov.s1||'', s2:ov.s2||'', s3:ov.s3||'', s4:ov.s4||'', s5:ov.s5||'',
        coord: coordMap[name]||null, rawCoord: rc||null });
    }
  }
}

const geoRegions = JSON.parse(fs.readFileSync(path.join(__dirname,'geo_football_regions.json'),'utf8'));

// ── Spike-Entfernung: einzelne Umkehr-Punkte aus Polygon-Ringen entfernen ──────
function removeArtifactPoints(ring, angleThresh = 30, excessThresh = 0.20, segRatio = 0.65) {
  const d = (A, B) => Math.hypot(A[0]-B[0], A[1]-B[1]);
  const deg = (A, B, C) => {
    const u = [A[0]-B[0], A[1]-B[1]], v = [C[0]-B[0], C[1]-B[1]];
    const lu = Math.hypot(...u), lv = Math.hypot(...v);
    if (!lu || !lv) return 180;
    return Math.acos(Math.max(-1, Math.min(1, (u[0]*v[0]+u[1]*v[1])/(lu*lv)))) * 180 / Math.PI;
  };
  let pts = ring[0] === ring[ring.length-1] ? ring.slice(0,-1) : ring.slice();
  let changed = true;
  while (changed) {
    changed = false;
    const n = pts.length;
    if (n < 4) break;
    let segs = pts.map((p,i) => d(p, pts[(i+1)%n]));
    let mean = segs.reduce((a,b)=>a+b,0) / n;
    for (let i = 0; i < pts.length; ) {
      const nn = pts.length;
      const A = pts[(i-1+nn)%nn], B = pts[i], C = pts[(i+1)%nn];
      const sv = segs[(i-1+nn)%nn], sn = segs[i];
      let remove = deg(A, B, C) < angleThresh;
      if (!remove && sv < segRatio*mean && sn < segRatio*mean) {
        const ac = d(A, C);
        if (ac > 0 && (sv+sn-ac)/ac > excessThresh) remove = true;
      }
      if (remove) {
        pts.splice(i, 1); changed = true;
        const nn2 = pts.length;
        segs = pts.map((p,j) => d(p, pts[(j+1)%nn2]));
        mean = segs.reduce((a,b)=>a+b,0) / nn2;
      } else { i++; }
    }
  }
  return pts.length ? [...pts, pts[0]] : ring;
}

// ── Konvex-Hülle ───────────────────────────────────────────────────────────────
function convexHull(pts) {
  if(pts.length<3)return pts.slice();
  const p=pts.slice().sort((a,b)=>a[1]!==b[1]?a[1]-b[1]:a[0]-b[0]);
  const cross=(O,A,B)=>(A[0]-O[0])*(B[1]-O[1])-(A[1]-O[1])*(B[0]-O[0]);
  const lo=[],hi=[];
  for(const x of p){while(lo.length>=2&&cross(lo[lo.length-2],lo[lo.length-1],x)<=0)lo.pop();lo.push(x);}
  for(let i=p.length-1;i>=0;i--){const x=p[i];while(hi.length>=2&&cross(hi[hi.length-2],hi[hi.length-1],x)<=0)hi.pop();hi.push(x);}
  hi.pop();lo.pop();return lo.concat(hi);
}
function bufferHull(hull,f){
  const cL=hull.reduce((s,p)=>s+p[0],0)/hull.length, cO=hull.reduce((s,p)=>s+p[1],0)/hull.length;
  return hull.map(([la,lo])=>[cL+(la-cL)*f, cO+(lo-cO)*f]);
}
function makeHull(pts,buf=1.06){
  if(pts.length<3)return null;
  const h=convexHull(pts);
  if(h.length<3)return null;
  return bufferHull(h,buf);
}
// pts: nur valide Koordinaten (für Voronoi-Berechnung)
function pts(filter){return excelTeams.filter(t=>t.coord).filter(filter).map(t=>[t.coord.lat,t.coord.lon]);}
// seasonPts: alle Excel-Teams mit Koordinaten inkl. Fehler (lat=0,lon=0 → sprengt Polygon sichtbar)
function seasonPts(filter){return excelTeams.filter(t=>t.rawCoord).filter(filter).map(t=>[t.rawCoord.lat,t.rawCoord.lon]);}

// ── Trennlinien-Berechnung für Sibling-Combos ─────────────────────────────────
// Schneidet eine unendliche Linie P+t*D am Polygon-Rand → Liniensegment [A,B] oder null
function clipLineToHull(P, D, hull) {
  // Löst P + t*D = A + s*(B-A)
  // t = (fLa*eLo - fLo*eLa) / det,  s = (fLa*dLo - fLo*dLa) / det
  // fLa = P[0]-A[0], fLo = P[1]-A[1],  det = dLo*eLa - dLa*eLo
  const tVals=[];
  for(let i=0;i<hull.length;i++){
    const A=hull[i], B=hull[(i+1)%hull.length];
    const dLa=D[0], dLo=D[1], eLa=B[0]-A[0], eLo=B[1]-A[1];
    const det=dLo*eLa - dLa*eLo;
    if(Math.abs(det)<1e-10) continue;
    const fLa=P[0]-A[0], fLo=P[1]-A[1];
    const t=(fLa*eLo - fLo*eLa)/det;   // korrektes Vorzeichen
    const s=(fLa*dLo - fLo*dLa)/det;   // korrektes Vorzeichen
    if(s>=-0.001&&s<=1.001) tVals.push(t);
  }
  if(tVals.length<2) return null;
  tVals.sort((a,b)=>a-b);
  const t1=tVals[0], t2=tVals[tVals.length-1];
  if(Math.abs(t2-t1)<0.001) return null;
  return [[P[0]+t1*D[0],P[1]+t1*D[1]],[P[0]+t2*D[0],P[1]+t2*D[1]]];
}

// Berechnet gestrichelte Trennlinien für ein Sibling-Combo-Polygon
function computeDividers(combo, hull) {
  const centers=(combo.centerIds||[]).map(id=>LEAGUE_CENTERS[id]).filter(Boolean);
  if(centers.length<2) return [];
  const dividers=[];

  if(combo.axis==='lat'){
    // Nord/Süd-Split: horizontale Linien auf den Mittelpunkten zwischen benachbarten Zentroiden
    const lats=centers.map(c=>c.lat).sort((a,b)=>b-a); // absteigend
    for(let i=0;i<lats.length-1;i++){
      const midLat=(lats[i]+lats[i+1])/2;
      const midLon=hull.reduce((s,p)=>s+p[1],0)/hull.length;
      const seg=clipLineToHull([midLat,midLon],[0,1],hull);
      if(seg) dividers.push(seg);
    }
  } else {
    // axis:'geo' — senkrechte Bisektrice(n) zwischen benachbarten Zentroiden
    if(centers.length===2){
      const M=[(centers[0].lat+centers[1].lat)/2,(centers[0].lon+centers[1].lon)/2];
      const AB=[centers[1].lat-centers[0].lat, centers[1].lon-centers[0].lon];
      const perp=[-AB[1], AB[0]];
      const seg=clipLineToHull(M,perp,hull);
      if(seg) dividers.push(seg);
    } else {
      // 3+ Zentroide: Bisektrizen zwischen je zwei benachbarten Zentroiden
      // Zentroide nach Abstand sortieren (nächste Paare bilden)
      for(let i=0;i<centers.length-1;i++){
        for(let j=i+1;j<centers.length;j++){
          const A=centers[i], B=centers[j];
          const M=[(A.lat+B.lat)/2,(A.lon+B.lon)/2];
          const AB=[B.lat-A.lat, B.lon-A.lon];
          const perp=[-AB[1], AB[0]];
          const seg=clipLineToHull(M,perp,hull);
          if(seg) dividers.push(seg);
        }
      }
    }
  }
  return dividers;
}

// ── LEAGUE_CENTERS (Schwerpunkte für Trennlinien-Berechnung) ───────────────────
const LEAGUE_CENTERS={
  "5-8": {lat:52.8,lon:13.1}, "5-9": {lat:51.0,lon:12.0},
  "5-13":{lat:49.5,lon:11.0}, "5-14":{lat:48.3,lon:11.5},
  "6-10":{lat:54.5,lon:9.2},  "6-11":{lat:54.1,lon:10.3},
  "6-12":{lat:53.65,lon:9.9}, "6-13":{lat:53.5,lon:10.15},
  "6-25":{lat:51.7,lon:8.1},  "6-26":{lat:51.1,lon:7.9},
  "6-27":{lat:51.2,lon:6.7},  "6-28":{lat:51.6,lon:6.6},
  "6-29":{lat:50.7,lon:7.1},  "6-30":{lat:50.7,lon:6.5},
  "6-31":{lat:49.5,lon:10.6}, "6-32":{lat:49.7,lon:12.8},
  "6-33":{lat:48.7,lon:11.4}, "6-34":{lat:47.9,lon:10.8}, "6-35":{lat:47.9,lon:12.3},
  "7-3": {lat:50.1,lon:6.6},  "7-4": {lat:50.3,lon:7.0},  "7-5": {lat:50.6,lon:7.5},
  "7-6": {lat:49.5,lon:7.0},  "7-7": {lat:49.2,lon:6.8},
  "7-8": {lat:52.52,lon:13.38},"7-9":{lat:52.52,lon:13.42}
};

// ── Sibling-Gruppen (geo-variabel, kombiniert) ─────────────────────────────────
const SIBLING_COMBOS=[
  // centerIds = LEAGUE_CENTERS-Schlüssel, axis = 'geo'|'lat' (aus game_engine.js SIBLING_GROUPS)
  {id:'sg_hammonia_hansa',  label:'Hammonia + Hansa',      stufe:3, s3keys:['Hammonia','Hansa'],                                                 centerIds:['6-12','6-13'], axis:'geo'},
  {id:'sg_schleswig_hol',   label:'Schleswig + Holstein',  stufe:3, s3keys:['Schleswig','Holstein'],                                             centerIds:['6-10','6-11'], axis:'geo'},
  {id:'sg_wf12',            label:'Westfalen 1+2',         stufe:3, s3keys:['Westfalen 1 (Münsterland/OWL)','Westfalen 2 (Südwestfalen)'],        centerIds:['6-25','6-26'], axis:'geo'},
  {id:'sg_nr12',            label:'Niederrhein 1+2',       stufe:3, s3keys:['Niederrhein 1 (Süd)','Niederrhein 2 (Nord)'],                       centerIds:['6-27','6-28'], axis:'geo'},
  {id:'sg_mr12',            label:'Mittelrhein 1+2',       stufe:3, s3keys:['Mittelrhein 1 (Ost)','Mittelrhein 2 (West)'],                       centerIds:['6-29','6-30'], axis:'geo'},
  {id:'sg_bay_nwnо',        label:'Bayern NW + NO',        stufe:3, s3keys:['Bayern Nordwest','Bayern Nordost'],                                  centerIds:['6-31','6-32'], axis:'geo'},
  {id:'sg_bay_msw',         label:'Bayern M + SW + SO',    stufe:3, s3keys:['Bayern Mitte','Bayern Südwest','Bayern Südost'],                     centerIds:['6-33','6-34','6-35'], axis:'geo'},
  {id:'sg_rhld',            label:'Rheinland W+M+O',       stufe:4, s4keys:['Rheinland West','Rheinland Mitte','Rheinland Ost'],                  centerIds:['7-3','7-4','7-5'], axis:'geo'},
  {id:'sg_saar',            label:'Saarland NO+SW',        stufe:4, s4keys:['Saarland Nord-Ost','Saarland Süd-West'],                            centerIds:['7-6','7-7'], axis:'geo'},
];
const siblingS3=new Set(SIBLING_COMBOS.filter(g=>g.s3keys).flatMap(g=>g.s3keys));
const siblingS4=new Set(SIBLING_COMBOS.filter(g=>g.s4keys).flatMap(g=>g.s4keys));

// ── Polygon-Definitionen ───────────────────────────────────────────────────────
const STYLE={
  1:{color:'#1a4fa8',fill:'#4488dd',fOp:0.05,w:2.5,op:0.65,buf:1.08},
  2:{color:'#1a7a35',fill:'#33aa55',fOp:0.07,w:2.0,op:0.70,buf:1.08},
  3:{color:'#b05000',fill:'#e07800',fOp:0.10,w:1.8,op:0.80,buf:1.08},
  4:{color:'#7a00aa',fill:'#aa33dd',fOp:0.12,w:1.5,op:0.80,buf:1.08},
  5:{color:'#8b0000',fill:'#cc2200',fOp:0.14,w:1.5,op:0.80,buf:1.08},
};

// ── Polygon-Hierarchie: parent → [child-ids] ────────────────────────────────
// Definiert welche Regionen "Kinder" einer anderen sind
const HIER = {
  // Regionalliga Nordost
  'hull_nordost_nord':['hull_berlin','hull_brandenbg','hull_mv'],
  'hull_nordost_sued':['hull_sachsen','hull_saan','hull_thuer'],
  // Regionalliga Nord
  'hull_nord':['geo_schleswig_holstein','geo_ns_weser_ems','geo_ns_luneburg','geo_ns_hannover','geo_ns_braunschweig','geo_bremen','geo_hh_gesamt','sg_schleswig_hol','hh_outlier_hansa'],
  'geo_hh_gesamt':['sg_hammonia_hansa','hh_outlier_hansa'],
  'geo_schleswig_holstein':['sg_schleswig_hol'],
  // Regionalliga West
  'geo_nrw_westfalen':['sg_wf12'],
  'geo_nrw_niederrhein':['sg_nr12','geo_sonderfall_bocholt'],
  'geo_nrw_mittelrhein':['sg_mr12'],
  // Rheinland-Pfalz/Saar VFB
  'geo_rlp_swfv':['hull_s3_s_dwestdeutscher_fu_ballverband'],
  'geo_rlp_fvr': ['hull_s3_fu_ballverband_rheinland'],
  // Regionalliga Bayern
  'hull_bay_nord':['sg_bay_nwnо'],
  'hull_bay_sued':['sg_bay_msw'],
  // Regionalliga Südwest
  'hull_suedwest':['hull_hessen','hull_rlp','geo_saarland','geo_bw_badisch','geo_bw_suedbaden','geo_bw_wuerttemberg'],
  'hull_hessen':['hull_hessen_n','hull_hessen_m','hull_hessen_s'],
  'hull_rlp':['hull_rheinland','hull_suedwest_sw','sg_saar'],
  'hull_rheinland':['sg_rhld'],
  'hull_suedwest_sw':['hull_sw_ost','hull_sw_west'],
  'hull_sw_west':['hull_westpfalz','hull_nahe'],
  'hull_sw_ost':['hull_rh','hull_vordpfalz'],
};

// ── Konvexhüllen aus Excel-Regionsdaten ────────────────────────────────────────
const hullPolygons = [];

// excelFilter: welche Excel-Regionswerte identifizieren Member-Teams dieses Polygons
const s1vals=[...new Set(excelTeams.map(t=>t.s1).filter(Boolean))];
for(const v of s1vals){
  const h=makeHull(pts(t=>t.s1===v),STYLE[1].buf);
  const sh=makeHull(seasonPts(t=>t.s1===v),STYLE[1].buf);
  if(h)hullPolygons.push({id:`hull_s1_${v.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`,label:v,stufe:1,hull:h,seasonHull:sh,geoVar:false,style:STYLE[1],excelFilter:[v]});
}
const s2vals=[...new Set(excelTeams.map(t=>t.s2).filter(Boolean))];
for(const v of s2vals){
  const h=makeHull(pts(t=>t.s2===v),STYLE[2].buf);
  const sh=makeHull(seasonPts(t=>t.s2===v),STYLE[2].buf);
  if(h)hullPolygons.push({id:`hull_s2_${v.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`,label:v,stufe:2,hull:h,seasonHull:sh,geoVar:false,style:STYLE[2],excelFilter:[v]});
}
const s3vals=[...new Set(excelTeams.map(t=>t.s3).filter(Boolean))];
for(const v of s3vals){
  if(siblingS3.has(v))continue;
  const h=makeHull(pts(t=>t.s3===v),STYLE[3].buf);
  const sh=makeHull(seasonPts(t=>t.s3===v),STYLE[3].buf);
  if(h)hullPolygons.push({id:`hull_s3_${v.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`,label:v,stufe:3,hull:h,seasonHull:sh,geoVar:false,style:STYLE[3],excelFilter:[v]});
}
const s4vals=[...new Set(excelTeams.map(t=>t.s4).filter(Boolean))];
for(const v of s4vals){
  if(siblingS4.has(v))continue;
  const h=makeHull(pts(t=>t.s4===v),STYLE[4].buf);
  const sh=makeHull(seasonPts(t=>t.s4===v),STYLE[4].buf);
  if(h)hullPolygons.push({id:`hull_s4_${v.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`,label:v,stufe:4,hull:h,seasonHull:sh,geoVar:false,style:STYLE[4],excelFilter:[v]});
}
const s5vals=[...new Set(excelTeams.map(t=>t.s5).filter(Boolean))];
for(const v of s5vals){
  const h=makeHull(pts(t=>t.s5===v),STYLE[5].buf);
  const sh=makeHull(seasonPts(t=>t.s5===v),STYLE[5].buf);
  if(h)hullPolygons.push({id:`hull_s5_${v.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`,label:v,stufe:5,hull:h,seasonHull:sh,geoVar:false,style:STYLE[5],excelFilter:[v]});
}
// Sibling-Combos
for(const g of SIBLING_COMBOS){
  const stufe=g.stufe;
  const keys=g.s3keys||g.s4keys;
  const filter=g.s3keys ? t=>g.s3keys.includes(t.s3) : t=>g.s4keys.includes(t.s4);
  const h=makeHull(pts(filter),STYLE[stufe].buf);
  const sh=makeHull(seasonPts(filter),STYLE[stufe].buf);
  if(h){
    const s={...STYLE[stufe],dashArray:'8 5'};
    // Trennlinien berechnen (gestrichelte interne Grenzen)
    const dividers = g.centerIds ? computeDividers(g, h) : [];
    hullPolygons.push({id:g.id,label:g.label,stufe,hull:h,seasonHull:sh,geoVar:true,style:s,excelFilter:keys,dividers});
  }
}

// excelFilter für Geo-Polygone (echte Grenzen → Excel-Region-Mapping)
const GEO_EXCEL = {
  'bl_bayern':                    ['Bayern'],
  'bl_berlin':                    ['Berlin'],
  'bl_brandenburg':               ['Brandenburg'],
  'bl_bremen':                    ['Bremen'],
  'bl_hamburg':                   ['Hamburg','Hammonia','Hansa'],
  'bl_hessen':                    ['Hessen','Hessen Nord','Hessen Mitte','Hessen Süd'],
  'bl_mecklenburg_vorpommern':    ['Mecklenburg-Vorpommern'],
  'bl_rheinland_pfalz':           ['Rheinland-Pfalz/Saar','Fußballverband Rheinland','Südwestdeutscher Fußballverband','Saarland','Südwest Ost','Südwest West','Rheinhessen','Vorderpfalz','Westpfalz','Nahe','Rheinland West','Rheinland Mitte','Rheinland Ost','Saarland Nord-Ost','Saarland Süd-West'],
  'bl_saarland':                  ['Saarland','Saarland Nord-Ost','Saarland Süd-West'],
  'bl_sachsen_anhalt':            ['Sachsen-Anhalt'],
  'bl_sachsen':                   ['Sachsen'],
  'bl_schleswig_holstein':        ['Schleswig-Holstein','Schleswig','Holstein'],
  'bl_thüringen':                 ['Thüringen'],
  'ns_weser-ems':                 ['Weser-Ems'],
  'ns_braunschweig':              ['Braunschweig'],
  'ns_hannover':                  ['Hannover'],
  'ns_luneburg':                  ['Lüneburg'],
  'rlp_swfv':                     ['Südwestdeutscher Fußballverband','Südwest Ost','Südwest West','Rheinhessen','Vorderpfalz','Westpfalz','Nahe'],
  'rlp_fvr':                      ['Fußballverband Rheinland','Rheinland West','Rheinland Mitte','Rheinland Ost'],
  'nrw_westfalen':                ['Westfalen','Westfalen 1 (Münsterland/OWL)','Westfalen 2 (Südwestfalen)'],
  'nrw_niederrhein':              ['Niederrhein','Niederrhein 1 (Süd)','Niederrhein 2 (Nord)'],
  'nrw_mittelrhein':              ['Mittelrhein','Mittelrhein 1 (Ost)','Mittelrhein 2 (West)'],
  'bw_badisch':                   ['Baden'],
  'bw_suedbaden':                 ['Südbaden'],
  'bw_wuerttemberg':              ['Württemberg'],
  'hh_gesamt':                    ['Hamburg','Hammonia','Hansa'],
  'hh_hansa_outlier':             ['Hansa'],
  'hh_hammonia_outlier':          ['Hammonia'],
  'sonderfall_bocholt':           ['Niederrhein','Niederrhein 1 (Süd)'],
  'sonderfall_bremen_sued':       ['Bremen'],
};
// Füge excelFilter zu geoRegions hinzu
for(const r of geoRegions) {
  r.excelFilter = GEO_EXCEL[r.id] || [];
}

// ── Sibling-Map: geo-variable Spiel-Geschwister + geografische Nachbarn ────────
// Für jede Sibling-Combo: welche anderen Combos sind "Geschwister" im gleichen Verband?
// Außerdem Stufe-2-Paare aus SIBLING_GROUPS (NOFV N/S, Bayernliga N/S).
function hullId(stufe, label){ return `hull_s${stufe}_${label.replace(/[^a-z0-9]/gi,'_').toLowerCase()}`; }

const SIBLING_MAP = {};

function addSibPair(a, b) {
  if (!(SIBLING_MAP[a]||[]).includes(b)) (SIBLING_MAP[a]=SIBLING_MAP[a]||[]).push(b);
  if (!(SIBLING_MAP[b]||[]).includes(a)) (SIBLING_MAP[b]=SIBLING_MAP[b]||[]).push(a);
}
function addSibGroup(...ids) {
  for (const a of ids) for (const b of ids) if (a!==b) addSibPair(a,b);
}

// sg_* Combos: Geschwister = andere Combos gleicher Stufe im gleichen Verband
addSibGroup('sg_hammonia_hansa','sg_schleswig_hol');          // Hamburg ↔ SH (beide unter hull_nord/NFV)
addSibGroup('sg_wf12','sg_nr12','sg_mr12');                    // NRW Landesligen (alle unter WDFV)
addSibGroup('sg_bay_nwnо','sg_bay_msw');                       // Bayern-Landesligen (beide unter Bayern)
addSibGroup('sg_rhld','sg_saar');                              // Südwest-Verbände (Rheinland ↔ Saarland)

// Stufe-2-Paare aus SIBLING_GROUPS ([5-8,5-9] und [5-13,5-14])
addSibPair(hullId(2,'Nordost-Nord'), hullId(2,'Nordost-Süd'));   // NOFV Nord ↔ Süd
addSibPair(hullId(2,'Bayern Nord'), hullId(2,'Bayern Süd'));     // Bayernliga N ↔ S

// Hessen Stufe-3 Geschwister (geografisch zusammengehörig)
addSibGroup(hullId(3,'Hessen Nord'), hullId(3,'Hessen Mitte'), hullId(3,'Hessen Süd'));

// ── Voronoi-Hüllen: lückenlose Aufteilung per Multi-Seed + S-H-Clipping ─────────
// Schritt 1: Gitter-Voronoi mit ALLEN Team-Positionen als Seeds (kein willkürlicher Zentroid)
// Schritt 2: S-H-Clipping mit dem berechneten Team-Zentroid → garantiert lückenlos
function centroidOf(pts){
  return [pts.reduce((s,p)=>s+p[0],0)/pts.length,pts.reduce((s,p)=>s+p[1],0)/pts.length];
}
function pip2(lat,lon,hull){
  let inside=false;
  for(let i=0,j=hull.length-1;i<hull.length;j=i++){
    const yi=hull[i][0],xi=hull[i][1],yj=hull[j][0],xj=hull[j][1];
    if(((yi>lat)!==(yj>lat))&&(lon<(xj-xi)*(lat-yi)/(yj-yi)+xi))inside=!inside;
  }
  return inside;
}
function clipHalf(poly,A,B){
  if(!poly.length)return[];
  const Nx=B[0]-A[0],Ny=B[1]-A[1];
  const C=(B[0]*B[0]+B[1]*B[1]-A[0]*A[0]-A[1]*A[1])/2;
  const out=[];
  for(let i=0;i<poly.length;i++){
    const a=poly[i],b=poly[(i+1)%poly.length];
    const da=a[0]*Nx+a[1]*Ny-C,db=b[0]*Nx+b[1]*Ny-C;
    if(da<=1e-9)out.push(a);
    if((da<=1e-9)!==(db<=1e-9)){const t=da/(da-db);out.push([a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])]);}
  }
  return out;
}
function voronoiTile(parentHull,seeds){
  const avgLat=seeds.reduce((s,p)=>s+p[0],0)/seeds.length;
  const cosL=Math.cos(avgLat*Math.PI/180);
  const sc=p=>[p[0],p[1]*cosL],unsc=p=>[p[0],p[1]/cosL];
  const sp=parentHull.map(sc),ss=seeds.map(sc);
  return ss.map((A,i)=>{
    let cell=[...sp];
    for(let j=0;j<ss.length;j++){if(i===j||cell.length<3)continue;cell=clipHalf(cell,A,ss[j]);}
    return cell.length>=3?cell.map(unsc):null;
  });
}

// Eltern-Kind-Paare aus Excel-Label-Hierarchie ableiten
function buildChildSet(pKey,cKey){
  const m={};
  for(const t of excelTeams){
    const par=t[pKey],chi=t[cKey];
    if(!par||!chi)continue;
    (m[par]=m[par]||new Set()).add(chi);
  }
  return m;
}

const hullByLabel={};
for(const p of hullPolygons) hullByLabel[p.label]=p;

// Voronoi: Seeds aus KONTEXT-Teams (nur Teams mit dem richtigen Eltern-Label)
// → behebt Dual-Membership (z.B. SA in Nordost-Nord UND Nordost-Süd)
function applyVoronoi(parent,childLabels,pKey,parLabel){
  const lbls=[...childLabels].filter(l=>hullByLabel[l]);
  const children=lbls.map(l=>hullByLabel[l]);
  if(children.length<2)return false;
  const ph=parent.hull;
  const lats=ph.map(p=>p[0]),lons=ph.map(p=>p[1]);
  const minLat=Math.min(...lats),maxLat=Math.max(...lats);
  const minLon=Math.min(...lons),maxLon=Math.max(...lons);
  const cosF=Math.cos((minLat+maxLat)/2*Math.PI/180);
  // Kontext-Teams: nur Teams mit t[pKey]===parLabel → kontextsensitiver Seed
  const ctxPts={}; for(const l of lbls) ctxPts[l]=[];
  const cKey=['s1','s2','s3','s4','s5'][['s1','s2','s3','s4','s5'].indexOf(pKey)+1];
  for(const t of excelTeams){
    if(!t.coord||t[pKey]!==parLabel)continue;
    const cv=t[cKey];
    if(cv&&ctxPts[cv])ctxPts[cv].push([t.coord.lat,t.coord.lon]);
  }
  // Gitter-Voronoi: jedem Punkt den nächsten Kontext-Verein zuweisen → gewichteter Seed
  const N=90;
  const wSum=lbls.map(()=>[0,0]),wN=lbls.map(()=>0);
  for(let i=0;i<=N;i++){
    const lat=minLat+(maxLat-minLat)*i/N;
    for(let j=0;j<=N;j++){
      const lon=minLon+(maxLon-minLon)*j/N;
      if(!pip2(lat,lon,ph))continue;
      let best=0,bestD=Infinity;
      for(let k=0;k<lbls.length;k++){
        const pts=ctxPts[lbls[k]].length?ctxPts[lbls[k]]:[centroidOf(children[k].hull)];
        for(const t of pts){
          const d=(lat-t[0])**2+((lon-t[1])*cosF)**2;
          if(d<bestD){bestD=d;best=k;}
        }
      }
      wSum[best][0]+=lat;wSum[best][1]+=lon;wN[best]++;
    }
  }
  const seeds=lbls.map((_,k)=>wN[k]>0?[wSum[k][0]/wN[k],wSum[k][1]/wN[k]]:centroidOf(children[k].hull));
  const cells=voronoiTile(ph,seeds);
  children.forEach((c,i)=>{if(cells[i])c.voronoiHull=cells[i];});
  return true;
}

let voronoiCount=0;
for(const [pKey,cKey] of [['s1','s2'],['s2','s3'],['s3','s4'],['s4','s5']]){
  const pairs=buildChildSet(pKey,cKey);
  for(const [par,chs] of Object.entries(pairs)){
    const parent=hullByLabel[par];
    if(parent&&chs.size>=2&&applyVoronoi(parent,chs,pKey,par)) voronoiCount++;
  }
}
console.log(`Voronoi berechnet für ${voronoiCount} Eltern-Gruppen`);
for(const p of hullPolygons) if(!p.voronoiHull) p.voronoiHull=p.hull;

// ── KMZ-Grenzen einsetzen (echte Admin-Polygone ersetzen Convex-Hulls) ───────
try {
  const kmzData = require('./kmz_regions.json');
  const kmzIndex = {};
  for (const r of kmzData) {
    for (const hid of (r.targetHullIds||[])) kmzIndex[hid] = r;
  }
  let kmzReplaced = 0;
  for (const p of hullPolygons) {
    const kmz = kmzIndex[p.id];
    if (!kmz) continue;
    // KMZ rings sind [lon,lat] → umkehren zu [lat,lon], dann Spikes entfernen
    // Größten Ring als Haupt-Hull verwenden; alle Ringe für Multi-Ring-Display
    const allRings = kmz.rings.map(ring =>
      removeArtifactPoints(ring.map(([lon,lat]) => [lat,lon])));
    const mainRing = allRings.reduce((a,b) => a.length>b.length?a:b);
    // Hull auf KMZ-Grenze setzen (alle Modi)
    p.hull       = allRings.length > 1 ? allRings : mainRing;
    p.fullHull   = p.hull;
    p.seasonHull = p.hull;
    p.voronoiHull= p.hull;
    kmzReplaced++;
  }
  console.log(`KMZ-Grenzen eingesetzt: ${kmzReplaced} Polygone ersetzt`);
} catch(e) {
  console.log('KMZ-Daten nicht gefunden, übersprungen:', e.message);
}

// ── Vereinspunkte mit Excel-Regionen ──────────────────────────────────────────
// Baue Name→ExcelRegionen Map aus Excel-Daten (Namen bereits normalisiert via normExcelName oben)
const excelRegionMap={};
for(const t of excelTeams) {
  const regs=[t.s1,t.s2,t.s3,t.s4,t.s5].filter(Boolean);
  if(regs.length) excelRegionMap[t.name]=regs;
}

// PIP-Fallback: Teams ohne Excel-Eintrag bekommen Bundesland-Region via Punkt-im-Polygon
function pipInGeo(lat, lon, feature) {
  const geom = feature.geometry;
  const rings = geom.type === 'Polygon'      ? [geom.coordinates[0]]
              : geom.type === 'MultiPolygon' ? geom.coordinates.map(p => p[0])
              : [];
  return rings.some(ring => {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const xi = ring[i][0], yi = ring[i][1];
      const xj = ring[j][0], yj = ring[j][1];
      if (((yi > lat) !== (yj > lat)) && (lon < (xj - xi) * (lat - yi) / (yj - yi) + xi))
        inside = !inside;
    }
    return inside;
  });
}
for (const t of Object.values(GAME_DATA.teams)) {
  if (t.lat === 0 && t.lon === 0) continue;
  if (excelRegionMap[t.name]) continue;
  const regs = [];
  for (const r of geoRegions) {
    if (!r.geo) continue;
    const labels = GEO_EXCEL[r.id];
    if (labels && pipInGeo(t.lat, t.lon, r.geo)) regs.push(...labels);
  }
  if (regs.length) excelRegionMap[t.name] = [...new Set(regs)];
}

// fullHull: alle game_data-Teams nach Regionen-Zuordnung (Excel + PIP), raw-Koordinaten inkl. Fehler
// Unterschied zu seasonHull: enthält auch Teams die nicht im Excel stehen (nicht an der Saison teilnehmen)
for (const p of hullPolygons) {
  const fpts = Object.values(GAME_DATA.teams)
    .filter(t => excelRegionMap[t.name]?.some(r => p.excelFilter.includes(r)))
    .map(t => [t.lat, t.lon]);
  p.fullHull = makeHull(fpts, p.style.buf) || p.seasonHull || p.hull;
}

const mapTeams=Object.values(GAME_DATA.teams).filter(t=>!(t.lat===0&&t.lon===0)).map(t=>({
  name:t.name,lat:t.lat,lon:t.lon,
  liga:GAME_DATA.leagues[t.leagueId]?.name||'',
  level:GAME_DATA.leagues[t.leagueId]?.level||99,
  isReserve:t.isReserve||false,fromEuroplan:!!(t.venues),
  regions:excelRegionMap[t.name]||[]
}));
// Gleichstandort-Jitter: Teams mit identischen Koordinaten leicht versetzen
{
  const coordIdx={};
  for(const t of mapTeams){const k=`${t.lat},${t.lon}`;(coordIdx[k]=coordIdx[k]||[]).push(t);}
  for(const grp of Object.values(coordIdx)){
    if(grp.length<2)continue;
    grp.forEach((t,i)=>{const a=2*Math.PI*i/grp.length;t.lat+=0.003*Math.cos(a);t.lon+=0.003*Math.sin(a);});
  }
}

// ── Ausgabe ────────────────────────────────────────────────────────────────────
// JSON-Daten mit </script>-sicherer Kodierung vorbereiten
// (ersetzt </ durch <\/ damit der HTML-Parser das script-Tag nicht vorzeitig schließt)
function safeJson(data) {
  return JSON.stringify(data).replace(/<\//g, '<\\/');
}
const geoJson     = safeJson(geoRegions);
const hullJson    = safeJson(hullPolygons);
const teamsJson   = safeJson(mapTeams);
const hierJson    = safeJson(HIER);
const siblingJson = safeJson(SIBLING_MAP);
const TCOLORS={1:'#cc0000',2:'#cc4400',3:'#bb7700',4:'#446600',5:'#1a7a35',6:'#006688',7:'#1a4fa8',8:'#555555',99:'#999999'};
const TRADII={1:8,2:7,3:6,4:5,5:4,6:3,7:3,8:2,99:2};

const GEO_STYLE={
  bundesland: {color:'#1a4fa8',fill:'#4488dd',fOp:0.04,w:2.5,op:0.6},
  ns_rb:      {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
  nrw_vfb:    {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
  rlp_vfb:    {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
  bw_vfb:     {color:'#1a4fa8',fill:'#4488dd',fOp:0.06,w:2.0,op:0.7},
  hh_base:    {color:'#1a4fa8',fill:'#4488dd',fOp:0.08,w:2.0,op:0.75},
  hh_outlier: {color:'#cc6600',fill:'#ff9900',fOp:0.18,w:2,op:0.85,dashArray:'6 3'},
  sonderfall: {color:'#cc0000',fill:'#ff4444',fOp:0.20,w:2,op:0.9,dashArray:'4 4'},
};

const html=`<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Vereins-Koordinaten Karte</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"><\/script>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Arial,sans-serif;background:#f0f0f0;color:#222;display:flex;flex-direction:column;height:100vh}
#hd{padding:6px 14px;background:#fff;border-bottom:1px solid #ccc;display:flex;gap:12px;align-items:center;flex-wrap:wrap;flex-shrink:0;box-shadow:0 1px 3px #0002}
h1{font-size:14px;color:#1a4fa8;white-space:nowrap}
.stat{font-size:12px;color:#666}.stat b{color:#c04000}
#ctrl{padding:5px 14px;background:#f5f5ff;border-bottom:1px solid #ccc;display:flex;gap:8px;align-items:center;flex-wrap:wrap;flex-shrink:0}
input[type=text]{padding:5px 9px;border-radius:5px;border:1px solid #bbb;background:#fff;color:#222;font-size:13px}
#regionSearch{width:200px}
#teamSearch{width:160px}
select{padding:5px;border-radius:5px;border:1px solid #bbb;background:#fff;color:#222;font-size:12px}
label{font-size:12px;color:#444;display:flex;align-items:center;gap:3px;cursor:pointer;white-space:nowrap}
.sep{width:1px;background:#ccc;height:22px;margin:0 4px}
#map{flex:1;position:relative}
.leaflet-popup-content-wrapper{background:#fff;color:#222;border:1px solid #aaa;box-shadow:0 2px 6px #0003}
.pname{font-weight:bold;font-size:13px;color:#1a4fa8}.pliga{font-size:11px;color:#666;margin-top:2px}
.pcoord{font-size:11px;font-family:monospace;color:#c04000;margin-top:3px}.pep{font-size:10px;color:#1a7a35}
#leg{position:absolute;bottom:30px;right:10px;z-index:1000;background:rgba(255,255,255,0.95);padding:9px 13px;border-radius:8px;font-size:11px;border:1px solid #ccc;box-shadow:0 2px 6px #0002;max-width:185px}
.lsec{font-weight:bold;margin:5px 0 2px;color:#333;border-top:1px solid #eee;padding-top:4px;font-size:11px}
.lsec:first-child{border-top:none;padding-top:0}
.lr{display:flex;align-items:center;gap:6px;margin:2px 0}
.ls{width:16px;height:10px;border-radius:2px;flex-shrink:0}.ld{width:9px;height:9px;border-radius:50%;flex-shrink:0}
#regionList{position:absolute;top:38px;left:14px;z-index:2000;background:#fff;border:1px solid #bbb;border-radius:6px;max-height:300px;overflow-y:auto;width:240px;display:none;box-shadow:0 4px 12px #0003;font-size:12px}
.rItem{padding:5px 10px;cursor:pointer;display:flex;align-items:center;gap:6px}
.rItem:hover{background:#e8f0fe}
.rBadge{font-size:9px;padding:1px 4px;border-radius:3px;color:#fff;flex-shrink:0}
.map-tip{background:#fff;border:1px solid #aaa;border-radius:4px;padding:3px 7px;font-size:12px;color:#222;box-shadow:0 1px 4px #0002}
#map path{cursor:pointer}
</style>
</head>
<body>
<div id="hd">
  <h1>📍 Vereins-Koordinaten Karte</h1>
  <div class="stat">Teams: <b id="sT">-</b></div>
  <div class="stat">Sichtbar: <b id="sV">-</b></div>
</div>
<div id="ctrl">
  <div style="position:relative">
    <input type="text" id="regionSearch" placeholder="Region suchen / filtern…" autocomplete="off"
      oninput="filterRegionList()" onfocus="showRegionList()" onblur="setTimeout(hideRL,200)">
    <div id="regionList"></div>
  </div>
  <label title="Alle Eltern der gewählten Region einblenden"><input type="checkbox" id="chkParents" checked onchange="drawAll()"> + Eltern</label>
  <label title="Alle Kinder der gewählten Region einblenden"><input type="checkbox" id="chkChildren" checked onchange="drawAll()"> + Kinder</label>
  <label title="Geschwister-Regionen einblenden (gleiche Ebene, gleicher Elternteil)"><input type="checkbox" id="chkSiblings" onchange="drawAll()"> + Geschwister</label>
  <button onclick="clearRegionFilter()" style="padding:4px 8px;font-size:11px;border:1px solid #bbb;border-radius:4px;cursor:pointer;background:#fff">Alle zeigen</button>
  <div class="sep"></div>
  <input type="text" id="teamSearch" placeholder="Vereinsname…" oninput="drawTeams()">
  <span style="font-size:11px;color:#555;white-space:nowrap">L
    <select id="lvl-min" onchange="drawTeams()" style="padding:2px 4px;font-size:11px;border-radius:3px;border:1px solid #bbb">
      <option value="1" selected>1</option><option value="2">2</option><option value="3">3</option>
      <option value="4">4</option><option value="5">5</option><option value="6">6</option>
      <option value="7">7</option><option value="8">8</option>
    </select>–<select id="lvl-max" onchange="drawTeams()" style="padding:2px 4px;font-size:11px;border-radius:3px;border:1px solid #bbb">
      <option value="1">1</option><option value="2">2</option><option value="3">3</option>
      <option value="4">4</option><option value="5">5</option><option value="6">6</option>
      <option value="7">7</option><option value="8" selected>8</option>
    </select>
  </span>
  <label><input type="checkbox" id="chkGeo" checked onchange="drawAll()"> Echte Grenzen</label>
  <label><input type="checkbox" id="chkHull" checked onchange="drawAll()"> Hüllen</label>
  <button id="hull-mode-btn" onclick="toggleHullMode()" title="Faktische Hüllen / Voronoi-Aufteilung" style="padding:3px 8px;font-size:11px;border:1px solid #bbb;border-radius:4px;cursor:pointer;background:#fff">Aufteilung</button>
  <label><input type="checkbox" id="chkTeams" checked onchange="drawTeams()"> Vereine</label>
  <label><input type="checkbox" id="chkR" checked onchange="drawTeams()"> Reserven</label>
</div>
<div id="map"></div>
<div id="leg">
  <div class="lsec">Echte Grenzen</div>
  <div class="lr"><div class="ls" style="border:2.5px solid #1a4fa8;background:#4488dd11"></div>Bundesland/Verband</div>
  <div class="lr"><div class="ls" style="border:2px solid #1a7a35;background:#33aa5519"></div>Niedersachs. RB</div>
  <div class="lr"><div class="ls" style="border:2px dashed #cc6600;background:#ff990049"></div>Hamburg-Enklave</div>
  <div class="lr"><div class="ls" style="border:2px dashed #cc0000;background:#ff444451"></div>Sonderfall</div>
  <div class="lsec">Konvexhüllen</div>
  <div class="lr"><div class="ls" style="border:2px solid #1a4fa8;background:#4488dd11"></div>Stufe 1</div>
  <div class="lr"><div class="ls" style="border:2px solid #1a7a35;background:#33aa551a"></div>Stufe 2</div>
  <div class="lr"><div class="ls" style="border:1.8px solid #b05000;background:#e0780029"></div>Stufe 3</div>
  <div class="lr"><div class="ls" style="border:1.5px solid #7a00aa;background:#aa33dd31"></div>Stufe 4</div>
  <div class="lr"><div class="ls" style="border:1.5px dashed #888;background:#0001"></div>geo-variabel</div>
  <div class="lsec">Vereinspunkte</div>
  <div class="lr"><div class="ld" style="background:#cc0000"></div>BL–3. Liga</div>
  <div class="lr"><div class="ld" style="background:#446600"></div>Regionalliga</div>
  <div class="lr"><div class="ld" style="background:#1a7a35"></div>Oberliga</div>
  <div class="lr"><div class="ld" style="background:#006688"></div>Landesliga</div>
  <div class="lr"><div class="ld" style="background:#1a4fa8"></div>Verbandsliga+</div>
</div>

<!-- Daten als JSON eingebettet – kein Server nötig, file:// funktioniert -->
<script type="application/json" id="d-geo">${geoJson}</script>
<script type="application/json" id="d-hulls">${hullJson}</script>
<script type="application/json" id="d-teams">${teamsJson}</script>
<script type="application/json" id="d-hier">${hierJson}</script>
<script type="application/json" id="d-sibs">${siblingJson}</script>

<script>
const TC=${JSON.stringify(TCOLORS)};
const TR=${JSON.stringify(TRADII)};
const GS=${JSON.stringify(GEO_STYLE)};

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
    const hull = hullMode==='voronoi' ? (p.voronoiHull||p.hull)
             : hullMode==='full'    ? (p.fullHull||p.hull)
             :                        (p.seasonHull||p.hull);
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
  hullMode = hullMode==='actual' ? 'full' : hullMode==='full' ? 'voronoi' : 'actual';
  const btn=document.getElementById('hull-mode-btn');
  const labels={actual:'Saison-Hülle',full:'Gesamt-Hülle',voronoi:'Voronoi'};
  const bgs={actual:'#fff',full:'#fff3e0',voronoi:'#e8f5e9'};
  if(btn){btn.textContent=labels[hullMode];btn.style.background=bgs[hullMode];}
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
const TYPE_LABELS={bundesland:'BL',ns_rb:'NS',nrw_vfb:'NRW',rlp_vfb:'RLP',bw_vfb:'BW',hh_base:'HH',hh_outlier:'HH⚠',sonderfall:'⚠',hull:'Hülle'};

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
    return '<div class="rItem" style="'+bg+'" data-rid="'+r.id+'" onclick="togglePoly(this.dataset.rid)">'+
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
<\/script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname,'koordinaten_karte.html'),html);
console.log('Karte: tools/koordinaten_karte.html');
console.log('Geo-Regionen:',geoRegions.length,'| Hüllen:',hullPolygons.length,'| Teams:',mapTeams.length);

// ── app/map_data.js: vorberechnete Polygon-/Region-Daten für In-App-Karte ────
// Team-Regionen-Map: teamName → excelRegionen (für Region-Filter auf Vereinspunkte)
const teamRegionMap = {};
for (const t of mapTeams) teamRegionMap[t.name] = t.regions;

// Seit den amtlichen Verbandsgrenzen (app/map_regions.js) sind mehrere Hilfspolygone der
// Geo-Ebene überflüssig – sie waren Behelfs-Umrisse für Verbände, die jetzt echte Flächen
// haben. Raus: bw_vfb (Badisch/Südbadisch/Württembergisch), hh_outlier (die zwei gestrichelten
// Hamburg-Enklaven) und der Bocholt-Zipfel.
// Alle Behelfs-Umrisse der Geo-Ebene sind ueberfluessig, seit die Verbaende echte Flaechen
// haben (app/map_regions.js). Der "Westfaelische FV" ragte sogar in die Niederlande und
// ueberlappte den Niederrhein. Uebrig bleiben nur die 13 Bundeslaender als Hintergrund.
const GEO_DROP_TYPES = new Set(['bw_vfb', 'hh_outlier', 'rlp_vfb', 'sonderfall',
                                'nrw_vfb', 'ns_rb', 'hh_base']);
const geoRegionsOut = geoRegions.filter(r => !GEO_DROP_TYPES.has(r.type));

const mapDataJs = `// Automatisch generiert von tools/gen_map.cjs – nicht manuell editieren
const MAP_GEO_REGIONS = ${JSON.stringify(geoRegionsOut)};
// MAP_HULL_POLYS ist abgeschafft: die Hüllen (hull/seasonHull/fullHull/voronoiHull) waren
// Näherungen aus Vereinspunkten. Seit den amtlichen Verbandsgrenzen liefert
// tools/gen_regions.py -> app/map_regions.js eine fertige Geometrie je Region.
// Die Berechnung oben (convexHull/makeHull/Voronoi/KMZ, ~290 Zeilen) ist damit tot: sie
// speist NUR noch die Dev-Karte tools/koordinaten_karte.html. Frueher stand hier, dividers
// und SIBLING_MAP haengten daran - das stimmte nicht: dividers wird ausschliesslich im
// HTML-Template dieser Dev-Karte gezeichnet, und SIBLING_MAP ist ganz weggefallen.
const MAP_HULL_POLYS  = [];
// MAP_HIER und MAP_SIBLING_MAP stehen jetzt in app/map_regions.js: sie werden dort aus
// team.regions abgeleitet und tragen damit zwangslaeufig dieselben IDs wie MAP_REGIONS.
// Die Literale hier trugen noch die alten Huellen-IDs – von 54 loeste eine einzige auf.
// Nicht wieder ausgeben: doppelte const-Deklaration bricht den inlinierten Monolithen.
const MAP_TEAM_REGIONS= ${JSON.stringify(teamRegionMap)};
`;
fs.writeFileSync(path.join(__dirname,'..','app','map_data.js'), mapDataJs, 'utf8');
console.log('Map-Daten: app/map_data.js');
