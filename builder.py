import json
import re
import os
import difflib
import sys

# Prüfen, ob Pandas installiert ist
try:
    import pandas as pd
except ImportError:
    print("!!! FEHLER: Pandas fehlt. Bitte installiere es mit: pip install pandas")
    sys.exit(1)

# ==============================================================================
# 1. KONFIGURATION
# ==============================================================================
# Dateinamen exakt wie hochgeladen
FILE_PYRAMID = 'Tournament Manager 2023 neu - Ligapyramide 2026.xlsx'
FILE_TEAMS   = 'Tournament Manager 2023 neu - Vereine Übersicht Ligen Zuordnung.xlsx'
FILE_IMAGES  = 'Wappen/dateiliste.txt'

# Ausgabedatei
OUTPUT_JS    = 'data_live.js'

# Einstellungen
MATCH_THRESHOLD = 0.88
RESERVE_KEYWORDS = [" ii", " u23", " jun", " 2", "_ii", "_u23"] 

# ==============================================================================
# 2. HELPER FUNKTIONEN
# ==============================================================================
def normalize_key(name):
    """Erstellt eine saubere ID aus einem Namen."""
    if pd.isna(name): 
        return "unknown"
    s = str(name).lower()
    s = s.replace('ä', 'ae').replace('ö', 'oe').replace('ü', 'ue').replace('ß', 'ss')
    s = re.sub(r'[^a-z0-9]', '_', s)
    return s.strip('_')

def clean_league_id(raw_id):
    """Repariert kaputte IDs (z.B. '4.1' -> '4-1')."""
    s = str(raw_id).strip().replace(',', '.')
    if s in ["nan", "-", "", "None", "False"]: 
        return None
    
    # Entferne .0 am Ende
    if s.endswith(".0"): 
        s = s[:-2]

    # Splitte bei Punkt oder Bindestrich
    parts = re.split(r'[.-]', s)
    
    if len(parts) == 2:
        try:
            return f"{int(parts[0])}-{int(parts[1])}"
        except ValueError:
            return s
            
    return s

def is_reserve(name):
    """Prüft auf Reserve-Teams."""
    n = str(name).lower()
    return any(k in n for k in RESERVE_KEYWORDS)

# ==============================================================================
# 3. BILDER LOGIK
# ==============================================================================
def load_image_index():
    print(f"--- Lese {FILE_IMAGES} ---")
    index = []
    if not os.path.exists(FILE_IMAGES):
        print(f"WARNUNG: {FILE_IMAGES} nicht gefunden.")
        return index

    try:
        with open(FILE_IMAGES, 'r', encoding='utf-8', errors='replace') as f:
            lines = f.readlines()
            
        for line in lines:
            path = line.strip()
            # Nur Bilder akzeptieren
            if not path or not path.lower().endswith(('.png', '.jpg', '.jpeg', '.svg')): 
                continue
            
            filename = os.path.basename(path)
            name_only = os.path.splitext(filename)[0]
            
            index.append({
                'clean': normalize_key(name_only),
                'orig_name': name_only,
                'path': path.replace('\\', '/')
            })
        print(f"-> {len(index)} Bilder indexiert.")
    except Exception as e:
        print(f"Fehler beim Lesen der Dateiliste: {e}")
        
    return index

def find_best_image(team_name, image_index):
    team_clean = normalize_key(team_name)
    team_is_res = is_reserve(team_name)

    # 1. Exakter Match
    for img in image_index:
        if img['clean'] == team_clean:
            img_is_res = is_reserve(img['orig_name'])
            if team_is_res == img_is_res:
                return img['path']

    # 2. Fuzzy Match
    best_match = None
    best_ratio = 0.0
    
    for img in image_index:
        img_is_res = is_reserve(img['orig_name'])
        if team_is_res != img_is_res: 
            continue
            
        ratio = difflib.SequenceMatcher(None, team_clean, img['clean']).ratio()
        if ratio > best_ratio:
            best_ratio = ratio
            best_match = img['path']

    if best_ratio >= MATCH_THRESHOLD:
        return best_match
    
    return None

