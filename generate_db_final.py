import os
import json
import pandas as pd
import base64
import re
from PIL import Image
from io import BytesIO
from unidecode import unidecode
from rapidfuzz import process

# ==========================================
# KONFIGURATION
# ==========================================

WAPPEN_PFAD_1 = r"G:\Meine Ablage\Tournament Manager Wappen"
WAPPEN_PFAD_2 = r"C:\Users\lyric\OneDrive\Pictures\Tournament Manager Wappen-20260102T204826Z-3-001"

FILE_LIGEN = "Tournament Manager 2023 neu - Ligapyramide 2026.csv"
FILE_VEREINE = "Tournament Manager 2023 neu - Vereine Übersicht Ligen Zuordnung.csv"

# Alte Saisons nur als Notnagel, falls TM 2026 leer ist
FILE_2025 = "Tournament Manager 2023 neu - Saison 2025 Teilnehmer.csv"
FILE_2024 = "Tournament Manager 2023 neu - Saison 2024 Teilnehmer.csv"

OUTPUT_JS = "game_data.js"
OUTPUT_REPORT = "FEHLER_BERICHT.txt"

THUMBNAIL_SIZE = (64, 64)
MATCH_THRESHOLD_IMAGE = 85

# Wörter, die signalisieren: "Ich bin keine echte Liga"
BLACKLIST_LEAGUES = [
    "summe", "differenz", "gesamt", "total", "pool", "vorderpfalz-pool", "reserve", "bilanz", "auswertung"
]

STATUS_KEYWORDS = [
    "rückzug", "keine liga", "aufstockung", "pfalz reserve", 
    "abgemeldet", "insolvenz", "fusion", "pausiert", 
    "später", "reserve", "ohne liga", "aufgelöst",
    "untere liga", "untere ligen", "abstieg", "kreisliga",
    "pool", "parkplatz", "sonstige"
]

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
    
    # SPEZIAL-MAPPINGS (Damit deine Liste auf die Pyramide passt)
    if name in ["landesliga west", "ll west"]: return "llswwest"
    if name in ["landesliga ost", "ll ost"]: return "llswost"
    if name in ["bezirksliga west", "bl west"]: return "blrheinlandwest"
    if "mittelrheinliga" in name: name = name.replace("mittelrheinliga", "olmittelrhein")
    
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
    # Nur Fallback, Logik vereinfacht
    df = pd.read_csv(filepath, header=None, engine='python')
    mapping = {} 
    current_league = "Unbekannt"
    for i, row in df.iterrows():
        col_3 = str(row[3]) if pd.notna(row[3]) else ""
        col_1 = str(row[1]) if pd.notna(row[1]) else ""
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
def run_integrity_check(leagues, clubs, duplicates_blocked):
    report = []
    report.append("=== BUNDESLIGA ARCHITECT REPORT (V22 PURIST) ===\n")
    report.append("Grundlage: Nur 'Vereine Übersicht Ligen Zuordnung.csv' (Spalte TM 2026)\n")
    
    # 1. DUPLIKATE
    if duplicates_blocked:
        report.append(f"--- [INFO] GELÖSCHTE DUPLIKATE ({len(duplicates_blocked)}) ---")
        untere_dupes = [d for d in duplicates_blocked if "Untere Liga" in str(d)] 
        if untere_dupes:
             report.append(f"  (Info: {len(untere_dupes)} davon waren doppelte 'Untere Liga' Einträge)")
        for d in duplicates_blocked: report.append(f"  [X] {d}")
        report.append("")

    # 2. LIGA GRÖSSEN
    report.append("--- LIGA-GRÖSSEN CHECK ---")
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
        if count < 8: marker = " [!] ZU LEER"
        elif count > 22: marker = " [!] ZU VOLL"
        
        # Profi Check
        if "Bundesliga" in name and count != 18: marker = " [!] (Soll: 18)"
        if "3. Liga" in name and count != 20: marker = " [!] (Soll: 20)"
        
        report.append(f"{name.ljust(35)} : {count} Vereine{marker}")

    # 3. POOL
    pool_clubs = sorted([c for c in clubs if c['league_id'] == 'unknown'], key=lambda x: x['name'])
    report.append(f"\n--- POOL / INAKTIV ({len(pool_clubs)}) ---")
    status_counts = {}
    for c in pool_clubs:
        msg = c['league_name_debug'] if is_status_message(c['league_name_debug']) else "Liga nicht gefunden"
        status_counts[msg] = status_counts.get(msg, 0) + 1
    for reason, cnt in status_counts.items():
        report.append(f"  - {cnt}x Grund: '{reason}'")
        
    # Detail-Liste bei Fehlern
    not_found = [c for c in pool_clubs if not is_status_message(c['league_name_debug'])]
    if not_found:
        report.append("\n--- ACHTUNG: ZIEL-LIGA NICHT GEFUNDEN ---")
        report.append("(Diese Vereine stehen in der Liste, aber der Liga-Name passt nicht zur Pyramide)")
        for c in not_found:
            report.append(f"  [!] {c['name']} -> Ziel war: '{c['league_name_debug']}'")

    return "\n".join(report)

