#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Prüft (und repariert) schemas/functions.schema.json gegen den echten Code.

Hintergrund: Das Schema ist laut CLAUDE.md die Navigations-Zentrale zum Token-Sparen –
aber Zeilennummern verschieben sich bei jedem Edit still. Im Juli 2026 hatten 130 von
234 App-Einträgen falsche Zeilen (init stand auf 38 statt 82), damit war das Schema als
Navigationshilfe wertlos. Dieses Skript macht die Pflicht-Inventur nach jedem Coding-Task
zum Einzeiler.

Geprüft wird:
  1. LÜCKE       – Top-Level-Funktionen im Code, die im Schema fehlen
  2. KARTEILEICHE– Schema-Einträge, deren Definition es im Code nicht (mehr) gibt
  3. DRIFT       – Zeilennummer weicht > TOLERANZ (Default 10, wie CLAUDE.md) ab
  4. MEHRDEUTIG  – Name mehrfach am Zeilenanfang definiert -> Handarbeit nötig

Aufruf:
  python tools/schema_check.py            # nur berichten (Exit 1 bei Befund)
  python tools/schema_check.py --fix      # eindeutige Zeilennummern korrigieren
  python tools/schema_check.py --quiet     # nur die Zusammenfassung
  python tools/schema_check.py --tolerance 0

