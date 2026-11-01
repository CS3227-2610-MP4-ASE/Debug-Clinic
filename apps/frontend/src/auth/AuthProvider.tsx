import type { CurrentUser } from "@debugclinic/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from "react";

import { getCurrentUser } from "../lib/api.js";

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUser(await getCurrentUser());
    } catch {
      setUser(null);
      setError(
        "We could not restore your session. Check the API connection and try again.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    void getCurrentUser(controller.signal)
      .then(setUser)
      .catch((requestError: unknown) => {
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
          return;
        setError(
          "We could not restore your session. Check the API connection and try again.",
        );
      })
      .finally(() => setIsLoading(false));
    return () => controller.abort();
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, error, refresh }),
    [user, isLoading, error, refresh],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
