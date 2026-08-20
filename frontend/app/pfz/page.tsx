"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { getPfz, PFZAdvisory, ApiError } from "@/lib/api";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { ErrorText, HelpText, inputClass } from "@/components/ui/Field";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import NearestZones from "@/components/NearestZones";

// MapLibre needs the DOM/WebGL — never render it during SSR.
const PfzMap = dynamic(() => import("@/components/PfzMap"), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center text-sm text-slate-400">
      Loading map…
    </div>
  ),
});

function formatValidityDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" });
}

function formatSourceUpdatedAt(iso: string, locale: string) {
  return (
    new Date(iso).toLocaleString(locale, {
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

export default function PfzPage() {
  const { t, language } = useLanguage();
  const locale = language === "mr" ? "mr-IN" : "en-IN";
  const dataQualityBadge = (a: PFZAdvisory) => {
    const zoneIsReal = a.source.includes("real PFZ advisory");
    return zoneIsReal ? <Badge tone="green">{t("pfz.badge_live")}</Badge> : <Badge tone="slate">{t("pfz.badge_mock")}</Badge>;
  };

  const [advisories, setAdvisories] = useState<PFZAdvisory[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"table" | "map">("table");

  useEffect(() => {
    getPfz()
      .then(setAdvisories)
      .catch((err) => setError(err instanceof ApiError ? err.message : t("common.error_network")))
      .finally(() => setLoading(false));
  }, [t]);

  const query = search.trim().toLowerCase();
  const filteredAdvisories = query
    ? advisories.filter((a) => (a.landing_center || a.reference_point || "").toLowerCase().includes(query))
    : advisories;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t("pfz.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">
          {advisories.length > 0
            ? t("pfz.subtitle_with_count", { count: advisories.length })
            : t("pfz.subtitle_no_count")}
        </p>
      </div>

      <NearestZones showViewAllLink={false} />

      {advisories.length > 0 && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-6 py-4 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-800">{t("pfz.banner_state")}</p>
          <p className="text-sm font-bold uppercase tracking-wide text-slate-800 mt-1">
            {t("pfz.banner_validity", {
              from: formatValidityDate(advisories[0].valid_from, locale),
              to: formatValidityDate(advisories[0].valid_to, locale),
            })}
          </p>
          {advisories[0].source_updated_at && (
            <p className="text-xs font-medium text-amber-700 mt-2">
              {t("pfz.banner_updated", { time: formatSourceUpdatedAt(advisories[0].source_updated_at, locale) })}
            </p>
          )}
        </div>
      )}

      <HelpText>{t("pfz.help_text")}</HelpText>

      {error && <ErrorText>{error}</ErrorText>}

      {!loading && advisories.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="max-w-sm w-full">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("pfz.search_placeholder")}
              className={inputClass}
            />
          </div>
          <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white">
            <Button
              type="button"
              size="sm"
              variant={view === "table" ? "primary" : "ghost"}
              onClick={() => setView("table")}
            >
              {t("pfz.table_view")}
            </Button>
            <Button type="button" size="sm" variant={view === "map" ? "primary" : "ghost"} onClick={() => setView("map")}>
              {t("pfz.map_view")}
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <LoadingRows count={4} />
      ) : advisories.length === 0 ? (
        <Card>
          <EmptyState title={t("pfz.no_advisories")} />
        </Card>
      ) : filteredAdvisories.length === 0 ? (
        <Card>
          <EmptyState title={t("pfz.no_match_title")} description={t("pfz.no_match_desc", { search })} />
        </Card>
      ) : view === "map" ? (
        <PfzMap advisories={filteredAdvisories} />
      ) : (
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-auto max-h-[70vh]">
            <table className="w-full text-sm min-w-[920px]">
              <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                <tr>
                  <th className="px-4 sm:px-5 py-3">{t("pfz.col_from_coast")}</th>
                  <th className="px-4 sm:px-5 py-3">{t("pfz.col_direction")}</th>
                  <th className="px-4 sm:px-5 py-3 text-right">{t("pfz.col_bearing")}</th>
                  <th className="px-4 sm:px-5 py-3 text-right">{t("pfz.col_distance")}</th>
                  <th className="px-4 sm:px-5 py-3 text-right">{t("pfz.col_depth")}</th>
                  <th className="px-4 sm:px-5 py-3">{t("pfz.col_latitude")}</th>
                  <th className="px-4 sm:px-5 py-3">{t("pfz.col_longitude")}</th>
                  <th className="px-4 sm:px-5 py-3">{t("pfz.col_data")}</th>
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
