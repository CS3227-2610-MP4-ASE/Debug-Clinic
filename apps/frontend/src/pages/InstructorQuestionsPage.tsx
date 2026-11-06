import {
  Alert,
  Button,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";
import type { OwnerQuestionListQuery } from "@debugclinic/contracts";
import { listOwnerQuestions } from "../lib/instructor-questions.js";
import { useQuestionList } from "../lib/use-question-list.js";
import { useAuth } from "../auth/AuthProvider.js";

const states = [
  { status: "DRAFT", label: "Drafts" },
  { status: "PUBLISHED", label: "Published" },
  { status: "ARCHIVED", label: "Removed" },
] as const;
export function InstructorQuestionsPage() {
  const [search] = useSearchParams();
  const status =
    states.find((item) => item.status === search.get("status"))?.status ??
    "DRAFT";
  return <QuestionList key={status} status={status} />;
}
function QuestionList({
  status,
}: {
  status: OwnerQuestionListQuery["status"];
}) {
  const load = useCallback(
    (offset: number) => listOwnerQuestions(status, offset),
    [status],
  );
  const { items, pending, error, nextOffset, retry, more } =
    useQuestionList(load);
  const { sessionExpired, user } = useAuth();
  const label = states.find((item) => item.status === status)!.label;
  return (
    <Stack gap={3} maxWidth={850} minWidth={0}>
      <Typography component="h1" variant="h3">
        My {label.toLowerCase()}
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        {states.map((item) => (
          <Button
            key={item.status}
            component={RouterLink}
            to={`/instructor/questions?status=${item.status}`}
            aria-current={status === item.status ? "page" : undefined}
          >
            {item.label}
          </Button>
        ))}
        <Button
          component={RouterLink}
          to="/instructor/questions/new"
          variant="contained"
        >
          New question
        </Button>
      </Stack>
      {pending && <Typography role="status">Loading questions…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {error && (
        <Button disabled={pending || sessionExpired || !user} onClick={retry}>
          Retry
        </Button>
      )}
      {!pending && !error && items.length === 0 && (
        <Typography>
          No{" "}
          {status === "DRAFT"
            ? "saved drafts"
            : label.toLowerCase() + " questions"}{" "}
          yet.
        </Typography>
      )}
      <List aria-label={label} disablePadding>
        {items.map((item) => (
          <ListItem key={item.id} divider disableGutters>
            <Stack gap={1} width="100%" minWidth={0} py={1}>
              <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                {item.title}
              </Typography>
              <Typography sx={{ overflowWrap: "anywhere" }}>
                Topic: {item.topic}
              </Typography>
              <Typography variant="body2">
                {new Date(
                  item.archivedAt ?? item.publishedAt ?? item.createdAt,
                ).toLocaleString()}
              </Typography>
              <Button
                component={RouterLink}
                to={`/instructor/questions/${encodeURIComponent(item.id)}`}
                sx={{ alignSelf: "flex-start" }}
                aria-label={`Open question: ${item.title}`}
              >
                Open question
              </Button>
            </Stack>
          </ListItem>
        ))}
      </List>
      {nextOffset !== null && !error && (
        <Button disabled={pending || sessionExpired || !user} onClick={more}>
          Load more
        </Button>
      )}
    </Stack>
  );
}
