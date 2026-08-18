"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { upsertCooperativeProfile, listHarbours, Harbour, ApiError } from "@/lib/api";

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
    <div className="max-w-lg bg-white border rounded-lg p-6 space-y-6">
      <h1 className="text-xl font-semibold">Cooperative society profile</h1>
      <p className="text-sm text-gray-500">
        Bulk catch aggregation reporting and group equipment purchasing aren&apos;t built in the
        API yet — this is profile setup only.
      </p>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Society name</label>
          <input required value={societyName} onChange={(e) => setSocietyName(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Society registration no.</label>
          <input value={registrationNo} onChange={(e) => setRegistrationNo(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Officer-in-charge</label>
          <input value={officerName} onChange={(e) => setOfficerName(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Harbour hub</label>
          <select value={harbourId} onChange={(e) => setHarbourId(e.target.value)} className="w-full border rounded px-3 py-2">
            {harbours.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Active registered fleet count</label>
          <input
            type="number"
            min={0}
            value={fleetCount}
            onChange={(e) => setFleetCount(Number(e.target.value))}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Primary catch varieties</label>
          <input value={varieties} onChange={(e) => setVarieties(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting}
          className="bg-blue-600 text-white rounded px-4 py-2 hover:bg-blue-700 disabled:opacity-50"
        >
          Save profile
        </button>
      </form>

      {saved && <p className="text-sm text-green-700">Profile saved.</p>}
    </div>
  );
}
