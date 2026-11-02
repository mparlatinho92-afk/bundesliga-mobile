/**
 * Generiert app/map_data.js (MAP_TEAM_REGIONS: Vereinsname → team.regions).
 *
 * Früher entstanden hier auch Konvexhüllen, Voronoi-Kacheln und KMZ-Grenzen je Spielregion
 * sowie die Dev-Karte tools/koordinaten_karte.html. Seit den amtlichen Verbandsgrenzen
 * (tools/gen_regions.py → app/map_regions.js) brauchte das Spiel nichts mehr davon; der
 * Hüllen-Code und die Dev-Karte sind am 02.11.2026 entfernt worden (aus Git zurückholbar,
 * letzter Stand mit beidem: 021680a).
 */

const fs   = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname,'..','game_data.js'),'utf8');
eval(src.replace('const GAME_DATA','var GAME_DATA'));

// regions AUS game_data, nicht aus der Excel-Übersicht: game_data deckt alle Vereine ab, und
// jede Korrektur an team.regions (Kiel/Klausdorf v0.8.71, Wegberg-Beeck nach Mittelrhein, die
// vier Westfalen-1-Vereine) landet so auch hier, statt von einem Lauf still zurückgedreht zu werden.
// Der Verband heißt in game_data "Südwest" statt "Südwestdeutscher Fußballverband"; MAP_REGIONS
// filtert bereits auf beide Schreibweisen (hull_s3_s_dwest), das bleibt also passend.
const teamRegionMap = {};
for (const t of Object.values(GAME_DATA.teams)) {
  if (t.lat === 0 && t.lon === 0) continue;
  teamRegionMap[t.name] = t.regions || [];
}

const mapDataJs = `// Automatisch generiert von tools/gen_map.cjs – nicht manuell editieren
// MAP_GEO_REGIONS ist abgeschafft: 13 grobe Bundesland-Umrisse, gezeichnet als blaue
// Linien ueber die Karte. Seit den amtlichen Verbandsgrenzen (app/map_regions.js)
// zeigten sie nichts mehr, was die Regionsflaechen nicht genauer zeigen. Mit ihnen
// sind _mapDrawGeo, die Ebene _geoLyr und der Schalter "Grenzen" entfallen.
// MAP_HULL_POLYS ist abgeschafft: die Hüllen (hull/seasonHull/fullHull/voronoiHull) waren
// Näherungen aus Vereinspunkten. Seit den amtlichen Verbandsgrenzen liefert
// tools/gen_regions.py -> app/map_regions.js eine fertige Geometrie je Region.
// Die Hüllen-Berechnung und die Dev-Karte tools/koordinaten_karte.html sind seit
// 02.11.2026 aus tools/gen_map.cjs entfernt. Leer bleibt die Konstante, weil
// tools/marching.cjs und aeltere Pruefskripte sie noch lesen.
const MAP_HULL_POLYS  = [];
// MAP_HIER und MAP_SIBLING_MAP stehen jetzt in app/map_regions.js: sie werden dort aus
// team.regions abgeleitet und tragen damit zwangslaeufig dieselben IDs wie MAP_REGIONS.
// Die Literale hier trugen noch die alten Huellen-IDs – von 54 loeste eine einzige auf.
// Nicht wieder ausgeben: doppelte const-Deklaration bricht den inlinierten Monolithen.
const MAP_TEAM_REGIONS= ${JSON.stringify(teamRegionMap)};
`;
fs.writeFileSync(path.join(__dirname,'..','app','map_data.js'), mapDataJs, 'utf8');
console.log('Map-Daten: app/map_data.js |', Object.keys(teamRegionMap).length, 'Vereine');
