// Netlify runs ignore commands before installing dependencies. Keep this file
// dependency-free and compatible with its ignore-command Node runtime.
// Exit 0 skips a native build; exit 1 allows it to proceed.
const previewAllowed =
  process.env.SITE_ID === "8406a938-5101-431f-964f-8b4e61d8f223" &&
  process.env.CONTEXT === "deploy-preview";

console.log(
  previewAllowed
    ? "Build the development site's PR preview."
    : "Skip native build: only development-site PR previews are automatic; master publishes through GitHub to production.",
);
process.exitCode = previewAllowed ? 1 : 0;
