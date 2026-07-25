import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import vm from "node:vm";

export const projectRoot = resolve(new URL("../..", import.meta.url).pathname.replace(/^\/(?:([A-Za-z]:))/, "$1"));

const coreScripts = [
  "assets/js/app-modules/00-i18n.js",
  "assets/js/reference/pseudo-ops.generated.js",
  "assets/js/reference/instructions.generated.js",
  "assets/js/reference/syscalls.generated.js",
  "assets/js/i18n/en.js",
  "assets/js/app-modules/00-core-store.js",
  "assets/js/app-modules/00-core.js"
];

function createLocalStorage() {
  const values = new Map();
  return {
    getItem(key) {
      return values.has(String(key)) ? values.get(String(key)) : null;
    },
    setItem(key, value) {
      values.set(String(key), String(value));
    },
    removeItem(key) {
      values.delete(String(key));
    },
    clear() {
      values.clear();
    }
  };
}

async function createCoreContext(environment = {}) {
  const sandbox = {
    console,
    localStorage: environment.localStorage || createLocalStorage(),
    setTimeout,
    clearTimeout
  };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  for (const relativePath of coreScripts) {
    const source = await readFile(resolve(projectRoot, relativePath), "utf8");
    vm.runInContext(source, context, { filename: relativePath });
  }
  return context;
}

export async function createJavaScriptEngine(options = {}, environment = {}) {
  const context = await createCoreContext(environment);
  context.__webMarsTestOptions = options;
  return vm.runInContext("createMarsEngine(__webMarsTestOptions)", context);
}

export async function loadInitialSource() {
  const context = await createCoreContext();
  return vm.runInContext("INITIAL_SOURCE", context);
}

export async function loadRuntimeSettings() {
  const sandbox = {};
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const source = await readFile(resolve(projectRoot, "assets/js/app-modules/19-runtime-settings.js"), "utf8");
  vm.runInContext(source, context, { filename: "19-runtime-settings.js" });
  return sandbox.WebMarsModules.runtimeSettings;
}

export async function loadRuntimeBenchmarks() {
  const sandbox = {};
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const source = await readFile(resolve(projectRoot, "assets/js/app-modules/19-runtime-benchmarks.js"), "utf8");
  vm.runInContext(source, context, { filename: "19-runtime-benchmarks.js" });
  return sandbox.WebMarsModules.runtimeBenchmarks;
}

export async function loadMiniCCompiler() {
  const sandbox = { console };
  sandbox.window = sandbox;
  const context = vm.createContext(sandbox);
  const source = await readFile(resolve(projectRoot, "assets/js/app-modules/17-mini-c-compiler.js"), "utf8");
  vm.runInContext(source, context, { filename: "17-mini-c-compiler.js" });
  return sandbox.WebMarsModules.miniCCompiler;
}
