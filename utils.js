/* ======================
   UTILS.JS
   Hilfsfunktionen ohne DOM-Abhängigkeiten.
====================== */

/* --- IDs --------------------------------------------------------- */

function generateItemId() {
    return `item-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* --- Datum-Normalisierung ---------------------------------------- */

function normalizeDateIso(input) {
    if (!input) return "";
    const parsedMs = Date.parse(String(input));
    if (!Number.isFinite(parsedMs)) return "";
    return new Date(parsedMs).toISOString();
}

function extractDateFromItemId(itemId) {
    const match = String(itemId || "").match(/^item-(\d{13})-[a-z0-9]+$/i);
    if (!match) return "";
    const parsedMs = Number(match[1]);
    if (!Number.isFinite(parsedMs)) return "";
    return new Date(parsedMs).toISOString();
}

function formatEntryDate(createdAt) {
    const iso = normalizeDateIso(createdAt);
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        return `${day}.${month}.`;
    } catch {
        return iso.slice(0, 10);
    }
}

function formatDueDate(dueDate) {
    if (!dueDate) return "";
    const parts = String(dueDate).split("-");
    if (parts.length < 3) return dueDate;
    return `${parts[2]}.${parts[1]}.`;
}

function getTodayDateString() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
}

/* --- Netzwerk ---------------------------------------------------- */

function keinNetzwerk() {
    return typeof navigator !== "undefined" && navigator.onLine === false;
}

function istLokalhost() {
    return typeof location !== "undefined"
        && (location.hostname === "localhost" || location.hostname === "127.0.0.1");
}

/* --- Geräte-ID --------------------------------------------------- */

function geraeteIdLaden() {
    const existing = String(localStorage.getItem(DEVICE_ID_KEY) || "").trim();
    if (existing) return existing;
    const created = window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `device-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
}

/* --- Join-Token -------------------------------------------------- */

function joinTokenErzeugen() {
    const raw = window.crypto?.randomUUID
        ? window.crypto.randomUUID().replace(/-/g, "")
        : `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 14)}`;
    return raw.toLowerCase();
}

/* --- Fehler-Formatierung ----------------------------------------- */

function formatSupabaseError(err) {
    const code = String(err?.code || "").trim();
    const message = String(err?.message || "").trim();
    const details = String(err?.details || "").trim();
    const hint = String(err?.hint || "").trim();
    return [code, message, details, hint].filter(Boolean).join(" | ");
}

function syncFehlerHinweis(err) {
    const raw = formatSupabaseError(err);
    const message = raw.toLowerCase();
    if (!message) return "Bitte Verbindung und Supabase-Einstellungen pruefen.";
    if (message.includes("sync_code_rate_limit")) {
        return "Zu viele Code-Versuche. Bitte spaeter erneut probieren.";
    }
    if (message.includes("json parse error") && message.includes("unrecognized token '<'")) {
        return "Cloud-Sync derzeit nicht erreichbar (Netz/CDN). Lokal wird weiter gespeichert.";
    }
    if (message.includes("sync_code_format_invalid")) {
        return "Bitte Code im Format AAAA1234 eingeben.";
    }
    if (message.includes("sync_code_reserved")) {
        return "Code HELP0000 ist reserviert.";
    }
    if (message.includes("sync_code_not_found")) {
        return "Code nicht gefunden. Bitte pruefen.";
    }
    if (message.includes("permission denied") || message.includes("not allowed")) {
        return "Supabase Rechte fehlen (schema.sql erneut ausfuehren).";
    }
    if (message.includes("jwt") || message.includes("auth")) {
        return "Anmeldung fehlgeschlagen. Bitte Seite neu laden.";
    }
    if (message.includes("sync_code_already_exists")) {
        return "Code ist bereits belegt. Bitte anderen Code nutzen.";
    }
    if (message.includes("failed to fetch") || message.includes("network")) {
        return "Netzwerkfehler. Internetverbindung pruefen.";
    }
    return "Sync-Fehler: " + raw.slice(0, 120);
}

/* --- Kurzdarstellung --------------------------------------------- */

function shortUserId(id) {
    if (!id) return "-";
    if (id.length <= 12) return id;
    return id.slice(0, 8) + "..." + id.slice(-4);
}

function formatTimeIso(date) {
    return date.toISOString().replace("T", " ").slice(0, 19) + "Z";
}

/* --- App-Reload -------------------------------------------------- */

function reloadWithCacheBust() {
    const url = new URL(location.href);
    url.searchParams.set("u", String(Date.now()));
    location.replace(url.toString());
}

function waitForControllerChange(timeoutMs = 4500) {
    return new Promise(resolve => {
        let finished = false;
        const done = value => {
            if (finished) return;
            finished = true;
            navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
            clearTimeout(timer);
            resolve(value);
        };
        const onControllerChange = () => done(true);
        const timer = setTimeout(() => done(false), timeoutMs);
        navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    });
}

/* --- Foto-Helpers ----------------------------------------------- */

function isPhotoEntryText(text) {
    return String(text || "").startsWith(IMAGE_ENTRY_PREFIX);
}
