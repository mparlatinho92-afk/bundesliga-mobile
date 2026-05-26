import os
import json
import pandas as pd
import base64
import re
from PIL import Image
from io import BytesIO
from unidecode import unidecode
from rapidfuzz import process, fuzz

# ==========================================
# KONFIGURATION
# ==========================================

WAPPEN_PFAD_1 = r"G:\Meine Ablage\Tournament Manager Wappen"
WAPPEN_PFAD_2 = r"C:\Users\lyric\OneDrive\Pictures\Tournament Manager Wappen-20260102T204826Z-3-001"

FILE_LIGEN = "Tournament Manager 2023 neu - Ligapyramide 2026.csv"
FILE_VEREINE = "Tournament Manager 2023 neu - Vereine Übersicht Ligen Zuordnung.csv"
FILE_WERKSTATT = "Tournament Manager 2023 neu - 2026 Werkstatt.csv"
FILE_2025 = "Tournament Manager 2023 neu - Saison 2025 Teilnehmer.csv"
FILE_2024 = "Tournament Manager 2023 neu - Saison 2024 Teilnehmer.csv"

OUTPUT_JS = "game_data.js"
OUTPUT_REPORT = "FEHLER_BERICHT.txt"

THUMBNAIL_SIZE = (64, 64)
MATCH_THRESHOLD_IMAGE = 85

# MASSIVE BLACKLIST (für Werkstatt UND Pyramide!)
# Blockt Rechenzeilen, Notizen und irrelevante Header
BLACKLIST_KEYWORDS = [
    "versehen", "fehler", "korrektur", "nach unten", "nach oben", "falsch", "siehe", "achtung", "kommentar", "google earth", "http",
    "real-life", "real life", "rückzüge", "künftige", "szenario", "notiz", "vereine", "beachten", "absteiger", "aufsteiger", "kandidaten",
    "summe", "differenz", "gesamt", "total", "pool", "vorderpfalz-pool", "reserve", "bilanz", "auswertung"
]

STATUS_KEYWORDS = [
    "rückzug", "keine liga", "aufstockung", "pfalz reserve", 
    "abgemeldet", "insolvenz", "fusion", "pausiert", 
    "später", "reserve", "ohne liga", "aufgelöst",
    "untere liga", "untere ligen", "abstieg", "kreisliga",
    "pool", "parkplatz", "sonstige"
]

# Profi-Ligen ignorieren wir beim Werkstatt-Check (da fehlen sie oft zurecht)
IGNORED_LEAGUES_IN_CHECK = ["1", "2", "3"]

# ==========================================
# HILFSFUNKTIONEN
# ==========================================

def create_id(text):
    if not isinstance(text, str): return "unknown"
    text = unidecode(text).lower()
    text = re.sub(r'[^a-z0-9]+', '_', text)
    return text.strip('_')

def aggressive_normalize(name):
    if not isinstance(name, str): return ""
    name = name.lower().strip()
    
    # SPEZIAL-MAPPINGS (Brücken bauen)
    if name in ["landesliga west", "ll west"]: return "llswwest"
    if name in ["landesliga ost", "ll ost"]: return "llswost"
    if name in ["bezirksliga west", "bl west"]: return "blrheinlandwest"
    if "mittelrheinliga" in name: name = name.replace("mittelrheinliga", "olmittelrhein")
    
    # NOFV
    if "nofv" in name and "oberliga" in name:
        name = name.replace("nofv", "").replace("oberliga", "olnordost")
    elif "nofv" in name:
        name = name.replace("nofv", "")

    name = name.replace("staffel", "st").replace("gruppe", "gr")
    name = re.sub(r'\b1\b', 'i', name) 
    name = re.sub(r'\b2\b', 'ii', name)
    name = re.sub(r'\b3\b', 'iii', name)

    replacements = {
        "oberliga": "ol", "verbandsliga": "vl", "landesliga": "ll",
        "bezirksliga": "bl", "regionalliga": "rl", "kreisliga": "kl",
        "nordost": "no", "südwest": "sw", "rheinland-pfalz": "rlp",
        "baden-württemberg": "bawu", "ba-wü": "bawu", "saarland": "saar",
        "nordrhein": "nr", "westfalen": "west", "niederrhein": "nrhein",
        "mittelrhein": "mrhein", "bayernliga": "bayernliga", "hessenliga": "olhessen"
    }
    for old, new in replacements.items():
        name = name.replace(old, new)
    name = unidecode(name)
    name = re.sub(r'[^a-z0-9]', '', name)
    return name

def is_status_message(text):
    text = text.lower()
    for kw in STATUS_KEYWORDS:
        if kw in text: return True
    return False

