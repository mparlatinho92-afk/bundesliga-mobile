/**
 * Marching Squares für DYNAMISCHE Staffelgrenzen (Bayernliga Nord/Süd, die 5 Landesligen
 * Bayern, NOFV-Oberliga Nord/Süd …). Diese Grenzen existieren real nicht – sie folgen der
 * Vereinsverteilung und ändern sich jede Saison. Feste Verbandsgrenzen kommen dagegen aus
 * Google Earth (tools/kmz_extract.py) und werden hier nur als CLIP übergeben.
 *
 * Kernidee: Raster über die Elternfläche → jeder Rasterpunkt bekommt die Staffel des
 * nächstgelegenen Vereins → Marching Squares zieht die Grenze zwischen den Staffeln.
 * Ergebnis: nicht-konvexe, lückenlose Flächen, EIN Polygon je Staffel.
 *
 * Das Clip-Polygon ist bewusst nur ein Parameter: heute die vorhandenen Bundesland-Geometrien,
 * später die handgezeichneten Verbandsgrenzen – am Verfahren ändert das nichts.
 * Mehrere Clip-Polygone wirken als Vereinigung (Punkt gilt als drinnen, wenn er in IRGENDEINEM
 * liegt) – deshalb braucht NOFV keine echte Polygon-Union.
 *
 * Aufruf:  node tools/marching.cjs bayern-landesliga
 *          node tools/marching.cjs bayernliga
 *          node tools/marching.cjs nofv
 *          node tools/marching.cjs alle
 * Ausgabe: tools/_marching_<preset>.svg  (Vorschau) + Kennzahlen auf der Konsole
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ── Daten laden ─────────────────────────────────────────────────────────────
function loadGameData() {
    const src = fs.readFileSync(path.join(ROOT, 'game_data.js'), 'utf8');
    const g = {};
    new Function('g', src + '\ng.GAME_DATA = GAME_DATA;')(g);
    return g.GAME_DATA;
}
function loadMapData() {
    const src = fs.readFileSync(path.join(ROOT, 'app', 'map_data.js'), 'utf8');
    const g = {};
    new Function('g', src + '\ng.R = MAP_GEO_REGIONS; g.H = MAP_HULL_POLYS;')(g);
    return g;
}

// ── Geometrie-Grundlagen ────────────────────────────────────────────────────
// Ray-Casting. ring = [[lon,lat], …]
function pointInRing(lon, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const xi = ring[i][0], yi = ring[i][1], xj = ring[j][0], yj = ring[j][1];
        if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
}
// polys = [{outer:ring, holes:[ring…]}, …] – drinnen, wenn in IRGENDEINEM Polygon (= Union)
function pointInPolys(lon, lat, polys) {
    for (const p of polys) {
        if (!pointInRing(lon, lat, p.outer)) continue;
        let inHole = false;
        for (const h of (p.holes || [])) if (pointInRing(lon, lat, h)) { inHole = true; break; }
        if (!inHole) return true;
    }
    return false;
}
function ringArea(ring) {                       // Schuhformel, Betrag
    let a = 0;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++)
        a += (ring[j][0] * ring[i][1]) - (ring[i][0] * ring[j][1]);
    return Math.abs(a / 2);
}

// ── Marching Squares ────────────────────────────────────────────────────────
// Zellecken a=TL b=TR c=BR d=BL → case = a*8+b*4+c*2+d.
// Kantenmitten T/R/B/L. Segmente sind GERICHTET: "innen" liegt immer links.
// Dadurch schließen sich die Ringe beim Zusammensetzen von allein.
// Fälle 5/10 sind Sattelpunkte (diagonal) – hier konsequent als GETRENNTE Ecken gelesen.
const CASES = {
    1:  [['B','L']],            2:  [['R','B']],  3:  [['R','L']],
    4:  [['T','R']],            5:  [['T','R'], ['B','L']],
    6:  [['T','B']],            7:  [['T','L']],  8:  [['L','T']],
    9:  [['B','T']],            10: [['L','T'], ['R','B']],
    11: [['R','T']],            12: [['L','R']],  13: [['B','R']], 14: [['L','B']]
};
// Kantenmitte → Rasterkoordinate (halbe Schritte), verdoppelt für exakte Integer-Schlüssel
function midPoint(code, x, y) {
    switch (code) {
        case 'T': return [x * 2 + 1, y * 2];
        case 'R': return [x * 2 + 2, y * 2 + 1];
        case 'B': return [x * 2 + 1, y * 2 + 2];
        case 'L': return [x * 2,     y * 2 + 1];
    }
}

// Binäres Feld (labels[y][x] === target) → Liste geschlossener Ringe in Rasterkoordinaten
function contours(labels, target, w, h) {
    const segs = [];
    const inside = (x, y) => (x >= 0 && y >= 0 && x < w && y < h && labels[y][x] === target) ? 1 : 0;
    // Zellen laufen über die Ecken hinaus (-1), damit Regionen am Rand geschlossen werden
    for (let y = -1; y < h; y++) {
        for (let x = -1; x < w; x++) {
            const code = inside(x, y) * 8 + inside(x + 1, y) * 4 + inside(x + 1, y + 1) * 2 + inside(x, y + 1);
            const cs = CASES[code];
            if (!cs) continue;
            for (const [from, to] of cs) segs.push([midPoint(from, x, y), midPoint(to, x, y)]);
        }
    }
    if (!segs.length) return [];
    // Segmente an den Endpunkten zusammenketten
    const key = p => p[0] + ',' + p[1];
    const bucket = new Map();
    segs.forEach((s, i) => {
        const k = key(s[0]);
        if (!bucket.has(k)) bucket.set(k, []);
        bucket.get(k).push(i);
    });
    const used = new Array(segs.length).fill(false);
    const rings = [];
    for (let i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        const ring = [segs[i][0]];
        let cur = i;
        used[i] = true;
        for (let guard = 0; guard < segs.length + 5; guard++) {
            const end = segs[cur][1];
            ring.push(end);
            const cand = (bucket.get(key(end)) || []).filter(j => !used[j]);
            if (!cand.length) break;                     // Ring geschlossen (oder Abbruch)
            cur = cand[0];
            used[cur] = true;
        }
        if (ring.length > 3) rings.push(ring);
    }
    return rings;
}

// Chaikin: rundet die Treppenstufen des Rasters zu organischen Linien
function chaikin(ring, iterations) {
    let r = ring;
    for (let it = 0; it < iterations; it++) {
        const out = [];
        for (let i = 0; i < r.length; i++) {
            const p = r[i], q = r[(i + 1) % r.length];
            out.push([p[0] * 0.75 + q[0] * 0.25, p[1] * 0.75 + q[1] * 0.25]);
            out.push([p[0] * 0.25 + q[0] * 0.75, p[1] * 0.25 + q[1] * 0.75]);
        }
        r = out;
    }
    return r;
}
// Ramer-Douglas-Peucker: Punktzahl senken, ohne die Form zu verlieren
function simplify(ring, eps) {
    if (ring.length < 4) return ring;
    const d2 = (p, a, b) => {
        const dx = b[0] - a[0], dy = b[1] - a[1];
        if (!dx && !dy) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
        let t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy);
        t = Math.max(0, Math.min(1, t));
        return (p[0] - (a[0] + t * dx)) ** 2 + (p[1] - (a[1] + t * dy)) ** 2;
    };
    const keep = new Array(ring.length).fill(false);
    keep[0] = keep[ring.length - 1] = true;
    const stack = [[0, ring.length - 1]];
    while (stack.length) {
        const [s, e] = stack.pop();
        let idx = -1, max = eps * eps;
        for (let i = s + 1; i < e; i++) {
            const d = d2(ring[i], ring[s], ring[e]);
            if (d > max) { max = d; idx = i; }
        }
        if (idx > 0) { keep[idx] = true; stack.push([s, idx], [idx, e]); }
    }
    return ring.filter((_, i) => keep[i]);
}

/**
 * Kern: Vereinspunkte + Elternfläche → ein Polygon je Staffel.
 * points: [{lon, lat, label}] · clip: [{outer, holes}] · res: Rasterweite
 * → { label: [ring, …] } mit ring = [[lon,lat], …]
 */
