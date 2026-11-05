import {
  Alert,
  Button,
  Checkbox,
  FormControlLabel,
  LinearProgress,
  Stack,
  Typography,
} from "@mui/material";
import {
  QuestionFieldsSchema,
  type GenerateQuestionResponse,
  type OwnerQuestion,
  type PublishQuestionRequest,
  type QuestionFields,
} from "@debugclinic/contracts";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { useUnsavedWork } from "../components/UnsavedWork.js";
import { draftFailure, saveDraft } from "../lib/instructor-drafts.js";
import {
  publishQuestion,
  QuestionError,
  questionFailure,
  saveQuestionChanges,
} from "../lib/instructor-questions.js";
import { InstructorDraftFields } from "./InstructorDraftFields.js";

const reviewText =
  "I have reviewed this question and understand that published content cannot be edited.";
function fields(value: QuestionFields): QuestionFields {
  return {
    title: value.title,
    problemStatement: value.problemStatement,
    buggyCode: value.buggyCode,
    expectedBehavior: value.expectedBehavior,
    bugExplanation: value.bugExplanation,
    correctedSolution: value.correctedSolution,
  };
}
function normalized(value: QuestionFields) {
  const parsed = QuestionFieldsSchema.safeParse(value);
  return JSON.stringify(parsed.success ? parsed.data : value);
}

type Props = {
  question?: OwnerQuestion;
  preview?: GenerateQuestionResponse;
  onResolved: (question: OwnerQuestion, message: string) => void;
  onNew?: () => void;
  onReload?: () => void;
};

