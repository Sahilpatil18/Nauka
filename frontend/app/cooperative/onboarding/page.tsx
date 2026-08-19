"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { upsertCooperativeProfile, listHarbours, Harbour, ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Label, inputClass, ErrorText, SuccessText, HelpText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

export default function CooperativeOnboardingPage() {
  const { user, loading } = useSession();
  const router = useRouter();

  const [harbours, setHarbours] = useState<Harbour[]>([]);
  const [societyName, setSocietyName] = useState("");
  const [registrationNo, setRegistrationNo] = useState("");
  const [officerName, setOfficerName] = useState("");
  const [harbourId, setHarbourId] = useState("");
  const [fleetCount, setFleetCount] = useState(0);
  const [varieties, setVarieties] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "cooperative")) {
      router.push("/login");
      return;
    }
    listHarbours().then((h) => {
      setHarbours(h);
      if (h.length) setHarbourId(h[0].id);
    });
  }, [loading, user, router]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await upsertCooperativeProfile(user.id, {
        society_name: societyName,
        society_registration_no: registrationNo || null,
        officer_in_charge_name: officerName || null,
        harbour_id: harbourId || null,
        active_fleet_count: fleetCount,
        primary_catch_varieties: varieties || null,
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save profile");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Cooperative society profile</h1>
      </div>

      <HelpText>
        Bulk catch aggregation reporting and group equipment purchasing aren&apos;t built in the
        API yet — this is profile setup only.
      </HelpText>

      <Card>
        <CardHeader title="Society details" />
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label htmlFor="societyName">Society name</Label>
            <input id="societyName" required value={societyName} onChange={(e) => setSocietyName(e.target.value)} className={inputClass} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="registrationNo" hint="optional">Registration no.</Label>
              <input id="registrationNo" value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} className={inputClass} />
            </div>
            <div>
              <Label htmlFor="officerName" hint="optional">Officer-in-charge</Label>
              <input id="officerName" value={officerName} onChange={(e) => setOfficerName(e.target.value)} className={inputClass} />
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="harbour">Harbour hub</Label>
              <select id="harbour" value={harbourId} onChange={(e) => setHarbourId(e.target.value)} className={inputClass}>
                {harbours.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="fleetCount">Active fleet count</Label>
              <input
                id="fleetCount"
                type="number"
                min={0}
                value={fleetCount}
                onChange={(e) => setFleetCount(Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="varieties" hint="optional">Primary catch varieties</Label>
            <input id="varieties" value={varieties} onChange={(e) => setVarieties(e.target.value)} className={inputClass} />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" loading={submitting}>
            Save profile
          </Button>
        </form>
      </Card>

      {saved && <SuccessText>Profile saved.</SuccessText>}
    </div>
  );
}
