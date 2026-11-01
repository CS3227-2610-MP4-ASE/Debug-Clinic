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

import { authClient } from "../auth/auth-client.js";
import { useAuth } from "../auth/AuthProvider.js";

export function SignInPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destination = (location.state as { from?: string } | null)?.from ?? "/";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const values = new FormData(event.currentTarget);
    const result = await authClient.signIn.email({
      email: String(values.get("email")),
      password: String(values.get("password")),
      rememberMe: true,
    });
    if (result.error) {
      setError(
        result.error.message ??
          "Sign-in failed. Check your details and try again.",
      );
      setBusy(false);
      return;
    }
    await refresh();
    await navigate(destination, { replace: true });
  }

  async function googleSignIn() {
    setError(null);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: destination,
    });
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
          Sign in with the account approved for your DebugClinic role.
        </Typography>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      <Button
        variant="outlined"
        startIcon={<Google />}
        onClick={() => void googleSignIn()}
        disabled={busy}
      >
        Continue with Google
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
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </Stack>
      <Typography color="text.secondary">
        New to DebugClinic?{" "}
        <Link component={RouterLink} to="/register">
          Create a learner account
        </Link>
      </Typography>
    </Stack>
  );
}
