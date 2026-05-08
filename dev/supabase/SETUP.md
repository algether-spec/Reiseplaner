# Supabase Setup

## 1) Tabelle anlegen
1. Supabase Projekt oeffnen.
2. SQL Editor oeffnen.
3. Inhalt aus `supabase/schema.sql` ausfuehren.

## 2) Auth aktivieren
1. In Supabase: `Authentication -> Providers -> Anonymous`.
2. Anonymous Sign-Ins aktivieren.

## 3) App konfigurieren
1. `config.example.js` nach `config.js` kopieren (oder `config.js` direkt bearbeiten).
2. `supabaseUrl` und `supabaseAnonKey` eintragen.

## 4) Verhalten
- Wenn Supabase konfiguriert ist: Daten werden lokal gespeichert und zusaetzlich mit Supabase synchronisiert.
- Wenn Supabase nicht erreichbar ist: App bleibt lokal nutzbar (Fallback auf `localStorage`).
- Sync laeuft ueber einen geraeteuebergreifenden Code im Format `AAAA1234` (`Geraete-Code` in der App).
- Auf beiden Handys denselben Code eintragen, dann teilen beide dieselbe Liste.
- `HELP0000` ist reserviert (Anleitungs-Code) und kann nicht als Geraete-Code genutzt werden.

## 5) Hinweis
- Die Tabelle ist mit Row Level Security (RLS) geschuetzt.
- Zugriff auf Daten erfolgt nur noch nach Code-Beitritt ueber die SQL-Funktion `use_sync_code`.
- Direktzugriff auf `sync_codes` ist fuer App-Clients gesperrt.
- Zusaetzlich speichert `sync_codes` dauerhaft, welche Codes schon genutzt wurden (`created_at`, `last_used_at`).
- Dadurch kann `Neu` belegte Codes zuverlaessiger erkennen, auch wenn eine Liste gerade leer ist.
- Falsche Code-Versuche werden serverseitig geloggt und in Zeitfenstern limitiert.

## 6) Fehlerbild: "erst Verbunden, dann Offline (lokal)"
- Ursache ist meist fehlende DB-Berechtigung fuer `anon`/`authenticated` (insb. Sequence bei Insert).
- Loesung: `supabase/schema.sql` im SQL Editor erneut komplett ausfuehren.
- Danach App auf beiden Geraeten neu laden und erneut mit gleichem Code im Format `AAAA1234` verbinden.

## 7) Fehlerbild: `column reminder_items.item_id does not exist`
- Das Schema ist noch nicht auf dem aktuellen Stand (neuer stabiler Eintrag-Sync mit `item_id`).
- Loesung: `supabase/schema.sql` erneut komplett ausfuehren, danach App auf beiden Geraeten neu laden.
