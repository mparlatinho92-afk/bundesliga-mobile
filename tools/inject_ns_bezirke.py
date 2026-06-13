"""
Liest ns_bezirke.geojson, vereinfacht die Polygone und fügt sie als
neue Hull-Einträge in _map_hulls.json ein (Name: "Reg.-Bez. <Name>").
Bestehende Einträge bleiben unverändert.
"""
import json, os, sys
sys.stdout.reconfigure(encoding='utf-8')

from shapely.geometry import shape
from shapely.ops import unary_union

TOOLS_DIR  = os.path.dirname(os.path.abspath(__file__))
HULLS_PATH = os.path.join(TOOLS_DIR, '_map_hulls.json')
GEO_PATH   = os.path.join(TOOLS_DIR, 'ns_bezirke.geojson')

# Vereinfachungs-Toleranz in Grad (~50-100m, gut sichtbare Qualität)
SIMPLIFY_TOL = 0.0008

# Stil: deutlich anders als die Verbands-Hüllen (orange/s3)
STYLE = {
    "color":  "#005f8e",
    "fill":   "#1a9fd4",
    "fOp":    0.08,
    "w":      2.2,
    "op":     0.85,
    "buf":    1.0,
    "dashArray": "6 4"
}

STUFE = 2   # geografisch auf Bundesland-Ebene unterhalb

def poly_to_hull(geom):
    """Shapely-Geometrie → [[lat,lon],...] (vereinfacht, größter Ring)."""
    geom = geom.simplify(SIMPLIFY_TOL, preserve_topology=True)

    if geom.geom_type == 'Polygon':
        rings = [geom.exterior]
    elif geom.geom_type == 'MultiPolygon':
        # Größtes Teilpolygon nehmen
        rings = [max(geom.geoms, key=lambda g: g.area).exterior]
    else:
        return None

    # GeoJSON ist (lon, lat) → wir brauchen [lat, lon]
    coords = [[round(lat, 7), round(lon, 7)] for lon, lat in rings[0].coords]
    # letzten Punkt entfernen wenn geschlossen (gleich wie erster)
    if coords and coords[0] == coords[-1]:
        coords = coords[:-1]
    return coords

def make_id(name):
    return "rb_ns_" + name.lower().replace('-', '_').replace(' ', '_').replace('ü','ue').replace('ä','ae').replace('ö','oe')

def main():
    with open(GEO_PATH, encoding='utf-8') as f:
        geo = json.load(f)
    with open(HULLS_PATH, encoding='utf-8') as f:
        hulls = json.load(f)

    existing_ids = {h['id'] for h in hulls}
    added = []

    for feat in geo['features']:
        name  = feat['properties']['name']
        label = f"Reg.-Bez. {name}"
        hid   = make_id(name)

        if hid in existing_ids:
            print(f"  [{hid}] bereits vorhanden – übersprungen")
            continue

        geom  = shape(feat['geometry'])
        hull  = poly_to_hull(geom)
        if hull is None:
            print(f"  [{name}] Polygon konnte nicht konvertiert werden")
            continue

        entry = {
            "id":    hid,
            "label": label,
            "stufe": STUFE,
            "hull":  hull,
            "geoVar": False,
            "style": STYLE
        }
        hulls.append(entry)
        added.append(label)
        print(f"  + {label}: {len(hull)} Punkte")

    with open(HULLS_PATH, 'w', encoding='utf-8') as f:
        json.dump(hulls, f, ensure_ascii=False, separators=(',', ':'))

    print(f"\n{len(added)} Einträge hinzugefügt → {HULLS_PATH}")

if __name__ == '__main__':
    main()
