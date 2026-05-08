const CACHE_VERSION = "v0.1.1-dev";
const CACHE_NAME = "reiseplaner-" + CACHE_VERSION;

// Separater Cache ohne Versionsnummer – überlebt SW-Updates.
const HANDOFF_CACHE = "reiseplaner-handoff";
const HANDOFF_KEY = "/__install_context__";

// Im Speicher (geht verloren wenn iOS den SW beendet, daher Cache als Backup)
let _manifestInstallContext = null;

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./config.js",
  "./utils.js",
  "./supabase-lib.js",
  "./supabase.js",
  "./sync.js",
  "./ui.js",
  "./app.js",
  "./style.css",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.png",
  "./apple-touch-icon-180.png"
];

/* INSTALL */
self.addEventListener("install", event => {
  self.skipWaiting();

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(FILES_TO_CACHE))
  );
});

/* ACTIVATE */
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME && key !== HANDOFF_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("message", event => {
  if (event.data?.type === "SET_INSTALL_CONTEXT") {
    _manifestInstallContext = {
      joinToken: String(event.data.joinToken || ""),
      inviteDeviceId: String(event.data.inviteDeviceId || ""),
      code: String(event.data.code || "")
    };
    // Persistent speichern – überlebt SW-Neustarts
    caches.open(HANDOFF_CACHE).then(cache =>
      cache.put(HANDOFF_KEY, new Response(JSON.stringify(_manifestInstallContext), {
        headers: { "Content-Type": "application/json" }
      }))
    ).catch(() => {});
  }
});

// Install-Kontext aus dem Cache lesen (Fallback wenn SW neu gestartet wurde)
async function handoffKontextLesen() {
  if (_manifestInstallContext) return _manifestInstallContext;
  try {
    const cache = await caches.open(HANDOFF_CACHE);
    const res = await cache.match(HANDOFF_KEY);
    if (res) {
      _manifestInstallContext = await res.json();
      return _manifestInstallContext;
    }
  } catch (_) {}
  return null;
}

// Manifest dynamisch mit aktuellem Install-Kontext ausliefern.
async function manifestMitKontextAusliefern(request) {
  const context = await handoffKontextLesen();
  let response;
  try {
    response = await fetch(request.url);
  } catch (_) {
    const cached = await caches.match("./manifest.json");
    if (cached) response = cached;
  }
  if (!response) return new Response("Not found", { status: 404 });
  if (!context?.joinToken && !context?.inviteDeviceId && !context?.code) return response;
  try {
    const manifest = await response.json();
    if (context?.joinToken) {
      manifest.start_url = "./#join=" + encodeURIComponent(context.joinToken);
    } else if (context?.inviteDeviceId) {
      manifest.start_url = "./#invite=" + encodeURIComponent(context.inviteDeviceId);
    } else if (context?.code) {
      manifest.start_url = "./#code=" + context.code;
    }
    return new Response(JSON.stringify(manifest), {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "no-store"
      }
    });
  } catch (_) {
    return response;
  }
}

/* FETCH */
self.addEventListener("fetch", event => {
  const request = event.request;
  const requestUrl = new URL(request.url);
  const sameOrigin = requestUrl.origin === self.location.origin;
  const cacheKeyByPath = requestUrl.pathname === "/" ? "./index.html" : `.${requestUrl.pathname}`;

  // version.json und service-worker.js immer frisch vom Netz – nie aus Cache
  if (sameOrigin && (
    requestUrl.pathname.endsWith("/version.json") ||
    requestUrl.pathname.endsWith("/service-worker.js")
  )) {
    event.respondWith(fetch(request).catch(() => new Response("{}", { headers: { "Content-Type": "application/json" } })));
    return;
  }

  // Manifest dynamisch ausliefern
  if (sameOrigin && requestUrl.pathname.endsWith("/manifest.json")) {
    event.respondWith(manifestMitKontextAusliefern(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put("./index.html", copy)).catch(() => {});
          return response;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request)
      .then(response => {
        if (response) return response;
        if (sameOrigin) {
          return caches.match(cacheKeyByPath).then(byPath => {
            if (byPath) return byPath;
            return fetch(request).catch(() => {
              return new Response("", { status: 503, statusText: "Offline" });
            });
          });
        }
        return fetch(request).catch(() => {
          return new Response("", { status: 503, statusText: "Offline" });
        });
      })
  );
});
