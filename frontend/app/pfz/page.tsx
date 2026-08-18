"use client";

import { useEffect, useState } from "react";
import { getPfz, PFZAdvisory, ApiError } from "@/lib/api";

export default function PfzPage() {
  const [advisories, setAdvisories] = useState<PFZAdvisory[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPfz()
      .then(setAdvisories)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not reach the API"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Potential Fishing Zones</h1>
        <p className="text-sm text-gray-500 mt-1">
          INCOIS PFZ passthrough with SST / chlorophyll overlays. No scoring model yet — this is
          the raw advisory list (decision #4).
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid sm:grid-cols-2 gap-4">
        {advisories.map((a) => (
          <div key={a.id} className="bg-white border rounded-lg p-4">
            <h2 className="font-medium">{a.reference_point || `${a.latitude}, ${a.longitude}`}</h2>
            <p className="text-xs text-gray-400">
              {a.latitude.toFixed(2)}, {a.longitude.toFixed(2)} · source: {a.source}
            </p>
            <div className="mt-2 text-sm text-gray-700 space-y-1">
              {a.sea_surface_temp_c != null && <p>SST: {a.sea_surface_temp_c}°C</p>}
              {a.chlorophyll_mg_m3 != null && <p>Chlorophyll: {a.chlorophyll_mg_m3} mg/m³</p>}
            </div>
            {a.alert_message && (
              <p className="mt-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                {a.alert_severity}: {a.alert_message}
              </p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              Valid {new Date(a.valid_from).toLocaleDateString()} – {new Date(a.valid_to).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
