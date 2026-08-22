#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Entscheidungshilfe fuer GEMEINDE_KREISE / GEMEINDE_AUSNAHMEN in gen_regions.py.

Zeigt fuer jede Gemeinde eines Kreises, wie das Wabenraster sie heute zerschneidet, wem sie
beim Schnappen zufiele und welcher Verein am naechsten sitzt. Ein Kreis lohnt die Positivliste,
wenn dort viele Gemeinden auf mehrere Waben verteilt sind - genau das sieht man in Spalte
"geteilt auf".

  python tools/gemeinde_check.py Westfalen "Hochsauerlandkreis;Kreis Soest;Kreis Paderborn"
  python tools/gemeinde_check.py Hessen "Schwalm-Eder-Kreis"
"""
import os, sys, json, math
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from shapely.geometry import shape, Point
import gen_regions as GR

VB = sys.argv[1]
KREISE = [k for k in sys.argv[2].split(';') if k] if len(sys.argv) > 2 else GR.GEMEINDE_KREISE.get(VB, [])
if not KREISE:
    sys.exit('Kein Kreis angegeben und %s steht nicht in GEMEINDE_KREISE.' % VB)

teams = GR.load_teams()
VG = {f['properties']['name']: shape(f['geometry']).buffer(0)
      for f in json.load(open(os.path.join(HERE, 'verbaende.geojson'), encoding='utf-8'))['features']}
parent = VG[VB]
pts = [(t['lon'], t['lat'], t['name']) for t in teams.values()
       if t.get('lat') is not None and GR.verband_of(t.get('regions')) == VB]
print('%s: %d Vereine' % (VB, len(pts)))

wb = GR.partition(parent, pts)          # der heutige Rasterstand
gem = GR.lade_gemeinden(VB, KREISE, parent)
print('%d Gemeinden in %s\n' % (len(gem), ', '.join(KREISE)))

kx = math.cos(math.radians(parent.centroid.y))
geteilt = 0
for nm, g in sorted(gem):
    if g.is_empty: continue
    anteile = sorted(((g.intersection(w).area / g.area, v) for v, w in wb.items()
                      if w.intersects(g)), reverse=True)
    anteile = [(a, v) for a, v in anteile if a > 0.005]
    if not anteile: continue
    if len(anteile) > 1: geteilt += 1
    rp = g.representative_point()
    nah_d, nah_v = min((math.hypot((p[0] - rp.x) * kx * 111.32, (p[1] - rp.y) * 110.57), p[2]) for p in pts)
    drin = [p[2] for p in pts if g.contains(Point(p[0], p[1]))]
    print('%-24s %5.0f km2  Mehrheit %-26s %3.0f%%  geteilt auf %d  |  naechster %-24s %5.1f km%s%s'
          % (nm[:24], g.area * 111.32 * 110.57 * kx, anteile[0][1][:26], 100 * anteile[0][0],
             len(anteile), nah_v[:24], nah_d,
             '  | Verein im Ort: ' + ', '.join(drin) if drin else '',
             '  <<< Mehrheit != naechster' if anteile[0][1] != nah_v else ''))
print('\n%d von %d Gemeinden sind heute zerschnitten.' % (geteilt, len(gem)))
