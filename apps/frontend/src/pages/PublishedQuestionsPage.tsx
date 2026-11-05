import {
  Alert,
  Button,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import { useAuth } from "../auth/AuthProvider.js";
import { listPublishedQuestions } from "../lib/instructor-questions.js";
import { useQuestionList } from "../lib/use-question-list.js";

export function PublishedQuestionsPage() {
  const { items, pending, error, nextOffset, retry, more } = useQuestionList(
    listPublishedQuestions,
  );
  const { sessionExpired, user } = useAuth();
  return (
    <Stack gap={3} maxWidth={850} minWidth={0}>
      <Typography component="h1" variant="h3">
        Published questions
      </Typography>
      {pending && <Typography role="status">Loading questions…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {error && (
        <Button disabled={pending || sessionExpired || !user} onClick={retry}>
          Retry
        </Button>
      )}
      {!pending && !error && items.length === 0 && (
        <Typography>No published questions are available.</Typography>
      )}
      <List aria-label="Published questions" disablePadding>
        {items.map((item) => (
          <ListItem key={item.id} divider disableGutters>
            <Stack gap={1} width="100%" minWidth={0} py={1}>
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
                to={`/learner/questions/${encodeURIComponent(item.id)}`}
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
