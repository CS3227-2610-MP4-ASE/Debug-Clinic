import BugReportOutlined from "@mui/icons-material/BugReportOutlined";
import MenuOutlined from "@mui/icons-material/MenuOutlined";
import {
  AppBar,
  Alert,
  Box,
  Button,
  Container,
  Drawer,
  IconButton,
  Stack,
  Toolbar,
  Typography,
} from "@mui/material";
import { useState, type PropsWithChildren } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../auth/AuthProvider.js";
import { useUnsavedWork } from "./UnsavedWork.js";

const publicLinks = [
  { label: "Home", to: "/" },
  { label: "Sign in", to: "/sign-in" },
];

export function AppShell({ children }: PropsWithChildren) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const { user, signOut } = useAuth();
  const { confirmDiscard } = useUnsavedWork();
  const navigate = useNavigate();
  const location = useLocation();
  const links = user
    ? [
        {
          label:
            user.role === "INSTRUCTOR"
              ? "Instructor workspace"
              : "Learner workspace",
          to: user.role === "INSTRUCTOR" ? "/instructor" : "/learner",
        },
      ]
    : publicLinks;

  async function handleSignOut() {
    setSigningOut(true);
    setSignOutError(null);
    try {
      await signOut();
      setOpen(false);
      await navigate("/sign-in", { replace: true });
    } catch {
      setOpen(false);
      setSignOutError(
        "You are not signed out yet. Check your connection and try Sign out again.",
      );
    } finally {
      setSigningOut(false);
    }
  }

  const navigation = (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      gap={1}
      sx={{ p: { xs: 2, sm: 0 } }}
    >
      {links.map((link) => (
        <Button
          key={link.to}
          component={RouterLink}
          to={link.to}
          color="inherit"
          aria-current={location.pathname === link.to ? "page" : undefined}
          onClick={() => setOpen(false)}
          sx={{ justifyContent: "flex-start" }}
        >
          {link.label}
        </Button>
      ))}
      {user && (
        <Button
          color="inherit"
          disabled={signingOut}
          onClick={() => {
            setOpen(false);
            confirmDiscard(handleSignOut);
          }}
          sx={{ justifyContent: "flex-start" }}
        >
          {signingOut ? "Signing out…" : "Sign out"}
        </Button>
      )}
    </Stack>
  );

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <AppBar
        position="static"
        color="transparent"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: "divider" }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 72 }}>
            <Stack
              component={RouterLink}
              to="/"
              direction="row"
              alignItems="center"
              gap={1.25}
              color="text.primary"
              sx={{ textDecoration: "none", flexGrow: 1, minHeight: 44 }}
            >
              <Box
                sx={{
                  display: "grid",
                  placeItems: "center",
                  width: 38,
                  height: 38,
                  borderRadius: 2.5,
                  bgcolor: "primary.main",
                  color: "primary.contrastText",
                }}
              >
                <BugReportOutlined aria-hidden="true" />
              </Box>
              <Typography
                variant="h6"
                component="span"
                fontWeight={800}
                letterSpacing="-0.02em"
              >
                DebugClinic
              </Typography>
            </Stack>
            <Box sx={{ display: { xs: "none", sm: "block" } }}>
              {navigation}
            </Box>
            <IconButton
              aria-label="Open navigation"
              onClick={() => setOpen(true)}
              sx={{
                display: { xs: "inline-flex", sm: "none" },
                width: 44,
                height: 44,
              }}
            >
              <MenuOutlined />
            </IconButton>
          </Toolbar>
        </Container>
      </AppBar>
      {signOutError && (
        <Container maxWidth="lg" sx={{ mt: 3 }}>
          <Alert severity="error">{signOutError}</Alert>
        </Container>
      )}
      <Drawer
        anchor="right"
        open={open}
        onClose={() => setOpen(false)}
        PaperProps={{ sx: { width: 280 } }}
      >
        <Typography variant="h6" sx={{ px: 2, pt: 3, pb: 1 }}>
          Navigate
        </Typography>
        {navigation}
      </Drawer>
      <Container
        component="main"
        maxWidth="lg"
        sx={{ flexGrow: 1, py: { xs: 5, md: 8 } }}
      >
        {children}
      </Container>
      <Box
        component="footer"
        sx={{ borderTop: 1, borderColor: "divider", py: 3 }}
      >
        <Container maxWidth="lg">
          <Typography variant="body2" color="text.secondary">
            Practice deliberately. Verify every hint. Keep the final decision
            human.
          </Typography>
        </Container>
      </Box>
    </Box>
  );
}
