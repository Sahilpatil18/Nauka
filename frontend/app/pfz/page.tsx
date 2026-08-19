"use client";

import { useEffect, useState } from "react";
import { getPfz, PFZAdvisory, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorText, HelpText } from "@/components/ui/Field";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";

function formatValidityDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function dataQualityBadge(a: PFZAdvisory) {
  const zoneIsReal = a.source.includes("real PFZ advisory");
  const tempIsReal = a.source.toLowerCase().includes("real erddap") || a.source.toLowerCase().includes("real temperature");

  if (zoneIsReal && tempIsReal) return <Badge tone="green">Live zone + temp</Badge>;
  if (zoneIsReal) return <Badge tone="teal">Live zone</Badge>;
  if (tempIsReal) return <Badge tone="teal">Live temp</Badge>;
  return <Badge tone="slate">Mock</Badge>;
}

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
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Potential Fishing Zones</h1>
        <p className="text-sm text-slate-500 mt-1">
          Maharashtra PFZ advisories — the same data INCOIS publishes, matched to our harbours.
        </p>
      </div>

      {advisories.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-800">Maharashtra</p>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-800 mt-1">
            Forecast validity from {formatValidityDate(advisories[0].valid_from)} to{" "}
            {formatValidityDate(advisories[0].valid_to)}
          </p>
        </div>
      )}

      <HelpText>
        Zone position/bearing/distance is pulled live from INCOIS&apos;s public advisory page where
        available; temperature is cross-checked against their public ERDDAP server. Neither always
        has coverage for every zone, so some rows fall back to a clearly-marked estimate — check
        the badge on each row, and hover it for the exact source. Chlorophyll is always an estimate;
        no live public feed exists for it.
      </HelpText>

      {error && <ErrorText>{error}</ErrorText>}

      {loading ? (
        <LoadingRows count={4} />
      ) : advisories.length === 0 ? (
        <Card>
          <EmptyState title="No advisories available" />
        </Card>
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 sm:px-5 py-3">From the coast of</th>
                  <th className="px-4 sm:px-5 py-3">Direction</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Bearing (deg)</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Distance (km) From-To</th>
                  <th className="px-4 sm:px-5 py-3 text-right">Depth (mtr) From-To</th>
                  <th className="px-4 sm:px-5 py-3">Latitude (dms)</th>
                  <th className="px-4 sm:px-5 py-3">Longitude (dms)</th>
                  <th className="px-4 sm:px-5 py-3 text-right">SST</th>
                  <th className="px-4 sm:px-5 py-3">Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {advisories.map((a) => (
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
                    <td className="px-4 sm:px-5 py-3 text-right font-medium text-slate-900 tabular-nums">
                      {a.sea_surface_temp_c != null ? `${a.sea_surface_temp_c}°C` : "—"}
                    </td>
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
