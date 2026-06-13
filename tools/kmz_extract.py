"""
KMZ → kmz_regions.json
Gruppen-Logik: gleiche Farbe + Nachbarschaft (touching) = eine Region.
Jede zusammenhängende Farbgruppe wird zu einem merged Polygon.
Ausgabe: tools/kmz_regions.json
"""
import zipfile, re, json, sys, os, math
sys.stdout.reconfigure(encoding='utf-8')

from shapely.geometry import Polygon as SPoly
from shapely.ops import unary_union
from collections import defaultdict

script_dir = os.path.dirname(os.path.abspath(__file__))
kmz_path   = os.path.join(script_dir, '..', 'Tournament Manager.kmz')

with zipfile.ZipFile(kmz_path) as z:
    kml = z.read('doc.kml').decode('utf-8')

# ── Style-Auflösung ──────────────────────────────────────────────────────────
def kml_to_hex(kml_col):
    """AABBGGRR → #RRGGBB"""
    r=kml_col[6:8]; g=kml_col[4:6]; b=kml_col[2:4]
    return '#'+r+g+b

styles = {}
for m in re.finditer(r'<Style id="([^"]+)">(.*?)</Style>', kml, re.DOTALL):
    sid, body = m.group(1), m.group(2)
    poly = re.search(r'<PolyStyle>.*?<color>([0-9a-fA-F]{8})</color>.*?</PolyStyle>', body, re.DOTALL)
    if not poly:
        poly = re.search(r'<color>([0-9a-fA-F]{8})</color>', body)
    if poly:
        styles[sid] = kml_to_hex(poly.group(1))

stylemaps = {}
for m in re.finditer(r'<StyleMap id="([^"]+)">(.*?)</StyleMap>', kml, re.DOTALL):
    smid = m.group(1)
    norm = re.search(r'<key>normal</key>\s*<styleUrl>#([^<]+)</styleUrl>', m.group(2))
    if norm:
        stylemaps[smid] = norm.group(1)

def resolve_color(style_id):
    col = styles.get(style_id)
    if col: return col
    base = stylemaps.get(style_id)
    if base: return styles.get(base, '?')
    return '?'

# ── Polygon-Parsing ──────────────────────────────────────────────────────────
def parse_coords(coord_str):
    pts = []
    for token in coord_str.strip().split():
        parts = token.split(',')
        if len(parts) >= 2:
            try:
                pts.append((float(parts[0]), float(parts[1])))
            except ValueError:
                pass
    return pts

def to_shapely(rings_str_list):
    """outerBoundaryIs strings → Shapely Polygon (repaired)"""
    polys = []
    for ring_str in rings_str_list:
        pts = parse_coords(ring_str)
        if len(pts) >= 3:
            try:
                p = SPoly(pts).buffer(0)
                if not p.is_empty:
                    polys.append(p)
            except Exception:
                pass
    if not polys: return None
    return unary_union(polys) if len(polys) > 1 else polys[0]

# ── Folder-aware Placemark-Extraktion ────────────────────────────────────────
# Wir laufen durch den KML-Text und merken uns den Folder-Kontext
def extract_with_folders(text, folder_path=''):
    """Gibt Liste von {name, color, folder, geom} zurück."""
    items = []
    i = 0
    while i < len(text):
        f_open  = text.find('<Folder>',    i)
        pm_open = text.find('<Placemark>', i)
        if f_open == -1 and pm_open == -1:
            break
        if pm_open != -1 and (f_open == -1 or pm_open < f_open):
            # Placemark
            pm_end = text.find('</Placemark>', pm_open) + len('</Placemark>')
            body   = text[pm_open:pm_end]
            if '<Polygon>' in body or '<MultiGeometry>' in body:
                name_m  = re.search(r'<name>([^<]+)</name>',         body)
                style_m = re.search(r'<styleUrl>#([^<]+)</styleUrl>', body)
                name    = name_m.group(1).strip() if name_m else ''
                color   = resolve_color(style_m.group(1)) if style_m else '?'
                outer_rings = re.findall(
                    r'<outerBoundaryIs>.*?<coordinates>(.*?)</coordinates>.*?</outerBoundaryIs>',
                    body, re.DOTALL)
                geom = to_shapely(outer_rings)
                if geom and not geom.is_empty:
                    items.append({'name': name, 'color': color,
                                  'folder': folder_path, 'geom': geom})
            i = pm_end
        else:
            # Folder: find matching close
            depth = 0
            j = f_open
            while j < len(text):
                o = text.find('<Folder>',  j+1)
                c = text.find('</Folder>', j+1)
                if c == -1: break
                if o != -1 and o < c: depth += 1; j = o
                else:
                    if depth == 0: f_end = c + len('</Folder>'); break
                    depth -= 1; j = c
            inner = text[f_open:f_end]
            fname_m = re.search(r'<Folder>\s*<name>([^<]+)</name>', inner)
            fname   = fname_m.group(1).strip() if fname_m else ''
            child_path = f'{folder_path}/{fname}' if folder_path else fname
            content = inner[inner.find('>')+1 : inner.rfind('</Folder>')]
            content = re.sub(r'^\s*<name>[^<]+</name>', '', content, count=1)
            items.extend(extract_with_folders(content, child_path))
            i = f_end
    return items

