import {
  SUBSET_ORDER,
  extractSyscallServices,
  firstDiagnosticMessage,
  loadMiniCCompiler,
  previousSubset,
  subtractMultiset,
  writeJsonReport
} from "./mini-c-suite-utils.mjs";

const EXPECTED_INTRINSICS = Object.freeze({
  print_int: { minSubset: "C0-S0", services: [1] },
  print_char: { minSubset: "C0-S0", services: [11] },
  read_int: { minSubset: "C0-S0", services: [5] },
  print_string: { minSubset: "C0-S1", services: [4] },
  read_char: { minSubset: "C0-S1", services: [12] },
  getchar: { minSubset: "C0-S1", services: [12] },
  print_bool: { minSubset: "C0-S4", services: [4] },
  print_hex: { minSubset: "C0-S0", services: [34] },
  print_binary: { minSubset: "C0-S0", services: [35] },
  print_unsigned: { minSubset: "C0-S0", services: [36] },
  print_float_bits: { minSubset: "C0-S0", services: [2] },
  print_double_bits: { minSubset: "C0-S0", services: [3] },
  read_string: { minSubset: "C0-S0", services: [8] },
  read_float_bits: { minSubset: "C0-S0", services: [6] },
  read_double_bits: { minSubset: "C0-S0", services: [7] },
  sbrk: { minSubset: "C0-S0", services: [9] },
  exit0: { minSubset: "C0-S0", services: [10] },
  exit: { minSubset: "C0-S0", services: [17] },
  sleep_ms: { minSubset: "C0-S0", services: [32] },
  time_low: { minSubset: "C0-S0", services: [30] },
  time_high: { minSubset: "C0-S0", services: [30] },
  time_now: { minSubset: "C0-S0", services: [30] },
  midi_out: { minSubset: "C0-S0", services: [31] },
  midi_out_sync: { minSubset: "C0-S0", services: [33] },
  rand_seed: { minSubset: "C0-S0", services: [40] },
  rand_int: { minSubset: "C0-S0", services: [41] },
  rand_int_range: { minSubset: "C0-S0", services: [42] },
  rand_float_bits: { minSubset: "C0-S0", services: [43] },
  rand_double_bits: { minSubset: "C0-S0", services: [44] },
  fd_open: { minSubset: "C0-S1", services: [13] },
  fd_read: { minSubset: "C0-S0", services: [14] },
  fd_write: { minSubset: "C0-S0", services: [15] },
  fd_close: { minSubset: "C0-S0", services: [16] },
  confirm_dialog: { minSubset: "C0-S1", services: [50] },
  input_dialog_int: { minSubset: "C0-S1", services: [51] },
  input_dialog_float_bits: { minSubset: "C0-S1", services: [52] },
  input_dialog_double_bits: { minSubset: "C0-S1", services: [53] },
  input_dialog_string: { minSubset: "C0-S1", services: [54] },
  message_dialog: { minSubset: "C0-S1", services: [55] },
  message_dialog_int: { minSubset: "C0-S1", services: [56] },
  message_dialog_float_bits: { minSubset: "C0-S1", services: [57] },
  message_dialog_double_bits: { minSubset: "C0-S1", services: [58] },
  message_dialog_string: { minSubset: "C0-S1", services: [59] },
  contract_length: { minSubset: "C0-S0", services: [] },
  contract_old: { minSubset: "C0-S0", services: [] },
  contract_result: { minSubset: "C0-S0", services: [] },
  contract_hastag: { minSubset: "C1-NATIVE", services: [] }
});

const ALLOWED_EXTENSION_INTRINSICS = Object.freeze([
  "format",
  "printf"
]);

function pickLiteralForType(typeName, index) {
  const normalized = String(typeName || "int").trim().toLowerCase();
  if (normalized === "string") return `"arg${index}"`;
  if (normalized === "char") return `${65 + (index % 26)}`;
  if (normalized === "bool") return index % 2 ? "true" : "false";
  return `${index + 1}`;
}

function maxSubset(left, right) {
  const leftIndex = SUBSET_ORDER.indexOf(String(left || "").toUpperCase());
  const rightIndex = SUBSET_ORDER.indexOf(String(right || "").toUpperCase());
  if (leftIndex < 0) return right;
  if (rightIndex < 0) return left;
  return leftIndex >= rightIndex ? left : right;
}

function buildIntrinsicCallSource(name, intrinsicMeta, options = {}) {
  if (name === "contract_length") {
    return "int main(void){ int buf[4]; return contract_length(buf); }";
  }
  if (name === "contract_hastag") {
    return "int main(void){ int x = 1; void* p = (void*)&x; return contract_hastag(\"int*\", p) ? 1 : 0; }";
  }
  const params = Number(intrinsicMeta?.params || 0);
  const paramTypes = Array.isArray(intrinsicMeta?.paramTypes) ? intrinsicMeta.paramTypes : [];
  const paramKinds = Array.isArray(intrinsicMeta?.paramKinds) ? intrinsicMeta.paramKinds : [];
  const preferArrayAddress = options.preferArrayAddress === true;
  const declarations = [];
  const args = [];
  for (let i = 0; i < params; i += 1) {
    const kind = String(paramKinds[i] || "scalar").trim().toLowerCase();
    if (preferArrayAddress && kind === "address") {
      const bufferName = `addr_buf_${i}`;
      declarations.push(`int ${bufferName}[8];`);
      args.push(bufferName);
      continue;
    }
    const expected = paramTypes[i];
    const chosenType = Array.isArray(expected) ? String(expected[0] || "int") : String(expected || "int");
    args.push(pickLiteralForType(chosenType, i));
  }
  const declarationsSource = declarations.length ? `${declarations.join(" ")} ` : "";
  return `int main(void){ ${declarationsSource}${name}(${args.join(", ")}); return 0; }`;
}

