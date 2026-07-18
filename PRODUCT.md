# CodeDuell

## Product Purpose
Mobile-first Browser-Spiel: Zwei Parteien wählen je einen geheimen 4-stelligen Zahlencode und raten abwechselnd den Code des Gegners (Bulls-&-Cows-Prinzip mit Wordle-Feedback: Ziffer richtig platziert = Treffer, Ziffer enthalten = nah dran, sonst daneben). Wer zuerst knackt, gewinnt; der Startspieler-Vorteil wird durch einen letzten Ausgleichszug neutralisiert.

## Users
Gelegenheitsspieler am Smartphone: abends auf der Couch, in der Bahn, zu zweit am Tisch. Einhandbedienung mit dem Daumen, Sessions von 2 bis 5 Minuten. Keine Accounts, keine Installation, Link öffnen und spielen.

## Register
product (Spiel-UI: die Oberfläche dient dem Spielfluss, Delight in Momenten wie Reveal und Sieg)

## Modes
- Gegen den Bot (Leicht / Normal / Schwer, Bot mit Kandidaten-Eliminierung)
- Zu zweit an einem Gerät (Pass-and-Play, Geheimcode-Eingabe mit Übergabe-Screen)

## Tone
Verspielt, aber präzise. Deutsch, direkte Ansprache ("Du bist dran"). Kurze Sätze, kein Erklär-Overload.

## Anti-references
- Wordle-Klon-Optik (graues Raster auf Schwarz, exakt Grün/Gelb kopiert)
- Casual-Game-Kitsch: Glitzer-Gradients, Comic-Buttons, Soundgewitter
- Desktop-first Layouts, die auf dem Handy zusammengequetscht wirken

## Strategic principles
- Race-Spannung sichtbar machen: beide Boards immer im Blick (Gegner kompakt als Strip)
- Feedback muss ohne Anleitung verstanden werden: Farben + Legende beim ersten Spiel
- Null Backend: komplett statisch, offline-fähig nach erstem Laden, kostenlos hostbar
