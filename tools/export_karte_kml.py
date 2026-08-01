#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exportiert ALLES, was die Spielkarte zeigt und in Google Earth fehlt, als KMZ.
Zum Abgleich: Was ist richtig, was ist falsch – auf einen Blick, in der gewohnten Umgebung.

Ordner (einzeln schaltbar):
  1 Verbände              – aus amtlichen Kreisen gebaut, NICHT die Handzeichnung
  2 Unterregionen         – Staffelgebiete aus deinen Linien + Kreis-Mehrheit
  3 Vereine               – Punkte in der Ligafarbe der Karte
  4 FEHLZUORDNUNGEN       – rote Pins, nach Landesverband in Unterordner sortiert
  5 Staffellinien         – deine Linien, auf die geschnittenen Verbände geklammert

Grundsätze:
  * Geometrie aus tools/regionen_full.geojson (volle Auflösung), für die Ausgabe auf
    SIMP (~22 m) reduziert – unterhalb dessen, was in Google Earth unterscheidbar ist.
    Die Anzeige-Fassung der App (444 m) wäre hier zu grob: die Grenzen sollen von den
    Kreisgrenzen NICHT unterscheidbar sein.
  * Linien werden auf die Verbände geklammert, die sie tatsächlich zerteilen. Die
    Verlängerung ist nur ein Rechentrick; ungeklammert zöge sie quer durch fremde Gebiete.
  * Farben wie vom Nutzer in Google Earth gesetzt (Verbände blau/schwarz, Unterregionen
    gelb/schwarz).

