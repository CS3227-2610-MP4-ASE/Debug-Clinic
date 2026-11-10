import type { LearnerGrade } from "@debugclinic/contracts";
import { Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useLayoutEffect, useRef, useState } from "react";

import { useGradingAccess } from "../auth/GradingAdmission.js";
import { GradingRequestError, readLearnerGrade } from "../lib/grading.js";
import { startLearnerGradePoll } from "../lib/learner-grade-poll.js";
import { gradeText } from "./SubmissionSnapshot.js";

export function LearnerGradePanel({
  attemptId,
  initialGrade,
}: {
  attemptId: string;
  initialGrade?: LearnerGrade | null;
}) {
  const { actorId, deny, verified, retrySession } = useGradingAccess();
  const [grade, setGrade] = useState(initialGrade);
  const [failed, setFailed] = useState(false);
  const poll = useRef<ReturnType<typeof startLearnerGradePoll> | null>(null);

  useLayoutEffect(() => {
    const scheduler = startLearnerGradePoll(async (signal) => {
      try {
        const result = await readLearnerGrade({ actorId, signal }, attemptId);
        if (!signal.aborted) {
          setGrade(result.grade);
          setFailed(false);
        }
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof GradingRequestError && error.accessDenied) {
          scheduler.dispose();
          if (error.accessDenied === 401)
            window.dispatchEvent(new Event("debugclinic:session-expired"));
          deny(error.accessDenied);
          return;
        }
        setFailed(true);
        if (error instanceof GradingRequestError) return error.retryAfterMs;
      }
    }, false);
    poll.current = scheduler;
    return () => {
      poll.current = null;
      scheduler.dispose();
    };
  }, [actorId, attemptId, deny]);

  useLayoutEffect(() => {
    poll.current?.setActive(verified);
    if (!verified) setFailed(true);
  }, [actorId, attemptId, verified]);

  const unavailable = failed || !verified;
  return (
    <Paper
      component="section"
      aria-label="Grade result"
      variant="outlined"
      sx={{ px: 2, py: 1.25 }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        gap={0.5}
      >
        <Box aria-live="polite" aria-atomic="true">
          <Typography component="h2" variant="subtitle2">
            Grade result
          </Typography>
          <Typography fontWeight={700}>
            {grade === undefined
              ? unavailable
                ? "Result unavailable"
                : "Loading result…"
              : gradeText(grade)}
          </Typography>
          {grade !== undefined && unavailable && (
            <Typography variant="body2" color="text.secondary">
              This result may be out of date.
            </Typography>
          )}
        </Box>
        <Button
          onClick={() => (verified ? poll.current?.retry() : retrySession())}
          sx={{ minHeight: 44 }}
        >
          {unavailable ? "Retry result" : "Refresh result"}
        </Button>
      </Stack>
    </Paper>
  );
}
