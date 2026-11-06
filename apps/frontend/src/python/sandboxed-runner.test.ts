import { afterEach, describe, expect, it, vi } from "vitest";
import { startPythonRun } from "./sandboxed-runner.js";
import type { PythonRunRequest, PythonRunState } from "./sandboxed-runner.js";

afterEach(() => vi.unstubAllGlobals());

describe("sandboxed Python runner boundary", () => {
  const invalidInputs = [
    { code: "x".repeat(20_001), tests: "", stdin: "", label: "source" },
    { code: "", tests: "x".repeat(10_001), stdin: "", label: "scratch tests" },
    { code: "", tests: "", stdin: "x".repeat(8_001), label: "standard input" },
  ];

  it.each(invalidInputs)(
    "rejects oversized $label before creating a frame",
    ({ code, tests, stdin }) => {
      const onState =
        vi.fn<(state: PythonRunState, message?: string) => void>();
      const createElement = vi.fn();
      vi.stubGlobal("document", { createElement } as unknown as Document);

      const stop = startPythonRun({
        code,
        tests,
        stdin,
        mode: "run",
        onState,
        onOutput: vi.fn(),
      });

      expect(stop).toBeTypeOf("function");
      expect(onState).toHaveBeenCalledWith(
        "error",
        "The code, scratch tests, or standard input exceeds its size limit.",
      );
      expect(createElement).not.toHaveBeenCalled();
    },
  );

  it("requires learner assertions for Test before frame creation", () => {
    const onState = vi.fn<(state: PythonRunState, message?: string) => void>();
    const createElement = vi.fn();
    vi.stubGlobal("document", { createElement } as unknown as Document);

    startPythonRun({
      code: "print('no hidden grading')",
      tests: " \n\t",
      stdin: "",
      mode: "test",
      onState,
      onOutput: vi.fn(),
    });

    expect(onState).toHaveBeenCalledWith(
      "error",
      "Add a scratch assertion before selecting Test.",
    );
    expect(createElement).not.toHaveBeenCalled();
  });

  it("accepts the exact source boundary and creates an opaque, CSP-limited frame", () => {
    const onState = vi.fn<(state: PythonRunState, message?: string) => void>();
    const frame = {
      style: {},
      setAttribute: vi.fn(),
      remove: vi.fn(),
    } as unknown as HTMLIFrameElement;
    const createElement = vi.fn(() => frame);
    const append = vi.fn();
    const fakeDocument = {
      createElement,
      body: { append },
    } as unknown as Document;
    const fakeWindow = {
      location: { origin: "https://clinic.example" },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      setTimeout: vi.fn(() => 7),
    } as unknown as Window;
    vi.stubGlobal("document", fakeDocument);
    vi.stubGlobal("window", fakeWindow);
    vi.stubGlobal("crypto", {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce("nonce")
        .mockReturnValueOnce("run-id"),
    } as unknown as Crypto);

    const request: PythonRunRequest = {
      code: `# private source sentinel\n${"x".repeat(19_974)}`,
      tests: "",
      stdin: "",
      mode: "run",
      onState,
      onOutput: vi.fn(),
    };
    const stop = startPythonRun(request);

    expect(request.code.length).toBe(20_000);
    expect(onState).toHaveBeenCalledWith("loading");
    expect(createElement).toHaveBeenCalledWith("iframe");
    expect(frame.setAttribute).toHaveBeenCalledWith("sandbox", "allow-scripts");
    expect(frame.setAttribute).not.toHaveBeenCalledWith(
      "sandbox",
      expect.stringContaining("allow-same-origin"),
    );
    expect(frame.srcdoc).toContain("default-src 'none'");
    expect(frame.srcdoc).toContain("worker-src blob:");
    expect(frame.srcdoc).toContain("connect-src blob:");
    expect(frame.srcdoc).not.toContain("private source sentinel");
    expect(append).toHaveBeenCalledWith(frame);

    stop();
    expect(onState).toHaveBeenLastCalledWith("stopped");
    expect(frame.remove).toHaveBeenCalledOnce();
  });
});
