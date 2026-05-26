import os
import openpyxl

# KONFIGURATION
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
# Dateiname anpassen, falls nötig!
INPUT_FILE = os.path.join(SCRIPT_DIR, 'Tournament Manager 2023 neu - Vereine Übersicht Ligen Zuordnung.xlsx')
OUTPUT_FILE = os.path.join(SCRIPT_DIR, 'Tournament Manager 2023 neu - Vereine Übersicht Ligen Zuordnung_FIXED.xlsx')

def needs_apostrophe(val):
    if val is None: return False
    s = str(val).strip()
    
    # 1. Hat schon Apostroph? -> Nein
    if s.startswith("'"): return False
    
    # 2. Beginnt mit Zahl? -> JA! (Das ist dein Wunsch)
    # Prüft auf 0-9 am Anfang. "4-5" -> Ja. "Keine Liga" -> Nein.
    if len(s) > 0 and s[0].isdigit():
        return True
        
    return False

print("--- EXCEL FIXER V2 (SMART) START ---")
print(f"Lade Datei: {INPUT_FILE}")

try:
    wb = openpyxl.load_workbook(INPUT_FILE)
    ws = wb.active
    
    # Spalten K (11) und M (13)
    target_columns = [11, 13] 
    
    count_fixed = 0
    
    # Ab Zeile 2 durchgehen
    for row in ws.iter_rows(min_row=2):
        for col_idx in target_columns:
            cell = row[col_idx - 1] # -1 weil Array 0-basiert ist, Excel-Index aber 1-basiert
            
            if needs_apostrophe(cell.value):
                # Das ' erzwingt Text-Format in Excel
                cell.value = f"'{str(cell.value).strip()}"
                count_fixed += 1

    print(f"Speichere als: {OUTPUT_FILE}")
    wb.save(OUTPUT_FILE)
    print(f"✅ FERTIG! {count_fixed} Zellen korrigiert.")
    print("👉 Bitte lösche jetzt die alte Datei und benenne die '_FIXED' Datei um!")

except Exception as e:
    print(f"❌ FEHLER: {e}")
    print("Tipp: Ist die Excel-Datei vielleicht noch geöffnet? Bitte schließen!")