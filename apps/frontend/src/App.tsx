import { Route, Routes } from "react-router-dom";

import { RoleRoute } from "./auth/RoleRoute.js";
import { AppShell } from "./components/AppShell.js";
import { ForbiddenPage } from "./pages/ForbiddenPage.js";
import { HomePage } from "./pages/HomePage.js";
import { InstructorDashboardPage } from "./pages/InstructorDashboardPage.js";
import { LearnerDashboardPage } from "./pages/LearnerDashboardPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { SignInPage } from "./pages/SignInPage.js";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route element={<RoleRoute role="LEARNER" />}>
          <Route path="/learner" element={<LearnerDashboardPage />} />
        </Route>
        <Route element={<RoleRoute role="INSTRUCTOR" />}>
          <Route path="/instructor" element={<InstructorDashboardPage />} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
