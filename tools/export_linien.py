#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Exportiert die Staffellinien als KML zum Nachprüfen in Google Earth.

Zwei Ordner in der Ausgabe:
  "Original"    – die Linien genau so, wie sie in Tournament Manager.kmz stehen (weiß)
  "Verlängert"  – dieselben Linien, deren zu kurze Enden geradlinig fortgesetzt wurden,
                  bis sie die Verbandsfläche verlassen (rot). Nur DIESE Fassung schneidet;
                  wo die rote Gerade falsch läuft, gehört die Originallinie nachgezogen.

Aufruf: python tools/export_linien.py   →   tools/_staffellinien.kml
"""
import os, sys, json
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import shape

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from gen_regions import load_lines, verlaengern          # dieselbe Logik wie im Generator

KMZ = os.path.join(os.path.expanduser('~'), 'OneDrive', 'Dokumente',
                   'Google Earth Orte', 'Tournament Manager.kmz')
OUT = os.path.join(HERE, '_staffellinien.kml')
NL = chr(10)


def coords(pts):
    return ' '.join('%.6f,%.6f,0' % (x, y) for x, y in pts)

def placemark(name, pts, style):
    return (('    <Placemark><name>%s</name><styleUrl>#%s</styleUrl>' % (name, style))
            + '<LineString><tessellate>1</tessellate><coordinates>'
            + coords(pts) + '</coordinates></LineString></Placemark>')


def main():
    fc = json.load(open(os.path.join(HERE, 'verbaende.geojson'), encoding='utf-8'))
    flaechen = [shape(f['geometry']).buffer(0) for f in fc['features']]
    orig = load_lines(KMZ)
    print('%d Linien gelesen' % len(orig))

    a_out, b_out, verl = [], [], 0
    for i, pts in enumerate(orig, 1):
        lang = verlaengern(pts, flaechen)
        zusatz = len(lang) - len(pts)
        if zusatz: verl += 1
        a_out.append(placemark('Linie %d (original, %d Pkt)' % (i, len(pts)), pts, 'orig'))
        b_out.append(placemark('Linie %d (verlängert, +%d Ende%s)'
                               % (i, zusatz, '' if zusatz == 1 else 'n'), lang, 'lang'))
    print('%d Linien wurden verlängert' % verl)

    kml = NL.join([
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
        '  <name>Staffellinien – Original vs. verlängert</name>',
        '  <Style id="orig"><LineStyle><color>ffffffff</color><width>3</width></LineStyle></Style>',
        '  <Style id="lang"><LineStyle><color>ff2222ee</color><width>2</width></LineStyle></Style>',
        '  <Folder><name>Original (weiß)</name>', NL.join(a_out), '  </Folder>',
        '  <Folder><name>Verlängert (rot) – diese Fassung schneidet</name>', NL.join(b_out), '  </Folder>',
        '</Document></kml>'])
    open(OUT, 'w', encoding='utf-8', newline=NL).write(kml)
    print('→ %s  (%.2f MB)' % (os.path.relpath(OUT, os.path.dirname(HERE)),
                               os.path.getsize(OUT) / 1e6))


if __name__ == '__main__':
    main()
