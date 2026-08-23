#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""wappen_fm_sperre_backfill.py - holt die Ablehnungen der frueheren Runden nach.

DAS PROBLEM
Seit 23.08.2026 kennt die Pruefseite drei Zustaende: FM nehmen, unseres behalten,
oder "FM ist besser, gehoert aber einem anderen Verein". Der dritte sperrt das PAAR
(Verein x FM-ID), damit der naechste Abgleich den zweitbesten Kandidaten findet.

Die Runden DAVOR kannten diesen Zustand nicht. Sie haben nur festgehalten, DASS ein
Verein abgelehnt wurde ("behalten" / "extern"), nicht GEGEN WELCHES LOGO. Deshalb
schlug der Abgleich denselben abgelehnten Partner munter wieder vor - die Ablehnung
war nirgends hinterlegt, nur der Verein galt als "erledigt".

DIE REKONSTRUKTION
Beides liegt in der Git-Historie:
  * tools/wappen_fm_uebernommen.json - wann welcher Verein nach "behalten"/"extern" kam
  * tools/_fm_match.json             - welche FM-ID er zu genau diesem Zeitpunkt hatte
Fuer jeden Verein wird der Commit gesucht, in dem er zuerst abgelehnt erscheint, und
dazu der Stand von _fm_match.json AUS DEMSELBEN Commit gelesen. Das Paar von damals
ist die Ablehnung von damals.

Warum nicht einfach alle je zugeordneten IDs sperren: ein Verein kann zwischen zwei
Runden den Partner gewechselt haben (das Rematch vom 23.08. hat 18 Paare umgehaengt).
Dann waere die frueher zugeordnete ID nie abgelehnt worden, sondern nur ersetzt -
sie zu sperren wuerde einen moeglicherweise richtigen Treffer wegwerfen.

NUR "extern", NICHT "behalten" - der Unterschied ist der ganze Punkt
"extern" heisst: FM zeigt einen FREMDEN Verein. Das Paar ist falsch, ein anderer
Kandidat kann richtig sein -> sperren und weitersuchen.
"behalten" heisst: richtiger Verein, aber unser Bild ist besser. Das Paar ist RICHTIG,
der Nutzer wollte nur das Bild nicht. Wuerde man es sperren, muesste der Abgleich einen
anderen Verein vorschlagen - und der waere zwangslaeufig falsch. Ein erster Entwurf
sperrte beides und haette u.a. "Bremer SV" -> "Bremer SV" und "Ahrensburger TSV" ->
"Ahrensburger TSV" weggeworfen: 108 Vereine, ganz ueberwiegend korrekte Paare.
Dass "behalten" nicht wieder vorgelegt wird, erledigt ohnehin schon --offen.

WARUM DARAUS KEINE AUTOMATISCHE SPERRE WIRD
Ein erster Entwurf hat die rekonstruierten Paare direkt gesperrt. Das ging schief:
"extern" heisst nur "nimm dieses Logo nicht", nicht "das Paar ist falsch". Beide
Bedeutungen stecken darin, und die Namen trennen sie nicht:

  Wuerzburger Kickers -> "Wuerzburger Kickers"  richtiger Verein, Bild unbrauchbar
  BSG Wismut Gera     -> "Wismut Gera"          richtiger Verein, veraltetes Wappen
  FC Anker Wismar     -> "Wismar"               richtiger Verein
  FV Bonn-Endenich 08 -> "Bonn"                 FREMDER Verein - hier ist die Sperre richtig

Gesperrt wurde im Entwurf auch die erste Gruppe; der Abgleich suchte dann einen anderen
Partner und kreuzte Wuerzburger Kickers mit dem FV 04. Ein gekreuztes Paar ist schlimmer
als gar keines. Ein Namensfilter half nicht: er rettet die Kickers, wirft aber Bonn-Endenich
in denselben Topf.

Deshalb erzeugt das Werkzeug eine VORLAGE, keine Sperre: die Liste der alten Ablehnungen,
die heute noch dasselbe Paar tragen, geht als Galerie in wappen_fm_review.py. Dort
entscheidet der Blick aufs Bild, was davon "FM gehoert einem anderen Verein" ist.

  python tools/wappen_fm_sperre_backfill.py            # Probelauf: nur Bericht
  python tools/wappen_fm_sperre_backfill.py --apply    # in wappen_fm_sperre.json schreiben
