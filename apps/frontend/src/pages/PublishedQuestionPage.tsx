import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import type { PublishedQuestion } from "@debugclinic/contracts";
import { useEffect, useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import {
  getPublishedQuestion,
  QuestionError,
  questionFailure,
} from "../lib/instructor-questions.js";

export function PublishedQuestionPage() {
  const { id = "" } = useParams();
  const [question, setQuestion] = useState<PublishedQuestion | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [revision, setRevision] = useState(0);
  const { sessionExpired, user } = useAuth();
  useEffect(() => {
    let active = true;
    setQuestion(null);
    setPending(true);
    setError(null);
    setUnavailable(false);
    void getPublishedQuestion(id)
      .then((result) => {
        if (active) setQuestion(result.question);
      })
      .catch((failed: unknown) => {
        if (active) {
          setUnavailable(
            failed instanceof QuestionError && failed.status === 404,
          );
          setError(questionFailure(failed));
        }
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [id, revision]);
  return (
    <Stack gap={3} maxWidth={850} minWidth={0}>
      <Typography component="h1" variant="h3" sx={{ overflowWrap: "anywhere" }}>
        {question?.title ?? "Question"}
      </Typography>
      <Button
        component={RouterLink}
        to="/learner/questions"
        sx={{ alignSelf: "flex-start" }}
      >
        Back to published questions
      </Button>
      {pending && <Typography role="status">Loading question…</Typography>}
      {error && (
        <Alert severity={unavailable ? "info" : "error"}>
          {unavailable ? "This question is unavailable." : error}
        </Alert>
      )}
      {error && !unavailable && (
        <Button
          disabled={pending || sessionExpired || !user}
          onClick={() => setRevision((value) => value + 1)}
        >
          Retry
        </Button>
      )}
      {question && (
        <>
          <Typography sx={{ overflowWrap: "anywhere" }}>
            Topic: {question.topic}
          </Typography>
          <Typography sx={{ overflowWrap: "anywhere" }}>
            Instructor: {question.instructorName}
          </Typography>
          <Typography>
            Published {new Date(question.publishedAt).toLocaleString()}
          </Typography>
          <Typography component="h2" variant="h6">
            Problem statement
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {question.problemStatement}
          </Typography>
          <Typography component="h2" variant="h6">
            Buggy Python code
          </Typography>
          <Box
            component="pre"
            sx={{
              m: 0,
              p: 2,
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              maxWidth: "100%",
              bgcolor: "background.paper",
            }}
          >
            {question.buggyCode}
          </Box>
          <Typography component="h2" variant="h6">
            Expected behavior
          </Typography>
          <Typography sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {question.expectedBehavior}
          </Typography>
          <Button disabled aria-describedby="hint-placeholder">
            Get Hint
          </Button>
          <Typography id="hint-placeholder">Coming soon</Typography>
        </>
      )}
    </Stack>
  );
}
