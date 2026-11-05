import { Alert, Button, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Link as RouterLink, useLocation, useParams } from "react-router-dom";
import type { SavedDraft } from "@debugclinic/contracts";
import { draftFailure, getDraft } from "../lib/instructor-drafts.js";
import { InstructorDraftFields } from "./InstructorDraftFields.js";

export function InstructorDraftPage() {
  const { id } = useParams();
  const location = useLocation();
  const [draft, setDraft] = useState<SavedDraft | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const saved = Boolean((location.state as { saved?: boolean } | null)?.saved);
  useEffect(() => {
    let active = true;
    setPending(true);
    setDraft(null);
    setError(null);
    void getDraft(id ?? "")
      .then((result) => {
        if (active) setDraft(result.draft);
      })
      .catch((failure: unknown) => {
        if (active) setError(draftFailure(failure));
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
      <Typography component="h1" variant="h3">
        Instructor draft
      </Typography>
      <Stack direction="row" gap={1} flexWrap="wrap">
        <Button
          component={RouterLink}
          to="/instructor/drafts"
          disabled={pending}
        >
          My drafts
        </Button>
        <Button
          component={RouterLink}
          to="/instructor/questions/new"
          disabled={pending}
        >
          New question
        </Button>
      </Stack>
      {saved && (
        <Alert severity="success" role="status">
          Draft saved. This private draft is read-only.
        </Alert>
      )}
      {pending && <Typography role="status">Loading draft…</Typography>}
      {error && <Alert severity="error">{error}</Alert>}
      {error && (
        <Button
          disabled={pending}
          onClick={() => setRevision((value) => value + 1)}
        >
          Retry
        </Button>
      )}
      {draft && (
        <>
          <Typography sx={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
            Topic: {draft.topic}
          </Typography>
          <InstructorDraftFields value={draft} />
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: "anywhere" }}
          >
            Generation source: {draft.provenance.provider}
            {draft.provenance.model ? ` / ${draft.provenance.model}` : ""},{" "}
            {draft.provenance.promptVersion}. Topic and content association is
            instructor-reported.
          </Typography>
        </>
      )}
    </Stack>
  );
}
