import {
  Alert,
  Button,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  authRequest,
  failureMessage,
  recoveryAccepted,
  verificationAccepted,
  workspace,
} from "../auth/actions.js";
import { useAuth } from "../auth/AuthProvider.js";
import { AuthError } from "../auth/AuthError.js";

export function EmailRequestPage({
  kind,
}: {
  kind: "verification" | "recovery";
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy(true);
    setError(null);
    setAccepted(false);
    try {
      await authRequest(
        kind === "verification"
          ? "/send-verification-email"
          : "/request-password-reset",
        { email: String(values.get("email")).trim().toLowerCase() },
      );
      setAccepted(true);
    } catch (failure) {
      setError(
        failureMessage(
          failure,
          "The request could not be completed. Try again.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack maxWidth={460} mx="auto" gap={3}>
      <Typography component="h1" variant="h3">
        {kind === "verification"
          ? "Verify your email"
          : "Reset or establish your password"}
      </Typography>
      <Typography>
        {kind === "verification"
          ? "Request another verification link, then sign in after verifying."
          : "Use a recovery link to replace your password or establish one for your Google account."}
      </Typography>
      <AuthError message={error} />
      {accepted && (
        <Alert severity="info">
          {kind === "verification" ? verificationAccepted : recoveryAccepted}
        </Alert>
      )}
      {busy && <Typography role="status">Requesting link…</Typography>}
      <Stack
        component="form"
        gap={2.5}
        onSubmit={(event) => void submit(event)}
      >
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
        />
        <Button variant="contained" type="submit" disabled={busy}>
          {busy
            ? "Requesting link…"
            : kind === "verification"
              ? "Resend verification"
              : "Request recovery link"}
        </Button>
      </Stack>
      <Link component={RouterLink} to="/sign-in">
        Back to sign in
      </Link>
    </Stack>
  );
}

export function VerificationResultPage() {
  const failed = new URLSearchParams(useLocation().search).has("error");
  return (
    <Stack maxWidth={460} mx="auto" gap={3}>
      <Typography component="h1" variant="h3">
        Email verification
      </Typography>
      <Alert severity={failed ? "warning" : "info"}>
        {failed
          ? "This verification link is invalid or expired. Request another link or sign in if already verified."
          : "Verification completed. Sign in to continue. This page does not sign you in."}
      </Alert>
      <Link component={RouterLink} to="/sign-in">
        Sign in
      </Link>
      <Link component={RouterLink} to="/verification">
        Request another verification link
      </Link>
    </Stack>
  );
}

export function ResetPasswordPage() {
  const [token, setToken] = useState(
    () => new URLSearchParams(window.location.search).get("token") ?? "",
  );
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  useEffect(() => {
    void navigate("/reset-password", { replace: true });
  }, [navigate]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || !token) return;
    setBusy(true);
    setError(null);
    try {
      await authRequest("/reset-password", { token, newPassword: password });
      setToken("");
      setPassword("");
      setDone(true);
    } catch (failure) {
      setError(
        failureMessage(
          failure,
          "Password reset failed. Try again or request a new link.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Stack maxWidth={460} mx="auto" gap={3}>
      <Typography component="h1" variant="h3">
        Choose a password
      </Typography>
      <AuthError message={error} />
      {done ? (
        <Alert severity="success">
          Password saved. Sign in with your new password.
        </Alert>
      ) : !token ? (
        <Alert severity="warning">
          This link is missing or invalid. Request a new recovery link.
        </Alert>
      ) : (
        <Stack
          component="form"
          gap={2.5}
          onSubmit={(event) => void submit(event)}
        >
          <TextField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            inputProps={{ minLength: 12, maxLength: 128 }}
            helperText="Use 12 to 128 characters."
          />
          {busy && <Typography role="status">Saving password…</Typography>}
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? "Saving password…" : "Save password"}
          </Button>
        </Stack>
      )}
      <Link component={RouterLink} to="/forgot-password">
        Request a new recovery link
      </Link>
      <Link component={RouterLink} to="/sign-in">
        Sign in
      </Link>
    </Stack>
  );
}

export function AuthCompletionPage() {
  const { refresh, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const autoStarted = useRef(false);
  async function complete() {
    setBusy(true);
    setError(null);
    try {
      const session = await refresh();
      if (!session.ok || !session.user) throw new Error("No session");
      await navigate(
        workspace(
          session.user,
          new URLSearchParams(location.search).get("returnTo"),
        ),
        { replace: true },
      );
    } catch {
      setError("We could not complete sign-in. Retry or restart sign-in.");
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    // Wait for the provider's initial restore so it cannot supersede this read.
    if (isLoading || autoStarted.current) return;
    autoStarted.current = true;
    void complete();
  }, [isLoading]);
  return (
    <Stack maxWidth={460} mx="auto" gap={3}>
      <Typography component="h1" variant="h3">
        Completing sign-in
      </Typography>
      {(busy || isLoading) && (
        <Typography role="status">Checking your session…</Typography>
      )}
      <AuthError message={error} />
      <Button disabled={busy || isLoading} onClick={() => void complete()}>
        Retry completion
      </Button>
      <Link component={RouterLink} to="/sign-in">
        Restart sign-in
      </Link>
    </Stack>
  );
}

export function AuthErrorPage() {
  return (
    <Stack maxWidth={460} mx="auto" gap={3}>
      <Typography component="h1" variant="h3">
        Google sign-in could not finish
      </Typography>
      <Alert severity="warning">
        Restart sign-in or registration. If your email is not verified, verify
        it first. You can also use password recovery.
      </Alert>
      <Link component={RouterLink} to="/sign-in">
        Restart sign-in
      </Link>
      <Link component={RouterLink} to="/register">
        Register
      </Link>
      <Link component={RouterLink} to="/verification">
        Verify email
      </Link>
      <Link component={RouterLink} to="/forgot-password">
        Password recovery
      </Link>
    </Stack>
  );
}
