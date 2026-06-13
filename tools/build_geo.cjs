/**
 * Preprocessing: Baut football-region GeoJSON aus echten Bundesland/Kreis-Grenzen.
 * Ausgabe: tools/geo_football_regions.json (einbettbar, offline-fähig)
 * Aufruf:  node tools/build_geo.cjs
 */

const fs   = require('fs');
const path = require('path');
const turf = require('@turf/turf');

const OUT = path.join(__dirname, 'geo_football_regions.json');

// ── GeoJSON holen ─────────────────────────────────────────────────────────────
async function fetchGeo(url) {
  const r = await fetch(url, { headers:{'User-Agent':'Mozilla/5.0'} });
  return r.json();
}

// ── Kreise nach Eigenschaften filtern und zu einem Polygon vereinen ───────────
function unionKreise(kreiseGeo, filterFn) {
  const matching = kreiseGeo.features.filter(filterFn);
  if (!matching.length) return null;
  if (matching.length === 1) return matching[0];
  try {
    return turf.union(turf.featureCollection(matching));
  } catch(e) {
    // Fallback: iterativ vereinen bei Topologie-Problemen
    let result = matching[0];
    for (let i = 1; i < matching.length; i++) {
      try { result = turf.union(turf.featureCollection([result, matching[i]])); }
      catch(e2) { /* skip */ }
    }
    return result;
  }
}

// ── Punkt in Polygon (ray casting) ───────────────────────────────────────────
function ptInPoly(pt, poly) {
  try { return turf.booleanPointInPolygon(turf.point([pt.lon, pt.lat]), poly); }
  catch(e) { return false; }
}

// ── Polygon-Bereinigung: entfernt zu kleine Innenringe (Löcher) ───────────────
// Löcher < MIN_DEG² werden entfernt, echte geografische Löcher (Seen > Schwelle) bleiben
const MIN_HOLE_DEG2 = 0.005; // ~0.005 Grad² ≈ ~60 km² bei 51°N → kleine Artefakte raus

function ringArea(ring) {
  // Shoelace-Formel in Grad²
  let a = 0;
  for (let i = 0; i < ring.length - 1; i++)
    a += ring[i][0] * ring[i+1][1] - ring[i+1][0] * ring[i][1];
  return Math.abs(a) / 2;
}

function cleanPoly(coords) {
  if (coords.length <= 1) return coords;
  const outer = coords[0];
  const holes = coords.slice(1).filter(r => ringArea(r) > MIN_HOLE_DEG2);
  return [outer, ...holes];
}

function cleanGeometry(feature) {
  if (!feature?.geometry) return feature;
  const g = feature.geometry;
  if (g.type === 'Polygon') {
    return { ...feature, geometry: { ...g, coordinates: cleanPoly(g.coordinates) } };
  }
  if (g.type === 'MultiPolygon') {
    // Winzige Teilflächen (Artefakte) entfernen, echte Inseln behalten
    const cleaned = g.coordinates
      .filter(poly => ringArea(poly[0]) > MIN_HOLE_DEG2 * 0.5)
      .map(poly => cleanPoly(poly));
    if (cleaned.length === 0) return feature;
    if (cleaned.length === 1)
      return { ...feature, geometry: { type: 'Polygon', coordinates: cleaned[0] } };
    return { ...feature, geometry: { ...g, coordinates: cleaned } };
  }
  return feature;
}

// ── NRW Kreis → Verband ───────────────────────────────────────────────────────
// Regierungsbezirke NRW: Arnsberg+Detmold = Westfalen, Köln = Mittelrhein
// Düsseldorf-RB: Bergisches Städtedreieck = Mittelrhein, Rest = Niederrhein
// Münster-RB: alles Westfalen außer Borken-West (Bocholt, Rhede, Isselburg)

const NRW_MITTELRHEIN_KREISE = new Set([
  // Köln-RB vollständig
  'Aachen','Bonn','Düren','Euskirchen','Heinsberg','Köln','Leverkusen',
  'Oberbergischer Kreis','Rhein-Erft-Kreis','Rhein-Sieg-Kreis','Rheinisch-Bergischer Kreis',
  // Düsseldorf-RB: Bergisches Land
  'Remscheid','Solingen','Wuppertal'
]);