def load_images_map(paths):
    image_map = {}
    print(f"--- Scanne Wappen-Ordner ---")
    for path in paths:
        if not os.path.exists(path): continue
        for root, _, files in os.walk(path):
            for file in files:
                if file.lower().endswith(('.png', '.jpg', '.jpeg', '.gif')):
                    clean_name = create_id(os.path.splitext(file)[0])
                    if clean_name not in image_map:
                        image_map[clean_name] = {'full_path': os.path.join(root, file), 'filename': file}
    print(f"{len(image_map)} Bilder indexiert.")
    return image_map

def image_to_base64(path):
    try:
        with Image.open(path) as img:
            img.thumbnail(THUMBNAIL_SIZE)
            buffer = BytesIO()
            img.save(buffer, format="PNG")
            return "data:image/png;base64," + base64.b64encode(buffer.getvalue()).decode('utf-8')
    except: return None

def is_reserve_team(name):
    return any(x in name.lower() for x in [' ii', ' 2', ' u23', ' u21', ' amateure'])

def parse_visual_season_file(filepath):
    if not os.path.exists(filepath): return {}
    print(f"Lese Fallback: {filepath} ...")
    df = pd.read_csv(filepath, header=None, engine='python')
    mapping = {} 
    current_league = "Unbekannt"
    for i, row in df.iterrows():
        col_1 = str(row[1]) if pd.notna(row[1]) else ""
        col_3 = str(row[3]) if pd.notna(row[3]) else ""
        if len(col_3) < 3: continue 
        if len(col_1) > 0 and ("," in col_1 or "." in col_1) and "Stufe" not in col_3:
            current_league = col_3.strip()
        elif len(col_1) == 0:
            c_name = col_3.strip()
            if create_id(c_name) != "unknown":
                mapping[create_id(c_name)] = current_league
    return mapping

# ==========================================
# REPORTING
# ==========================================
def run_integrity_check(leagues, clubs, duplicates_blocked, active_rescues, werkstatt_findings):
    report = []
    report.append("=== BUNDESLIGA ARCHITECT REPORT (V21 Final Fix) ===\n")
    
    # 1. DUPLIKATE (MIT SPEZIAL-INFO)
    if duplicates_blocked:
        report.append(f"--- [INFO] DUPLIKATE ({len(duplicates_blocked)}) ---")
        untere_dupes = [d for d in duplicates_blocked if "Untere Liga" in str(d)] # Nur als Indikator
        # Da wir hier nur Namen haben, ist der Check vereinfacht. 
        # Aber wir wissen, dass die Differenz oft daher kommt.
        if len(duplicates_blocked) > 0:
             report.append(f"  Hinweis: Diese Vereine kamen mehrfach vor (z.B. einmal in Liga, einmal als Rückzug).")
             report.append(f"  Das Skript hat nur den ERSTEN Eintrag behalten.")
        for d in duplicates_blocked: report.append(f"  [X] {d}")
        report.append("")

    # 2. RETTUNGEN
    if active_rescues:
        report.append(f"--- ERFOLGREICHE RETTUNGEN ({len(active_rescues)}) ---")
        for r in active_rescues[:10]: report.append(f"  [+] {r}")
        if len(active_rescues)>10: report.append("  ...")
    else: report.append("--- Keine Rettungen nötig ---")

    # 3. LIGA GRÖSSEN
    report.append("\n--- LIGA-GRÖSSEN CHECK ---")
    league_counts = {l['id']: 0 for l in leagues}
    for c in clubs:
        if c['league_id'] != 'unknown':
            if c['league_id'] in league_counts:
                league_counts[c['league_id']] += 1
    
    for l in leagues:
        lid = l['id']
        name = l['name']
        count = league_counts.get(lid, 0)
        marker = ""
        # Toleranz
        if count < 8: marker = " [!] ZU LEER"
        elif count > 22: marker = " [!] ZU VOLL"
        
        # Profi Check
        if "Bundesliga" in name and count != 18: marker = " [!] (Soll: 18)"
        if "3. Liga" in name and count != 20: marker = " [!] (Soll: 20)"
        
        report.append(f"{name.ljust(35)} : {count} Vereine{marker}")

    # 4. ABGLEICH
    report.append("\n--- ABGLEICH BASIS vs. WERKSTATT ---")
    
    missing_in_werkstatt = []
    conflicts = []
    
    league_lookup = {l['id']: l['name'] for l in leagues}
    league_lookup['unknown'] = "Pool/Inaktiv"
    
    for c in clubs:
        c_id = c['id']
        basis_lid = c['league_id']
        
        if basis_lid == 'unknown': continue
        if basis_lid in IGNORED_LEAGUES_IN_CHECK: continue 
        
        werkstatt_lid = werkstatt_findings.get(c_id)
        
        if not werkstatt_lid:
            missing_in_werkstatt.append(f"{c['name']} ({league_lookup.get(basis_lid)})")
        elif werkstatt_lid != basis_lid:
            w_name = league_lookup.get(werkstatt_lid, "Unbekannt")
            b_name = league_lookup.get(basis_lid, "Unbekannt")
            
            # WIDERSPRUCHS-FILTER (REALISMUS V2)
            # Ignoriere offensichtliche Nord/Süd Fehler des Fahrstuhls
            if "Nord" in w_name and "Süd" in b_name: continue
            if "West" in w_name and "Süd" in b_name: continue
            
            if werkstatt_lid != "unknown":
                conflicts.append(f"{c['name']}: Basis='{b_name}' <-> Werkstatt='{w_name}'")

    if missing_in_werkstatt:
        report.append(f"\n[INFO] {len(missing_in_werkstatt)} Amateur-Vereine fehlen in der WERKSTATT:")
        for m in sorted(missing_in_werkstatt)[:20]:
            report.append(f"  [?] {m}")
        if len(missing_in_werkstatt)>20: report.append("  ... und weitere.")
    else:
        report.append("\n[OK] Werkstatt deckt alle relevanten Vereine ab.")

    if conflicts:
        report.append(f"\n[INFO] {len(conflicts)} Echte Widersprüche:")
        for con in sorted(conflicts):
            report.append(f"  [!] {con}")
    else:
        report.append("\n[OK] Keine relevanten Widersprüche gefunden.")

    # 5. POOL
    pool_clubs = sorted([c for c in clubs if c['league_id'] == 'unknown'], key=lambda x: x['name'])
    report.append(f"\n--- POOL (LIGALOSE VEREINE: {len(pool_clubs)}) ---")
    status_counts = {}
    for c in pool_clubs:
        msg = c['league_name_debug'] if is_status_message(c['league_name_debug']) else "Nicht gefunden"
        status_counts[msg] = status_counts.get(msg, 0) + 1
    for reason, cnt in status_counts.items():
        report.append(f"  - {cnt}x Grund: '{reason}'")

    return "\n".join(report)

