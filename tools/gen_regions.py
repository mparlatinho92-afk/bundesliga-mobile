#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt app/map_regions.js – die Geometrie-Grundlage der Spielkarte.

ERSETZT die alten Hüllen (MAP_HULL_POLYS mit hull/seasonHull/fullHull/voronoiHull).
Statt vier Näherungen aus Vereinspunkten gibt es genau EINE Regel:

    Fläche einer Region = Vereinigung ihrer Landesverbände,
    und wo sich mehrere Regionen einen Verband teilen, schneidet Marching Squares.

Daraus folgt die Aufteilung der 64 Regionen aus team.regions[]:
  * 21 sind selbst ein Landesverband           -> amtliche Fläche, statisch
  *  8 sind Zusammenfassungen (Regionalverband,
       "Baden-Württemberg", "Rheinland-Pfalz/Saar")-> Vereinigung, statisch
  * 35 liegen unterhalb eines Verbands
       (Bayern Südost, Hammonia, Westpfalz …)   -> existieren real nicht,
                                                   werden zur Laufzeit gerechnet

Nur 15 (Verband, Ebene)-Paare müssen überhaupt geteilt werden; die übrigen 51
haben auf ihrer Ebene nur eine Region und bekommen den ganzen Verband.

Ausgabe (app/map_regions.js, wird von manage-v inliniert):
  MAP_VERBAND_POLYS  {Verbandsname: [[ring,…], …]}  – Ringe als [lat,lon] (Leaflet)
  MAP_REGIONS        [{id,label,stufe,whole,split,excelFilter}]
      whole = Verbände, die ganz zu dieser Region gehören
      split = Verbände, die sie sich mit Nachbarregionen teilt (Laufzeit-Rechnung)

