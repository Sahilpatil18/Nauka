"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "@/lib/session";
import Badge from "@/components/ui/Badge";

const PUBLIC_LINKS = [
  { href: "/pfz", label: "PFZ" },
  { href: "/prices", label: "Prices" },
];

const KYC_TONE: Record<string, "slate" | "amber" | "green"> = {
  unverified: "slate",
  phone_verified: "amber",
  full_kyc: "green",
};

const KYC_LABEL: Record<string, string> = {
  unverified: "Unverified",
  phone_verified: "Phone verified",
  full_kyc: "KYC complete",
};

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
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Logo />
            <nav className="hidden md:flex items-center gap-1">
              {PUBLIC_LINKS.map((link) => (
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
            {!loading && user ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-slate-600">{user.phone_number}</span>
                  <Badge tone="teal">{user.role}</Badge>
                  <Badge tone={KYC_TONE[user.kyc_status]}>{KYC_LABEL[user.kyc_status]}</Badge>
                </div>
                <button
                  onClick={() => setUser(null)}
                  className="text-sm font-medium text-slate-500 hover:text-rose-600 transition-colors"
                >
                  Log out
                </button>
              </>
            ) : (
              !loading && (
                <Link
                  href="/login"
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors shadow-sm"
                >
                  Log in
                </Link>
              )
            )}
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="md:hidden flex items-center justify-center h-9 w-9 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle menu"
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
            {PUBLIC_LINKS.map((link) => (
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
                  <Badge tone={KYC_TONE[user.kyc_status]}>{KYC_LABEL[user.kyc_status]}</Badge>
                </div>
                <button
                  onClick={() => {
                    setUser(null);
                    setMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-600 hover:bg-rose-50"
                >
                  Log out
                </button>
              </div>
            ) : (
              !loading && (
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="block mx-3 mt-2 rounded-lg bg-teal-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-teal-700"
                >
                  Log in
                </Link>
              )
            )}
          </div>
        )}
      </div>
    </header>
  );
}