raw = extract_with_folders(kml)
print(f'Polygone geladen: {len(raw)}', file=sys.stderr)

# ── Gruppierung: Folder + Farbe → eine Region (inkl. Inseln) ─────────────────
# Gleicher Folder + gleiche Farbe = gehören zusammen (auch ohne Berührung)
groups = defaultdict(list)
for item in raw:
    key = (item['folder'], item['color'])
    groups[key].append(item)

# ── Merge + Ausgabe ───────────────────────────────────────────────────────────
MIN_AREA = 0.0005  # ~0.05 km² – kleinere Polygone werden als Fetzen verworfen

def _remove_artifact_pts(ring, angle_thresh=30, excess_thresh=0.20, seg_ratio=0.65):
    """Entfernt einzelne Kreis-Merge-Artefakte iterativ.

    Zwei Erkennungsmuster für Vertex B zwischen A und C:
    1. Nadelspike: Winkel bei B < angle_thresh° (Polygon kehrt fast um)
    2. Jog-Bump: beide Nachbarsegmente kurz (< seg_ratio * Mittelwert)
       UND Perimeter-Überschuss (|AB|+|BC|−|AC|)/|AC| > excess_thresh
    """
    def _d(A, B): return math.sqrt((A[0]-B[0])**2+(A[1]-B[1])**2)

    def _angle(A, B, C):
        u = (A[0]-B[0], A[1]-B[1]); v = (C[0]-B[0], C[1]-B[1])
        lu = math.sqrt(u[0]**2+u[1]**2); lv = math.sqrt(v[0]**2+v[1]**2)
        if lu == 0 or lv == 0: return 180.0
        return math.degrees(math.acos(max(-1.0, min(1.0, (u[0]*v[0]+u[1]*v[1])/(lu*lv)))))

    pts = list(ring)
    if pts and pts[0] == pts[-1]:
        pts = pts[:-1]

    changed = True
    while changed:
        changed = False
        n = len(pts)
        if n < 4: break
        segs = [_d(pts[i], pts[(i+1)%n]) for i in range(n)]
        mean_s = sum(segs) / n
        i = 0
        while i < len(pts):
            nn = len(pts)
            A = pts[(i-1) % nn]; B = pts[i]; C = pts[(i+1) % nn]
            sv = segs[(i-1) % nn]; sn = segs[i]
            remove = False
            # Muster 1: Nadelspike
            if _angle(A, B, C) < angle_thresh:
                remove = True
            # Muster 2: kurze Segmente + Perimeter-Überschuss
            elif sv < seg_ratio * mean_s and sn < seg_ratio * mean_s:
                ac = _d(A, C)
                if ac > 0 and (sv + sn - ac) / ac > excess_thresh:
                    remove = True
            if remove:
                pts.pop(i)
                changed = True
                if len(pts) >= 3:
                    nn2 = len(pts)
                    segs = [_d(pts[j], pts[(j+1)%nn2]) for j in range(nn2)]
                    mean_s = sum(segs) / nn2
            else:
                i += 1

    if pts:
        pts.append(pts[0])
    return pts

