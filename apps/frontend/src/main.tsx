import "@fontsource-variable/manrope";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import { App } from "./App.js";
import { AuthProvider } from "./auth/AuthProvider.js";
import { AppThemeProvider } from "./theme.js";
import "./styles.css";
import { UnsavedWorkProvider } from "./components/UnsavedWork.js";

const root = document.getElementById("root");
if (!root) throw new Error("Root element was not found");

createRoot(root).render(
  <StrictMode>
    <AppThemeProvider>
      <RouterProvider
        router={createBrowserRouter([
          {
            path: "*",
            element: (
              <AuthProvider>
                <UnsavedWorkProvider>
                  <App />
                </UnsavedWorkProvider>
              </AuthProvider>
            ),
          },
        ])}
      />
    </AppThemeProvider>
  </StrictMode>,
);
