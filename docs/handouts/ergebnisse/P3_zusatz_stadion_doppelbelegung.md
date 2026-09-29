# Zusatzaufgabe für die PC-Sitzung: falsch geteilte Stadien prüfen

**Auftrag des Nutzers (28.09.2026, mobil):** Zusätzlich zu P3 prüfen, ob Vereine **fälschlicherweise dasselbe
Stadion** zugeordnet bekommen haben.

**Anlass:** Der Nutzer will die **Mannschaftsstärke aus der Stadiongröße ableiten**. Dabei ist aufgefallen, dass
**TSG Kaiserslautern** und **VfR Kaiserslautern** das **Fritz-Walter-Stadion** eingetragen haben, genau wie der
1. FC Kaiserslautern. Bei einer Ableitung über die Kapazität bekämen zwei Amateurvereine damit die Kapazität eines
Bundesliga-Stadions, rund 50.000 Plätze.

## Vermutete Ursache (Hypothese, nicht geprüft)
Wahrscheinlich hat der europlan-Abgleich über den Ort gematcht statt über den Verein. Darauf deutet Lehre 3 aus
00_KONTEXT hin: gleicher Ort heißt nicht gleicher Verein. Dazu passt P3 als Spiegelbild. Dort fehlen Altona 93,
VFC Plauen und ETB SW Essen trotz bekannter Stadien. Das spricht dafür, dass die Abgleichlogik in beide Richtungen
danebenliegt: Manche Vereine bekommen ein fremdes Stadion, andere gar keins.
Ebenfalls in Kaiserslautern: **1. FCK-Portugiese (1fckportugiese_415)** hat laut P3 gar kein Stadion. Den bitte in
derselben Prüfung ansehen.

## Vorschlag für die Prüfung
1. Alle Vereine nach normalisiertem `stadName` + `ort` gruppieren und jede Gruppe mit mehr als einem Verein ausgeben.
2. Jede Gruppe einordnen:
   - **plausibel geteilt:** Die Stadt- oder Vereinsanlage wird nachweislich von mehreren Vereinen genutzt, oder die
     Reserve (II) spielt im Stadion der ersten Mannschaft, und das ist belegt.
   - **verdächtig:** Ein Verein ab Ebene 4 teilt sich ein Stadion über ~10.000 Plätzen mit einem Profiverein.
     Genau dieses Muster zeigt der Fall Kaiserslautern.
   - **unklar:** Einen Beleg anfordern, notfalls als Handout-Portion für das Handy.
3. Verdächtige Zuordnungen entfernen und nicht durch Schätzungen ersetzen. Ohne Beleg bleibt das Feld leer.
4. Die Ursache im Abgleich-Skript suchen und beheben, bevor die Stärke aus der Kapazität abgeleitet wird. Sonst kommen
   die Fehler beim nächsten Lauf zurück.

## Bezug zur Stärke-Ableitung (Hinweis, nicht entschieden)
- Kapazität ist baulich, nicht sportlich. Große Traditionsstadien tiefer Klassen, etwa die Uhlenkrug mit 9950 Plätzen
  in der Oberliga, blähen die Stärke auch bei korrekter Zuordnung auf. Ob das gewollt ist, entscheidest du.
- Für dieselbe Anlage gibt es teils widersprüchliche Kapazitäten, zum Beispiel beim Vogtlandstadion 10.500 gegenüber
  5.000, siehe `P3_stadien_bericht.md`. Vor der Ableitung also festlegen, welche Zahl gilt.
- Regel 3 („emergent vor gescriptet“) spricht dafür, die Kapazität höchstens als einen Faktor unter mehreren zu
  nutzen. Das ist ein Hinweis, die Entscheidung liegt beim Nutzer.
