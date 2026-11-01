import CodeRounded from "@mui/icons-material/CodeRounded";

import { EmptyWorkspace } from "../components/EmptyWorkspace.js";

export function LearnerDashboardPage() {
  return (
    <EmptyWorkspace
      title="Your debugging workspace"
      description="Published exercises, current attempts, and progressive coaching will appear here once the exercise workflow is implemented."
      action="Browse exercises"
      icon={<CodeRounded />}
    />
  );
}
