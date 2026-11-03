import type { CurrentUser } from "@debugclinic/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import { getCurrentUser } from "../lib/api.js";
import { authClient } from "./auth-client.js";

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<CurrentUser | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestVersion = useRef(0);

  const refresh = useCallback(async () => {
    const version = ++requestVersion.current;
    setIsLoading(true);
    setError(null);
    try {
      const currentUser = await getCurrentUser();
      if (version !== requestVersion.current) return null;
      setUser(currentUser);
      return currentUser;
    } catch {
      if (version !== requestVersion.current) return null;
      setUser(null);
      setError(
        "We could not restore your session. Check the API connection and try again.",
      );
      return null;
    } finally {
      if (version === requestVersion.current) setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(
        result.error.message || "Sign-out failed. Please try again.",
      );
    }
    // Invalidate pending session reads so they cannot restore a signed-out user.
    requestVersion.current += 1;
    setUser(null);
    setError(null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const version = ++requestVersion.current;
    const controller = new AbortController();
    setIsLoading(true);
    void getCurrentUser(controller.signal)
      .then((currentUser) => {
        if (version === requestVersion.current) setUser(currentUser);
      })
      .catch((requestError: unknown) => {
        if (version !== requestVersion.current) return;
        if (
          requestError instanceof DOMException &&
          requestError.name === "AbortError"
        )
          return;
        setError(
          "We could not restore your session. Check the API connection and try again.",
        );
      })
      .finally(() => {
        if (version === requestVersion.current) setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const value = useMemo(
    () => ({ user, isLoading, error, refresh, signOut }),
    [user, isLoading, error, refresh, signOut],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
