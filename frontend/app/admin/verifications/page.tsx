"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { listPendingReviews, reviewDocuments, PendingReview, ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { ErrorText, HelpText, inputClass } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import { EmptyState, LoadingRows } from "@/components/ui/EmptyState";

export default function AdminVerificationsPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const [pending, setPending] = useState<PendingReview[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState("");
  const [notesById, setNotesById] = useState<Record<string, string>>({});
  const [actingOn, setActingOn] = useState<string | null>(null);

  const refresh = useCallback(async (reviewerId: string) => {
    setPending(await listPendingReviews(reviewerId));
  }, []);

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/login");
      return;
    }
    if (user) {
      // Standard fetch-on-mount pattern; see lib/session.tsx for why this rule is disabled here.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refresh(user.id)
        .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load"))
        .finally(() => setDataLoading(false));
    }
  }, [loading, user, router, refresh]);

  if (!user) return null;

  const handleReview = async (fishermanProfileId: string, status: "verified" | "rejected") => {
    setError("");
    setActingOn(fishermanProfileId);
    try {
      await reviewDocuments(fishermanProfileId, user.id, status, notesById[fishermanProfileId]);
      await refresh(user.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save review");
    } finally {
      setActingOn(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Document verification queue</h1>
        <p className="text-sm text-slate-500 mt-1">
          Boat registration, access pass, and high sea pass numbers, self-reported by fishermen.
        </p>
      </div>

      <HelpText>
        There is no ReALCraft or Port Authority API to check these against — this is a manual,
        human judgment call. Verify against paperwork you can actually see, in person or on a call.
      </HelpText>

      {error && <ErrorText>{error}</ErrorText>}

      {dataLoading ? (
        <LoadingRows count={3} />
      ) : pending.length === 0 ? (
        <Card>
          <EmptyState title="Nothing pending" description="New document submissions will show up here." />
        </Card>
      ) : (
        <div className="space-y-4">
          {pending.map((p) => (
            <Card key={p.fisherman_profile_id}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{p.phone_number}</p>
                  <dl className="mt-2 grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <dt className="text-slate-400 text-xs">Boat reg. no.</dt>
                      <dd className="text-slate-700">{p.boat_registration_no || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 text-xs">Access pass</dt>
                      <dd className="text-slate-700">{p.access_pass_no || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-slate-400 text-xs">High sea pass</dt>
                      <dd className="text-slate-700">{p.high_sea_pass_no || "—"}</dd>
                    </div>
                  </dl>
                </div>
              </div>

              <div className="mt-4">
                <input
                  placeholder="Notes (optional — shown to the fisherman if rejected)"
                  value={notesById[p.fisherman_profile_id] || ""}
                  onChange={(e) =>
                    setNotesById((prev) => ({ ...prev, [p.fisherman_profile_id]: e.target.value }))
                  }
                  className={inputClass}
                />
              </div>

              <div className="mt-4 flex gap-3">
                <Button
                  size="sm"
                  loading={actingOn === p.fisherman_profile_id}
                  onClick={() => handleReview(p.fisherman_profile_id, "verified")}
                >
                  Verify
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  loading={actingOn === p.fisherman_profile_id}
                  onClick={() => handleReview(p.fisherman_profile_id, "rejected")}
                >
                  Reject
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
