"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { upsertBuyerProfile, submitKyc, ApiError } from "@/lib/api";

export default function BuyerOnboardingPage() {
  const { user, setUser, loading } = useSession();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [fssai, setFssai] = useState("");
  const [mpeda, setMpeda] = useState("");
  const [sourcingSpecies, setSourcingSpecies] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "buyer")) router.push("/login");
  }, [loading, user, router]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await upsertBuyerProfile(user.id, {
        business_name: businessName,
        gstin: gstin || null,
        fssai_license_no: fssai || null,
        mpeda_registration_no: mpeda || null,
        sourcing_species: sourcingSpecies || null,
      });
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
      const updated = await submitKyc(user.id);
      setUser(updated);
      router.push("/buyer/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg bg-white border rounded-lg p-6 space-y-6">
      <h1 className="text-xl font-semibold">Buyer / exporter profile</h1>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Business name</label>
          <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">GSTIN</label>
          <input value={gstin} onChange={(e) => setGstin(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">FSSAI License</label>
          <input value={fssai} onChange={(e) => setFssai(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">MPEDA Registration (exporters only)</label>
          <input value={mpeda} onChange={(e) => setMpeda(e.target.value)} className="w-full border rounded px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Sourcing species</label>
          <input
            value={sourcingSpecies}
            onChange={(e) => setSourcingSpecies(e.target.value)}
            placeholder="Pomfret, Kingfish, Mackerel"
            className="w-full border rounded px-3 py-2"
          />
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

      {saved && (
        <div className="border-t pt-4">
          <p className="text-sm text-gray-600 mb-3">Profile saved. Complete KYC to request quotes from vendors.</p>
          <button
            onClick={handleSubmitKyc}
            disabled={submitting}
            className="bg-green-600 text-white rounded px-4 py-2 hover:bg-green-700 disabled:opacity-50"
          >
            Submit KYC (dev stub)
          </button>
        </div>
      )}

      {user.kyc_status === "full_kyc" && (
        <p className="text-sm text-green-700">
          KYC complete — go to your <a href="/buyer/dashboard" className="underline">dashboard</a>.
        </p>
      )}
    </div>
  );
}
