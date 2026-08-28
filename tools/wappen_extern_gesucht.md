# Wappen: was noch fehlt

Vereine mit effektiv unter 90 px ohne HD-Wappen. Gemessen mit `wappen_quality.py`
(entlarvt hochskalierte Bilder). Erzeugt von `tools/wappen_einkaufsliste.py`.

Gesamt: **5 Vereine**.

* 2 &ndash; keine FM-Zuordnung
* 1 &ndash; geprueft: FM taugt nicht (fremder Verein oder anderer Ort)
* 2 &ndash; geprueft: unser Wappen ist richtig, nur grob

Quelle: sortitoutsi (nach Liga suchen) oder die Vereinsseite. Neue Datei in
`Wappen/<Verband>/<id>.png` legen, dann `python tools/wappen_intake.py --apply`
(zuschneiden, 240 px, quantisieren) und `python tools/wappen_familie.py --apply`.


## Landesliga Niederrhein Gruppe 2 (1)
    64 px  SV Scherpenberg                    geprueft: unser Wappen ist richtig, nur grob

## Verbandsliga Hessen Nord (1)
    64 px  SSV Sand                           geprueft: unser Wappen ist richtig, nur grob

## Verbandsliga Saarland Süd-West (1)
    64 px  SG Perl-Besch                      keine FM-Zuordnung

## Bezirksliga Westpfalz (2)
    64 px  TSG 1904 Trippstadt                keine FM-Zuordnung
    64 px  VB Zweibrücken                     geprueft: FM taugt nicht (fremder Verein oder anderer Ort)