const NRW_NIEDERRHEIN_KREISE = new Set([
  // Düsseldorf-RB: Niederrhein-Teil
  'Düsseldorf','Duisburg','Essen','Krefeld','Mönchengladbach','Mülheim an der Ruhr',
  'Oberhausen','Kleve','Mettmann','Rhein-Kreis Neuss','Viersen','Wesel'
]);

// Münster-RB: alles außer Borken → Westfalen (Borken wird separat gesplittet)
// Arnsberg+Detmold-RB: alle → Westfalen

function nrwVerband(feat) {
  const rb   = feat.properties.NAME_2;  // Regierungsbezirk
  const name = feat.properties.NAME_3;  // Kreisname
  if (NRW_MITTELRHEIN_KREISE.has(name)) return 'mittelrhein';
  if (NRW_NIEDERRHEIN_KREISE.has(name)) return 'niederrhein';
  if (rb === 'Köln') return 'mittelrhein';
  if (rb === 'Arnsberg' || rb === 'Detmold') return 'westfalen';
  if (rb === 'Munster') return name === 'Borken' ? 'borken_split' : 'westfalen';
  if (rb === 'Düsseldorf') return 'niederrhein'; // Fallback: Düsseldorf-RB Rest
  return 'westfalen'; // Fallback
}

// ── BW historische Grenzen: Kreis → Verband ───────────────────────────────────
// Karlsruhe-RB: Badischer FV
// Freiburg-RB: Südbadischer FV
// Stuttgart-RB + Tübingen-RB: Württembergischer FV
// Ausnahmen (werden per europlan-Cluster korrigiert wenn nötig)
function bwVerband(feat) {
  const rb = feat.properties.NAME_2;
  if (rb === 'Karlsruhe') return 'bw_badisch';
  if (rb === 'Freiburg')  return 'bw_suedbaden';
  return 'bw_wuerttemberg'; // Stuttgart + Tübingen
}

// ── Europlan: Hamburger Clubs außerhalb des HH+Pinneberg-Polygons ────────────
function extractHamburgOutliers(europlanData, hhPoly) {
  const outliers = { hansa:[], hammonia:[] };
  for (const [, teams] of Object.entries(europlanData.ligaTeams || {})) {
    for (const t of teams) {
      const ln = (t.ligaName||'').toLowerCase();
      const isHansa    = ln.includes('hansa');
      const isHammonia = ln.includes('hammonia');
      if (!isHansa && !isHammonia) continue;
      if (!t.coords?.length || !t.coords[0]?.lat) continue;
      const { lat, lon } = t.coords[0];
      if (!lat || !lon) continue;
      // Nur Clubs außerhalb HH+Pinneberg markieren
      const inside = hhPoly ? ptInPoly({ lat, lon }, hhPoly) : false;
      if (!inside) {
        (isHansa ? outliers.hansa : outliers.hammonia).push({ name: t.teamName, lat, lon });
      }
    }
  }
  return outliers;
}

// ── Convex Hull + Buffer für Punkte-Cluster ───────────────────────────────────
function clusterHull(points, bufDeg = 0.08) {
  if (points.length < 3) {
    if (points.length === 0) return null;
    // Kreis um Einzelpunkt
    return turf.buffer(turf.point([points[0].lon, points[0].lat]), bufDeg * 111, {units:'kilometers'});
  }
  const fc = turf.featureCollection(points.map(p => turf.point([p.lon, p.lat])));
  const hull = turf.convex(fc);
  if (!hull) return null;
  return turf.buffer(hull, bufDeg * 111, {units:'kilometers'});
}

