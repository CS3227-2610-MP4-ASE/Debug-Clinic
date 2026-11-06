import { loadPyodide } from "pyodide";
import createPyodideModule from "pyodide/pyodide.asm.mjs";

const MAX_CODE = 20_000;
const MAX_TESTS = 10_000;
const MAX_STDIN = 8_000;
const MAX_OUTPUT = 64 * 1024;
let active = false;
const workerScope = globalThis;
const nativePostMessage = workerScope.postMessage.bind(workerScope);

function bounded(value, limit) {
  return typeof value === "string" && value.length <= limit;
}

workerScope.onmessage = async ({ data }) => {
  if (active || !data || data.type !== "start") return;
  const { nonce, runId, code, tests, stdin, assets, mode } = data;
  if (
    typeof nonce !== "string" ||
    typeof runId !== "string" ||
    !bounded(code, MAX_CODE) ||
    !bounded(tests, MAX_TESTS) ||
    !bounded(stdin, MAX_STDIN) ||
    !assets ||
    !(assets.wasm instanceof ArrayBuffer) ||
    !(assets.stdlib instanceof ArrayBuffer) ||
    typeof assets.lock !== "string" ||
    (mode !== "run" && mode !== "test")
  )
    return;
  active = true;
  const send = (type, fields = {}) =>
    nativePostMessage({ type, nonce, runId, ...fields });
  let outputSize = 0;
  let truncated = false;
  const append = (channel, value) => {
    const remaining = MAX_OUTPUT - 48 - outputSize;
    if (remaining <= 0) {
      truncated = true;
      return;
    }
    const text = String(value);
    const chunk = text.slice(0, remaining);
    outputSize += chunk.length;
    if (chunk.length < text.length) truncated = true;
    send("output", { channel, text: chunk });
  };

  try {
    send("loading");
    const stdlibUrl = URL.createObjectURL(new Blob([assets.stdlib]));
    const wasmBinary = new Uint8Array(assets.wasm);
    const originalFetch = workerScope.fetch.bind(workerScope);
    workerScope.fetch = (input, init) => {
      const url = String(input);
      if (url === "https://invalid.invalid/pyodide.asm.wasm") {
        return Promise.resolve(
          new Response(wasmBinary, {
            headers: { "Content-Type": "application/wasm" },
          }),
        );
      }
      return originalFetch(input, init);
    };
    const pyodide = await loadPyodide({
      indexURL: "https://invalid.invalid/",
      stdLibURL: stdlibUrl,
      lockFileContents: assets.lock,
      stdout: (value) => append("stdout", `${value}\n`),
      stderr: (value) => append("stderr", `${value}\n`),
      createPyodideModule: (settings) =>
        createPyodideModule({
          ...settings,
          wasmBinary,
        }),
    });
    URL.revokeObjectURL(stdlibUrl);
    send("running");
    pyodide.globals.set("__debugclinic_stdin", stdin);
    pyodide.runPython(
      `import io\nimport sys\nsys.stdin = io.StringIO(__debugclinic_stdin)`,
    );
    await pyodide.runPythonAsync(code);
    if (mode === "test") {
      pyodide.globals.set("__debugclinic_tests", tests);
      await pyodide.runPythonAsync(
        "exec(compile(__debugclinic_tests, '<scratch tests>', 'exec'))",
      );
    }
    if (truncated) append("notice", "Output was truncated at 64 KiB.");
    send("completed");
  } catch (error) {
    send("error", { message: String(error).slice(0, 8_000) });
  }
};

workerScope.postMessage = () => {};
