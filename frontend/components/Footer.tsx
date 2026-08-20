"use client";

import { useLanguage } from "@/lib/i18n";

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="border-t border-slate-200 py-6">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 text-xs text-slate-400">{t("footer.tagline")}</div>
    </footer>
  );
}
