#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_einkaufsliste.py - schreibt tools/wappen_extern_gesucht.md neu.

Die Liste sagt, fuer welche Vereine noch ein besseres Wappen fehlt und WARUM die
FM-Quelle dort nicht mehr weiterhilft. Sie wurde bisher nach jeder Uebernahme von
Hand nachgefuehrt - bei 40 geaenderten Wappen pro Runde ist das reine Fleissarbeit
und veraltet sofort. Alles Noetige steht ohnehin schon in drei Dateien:

    tools/wappen_quality.csv          - effektive Aufloesung je Verein (eff)
    tools/wappen_fm_uebernommen.json  - was entschieden wurde (behalten / extern)
    tools/_fm_match.json              - ob es ueberhaupt einen FM-Kandidaten gibt

Die vier Gruppen und was sie bedeuten:
  * keine FM-Zuordnung          - FM kennt den Verein nicht, nur externe Quellen helfen
  * FM taugt nicht              - geprueft, FM zeigt einen fremden Verein / anderen Ort
  * unser Wappen ist richtig    - inhaltlich korrekt, nur zu grob aufgeloest
  * FM-Vorschlag offen          - ein Paar liegt vor, ist aber noch nicht angesehen;
                                  diese gehoeren NICHT eingekauft, sondern geprueft

Vorher immer "python tools/wappen_quality.py --csv" laufen lassen, sonst beschreibt
die Liste den Stand vor der letzten Uebernahme.

  python tools/wappen_einkaufsliste.py            # Probelauf: nur Zusammenfassung
  python tools/wappen_einkaufsliste.py --apply    # Datei schreiben
"""
import io, os, sys, csv, json, argparse

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(HERE, 'wappen_extern_gesucht.md')
GRENZE = 90.0   # dieselbe Schwelle wie in der bisherigen Liste

GRUND = [
    ('offen',  'FM-Vorschlag liegt vor, noch nicht geprueft'),
    ('keine',  'keine FM-Zuordnung'),
    ('extern', 'geprueft: FM taugt nicht (fremder Verein oder anderer Ort)'),
    ('behalt', 'geprueft: unser Wappen ist richtig, nur grob'),
    # FM war die Quelle und ist trotzdem zu klein: das Paket fuehrt den Verein nur in
    # niedriger Aufloesung. Kein Pruefauftrag mehr, sondern ein Einkaufsauftrag.
    ('uebern', 'FM-Logo uebernommen, aber selbst grob'),
    # Wer mehrfach vorgelegt wurde und bei dem WEDER unseres NOCH FM ueberzeugte, ist
    # der klarste Einkaufsfall: beide vorhandenen Bilder sind untauglich.
    ('leer',   'vorgelegt, aber weder unseres noch FM ueberzeugte'),
]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--grenze', type=float, default=GRENZE)
    a = ap.parse_args()

    j = lambda p: json.load(io.open(os.path.join(ROOT, p), encoding='utf-8'))
    m, st = j('tools/_fm_match.json'), j('tools/wappen_fm_uebernommen.json')
    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    gd = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])
    teams, leagues = gd['teams'], gd['leagues']
    eff = {r['id']: float(r['eff'])
           for r in csv.DictReader(io.open(os.path.join(HERE, 'wappen_quality.csv'), encoding='utf-8'))}

    def grund(t):
        if t in st.get('uebernommen', {}):
            return 'uebern'
        if t in st.get('offen_gelassen', {}):
            return 'leer'
        if t in st.get('extern', {}):
            return 'extern'
        if t in st.get('behalten', {}):
            return 'behalt'
        return 'offen' if t in m else 'keine'

    grob = [t for t in teams if eff.get(t, 999) < a.grenze]
    liga = lambda t: leagues.get(teams[t].get('leagueId') or '', {})
    nach_liga = {}
    for t in grob:
        L = liga(t)
        nach_liga.setdefault((L.get('level', 99), L.get('name', 'ohne Liga')), []).append(t)

    zaehl = {k: sum(1 for t in grob if grund(t) == k) for k, _ in GRUND}
    zeilen = ['# Wappen: was noch fehlt', '',
              'Vereine mit effektiv unter %d px ohne HD-Wappen. Gemessen mit `wappen_quality.py`'
              % int(a.grenze),
              '(entlarvt hochskalierte Bilder). Erzeugt von `tools/wappen_einkaufsliste.py`.', '',
              'Gesamt: **%d Vereine**.' % len(grob), '']
    for k, txt in GRUND:
        if zaehl[k]:
            zeilen.append('* %d &ndash; %s' % (zaehl[k], txt))
    zeilen += ['',
               'Quelle: sortitoutsi (nach Liga suchen) oder die Vereinsseite. Neue Datei in',
               '`Wappen/<Verband>/<id>.png` legen, dann `python tools/wappen_intake.py --apply`',
               '(zuschneiden, 240 px, quantisieren) und `python tools/wappen_familie.py --apply`.',
               '']
    txt_von = dict(GRUND)
    for (lv, name), ts in sorted(nach_liga.items()):
        zeilen += ['', '## %s (%d)' % (name, len(ts))]
        for t in sorted(ts, key=lambda x: teams[x]['name']):
            g = grund(t)
            wie = txt_von[g]
            if g == 'leer':
                wie += ' (%dx)' % st['offen_gelassen'][t].get('mal', 1)
            zeilen.append('  %4d px  %-34s %s' % (int(eff.get(t, 0)), teams[t]['name'], wie))

    print('%d Vereine unter %d px' % (len(grob), int(a.grenze)))
    for k, txt in GRUND:
        if zaehl[k]:
            print('   %4d  %s' % (zaehl[k], txt))
    if a.apply:
        io.open(OUT, 'w', encoding='utf-8').write('\n'.join(zeilen) + '\n')
        print('-> %s' % os.path.relpath(OUT, ROOT))
    else:
        print('\nProbelauf - nichts geschrieben. Mit --apply ausfuehren.')


if __name__ == '__main__':
    main()
