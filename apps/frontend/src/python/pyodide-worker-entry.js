import { loadPyodide } from "pyodide";
import createPyodideModule from "pyodide/pyodide.asm.mjs";

const MAX_CODE = 20_000;
const MAX_TESTS = 10_000;
const MAX_STDIN = 8_000;
const MAX_OUTPUT = 64 * 1024;
const TRUNCATION_NOTICE = "\n[Output truncated at 64 KiB.]";
const utf8Bytes = (value) => new TextEncoder().encode(value).byteLength;
const boundedError = (value) => {
  let result = "";
  let bytes = 0;
  for (const scalar of String(value)) {
    const size = utf8Bytes(scalar);
    if (bytes + size > 8_000) break;
    result += scalar;
    bytes += size;
  }
  return result;
};
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
  const outputLimit = MAX_OUTPUT - utf8Bytes(TRUNCATION_NOTICE) - 6;
  const decoders = {
    stdout: new TextDecoder("utf-8"),
    stderr: new TextDecoder("utf-8"),
  };
  let pyodide;
  let originalOutputStreams;
  const appendText = (channel, text) => {
    if (!text) return;
    let safe = "";
    for (const value of text) {
      const scalar =
        value.length === 1 &&
        value.charCodeAt(0) >= 0xd800 &&
        value.charCodeAt(0) <= 0xdfff
          ? "\ufffd"
          : value;
      const bytes = utf8Bytes(scalar);
      if (outputSize + bytes > outputLimit) {
        truncated = true;
        break;
      }
      safe += scalar;
      outputSize += bytes;
    }
    if (safe) send("output", { channel, text: safe });
  };
  const writeBytes = (channel, input) => {
    const decoder = decoders[channel];
    for (let offset = 0; offset < input.length; offset += 4096) {
      const decoded = decoder.decode(input.subarray(offset, offset + 4096), {
        stream: true,
      });
      appendText(channel, decoded);
      if (truncated) break;
    }
    return input.length;
  };
  const flushOutput = () => {
    for (const channel of ["stdout", "stderr"]) {
      appendText(channel, decoders[channel].decode());
    }
    if (truncated) {
      send("output", { channel: "notice", text: TRUNCATION_NOTICE });
      outputSize += utf8Bytes(TRUNCATION_NOTICE);
    }
  };
  const flushPythonStreams = () => {
    if (!pyodide || !originalOutputStreams) return;
    let flushFailed = false;
    let flushError;
    for (const [index, name] of [
      "__debugclinic_original_stdout",
      "__debugclinic_original_stderr",
    ].entries()) {
      const stream = originalOutputStreams[index];
      pyodide.globals.set(name, stream);
      try {
        pyodide.runPython(`${name}.flush()`);
      } catch (error) {
        if (!flushFailed) flushError = error;
        flushFailed = true;
      } finally {
        pyodide.globals.delete(name);
        stream.destroy();
      }
    }
    originalOutputStreams = undefined;
    if (flushFailed) throw flushError;
  };

  let executionFailed = false;
  let executionError;
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
    pyodide = await loadPyodide({
      indexURL: "https://invalid.invalid/",
      stdLibURL: stdlibUrl,
      lockFileContents: assets.lock,
      stdout: (value) => appendText("stdout", String(value)),
      stderr: (value) => appendText("stderr", String(value)),
      createPyodideModule: (settings) =>
        createPyodideModule({
          ...settings,
          wasmBinary,
        }),
    });
    URL.revokeObjectURL(stdlibUrl);
    pyodide.setStdout({ write: (buffer) => writeBytes("stdout", buffer) });
    pyodide.setStderr({ write: (buffer) => writeBytes("stderr", buffer) });
    send("running");
    pyodide.globals.set("__debugclinic_stdin", stdin);
    pyodide.runPython(
      `import io\nimport sys\nsys.stdin = io.StringIO(__debugclinic_stdin)`,
    );
    const streamProxies = pyodide.runPython("[sys.stdout, sys.stderr]");
    try {
      originalOutputStreams = streamProxies.toJs({ create_pyproxies: true });
    } finally {
      streamProxies.destroy();
    }
    await pyodide.runPythonAsync(code);
    if (mode === "test") {
      pyodide.globals.set("__debugclinic_tests", tests);
      await pyodide.runPythonAsync(
        "exec(compile(__debugclinic_tests, '<scratch tests>', 'exec'))",
      );
    }
  } catch (error) {
    executionFailed = true;
    executionError = error;
  } finally {
    try {
      flushPythonStreams();
    } catch (error) {
      if (!executionFailed) {
        executionFailed = true;
        executionError = error;
      }
    }
    flushOutput();
  }
  if (executionFailed) send("error", { message: boundedError(executionError) });
  else send("completed");
};

workerScope.postMessage = () => {};
