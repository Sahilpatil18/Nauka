"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { requestOtp, verifyOtp, ApiError, UserRole } from "@/lib/api";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import { Label, inputClass, ErrorText, HelpText } from "@/components/ui/Field";
import Button from "@/components/ui/Button";

const ROLE_HOME: Record<string, string> = {
  fisherman: "/fisherman/onboarding",
  vendor: "/vendor/onboarding",
  buyer: "/buyer/onboarding",
  cooperative: "/cooperative/onboarding",
  admin: "/admin/prices",
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useSession();
  const { t } = useLanguage();

  const ROLES: { value: UserRole; label: string; description: string }[] = [
    { value: "fisherman", label: t("login.role.fisherman"), description: t("login.role.fisherman_desc") },
    { value: "vendor", label: t("login.role.vendor"), description: t("login.role.vendor_desc") },
    { value: "buyer", label: t("login.role.buyer"), description: t("login.role.buyer_desc") },
    { value: "cooperative", label: t("login.role.cooperative"), description: t("login.role.cooperative_desc") },
    { value: "admin", label: t("login.role.admin"), description: t("login.role.admin_desc") },
  ];

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
      setError(err instanceof ApiError ? err.message : t("common.error_network"));
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
      setError(err instanceof ApiError ? err.message : t("common.error_network"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-teal-600 text-white">
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 17c1.5 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 5 0" strokeLinecap="round" />
              <path d="M5 17V9l6-4 6 4v8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold text-slate-900">{t("login.title")}</h1>
          <p className="text-sm text-slate-500 mt-1">
            {step === "phone" ? t("login.subtitle_phone") : t("login.subtitle_otp", { phone })}
          </p>
        </div>

        <Card>
          {step === "phone" && (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <Label htmlFor="phone">{t("login.phone_label")}</Label>
                <input
                  id="phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+919800000000"
                  className={inputClass}
                />
              </div>
              <div>
                <Label htmlFor="role">{t("login.role_label")}</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className={inputClass}
                >
                  {ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              {error && <ErrorText>{error}</ErrorText>}
              <Button type="submit" loading={submitting} fullWidth>
                {submitting ? t("login.sending") : t("login.send_otp")}
              </Button>
            </form>
          )}

          {step === "otp" && (
            <form onSubmit={handleVerify} className="space-y-4">
              {devNote && <HelpText>{t("login.dev_note", { note: devNote })}</HelpText>}
              <div>
                <Label htmlFor="code">{t("login.otp_label")}</Label>
                <input
                  id="code"
                  type="text"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className={`${inputClass} text-center text-lg tracking-[0.5em] font-medium`}
                  placeholder="------"
                />
              </div>
              {error && <ErrorText>{error}</ErrorText>}
              <Button type="submit" loading={submitting} fullWidth>
                {submitting ? t("login.verifying") : t("login.verify")}
              </Button>
              <button
                type="button"
                onClick={() => setStep("phone")}
                className="w-full text-sm text-slate-500 hover:text-slate-700 transition-colors"
              >
                {t("login.use_different_number")}
              </button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}
