"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, NavigationControl, Popup, setWorkerUrl, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PFZAdvisory } from "@/lib/api";

// See scripts/copy-maplibre-worker.mjs — Turbopack doesn't give maplibre-gl
// a real import.meta.url, so its worker-URL auto-detection fails silently.
// Not load-bearing for plain DOM Markers (only needed for GeoJSON/clustered
// sources), but harmless to set unconditionally.
setWorkerUrl("/maplibre-gl-worker.mjs");

// Roughly centers the Maharashtra coastline (Satpati in the north to
// Tarkarli/Kalethar near the Goa border in the south).
const MAHARASHTRA_CENTER: [number, number] = [72.85, 18.0];
const INITIAL_ZOOM = 6.5;

// Plain OpenStreetMap raster tiles — free, no API key. Fine for this dev
// scope; OSM's own usage policy expects a real tile provider (MapTiler,
// Stadia, etc.) with an API key for any real production traffic volume —
// worth swapping before this goes beyond local testing.
const OSM_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export default function PfzMap({ advisories }: { advisories: PFZAdvisory[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<Marker[]>([]);

  // Initialize the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new Map({
      container: containerRef.current,
      style: OSM_STYLE,
      center: MAHARASHTRA_CENTER,
      zoom: INITIAL_ZOOM,
    });
    map.addControl(new NavigationControl(), "top-right");
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Redraw markers whenever the filtered advisory list changes.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const applyMarkers = () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = advisories.map((a) => {
        const isLive = a.source.includes("real PFZ advisory");
        const el = document.createElement("div");
        el.style.width = "16px";
        el.style.height = "16px";
        el.style.borderRadius = "50%";
        el.style.border = "2px solid #ffffff";
        el.style.boxShadow = "0 1px 3px rgba(0,0,0,0.4)";
        el.style.backgroundColor = isLive ? "#0d9488" : "#94a3b8";
        el.style.cursor = "pointer";

        const title = a.landing_center || a.reference_point || "Zone";
        const popup = new Popup({ offset: 12, maxWidth: "240px" }).setHTML(
          `<div style="font-size:13px;line-height:1.45;color:#1e293b">
            <strong>${escapeHtml(title)}</strong><br/>
            <span style="color:#475569">${escapeHtml(a.reference_point || "")}</span><br/>
            ${a.depth_m_range ? `Depth: ${escapeHtml(a.depth_m_range)} m<br/>` : ""}
            <span style="color:${isLive ? "#0f766e" : "#64748b"};font-size:11px;font-weight:600">
              ${isLive ? "Live" : "Mock"}
            </span>
          </div>`
        );

        return new Marker({ element: el })
          .setLngLat([a.longitude, a.latitude])
          .setPopup(popup)
          .addTo(map);
      });
    };

    if (map.isStyleLoaded()) {
      applyMarkers();
    } else {
      map.once("style.load", applyMarkers);
    }
  }, [advisories]);

  return (
    <div
      ref={containerRef}
      className="h-[500px] w-full rounded-xl overflow-hidden border border-slate-200"
    />
  );
}
