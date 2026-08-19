"use client";

import { useEffect, useRef } from "react";
import { Map, Marker, NavigationControl, Popup, type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { PFZAdvisory } from "@/lib/api";

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    advisories.forEach((a) => {
      const isLive = a.source.includes("real PFZ advisory");
      const title = escapeHtml(a.landing_center || a.reference_point || "Zone");
      const detail = escapeHtml(a.reference_point || "");
      const depth = a.depth_m_range ? `Depth: ${escapeHtml(a.depth_m_range)} m<br/>` : "";
      const popupHtml = `
        <div style="font-size:13px;line-height:1.45;color:#1e293b">
          <strong>${title}</strong><br/>
          <span style="color:#475569">${detail}</span><br/>
          ${depth}
          <span style="color:${isLive ? "#0f766e" : "#64748b"};font-size:11px;font-weight:600">
            ${isLive ? "Live" : "Mock"}
          </span>
        </div>
      `;

      const marker = new Marker({ color: isLive ? "#0d9488" : "#94a3b8" })
        .setLngLat([a.longitude, a.latitude])
        .setPopup(new Popup({ offset: 18, maxWidth: "240px" }).setHTML(popupHtml))
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [advisories]);

  return (
    <div
      ref={containerRef}
      className="h-[500px] w-full rounded-xl overflow-hidden border border-slate-200"
    />
  );
}