Aufruf: python tools/export_karte_kml.py   →   tools/_karte_export.kmz
"""
import os, re, sys, json, zipfile
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import shape
from shapely.ops import unary_union

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
from gen_regions import load_lines, verlaengern, VERBAENDE, ALIAS

OUT = os.path.join(HERE, '_karte_export.kmz')
KMZ = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Dokumente',
                   'Google Earth Orte', 'Tournament Manager.kmz')
SIMP = 0.0002        # ~22 m
NL = chr(10)

TC = {1:'cc0000', 2:'cc4400', 3:'bb7700', 4:'446600', 5:'1a7a35',
      6:'006688', 7:'1a4fa8', 8:'555555', 99:'999999'}


def kmlcol(hexrgb, alpha='ff'):
    h = hexrgb.lstrip('#')
    return alpha + h[4:6] + h[2:4] + h[0:2]

def esc(s):
    return str(s).replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')

def js_const(path, name):
    src = open(path, encoding='utf-8').read()
    m = re.search(r'^const %s = (.*);$' % name, src, re.M)
    return json.loads(m.group(1)) if m else None

def ring_txt(coords):
    return ' '.join('%.6f,%.6f,0' % (x, y) for x, y in coords)

def poly_kml(g):
    parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    teile = []
    for p in parts:
        if p.is_empty: continue
        inner = ''.join('<innerBoundaryIs><LinearRing><coordinates>%s</coordinates>'
                        '</LinearRing></innerBoundaryIs>' % ring_txt(h.coords) for h in p.interiors)
        teile.append('<Polygon><outerBoundaryIs><LinearRing><coordinates>%s</coordinates>'
                     '</LinearRing></outerBoundaryIs>%s</Polygon>' % (ring_txt(p.exterior.coords), inner))
    if not teile: return ''
    return '<MultiGeometry>%s</MultiGeometry>' % ''.join(teile) if len(teile) > 1 else teile[0]

def verband_of(regs):
    for r in regs or []:
        if r in VERBAENDE: return r
        if r in ALIAS: return ALIAS[r]
    return 'ohne Verband'


def main():
    misfits = js_const(os.path.join(ROOT, 'app', 'map_regions.js'), 'MAP_MISFITS') or {}
    fcR = json.load(open(os.path.join(HERE, 'regionen_full.geojson'), encoding='utf-8'))
    regionen = [(f['properties']['name'], bool(f['properties'].get('split')),
                 shape(f['geometry']).buffer(0)) for f in fcR['features']]
    fcV = json.load(open(os.path.join(HERE, 'verbaende.geojson'), encoding='utf-8'))
    verbandsflaechen = {f['properties']['name']: shape(f['geometry']).buffer(0) for f in fcV['features']}

    src = open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    m = re.search(r'"teams"\s*:\s*\{', src); i = m.end() - 1; d = 0
    for j in range(i, len(src)):
        if src[j] == '{': d += 1
        elif src[j] == '}':
            d -= 1
            if d == 0: break
    teams = json.loads(src[i:j + 1])
    lg = re.search(r'"leagues"\s*:\s*(\{.*?\}),\s*"teams"', src, re.S)
    leagues = json.loads(lg.group(1)) if lg else {}

    styles = [
        '<Style id="regV"><LineStyle><color>ff000000</color><width>8</width></LineStyle>'
        '<PolyStyle><color>ffff5500</color></PolyStyle></Style>',
        '<Style id="regU"><LineStyle><color>ff000000</color><width>4</width></LineStyle>'
        '<PolyStyle><color>3300ffff</color></PolyStyle></Style>',
        '<Style id="miss"><IconStyle><color>ff1744ff</color><scale>1.2</scale>'
        '<Icon><href>http://maps.google.com/mapfiles/kml/paddle/red-circle.png</href></Icon></IconStyle>'
        '<LabelStyle><color>ff1744ff</color><scale>0.9</scale></LabelStyle></Style>',
        '<Style id="linie"><LineStyle><color>ff00ffff</color><width>3</width></LineStyle></Style>']
    for lv, col in TC.items():
        styles.append('<Style id="team%d"><IconStyle><color>%s</color><scale>0.7</scale>'
                      '<Icon><href>http://maps.google.com/mapfiles/kml/shapes/shaded_dot.png</href>'
                      '</Icon></IconStyle><LabelStyle><scale>0.7</scale></LabelStyle></Style>'
                      % (lv, kmlcol(col)))

    folders = []
    # ── 1 + 2 Regionen ──────────────────────────────────────────────────────
    for titel, istUnter in [('1 Verbände und Zusammenfassungen (%d)', False),
                            ('2 Unterregionen – Staffelgebiete (%d)', True)]:
        pm = []
        for name, split, g in sorted(regionen, key=lambda x: x[0]):
            if split != istUnter: continue
            geo = poly_kml(g.simplify(SIMP, preserve_topology=True))
            if not geo: continue
            pm.append('<Placemark><name>%s</name><styleUrl>#%s</styleUrl>%s</Placemark>'
                      % (esc(name), 'regU' if istUnter else 'regV', geo))
        folders.append('<Folder><name>%s</name><open>0</open>%s</Folder>' % (titel % len(pm), NL.join(pm)))

    # ── 3 + 4 Vereine ───────────────────────────────────────────────────────
    ok_pm, miss = [], {}
    for t in teams.values():
        if t.get('lat') is None or (t['lat'] == 0 and t['lon'] == 0): continue
        lv = (leagues.get(t.get('leagueId'), {}) or {}).get('level', 99)
        regs = ', '.join(t.get('regions') or [])
        pt = '<Point><coordinates>%.5f,%.5f,0</coordinates></Point>' % (t['lon'], t['lat'])
        if t['name'] in misfits:
            besch = 'LIEGT NICHT IN: %s&#10;Regionen laut Daten: %s' % (
                esc(', '.join(misfits[t['name']])), esc(regs))
            miss.setdefault(verband_of(t.get('regions')), []).append(
                '<Placemark><name>%s</name><description>%s</description>'
                '<styleUrl>#miss</styleUrl>%s</Placemark>' % (esc(t['name']), besch, pt))
        else:
            ok_pm.append('<Placemark><name>%s</name><description>%s</description>'
                         '<styleUrl>#team%d</styleUrl>%s</Placemark>'
                         % (esc(t['name']), esc(regs), lv if lv in TC else 99, pt))
    folders.append('<Folder><name>3 Vereine (%d)</name><open>0</open>%s</Folder>'
                   % (len(ok_pm), NL.join(ok_pm)))
    unter = ['<Folder><name>%s (%d)</name><open>0</open>%s</Folder>' % (esc(v), len(p), NL.join(p))
             for v, p in sorted(miss.items())]
    folders.append('<Folder><name>4 FEHLZUORDNUNGEN (%d) – rot</name><open>1</open>%s</Folder>'
                   % (sum(len(p) for p in miss.values()), NL.join(unter)))

    # ── 5 Linien, auf die geschnittenen Verbände geklammert ─────────────────
    lpm, alleF = [], list(verbandsflaechen.values())
    geteilte = unary_union([g for n, g in verbandsflaechen.items()]).buffer(0)
    for n, pts in enumerate(load_lines(KMZ), 1):
        from shapely.geometry import LineString
        L = LineString(verlaengern(pts, alleF)).intersection(geteilte)
        if L.is_empty: continue
        segs = list(L.geoms) if L.geom_type.startswith('Multi') else [L]
        for k, seg in enumerate(segs, 1):
            if seg.length <= 0 or seg.geom_type != 'LineString': continue
            lpm.append('<Placemark><name>Linie %d.%d</name><styleUrl>#linie</styleUrl>'
                       '<LineString><tessellate>1</tessellate><coordinates>%s</coordinates>'
                       '</LineString></Placemark>' % (n, k, ring_txt(seg.coords)))
    folders.append('<Folder><name>5 Staffellinien (%d Abschnitte)</name><open>0</open>%s</Folder>'
                   % (len(lpm), NL.join(lpm)))

    kml = (NL.join(['<?xml version="1.0" encoding="UTF-8"?>',
                    '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
                    '<name>Spielkarte – Abgleich mit Google Earth</name>'])
           + NL + NL.join(styles) + NL + NL.join(folders) + NL + '</Document></kml>')
    with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        z.writestr('doc.kml', kml)
    print('Regionen: %d Verbände + %d Unterregionen (vereinfacht auf %.0f m)'
          % (sum(1 for _, s2, _ in regionen if not s2), sum(1 for _, s2, _ in regionen if s2), SIMP * 111000))
    print('Vereine: %d · Fehlzuordnungen: %d in %d Unterordnern'
          % (len(ok_pm) + sum(len(p) for p in miss.values()),
             sum(len(p) for p in miss.values()), len(miss)))
    print('Linien-Abschnitte: %d' % len(lpm))
    print('→ %s  (%.2f MB, KML roh %.1f MB)'
          % (os.path.relpath(OUT, ROOT), os.path.getsize(OUT) / 1e6, len(kml.encode('utf-8')) / 1e6))


if __name__ == '__main__':
    main()
