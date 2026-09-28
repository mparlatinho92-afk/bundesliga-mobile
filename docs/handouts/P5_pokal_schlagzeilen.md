# P5 – Pokal-Schlagzeilen neu schreiben (Textarbeit, ideal für kurze Fenster)

**Anhängen:** `00_KONTEXT.md` + diese Datei + `P5_FABLE-GRUNDREGELN.md` + `P5_paket8_SPEC.md` +
`P5_REPORTS_POKAL_ist.json`.
**Ergebnis:** `P5_REPORTS_POKAL_neu.json`, gleiche Schlüssel und Struktur wie die Ist-Datei.

## Warum
Die 174 Pokal-Schlagzeilen (7 Pools) hat damals **Opus als Erstbefüllung** geschrieben, nicht der
Textautor. Die SPEC sieht ausdrücklich vor, dass sie erweitert oder ersetzt werden können. Alle anderen
Textpakete (Spieltag, Vorschau, Pressestimmen, Rückblick, Serien, Chronik) kommen vom Textautor, und
der Unterschied im Ton fällt auf.

## Auftrag
- **Die Grundregeln gelten vollständig.** Zuerst lesen, dann schreiben.
- Pools: `pokalsensation` 30, alle anderen je 24. Ziel: **mindestens gleich viele, gern bis 40 je Pool**.
- Platzhalter (Slots) exakt wie in der SPEC. Keine neuen Slots erfinden, der Assembler kennt nur die
  vorhandenen.
- Der Pokal bespielt alle Ebenen, vom Bundesligisten bis zum Achtligisten. Die Schlagzeilen dürfen
  keine Liga voraussetzen, wenn die SPEC sie nicht als Slot liefert.
- Die Pools bleiben reine Textlisten (Arrays aus Strings). Übernommene alte Zeilen zusätzlich unter
  `"_uebernommen": { "<pool>": [...] }` auflisten, damit der Unterschied messbar bleibt.
- Besonders beachten (SPEC §2): `{score}` trägt den Zusatz „n.V.“/„i.E.“ schon, und bei
  `{sieger}`/`{verlierer}` kein Heimrecht behaupten.

## Selbstprüfung vor Abgabe (SPEC §8)
Anzahl je Pool, keine Dubletten, nur erlaubte Slots (`{sieger} {verlierer} {score} {tore} {heim} {gast}`),
außerhalb von `pokalsensation` keine Wörter „Klasse“, „Amateur“ oder „Liga“. Die Zählung ans Ende der Antwort.
