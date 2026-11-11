import type { LearnerSubmissionDetail } from "@debugclinic/contracts";
import { Alert, Button, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";

import { useGradingAccess } from "../auth/GradingAdmission.js";
import { LearnerGradePanel } from "../components/LearnerGradePanel.js";
import { SubmissionSnapshot } from "../components/SubmissionSnapshot.js";
import { readLearnerSubmission } from "../lib/grading.js";
import { useGradingRequest } from "../lib/use-grading-request.js";

export function LearnerSubmissionPage() {
  const { attemptId = "" } = useParams();
  const { verified, retrySession } = useGradingAccess();
  const [submission, setSubmission] = useState<LearnerSubmissionDetail | null>(
    null,
  );
  const [failed, setFailed] = useState(false);
  const run = useGradingRequest();
  const load = useCallback(() => {
    if (!verified) {
      retrySession();
      return;
    }
    setFailed(false);
    run(
      (access) => readLearnerSubmission(access, attemptId),
      setSubmission,
      () => setFailed(true),
    );
  }, [attemptId, retrySession, run, verified]);
  useEffect(() => {
    if (verified && !submission) load();
  }, [load, submission, verified]);

  return (
    <Stack gap={2.5} maxWidth={920}>
      <Button
        component={RouterLink}
        to="/learner/submissions"
        sx={{ alignSelf: "flex-start" }}
      >
        Back to my submissions
      </Button>
      <Typography component="h1" variant="h4">
        Final submission
      </Typography>
      {submission ? (
        <>
          <LearnerGradePanel
            attemptId={attemptId}
            initialGrade={submission.grade}
          />
          <SubmissionSnapshot submission={submission} />
        </>
      ) : failed || !verified ? (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" onClick={load}>
              Retry result
            </Button>
          }
        >
          Result unavailable
        </Alert>
      ) : (
        <Typography role="status">Loading result…</Typography>
      )}
    </Stack>
  );
}
