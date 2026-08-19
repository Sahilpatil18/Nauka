"use client";

import { useEffect, useState } from "react";
import { getPriceIndex, PriceIndexEntry, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorText, HelpText } from "@/components/ui/Field";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

const TREND_TONE: Record<string, "green" | "red" | "slate"> = {
  rising: "green",
  falling: "red",
  flat: "slate",
  insufficient_data: "slate",
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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Harbour Price Index</h1>
        <p className="text-sm text-slate-500 mt-1">
          Latest wholesale price per species per harbour, with a 7-day trend.
        </p>
      </div>

      <HelpText>
        Manually entered by field agents/admins in Phase 1 (decision #5) — not a live feed yet.
      </HelpText>

      {error && <ErrorText>{error}</ErrorText>}

      {loading ? (
        <LoadingRows count={5} />
      ) : entries.length === 0 ? (
        <Card>
          <EmptyState title="No price records entered yet" />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[640px]">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 sm:px-5 py-3">Species</th>
                  <th className="px-4 sm:px-5 py-3">Harbour</th>
                  <th className="px-4 sm:px-5 py-3">Date</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Min ₹/kg</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Max ₹/kg</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Avg ₹/kg</th>
                  <th className="px-4 sm:px-5 py-3">Trend</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {entries.map((e) => (
                  <tr key={`${e.species}-${e.harbour_id}`} className="hover:bg-slate-50/60">
                    <td className="px-4 sm:px-5 py-3 font-medium text-slate-900">{e.species}</td>
                    <td className="px-4 sm:px-5 py-3 text-slate-600">{e.harbour_name}</td>
                    <td className="px-4 sm:px-5 py-3 text-slate-500">{e.latest_date}</td>
                    <td className="px-4 sm:px-5 py-3 text-right text-slate-600 tabular-nums">{e.min_price_per_kg}</td>
                    <td className="px-4 sm:px-5 py-3 text-right text-slate-600 tabular-nums">{e.max_price_per_kg}</td>
                    <td className="px-4 sm:px-5 py-3 text-right font-medium text-slate-900 tabular-nums">
                      {e.avg_price_per_kg}
                    </td>
                    <td className="px-4 sm:px-5 py-3">
                      <Badge tone={TREND_TONE[e.trend_7day]}>
                        {TREND_ARROW[e.trend_7day]} {e.trend_7day.replace("_", " ")}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
