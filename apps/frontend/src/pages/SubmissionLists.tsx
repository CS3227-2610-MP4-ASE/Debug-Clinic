import type {
  InstructorSubmissionRow,
  InstructorSubmissionView,
  LearnerSubmissionRow,
} from "@debugclinic/contracts";
import {
  Alert,
  Box,
  Button,
  List,
  ListItem,
  ListItemButton,
  Stack,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink, useSearchParams } from "react-router-dom";

import { useGradingAccess } from "../auth/GradingAdmission.js";
import {
  listInstructorSubmissions,
  listLearnerSubmissions,
} from "../lib/grading.js";
import { useGradingRequest } from "../lib/use-grading-request.js";
import { gradeText, SubmittedTime } from "../components/SubmissionSnapshot.js";

type Row = InstructorSubmissionRow | LearnerSubmissionRow;
type Page = { items: Row[]; nextCursor: string | null };
type Loader = (
  access: { actorId: string; signal: AbortSignal },
  cursor: string | null,
) => Promise<Page>;

function SubmissionList({
  title,
  path,
  empty,
  loadPage,
  view,
}: {
  title: string;
  path: string;
  empty: string;
  loadPage: Loader;
  view?: InstructorSubmissionView;
}) {
  const { verified, retrySession } = useGradingAccess();
  const run = useGradingRequest();
  const [page, setPage] = useState<Page | null>(null);
  const [pending, setPending] = useState(true);
  const [failed, setFailed] = useState<"first" | "next" | null>(null);

  const load = useCallback(
    (cursor: string | null) => {
      if (!verified) return;
      setPending(true);
      setFailed(null);
      run(
        (access) => loadPage(access, cursor),
        (result) => {
          setPage((previous) => {
            const unique = new Map(
              (cursor ? previous?.items : undefined)?.map((row) => [
                row.attemptId,
                row,
              ]),
            );
            for (const row of result.items) {
              if (!unique.has(row.attemptId)) unique.set(row.attemptId, row);
            }
            return {
              items: Array.from(unique.values()),
              nextCursor: result.nextCursor,
            };
          });
          setPending(false);
        },
        () => {
          if (!cursor) setPage(null);
          setFailed(cursor ? "next" : "first");
          setPending(false);
        },
      );
    },
    [loadPage, run, verified],
  );
  useEffect(() => load(null), [load]);

  return (
    <Stack gap={2} aria-busy={verified && pending}>
      <Button
        onClick={() => load(null)}
        disabled={!verified || pending}
        sx={{ alignSelf: "flex-start", minHeight: 44 }}
      >
        Refresh submissions
      </Button>
      {!verified && !view && (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" onClick={retrySession}>
              Retry session
            </Button>
          }
        >
          Checking access to submissions…
        </Alert>
      )}
      {verified && pending && (
        <Typography role="status">Loading submissions…</Typography>
      )}
      {failed && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              disabled={!verified || pending}
              onClick={() =>
                load(failed === "next" ? (page?.nextCursor ?? null) : null)
              }
            >
              Try again
            </Button>
          }
        >
          {failed === "first"
            ? "Submissions could not be loaded."
            : "More submissions could not be loaded."}
        </Alert>
      )}
      {!pending && !failed && page?.items.length === 0 && (
        <Typography color="text.secondary">{empty}</Typography>
      )}
      {Boolean(page?.items.length) && (
        <List aria-label={title} disablePadding>
          {page?.items.map((row) => (
            <ListItem key={row.attemptId} divider disableGutters>
              <ListItemButton
                component={RouterLink}
                to={`${path}/${encodeURIComponent(row.attemptId)}`}
                state={view ? { view } : undefined}
                sx={{ py: 1.5, display: "block" }}
              >
                <Typography fontWeight={700} sx={{ overflowWrap: "anywhere" }}>
                  {row.questionTitle}
                </Typography>
                {"learnerDisplayName" in row && (
                  <Typography sx={{ overflowWrap: "anywhere" }}>
                    {row.learnerDisplayName}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  Submitted <SubmittedTime value={row.submittedAt} />
                </Typography>
                <Typography variant="body2">
                  {"grade" in row
                    ? gradeText(row.grade)
                    : row.gradingStatus === "GRADED"
                      ? "Graded"
                      : "Awaiting grade"}
                </Typography>
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      )}
      {page?.nextCursor && !failed && (
        <Button
          onClick={() => load(page.nextCursor)}
          disabled={!verified || pending}
          sx={{ alignSelf: "flex-start", minHeight: 44 }}
        >
          Load more
        </Button>
      )}
    </Stack>
  );
}

export function InstructorSubmissionsPage() {
  const [search, setSearch] = useSearchParams();
  const view = search.get("view") === "graded" ? "graded" : "awaiting";
  const load = useCallback<Loader>(
    (access, cursor) => listInstructorSubmissions(access, view, cursor),
    [view],
  );
  return (
    <Stack gap={2} maxWidth={920}>
      <Typography component="h1" variant="h4">
        Submissions
      </Typography>
      <Tabs
        value={view}
        onChange={(_event, nextView: InstructorSubmissionView) => {
          setSearch(nextView === "graded" ? { view: nextView } : {}, {
            replace: true,
          });
        }}
        aria-label="Submission grading status"
      >
        <Tab
          label="Awaiting grade"
          value="awaiting"
          id="awaiting-submissions-tab"
          aria-controls="submissions-panel"
        />
        <Tab
          label="Graded"
          value="graded"
          id="graded-submissions-tab"
          aria-controls="submissions-panel"
        />
      </Tabs>
      <Box
        role="tabpanel"
        id="submissions-panel"
        aria-labelledby={`${view}-submissions-tab`}
      >
        <SubmissionList
          key={view}
          title={
            view === "graded"
              ? "Graded submissions"
              : "Submissions awaiting a grade"
          }
          path="/instructor/submissions"
          empty={
            view === "graded"
              ? "No graded submissions yet."
              : "No submissions awaiting a grade."
          }
          loadPage={load}
          view={view}
        />
      </Box>
    </Stack>
  );
}

export function LearnerSubmissionsPage() {
  return (
    <Stack gap={2} maxWidth={920}>
      <Typography component="h1" variant="h4">
        My submissions
      </Typography>
      <SubmissionList
        title="My submissions"
        path="/learner/submissions"
        empty="You have no final submissions yet."
        loadPage={listLearnerSubmissions}
      />
    </Stack>
  );
}
