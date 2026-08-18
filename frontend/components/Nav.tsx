"use client";

import Link from "next/link";
import { useSession } from "@/lib/session";

export default function Nav() {
  const { user, setUser, loading } = useSession();

  return (
    <header className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-semibold text-lg">
          Nauka
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link href="/pfz" className="hover:underline">
            PFZ
          </Link>
          <Link href="/prices" className="hover:underline">
            Prices
          </Link>
          {!loading && user ? (
            <>
              <span className="text-gray-500">
                {user.phone_number} · {user.role} · {user.kyc_status}
              </span>
              <button
                onClick={() => setUser(null)}
                className="text-red-600 hover:underline"
              >
                Log out
              </button>
            </>
          ) : (
            !loading && (
              <Link href="/login" className="hover:underline">
                Log in
              </Link>
            )
          )}
        </nav>
      </div>
    </header>
  );
}
