# CodeDuell 🔢

Mobile-first Webapp: Knack den 4-stelligen Geheimcode deines Gegners, bevor er deinen knackt. Wordle-Feedback (richtig platziert / enthalten / nicht im Code), gespielt gegen einen Bot oder zu zweit an einem Handy.

## Spielen

Einfach `index.html` in einem Browser öffnen. Kein Build, keine Abhängigkeiten, kein Server nötig: reines HTML, CSS und JavaScript.

- **Gegen den Bot**: drei Schwierigkeitsgrade. Der Bot nutzt Kandidaten-Eliminierung; auf „Schwer" zusätzlich eine Minimax-Strategie.
- **Online mit Einladungscode**: Ein Spieler erstellt ein Spiel und teilt den 5-stelligen Code (oder den Einladungslink), der andere tritt auf seinem eigenen Handy bei. Läuft über WebRTC (PeerJS): Die Geräte verbinden sich direkt, nur der Verbindungsaufbau nutzt den kostenlosen öffentlichen PeerJS-Server. Kein eigener Server, keine Accounts. Der Geheimcode verlässt das eigene Gerät erst nach Spielende (Aufdeckung).
- **Zu zweit am Handy**: Pass-and-Play. Beide geben nacheinander (mit Übergabe-Screen) ihren Geheimcode ein, dann wird abwechselnd geraten.
- Wer zuerst knackt, gewinnt. Der zweite Spieler bekommt einen letzten Ausgleichsversuch, damit der Startspieler keinen Vorteil hat. Beide im selben Durchgang: Unentschieden.
- Option: doppelte Ziffern erlauben (z. B. 3381).

## Kostenlos hosten

Das Projekt ist eine rein statische Seite, jeder dieser Anbieter hostet sie dauerhaft kostenlos:

### Empfehlung: Vercel

1. Kostenloses Konto auf [vercel.com](https://vercel.com) (Login mit GitHub).
2. Projekt als GitHub-Repository hochladen.
3. Auf Vercel „Add New → Project" wählen, das Repository importieren, keine Einstellungen nötig, „Deploy" klicken.
4. Fertig: Du bekommst eine URL wie `codeduell.vercel.app`. Jeder Git-Push deployt automatisch neu.

Ohne GitHub geht es auch per CLI: `npx vercel` im Projektordner ausführen.

### Alternative: Netlify Drop

Am schnellsten ohne Git: [app.netlify.com/drop](https://app.netlify.com/drop) öffnen und den Projektordner per Drag-and-drop hochladen. Sofort online.

### Alternative: GitHub Pages

Repository auf GitHub anlegen, unter Settings → Pages den Branch `main` als Quelle wählen. URL: `benutzername.github.io/repo-name`.

Alle drei sind für dieses Projekt gleichwertig (statische Dateien, kein Backend). Vercel und Netlify geben dir die schöneren URLs und automatische Deploys; nimm, was dir sympathischer ist.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Markup aller Screens (Start, Setup, Codeeingabe, Spiel, Ergebnis) |
| `style.css` | Design (dunkles Theme, Tiles, Keypad, Animationen) |
| `game.js` | Reine Spiellogik: Codes, Validierung, Wordle-Feedback |
| `bot.js` | Bot-KI: Kandidaten-Eliminierung, Minimax auf „Schwer" |
| `app.js` | UI, Spielablauf, Screens, Online-Modus, Konfetti |
| `sound.js` | Sound-Engine: Web-Audio-Synthese, keine Sound-Dateien, abschaltbar |
| `peerjs.min.js` | PeerJS (WebRTC) für den Online-Modus, lokal gebündelt |
| `test.js` | Logik-Tests: `node test.js` |

## Hinweise zum Online-Modus

- Beide Spieler müssen die Seite über **HTTPS** geöffnet haben (bei Vercel, Netlify und GitHub Pages automatisch der Fall). Lokal per Doppelklick auf `index.html` funktioniert der Online-Modus nicht.
- Die Verbindung ist ein direkter Peer-to-Peer-Kanal. In seltenen Fällen (sehr restriktive Firmen- oder Mobilfunknetze) kann der Verbindungsaufbau scheitern; dann hilft meist ein Wechsel ins WLAN.
- Der „Code teilen"-Button verschickt einen Link mit `?join=CODE`, der beim Gegner direkt den Beitritts-Screen mit ausgefülltem Code öffnet.

## Tests

```bash
node test.js
```