function uniqueSorted(values) {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function runIntrinsicsRegression() {
  const startedAt = Date.now();
  const { compiler, intrinsics, compilerPath } = loadMiniCCompiler({ exposeIntrinsics: true });
  const compilerIntrinsicNames = Object.keys(intrinsics || {}).sort();
  const expectedIntrinsicNames = Object.keys(EXPECTED_INTRINSICS).sort();
  const missingInCompiler = expectedIntrinsicNames.filter((name) => !compilerIntrinsicNames.includes(name));
  const unexpectedInCompiler = compilerIntrinsicNames.filter((name) => !expectedIntrinsicNames.includes(name));
  const disallowedUnexpectedInCompiler = unexpectedInCompiler.filter((name) => (
    !String(name || "").startsWith("__wm_") && !ALLOWED_EXTENSION_INTRINSICS.includes(name)
  ));

  const baselineBySubset = {};
  for (const subset of SUBSET_ORDER) {
    const baseline = compiler.compile("int main(void){ return 0; }", {
      sourceName: `baseline-${subset}.c`,
      subset
    });
    baselineBySubset[subset] = baseline.ok ? extractSyscallServices(baseline.asm) : [10];
  }

  const rows = [];
  let totalChecks = 0;
  let failedChecks = 0;

  for (const name of expectedIntrinsicNames) {
    const expected = EXPECTED_INTRINSICS[name];
    const meta = intrinsics?.[name] || null;
    const source = buildIntrinsicCallSource(name, meta);

    const subsetMatch = !!meta && String(meta.minSubset || "") === expected.minSubset;
    totalChecks += 1;
    if (!subsetMatch) failedChecks += 1;

    const compileResult = compiler.compile(source, {
      sourceName: `${name}.c`,
      subset: expected.minSubset
    });
    const compileOk = compileResult.ok === true;
    totalChecks += 1;
    if (!compileOk) failedChecks += 1;

    let services = [];
    let extraServices = [];
    let servicesMatch = false;
    if (compileOk) {
      services = extractSyscallServices(compileResult.asm);
      const baseline = baselineBySubset[expected.minSubset] || [];
      extraServices = subtractMultiset(services, baseline);
      const extraUnique = uniqueSorted(extraServices);
      servicesMatch = expected.services.every((service) => extraUnique.includes(service));
    }
    totalChecks += 1;
    if (!servicesMatch) failedChecks += 1;

    const lowerSubset = previousSubset(expected.minSubset);
    let gateCheck = true;
    let gateResult = null;
    if (lowerSubset) {
      gateResult = compiler.compile(source, {
        sourceName: `${name}.gate.c`,
        subset: lowerSubset
      });
      gateCheck = gateResult.ok === false
        && /requires subset/i.test(firstDiagnosticMessage(gateResult));
      totalChecks += 1;
      if (!gateCheck) failedChecks += 1;
    }

    let addressArrayCheck = true;
    let addressArrayResult = null;
    const hasAddressParam = Array.isArray(meta?.paramKinds)
      && meta.paramKinds.some((kind) => String(kind || "").trim().toLowerCase() === "address");
    if (hasAddressParam) {
      const addressSubset = maxSubset(expected.minSubset, "C0-S3");
      const addressSource = buildIntrinsicCallSource(name, meta, { preferArrayAddress: true });
      addressArrayResult = compiler.compile(addressSource, {
        sourceName: `${name}.address-array.c`,
        subset: addressSubset
      });
      addressArrayCheck = addressArrayResult.ok === true;
      totalChecks += 1;
      if (!addressArrayCheck) failedChecks += 1;
    }

    rows.push({
      intrinsic: name,
      expected,
      compilerMeta: meta
        ? {
            minSubset: String(meta.minSubset || ""),
            params: Number(meta.params || 0),
            returnType: String(meta.returnType || "int")
          }
        : null,
      checks: {
        subsetMatch,
        compileOk,
        servicesMatch,
        gateCheck,
        addressArrayCheck
      },
      details: {
        compileError: compileOk ? "" : firstDiagnosticMessage(compileResult),
        gateError: gateResult && gateResult.ok === false ? firstDiagnosticMessage(gateResult) : "",
        addressArrayError: addressArrayResult && addressArrayResult.ok === false ? firstDiagnosticMessage(addressArrayResult) : "",
        observedServices: uniqueSorted(services),
        observedIntrinsicServices: uniqueSorted(extraServices)
      }
    });
  }

  const report = {
    suite: "mini-c-intrinsics-regression",
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    compilerPath,
    summary: {
      expectedIntrinsicCount: expectedIntrinsicNames.length,
      compilerIntrinsicCount: compilerIntrinsicNames.length,
      missingInCompiler,
      unexpectedInCompiler,
      disallowedUnexpectedInCompiler,
      totalChecks,
      failedChecks,
      passedChecks: totalChecks - failedChecks
    },
    matrix: rows
  };

  const outputPath = writeJsonReport("mini-c-intrinsics-regression.json", report);
  console.log(`[mini-c-intrinsics] checks: ${report.summary.passedChecks}/${report.summary.totalChecks}`);
  console.log(`[mini-c-intrinsics] report: ${outputPath}`);

  const keysetMatch = missingInCompiler.length === 0 && disallowedUnexpectedInCompiler.length === 0;
  if (!keysetMatch || failedChecks > 0) process.exitCode = 1;
}

runIntrinsicsRegression();