"""
import io, os, sys, csv, json, argparse, subprocess

sys.stdout.reconfigure(encoding='utf-8')

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
SPERRE = os.path.join(HERE, 'wappen_fm_sperre.json')
STAND = 'tools/wappen_fm_uebernommen.json'
MATCH = 'tools/_fm_match.json'


def git(*args):
    return subprocess.run(['git'] + list(args), cwd=ROOT, capture_output=True,
                          text=True, encoding='utf-8', errors='replace').stdout


def zeigen(commit, pfad):
    r = subprocess.run(['git', 'show', '%s:%s' % (commit, pfad)], cwd=ROOT,
                       capture_output=True, text=True, encoding='utf-8', errors='replace')
    return json.loads(r.stdout) if r.returncode == 0 and r.stdout.strip() else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true')
    ap.add_argument('--grenze', type=float, default=90.0,
                    help='ab welcher effektiven Aufloesung ein Wappen als grob gilt')
    ap.add_argument('--auch-behalten', dest='auch_behalten', action='store_true',
                    help='auch "behalten" sperren. NICHT benutzen, ausser man will das '
                         'Paar wirklich aufloesen: "behalten" bezeichnet den RICHTIGEN '
                         'Verein, nur mit schlechterem Bild.')
    a = ap.parse_args()

    # Aelteste zuerst, damit "zuerst abgelehnt" wirklich der erste Treffer ist.
    commits = [c for c in git('log', '--format=%H', '--reverse', '--', STAND).split() if c]
    if not commits:
        print('keine Historie zu %s gefunden' % STAND)
        return 1
    print('%d Commits mit Entscheidungsstand' % len(commits))

    gd = io.open(os.path.join(ROOT, 'game_data.js'), encoding='utf-8').read()
    teams = json.loads(gd[gd.index('{'):gd.rindex('}') + 1])['teams']
    ger = json.load(io.open(os.path.join(ROOT, 'tools/_fm_ger.json'), encoding='utf-8'))
    jetzt = json.load(io.open(os.path.join(ROOT, MATCH), encoding='utf-8'))
    heute = json.load(io.open(os.path.join(ROOT, STAND), encoding='utf-8'))
    # Uebernommene nie sperren - dort hat der Nutzer das FM-Logo ja gewaehlt.
    tabu = set(heute.get('uebernommen', {}))

    gesehen, treffer, ohne = set(), {}, []
    for c in commits:
        stand = zeigen(c, STAND)
        if not stand:
            continue
        abgelehnt = set(stand.get('extern', {}))
        if a.auch_behalten:
            abgelehnt |= set(stand.get('behalten', {}))
        neu = abgelehnt - gesehen
        gesehen |= abgelehnt
        if not neu:
            continue
        # Der Stand von _fm_match.json AUS DEMSELBEN Commit - nicht der heutige.
        m = zeigen(c, MATCH) or {}
        n_ok = 0
        for t in neu:
            if t in tabu:
                continue
            fid = m.get(t)
            if fid is None:
                ohne.append(t)
                continue
            treffer.setdefault(t, set()).add(str(fid))
            n_ok += 1
        print('  %s  %3d neu abgelehnt, %3d davon mit Paar von damals'
              % (c[:8], len(neu), n_ok))

    nm = lambda t: teams.get(t, {}).get('name', t)
    print('\n%d Vereine mit rekonstruierter Ablehnung, %d ohne Paar von damals'
          % (len(treffer), len(ohne)))

    # Interessant ist, wo die Sperre etwas AENDERT: der Verein haengt heute noch an
    # genau der ID, die er damals abgelehnt hat. Dort schlaegt der Abgleich denselben
    # Fehler seit Runden wieder vor.
    haengt = {t: v for t, v in treffer.items() if str(jetzt.get(t, '')) in v}
    print('%d davon tragen HEUTE noch dieselbe abgelehnte ID:' % len(haengt))
    for t in sorted(haengt, key=nm)[:25]:
        print('   %-34s -> %s' % (nm(t)[:34], ger.get(str(jetzt[t]), '?')))
    if len(haengt) > 25:
        print('   ... und %d weitere' % (len(haengt) - 25))

    # Vorgelegt wird nur, wo es sich lohnt: das Wappen ist noch grob UND das Paar von
    # damals steht heute unveraendert da. Wo der Abgleich inzwischen einen anderen
    # Partner gefunden hat, ist die alte Ablehnung ohnehin ueberholt.
    eff = {}
    pq = os.path.join(HERE, 'wappen_quality.csv')
    if os.path.exists(pq):
        eff = {r['id']: float(r['eff']) for r in csv.DictReader(io.open(pq, encoding='utf-8'))}
    vorlage = [t for t in haengt if eff.get(t, 999) < a.grenze]
    print('%d davon tragen ausserdem noch ein grobes Wappen - das ist die Vorlage.'
          % len(vorlage))
    if not a.apply:
        print('\nProbelauf - nichts geschrieben. Mit --apply ausfuehren.')
        return 0
    json.dump([{'id': t, 'name': nm(t)} for t in sorted(vorlage, key=nm)],
              io.open(os.path.join(HERE, '_fm_backfill_ids.json'), 'w', encoding='utf-8'),
              ensure_ascii=False, indent=1)
    print('-> tools/_fm_backfill_ids.json')
    print('weiter mit: python tools/wappen_fm_review.py --ids tools/_fm_backfill_ids.json')
    return 0


if __name__ == '__main__':
    sys.exit(main())
