// maplibre-gl derives its Web Worker script URL from its own import.meta.url
// at runtime. Under Turbopack that isn't a real http(s) URL for a bundled
// module, so the derivation silently falls back to "" — the browser then
// resolves that as "load the current page as the worker script", producing
// a worker that never does any real tiling work. GeoJSON sources (used for
// the PFZ map's clustering) then sit forever in a not-loaded state with no
// visible error. Fix: serve the real worker bundle from /public and point
// maplibre-gl at it explicitly via setWorkerUrl() in PfzMap.tsx.
//
// Runs on postinstall so an `npm install` (including a maplibre-gl version
// bump) can't silently leave these copies stale.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, "..", "node_modules", "maplibre-gl", "dist");
const DEST_DIR = path.join(__dirname, "..", "public");
const FILES = ["maplibre-gl-worker.mjs", "maplibre-gl-shared.mjs"];

for (const file of FILES) {
  const src = path.join(SRC_DIR, file);
  const dest = path.join(DEST_DIR, file);
  if (!fs.existsSync(src)) {
    console.warn(`[copy-maplibre-worker] ${src} not found — skipping (maplibre-gl not installed?)`);
    continue;
  }
  fs.copyFileSync(src, dest);
  console.log(`[copy-maplibre-worker] copied ${file} -> public/`);
}
