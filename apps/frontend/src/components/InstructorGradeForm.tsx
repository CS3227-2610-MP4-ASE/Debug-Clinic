import {
  GradingScoreSchema,
  type InstructorGrade,
  type SaveSubmissionGradeRequest,
} from "@debugclinic/contracts";
import {
  Box,
  Button,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { useGradingAccess } from "../auth/GradingAdmission.js";
import {
  GradingRequestError,
  readInstructorGrade,
  saveSubmissionGrade,
} from "../lib/grading.js";
import { useGradingRequest } from "../lib/use-grading-request.js";
import { gradeText } from "./SubmissionSnapshot.js";

type PendingGrade = {
  request: SaveSubmissionGradeRequest;
  reason: "unknown" | "conflict";
};
type Phase = "ready" | "saving" | "checking" | "check-failed" | "refreshing";
const invalidScore = "Enter a whole number from 1 to 10.";

export function InstructorGradeForm({
  attemptId,
  initialGrade,
}: {
  attemptId: string;
  initialGrade: InstructorGrade | null;
}) {
  const { verified } = useGradingAccess();
  const run = useGradingRequest();
  const [confirmed, setConfirmed] = useState(initialGrade);
  const [input, setInput] = useState(
    initialGrade ? String(initialGrade.score) : "",
  );
  const [validation, setValidation] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [terminal, setTerminal] = useState(false);
  const [notice, setNotice] = useState("");
  const pending = useRef<PendingGrade | null>(null);
  const paused = useRef(false);
  const edited = useRef(false);

  const checkGrade = useCallback(() => {
    const current = pending.current;
    if (!verified || !current) return;
    setPhase("checking");
    setNotice("Checking the current grade…");
    run(
      (access) => readInstructorGrade(access, attemptId),
      ({ grade }) => {
        setConfirmed(grade);
        pending.current = null;
        setPhase("ready");
        if (current.reason === "conflict") {
          setNotice(
            "The grade changed. Review the current grade. Your entered score is unsaved.",
          );
        } else if (grade?.score === current.request.score) {
          edited.current = false;
          setNotice("Your entered score is confirmed as the current grade.");
        } else {
          setNotice(
            "The current grade was checked. Your entered score is unsaved.",
          );
        }
      },
      () => {
        setPhase("check-failed");
        setNotice("Grade outcome could not be confirmed.");
      },
    );
  }, [attemptId, run, verified]);

  useLayoutEffect(() => {
    if (!verified) {
      paused.current = true;
      return;
    }
    if (!paused.current) return;
    paused.current = false;
    if (pending.current) {
      checkGrade();
      return;
    }
    setPhase("refreshing");
    run(
      (access) => readInstructorGrade(access, attemptId),
      ({ grade }) => {
        setConfirmed(grade);
        if (!edited.current) setInput(grade ? String(grade.score) : "");
        if (!terminal && grade?.revision !== confirmed?.revision)
          setNotice(
            edited.current
              ? "The grade changed. Review the current grade. Your entered score is unsaved."
              : "The current grade was refreshed.",
          );
        setPhase("ready");
      },
      () => {
        if (!terminal) setNotice("The current grade could not be refreshed.");
        setPhase("ready");
      },
    );
  }, [attemptId, checkGrade, confirmed, run, terminal, verified]);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!verified || phase !== "ready" || terminal || pending.current) return;
    const text = input.trim();
    const score = GradingScoreSchema.safeParse(
      /^\d+$/.test(text) ? Number(text) : NaN,
    );
    if (!score.success) {
      setValidation(true);
      setNotice("");
      return;
    }
    const current: PendingGrade = {
      request: {
        score: score.data,
        expectedRevision: confirmed?.revision ?? null,
      },
      reason: "unknown",
    };
    pending.current = current;
    edited.current = true;
    setValidation(false);
    setPhase("saving");
    setNotice("Saving grade…");
    run(
      (access) => saveSubmissionGrade(access, attemptId, current.request),
      ({ grade }) => {
        pending.current = null;
        edited.current = false;
        setConfirmed(grade);
        setInput(String(grade.score));
        setPhase("ready");
        setNotice("Grade saved.");
      },
      (error) => {
        if (
          error instanceof GradingRequestError &&
          error.outcome === "NOT_APPLIED"
        ) {
          if (error.status === 409 && !error.revisionLimit) {
            current.reason = "conflict";
            checkGrade();
            return;
          }
          pending.current = null;
          setTerminal(error.revisionLimit);
          setPhase("ready");
          setNotice(
            error.revisionLimit || error.status === 403
              ? error.message
              : "The grade could not be saved. Try again.",
          );
          return;
        }
        checkGrade();
      },
    );
  }

  return (
    <Paper
      component="form"
      aria-label="Grade submission"
      variant="outlined"
      onSubmit={submit}
      sx={{ p: 2, minWidth: 0 }}
    >
      <Stack gap={1.5}>
        <Typography component="h2" variant="h6">
          Grade submission
        </Typography>
        <Box aria-live="polite" aria-atomic="true">
          <Typography variant="body2">Confirmed grade</Typography>
          <Typography fontWeight={750}>{gradeText(confirmed)}</Typography>
          {notice && <Typography sx={{ mt: 0.75 }}>{notice}</Typography>}
        </Box>
        <TextField
          label="Score"
          value={input}
          onChange={(event) => {
            edited.current = true;
            setInput(event.target.value);
            setValidation(false);
          }}
          disabled={!verified || phase !== "ready" || terminal}
          error={validation}
          helperText={
            validation ? (
              <span role="alert">{invalidScore}</span>
            ) : (
              "Whole number from 1 to 10"
            )
          }
          slotProps={{ htmlInput: { inputMode: "numeric" } }}
          fullWidth
        />
        {phase === "checking" || phase === "check-failed" ? (
          <Button
            onClick={checkGrade}
            disabled={!verified || phase === "checking"}
            variant="outlined"
            sx={{ minHeight: 44, alignSelf: "flex-start" }}
          >
            Check grade again
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={!verified || phase !== "ready" || terminal}
            variant="contained"
            sx={{ minHeight: 44, alignSelf: "flex-start" }}
          >
            Save grade
          </Button>
        )}
      </Stack>
    </Paper>
  );
}
