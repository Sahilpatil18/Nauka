"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";

const ROLE_LINKS: Record<string, { dashboard?: string; onboarding?: string; label: string }> = {
  vendor: { dashboard: "/vendor/dashboard", onboarding: "/vendor/onboarding", label: "Vendor" },
  buyer: { dashboard: "/buyer/dashboard", onboarding: "/buyer/onboarding", label: "Buyer" },
  cooperative: { onboarding: "/cooperative/onboarding", label: "Cooperative" },
  admin: { dashboard: "/admin/prices", label: "Admin" },
};

export default function Home() {
  const { user, loading } = useSession();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-semibold">Nauka — Maharashtra marine sector platform</h1>
        <p className="text-gray-600 mt-1">
          Phase 1 web portal for equipment vendors, exporters/B2B buyers, and fisheries
          cooperatives, plus public PFZ and harbour price data. The fisherman-facing
          experience is a separate mobile app, not this site.
        </p>
      </section>

      {!loading && user && (
        <section className="bg-white border rounded-lg p-4">
          <p className="text-sm text-gray-500">Logged in as</p>
          <p className="font-medium">
            {user.phone_number} — {user.role} ({user.kyc_status})
          </p>
          <div className="flex gap-3 mt-3">
            {ROLE_LINKS[user.role]?.dashboard && (
              <Link href={ROLE_LINKS[user.role].dashboard!} className="text-blue-600 hover:underline">
                Go to dashboard →
              </Link>
            )}
            {ROLE_LINKS[user.role]?.onboarding && (
              <Link href={ROLE_LINKS[user.role].onboarding!} className="text-blue-600 hover:underline">
                Complete profile →
              </Link>
            )}
          </div>
        </section>
      )}

      {!loading && !user && (
        <section className="bg-white border rounded-lg p-4">
          <p className="mb-3">Log in to access vendor, buyer, or cooperative tools.</p>
          <Link
            href="/login"
            className="inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Log in with phone OTP
          </Link>
        </section>
      )}

      <section className="grid sm:grid-cols-2 gap-4">
        <Link href="/pfz" className="bg-white border rounded-lg p-4 hover:border-blue-400">
          <h2 className="font-medium">Potential Fishing Zones</h2>
          <p className="text-sm text-gray-600">
            INCOIS-fed PFZ coordinates with SST and chlorophyll overlays.
          </p>
        </Link>
        <Link href="/prices" className="bg-white border rounded-lg p-4 hover:border-blue-400">
          <h2 className="font-medium">Harbour Price Index</h2>
          <p className="text-sm text-gray-600">
            Daily species landing prices across 8 Maharashtra harbours, with a 7-day trend.
          </p>
        </Link>
      </section>
    </div>
  );
}
