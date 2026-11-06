import { Box, Typography } from "@mui/material";

export type LearnerRunnerResult =
  | { state: "unavailable"; message: string }
  | { state: "running"; message: string }
  | { state: "complete"; output: string }
  | { state: "failed"; message: string };

export const RUNNER_UNAVAILABLE: LearnerRunnerResult = {
  state: "unavailable",
  message: "Run is unavailable until a secure Python runner is approved.",
};

export function LearnerOutputPanel({
  result = RUNNER_UNAVAILABLE,
}: {
  result?: LearnerRunnerResult;
}) {
  const value = result.state === "complete" ? result.output : result.message;
  return (
    <section
      aria-labelledby="output-title"
      style={{ minHeight: 120, overflow: "auto" }}
    >
      <Typography id="output-title" component="h2" variant="h6" sx={{ mb: 1 }}>
        Output
      </Typography>
      <Box
        role="status"
        aria-live="polite"
        component="pre"
        sx={{
          m: 0,
          p: 1.5,
          minHeight: 72,
          bgcolor: "background.default",
          whiteSpace: "pre-wrap",
          overflowWrap: "anywhere",
          fontFamily: "monospace",
        }}
      >
        {value}
      </Box>
    </section>
  );
}
