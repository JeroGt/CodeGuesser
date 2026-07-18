# DESIGN.md

## Theme
Dark only. Szene: Handy auf der Couch am Abend, gedämpftes Licht, Daumenbedienung. Dunkles indigo-getöntes Interface, warme Koralle als Spannungs-Akzent (Duell-Energie), Feedback-Farben semantisch.

## Color (OKLCH)
- --bg: oklch(0.16 0.018 285) Grundfläche
- --bg-raised: oklch(0.205 0.022 285) Keypad-Zone, Strips
- --surface: oklch(0.25 0.024 285) Tasten, leere Tiles
- --surface-hi: oklch(0.30 0.024 285) gedrückte Tasten, Hover
- --line: oklch(0.34 0.02 285) Konturen
- --text: oklch(0.94 0.008 285)
- --text-dim: oklch(0.66 0.014 285)
- --accent: oklch(0.71 0.17 38) Koralle: Primäraktionen, aktiver Spieler, Logo
- --accent-ink: oklch(0.2 0.05 38) Text auf Akzent
- --hit: oklch(0.68 0.145 158) Ziffer richtig platziert
- --near: oklch(0.78 0.13 82) Ziffer enthalten, falscher Platz
- --miss: oklch(0.30 0.014 285) Ziffer nicht im Code
- --p2: oklch(0.68 0.12 255) Gegner-/Spieler-2-Markierung

Strategie: Restrained mit einem Committed-Moment (Sieg-Overlay in Akzentfläche).

## Typography
- UI: system-ui Stack, eine Familie, Gewichte 400/600/800
- Ziffern: ui-monospace Stack, font-variant-numeric: tabular-nums
- Skala 1.2, fixe rem-Stufen: 0.8125 / 1 / 1.2 / 1.44 / 2.1

## Components
- Tiles: 999er-Radius nein, 22% Radius (rund, spielerisch, kein Kreis); Flip-Reveal 500ms ease-out-quint, Stagger 110ms
- Keypad: 3-spaltig, Tasten min-height 56px, Press-State scale(0.94) + hellere Fläche, Digit-Hints färben Tasten nach Wissen (hit/near/miss)
- Buttons: voll gerundet (pill) für Primär, 14px Radius sekundär
- Kein Modal außer End-Overlay (Vollbild-Zustand, kein Dialog)

## Motion
- 150–250ms Standard, Reveal-Flip 500ms, Shake bei ungültiger Eingabe 300ms
- prefers-reduced-motion: Flips durch Fades ersetzen, Konfetti aus
