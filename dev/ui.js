/* ======================
   UI.JS
   DOM-Elemente, Benutzeroberfläche, Eingabe, Sprache, Foto, Modus.
====================== */

/* --- DOM-Elemente ----------------------------------------------- */

const liste = document.getElementById("liste");

const btnErfassen    = document.getElementById("btnErfassen");
const btnErledigt    = document.getElementById("btnErledigt");
const btnExport      = document.getElementById("btnExport");
const btnForceUpdate = document.getElementById("btn-force-update");
const syncCodeCompact    = document.getElementById("sync-code-compact");
const btnSyncCodeDisplay = document.getElementById("btn-sync-code-display");
const btnSyncCodeShare   = document.getElementById("btn-sync-code-share");
const btnSyncConnect     = document.getElementById("btn-sync-connect");
const btnSyncCodeChange  = document.getElementById("btn-sync-code-change");
const versionBadge   = document.getElementById("version-badge");
const syncStatus     = document.getElementById("sync-status");
const syncDebug      = document.getElementById("sync-debug");
const authBar        = document.getElementById("auth-bar");
const syncCodeInput  = document.getElementById("sync-code");
const btnSyncApply   = document.getElementById("btn-sync-apply");
const btnSyncCancel  = document.getElementById("btn-sync-cancel");
const authStatus     = document.getElementById("auth-status");

const multiInput       = document.getElementById("multi-line-input");
const multiAdd         = document.getElementById("add-all-button");
const btnPhotoOcr      = document.getElementById("btn-photo-ocr");
const photoOcrInput    = document.getElementById("photo-ocr-input");
const btnClearInput    = document.getElementById("btn-clear-input");
const btnNewLine       = document.getElementById("newline-button");
const btnMic           = document.getElementById("mic-button");
const micStatus        = document.getElementById("mic-status");
const inputErrorStatus = document.getElementById("input-error-status");
const imageViewer      = document.getElementById("image-viewer");
const imageViewerImg   = document.getElementById("image-viewer-img");
const btnImageViewerClose = document.getElementById("btn-image-viewer-close");
const photoCaptionArea    = document.getElementById("photo-caption-area");
const photoCaptionPreview = document.getElementById("photo-caption-preview");
const photoCaptionText    = document.getElementById("photo-caption-text");
const btnPhotoCaptionSave = document.getElementById("btn-photo-caption-save");
const btnPhotoCaptionCancel = document.getElementById("btn-photo-caption-cancel");
const helpViewer          = document.getElementById("help-viewer");
const btnHelpViewerClose  = document.getElementById("btn-help-viewer-close");
const btnHelp             = document.getElementById("btn-help");

const exportModal           = document.getElementById("export-modal");
const btnExportModalClose   = document.getElementById("btn-export-modal-close");
const btnExportCancel       = document.getElementById("btn-export-cancel");
const btnExportHtml         = document.getElementById("btn-export-html");
const btnExportMail         = document.getElementById("btn-export-mail");
const btnExportSelectAll    = document.getElementById("btn-export-select-all");
const btnExportDeselectAll  = document.getElementById("btn-export-deselect-all");
const exportEntryList       = document.getElementById("export-entry-list");
const exportIncEntryDate    = document.getElementById("export-inc-entry-date");
const exportIncDueDate      = document.getElementById("export-inc-due-date");
const exportIncPhotoNote    = document.getElementById("export-inc-photo-note");

const SpeechRecognitionCtor =
    window.SpeechRecognition || window.webkitSpeechRecognition;

let modus = MODUS_ERFASSEN;

if (authBar) authBar.hidden = true;


/* --- Status-Anzeigen -------------------------------------------- */

function syncStatusSetzen(text, tone = "offline") {
    if (!syncStatus) return;
    syncStatus.textContent = text;
    syncStatus.classList.remove("ok", "warn", "offline");
    syncStatus.classList.add(tone);
}

function authStatusSetzen(text) {
    if (!authStatus) return;
    authStatus.textContent = text;
}

function eingabeFehlerSetzen(text) {
    if (!inputErrorStatus) return;
    inputErrorStatus.textContent = String(text || "").trim();
}


/* --- Sortierung -------------------------------------------------- */

function entryLabelFromData(entryLike) {
    const text = String(entryLike?.text || entryLike?.title || "").trim();
    const note = String(entryLike?.note || "").trim();
    if (!text || isPhotoEntryText(text)) return text;
    return note ? `${text} — ${note}` : text;
}

function getEntryTimestamp(entryLike) {
    const fromEntryDate = normalizeDateIso(entryLike?.entryDate || entryLike?.entry_date);
    if (fromEntryDate) return Date.parse(fromEntryDate);
    const fromCreatedAt = normalizeDateIso(entryLike?.createdAt || entryLike?.created_at);
    if (fromCreatedAt) return Date.parse(fromCreatedAt);
    const fromItemId = extractDateFromItemId(entryLike?.itemId || entryLike?.item_id);
    if (fromItemId) return Date.parse(fromItemId);
    return 0;
}

function sortListByReminderDate() {
    const daten = normalizeListData(datenAusListeLesen());
    if (!daten.length) return false;

    const offene = daten.filter(e => !e.erledigt);
    const erledigte = daten.filter(e => e.erledigt);
    const collator = new Intl.Collator("de", { sensitivity: "base" });

    const sortFn = (a, b) => {
        const aDue = a.dueDate || "";
        const bDue = b.dueDate || "";
        if (aDue && bDue) return aDue < bDue ? -1 : aDue > bDue ? 1 : 0;
        if (aDue && !bDue) return -1;
        if (!aDue && bDue) return 1;
        const tsDiff = getEntryTimestamp(a) - getEntryTimestamp(b);
        if (tsDiff !== 0) return tsDiff;
        return collator.compare(entryLabelFromData(a), entryLabelFromData(b));
    };
    offene.sort(sortFn);
    erledigte.sort(sortFn);

    const sortierte = [...offene, ...erledigte].map((e, index) => ({
        ...e,
        position: index
    }));

    datenInListeSchreiben(sortierte);
    speichernLokal(sortierte);
    return true;
}


