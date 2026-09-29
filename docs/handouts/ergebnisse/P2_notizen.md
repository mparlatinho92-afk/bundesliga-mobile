# P2 – Notizen für die PC-Sitzung

Stand: 28.09.2026, nach Portion 1–4 (Fälle 1–100 von 152)

## 1. Zusätzliches Feld `hinweis`
Alle Ergebnisdateien haben neben den fünf vorgegebenen Feldern ein optionales Feld `hinweis`. Wo nichts zu sagen ist, steht `null`. Wenn der Einbau das Feld nicht braucht, kann er es ignorieren.

## 2. Nachfolger und Ausgliederung (Entscheidung des Nutzers)
Der Nutzer sieht Neugründungen nach Auflösung (Gütersloh, Weiden) als **Ansichtssache**. Ob man deren IDs zusammenführt, ist Geschmack. Dasselbe gilt für Ausgliederungen: Wenn die Fußballabteilung eines Gesamtvereins als eigener e. V. ausgegliedert wird, ist das technisch eine neue Identität. Trotzdem gibt es keinen Grund, z. B. den 1. FC Heidenheim nicht mit dem Heidenheimer SB zu verbinden.

**Offene Frage an die PC-Sitzung:** Behandelt das Projekt solche Fälle schon irgendwo einheitlich (Stammbaum, Steckbrief, Fusionslogik)? Das sollte geprüft werden, bevor die Urteile eingebaut werden.

Ab Portion 4 gibt es dafür zwei neue Urteilswerte, jeweils mit `jahr` = Jahr des Bruchs:

| Urteil | Bedeutung |
|---|---|
| `nachfolger` | Verein aufgelöst oder insolvent, Neugründung als Nachfolger. Dazu gehört auch die Wiedergründung eines Vorkriegsvereins nach dem Ende der BSG. |
| `ausgliederung` | Die Fußballabteilung löst sich aus dem Gesamtverein und wird ein eigener Verein. |

**Frühere Portionen, die umgestellt werden sollten** (dort noch `offen` oder `fusion`):

| Datei | quelle | jetziges Urteil | passend wäre |
|---|---|---|---|
| 1-25 | SpVgg Weiden | fusion 2012 | nachfolger 2010 (danach Beitritt 2012) |
| 26-50 | 1.FC Markkleeberg | offen | nachfolger 1994 |
| 26-50 | Chemie Markkleeberg | offen | nachfolger 1994 |
| 26-50 | Arminia Gütersloh | offen | nachfolger 2000 (vorher Fusion 1978) |
| 51-75 | Einheit Greifswald II | offen | offen lassen: Der Artikel führt den GSC auf KKW zurück, nicht auf Einheit |
| 51-75 | Einheit Auerbach/V | offen | eher nachfolger 1991 (VfB „neugegründet“) |

Ebenfalls Ausgliederungen, bisher als `fusion` markiert, weil dabei zwei Vereine zusammenkamen: ESV Ingolstadt → FC Ingolstadt 04 (2004), SV Mettlach → SG Mettlach/Merzig (2021).

## 3. Korrektur Portion 3
**Empor Brandenburger Tor → FC Brandenburg 03** (dort `offen`): In Portion 4 hat sich gezeigt, dass der FC Brandenburg 03 ein Charlottenburger Verein ist, 1903 als BSC Deutschland gegründet. Die SG Empor Brandenburger Tor 1952 besteht in Friedrichshain weiter. Das Urteil sollte **getrennt** lauten.
Beleg: https://en.wikipedia.org/wiki/FC_Brandenburg_03_Berlin

## 4. Häufige Muster
- **Nur der Ort passt:** MSV Düsseldorf, FC Türkiye Wilhelmsburg, Spandauer Kickers. Die Maschine hat Vereine zugeordnet, die erst Jahrzehnte nach den Quellsaisons gegründet wurden. Eine einfache Vorprüfung „Gründungsjahr > letzte Quellsaison“ würde solche Fälle automatisch aussortieren.
- **Gleicher Ortsname, anderer Ort:** Neustadt (Dosse) statt Orla, Roßbach/Wied statt Wolfstein.
- **Mehrere BSG im selben Ort:** Pirna (Lok ≠ Einheit/Wismut), Dessau (Lok/ESV ≠ Motor), Wolfen ≠ Bitterfeld, Greifswald (Einheit/Lok ≠ KKW). Die Zuordnung „irgendein DDR-Verein im Ort → heutiger Verein“ ist hier regelmäßig falsch.
- **hist-ID-Kandidaten** (echter Verein, im Spiel fehlend): 1. FC Passau, 1. FC Neukölln (heute Novi Pazar), Schwarz-Rot Neustadt (Dosse), FC Grün-Weiß Wolfen, BSC Kickers 1900, FV Brandenburg-Lichterfelde (Linie zu Viktoria 89).
