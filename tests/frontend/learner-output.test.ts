import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  LearnerOutputPanel,
  type LearnerRunnerResult,
} from "../../apps/frontend/src/components/LearnerOutputPanel.js";

describe("independent learner output renderer acceptance", () => {
  it("defaults to unavailable without fabricating an execution result", () => {
    const html = renderToStaticMarkup(createElement(LearnerOutputPanel));
    expect(html).toContain(
      "Run is unavailable until a secure Python runner is approved.",
    );
    expect(html).not.toMatch(/Execution complete|Test passed|stdout/);
  });
  for (const state of [
    "unavailable",
    "running",
    "complete",
    "failed",
  ] as const) {
    it(`renders the injected ${state} test double as escaped whitespace-preserving text`, () => {
      const text =
        '<script>alert("synthetic")</script>\n  indented output\n<img src=x onerror=alert(1)>';
      const result: LearnerRunnerResult =
        state === "complete"
          ? { state, output: text }
          : { state, message: text };
      const html = renderToStaticMarkup(
        createElement(LearnerOutputPanel, { result }),
      );
      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("\n  indented output\n");
      expect(html).not.toContain("<script>");
      expect(html).not.toContain("<img ");
      expect(html).toContain('role="status"');
      expect(html).toContain("white-space:pre-wrap");
    });
  }
});
