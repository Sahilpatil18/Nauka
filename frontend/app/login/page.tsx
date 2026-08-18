"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp, ApiError, UserRole } from "@/lib/api";
import { useSession } from "@/lib/session";

const ROLES: { value: UserRole; label: string }[] = [
  { value: "vendor", label: "Equipment & Gear Vendor" },
  { value: "buyer", label: "Exporter / B2B Buyer" },
  { value: "cooperative", label: "Fisheries Cooperative Society" },
  { value: "admin", label: "Admin / Field Agent" },
];

const ROLE_HOME: Record<string, string> = {
  vendor: "/vendor/onboarding",
  buyer: "/buyer/onboarding",
  cooperative: "/cooperative/onboarding",
  admin: "/admin/prices",
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useSession();

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<UserRole>("vendor");
  const [code, setCode] = useState("");
  const [devNote, setDevNote] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await requestOtp(phone);
      setDevNote(res.note);
      setStep("otp");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the API");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const user = await verifyOtp(phone, code, role);
      setUser(user);
      router.push(ROLE_HOME[user.role] || "/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not reach the API");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-sm mx-auto bg-white border rounded-lg p-6">
      <h1 className="text-xl font-semibold mb-4">Log in</h1>

      {step === "phone" && (
        <form onSubmit={handleRequestOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Phone number</label>
            <input
              type="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+919800000000"
              className="w-full border rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">I am a...</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="w-full border rounded px-3 py-2"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Fishermen use the mobile app, not this web portal.
            </p>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Sending..." : "Send OTP"}
          </button>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={handleVerify} className="space-y-4">
          {devNote && (
            <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded px-3 py-2">
              Dev mode: {devNote}. Check the backend server logs for the 6-digit code.
            </p>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Enter OTP</label>
            <input
              type="text"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="w-full border rounded px-3 py-2 tracking-widest"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-blue-600 text-white rounded px-3 py-2 hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? "Verifying..." : "Verify & continue"}
          </button>
          <button
            type="button"
            onClick={() => setStep("phone")}
            className="w-full text-sm text-gray-500 hover:underline"
          >
            Use a different number
          </button>
        </form>
      )}
    </div>
  );
}