def geom_to_rings(geom, tol=0.02, close=0.003):
    # Morphologisches Closing: entfernt Stachel-Punkte und schmale Finger
    if close > 0:
        cleaned = geom.buffer(close).buffer(-close)
        if cleaned.is_empty: cleaned = geom
    else:
        cleaned = geom
    simplified = cleaned.simplify(tol, preserve_topology=True)
    rings = []
    if simplified.geom_type == 'Polygon':
        if simplified.area >= MIN_AREA:
            raw = [[round(x,5),round(y,5)] for x,y in simplified.exterior.coords]
            rings.append(_remove_artifact_pts(raw))
    elif simplified.geom_type == 'MultiPolygon':
        for p in sorted(simplified.geoms, key=lambda g: -g.area):  # größte zuerst
            if p.area >= MIN_AREA:
                raw = [[round(x,5),round(y,5)] for x,y in p.exterior.coords]
                rings.append(_remove_artifact_pts(raw))
    return rings

# ── Mapping: Folder/Color-Gruppe → Ziel-Hull-ID in gen_map.cjs ───────────────
# Format: ( folder_suffix, color ) → list of hull IDs to replace
# folder_suffix = letzter Folder-Name (oder '' für top-level)
HULL_TARGET_MAP = {
    # KMZ-Folder-Name (letzter Teil)   Farbe      → hull IDs
    ('Flächen',             '#ffaa00'): ['hull_s1_bayern'],
    ('Flächen',             '#838383'): ['hull_s3_saarland'],
    ('Ordner ohne Namen',   '#000000'): ['hull_s3_s_dbaden'],
    ('Ordner ohne Namen',   '#00ff7f'): ['hull_s3_baden'],
    ('Ordner ohne Namen',   '#aa00ff'): ['hull_s3_w_rttemberg'],
    ('Flächen',             '#ffff00'): ['hull_s3_th_ringen'],
    ('Flächen',             '#0000ff'): ['hull_s3_brandenburg'],
    ('Flächen',             '#3949ab'): ['hull_s3_mecklenburg_vorpommern'],
    ('Flächen',             '#aa0000'): ['hull_s3_berlin'],
    ('Flächen',             '#aa007f'): ['hull_s3_sachsen_anhalt'],
    ('Flächen',             '#ab0000'): ['hull_s2_hessen'],
    ('Flächen',             '#ff5500'): ['hull_s2_niedersachsen'],
    ('Hamburg',             '#aa00ff'): ['hull_s2_hamburg'],
    ('Südwest',             '#0000ff'): ['hull_s3_s_dwestdeutscher_fu_ballverband'],
    ('Rheinland',           '#ff557f'): ['hull_s3_fu_ballverband_rheinland'],
    ('Schleswig-Holstein',  '#55557f'): ['hull_s2_schleswig_holstein'],
    ('Mittelrhein',         '#ffff00'): ['hull_s2_mittelrhein'],
    ('Flächen',             '#00c500'): ['hull_s2_niederrhein'],
    ('Westfalen',           '#0055ff'): ['hull_s2_westfalen'],
}
# Sachsen + Bremen: kein Farb-Style → einzeln per Name
NAME_TARGET_MAP = {
    'Sachsen': ['hull_s3_sachsen'],
    'Bremen':  ['hull_s2_bremen'],
}

output = []
region_idx = 0
for (folder, color), items in sorted(groups.items()):
    # Sachsen/Bremen: ? color → split by name
    if color == '?':
        for it in items:
            merged = it['geom']
            rings = geom_to_rings(merged)
            region_idx += 1
            targets = NAME_TARGET_MAP.get(it['name'], [])
            entry = {
                'id':            f'kmz_{it["name"].lower().replace(" ","_")}_{region_idx:03d}',
                'color':         color,
                'folder':        folder,
                'names':         [it['name']],
                'rings':         rings,
                'targetHullIds': targets,
            }
            output.append(entry)
            print(f'  {entry["id"]}: {it["name"]} → {len(rings)} Ring(e) → {targets}', file=sys.stderr)
        continue

    merged = unary_union([it['geom'] for it in items])
    if merged.is_empty:
        continue
    rings = geom_to_rings(merged)
    names = [it['name'] for it in items]
    region_idx += 1
    folder_key = folder.split('/')[-1] if folder else ''
    targets = HULL_TARGET_MAP.get((folder_key, color), [])
    entry = {
        'id':            f'kmz_{color.lstrip("#")}_{region_idx:03d}',
        'color':         color,
        'folder':        folder,
        'names':         names,
        'rings':         rings,
        'targetHullIds': targets,
    }
    output.append(entry)
    print(f'  {entry["id"]} [{folder_key}]: {names[:3]}{"..." if len(names)>3 else ""} → {len(rings)} Ring(e) → {targets}', file=sys.stderr)

