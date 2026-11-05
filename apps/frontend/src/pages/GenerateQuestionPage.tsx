import {
  Alert,
  Button,
  LinearProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  QuestionTopicSchema,
  type GenerateQuestionResponse,
  type OwnerQuestion,
} from "@debugclinic/contracts";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { draftFailure, generateQuestion } from "../lib/instructor-drafts.js";
import { QuestionEditor } from "./QuestionEditor.js";
import { OwnerQuestionView } from "./OwnerQuestionView.js";

export function GenerateQuestionPage() {
  const [topic, setTopic] = useState("");
  const [preview, setPreview] = useState<GenerateQuestionResponse | null>(null);
  const [published, setPublished] = useState<OwnerQuestion | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicError, setTopicError] = useState<string | null>(null);
  const busy = useRef(false);
  const active = useRef(true);
  const { sessionExpired, user } = useAuth();
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  function startOver() {
    setTopic("");
    setPreview(null);
    setPublished(null);
    setError(null);
    setTopicError(null);
  }
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || preview || sessionExpired || !user) return;
    const parsed = QuestionTopicSchema.safeParse(topic);
    if (!parsed.success) {
      setTopicError("Enter a Python topic between 1 and 300 characters.");
      return;
    }
    busy.current = true;
    setPending(true);
    setError(null);
    setTopicError(null);
    try {
      const result = await generateQuestion(parsed.data);
      if (active.current) {
        setPreview(result);
        setTopic(result.topic);
      }
    } catch (failed) {
      if (active.current) setError(draftFailure(failed));
    } finally {
      if (active.current) {
        busy.current = false;
        setPending(false);
      }
    }
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
      {!preview && !published && (
        <Stack direction="row" gap={1}>
          <Button disabled={pending} onClick={startOver}>
            New question
          </Button>
          <Button
            component={RouterLink}
            to="/instructor/drafts"
            disabled={pending}
          >
            My drafts
          </Button>
        </Stack>
      )}
      {error && <Alert severity="error">{error}</Alert>}
      {pending && (
        <Stack gap={1}>
          <Typography role="status">Generating question…</Typography>
          <LinearProgress aria-label="Generating question" />
        </Stack>
      )}
      {!published && (
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
            disabled={pending || sessionExpired || !user}
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
            <Button
              type="submit"
              variant="contained"
              disabled={pending || sessionExpired || !user}
            >
              {error ? "Retry" : "Generate"}
            </Button>
          )}
        </Stack>
      )}
      {preview && !published && (
        <QuestionEditor
          preview={preview}
          onNew={startOver}
          onResolved={(question, feedback) => {
            setPublished(question);
            setMessage(feedback);
          }}
        />
      )}
      {published && (
        <OwnerQuestionView
          question={published}
          message={message}
          onChange={setPublished}
        />
      )}
    </Stack>
  );
}
