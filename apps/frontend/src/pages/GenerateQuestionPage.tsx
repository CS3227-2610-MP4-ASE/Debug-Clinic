import {
  Alert,
  Button,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import {
  QuestionFieldsSchema,
  QuestionTopicSchema,
  type GenerateQuestionResponse,
  type QuestionFields,
} from "@debugclinic/contracts";
import {
  draftFailure,
  generateQuestion,
  saveDraft,
} from "../lib/instructor-drafts.js";
import { InstructorDraftFields } from "./InstructorDraftFields.js";

export function GenerateQuestionPage() {
  const [topic, setTopic] = useState("");
  const [preview, setPreview] = useState<GenerateQuestionResponse | null>(null);
  const [edited, setEdited] = useState<QuestionFields | null>(null);
  const [pending, setPending] = useState<"generating" | "saving" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof QuestionFields, string>>
  >({});
  const mounted = useRef(false);
  const busy = useRef(false);
  const navigate = useNavigate();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function generate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (busy.current || preview) return;
    const parsed = QuestionTopicSchema.safeParse(topic);
    if (!parsed.success) {
      setTopicError("Enter a Python topic between 1 and 300 characters.");
      return;
    }
    busy.current = true;
    setPending("generating");
    setError(null);
    setTopicError(null);
    try {
      const result = await generateQuestion(parsed.data);
      if (!mounted.current) return;
      setTopic(result.topic);
      setPreview(result);
      setEdited(result.draft);
    } catch (failure) {
      if (mounted.current) setError(draftFailure(failure));
    } finally {
      if (mounted.current) {
        busy.current = false;
        setPending(null);
      }
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || !preview || !edited) return;
    const parsed = QuestionFieldsSchema.safeParse(edited);
    if (!parsed.success) {
      const errors: Partial<Record<keyof QuestionFields, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof QuestionFields;
        errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setError("Check the highlighted draft fields before saving.");
      return;
    }
    busy.current = true;
    setPending("saving");
    setError(null);
    setFieldErrors({});
    try {
      const result = await saveDraft({
        topic: preview.topic,
        draft: parsed.data,
        generationId: preview.generation.id,
      });
      if (mounted.current)
        await navigate(
          `/instructor/drafts/${encodeURIComponent(result.draft.id)}`,
          { state: { saved: true } },
        );
    } catch (failure) {
      if (mounted.current) setError(draftFailure(failure));
    } finally {
      if (mounted.current) {
        busy.current = false;
        setPending(null);
      }
    }
  }

  function startOver() {
    if (busy.current) return;
    setTopic("");
    setPreview(null);
    setEdited(null);
    setError(null);
    setTopicError(null);
    setFieldErrors({});
  }

  return (
    <Stack gap={3} maxWidth={850} minWidth={0}>
      <Typography component="h1" variant="h3">
        Generate question
      </Typography>
      <Typography>
        Choose a beginner undergraduate Python topic to prepare one private
        debugging draft.
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button onClick={startOver} disabled={Boolean(pending)}>
          New question
        </Button>
        <Button
          component={RouterLink}
          to="/instructor/drafts"
          disabled={Boolean(pending)}
        >
          My drafts
        </Button>
      </Stack>
      {error && <Alert severity="error">{error}</Alert>}
      {pending && (
        <Stack gap={1}>
          <Typography role="status">
            {pending === "generating"
              ? "Generating question…"
              : "Saving draft…"}
          </Typography>
          <LinearProgress
            aria-label={
              pending === "generating" ? "Generating question" : "Saving draft"
            }
          />
        </Stack>
      )}
      <Stack
        component="form"
        gap={2}
        noValidate
        onSubmit={(event) => void generate(event)}
      >
        <TextField
          label="Python topic"
          value={topic}
          onChange={(event) => {
            setTopic(event.target.value);
            setError(null);
            setTopicError(null);
          }}
          required
          multiline
          minRows={2}
          disabled={Boolean(pending)}
          slotProps={{ input: { readOnly: Boolean(preview) } }}
          error={Boolean(topicError)}
          helperText={
            topicError ??
            (preview
              ? "Original generation topic. Use New question to start again."
              : "1–300 characters. Include related beginner Python concepts.")
          }
        />
        {!preview && (
          <Button type="submit" variant="contained" disabled={Boolean(pending)}>
            {error ? "Retry" : "Generate"}
          </Button>
        )}
      </Stack>
      {preview && edited && (
        <Stack
          component="form"
          gap={3}
          noValidate
          onSubmit={(event) => void save(event)}
        >
          <InstructorDraftFields
            value={edited}
            disabled={Boolean(pending)}
            errors={fieldErrors}
            onChange={(key, value) => {
              setEdited({ ...edited, [key]: value });
              setFieldErrors((current) => ({ ...current, [key]: undefined }));
            }}
          />
          <Button type="submit" variant="contained" disabled={Boolean(pending)}>
            Save draft
          </Button>
        </Stack>
      )}
    </Stack>
  );
}