function marchingRegions({ points, clip, res = 220, smooth = 2, minAreaFrac = 0.004 }) {
    // Bounding-Box der Elternfläche
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    clip.forEach(p => p.outer.forEach(([lo, la]) => {
        if (lo < minLon) minLon = lo; if (lo > maxLon) maxLon = lo;
        if (la < minLat) minLat = la; if (la > maxLat) maxLat = la;
    }));
    const padLon = (maxLon - minLon) / res, padLat = (maxLat - minLat) / res;
    minLon -= padLon; maxLon += padLon; minLat -= padLat; maxLat += padLat;

    // Rasterschritt: Längengrade sind auf dieser Breite kürzer → Seitenverhältnis angleichen,
    // sonst verzerrt die Nächster-Nachbar-Suche die Grenzen in Ost-West-Richtung
    const latMid = (minLat + maxLat) / 2;
    const kx = Math.cos(latMid * Math.PI / 180);
    const wDeg = (maxLon - minLon) * kx, hDeg = (maxLat - minLat);
    const w = Math.max(8, Math.round(res * (wDeg / Math.max(wDeg, hDeg))));
    const h = Math.max(8, Math.round(res * (hDeg / Math.max(wDeg, hDeg))));
    const stepLon = (maxLon - minLon) / (w - 1), stepLat = (maxLat - minLat) / (h - 1);

    // Raster füllen: Staffel des nächstgelegenen Vereins (nur innerhalb der Elternfläche)
    const labels = [];
    for (let y = 0; y < h; y++) {
        const row = new Array(w).fill(null);
        const lat = maxLat - y * stepLat;                    // y wächst nach unten
        for (let x = 0; x < w; x++) {
            const lon = minLon + x * stepLon;
            if (!pointInPolys(lon, lat, clip)) continue;
            let best = Infinity, bl = null;
            for (const p of points) {
                const dx = (p.lon - lon) * kx, dy = p.lat - lat;
                const d = dx * dx + dy * dy;
                if (d < best) { best = d; bl = p.label; }
            }
            row[x] = bl;
        }
        labels.push(row);
    }

    // Je Staffel Konturen ziehen und in Längen-/Breitengrade zurückrechnen
    const toGeo = ([gx, gy]) => [minLon + (gx / 2) * stepLon, maxLat - (gy / 2) * stepLat];
    const totalArea = (maxLon - minLon) * (maxLat - minLat);
    const out = {};
    const seen = [...new Set(labels.flat().filter(Boolean))];
    for (const label of seen) {
        // Filter-Regel: eine Fläche bleibt, wenn sie groß genug ist ODER einen eigenen Verein
        // enthält. Ohne die zweite Bedingung fallen echte Exklaven weg – ein Verein, der
        // geografisch in der Nachbarstaffel liegt (Burghausen, Viktoria Berlin), bildet eine
        // winzige, aber völlig korrekte Insel. Ohne Verein ist eine Mini-Fläche Raster-Artefakt.
        const own = points.filter(p => p.label === label);
        const rings = contours(labels, label, w, h)
            .map(r => r.map(toGeo))
            .map(r => simplify(chaikin(r, smooth), Math.min(stepLon, stepLat) * 0.35))
            .filter(r => r.length > 3 && (ringArea(r) > totalArea * minAreaFrac
                                          || own.some(p => pointInRing(p.lon, p.lat, r))));
        rings.sort((a, b) => ringArea(b) - ringArea(a));
        if (rings.length) out[label] = rings;
    }
    return out;
}

