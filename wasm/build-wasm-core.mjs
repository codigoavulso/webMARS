import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const wasmDir = dirname(__filename);
const hotpathSourceFile = join(wasmDir, "core_hotpath.cpp");
const hotpathOutputWasm = join(wasmDir, "core_hotpath.wasm");
const nativeSourceFile = join(wasmDir, "core_engine.cpp");
const nativeOutputJs = join(wasmDir, "core_engine.js");
const referenceDataScript = join(wasmDir, "..", "scripts", "generate-reference-data.mjs");

const hotpathArgs = [
  hotpathSourceFile,
  "-O3",
  "-s",
  "STANDALONE_WASM=1",
  "--no-entry",
  "-Wl,--export=wm_clamp32",
  "-Wl,--export=wm_sign_extend16",
  "-Wl,--export=wm_zero_extend16",
  "-Wl,--export=wm_float32_to_bits",
  "-Wl,--export=wm_bits_to_float32",
  "-Wl,--export=wm_float64_to_hi",
  "-Wl,--export=wm_float64_to_lo",
  "-Wl,--export=wm_bits_to_float64",
  "-Wl,--export=wm_add_u32",
  "-Wl,--export=wm_add32",
  "-Wl,--export=wm_sub32",
  "-Wl,--export=wm_add_overflow32",
  "-Wl,--export=wm_sub_overflow32",
  "-Wl,--export=wm_mul_signed_lo32",
  "-Wl,--export=wm_mul_signed_hi32",
  "-Wl,--export=wm_mul_unsigned_lo32",
  "-Wl,--export=wm_mul_unsigned_hi32",
  "-Wl,--export=wm_div_signed_quot32",
  "-Wl,--export=wm_div_signed_rem32",
  "-Wl,--export=wm_div_unsigned_quot32",
  "-Wl,--export=wm_div_unsigned_rem32",
  "-Wl,--export=wm_compose_word",
  "-Wl,--export=wm_get_word_byte",
  "-Wl,--export=wm_set_word_byte",
  "-Wl,--export=wm_clz32",
  "-Wl,--export=wm_clo32",
  "-Wl,--export=wm_saturating_int32",
  "-Wl,--export=wm_round_nearest_even",
  "-Wl,--export=wm_floor_double",
  "-Wl,--export=wm_ceil_double",
  "-Wl,--export=wm_trunc_double",
  "-o",
  hotpathOutputWasm
];

const nativeArgs = [
  nativeSourceFile,
  "-O3",
  "--bind",
  "-fexceptions",
  "-s",
  "DISABLE_EXCEPTION_CATCHING=0",
  "-s",
  "MODULARIZE=1",
  "-s",
  "EXPORT_NAME=WebMarsNativeModuleFactory",
  "-s",
  "ENVIRONMENT=web",
  "-s",
  "ALLOW_MEMORY_GROWTH=1",
  "-s",
  "INVOKE_RUN=0",
  "-lembind",
  "-o",
  nativeOutputJs
];

function resolveEmccInvocation() {
  const explicitEmcc = String(process.env.EMCC || "").trim();
  if (explicitEmcc) {
    return {
      command: explicitEmcc,
      argsPrefix: [],
      shell: process.platform === "win32" && /\.(bat|cmd)$/i.test(explicitEmcc)
    };
  }

  const emsdkRoot = String(process.env.EMSDK || "").trim();
  if (emsdkRoot) {
    const pythonPath = String(process.env.EMSDK_PYTHON || "").trim();
    const emccPython = join(emsdkRoot, "upstream", "emscripten", "emcc.py");
    if (pythonPath && existsSync(pythonPath) && existsSync(emccPython)) {
      return {
        command: pythonPath,
        argsPrefix: [emccPython],
        shell: false
      };
    }

    const emccPath = join(
      emsdkRoot,
      "upstream",
      "emscripten",
      process.platform === "win32" ? "emcc.bat" : "emcc"
    );
    if (existsSync(emccPath)) {
      return {
        command: emccPath,
        argsPrefix: [],
        shell: process.platform === "win32"
      };
    }
  }

  return {
    command: "emcc",
    argsPrefix: [],
    shell: process.platform === "win32"
  };
}

const referenceRun = spawnSync(process.execPath, [referenceDataScript], {
  stdio: "inherit"
});

if (referenceRun.error) {
  console.error(`[wasm] Failed to generate reference data: ${referenceRun.error.message}`);
  process.exit(1);
}

if (referenceRun.status !== 0) {
  console.error(`[wasm] Reference data generation failed with exit code ${referenceRun.status}.`);
  process.exit(referenceRun.status ?? 1);
}

const invocation = resolveEmccInvocation();
const compileTarget = (args, label) => {
  const invocationArgs = [...invocation.argsPrefix, ...args];
  console.log(`[wasm] Running (${label}): ${invocation.command}`, invocationArgs.join(" "));
  const run = spawnSync(invocation.command, invocationArgs, {
    stdio: "inherit",
    shell: invocation.shell
  });

  if (run.error) {
    console.error(`[wasm] Failed to launch emcc for ${label}: ${run.error.message}`);
    console.error("[wasm] Install Emscripten and run this command again, or export EMCC/EMSDK.");
    process.exit(1);
  }

  if (run.status !== 0) {
    console.error(`[wasm] emcc failed for ${label} with exit code ${run.status}.`);
    process.exit(run.status ?? 1);
  }
};

compileTarget(hotpathArgs, "hotpath");
compileTarget(nativeArgs, "native-engine");

if (!existsSync(hotpathOutputWasm)) {
  console.error(`[wasm] Expected output missing: ${hotpathOutputWasm}`);
  process.exit(1);
}

if (!existsSync(nativeOutputJs)) {
  console.error(`[wasm] Expected output missing: ${nativeOutputJs}`);
  process.exit(1);
}

console.log(`[wasm] Generated ${hotpathOutputWasm}`);
console.log(`[wasm] Generated ${nativeOutputJs}`);
