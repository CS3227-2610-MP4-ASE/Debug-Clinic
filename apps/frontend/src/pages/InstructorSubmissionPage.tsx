import type { InstructorSubmissionDetail } from "@debugclinic/contracts";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";

import { useGradingAccess } from "../auth/GradingAdmission.js";
import { InstructorGradeForm } from "../components/InstructorGradeForm.js";
import { SubmissionSnapshot } from "../components/SubmissionSnapshot.js";
import { readInstructorSubmission } from "../lib/grading.js";
import { useGradingRequest } from "../lib/use-grading-request.js";

export function InstructorSubmissionPage() {
  const { attemptId = "" } = useParams();
  const { state } = useLocation();
  const { verified } = useGradingAccess();
  const [submission, setSubmission] =
    useState<InstructorSubmissionDetail | null>(null);
  const [failed, setFailed] = useState(false);
  const run = useGradingRequest();
  const load = useCallback(() => {
    if (!verified) return;
    setFailed(false);
    run(
      (access) => readInstructorSubmission(access, attemptId),
      setSubmission,
      () => setFailed(true),
    );
  }, [attemptId, run, verified]);
  useEffect(() => {
    if (!submission) load();
  }, [load, submission]);

  return (
    <Stack gap={2.5}>
      <Button
        component={RouterLink}
        to={
          state?.view === "graded"
            ? "/instructor/submissions?view=graded"
            : "/instructor/submissions"
        }
        sx={{ alignSelf: "flex-start" }}
      >
        Back to submissions
      </Button>
      <Typography component="h1" variant="h4">
        Final submission
      </Typography>
      {submission ? (
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(0, 2fr) minmax(0, 1fr)",
            },
            alignItems: "start",
            gap: 3,
          }}
        >
          <SubmissionSnapshot
            submission={submission}
            learner={submission.learnerDisplayName}
          />
          <InstructorGradeForm
            attemptId={attemptId}
            initialGrade={submission.grade}
          />
        </Box>
      ) : failed ? (
        <Alert
          severity="error"
          action={
            <Button color="inherit" disabled={!verified} onClick={load}>
              Try again
            </Button>
          }
        >
          The submission could not be loaded.
        </Alert>
      ) : (
        <Typography role="status">Loading submission…</Typography>
      )}
    </Stack>
  );
}
