import { build } from "esbuild";
import fs from "fs";
import path from "path";

const rootDir = process.cwd();
const distDir = path.join(rootDir, "dist");
const outfile = path.join(distDir, "index.cjs");
const staleEsmOutfile = path.join(distDir, "index.js");

// These are ESM-only packages that cannot be bundled into CJS.
// esbuild will leave them as external requires, but we wrap them
// with a dynamic import() shim so CJS can load them at runtime.
const esmOnlyExternals = [
  "@elizaos/core",
  "@elizaos/plugin-bootstrap",
  "@elizaos/plugin-openrouter",
  "@elizaos/plugin-solana",
  "@elizaos/plugin-telegram",
];

const serverBundleExternals = [
  "./vite",
  "pg-native",
  "@mapbox/node-pre-gyp",
  "sharp",
  "canvas",
  "@resvg/resvg-js",
  "@resvg/resvg-js-win32-x64-msvc",
  "@resvg/resvg-js-linux-x64-gnu",
  "@resvg/resvg-js-linux-x64-musl",
  ...esmOnlyExternals,
];

const optionalNativeFallbackPlugin = {
  name: "optional-native-fallbacks",
  setup(build) {
    build.onResolve({ filter: /^bufferutil$/ }, () => ({
      path: path.resolve("node_modules/bufferutil/fallback.js"),
    }));
    build.onResolve({ filter: /^utf-8-validate$/ }, () => ({
      path: path.resolve("node_modules/utf-8-validate/fallback.js"),
    }));
  },
};

// Shim plugin: replaces ESM-only package requires with a CJS-compatible
// wrapper that uses createRequire + a proxy for the module's exports.
// At runtime in the CJS bundle, these packages will be loaded via
// Node's native ESM loader (dynamic import) wrapped in an async init.
const esmShimPlugin = {
  name: "esm-shim",
  setup(build) {
    const filter = new RegExp(
      "^(" + esmOnlyExternals.map((p) => p.replace(/\//g, "\\/")).join("|") + ")$"
    );
    build.onResolve({ filter }, (args) => ({
      path: args.path,
      namespace: "esm-shim",
    }));
    build.onLoad({ filter: /.*/, namespace: "esm-shim" }, (args) => ({
      contents: `
// ESM shim for ${args.path}
// This package is ESM-only and must be loaded via dynamic import()
let _mod;
async function load() {
  if (!_mod) _mod = await import(${JSON.stringify(args.path)});
  return _mod;
}
// Synchronous proxy: returns undefined until loaded, then the real export.
// Consumers using await import() will work correctly.
module.exports = new Proxy({}, {
  get(_, key) {
    if (key === 'then') return undefined; // not a thenable
    if (_mod) return _mod[key];
    return undefined;
  }
});
module.exports.__esModule = true;
module.exports.__loadAsync = load;
`,
      loader: "js",
    }));
  },
};

fs.mkdirSync(distDir, { recursive: true });
fs.rmSync(staleEsmOutfile, { force: true });

await build({
  entryPoints: ["server/index.ts"],
  outfile,
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  define: {
    "import.meta.url": JSON.stringify("file:///var/task/dist/index.cjs"),
  },
  external: serverBundleExternals,
  plugins: [optionalNativeFallbackPlugin, esmShimPlugin],
  logLevel: "info",
});

console.log(`[build-vercel-server] bundled server to ${outfile}`);

