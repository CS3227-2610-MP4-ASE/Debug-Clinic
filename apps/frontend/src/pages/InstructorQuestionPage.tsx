import { Alert, Button, Stack, Typography } from "@mui/material";
import type { OwnerQuestion } from "@debugclinic/contracts";
import { useEffect, useState } from "react";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import {
  getOwnerQuestion,
  questionFailure,
} from "../lib/instructor-questions.js";
import { OwnerQuestionView } from "./OwnerQuestionView.js";
import { QuestionEditor } from "./QuestionEditor.js";

export function InstructorQuestionPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const [question, setQuestion] = useState<OwnerQuestion | null>(null);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState(
    (location.state as { saved?: boolean } | null)?.saved
      ? "Draft saved. This draft remains private."
      : "",
  );
  const { sessionExpired, user } = useAuth();
  useEffect(() => {
    if (sessionExpired || !user) return;
    let active = true;
    setPending(true);
    setQuestion(null);
    setError(null);
    void getOwnerQuestion(id)
      .then((result) => {
        if (active) setQuestion(result.question);
      })
      .catch((failed: unknown) => {
        if (active) setError(questionFailure(failed));
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
    // Session changes must not automatically refetch or replace admitted work.
  }, [id, revision]);
  return (
    <Stack gap={3} maxWidth={850} minWidth={0}>
      <Typography component="h1" variant="h3">
        {question?.status === "DRAFT"
          ? "Instructor draft"
          : "Instructor question"}
      </Typography>
      {pending && <Typography role="status">Loading question…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {(sessionExpired || !user) && !question && (
        <Alert severity="warning">
          Your session expired.{" "}
          <RouterLink to="/sign-in">Sign in again</RouterLink> to continue.
        </Alert>
      )}
      {error && (
        <Button
          disabled={sessionExpired || !user}
          onClick={() => setRevision((value) => value + 1)}
        >
          Retry
        </Button>
      )}
      {question?.status === "DRAFT" && (
        <>
          {message && (
            <Alert role="status" severity="success">
              {message}
            </Alert>
          )}
          <QuestionEditor
            key={`${id}-${revision}`}
            question={question}
            onReload={() => setRevision((value) => value + 1)}
            onResolved={(result, feedback) => {
              setMessage(feedback);
              setQuestion(result);
            }}
          />
        </>
      )}
      {question && question.status !== "DRAFT" && (
        <OwnerQuestionView
          question={question}
          message={message}
          onChange={setQuestion}
        />
      )}
    </Stack>
  );
}
