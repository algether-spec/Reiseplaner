# Erinnerungen (PWA)

Einfache Offline-fähige Erinnerungen als Progressive Web App.

## Funktionen

- Mehrzeilen-Eingabe
- Offline nutzbar
- Installierbar als App
- Export (Teilen / Zwischenablage)

## Schnellstart

1. App auf beiden Handys als PWA installieren und als App starten (wichtig für die Mikrofonfunktion).
2. Auf beiden denselben Code im Format `AAAA1234` setzen (nicht `HELP0000`).
3. Erinnerungen eingeben und mit `Übernehmen` speichern.
4. Für Abhaken in den Modus `Erledigt` wechseln.

Kurzanleitung komplett:
- `KURZANLEITUNG.md`

## Live

https://DEINNAME.github.io/erinnerungen/

## Checks

```bash
npm run check
```

Enthaelt:
- JS-Syntaxcheck fuer `app.js` und `service-worker.js`
- Smoke-Test mit lokalem HTTP-Server (HTML/Manifest/Service-Worker)

## Supabase (optional)

Setup siehe:
- `supabase/SETUP.md`
- `supabase/schema.sql`
- `config.example.js`

Hinweis:
- Supabase Sync nutzt anonyme Auth + RLS (Zugriff nur mit aktivem Code-Beitritt).
- Fuer Geraetekopplung in der App denselben `Geraete-Code` im Format `AAAA1234` auf beiden Geraeten setzen.
- Code-Versuche werden serverseitig limitiert, um Brute-Force zu erschweren.