/* --- Listen-Rendering ------------------------------------------- */

const longPressTimers = new WeakMap();

function datenAusListeLesen() {
    const daten = [];
    liste.querySelectorAll("li").forEach((li, index) => {
        const itemId = String(li.dataset.itemId || "").trim() || generateItemId();
        const createdAt = normalizeDateIso(li.dataset.createdAt) || extractDateFromItemId(itemId) || new Date().toISOString();
        const entryDate = normalizeDateIso(li.dataset.entryDate || li.dataset.createdAt) || createdAt;
        const title = String(li.dataset.title || li.dataset.rawText || li.dataset.text || "").trim();
        const note = String(li.dataset.note || "").trim();
        const dueDate = String(li.dataset.dueDate || "").trim().slice(0, 10);
        li.dataset.itemId = itemId;
        li.dataset.createdAt = createdAt;
        li.dataset.entryDate = entryDate;
        li.dataset.title = title;
        li.dataset.note = note;
        li.dataset.dueDate = dueDate;
        daten.push({
            itemId,
            text: li.dataset.rawText || li.dataset.text || title,
            title,
            note,
            erledigt: li.classList.contains("erledigt"),
            createdAt,
            entryDate,
            dueDate,
            position: index
        });
    });
    return daten;
}

function datenInListeSchreiben(daten) {
    liste.innerHTML = "";
    daten.forEach(e => eintragAnlegen(e));
}

