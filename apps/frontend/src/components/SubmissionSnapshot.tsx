import type {
  LearnerGrade,
  LearnerSubmissionDetail,
} from "@debugclinic/contracts";
import { Box, Paper, Stack, Typography } from "@mui/material";

export const gradeText = (grade: LearnerGrade | null) =>
  grade ? `${grade.score}/10` : "Awaiting grade";

export function SubmittedTime({ value }: { value: string }) {
  return <time dateTime={value}>{new Date(value).toLocaleString()}</time>;
}

export function SubmissionSnapshot({
  submission,
  learner,
}: {
  submission: Pick<
    LearnerSubmissionDetail,
    "question" | "submittedAt" | "code" | "reasoning"
  >;
  learner?: string;
}) {
  const { question, submittedAt, code, reasoning } = submission;
  const prose = { whiteSpace: "pre-wrap", overflowWrap: "anywhere" };
  return (
    <Stack component="article" gap={2.5} minWidth={0}>
      <Stack gap={0.75}>
        <Typography
          component="h2"
          variant="h5"
          sx={{ overflowWrap: "anywhere" }}
        >
          {question.title}
        </Typography>
        {learner !== undefined && (
          <Typography sx={{ overflowWrap: "anywhere" }}>
            Learner: {learner}
          </Typography>
        )}
        <Typography color="text.secondary">
          Submitted <SubmittedTime value={submittedAt} />
        </Typography>
      </Stack>
      <Stack component="section" gap={1}>
        <Typography component="h3" variant="h6">
          Problem
        </Typography>
        <Typography sx={prose}>{question.problemStatement}</Typography>
        <Typography component="h3" variant="h6">
          Expected behavior
        </Typography>
        <Typography sx={prose}>{question.expectedBehavior}</Typography>
      </Stack>
      <Stack component="section" gap={1}>
        <Typography component="h3" variant="h6">
          Submitted code
        </Typography>
        <Paper
          component="pre"
          variant="outlined"
          aria-label="Submitted code"
          tabIndex={0}
          sx={{
            m: 0,
            p: 2,
            overflowX: "auto",
            maxWidth: "100%",
            whiteSpace: "pre",
          }}
        >
          <Box component="code">{code}</Box>
        </Paper>
        <Typography component="h3" variant="h6">
          Submitted reasoning
        </Typography>
        <Typography sx={prose}>{reasoning}</Typography>
      </Stack>
    </Stack>
  );
}
