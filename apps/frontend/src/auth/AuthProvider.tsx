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

import { ApiClientError, getCurrentUser } from "../lib/api.js";
import { authClient } from "./auth-client.js";

type SessionRefreshResult =
  { ok: true; user: CurrentUser | null } | { ok: false };

type GradingActor = Pick<CurrentUser, "id" | "role">;
type GradingSession =
  | { status: "verified"; actor: GradingActor }
  | { status: "checking" | "unavailable"; actor: GradingActor | null }
  | { status: "invalid"; actor: null };

interface AuthState {
  user: CurrentUser | null;
  isLoading: boolean;
  error: string | null;
  sessionExpired: boolean;
  sessionEpoch: number;
  gradingSession: GradingSession;
  observeGrading: () => () => void;
  revalidateGrading: (fresh?: boolean) => Promise<SessionRefreshResult>;
  refresh: () => Promise<SessionRefreshResult>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);
const gradingSessionDeadlineMs = 4_000;
const gradingSessionChannel = "debugclinic-grading-session";

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [sessionEpoch, setSessionEpoch] = useState(0);
  const [gradingSession, setGradingSession] = useState<GradingSession>({
    status: "checking",
    actor: null,
  });
  const requestVersion = useRef(0);
  const backgroundRequest = useRef<{
    version: number;
    gradingOnly: boolean;
    controller: AbortController;
    result: Promise<SessionRefreshResult>;
  } | null>(null);
  const gradingObservers = useRef(0);
  const peerChannel = useRef<BroadcastChannel | null>(null);
  const verifiedActorKey = useRef<string | null | undefined>(undefined);

  const observeGrading = useCallback(() => {
    gradingObservers.current++;
    return () => {
      gradingObservers.current--;
    };
  }, []);

  const publishVerifiedActor = useCallback((actor: GradingActor | null) => {
    const key = actor ? JSON.stringify([actor.id, actor.role]) : null;
    if (verifiedActorKey.current === key) return;
    verifiedActorKey.current = key;
    peerChannel.current?.postMessage(key);
  }, []);

  const refreshSession = useCallback(
    ({
      background = false,
      gradingOnly = false,
      fresh = false,
      initialSignal,
    }: {
      background?: boolean;
      gradingOnly?: boolean;
      fresh?: boolean;
      initialSignal?: AbortSignal;
    } = {}): Promise<SessionRefreshResult> => {
      const existing = backgroundRequest.current;
      if (
        background &&
        !fresh &&
        existing?.version === requestVersion.current &&
        existing.gradingOnly === gradingOnly
      )
        return existing.result;
      const version = ++requestVersion.current;
      existing?.controller.abort();
      const controller = background ? new AbortController() : null;
      const timeout =
        controller && (gradingOnly || gradingObservers.current > 0)
          ? window.setTimeout(
              () => controller.abort(),
              gradingSessionDeadlineMs,
            )
          : undefined;
      // Focus checks must not unmount already-authorized pages and their state.
      if (!background) setIsLoading(true);
      setError(null);
      setGradingSession(({ actor }) => ({ status: "checking", actor }));
      const isCurrent = () =>
        version === requestVersion.current && !initialSignal?.aborted;
      const result = (async (): Promise<SessionRefreshResult> => {
        try {
          const currentUser = await getCurrentUser(
            initialSignal ?? controller?.signal,
          );
          if (!isCurrent()) return { ok: false };
          setUser(currentUser);
          publishVerifiedActor(currentUser);
          if (!initialSignal) setSessionExpired(!currentUser);
          setGradingSession(
            currentUser
              ? {
                  status: "verified",
                  actor: { id: currentUser.id, role: currentUser.role },
                }
              : { status: "invalid", actor: null },
          );
          return { ok: true, user: currentUser };
        } catch (failure) {
          if (!isCurrent()) return { ok: false };
          if (!gradingOnly) {
            setUser(null);
            setError(
              "We could not restore your session. Check the API connection and try again.",
            );
          }
          setGradingSession(({ actor }) =>
            failure instanceof ApiClientError && failure.status === 403
              ? { status: "invalid", actor: null }
              : { status: "unavailable", actor },
          );
          return { ok: false };
        } finally {
          window.clearTimeout(timeout);
          if (isCurrent()) setIsLoading(false);
          if (backgroundRequest.current?.version === version)
            backgroundRequest.current = null;
        }
      })();
      if (controller)
        backgroundRequest.current = {
          version,
          gradingOnly,
          controller,
          result,
        };
      return result;
    },
    [publishVerifiedActor],
  );
  const refresh = useCallback(() => refreshSession(), [refreshSession]);
  const revalidateGrading = useCallback(
    (fresh = false) =>
      refreshSession({ background: true, gradingOnly: true, fresh }),
    [refreshSession],
  );

  const signOut = useCallback(async () => {
    const result = await authClient.signOut();
    if (result.error) {
      throw new Error(
        result.error.message || "Sign-out failed. Please try again.",
      );
    }
    // Invalidate pending session reads so they cannot restore a signed-out user.
    requestVersion.current += 1;
    backgroundRequest.current?.controller.abort();
    setUser(null);
    publishVerifiedActor(null);
    setSessionExpired(false);
    setSessionEpoch((value) => value + 1);
    setGradingSession({ status: "invalid", actor: null });
    setError(null);
    setIsLoading(false);
  }, [publishVerifiedActor]);

  useEffect(() => {
    const expire = () => {
      requestVersion.current += 1;
      backgroundRequest.current?.controller.abort();
      setSessionExpired(true);
      setGradingSession({ status: "invalid", actor: null });
      setIsLoading(false);
    };
    const restore = () => {
      void refreshSession({ background: true });
    };
    window.addEventListener("debugclinic:session-expired", expire);
    window.addEventListener("focus", restore);
    return () => {
      window.removeEventListener("debugclinic:session-expired", expire);
      window.removeEventListener("focus", restore);
    };
  }, [refreshSession]);

  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const channel = new BroadcastChannel(gradingSessionChannel);
    peerChannel.current = channel;
    channel.onmessage = (event: MessageEvent<unknown>) => {
      if (
        gradingObservers.current === 0 ||
        verifiedActorKey.current === undefined ||
        (event.data !== null && typeof event.data !== "string") ||
        event.data === verifiedActorKey.current
      )
        return;
      // A peer detected an identity change. Hide the old grade and verify the cookie locally.
      setGradingSession({ status: "invalid", actor: null });
      void revalidateGrading(true);
    };
    return () => {
      peerChannel.current = null;
      channel.close();
    };
  }, [revalidateGrading]);

  useEffect(() => {
    const controller = new AbortController();
    void refreshSession({ initialSignal: controller.signal });
    return () => {
      controller.abort();
      backgroundRequest.current?.controller.abort();
    };
  }, [refreshSession]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      error,
      sessionExpired,
      sessionEpoch,
      gradingSession,
      observeGrading,
      revalidateGrading,
      refresh,
      signOut,
    }),
    [
      user,
      isLoading,
      error,
      sessionExpired,
      sessionEpoch,
      gradingSession,
      observeGrading,
      revalidateGrading,
      refresh,
      signOut,
    ],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
