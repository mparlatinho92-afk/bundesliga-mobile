#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Was kostet und was bringt es, einen Kreis in GEMEINDE_KREISE aufzunehmen?

Rechnet denselben Verband zweimal: nacktes Raster gegen Raster + Gemeinde-Schnappen, und
vergleicht Stuetzpunkte (das ist die Dateigroesse von app/map_regions.js), zerschnittene
Gemeinden und Exklaven. Aendert nichts - nur Zahlen.

  python tools/waben_vergleich.py Westfalen                       # Positivliste aus gen_regions
  python tools/waben_vergleich.py Hessen "Vogelsbergkreis"         # Kreis probeweise dazu
"""
import os, sys, json, math
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shapely.geometry import shape
import gen_regions as GR

VB = sys.argv[1]
KREISE = list(GR.GEMEINDE_KREISE.get(VB, []))
if len(sys.argv) > 2: KREISE += [k for k in sys.argv[2].split(';') if k]
if not KREISE: sys.exit('Kein Kreis fuer %s.' % VB)

teams = GR.load_teams()
VG = {f['properties']['name']: shape(f['geometry']).buffer(0)
      for f in json.load(open(os.path.join(HERE, 'verbaende.geojson'), encoding='utf-8'))['features']}
parent = VG[VB]
pts = [(t['lon'], t['lat'], t['name']) for t in teams.values()
       if t.get('lat') is not None and GR.verband_of(t.get('regions')) == VB]

def kennzahlen(waben):
    n = e = 0
    for g in waben.values():
        g = g.simplify(GR.SIMPLIFY, preserve_topology=True)
        teile = [p for p in (list(g.geoms) if g.geom_type.startswith('Multi') else [g])
                 if not p.is_empty and GR._breite_m(p) >= GR.MINI_BREITE_M]
        e += max(0, len(teile) - 1)
        for p in teile: n += len(p.exterior.coords) + sum(len(h.coords) for h in p.interiors)
    return n, e

roh = GR.partition(parent, pts)
n0, e0 = kennzahlen(roh)
gem = GR.lade_gemeinden(VB, KREISE, parent)
n = GR.schnapp_gemeinden(roh, gem, {nm: (lo, la) for lo, la, nm in pts})
n1, e1 = kennzahlen(roh)
print('\n%s · %s' % (VB, ', '.join(KREISE)))
print('   %d von %d Gemeinden zusammengefuehrt' % (n, len(gem)))
print('   Stuetzpunkte  %6d -> %6d  (%+.0f %%)' % (n0, n1, 100.0 * (n1 - n0) / max(1, n0)))
print('   Exklaven      %6d -> %6d' % (e0, e1))