function eintragAnlegen(text, erledigt = false, itemId = generateItemId(), createdAt = "") {
    const li = document.createElement("li");
    const inputIsObject = typeof text === "object" && text !== null;
    const rawText = String(inputIsObject ? (text.text || text.title || "") : (text || ""));
    const entryTitle = String(inputIsObject ? (text.title || rawText) : rawText).trim();
    const entryNote = String(inputIsObject ? (text.note || "") : "").trim();
    const inputItemId = inputIsObject ? text.itemId : itemId;
    const inputCreatedAt = inputIsObject ? (text.createdAt || text.entryDate) : createdAt;
    const inputErledigt = inputIsObject ? Boolean(text.erledigt) : erledigt;
    const normalizedItemId = String(inputItemId || "").trim() || generateItemId();
    const normalizedCreatedAt =
        normalizeDateIso(inputCreatedAt) || extractDateFromItemId(normalizedItemId) || new Date().toISOString();
    const normalizedEntryDate =
        normalizeDateIso(inputIsObject ? (text.entryDate || text.createdAt) : createdAt)
        || normalizedCreatedAt;
    const normalizedDueDate = inputIsObject ? String(text.dueDate || "").trim().slice(0, 10) : "";

    li.dataset.itemId = normalizedItemId;
    li.dataset.rawText = rawText;
    li.dataset.text = rawText;
    li.dataset.title = entryTitle;
    li.dataset.note = entryNote;
    li.dataset.createdAt = normalizedCreatedAt;
    li.dataset.entryDate = normalizedEntryDate;
    li.dataset.dueDate = normalizedDueDate;

    if (rawText.startsWith(IMAGE_ENTRY_PREFIX)) {
        const imageSrc = rawText.slice(IMAGE_ENTRY_PREFIX.length);
        const wrapper = document.createElement("div");
        wrapper.className = "list-photo-item";

        const thumb = document.createElement("img");
        thumb.className = "list-photo-thumb";
        thumb.src = imageSrc;
        thumb.alt = "Fotoeintrag";

        const openBtn = document.createElement("button");
        openBtn.type = "button";
        openBtn.className = "list-photo-open";
        openBtn.textContent = "Foto öffnen";
        openBtn.onclick = event => {
            event.stopPropagation();
            bildViewerOeffnen(imageSrc);
        };

        const deleteBtn = document.createElement("button");
        deleteBtn.type = "button";
        deleteBtn.className = "list-photo-delete";
        deleteBtn.textContent = "Löschen";
        deleteBtn.onclick = event => {
            event.stopPropagation();
            li.remove();
            speichern(true);
            mikStatusSetzen("Foto gelöscht.");
        };

        thumb.onclick = event => {
            event.stopPropagation();
            bildViewerOeffnen(imageSrc);
        };

        wrapper.appendChild(thumb);

        const photoControls = document.createElement("div");
        photoControls.className = "list-photo-controls";
        photoControls.appendChild(openBtn);
        photoControls.appendChild(deleteBtn);
        wrapper.appendChild(photoControls);

        const noteWrap = document.createElement("div");
        noteWrap.className = "list-photo-note-wrap";

        const noteDisplay = document.createElement("span");
        noteDisplay.className = "list-photo-note" + (entryNote ? "" : " list-photo-note-empty");
        noteDisplay.textContent = entryNote || "Notiz hinzufügen…";
        noteWrap.appendChild(noteDisplay);

        noteDisplay.addEventListener("click", event => {
            event.stopPropagation();
            if (noteWrap.querySelector("textarea")) return;

            const ta = document.createElement("textarea");
            ta.className = "list-photo-note-edit";
            ta.value = li.dataset.note || "";
            ta.rows = 2;
            ta.placeholder = "Notiz eingeben…";

            const btnRow = document.createElement("div");
            btnRow.className = "list-photo-note-actions";

            const confirmBtn = document.createElement("button");
            confirmBtn.type = "button";
            confirmBtn.className = "list-photo-note-confirm";
            confirmBtn.textContent = "Fertig";

            const cancelBtn = document.createElement("button");
            cancelBtn.type = "button";
            cancelBtn.className = "list-photo-note-cancel";
            cancelBtn.textContent = "✕";

            let _editActive = true;

            const saveNote = () => {
                if (!_editActive) return;
                _editActive = false;
                ta.blur();
                const newNote = ta.value.trim();
                li.dataset.note = newNote;
                noteDisplay.textContent = newNote || "Notiz hinzufügen…";
                noteDisplay.classList.toggle("list-photo-note-empty", !newNote);
                noteDisplay.hidden = false;
                noteWrap.removeChild(ta);
                noteWrap.removeChild(btnRow);
                speichern(true);
            };

            const cancelEdit = () => {
                if (!_editActive) return;
                _editActive = false;
                ta.blur();
                noteDisplay.hidden = false;
                noteWrap.removeChild(ta);
                noteWrap.removeChild(btnRow);
            };

            confirmBtn.onclick = event => { event.stopPropagation(); saveNote(); };
            cancelBtn.onclick = event => { event.stopPropagation(); cancelEdit(); };
            ta.addEventListener("keydown", event => {
                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); saveNote(); }
                if (event.key === "Escape") cancelEdit();
            });
            ta.addEventListener("pointerdown", e => e.stopPropagation());
            ta.addEventListener("blur", () => {
                setTimeout(() => { if (_editActive) saveNote(); }, 150);
            });

            btnRow.appendChild(cancelBtn);
            btnRow.appendChild(confirmBtn);

            noteDisplay.hidden = true;
            noteWrap.appendChild(ta);
            noteWrap.appendChild(btnRow);
            ta.focus();
            setTimeout(() => ta.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300);
        });

        wrapper.appendChild(noteWrap);

        li.appendChild(wrapper);
    } else {
        const textWrap = document.createElement("span");
        textWrap.className = "list-item-text";

        const titleSpan = document.createElement("span");
        titleSpan.className = "list-item-title";
        titleSpan.textContent = entryTitle;
        textWrap.appendChild(titleSpan);

        if (entryNote) {
            const noteSpan = document.createElement("span");
            noteSpan.className = "list-item-note";
            noteSpan.textContent = entryNote;
            textWrap.appendChild(noteSpan);
        }

        li.appendChild(textWrap);
    }

    const datesWrap = document.createElement("div");
    datesWrap.className = "list-item-dates";

    const entryDateSpan = document.createElement("span");
    entryDateSpan.className = "list-item-entry-date";
    entryDateSpan.textContent = formatEntryDate(normalizedEntryDate);
    datesWrap.appendChild(entryDateSpan);

    const dueDateWrap = document.createElement("div");
    dueDateWrap.className = "list-item-due-wrap";

    const dueDateBtn = document.createElement("button");
    dueDateBtn.type = "button";
    dueDateBtn.className = "list-item-due-btn";

    const dueDateHidden = document.createElement("input");
    dueDateHidden.type = "date";
    dueDateHidden.className = "list-item-due-input";
    if (normalizedDueDate) dueDateHidden.value = normalizedDueDate;

    function updateDueDateDisplay() {
        const val = dueDateHidden.value;
        li.dataset.dueDate = val;
        if (val) {
            dueDateBtn.textContent = formatDueDate(val);
            dueDateBtn.classList.add("has-date");
            if (!li.classList.contains("erledigt")) {
                const today = getTodayDateString();
                li.classList.toggle("overdue", val < today);
                li.classList.toggle("due-today", val === today);
            }
        } else {
            dueDateBtn.textContent = "📅";
            dueDateBtn.classList.remove("has-date");
            li.classList.remove("overdue", "due-today");
        }
    }
    updateDueDateDisplay();

    dueDateBtn.onclick = event => {
        event.stopPropagation();
        try { dueDateHidden.showPicker(); } catch { dueDateHidden.click(); }
    };
    dueDateHidden.addEventListener("pointerdown", e => e.stopPropagation());
    dueDateHidden.onchange = () => {
        updateDueDateDisplay();
        speichern(true);
    };

    dueDateWrap.appendChild(dueDateBtn);
    dueDateWrap.appendChild(dueDateHidden);
    datesWrap.appendChild(dueDateWrap);
    li.appendChild(datesWrap);

    if (inputErledigt) li.classList.add("erledigt");

    const cancelLongPress = () => {
        const timers = longPressTimers.get(li);
        if (!timers) return;
        clearTimeout(timers.activate);
        longPressTimers.delete(li);
        li.classList.remove("pending");
    };

    li.addEventListener("pointerdown", e => {
        if (modus !== MODUS_ERLEDIGT) return;
        e.preventDefault();
        li.setPointerCapture(e.pointerId);
        cancelLongPress();

        const timers = { activate: null };
        longPressTimers.set(li, timers);
        li.classList.add("pending");

        timers.activate = setTimeout(() => {
            if (!longPressTimers.has(li)) return;
            longPressTimers.delete(li);
            li.classList.remove("pending");
            if (li.classList.contains("erledigt")) {
                li.classList.remove("erledigt");
            } else {
                li.classList.add("erledigt");
            }
            sortListByReminderDate();
            speichern(true);
        }, 500);
    });

    li.addEventListener("pointerup",     cancelLongPress);
    li.addEventListener("pointercancel", cancelLongPress);
    li.addEventListener("contextmenu",   e => e.preventDefault());

    inputErledigt
        ? liste.appendChild(li)
        : liste.insertBefore(li, liste.firstChild);
}


