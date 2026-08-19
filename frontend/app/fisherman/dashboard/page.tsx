"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "@/lib/session";
import { logCatch, listCatchLogs, listHarbours, CatchLog, Harbour, ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Label, inputClass, ErrorText, SuccessText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";

const nowForInput = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

export default function FishermanDashboardPage() {
  const { user, loading } = useSession();
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
        .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
        .finally(() => setDataLoading(false));
    }
  }, [loading, user, router, refresh]);

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
      setMessage(`Logged ${quantityKg}kg of ${species}.`);
      setSpecies("");
      setQuantityKg("");
      setRecordedAt(nowForInput());
      await refresh(user.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not log catch");
    } finally {
      setSubmitting(false);
    }
  };

  const harbourName = (id: string | null) => harbours.find((h) => h.id === id)?.name ?? "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">My catches</h1>
          <p className="text-sm text-slate-500 mt-1">Log your catch and keep a trip history.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/pfz">
            <Button variant="secondary" size="sm">PFZ</Button>
          </Link>
          <Link href="/prices">
            <Button variant="secondary" size="sm">Prices</Button>
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-2 h-fit">
          <CardHeader title="Log a catch" />
          <form onSubmit={handleLogCatch} className="space-y-4">
            <div>
              <Label htmlFor="species">Species</Label>
              <input id="species" required value={species} onChange={(e) => setSpecies(e.target.value)} placeholder="Pomfret" className={inputClass} />
            </div>
            <div>
              <Label htmlFor="qty">Quantity (kg)</Label>
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
              <Label htmlFor="harbour" hint="optional">Landing harbour</Label>
              <select id="harbour" value={harbourId} onChange={(e) => setHarbourId(e.target.value)} className={inputClass}>
                <option value="">Not specified</option>
                {harbours.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="recordedAt">Catch time</Label>
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
              Log catch
            </Button>
          </form>
        </Card>

        <div className="lg:col-span-3">
          <Card>
            <CardHeader title={`Catch history (${logs.length})`} />
            {dataLoading ? (
              <LoadingRows count={4} />
            ) : logs.length === 0 ? (
              <EmptyState title="No catches logged yet" description="Your logged catches will appear here." />
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
