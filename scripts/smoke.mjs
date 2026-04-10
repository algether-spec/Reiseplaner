import { spawn } from "node:child_process";

const PORT = 4173;
const HOST = "127.0.0.1";
const BASE_URL = `http://${HOST}:${PORT}`;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 8000) {
  const start = Date.now();
  let lastError;

  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(150);
  }

  throw new Error(`Server did not start in time: ${String(lastError)}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function startServer() {
  const server = spawn("python3", ["-m", "http.server", String(PORT), "--bind", HOST], {
    stdio: "ignore"
  });

  server.on("error", error => {
    throw new Error(`Failed to start local server: ${error.message}`);
  });

  return server;
}

async function run() {
  const server = startServer();

  try {
    await waitForServer(`${BASE_URL}/`);

    const [indexRes, manifestRes, swRes] = await Promise.all([
      fetch(`${BASE_URL}/`),
      fetch(`${BASE_URL}/manifest.json`),
      fetch(`${BASE_URL}/service-worker.js`)
    ]);

    assert(indexRes.ok, `index.html request failed (${indexRes.status})`);
    assert(manifestRes.ok, `manifest.json request failed (${manifestRes.status})`);
    assert(swRes.ok, `service-worker.js request failed (${swRes.status})`);

    const [indexHtml, manifest, swText] = await Promise.all([
      indexRes.text(),
      manifestRes.json(),
      swRes.text()
    ]);

    assert(indexHtml.includes("id=\"multi-line-input\""), "Input field missing in index.html");
    assert(indexHtml.includes("id=\"add-all-button\""), "Add button missing in index.html");
    assert(indexHtml.includes("id=\"liste\""), "List container missing in index.html");

    assert(typeof manifest.name === "string" && manifest.name.length > 0, "Manifest name missing");
    assert(Array.isArray(manifest.icons) && manifest.icons.length > 0, "Manifest icons missing");

    assert(swText.includes("FILES_TO_CACHE"), "Service worker cache list missing");
    assert(swText.includes("./index.html"), "Service worker does not cache index.html");

    console.log("Smoke test passed.");
  } finally {
    server.kill("SIGTERM");
  }
}

run().catch(error => {
  console.error(`Smoke test failed: ${error.message}`);
  process.exitCode = 1;
});
