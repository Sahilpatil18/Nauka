"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import { useLanguage, type Language } from "@/lib/i18n";
import Badge from "@/components/ui/Badge";

const KYC_TONE: Record<string, "slate" | "amber" | "green"> = {
  unverified: "slate",
  phone_verified: "amber",
  full_kyc: "green",
};

function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const options: { value: Language; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "mr", label: "मराठी" },
  ];
  return (
    <div className="inline-flex rounded-lg border border-slate-300 p-0.5 bg-white text-xs">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setLanguage(opt.value)}
          className={[
            "px-2.5 py-1 rounded-md font-medium transition-colors",
            language === opt.value ? "bg-teal-600 text-white" : "text-slate-600 hover:bg-slate-50",
          ].join(" ")}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 shrink-0">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600 text-white">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M3 17c1.5 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 5 0" strokeLinecap="round" />
          <path d="M5 17V9l6-4 6 4v8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="font-semibold text-lg text-slate-900 tracking-tight">Nauka</span>
    </Link>
  );
}

export default function Nav() {
  const { user, setUser, loading } = useSession();
  const { t } = useLanguage();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const publicLinks = [
    { href: "/pfz", label: t("nav.pfz") },
    { href: "/prices", label: t("nav.prices") },
  ];
  const roleLinks: Record<string, { href: string; label: string }[]> = {
    admin: [
      { href: "/admin/prices", label: t("nav.price_entry") },
      { href: "/admin/verifications", label: t("nav.verifications") },
    ],
  };
  const kycLabel: Record<string, string> = {
    unverified: t("nav.kyc.unverified"),
    phone_verified: t("nav.kyc.phone_verified"),
    full_kyc: t("nav.kyc.full_kyc"),
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const activeRoleLinks = user ? roleLinks[user.role] || [] : [];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden md:flex items-center gap-1">
              {[...publicLinks, ...activeRoleLinks].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={[
                    "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive(link.href)
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50",
                  ].join(" ")}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <LanguageSwitcher />
            {!loading && user ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600">{user.phone_number}</span>
                  <Badge tone="teal">{user.role}</Badge>
                  <Badge tone={KYC_TONE[user.kyc_status]}>{kycLabel[user.kyc_status]}</Badge>
                </div>
                <button
                  onClick={() => setUser(null)}
                  className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors"
                >
                  {t("nav.logout")}
                </button>
              </>
            ) : (
              !loading && (
                <Link
                  href="/login"
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors shadow-sm"
                >
                  {t("nav.login")}
                </Link>
              )
            )}
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label={t("nav.toggle_menu")}
            aria-expanded={menuOpen}
          >
            {menuOpen ? (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path d="M4.3 4.3a1 1 0 011.4 0L10 8.6l4.3-4.3a1 1 0 111.4 1.4L11.4 10l4.3 4.3a1 1 0 01-1.4 1.4L10 11.4l-4.3 4.3a1 1 0 01-1.4-1.4L8.6 10 4.3 5.7a1 1 0 010-1.4z" />
              </svg>
            ) : (
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-slate-100 pt-3">
            <div className="px-3 pt-3">
              <LanguageSwitcher />
            </div>
            {[...publicLinks, ...activeRoleLinks].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={[
                  "block px-3 py-2 rounded-lg text-sm font-medium",
                  isActive(link.href) ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50",
                ].join(" ")}
              >
                {link.label}
              </Link>
            ))}
            {!loading && user ? (
              <div className="pt-2 mt-2 border-t border-slate-100 space-y-2">
                <div className="px-3 flex items-center gap-2 flex-wrap text-sm">
                  <span className="text-slate-600">{user.phone_number}</span>
                  <Badge tone="teal">{user.role}</Badge>
                  <Badge tone={KYC_TONE[user.kyc_status]}>{kycLabel[user.kyc_status]}</Badge>
                </div>
                <button
                  onClick={() => {
                    setUser(null);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              !loading && (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block mx-3 mt-2 rounded-lg bg-teal-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-teal-700"
                >
                  {t("nav.login")}
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </header>
  );
}
