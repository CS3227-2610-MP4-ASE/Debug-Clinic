import CheckOutlined from "@mui/icons-material/CheckOutlined";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import type {
  LearnerAttempt,
  LearnerAttemptWrite,
  PublishedQuestion,
} from "@debugclinic/contracts";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { QuestionError } from "../lib/instructor-questions.js";
import { useUnsavedWork } from "../components/UnsavedWork.js";
import { LearnerWorkspace } from "../components/LearnerWorkspace.js";
import {
  getLearnerAttempt,
  getPublishedQuestion,
  questionFailure,
  saveLearnerAttempt,
  submitLearnerAttempt,
} from "../lib/instructor-questions.js";

export function PublishedQuestionPage() {
  const { id = "" } = useParams();
  const location = useLocation();
  const { sessionEpoch, sessionExpired, user } = useAuth();
  const { setDirty } = useUnsavedWork();
  const [question, setQuestion] = useState<PublishedQuestion | null>(null);
  const [attempt, setAttempt] = useState<LearnerAttempt | null>(null);
  const [code, setCode] = useState("");
  const [reasoning, setReasoning] = useState("");
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadRevision, setLoadRevision] = useState(0);
  const dirty = useRef(false);
  const lifecycle = useRef(0);
  const currentUserId = user?.id ?? null;
  const identity = useRef({ userId: currentUserId, revision: 0 });
  if (identity.current.userId !== currentUserId) {
    identity.current = {
      userId: currentUserId,
      revision: identity.current.revision + 1,
    };
  }
  const session = useRef({
    userId: currentUserId,
    sessionEpoch,
    sessionExpired,
    identityRevision: identity.current.revision,
  });
  session.current = {
    userId: currentUserId,
    sessionEpoch,
    sessionExpired,
    identityRevision: identity.current.revision,
  };
  const ownerId = useId();
  const retryingAttemptLoad = useRef(false);
  const back = `/learner/questions${location.search}`;
  const updateDirty = useCallback(
    (value: boolean) => {
      dirty.current = value;
      setDirty(value, ownerId);
    },
    [ownerId, setDirty],
  );
  useEffect(() => {
    let active = true;
    const generation = ++lifecycle.current;
    const retry = retryingAttemptLoad.current;
    retryingAttemptLoad.current = false;
    if (!retry) {
      updateDirty(false);
      setQuestion(null);
      setAttempt(null);
      setCode("");
      setReasoning("");
    }
    setPending(true);
    setLoadError(null);
    setUnavailable(false);
    setError(null);
    void getPublishedQuestion(id)
      .then(async ({ question: found }) => {
        if (!active) return;
        setQuestion(found);
        const { attempt: saved } = await getLearnerAttempt(id);
        if (!active) return;
        if (!dirty.current) {
          setAttempt(saved);
          setCode(saved?.code ?? "");
          setReasoning(saved?.reasoning ?? "");
        }
      })
      .catch((failed: unknown) => {
        if (active) {
          setUnavailable(
            failed instanceof QuestionError && failed.status === 404,
          );
          setLoadError(questionFailure(failed));
        }
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
      if (lifecycle.current === generation) {
        lifecycle.current += 1;
        updateDirty(false);
      }
    };
  }, [id, loadRevision, sessionEpoch, updateDirty]);
  useEffect(() => {
    if (sessionExpired || !user) setSaving(false);
  }, [sessionExpired, user]);
  function editCode(value: string) {
    setCode(value);
    updateDirty(
      value !== (attempt?.code ?? "") ||
        reasoning !== (attempt?.reasoning ?? ""),
    );
  }
  function editReasoning(value: string) {
    setReasoning(value);
    updateDirty(
      code !== (attempt?.code ?? "") || value !== (attempt?.reasoning ?? ""),
    );
  }
  async function persist(submit: boolean) {
    const generation = lifecycle.current;
    const learnerId = user?.id ?? null;
    const requestSessionEpoch = sessionEpoch;
    const requestIdentityRevision = identity.current.revision;
    const isCurrent = () =>
      lifecycle.current === generation &&
      session.current.userId === learnerId &&
      session.current.sessionEpoch === requestSessionEpoch &&
      session.current.identityRevision === requestIdentityRevision &&
      !session.current.sessionExpired;
    const input: LearnerAttemptWrite = {
      code,
      reasoning,
      expectedRevision: attempt?.revision ?? null,
    };
    setSaving(true);
    setError(null);
    try {
      const result = submit
        ? await submitLearnerAttempt(id, input)
        : await saveLearnerAttempt(id, input);
      if (!isCurrent()) return;
      setAttempt(result.attempt);
      if (submit && result.attempt) {
        setCode(result.attempt.code);
        setReasoning(result.attempt.reasoning);
      }
      updateDirty(false);
    } catch (failed) {
      if (isCurrent()) setError(questionFailure(failed));
    } finally {
      if (isCurrent()) setSaving(false);
    }
  }
  const submitted = attempt?.status === "FINAL_SUBMITTED";
  return (
    <Box
      sx={{
        height: { xs: "auto", md: "100%" },
        minHeight: { xs: "calc(100vh - 104px)", md: 0 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
      }}
    >
      <Stack
        direction={{ xs: "column", sm: "row" }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
        gap={1}
      >
        <Typography
          component="h1"
          variant="h5"
          sx={{ overflowWrap: "anywhere" }}
        >
          {question?.title ?? (pending ? "Loading question…" : "Question")}
        </Typography>
        <Button
          component={RouterLink}
          to={back}
          sx={{ minHeight: 44, flexShrink: 0 }}
        >
          Back to published questions
        </Button>
      </Stack>
      {pending && (
        <Typography role="status">
          Loading question and saved attempt…
        </Typography>
      )}
      {loadError && (
        <Alert severity={unavailable ? "info" : "error"}>
          {unavailable ? "This question is unavailable." : loadError}
        </Alert>
      )}
      {loadError && !unavailable && (
        <Button
          onClick={() => {
            retryingAttemptLoad.current = true;
            setLoadRevision((value) => value + 1);
          }}
          disabled={sessionExpired || !user}
          sx={{ minHeight: 44 }}
        >
          Retry
        </Button>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {submitted && (
        <Alert severity="success" icon={<CheckOutlined />}>
          Final submission received. This attempt is read-only.
        </Alert>
      )}
      {question && (
        <Box
          sx={{
            minHeight: 0,
            flex: 1,
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(0, 2fr) minmax(0, 3fr)",
            },
            gridTemplateRows: { xs: "auto auto", md: "minmax(0, 1fr)" },
            gap: 2,
            overflow: { xs: "visible", md: "hidden" },
          }}
        >
          <Stack
            component="article"
            aria-label="Question details"
            gap={1.25}
            sx={{ minWidth: 0, minHeight: 0, overflow: "auto", pr: 1 }}
          >
            <Typography color="text.secondary">
              Topic: {question.topic}
            </Typography>
            <Typography component="h2" variant="h6">
              Problem
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {question.problemStatement}
            </Typography>
            <Typography component="h2" variant="h6">
              Buggy Python code
            </Typography>
            <Box
              component="pre"
              sx={{
                m: 0,
                p: 1.5,
                bgcolor: "background.paper",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
                fontFamily: "monospace",
              }}
            >
              {question.buggyCode}
            </Box>
            <Typography component="h2" variant="h6">
              Expected behavior
            </Typography>
            <Typography
              sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}
            >
              {question.expectedBehavior}
            </Typography>
            <Button
              disabled
              aria-describedby="hint-placeholder"
              sx={{ alignSelf: "flex-start", minHeight: 44 }}
            >
              Get Hint
            </Button>
            <Typography id="hint-placeholder">Coming soon</Typography>
          </Stack>
          <LearnerWorkspace
            code={code}
            reasoning={reasoning}
            disabled={
              pending ||
              saving ||
              Boolean(loadError) ||
              submitted ||
              sessionExpired ||
              !user
            }
            saving={saving}
            onCodeChange={editCode}
            onReasoningChange={editReasoning}
            onSave={() => void persist(false)}
            onSubmit={() => {
              if (
                window.confirm(
                  "Submit this final attempt? You cannot edit it afterward.",
                )
              )
                void persist(true);
            }}
          />
        </Box>
      )}
    </Box>
  );
}
