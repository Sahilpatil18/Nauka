"use client";

import { useEffect, useState } from "react";
import { getPfz, PFZAdvisory, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorText, HelpText, inputClass } from "@/components/ui/Field";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

function formatValidityDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function formatSourceUpdatedAt(iso: string) {
  return (
    new Date(iso).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }) + " IST"
  );
}

function dataQualityBadge(a: PFZAdvisory) {
  const zoneIsReal = a.source.includes("real PFZ advisory");
  return zoneIsReal ? <Badge tone="green">Live</Badge> : <Badge tone="slate">Mock</Badge>;
}

export default function PfzPage() {
  const [advisories, setAdvisories] = useState<PFZAdvisory[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    getPfz()
      .then(setAdvisories)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not reach the API"))
      .finally(() => setLoading(false));
  }, []);

  const query = search.trim().toLowerCase();
  const filteredAdvisories = query
    ? advisories.filter((a) => (a.landing_center || a.reference_point || "").toLowerCase().includes(query))
    : advisories;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Potential Fishing Zones</h1>
        <p className="text-sm text-slate-500 mt-1">
          Every zone INCOIS currently publishes for Maharashtra
          {advisories.length > 0 && ` — ${advisories.length} zones`}. Rows near one of our named
          harbours are labeled where that adds real information; the rest are shown as-is.
        </p>
      </div>

      {advisories.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-800">Maharashtra</p>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-800 mt-1">
            Forecast validity from {formatValidityDate(advisories[0].valid_from)} to{" "}
            {formatValidityDate(advisories[0].valid_to)}
          </p>
          {advisories[0].source_updated_at && (
            <p className="text-xs font-medium text-amber-700 mt-2">
              INCOIS data updated on: {formatSourceUpdatedAt(advisories[0].source_updated_at)}
            </p>
          )}
        </div>
      )}

      <HelpText>
        Zone position/bearing/distance is pulled live from INCOIS&apos;s public advisory page where
        available; not every zone has real data, so some rows fall back to a clearly-marked
        estimate — check the badge on each row, and hover it for the exact source.
      </HelpText>

      {error && <ErrorText>{error}</ErrorText>}

      {!loading && advisories.length > 0 && (
        <div className="max-w-sm">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by coast name (e.g. Satpati, Arnala)"
            className={inputClass}
          />
        </div>
      )}

      {loading ? (
        <LoadingRows count={4} />
      ) : advisories.length === 0 ? (
        <Card>
          <EmptyState title="No advisories available" />
        </Card>
      ) : filteredAdvisories.length === 0 ? (
        <Card>
          <EmptyState title="No matching coast" description={`Nothing matches "${search}" — try a different name.`} />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 sm:px-5 py-3">From the coast of</th>
                  <th className="px-4 sm:px-5 py-3">Direction</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Bearing (deg)</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Distance (km) From-To</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Depth (mtr) From-To</th>
                  <th className="px-4 sm:px-5 py-3">Latitude (dms)</th>
                  <th className="px-4 sm:px-5 py-3">Longitude (dms)</th>
                  <th className="px-4 sm:px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAdvisories.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60">
                    <td className="px-4 sm:px-5 py-3 font-medium text-slate-900">
                      {a.landing_center || a.reference_point || "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-slate-600">{a.direction || "—"}</td>
                    <td className="px-4 sm:px-5 py-3 text-right text-slate-600 tabular-nums">
                      {a.bearing_deg ?? "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-right text-slate-600 tabular-nums">
                      {a.distance_km_range || "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-right text-slate-600 tabular-nums">
                      {a.depth_m_range || "—"}
                    </td>
                    <td className="px-4 sm:px-5 py-3 text-slate-600 whitespace-nowrap">{a.latitude_dms || "—"}</td>
                    <td className="px-4 sm:px-5 py-3 text-slate-600 whitespace-nowrap">{a.longitude_dms || "—"}</td>
                    <td className="px-4 sm:px-5 py-3" title={a.source}>
                      {dataQualityBadge(a)}
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
