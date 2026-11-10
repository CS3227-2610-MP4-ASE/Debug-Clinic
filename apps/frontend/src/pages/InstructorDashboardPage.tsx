import { Button, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function InstructorDashboardPage() {
  return (
    <Stack gap={3} maxWidth={760}>
      <Typography
        component="h1"
        variant="h2"
        fontSize={{ xs: "2.3rem", md: "3.5rem" }}
      >
        Instructor workspace
      </Typography>
      <Typography variant="h6" color="text.secondary" fontWeight={400}>
        Prepare a beginner Python debugging question, review and edit the
        preview, then save a private draft or publish the reviewed question.
      </Typography>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        gap={2}
        useFlexGap
        flexWrap="wrap"
      >
        <Button component={RouterLink} to="/instructor/submissions">
          Submissions
        </Button>
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
        >
          New question
        </Button>
        <Button
          component={RouterLink}
          to="/instructor/drafts"
          variant="outlined"
        >
          My drafts
        </Button>
      </Stack>
    </Stack>
  );
}
