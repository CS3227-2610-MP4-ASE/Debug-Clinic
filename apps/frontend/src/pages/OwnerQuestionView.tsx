import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  Stack,
  Typography,
} from "@mui/material";
import type { OwnerQuestion } from "@debugclinic/contracts";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import {
  QuestionError,
  questionFailure,
  removeQuestion,
} from "../lib/instructor-questions.js";
import { InstructorDraftFields } from "./InstructorDraftFields.js";

export function OwnerQuestionView({
  question,
  message,
  onChange,
}: {
  question: OwnerQuestion;
  message?: string;
  onChange: (question: OwnerQuestion) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const busy = useRef(false);
  const cancelButton = useRef<HTMLButtonElement>(null);
  const active = useRef(true);
  const { sessionExpired, user } = useAuth();
  const expired = sessionExpired || !user;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  async function remove() {
    if (busy.current || expired) return;
    busy.current = true;
    setPending(true);
    setError(null);
    setConfirm(false);
    try {
      const result = await removeQuestion(question.id);
      if (active.current) {
        onChange(result.question);
        setFeedback("Question removed. Your read-only record is retained.");
      }
    } catch (failed) {
      if (active.current)
        setError(
          failed instanceof QuestionError && failed.outcome === "UNKNOWN"
            ? "Removal outcome is unconfirmed. Retry Remove or refresh to review its current state."
            : questionFailure(failed),
        );
    } finally {
      if (active.current) {
        busy.current = false;
        setPending(false);
      }
    }
  }
  return (
    <Stack gap={3} minWidth={0}>
      {(feedback ?? message) && (
        <Alert severity="success" role="status">
          {feedback ?? message}
        </Alert>
      )}
      <Typography>
        {question.status === "ARCHIVED"
          ? "Removed. Your read-only record is retained."
          : "Published. Question content is read-only."}
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button
          component={RouterLink}
          to="/instructor/questions?status=PUBLISHED"
        >
          Published
        </Button>
        <Button
          component={RouterLink}
          to="/instructor/questions?status=ARCHIVED"
        >
          Removed
        </Button>
        <Button component={RouterLink} to="/instructor/questions/new">
          New question
        </Button>
      </Stack>
      <Typography sx={{ overflowWrap: "anywhere" }}>
        Topic: {question.topic}
      </Typography>
      <InstructorDraftFields value={question} showDraftNotice={false} />
      {expired && (
        <Alert severity="warning">
          Your session expired. Sign in again before making changes.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {pending && <Typography role="status">Removing question…</Typography>}
      {question.status === "PUBLISHED" && (
        <Button
          color="error"
          variant="outlined"
          disabled={pending || expired}
          onClick={() => setConfirm(true)}
        >
          Remove
        </Button>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        aria-describedby="remove-prompt"
        slotProps={{
          transition: { onEntered: () => cancelButton.current?.focus() },
        }}
      >
        <DialogContent>
          <DialogContentText id="remove-prompt">
            Remove this question? It will no longer be available to learners.
            Your read-only record will be retained.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            autoFocus
            ref={cancelButton}
            onClick={() => setConfirm(false)}
          >
            Cancel
          </Button>
          <Button color="error" onClick={() => void remove()}>
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