// ── Haupt-Routine ─────────────────────────────────────────────────────────────
async function main() {
  console.log('Lade GeoJSON...');
  const [bundeslaenderGeo, kreiseGeo] = await Promise.all([
    fetchGeo('https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/4_niedrig.geo.json'),
    fetchGeo('https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/4_kreise/4_niedrig.geo.json'),
  ]);
  console.log(`  ${bundeslaenderGeo.features.length} Bundesländer, ${kreiseGeo.features.length} Kreise`);

  const europlan = JSON.parse(fs.readFileSync(path.join(__dirname,'europlan_coords.json'),'utf8'));

  const regions = {};  // id → { name, type, geoVar, geo (GeoJSON Feature), note }

  // ── 1. Bundesländer als Basis ───────────────────────────────────────────────
  const BL_SIMPLE = ['Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen',
    'Mecklenburg-Vorpommern','Rheinland-Pfalz','Saarland','Sachsen',
    'Sachsen-Anhalt','Schleswig-Holstein','Thüringen'];
  for (const feat of bundeslaenderGeo.features) {
    const name = feat.properties.name;
    if (!BL_SIMPLE.includes(name)) continue;
    regions[`bl_${name.toLowerCase().replace(/[ -]/g,'_')}`] = {
      name, type:'bundesland', geoVar:false, geo:feat, stufe:1
    };
  }

  // ── 2. Niedersachsen: historische Regierungsbezirke ─────────────────────────
  const niKreise = kreiseGeo.features.filter(f => f.properties.NAME_1 === 'Niedersachsen');
  for (const rb of ['Weser-Ems','Braunschweig','Hannover','Luneburg']) {
    const label = rb === 'Luneburg' ? 'Lüneburg' : rb;
    const poly = unionKreise({features: niKreise}, f => f.properties.NAME_2 === rb);
    if (poly) regions[`ns_${rb.toLowerCase()}`] = { name: `Niedersachsen – ${label}`, type:'ns_rb', geoVar:false, geo:poly, stufe:3 };
  }

  // ── 3. NRW: drei Verbände ───────────────────────────────────────────────────
  const nrwKreise = kreiseGeo.features.filter(f => f.properties.NAME_1 === 'Nordrhein-Westfalen');

  // Westfalen: alles außer Niederrhein, Mittelrhein und Borken-Split
  const westFeat = nrwKreise.filter(f => {
    const v = nrwVerband(f);
    return v === 'westfalen';
  });
  const polyWf = unionKreise({features: westFeat}, () => true);
  if (polyWf) regions['nrw_westfalen'] = { name:'Westfälischer FV', type:'nrw_vfb', geoVar:false, geo:polyWf, stufe:2 };

  // Niederrhein
  const nrFeat = nrwKreise.filter(f => nrwVerband(f) === 'niederrhein');
  const polyNr = unionKreise({features: nrFeat}, () => true);
  if (polyNr) regions['nrw_niederrhein'] = { name:'Niederrheinischer FV', type:'nrw_vfb', geoVar:false, geo:polyNr, stufe:2 };

  // Mittelrhein
  const mrFeat = nrwKreise.filter(f => nrwVerband(f) === 'mittelrhein');
  const polyMr = unionKreise({features: mrFeat}, () => true);
  if (polyMr) regions['nrw_mittelrhein'] = { name:'Mittelrheinischer FV', type:'nrw_vfb', geoVar:false, geo:polyMr, stufe:2 };

  // Sonderfall Bocholt: Kreis Borken gesplittet an lon ~6.80°
  // Wir fügen Bocholt-Bereich (lon < 6.81) zum Niederrhein-Polygon hinzu
  // als separaten Hinweis-Layer (kein formales Polygon-Schnitt hier)
  regions['sonderfall_bocholt'] = {
    name:'Sonderfall: Bocholt-Zipfel → Niederrhein',
    type:'sonderfall', geoVar:false, stufe:99,
    geo: clusterHull([
      {lat:51.841, lon:6.617}, // Bocholt
      {lat:51.836, lon:6.703}, // Rhede
      {lat:51.832, lon:6.469}, // Isselburg
    ], 0.07),
    note:'Westl. Kreis Borken (Bocholt, Rhede, Isselburg): trotz Westfalen-Geografie zum Niederrheinischen FV'
  };

  // ── 4. Baden-Württemberg: historische Verbände ─────────────────────────────
  const bwKreise = kreiseGeo.features.filter(f => f.properties.NAME_1 === 'Baden-Württemberg');

  const bwFach = { bw_badisch:[], bw_suedbaden:[], bw_wuerttemberg:[] };
  for (const f of bwKreise) bwFach[bwVerband(f)].push(f);

  const bwNames = {
    bw_badisch:       { name:'Badischer FV', stufe:2 },
    bw_suedbaden:     { name:'Südbadischer FV', stufe:2 },
    bw_wuerttemberg:  { name:'Württembergischer FV (inkl. Hohenzollern)', stufe:2 }
  };
  for (const [key, feats] of Object.entries(bwFach)) {
    if (!feats.length) continue;
    const poly = unionKreise({features:feats}, ()=>true);
    if (poly) regions[key] = { ...bwNames[key], type:'bw_vfb', geoVar:false, geo:poly };
  }

  // ── 5. Hamburg: Stadt + Kreis Pinneberg ─────────────────────────────────────
  const hhFeats  = kreiseGeo.features.filter(f => f.properties.NAME_1 === 'Hamburg');
  const pinnFeat = kreiseGeo.features.find(f => f.properties.NAME_3 === 'Pinneberg');
  console.log(`  Hamburg-Features: ${hhFeats.length}, Pinneberg: ${pinnFeat ? 'OK' : 'nicht gefunden'}`);
  // Debug: zeige alle Kreise die Hamburg gehören
  hhFeats.forEach(f => console.log('    HH-Kreis:', f.properties.NAME_3, f.properties.NAME_2));
  const hhBase = hhFeats.length > 0 ? hhFeats : [bundeslaenderGeo.features.find(f=>f.properties.name==='Hamburg')].filter(Boolean);
  const hhAll  = pinnFeat ? [...hhBase, pinnFeat] : hhBase;
  if (hhAll.length > 0) {
    const hhPoly = hhAll.length === 1 ? hhAll[0] : turf.union(turf.featureCollection(hhAll));
    regions['hh_gesamt'] = { name:'Hamburg + Kreis Pinneberg', type:'hh_base', geoVar:false, geo:hhPoly, stufe:2 };
  }

  // Hamburg-Outlier: Stormarn + Lauenburg Mini-Polygone aus europlan-Clustern
  const hhBasePoly = regions['hh_gesamt']?.geo;
  const outliers = extractHamburgOutliers(europlan, hhBasePoly);
  console.log(`  Hamburg-Outlier: Hansa=${outliers.hansa.length}, Hammonia=${outliers.hammonia.length}`);
  if (outliers.hansa.length) console.log('  Hansa-Outlier:', outliers.hansa.map(o=>`${o.name}(${o.lat.toFixed(2)},${o.lon.toFixed(2)})`).join(', '));

  if (outliers.hansa.length >= 2) {
    const poly = clusterHull(outliers.hansa, 0.06);
    if (poly) regions['hh_hansa_outlier'] = {
      name:'Hamburg-Hansa: Stormarn/Lauenburg-Enklaven',
      type:'hh_outlier', geoVar:false, geo:poly, stufe:3,
      note:'Hamburger Hansa-Vereine außerhalb Stadtgebiet/Pinneberg (Stormarn, Herzogtum Lauenburg)'
    };
  }
  if (outliers.hammonia.length >= 2) {
    const poly = clusterHull(outliers.hammonia, 0.06);
    if (poly) regions['hh_hammonia_outlier'] = {
      name:'Hamburg-Hammonia: Pinneberg-Outlier', type:'hh_outlier', geoVar:false, geo:poly, stufe:3
    };
  }

  // ── 6. Saarland + Rheinland-Pfalz als Bundesländer (für Südwest-Unterregionen) ─
  // Bleiben als Bundesland-Polygone, Unterregionen per europlan-Cluster in der Karte

  // ── Ausgabe ─────────────────────────────────────────────────────────────────
  const output = Object.entries(regions).map(([id, r]) => ({
    id, name: r.name, type: r.type, geoVar: r.geoVar, stufe: r.stufe||2,
    note: r.note||'',
    geo: r.geo ? cleanGeometry({ type:'Feature', geometry: r.geo.geometry || r.geo.features?.[0]?.geometry, properties:{} }) : null
  })).filter(r => r.geo?.geometry);

  fs.writeFileSync(OUT, JSON.stringify(output));
  const kb = Math.round(fs.statSync(OUT).size / 1024);
  console.log(`\nErgebnis: ${output.length} Regionen → ${OUT} (${kb} KB)`);
  output.forEach(r => console.log(`  [${r.type}] ${r.name}`));
}

main().catch(e => { console.error('FEHLER:', e); process.exit(1); });