# ==========================================
# MAIN
# ==========================================

def main():
    print("\n=== BUNDESLIGA ARCHITECT 2026 (V21 FINAL FIX) ===")

    # 1. LIGEN LADEN (MIT PYRAMID-CLEANER)
    leagues_map = {} 
    real_names = {}  
    leagues_list_ordered = []
    
    with open(FILE_LIGEN, 'r', encoding='utf-8', errors='replace') as f:
        lines = f.readlines()
    header_idx = 0
    for i, line in enumerate(lines):
        if "Liga-Nr." in line: header_idx = i; break
    df_ligen = pd.read_csv(FILE_LIGEN, skiprows=header_idx)
    
    for _, row in df_ligen.iterrows():
        if pd.notna(row.get('Liga')):
            l_name = str(row['Liga']).strip()
            
            # BLACKLIST CHECK FÜR PYRAMIDE! (Verhindert "Summe"-Ligen)
            if any(bad in l_name.lower() for bad in BLACKLIST_KEYWORDS):
                continue
            # Verhindert leere/komische Einträge
            if len(l_name) < 3: continue
                
            l_id = str(row.get('Liga-Nr.', '0')).strip()
            real_names[l_id] = l_name
            leagues_list_ordered.append({'id': l_id, 'name': l_name})
            leagues_map[l_id] = l_id 
            leagues_map[l_name] = l_id
            leagues_map[aggressive_normalize(l_name)] = l_id
            
    print(f"Pyramide geladen ({len(real_names)} Ligen).")

    # 2. FALLBACKS
    fallback_2025 = parse_visual_season_file(FILE_2025)
    fallback_2024 = parse_visual_season_file(FILE_2024)

    # 3. VEREINE LADEN (BASIS)
    print("\n--- Baue Vereins-Datenbank ---")
    df_vereine = pd.read_csv(FILE_VEREINE)
    if 'Verein' not in df_vereine.columns and 'Unnamed: 1' in df_vereine.columns:
        df_vereine.rename(columns={'Unnamed: 1': 'Verein'}, inplace=True)

    club_db = {}
    duplicates_blocked = []
    
    for _, row in df_vereine.iterrows():
        if pd.isna(row.get('Verein')): continue
        c_name = str(row['Verein']).strip()
        if not c_name or c_name == "nan": continue
        
        c_id = create_id(c_name)
        
        # DUPLIKAT PRÜFUNG: Wenn Verein schon da ist, ignorieren wir den zweiten!
        if c_id in club_db:
            duplicates_blocked.append(c_name)
            continue
        
        target_raw = "Free Agent"
        source_used = "Unknown"
        val_2026 = row.get('TM 2026')
        if pd.notna(val_2026) and str(val_2026).strip() not in ["", "-", "nan"]:
            target_raw = str(val_2026).strip()
            source_used = "2026 (Basis)"
        elif c_id in fallback_2025: target_raw = fallback_2025[c_id]; source_used = "2025"
        elif c_id in fallback_2024: target_raw = fallback_2024[c_id]; source_used = "2024"

        l_id = "unknown"
        if is_status_message(target_raw):
            l_id = "unknown" 
        else:
            norm_target = aggressive_normalize(target_raw)
            if target_raw in leagues_map: l_id = leagues_map[target_raw]
            elif norm_target in leagues_map: l_id = leagues_map[norm_target]
            else:
                match = process.extractOne(norm_target, [k for k in leagues_map.keys() if isinstance(k, str)], score_cutoff=85)
                if match: l_id = leagues_map[match[0]]

        club_db[c_id] = {
            'id': c_id,
            'name': c_name,
            'league_id': l_id,
            'league_name_debug': target_raw, 
            'data_source': source_used,
            'is_reserve': is_reserve_team(c_name),
            'image_thumb': None
        }

    # 4. WERKSTATT SCAN
    print("\n--- Werkstatt Scan ---")
    df_werkstatt = pd.read_csv(FILE_WERKSTATT)
    active_rescues = []
    werkstatt_findings = {}
    
    for col in df_werkstatt.columns:
        col_data = df_werkstatt[col].dropna().tolist()
        top_header = str(col).strip()
        col_data_reversed = col_data[::-1]
        col_data_reversed.append(top_header)
        
        current_collected_clubs = []
        
        for cell_text in col_data_reversed:
            cell_text = str(cell_text).strip()
            if not cell_text: continue
            cell_norm = aggressive_normalize(cell_text)
            
            # HEADER CHECK
            potential_id = None
            is_pool_marker = False
            
            # BLACKLIST (Header Filter)
            if any(bad in cell_text.lower() for bad in BLACKLIST_KEYWORDS):
                continue
                
            if is_status_message(cell_text): is_pool_marker = True
            elif cell_norm in leagues_map: potential_id = leagues_map[cell_norm]
            else:
                 # Fuzzy nur wenn es NICHT "Nord" allein ist (zu gefährlich für RL Nord)
                 if len(cell_norm) < 5 and "nord" in cell_norm:
                     pass # Ignoriere kurze "Nord" Header im Fuzzy Match
                 else:
                     match = process.extractOne(cell_norm, list(leagues_map.keys()), score_cutoff=92)
                     if match: potential_id = leagues_map[match[0]]
            
            if potential_id or is_pool_marker:
                target_league_id = "unknown" if is_pool_marker else potential_id
                
                for club_key in current_collected_clubs:
                    werkstatt_findings[club_key] = target_league_id
                    
                    if club_db[club_key]['league_id'] == "unknown":
                        club_db[club_key]['league_id'] = target_league_id
                        club_db[club_key]['data_source'] = "Werkstatt (Rettung)"
                        active_rescues.append(club_db[club_key]['name'])
                
                current_collected_clubs = []
                continue
            
            # VEREIN CHECK
            cand_id = create_id(cell_text)
            key = cand_id if cand_id in club_db else None
            if not key: 
                fuz = process.extractOne(cand_id, club_db.keys(), score_cutoff=85)
                if fuz: key = fuz[0]
            
            if key:
                current_collected_clubs.append(key)

    # 5. BILDER
    print("\n--- Bilder Verknüpfung ---")
    image_map = load_images_map([WAPPEN_PFAD_1, WAPPEN_PFAD_2])
    for c_id, data in club_db.items():
        img = image_map.get(c_id)
        if not img:
            fuz = process.extractOne(c_id, image_map.keys(), score_cutoff=MATCH_THRESHOLD_IMAGE)
            if fuz: img = image_map[fuz[0]]
        if not img and data['is_reserve']:
            parent = create_id(data['name'].replace(" II", "").replace(" 2", "").replace(" U23", "").replace(" U21", ""))
            img = image_map.get(parent)
            if not img:
                fuz_p = process.extractOne(parent, image_map.keys(), score_cutoff=MATCH_THRESHOLD_IMAGE)
                if fuz_p: img = image_map[fuz_p[0]]
        if img:
            if not data['is_reserve'] and is_reserve_team(img['filename']): continue
            data['image_thumb'] = image_to_base64(img['full_path'])

    with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
        f.write(run_integrity_check(leagues_list_ordered, list(club_db.values()), duplicates_blocked, active_rescues, werkstatt_findings))
        
    js_leagues = {l['name']: l for l in leagues_list_ordered}
    final_json = {"leagues": js_leagues, "clubs": list(club_db.values())}
    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(f"const GAME_DATA = {json.dumps(final_json, indent=2, ensure_ascii=False)};")

    print(f"\n=== FERTIG! ===")
    print(f"Prüfe bitte: {OUTPUT_REPORT}")

if __name__ == "__main__":
    main()