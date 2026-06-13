"""
Holt die 4 Niedersachsen-Regierungsbezirke von der Overpass API
und speichert sie als ns_bezirke.geojson.
"""
import json, sys, urllib.request, urllib.parse, os
sys.stdout.reconfigure(encoding='utf-8')

from shapely.geometry import LineString, mapping
from shapely.ops import linemerge, polygonize, unary_union

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Suche nach admin_level=5 in Niedersachsen (aktiv oder historisch)
QUERY = """
[out:json][timeout:90];
area["name"="Niedersachsen"]["admin_level"="4"]->.ns;
(
  relation["admin_level"="5"]["boundary"="administrative"](area.ns);
  relation["admin_level"="5"]["boundary"="historic"](area.ns);
  relation["admin_level"="5"](area.ns);
);
out geom;
"""

def fetch_overpass(query):
    data = urllib.parse.urlencode({"data": query}).encode()
    req  = urllib.request.Request(OVERPASS_URL, data=data,
                                   headers={"User-Agent": "bundesliga-map-tool/1.0"})
    print("Anfrage an Overpass API...")
    with urllib.request.urlopen(req, timeout=120) as resp:
        return json.loads(resp.read())

def build_polygon(relation):
    """Ways eines OSM-Relations zu einem Shapely-Polygon zusammensetzen."""
    lines = []
    for member in relation.get("members", []):
        if member["type"] != "way":
            continue
        if member.get("role", "outer") not in ("outer", ""):
            continue
        coords = [(pt["lon"], pt["lat"]) for pt in member.get("geometry", [])]
        if len(coords) >= 2:
            lines.append(LineString(coords))

    if not lines:
        return None

    merged   = linemerge(lines)
    polygons = list(polygonize(merged))
    if not polygons:
        return None
    return unary_union(polygons)

def count_pts(geom_dict):
    total = 0
    for ring in geom_dict.get("coordinates", []):
        if isinstance(ring[0], (int, float)):
            total += len(ring)
        else:
            for r in ring:
                total += len(r)
    return total

def main():
    result   = fetch_overpass(QUERY)
    elements = result.get("elements", [])
    print(f"{len(elements)} Relation(en) gefunden\n")

    if not elements:
        print("KEINE Ergebnisse – Regierungsbezirke möglicherweise nicht in OSM vorhanden.")
        print("Versuch mit direkten Relation-IDs (Braunschweig/Hannover/Lüneburg/Weser-Ems)...")
        fallback()
        return

    features = []
    for el in elements:
        if el["type"] != "relation":
            continue
        tags = el.get("tags", {})
        name = tags.get("name", f"relation_{el['id']}")
        poly = build_polygon(el)
        if poly is None:
            print(f"  [{name}] – Polygon konnte nicht gebaut werden")
            continue
        geom = mapping(poly)
        pts  = count_pts(geom)
        print(f"  {name}: {pts} Punkte, admin_level={tags.get('admin_level','?')}")
        features.append({
            "type": "Feature",
            "properties": {
                "name":        name,
                "admin_level": tags.get("admin_level"),
                "osm_id":      el["id"],
            },
            "geometry": geom,
        })

    out_path = os.path.join(os.path.dirname(__file__), "ns_bezirke.geojson")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f,
                  ensure_ascii=False, indent=2)
    print(f"\nGespeichert: {out_path}")
    print(f"{len(features)} Bezirke exportiert")

def fallback():
    """Direkte OSM-Relation-IDs für die 4 aufgelösten Bezirke."""
    # Bekannte Relation-IDs (können sich ändern – bei Misserfolg prüfen)
    REL_IDS = {
        "Braunschweig": 62766,
        "Hannover":     62779,
        "Lüneburg":     62791,
        "Weser-Ems":    62794,
    }
    query_ids = " ".join(str(v) for v in REL_IDS.values())
    query = f"""
[out:json][timeout:90];
relation(id:{query_ids});
out geom;
"""
    result   = fetch_overpass(query)
    elements = result.get("elements", [])
    print(f"{len(elements)} Relation(en) via direkter ID gefunden\n")

    features = []
    for el in elements:
        tags = el.get("tags", {})
        name = tags.get("name", f"relation_{el['id']}")
        poly = build_polygon(el)
        if poly is None:
            print(f"  [{name}] id={el['id']} – kein Polygon")
            continue
        geom = mapping(poly)
        pts  = count_pts(geom)
        print(f"  {name}: {pts} Punkte")
        features.append({
            "type": "Feature",
            "properties": {"name": name, "osm_id": el["id"]},
            "geometry": geom,
        })

    if not features:
        print("\nAuch Fallback erfolglos. Bitte OSM-Relation-IDs manuell prüfen.")
        return

    out_path = os.path.join(os.path.dirname(__file__), "ns_bezirke.geojson")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump({"type": "FeatureCollection", "features": features}, f,
                  ensure_ascii=False, indent=2)
    print(f"\nGespeichert: {out_path}")
    print(f"{len(features)} Bezirke exportiert")

if __name__ == "__main__":
    main()
