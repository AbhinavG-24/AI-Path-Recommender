import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { api } from "../lib/api";

interface AppState {
  userId: number;
  hasProfile: boolean;
  profile: any | null;
  refreshProfile: () => Promise<void>;
  setHasProfile: (v: boolean) => void;
}

const AppContext = createContext<AppState | null>(null);

const DEMO_USER_ID = 42;

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<any | null>(null);
  const [hasProfile, setHasProfile] = useState(false);

  const refreshProfile = useCallback(async () => {
    try {
      const data = await api.getProfile(DEMO_USER_ID);
      if (data.profile?.target_role) {
        setProfile(data);
        setHasProfile(true);
      }
    } catch {
      setHasProfile(false);
    }
  }, []);

  return (
    <AppContext.Provider
      value={{ userId: DEMO_USER_ID, hasProfile, profile, refreshProfile, setHasProfile }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
