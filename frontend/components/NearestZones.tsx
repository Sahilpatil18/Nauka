"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import { getFishermanProfile, getPfzNearHarbour, listHarbours, PFZAdvisoryWithDistance, ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { HelpText } from "@/components/ui/Field";
import Badge from "@/components/ui/Badge";
import { LoadingRows } from "@/components/ui/EmptyState";

/**
 * Real haversine distance from a fisherman's home harbour to every current
 * PFZ zone — see backend app/api/pfz.py's /pfz/near-harbour route for why
 * this stops at distance + freshness and doesn't predict species or a
 * "safe range" (no real data source for either). Renders nothing for
 * non-fishermen or fishermen without a home harbour set, so it's safe to
 * drop into any page.
 */
export default function NearestZones({ showViewAllLink = true }: { showViewAllLink?: boolean }) {
  const { user } = useSession();
  const { t } = useLanguage();

  const [homeHarbourName, setHomeHarbourName] = useState<string | null>(null);
  const [zones, setZones] = useState<PFZAdvisoryWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!user || user.role !== "fisherman") {
      // Standard fetch-on-mount pattern; see lib/session.tsx for why this rule is disabled here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [profile, harbours] = await Promise.all([getFishermanProfile(user.id), listHarbours()]);
        if (!profile.home_harbour_id) {
          if (!cancelled) setNote(t("recommended.no_harbour"));
          return;
        }
        const harbourName = harbours.find((h) => h.id === profile.home_harbour_id)?.name ?? null;
        const nearby = await getPfzNearHarbour(profile.home_harbour_id);
        if (!cancelled) {
          setHomeHarbourName(harbourName);
          setZones(nearby.slice(0, 5));
        }
      } catch (err) {
        if (!cancelled) {
          setNote(err instanceof ApiError && err.status === 404 ? t("recommended.no_coords") : t("common.error_network"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, t]);

  if (!user || user.role !== "fisherman") return null;

  return (
    <Card>
      <CardHeader
        title={t("recommended.header")}
        description={homeHarbourName ? t("recommended.desc", { harbour: homeHarbourName }) : undefined}
      />
      {loading ? (
        <LoadingRows count={3} />
      ) : zones.length > 0 ? (
        <>
          <ul className="divide-y divide-slate-100">
            {zones.map((z) => (
              <li key={z.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">{z.landing_center || z.reference_point}</p>
                  <p className="text-xs text-slate-500">{z.direction} · {z.depth_m_range} m depth</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-slate-700 tabular-nums">
                    {t("recommended.distance_km", { km: z.distance_km })}
                  </span>
                  {z.is_live ? <Badge tone="green">{t("pfz.badge_live")}</Badge> : <Badge tone="slate">{t("pfz.badge_mock")}</Badge>}
                </div>
              </li>
            ))}
          </ul>
          {showViewAllLink && (
            <div className="mt-3">
              <Link href="/pfz" className="text-sm font-medium text-teal-700 hover:text-teal-800">
                {t("recommended.view_all")}
              </Link>
            </div>
          )}
        </>
      ) : (
        <HelpText>{note}</HelpText>
      )}
    </Card>
  );
}
