"use client";

import { useEffect, useState } from "react";
import { getPfz, PFZAdvisory, ApiError } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { ErrorText, HelpText } from "@/components/ui/Field";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";

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
          INCOIS PFZ advisories with sea surface temperature and chlorophyll overlays.
        </p>
      </div>

      <HelpText>
        No scoring model yet — this is the raw advisory passthrough (decision #4 in
        docs/phase1_decisions.md).
      </HelpText>

      {error && <ErrorText>{error}</ErrorText>}

      {loading ? (
        <LoadingRows count={4} />
      ) : advisories.length === 0 ? (
        <Card>
          <EmptyState title="No advisories available" />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {advisories.map((a) => (
            <Card key={a.id}>
              <h2 className="font-medium text-slate-900 leading-snug">
                {a.reference_point || `${a.latitude}, ${a.longitude}`}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {a.latitude.toFixed(2)}, {a.longitude.toFixed(2)} · {a.source}
              </p>

              <div className="mt-4 grid grid-cols-2 gap-3">
                {a.sea_surface_temp_c != null && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">SST</p>
                    <p className="text-sm font-semibold text-slate-900">{a.sea_surface_temp_c}°C</p>
                  </div>
                )}
                {a.chlorophyll_mg_m3 != null && (
                  <div className="rounded-lg bg-slate-50 px-3 py-2">
                    <p className="text-xs text-slate-500">Chlorophyll</p>
                    <p className="text-sm font-semibold text-slate-900">{a.chlorophyll_mg_m3} mg/m³</p>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
                Valid {new Date(a.valid_from).toLocaleDateString()} – {new Date(a.valid_to).toLocaleDateString()}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
