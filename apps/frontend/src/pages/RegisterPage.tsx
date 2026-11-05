import Google from "@mui/icons-material/Google";
import {
  Button,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Link,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { RoleSchema, type Role } from "@debugclinic/contracts";
import {
  authRequest,
  failureMessage,
  startGoogle,
  workspace,
} from "../auth/actions.js";
import { useAuth } from "../auth/AuthProvider.js";
import { AuthError } from "../auth/AuthError.js";

export function RegisterPage() {
  const [role, setRole] = useState<Role | "">("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"email" | "google" | null>(null);
  const [registrationAccepted, setRegistrationAccepted] = useState(false);
  const { refresh } = useAuth();
  const navigate = useNavigate();
  function selectedRole(): Role {
    const parsed = RoleSchema.safeParse(role);
    if (!parsed.success) throw new Error("Choose a role");
    return parsed.data;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const values = new FormData(event.currentTarget);
    setBusy("email");
    setError(null);
    try {
      if (!registrationAccepted) {
        const registrationRole = selectedRole();
        await authRequest("/sign-up/email", {
          name: String(values.get("name")),
          email: String(values.get("email")).trim().toLowerCase(),
          password: String(values.get("password")),
          registrationRole,
        });
        setRegistrationAccepted(true);
      }
      // Only /me authorizes navigation; duplicate responses may contain synthetic users.
      const session = await refresh();
      if (!session.ok) {
        setError(
          "Registration request accepted, but we could not check your session. Check your connection and retry the session check.",
        );
        return;
      }
      if (!session.user) {
        await navigate("/sign-in", {
          replace: true,
          state: { verificationPending: true },
        });
        return;
      }
      await navigate(workspace(session.user), { replace: true });
    } catch (failure) {
      setError(
        !role
          ? "Choose Learner or Instructor before registering."
          : failureMessage(
              failure,
              "Registration failed. Review your details and try again.",
            ),
      );
    } finally {
      setBusy(null);
    }
  }
  async function google() {
    if (busy) return;
    setBusy("google");
    setError(null);
    try {
      await startGoogle(selectedRole());
    } catch (failure) {
      setError(
        !role
          ? "Choose Learner or Instructor before registering."
          : failureMessage(
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
          Create an account
        </Typography>
        <Typography color="text.secondary" mt={1.5}>
          Register as a Learner or Instructor. Your initial role stays with your
          account.
        </Typography>
      </div>
      <AuthError message={error} />
      {busy && (
        <Typography role="status">
          {busy === "google"
            ? "Connecting to Google…"
            : registrationAccepted
              ? "Checking your session…"
              : "Creating account…"}
        </Typography>
      )}
      <FormControl required disabled={busy !== null || registrationAccepted}>
        <FormLabel id="registration-role">Choose your role</FormLabel>
        <RadioGroup
          aria-labelledby="registration-role"
          value={role}
          onChange={(event) => setRole(RoleSchema.parse(event.target.value))}
        >
          <FormControlLabel
            value="LEARNER"
            control={<Radio />}
            label="Learner"
          />
          <FormControlLabel
            value="INSTRUCTOR"
            control={<Radio />}
            label="Instructor"
          />
        </RadioGroup>
      </FormControl>
      <Button
        variant="outlined"
        startIcon={<Google />}
        onClick={() => void google()}
        disabled={busy !== null || registrationAccepted}
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
          label="Name"
          name="name"
          disabled={registrationAccepted}
          autoComplete="name"
          required
          inputProps={{ maxLength: 100 }}
        />
        <TextField
          label="Email"
          name="email"
          disabled={registrationAccepted}
          type="email"
          autoComplete="email"
          required
        />
        <TextField
          label="Password"
          name="password"
          disabled={registrationAccepted}
          type="password"
          autoComplete="new-password"
          required
          helperText="Use 12 to 128 characters."
          inputProps={{ minLength: 12, maxLength: 128 }}
        />
        <Button type="submit" variant="contained" disabled={busy !== null}>
          {registrationAccepted
            ? busy === "email"
              ? "Checking your session…"
              : "Retry session check"
            : busy === "email"
              ? "Creating account…"
              : "Create account"}
        </Button>
      </Stack>
      <Typography color="text.secondary">
        Already registered?{" "}
        <Link component={RouterLink} to="/sign-in">
          Sign in
        </Link>
      </Typography>
      <Link component={RouterLink} to="/forgot-password">
        Have a Google account? Establish a password through recovery
      </Link>
    </Stack>
  );
}
