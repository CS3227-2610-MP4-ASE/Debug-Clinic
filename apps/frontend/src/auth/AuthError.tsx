import { Alert } from "@mui/material";
import { useEffect, useRef } from "react";

/** Announce actionable feedback and put keyboard focus where recovery starts. */
export function AuthError({ message }: { message: string | null }) {
  const alert = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (message) alert.current?.focus();
  }, [message]);
  return message ? (
    <Alert ref={alert} severity="error" tabIndex={-1}>
      {message}
    </Alert>
  ) : null;
}