/* --- Modus ------------------------------------------------------ */

function modusSetzen(neu) {
    const vorher = modus;
    modus = neu;

    if (btnErfassen) btnErfassen.classList.toggle("active", modus === MODUS_ERFASSEN);
    if (btnErledigt) btnErledigt.classList.toggle("active", modus === MODUS_ERLEDIGT);
    document.body.classList.toggle("modus-erledigt", modus === MODUS_ERLEDIGT);
    if (syncCodeCompact) syncCodeCompact.hidden = modus !== MODUS_ERFASSEN;
    if (authBar) authBar.hidden = !(modus === MODUS_ERFASSEN && syncEditMode);

    if (vorher !== MODUS_ERLEDIGT && neu === MODUS_ERLEDIGT) {
        if (sortListByReminderDate()) speichern();
    }

    if (vorher === MODUS_ERLEDIGT && neu === MODUS_ERFASSEN) {
        liste.querySelectorAll("li.erledigt").forEach(li => li.remove());
        speichern(true);
    }
}

if (btnErfassen) btnErfassen.onclick = () => modusSetzen(MODUS_ERFASSEN);
if (btnErledigt) btnErledigt.onclick = () => modusSetzen(MODUS_ERLEDIGT);


/* --- Viewer ----------------------------------------------------- */

function bildViewerOeffnen(src) {
    if (!imageViewer || !imageViewerImg) return;
    imageViewerImg.src = src;
    imageViewer.hidden = false;
}

function bildViewerSchliessen() {
    if (!imageViewer || !imageViewerImg) return;
    imageViewer.hidden = true;
    imageViewerImg.src = "";
}

function hilfeViewerOeffnen() {
    if (!helpViewer) return;
    helpViewer.hidden = false;
}

function hilfeViewerSchliessen() {
    if (!helpViewer) return;
    helpViewer.hidden = true;
}

if (btnImageViewerClose) btnImageViewerClose.onclick = bildViewerSchliessen;
if (imageViewer) {
    imageViewer.onclick = event => {
        if (event.target === imageViewer) bildViewerSchliessen();
    };
}
if (btnHelp) btnHelp.onclick = hilfeViewerOeffnen;
if (btnHelpViewerClose) btnHelpViewerClose.onclick = hilfeViewerSchliessen;
if (helpViewer) {
    helpViewer.onclick = event => {
        if (event.target === helpViewer) hilfeViewerSchliessen();
    };
}


/* --- Eingabe-Größe ---------------------------------------------- */

function autoResize() {
    if (!multiInput) return;
    multiInput.style.height = "auto";
    multiInput.style.height = multiInput.scrollHeight + "px";
}

function fokusInputAmEnde() {
    const pos = multiInput.value.length;
    multiInput.setSelectionRange(pos, pos);
}

if (multiInput) multiInput.addEventListener("input", autoResize);
if (multiInput) {
    multiInput.addEventListener("focus", () => {
        setTimeout(() => multiInput.scrollIntoView({ behavior: "smooth", block: "nearest" }), 300);
    });
}
if (multiInput) {
    multiInput.addEventListener("keydown", event => {
        if (event.key !== "Enter" || event.isComposing) return;
        event.preventDefault();
        const start = multiInput.selectionStart;
        const end = multiInput.selectionEnd;
        const text = multiInput.value;
        multiInput.value = text.slice(0, start) + "\n" + text.slice(end);
        const nextPos = start + 1;
        multiInput.setSelectionRange(nextPos, nextPos);
        autoResize();
    });
}


/* --- Mehrzeilen-Eingabe ------------------------------------------ */

function mehrzeilenSpeichern() {
    const text = multiInput.value.trim();
    if (!text) return;

    text.split("\n")
        .map(l => l.trim())
        .filter(Boolean)
        .forEach(item => eintragAnlegen({ text: item }));

    speichern();
    multiInput.value = "";
    autoResize();
    multiInput.blur();

    if (isListening) {
        finalTranscript = "";
        latestTranscript = "";
        skipAutoSaveForCurrentBuffer = true;
        ignoreResultsUntil = Date.now() + 500;
        restartMicAfterManualCommit = true;
        clearTimeout(micSessionTimer);
        recognition.stop();
        mikStatusSetzen("Eintrag gespeichert, Mikro wird neu gestartet...");
    }
}

function clearInputBuffer(stopDictation = false) {
    multiInput.value = "";
    autoResize();

    finalTranscript = "";
    latestTranscript = "";
    skipAutoSaveForCurrentBuffer = true;
    ignoreResultsUntil = Date.now() + 700;

    if (stopDictation && isListening && recognition) {
        restartMicAfterManualCommit = false;
        clearTimeout(micSessionTimer);
        recognition.stop();
        mikStatusSetzen("Eingabe geloescht.");
        return;
    }

    if (isListening) mikStatusSetzen("Eingabe geloescht. Bitte weiter sprechen...");
    else mikStatusSetzen("Eingabe geloescht.");
}

if (multiAdd) multiAdd.onclick = mehrzeilenSpeichern;

if (btnClearInput) {
    btnClearInput.onclick = () => clearInputBuffer(false);
}

if (btnNewLine) {
    btnNewLine.onclick = () => {
        if (!multiInput) return;
        multiInput.value += "\n";
        autoResize();
        multiInput.blur();
    };
}


