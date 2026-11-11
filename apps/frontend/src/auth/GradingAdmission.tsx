import { Alert, Button, Stack, Typography } from "@mui/material";
import type { Role } from "@debugclinic/contracts";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import { flushSync } from "react-dom";
import { Link as RouterLink, Navigate, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider.js";

type Denial = 401 | 403 | 404;

const GradingAccess = createContext<{
  actorId: string;
  verified: boolean;
  retrySession: () => void;
  deny: (status: Denial) => void;
} | null>(null);

export function useGradingAccess() {
  const access = useContext(GradingAccess);
  if (!access) throw new Error("Grading requires role admission");
  return access;
}

export function GradingAdmission({
  role,
  embedded = false,
  children,
}: PropsWithChildren<{ role: Role; embedded?: boolean }>) {
  const { gradingSession, sessionEpoch, revalidateGrading, observeGrading } =
    useAuth();
  const location = useLocation();
  const [restoring, setRestoring] = useState(false);
  const admitted = useRef<string | null>(null);
  const actor = gradingSession.actor;
  const key =
    actor?.role === role
      ? JSON.stringify([actor.id, role, sessionEpoch, location.pathname])
      : null;
  const verified = gradingSession.status === "verified";

  useEffect(observeGrading, [observeGrading]);

  useLayoutEffect(() => {
    if (restoring || !key) admitted.current = null;
    else if (verified) admitted.current = key;
  }, [key, restoring, verified]);

  useEffect(() => {
    const hide = (event: PageTransitionEvent) => {
      if (event.persisted) flushSync(() => setRestoring(true));
    };
    const show = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      void revalidateGrading(true);
      setRestoring(false);
    };
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    return () => {
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
    };
  }, [revalidateGrading]);

  useEffect(() => {
    if (gradingSession.status !== "unavailable") return;
    const retry = () => void revalidateGrading();
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [gradingSession.status, revalidateGrading]);

  const retrySession = useCallback(
    () => void revalidateGrading(),
    [revalidateGrading],
  );
  if (!restoring && key && actor && (verified || admitted.current === key))
    return (
      <AdmittedGrading
        key={key}
        actorId={actor.id}
        role={role}
        verified={verified}
        checking={gradingSession.status === "checking"}
        embedded={embedded}
        retrySession={retrySession}
      >
        {children}
      </AdmittedGrading>
    );
  if (restoring || gradingSession.status === "checking")
    return <Typography role="status">Checking your session…</Typography>;
  if (gradingSession.status === "unavailable")
    return (
      <Alert
        severity="warning"
        action={
          <Button color="inherit" onClick={retrySession}>
            {embedded ? "Retry result" : "Try again"}
          </Button>
        }
      >
        {embedded
          ? "Result unavailable"
          : "Your session could not be verified."}
      </Alert>
    );
  if (embedded) return null;
  return gradingSession.status === "invalid" ? (
    <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
  ) : (
    <Navigate to="/forbidden" replace />
  );
}

function AdmittedGrading({
  actorId,
  role,
  verified,
  checking,
  embedded,
  retrySession,
  children,
}: PropsWithChildren<{
  actorId: string;
  role: Role;
  verified: boolean;
  checking: boolean;
  embedded: boolean;
  retrySession: () => void;
}>) {
  const [denial, deny] = useState<Denial | null>(null);
  const location = useLocation();
  if (denial === 401 && !embedded)
    return (
      <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
    );
  if (denial === 403 && !embedded) return <Navigate to="/forbidden" replace />;
  if (denial)
    return (
      <Stack gap={2}>
        <Alert severity="info">
          {denial === 404 ? "Submission not found" : "Result unavailable"}
        </Alert>
        {!embedded && (
          <Button
            component={RouterLink}
            to={
              role === "INSTRUCTOR"
                ? "/instructor/submissions"
                : "/learner/submissions"
            }
            sx={{ alignSelf: "flex-start" }}
          >
            Back to submissions
          </Button>
        )}
      </Stack>
    );

  return (
    <GradingAccess.Provider value={{ actorId, verified, retrySession, deny }}>
      {!verified && !embedded && role === "INSTRUCTOR" && (
        <Alert
          severity="warning"
          sx={{ mb: 2 }}
          action={
            <Button color="inherit" disabled={checking} onClick={retrySession}>
              Retry session
            </Button>
          }
        >
          {checking
            ? "Checking your session…"
            : "Your session could not be verified. Grade actions are paused."}
        </Alert>
      )}
      {children}
    </GradingAccess.Provider>
  );
}