# ── Hilfsfunktionen für Post-Processing ─────────────────────────────────────
def get_geom(entries, hull_id):
    """Rekonstruiert Shapely-Geom aus rings-Liste eines Output-Eintrags."""
    for e in entries:
        if hull_id in (e.get('targetHullIds') or []):
            polys = []
            for ring in e['rings']:
                try:
                    p = SPoly(ring).buffer(0)
                    if not p.is_empty: polys.append(p)
                except: pass
            return unary_union(polys) if polys else None
    return None

def set_geom(entries, hull_id, new_geom, tol=0.005):
    for e in entries:
        if hull_id in (e.get('targetHullIds') or []):
            e['rings'] = geom_to_rings(new_geom, tol)
            return True
    return False

# ── Kombinierter Umriss RLP/Saar ─────────────────────────────────────────────
swfv = get_geom(output, 'hull_s3_s_dwestdeutscher_fu_ballverband')
fvr  = get_geom(output, 'hull_s3_fu_ballverband_rheinland')
saar = get_geom(output, 'hull_s3_saarland')
if swfv and fvr and saar:
    rlp_saar = unary_union([swfv, fvr, saar])
    rings = geom_to_rings(rlp_saar)
    region_idx += 1
    output.append({
        'id':            f'kmz_union_rlp_saar_{region_idx:03d}',
        'color':         'union',
        'folder':        'combined',
        'names':         ['RLP/Saar'],
        'rings':         rings,
        'targetHullIds': ['hull_s2_rheinland_pfalz_saar'],
    })
    print(f'  RLP/Saar Union → {len(rings)} Ring(e)', file=sys.stderr)
else:
    print('  WARNUNG: SWFV/FVR/Saarland nicht gefunden für RLP/Saar-Union', file=sys.stderr)

# ── Überlappungs-Korrekturen ──────────────────────────────────────────────────
# Württemberg darf nicht in Bayern-Polygon einschneiden → Bayern hat Vorrang
wue = get_geom(output, 'hull_s3_w_rttemberg')
bay = get_geom(output, 'hull_s1_bayern')
if wue and bay:
    overlap = wue.intersection(bay)
    if not overlap.is_empty and overlap.area > 1e-6:
        set_geom(output, 'hull_s3_w_rttemberg', wue.difference(bay))
        print(f'  Württemberg ∩ Bayern korrigiert ({overlap.area:.5f} sq°)', file=sys.stderr)

# Mittelrhein wird bei Schermbeck von Niederrhein eingeschnitten → Niederrhein hat Vorrang
nr = get_geom(output, 'hull_s2_niederrhein')
mr = get_geom(output, 'hull_s2_mittelrhein')
if nr and mr:
    overlap = nr.intersection(mr)
    if not overlap.is_empty and overlap.area > 1e-6:
        set_geom(output, 'hull_s2_mittelrhein', mr.difference(nr))
        print(f'  Mittelrhein ∩ Niederrhein korrigiert ({overlap.area:.5f} sq°)', file=sys.stderr)

out_path = os.path.join(script_dir, 'kmz_regions.json')
with open(out_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, separators=(',',':'))

print(f'\nGespeichert: {out_path}', file=sys.stderr)
print(f'Regionen gesamt: {len(output)}')
print('\nÜbersicht:')
for e in output:
    print(f'  {e["id"]} ({e["color"]}, {len(e["names"])} Polygone): {e["names"]}')