/* --- Foto ------------------------------------------------------- */

function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => reject(new Error("Datei konnte nicht gelesen werden."));
        reader.readAsDataURL(file);
    });
}

async function optimizePhotoDataUrl(dataUrl) {
    if (!String(dataUrl || "").startsWith("data:image/")) return dataUrl;
    try {
        const image = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
            img.src = dataUrl;
        });
        const maxSide = 1280;
        const scale = Math.min(1, maxSide / Math.max(image.width, image.height));
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return dataUrl;
        ctx.drawImage(image, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/jpeg", 0.78);
        return compressed.length < dataUrl.length ? compressed : dataUrl;
    } catch {
        return dataUrl;
    }
}

let pendingPhotoSrc = "";
let photoLoading = false;
let photoLoadTimeout = null;

function photoCaptionBereich(show) {
    if (!photoCaptionArea) return;
    photoCaptionArea.hidden = !show;
    if (!show) {
        pendingPhotoSrc = "";
        if (photoCaptionPreview) photoCaptionPreview.src = "";
        if (photoCaptionText) photoCaptionText.value = "";
    }
}

function fotoZuruecksetzen() {
    photoLoading = false;
    if (photoLoadTimeout) { clearTimeout(photoLoadTimeout); photoLoadTimeout = null; }
    if (btnPhotoOcr) btnPhotoOcr.disabled = false;
    if (photoOcrInput) {
        photoOcrInput.value = "";
        photoOcrInput.type = "";
        photoOcrInput.type = "file";
    }
    photoCaptionBereich(false);
}

async function addPhotoAsListItem(file) {
    if (!file || photoLoading) return;
    photoLoading = true;
    if (btnPhotoOcr) btnPhotoOcr.disabled = true;
    mikStatusSetzen("Foto wird geladen...");

    photoLoadTimeout = setTimeout(() => {
        mikStatusSetzen("Foto-Laden abgebrochen (Timeout).");
        fotoZuruecksetzen();
    }, 10000);

    try {
        const imageSrc = await readFileAsDataUrl(file);
        if (!photoLoading) return;
        const optimizedImageSrc = await optimizePhotoDataUrl(imageSrc);
        if (!photoLoading) return;
        pendingPhotoSrc = optimizedImageSrc;
        if (photoCaptionPreview) photoCaptionPreview.src = optimizedImageSrc;
        if (photoCaptionText) photoCaptionText.value = "";
        photoCaptionBereich(true);
        mikStatusSetzen("Beschreibung eingeben und Foto speichern.");
    } catch {
        mikStatusSetzen("Foto konnte nicht gelesen werden.");
        fotoZuruecksetzen();
    } finally {
        photoLoading = false;
        if (photoLoadTimeout) { clearTimeout(photoLoadTimeout); photoLoadTimeout = null; }
        if (btnPhotoOcr) btnPhotoOcr.disabled = false;
        if (photoOcrInput) {
            photoOcrInput.value = "";
            photoOcrInput.type = "";
            photoOcrInput.type = "file";
        }
    }
}

function photoCaptionSpeichern() {
    if (!pendingPhotoSrc) return;
    try {
        const note = photoCaptionText ? photoCaptionText.value.trim() : "";
        eintragAnlegen({ text: IMAGE_ENTRY_PREFIX + pendingPhotoSrc, note });
        speichern();
        mikStatusSetzen("Foto zur Liste hinzugefügt.");
    } catch {
        mikStatusSetzen("Foto konnte nicht gespeichert werden.");
    } finally {
        fotoZuruecksetzen();
    }
}

if (btnPhotoCaptionSave) btnPhotoCaptionSave.onclick = photoCaptionSpeichern;
if (btnPhotoCaptionCancel) btnPhotoCaptionCancel.onclick = () => {
    fotoZuruecksetzen();
    mikStatusSetzen("Foto abgebrochen.");
};

if (btnPhotoOcr && photoOcrInput) {
    btnPhotoOcr.onclick = () => photoOcrInput.click();
    photoOcrInput.onchange = () => {
        const file = photoOcrInput.files?.[0];
        void addPhotoAsListItem(file);
    };
}


/* --- Mikrofon / Sprache ----------------------------------------- */

let recognition;
let isListening = false;
let finalTranscript = "";
let latestTranscript = "";
let micSessionTimer;
let skipAutoSaveForCurrentBuffer = false;
let ignoreResultsUntil = 0;
let restartMicAfterManualCommit = false;

function mikStatusSetzen(message = "") {
    if (!micStatus) return;
    micStatus.textContent = message;
}

function mikButtonSetzen(listening) {
    if (!btnMic) return;
    btnMic.classList.toggle("listening", listening);
    btnMic.setAttribute("aria-pressed", listening ? "true" : "false");
    btnMic.textContent = listening ? "⏹" : "🎤";
}

function eingabeMitDiktat(text) {
    if (!multiInput) return;
    multiInput.value = text;
    autoResize();
    if (document.activeElement === multiInput) fokusInputAmEnde();
}

