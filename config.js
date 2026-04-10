window.APP_CONFIG = {
  supabaseUrl: "https://eixhupjefdpwyvnsqejf.supabase.co",
  supabaseAnonKey: "sb_publishable_a9RPkdLen0OGWL2CK5zKAg_dm_saG8Q"
};

const APP_CONFIG = window.APP_CONFIG || {};

/* ======================
   KONSTANTEN
====================== */

const APP_VERSION = "0.1.0";
const STORAGE_KEY = "reiseplaner";
const SUPABASE_TABLE = "reminder_items";
const SYNC_CODE_KEY = "reiseplaner-sync-code";
// Wird NUR bei bewusstem Code-Setzen (URL-Link, Nutzer-Aktion) gespeichert.
// Auto-generierte Codes überschreiben diesen Key NIEMALS.
const SYNC_CODE_PERMANENT_KEY = "reiseplaner-sync-code-permanent";
// Speichert den URL-Code der beim ersten Install gesetzt wurde.
const SYNC_CODE_INSTALL_URL_KEY = "reiseplaner-install-url-code";
const DEVICE_ID_KEY = "reiseplaner-device-id";

const IMAGE_ENTRY_PREFIX = "__IMG__:";
const EXPORT_EMAIL = "al.gether@gmail.com";

const SYNC_CODE_LENGTH = 8;
const RESERVED_SYNC_CODE = "HELP0000";

const BACKGROUND_SYNC_INTERVAL_MS = 4000;
const AUTO_UPDATE_CHECK_INTERVAL_MS = 300000; // 5 Minuten
const MIC_SESSION_MS = 30000;

const MODUS_ERFASSEN = "erfassen";
const MODUS_ERLEDIGT = "erledigt";

const debugEnabled = new URLSearchParams(location.search).get("debug") === "1";
