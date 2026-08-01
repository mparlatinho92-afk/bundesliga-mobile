#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Erzeugt app/map_admin.js – amtliche Verwaltungsgrenzen als eigene Karten-Ebenen.

  MAP_KREISE     alle Kreise im Verbandsgebiet (OSM admin_level 6)
  MAP_GEMEINDEN  Gemeinden (admin_level 8) – NUR in den Kreisen, die zwischen zwei
                 Verbänden geteilt sind. Nur dort bringt Gemeinde-Genauigkeit etwas;
                 alle ~11.000 deutschen Gemeinden wären 124 MB Quelle und im Monolithen
                 nicht tragbar.

Beide Ebenen bekommen in der Karte je einen eigenen Filter (map-chk-kreise /
map-chk-gemeinden) und sind reine Referenz – sie beeinflussen die Verbandsflächen nicht.

Aufruf: python tools/gen_admin.py
"""
import os, re, sys, json, pickle, math
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import shape, Polygon as SPoly
from shapely.ops import unary_union
from collections import defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GEO  = r"C:\Users\lyric\OneDrive\Dokumente\Google Earth Orte\2021 mygeodata"
KREISE_KML = os.path.join(GEO, 'Kreise (District Borders)', 'Deutschland_border_level6_polygon.kml')
GEM_KMLS = [os.path.join(GEO, 'Gemeinden (Town Borders)', n) for n in [
    'Süddeutschland (Baden-Württemberg   Bayern)_border_level8_polygon.kml',
    'Nordrhein-Westfalen   Hessen_border_level8_polygon.kml',
    'Norddeutschland_border_level8_polygon.kml',
    'Südwest_border_level8_polygon.kml']]
GEM_CACHE = os.path.join(HERE, '_gemeinden_cache.pkl')     # regenerierbar, nicht committen
OUT = os.path.join(ROOT, 'app', 'map_admin.js')

SIMP_KREIS = 0.0025   # ~275 m – muss schaerfer sein als die Verbandsflaechen (440 m),
                      # denn die Kreise sind der Massstab, an dem man deren Schaerfe beurteilt
SIMP_GEM   = 0.0006    # ~65 m – Gemeinden sind klein, hier zählt Schärfe
NDIGITS    = 4
SPLIT_MIN  = 0.02      # ab diesem Anteil gilt ein Kreis als zwischen Verbänden geteilt


def parse_ring(s):
    out = []
    for tok in s.split():
        p = tok.split(',')
        if len(p) >= 2:
            try: out.append((float(p[0]), float(p[1])))
            except ValueError: pass
    return out

def polygons_of(body):
    parts = []
    for pg in re.findall(r'<Polygon>(.*?)</Polygon>', body, re.DOTALL):
        o = re.search(r'<outerBoundaryIs>.*?<coordinates>(.*?)</coordinates>', pg, re.DOTALL)
        if not o: continue
        outer = parse_ring(o.group(1))
        holes = [parse_ring(h) for h in
                 re.findall(r'<innerBoundaryIs>.*?<coordinates>(.*?)</coordinates>', pg, re.DOTALL)]
        holes = [h for h in holes if len(h) >= 3]
        if len(outer) >= 3:
            try: parts.append(SPoly(outer, holes))
            except Exception: pass
    return parts

def read_kml(path, keep=None):
    """keep(name, geom) -> bool ; spart Speicher bei den großen Gemeinde-Dateien"""
    kml = open(path, encoding='utf-8', errors='replace').read()
    out = []
    for pm in re.finditer(r'<Placemark>(.*?)</Placemark>', kml, re.DOTALL):
        b = pm.group(1)
        nm = re.search(r'<name>(.*?)</name>', b, re.DOTALL)
        if not nm: continue
        parts = polygons_of(b)
        if not parts: continue
        g = unary_union([p.buffer(0) for p in parts])
        if g.is_empty: continue
        name = nm.group(1).strip()
        if keep and not keep(name, g): continue
        out.append((name, g))
    return out

def rings_of(g, simp):
    g = g.simplify(simp, preserve_topology=True)
    parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    out = []
    for p in parts:
        if p.is_empty: continue
        rr = [[[round(y, NDIGITS), round(x, NDIGITS)] for x, y in p.exterior.coords]]
        for h in p.interiors:
            rr.append([[round(y, NDIGITS), round(x, NDIGITS)] for x, y in h.coords])
        out.append(rr)
    return out


def main():
    print('1) Verbandsflächen laden')
    fc = json.load(open(os.path.join(HERE, 'verbaende.geojson'), encoding='utf-8'))
    V = {f['properties']['name']: shape(f['geometry']).buffer(0) for f in fc['features']}
    gebiet = unary_union(list(V.values())).buffer(0)

    print('2) Kreise laden und aufs Verbandsgebiet beschränken')
    cache = os.path.join(HERE, '_kreise_cache.pkl')
    if os.path.exists(cache):
        K = [(k['name'], k['geom']) for k in pickle.load(open(cache, 'rb'))]
    else:
        K = read_kml(KREISE_KML)
    inland = [(n, g) for n, g in K
              if g.intersects(gebiet) and g.intersection(gebiet).area > g.area * 0.5]
    byname = defaultdict(list)
    for n, g in inland: byname[n].append(g)
    kreise = {n: unary_union(gs).buffer(0) for n, gs in byname.items()}
    print('   %d Kreise (aus %d Placemarks)' % (len(kreise), len(inland)))

    print('3) Geteilte Kreise bestimmen – nur dort werden Gemeinden gebraucht')
    geteilt = {}
    for n, g in kreise.items():
        an = {v: V[v].intersection(g).area / g.area for v in V if V[v].intersects(g)}
        an = {v: a for v, a in an.items() if a > SPLIT_MIN}
        if len(an) > 1: geteilt[n] = g
    print('   %d von %d Kreisen geteilt' % (len(geteilt), len(kreise)))
    ziel = unary_union(list(geteilt.values())).buffer(0)

    print('4) Gemeinden laden (nur innerhalb der geteilten Kreise)')
    if os.path.exists(GEM_CACHE):
        gem = pickle.load(open(GEM_CACHE, 'rb'))
        print('   aus Cache: %d' % len(gem))
    else:
        gem = []
        for p in GEM_KMLS:
            if not os.path.exists(p):
                print('   ⚠ fehlt: %s' % os.path.basename(p)); continue
            got = read_kml(p, keep=lambda n, g: g.representative_point().within(ziel))
            print('   %-52s %4d' % (os.path.basename(p)[:52], len(got)))
            gem += got
        pickle.dump(gem, open(GEM_CACHE, 'wb'))
    # Gemeinde ihrem Kreis zuordnen (für Tooltip/Filter)
    gout = []
    for n, g in gem:
        kr = next((kn for kn, kg in geteilt.items() if kg.intersects(g)
                   and kg.intersection(g).area > g.area * 0.5), '')
        gout.append(dict(name=n, kreis=kr, geo=rings_of(g, SIMP_GEM)))

    print('5) Schreiben')
    kout = [dict(name=n, geo=rings_of(g, SIMP_KREIS)) for n, g in sorted(kreise.items())]
    npts = lambda arr: sum(len(r) for e in arr for poly in e['geo'] for r in poly)
    NL = chr(10)
    j = lambda o: json.dumps(o, ensure_ascii=False, separators=(',', ':'))
    kopf = NL.join([
        '// Automatisch generiert von tools/gen_admin.py – nicht manuell editieren.',
        '// Amtliche Verwaltungsgrenzen als Referenz-Ebenen der Karte (je eigener Filter).',
        '// MAP_GEMEINDEN enthält bewusst NUR die Gemeinden in Kreisen, die zwischen zwei',
        '// Verbänden geteilt sind – nur dort bringt diese Genauigkeit etwas.', ''])
    with open(OUT, 'w', encoding='utf-8', newline=NL) as f:
        f.write(kopf)
        f.write('const MAP_KREISE = %s;%s' % (j(kout), NL))
        f.write('const MAP_GEMEINDEN = %s;%s' % (j(gout), NL))
    print('   Kreise    %4d, %6d Punkte' % (len(kout), npts(kout)))
    print('   Gemeinden %4d, %6d Punkte' % (len(gout), npts(gout)))
    print('→ app/map_admin.js  %.2f MB' % (os.path.getsize(OUT) / 1e6))


if __name__ == '__main__':
    main()
