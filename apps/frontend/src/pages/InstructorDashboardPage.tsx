import AssignmentTurnedInOutlined from "@mui/icons-material/AssignmentTurnedInOutlined";

import { EmptyWorkspace } from "../components/EmptyWorkspace.js";

export function InstructorDashboardPage() {
  return (
    <EmptyWorkspace
      title="Instructor workspace"
      description="Draft exercises, verification steps, publication controls, and learner reviews will appear here as their specifications are implemented."
      action="Create exercise"
      icon={<AssignmentTurnedInOutlined />}
    />
  );
}
