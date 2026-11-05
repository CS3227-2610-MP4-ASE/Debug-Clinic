import { Alert, Box, Button, CircularProgress } from "@mui/material";
import type { Role } from "@debugclinic/contracts";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useRef } from "react";

import { useAuth } from "./AuthProvider.js";

export function RoleRoute({ role }: { role: Role }) {
  const { user, isLoading, error, refresh, sessionEpoch } = useAuth();
  const location = useLocation();
  const admitted = useRef<{ id: string; path: string; epoch: number } | null>(
    null,
  );
  const editor =
    role === "INSTRUCTOR" &&
    /^\/instructor\/(?:questions\/(?:new|[^/]+)|drafts\/[^/]+)$/.test(
      location.pathname,
    );
  if (user?.role === role && !isLoading)
    admitted.current = {
      id: user.id,
      path: location.pathname,
      epoch: sessionEpoch,
    };
  const retained =
    editor &&
    admitted.current?.path === location.pathname &&
    admitted.current.epoch === sessionEpoch;
  // A guard must not unmount the admitted editor when its session disappears.
  // Keying by identity disposes all prior editor memory before another user's read.
  if (retained && (!user || user.role === role))
    return <Outlet key={user?.id ?? admitted.current!.id} />;

  if (isLoading) {
    return (
      <Box
        sx={{ minHeight: "40vh", display: "grid", placeItems: "center" }}
        aria-live="polite"
      >
        <CircularProgress aria-label="Loading your session" />
      </Box>
    );
  }
  if (error)
    return (
      <Alert
        severity="error"
        action={
          <Button color="inherit" size="small" onClick={() => void refresh()}>
            Try again
          </Button>
        }
      >
        {error}
      </Alert>
    );
  if (!user)
    return (
      <Navigate to="/sign-in" replace state={{ from: location.pathname }} />
    );
  if (user.role !== role) return <Navigate to="/forbidden" replace />;
  return <Outlet />;
}
