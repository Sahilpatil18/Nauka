"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
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

const DOC_STATUS_TONE: Record<DocumentStatus, "slate" | "amber" | "green" | "red"> = {
  unverified: "slate",
  pending_review: "amber",
  verified: "green",
  rejected: "red",
};

export default function FishermanOnboardingPage() {
  const { user, setUser, loading } = useSession();
  const { t } = useLanguage();
  const router = useRouter();

  const BOAT_TYPES: { value: BoatType; label: string }[] = [
    { value: "mechanized", label: t("fishermanOnboarding.boat_type.mechanized") },
    { value: "motorized", label: t("fishermanOnboarding.boat_type.motorized") },
    { value: "traditional", label: t("fishermanOnboarding.boat_type.traditional") },
  ];

  const DOC_STATUS_LABEL: Record<DocumentStatus, string> = {
    unverified: t("fishermanOnboarding.doc_status.unverified"),
    pending_review: t("fishermanOnboarding.doc_status.pending_review"),
    verified: t("fishermanOnboarding.doc_status.verified"),
    rejected: t("fishermanOnboarding.doc_status.rejected"),
  };

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
      setError(err instanceof ApiError ? err.message : t("fishermanOnboarding.error_save"));
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
      setError(err instanceof ApiError ? err.message : t("fishermanOnboarding.error_kyc"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{t("fishermanOnboarding.title")}</h1>
        <p className="text-sm text-slate-500 mt-1">{t("fishermanOnboarding.subtitle")}</p>
      </div>

      <Card>
        <CardHeader title={t("fishermanOnboarding.boat_details_header")} />
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <Label htmlFor="homeHarbour">{t("fishermanOnboarding.home_harbour")}</Label>
            <select id="homeHarbour" value={homeHarbourId} onChange={(e) => setHomeHarbourId(e.target.value)} className={inputClass}>
              {harbours.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="boatType">{t("fishermanOnboarding.boat_type")}</Label>
            <select id="boatType" value={boatType} onChange={(e) => setBoatType(e.target.value as BoatType)} className={inputClass}>
              {BOAT_TYPES.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label htmlFor="targetSpecies" hint={t("fishermanOnboarding.optional")}>{t("fishermanOnboarding.target_species")}</Label>
            <input
              id="targetSpecies"
              value={targetSpecies}
              onChange={(e) => setTargetSpecies(e.target.value)}
              placeholder={t("fishermanOnboarding.target_species_placeholder")}
              className={inputClass}
            />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" loading={submitting}>
            {t("fishermanOnboarding.save_profile")}
          </Button>
        </form>
      </Card>

      {saved && (
        <Card className="border-teal-200 bg-teal-50/50 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="font-medium text-slate-900 mb-1">{t("fishermanOnboarding.documents_header")}</h2>
              <p className="text-sm text-slate-600">{t("fishermanOnboarding.documents_desc")}</p>
            </div>
            <Badge tone={DOC_STATUS_TONE[documentStatus]}>{DOC_STATUS_LABEL[documentStatus]}</Badge>
          </div>

          {documentStatus === "rejected" && reviewNotes && (
            <HelpText>{t("fishermanOnboarding.reviewer_note", { note: reviewNotes })}</HelpText>
          )}

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="boatReg" hint={t("fishermanOnboarding.optional")}>{t("fishermanOnboarding.boat_reg_no")}</Label>
                <input id="boatReg" value={boatRegistrationNo} onChange={(e) => setBoatRegistrationNo(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="accessPass" hint={t("fishermanOnboarding.optional")}>{t("fishermanOnboarding.access_pass_no")}</Label>
                <input id="accessPass" value={accessPassNo} onChange={(e) => setAccessPassNo(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label htmlFor="highSeaPass" hint={t("fishermanOnboarding.optional")}>{t("fishermanOnboarding.high_sea_pass_no")}</Label>
                <input id="highSeaPass" value={highSeaPassNo} onChange={(e) => setHighSeaPassNo(e.target.value)} className={inputClass} />
              </div>
            </div>
            <Button type="submit" variant="secondary" loading={submitting}>
              {documentStatus === "unverified" ? t("fishermanOnboarding.submit_documents") : t("fishermanOnboarding.update_resubmit")}
            </Button>
          </form>

          <div className="border-t border-teal-200/60 pt-4">
            <h2 className="font-medium text-slate-900 mb-1">{t("fishermanOnboarding.kyc_header")}</h2>
            <p className="text-sm text-slate-600 mb-3">{t("fishermanOnboarding.kyc_desc")}</p>
            <div className="mb-4">
              <Label htmlFor="aadhaar" hint={t("fishermanOnboarding.aadhaar_hint")}>{t("fishermanOnboarding.aadhaar_label")}</Label>
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
              {t("fishermanOnboarding.submit_kyc")}
            </Button>
          </div>
        </Card>
      )}

      {user.kyc_status === "full_kyc" && (
        <SuccessText>
          {t("fishermanOnboarding.kyc_complete_prefix")}{" "}
          <a href="/fisherman/dashboard" className="underline font-medium">
            {t("fishermanOnboarding.dashboard_link")}
          </a>
          .
        </SuccessText>
      )}
    </div>
  );
}
