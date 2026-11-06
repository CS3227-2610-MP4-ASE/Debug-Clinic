import CodeRounded from "@mui/icons-material/CodeRounded";

import { EmptyWorkspace } from "../components/EmptyWorkspace.js";
import { Button, Stack } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

export function LearnerDashboardPage() {
  return (
    <Stack gap={3}>
      <EmptyWorkspace
        title="Your debugging workspace"
        description="Browse published Python debugging questions reviewed by instructors."
        action="Browse exercises"
        icon={<CodeRounded />}
      />
      <Button
        component={RouterLink}
        to="/learner/questions"
        variant="contained"
      >
        Browse published questions
      </Button>
    </Stack>
  );
}
