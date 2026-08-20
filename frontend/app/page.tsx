"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";
import { useLanguage } from "@/lib/i18n";
import { Card } from "@/components/ui/Card";
import Button from "@/components/ui/Button";

const ROLE_LINKS: Record<string, { dashboard?: string; onboarding?: string }> = {
  fisherman: { dashboard: "/fisherman/dashboard", onboarding: "/fisherman/onboarding" },
  vendor: { dashboard: "/vendor/dashboard", onboarding: "/vendor/onboarding" },
  buyer: { dashboard: "/buyer/dashboard", onboarding: "/buyer/onboarding" },
  cooperative: { onboarding: "/cooperative/onboarding" },
  admin: { dashboard: "/admin/prices" },
};

const PFZ_ICON = (
  <path d="M3 17c1.5 1.5 3.5 1.5 5 0s3.5-1.5 5 0 3.5 1.5 5 0M12 3v8m0 0l-3-3m3 3l3-3" strokeLinecap="round" strokeLinejoin="round" />
);
const PRICES_ICON = <path d="M3 3v18h18M8 17V9m5 8V5m5 12v-6" strokeLinecap="round" strokeLinejoin="round" />;

export default function Home() {
  const { user, loading } = useSession();
  const { t } = useLanguage();

  const FEATURES = [
    { href: "/pfz", icon: PFZ_ICON, title: t("home.feature_pfz_title"), description: t("home.feature_pfz_desc") },
    { href: "/prices", icon: PRICES_ICON, title: t("home.feature_prices_title"), description: t("home.feature_prices_desc") },
  ];

  const VALUE_CHAIN_ROLES = [
    { role: t("home.role_fisherman"), desc: t("home.role_fisherman_desc") },
    { role: t("home.role_vendor"), desc: t("home.role_vendor_desc") },
    { role: t("home.role_buyer"), desc: t("home.role_buyer_desc") },
    { role: t("home.role_cooperative"), desc: t("home.role_cooperative_desc") },
  ];

  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-700 via-teal-600 to-cyan-600 px-6 py-12 sm:px-10 sm:py-16 text-white">
        <div className="absolute inset-0 opacity-10 [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-teal-50 ring-1 ring-inset ring-white/25">
            {t("home.badge")}
          </span>
          <h1 className="mt-4 text-3xl sm:text-4xl font-semibold tracking-tight">{t("home.title")}</h1>
          <p className="mt-3 text-teal-50/90 text-base sm:text-lg">{t("home.subtitle")}</p>
          <p className="mt-2 text-sm text-teal-100/70">{t("home.tagline")}</p>

          {!loading && (
            <div className="mt-6 flex flex-wrap gap-3">
              {user ? (
                <>
                  {ROLE_LINKS[user.role]?.dashboard && (
                    <Link href={ROLE_LINKS[user.role].dashboard!}>
                      <Button variant="secondary" className="!bg-white !text-teal-700 hover:!bg-teal-50">
                        {t("home.go_dashboard")}
                      </Button>
                    </Link>
                  )}
                  {ROLE_LINKS[user.role]?.onboarding && (
                    <Link href={ROLE_LINKS[user.role].onboarding!}>
                      <Button
                        variant="ghost"
                        className="!text-white border border-white/40 hover:!bg-white/10"
                      >
                        {t("home.complete_profile")}
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <Link href="/login">
                  <Button variant="secondary" className="!bg-white !text-teal-700 hover:!bg-teal-50">
                    {t("home.login_cta")}
                  </Button>
                </Link>
              )}
            </div>
          )}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        {FEATURES.map((f) => (
          <Link key={f.href} href={f.href}>
            <Card className="h-full transition-all hover:border-teal-300 hover:shadow-md">
              <div className="flex items-start gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.75">
                    {f.icon}
                  </svg>
                </span>
                <div>
                  <h2 className="font-semibold text-slate-900">{f.title}</h2>
                  <p className="text-sm text-slate-500 mt-1">{f.description}</p>
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          {t("home.built_for")}
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {VALUE_CHAIN_ROLES.map((r) => (
            <Card key={r.role} className="bg-slate-50/60 border-dashed">
              <h3 className="font-medium text-slate-900">{r.role}</h3>
              <p className="text-sm text-slate-500 mt-1">{r.desc}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
