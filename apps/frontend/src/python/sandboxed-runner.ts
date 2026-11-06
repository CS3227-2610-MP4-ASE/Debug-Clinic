export type PythonRunMode = "run" | "test";
export type PythonRunState =
  "loading" | "running" | "completed" | "error" | "stopped" | "timeout";
export type PythonOutputChannel = "stdout" | "stderr" | "notice";

export interface PythonRunRequest {
  code: string;
  tests: string;
  stdin: string;
  mode: PythonRunMode;
  onState: (state: PythonRunState, message?: string) => void;
  onOutput: (channel: PythonOutputChannel, text: string) => void;
}

const MAX_CODE = 20_000;
const MAX_TESTS = 10_000;
const MAX_STDIN = 8_000;
const MAX_OUTPUT = 64 * 1024;
const INIT_TIMEOUT_MS = 30_000;
const EXECUTION_TIMEOUT_MS = 5_000;
const ASSET_BASE = "/pyodide-runtime/";

const sandboxBootstrap = (
  parentOrigin: string,
  nonce: string,
  runId: string,
) => {
  let worker: Worker | undefined;
  let objectUrl: string | undefined;
  const post = (message: Record<string, unknown>) =>
    parent.postMessage({ nonce, runId, ...message }, parentOrigin);
  const validParent = (event: MessageEvent) =>
    event.source === parent && event.origin === parentOrigin;
  addEventListener("message", (event) => {
    if (
      !validParent(event) ||
      event.data?.nonce !== nonce ||
      event.data?.runId !== runId ||
      event.data?.type !== "start" ||
      worker
    )
      return;
    const { workerSource, wasm, stdlib, lock, code, tests, stdin, mode } =
      event.data;
    if (
      typeof workerSource !== "string" ||
      !(wasm instanceof ArrayBuffer) ||
      !(stdlib instanceof ArrayBuffer) ||
      typeof lock !== "string"
    )
      return;
    try {
      objectUrl = URL.createObjectURL(
        new Blob([workerSource], { type: "text/javascript" }),
      );
      worker = new Worker(objectUrl);
      worker.onmessage = ({ data }) => {
        if (
          !data ||
          data.nonce !== nonce ||
          data.runId !== runId ||
          typeof data.type !== "string"
        )
          return;
        if (
          data.type === "output" &&
          ["stdout", "stderr", "notice"].includes(data.channel) &&
          typeof data.text === "string" &&
          data.text.length <= 64 * 1024
        )
          post({ type: "output", channel: data.channel, text: data.text });
        else if (
          data.type === "loading" ||
          data.type === "running" ||
          data.type === "completed"
        )
          post({ type: data.type });
        else if (data.type === "error" && typeof data.message === "string")
          post({ type: "error", message: data.message.slice(0, 8_000) });
      };
      worker.onerror = (event) =>
        post({
          type: "error",
          message: String(event.message || "Python worker failed").slice(
            0,
            8_000,
          ),
        });
      worker.postMessage(
        {
          type: "start",
          nonce,
          runId,
          code,
          tests,
          stdin,
          mode,
          assets: { wasm, stdlib, lock },
        },
        [wasm, stdlib],
      );
      post({ type: "loading" });
    } catch (error) {
      post({ type: "error", message: String(error).slice(0, 8_000) });
    }
  });
  addEventListener("unload", () => {
    worker?.terminate();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  });
  post({ type: "ready" });
};

function boundedAsset(response: Response, limit: number): Promise<ArrayBuffer> {
  if (!response.ok || response.type === "opaque")
    throw new Error("The local Python runtime could not be loaded.");
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > limit)
    throw new Error("A local Python runtime asset exceeded its size limit.");
  if (!response.body)
    return response.arrayBuffer().then((bytes) => {
      if (bytes.byteLength > limit)
        throw new Error(
          "A local Python runtime asset exceeded its size limit.",
        );
      return bytes;
    });
  return (async () => {
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > limit) {
          await reader.cancel();
          throw new Error(
            "A local Python runtime asset exceeded its size limit.",
          );
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes.buffer;
  })();
}

let cachedRuntimeAssets: Promise<{
  worker: string;
  wasm: ArrayBuffer;
  stdlib: ArrayBuffer;
  lock: string;
}> | null = null;

async function fetchRuntimeAssets() {
  cachedRuntimeAssets ??= (async () => {
    const names = [
      "worker.js",
      "pyodide.asm.wasm",
      "python_stdlib.zip",
      "pyodide-lock.json",
    ] as const;
    const limits = [
      4 * 1024 * 1024,
      12 * 1024 * 1024,
      4 * 1024 * 1024,
      512 * 1024,
    ];
    const values = await Promise.all(
      names.map(async (name, index) => {
        const url = new URL(`${ASSET_BASE}${name}`, window.location.origin);
        const response = await fetch(url, {
          credentials: "omit",
          mode: "same-origin",
          redirect: "error",
          cache: "no-cache",
        });
        return boundedAsset(response, limits[index]!);
      }),
    );
    return {
      worker: new TextDecoder().decode(values[0]!),
      wasm: values[1]!,
      stdlib: values[2]!,
      lock: new TextDecoder().decode(values[3]!),
    };
  })();
  let assets;
  try {
    assets = await cachedRuntimeAssets;
  } catch (error) {
    cachedRuntimeAssets = null;
    throw error;
  }
  return {
    worker: assets.worker,
    wasm: assets.wasm.slice(0),
    stdlib: assets.stdlib.slice(0),
    lock: assets.lock,
  };
}

