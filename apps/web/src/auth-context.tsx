import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchMe, type SessionUser } from "./lib/auth";

interface AuthState {
  user: SessionUser | null;
  ready: boolean;
  refresh: () => Promise<void>;
  clear: () => void;
}

const Ctx = createContext<AuthState>({ user: null, ready: false, refresh: async () => {}, clear: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const refresh = useCallback(async () => {
    setUser(await fetchMe());
    setReady(true);
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  const clear = useCallback(() => setUser(null), []);
  return <Ctx.Provider value={{ user, ready, refresh, clear }}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthState {
  return useContext(Ctx);
}
