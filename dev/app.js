/* ======================
   APP.JS
   Einstiegspunkt – führt alle Module zusammen und startet die App.
====================== */

modusSetzen(MODUS_ERFASSEN);
if (versionBadge) versionBadge.textContent = "v" + APP_VERSION;
syncDebugAktualisieren();

if (btnMic && !SpeechRecognitionCtor) {
    btnMic.disabled = true;
    btnMic.title = "Spracherkennung wird hier nicht unterstuetzt";
    mikStatusSetzen("Spracherkennung wird in diesem Browser nicht unterstuetzt.");
}

const _hashParams = new URLSearchParams(location.hash.slice(1));
const _joinToken = _hashParams.get("join");
const _inviteDeviceId = _hashParams.get("invite");
const _rawHashCode = _hashParams.get("code");
const _rawQueryCode = new URLSearchParams(location.search).get("code");
const _rawUrlCode = _rawHashCode || _rawQueryCode;
const _normalizedUrlCode = _rawUrlCode ? syncCodeNormalisieren(_rawUrlCode) : "";

const _preExistingCode = syncCodeNormalisieren(
    localStorage.getItem(SYNC_CODE_PERMANENT_KEY) ||
    localStorage.getItem(SYNC_CODE_KEY) || ""
);
const _hatVorherigenCode = istGueltigerSyncCode(_preExistingCode) && !istReservierterSyncCode(_preExistingCode);
const _urlCodeGueltig = istGueltigerSyncCode(_normalizedUrlCode);

const _urlCodeAutoAnwenden = _urlCodeGueltig
    && !istReservierterSyncCode(_normalizedUrlCode)
    && !_hatVorherigenCode
    && !_joinToken
    && !_inviteDeviceId;

if (_urlCodeAutoAnwenden) {
    syncCodePermanentSpeichern(_normalizedUrlCode);
    localStorage.setItem(SYNC_CODE_INSTALL_URL_KEY, _normalizedUrlCode);
}

const _hasQueryToClean = _rawQueryCode || new URLSearchParams(location.search).get("u");
if (_hasQueryToClean) {
    const _cleanUrl = new URL(location.href);
    if (_rawQueryCode && !_urlCodeAutoAnwenden) _cleanUrl.searchParams.delete("code");
    _cleanUrl.searchParams.delete("u");
    history.replaceState(null, "", _cleanUrl.toString());
}

const _initPromise = syncCodeUiEinrichten({
    joinToken: _joinToken,
    legacyInviteDeviceId: _inviteDeviceId
});

if (_urlCodeGueltig && _hatVorherigenCode && _preExistingCode !== _normalizedUrlCode && !_urlCodeAutoAnwenden) {
    const _installUrlCode = syncCodeNormalisieren(localStorage.getItem(SYNC_CODE_INSTALL_URL_KEY) || "");
    if (_installUrlCode !== _normalizedUrlCode) {
        Promise.resolve(_initPromise).then(() => {
            if (syncCodeInput) syncCodeInput.value = _normalizedUrlCode;
            syncBearbeitungsmodusSetzen(true);
            authStatusSetzen(`Geteilter Code: ${_normalizedUrlCode} – Verbinden zum Beitreten.`);
        });
    }
}

if (btnForceUpdate) btnForceUpdate.onclick = () => void updateErzwingen();
autoUpdateEinrichten();

if (supabaseClient) {
    hintergrundSyncStarten();
    void laden().catch(err => {
        console.warn("Initiales Laden fehlgeschlagen:", err);
        syncStatusSetzen("Ladefehler – App neu laden", "offline");
    });
} else {
    syncStatusSetzen("Sync: Lokal", "offline");
    syncDebugAktualisieren();
    datenInListeSchreiben(ladenLokal());
}

if ("serviceWorker" in navigator) {
    // Nach SW-Update Seite neu laden, damit neue JS/CSS aktiv werden.
    navigator.serviceWorker.addEventListener("controllerchange", () => {
        window.location.reload();
    });
    navigator.serviceWorker.register("service-worker.js?v=" + APP_VERSION, { updateViaCache: "none" });
    navigator.serviceWorker.ready.then(reg => {
        const _swCode = localStorage.getItem(SYNC_CODE_PERMANENT_KEY) || localStorage.getItem(SYNC_CODE_KEY);
        if ((_joinToken || _inviteDeviceId || _swCode) && reg.active) {
            reg.active.postMessage({
                type: "SET_INSTALL_CONTEXT",
                joinToken: _joinToken || "",
                inviteDeviceId: _inviteDeviceId || "",
                code: _swCode || ""
            });
        }
    }).catch(() => {});
}

window.addEventListener("load", () => {
    const splash = document.getElementById("splash");
    setTimeout(() => { if (splash) splash.remove(); }, 2600);
    setTimeout(autoResize, 200);
});
