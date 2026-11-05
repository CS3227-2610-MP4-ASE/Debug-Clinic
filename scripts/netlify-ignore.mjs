// Netlify runs ignore commands before installing dependencies. Keep this file
// dependency-free and compatible with its ignore-command Node runtime.
// Exit 0 skips a native build; exit 1 allows it to proceed.
const developmentSite =
  process.env.SITE_ID === "8406a938-5101-431f-964f-8b4e61d8f223" &&
  (process.env.CONTEXT === "deploy-preview" ||
    (process.env.CONTEXT === "production" && process.env.BRANCH === "master"));

console.log(
  developmentSite
    ? "Build the development site's stable master release or PR preview."
    : "Skip native build: only development-site master releases and PR previews are automatic; production publishes through GitHub.",
);
process.exitCode = developmentSite ? 1 : 0;
