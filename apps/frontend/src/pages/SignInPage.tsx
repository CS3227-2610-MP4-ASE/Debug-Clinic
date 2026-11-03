import Google from "@mui/icons-material/Google";
import {
  Alert,
  Button,
  Divider,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import {
  authRequest,
  failureMessage,
  startGoogle,
  workspace,
} from "../auth/actions.js";
import { useAuth } from "../auth/AuthProvider.js";
import { AuthError } from "../auth/AuthError.js";

export function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy("email");
    setError(null);
    try {
      await authRequest("/sign-in/email", {
        email: String(values.get("email")).trim().toLowerCase(),
        password: String(values.get("password")),
        rememberMe: true,
      });
      const user = await refresh();
      if (!user) throw new Error("Session unavailable");
      await navigate(workspace(user, destination), { replace: true });
    } catch (failure) {
      setError(
        failureMessage(
          failure,
          "Sign-in failed. Check your details and try again.",
        ),
      );
    } finally {
      setBusy(null);
    }
  }
  async function google() {
    if (busy) return;
    setError(null);
    setBusy("google");
    try {
      await startGoogle(undefined, destination);
    } catch (failure) {
      setError(
        failureMessage(
          failure,
          "Google sign-in could not start. Try again or use email.",
        ),
      );
    } finally {
      setBusy(null);
    }
  }
  return (
    <Stack maxWidth={460} mx="auto" gap={3}>
      <div>
        <Typography
          variant="h2"
          component="h1"
          fontSize={{ xs: "2.4rem", md: "3.2rem" }}
        >
          Continue your debugging practice
        </Typography>
        <Typography color="text.secondary" mt={1.5}>
          Sign in to your Learner or Instructor workspace.
        </Typography>
      </div>
      <AuthError message={error} />
      {(location.state as { verificationPending?: boolean } | null)
        ?.verificationPending && (
        <Alert severity="info">
          Registration request accepted. If verification is needed, check your
          email and verify your address before signing in. Already registered?
          Sign in or reset your password.
        </Alert>
      )}
      {busy && (
        <Typography role="status">
          {busy === "google" ? "Connecting to Google…" : "Signing in…"}
        </Typography>
      )}
      <Button
        variant="outlined"
        startIcon={<Google />}
        onClick={() => void google()}
        disabled={busy !== null}
      >
        {busy === "google" ? "Connecting to Google…" : "Continue with Google"}
      </Button>
      <Divider>or use email</Divider>
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
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        <Button type="submit" variant="contained" disabled={busy !== null}>
          {busy === "email" ? "Signing in…" : "Sign in"}
        </Button>
      </Stack>
      <Link component={RouterLink} to="/verification">
        Resend verification email
      </Link>
      <Link component={RouterLink} to="/forgot-password">
        Forgot password or need to establish a password?
      </Link>
      <Typography color="text.secondary">
        New to DebugClinic?{" "}
        <Link component={RouterLink} to="/register">
          Create an account
        </Link>
      </Typography>
    </Stack>
  );
}
