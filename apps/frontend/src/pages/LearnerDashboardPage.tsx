import ArrowForward from "@mui/icons-material/ArrowForward";
import Refresh from "@mui/icons-material/Refresh";
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  List,
  ListItem,
  Paper,
  Skeleton,
  Stack,
  Typography,
} from "@mui/material";
import { useCallback, useEffect, useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import type { LearnerDashboardResponse } from "@debugclinic/contracts";
import { useAuth } from "../auth/AuthProvider.js";
import {
  getLearnerDashboard,
  questionFailure,
} from "../lib/instructor-questions.js";

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "")
    .join("");
}

export function LearnerDashboardPage() {
  const { user, sessionEpoch, sessionExpired } = useAuth();
  const [data, setData] = useState<LearnerDashboardResponse | null>(null);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const load = useCallback(() => setReload((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setPending(true);
    setError(null);
    setData(null);
    void getLearnerDashboard(controller.signal)
      .then((result) => {
        if (active) setData(result);
      })
      .catch((failure: unknown) => {
        if (active) setError(questionFailure(failure));
      })
      .finally(() => {
        if (active) setPending(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [user?.id, sessionEpoch, reload]);

  const values = data
    ? ([
        ["Questions attempted", data.attemptedCount],
        ["Questions completed", data.completedCount],
        ["In progress", data.inProgressCount],
      ] as const)
    : [];

  return (
    <Stack gap={{ xs: 3, md: 4 }} maxWidth={1000} mx="auto">
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        gap={2}
      >
        <Stack direction="row" alignItems="center" gap={2} minWidth={0}>
          <Avatar
            aria-label={`${user?.name ?? "Learner"} profile`}
            sx={{ bgcolor: "primary.main", width: 52, height: 52 }}
          >
            {initials(user?.name ?? "")}
          </Avatar>
          <Box minWidth={0}>
            <Typography component="h1" variant="h4">
              Welcome, {user?.name ?? "Learner"}
            </Typography>
            {user?.email && (
              <Typography
                color="text.secondary"
                sx={{ overflowWrap: "anywhere" }}
              >
                {user.email}
              </Typography>
            )}
          </Box>
        </Stack>
        <Button
          onClick={load}
          disabled={pending || sessionExpired || !user}
          startIcon={<Refresh />}
          aria-label="Refresh dashboard"
        >
          Refresh
        </Button>
      </Stack>

      <Stack direction="row" useFlexGap flexWrap="wrap" gap={1.5}>
        <Button
          component={RouterLink}
          to="/learner/question"
          variant="contained"
          endIcon={<ArrowForward />}
        >
          Browse questions
        </Button>
        <Button
          component={RouterLink}
          to="/learner/submissions"
          variant="outlined"
        >
          My submissions
        </Button>
      </Stack>

      {pending && (
        <Stack
          aria-label="Dashboard summary"
          aria-busy="true"
          role="region"
          gap={1.5}
        >
          <Stack direction={{ xs: "column", sm: "row" }} gap={1.5}>
            {[0, 1, 2].map((item) => (
              <Paper key={item} variant="outlined" sx={{ p: 2, flex: 1 }}>
                <Skeleton width="60%" />
                <Skeleton width="30%" height={42} />
              </Paper>
            ))}
          </Stack>
          <Stack direction="row" alignItems="center" gap={1} role="status">
            <CircularProgress size={20} aria-label="Loading dashboard" />
            <Typography>Loading your activity…</Typography>
          </Stack>
        </Stack>
      )}

      {error && (
        <Alert
          severity="error"
          action={
            <Button
              color="inherit"
              size="small"
              disabled={pending || sessionExpired || !user}
              onClick={load}
            >
              Try again
            </Button>
          }
        >
          {error}
        </Alert>
      )}

      {!pending && !error && data && (
        <Stack gap={3}>
          <Box
            role="region"
            aria-label="Dashboard summary"
            aria-busy="false"
            sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}
          >
            {values.map(([label, value]) => (
              <Paper
                key={label}
                variant="outlined"
                sx={{ flex: "1 1 180px", minWidth: 0, p: 2 }}
              >
                <Typography color="text.secondary">{label}</Typography>
                <Typography variant="h4" component="p" fontWeight={750}>
                  {value}
                </Typography>
              </Paper>
            ))}
          </Box>

          <Box component="section" aria-labelledby="recent-drafts-heading">
            <Typography id="recent-drafts-heading" component="h2" variant="h5">
              Pick up where you left off
            </Typography>
            {data.recentDrafts.length ? (
              <List aria-label="Recent drafts" disablePadding sx={{ mt: 1 }}>
                {data.recentDrafts.map((draft) => (
                  <ListItem key={draft.exerciseId} divider disableGutters>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      alignItems={{ xs: "stretch", sm: "center" }}
                      justifyContent="space-between"
                      gap={1}
                      width="100%"
                      py={1}
                    >
                      <Box minWidth={0}>
                        <Typography
                          fontWeight={700}
                          sx={{ overflowWrap: "anywhere" }}
                        >
                          {draft.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Last saved{" "}
                          {new Date(draft.updatedAt).toLocaleDateString()}
                        </Typography>
                      </Box>
                      <Button
                        component={RouterLink}
                        to={`/learner/questions/${encodeURIComponent(draft.exerciseId)}`}
                        sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                      >
                        Resume
                      </Button>
                    </Stack>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography color="text.secondary" sx={{ mt: 1 }}>
                Saved drafts will appear here. Browse a question to get started.
              </Typography>
            )}
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
