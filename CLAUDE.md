# Entwicklungsregeln – Reiseplaner

**App:** Reiseplaner
**Pfad:** /Users/aloisgether/Reiseplaner
**GitHub:** algether-spec/Reiseplaner

---

## Branch-Strategie

- Alle Änderungen werden auf **dev** gepusht — NIEMALS auf **main**
- Push auf **main** NUR wenn der Prompt explizit **"merge to main"** oder **"push to main"** enthält
- Patch-Version bei dev-Commits mit `-dev` Suffix — Beispiel: `v0.1.1-dev`
- Vor jedem Push prüfen: `git branch` — sicherstellen dass **dev** aktiv ist
- Merge zu main: Version ohne `-dev` Suffix, dann `git checkout main && git merge dev && git push && git checkout dev`

## Push-Regeln

- Immer ohne Rückfrage pushen
- Vor jedem Push prüfen ob die Änderungen fehlerfrei sind
- Bei Fehler: **nicht pushen**, erst beheben

## Versionierung & Deployment

Nach jeder Codeänderung automatisch:
1. Patch-Version erhöhen (x.x.N+1) in `config.js`, `service-worker.js` und `version.json`
2. git add (nur geänderte Dateien, kein -A)
3. git commit (auf Deutsch, Format: `typ(bereich): beschreibung + vVersion`)
4. git push origin dev

Keine Rückfrage – direkt ausführen nach jeder Änderung.

## Commit-Nachrichten

- Immer auf **Deutsch**
- Format: `typ(bereich): beschreibung + vVersion`
- Typen: `feat`, `fix`, `refactor`, `test`, `docs`
- Beispiel: `fix(sync): Polling läuft immer als Fallback + v0.1.2-dev`

## Code-Qualität

- Funktionsnamen auf Englisch
- Code einfach und gut lesbar halten
- Kurze Funktionen bevorzugen (max. 20–30 Zeilen)
- Wiederholungen vermeiden (DRY-Prinzip)
- Kommentare nur dort wo nötig
- HTML, CSS und JavaScript sauber trennen

## Qualität und Sicherheit

- Eingaben prüfen
- Leere Einträge verhindern
- Fehler verständlich anzeigen
- Keine Secrets im Frontend speichern
- Löschen nur gezielt ausführen
- Datenverlust vermeiden

## Arbeitsweise

- Arbeite Schritt für Schritt
- Ändere nur, was für die aktuelle Aufgabe nötig ist
- Zerstöre keine bestehenden Funktionen
- Vermeide unnötige Komplett-Umbauten
- Halte die Lösung einfach und robust
- KEINE RÜCKFRAGEN – direkt ausführen

## Merge zu main

1. `git checkout main && git merge dev && git push && git checkout dev`
2. Version ohne `-dev` Suffix vor dem Merge setzen