function initRecognition() {
    if (!SpeechRecognitionCtor) return null;

    const r = new SpeechRecognitionCtor();
    r.lang = "de-DE";
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;

    r.onstart = () => {
        isListening = true;
        finalTranscript = "";
        latestTranscript = "";
        skipAutoSaveForCurrentBuffer = false;
        if (Date.now() >= ignoreResultsUntil) ignoreResultsUntil = 0;
        restartMicAfterManualCommit = false;
        mikButtonSetzen(true);
        mikStatusSetzen("Spracheingabe aktiv (max. 30s)...");
        clearTimeout(micSessionTimer);
        micSessionTimer = setTimeout(() => {
            if (!isListening) return;
            mikStatusSetzen("Zeitlimit erreicht.");
            r.stop();
        }, MIC_SESSION_MS);
    };

    r.onresult = event => {
        if (!isListening) return;
        if (Date.now() < ignoreResultsUntil) return;
        let interimTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
            const part = event.results[i][0]?.transcript?.trim() || "";
            if (!part) continue;
            if (event.results[i].isFinal) finalTranscript += (finalTranscript ? " " : "") + part;
            else interimTranscript += (interimTranscript ? " " : "") + part;
        }
        const combined = [finalTranscript, interimTranscript].filter(Boolean).join(" ").trim();
        latestTranscript = combined;
        if (combined) skipAutoSaveForCurrentBuffer = false;
        eingabeMitDiktat(combined);
    };

    r.onerror = event => {
        clearTimeout(micSessionTimer);
        isListening = false;
        mikButtonSetzen(false);
        recognition = null;
        const errorText = {
            "not-allowed": "Mikrofon nicht erlaubt – bitte in Einstellungen erlauben.",
            "service-not-allowed": "Spracherkennung blockiert – bitte in Einstellungen erlauben.",
            "audio-capture": "Kein Mikrofon verfuegbar.",
            "network": "Netzwerkfehler bei Spracherkennung.",
            "no-speech": "Keine Sprache erkannt."
        }[event.error] || ("Spracherkennung-Fehler: " + event.error);
        mikStatusSetzen(errorText);
    };

    r.onend = () => {
        clearTimeout(micSessionTimer);
        isListening = false;
        mikButtonSetzen(false);
        if (restartMicAfterManualCommit) {
            restartMicAfterManualCommit = false;
            startRecognition();
            return;
        }
        if (skipAutoSaveForCurrentBuffer) {
            skipAutoSaveForCurrentBuffer = false;
            mikStatusSetzen("Spracheingabe beendet.");
            return;
        }
        const spokenText = finalTranscript.trim() || latestTranscript.trim();
        if (spokenText) {
            const currentValue = multiInput?.value?.trim() || "";
            if (multiInput && currentValue !== spokenText) {
                multiInput.value = currentValue ? `${currentValue}\n${spokenText}` : spokenText;
            }
            autoResize();
            if (multiInput) {
                multiInput.focus();
                fokusInputAmEnde();
            }
            mikStatusSetzen("Text erkannt. Mit Übernehmen speichern.");
            return;
        }
        if (!micStatus?.textContent) mikStatusSetzen("Keine Sprache erkannt.");
    };

    return r;
}

function startRecognition() {
    if (!recognition) return;
    mikStatusSetzen("Mikrofon wird gestartet...");
    try {
        recognition.start();
    } catch (error) {
        console.warn("Speech start error:", error);
        isListening = false;
        mikButtonSetzen(false);
        recognition = null;
        mikStatusSetzen("Mikrofon nicht bereit. Bitte erneut tippen.");
    }
}

function toggleDictation() {
    if (!SpeechRecognitionCtor) {
        mikStatusSetzen("Spracherkennung wird hier nicht unterstuetzt.");
        return;
    }
    if (!window.isSecureContext && !istLokalhost()) {
        mikStatusSetzen("Spracheingabe braucht HTTPS.");
        return;
    }
    if (!recognition && isListening) {
        isListening = false;
        mikButtonSetzen(false);
    }
    if (!recognition) recognition = initRecognition();
    if (!recognition) return;
    if (isListening) {
        clearTimeout(micSessionTimer);
        restartMicAfterManualCommit = false;
        recognition.stop();
        return;
    }
    startRecognition();
}

if (btnMic) btnMic.onclick = toggleDictation;


/* --- Export ----------------------------------------------------- */

