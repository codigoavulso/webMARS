import {
  SUBSET_ORDER,
  firstDiagnosticMessage,
  loadMiniCCompiler,
  subsetIndex,
  writeJsonReport
} from "./mini-c-suite-utils.mjs";

const SUBSET_CASES = [
  {
    id: "s0_arithmetic",
    name: "Arithmetic, assignment, return",
    minSubset: "C0-S0",
    source: "int main(void){ int x=2; x = x * 3 + 1; return x; }"
  },
  {
    id: "s0_intrinsic_print_int",
    name: "Intrinsic print_int",
    minSubset: "C0-S0",
    source: "int main(void){ print_int(42); return 0; }"
  },
  {
    id: "s0_ternary_operator",
    name: "Ternary operator",
    minSubset: "C0-S0",
    source: "int main(void){ int a=1; int b=2; int c=(a<b)?a:b; return c; }"
  },
  {
    id: "s0_assert_statement",
    name: "Assert statement",
    minSubset: "C0-S0",
    source: "int main(void){ int ok=1; assert(ok); return 0; }"
  },
  {
    id: "s0_pointer_alloc_deref",
    name: "Pointers alloc + deref",
    minSubset: "C0-S0",
    source: "int main(void){ int* p=alloc(int); *p=7; int v=*p; return v; }"
  },
  {
    id: "s0_cast_int_to_pointer",
    name: "Cast int to pointer",
    minSubset: "C0-S0",
    source: "int main(void){ int* p=(int*)0x10008000; *p=0; return 0; }"
  },
  {
    id: "s0_cast_pointer_to_int",
    name: "Cast pointer to int",
    minSubset: "C0-S0",
    source: "int main(void){ int* p=alloc(int); int raw=(int)p; if(raw==0) return 0; return 1; }"
  },
  {
    id: "s0_alloc_array_and_index",
    name: "alloc_array and pointer indexing",
    minSubset: "C0-S0",
    source: "int main(void){ int* p=alloc_array(int,4); p[0]=3; p[1]=4; return p[0]+p[1]; }"
  },
  {
    id: "s0_struct_typedef_member_access",
    name: "Struct + typedef + member/arrow",
    minSubset: "C0-S0",
    source: "struct Pair { int x; int y; }; typedef struct Pair Pair; int main(void){ Pair p; p.x=1; p.y=2; Pair* q=alloc(Pair); q->x=p.x; q->y=p.y; return q->x+q->y; }"
  },
  {
    id: "s0_contract_annotation_assert",
    name: "Contract annotations and \\length",
    minSubset: "C0-S0",
    source: "int main(void){\n  int* a = alloc_array(int, 2);\n  //@assert \\length(a)==2\n  requires(1);\n  ensures(1);\n  invariant(1);\n  return 0;\n}"
  },
  {
    id: "s1_intrinsic_confirm_dialog",
    name: "S1 dialog intrinsic",
    minSubset: "C0-S1",
    source: "int main(void){ confirm_dialog(\"ok?\"); return 0; }"
  },
  {
    id: "s1_use_library_directive",
    name: "#use <lib> directive",
    minSubset: "C0-S1",
    source: "#use <stdio>\nint main(void){ print_int(1); return 0; }"
  },
  {
    id: "s1_use_file_directive",
    name: "#use \"file\" directive",
    minSubset: "C0-S1",
    source: "#use \"helper.c0\"\nint main(void){ return helper(); }",
    compileOptions: {
      includeResolver: ({ target }) => (target === "helper.c0" ? "int helper(void){ return 7; }" : null)
    }
  },
  {
    id: "s2_for_loop",
    name: "For loop and update",
    minSubset: "C0-S2",
    source: "int main(void){ int i=0; int s=0; for(i=0;i<4;i++){ s+=i; } return s; }"
  },
  {
    id: "s2_postfix_update",
    name: "Postfix update operators",
    minSubset: "C0-S2",
    source: "int main(void){ int x=2; int y=0; y = x++; y += x--; return x + y; }"
  },
  {
    id: "s2_prefix_update",
    name: "Prefix update operators",
    minSubset: "C0-S2",
    source: "int main(void){ int x=2; int y=0; y = ++x; y += --x; return x + y; }"
  },
  {
    id: "s2_break_continue",
    name: "Break and continue",
    minSubset: "C0-S2",
    source: "int main(void){ int i=0; int s=0; while(i<6){ i++; if(i==3) continue; if(i==5) break; s+=i; } return s; }"
  },
  {
    id: "s2_break_outside_loop_forbidden",
    name: "Break outside loop is rejected",
    minSubset: "C0-S2",
    source: "int main(void){ break; return 0; }",
    expectedBySubset: {
      "C0-S0": false,
      "C0-S1": false,
      "C0-S2": false,
      "C0-S3": false,
      "C0-S4": false
    }
  },
  {
    id: "s2_continue_outside_loop_forbidden",
    name: "Continue outside loop is rejected",
    minSubset: "C0-S2",
    source: "int main(void){ continue; return 0; }",
    expectedBySubset: {
      "C0-S0": false,
      "C0-S1": false,
      "C0-S2": false,
      "C0-S3": false,
      "C0-S4": false
    }
  },
  {
    id: "s2_for_step_declaration_forbidden",
    name: "For-step declaration is rejected",
    minSubset: "C0-S2",
    source: "int main(void){ int i=0; for(i=0;i<3;int j=0){ i=i+1; } return i; }",
    expectedBySubset: {
      "C0-S0": false,
      "C0-S1": false,
      "C0-S2": false,
      "C0-S3": false,
      "C0-S4": false
    }
  },
  {
    id: "s3_arrays",
    name: "Local arrays and indexing",
    minSubset: "C0-S3",
    source: "int main(void){ int a[] = {1,2,3}; a[1]++; return a[0] + a[1] + a[2]; }"
  },
  {
    id: "s3_array_param",
    name: "Array parameter passing",
    minSubset: "C0-S3",
    source: "int sum(int xs[], int n){ int i=0; int s=0; while(i<n){ s+=xs[i]; i++; } return s; } int main(void){ int a[] = {4,5,6}; return sum(a,3); }"
  },
  {
    id: "s3_multidim_local",
    name: "Multidimensional local arrays",
    minSubset: "C0-S3",
    source: "int main(void){ int m[2][3]={{1,2,3},{4,5,6}}; m[1][2]=m[0][1]+7; return m[1][2]; }"
  },
  {
    id: "s3_multidim_param",
    name: "Multidimensional array parameter",
    minSubset: "C0-S3",
    source: "int sum2(int m[][3], int rows){ int r=0; int c=0; int s=0; while(r<rows){ c=0; while(c<3){ s+=m[r][c]; c++; } r++; } return s; } int main(void){ int m[2][3]={{1,2,3},{4,5,6}}; return sum2(m,2); }"
  },
  {
    id: "s3_array_decay_intrinsic_address",
    name: "Array decay to address-like intrinsic parameter",
    minSubset: "C0-S3",
    source: "int main(void){ int buf[8]; read_string(buf, 8); return 0; }"
  },
  {
    id: "s4_bool_and_string_types",
    name: "Bool/string typed declarations",
    minSubset: "C0-S4",
    source: "int main(void){ bool flag=true; string msg=\"ok\"; if(flag){ print_string(msg); } return 0; }"
  },
  {
    id: "s4_print_bool",
    name: "Intrinsic print_bool",
    minSubset: "C0-S4",
    source: "int main(void){ bool flag=false; print_bool(flag); return 0; }"
  }
];

