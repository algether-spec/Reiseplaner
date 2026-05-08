claute# Erinnerungen – Logik & Architektur

## Datei-Struktur

| Datei | Aufgabe |
|---|---|
| config.js | Konstanten, APP_VERSION, Keys |
| utils.js | Hilfsfunktionen |
| supabase.js | Supabase-Client, Auth |
| sync.js | Sync-Logik, Rollen, Update |
| ui.js | DOM, Eingabe, Rendering |
| app.js | Einstiegspunkt, alles zusammen |
| service-worker.js | Cache, PWA, Manifest |

---

## Sync-Logik

### Ablauf

- App startet → `laden()` holt Remote-Daten
- Änderungen → `speichern()` → `syncRemoteIfNeeded()`
- Hintergrund-Timer → `refreshFromRemoteIfChanged()` alle paar Sekunden

### Wichtige Flags

- `localDirty` — true wenn lokale Änderungen noch nicht auf Remote
- `remoteSyncInFlight` — verhindert parallele Sync-Aufrufe
- `remoteSyncQueued` — stellt sicher dass kein Sync verloren geht

### Konflikt-Auflösung (`mergeListConflict`)

- Lokale Einträge haben immer Vorrang bei `erledigt`-Status
- Neue remote-exklusive Einträge werden hinzugefügt
- Identifikation über `itemId`

---

## Bekannte Bugs & Fixes

### ✅ Fix: Erledigt-Markierung wird nach Sekunden zurückgesetzt

**Problem:** `mergeListConflict()` hat bei Konflikten den Remote-Stand übernommen und damit den lokalen `erledigt`-Status überschrieben. Der Hintergrund-Sync lief alle paar Sekunden und hat die Markierung immer wieder zurückgesetzt.

**Ursache:** In der alten `mergeListConflict`-Funktion wurden bei gleicher `itemId` die Remote-Daten bevorzugt statt die lokalen.

**Fix in `sync.js`:**

```javascript
function mergeListConflict(localDaten, remoteDaten) {
    const local = normalizeListData(localDaten);
    const remote = normalizeListData(remoteDaten);
    const merged = [];
    const seenById = new Set();

    const remoteById = new Map(remote.map(e => [e.itemId, e]));

    for (const item of local) {
        if (seenById.has(item.itemId)) continue;
        seenById.add(item.itemId);
        const remoteItem = remoteById.get(item.itemId);
        const mergedItem = remoteItem
            ? { ...remoteItem, erledigt: item.erledigt, position: merged.length }
            : { ...item, position: merged.length };
        merged.push(mergedItem);
    }

    for (const item of remote) {
        if (seenById.has(item.itemId)) continue;
        seenById.add(item.itemId);
        merged.push({ ...item, position: merged.length });
    }

    return merged;
}
```

---

## Service Worker / PWA Update

### Warum Updates manchmal nicht ankommen

- SW läuft in eigenem Thread, überlebt Seitenreloads
- Bis zu 4 Cache-Schichten: SW Cache, Browser Cache, HTTP Cache, CDN
- Alter SW kann aktiv bleiben während neuer schon installiert ist

### Update erzwingen (manuell)

Der "Update erzwingen"-Button in der App:

1. Löscht alle Caches
2. Deregistriert den Service Worker
3. Lädt die Seite neu → holt alles frisch vom Server

### SW-Strategie

- `version.json` und `service-worker.js` → immer frisch vom Netz
- Alle anderen Dateien → Cache first, dann Netz
- `manifest.json` → dynamisch mit aktuellem Install-Kontext

---

## Rollen & Geräte

| Rolle | Bedeutung |
|---|---|
| `hauptgeraet` | Erstellt den Sync-Code, kann teilen |
| `gast` | Tritt über Einladungslink bei |

- Rolle wird in Supabase `device_roles` Tabelle gespeichert
- Join-Token läuft nach 30 Tagen ab
- Legacy: `#invite=<device_id>` → wird über `sync_invites` aufgelöst
