import CheckOutlined from "@mui/icons-material/CheckOutlined";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import type {
  LearnerAttempt,
  LearnerAttemptWrite,
  PublishedQuestion,
} from "@debugclinic/contracts";
import { LearnerAttemptWriteSchema } from "@debugclinic/contracts";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { GradingAdmission } from "../auth/GradingAdmission.js";
import { QuestionError } from "../lib/instructor-questions.js";
import { useUnsavedWork } from "../components/UnsavedWork.js";
import { LearnerWorkspace } from "../components/LearnerWorkspace.js";
import { LearnerAssistantPanel } from "../components/LearnerAssistantPanel.js";
import { LearnerGradePanel } from "../components/LearnerGradePanel.js";
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
  const [runOutput, setRunOutput] = useState("");
  const [assistantOpenRequest, setAssistantOpenRequest] = useState(0);
  const [pending, setPending] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recoveryNotice, setRecoveryNotice] = useState<{
    message: string;
    severity: "info" | "success" | "warning";
  } | null>(null);
  const [reconciliationRequired, setReconciliationRequired] = useState(false);
  const [recoveredLocal, setRecoveredLocal] = useState<{
    code: string;
    reasoning: string;
  } | null>(null);
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
  const back = `/learner/question${location.search}`;
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
      setRecoveredLocal(null);
      setReconciliationRequired(false);
      setRecoveryNotice(null);
    }
    setPending(true);
    setLoadError(null);
    setUnavailable(false);
    setError(null);
    void getPublishedQuestion(id)
      .then(async ({ question: found }) => {
        if (!active) return;
        setQuestion(found);
        setCode(found.buggyCode);
        const { attempt: saved } = await getLearnerAttempt(id);
        if (!active) return;
        if (!dirty.current) {
          setAttempt(saved);
          setCode(saved?.code ?? found.buggyCode);
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
    const baselineCode = attempt?.code ?? question?.buggyCode ?? "";
    updateDirty(
      value !== baselineCode || reasoning !== (attempt?.reasoning ?? ""),
    );
  }
  function editReasoning(value: string) {
    setReasoning(value);
    const baselineCode = attempt?.code ?? question?.buggyCode ?? "";
    updateDirty(code !== baselineCode || value !== (attempt?.reasoning ?? ""));
  }
  function captureCurrentSession() {
    const generation = lifecycle.current;
    const learnerId = user?.id ?? null;
    const requestSessionEpoch = sessionEpoch;
    const requestIdentityRevision = identity.current.revision;
    return () =>
      lifecycle.current === generation &&
      session.current.userId === learnerId &&
      session.current.sessionEpoch === requestSessionEpoch &&
      session.current.identityRevision === requestIdentityRevision &&
      !session.current.sessionExpired;
  }
  async function reconcileAttempt(
    local: { code: string; reasoning: string },
    isCurrent: () => boolean,
  ) {
    if (!isCurrent()) return;
    setReconciliationRequired(true);
    setSaving(true);
    try {
      const { attempt: serverAttempt } = await getLearnerAttempt(id);
      if (!isCurrent()) return;
      const localMatchesServer =
        serverAttempt?.code === local.code &&
        serverAttempt.reasoning === local.reasoning;
      setAttempt(serverAttempt);
      setError(null);
      setReconciliationRequired(false);
      if (serverAttempt?.status === "FINAL_SUBMITTED") {
        setCode(serverAttempt.code);
        setReasoning(serverAttempt.reasoning);
        if (localMatchesServer) {
          setRecoveredLocal(null);
          updateDirty(false);
          setRecoveryNotice({
            severity: "success",
            message: "The final submission is confirmed and read-only.",
          });
        } else {
          setRecoveredLocal(local);
          updateDirty(true);
          setRecoveryNotice({
            severity: "warning",
            message:
              "A final submission is already on the server. The editor shows that submitted version; your different local edits are preserved below and were not submitted.",
          });
        }
      } else if (!serverAttempt) {
        setRecoveredLocal(null);
        updateDirty(true);
        setRecoveryNotice({
          severity: "info",
          message:
            "No draft exists on the server. Your local edits are preserved; Save draft can create the attempt.",
        });
      } else if (localMatchesServer) {
        setCode(serverAttempt.code);
        setReasoning(serverAttempt.reasoning);
        setRecoveredLocal(null);
        updateDirty(false);
        setRecoveryNotice({
          severity: "success",
          message: "The server confirms that this draft was saved.",
        });
      } else {
        setRecoveredLocal(null);
        updateDirty(true);
        setRecoveryNotice({
          severity: "warning",
          message:
            "A newer draft revision was found. Your local edits are preserved; Save draft will use the current server revision.",
        });
      }
    } catch (failed) {
      if (isCurrent()) {
        setRecoveryNotice(null);
        setReconciliationRequired(true);
        setError(
          `Could not confirm the current attempt. ${questionFailure(failed)}`,
        );
      }
    } finally {
      if (isCurrent()) setSaving(false);
    }
  }
  async function persist(submit: boolean) {
    const isCurrent = captureCurrentSession();
    const local = { code, reasoning };
    const input: LearnerAttemptWrite = {
      ...local,
      expectedRevision: attempt?.revision ?? null,
    };
    const validation = LearnerAttemptWriteSchema.safeParse(input);
    if (!validation.success) {
      setError(
        validation.error.issues
          .map((issue) => {
            const label =
              issue.path[0] === "reasoning"
                ? "Explain your reasoning"
                : issue.path[0] === "code"
                  ? "Your Python 3 code"
                  : "Attempt";
            return `${label}: ${issue.message}`;
          })
          .join("; "),
      );
      return;
    }
    if (
      submit &&
      !window.confirm(
        "Submit this final attempt? You cannot edit it afterward.",
      )
    )
      return;
    setSaving(true);
    setError(null);
    setRecoveryNotice(null);
    try {
      const result = submit
        ? await submitLearnerAttempt(id, input)
        : await saveLearnerAttempt(id, input);
      if (!isCurrent()) return;
      setAttempt(result.attempt);
      setReconciliationRequired(false);
      setRecoveredLocal(null);
      if (submit && result.attempt) {
        setCode(result.attempt.code);
        setReasoning(result.attempt.reasoning);
      }
      updateDirty(false);
    } catch (failed) {
      if (isCurrent()) {
        setError(questionFailure(failed));
        const outcomeIsUncertain =
          !(failed instanceof QuestionError) ||
          failed.outcome === "UNKNOWN" ||
          failed.status === 409;
        if (outcomeIsUncertain) await reconcileAttempt(local, isCurrent);
      }
    } finally {
      if (isCurrent()) setSaving(false);
    }
  }
  const submitted = attempt?.status === "FINAL_SUBMITTED";
  return (
    <Box
      aria-busy={pending}
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
        <Stack
          component="section"
          aria-label="Question and attempt loading"
          aria-busy="true"
          gap={1}
        >
          {!question && (
            <Box aria-hidden="true" sx={{ maxWidth: 640 }}>
              <Skeleton width="42%" height={34} />
              <Skeleton height={72} />
              <Skeleton height={110} />
            </Box>
          )}
          <Stack direction="row" alignItems="center" gap={1} role="status">
            <CircularProgress size={20} aria-label="Loading question" />
            <Typography>Loading question and saved attempt…</Typography>
          </Stack>
        </Stack>
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
      {recoveryNotice && (
        <Alert severity={recoveryNotice.severity}>
          {recoveryNotice.message}
        </Alert>
      )}
      {reconciliationRequired && saving && (
        <Typography role="status">
          Checking the latest saved attempt…
        </Typography>
      )}
      {reconciliationRequired && !saving && (
        <>
          <Alert severity="warning">
            Save and submit are paused until the server attempt is confirmed.
            Your local edits are retained.
          </Alert>
          <Button
            onClick={() =>
              void reconcileAttempt(
                { code, reasoning },
                captureCurrentSession(),
              )
            }
            disabled={sessionExpired || !user}
            sx={{ minHeight: 44, alignSelf: "flex-start" }}
          >
            Retry attempt check
          </Button>
        </>
      )}
      {recoveredLocal && (
        <Alert severity="warning">
          <AlertTitle>These local edits were not submitted</AlertTitle>
          <Typography variant="body2">Local code</Typography>
          <Box
            component="pre"
            sx={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere", m: 0 }}
          >
            {recoveredLocal.code}
          </Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Local reasoning: {recoveredLocal.reasoning}
          </Typography>
        </Alert>
      )}
      {submitted && (
        <Alert severity="success" icon={<CheckOutlined />}>
          Final submission received. This attempt is read-only.
        </Alert>
      )}
      {!pending &&
        question?.id === id &&
        attempt?.status === "FINAL_SUBMITTED" && (
          <GradingAdmission key={attempt.id} role="LEARNER" embedded>
            <LearnerGradePanel attemptId={attempt.id} />
          </GradingAdmission>
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
          <Box
            component="article"
            aria-label="Question details"
            sx={{
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              bgcolor: "background.paper",
              border: 1,
              borderColor: "divider",
              borderRadius: 1.5,
              overflow: "hidden",
            }}
          >
            <Stack
              component="header"
              gap={0.5}
              sx={{
                flexShrink: 0,
                px: 2,
                py: 1.5,
                borderBottom: 1,
                borderColor: "divider",
              }}
            >
              <Typography component="h2" variant="h6">
                Description
              </Typography>
              <Typography
                component="h3"
                variant="subtitle1"
                sx={{ overflowWrap: "anywhere" }}
              >
                {question.title}
              </Typography>
              <Typography color="text.secondary">
                Topic: {question.topic}
              </Typography>
            </Stack>
            <Stack
              component="section"
              aria-label="Question description"
              gap={1.25}
              sx={{
                minWidth: 0,
                minHeight: 0,
                flex: 1,
                overflow: "auto",
                p: 2,
              }}
            >
              <Box
                component="section"
                aria-labelledby="question-problem-heading"
              >
                <Typography
                  id="question-problem-heading"
                  component="h2"
                  variant="h6"
                >
                  Problem
                </Typography>
                <Typography
                  sx={{
                    maxWidth: "72ch",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {question.problemStatement}
                </Typography>
              </Box>
              <Button
                variant="outlined"
                onClick={() =>
                  setAssistantOpenRequest((current) => current + 1)
                }
              >
                {submitted ? "Open coaching chat" : "Get Hint"}
              </Button>
              <Box
                component="section"
                aria-labelledby="question-starting-code-heading"
              >
                <Typography
                  id="question-starting-code-heading"
                  component="h2"
                  variant="h6"
                >
                  Starting code
                </Typography>
                <Box
                  component="pre"
                  sx={{
                    m: 0,
                    maxWidth: "72ch",
                    p: 1.5,
                    bgcolor: "background.default",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                    fontFamily: "monospace",
                  }}
                >
                  {question.buggyCode}
                </Box>
              </Box>
              <Box
                component="section"
                aria-labelledby="question-expected-behavior-heading"
              >
                <Typography
                  id="question-expected-behavior-heading"
                  component="h2"
                  variant="h6"
                >
                  Expected behavior
                </Typography>
                <Typography
                  sx={{
                    maxWidth: "72ch",
                    whiteSpace: "pre-wrap",
                    overflowWrap: "anywhere",
                  }}
                >
                  {question.expectedBehavior}
                </Typography>
              </Box>
            </Stack>
          </Box>
          <LearnerWorkspace
            code={code}
            reasoning={reasoning}
            disabled={
              pending ||
              saving ||
              reconciliationRequired ||
              Boolean(loadError) ||
              submitted ||
              sessionExpired ||
              !user
            }
            saving={saving}
            onCodeChange={editCode}
            onReasoningChange={editReasoning}
            onOutputChange={setRunOutput}
            onSave={() => void persist(false)}
            onSubmit={() => void persist(true)}
          />
        </Box>
      )}
      {question && user && (
        <LearnerAssistantPanel
          key={`${id}:${question.versionId}:${user.id}`}
          exerciseId={id}
          exerciseVersionId={question.versionId}
          userId={user.id}
          readOnly={submitted || sessionExpired}
          code={code}
          reasoning={reasoning}
          output={runOutput}
          openRequest={assistantOpenRequest}
        />
      )}
    </Box>
  );
}
