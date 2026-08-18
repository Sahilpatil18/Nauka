"use client";

import { useEffect, useState } from "react";
import { getPriceIndex, PriceIndexEntry, ApiError } from "@/lib/api";

const TREND_STYLE: Record<string, string> = {
  rising: "text-green-700 bg-green-50 border-green-200",
  falling: "text-red-700 bg-red-50 border-red-200",
  flat: "text-gray-600 bg-gray-50 border-gray-200",
  insufficient_data: "text-gray-400 bg-gray-50 border-gray-200",
};

const TREND_ARROW: Record<string, string> = {
  rising: "↑",
  falling: "↓",
  flat: "→",
  insufficient_data: "?",
};

export default function PricesPage() {
  const [entries, setEntries] = useState<PriceIndexEntry[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPriceIndex()
      .then(setEntries)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not reach the API"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Harbour Price Index</h1>
        <p className="text-sm text-gray-500 mt-1">
          Latest wholesale price per species per harbour, with a 7-day trend. Manually entered
          by field agents/admins in Phase 1 (decision #5) — not a live feed yet.
        </p>
      </div>

      {loading && <p className="text-sm text-gray-500">Loading...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && entries.length === 0 && (
        <p className="text-sm text-gray-500">No price records entered yet.</p>
      )}

      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Species</th>
              <th className="px-4 py-2">Harbour</th>
              <th className="px-4 py-2">Date</th>
              <th className="px-4 py-2">Min ₹/kg</th>
              <th className="px-4 py-2">Max ₹/kg</th>
              <th className="px-4 py-2">Avg ₹/kg</th>
              <th className="px-4 py-2">Trend</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={`${e.species}-${e.harbour_id}`} className="border-t">
                <td className="px-4 py-2 font-medium">{e.species}</td>
                <td className="px-4 py-2">{e.harbour_name}</td>
                <td className="px-4 py-2">{e.latest_date}</td>
                <td className="px-4 py-2">{e.min_price_per_kg}</td>
                <td className="px-4 py-2">{e.max_price_per_kg}</td>
                <td className="px-4 py-2">{e.avg_price_per_kg}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block border rounded px-2 py-0.5 text-xs ${TREND_STYLE[e.trend_7day]}`}>
                    {TREND_ARROW[e.trend_7day]} {e.trend_7day.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
