"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";
import { upsertVendorProfile, submitKyc, ApiError } from "@/lib/api";
import { Card, CardHeader } from "@/components/ui/Card";
import { Label, inputClass, ErrorText, SuccessText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

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
    <div className="max-w-lg mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Vendor profile</h1>
        <p className="text-sm text-slate-500 mt-1">Tell us about your business to start listing equipment.</p>
      </div>

      <Card>
        <CardHeader title="Business details" />
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <Label htmlFor="businessName">Business name</Label>
            <input
              id="businessName"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <Label htmlFor="gstin" hint="optional">GSTIN</Label>
            <input id="gstin" value={gstin} onChange={(e) => setGstin(e.target.value)} className={inputClass} />
          </div>
          <div>
            <Label htmlFor="shopAddress" hint="optional">Shop address</Label>
            <input id="shopAddress" value={shopAddress} onChange={(e) => setShopAddress(e.target.value)} className={inputClass} />
          </div>
          {error && <ErrorText>{error}</ErrorText>}
          <Button type="submit" loading={submitting}>
            Save profile
          </Button>
        </form>
      </Card>

      {saved && (
        <Card className="border-teal-200 bg-teal-50/50">
          <p className="text-sm text-slate-700 mb-3">
            Profile saved. Complete KYC to list products and receive RFQs.
          </p>
          <Button onClick={handleSubmitKyc} loading={submitting} variant="primary">
            Submit KYC (dev stub)
          </Button>
        </Card>
      )}

      {user.kyc_status === "full_kyc" && (
        <SuccessText>
          KYC complete — go to your{" "}
          <a href="/vendor/dashboard" className="underline font-medium">
            dashboard
          </a>
          .
        </SuccessText>
      )}
    </div>
  );
}
