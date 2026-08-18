"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { User } from "./api";

/*
 * The backend has no session/token auth yet (see backend README) — endpoints
 * take a user_id directly. This mirrors that: we just remember the logged-in
 * user's id/role/kyc_status in localStorage. Swap this for real token storage
 * once the backend has auth.
 */

interface SessionContextValue {
  user: User | null;
  setUser: (user: User | null) => void;
  loading: boolean;
}

const SessionContext = createContext<SessionContextValue>({
  user: null,
  setUser: () => {},
  loading: true,
});

const STORAGE_KEY = "nauka_user";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Reading a one-time localStorage snapshot on mount, not subscribing to
    // anything — the newer react-hooks rule wants effects to avoid setState
    // entirely in favor of Suspense/data-fetching libraries, which is a
    // bigger change than a Phase 1 scaffold warrants right now.
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setUserState(JSON.parse(raw));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    setLoading(false);
  }, []);

  const setUser = (u: User | null) => {
    setUserState(u);
    if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SessionContext.Provider value={{ user, setUser, loading }}>{children}</SessionContext.Provider>
  );
}

export const useSession = () => useContext(SessionContext);