function exportDataUrlToFile(dataUrl, name) {
    const [header, base64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return new File([bytes], name, { type: mime });
}

function exportFormatIsoDate(isoDate) {
    if (!isoDate) return "";
    try {
        return new Intl.DateTimeFormat("de-AT", {
            day: "2-digit", month: "2-digit", year: "numeric"
        }).format(new Date(isoDate + "T12:00:00"));
    } catch { return isoDate; }
}

function exportFormatIsoDateShort(isoDate) {
    if (!isoDate) return "";
    try {
        return new Intl.DateTimeFormat("de-AT", {
            day: "2-digit", month: "2-digit"
        }).format(new Date(isoDate + "T12:00:00"));
    } catch { return isoDate; }
}

function exportBuildText(exportDateShort, exportDateLong, entries, opts) {
    const today  = getTodayDateString();
    const offene   = entries.filter(e => !e.erledigt && (!e.isPhoto || opts.incPhotos));
    const erledigt = entries.filter(e =>  e.erledigt && (!e.isPhoto || opts.incPhotos));

    const buildLine = e => {
        const overdue = e.dueDate && e.dueDate < today && !e.erledigt;
        const prefix  = e.isPhoto ? "📸" : e.erledigt ? "✔" : "•";
        const warn    = overdue ? " ⚠️" : "";
        const title   = e.isPhoto ? (e.note || "Foto") : e.title;
        const parts   = [`${prefix}${warn} ${title}`];
        if (opts.incEntryDate && e.entryDate) parts.push(`Erfasst: ${exportFormatIsoDateShort(e.entryDate)}`);
        if (opts.incDueDate   && e.dueDate)   parts.push(`Fällig: ${exportFormatIsoDateShort(e.dueDate)}`);
        return parts.join(" | ");
    };

    const lines = [
        "Reiseplaner",
        exportDateLong,
        `${entries.length} Einträge`,
        "────────────"
    ];

    if (offene.length) {
        lines.push("", "Offen");
        offene.forEach(e => lines.push(buildLine(e)));
    }
    if (erledigt.length) {
        lines.push("", "Erledigt");
        erledigt.forEach(e => lines.push(buildLine(e)));
    }

    lines.push("", "────────────", "Gesendet von Reiseplaner App – Al.Gether");
    return lines.join("\n");
}

function exportAsHtmlDownload(exportDateShort, exportDateLong, entries, opts) {
    const esc   = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
    const today = getTodayDateString();
    const offene   = entries.filter(e => !e.erledigt && (!e.isPhoto || opts.incPhotos));
    const erledigt = entries.filter(e =>  e.erledigt && (!e.isPhoto || opts.incPhotos));

    const buildMeta = e => {
        const parts = [];
        if (opts.incEntryDate && e.entryDate) parts.push(`Erfasst: ${exportFormatIsoDateShort(e.entryDate)}`);
        if (opts.incDueDate   && e.dueDate) {
            const overdue = e.dueDate < today && !e.erledigt;
            const isToday = e.dueDate === today && !e.erledigt;
            const col = overdue ? "#dc2626" : isToday ? "#ea580c" : "#64748b";
            parts.push(`<span style="color:${col};font-weight:600">Fällig: ${esc(exportFormatIsoDateShort(e.dueDate))}${overdue ? " ⚠️" : ""}</span>`);
        }
        return parts.length ? `<span style="color:#94a3b8;font-size:12px;margin-left:6px">${parts.join(" | ")}</span>` : "";
    };

    const buildItem = (e, done = false) => {
        const overdue   = e.dueDate && e.dueDate < today && !e.erledigt;
        const borderCol = done ? "#6d28d9" : overdue ? "#dc2626" : "#c2410c";

        if (e.isPhoto) {
            const src     = e.raw.slice(IMAGE_ENTRY_PREFIX.length);
            const hasNote = opts.incPhotoNote && e.note;
            const overlay = hasNote
                ? `<div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.55);color:#fff;padding:6px 10px;font-size:13px;line-height:1.3">📝 ${esc(e.note)}</div>` : "";
            const meta = buildMeta(e);
            return `<li style="background:#fff;border-left:5px solid ${borderCol};border-radius:10px;padding:10px 14px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
  <div style="position:relative;border-radius:8px;overflow:hidden;margin-bottom:${meta ? "6px" : "0"}">
    <img src="${src}" style="width:100%;max-width:480px;border-radius:8px;display:block">
    ${overlay}
  </div>
  ${meta ? `<div>${meta}</div>` : ""}
</li>`;
        }

        const titleCol = done ? "#9ca3af" : overdue ? "#dc2626" : "#1e293b";
        const titleDec = done ? "text-decoration:line-through;" : "";
        const prefix   = done ? "✔ " : "• ";
        return `<li style="background:#fff;border-left:5px solid ${borderCol};border-radius:10px;padding:10px 14px;margin-bottom:8px;box-shadow:0 1px 4px rgba(0,0,0,0.06)">
  <span style="${titleDec}font-weight:600;color:${titleCol}">${prefix}${esc(e.title)}</span>${buildMeta(e)}
</li>`;
    };

    const sectionHtml = (title, icon, items, done = false) => {
        if (!items.length) return "";
        return `
<div style="margin-top:24px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;padding-bottom:8px;border-bottom:2px solid #e5e7eb">
    <span style="font-size:18px">${icon}</span>
    <h2 style="margin:0;font-size:16px;font-weight:700;color:#374151">${title} <span style="color:#94a3b8;font-weight:400;font-size:14px">(${items.length})</span></h2>
  </div>
  <ul style="list-style:none;padding:0;margin:0">${items.map(e => buildItem(e, done)).join("")}</ul>
</div>`;
    };

    const html = `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Reiseplaner - ${esc(exportDateShort)}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:system-ui,-apple-system,sans-serif">
<div style="max-width:600px;margin:0 auto;padding:16px">

  <div style="background:linear-gradient(135deg,#0f4a3b,#1a6b5a,#e8a23a);border-radius:16px;padding:24px 20px;margin-bottom:20px;color:#fff">
    <div style="font-size:32px;margin-bottom:6px">✈️</div>
    <h1 style="margin:0 0 4px;font-size:26px;font-weight:800;letter-spacing:0.3px">Reiseplaner</h1>
    <p style="margin:0;font-size:14px;opacity:0.9">${esc(exportDateLong)}</p>
    <p style="margin:8px 0 0;font-size:13px;opacity:0.75">${entries.length} Einträge</p>
  </div>

  ${sectionHtml("Offen", "📋", offene, false)}
  ${sectionHtml("Erledigt", "✅", erledigt, true)}

  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e2e8f0;text-align:center;color:#94a3b8;font-size:12px">
    Gesendet von <strong style="color:#64748b">Reiseplaner App</strong> – Al.Gether
  </div>

</div>
</body>
</html>`;

    const blob = new Blob([html], { type: "text/html" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url;
    a.download = `reiseplaner-${exportDateShort.replace(/\./g, "-")}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function exportListItemsFromListe() {
    return [...liste.querySelectorAll("li")].map(li => {
        const raw = String(li.dataset.rawText || li.dataset.text || "");
        return {
            erledigt:  li.classList.contains("erledigt"),
            raw,
            title:     String(li.dataset.title || raw).trim(),
            note:      String(li.dataset.note || "").trim(),
            entryDate: String(li.dataset.entryDate || "").slice(0, 10),
            dueDate:   String(li.dataset.dueDate || "").slice(0, 10),
            isPhoto:   raw.startsWith(IMAGE_ENTRY_PREFIX)
        };
    });
}

function exportModalFuellenEintraege(filter) {
    if (!exportEntryList) return;
    const alle = exportListItemsFromListe();
    const gefiltert = filter === "open"
        ? alle.filter(e => !e.erledigt)
        : filter === "done"
            ? alle.filter(e =>  e.erledigt)
            : alle;

    exportEntryList.innerHTML = "";
    gefiltert.forEach(e => {
        const li    = document.createElement("li");
        li.className = "export-entry-item";
        const label = document.createElement("label");
        label.className = "export-entry-label";
        const cb    = document.createElement("input");
        cb.type     = "checkbox";
        cb.checked  = true;
        const span  = document.createElement("span");
        span.textContent = e.isPhoto
            ? "📸" + (e.note ? " " + e.note : " Foto")
            : (e.erledigt ? "✔ " : "• ") + e.title;
        label.appendChild(cb);
        label.appendChild(span);
        li.appendChild(label);
        li._exportEntry = e;
        exportEntryList.appendChild(li);
    });
}

function exportModalOeffnen() {
    const activeFilter = document.querySelector("input[name=export-filter]:checked")?.value || "all";
    exportModalFuellenEintraege(activeFilter);
    if (exportModal) exportModal.hidden = false;
}

function exportModalSchliessen() {
    if (exportModal) exportModal.hidden = true;
}

function exportDatenVorbereiten() {
    if (!exportEntryList) return null;
    const selectedEntries = [...exportEntryList.querySelectorAll("li")]
        .filter(li => li.querySelector("input[type=checkbox]")?.checked)
        .map(li => li._exportEntry);
    if (!selectedEntries.length) {
        alert("Keine Einträge ausgewählt.");
        return null;
    }
    const opts = {
        incPhotos:    true,
        incEntryDate: exportIncEntryDate?.checked ?? true,
        incDueDate:   exportIncDueDate?.checked   ?? true,
        incPhotoNote: exportIncPhotoNote?.checked  ?? true
    };
    const now = new Date();
    const exportDateShort = new Intl.DateTimeFormat("de-AT", {
        day: "2-digit", month: "2-digit", year: "numeric"
    }).format(now);
    const exportDateLong = new Intl.DateTimeFormat("de-AT", {
        weekday: "long", day: "numeric", month: "long", year: "numeric"
    }).format(now);
    return { selectedEntries, opts, exportDateShort, exportDateLong };
}

function exportAlsHtml() {
    const d = exportDatenVorbereiten();
    if (!d) return;
    exportModalSchliessen();
    exportAsHtmlDownload(d.exportDateShort, d.exportDateLong, d.selectedEntries, d.opts);
}

function exportAlsMail() {
    const d = exportDatenVorbereiten();
    if (!d) return;
    exportModalSchliessen();
    const textEntries = d.selectedEntries.filter(e => !e.isPhoto);
    const text = exportBuildText(d.exportDateShort, d.exportDateLong, textEntries, { ...d.opts, incPhotos: false });
    const exportTitle = `Reiseplaner - ${d.exportDateShort}`;
    window.location.href = `mailto:${EXPORT_EMAIL}?subject=${encodeURIComponent(exportTitle)}&body=${encodeURIComponent(text)}`;
}

if (btnExport)           btnExport.onclick           = exportModalOeffnen;
if (btnExportModalClose) btnExportModalClose.onclick  = exportModalSchliessen;
if (btnExportCancel)     btnExportCancel.onclick      = exportModalSchliessen;
if (exportModal) {
    exportModal.onclick = event => {
        if (event.target === exportModal) exportModalSchliessen();
    };
}
if (btnExportHtml) btnExportHtml.onclick = exportAlsHtml;
if (btnExportMail) btnExportMail.onclick = exportAlsMail;
if (btnExportSelectAll) {
    btnExportSelectAll.onclick = () =>
        exportEntryList?.querySelectorAll("input[type=checkbox]").forEach(cb => { cb.checked = true; });
}
if (btnExportDeselectAll) {
    btnExportDeselectAll.onclick = () =>
        exportEntryList?.querySelectorAll("input[type=checkbox]").forEach(cb => { cb.checked = false; });
}
document.querySelectorAll("input[name=export-filter]").forEach(radio => {
    radio.onchange = () => exportModalFuellenEintraege(radio.value);
});


/* --- Tastatur schließen bei Tap außerhalb ----------------------- */

document.addEventListener("pointerdown", event => {
    const active = document.activeElement;
    if (!active || (active.tagName !== "INPUT" && active.tagName !== "TEXTAREA")) return;
    const inputAreas = [".input-section", ".list-photo-note-wrap", ".auth-bar", ".photo-caption-area"];
    const isInInputArea = inputAreas.some(sel => active.closest(sel));
    if (!isInInputArea) return;
    const tappedInInputArea = inputAreas.some(sel => event.target.closest(sel));
    if (!tappedInInputArea) active.blur();
}, { passive: true });


/* --- iOS Zoom-Reset nach Tastatur schließen --------------------- */

function zoomZuruecksetzen() {
    const viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) return;
    const original = viewport.content;
    viewport.content = original.includes("maximum-scale")
        ? original
        : original + ", maximum-scale=1";
    setTimeout(() => { viewport.content = original; }, 300);
}

document.addEventListener("focusout", event => {
    if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
        zoomZuruecksetzen();
    }
}, { passive: true });
