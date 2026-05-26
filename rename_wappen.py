import os

# KONFIGURATION
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
TARGET_DIR = os.path.join(SCRIPT_DIR, 'Wappen') # Dein Wappen-Ordner

def clean_filename(name):
    # Nur den Dateinamen (ohne Endung) bearbeiten
    base, ext = os.path.splitext(name)
    
    new_base = base.lower()
    # Die Ersetzungen
    new_base = new_base.replace('ä', 'ae')
    new_base = new_base.replace('ö', 'oe')
    new_base = new_base.replace('ü', 'ue')
    new_base = new_base.replace('ß', 'ss')
    new_base = new_base.replace(' ', '_')
    new_base = new_base.replace('-', '_')
    new_base = new_base.replace('.', '') # Punkte im Namen weg (außer Dateiendung)
    
    # Optional: Doppelte Unterstriche entfernen
    while '__' in new_base:
        new_base = new_base.replace('__', '_')
    
    return new_base.strip('_') + ext.lower()

print(f"--- STARTE UMBENENNUNG IN: {TARGET_DIR} ---")

if not os.path.exists(TARGET_DIR):
    print("FEHLER: Ordner 'Wappen' nicht gefunden!")
    exit()

count = 0
for root, dirs, files in os.walk(TARGET_DIR):
    for filename in files:
        if not filename.lower().endswith(('.png', '.jpg', '.jpeg', '.svg')):
            continue
            
        old_path = os.path.join(root, filename)
        new_name = clean_filename(filename)
        new_path = os.path.join(root, new_name)
        
        if old_path != new_path:
            try:
                os.rename(old_path, new_path)
                print(f"Renamed: {filename} -> {new_name}")
                count += 1
            except Exception as e:
                print(f"Fehler bei {filename}: {e}")

print(f"--- FERTIG: {count} Dateien umbenannt ---")