--fix korrigiert AUSSCHLIESSLICH Zeilennummern und nur dort, wo genau eine Definition
gefunden wurde. Beschreibungen, Reihenfolge und die handgesetzte Spalten-Ausrichtung
der JSON-Datei bleiben unangetastet (gezielte Regex-Ersetzung statt json.dump).
Karteileichen und fehlende Einträge werden NIE automatisch geändert – die brauchen
eine Entscheidung (umbenannt? gelöscht? neu eintragen?).
"""
import sys, os, re, json, glob, argparse

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SCHEMA = os.path.join(ROOT, 'schemas', 'functions.schema.json')

# Dateien, in denen Top-Level-Funktionen erwartet werden (Lücken-Prüfung).
# Minifizierte/reine Datendateien liefern ohnehin keine Treffer am Zeilenanfang.
SOURCE_GLOBS = ['app/*.js', 'game_engine.js']

# Schlüssel, die eine Sektion beschreiben statt eine Funktion zu indizieren.
# ACHTUNG: echte Funktionsnamen beginnen sehr wohl mit "_" (_heimatBalance, _sbBadges …) –
# hier darf NICHT auf das Präfix gefiltert werden, sondern nur auf diese beiden Namen.
META_KEYS = ('_desc', '_file')

_cache = {}


def lines_of(relpath):
    """Datei als Zeilenliste (None wenn nicht lesbar). UTF-8 – siehe Encoding-Falle bei game_data.js."""
    if relpath not in _cache:
        p = os.path.join(ROOT, relpath)
        try:
            with open(p, encoding='utf-8') as fh:
                _cache[relpath] = fh.read().split('\n')
        except OSError:
            _cache[relpath] = None
    return _cache[relpath]


def find_defs(relpath, name):
    """Zeilennummern (1-basiert), in denen 'name' am Zeilenanfang definiert wird.

    Erfasst die im Projekt üblichen Formen:
        name: function(…)      – Object.assign(App, {…})-Pattern
        name: { … } / name: [  – Konstanten-Maps (LEAGUE_LOGOS, _REPORT_W, REPORTS-Pools)
        const/let/var name =   – Modul-Konstanten
        window.name =          – globale Bänke (window.REPORTS_POKAL)
    Bis zu 4 Zeichen Einrückung, damit verschachtelte Helfer nicht mitzählen.
    """
    src = lines_of(relpath)
    if src is None:
        return None
    pat = re.compile(r'^\s{0,4}(?:const\s+|let\s+|var\s+|window\.)?%s\s*[:=]' % re.escape(name))
    return [i + 1 for i, ln in enumerate(src) if pat.search(ln)]


def audit(schema, tolerance):
    """-> (fixes, dead, ambiguous, ok) ; fixes = [(name, file, alt, neu)]"""
    fixes, dead, ambiguous, ok = [], [], [], 0
    for section in schema.values():
        if not isinstance(section, dict):
            continue
        # Sektions-Vorgabe: die Engine-Sektion deklariert ihre Datei einmal oben ("_file"),
        # ihre ~100 Einträge tragen deshalb nur "line". Ohne diesen Rückfall übersprang die
        # Prüfung sie stillschweigend – 67 davon waren >10 Zeilen daneben, einige um 800.
        default_file = section.get('_file')
        for name, entry in section.items():
            if name in META_KEYS or not isinstance(entry, dict):
                continue
            explicit = entry.get('file')
            relpath, line = explicit or default_file, entry.get('line')
            if not relpath or line is None:
                continue                      # Einträge ganz ohne Datei/Zeile: bewusst ohne
            hits = find_defs(relpath, name)
            if hits is None:
                dead.append((name, relpath, line, 'Datei fehlt'))
            elif not hits:
                dead.append((name, relpath, line, 'keine Definition'))
            elif len(hits) > 1 and all(abs(h - line) > tolerance for h in hits):
                ambiguous.append((name, relpath, line, hits))
            elif any(abs(h - line) <= tolerance for h in hits):
                ok += 1
            else:
                fixes.append((name, relpath, line, hits[0], bool(explicit)))
    return fixes, dead, ambiguous, ok


def missing_functions(schema):
    """Top-Level-Funktionen im Code, die in KEINER Schema-Sektion stehen."""
    known = {k for sec in schema.values() if isinstance(sec, dict) for k in sec if k not in META_KEYS}
    gaps = []
    for pattern in SOURCE_GLOBS:
        for path in sorted(glob.glob(os.path.join(ROOT, pattern))):
            rel = os.path.relpath(path, ROOT).replace('\\', '/')
            with open(path, encoding='utf-8') as fh:
                src = fh.read()
            names = re.findall(r'^\s{0,4}(\w+)\s*:\s*function', src, re.M)
            for n in dict.fromkeys(names):
                if n not in known:
                    gaps.append((n, rel))
    return gaps


def apply_fixes(raw, fixes):
    """Zeilennummern gezielt ersetzen – Formatierung der Datei bleibt erhalten."""
    done = 0
    for name, relpath, old, new, explicit in fixes:
        if explicit:
            pat = re.compile(r'("%s"\s*:\s*\{\s*"file"\s*:\s*"%s"\s*,\s*"line"\s*:\s*)%d\b'
                             % (re.escape(name), re.escape(relpath), old))
        else:
            # Eintrag erbt die Datei aus "_file" der Sektion und schreibt nur "line".
            pat = re.compile(r'("%s"\s*:\s*\{\s*"line"\s*:\s*)%d\b' % (re.escape(name), old))
        raw, n = pat.subn(lambda m: m.group(1) + str(new), raw, count=1)
        done += n
    return raw, done


def main():
    ap = argparse.ArgumentParser(description='Schema gegen den Code prüfen (und Zeilennummern reparieren).')
    ap.add_argument('--fix', action='store_true', help='eindeutige Zeilennummern korrigieren')
    ap.add_argument('--tolerance', type=int, default=10, help='erlaubte Abweichung in Zeilen (Default 10)')
    ap.add_argument('--quiet', action='store_true', help='nur die Zusammenfassung ausgeben')
    args = ap.parse_args()

    with open(SCHEMA, encoding='utf-8') as fh:
        raw = fh.read()
    schema = json.loads(raw)

    fixes, dead, ambiguous, ok = audit(schema, args.tolerance)
    gaps = missing_functions(schema)

    def block(title, rows, fmt):
        if rows and not args.quiet:
            print('\n%s (%d):' % (title, len(rows)))
            for r in rows:
                print('   ' + fmt(r))

    block('LÜCKE – im Code, nicht im Schema', gaps, lambda r: '%-28s %s' % (r[0], r[1]))
    block('KARTEILEICHE – im Schema, nicht im Code', dead,
          lambda r: '%-28s %-22s Zeile %s  (%s)' % (r[0], r[1], r[2], r[3]))
    block('MEHRDEUTIG – Handarbeit nötig', ambiguous,
          lambda r: '%-28s %-22s Schema %s, Treffer %s' % (r[0], r[1], r[2], r[3]))
    block('DRIFT – falsche Zeilennummer', fixes,
          lambda r: '%-28s %-22s %s -> %s' % (r[0], r[1], r[2], r[3]))

    if args.fix and fixes:
        raw, done = apply_fixes(raw, fixes)
        with open(SCHEMA, 'w', encoding='utf-8', newline='') as fh:
            fh.write(raw)
        json.load(open(SCHEMA, encoding='utf-8'))          # Sicherheitsnetz: bleibt valides JSON
        print('\n%d Zeilennummern korrigiert.' % done)
        fixes = []

    print('\n%s  aktuell: %d | Drift: %d | Karteileichen: %d | mehrdeutig: %d | Lücke: %d'
          % ('OK  ' if not (fixes or dead or ambiguous or gaps) else 'BEFUND',
             ok, len(fixes), len(dead), len(ambiguous), len(gaps)))
    if fixes and not args.fix:
        print('       -> "python tools/schema_check.py --fix" korrigiert die Zeilennummern.')
    if dead or ambiguous or gaps:
        print('       -> Karteileichen/Lücken/Mehrdeutige brauchen eine Entscheidung von Hand.')
    return 1 if (fixes or dead or ambiguous or gaps) else 0


if __name__ == '__main__':
    sys.exit(main())
