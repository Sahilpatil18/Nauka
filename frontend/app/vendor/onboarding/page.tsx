"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { upsertVendorProfile, submitKyc, ApiError } from "@/lib/api";

export default function VendorOnboardingPage() {
  const { user, setUser, loading } = useSession();
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && (!user || user.role !== "vendor")) router.push("/login");
  }, [loading, user, router]);

  if (!user) return null;

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await upsertVendorProfile(user.id, {
        business_name: businessName,
        gstin: gstin || null,
        shop_address: shopAddress || null,
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
      router.push("/vendor/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not submit KYC");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-lg bg-white border rounded-lg p-6 space-y-6">
      <h1 className="text-xl font-semibold">Vendor profile</h1>

      <form onSubmit={handleSaveProfile} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Business name</label>
          <input
            required
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">GSTIN</label>
          <input
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Shop address</label>
          <input
            value={shopAddress}
            onChange={(e) => setShopAddress(e.target.value)}
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
          <p className="text-sm text-gray-600 mb-3">
            Profile saved. Complete KYC to list products and receive RFQs.
          </p>
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
          KYC complete — go to your <a href="/vendor/dashboard" className="underline">dashboard</a>.
        </p>
      )}
    </div>
  );
}
