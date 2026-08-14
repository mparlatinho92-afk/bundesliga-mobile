#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_fm_apply.py - uebernimmt die in der Pruefseite bestaetigten FM-Logos.

Gegenstueck zu tools/wappen_fm_review.py. Erwartet deren Ergebnis-JSON:
    {"uebernehmen":[{"id":..,"name":..}, ...], "behalten":[...]}
(reine ID-Listen werden auch akzeptiert).

Ablauf je Verein: FM-PNG (512x512) ueber Wappen/<Verband>/<id>.png kopieren, danach
tools/wappen_intake.py --apply --only <ids> laufen lassen - das trimmt auf den
sichtbaren Inhalt und deckelt auf 240px, den Pipeline-Standard. So sehen die neuen
Wappen aus wie die bestehenden.

KEIN eigenes Backup: alle Wappen liegen im Git-Index, "git checkout -- Wappen/"
stellt sie wieder her. Ein zweiter Ordner waere nur eine weitere Kopie im Repo.

Die Entscheidungen werden in tools/wappen_fm_uebernommen.json fortgeschrieben, damit
spaetere Runden schon Geklaertes nicht erneut vorlegen.

  python tools/wappen_fm_apply.py ergebnis.json            # Probelauf, aendert nichts
  python tools/wappen_fm_apply.py ergebnis.json --apply
"""
import os, io, sys, json, shutil, argparse, subprocess
sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
FMG = r'C:\Users\lyric\OneDrive\Pictures\FMG Standard Logos 2026.00\FMG Standard Logos 2026.00\Clubs'
LOG = os.path.join(HERE, 'wappen_fm_uebernommen.json')


def pack_index():
    idx = {}
    for root, _, fs in os.walk(FMG):
        for f in fs:
            if f.endswith('_club.png') and f[:-9].isdigit():
                idx.setdefault(f[:-9], os.path.join(root, f))
    return idx


def ids_of(liste):
    return [x['id'] if isinstance(x, dict) else x for x in liste]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ergebnis')
    ap.add_argument('--apply', action='store_true')
    a = ap.parse_args()

    erg = json.load(io.open(a.ergebnis, encoding='utf-8'))
    nehmen = ids_of(erg.get('uebernehmen', []))
    behalten = ids_of(erg.get('behalten', []))

    fmg = pack_index()
    m = json.load(io.open(os.path.join(ROOT, 'tools/_fm_match.json'), encoding='utf-8'))
    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    teams = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])['teams']

    plan, fehler = [], []
    for tid in nehmen:
        t = teams.get(tid)
        if not t: fehler.append((tid, 'kein Verein in game_data')); continue
        fid = str(m.get(tid, ''))
        src = fmg.get(fid)
        if not src: fehler.append((tid, 'kein FM-Logo zu ID %s' % fid)); continue
        dst = os.path.join(ROOT, t['thumb'].replace('/', os.sep))
        if not os.path.exists(dst): fehler.append((tid, 'Zieldatei fehlt: %s' % t['thumb'])); continue
        plan.append((tid, t['name'], src, dst))

    print('%d zu uebernehmen, %d zu behalten (unangetastet)' % (len(plan), len(behalten)))
    for tid, why in fehler:
        print('   UEBERSPRUNGEN %-32s %s' % (tid, why))
    if not a.apply:
        print('\nProbelauf - nichts geaendert. Mit --apply ausfuehren.')
        return 0

    for tid, nm, src, dst in plan:
        shutil.copyfile(src, dst)
    print('%d Dateien kopiert, jetzt normalisieren (240px, getrimmt) ...' % len(plan))

    r = subprocess.run([sys.executable, os.path.join(HERE, 'wappen_intake.py'),
                        '--apply', '--only', ','.join(t[0] for t in plan)],
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    print((r.stdout or '').strip().splitlines()[-1] if r.stdout else '(intake ohne Ausgabe)')
    if r.returncode != 0:
        print('WARNUNG intake rc=%d: %s' % (r.returncode, (r.stderr or '')[:200]))

    # Eine Reserve ist derselbe Verein: die Entscheidung fuer einen gilt immer fuer die ganze
    # Familie, auch wenn sie nur einmal getroffen wurde. Sonst traegt die Reserve weiter das
    # alte, grobe Wappen - vor dem ersten Lauf wichen 35 von 80 Familien ab.
    r2 = subprocess.run([sys.executable, os.path.join(HERE, 'wappen_familie.py'), '--apply'],
                        capture_output=True, text=True, encoding='utf-8', errors='replace')
    for zeile in (r2.stdout or '').splitlines():
        if 'angeglichen' in zeile or 'ANDEREM Bild' in zeile:
            print(zeile.strip())

    alt = json.load(io.open(LOG, encoding='utf-8')) if os.path.exists(LOG) else {'uebernommen': {}, 'behalten': {}}
    for tid, nm, _, _ in plan: alt['uebernommen'][tid] = nm
    for tid in behalten: alt['behalten'][tid] = teams.get(tid, {}).get('name', '?')
    json.dump(alt, io.open(LOG, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    print('Stand fortgeschrieben: %d uebernommen, %d behalten -> %s'
          % (len(alt['uebernommen']), len(alt['behalten']), os.path.relpath(LOG, ROOT)))
    print('Rueckgaengig: git checkout -- Wappen/')
    return 0


if __name__ == '__main__':
    sys.exit(main())
