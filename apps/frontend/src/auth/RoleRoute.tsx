import { Alert, Box, Button, CircularProgress } from "@mui/material";
import type { Role } from "@debugclinic/contracts";
import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useAuth } from "./AuthProvider.js";

export function RoleRoute({ role }: { role: Role }) {
  const { user, isLoading, error, refresh } = useAuth();
  const location = useLocation();

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
