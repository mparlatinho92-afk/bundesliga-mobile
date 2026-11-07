# Prüfung Alzenau (Sheet 07.11.2026): nur die Gemarkung Alzenau gehört zum Hessischen Verband, die übrigen Ortsteile
# (Wasserlos, Hörstein, Kälberau, Michelbach, Albstadt) zu Bayern.
#   python tools/alzenau_gemarkung_check.py [verbaende.geojson]   – Exit 1 bei falscher Zuordnung
# Gegenprobe: mit dem alten Stand (git show c825461:tools/verbaende.geojson, Stand v0.8.228.72) muss sie durchfallen.
import json, sys, os
sys.stdout.reconfigure(encoding='utf-8')
from shapely.geometry import shape, Point
HERE = os.path.dirname(os.path.abspath(__file__))
pfad = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'verbaende.geojson')
fc = json.load(open(pfad, encoding='utf-8'))
verb = [(f['properties'].get('name') or f['properties'].get('verband'), shape(f['geometry'])) for f in fc['features']]
# je Ortsteil ein Punkt sicher innerhalb der OSM-Ortsteilfläche (representative_point, admin_level 10)
ORTE = {'Alzenau (FC Bayern Alzenau)': ((9.05901, 50.07977), 'Hessen'), 'Alzenau (Ortsteilfläche)': ((9.05469, 50.09266), 'Hessen'),
        'Wasserlos': ((9.07726, 50.0692), 'Bayern'), 'Hörstein': ((9.06538, 50.05512), 'Bayern'),
        'Kälberau': ((9.10047, 50.08659), 'Bayern'), 'Michelbach': ((9.11643, 50.08936), 'Bayern'),
        'Albstadt': ((9.10653, 50.1153), 'Bayern')}
fehler = 0
for ort, ((lon, lat), soll) in ORTE.items():
    ist = [n for n, g in verb if g.contains(Point(lon, lat))]
    ok = ist == [soll]
    fehler += not ok
    print('%s %-28s soll %-7s ist %s' % ('OK  ' if ok else 'FEHL', ort, soll, ist))
print('OK' if not fehler else 'FEHLER: %d' % fehler)
sys.exit(1 if fehler else 0)