function createFrame(nonce: string, runId: string) {
  const iframe = document.createElement("iframe");
  iframe.title = "Isolated Python execution";
  iframe.setAttribute("sandbox", "allow-scripts");
  iframe.setAttribute("aria-hidden", "true");
  iframe.tabIndex = -1;
  iframe.style.cssText =
    "position:fixed;width:1px;height:1px;left:-2px;bottom:0;border:0;opacity:0;pointer-events:none";
  const bootstrap = `(${sandboxBootstrap.toString()})(${JSON.stringify(window.location.origin)},${JSON.stringify(nonce)},${JSON.stringify(runId)})`;
  iframe.srcdoc = [
    `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; connect-src blob:"><script>const script=${JSON.stringify(bootstrap)};const run=new Function(script);run();`,
    "</script>",
  ].join("");
  document.body.append(iframe);
  return iframe;
}

export function startPythonRun(request: PythonRunRequest): () => void {
  if (
    request.code.length > MAX_CODE ||
    request.tests.length > MAX_TESTS ||
    request.stdin.length > MAX_STDIN
  ) {
    request.onState(
      "error",
      "The code, scratch tests, or standard input exceeds its size limit.",
    );
    return () => {};
  }
  if (request.mode === "test" && !request.tests.trim()) {
    request.onState("error", "Add a scratch assertion before selecting Test.");
    return () => {};
  }

  const nonce = crypto.randomUUID();
  const runId = crypto.randomUUID();
  let iframe: HTMLIFrameElement | null = null;
  let finished = false;
  let totalOutput = 0;
  let executionTimer = 0;
  let initTimer = 0;
  const cleanup = () => {
    if (finished) return;
    finished = true;
    clearTimeout(executionTimer);
    clearTimeout(initTimer);
    window.removeEventListener("message", receive);
    iframe?.remove();
    iframe = null;
  };
  const fail = (state: PythonRunState, message?: string) => {
    if (finished) return;
    request.onState(state, message);
    cleanup();
  };
  const receive = (event: MessageEvent) => {
    if (
      !iframe ||
      event.source !== iframe.contentWindow ||
      event.origin !== "null"
    )
      return;
    const data = event.data;
    if (
      !data ||
      Object.getPrototypeOf(data) !== Object.prototype ||
      data.nonce !== nonce ||
      data.runId !== runId ||
      typeof data.type !== "string"
    )
      return;
    if (data.type === "ready") {
      void fetchRuntimeAssets()
        .then((assets) => {
          if (finished || !iframe?.contentWindow) return;
          iframe.contentWindow.postMessage(
            {
              type: "start",
              nonce,
              runId,
              workerSource: assets.worker,
              wasm: assets.wasm,
              stdlib: assets.stdlib,
              lock: assets.lock,
              code: request.code,
              tests: request.tests,
              stdin: request.stdin,
              mode: request.mode,
            },
            "*",
            [assets.wasm, assets.stdlib],
          );
        })
        .catch((error: unknown) =>
          fail(
            "error",
            error instanceof Error
              ? error.message
              : "The local Python runtime could not be loaded.",
          ),
        );
    } else if (data.type === "loading") {
      request.onState("loading");
      clearTimeout(initTimer);
      initTimer = window.setTimeout(
        () =>
          fail(
            "timeout",
            "Python initialization took too long. Stop and try again.",
          ),
        INIT_TIMEOUT_MS,
      );
    } else if (data.type === "running") {
      clearTimeout(initTimer);
      request.onState("running");
      executionTimer = window.setTimeout(
        () => fail("timeout", "Execution stopped after 5 seconds."),
        EXECUTION_TIMEOUT_MS,
      );
    } else if (
      data.type === "output" &&
      ["stdout", "stderr", "notice"].includes(data.channel) &&
      typeof data.text === "string"
    ) {
      const remaining = MAX_OUTPUT - totalOutput;
      if (remaining <= 0) return;
      const text = data.text.slice(0, remaining);
      totalOutput += text.length;
      request.onOutput(data.channel, text);
    } else if (data.type === "completed") {
      request.onState("completed");
      cleanup();
    } else if (data.type === "error") {
      fail("error", String(data.message).slice(0, 8_000));
    }
  };

  window.addEventListener("message", receive);
  request.onState("loading");
  initTimer = window.setTimeout(
    () =>
      fail(
        "timeout",
        "Python initialization took too long. Stop and try again.",
      ),
    INIT_TIMEOUT_MS,
  );
  iframe = createFrame(nonce, runId);
  return () => {
    if (!finished) {
      request.onState("stopped");
      cleanup();
    }
  };
}
