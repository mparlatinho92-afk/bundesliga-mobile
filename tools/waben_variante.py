# -*- coding: utf-8 -*-
"""Rechnet eine Waben-Variante EINES Verbands durch, ohne app/map_regions.js anzufassen -
zum Vergleichen, bevor gebaut wird. Ausgabe: Karte-Vorschau/<name>.json fuer waben_zoom.mjs.

  python tools/waben_variante.py Westfalen v_nah "Bestwig=SC Neheim;Olsberg=SV Lippstadt 08"
  python tools/waben_variante.py Westfalen v_ist ""            # heutige Regel (Positivliste)

Der dritte Parameter ueberschreibt GEMEINDE_AUSNAHMEN nur fuer diesen Lauf.
"""
import os, sys, json, pickle
sys.stdout.reconfigure(encoding='utf-8')
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from shapely.geometry import shape
import gen_regions as GR

VB, NAME = sys.argv[1], sys.argv[2]
GR.GEMEINDE_AUSNAHMEN = dict(p.split('=', 1) for p in sys.argv[3].split(';') if '=' in p) if len(sys.argv) > 3 else {}
extra = sys.argv[4].split(';') if len(sys.argv) > 4 else []      # zusaetzliche Kreise fuer diesen Lauf
kreise = list(GR.GEMEINDE_KREISE.get(VB, [])) + [k for k in extra if k]

teams = GR.load_teams()
VG = {f['properties']['name']: shape(f['geometry']).buffer(0)
      for f in json.load(open(os.path.join(HERE, 'verbaende.geojson'), encoding='utf-8'))['features']}
parent = VG[VB]
pts = [(t['lon'], t['lat'], t['name']) for t in teams.values()
       if t.get('lat') is not None and GR.verband_of(t.get('regions')) == VB]
wb = GR.partition(parent, pts)
if kreise:
    gm = GR.lade_gemeinden(VB, kreise, parent)
    n = GR.schnapp_gemeinden(wb, gm, {nm: (lo, la) for lo, la, nm in pts})
    print('%s: %d von %d Gemeinden zusammengefuehrt (%s)' % (VB, n, len(gm), ', '.join(kreise)))
if GR.GEMEINDE_AUSNAHMEN:
    print('   Ausnahmen: %s' % ', '.join('%s->%s' % kv for kv in GR.GEMEINDE_AUSNAHMEN.items()))

out = {}
for nm, g in wb.items():
    g = g.simplify(GR.SIMPLIFY, preserve_topology=True)
    rr = []
    for p in (list(g.geoms) if g.geom_type.startswith('Multi') else [g]):
        if p.is_empty: continue
        rr.append([[[round(y, 4), round(x, 4)] for x, y in p.exterior.coords]] +
                  [[[round(y, 4), round(x, 4)] for x, y in h.coords] for h in p.interiors])
    out[nm] = rr
ziel = os.path.join(ROOT, 'Karte-Vorschau', NAME + '.json')
json.dump(out, open(ziel, 'w', encoding='utf-8'))
print('->', ziel)