# ==========================================
# MAIN
# ==========================================

def main():
    print("\n=== BUNDESLIGA ARCHITECT 2026 (PURIST EDITION) ===")

    # 1. LIGEN LADEN (SAUBER)
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
            
            # Blacklist (Summe, Differenz etc.)
            if any(bad in l_name.lower() for bad in BLACKLIST_LEAGUES): continue
            if len(l_name) < 3: continue
                
            l_id = str(row.get('Liga-Nr.', '0')).strip()
            real_names[l_id] = l_name
            leagues_list_ordered.append({'id': l_id, 'name': l_name})
            leagues_map[l_id] = l_id 
            leagues_map[l_name] = l_id
            leagues_map[aggressive_normalize(l_name)] = l_id
            
    print(f"Pyramide geladen ({len(real_names)} Ligen).")

    # 2. FALLBACKS (Nur Backup)
    fallback_2025 = parse_visual_season_file(FILE_2025)
    fallback_2024 = parse_visual_season_file(FILE_2024)

    # 3. VEREINE LADEN (NUR DAS ZÄHLT!)
    print("\n--- Verarbeite Vereins-Liste ---")
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
        
        # Duplikat-Schutz
        if c_id in club_db:
            duplicates_blocked.append(c_name)
            continue
        
        target_raw = "Free Agent"
        source_used = "Unknown"
        
        # PRIO 1: TM 2026 Spalte
        val_2026 = row.get('TM 2026')
        if pd.notna(val_2026) and str(val_2026).strip() not in ["", "-", "nan"]:
            target_raw = str(val_2026).strip()
            source_used = "2026 (Basis)"
        # PRIO 2: Fallbacks (nur wenn Prio 1 leer)
        elif c_id in fallback_2025: target_raw = fallback_2025[c_id]; source_used = "2025"
        elif c_id in fallback_2024: target_raw = fallback_2024[c_id]; source_used = "2024"

        l_id = "unknown"
        
        # Zuweisung
        if is_status_message(target_raw):
            l_id = "unknown" # Pool
        else:
            norm_target = aggressive_normalize(target_raw)
            if target_raw in leagues_map: l_id = leagues_map[target_raw]
            elif norm_target in leagues_map: l_id = leagues_map[norm_target]
            else:
                # Fuzzy Matching
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

    # 4. BILDER
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

    # 5. EXPORT
    with open(OUTPUT_REPORT, 'w', encoding='utf-8') as f:
        f.write(run_integrity_check(leagues_list_ordered, list(club_db.values()), duplicates_blocked))
        
    js_leagues = {l['name']: l for l in leagues_list_ordered}
    final_json = {"leagues": js_leagues, "clubs": list(club_db.values())}
    with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
        f.write(f"const GAME_DATA = {json.dumps(final_json, indent=2, ensure_ascii=False)};")

    print(f"\n=== FERTIG! ===")
    print(f"Datei erstellt: {OUTPUT_JS}")
    print(f"Bericht: {OUTPUT_REPORT}")

if __name__ == "__main__":
    main()