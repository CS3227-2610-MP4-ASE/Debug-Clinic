import SearchOutlined from "@mui/icons-material/SearchOutlined";
import {
  Alert,
  Box,
  Button,
  List,
  ListItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { useEffect, useState, type FormEvent } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import {
  listPublishedQuestions,
  questionFailure,
} from "../lib/instructor-questions.js";
import type { PublishedQuestionSummary } from "@debugclinic/contracts";

export function PublishedQuestionsPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const [input, setInput] = useState(query);
  const [items, setItems] = useState<PublishedQuestionSummary[]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const { sessionExpired, user } = useAuth();
  useEffect(() => {
    setInput(query);
    setOffset(0);
  }, [query]);
  useEffect(() => {
    let active = true;
    setPending(true);
    setError(null);
    void listPublishedQuestions(offset, query.trim() || undefined)
      .then((result) => {
        if (!active) return;
        setItems((old) => {
          const merged = new Map(
            (offset === 0 ? [] : old).map((item) => [item.id, item]),
          );
          for (const item of result.questions) merged.set(item.id, item);
          return [...merged.values()];
        });
        setNextOffset(result.nextOffset);
      })
      .catch((failed: unknown) => {
        if (active) setError(questionFailure(failed));
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
    };
  }, [offset, query, reload]);
  function search(event: FormEvent) {
    event.preventDefault();
    setItems([]);
    setNextOffset(null);
    setOffset(0);
    const nextQuery = input.trim();
    if (nextQuery === query) setReload((value) => value + 1);
    else setParams(nextQuery ? { q: nextQuery } : {});
  }
  return (
    <Stack gap={2} maxWidth={850} minWidth={0}>
      <Typography component="h1" variant="h4">
        Published questions
      </Typography>
      <Box
        component="form"
        onSubmit={search}
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          gap: 1,
          alignItems: "flex-start",
        }}
      >
        <TextField
          fullWidth
          size="small"
          label="Search questions"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          inputProps={{ maxLength: 200 }}
        />
        <Button
          type="submit"
          variant="contained"
          startIcon={<SearchOutlined />}
          sx={{ minHeight: 44, flexShrink: 0 }}
        >
          Search
        </Button>
      </Box>
      {pending && <Typography role="status">Loading questions…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {error && (
        <Button
          disabled={pending || sessionExpired || !user}
          onClick={() => setReload((value) => value + 1)}
          sx={{ minHeight: 44 }}
        >
          Retry
        </Button>
      )}
      {!pending && !error && items.length === 0 && (
        <Typography>
          {query
            ? "No questions match your search."
            : "No published questions are available."}
        </Typography>
      )}
      <List aria-label="Published questions" disablePadding>
        {items.map((item) => (
          <ListItem key={item.id} divider disableGutters>
            <Stack gap={0.5} width="100%" minWidth={0} py={1}>
              <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                {item.title}
              </Typography>
              <Typography sx={{ overflowWrap: "anywhere" }}>
                Topic: {item.topic}
              </Typography>
              <Typography sx={{ overflowWrap: "anywhere" }}>
                Instructor: {item.instructorName}
              </Typography>
              <Typography>
                Published {new Date(item.publishedAt).toLocaleString()}
              </Typography>
              <Button
                component={RouterLink}
                to={`/learner/questions/${encodeURIComponent(item.id)}${query ? `?q=${encodeURIComponent(query)}` : ""}`}
                sx={{ alignSelf: "flex-start", minHeight: 44 }}
                aria-label={`Open question: ${item.title}`}
              >
                Open question
              </Button>
            </Stack>
          </ListItem>
        ))}
      </List>
      {nextOffset !== null && !error && (
        <Button
          disabled={pending || sessionExpired || !user}
          onClick={() => setOffset(nextOffset)}
          sx={{ minHeight: 44 }}
        >
          Load more
        </Button>
      )}
    </Stack>
  );
}