Aufruf: python tools/gen_regions.py
"""
import os, re, sys, json
sys.stdout.reconfigure(encoding='utf-8')
import math
from shapely.geometry import shape, Point, Polygon as SPoly, mapping
from shapely.ops import unary_union
from shapely.prepared import prep as prep_geom
from collections import defaultdict

# ── Marching Squares (Port aus tools/marching.cjs) ───────────────────────────
# Für die 15 (Verband, Ebene)-Paare, in denen sich mehrere Regionen einen Verband
# teilen. Diese Grenzen existieren real nicht – sie folgen der Vereinsverteilung.
CASES = {1:[('B','L')], 2:[('R','B')], 3:[('R','L')], 4:[('T','R')],
         5:[('T','R'),('B','L')], 6:[('T','B')], 7:[('T','L')], 8:[('L','T')],
         9:[('B','T')], 10:[('L','T'),('R','B')], 11:[('R','T')], 12:[('L','R')],
         13:[('B','R')], 14:[('L','B')]}

def _mid(code, x, y):
    return {'T':(x*2+1, y*2), 'R':(x*2+2, y*2+1), 'B':(x*2+1, y*2+2), 'L':(x*2, y*2+1)}[code]

def _contours(labels, target, w, h):
    segs = []
    def ins(x, y):
        return 1 if (0 <= x < w and 0 <= y < h and labels[y][x] == target) else 0
    for y in range(-1, h):
        for x in range(-1, w):
            code = ins(x,y)*8 + ins(x+1,y)*4 + ins(x+1,y+1)*2 + ins(x,y+1)
            for a, b in CASES.get(code, ()):
                segs.append((_mid(a,x,y), _mid(b,x,y)))
    if not segs: return []
    start = defaultdict(list)
    for i, sg in enumerate(segs): start[sg[0]].append(i)
    used, rings = [False]*len(segs), []
    for i in range(len(segs)):
        if used[i]: continue
        ring, cur, used[i] = [segs[i][0]], i, True
        for _ in range(len(segs)+5):
            end = segs[cur][1]; ring.append(end)
            nxt = [j for j in start.get(end, ()) if not used[j]]
            if not nxt: break
            cur = nxt[0]; used[cur] = True
        if len(ring) > 3: rings.append(ring)
    return rings

def _chaikin(ring, it=2):
    r = ring
    for _ in range(it):
        out = []
        for i in range(len(r)):
            p, q = r[i], r[(i+1) % len(r)]
            out.append((p[0]*0.75+q[0]*0.25, p[1]*0.75+q[1]*0.25))
            out.append((p[0]*0.25+q[0]*0.75, p[1]*0.25+q[1]*0.75))
        r = out
    return r

def partition(parent, points, res=200):
    """parent: shapely-Fläche des Verbands · points: [(lon,lat,label)]
    -> {label: shapely-Fläche}. Lückenlos innerhalb von parent."""
    minx, miny, maxx, maxy = parent.bounds
    latm = (miny+maxy)/2.0
    kx = math.cos(math.radians(latm))
    wdeg, hdeg = (maxx-minx)*kx, (maxy-miny)
    w = max(8, int(round(res * wdeg/max(wdeg, hdeg))))
    h = max(8, int(round(res * hdeg/max(wdeg, hdeg))))
    sx, sy = (maxx-minx)/(w-1), (maxy-miny)/(h-1)
    prep = prep_geom(parent)
    labels = []
    for yi in range(h):
        lat = maxy - yi*sy
        row = [None]*w
        for xi in range(w):
            lon = minx + xi*sx
            if not prep.contains(Point(lon, lat)): continue
            best, bl = 1e18, None
            for plon, plat, lb in points:
                dx = (plon-lon)*kx; dy = plat-lat
                d = dx*dx + dy*dy
                if d < best: best, bl = d, lb
            row[xi] = bl
        labels.append(row)
    out = {}
    for lb in {p[2] for p in points}:
        polys = []
        for ring in _contours(labels, lb, w, h):
            geo = [(minx + gx/2.0*sx, maxy - gy/2.0*sy) for gx, gy in _chaikin(ring)]
            if len(geo) < 4: continue
            try: p = SPoly(geo).buffer(0)
            except Exception: continue
            if not p.is_empty and p.area > 0: polys.append(p)
        if polys:
            g = unary_union(polys).intersection(parent).buffer(0)   # sauber am Verbandsrand abschneiden
            if not g.is_empty: out[lb] = g
    return out



HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SRC  = os.path.join(HERE, 'verbaende.geojson')
OUT  = os.path.join(ROOT, 'app', 'map_regions.js')

SIMPLIFY = 0.004     # ~440 m – auf Zoomstufe Deutschland nicht sichtbar; jede Ebene traegt
                     # den Verbandsumriss erneut, deshalb zaehlt hier jeder Stuetzpunkt dreifach
NDIGITS  = 3         # ~110 m Koordinaten-Raster – feiner als die Vereinfachung waere sinnlos

VERBAENDE = ['Baden','Bayern','Berlin','Brandenburg','Bremen','Hamburg','Hessen',
             'Mecklenburg-Vorpommern','Mittelrhein','Niederrhein','Niedersachsen','Rheinland',
             'Saarland','Sachsen','Sachsen-Anhalt','Schleswig-Holstein','Südbaden','Südwest',
             'Thüringen','Westfalen','Württemberg']
ALIAS = {'Südwestdeutscher Fußballverband':'Südwest','Fußballverband Rheinland':'Rheinland',
         'Fußball-Verband Mittelrhein':'Mittelrhein','Hamburger Fußball-Verband':'Hamburg',
         'Bremer Fußball-Verband':'Bremen','Saarländischer Fußballverband':'Saarland',
         'Schleswig-Holsteinischer Fußballverband':'Schleswig-Holstein'}


def load_teams():
    src = open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    m = re.search(r'"teams"\s*:\s*\{', src); i = m.end() - 1; d = 0
    for j in range(i, len(src)):
        if src[j] == '{': d += 1
        elif src[j] == '}':
            d -= 1
            if d == 0: break
    return json.loads(src[i:j + 1])

def verband_of(regs):
    for r in regs or []:
        if r in VERBAENDE: return r
        if r in ALIAS: return ALIAS[r]
    return None

def slug(s):
    """Muss zeichengenau der ID-Bildung in gen_map.cjs entsprechen
    (v.replace(/[^a-z0-9]/gi,'_').toLowerCase()): JEDES Nicht-ASCII-Alnum wird zu genau
    einem '_', ohne Zusammenfassen. Sonst brechen MAP_HIER, gespeicherte Auswahlen und
    die Steckbrief-Verlinkung, die alle auf diesen IDs stehen."""
    return ''.join(c if (c.isascii() and c.isalnum()) else '_' for c in s).lower()


def main():
    teams = load_teams()

    # 1) Welche Region liegt auf welcher Ebene, und wie verteilen sich die Vereine
    #    eines Verbands auf die Regionen dieser Ebene?
    stufe_of = {}
    label_verb = defaultdict(set)                 # Region -> beteiligte Verbände
    per_vl = defaultdict(lambda: defaultdict(int))  # (Verband, Ebene) -> {Region: n}
    for t in teams.values():
        v = verband_of(t.get('regions'))
        for k, r in enumerate(t.get('regions') or []):
            stufe_of.setdefault(r, k + 1)
            stufe_of[r] = min(stufe_of[r], k + 1)
            if v:
                label_verb[r].add(v)
                per_vl[(v, k + 1)][r] += 1

    # 2) Region -> whole / split
    regions = []
    for r, vs in sorted(label_verb.items(), key=lambda x: (stufe_of[x[0]], x[0])):
        s = stufe_of[r]
        whole, split = [], []
        for v in sorted(vs):
            (whole if len(per_vl[(v, s)]) == 1 else split).append(v)
        regions.append(dict(id='hull_s%d_%s' % (s, slug(r)), label=r, stufe=s,
                            whole=whole, split=split, excelFilter=[r]))

    stat = defaultdict(int)
    for r in regions:
        stat['statisch' if not r['split'] else 'teil-dynamisch' if r['whole'] else 'dynamisch'] += 1
    print('Regionen: %d  (%s)' % (len(regions), ', '.join('%s %d' % (k, v) for k, v in sorted(stat.items()))))
    paare = [(v, l) for (v, l), rs in per_vl.items() if len(rs) > 1]
    print('(Verband, Ebene)-Paare mit Teilung: %d von %d' % (len(paare), len(per_vl)))

    # 3) Verbandsflächen laden
    fc = json.load(open(SRC, encoding='utf-8'))
    VG = {f['properties']['name']: shape(f['geometry']).buffer(0) for f in fc['features']}
    fehlt = [v for v in VERBAENDE if v not in VG]
    if fehlt: print('  ⚠ Verband ohne Fläche:', ', '.join(fehlt))

    # 4) Die 15 nötigen Teilungen einmal rechnen (Marching Squares je Verband+Ebene)
    coords = {}
    for t in teams.values():
        if t.get('lat') is None: continue
        coords[t['name']] = (t['lon'], t['lat'])
    stuecke = {}
    todo = [(v, l) for (v, l), rs in per_vl.items() if len(rs) > 1]
    for n, (v, l) in enumerate(sorted(todo), 1):
        pts = []
        for t in teams.values():
            if t.get('lat') is None or verband_of(t.get('regions')) != v: continue
            regs = t.get('regions') or []
            if len(regs) >= l: pts.append((t['lon'], t['lat'], regs[l-1]))
        if v not in VG or len(pts) < 2: continue
        res = partition(VG[v], pts)
        for lb, g in res.items(): stuecke[(v, l, lb)] = g
        print('   [%2d/%d] %-24s s%d → %d Teilflächen' % (n, len(todo), v, l, len(res)))

    # 5) Fläche je Region zusammensetzen: ganze Verbände + ggf. Teilstücke
    npts = 0
    for r in regions:
        gs = [VG[v] for v in r['whole'] if v in VG]
        gs += [stuecke[(v, r['stufe'], r['label'])] for v in r['split']
               if (v, r['stufe'], r['label']) in stuecke]
        if not gs:
            print('   ⚠ keine Fläche für %s' % r['label']); r['geo'] = []; continue
        g = unary_union(gs).buffer(0).simplify(SIMPLIFY, preserve_topology=True)
        parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
        out = []
        for p in parts:
            if p.is_empty or p.area < 1e-6: continue
            rings = [[[round(y, NDIGITS), round(x, NDIGITS)] for x, y in p.exterior.coords]]
            for hI in p.interiors:
                rings.append([[round(y, NDIGITS), round(x, NDIGITS)] for x, y in hI.coords])
            out.append(rings); npts += sum(len(ri) for ri in rings)
        r['geo'] = out
    print('Regionsflächen: %d Stützpunkte gesamt (Vereinfachung %.0f m)' % (npts, SIMPLIFY * 111000))

    # 6) Schreiben – eine Geometrie je Region, nichts sonst
    j = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    NL = chr(10)
    kopf = NL.join([
        '// Automatisch generiert von tools/gen_regions.py – nicht manuell editieren.',
        '// Fläche einer Region = Vereinigung ihrer Landesverbände (amtliche Kreisgrenzen);',
        '// wo mehrere Regionen sich einen Verband teilen (15 Fälle), schneidet Marching',
        '// Squares entlang der Vereinsverteilung. Ersetzt die alten Hüllen',
        '// (hull/seasonHull/fullHull/voronoiHull) – eine Geometrie statt vier Näherungen.',
        '// geo = [[Außenring, Loch, …], …] als [lat,lon] (Leaflet-Konvention).', ''])
    with open(OUT, 'w', encoding='utf-8', newline=NL) as f:
        f.write(kopf)
        f.write('const MAP_REGIONS = %s;%s' % (j(regions), NL))
    print('→ app/map_regions.js  %.2f MB' % (os.path.getsize(OUT) / 1e6))


if __name__ == '__main__':
    main()
