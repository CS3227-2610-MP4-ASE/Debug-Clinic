import {
  Alert,
  Button,
  Divider,
  List,
  ListItem,
  Stack,
  Typography,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import type { DraftListResponse } from "@debugclinic/contracts";
import { draftFailure, listDrafts } from "../lib/instructor-drafts.js";

export function InstructorDraftsPage() {
  const [drafts, setDrafts] = useState<DraftListResponse["drafts"]>([]);
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(true);
  useEffect(() => {
    let active = true;
    busy.current = true;
    setPending(true);
    setError(null);
    void listDrafts(offset)
      .then((result) => {
        if (!active) return;
        setDrafts((previous) =>
          offset === 0
            ? result.drafts
            : [
                ...new Map(
                  [...previous, ...result.drafts].map((item) => [
                    item.id,
                    item,
                  ]),
                ).values(),
              ],
        );
        setNextOffset(result.nextOffset);
      })
      .catch((failure: unknown) => {
        if (active) setError(draftFailure(failure));
      })
      .finally(() => {
        if (active) {
          busy.current = false;
          setPending(false);
        }
      });
    return () => {
      active = false;
    };
  }, [offset, revision]);

  return (
    <Stack gap={3} maxWidth={850} minWidth={0}>
      <Typography component="h1" variant="h3">
        My drafts
      </Typography>
      <Typography>
        Your private, unverified instructor drafts. Open a draft to review, edit
        and publish it.
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button
          component={RouterLink}
          to="/instructor/questions?status=PUBLISHED"
        >
          Published
        </Button>
        <Button
          component={RouterLink}
          to="/instructor/questions?status=ARCHIVED"
        >
          Removed
        </Button>
        <Button
          component={RouterLink}
          to="/instructor/questions/new"
          variant="contained"
          disabled={pending}
        >
          New question
        </Button>
      </Stack>
      {pending && <Typography role="status">Loading drafts…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {error && (
        <Button
          disabled={pending}
          onClick={() => {
            if (!busy.current) {
              busy.current = true;
              setRevision((value) => value + 1);
            }
          }}
        >
          Retry
        </Button>
      )}
      {!pending && !error && drafts.length === 0 && (
        <Typography>
          No saved drafts yet. Start a new question to create your first draft.
        </Typography>
      )}
      <List disablePadding aria-label="Saved drafts">
        {drafts.map((draft) => (
          <ListItem key={draft.id} disableGutters divider>
            <Stack gap={1} minWidth={0} width="100%" py={1}>
              <Typography variant="h6" sx={{ overflowWrap: "anywhere" }}>
                {draft.title}
              </Typography>
              <Typography sx={{ overflowWrap: "anywhere" }}>
                Topic: {draft.topic}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Saved {new Date(draft.createdAt).toLocaleString()}
              </Typography>
              <Button
                component={RouterLink}
                to={`/instructor/drafts/${encodeURIComponent(draft.id)}`}
                disabled={pending}
                sx={{ alignSelf: "flex-start" }}
                aria-label={`Open draft: ${draft.title}`}
              >
                Open draft
              </Button>
            </Stack>
          </ListItem>
        ))}
      </List>
      {nextOffset !== null && !error && (
        <Button
          variant="outlined"
          disabled={pending}
          onClick={() => {
            if (busy.current) return;
            busy.current = true;
            setOffset(nextOffset);
          }}
        >
          Load more
        </Button>
      )}
      <Divider />
      <Typography variant="body2" color="text.secondary">
        Saved drafts remain private and unverified.
      </Typography>
    </Stack>
  );
}
