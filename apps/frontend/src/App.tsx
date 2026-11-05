import { Route, Routes } from "react-router-dom";

import { RoleRoute } from "./auth/RoleRoute.js";
import { AppShell } from "./components/AppShell.js";
import { ForbiddenPage } from "./pages/ForbiddenPage.js";
import { HomePage } from "./pages/HomePage.js";
import { InstructorDashboardPage } from "./pages/InstructorDashboardPage.js";
import { GenerateQuestionPage } from "./pages/GenerateQuestionPage.js";
import { InstructorDraftsPage } from "./pages/InstructorDraftsPage.js";
import { InstructorDraftPage } from "./pages/InstructorDraftPage.js";
import { LearnerDashboardPage } from "./pages/LearnerDashboardPage.js";
import { NotFoundPage } from "./pages/NotFoundPage.js";
import { RegisterPage } from "./pages/RegisterPage.js";
import { SignInPage } from "./pages/SignInPage.js";
import {
  AuthCompletionPage,
  AuthErrorPage,
  EmailRequestPage,
  ResetPasswordPage,
  VerificationResultPage,
} from "./pages/RecoveryPages.js";

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/verification"
          element={<EmailRequestPage kind="verification" />}
        />
        <Route
          path="/verification/result"
          element={<VerificationResultPage />}
        />
        <Route
          path="/forgot-password"
          element={<EmailRequestPage kind="recovery" />}
        />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/complete" element={<AuthCompletionPage />} />
        <Route path="/auth/error" element={<AuthErrorPage />} />
        <Route path="/forbidden" element={<ForbiddenPage />} />
        <Route element={<RoleRoute role="LEARNER" />}>
          <Route path="/learner" element={<LearnerDashboardPage />} />
        </Route>
        <Route element={<RoleRoute role="INSTRUCTOR" />}>
          <Route path="/instructor" element={<InstructorDashboardPage />} />
          <Route
            path="/instructor/questions/new"
            element={<GenerateQuestionPage />}
          />
          <Route path="/instructor/drafts" element={<InstructorDraftsPage />} />
          <Route
            path="/instructor/drafts/:id"
            element={<InstructorDraftPage />}
          />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