function runSubsetMatrix() {
  const { compiler, compilerPath } = loadMiniCCompiler();
  const startedAt = Date.now();
  const matrixRows = [];
  const subsetSummary = Object.fromEntries(SUBSET_ORDER.map((subset) => [subset, { passed: 0, total: 0 }]));

  for (const entry of SUBSET_CASES) {
    const minLevel = subsetIndex(entry.minSubset);
    const bySubset = {};
    for (const subset of SUBSET_ORDER) {
      const currentLevel = subsetIndex(subset);
      const expectedBySubset = (entry.expectedBySubset && typeof entry.expectedBySubset === "object")
        ? entry.expectedBySubset
        : null;
      const expectedOk = expectedBySubset && Object.prototype.hasOwnProperty.call(expectedBySubset, subset)
        ? expectedBySubset[subset] === true
        : currentLevel >= minLevel;
      const result = compiler.compile(entry.source, {
        sourceName: `${entry.id}.${subset.toLowerCase()}.c`,
        subset,
        targetAbi: "o32",
        emitComments: true,
        ...(entry.compileOptions && typeof entry.compileOptions === "object" ? entry.compileOptions : {})
      });
      const ok = result?.ok === true;
      const passed = ok === expectedOk;
      subsetSummary[subset].total += 1;
      if (passed) subsetSummary[subset].passed += 1;
      bySubset[subset] = {
        ok,
        expectedOk,
        passed,
        error: ok ? "" : firstDiagnosticMessage(result)
      };
    }
    matrixRows.push({
      id: entry.id,
      name: entry.name,
      minSubset: entry.minSubset,
      bySubset
    });
  }

  const diagnosticsProbeSource = "int main(void){ int x = ; return 0; }";
  const diagnosticsProbe = compiler.compile(diagnosticsProbeSource, {
    sourceName: "diagnostic-probe.c",
    subset: "C0-S0"
  });
  const firstError = Array.isArray(diagnosticsProbe.errors) ? diagnosticsProbe.errors[0] : null;
  const hasStructuredSuggestion = !!(firstError && typeof firstError === "object"
    && firstError.suggestion
    && typeof firstError.suggestion === "object"
    && typeof firstError.suggestion.code === "string"
    && typeof firstError.suggestion.message === "string");
  const hasSnippet = !!(firstError && typeof firstError === "object" && typeof firstError.snippet === "string" && firstError.snippet.includes("^"));
  const hasContext = !!(firstError && typeof firstError === "object" && firstError.context && typeof firstError.context === "object");

  const totalCells = matrixRows.reduce((acc, row) => acc + Object.keys(row.bySubset).length, 0);
  const passedCells = matrixRows.reduce(
    (acc, row) => acc + Object.values(row.bySubset).filter((cell) => cell.passed).length,
    0
  );
  const failedCells = totalCells - passedCells;

  const report = {
    suite: "mini-c-subset-matrix",
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    compilerPath,
    subsets: SUBSET_ORDER,
    summary: {
      totalCells,
      passedCells,
      failedCells,
      subsetConformance: subsetSummary
    },
    diagnosticsContract: {
      ok: diagnosticsProbe.ok === false && hasStructuredSuggestion && hasSnippet && hasContext,
      probeSource: diagnosticsProbeSource,
      firstError: firstError || null,
      checks: {
        hasStructuredSuggestion,
        hasSnippet,
        hasContext
      }
    },
    matrix: matrixRows
  };

  const outputPath = writeJsonReport("mini-c-subset-matrix.json", report);
  const allGood = failedCells === 0 && report.diagnosticsContract.ok;
  console.log(`[mini-c-subsets] matrix: ${passedCells}/${totalCells} cells passed`);
  console.log(`[mini-c-subsets] diagnostics contract: ${report.diagnosticsContract.ok ? "ok" : "failed"}`);
  console.log(`[mini-c-subsets] report: ${outputPath}`);
  if (!allGood) process.exitCode = 1;
}

runSubsetMatrix();
