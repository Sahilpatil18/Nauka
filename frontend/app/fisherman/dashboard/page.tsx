"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import { logCatch, listCatchLogs, listHarbours, CatchLog, Harbour, ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Label, inputClass, ErrorText, SuccessText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";
import NearestZones from "@/components/NearestZones";

const nowForInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function FishermanDashboardPage() {
  const { user, loading } = useSession();
  const { t } = useLanguage();
  const router = useRouter();

  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [logs, setLogs] = useState<CatchLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [species, setSpecies] = useState("");
  const [quantityKg, setQuantityKg] = useState("");
  const [harbourId, setHarbourId] = useState("");
  const [recordedAt, setRecordedAt] = useState(nowForInput());
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async (userId: string) => {
    const [h, l] = await Promise.all([listHarbours(), listCatchLogs(userId)]);
    setHarbours(h);
    setLogs(l);
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== "fisherman")) {
      router.push("/login");
      return;
    }
    if (user) {
      if (user.kyc_status !== "full_kyc") {
        router.push("/fisherman/onboarding");
        return;
      }
      // Standard fetch-on-mount pattern; see lib/session.tsx for why this rule is disabled here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh(user.id)
        .catch((err) => setError(err instanceof ApiError ? err.message : t("fishermanDashboard.error_load")))
        .finally(() => setDataLoading(false));
    }
  }, [loading, user, router, refresh, t]);

  if (!user) return null;

  const handleLogCatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      await logCatch(user.id, {
        species,
        quantity_kg: Number(quantityKg),
        harbour_id: harbourId || null,
        device_recorded_at: new Date(recordedAt).toISOString(),
      });
      setMessage(t("fishermanDashboard.logged_success", { qty: quantityKg, species }));
      setSpecies("");
      setQuantityKg("");
      setRecordedAt(nowForInput());
      await refresh(user.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("fishermanDashboard.error_log"));
    } finally {
      setSubmitting(false);
    }
  };

  const harbourName = (id: string | null) => harbours.find((h) => h.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t("fishermanDashboard.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("fishermanDashboard.subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pfz">
            <Button variant="secondary" size="sm">{t("fishermanDashboard.pfz_button")}</Button>
          </Link>
          <Link href="/prices">
            <Button variant="secondary" size="sm">{t("fishermanDashboard.prices_button")}</Button>
          </Link>
        </div>
      </div>

      <NearestZones />

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 h-fit">
          <CardHeader title={t("fishermanDashboard.log_catch_header")} />
          <form onSubmit={handleLogCatch} className="space-y-4">
            <div>
              <Label htmlFor="species">{t("fishermanDashboard.species")}</Label>
              <input id="species" required value={species} onChange={(e) => setSpecies(e.target.value)} placeholder={t("fishermanDashboard.species_placeholder")} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="qty">{t("fishermanDashboard.quantity_kg")}</Label>
              <input
                id="qty"
                type="number"
                required
                min={0}
                step="0.1"
                value={quantityKg}
                onChange={(e) => setQuantityKg(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <Label htmlFor="harbour" hint={t("fishermanDashboard.optional")}>{t("fishermanDashboard.landing_harbour")}</Label>
              <select id="harbour" value={harbourId} onChange={(e) => setHarbourId(e.target.value)} className={inputClass}>
                <option value="">{t("fishermanDashboard.not_specified")}</option>
                {harbours.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="recordedAt">{t("fishermanDashboard.catch_time")}</Label>
              <input
                id="recordedAt"
                type="datetime-local"
                required
                value={recordedAt}
                onChange={(e) => setRecordedAt(e.target.value)}
                className={inputClass}
              />
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            {message && <SuccessText>{message}</SuccessText>}
            <Button type="submit" loading={submitting} fullWidth>
              {t("fishermanDashboard.log_catch_button")}
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader title={t("fishermanDashboard.catch_history_header", { count: logs.length })} />
            {dataLoading ? (
              <LoadingRows count={4} />
            ) : logs.length === 0 ? (
              <EmptyState title={t("fishermanDashboard.no_catches_title")} description={t("fishermanDashboard.no_catches_desc")} />
            ) : (
              <ul className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <li key={l.id} className="py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {l.species} — {l.quantity_kg}kg
                      </p>
                      <p className="text-xs text-slate-500">
                        {harbourName(l.harbour_id)} · {new Date(l.device_recorded_at).toLocaleString()}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
