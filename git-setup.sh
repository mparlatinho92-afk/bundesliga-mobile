#!/bin/bash
# Bundesliga-Simulation – Git Setup
# Dieses Skript in Git Bash ausführen (Rechtsklick auf den Ordner → "Git Bash Here")

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$REPO_DIR"

echo "=== Git Setup: Bundesliga-Fussballsimulation ==="
echo "Verzeichnis: $REPO_DIR"
echo ""

# 1. Altes (kaputtes) .git entfernen und neu initialisieren
echo ">> .git-Ordner wird neu angelegt..."
rm -rf .git
git init -b main

# 2. Benutzer konfigurieren
git config user.name "Marcel"
git config user.email "mparlatinho92@gmail.com"

# 3. Remote hinzufügen
git remote add origin https://github.com/mparlatinho92-afk/bundesliga-mobile.git
echo ">> Remote 'origin' gesetzt: https://github.com/mparlatinho92-afk/bundesliga-mobile.git"

# 4. .gitignore schreiben
cat > .gitignore << 'GITIGNORE'
# Diagnose & Report-Dateien
DIAGNOSE_REPORT.txt
DUPLICATES_TO_DELETE.txt
FEHLER_BERICHT.txt
REPORT_*.txt
GAME_DATA_AUDIT.csv
QUIZ_LISTE.txt
Saison-Abschlussbericht.ini

# Python Cache
__pycache__/
*.pyc

# Generierte Ausgaben
farchiv_output/
GITIGNORE

# 5. Projektdateien stagen
echo ">> Dateien werden gestagt..."
git add index.html season.html check_regions.html
git add data_live.js data_logic.js game_data.js game_engine.js
git add builder.py audit_game_data.py diagnose.py excel_fixer.py
git add generate_db_final.py generate_game_data.py rename_wappen.py
git add .gitignore
git add "Ligastärkewerte.csv" "Hessen.csv"
git add "Tournament Manager 2023 neu - Ligapyramide 2026.csv"
git add "Tournament Manager 2023 neu - Saison 2024 Teilnehmer.csv"
git add "Tournament Manager 2023 neu - Saison 2025 Teilnehmer.csv"
git add "Tournament Manager 2023 neu - Ligapyramide 2026.xlsx"
git add "Tournament Manager 2023 neu - Vereine Übersicht Ligen Zuordnung.xlsx"
git add "Tournament Manager 2023 neu - Vereine Übersicht Ligen Zuordnung - Kopie.xlsx"
git add Wappen/

echo ""
echo ">> Gestagede Dateien:"
git status --short

# 6. Initialer Commit
git commit -m "Initial commit: Bundesliga-Fussballsimulation HTML"

echo ""
echo "========================================"
echo "  Repository lokal eingerichtet!"
echo "========================================"
echo ""
echo "Zum Pushen nach GitHub führe aus:"
echo ""
echo "  git push -u origin main"
echo ""
echo "Du wirst nach deinem GitHub-Benutzernamen und"
echo "einem Personal Access Token (PAT) gefragt."
echo "Token erstellen: https://github.com/settings/tokens"
echo "(Scope: repo)"
