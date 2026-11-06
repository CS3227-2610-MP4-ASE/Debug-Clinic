import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const pyodidePackage = dirname(require.resolve("pyodide/package.json"));
const output = join(root, "apps/frontend/public/pyodide-runtime");
const worker = join(output, "worker.js");
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await build({
  entryPoints: [join(root, "apps/frontend/src/python/pyodide-worker-entry.js")],
  outfile: worker,
  bundle: true,
  platform: "browser",
  external: ["node:*"],
  format: "iife",
  target: "es2022",
  define: { "import.meta.url": '"https://invalid.invalid/python-worker.js"' },
  legalComments: "none",
});
for (const name of [
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
]) {
  await cp(join(pyodidePackage, name), join(output, name));
}
const metadata = JSON.parse(
  await readFile(join(pyodidePackage, "package.json"), "utf8"),
);
await writeFile(
  join(output, "LICENSE.txt"),
  `Pyodide ${metadata.version} is distributed under ${metadata.license}.\nFull license: https://www.mozilla.org/MPL/2.0/\n`,
);