# ==============================================================================
# 4. HAUPTPROGRAMM
# ==============================================================================
def build():
    # Bilder laden
    img_index = load_image_index()
    
    # --- PYRAMIDE EINLESEN ---
    print(f"\n--- Verarbeite {FILE_PYRAMID} ---")
    leagues = {}
    
    if not os.path.exists(FILE_PYRAMID):
        print(f"FEHLER: Datei fehlt: {FILE_PYRAMID}")
        return

    try:
        # Header suchen
        with open(FILE_PYRAMID, 'r', encoding='utf-8', errors='replace') as f: 
            lines = f.readlines()
        
        header_idx = 0
        for i, line in enumerate(lines):
            if "Liga-Nr." in line or "Stufe" in line:
                header_idx = i
                break
        
        # CSV lesen
        df_pyr = pd.read_csv(
            FILE_PYRAMID, 
            skiprows=header_idx, 
            encoding='utf-8', 
            on_bad_lines='skip', 
            sep=None, 
            engine='python'
        )

        # Spalten finden
        cols = df_pyr.columns.tolist()
        col_lid = next((c for c in cols if "Nr" in str(c)), None)
        col_name = next((c for c in cols if "Liga" in str(c) and "Nr" not in str(c)), None)
        col_lvl = next((c for c in cols if "Stufe" in str(c)), None)
        col_reg = next((c for c in cols if "Region" in str(c) or "Verband" in str(c)), None)

        for _, row in df_pyr.iterrows():
            if col_lid is None: continue
            
            raw_id = row[col_lid]
            lid = clean_league_id(raw_id)
            if not lid: continue
            
            # Hierarchie
            hierarchy_data = None
            if col_reg and pd.notna(row[col_reg]):
                hierarchy_data = {"keywords": str(row[col_reg])}

            leagues[lid] = {
                "id": lid,
                "name": str(row.get(col_name, f"Liga {lid}")),
                "level": int(row.get(col_lvl, 99)),
                "hierarchy": hierarchy_data
            }
        print(f"-> {len(leagues)} Ligen erkannt.")
        
    except Exception as e:
        print(f"CRITICAL ERROR bei Pyramide: {e}")
        return

    # --- TEAMS EINLESEN ---
    print(f"\n--- Verarbeite {FILE_TEAMS} ---")
    initial_allocation = {}
    team_meta = {}
    
    if not os.path.exists(FILE_TEAMS):
        print(f"FEHLER: Datei fehlt: {FILE_TEAMS}")
        return

    try:
        # Header suchen
        with open(FILE_TEAMS, 'r', encoding='utf-8', errors='replace') as f: 
            lines = f.readlines()
            
        header_idx_t = 0
        for i, line in enumerate(lines):
            if "Verein" in line or "Club" in line:
                header_idx_t = i
                break
        
        df_teams = pd.read_csv(
            FILE_TEAMS, 
            skiprows=header_idx_t, 
            encoding='utf-8', 
            on_bad_lines='skip', 
            sep=None, 
            engine='python'
        )
        
        cols_t = df_teams.columns.tolist()
        col_t_name = next((c for c in cols_t if "Verein" in str(c) or "Club" in str(c)), None)
        # Liga Spalte suchen (meist rechts)
        col_t_liga = None
        for c in reversed(cols_t):
            if "Liga" in str(c) or "2026" in str(c):
                col_t_liga = c
                break

        print(f"Spalten: Name='{col_t_name}' | Liga='{col_t_liga}'")

        if not col_t_name:
            print("FEHLER: Keine Namensspalte (Verein/Club) gefunden!")
            return

        for _, row in df_teams.iterrows():
            name = str(row[col_t_name]).strip()
            if not name or name.lower() in ["nan", "spielfrei", "none"]: 
                continue
            
            tid = normalize_key(name)
            
            # Liga Allocation
            if col_t_liga:
                raw_l = row[col_t_liga]
                clean_l = clean_league_id(raw_l)
                if clean_l and clean_l in leagues:
                    initial_allocation[tid] = clean_l

            # Bild
            img = find_best_image(name, img_index)
            
            # Metadaten für Engine
            team_meta[tid] = {
                "id": tid,
                "name": name,
                "img_path": img,
                "leagueId": initial_allocation.get(tid, None)
            }

        print(f"-> {len(team_meta)} Teams verarbeitet.")

    except Exception as e:
        print(f"CRITICAL ERROR bei Teams: {e}")
        return

    # --- EXPORT ---
    print(f"\n--- Generiere {OUTPUT_JS} ---")
    
    # Aufbau des finalen Objekts für game_engine.js
    final_data = {
        "leagues": leagues,
        "teams": team_meta,
        "initial_allocation": initial_allocation
    }
    
    # WICHTIG: Variable heißt jetzt GAME_DATA!
    js_content = f"const GAME_DATA = {json.dumps(final_data, indent=2, ensure_ascii=False)};"
    
    try:
        with open(OUTPUT_JS, 'w', encoding='utf-8') as f:
            f.write(js_content)
        print("FERTIG! JS-Datei wurde erfolgreich erstellt.")
    except Exception as e:
        print(f"Fehler beim Schreiben der JS: {e}")

if __name__ == "__main__":
    build()