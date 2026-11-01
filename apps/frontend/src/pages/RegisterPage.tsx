import {
  Alert,
  Button,
  Link,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";

import { authClient } from "../auth/auth-client.js";
import { useAuth } from "../auth/AuthProvider.js";

export function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const values = new FormData(event.currentTarget);
    const result = await authClient.signUp.email({
      name: String(values.get("name")),
      email: String(values.get("email")),
      password: String(values.get("password")),
    });
    if (result.error) {
      setError(
        result.error.message ??
          "Registration failed. Review your details and try again.",
      );
      setBusy(false);
      return;
    }
    await refresh();
    await navigate("/learner", { replace: true });
  }

  return (
    <Stack maxWidth={460} mx="auto" gap={3}>
      <div>
        <Typography
          variant="h2"
          component="h1"
          fontSize={{ xs: "2.4rem", md: "3.2rem" }}
        >
          Create a learner account
        </Typography>
        <Typography color="text.secondary" mt={1.5}>
          Public registration always creates a learner. Instructor access is
          assigned through a controlled administrative process.
        </Typography>
      </div>
      {error && <Alert severity="error">{error}</Alert>}
      <Stack
        component="form"
        gap={2.5}
        onSubmit={(event) => void submit(event)}
      >
        <TextField
          label="Name"
          name="name"
          autoComplete="name"
          required
          inputProps={{ maxLength: 100 }}
        />
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
          autoComplete="new-password"
          required
          helperText="Use at least 12 characters."
          inputProps={{ minLength: 12, maxLength: 128 }}
        />
        <Button type="submit" variant="contained" disabled={busy}>
          {busy ? "Creating account…" : "Create account"}
        </Button>
      </Stack>
      <Typography color="text.secondary">
        Already registered?{" "}
        <Link component={RouterLink} to="/sign-in">
          Sign in
        </Link>
      </Typography>
    </Stack>
  );
}
