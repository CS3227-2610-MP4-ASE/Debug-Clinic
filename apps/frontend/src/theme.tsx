import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import type { PropsWithChildren } from "react";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#2457c5", dark: "#173b87", light: "#dbe6ff" },
    secondary: { main: "#237a57", dark: "#15523a", light: "#dcefe6" },
    background: { default: "#f5f3ed", paper: "#ffffff" },
    text: { primary: "#171b25", secondary: "#565f70" },
    divider: "#d9d7d0",
    error: { main: "#b42318" },
  },
  shape: { borderRadius: 12 },
  transitions: {
    duration: {
      shortest: 120,
      shorter: 140,
      short: 160,
      standard: 160,
      complex: 200,
      enteringScreen: 160,
      leavingScreen: 140,
    },
  },
  typography: {
    fontFamily:
      '"Manrope Variable", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    h1: { fontWeight: 750, letterSpacing: "-0.03em" },
    h2: { fontWeight: 720, letterSpacing: "-0.025em" },
    h3: { fontWeight: 700, letterSpacing: "-0.02em" },
    button: { fontWeight: 700, textTransform: "none" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { minHeight: 44, borderRadius: 10 } },
    },
    MuiTextField: { defaultProps: { fullWidth: true } },
    MuiLink: { defaultProps: { underline: "hover" } },
  },
});

export function AppThemeProvider({ children }: PropsWithChildren) {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline enableColorScheme />
      {children}
    </ThemeProvider>
  );
}