export function QuestionEditor({
  question,
  preview,
  onResolved,
  onNew,
  onReload,
}: Props) {
  const initial = question ?? preview!.draft;
  const topic = question?.topic ?? preview!.topic;
  const [edited, setEdited] = useState(() => fields(initial));
  const [baseline, setBaseline] = useState(() => fields(initial));
  const [revision, setRevision] = useState(question?.revision ?? 0);
  const [confirmed, setConfirmed] = useState(false);
  const [pending, setPending] = useState<"saving" | "publishing" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [errors, setErrors] = useState<
    Partial<Record<keyof QuestionFields, string>>
  >({});
  const [attempt, setAttempt] = useState<PublishQuestionRequest | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [stale, setStale] = useState(false);
  const busy = useRef(false);
  const active = useRef(true);
  const previewKey = useRef(crypto.randomUUID());
  const summary = useRef<HTMLDivElement>(null);
  const { setDirty, clear, confirmDiscard } = useUnsavedWork();
  const { sessionExpired, user } = useAuth();
  const navigate = useNavigate();
  const dirty =
    Boolean(preview) ||
    normalized(edited) !== normalized(baseline) ||
    uncertain;
  const expired = sessionExpired || !user;
  const locked = Boolean(pending) || uncertain || expired;
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clear();
    };
  }, [clear]);
  useEffect(() => {
    setDirty(dirty);
  }, [dirty, setDirty]);
  useEffect(() => {
    if (error) summary.current?.focus();
  }, [error]);

  function validate() {
    const parsed = QuestionFieldsSchema.safeParse(edited);
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues)
        next[issue.path[0] as keyof QuestionFields] = issue.message;
      setErrors(next);
      setError("Check the highlighted question fields before continuing.");
      return null;
    }
    setErrors({});
    return parsed.data;
  }
  function failure(failed: unknown, publishing: boolean) {
    // A denied/rolled-back retry cannot disprove an earlier unconfirmed commit.
    const unknown =
      (publishing && uncertain) ||
      (failed instanceof QuestionError && failed.outcome === "UNKNOWN");
    setUncertain(publishing && unknown);
    setStale(failed instanceof QuestionError && failed.status === 409);
    setError(
      unknown
        ? publishing
          ? "Publication outcome is unconfirmed. Retry to resolve the same reviewed question."
          : "Save outcome is unconfirmed. Retry or reload to review the current saved question."
        : questionFailure(failed),
    );
    if (!unknown) {
      setConfirmed(false);
      setAttempt(null);
    }
    if (failed instanceof QuestionError) {
      const next: typeof errors = {};
      for (const detail of failed.details) {
        const key = detail.path.split(".").at(-1) as keyof QuestionFields;
        if (key in edited) next[key] = detail.message;
      }
      setErrors(next);
    }
  }
  async function save() {
    if (busy.current || locked) return;
    const draft = validate();
    if (!draft) return;
    busy.current = true;
    setPending("saving");
    setError(null);
    setMessage(null);
    try {
      if (question) {
        const result = await saveQuestionChanges(question.id, {
          topic,
          draft,
          expectedRevision: revision,
        });
        if (!active.current) return;
        setEdited(fields(result.question));
        setBaseline(fields(result.question));
        setRevision(result.question.revision);
        setConfirmed(false);
        setStale(false);
        clear();
        setMessage("Changes saved. This draft remains private.");
      } else {
        const result = await saveDraft({
          topic,
          draft,
          generationId: preview!.generation.id,
        });
        if (!active.current) return;
        clear();
        await navigate(
          `/instructor/drafts/${encodeURIComponent(result.draft.id)}`,
          { state: { saved: true } },
        );
      }
    } catch (failed) {
      if (active.current) {
        if (question) failure(failed, false);
        else setError(draftFailure(failed));
      }
    } finally {
      if (active.current) {
        busy.current = false;
        setPending(null);
      }
    }
  }
  async function publish() {
    if (busy.current || expired || (!uncertain && !confirmed)) return;
    let snapshot = attempt;
    if (!uncertain) {
      const draft = validate();
      if (!draft) return;
      snapshot = question
        ? {
            source: "saved",
            id: question.id,
            expectedRevision: revision,
            topic,
            draft,
            reviewConfirmed: true,
          }
        : {
            source: "preview",
            previewKey: previewKey.current,
            generationId: preview!.generation.id,
            topic,
            draft,
            reviewConfirmed: true,
          };
      setAttempt(snapshot);
    }
    if (!snapshot) return;
    busy.current = true;
    setPending("publishing");
    setError(null);
    setMessage(null);
    try {
      const result = await publishQuestion(snapshot);
      if (!active.current) return;
      clear();
      setUncertain(false);
      setConfirmed(false);
      onResolved(
        result.question,
        result.question.status === "ARCHIVED"
          ? "This question was already removed. Its read-only record is retained."
          : result.outcome === "existing"
            ? "An existing publication was found; its published content is authoritative."
            : "Question published. Published content cannot be edited.",
      );
    } catch (failed) {
      if (active.current) failure(failed, true);
    } finally {
      if (active.current) {
        busy.current = false;
        setPending(null);
      }
    }
  }
  return (
    <Stack gap={3} minWidth={0}>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {onNew ? (
          <Button
            disabled={Boolean(pending)}
            onClick={() => confirmDiscard(onNew)}
          >
            New question
          </Button>
        ) : (
          <Button
            component={RouterLink}
            to="/instructor/questions/new"
            disabled={Boolean(pending)}
          >
            New question
          </Button>
        )}
        <Button
          component={RouterLink}
          to="/instructor/drafts"
          disabled={Boolean(pending)}
        >
          My drafts
        </Button>
      </Stack>
      <Typography sx={{ overflowWrap: "anywhere" }}>Topic: {topic}</Typography>
      {expired && (
        <Alert severity="warning">
          Your session expired. Your entries remain on this page.{" "}
          <RouterLink to="/sign-in">Sign in again</RouterLink> to continue;
          leaving discards unsaved work.
        </Alert>
      )}
      {error && (
        <Alert severity="error" ref={summary} tabIndex={-1}>
          {error}
        </Alert>
      )}
      {message && (
        <Alert severity="success" role="status">
          {message}
        </Alert>
      )}
      {pending && (
        <Stack gap={1}>
          <Typography role="status">
            {pending === "saving" ? "Saving draft…" : "Publishing question…"}
          </Typography>
          <LinearProgress
            aria-label={
              pending === "saving" ? "Saving draft" : "Publishing question"
            }
          />
        </Stack>
      )}
      <InstructorDraftFields
        value={edited}
        disabled={locked}
        errors={errors}
        onChange={(key, value) => {
          setEdited((current) => ({ ...current, [key]: value }));
          setConfirmed(false);
          setErrors((current) => ({ ...current, [key]: undefined }));
        }}
      />
      <FormControlLabel
        control={
          <Checkbox
            checked={confirmed}
            disabled={locked}
            onChange={(event) => setConfirmed(event.target.checked)}
          />
        }
        label={reviewText}
      />
      <Stack direction="row" gap={2} flexWrap="wrap">
        <Button
          variant="outlined"
          disabled={locked}
          onClick={() => void save()}
        >
          {question ? "Save changes" : "Save draft"}
        </Button>
        <Button
          variant="contained"
          disabled={Boolean(pending) || expired || (!uncertain && !confirmed)}
          onClick={() => void publish()}
        >
          {uncertain ? "Retry same snapshot" : "Publish"}
        </Button>
        {(stale || (error && question)) && onReload && (
          <Button
            disabled={Boolean(pending) || expired || uncertain}
            onClick={() => confirmDiscard(onReload)}
          >
            Reload latest
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