// ── Vorschau als SVG ────────────────────────────────────────────────────────
const PALETTE = ['#e15759','#4e79a7','#59a14f','#edc949','#af7aa1','#ff9da7','#76b7b2','#9c755f'];

function toSvg({ regions, clip, points, labelNames, title }) {
    let minLon = Infinity, maxLon = -Infinity, minLat = Infinity, maxLat = -Infinity;
    clip.forEach(p => p.outer.forEach(([lo, la]) => {
        if (lo < minLon) minLon = lo; if (lo > maxLon) maxLon = lo;
        if (la < minLat) minLat = la; if (la > maxLat) maxLat = la;
    }));
    const latMid = (minLat + maxLat) / 2, kx = Math.cos(latMid * Math.PI / 180);
    const W = 900, pad = 40;
    const sx = (maxLon - minLon) * kx, sy = (maxLat - minLat);
    const scale = (W - 2 * pad) / sx, H = Math.round(sy * scale + 2 * pad);
    const px = ([lo, la]) => [(pad + (lo - minLon) * kx * scale).toFixed(1),
                              (pad + (maxLat - la) * scale).toFixed(1)];
    const pathOf = ring => 'M' + ring.map(p => px(p).join(',')).join('L') + 'Z';

    const keys = Object.keys(regions);
    let body = '';
    keys.forEach((k, i) => {
        const col = PALETTE[i % PALETTE.length];
        regions[k].forEach(r => {
            body += `<path d="${pathOf(r)}" fill="${col}" fill-opacity="0.45" stroke="${col}" stroke-width="1.6"/>\n`;
        });
    });
    clip.forEach(p => { body += `<path d="${pathOf(p.outer)}" fill="none" stroke="#222" stroke-width="1.8" stroke-dasharray="4,3"/>\n`; });
    points.forEach(p => {
        const i = keys.indexOf(p.label), col = PALETTE[(i < 0 ? 0 : i) % PALETTE.length];
        const [x, y] = px([p.lon, p.lat]);
        body += `<circle cx="${x}" cy="${y}" r="3" fill="${col}" stroke="#fff" stroke-width="1"/>\n`;
    });
    let legend = `<text x="${pad}" y="24" font-family="sans-serif" font-size="15" font-weight="bold">${title}</text>\n`;
    keys.forEach((k, i) => {
        const col = PALETTE[i % PALETTE.length], y = H - pad + 14 + (i % 3) * 15, x = pad + Math.floor(i / 3) * 260;
        legend += `<rect x="${x}" y="${y - 9}" width="11" height="11" fill="${col}" fill-opacity="0.6" stroke="${col}"/>`;
        legend += `<text x="${x + 16}" y="${y}" font-family="sans-serif" font-size="11">${labelNames[k] || k}</text>\n`;
    });
    const HH = H + 60;
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${HH}" viewBox="0 0 ${W} ${HH}">
<rect width="${W}" height="${HH}" fill="#fff"/>\n${body}${legend}</svg>`;
}

// ── Presets ─────────────────────────────────────────────────────────────────
// clip = Verbandsnamen aus tools/verbaende.geojson (handgezeichnet, Google Earth).
// Fehlt die Datei, wird auf die groben Bundesland-Geometrien aus map_data.js zurückgefallen.
const PRESETS = {
    'bayern-landesliga': { leagues: ['6-31','6-32','6-33','6-34','6-35'], clip: ['Bayern'], fallback: ['bl_bayern'], title: 'Landesliga Bayern – 5 Staffeln' },
    'bayernliga':        { leagues: ['5-13','5-14'],                      clip: ['Bayern'], fallback: ['bl_bayern'], title: 'Bayernliga Nord / Süd' },
    'nofv':              { leagues: ['5-8','5-9'],
                           clip: ['Berlin','Brandenburg','Mecklenburg-Vorpommern','Sachsen-Anhalt','Sachsen','Thüringen'],
                           fallback: ['bl_berlin','bl_brandenburg','bl_mecklenburg_vorpommern','bl_sachsen_anhalt','bl_sachsen','bl_thüringen'],
                           title: 'NOFV-Oberliga Nord / Süd' }
};

// Verbandsflächen → [{outer, holes}, …]; null wenn nicht vorhanden.
// BEWUSST die vereinfachte Fassung: Der Raster-Test fragt nur "Zellmittelpunkt drinnen?",
// und eine Zelle ist ~2 km groß. Gegen die volle Auflösung (270k Stützpunkte) dauert derselbe
// Lauf 4,2 s statt 0,5 s. Die Anzeige-Fassung (100 m) wäre noch schneller, schneidet aber
// Vereine direkt auf der Grenze weg (Wacker Burghausen an der Salzach) – daher die 25-m-Fassung.
function loadVerbaende(names) {
    let p = path.join(__dirname, 'verbaende_grid.geojson');
    if (!fs.existsSync(p)) p = path.join(__dirname, 'verbaende.geojson');
    if (!fs.existsSync(p)) return null;
    const fc = JSON.parse(fs.readFileSync(p, 'utf8'));
    const out = [];
    for (const nm of names) {
        const f = fc.features.find(x => x.properties.name === nm);
        if (!f) return null;
        const g = f.geometry;
        const polys = g.type === 'MultiPolygon' ? g.coordinates : [g.coordinates];
        polys.forEach(rings => out.push({ outer: rings[0], holes: rings.slice(1) }));
    }
    return out;
}

function run(name) {
    const preset = PRESETS[name];
    if (!preset) { console.error('Unbekanntes Preset:', name, '– bekannt:', Object.keys(PRESETS).join(', ')); process.exit(1); }
    const GD = loadGameData(), MD = loadMapData();

    let clip = loadVerbaende(preset.clip), quelle = 'verbaende.geojson (Google Earth)';
    if (!clip) {
        quelle = 'map_data.js (grobe Bundesland-Geometrie)';
        clip = preset.fallback.map(id => {
            const r = MD.R.find(x => x.id === id);
            if (!r) throw new Error('Clip-Region fehlt: ' + id);
            const co = r.geo.geometry.coordinates;
            return r.geo.geometry.type === 'MultiPolygon'
                ? { outer: co[0][0], holes: co[0].slice(1) }
                : { outer: co[0], holes: co.slice(1) };
        });
    }

    const points = Object.values(GD.teams)
        .filter(t => preset.leagues.includes(t.leagueId) && t.lon != null && t.lat != null)
        .map(t => ({ lon: t.lon, lat: t.lat, label: t.leagueId, name: t.name }));

    const labelNames = {};
    preset.leagues.forEach(l => { labelNames[l] = (GD.leagues[l] || {}).name || l; });

    const t0 = Date.now();
    const regions = marchingRegions({ points, clip });
    const ms = Date.now() - t0;

    console.log(`\n${preset.title}`);
    console.log(`  Vereine: ${points.length} · Clip-Polygone: ${clip.length} · Quelle: ${quelle} · Rechenzeit: ${ms} ms`);
    Object.keys(regions).forEach(k => {
        const rs = regions[k];
        const pts = rs.reduce((s, r) => s + r.length, 0);
        console.log(`  ${(labelNames[k] || k).padEnd(28)} ${String(rs.length).padStart(2)} Fläche(n), ${String(pts).padStart(4)} Punkte`);
    });
    const missing = preset.leagues.filter(l => !regions[l]);
    if (missing.length) console.log('  ⚠ ohne Fläche:', missing.join(', '));

    // Güte der Elternfläche: Vereine außerhalb des Clips können keine eigene Zelle bekommen.
    // Das ist KEIN Fehler des Algorithmus, sondern ein zu grob gezeichneter Rand – der beste
    // Indikator dafür, ob die (später handgezeichnete) Grenze fein genug ist.
    const outside = points.filter(p => !pointInPolys(p.lon, p.lat, clip));
    if (outside.length) {
        console.log(`  ⚠ ${outside.length} Verein(e) außerhalb der Clip-Fläche – Grenze dort zu grob:`);
        outside.forEach(p => console.log(`      ${p.name}  (${p.lat}, ${p.lon})`));
    }
    // Gegenprobe: liegt jeder Verein in der Fläche SEINER Staffel?
    const stray = points.filter(p => !(regions[p.label] || []).some(r => pointInRing(p.lon, p.lat, r)));
    console.log(`  Vereine in der eigenen Fläche: ${points.length - stray.length}/${points.length}`
        + (stray.length ? '  ✗ ' + stray.map(p => p.name).join(', ') : '  ✓'));

    const out = path.join(__dirname, `_marching_${name}.svg`);
    fs.writeFileSync(out, toSvg({ regions, clip, points, labelNames, title: preset.title }), 'utf8');
    console.log('  → ' + path.relative(ROOT, out));
    return regions;
}

if (require.main === module) {
    const arg = process.argv[2] || 'alle';
    (arg === 'alle' ? Object.keys(PRESETS) : [arg]).forEach(run);
}

module.exports = { marchingRegions, contours, chaikin, simplify, pointInPolys };
