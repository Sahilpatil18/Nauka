"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import {
  upsertFishermanProfile,
  getFishermanProfile,
  submitKyc,
  listHarbours,
  Harbour,
  BoatType,
  DocumentStatus,
  ApiError,
} from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Label, inputClass, ErrorText, SuccessText, HelpText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";

const BOAT_TYPES: { value: BoatType; label: string }[] = [
  { value: "mechanized", label: "Mechanized (trawler, >40m)" },
  { value: "motorized", label: "Motorized (sub 20m)" },
  { value: "traditional", label: "Traditional / artisanal" },
];

const DOC_STATUS_TONE: Record<DocumentStatus, "slate" | "amber" | "green" | "red"> = {
  unverified: "slate",
  pending_review: "amber",
  verified: "green",
  rejected: "red",
};

const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
  unverified: "Not submitted",
  pending_review: "Pending review",
  verified: "Verified by a reviewer",
  rejected: "Rejected — needs correction",
};

export default function FishermanOnboardingPage() {
  const { user, setUser, loading } = useSession();
  const router = useRouter();

  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [homeHarbourId, setHomeHarbourId] = useState("");
  const [boatType, setBoatType] = useState<BoatType>("motorized");
  const [targetSpecies, setTargetSpecies] = useState("");
  const [boatRegistrationNo, setBoatRegistrationNo] = useState("");
  const [accessPassNo, setAccessPassNo] = useState("");
  const [highSeaPassNo, setHighSeaPassNo] = useState("");
  const [aadhaarLast4, setAadhaarLast4] = useState("");

  const [documentStatus, setDocumentStatus] = useState<DocumentStatus>("unverified");
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "fisherman")) {
      router.push("/login");
      return;
    }
    listHarbours().then((h) => {
      setHarbours(h);
      if (h.length) setHomeHarbourId(h[0].id);
    });
    if (user) {
      getFishermanProfile(user.id)
        .then((p) => {
          if (p.home_harbour_id) setHomeHarbourId(p.home_harbour_id);
          if (p.boat_type) setBoatType(p.boat_type);
          setTargetSpecies(p.target_species || "");
          setBoatRegistrationNo(p.boat_registration_no || "");
          setAccessPassNo(p.access_pass_no || "");
          setHighSeaPassNo(p.high_sea_pass_no || "");
          setDocumentStatus(p.document_status);
          setReviewNotes(p.document_review_notes);
          setSaved(true);
        })
        .catch(() => {
          // No profile yet — fine, this is a first-time visit.
        });
    }
  }, [loading, user, router]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const updated = await upsertFishermanProfile(user.id, {
        home_harbour_id: homeHarbourId || null,
        boat_type: boatType,
        target_species: targetSpecies || null,
        boat_registration_no: boatRegistrationNo || null,
        access_pass_no: accessPassNo || null,
        high_sea_pass_no: highSeaPassNo || null,
      });
      setDocumentStatus(updated.document_status);
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitKyc = async () => {
    setError("");
    setSubmitting(true);
    try {
      const updated = await submitKyc(user.id, aadhaarLast4 || undefined);
      setUser(updated);
      router.push("/fisherman/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Fisherman profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          PFZ and prices are browsable without this — complete your profile to log catches.
        </p>
      </div>

      <Card>
        <CardHeader title="Boat & operating details" />
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <Label htmlFor="homeHarbour">Home harbour</Label>
            <select id="homeHarbour" value={homeHarbourId} onChange={(e) => setHomeHarbourId(e.target.value)} className={inputClass}>
              {harbours.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="boatType">Boat type</Label>
            <select id="boatType" value={boatType} onChange={(e) => setBoatType(e.target.value as BoatType)} className={inputClass}>
              {BOAT_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="targetSpecies" hint="optional">Target species</Label>
            <input
              id="targetSpecies"
              value={targetSpecies}
              onChange={(e) => setTargetSpecies(e.target.value)}
              placeholder="Pomfret, Mackerel"
              className={inputClass}
            />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" loading={submitting}>
            Save profile
          </Button>
        </form>
      </Card>

      {saved && (
        <Card className="border-teal-200 bg-teal-50/50 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-slate-900 mb-1">Boat documents</h2>
              <p className="text-sm text-slate-600">
                These numbers can&apos;t be checked against ReALCraft or the Port Authority
                automatically — a harbour agent or admin reviews them by hand.
              </p>
            </div>
            <Badge tone={DOC_STATUS_TONE[documentStatus]}>{DOC_STATUS_LABEL[documentStatus]}</Badge>
          </div>

          {documentStatus === "rejected" && reviewNotes && (
            <HelpText>Reviewer note: {reviewNotes}</HelpText>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="boatReg" hint="optional">Boat reg. no.</Label>
                <input id="boatReg" value={boatRegistrationNo} onChange={(e) => setBoatRegistrationNo(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="accessPass" hint="optional">Access pass no.</Label>
                <input id="accessPass" value={accessPassNo} onChange={(e) => setAccessPassNo(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="highSeaPass" hint="optional">High sea pass no.</Label>
                <input id="highSeaPass" value={highSeaPassNo} onChange={(e) => setHighSeaPassNo(e.target.value)} className={inputClass} />
              </div>
            </div>
            <Button type="submit" variant="secondary" loading={submitting}>
              {documentStatus === "unverified" ? "Submit documents for review" : "Update & resubmit"}
            </Button>
          </form>

          <div className="border-t border-teal-200/60 pt-4">
            <h2 className="font-medium text-slate-900 mb-1">Complete KYC</h2>
            <p className="text-sm text-slate-600 mb-3">
              Required before logging catches — browsing PFZ and prices doesn&apos;t need this,
              and it doesn&apos;t require document review to be finished.
            </p>
            <div className="mb-4">
              <Label htmlFor="aadhaar" hint="last 4 digits only">Aadhaar</Label>
              <input
                id="aadhaar"
                maxLength={4}
                value={aadhaarLast4}
                onChange={(e) => setAadhaarLast4(e.target.value.replace(/\D/g, ""))}
                placeholder="1234"
                className={`${inputClass} max-w-[120px]`}
              />
            </div>
            <Button onClick={handleSubmitKyc} loading={submitting}>
              Submit KYC (dev stub)
            </Button>
          </div>
        </Card>
      )}

      {user.kyc_status === "full_kyc" && (
        <SuccessText>
          KYC complete — go to your{" "}
          <a href="/fisherman/dashboard" className="underline font-medium">
            dashboard
          </a>
          .
        </SuccessText>
      )}
    </div>
  );
}
