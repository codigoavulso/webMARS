(function initMiniCCompilerModule(rootScope) {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  if (registry.miniCCompiler) return;

  const SOURCE_EXTENSION_PATTERN = /\.(c|c0)$/i;
  const DEFAULT_TEMPLATE = [
    "#include <stdio.h>",
    "",
    "int fact(int n) {",
    "  if (n <= 1) return 1;",
    "  return n * fact(n - 1);",
    "}",
    "",
    "int main(void) {",
    "  int value = fact(5);",
    "  print_int(value);",
    "  print_char(10);",
    "  return 0;",
    "}",
    ""
  ].join("\n");

  const KEYWORDS = new Set([
    "int", "void", "bool", "char", "string",
    "struct", "typedef",
    "const",
    "true", "false",
    "NULL", "alloc", "alloc_array",
    "assert", "requires", "ensures", "invariant", "loop_invariant",
    "return", "if", "else", "while", "for", "break", "continue"
  ]);
  const MULTI_CHAR_PUNCT = [
    "<<=", ">>=",
    "->",
    "<=", ">=", "==", "!=", "&&", "||", "<<", ">>",
    "++", "--",
    "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^="
  ];
  const SINGLE_CHAR_PUNCT = new Set([
    "(", ")", "{", "}", "[", "]", ";", ",",
    ".", "?", ":",
    "+", "-", "*", "/", "%", "=",
    "<", ">", "!", "&", "|", "^", "~"
  ]);
  const ASSIGNMENT_OPERATORS = new Set(["=", "+=", "-=", "*=", "/=", "%=", "&=", "|=", "^=", "<<=", ">>="]);
  const COMPOUND_ASSIGN_TO_BINARY = Object.freeze({
    "+=": "+",
    "-=": "-",
    "*=": "*",
    "/=": "/",
    "%=": "%",
    "&=": "&",
    "|=": "|",
    "^=": "^",
    "<<=": "<<",
    ">>=": ">>"
  });
  const TEMP_REGS = ["$t0", "$t1", "$t2", "$t3", "$t4", "$t5", "$t6", "$t7"];

  const SUBSET_LEVELS = Object.freeze({
    "C0-S0": 0,
    "C0-S1": 1,
    "C0-S2": 2,
    "C0-S3": 3,
    "C0-S4": 4
  });

  const FUNCTION_RETURN_TYPES = new Set(["void", "int", "bool", "char", "string"]);
  const DECLARATION_TYPES = new Set(["int", "bool", "char", "string"]);

  const INTRINSICS = Object.freeze({
    print_int: { name: "print_int", params: 1, paramTypes: ["int"], returnType: "void", minSubset: "C0-S0" },
    print_char: { name: "print_char", params: 1, paramTypes: [["int", "char"]], returnType: "void", minSubset: "C0-S0" },
    read_int: { name: "read_int", params: 0, paramTypes: [], returnType: "int", minSubset: "C0-S0" },
    print_string: { name: "print_string", params: 1, paramTypes: ["string"], returnType: "void", minSubset: "C0-S1" },
    read_char: { name: "read_char", params: 0, paramTypes: [], returnType: "char", minSubset: "C0-S1" },
    getchar: { name: "getchar", params: 0, paramTypes: [], returnType: "char", minSubset: "C0-S1" },
    print_bool: { name: "print_bool", params: 1, paramTypes: ["bool"], returnType: "void", minSubset: "C0-S4" },
    print_hex: { name: "print_hex", params: 1, paramTypes: [["int", "char", "bool"]], returnType: "void", minSubset: "C0-S0" },
    print_binary: { name: "print_binary", params: 1, paramTypes: [["int", "char", "bool"]], returnType: "void", minSubset: "C0-S0" },
    print_unsigned: { name: "print_unsigned", params: 1, paramTypes: [["int", "char", "bool"]], returnType: "void", minSubset: "C0-S0" },
    print_float_bits: { name: "print_float_bits", params: 1, paramTypes: ["int"], returnType: "void", minSubset: "C0-S0" },
    print_double_bits: { name: "print_double_bits", params: 2, paramTypes: ["int", "int"], returnType: "void", minSubset: "C0-S0" },
    read_string: { name: "read_string", params: 2, paramTypes: ["int", "int"], paramKinds: ["address", "scalar"], returnType: "void", minSubset: "C0-S0" },
    read_float_bits: { name: "read_float_bits", params: 0, paramTypes: [], returnType: "int", minSubset: "C0-S0" },
    read_double_bits: { name: "read_double_bits", params: 2, paramTypes: ["int", "int"], paramKinds: ["address", "address"], returnType: "void", minSubset: "C0-S0" },
    sbrk: { name: "sbrk", params: 1, paramTypes: ["int"], returnType: "int", minSubset: "C0-S0" },
    exit0: { name: "exit0", params: 0, paramTypes: [], returnType: "void", minSubset: "C0-S0" },
    exit: { name: "exit", params: 1, paramTypes: ["int"], returnType: "void", minSubset: "C0-S0" },
    sleep_ms: { name: "sleep_ms", params: 1, paramTypes: ["int"], returnType: "void", minSubset: "C0-S0" },
    time_low: { name: "time_low", params: 0, paramTypes: [], returnType: "int", minSubset: "C0-S0" },
    time_high: { name: "time_high", params: 0, paramTypes: [], returnType: "int", minSubset: "C0-S0" },
    time_now: { name: "time_now", params: 2, paramTypes: ["int", "int"], paramKinds: ["address", "address"], returnType: "void", minSubset: "C0-S0" },
    midi_out: { name: "midi_out", params: 4, paramTypes: ["int", "int", "int", "int"], returnType: "void", minSubset: "C0-S0" },
    midi_out_sync: { name: "midi_out_sync", params: 4, paramTypes: ["int", "int", "int", "int"], returnType: "void", minSubset: "C0-S0" },
    rand_seed: { name: "rand_seed", params: 2, paramTypes: ["int", "int"], returnType: "void", minSubset: "C0-S0" },
    rand_int: { name: "rand_int", params: 1, paramTypes: ["int"], returnType: "int", minSubset: "C0-S0" },
    rand_int_range: { name: "rand_int_range", params: 2, paramTypes: ["int", "int"], returnType: "int", minSubset: "C0-S0" },
    rand_float_bits: { name: "rand_float_bits", params: 1, paramTypes: ["int"], returnType: "int", minSubset: "C0-S0" },
    rand_double_bits: { name: "rand_double_bits", params: 3, paramTypes: ["int", "int", "int"], paramKinds: ["scalar", "address", "address"], returnType: "void", minSubset: "C0-S0" },
    fd_open: { name: "fd_open", params: 3, paramTypes: ["string", "int", "int"], returnType: "int", minSubset: "C0-S1" },
    fd_read: { name: "fd_read", params: 3, paramTypes: ["int", "int", "int"], paramKinds: ["scalar", "address", "scalar"], returnType: "int", minSubset: "C0-S0" },
    fd_write: { name: "fd_write", params: 3, paramTypes: ["int", "int", "int"], paramKinds: ["scalar", "address", "scalar"], returnType: "int", minSubset: "C0-S0" },
    fd_close: { name: "fd_close", params: 1, paramTypes: ["int"], returnType: "void", minSubset: "C0-S0" },
    confirm_dialog: { name: "confirm_dialog", params: 1, paramTypes: ["string"], returnType: "int", minSubset: "C0-S1" },
    input_dialog_int: { name: "input_dialog_int", params: 2, paramTypes: ["string", "int"], paramKinds: ["scalar", "address"], returnType: "int", minSubset: "C0-S1" },
    input_dialog_float_bits: { name: "input_dialog_float_bits", params: 2, paramTypes: ["string", "int"], paramKinds: ["scalar", "address"], returnType: "int", minSubset: "C0-S1" },
    input_dialog_double_bits: { name: "input_dialog_double_bits", params: 4, paramTypes: ["string", "int", "int", "int"], paramKinds: ["scalar", "address", "address", "address"], returnType: "void", minSubset: "C0-S1" },
    input_dialog_string: { name: "input_dialog_string", params: 4, paramTypes: ["string", "int", "int", "int"], paramKinds: ["scalar", "address", "scalar", "address"], returnType: "void", minSubset: "C0-S1" },
    message_dialog: { name: "message_dialog", params: 2, paramTypes: ["string", "int"], returnType: "void", minSubset: "C0-S1" },
    message_dialog_int: { name: "message_dialog_int", params: 2, paramTypes: ["string", "int"], returnType: "void", minSubset: "C0-S1" },
    message_dialog_float_bits: { name: "message_dialog_float_bits", params: 2, paramTypes: ["string", "int"], returnType: "void", minSubset: "C0-S1" },
    message_dialog_double_bits: { name: "message_dialog_double_bits", params: 3, paramTypes: ["string", "int", "int"], returnType: "void", minSubset: "C0-S1" },
    message_dialog_string: { name: "message_dialog_string", params: 2, paramTypes: ["string", "string"], returnType: "void", minSubset: "C0-S1" },
    contract_length: { name: "contract_length", params: 1, paramTypes: [["int", "bool", "char"]], paramKinds: ["address"], returnType: "int", minSubset: "C0-S0" },
    contract_old: { name: "contract_old", params: 1, paramTypes: ["int"], returnType: "int", minSubset: "C0-S0" },
    contract_result: { name: "contract_result", params: 0, paramTypes: [], returnType: "int", minSubset: "C0-S0" }
  });

  function normalizeSubsetName(value) {
    const normalized = String(value || "C0-S4").trim().toUpperCase();
    if (Object.prototype.hasOwnProperty.call(SUBSET_LEVELS, normalized)) return normalized;
    return "C0-S0";
  }

  function subsetLevel(value) {
    return SUBSET_LEVELS[normalizeSubsetName(value)] ?? 0;
  }

  function normalizeTypeName(value) {
    const raw = String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!raw) return "int";
    const pointerMatch = raw.match(/^(.*?)(\*+)$/);
    if (pointerMatch) {
      const base = normalizeTypeName(pointerMatch[1]);
      const stars = pointerMatch[2] || "*";
      return `${base}${stars}`;
    }
    if (raw.startsWith("struct ")) return raw;
    if (FUNCTION_RETURN_TYPES.has(raw)) return raw;
    // Typedef aliases and unresolved custom names are preserved.
    return raw;
  }

  function isPointerTypeName(typeName) {
    return /\*+$/.test(normalizeTypeName(typeName));
  }

  function dereferenceTypeName(typeName) {
    const normalized = normalizeTypeName(typeName);
    if (!isPointerTypeName(normalized)) return "int";
    return normalized.replace(/\*$/, "") || "int";
  }

  function pointerTypeName(baseType, depth = 1) {
    const count = Math.max(1, depth | 0);
    return `${normalizeTypeName(baseType)}${"*".repeat(count)}`;
  }

  function isStructTypeName(typeName) {
    return normalizeTypeName(typeName).startsWith("struct ");
  }

  function isNullTypeName(typeName) {
    return normalizeTypeName(typeName) === "null";
  }

  function isDeclarationTypeName(value) {
    const raw = normalizeTypeName(value);
    if (DECLARATION_TYPES.has(raw)) return true;
    if (raw === "struct") return true;
    if (isPointerTypeName(raw)) return true;
    if (isStructTypeName(raw)) return true;
    return false;
  }

  function isNumericType(typeName) {
    const t = normalizeTypeName(typeName);
    return t === "int" || t === "char";
  }

  function isBooleanType(typeName) {
    return normalizeTypeName(typeName) === "bool";
  }

  function isStringType(typeName) {
    return normalizeTypeName(typeName) === "string";
  }

  function requiresS4SubsetType(typeName) {
    const t = normalizeTypeName(typeName);
    return t === "bool" || t === "char" || t === "string";
  }

  function normalizeParamKind(value) {
    const normalized = String(value || "scalar").trim().toLowerCase();
    if (normalized === "array") return "array";
    if (normalized === "address") return "address";
    return "scalar";
  }

  function normalizeArrayShape(shapeValue, fallback = [1]) {
    const source = Array.isArray(shapeValue) ? shapeValue : [];
    if (!source.length) return Array.isArray(fallback) && fallback.length ? [...fallback] : [1];
    const normalized = source.map((entry) => {
      const value = Number(entry);
      return Number.isFinite(value) && value > 0 ? (value | 0) : 0;
    });
    return normalized.length ? normalized : (Array.isArray(fallback) && fallback.length ? [...fallback] : [1]);
  }

  function arrayShapeProduct(shapeValue, startIndex = 0) {
    const shape = normalizeArrayShape(shapeValue, []);
    if (!shape.length) return 1;
    let product = 1;
    for (let i = Math.max(0, startIndex | 0); i < shape.length; i += 1) {
      const dim = shape[i];
      if (!Number.isFinite(dim) || dim <= 0) return 0;
      product *= dim;
      if (!Number.isFinite(product) || product <= 0) return 0;
    }
    return product | 0;
  }

  function flattenArrayInitializerElements(initializerNode, output = []) {
    if (!initializerNode || typeof initializerNode !== "object") return output;
    const elements = Array.isArray(initializerNode.elements) ? initializerNode.elements : [];
    elements.forEach((element) => {
      if (element && typeof element === "object" && element.type === "array_initializer") {
        flattenArrayInitializerElements(element, output);
      } else {
        output.push(element);
      }
    });
    return output;
  }

  function formatArrayShape(shapeValue) {
    const shape = normalizeArrayShape(shapeValue, []);
    if (!shape.length) return "[]";
    return shape
      .map((dim, index) => {
        if (index === 0 && (!Number.isFinite(dim) || dim <= 0)) return "[]";
        return `[${Number.isFinite(dim) && dim > 0 ? (dim | 0) : "?"}]`;
      })
      .join("");
  }

  function arrayParameterShapesCompatible(expectedShapeValue, actualShapeValue) {
    const expectedShape = normalizeArrayShape(expectedShapeValue, []);
    const actualShape = normalizeArrayShape(actualShapeValue, []);
    if (!expectedShape.length) return true;
    if (!actualShape.length) return false;
    if (expectedShape.length !== actualShape.length) return false;
    for (let i = 1; i < expectedShape.length; i += 1) {
      const expected = expectedShape[i];
      const actual = actualShape[i];
      if (!Number.isFinite(expected) || expected <= 0) continue;
      if (!Number.isFinite(actual) || actual <= 0) continue;
      if ((expected | 0) !== (actual | 0)) return false;
    }
    return true;
  }

  const DEFAULT_USE_LIBRARIES = Object.freeze({
    stdio: ""
  });

  function normalizePathLike(value) {
    const raw = String(value || "").trim().replace(/\\/g, "/");
    if (!raw.length) return "";
    const parts = [];
    raw.split("/").forEach((segment) => {
      const part = String(segment || "").trim();
      if (!part || part === ".") return;
      if (part === "..") {
        if (parts.length) parts.pop();
        return;
      }
      parts.push(part);
    });
    return parts.join("/");
  }

  function pathDirname(value) {
    const normalized = normalizePathLike(value);
    const split = normalized.lastIndexOf("/");
    return split >= 0 ? normalized.slice(0, split) : "";
  }

  function pathJoin(baseDir, relativePath) {
    const base = normalizePathLike(baseDir);
    const rel = normalizePathLike(relativePath);
    if (!base) return rel;
    if (!rel) return base;
    return normalizePathLike(`${base}/${rel}`);
  }

  function stripUseLibrarySuffix(libraryName) {
    const normalized = String(libraryName || "").trim().replace(/\\/g, "/");
    return normalized.replace(/\.(h0|h|c0|c)$/i, "");
  }

  function normalizeUseLibrarySourceMap(raw) {
    const map = new Map();
    if (!raw) return map;
    if (raw instanceof Map) {
      raw.forEach((value, key) => {
        const normalizedKey = stripUseLibrarySuffix(key).toLowerCase();
        if (!normalizedKey) return;
        map.set(normalizedKey, String(value ?? ""));
      });
      return map;
    }
    if (typeof raw === "object") {
      Object.keys(raw).forEach((key) => {
        const normalizedKey = stripUseLibrarySuffix(key).toLowerCase();
        if (!normalizedKey) return;
        map.set(normalizedKey, String(raw[key] ?? ""));
      });
    }
    return map;
  }

  function preprocessUseDirectives(sourceText, options = {}) {
    const subset = normalizeSubsetName(options.subset || "C0-S4");
    const subsetIsS1OrHigher = subsetLevel(subset) >= subsetLevel("C0-S1");
    const includeResolver = typeof options.includeResolver === "function"
      ? options.includeResolver
      : null;
    const useLibrarySources = normalizeUseLibrarySourceMap(options.useLibrarySources);
    Object.keys(DEFAULT_USE_LIBRARIES).forEach((name) => {
      const key = name.toLowerCase();
      if (!useLibrarySources.has(key)) useLibrarySources.set(key, String(DEFAULT_USE_LIBRARIES[name] ?? ""));
    });
    const sourceName = String(options.sourceName || "program.c");
    const diagnostics = [];
    const warnings = [];
    const loadedKeys = new Set();
    const activeStack = new Set();

    const resolveIncludeSource = (directive) => {
      const kind = directive.kind;
      const target = String(directive.target || "").trim();
      const normalizedTarget = normalizePathLike(target);
      if (!normalizedTarget) {
        return {
          ok: false,
          error: createDiagnostic(`Invalid #use target '${target}'.`, {
            line: directive.line,
            column: directive.column
          }, "preprocess")
        };
      }

      if (kind === "lib") {
        const libName = stripUseLibrarySuffix(normalizedTarget).toLowerCase();
        if (useLibrarySources.has(libName)) {
          return {
            ok: true,
            sourceName: `<${libName}>`,
            source: String(useLibrarySources.get(libName) ?? "")
          };
        }
      }

      if (includeResolver) {
        const resolved = includeResolver({
          kind,
          target: normalizedTarget,
          fromSourceName: directive.fromSourceName,
          line: directive.line
        });
        if (typeof resolved === "string") {
          return {
            ok: true,
            sourceName: normalizedTarget,
            source: resolved
          };
        }
        if (resolved && typeof resolved === "object" && typeof resolved.source === "string") {
          return {
            ok: true,
            sourceName: String(resolved.sourceName || normalizedTarget),
            source: String(resolved.source || "")
          };
        }
      }

      return {
        ok: false,
        error: createDiagnostic(
          kind === "lib"
            ? `Unable to resolve #use <${target}>.`
            : `Unable to resolve #use \"${target}\".`,
          { line: directive.line, column: directive.column },
          "preprocess"
        )
      };
    };

    const processUnit = (unitSource, unitName) => {
      const outputLines = [];
      const lines = String(unitSource ?? "").replace(/\r\n/g, "\n").split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        const lineText = lines[index];
        const trimmed = String(lineText || "").trim();
        if (!trimmed.startsWith("#")) {
          outputLines.push(lineText);
          continue;
        }

        const useLibraryMatch = trimmed.match(/^#use\s*<([^>]+)>\s*$/);
        const useFileMatch = useLibraryMatch ? null : trimmed.match(/^#use\s*\"([^\"]+)\"\s*$/);
        if (!useLibraryMatch && !useFileMatch) {
          warnings.push(createDiagnostic(
            `Ignoring unsupported preprocessor directive '${trimmed}'.`,
            { line: index + 1, column: 1 },
            "preprocess"
          ));
          continue;
        }

        if (!subsetIsS1OrHigher) {
          diagnostics.push(createDiagnostic(
            `#use directives require subset C0-S1, current subset is ${subset}.`,
            { line: index + 1, column: 1 },
            "preprocess"
          ));
          continue;
        }

        const directive = {
          kind: useLibraryMatch ? "lib" : "file",
          target: useLibraryMatch ? useLibraryMatch[1] : useFileMatch[1],
          line: index + 1,
          column: 1,
          fromSourceName: unitName
        };
        const resolved = resolveIncludeSource(directive);
        if (!resolved.ok) {
          diagnostics.push(resolved.error);
          continue;
        }

        const resolvedName = normalizePathLike(resolved.sourceName || directive.target)
          || (directive.kind === "lib"
            ? `<${stripUseLibrarySuffix(directive.target).toLowerCase()}>`
            : normalizePathLike(directive.target));
        const loadKey = `${directive.kind}:${resolvedName}`;
        if (activeStack.has(loadKey)) {
          diagnostics.push(createDiagnostic(
            `Circular #use detected for '${directive.target}'.`,
            { line: index + 1, column: 1 },
            "preprocess"
          ));
          continue;
        }
        if (loadedKeys.has(loadKey)) continue;
        loadedKeys.add(loadKey);
        activeStack.add(loadKey);
        outputLines.push(processUnit(resolved.source, resolvedName));
        activeStack.delete(loadKey);
      }
      return outputLines.join("\n");
    };

    const mergedSource = processUnit(String(sourceText ?? ""), sourceName);
    return {
      source: mergedSource,
      diagnostics,
      warnings
    };
  }

  function preprocessContractAnnotations(sourceText) {
    const source = String(sourceText ?? "").replace(/\r\n/g, "\n");
    const lines = source.split("\n");
    const warnings = [];
    let blockDepth = 0;
    const out = lines.map((rawLine, index) => {
      let line = String(rawLine ?? "");
      const trimmed = line.trim();
      if (trimmed.startsWith("//@")) {
        const match = trimmed.match(/^\/\/@\s*(requires|ensures|loop_invariant|invariant|assert)\s*(.*)$/i);
        if (!match) return "";
        const kind = String(match[1] || "assert").toLowerCase();
        const mappedKind = kind === "loop_invariant" ? "invariant" : kind;
        let expression = String(match[2] || "").trim();
        if (expression.endsWith(";")) expression = expression.slice(0, -1).trim();
        expression = expression
          .replace(/\\length\s*\(/g, "contract_length(")
          .replace(/\\old\s*\(/g, "contract_old(")
          .replace(/\\result/g, "contract_result");
        if ((mappedKind === "requires" || mappedKind === "ensures") && blockDepth <= 0) {
          warnings.push(createDiagnostic(
            `Ignoring top-level contract annotation '${mappedKind}' (only statement-level contracts are currently enforced).`,
            { line: index + 1, column: 1 },
            "preprocess"
          ));
          return "";
        }
        return `${mappedKind}(${expression || "1"});`;
      }
      line = line
        .replace(/\\length\s*\(/g, "contract_length(")
        .replace(/\\old\s*\(/g, "contract_old(")
        .replace(/\\result/g, "contract_result()");
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === "{") blockDepth += 1;
        else if (ch === "}") blockDepth = Math.max(0, blockDepth - 1);
      }
      return line;
    });
    return {
      source: out.join("\n"),
      warnings
    };
  }

  const ACTIVE_DIAGNOSTIC_CONTEXT = {
    sourceName: "",
    lines: []
  };

  function setDiagnosticSourceContext(sourceName, sourceText) {
    ACTIVE_DIAGNOSTIC_CONTEXT.sourceName = String(sourceName || "");
    ACTIVE_DIAGNOSTIC_CONTEXT.lines = String(sourceText ?? "").replace(/\r\n/g, "\n").split("\n");
  }

  function inferDiagnosticSuggestion(message, phase) {
    const text = String(message || "");
    const lowered = text.toLowerCase();

    if (lowered.includes("expected ';'")) {
      return {
        code: "MC_SUGGEST_ADD_SEMICOLON",
        message: "Add ';' at the end of the statement.",
        action: "Insert a semicolon before the next token or closing brace."
      };
    }
    if (lowered.includes("unknown identifier")) {
      return {
        code: "MC_SUGGEST_DECLARE_SYMBOL",
        message: "This identifier is not declared in scope.",
        action: "Declare it first or fix the symbol name typo."
      };
    }
    if (lowered.includes("missing required function 'main'")) {
      return {
        code: "MC_SUGGEST_DEFINE_MAIN",
        message: "Program entrypoint is missing.",
        action: "Add 'int main(void) { ... }' to the source."
      };
    }
    if (lowered.includes("requires subset c0-s")) {
      return {
        code: "MC_SUGGEST_RAISE_SUBSET",
        message: "Feature requires a higher Mini-C subset level.",
        action: "Switch compiler subset to the required level or rewrite without that feature."
      };
    }
    if (lowered.includes("expects") && lowered.includes("argument")) {
      return {
        code: "MC_SUGGEST_FIX_CALL_ARGS",
        message: "Function call arguments do not match the function signature.",
        action: "Adjust argument count/types, or update the function prototype."
      };
    }
    if (lowered.includes("cannot assign to const") || lowered.includes("cannot modify const")) {
      return {
        code: "MC_SUGGEST_CONST_WRITE",
        message: "Const-qualified value cannot be written.",
        action: "Remove 'const' from declaration or assign to another writable variable."
      };
    }
    if (lowered.includes("array") && lowered.includes("requires an index expression")) {
      return {
        code: "MC_SUGGEST_ARRAY_INDEX",
        message: "Array identifier used where element value was expected.",
        action: "Use '[index]' to access an element, or pass the array where a pointer is expected."
      };
    }
    if (lowered.includes("omitted length requires")) {
      return {
        code: "MC_SUGGEST_ARRAY_LENGTH",
        message: "Array declaration omitted explicit size.",
        action: "Provide '[] = { ... }' with elements, or set an explicit length '[N]'."
      };
    }
    if (lowered.includes("division by zero") || lowered.includes("modulo by zero")) {
      return {
        code: "MC_SUGGEST_ZERO_DIVISION",
        message: "Compile-time arithmetic divides by zero.",
        action: "Change the divisor in this initializer expression."
      };
    }

    return {
      code: "MC_SUGGEST_REVIEW_SNIPPET",
      message: `Review the highlighted ${String(phase || "mini-c")} location.`,
      action: "Fix the syntax or typing around the marked token."
    };
  }

  function buildDiagnosticSnippet(line, column) {
    if (!Number.isFinite(line) || line <= 0) return null;
    const lines = Array.isArray(ACTIVE_DIAGNOSTIC_CONTEXT.lines) ? ACTIVE_DIAGNOSTIC_CONTEXT.lines : [];
    if (!lines.length) return null;
    const lineIndex = Math.max(0, Math.min(lines.length - 1, (line | 0) - 1));
    const startLineIndex = Math.max(0, lineIndex - 1);
    const endLineIndex = Math.min(lines.length - 1, lineIndex + 1);
    const width = String(endLineIndex + 1).length;
    const snippetLines = [];
    const focusText = String(lines[lineIndex] ?? "");
    const markerColumn = Number.isFinite(column) && column > 0
      ? Math.max(1, Math.min((column | 0), focusText.length + 1))
      : 1;

    for (let i = startLineIndex; i <= endLineIndex; i += 1) {
      const currentLine = String(lines[i] ?? "");
      const marker = i === lineIndex ? ">" : " ";
      snippetLines.push(`${marker}${String(i + 1).padStart(width, " ")} | ${currentLine}`);
      if (i === lineIndex) {
        snippetLines.push(` ${" ".repeat(width)} | ${" ".repeat(Math.max(0, markerColumn - 1))}^`);
      }
    }

    return {
      snippet: snippetLines.join("\n"),
      context: {
        sourceName: ACTIVE_DIAGNOSTIC_CONTEXT.sourceName,
        startLine: startLineIndex + 1,
        endLine: endLineIndex + 1,
        focusLine: lineIndex + 1,
        focusColumn: markerColumn,
        focusText
      }
    };
  }

  function typeCompatible(targetType, sourceType) {
    const target = normalizeTypeName(targetType);
    const source = normalizeTypeName(sourceType);
    if (target === source) return true;
    if (isPointerTypeName(target) && isNullTypeName(source)) return true;
    if (isPointerTypeName(target) && isPointerTypeName(source)) return target === source;
    return false;
  }

  function createDiagnostic(message, tokenOrNode = null, phase = "mini-c", details = null) {
    const normalizedMessage = String(message || "");
    const line = Number.isFinite(tokenOrNode?.line) ? tokenOrNode.line : 0;
    const column = Number.isFinite(tokenOrNode?.column) ? tokenOrNode.column : 0;
    const snippetInfo = buildDiagnosticSnippet(line, column);
    const detailObject = details && typeof details === "object" ? details : null;
    const suggestion = detailObject?.suggestion && typeof detailObject.suggestion === "object"
      ? detailObject.suggestion
      : inferDiagnosticSuggestion(normalizedMessage, phase);
    const diagnostic = {
      message: normalizedMessage,
      line,
      column,
      phase: String(phase || "mini-c"),
      suggestion
    };
    if (typeof detailObject?.code === "string" && detailObject.code.trim()) {
      diagnostic.code = detailObject.code.trim();
    }
    if (snippetInfo?.snippet) diagnostic.snippet = snippetInfo.snippet;
    if (snippetInfo?.context) diagnostic.context = snippetInfo.context;
    return diagnostic;
  }

  function tokenize(sourceText) {
    const source = String(sourceText ?? "");
    const tokens = [];
    const diagnostics = [];
    let index = 0;
    let line = 1;
    let column = 1;

    const atEnd = () => index >= source.length;
    const peek = (offset = 0) => source[index + offset] || "";
    const advance = () => {
      const ch = source[index++] || "";
      if (ch === "\n") {
        line += 1;
        column = 1;
      } else {
        column += 1;
      }
      return ch;
    };
    const match = (value) => {
      if (source.slice(index, index + value.length) !== value) return false;
      for (let i = 0; i < value.length; i += 1) advance();
      return true;
    };
    const addToken = (type, value, tokenLine, tokenColumn) => {
      tokens.push({ type, value, line: tokenLine, column: tokenColumn });
    };
    const isIdentifierStart = (ch) => /[A-Za-z_]/.test(ch);
    const isIdentifierPart = (ch) => /[A-Za-z0-9_]/.test(ch);
    const decodeEscape = (escapeChar) => {
      switch (escapeChar) {
        case "n": return "\n";
        case "r": return "\r";
        case "t": return "\t";
        case "0": return "\0";
        case "\"": return "\"";
        case "'": return "'";
        case "\\": return "\\";
        default: return escapeChar;
      }
    };

    const readEscapedCharacter = () => {
      if (atEnd()) return { ok: false, value: "" };
      const first = advance();
      if (first !== "\\") return { ok: true, value: first };
      if (atEnd()) return { ok: false, value: "" };
      return { ok: true, value: decodeEscape(advance()) };
    };

    while (!atEnd()) {
      const ch = peek();
      if (/\s/.test(ch)) {
        advance();
        continue;
      }

      const tokenLine = line;
      const tokenColumn = column;

      if (ch === "/" && peek(1) === "/") {
        while (!atEnd() && peek() !== "\n") advance();
        continue;
      }

      if (ch === "#") {
        while (!atEnd() && peek() !== "\n") advance();
        continue;
      }

      if (ch === "/" && peek(1) === "*") {
        advance();
        advance();
        let depth = 1;
        let terminated = false;
        while (!atEnd() && depth > 0) {
          if (peek() === "/" && peek(1) === "*") {
            advance();
            advance();
            depth += 1;
            continue;
          }
          if (peek() === "*" && peek(1) === "/") {
            advance();
            advance();
            depth -= 1;
            if (depth === 0) {
              terminated = true;
              break;
            }
            continue;
          }
          advance();
        }
        if (!terminated) diagnostics.push(createDiagnostic("Unterminated block comment.", { line: tokenLine, column: tokenColumn }));
        continue;
      }

      if (isIdentifierStart(ch)) {
        let value = "";
        while (!atEnd() && isIdentifierPart(peek())) value += advance();
        const type = KEYWORDS.has(value) ? "keyword" : "identifier";
        addToken(type, value, tokenLine, tokenColumn);
        continue;
      }

      if (/[0-9]/.test(ch)) {
        let value = "";
        if (ch === "0" && (peek(1) === "x" || peek(1) === "X")) {
          value += advance();
          value += advance();
          while (!atEnd() && /[0-9a-fA-F]/.test(peek())) value += advance();
        } else {
          while (!atEnd() && /[0-9]/.test(peek())) value += advance();
        }
        addToken("number", value, tokenLine, tokenColumn);
        continue;
      }

      if (ch === "'") {
        advance();
        if (atEnd() || peek() === "\n") {
          diagnostics.push(createDiagnostic("Unterminated character literal.", { line: tokenLine, column: tokenColumn }));
          continue;
        }
        const literal = readEscapedCharacter();
        if (!literal.ok) {
          diagnostics.push(createDiagnostic("Invalid character literal.", { line: tokenLine, column: tokenColumn }));
          continue;
        }
        if (!match("'")) {
          diagnostics.push(createDiagnostic("Invalid character literal (expected closing quote).", { line: tokenLine, column: tokenColumn }));
          while (!atEnd() && peek() !== "\n" && peek() !== "'") advance();
          if (peek() === "'") advance();
          continue;
        }
        const code = (literal.value && literal.value.length > 0) ? literal.value.charCodeAt(0) : 0;
        addToken("char", `${code | 0}`, tokenLine, tokenColumn);
        continue;
      }

      if (ch === "\"") {
        advance();
        let value = "";
        let terminated = false;
        while (!atEnd()) {
          if (peek() === "\"") {
            advance();
            terminated = true;
            break;
          }
          if (peek() === "\n") break;
          const literal = readEscapedCharacter();
          if (!literal.ok) break;
          value += literal.value;
        }
        if (!terminated) {
          diagnostics.push(createDiagnostic("Unterminated string literal.", { line: tokenLine, column: tokenColumn }));
          while (!atEnd() && peek() !== "\n" && peek() !== "\"") advance();
          if (peek() === "\"") advance();
          continue;
        }
        addToken("string", value, tokenLine, tokenColumn);
        continue;
      }

      let matched = false;
      for (let i = 0; i < MULTI_CHAR_PUNCT.length; i += 1) {
        const op = MULTI_CHAR_PUNCT[i];
        if (match(op)) {
          addToken("punct", op, tokenLine, tokenColumn);
          matched = true;
          break;
        }
      }
      if (matched) continue;

      if (SINGLE_CHAR_PUNCT.has(ch)) {
        advance();
        addToken("punct", ch, tokenLine, tokenColumn);
        continue;
      }

      diagnostics.push(createDiagnostic(`Unexpected character '${ch}'.`, { line: tokenLine, column: tokenColumn }));
      advance();
    }

    addToken("eof", "", line, column);
    return { tokens, diagnostics };
  }

  function createParser(tokens) {
    let position = 0;
    const diagnostics = [];
    const typedefNames = new Set();
    const structNames = new Set();

    const current = () => tokens[position] || tokens[tokens.length - 1];
    const previous = () => tokens[Math.max(0, position - 1)] || tokens[0];
    const peekToken = (offset = 0) => tokens[Math.min(tokens.length - 1, Math.max(0, position + offset))] || tokens[tokens.length - 1];
    const atEnd = () => current().type === "eof";
    const advance = () => {
      if (!atEnd()) position += 1;
      return previous();
    };
    const check = (type, value = null) => {
      const token = current();
      if (!token || token.type !== type) return false;
      if (value == null) return true;
      return token.value === value;
    };
    const match = (type, value = null) => {
      if (!check(type, value)) return false;
      advance();
      return true;
    };
    const consume = (type, value, message) => {
      if (check(type, value)) return advance();
      diagnostics.push(createDiagnostic(message, current(), "parse"));
      return null;
    };

    function synchronizeStatement() {
      while (!atEnd()) {
        if (previous().value === ";") return;
        if (check("punct", "}")) return;
        advance();
      }
    }

    function synchronizeTopLevel() {
      while (!atEnd()) {
        if (previous().value === ";" || previous().value === "}") return;
        advance();
      }
    }

    function isTypeToken(token, allowVoid = true) {
      if (!token) return false;
      if (token.type === "identifier") {
        return typedefNames.has(String(token.value || "").trim());
      }
      if (token.type === "keyword" && token.value === "struct") {
        return peekToken(1)?.type === "identifier";
      }
      if (token.type !== "keyword") return false;
      const normalized = normalizeTypeName(token.value);
      return allowVoid ? FUNCTION_RETURN_TYPES.has(normalized) : DECLARATION_TYPES.has(normalized);
    }

    function parseTypeSpecifier(options = {}) {
      const allowVoid = options.allowVoid !== false;
      const allowConst = options.allowConst !== false;
      let isConst = false;
      let constToken = null;

      if (allowConst && match("keyword", "const")) {
        isConst = true;
        constToken = previous();
      }

      let typeToken = null;
      let baseTypeName = "";
      if (check("keyword", "struct")) {
        const structToken = advance();
        const structNameToken = consume("identifier", null, "Expected struct name after 'struct'.");
        const structName = String(structNameToken?.value || "").trim();
        if (structName) structNames.add(structName);
        typeToken = structToken;
        baseTypeName = normalizeTypeName(`struct ${structName || "__error_struct"}`);
      } else if (check("identifier") && typedefNames.has(String(current().value || "").trim())) {
        typeToken = advance();
        baseTypeName = normalizeTypeName(typeToken.value);
      } else if (check("keyword") && isTypeToken(current(), allowVoid)) {
        typeToken = advance();
        baseTypeName = normalizeTypeName(typeToken.value);
      }

      if (typeToken) {
        let pointerDepth = 0;
        while (match("punct", "*")) pointerDepth += 1;
        return {
          typeName: pointerDepth > 0 ? pointerTypeName(baseTypeName, pointerDepth) : baseTypeName,
          pointerDepth,
          baseTypeName,
          isConst,
          typeToken,
          constToken
        };
      }

      diagnostics.push(createDiagnostic("Expected type specifier.", current(), "parse"));
      if (!atEnd()) advance();
      return {
        typeName: "int",
        baseTypeName: "int",
        pointerDepth: 0,
        isConst,
        typeToken: constToken || previous(),
        constToken
      };
    }

    function parseProgram() {
      const functions = [];
      const prototypes = [];
      const globals = [];
      const structs = [];
      const typedefs = [];
      while (!atEnd()) {
        if (check("eof")) break;
        const startPos = position;
        const topLevelItem = parseTopLevelItem();
        const progressed = position > startPos;
        if (progressed && topLevelItem) {
          if (topLevelItem.type === "function") functions.push(topLevelItem);
          else if (topLevelItem.type === "prototype") prototypes.push(topLevelItem);
          else if (topLevelItem.type === "declaration") globals.push(topLevelItem);
          else if (topLevelItem.type === "struct_decl") structs.push(topLevelItem);
          else if (topLevelItem.type === "typedef_decl") typedefs.push(topLevelItem);
        }
        else if (!progressed) {
          diagnostics.push(createDiagnostic("Parser stalled at top level; skipping token.", current(), "parse"));
          if (!atEnd()) advance();
        } else {
          synchronizeTopLevel();
        }
      }
      return { type: "program", functions, prototypes, globals, structs, typedefs };
    }

    function parsePrototypeFromHeader(returnType, nameToken, params) {
      return {
        type: "prototype",
        name: nameToken?.value || "__error",
        returnType,
        params,
        line: nameToken?.line || current().line,
        column: nameToken?.column || current().column
      };
    }

    function parseTopLevelItem() {
      if (check("keyword", "typedef")) return parseTypedefItem();
      if (check("keyword", "struct")) {
        const lookaheadName = peekToken(1);
        const lookaheadBody = peekToken(2);
        if (lookaheadName?.type === "identifier" && (lookaheadBody?.value === "{" || lookaheadBody?.value === ";")) {
          return parseStructItem();
        }
      }
      if (!isTypeToken(current(), true) && !check("keyword", "const")) {
        diagnostics.push(createDiagnostic("Expected top-level declaration or function definition.", current(), "parse"));
        if (!atEnd()) advance();
        return null;
      }

      const typeSpec = parseTypeSpecifier({ allowVoid: true, allowConst: true });
      const returnOrDeclType = typeSpec.typeName;
      const nameToken = consume("identifier", null, "Expected identifier after type specifier.");
      if (!nameToken) return null;

      if (match("punct", "(")) {
        const params = parseParameters();
        consume("punct", ")", "Expected ')' after function parameters.");
        if (match("punct", ";")) {
          return parsePrototypeFromHeader(returnOrDeclType, nameToken, params);
        }
        const body = parseBlock();
        return {
          type: "function",
          name: nameToken.value,
          returnType: returnOrDeclType,
          params,
          body,
          line: nameToken.line || current().line,
          column: nameToken.column || current().column
        };
      }

      return parseDeclarationFromHeader(typeSpec, nameToken, true, true);
    }

    function parseStructItem() {
      const structToken = consume("keyword", "struct", "Expected 'struct'.");
      const nameToken = consume("identifier", null, "Expected struct name.");
      const structName = String(nameToken?.value || "").trim() || "__error_struct";
      if (structName) structNames.add(structName);
      if (match("punct", ";")) {
        return {
          type: "struct_decl",
          name: structName,
          fields: [],
          forward: true,
          line: structToken?.line || current().line,
          column: structToken?.column || current().column
        };
      }
      consume("punct", "{", "Expected '{' to start struct body.");
      const fields = [];
      while (!atEnd() && !check("punct", "}")) {
        const fieldType = parseTypeSpecifier({ allowVoid: false, allowConst: true });
        const fieldNameToken = consume("identifier", null, "Expected struct field name.");
        if (!fieldNameToken) break;
        consume("punct", ";", "Expected ';' after struct field declaration.");
        fields.push({
          type: "field",
          name: String(fieldNameToken.value || "__error_field"),
          valueType: normalizeTypeName(fieldType.typeName || "int"),
          line: fieldNameToken.line || current().line,
          column: fieldNameToken.column || current().column
        });
      }
      consume("punct", "}", "Expected '}' after struct body.");
      consume("punct", ";", "Expected ';' after struct declaration.");
      return {
        type: "struct_decl",
        name: structName,
        fields,
        forward: false,
        line: structToken?.line || current().line,
        column: structToken?.column || current().column
      };
    }

    function parseTypedefItem() {
      const typedefToken = consume("keyword", "typedef", "Expected 'typedef'.");
      const aliasedType = parseTypeSpecifier({ allowVoid: false, allowConst: true });
      const aliasToken = consume("identifier", null, "Expected typedef alias name.");
      consume("punct", ";", "Expected ';' after typedef declaration.");
      const aliasName = String(aliasToken?.value || "").trim();
      if (aliasName) typedefNames.add(aliasName);
      return {
        type: "typedef_decl",
        alias: aliasName || "__error_typedef",
        valueType: normalizeTypeName(aliasedType.typeName || "int"),
        line: typedefToken?.line || current().line,
        column: typedefToken?.column || current().column
      };
    }

    function parseParameters() {
      const params = [];
      if (check("punct", ")")) return params;
      if (check("keyword", "void")) {
        advance();
        return params;
      }
      while (!atEnd() && !check("punct", ")")) {
        const paramTypeSpec = parseTypeSpecifier({ allowVoid: false, allowConst: true });
        const nameToken = consume("identifier", null, "Expected parameter name.");
        const paramName = String(nameToken?.value || "__error_param");
        const arraySpec = parseArrayLengthSpec(paramTypeSpec?.typeToken || nameToken, paramName, {
          allowOmittedLeading: true,
          allowOmittedInner: false
        });
        const declarationKind = arraySpec ? "array" : "scalar";
        let arrayShape = arraySpec ? normalizeArrayShape(arraySpec.arrayShape, [1]) : [1];
        if (arraySpec) {
          // C-style parameter decay: first dimension is pointer-like and treated as unknown.
          if (arrayShape.length) arrayShape[0] = 0;
          for (let i = 1; i < arrayShape.length; i += 1) {
            if (!Number.isFinite(arrayShape[i]) || arrayShape[i] <= 0) {
              diagnostics.push(createDiagnostic(`Array parameter '${paramName}' requires positive inner dimensions.`, nameToken || paramTypeSpec?.typeToken, "parse"));
              arrayShape[i] = 1;
            }
          }
        }
        params.push({
          type: "param",
          name: nameToken?.value || "__error_param",
          valueType: paramTypeSpec.typeName,
          isConst: paramTypeSpec.isConst === true,
          declarationKind,
          arrayShape,
          line: nameToken?.line || current().line,
          column: nameToken?.column || current().column
        });
        if (!match("punct", ",")) break;
      }
      return params;
    }

    function parseBlock() {
      const startToken = consume("punct", "{", "Expected '{' to start block.");
      const statements = [];
      while (!atEnd() && !check("punct", "}")) {
        const startPos = position;
        const stmt = parseStatement();
        if (stmt) statements.push(stmt);
        if (position <= startPos) {
          diagnostics.push(createDiagnostic("Parser stalled inside block; skipping token.", current(), "parse"));
          if (!atEnd()) advance();
        } else if (!stmt) {
          synchronizeStatement();
        }
      }
      consume("punct", "}", "Expected '}' to close block.");
      return {
        type: "block",
        statements,
        line: startToken?.line || current().line,
        column: startToken?.column || current().column
      };
    }

    function parseStatement() {
      if (match("punct", "{")) {
        position -= 1;
        return parseBlock();
      }
      if ((check("keyword") && isDeclarationTypeName(current().value))
        || (check("identifier") && typedefNames.has(String(current().value || "").trim()))
        || check("keyword", "const")) {
        const typeSpec = parseTypeSpecifier({ allowVoid: false, allowConst: true });
        return parseDeclaration(typeSpec);
      }
      if (match("keyword", "assert")) return parseAssert(previous());
      if (match("keyword", "requires")
        || match("keyword", "ensures")
        || match("keyword", "invariant")
        || match("keyword", "loop_invariant")) {
        return parseContractAssert(previous());
      }
      if (match("keyword", "return")) return parseReturn(previous());
      if (match("keyword", "if")) return parseIf(previous());
      if (match("keyword", "while")) return parseWhile(previous());
      if (match("keyword", "for")) return parseFor(previous());
      if (match("keyword", "break")) return parseBreak(previous());
      if (match("keyword", "continue")) return parseContinue(previous());
      if (match("punct", ";")) {
        return { type: "empty", line: previous().line, column: previous().column };
      }
      const expr = parseExpression();
      consume("punct", ";", "Expected ';' after expression.");
      return { type: "expr_stmt", expression: expr, line: expr?.line || current().line, column: expr?.column || current().column };
    }

    function parseAssert(keywordToken) {
      consume("punct", "(", "Expected '(' after 'assert'.");
      const expression = parseExpression();
      consume("punct", ")", "Expected ')' after assert expression.");
      consume("punct", ";", "Expected ';' after assert statement.");
      return {
        type: "assert",
        expression,
        line: keywordToken?.line || current().line,
        column: keywordToken?.column || current().column
      };
    }

    function parseContractAssert(keywordToken) {
      consume("punct", "(", `Expected '(' after '${keywordToken?.value || "contract"}'.`);
      const expression = parseExpression();
      consume("punct", ")", "Expected ')' after contract expression.");
      consume("punct", ";", "Expected ';' after contract statement.");
      return {
        type: "assert",
        contractKind: String(keywordToken?.value || "assert"),
        expression,
        line: keywordToken?.line || current().line,
        column: keywordToken?.column || current().column
      };
    }

    function parseArrayLengthSpec(typeToken, ownerName, options = {}) {
      if (!match("punct", "[")) return null;
      const allowOmittedLeading = options.allowOmittedLeading !== false;
      const allowOmittedInner = options.allowOmittedInner === true;
      const arrayShape = [];
      let dimensionIndex = 0;

      while (true) {
        let lengthValue = 1;
        if (check("punct", "]")) {
          consume("punct", "]", "Expected ']' after array length.");
          const allowOmittedCurrent = dimensionIndex === 0 ? allowOmittedLeading : allowOmittedInner;
          if (!allowOmittedCurrent) {
            diagnostics.push(createDiagnostic(`Array '${ownerName || "value"}' requires explicit length for dimension ${dimensionIndex + 1}.`, typeToken, "parse"));
          }
          lengthValue = 0;
        } else {
          const lengthToken = consume("number", null, "Expected constant array length inside '[...]'.");
          if (lengthToken && typeof lengthToken.value === "string") {
            const raw = lengthToken.value.toLowerCase();
            const parsed = raw.startsWith("0x")
              ? Number.parseInt(raw.slice(2), 16)
              : Number.parseInt(raw, 10);
            if (!Number.isFinite(parsed) || parsed <= 0) {
              diagnostics.push(createDiagnostic(`Array '${ownerName || "value"}' must have a positive length in dimension ${dimensionIndex + 1}.`, lengthToken, "parse"));
            } else {
              lengthValue = parsed | 0;
            }
          }
          consume("punct", "]", "Expected ']' after array length.");
        }

        arrayShape.push(lengthValue);
        dimensionIndex += 1;
        if (!match("punct", "[")) break;
      }

      return {
        arrayShape,
        line: typeToken?.line || current().line,
        column: typeToken?.column || current().column
      };
    }

    function parseArrayInitializer(typeToken) {
      const opener = consume("punct", "{", "Expected '{' to start array initializer.");
      const elements = [];
      while (!atEnd() && !check("punct", "}")) {
        if (check("punct", "{")) elements.push(parseArrayInitializer(typeToken));
        else elements.push(parseExpression());
        if (!match("punct", ",")) break;
      }
      consume("punct", "}", "Expected '}' to close array initializer.");
      return {
        type: "array_initializer",
        elements,
        line: opener?.line || typeToken?.line || current().line,
        column: opener?.column || typeToken?.column || current().column
      };
    }

    function parseDeclarationFromHeader(typeSpec, nameToken, requireSemicolon = true, isGlobal = false) {
      const name = nameToken?.value || (isGlobal ? "__error_global" : "__error_local");
      const declaredType = normalizeTypeName(typeSpec?.typeName || "int");
      const typeToken = typeSpec?.typeToken || current();
      const arraySpec = parseArrayLengthSpec(typeToken, name, {
        allowOmittedLeading: true,
        allowOmittedInner: false
      });
      let initializer = null;
      if (match("punct", "=")) {
        if (arraySpec && check("punct", "{")) initializer = parseArrayInitializer(typeToken);
        else initializer = parseExpression();
      }
      let arrayShape = arraySpec ? normalizeArrayShape(arraySpec.arrayShape, [1]) : [1];
      if (arraySpec) {
        if (arrayShape.some((dim, index) => index > 0 && (!Number.isFinite(dim) || dim <= 0))) {
          diagnostics.push(createDiagnostic(`Array '${name}' requires positive lengths for inner dimensions.`, nameToken || typeToken, "parse"));
          arrayShape = arrayShape.map((dim, index) => {
            if (index === 0) return dim;
            return Number.isFinite(dim) && dim > 0 ? (dim | 0) : 1;
          });
        }
        if (!Number.isFinite(arrayShape[0]) || arrayShape[0] <= 0) {
          if (initializer?.type === "array_initializer") {
            const flatCount = flattenArrayInitializerElements(initializer, []).length;
            const innerStride = arrayShapeProduct(arrayShape, 1) || 1;
            const inferredLeading = flatCount > 0 ? Math.ceil(flatCount / innerStride) : 0;
            if (inferredLeading <= 0) {
              diagnostics.push(createDiagnostic(`Array '${name}' with omitted leading dimension requires initializer elements.`, initializer, "parse"));
              arrayShape[0] = 1;
            } else {
              arrayShape[0] = inferredLeading | 0;
            }
          } else {
            diagnostics.push(createDiagnostic(`Array '${name}' with omitted leading dimension requires a brace initializer list.`, nameToken || typeToken, "parse"));
            arrayShape[0] = 1;
          }
        }
      }
      if (requireSemicolon) consume("punct", ";", "Expected ';' after variable declaration.");
      return {
        type: "declaration",
        storage: isGlobal ? "global" : "local",
        valueType: declaredType,
        isConst: typeSpec?.isConst === true,
        declarationKind: arraySpec ? "array" : "scalar",
        arrayShape,
        arrayLength: arrayShape[0] || 1,
        name,
        initializer,
        line: typeToken?.line || current().line,
        column: typeToken?.column || current().column
      };
    }

    function parseDeclarationFromKeyword(typeSpec, requireSemicolon = true) {
      const nameToken = consume("identifier", null, "Expected variable name after type specifier.");
      return parseDeclarationFromHeader(typeSpec, nameToken, requireSemicolon, false);
    }

    function parseDeclaration(typeSpec) {
      return parseDeclarationFromKeyword(typeSpec, true);
    }

    function parseReturn(keywordToken) {
      let expression = null;
      if (!check("punct", ";")) expression = parseExpression();
      consume("punct", ";", "Expected ';' after return statement.");
      return {
        type: "return",
        expression,
        line: keywordToken?.line || current().line,
        column: keywordToken?.column || current().column
      };
    }

    function parseIf(keywordToken) {
      consume("punct", "(", "Expected '(' after 'if'.");
      const condition = parseExpression();
      consume("punct", ")", "Expected ')' after if condition.");
      const thenBranch = parseStatement();
      const elseBranch = match("keyword", "else") ? parseStatement() : null;
      return {
        type: "if",
        condition,
        thenBranch,
        elseBranch,
        line: keywordToken?.line || current().line,
        column: keywordToken?.column || current().column
      };
    }

    function parseWhile(keywordToken) {
      consume("punct", "(", "Expected '(' after 'while'.");
      const condition = parseExpression();
      consume("punct", ")", "Expected ')' after while condition.");
      const body = parseStatement();
      return {
        type: "while",
        condition,
        body,
        line: keywordToken?.line || current().line,
        column: keywordToken?.column || current().column
      };
    }

    function parseForInitDeclaration(typeSpec) {
      return parseDeclarationFromKeyword(typeSpec, false);
    }

    function parseFor(keywordToken) {
      consume("punct", "(", "Expected '(' after 'for'.");
      let init = null;
      if (!check("punct", ";")) {
        if ((check("keyword") && isDeclarationTypeName(current().value))
          || check("keyword", "const")) {
          const typeSpec = parseTypeSpecifier({ allowVoid: false, allowConst: true });
          init = parseForInitDeclaration(typeSpec);
        } else {
          init = parseExpression();
        }
      }
      consume("punct", ";", "Expected ';' after for-init clause.");

      let condition = null;
      if (!check("punct", ";")) condition = parseExpression();
      consume("punct", ";", "Expected ';' after for-condition clause.");

      let update = null;
      if (!check("punct", ")")) update = parseExpression();
      consume("punct", ")", "Expected ')' after for-update clause.");

      const body = parseStatement();
      return {
        type: "for",
        init,
        condition,
        update,
        body,
        line: keywordToken?.line || current().line,
        column: keywordToken?.column || current().column
      };
    }

    function parseBreak(keywordToken) {
      consume("punct", ";", "Expected ';' after 'break'.");
      return {
        type: "break",
        line: keywordToken?.line || current().line,
        column: keywordToken?.column || current().column
      };
    }

    function parseContinue(keywordToken) {
      consume("punct", ";", "Expected ';' after 'continue'.");
      return {
        type: "continue",
        line: keywordToken?.line || current().line,
        column: keywordToken?.column || current().column
      };
    }

    function parseExpression() {
      return parseAssignment();
    }

    function parseAssignment() {
      const expr = parseConditional();
      if (!check("punct") || !ASSIGNMENT_OPERATORS.has(String(current().value || ""))) return expr;
      const operatorToken = advance();
      const valueExpr = parseAssignment();
      return {
        type: "assign",
        operator: operatorToken.value || "=",
        target: expr,
        value: valueExpr,
        line: operatorToken.line || expr?.line || current().line,
        column: operatorToken.column || expr?.column || current().column
      };
    }

    function parseConditional() {
      const condition = parseLogicalOr();
      if (!match("punct", "?")) return condition;
      const questionToken = previous();
      const whenTrue = parseExpression();
      consume("punct", ":", "Expected ':' in conditional expression.");
      const whenFalse = parseConditional();
      return {
        type: "ternary",
        condition,
        whenTrue,
        whenFalse,
        line: questionToken.line || condition?.line || current().line,
        column: questionToken.column || condition?.column || current().column
      };
    }

    function parseLogicalOr() {
      let expr = parseLogicalAnd();
      while (match("punct", "||")) {
        const operator = previous();
        const right = parseLogicalAnd();
        expr = { type: "binary", operator: "||", left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseLogicalAnd() {
      let expr = parseBitwiseOr();
      while (match("punct", "&&")) {
        const operator = previous();
        const right = parseBitwiseOr();
        expr = { type: "binary", operator: "&&", left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseBitwiseOr() {
      let expr = parseBitwiseXor();
      while (match("punct", "|")) {
        const operator = previous();
        const right = parseBitwiseXor();
        expr = { type: "binary", operator: "|", left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseBitwiseXor() {
      let expr = parseBitwiseAnd();
      while (match("punct", "^")) {
        const operator = previous();
        const right = parseBitwiseAnd();
        expr = { type: "binary", operator: "^", left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseBitwiseAnd() {
      let expr = parseEquality();
      while (match("punct", "&")) {
        const operator = previous();
        const right = parseEquality();
        expr = { type: "binary", operator: "&", left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseEquality() {
      let expr = parseRelational();
      while (match("punct", "==") || match("punct", "!=")) {
        const operator = previous();
        const right = parseRelational();
        expr = { type: "binary", operator: operator.value, left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseRelational() {
      let expr = parseShift();
      while (
        match("punct", "<")
        || match("punct", "<=")
        || match("punct", ">")
        || match("punct", ">=")
      ) {
        const operator = previous();
        const right = parseShift();
        expr = { type: "binary", operator: operator.value, left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseShift() {
      let expr = parseAdditive();
      while (match("punct", "<<") || match("punct", ">>")) {
        const operator = previous();
        const right = parseAdditive();
        expr = { type: "binary", operator: operator.value, left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseAdditive() {
      let expr = parseMultiplicative();
      while (match("punct", "+") || match("punct", "-")) {
        const operator = previous();
        const right = parseMultiplicative();
        expr = { type: "binary", operator: operator.value, left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function parseMultiplicative() {
      let expr = parseUnary();
      while (match("punct", "*") || match("punct", "/") || match("punct", "%")) {
        const operator = previous();
        const right = parseUnary();
        expr = { type: "binary", operator: operator.value, left: expr, right, line: operator.line, column: operator.column };
      }
      return expr;
    }

    function looksLikeCastExpression() {
      if (!check("punct", "(")) return false;
      let offset = 1;
      let token = peekToken(offset);
      if (!token) return false;

      if (token.type === "keyword" && token.value === "const") {
        offset += 1;
        token = peekToken(offset);
        if (!token) return false;
      }

      if (token.type === "keyword" && token.value === "struct") {
        const structNameToken = peekToken(offset + 1);
        if (!structNameToken || structNameToken.type !== "identifier") return false;
        offset += 2;
      } else if (token.type === "identifier" && typedefNames.has(String(token.value || "").trim())) {
        offset += 1;
      } else if (isTypeToken(token, false)) {
        offset += 1;
      } else {
        return false;
      }

      while (true) {
        const pointerToken = peekToken(offset);
        if (!pointerToken || pointerToken.type !== "punct" || pointerToken.value !== "*") break;
        offset += 1;
      }

      const closingToken = peekToken(offset);
      return Boolean(closingToken && closingToken.type === "punct" && closingToken.value === ")");
    }

    function parseUnary() {
      if (match("punct", "++") || match("punct", "--")) {
        const operator = previous();
        const target = parseUnary();
        return {
          type: "update",
          operator: operator.value,
          target,
          isPostfix: false,
          line: operator.line,
          column: operator.column
        };
      }
      if (looksLikeCastExpression()) {
        const openToken = consume("punct", "(", "Expected '(' before cast type.");
        const typeSpec = parseTypeSpecifier({ allowVoid: false, allowConst: true });
        consume("punct", ")", "Expected ')' after cast type.");
        const expression = parseUnary();
        return {
          type: "cast",
          targetType: normalizeTypeName(typeSpec?.typeName || "int"),
          expression,
          line: openToken?.line || current().line,
          column: openToken?.column || current().column
        };
      }
      if (match("punct", "!") || match("punct", "-") || match("punct", "+") || match("punct", "~") || match("punct", "*")) {
        const operator = previous();
        const argument = parseUnary();
        return { type: "unary", operator: operator.value, argument, line: operator.line, column: operator.column };
      }
      return parsePrimary();
    }

    function parsePrimary() {
      if (match("keyword", "true")) {
        const token = previous();
        return { type: "literal", value: 1, literalType: "bool", line: token.line, column: token.column };
      }
      if (match("keyword", "false")) {
        const token = previous();
        return { type: "literal", value: 0, literalType: "bool", line: token.line, column: token.column };
      }
      if (match("keyword", "NULL")) {
        const token = previous();
        return { type: "null_literal", value: 0, literalType: "null", line: token.line, column: token.column };
      }
      if (match("keyword", "alloc")) {
        const keyword = previous();
        consume("punct", "(", "Expected '(' after alloc.");
        const typeSpec = parseTypeSpecifier({ allowVoid: false, allowConst: false });
        consume("punct", ")", "Expected ')' after alloc type.");
        return {
          type: "alloc",
          allocType: normalizeTypeName(typeSpec.typeName || "int"),
          line: keyword.line || current().line,
          column: keyword.column || current().column
        };
      }
      if (match("keyword", "alloc_array")) {
        const keyword = previous();
        consume("punct", "(", "Expected '(' after alloc_array.");
        const typeSpec = parseTypeSpecifier({ allowVoid: false, allowConst: false });
        consume("punct", ",", "Expected ',' after alloc_array element type.");
        const lengthExpr = parseExpression();
        consume("punct", ")", "Expected ')' after alloc_array arguments.");
        return {
          type: "alloc_array",
          allocType: normalizeTypeName(typeSpec.typeName || "int"),
          length: lengthExpr,
          line: keyword.line || current().line,
          column: keyword.column || current().column
        };
      }
      if (match("number")) {
        const token = previous();
        const rawValue = String(token.value || "");
        const literalValue = rawValue.toLowerCase().startsWith("0x")
          ? Number.parseInt(rawValue.slice(2), 16)
          : Number.parseInt(rawValue, 10);
        if (Number.isFinite(literalValue)) {
          const maxC0Literal = 0x80000000;
          if (literalValue < 0 || literalValue > maxC0Literal) {
            diagnostics.push(createDiagnostic(
              "Integer literal out of C0 range (expected 0..2^31).",
              token,
              "parse"
            ));
          }
        }
        return {
          type: "literal",
          value: Number.isFinite(literalValue) ? literalValue : 0,
          literalType: "int",
          line: token.line,
          column: token.column
        };
      }
      if (match("char")) {
        const token = previous();
        const literalValue = Number.parseInt(token.value, 10);
        return {
          type: "literal",
          value: Number.isFinite(literalValue) ? (literalValue | 0) : 0,
          literalType: "char",
          line: token.line,
          column: token.column
        };
      }
      if (match("string")) {
        const token = previous();
        return { type: "string_literal", value: String(token.value || ""), line: token.line, column: token.column };
      }
      if (match("identifier")) {
        const nameToken = previous();
        let expr = { type: "identifier", name: nameToken.value, line: nameToken.line, column: nameToken.column };
        while (!atEnd()) {
          if (match("punct", "(")) {
            const args = [];
            if (!check("punct", ")")) {
              while (!atEnd()) {
                args.push(parseExpression());
                if (!match("punct", ",")) break;
              }
            }
            consume("punct", ")", "Expected ')' after function arguments.");
            if (expr.type !== "identifier") {
              diagnostics.push(createDiagnostic("Function call target must be an identifier.", expr, "parse"));
              expr = {
                type: "call",
                callee: "__invalid_call",
                args,
                line: expr?.line || nameToken.line,
                column: expr?.column || nameToken.column
              };
            } else {
              expr = {
                type: "call",
                callee: expr.name,
                args,
                line: expr.line,
                column: expr.column
              };
            }
            continue;
          }
          if (match("punct", "[")) {
            const indexExpr = parseExpression();
            consume("punct", "]", "Expected ']' after index expression.");
            expr = {
              type: "index",
              target: expr,
              index: indexExpr,
              line: nameToken.line,
              column: nameToken.column
            };
            continue;
          }
          if (match("punct", ".") || match("punct", "->")) {
            const operator = previous();
            const fieldToken = consume("identifier", null, "Expected field name after member operator.");
            expr = {
              type: "member",
              target: expr,
              field: String(fieldToken?.value || "__error_field"),
              viaPointer: operator.value === "->",
              line: operator.line || expr?.line || current().line,
              column: operator.column || expr?.column || current().column
            };
            continue;
          }
          if (match("punct", "++") || match("punct", "--")) {
            const operator = previous();
            expr = {
              type: "update",
              operator: operator.value,
              target: expr,
              isPostfix: true,
              line: operator.line,
              column: operator.column
            };
            continue;
          }
          break;
        }
        return expr;
      }
      if (match("punct", "(")) {
        const expr = parseExpression();
        consume("punct", ")", "Expected ')' after grouped expression.");
        let groupedExpr = expr;
        while (true) {
          if (match("punct", ".") || match("punct", "->")) {
            const operator = previous();
            const fieldToken = consume("identifier", null, "Expected field name after member operator.");
            groupedExpr = {
              type: "member",
              target: groupedExpr,
              field: String(fieldToken?.value || "__error_field"),
              viaPointer: operator.value === "->",
              line: operator.line || groupedExpr?.line || current().line,
              column: operator.column || groupedExpr?.column || current().column
            };
            continue;
          }
          break;
        }
        while (match("punct", "++") || match("punct", "--")) {
          const operator = previous();
          groupedExpr = {
            type: "update",
            operator: operator.value,
            target: groupedExpr,
            isPostfix: true,
            line: operator.line,
            column: operator.column
          };
        }
        return groupedExpr;
      }
      const token = current();
      diagnostics.push(createDiagnostic("Expected expression.", token, "parse"));
      if (!atEnd()) advance();
      return { type: "literal", value: 0, line: token.line, column: token.column };
    }

    return {
      parseProgram,
      diagnostics
    };
  }

  function estimateExprTemps(node) {
    if (!node || typeof node !== "object") return 0;
    switch (node.type) {
      case "literal":
      case "string_literal":
      case "null_literal":
      case "identifier":
        return 0;
      case "alloc":
        return 1;
      case "alloc_array":
        return estimateExprTemps(node.length);
      case "unary":
        return estimateExprTemps(node.argument);
      case "cast":
        return estimateExprTemps(node.expression);
      case "member":
        return estimateExprTemps(node.target);
      case "array_initializer": {
        const elements = Array.isArray(node.elements) ? node.elements : [];
        return elements.reduce((peak, element, index) => Math.max(peak, index + estimateExprTemps(element)), 0);
      }
      case "assign":
        if (node.target?.type === "index") {
          return Math.max(
            estimateExprTemps(node.value),
            1 + estimateExprTemps(node.target.index),
            estimateExprTemps(node.target.target)
          );
        }
        return estimateExprTemps(node.value);
      case "update":
        if (node.target?.type === "index") {
          return Math.max(
            estimateExprTemps(node.target.target),
            1 + estimateExprTemps(node.target.index)
          );
        }
        return estimateExprTemps(node.target);
      case "index":
        return Math.max(
          estimateExprTemps(node.target),
          1 + estimateExprTemps(node.index)
        );
      case "call": {
        let peak = 0;
        const args = Array.isArray(node.args) ? node.args : [];
        for (let i = 0; i < args.length; i += 1) {
          peak = Math.max(peak, i + estimateExprTemps(args[i]));
        }
        return Math.max(peak, args.length);
      }
      case "binary": {
        if (node.operator === "&&" || node.operator === "||") {
          return Math.max(estimateExprTemps(node.left), estimateExprTemps(node.right));
        }
        return Math.max(estimateExprTemps(node.left), 1 + estimateExprTemps(node.right));
      }
      case "ternary":
        return Math.max(
          estimateExprTemps(node.condition),
          estimateExprTemps(node.whenTrue),
          estimateExprTemps(node.whenFalse)
        );
      default:
        return 0;
    }
  }

  function estimateStmtTemps(node) {
    if (!node || typeof node !== "object") return 0;
    switch (node.type) {
      case "block":
        return (node.statements || []).reduce((peak, stmt) => Math.max(peak, estimateStmtTemps(stmt)), 0);
      case "declaration":
        return node.initializer ? estimateExprTemps(node.initializer) : 0;
      case "return":
        return node.expression ? estimateExprTemps(node.expression) : 0;
      case "if":
        return Math.max(
          estimateExprTemps(node.condition),
          estimateStmtTemps(node.thenBranch),
          estimateStmtTemps(node.elseBranch)
        );
      case "while":
        return Math.max(estimateExprTemps(node.condition), estimateStmtTemps(node.body));
      case "for":
        return Math.max(
          node.init && node.init.type === "declaration"
            ? estimateStmtTemps(node.init)
            : estimateExprTemps(node.init),
          estimateExprTemps(node.condition),
          estimateExprTemps(node.update),
          estimateStmtTemps(node.body)
        );
      case "expr_stmt":
        return estimateExprTemps(node.expression);
      case "assert":
        return estimateExprTemps(node.expression);
      default:
        return 0;
    }
  }

  function analyzeProgram(programAst, options = {}) {
    const diagnostics = [];
    const functions = Array.isArray(programAst?.functions) ? programAst.functions : [];
    const prototypes = Array.isArray(programAst?.prototypes) ? programAst.prototypes : [];
    const globals = Array.isArray(programAst?.globals) ? programAst.globals : [];
    const structDecls = Array.isArray(programAst?.structs) ? programAst.structs : [];
    const typedefDecls = Array.isArray(programAst?.typedefs) ? programAst.typedefs : [];
    const activeSubset = normalizeSubsetName(options.subset || "C0-S4");
    const activeSubsetLevel = subsetLevel(activeSubset);
    const signatureTable = new Map();
    const globalTable = new Map();
    const structTable = new Map();
    const typedefTable = new Map();

    const resolveAliasType = (typeName, depth = 0) => {
      const normalized = normalizeTypeName(typeName);
      if (depth > 32) return normalized;
      const pointerMatch = normalized.match(/^(.*?)(\*+)$/);
      if (pointerMatch) {
        const base = resolveAliasType(pointerMatch[1], depth + 1);
        return `${base}${pointerMatch[2]}`;
      }
      if (typedefTable.has(normalized)) {
        return resolveAliasType(typedefTable.get(normalized), depth + 1);
      }
      return normalized;
    };

    const typeWordSize = (typeName) => {
      const resolved = resolveAliasType(typeName);
      if (isStructTypeName(resolved)) {
        const structName = resolved.replace(/^struct\s+/, "");
        const structInfo = structTable.get(structName);
        if (structInfo && Number.isFinite(structInfo.wordSize) && structInfo.wordSize > 0) {
          return structInfo.wordSize | 0;
        }
      }
      return 1;
    };

    const structFieldInfo = (typeName, fieldName) => {
      const resolved = resolveAliasType(typeName);
      if (!isStructTypeName(resolved)) return null;
      const structName = resolved.replace(/^struct\s+/, "");
      const structInfo = structTable.get(structName);
      if (!structInfo) return null;
      const field = structInfo.fields.get(String(fieldName || ""));
      if (!field) return null;
      return field;
    };

    const signatureFromNode = (node, intrinsic = false) => ({
      name: String(node?.name || ""),
      params: Array.isArray(node?.params) ? node.params.length : 0,
      paramTypes: Array.isArray(node?.params) ? node.params.map((param) => resolveAliasType(param?.valueType || "int")) : [],
      paramKinds: Array.isArray(node?.params)
        ? node.params.map((param) => normalizeParamKind(param?.declarationKind === "array" ? "array" : "scalar"))
        : [],
      paramArrayShapes: Array.isArray(node?.params)
        ? node.params.map((param) => (param?.declarationKind === "array"
          ? normalizeArrayShape(param?.arrayShape, [0])
          : []))
        : [],
      returnType: resolveAliasType(node?.returnType || "int"),
      intrinsic: intrinsic === true,
      defined: intrinsic === true,
      minSubset: intrinsic === true ? normalizeSubsetName(node?.minSubset || "C0-S0") : "C0-S0"
    });

    const signaturesCompatible = (left, right) => {
      if (!left || !right) return false;
      if (normalizeTypeName(left.returnType) !== normalizeTypeName(right.returnType)) return false;
      const leftTypes = Array.isArray(left.paramTypes) ? left.paramTypes : [];
      const rightTypes = Array.isArray(right.paramTypes) ? right.paramTypes : [];
      if (leftTypes.length !== rightTypes.length) return false;
      const leftKinds = Array.isArray(left.paramKinds) ? left.paramKinds : [];
      const rightKinds = Array.isArray(right.paramKinds) ? right.paramKinds : [];
      const leftShapes = Array.isArray(left.paramArrayShapes) ? left.paramArrayShapes : [];
      const rightShapes = Array.isArray(right.paramArrayShapes) ? right.paramArrayShapes : [];
      for (let i = 0; i < leftTypes.length; i += 1) {
        const leftType = normalizeTypeName(leftTypes[i]);
        const rightType = normalizeTypeName(rightTypes[i]);
        if (leftType !== rightType) return false;
        const leftKind = normalizeParamKind(leftKinds[i]);
        const rightKind = normalizeParamKind(rightKinds[i]);
        if (leftKind !== rightKind) return false;
        if (leftKind === "array" && !arrayParameterShapesCompatible(leftShapes[i], rightShapes[i])) return false;
      }
      return true;
    };

    typedefDecls.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const alias = normalizeTypeName(entry.alias || "");
      const valueType = normalizeTypeName(entry.valueType || "int");
      if (!alias || alias === "__error_typedef") return;
      if (FUNCTION_RETURN_TYPES.has(alias) || alias === "struct") {
        diagnostics.push(createDiagnostic(`Invalid typedef alias '${alias}'.`, entry, "semantic"));
        return;
      }
      if (typedefTable.has(alias)) {
        diagnostics.push(createDiagnostic(`Duplicate typedef alias '${alias}'.`, entry, "semantic"));
        return;
      }
      typedefTable.set(alias, valueType);
    });

    structDecls.forEach((entry) => {
      if (!entry || typeof entry !== "object") return;
      const rawStructName = String(entry.name || "").trim();
      const structName = normalizeTypeName(rawStructName || "");
      if (!structName || structName === "__error_struct") return;
      const existing = structTable.get(structName);
      if (entry.forward === true) {
        if (!existing) {
          structTable.set(structName, { name: structName, forward: true, wordSize: 1, fields: new Map() });
        }
        return;
      }
      if (existing && existing.forward !== true) {
        diagnostics.push(createDiagnostic(`Duplicate struct definition '${structName}'.`, entry, "semantic"));
        return;
      }
      const fields = new Map();
      let nextOffsetWords = 0;
      (entry.fields || []).forEach((field) => {
        const fieldName = String(field?.name || "").trim();
        if (!fieldName) return;
        if (fields.has(fieldName)) {
          diagnostics.push(createDiagnostic(`Duplicate field '${fieldName}' in struct '${structName}'.`, field, "semantic"));
          return;
        }
        const fieldType = resolveAliasType(field?.valueType || "int");
        const fieldWords = Math.max(1, typeWordSize(fieldType));
        fields.set(fieldName, {
          name: fieldName,
          typeName: fieldType,
          offsetWords: nextOffsetWords,
          wordSize: fieldWords
        });
        nextOffsetWords += fieldWords;
      });
      structTable.set(structName, {
        name: structName,
        forward: false,
        wordSize: Math.max(1, nextOffsetWords | 0),
        fields
      });
    });

    Object.values(INTRINSICS).forEach((intrinsic) => {
      const intrinsicParamKinds = Array.isArray(intrinsic.paramKinds)
        ? intrinsic.paramKinds.map((kind) => normalizeParamKind(kind))
        : Array.from({ length: Number(intrinsic.params || 0) }, () => "scalar");
      signatureTable.set(intrinsic.name, {
        ...intrinsic,
        paramKinds: intrinsicParamKinds,
        intrinsic: true,
        defined: true
      });
    });

    prototypes.forEach((prototype) => {
      if (!prototype || typeof prototype !== "object") return;
      if (!prototype.name || prototype.name === "__error") return;
      const nextSignature = signatureFromNode(prototype, false);
      const existing = signatureTable.get(nextSignature.name);
      if (existing?.intrinsic) {
        diagnostics.push(createDiagnostic(`Function name '${nextSignature.name}' conflicts with intrinsic function.`, prototype, "semantic"));
        return;
      }
      if (existing && !signaturesCompatible(existing, nextSignature)) {
        diagnostics.push(createDiagnostic(`Prototype for '${nextSignature.name}' does not match previous declaration.`, prototype, "semantic"));
        return;
      }
      if (!existing) signatureTable.set(nextSignature.name, nextSignature);
    });

    functions.forEach((fn) => {
      if (!fn || typeof fn !== "object") return;
      if (!fn.name || fn.name === "__error") return;
      const nextSignature = signatureFromNode(fn, false);
      const existing = signatureTable.get(nextSignature.name);
      if (existing?.intrinsic) {
        diagnostics.push(createDiagnostic(`Function name '${nextSignature.name}' conflicts with intrinsic function.`, fn, "semantic"));
        return;
      }
      if (existing && existing.defined === true) {
        diagnostics.push(createDiagnostic(`Duplicate function '${nextSignature.name}'.`, fn, "semantic"));
        return;
      }
      if (existing && !signaturesCompatible(existing, nextSignature)) {
        diagnostics.push(createDiagnostic(`Definition of '${nextSignature.name}' does not match prototype.`, fn, "semantic"));
        return;
      }
      signatureTable.set(nextSignature.name, {
        ...nextSignature,
        defined: true
      });
    });

    if (!signatureTable.has("main") || signatureTable.get("main")?.intrinsic || signatureTable.get("main")?.defined !== true) {
      diagnostics.push(createDiagnostic("Missing required function 'main'.", functions[0] || null, "semantic"));
    } else {
      const mainSignature = signatureTable.get("main");
      const mainNode = functions.find((entry) => entry?.name === "main") || null;
      if (normalizeTypeName(mainSignature?.returnType || "int") !== "int"
        || Number(mainSignature?.params || 0) !== 0) {
        diagnostics.push(createDiagnostic(
          "Function 'main' must match signature 'int main(void)'.",
          mainNode || functions[0] || null,
          "semantic"
        ));
      }
    }

    const globalConstTable = new Map();

    function evaluateStaticExpression(expr, ownerNode) {
      if (!expr || typeof expr !== "object") {
        diagnostics.push(createDiagnostic("Global initializers must be compile-time literal expressions.", ownerNode || expr, "semantic"));
        return { ok: false, kind: "int", typeName: "int", value: 0 };
      }

      if (expr.type === "literal") {
        const typeName = normalizeTypeName(expr.literalType || "int");
        const value = Number(expr.value) | 0;
        return { ok: true, kind: "int", typeName, value };
      }

      if (expr.type === "null_literal") {
        return { ok: true, kind: "int", typeName: "null", value: 0 };
      }

      if (expr.type === "string_literal") {
        return { ok: true, kind: "string", typeName: "string", value: String(expr.value || "") };
      }

      if (expr.type === "identifier") {
        const constantInfo = globalConstTable.get(expr.name);
        if (!constantInfo) {
          diagnostics.push(createDiagnostic(
            `Global initializer '${ownerNode?.name || "value"}' can only reference previous 'const' globals.`,
            expr,
            "semantic"
          ));
          return { ok: false, kind: "int", typeName: "int", value: 0 };
        }
        return { ...constantInfo, ok: true };
      }

      if (expr.type === "cast") {
        const inner = evaluateStaticExpression(expr.expression, ownerNode);
        if (!inner.ok) return inner;
        const targetType = resolveAliasType(expr.targetType || "int");
        if (targetType === "string") {
          if (inner.kind !== "string") {
            diagnostics.push(createDiagnostic("Only string expressions can be cast to string.", expr, "semantic"));
            return { ok: false, kind: "int", typeName: "int", value: 0 };
          }
          return { ok: true, kind: "string", typeName: "string", value: String(inner.value || "") };
        }
        if (inner.kind !== "int") {
          diagnostics.push(createDiagnostic(`Cannot cast string expression to '${targetType}'.`, expr, "semantic"));
          return { ok: false, kind: "int", typeName: "int", value: 0 };
        }
        let casted = inner.value | 0;
        if (targetType === "bool") casted = casted === 0 ? 0 : 1;
        else if (targetType === "char") casted &= 0xff;
        return { ok: true, kind: "int", typeName: targetType, value: casted | 0 };
      }

      if (expr.type === "unary") {
        const inner = evaluateStaticExpression(expr.argument, ownerNode);
        if (!inner.ok) return inner;
        if (inner.kind !== "int") {
          diagnostics.push(createDiagnostic(`Unary '${expr.operator}' is not valid for string constant expression.`, expr, "semantic"));
          return { ok: false, kind: "int", typeName: "int", value: 0 };
        }
        switch (expr.operator) {
          case "+":
            return { ok: true, kind: "int", typeName: "int", value: inner.value | 0 };
          case "-":
            return { ok: true, kind: "int", typeName: "int", value: (-(inner.value | 0)) | 0 };
          case "~":
            return { ok: true, kind: "int", typeName: "int", value: (~(inner.value | 0)) | 0 };
          case "!":
            return { ok: true, kind: "int", typeName: "bool", value: (inner.value | 0) === 0 ? 1 : 0 };
          default:
            diagnostics.push(createDiagnostic(`Unsupported unary operator '${expr.operator}' in global initializer.`, expr, "semantic"));
            return { ok: false, kind: "int", typeName: "int", value: 0 };
        }
      }

      if (expr.type === "binary") {
        const left = evaluateStaticExpression(expr.left, ownerNode);
        const right = evaluateStaticExpression(expr.right, ownerNode);
        if (!left.ok || !right.ok) return { ok: false, kind: "int", typeName: "int", value: 0 };
        if (left.kind !== "int" || right.kind !== "int") {
          diagnostics.push(createDiagnostic("Global initializer binary expression requires integer operands.", expr, "semantic"));
          return { ok: false, kind: "int", typeName: "int", value: 0 };
        }
        const lv = left.value | 0;
        const rv = right.value | 0;
        switch (expr.operator) {
          case "+": return { ok: true, kind: "int", typeName: "int", value: (lv + rv) | 0 };
          case "-": return { ok: true, kind: "int", typeName: "int", value: (lv - rv) | 0 };
          case "*": return { ok: true, kind: "int", typeName: "int", value: Math.imul(lv, rv) | 0 };
          case "/":
            if (rv === 0) {
              diagnostics.push(createDiagnostic("Division by zero in global initializer.", expr, "semantic"));
              return { ok: false, kind: "int", typeName: "int", value: 0 };
            }
            return { ok: true, kind: "int", typeName: "int", value: (lv / rv) | 0 };
          case "%":
            if (rv === 0) {
              diagnostics.push(createDiagnostic("Modulo by zero in global initializer.", expr, "semantic"));
              return { ok: false, kind: "int", typeName: "int", value: 0 };
            }
            return { ok: true, kind: "int", typeName: "int", value: (lv % rv) | 0 };
          case "&": return { ok: true, kind: "int", typeName: "int", value: (lv & rv) | 0 };
          case "|": return { ok: true, kind: "int", typeName: "int", value: (lv | rv) | 0 };
          case "^": return { ok: true, kind: "int", typeName: "int", value: (lv ^ rv) | 0 };
          case "<<": return { ok: true, kind: "int", typeName: "int", value: (lv << (rv & 31)) | 0 };
          case ">>": return { ok: true, kind: "int", typeName: "int", value: (lv >> (rv & 31)) | 0 };
          case "<": return { ok: true, kind: "int", typeName: "bool", value: lv < rv ? 1 : 0 };
          case "<=": return { ok: true, kind: "int", typeName: "bool", value: lv <= rv ? 1 : 0 };
          case ">": return { ok: true, kind: "int", typeName: "bool", value: lv > rv ? 1 : 0 };
          case ">=": return { ok: true, kind: "int", typeName: "bool", value: lv >= rv ? 1 : 0 };
          case "==": return { ok: true, kind: "int", typeName: "bool", value: lv === rv ? 1 : 0 };
          case "!=": return { ok: true, kind: "int", typeName: "bool", value: lv !== rv ? 1 : 0 };
          case "&&": return { ok: true, kind: "int", typeName: "bool", value: (lv !== 0 && rv !== 0) ? 1 : 0 };
          case "||": return { ok: true, kind: "int", typeName: "bool", value: (lv !== 0 || rv !== 0) ? 1 : 0 };
          default:
            diagnostics.push(createDiagnostic(`Unsupported binary operator '${expr.operator}' in global initializer.`, expr, "semantic"));
            return { ok: false, kind: "int", typeName: "int", value: 0 };
        }
      }

      diagnostics.push(createDiagnostic("Global initializers must be compile-time literal expressions.", ownerNode || expr, "semantic"));
      return { ok: false, kind: "int", typeName: "int", value: 0 };
    }

    globals.forEach((globalDecl) => {
      if (!globalDecl || typeof globalDecl !== "object") return;
      const declarationType = normalizeTypeName(globalDecl.valueType || "int");
      const isArray = globalDecl.declarationKind === "array";
      const resolvedDeclType = resolveAliasType(declarationType);
      const elementWordSize = Math.max(1, typeWordSize(resolvedDeclType));
      const normalizedShape = isArray
        ? normalizeArrayShape(globalDecl.arrayShape, [Math.max(1, globalDecl.arrayLength | 0)])
        : [1];
      const arraySlotCount = isArray
        ? Math.max(1, arrayShapeProduct(normalizedShape)) * elementWordSize
        : elementWordSize;
      const isAggregate = isArray || (!isArray && arraySlotCount > 1);
      globalDecl.arrayShape = normalizedShape;
      globalDecl.arrayLength = normalizedShape[0] || 1;
      if (!isDeclarationTypeName(resolvedDeclType)) {
        diagnostics.push(createDiagnostic(`Unsupported global declaration type '${declarationType}'.`, globalDecl, "semantic"));
      }
      if (requiresS4SubsetType(resolvedDeclType) && activeSubsetLevel < subsetLevel("C0-S4")) {
        diagnostics.push(createDiagnostic(
          `Type '${declarationType}' declarations require subset C0-S4, current subset is ${activeSubset}.`,
          globalDecl,
          "semantic"
        ));
      }
      if (isArray && activeSubsetLevel < subsetLevel("C0-S3")) {
        diagnostics.push(createDiagnostic(`Array declarations require subset C0-S3, current subset is ${activeSubset}.`, globalDecl, "semantic"));
      }
      if (signatureTable.has(globalDecl.name)) {
        diagnostics.push(createDiagnostic(`Global '${globalDecl.name}' conflicts with an existing function/intrinsic name.`, globalDecl, "semantic"));
      }
      if (globalTable.has(globalDecl.name)) {
        diagnostics.push(createDiagnostic(`Duplicate global symbol '${globalDecl.name}'.`, globalDecl, "semantic"));
      }
      if (isAggregate && globalDecl.initializer) {
        if (globalDecl.initializer.type !== "array_initializer") {
          diagnostics.push(createDiagnostic("Aggregate declarations require brace-based initializer lists.", globalDecl.initializer, "semantic"));
        } else {
          const flatElements = flattenArrayInitializerElements(globalDecl.initializer, []);
          if (flatElements.length > arraySlotCount) {
            diagnostics.push(createDiagnostic(`Initializer has more elements than array '${globalDecl.name}' capacity.`, globalDecl.initializer, "semantic"));
          }
          const foldedElements = [];
          flatElements.forEach((element) => {
            const evaluated = evaluateStaticExpression(element, globalDecl);
            foldedElements.push(evaluated);
            if (!evaluated.ok) return;
            const inferredType = evaluated.kind === "string" ? "string" : normalizeTypeName(evaluated.typeName || "int");
            if (!typeCompatible(declarationType, inferredType)) {
              diagnostics.push(createDiagnostic(
                `Array '${globalDecl.name}' element initializer type '${inferredType}' is incompatible with '${declarationType}'.`,
                element,
                "semantic"
              ));
            }
          });
          globalDecl._staticInitElements = foldedElements;
        }
      } else if (globalDecl.initializer) {
        if (globalDecl.initializer.type === "array_initializer") {
          diagnostics.push(createDiagnostic("Brace initializer is only valid for aggregate declarations.", globalDecl, "semantic"));
        } else {
          const evaluated = evaluateStaticExpression(globalDecl.initializer, globalDecl);
          if (evaluated.ok) {
            const inferredType = evaluated.kind === "string" ? "string" : normalizeTypeName(evaluated.typeName || "int");
            if (!typeCompatible(declarationType, inferredType)) {
              diagnostics.push(createDiagnostic(
                `Cannot initialize global '${globalDecl.name}' of type '${declarationType}' with '${inferredType}'.`,
                globalDecl,
                "semantic"
              ));
            } else {
              globalDecl._staticInit = evaluated;
            }
          }
        }
      }
      const info = {
        name: globalDecl.name,
        kind: isArray
          ? "array"
          : (isStructTypeName(resolvedDeclType) ? "struct" : (isPointerTypeName(resolvedDeclType) ? "pointer" : "scalar")),
        slotCount: arraySlotCount,
        arrayShape: isArray ? normalizedShape : [1],
        elementWordSize,
        typeName: resolvedDeclType,
        storage: "global",
        globalLabel: globalDecl.name,
        isConst: globalDecl.isConst === true,
        boundLength: 0
      };
      globalTable.set(globalDecl.name, info);
      if (info.isConst && !isArray) {
        if (globalDecl._staticInit) {
          globalConstTable.set(globalDecl.name, { ...globalDecl._staticInit });
        } else {
          globalConstTable.set(globalDecl.name, { ok: true, kind: "int", typeName: declarationType, value: 0 });
        }
      }
      globalDecl.storage = "global";
      globalDecl.valueType = resolvedDeclType;
      globalDecl.symbolKind = info.kind;
      globalDecl.slotCount = info.slotCount;
      globalDecl.arrayShape = info.arrayShape;
      globalDecl.elementWordSize = info.elementWordSize;
      globalDecl.globalLabel = info.globalLabel;
    });

    function bindFunction(fn) {
      const scopeStack = [];
      let nextSlot = 0;

      const pushScope = () => scopeStack.push(new Map());
      const popScope = () => scopeStack.pop();
      const currentScope = () => scopeStack[scopeStack.length - 1];

      const declare = (name, node, slotCount = 1, kind = "scalar", typeName = "int", isConst = false, arrayShape = null) => {
        for (let i = scopeStack.length - 1; i >= 0; i -= 1) {
          if (scopeStack[i].has(name)) {
            diagnostics.push(createDiagnostic(
              `Duplicate local symbol '${name}' in an overlapping scope.`,
              node,
              "semantic"
            ));
            return scopeStack[i].get(name);
          }
        }
        const scope = currentScope();
        const normalizedSlotCount = Number.isFinite(slotCount) && slotCount > 0 ? (slotCount | 0) : 1;
        const normalizedShape = normalizeArrayShape(arrayShape, [normalizedSlotCount]);
        const resolvedType = resolveAliasType(typeName || "int");
        const info = {
          name,
          slot: nextSlot,
          slotCount: normalizedSlotCount,
          kind: String(kind || "scalar"),
          arrayShape: normalizedShape,
          elementWordSize: Math.max(1, typeWordSize(resolvedType)),
          typeName: resolvedType,
          isConst: isConst === true,
          boundLength: 0
        };
        nextSlot += normalizedSlotCount;
        scope.set(name, info);
        return info;
      };

      const resolve = (name, node) => {
        for (let i = scopeStack.length - 1; i >= 0; i -= 1) {
          if (scopeStack[i].has(name)) return scopeStack[i].get(name);
        }
        if (globalTable.has(name)) return globalTable.get(name);
        diagnostics.push(createDiagnostic(`Unknown identifier '${name}'.`, node, "semantic"));
        return null;
      };

      const extractStaticInt = (node, depth = 0) => {
        if (!node || typeof node !== "object" || depth > 8) return null;
        if (node.type === "literal") {
          if (node.literalType === "string") return null;
          return Number(node.value) | 0;
        }
        if (node.type === "cast") return extractStaticInt(node.expression, depth + 1);
        if (node.type === "unary") {
          const inner = extractStaticInt(node.argument, depth + 1);
          if (!Number.isFinite(inner)) return null;
          switch (node.operator) {
            case "+":
              return inner | 0;
            case "-":
              return (-(inner | 0)) | 0;
            case "~":
              return (~(inner | 0)) | 0;
            default:
              return null;
          }
        }
        if (node.type === "binary") {
          const left = extractStaticInt(node.left, depth + 1);
          const right = extractStaticInt(node.right, depth + 1);
          if (!Number.isFinite(left) || !Number.isFinite(right)) return null;
          switch (node.operator) {
            case "+": return ((left | 0) + (right | 0)) | 0;
            case "-": return ((left | 0) - (right | 0)) | 0;
            case "*": return Math.imul(left | 0, right | 0) | 0;
            case "/":
              if ((right | 0) === 0) return null;
              return ((left | 0) / (right | 0)) | 0;
            case "%":
              if ((right | 0) === 0) return null;
              return ((left | 0) % (right | 0)) | 0;
            case "<<": return ((left | 0) << ((right | 0) & 31)) | 0;
            case ">>": return ((left | 0) >> ((right | 0) & 31)) | 0;
            case "&": return ((left | 0) & (right | 0)) | 0;
            case "|": return ((left | 0) | (right | 0)) | 0;
            case "^": return ((left | 0) ^ (right | 0)) | 0;
            default:
              return null;
          }
        }
        if (node.type === "identifier") {
          const constEntry = globalConstTable.get(String(node.name || ""));
          if (constEntry && constEntry.ok && constEntry.kind === "int" && Number.isFinite(constEntry.value)) {
            return constEntry.value | 0;
          }
          return null;
        }
        return null;
      };

      const inferPointerBound = (exprNode) => {
        if (!exprNode || typeof exprNode !== "object") return 0;
        if (Number.isFinite(exprNode.boundLength) && (exprNode.boundLength | 0) > 0) {
          return exprNode.boundLength | 0;
        }
        if (exprNode.type === "alloc_array") {
          const staticLen = extractStaticInt(exprNode.length);
          if (Number.isFinite(staticLen) && staticLen > 0) return staticLen | 0;
        }
        return 0;
      };

      function bindExpr(expr, exprOptions = {}) {
        if (!expr || typeof expr !== "object") return "int";
        if (expr.type === "identifier") {
          const symbol = resolve(expr.name, expr);
          if (symbol) {
            if (Number.isFinite(symbol.slot)) expr.slot = symbol.slot;
            if (symbol.storage === "global") {
              expr.storage = "global";
              expr.globalLabel = symbol.globalLabel;
            }
            expr.slotCount = symbol.slotCount;
            expr.symbolKind = symbol.kind;
            expr.arrayShape = normalizeArrayShape(symbol.arrayShape, [symbol.slotCount || 1]);
            expr.elementWordSize = Number.isFinite(symbol.elementWordSize) ? (symbol.elementWordSize | 0) : 1;
            expr.isConst = symbol.isConst === true;
            expr.inferredType = symbol.typeName;
            if (Number.isFinite(symbol.boundLength) && (symbol.boundLength | 0) > 0) {
              expr.boundLength = symbol.boundLength | 0;
            }
            const isArrayLike = symbol.kind === "array" || symbol.kind === "array_ref";
            if (isArrayLike && exprOptions.allowArrayReference !== true) {
              diagnostics.push(createDiagnostic(`Array '${expr.name}' requires an index expression.`, expr, "semantic"));
            }
            expr.asArrayReference = isArrayLike && exprOptions.allowArrayReference === true;
            return symbol.typeName;
          }
          expr.inferredType = "int";
          return "int";
        }
        if (expr.type === "index") {
          const targetType = bindExpr(expr.target, { allowArrayReference: true });
          const indexType = bindExpr(expr.index);
          let targetKind = String(expr.target?.symbolKind || "");
          if (expr.target?.type !== "identifier" && expr.target?.type !== "index") {
            diagnostics.push(createDiagnostic("Array indexing target must be an identifier or indexed array expression.", expr.target || expr, "semantic"));
            expr.inferredType = "int";
            return "int";
          }
          const targetResolvedType = resolveAliasType(targetType || expr.target?.inferredType || "int");
          const pointerTarget = targetKind === "pointer" || isPointerTypeName(targetResolvedType);
          if (!pointerTarget && activeSubsetLevel < subsetLevel("C0-S3")) {
            diagnostics.push(createDiagnostic(`Array indexing requires subset C0-S3, current subset is ${activeSubset}.`, expr, "semantic"));
          }
          if (targetKind !== "array" && targetKind !== "array_ref" && !pointerTarget) {
            diagnostics.push(createDiagnostic("Indexed target is not an array reference.", expr.target || expr, "semantic"));
            expr.inferredType = "int";
            return "int";
          }
          const targetShape = normalizeArrayShape(expr.target?.arrayShape || expr.target?.remainingShape, []);
          if (!pointerTarget && !targetShape.length) {
            diagnostics.push(createDiagnostic("Indexed target has no remaining dimensions.", expr.target || expr, "semantic"));
            expr.inferredType = "int";
            return "int";
          }
          const elementWordSize = Number.isFinite(expr.target?.elementWordSize) && expr.target.elementWordSize > 0
            ? (expr.target.elementWordSize | 0)
            : 1;
          const nextShape = pointerTarget ? [] : targetShape.slice(1);
          const indexStrideWords = pointerTarget
            ? Math.max(1, elementWordSize)
            : Math.max(1, (arrayShapeProduct(targetShape, 1) || 1) * elementWordSize);
          if (expr.target?.type === "identifier") {
            expr.baseIsConst = expr.target.isConst === true;
            if (targetKind === "array_ref" || targetKind === "pointer") {
              if (expr.target.storage === "global") {
                expr.baseStorage = "global_pointer";
                expr.baseLabel = expr.target.globalLabel;
              } else {
                expr.baseStorage = "pointer_slot";
                expr.baseSlot = expr.target.slot;
              }
            } else if (expr.target.storage === "global") {
              expr.baseStorage = "global";
              expr.baseLabel = expr.target.globalLabel;
            } else {
              expr.baseStorage = "local";
              expr.baseSlot = expr.target.slot;
            }
          } else {
            expr.baseIsConst = expr.target.baseIsConst === true;
            expr.baseStorage = expr.target.baseStorage;
            expr.baseSlot = expr.target.baseSlot;
            expr.baseLabel = expr.target.baseLabel;
          }
          expr.indexStrideWords = indexStrideWords;
          expr.elementWordSize = elementWordSize;
          expr.arrayShape = nextShape;
          expr.remainingShape = nextShape;
          if (!isNumericType(indexType) && !isBooleanType(indexType)) {
            diagnostics.push(createDiagnostic("Array index must be an integer-compatible expression.", expr.index || expr, "semantic"));
          }
          if (!pointerTarget && nextShape.length > 0) {
            expr.symbolKind = "array_ref";
            expr.asArrayReference = exprOptions.allowArrayReference === true;
            if (!expr.asArrayReference) {
              diagnostics.push(createDiagnostic("Array slice requires additional index expression.", expr, "semantic"));
            }
          } else {
            expr.symbolKind = "scalar";
            expr.asArrayReference = false;
          }
          if (pointerTarget) {
            expr.inferredType = dereferenceTypeName(targetResolvedType);
            const pointerBound = Number.isFinite(expr.target?.boundLength) ? (expr.target.boundLength | 0) : 0;
            if (pointerBound > 0) expr.boundLength = pointerBound;
          } else {
            expr.inferredType = normalizeTypeName(targetType || expr.target.inferredType || "int");
            const bound = Number.isFinite(targetShape[0]) ? (targetShape[0] | 0) : 0;
            if (bound > 0) expr.boundLength = bound;
          }
          return expr.inferredType;
        }
        if (expr.type === "literal") {
          expr.inferredType = normalizeTypeName(expr.literalType || "int");
          return expr.inferredType;
        }
        if (expr.type === "null_literal") {
          expr.inferredType = "null";
          expr.symbolKind = "pointer";
          return "null";
        }
        if (expr.type === "string_literal") {
          expr.inferredType = "string";
          return "string";
        }
        if (expr.type === "alloc") {
          const allocType = resolveAliasType(expr.allocType || "int");
          expr.allocType = allocType;
          expr.elementWordSize = Math.max(1, typeWordSize(allocType));
          expr.inferredType = pointerTypeName(allocType, 1);
          expr.symbolKind = "pointer";
          return expr.inferredType;
        }
        if (expr.type === "alloc_array") {
          const allocType = resolveAliasType(expr.allocType || "int");
          const lengthType = bindExpr(expr.length);
          if (!isNumericType(lengthType) && !isBooleanType(lengthType)) {
            diagnostics.push(createDiagnostic("alloc_array length must be integer-compatible.", expr.length || expr, "semantic"));
          }
          expr.allocType = allocType;
          expr.elementWordSize = Math.max(1, typeWordSize(allocType));
          expr.inferredType = pointerTypeName(allocType, 1);
          expr.symbolKind = "pointer";
          return expr.inferredType;
        }
        if (expr.type === "member") {
          const targetType = bindExpr(expr.target, { allowArrayReference: true });
          const resolvedTargetType = resolveAliasType(targetType);
          let structType = resolvedTargetType;
          if (expr.viaPointer === true) {
            if (!isPointerTypeName(resolvedTargetType)) {
              diagnostics.push(createDiagnostic("Operator '->' requires pointer target.", expr, "semantic"));
              expr.inferredType = "int";
              return "int";
            }
            structType = resolveAliasType(dereferenceTypeName(resolvedTargetType));
          } else if (isPointerTypeName(resolvedTargetType)) {
            diagnostics.push(createDiagnostic("Operator '.' cannot be used with pointer target (use '->').", expr, "semantic"));
            structType = resolveAliasType(dereferenceTypeName(resolvedTargetType));
          }
          if (!isStructTypeName(structType)) {
            diagnostics.push(createDiagnostic("Member access requires struct type target.", expr, "semantic"));
            expr.inferredType = "int";
            return "int";
          }
          const fieldInfo = structFieldInfo(structType, expr.field);
          if (!fieldInfo) {
            diagnostics.push(createDiagnostic(`Unknown field '${expr.field}' for ${structType}.`, expr, "semantic"));
            expr.inferredType = "int";
            return "int";
          }
          expr.structType = structType;
          expr.fieldType = fieldInfo.typeName;
          expr.fieldOffsetWords = fieldInfo.offsetWords | 0;
          expr.fieldWordSize = fieldInfo.wordSize | 0;
          expr.inferredType = fieldInfo.typeName;
          expr.symbolKind = isPointerTypeName(fieldInfo.typeName)
            ? "pointer"
            : (isStructTypeName(fieldInfo.typeName) ? "struct" : "scalar");
          return expr.inferredType;
        }
        if (expr.type === "unary") {
          const argType = bindExpr(expr.argument);
          if (expr.operator === "-" || expr.operator === "+") {
            if (!isNumericType(argType)) {
              diagnostics.push(createDiagnostic(`Unary '${expr.operator}' requires int or char expression.`, expr, "semantic"));
            }
            expr.inferredType = "int";
            return "int";
          }
          if (expr.operator === "~") {
            if (!isNumericType(argType)) {
              diagnostics.push(createDiagnostic("Unary '~' requires int or char expression.", expr, "semantic"));
            }
            expr.inferredType = "int";
            return "int";
          }
          if (expr.operator === "!") {
            if (!isBooleanType(argType) && !isNumericType(argType)) {
              diagnostics.push(createDiagnostic("Unary '!' requires bool/int/char expression.", expr, "semantic"));
            }
            expr.inferredType = "bool";
            return "bool";
          }
          if (expr.operator === "*") {
            if (!isPointerTypeName(argType)) {
              diagnostics.push(createDiagnostic("Unary '*' requires pointer expression.", expr, "semantic"));
              expr.inferredType = "int";
              return "int";
            }
            expr.inferredType = dereferenceTypeName(argType);
            expr.symbolKind = isStructTypeName(expr.inferredType) ? "struct" : "scalar";
            return expr.inferredType;
          }
          expr.inferredType = argType;
          return argType;
        }
        if (expr.type === "cast") {
          const targetType = resolveAliasType(expr.targetType || "int");
          const sourceType = bindExpr(expr.expression);
          if (targetType === "string") {
            if (!isStringType(sourceType)) {
              diagnostics.push(createDiagnostic("Only string expressions can be cast to string.", expr, "semantic"));
            }
          } else if (isStringType(sourceType)) {
            diagnostics.push(createDiagnostic(`Cannot cast string to '${targetType}'.`, expr, "semantic"));
          }
          expr.inferredType = targetType;
          return targetType;
        }
        if (expr.type === "assign") {
          const assignmentOperator = String(expr.operator || "=");
          let targetType = "int";
          let targetSymbol = null;
          if (expr.target?.type === "identifier") {
            const symbol = resolve(expr.target.name, expr.target);
            if (symbol) {
              targetSymbol = symbol;
              if (Number.isFinite(symbol.slot)) expr.target.slot = symbol.slot;
              if (symbol.storage === "global") {
                expr.target.storage = "global";
                expr.target.globalLabel = symbol.globalLabel;
              }
              expr.target.isConst = symbol.isConst === true;
              expr.target.symbolKind = symbol.kind;
              if (Number.isFinite(symbol.boundLength) && (symbol.boundLength | 0) > 0) {
                expr.target.boundLength = symbol.boundLength | 0;
              }
              targetType = symbol.typeName;
              if (symbol.kind === "array" || symbol.kind === "array_ref") {
                diagnostics.push(createDiagnostic("Assignment target cannot be an array identifier.", expr.target, "semantic"));
              }
              if (symbol.isConst === true) {
                diagnostics.push(createDiagnostic(`Cannot assign to const symbol '${expr.target.name}'.`, expr.target, "semantic"));
              }
            }
          } else if (expr.target?.type === "index") {
            targetType = bindExpr(expr.target, { allowArrayReference: true });
            if (expr.target.baseIsConst === true) {
              diagnostics.push(createDiagnostic("Cannot assign through index to const array.", expr.target, "semantic"));
            }
            if (expr.target.symbolKind === "array_ref") {
              diagnostics.push(createDiagnostic("Assignment target needs additional index dimensions.", expr.target, "semantic"));
            }
          } else if (expr.target?.type === "member") {
            targetType = bindExpr(expr.target, { allowArrayReference: true });
            if (expr.target?.target?.isConst === true) {
              diagnostics.push(createDiagnostic("Cannot assign through const struct target.", expr.target, "semantic"));
            }
          } else if (expr.target?.type === "unary" && expr.target.operator === "*") {
            targetType = bindExpr(expr.target, { allowArrayReference: true });
          } else {
            diagnostics.push(createDiagnostic("Assignment target must be an lvalue (identifier/index/member/*ptr).", expr.target || expr, "semantic"));
          }
          const valueType = bindExpr(expr.value);
          if (assignmentOperator === "=" && targetSymbol && targetSymbol.kind === "pointer") {
            const inferredBound = inferPointerBound(expr.value);
            targetSymbol.boundLength = inferredBound > 0 ? inferredBound : 0;
            expr.target.boundLength = targetSymbol.boundLength;
          }
          if (isStructTypeName(targetType) && expr.target?.type === "identifier") {
            diagnostics.push(createDiagnostic(
              "Direct struct assignment is not supported; assign fields individually.",
              expr,
              "semantic"
            ));
          }
          if (assignmentOperator === "=") {
            if (!typeCompatible(targetType, valueType)) {
              diagnostics.push(createDiagnostic(
                `Cannot assign expression of type '${valueType}' to target of type '${targetType}'.`,
                expr,
                "semantic"
              ));
            }
          } else {
            const reducedOperator = COMPOUND_ASSIGN_TO_BINARY[assignmentOperator];
            if (!reducedOperator) {
              diagnostics.push(createDiagnostic(`Unsupported assignment operator '${assignmentOperator}'.`, expr, "semantic"));
            }
            if (["+", "-", "*", "/", "%", "&", "|", "^", "<<", ">>"].includes(reducedOperator)) {
              if (!isNumericType(targetType) || !isNumericType(valueType)) {
                diagnostics.push(createDiagnostic(
                  `Operator '${assignmentOperator}' requires int/char operands.`,
                  expr,
                  "semantic"
                ));
              }
            }
          }
          expr.operator = assignmentOperator;
          expr.inferredType = targetType;
          return targetType;
        }
        if (expr.type === "update") {
          const updateOperator = String(expr.operator || "++");
          if (activeSubsetLevel < subsetLevel("C0-S2")) {
            diagnostics.push(createDiagnostic(
              `Operator '${updateOperator}' requires subset C0-S2, current subset is ${activeSubset}.`,
              expr,
              "semantic"
            ));
          }
          let targetType = "int";
          if (expr.target?.type === "identifier") {
            const symbol = resolve(expr.target.name, expr.target);
            if (symbol) {
              if (Number.isFinite(symbol.slot)) expr.target.slot = symbol.slot;
              if (symbol.storage === "global") {
                expr.target.storage = "global";
                expr.target.globalLabel = symbol.globalLabel;
              }
              expr.target.symbolKind = symbol.kind;
              expr.target.isConst = symbol.isConst === true;
              targetType = symbol.typeName;
              if (symbol.kind === "array" || symbol.kind === "array_ref") {
                diagnostics.push(createDiagnostic("Update target cannot be an array identifier.", expr.target, "semantic"));
              }
              if (symbol.isConst === true) {
                diagnostics.push(createDiagnostic(`Cannot modify const symbol '${expr.target.name}'.`, expr.target, "semantic"));
              }
            }
          } else if (expr.target?.type === "index") {
            targetType = bindExpr(expr.target, { allowArrayReference: true });
            if (expr.target.baseIsConst === true) {
              diagnostics.push(createDiagnostic("Cannot modify through index of const array.", expr.target, "semantic"));
            }
            if (expr.target.symbolKind === "array_ref") {
              diagnostics.push(createDiagnostic("Update target needs additional index dimensions.", expr.target, "semantic"));
            }
          } else if (expr.target?.type === "member") {
            targetType = bindExpr(expr.target, { allowArrayReference: true });
          } else if (expr.target?.type === "unary" && expr.target.operator === "*") {
            targetType = bindExpr(expr.target, { allowArrayReference: true });
          } else {
            diagnostics.push(createDiagnostic("Update target must be an lvalue (identifier/index/member/*ptr).", expr.target || expr, "semantic"));
          }
          if (!isNumericType(targetType)) {
            diagnostics.push(createDiagnostic(`Operator '${updateOperator}' requires int/char target.`, expr, "semantic"));
          }
          expr.operator = updateOperator === "--" ? "--" : "++";
          expr.isPostfix = expr.isPostfix === true;
          expr.inferredType = targetType;
          return targetType;
        }
        if (expr.type === "binary") {
          const leftType = bindExpr(expr.left);
          const rightType = bindExpr(expr.right);
          if (expr.operator === "&&" || expr.operator === "||") {
            if (!isBooleanType(leftType) || !isBooleanType(rightType)) {
              diagnostics.push(createDiagnostic(`Operator '${expr.operator}' requires bool operands.`, expr, "semantic"));
            }
            expr.inferredType = "bool";
            return "bool";
          }
          if (["+", "-", "*", "/", "%"].includes(expr.operator)) {
            if (!isNumericType(leftType) || !isNumericType(rightType)) {
              diagnostics.push(createDiagnostic(`Operator '${expr.operator}' requires int/char operands.`, expr, "semantic"));
            }
            expr.inferredType = "int";
            return "int";
          }
          if (["&", "|", "^", "<<", ">>"].includes(expr.operator)) {
            if (!isNumericType(leftType) || !isNumericType(rightType)) {
              diagnostics.push(createDiagnostic(`Operator '${expr.operator}' requires int/char operands.`, expr, "semantic"));
            }
            expr.inferredType = "int";
            return "int";
          }
          if (["<", "<=", ">", ">="].includes(expr.operator)) {
            if (!isNumericType(leftType) || !isNumericType(rightType)
              || normalizeTypeName(leftType) !== normalizeTypeName(rightType)) {
              diagnostics.push(createDiagnostic(`Operator '${expr.operator}' requires both operands with same numeric type.`, expr, "semantic"));
            }
            expr.inferredType = "bool";
            return "bool";
          }
          if (["==", "!="].includes(expr.operator)) {
            const normalizedLeft = normalizeTypeName(leftType);
            const normalizedRight = normalizeTypeName(rightType);
            const bothPointers = isPointerTypeName(normalizedLeft) && isPointerTypeName(normalizedRight);
            const pointerAndNull = (isPointerTypeName(normalizedLeft) && isNullTypeName(normalizedRight))
              || (isPointerTypeName(normalizedRight) && isNullTypeName(normalizedLeft));
            const allowed = ((normalizedLeft === normalizedRight) || bothPointers || pointerAndNull)
              && !isStringType(normalizedLeft)
              && !isStringType(normalizedRight);
            if (!allowed) {
              diagnostics.push(createDiagnostic(
                `Operator '${expr.operator}' requires same non-string type on both operands; got '${leftType}' and '${rightType}'.`,
                expr,
                "semantic"
              ));
            }
            expr.inferredType = "bool";
            return "bool";
          }
          expr.inferredType = "int";
          return "int";
        }
        if (expr.type === "ternary") {
          const condType = bindExpr(expr.condition);
          if (!isBooleanType(condType) && !isNumericType(condType)) {
            diagnostics.push(createDiagnostic("Ternary condition must be bool/int/char expression.", expr.condition || expr, "semantic"));
          }
          const trueType = bindExpr(expr.whenTrue, exprOptions);
          const falseType = bindExpr(expr.whenFalse, exprOptions);
          if (!typeCompatible(trueType, falseType) && !typeCompatible(falseType, trueType)) {
            diagnostics.push(createDiagnostic(
              `Ternary branches require compatible types; got '${trueType}' and '${falseType}'.`,
              expr,
              "semantic"
            ));
            expr.inferredType = trueType;
            return trueType;
          }
          expr.inferredType = typeCompatible(trueType, falseType) ? trueType : falseType;
          return expr.inferredType;
        }
        if (expr.type === "call") {
          const signature = signatureTable.get(expr.callee);
          const expectedParamKinds = Array.isArray(signature?.paramKinds) ? signature.paramKinds : [];
          const args = Array.isArray(expr.args) ? expr.args : [];
          const argTypes = args.map((arg, index) => {
            const expectedKind = normalizeParamKind(expectedParamKinds[index]);
            return bindExpr(arg, {
              allowArrayReference: expectedKind === "array" || expectedKind === "address"
            });
          });
          if (!signature) {
            diagnostics.push(createDiagnostic(`Unknown function '${expr.callee}'.`, expr, "semantic"));
            expr.inferredType = "int";
            return "int";
          }
          expr.signature = signature;
          const requiredSubset = normalizeSubsetName(signature.minSubset || "C0-S0");
          if (subsetLevel(requiredSubset) > activeSubsetLevel) {
            diagnostics.push(createDiagnostic(
              `Function '${expr.callee}' requires subset ${requiredSubset}, current subset is ${activeSubset}.`,
              expr,
              "semantic"
            ));
          }
          if (signature.params !== (expr.args?.length || 0)) {
            diagnostics.push(createDiagnostic(
              `Function '${expr.callee}' expects ${signature.params} argument(s), got ${expr.args?.length || 0}.`,
              expr,
              "semantic"
            ));
          }
          const expectedParamTypes = Array.isArray(signature.paramTypes) ? signature.paramTypes : [];
          const expectedParamArrayShapes = Array.isArray(signature.paramArrayShapes) ? signature.paramArrayShapes : [];
          for (let i = 0; i < Math.min(argTypes.length, expectedParamTypes.length); i += 1) {
            const expected = expectedParamTypes[i];
            const actual = argTypes[i];
            const expectedKind = normalizeParamKind(expectedParamKinds[i]);
            const argNode = expr.args?.[i] || expr;
            if (expectedKind === "array") {
              const actualKind = String(argNode?.symbolKind || "");
              const isArrayLike = actualKind === "array" || actualKind === "array_ref";
              const expectedElementType = Array.isArray(expected)
                ? normalizeTypeName(expected[0] || "int")
                : normalizeTypeName(expected);
              if (!isArrayLike) {
                diagnostics.push(createDiagnostic(
                  `Argument ${i + 1} of '${expr.callee}' must be an array reference.`,
                  argNode,
                  "semantic"
                ));
              } else if (!typeCompatible(expectedElementType, actual)) {
                diagnostics.push(createDiagnostic(
                  `Argument ${i + 1} of '${expr.callee}' expects '${expectedElementType}[]', got '${actual}[]'.`,
                  argNode,
                  "semantic"
                ));
              } else {
                const expectedShape = normalizeArrayShape(expectedParamArrayShapes[i], []);
                const actualShape = normalizeArrayShape(argNode?.arrayShape || argNode?.remainingShape, []);
                if (expectedShape.length && actualShape.length
                  && !arrayParameterShapesCompatible(expectedShape, actualShape)) {
                  diagnostics.push(createDiagnostic(
                    `Argument ${i + 1} of '${expr.callee}' expects shape ${formatArrayShape(expectedShape)}, got ${formatArrayShape(actualShape)}.`,
                    argNode,
                    "semantic"
                  ));
                }
              }
              continue;
            }
            if (expectedKind === "address") {
              const actualKind = String(argNode?.symbolKind || "");
              const isArrayLike = actualKind === "array" || actualKind === "array_ref";
              if (isArrayLike) {
                if (!isNumericType(actual) && !isBooleanType(actual)) {
                  diagnostics.push(createDiagnostic(
                    `Argument ${i + 1} of '${expr.callee}' array reference must have numeric element type.`,
                    argNode,
                    "semantic"
                  ));
                }
                continue;
              }
              if (isPointerTypeName(actual)) continue;
            }
            if (Array.isArray(expected)) {
              const accepted = expected.map((entry) => normalizeTypeName(entry));
              if (!accepted.some((candidate) => typeCompatible(candidate, actual))) {
                diagnostics.push(createDiagnostic(
                  `Argument ${i + 1} of '${expr.callee}' expects ${accepted.join(" or ")}, got '${actual}'.`,
                  argNode,
                  "semantic"
                ));
              }
            } else if (!typeCompatible(expected, actual)) {
              diagnostics.push(createDiagnostic(
                `Argument ${i + 1} of '${expr.callee}' expects '${normalizeTypeName(expected)}', got '${actual}'.`,
                argNode,
                "semantic"
              ));
            }
          }
          if (expr.callee === "contract_length" && expr.args?.length) {
            const argNode = expr.args[0];
            const shape = normalizeArrayShape(argNode?.arrayShape || argNode?.remainingShape, []);
            if (shape.length && Number.isFinite(shape[0]) && shape[0] > 0) {
              expr.contractLength = shape[0] | 0;
            } else if (Number.isFinite(argNode?.boundLength) && (argNode.boundLength | 0) > 0) {
              expr.contractLength = argNode.boundLength | 0;
            }
          }
          expr.inferredType = normalizeTypeName(signature.returnType || "int");
          return expr.inferredType;
        }
        expr.inferredType = "int";
        return "int";
      }

      function bindStmt(stmt, loopDepth = 0) {
        if (!stmt || typeof stmt !== "object") return;
        if (stmt.type === "block") {
          pushScope();
          (stmt.statements || []).forEach((inner) => bindStmt(inner, loopDepth));
          popScope();
          return;
        }
        if (stmt.type === "declaration") {
          const declarationType = normalizeTypeName(stmt.valueType || "int");
          const resolvedDeclType = resolveAliasType(declarationType);
          if (!isDeclarationTypeName(resolvedDeclType) || resolvedDeclType === "void") {
            diagnostics.push(createDiagnostic(`Unsupported declaration type '${declarationType}'.`, stmt, "semantic"));
          }
          const isArray = stmt.declarationKind === "array";
          const elementWordSize = Math.max(1, typeWordSize(resolvedDeclType));
          const normalizedShape = isArray
            ? normalizeArrayShape(stmt.arrayShape, [Math.max(1, stmt.arrayLength | 0)])
            : [1];
          const slotCount = isArray
            ? Math.max(1, arrayShapeProduct(normalizedShape)) * elementWordSize
            : elementWordSize;
          const isAggregate = isArray || (!isArray && slotCount > 1);
          stmt.arrayShape = normalizedShape;
          stmt.arrayLength = normalizedShape[0] || 1;
          if (requiresS4SubsetType(resolvedDeclType) && activeSubsetLevel < subsetLevel("C0-S4")) {
            diagnostics.push(createDiagnostic(
              `Type '${declarationType}' declarations require subset C0-S4, current subset is ${activeSubset}.`,
              stmt,
              "semantic"
            ));
          }
          if (isArray && activeSubsetLevel < subsetLevel("C0-S3")) {
            diagnostics.push(createDiagnostic(`Array declarations require subset C0-S3, current subset is ${activeSubset}.`, stmt, "semantic"));
          }
          const symbol = declare(
            stmt.name,
            stmt,
            slotCount,
            isArray
              ? "array"
              : (isStructTypeName(resolvedDeclType) ? "struct" : (isPointerTypeName(resolvedDeclType) ? "pointer" : "scalar")),
            resolvedDeclType,
            stmt.isConst === true,
            normalizedShape
          );
          if (symbol) {
            stmt.slot = symbol.slot;
            stmt.slotCount = symbol.slotCount;
            stmt.symbolKind = symbol.kind;
            stmt.arrayShape = normalizeArrayShape(symbol.arrayShape, normalizedShape);
            stmt.valueType = symbol.typeName;
            stmt.elementWordSize = symbol.elementWordSize;
            stmt.isConst = symbol.isConst === true;
            stmt.boundLength = Number.isFinite(symbol.boundLength) ? (symbol.boundLength | 0) : 0;
          }
          if (stmt.initializer) {
            if (isAggregate) {
              if (stmt.initializer.type !== "array_initializer") {
                diagnostics.push(createDiagnostic("Aggregate declarations require brace-based initializer lists.", stmt.initializer, "semantic"));
              } else {
                const flatElements = flattenArrayInitializerElements(stmt.initializer, []);
                if (flatElements.length > slotCount) {
                  diagnostics.push(createDiagnostic(`Initializer has more elements than array '${stmt.name}' capacity.`, stmt.initializer, "semantic"));
                }
                flatElements.forEach((element) => {
                  const elementType = bindExpr(element);
                  if (!typeCompatible(stmt.valueType || declarationType, elementType)) {
                    diagnostics.push(createDiagnostic(
                      `Cannot initialize array '${stmt.name}' element of type '${stmt.valueType || declarationType}' with '${elementType}'.`,
                      element,
                      "semantic"
                    ));
                  }
                });
              }
            } else {
              if (stmt.initializer.type === "array_initializer") {
                diagnostics.push(createDiagnostic("Scalar declarations cannot use brace initializer lists.", stmt.initializer, "semantic"));
              } else {
                const initType = bindExpr(stmt.initializer);
                if (!typeCompatible(stmt.valueType || declarationType, initType)) {
                  diagnostics.push(createDiagnostic(
                    `Cannot initialize '${stmt.name}' of type '${stmt.valueType || declarationType}' with '${initType}'.`,
                    stmt,
                    "semantic"
                  ));
                }
                if (symbol && symbol.kind === "pointer") {
                  const inferredBound = inferPointerBound(stmt.initializer);
                  symbol.boundLength = inferredBound > 0 ? inferredBound : 0;
                  stmt.boundLength = symbol.boundLength;
                }
              }
            }
          } else if (symbol && symbol.kind === "pointer") {
            symbol.boundLength = 0;
            stmt.boundLength = 0;
          }
          return;
        }
        if (stmt.type === "return") {
          const fnReturnType = normalizeTypeName(fn.returnType || "int");
          if (requiresS4SubsetType(fnReturnType) && activeSubsetLevel < subsetLevel("C0-S4")) {
            diagnostics.push(createDiagnostic(
              `Return type '${fnReturnType}' requires subset C0-S4, current subset is ${activeSubset}.`,
              fn,
              "semantic"
            ));
          }
          if (fnReturnType === "void" && stmt.expression) {
            diagnostics.push(createDiagnostic("Void function cannot return a value.", stmt, "semantic"));
          }
          if (fnReturnType !== "void" && !stmt.expression) {
            diagnostics.push(createDiagnostic(`${fnReturnType} function must return a value.`, stmt, "semantic"));
          }
          if (stmt.expression) {
            const returnedType = bindExpr(stmt.expression);
            if (fnReturnType !== "void" && !typeCompatible(fnReturnType, returnedType)) {
              diagnostics.push(createDiagnostic(
                `Return type mismatch: expected '${fnReturnType}', got '${returnedType}'.`,
                stmt,
                "semantic"
              ));
            }
          }
          return;
        }
        if (stmt.type === "if") {
          const condType = bindExpr(stmt.condition);
          if (!isBooleanType(condType)) {
            diagnostics.push(createDiagnostic("If condition must be bool expression.", stmt.condition || stmt, "semantic"));
          }
          bindStmt(stmt.thenBranch, loopDepth);
          bindStmt(stmt.elseBranch, loopDepth);
          return;
        }
        if (stmt.type === "while") {
          const condType = bindExpr(stmt.condition);
          if (!isBooleanType(condType)) {
            diagnostics.push(createDiagnostic("While condition must be bool expression.", stmt.condition || stmt, "semantic"));
          }
          bindStmt(stmt.body, loopDepth + 1);
          return;
        }
        if (stmt.type === "for") {
          if (activeSubsetLevel < subsetLevel("C0-S2")) {
            diagnostics.push(createDiagnostic(`'for' requires subset C0-S2, current subset is ${activeSubset}.`, stmt, "semantic"));
          }
          pushScope();
          if (stmt.init) {
            if (stmt.init.type === "declaration") bindStmt(stmt.init, loopDepth + 1);
            else bindExpr(stmt.init);
          }
          if (stmt.condition) {
            const condType = bindExpr(stmt.condition);
            if (!isBooleanType(condType)) {
              diagnostics.push(createDiagnostic("For condition must be bool expression.", stmt.condition || stmt, "semantic"));
            }
          }
          if (stmt.update) bindExpr(stmt.update);
          bindStmt(stmt.body, loopDepth + 1);
          popScope();
          return;
        }
        if (stmt.type === "break") {
          if (activeSubsetLevel < subsetLevel("C0-S2")) {
            diagnostics.push(createDiagnostic(`'break' requires subset C0-S2, current subset is ${activeSubset}.`, stmt, "semantic"));
          }
          if (loopDepth <= 0) {
            diagnostics.push(createDiagnostic("'break' can only be used inside loops.", stmt, "semantic"));
          }
          return;
        }
        if (stmt.type === "continue") {
          if (activeSubsetLevel < subsetLevel("C0-S2")) {
            diagnostics.push(createDiagnostic(`'continue' requires subset C0-S2, current subset is ${activeSubset}.`, stmt, "semantic"));
          }
          if (loopDepth <= 0) {
            diagnostics.push(createDiagnostic("'continue' can only be used inside loops.", stmt, "semantic"));
          }
          return;
        }
        if (stmt.type === "expr_stmt") {
          bindExpr(stmt.expression);
          return;
        }
        if (stmt.type === "assert") {
          const assertType = bindExpr(stmt.expression);
          if (!isBooleanType(assertType) && !isNumericType(assertType)) {
            diagnostics.push(createDiagnostic("assert(...) requires bool/int/char expression.", stmt.expression || stmt, "semantic"));
          }
        }
      }

      pushScope();
      const functionReturnType = normalizeTypeName(fn.returnType || "int");
      if (requiresS4SubsetType(functionReturnType) && activeSubsetLevel < subsetLevel("C0-S4")) {
        diagnostics.push(createDiagnostic(
          `Function return type '${functionReturnType}' requires subset C0-S4, current subset is ${activeSubset}.`,
          fn,
          "semantic"
        ));
      }
      (fn.params || []).forEach((param) => {
        const paramType = resolveAliasType(param.valueType || "int");
        if (!isDeclarationTypeName(paramType)) {
          diagnostics.push(createDiagnostic(`Unsupported parameter type '${paramType}'.`, param, "semantic"));
        }
        if (requiresS4SubsetType(paramType) && activeSubsetLevel < subsetLevel("C0-S4")) {
          diagnostics.push(createDiagnostic(
            `Parameter type '${paramType}' requires subset C0-S4, current subset is ${activeSubset}.`,
            param,
            "semantic"
          ));
        }
        const paramKind = normalizeParamKind(param.declarationKind === "array"
          ? "array"
          : (isPointerTypeName(paramType) ? "address" : "scalar"));
        const paramShape = paramKind === "array"
          ? normalizeArrayShape(param.arrayShape, [0])
          : [1];
        const symbol = declare(
          param.name,
          param,
          1,
          paramKind === "array"
            ? "array_ref"
            : (isPointerTypeName(paramType) ? "pointer" : (isStructTypeName(paramType) ? "struct" : "scalar")),
          paramType,
          param.isConst === true,
          paramShape
        );
        if (symbol) {
          param.slot = symbol.slot;
          param.valueType = symbol.typeName;
          param.isConst = symbol.isConst === true;
          param.symbolKind = symbol.kind;
          param.arrayShape = normalizeArrayShape(symbol.arrayShape, paramShape);
        }
      });

      const trackedScalarSlots = new Map();
      (fn.params || []).forEach((param) => {
        if (param?.symbolKind === "scalar" && Number.isFinite(param.slot)) {
          trackedScalarSlots.set(param.slot | 0, String(param.name || `slot_${param.slot | 0}`));
        }
      });

      const collectTrackedScalarSlots = (stmt) => {
        if (!stmt || typeof stmt !== "object") return;
        if (stmt.type === "declaration") {
          if (stmt.symbolKind === "scalar" && Number.isFinite(stmt.slot)) {
            trackedScalarSlots.set(stmt.slot | 0, String(stmt.name || `slot_${stmt.slot | 0}`));
          }
          return;
        }
        if (stmt.type === "block") {
          (stmt.statements || []).forEach((inner) => collectTrackedScalarSlots(inner));
          return;
        }
        if (stmt.type === "if") {
          collectTrackedScalarSlots(stmt.thenBranch);
          collectTrackedScalarSlots(stmt.elseBranch);
          return;
        }
        if (stmt.type === "while") {
          collectTrackedScalarSlots(stmt.body);
          return;
        }
        if (stmt.type === "for") {
          collectTrackedScalarSlots(stmt.init);
          collectTrackedScalarSlots(stmt.body);
        }
      };
      const cloneInitState = (state) => new Set(state);
      const intersectInitState = (left, right) => {
        const out = new Set();
        left.forEach((slot) => {
          if (right.has(slot)) out.add(slot);
        });
        return out;
      };

      const isTrackedScalarIdentifier = (expr) => {
        if (!expr || expr.type !== "identifier") return false;
        if (expr.storage === "global") return false;
        if (expr.symbolKind !== "scalar") return false;
        if (!Number.isFinite(expr.slot)) return false;
        return trackedScalarSlots.has(expr.slot | 0);
      };

      const markInitialized = (slot, state) => {
        if (!Number.isFinite(slot)) return;
        const normalizedSlot = slot | 0;
        if (trackedScalarSlots.has(normalizedSlot)) state.add(normalizedSlot);
      };

      const checkIdentifierRead = (expr, state) => {
        if (!isTrackedScalarIdentifier(expr)) return;
        const slot = expr.slot | 0;
        if (!state.has(slot)) {
          diagnostics.push(createDiagnostic(
            `Variable '${expr.name}' may be used before initialization.`,
            expr,
            "semantic"
          ));
        }
      };

      const analyzeExprInitialization = (expr, state, options = {}) => {
        if (!expr || typeof expr !== "object") return;
        if (expr.type === "literal" || expr.type === "string_literal") return;
        if (expr.type === "null_literal" || expr.type === "alloc" || expr.type === "alloc_array") {
          if (expr.type === "alloc_array") analyzeExprInitialization(expr.length, state);
          return;
        }
        if (expr.type === "identifier") {
          if (options.writeTarget === true) return;
          checkIdentifierRead(expr, state);
          return;
        }
        if (expr.type === "array_initializer") {
          (expr.elements || []).forEach((element) => analyzeExprInitialization(element, state));
          return;
        }
        if (expr.type === "unary") {
          analyzeExprInitialization(expr.argument, state);
          return;
        }
        if (expr.type === "cast") {
          analyzeExprInitialization(expr.expression, state);
          return;
        }
        if (expr.type === "member") {
          analyzeExprInitialization(expr.target, state);
          return;
        }
        if (expr.type === "binary") {
          analyzeExprInitialization(expr.left, state);
          analyzeExprInitialization(expr.right, state);
          return;
        }
        if (expr.type === "ternary") {
          analyzeExprInitialization(expr.condition, state);
          analyzeExprInitialization(expr.whenTrue, state);
          analyzeExprInitialization(expr.whenFalse, state);
          return;
        }
        if (expr.type === "call") {
          (expr.args || []).forEach((arg) => analyzeExprInitialization(arg, state));
          return;
        }
        if (expr.type === "index") {
          analyzeExprInitialization(expr.target, state);
          analyzeExprInitialization(expr.index, state);
          return;
        }
        if (expr.type === "assign") {
          const assignmentOperator = String(expr.operator || "=");
          if (expr.target?.type === "identifier") {
            if (assignmentOperator !== "=") checkIdentifierRead(expr.target, state);
            analyzeExprInitialization(expr.value, state);
            markInitialized(expr.target.slot, state);
            return;
          }
          analyzeExprInitialization(expr.target, state);
          analyzeExprInitialization(expr.value, state);
          return;
        }
        if (expr.type === "update") {
          if (expr.target?.type === "identifier") {
            checkIdentifierRead(expr.target, state);
            markInitialized(expr.target.slot, state);
            return;
          }
          analyzeExprInitialization(expr.target, state);
        }
      };

      const analyzeStmtInitialization = (stmt, entryState) => {
        const state = entryState || new Set();
        if (!stmt || typeof stmt !== "object") return state;
        if (stmt.type === "block") {
          let currentState = state;
          (stmt.statements || []).forEach((inner) => {
            currentState = analyzeStmtInitialization(inner, currentState);
          });
          return currentState;
        }
        if (stmt.type === "declaration") {
          if (stmt.initializer) analyzeExprInitialization(stmt.initializer, state);
          if (stmt.symbolKind === "scalar" && Number.isFinite(stmt.slot)) {
            const slot = stmt.slot | 0;
            if (stmt.initializer) state.add(slot);
            else state.delete(slot);
          }
          return state;
        }
        if (stmt.type === "expr_stmt") {
          analyzeExprInitialization(stmt.expression, state);
          return state;
        }
        if (stmt.type === "return") {
          analyzeExprInitialization(stmt.expression, state);
          return state;
        }
        if (stmt.type === "assert") {
          analyzeExprInitialization(stmt.expression, state);
          return state;
        }
        if (stmt.type === "if") {
          analyzeExprInitialization(stmt.condition, state);
          const thenState = analyzeStmtInitialization(stmt.thenBranch, cloneInitState(state));
          const elseState = stmt.elseBranch
            ? analyzeStmtInitialization(stmt.elseBranch, cloneInitState(state))
            : cloneInitState(state);
          return intersectInitState(thenState, elseState);
        }
        if (stmt.type === "while") {
          analyzeExprInitialization(stmt.condition, state);
          analyzeStmtInitialization(stmt.body, cloneInitState(state));
          return state;
        }
        if (stmt.type === "for") {
          const loopEntryState = cloneInitState(state);
          if (stmt.init) {
            if (stmt.init.type === "declaration") analyzeStmtInitialization(stmt.init, loopEntryState);
            else analyzeExprInitialization(stmt.init, loopEntryState);
          }
          if (stmt.condition) analyzeExprInitialization(stmt.condition, loopEntryState);
          const bodyState = analyzeStmtInitialization(stmt.body, cloneInitState(loopEntryState));
          if (stmt.update) analyzeExprInitialization(stmt.update, bodyState);
          return loopEntryState;
        }
        return state;
      };

      const returnFlow = (stmt) => {
        if (!stmt || typeof stmt !== "object") return { fallsThrough: true };
        if (stmt.type === "return") return { fallsThrough: false };
        if (stmt.type === "block") {
          const statements = Array.isArray(stmt.statements) ? stmt.statements : [];
          let fallsThrough = true;
          for (let i = 0; i < statements.length && fallsThrough; i += 1) {
            const info = returnFlow(statements[i]);
            fallsThrough = info.fallsThrough === true;
          }
          return { fallsThrough };
        }
        if (stmt.type === "if") {
          if (!stmt.elseBranch) return { fallsThrough: true };
          const thenInfo = returnFlow(stmt.thenBranch);
          const elseInfo = returnFlow(stmt.elseBranch);
          return { fallsThrough: thenInfo.fallsThrough || elseInfo.fallsThrough };
        }
        return { fallsThrough: true };
      };

      bindStmt(fn.body, 0);
      collectTrackedScalarSlots(fn.body);
      const initialState = new Set();
      (fn.params || []).forEach((param) => {
        if (param?.symbolKind === "scalar" && Number.isFinite(param.slot)) {
          initialState.add(param.slot | 0);
        }
      });
      analyzeStmtInitialization(fn.body, initialState);
      if (functionReturnType !== "void" && returnFlow(fn.body).fallsThrough) {
        diagnostics.push(createDiagnostic(
          `Function '${fn.name}' may exit without returning '${functionReturnType}'.`,
          fn,
          "semantic"
        ));
      }
      popScope();

      fn._bind = {
        localSlotCount: nextSlot,
        maxTempWords: Math.max(estimateStmtTemps(fn.body), 8),
        returnType: normalizeTypeName(fn.returnType || "int"),
        name: fn.name
      };
    }

    functions.forEach((fn) => bindFunction(fn));
    programAst._globalSymbols = globalTable;
    programAst._structTable = structTable;
    programAst._typedefTable = typedefTable;
    return {
      ok: diagnostics.length === 0,
      diagnostics,
      signatures: signatureTable,
      structs: structTable,
      typedefs: typedefTable
    };
  }

  function alignTo(value, alignment) {
    const mod = value % alignment;
    return mod === 0 ? value : value + (alignment - mod);
  }

  function escapeAsciiz(value) {
    return String(value ?? "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, "\\\"")
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
      .replace(/\0/g, "\\0");
  }

  function foldStaticInitializerToWord(node, emitter, fallback = 0) {
    if (!node || typeof node !== "object") return fallback | 0;
    if (node.type === "literal") return Number(node.value) | 0;
    if (node.type === "null_literal") return 0;
    if (node.type === "string_literal") return emitter.internStringLiteral(node.value || "");
    if (node.type === "cast") {
      const raw = foldStaticInitializerToWord(node.expression, emitter, fallback);
      if (typeof raw === "string") return raw;
      const targetType = normalizeTypeName(node.targetType || "int");
      if (targetType === "bool") return (raw | 0) === 0 ? 0 : 1;
      if (targetType === "char") return (raw | 0) & 0xff;
      return raw | 0;
    }
    if (node.type === "unary") {
      const raw = foldStaticInitializerToWord(node.argument, emitter, fallback);
      if (typeof raw === "string") return fallback | 0;
      if (node.operator === "-") return (-(raw | 0)) | 0;
      if (node.operator === "+") return raw | 0;
      if (node.operator === "~") return (~(raw | 0)) | 0;
      if (node.operator === "!") return ((raw | 0) === 0) ? 1 : 0;
      return raw | 0;
    }
    return fallback | 0;
  }

  function staticInitValueToWord(staticInit, emitter, fallback = 0) {
    if (!staticInit || typeof staticInit !== "object") return fallback | 0;
    if (staticInit.kind === "string") return emitter.internStringLiteral(staticInit.value || "");
    return Number(staticInit.value) | 0;
  }

  function emitGlobalDeclaration(globalDecl, emitter) {
    if (!globalDecl || typeof globalDecl !== "object") return;
    const label = String(globalDecl.globalLabel || globalDecl.name || "__global");
    const shape = normalizeArrayShape(globalDecl.arrayShape, [Number(globalDecl.arrayLength || globalDecl.slotCount || 1) | 0]);
    const slotCount = Math.max(1, Number(globalDecl.slotCount || arrayShapeProduct(shape) || globalDecl.arrayLength || 1) | 0);
    const isArray = globalDecl.declarationKind === "array" || globalDecl.symbolKind === "array";
    const initializer = globalDecl.initializer;
    const staticInit = globalDecl._staticInit;
    const staticInitElements = Array.isArray(globalDecl._staticInitElements) ? globalDecl._staticInitElements : null;

    if (!isArray) {
      if (slotCount > 1) {
        emitter.emit(`${label}:`);
        if (initializer && initializer.type === "array_initializer") {
          const elements = flattenArrayInitializerElements(initializer, []);
          const writeCount = Math.min(slotCount, elements.length);
          for (let i = 0; i < writeCount; i += 1) {
            const folded = foldStaticInitializerToWord(elements[i], emitter, 0);
            emitter.emit(`  .word ${folded}`);
          }
          for (let i = writeCount; i < slotCount; i += 1) emitter.emit("  .word 0");
        } else {
          for (let i = 0; i < slotCount; i += 1) emitter.emit("  .word 0");
        }
        return;
      }
      const folded = staticInit
        ? staticInitValueToWord(staticInit, emitter, 0)
        : (initializer ? foldStaticInitializerToWord(initializer, emitter, 0) : 0);
      emitter.emit(`${label}: .word ${folded}`);
      return;
    }

    emitter.emit(`${label}:`);
    if ((initializer && initializer.type === "array_initializer") || staticInitElements) {
      const elements = (initializer && initializer.type === "array_initializer")
        ? flattenArrayInitializerElements(initializer, [])
        : [];
      const foldedElements = staticInitElements || elements.map((entry) => ({
        kind: typeof entry === "string" ? "string" : "int",
        value: entry
      }));
      const writeCount = Math.min(slotCount, foldedElements.length);
      for (let i = 0; i < writeCount; i += 1) {
        const folded = staticInitElements
          ? staticInitValueToWord(foldedElements[i], emitter, 0)
          : foldStaticInitializerToWord(elements[i], emitter, 0);
        emitter.emit(`  .word ${folded}`);
      }
      for (let i = writeCount; i < slotCount; i += 1) emitter.emit("  .word 0");
      return;
    }

    if (initializer) {
      const folded = foldStaticInitializerToWord(initializer, emitter, 0);
      emitter.emit(`  .word ${folded}`);
      for (let i = 1; i < slotCount; i += 1) emitter.emit("  .word 0");
      return;
    }

    emitter.emit(`  .space ${slotCount * 4}`);
  }

  function createEmitter() {
    const lines = [];
    const stringPool = new Map();
    let labelCounter = 0;
    let stringCounter = 0;
    return {
      emit(line = "") {
        lines.push(String(line));
      },
      internStringLiteral(value = "") {
        const key = String(value ?? "");
        if (stringPool.has(key)) return stringPool.get(key);
        const label = `__str_${stringCounter}`;
        stringCounter += 1;
        stringPool.set(key, label);
        return label;
      },
      createLabel(prefix = "L") {
        const safePrefix = String(prefix || "L").replace(/[^A-Za-z0-9_]/g, "_");
        const label = `${safePrefix}_${labelCounter}`;
        labelCounter += 1;
        return label;
      },
      toString() {
        const out = [...lines];
        if (stringPool.size > 0) {
          out.push("");
          out.push(".data");
          stringPool.forEach((label, value) => {
            out.push(`${label}: .asciiz "${escapeAsciiz(value)}"`);
          });
        }
        return `${out.join("\n")}\n`;
      }
    };
  }

  function generateProgram(programAst, options = {}) {
    const emitter = createEmitter();
    const functions = Array.isArray(programAst?.functions) ? [...programAst.functions] : [];
    const globals = Array.isArray(programAst?.globals) ? [...programAst.globals] : [];
    const emitComments = options.emitComments !== false;
    const orderedFunctions = functions.sort((left, right) => {
      if (left?.name === "main") return -1;
      if (right?.name === "main") return 1;
      return String(left?.name || "").localeCompare(String(right?.name || ""));
    });

    if (emitComments) {
      emitter.emit("# Mini-C C0 phase 5 generated MIPS");
      emitter.emit(`# source: ${String(options.sourceName || "program.c")}`);
      emitter.emit(`# subset: ${String(options.subset || "C0-S4")}`);
      emitter.emit(`# abi: ${String(options.targetAbi || "o32").toLowerCase()}`);
    }
    if (globals.length > 0) {
      emitter.emit(".data");
      globals.forEach((globalDecl) => emitGlobalDeclaration(globalDecl, emitter));
      emitter.emit("");
    }
    emitter.emit(".text");
    emitter.emit(".globl main");
    emitter.emit("");

    orderedFunctions.forEach((fn) => emitFunction(fn, emitter));
    return emitter.toString();
  }

  function emitFunction(fn, emitter) {
    if (!fn || typeof fn !== "object" || !fn._bind) return;
    const bind = fn._bind;
    const localBytes = (bind.localSlotCount || 0) * 4;
    const tempWords = Math.max(1, bind.maxTempWords || 0);
    const tempBytes = tempWords * 4;
    const savedFpOffset = localBytes + tempBytes;
    const savedRaOffset = savedFpOffset + 4;
    const frameBytes = alignTo(savedRaOffset + 4, 8);
    const returnLabel = `__ret_${String(fn.name || "fn").replace(/[^A-Za-z0-9_]/g, "_")}`;

    const context = {
      emitter,
      fn,
      bind,
      frameBytes,
      tempBaseOffset: localBytes,
      tempWords,
      tempDepth: 0,
      usedRegs: new Set(),
      loopStack: [],
      returnLabel
    };

    emitter.emit(`${fn.name}:`);
    emitter.emit(`  addiu $sp, $sp, -${frameBytes}`);
    emitter.emit(`  sw $fp, ${savedFpOffset}($sp)`);
    emitter.emit(`  sw $ra, ${savedRaOffset}($sp)`);
    emitter.emit("  move $fp, $sp");

    (fn.params || []).forEach((param, index) => {
      const slotOffset = (param.slot || 0) * 4;
      if (index < 4) {
        emitter.emit(`  sw $a${index}, ${slotOffset}($fp)`);
        return;
      }
      const incomingOffset = frameBytes + ((index - 4) * 4);
      emitter.emit(`  lw $t0, ${incomingOffset}($sp)`);
      emitter.emit(`  sw $t0, ${slotOffset}($fp)`);
    });

    emitStatement(fn.body, context);

    if (fn.name !== "main" && bind.returnType === "int") {
      emitter.emit("  move $v0, $zero");
    }
    emitter.emit(`  b ${returnLabel}`);
    emitter.emit("  nop");

    emitter.emit(`${returnLabel}:`);
    if (fn.name === "main") {
      emitter.emit("  li $v0, 10");
      emitter.emit("  syscall");
    } else {
      emitter.emit("  move $sp, $fp");
      emitter.emit(`  lw $fp, ${savedFpOffset}($sp)`);
      emitter.emit(`  lw $ra, ${savedRaOffset}($sp)`);
      emitter.emit(`  addiu $sp, $sp, ${frameBytes}`);
      emitter.emit("  jr $ra");
      emitter.emit("  nop");
    }
    emitter.emit("");
  }

  function allocReg(context, nodeForError = null) {
    for (let i = 0; i < TEMP_REGS.length; i += 1) {
      const reg = TEMP_REGS[i];
      if (!context.usedRegs.has(reg)) {
        context.usedRegs.add(reg);
        return reg;
      }
    }
    throw createDiagnostic("Out of temporary registers during code generation.", nodeForError, "codegen");
  }

  function freeReg(context, reg) {
    if (!reg) return;
    context.usedRegs.delete(reg);
  }

  function acquireTempSlot(context, nodeForError = null) {
    if (context.tempDepth >= context.tempWords) {
      throw createDiagnostic("Temporary expression stack overflow in code generator.", nodeForError, "codegen");
    }
    const slot = context.tempDepth;
    context.tempDepth += 1;
    return slot;
  }

  function releaseTempSlot(context) {
    if (context.tempDepth > 0) context.tempDepth -= 1;
  }

  function tempSlotOffset(context, slot) {
    return context.tempBaseOffset + (slot * 4);
  }

  function emitStatement(node, context) {
    if (!node || typeof node !== "object") return;
    const emitter = context.emitter;
    if (node.type === "block") {
      (node.statements || []).forEach((stmt) => emitStatement(stmt, context));
      return;
    }
    if (node.type === "empty") {
      return;
    }
    if (node.type === "declaration") {
      const offset = (node.slot || 0) * 4;
      const slotCount = Math.max(1, (node.slotCount || 1) | 0);
      if (node.symbolKind === "array" || node.declarationKind === "array" || slotCount > 1) {
        for (let i = 0; i < slotCount; i += 1) {
          emitter.emit(`  sw $zero, ${offset + (i * 4)}($fp)`);
        }
        if (node.initializer) {
          if (node.initializer.type === "array_initializer") {
            const elements = flattenArrayInitializerElements(node.initializer, []);
            const writeCount = Math.min(elements.length, slotCount);
            for (let i = 0; i < writeCount; i += 1) {
              const initReg = emitExpression(elements[i], context);
              emitter.emit(`  sw ${initReg}, ${offset + (i * 4)}($fp)`);
              freeReg(context, initReg);
            }
          } else {
            const initReg = emitExpression(node.initializer, context);
            emitter.emit(`  sw ${initReg}, ${offset}($fp)`);
            freeReg(context, initReg);
          }
        }
      } else if (node.initializer) {
        const reg = emitExpression(node.initializer, context);
        emitter.emit(`  sw ${reg}, ${offset}($fp)`);
        freeReg(context, reg);
      } else {
        emitter.emit(`  sw $zero, ${offset}($fp)`);
      }
      return;
    }
    if (node.type === "expr_stmt") {
      const reg = emitExpression(node.expression, context);
      freeReg(context, reg);
      return;
    }
    if (node.type === "assert") {
      const condReg = emitExpression(node.expression, context);
      const okLabel = emitter.createLabel("assert_ok");
      emitter.emit(`  bne ${condReg}, $zero, ${okLabel}`);
      emitter.emit("  nop");
      emitter.emit("  li $v0, 10");
      emitter.emit("  syscall");
      emitter.emit(`${okLabel}:`);
      freeReg(context, condReg);
      return;
    }
    if (node.type === "return") {
      if (node.expression) {
        const reg = emitExpression(node.expression, context);
        emitter.emit(`  move $v0, ${reg}`);
        freeReg(context, reg);
      } else {
        emitter.emit("  move $v0, $zero");
      }
      emitter.emit(`  b ${context.returnLabel}`);
      emitter.emit("  nop");
      return;
    }
    if (node.type === "if") {
      const elseLabel = emitter.createLabel("if_else");
      const endLabel = emitter.createLabel("if_end");
      const condReg = emitExpression(node.condition, context);
      emitter.emit(`  beq ${condReg}, $zero, ${elseLabel}`);
      emitter.emit("  nop");
      freeReg(context, condReg);
      emitStatement(node.thenBranch, context);
      emitter.emit(`  b ${endLabel}`);
      emitter.emit("  nop");
      emitter.emit(`${elseLabel}:`);
      if (node.elseBranch) emitStatement(node.elseBranch, context);
      emitter.emit(`${endLabel}:`);
      return;
    }
    if (node.type === "while") {
      const startLabel = emitter.createLabel("while_start");
      const endLabel = emitter.createLabel("while_end");
      emitter.emit(`${startLabel}:`);
      const condReg = emitExpression(node.condition, context);
      emitter.emit(`  beq ${condReg}, $zero, ${endLabel}`);
      emitter.emit("  nop");
      freeReg(context, condReg);
      context.loopStack.push({ breakLabel: endLabel, continueLabel: startLabel });
      emitStatement(node.body, context);
      context.loopStack.pop();
      emitter.emit(`  b ${startLabel}`);
      emitter.emit("  nop");
      emitter.emit(`${endLabel}:`);
      return;
    }
    if (node.type === "for") {
      const startLabel = emitter.createLabel("for_start");
      const updateLabel = emitter.createLabel("for_update");
      const endLabel = emitter.createLabel("for_end");
      if (node.init) {
        if (node.init.type === "declaration") {
          emitStatement(node.init, context);
        } else {
          const initReg = emitExpression(node.init, context);
          freeReg(context, initReg);
        }
      }
      emitter.emit(`${startLabel}:`);
      if (node.condition) {
        const condReg = emitExpression(node.condition, context);
        emitter.emit(`  beq ${condReg}, $zero, ${endLabel}`);
        emitter.emit("  nop");
        freeReg(context, condReg);
      }
      context.loopStack.push({ breakLabel: endLabel, continueLabel: updateLabel });
      emitStatement(node.body, context);
      context.loopStack.pop();
      emitter.emit(`${updateLabel}:`);
      if (node.update) {
        const updateReg = emitExpression(node.update, context);
        freeReg(context, updateReg);
      }
      emitter.emit(`  b ${startLabel}`);
      emitter.emit("  nop");
      emitter.emit(`${endLabel}:`);
      return;
    }
    if (node.type === "break") {
      const loop = context.loopStack[context.loopStack.length - 1];
      if (!loop || !loop.breakLabel) throw createDiagnostic("'break' used outside loop.", node, "codegen");
      emitter.emit(`  b ${loop.breakLabel}`);
      emitter.emit("  nop");
      return;
    }
    if (node.type === "continue") {
      const loop = context.loopStack[context.loopStack.length - 1];
      if (!loop || !loop.continueLabel) throw createDiagnostic("'continue' used outside loop.", node, "codegen");
      emitter.emit(`  b ${loop.continueLabel}`);
      emitter.emit("  nop");
      return;
    }
  }

  function emitIndexAddress(node, context) {
    const emitter = context.emitter;
    if (!node || node.type !== "index") {
      throw createDiagnostic("Internal compiler error: expected index node.", node, "codegen");
    }
    let addressReg = null;
    if (node.target?.type === "index") {
      addressReg = emitIndexAddress(node.target, context);
    } else if (node.target?.type === "identifier") {
      const isGlobalBase = node.baseStorage === "global";
      const isGlobalPointerBase = node.baseStorage === "global_pointer";
      const isPointerBase = node.baseStorage === "pointer_slot";
      const baseSlot = Number.isFinite(node.baseSlot)
        ? (node.baseSlot | 0)
        : (Number.isFinite(node.target.slot) ? (node.target.slot | 0) : null);
      if (!isGlobalBase && !isGlobalPointerBase && baseSlot == null) {
        throw createDiagnostic(`Unknown array base slot for '${node.target.name}'.`, node, "codegen");
      }
      addressReg = allocReg(context, node);
      if (isGlobalPointerBase) {
        if (!node.baseLabel) throw createDiagnostic("Missing global pointer label.", node, "codegen");
        emitter.emit(`  la ${addressReg}, ${node.baseLabel}`);
        emitter.emit(`  lw ${addressReg}, 0(${addressReg})`);
      } else if (isGlobalBase) {
        if (!node.baseLabel) throw createDiagnostic("Missing global array label.", node, "codegen");
        emitter.emit(`  la ${addressReg}, ${node.baseLabel}`);
      } else if (isPointerBase) {
        emitter.emit(`  lw ${addressReg}, ${baseSlot * 4}($fp)`);
      } else {
        emitter.emit(`  addiu ${addressReg}, $fp, ${baseSlot * 4}`);
      }
    } else {
      throw createDiagnostic("Array index target must be an identifier or indexed array expression.", node.target || node, "codegen");
    }

    const indexReg = emitExpression(node.index, context);
    if (Number.isFinite(node.boundLength) && (node.boundLength | 0) > 0) {
      const bound = node.boundLength | 0;
      const boundReg = allocReg(context, node);
      const checkReg = allocReg(context, node);
      const okLabel = emitter.createLabel("idx_ok");
      // Lower bound: index >= 0
      emitter.emit(`  slt ${checkReg}, ${indexReg}, $zero`);
      emitter.emit(`  beq ${checkReg}, $zero, ${okLabel}`);
      emitter.emit("  nop");
      emitter.emit("  li $v0, 10");
      emitter.emit("  syscall");
      emitter.emit(`${okLabel}:`);
      const upperOkLabel = emitter.createLabel("idx_upper_ok");
      emitter.emit(`  li ${boundReg}, ${bound}`);
      emitter.emit(`  slt ${checkReg}, ${indexReg}, ${boundReg}`);
      emitter.emit(`  bne ${checkReg}, $zero, ${upperOkLabel}`);
      emitter.emit("  nop");
      emitter.emit("  li $v0, 10");
      emitter.emit("  syscall");
      emitter.emit(`${upperOkLabel}:`);
      freeReg(context, checkReg);
      freeReg(context, boundReg);
    }
    const strideWords = Number.isFinite(node.indexStrideWords) && node.indexStrideWords > 0
      ? (node.indexStrideWords | 0)
      : 1;
    if (strideWords === 1) {
      emitter.emit(`  sll ${indexReg}, ${indexReg}, 2`);
    } else {
      const strideReg = allocReg(context, node);
      emitter.emit(`  li ${strideReg}, ${(strideWords * 4) | 0}`);
      emitter.emit(`  mul ${indexReg}, ${indexReg}, ${strideReg}`);
      freeReg(context, strideReg);
    }
    emitter.emit(`  addu ${addressReg}, ${addressReg}, ${indexReg}`);
    freeReg(context, indexReg);
    return addressReg;
  }

  function emitMemberAddress(node, context) {
    const emitter = context.emitter;
    if (!node || node.type !== "member") {
      throw createDiagnostic("Internal compiler error: expected member node.", node, "codegen");
    }
    let baseAddressReg = null;
    if (node.viaPointer === true) {
      baseAddressReg = emitExpression(node.target, context);
    } else if (node.target?.type === "identifier") {
      baseAddressReg = allocReg(context, node);
      if (node.target.storage === "global") {
        emitter.emit(`  la ${baseAddressReg}, ${node.target.globalLabel}`);
      } else {
        const offset = (node.target.slot || 0) * 4;
        emitter.emit(`  addiu ${baseAddressReg}, $fp, ${offset}`);
      }
    } else if (node.target?.type === "member") {
      baseAddressReg = emitMemberAddress(node.target, context);
    } else if (node.target?.type === "unary" && node.target.operator === "*") {
      baseAddressReg = emitExpression(node.target.argument, context);
    } else {
      // Fallback: evaluate expression as address-like value.
      baseAddressReg = emitExpression(node.target, context);
    }
    const fieldOffsetWords = Number.isFinite(node.fieldOffsetWords) ? (node.fieldOffsetWords | 0) : 0;
    if (fieldOffsetWords !== 0) {
      emitter.emit(`  addiu ${baseAddressReg}, ${baseAddressReg}, ${(fieldOffsetWords * 4) | 0}`);
    }
    return baseAddressReg;
  }

  function emitExpression(node, context) {
    if (!node || typeof node !== "object") return allocReg(context, node);
    const emitter = context.emitter;

    if (node.type === "literal") {
      const reg = allocReg(context, node);
      emitter.emit(`  li ${reg}, ${Number(node.value) | 0}`);
      return reg;
    }

    if (node.type === "null_literal") {
      const reg = allocReg(context, node);
      emitter.emit(`  move ${reg}, $zero`);
      return reg;
    }

    if (node.type === "string_literal") {
      const reg = allocReg(context, node);
      const label = emitter.internStringLiteral(node.value || "");
      emitter.emit(`  la ${reg}, ${label}`);
      return reg;
    }

    if (node.type === "alloc") {
      const reg = allocReg(context, node);
      const sizeBytes = Math.max(1, (Number(node.elementWordSize || 1) | 0) * 4);
      emitter.emit(`  li $a0, ${sizeBytes}`);
      emitter.emit("  li $v0, 9");
      emitter.emit("  syscall");
      emitter.emit(`  move ${reg}, $v0`);
      return reg;
    }

    if (node.type === "alloc_array") {
      const lenReg = emitExpression(node.length, context);
      const sizeReg = allocReg(context, node);
      const wordBytes = Math.max(1, (Number(node.elementWordSize || 1) | 0) * 4);
      if (wordBytes === 4) {
        emitter.emit(`  sll ${sizeReg}, ${lenReg}, 2`);
      } else {
        emitter.emit(`  li ${sizeReg}, ${wordBytes}`);
        emitter.emit(`  mul ${sizeReg}, ${lenReg}, ${sizeReg}`);
      }
      emitter.emit(`  move $a0, ${sizeReg}`);
      emitter.emit("  li $v0, 9");
      emitter.emit("  syscall");
      freeReg(context, sizeReg);
      freeReg(context, lenReg);
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $v0`);
      return resultReg;
    }

    if (node.type === "identifier") {
      const reg = allocReg(context, node);
      if (node.asArrayReference === true) {
        if (node.storage === "global") {
          if (!node.globalLabel) throw createDiagnostic(`Missing global label for '${node.name}'.`, node, "codegen");
          emitter.emit(`  la ${reg}, ${node.globalLabel}`);
        } else if (node.symbolKind === "array_ref") {
          const offset = (node.slot || 0) * 4;
          emitter.emit(`  lw ${reg}, ${offset}($fp)`);
        } else {
          const offset = (node.slot || 0) * 4;
          emitter.emit(`  addiu ${reg}, $fp, ${offset}`);
        }
      } else if (node.storage === "global") {
        if (!node.globalLabel) throw createDiagnostic(`Missing global label for '${node.name}'.`, node, "codegen");
        emitter.emit(`  la ${reg}, ${node.globalLabel}`);
        emitter.emit(`  lw ${reg}, 0(${reg})`);
      } else {
        const offset = (node.slot || 0) * 4;
        emitter.emit(`  lw ${reg}, ${offset}($fp)`);
      }
      return reg;
    }

    if (node.type === "index") {
      const addressReg = emitIndexAddress(node, context);
      if (node.asArrayReference === true || node.symbolKind === "array_ref") {
        return addressReg;
      }
      const valueReg = allocReg(context, node);
      emitter.emit(`  lw ${valueReg}, 0(${addressReg})`);
      freeReg(context, addressReg);
      return valueReg;
    }

    if (node.type === "member") {
      const addressReg = emitMemberAddress(node, context);
      const valueReg = allocReg(context, node);
      emitter.emit(`  lw ${valueReg}, 0(${addressReg})`);
      freeReg(context, addressReg);
      return valueReg;
    }

    if (node.type === "unary") {
      if (node.operator === "*") {
        const addressReg = emitExpression(node.argument, context);
        const valueReg = allocReg(context, node);
        emitter.emit(`  lw ${valueReg}, 0(${addressReg})`);
        freeReg(context, addressReg);
        return valueReg;
      }
      const reg = emitExpression(node.argument, context);
      if (node.operator === "-") {
        emitter.emit(`  subu ${reg}, $zero, ${reg}`);
      } else if (node.operator === "~") {
        emitter.emit(`  nor ${reg}, ${reg}, $zero`);
      } else if (node.operator === "!") {
        emitter.emit(`  sltu ${reg}, $zero, ${reg}`);
        emitter.emit(`  xori ${reg}, ${reg}, 1`);
      }
      return reg;
    }

    if (node.type === "ternary") {
      const resultReg = allocReg(context, node);
      const falseLabel = emitter.createLabel("ternary_false");
      const endLabel = emitter.createLabel("ternary_end");
      const condReg = emitExpression(node.condition, context);
      emitter.emit(`  beq ${condReg}, $zero, ${falseLabel}`);
      emitter.emit("  nop");
      freeReg(context, condReg);
      const trueReg = emitExpression(node.whenTrue, context);
      emitter.emit(`  move ${resultReg}, ${trueReg}`);
      freeReg(context, trueReg);
      emitter.emit(`  b ${endLabel}`);
      emitter.emit("  nop");
      emitter.emit(`${falseLabel}:`);
      const falseReg = emitExpression(node.whenFalse, context);
      emitter.emit(`  move ${resultReg}, ${falseReg}`);
      freeReg(context, falseReg);
      emitter.emit(`${endLabel}:`);
      return resultReg;
    }

    if (node.type === "cast") {
      const reg = emitExpression(node.expression, context);
      const targetType = normalizeTypeName(node.targetType || "int");
      if (targetType === "bool") {
        emitter.emit(`  sltu ${reg}, $zero, ${reg}`);
      } else if (targetType === "char") {
        emitter.emit(`  andi ${reg}, ${reg}, 0xff`);
      }
      return reg;
    }

    if (node.type === "update") {
      const delta = node.operator === "--" ? -1 : 1;
      if (node.target?.type === "identifier") {
        const resultReg = allocReg(context, node);
        let valueReg = allocReg(context, node);
        if (node.target.storage === "global") {
          const addressReg = allocReg(context, node);
          emitter.emit(`  la ${addressReg}, ${node.target.globalLabel}`);
          emitter.emit(`  lw ${valueReg}, 0(${addressReg})`);
          if (node.isPostfix) emitter.emit(`  move ${resultReg}, ${valueReg}`);
          emitter.emit(`  addiu ${valueReg}, ${valueReg}, ${delta}`);
          emitter.emit(`  sw ${valueReg}, 0(${addressReg})`);
          if (!node.isPostfix) emitter.emit(`  move ${resultReg}, ${valueReg}`);
          freeReg(context, addressReg);
          freeReg(context, valueReg);
          return resultReg;
        }
        const offset = (node.target.slot || 0) * 4;
        emitter.emit(`  lw ${valueReg}, ${offset}($fp)`);
        if (node.isPostfix) emitter.emit(`  move ${resultReg}, ${valueReg}`);
        emitter.emit(`  addiu ${valueReg}, ${valueReg}, ${delta}`);
        emitter.emit(`  sw ${valueReg}, ${offset}($fp)`);
        if (!node.isPostfix) emitter.emit(`  move ${resultReg}, ${valueReg}`);
        freeReg(context, valueReg);
        return resultReg;
      }
      if (node.target?.type === "index") {
        const addressReg = emitIndexAddress(node.target, context);
        const tempSlot = acquireTempSlot(context, node);
        emitter.emit(`  sw ${addressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        freeReg(context, addressReg);

        const resultReg = allocReg(context, node);
        const valueReg = allocReg(context, node);
        const loadAddressReg = allocReg(context, node);
        emitter.emit(`  lw ${loadAddressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        emitter.emit(`  lw ${valueReg}, 0(${loadAddressReg})`);
        freeReg(context, loadAddressReg);

        if (node.isPostfix) emitter.emit(`  move ${resultReg}, ${valueReg}`);
        emitter.emit(`  addiu ${valueReg}, ${valueReg}, ${delta}`);
        const storeAddressReg = allocReg(context, node);
        emitter.emit(`  lw ${storeAddressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        emitter.emit(`  sw ${valueReg}, 0(${storeAddressReg})`);
        freeReg(context, storeAddressReg);
        releaseTempSlot(context);
        if (!node.isPostfix) emitter.emit(`  move ${resultReg}, ${valueReg}`);
        freeReg(context, valueReg);
        return resultReg;
      }
      if (node.target?.type === "member" || (node.target?.type === "unary" && node.target.operator === "*")) {
        const addressReg = node.target.type === "member"
          ? emitMemberAddress(node.target, context)
          : emitExpression(node.target.argument, context);
        const tempSlot = acquireTempSlot(context, node);
        emitter.emit(`  sw ${addressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        freeReg(context, addressReg);

        const resultReg = allocReg(context, node);
        const valueReg = allocReg(context, node);
        const loadAddressReg = allocReg(context, node);
        emitter.emit(`  lw ${loadAddressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        emitter.emit(`  lw ${valueReg}, 0(${loadAddressReg})`);
        freeReg(context, loadAddressReg);

        if (node.isPostfix) emitter.emit(`  move ${resultReg}, ${valueReg}`);
        emitter.emit(`  addiu ${valueReg}, ${valueReg}, ${delta}`);
        const storeAddressReg = allocReg(context, node);
        emitter.emit(`  lw ${storeAddressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        emitter.emit(`  sw ${valueReg}, 0(${storeAddressReg})`);
        freeReg(context, storeAddressReg);
        releaseTempSlot(context);
        if (!node.isPostfix) emitter.emit(`  move ${resultReg}, ${valueReg}`);
        freeReg(context, valueReg);
        return resultReg;
      }
      throw createDiagnostic("Unsupported update target.", node, "codegen");
    }

    if (node.type === "assign") {
      const assignmentOperator = String(node.operator || "=");
      const compoundBinaryOperator = COMPOUND_ASSIGN_TO_BINARY[assignmentOperator];
      if (node.target?.type === "identifier") {
        let resultReg = null;
        if (assignmentOperator === "=") {
          resultReg = emitExpression(node.value, context);
        } else {
          if (!compoundBinaryOperator) {
            throw createDiagnostic(`Unsupported assignment operator '${assignmentOperator}'.`, node, "codegen");
          }
          if (node.target.storage === "global") {
            const addressReg = allocReg(context, node);
            emitter.emit(`  la ${addressReg}, ${node.target.globalLabel}`);
            resultReg = allocReg(context, node);
            emitter.emit(`  lw ${resultReg}, 0(${addressReg})`);
            const rightReg = emitExpression(node.value, context);
            emitBinaryOperation(compoundBinaryOperator, resultReg, rightReg, emitter, node);
            freeReg(context, rightReg);
            emitter.emit(`  sw ${resultReg}, 0(${addressReg})`);
            freeReg(context, addressReg);
            return resultReg;
          }
          const offset = (node.target.slot || 0) * 4;
          resultReg = allocReg(context, node);
          emitter.emit(`  lw ${resultReg}, ${offset}($fp)`);
          const rightReg = emitExpression(node.value, context);
          emitBinaryOperation(compoundBinaryOperator, resultReg, rightReg, emitter, node);
          freeReg(context, rightReg);
        }

        if (node.target.storage === "global") {
          const addressReg = allocReg(context, node);
          emitter.emit(`  la ${addressReg}, ${node.target.globalLabel}`);
          emitter.emit(`  sw ${resultReg}, 0(${addressReg})`);
          freeReg(context, addressReg);
        } else {
          const offset = (node.target.slot || 0) * 4;
          emitter.emit(`  sw ${resultReg}, ${offset}($fp)`);
        }
        return resultReg;
      }
      if (node.target?.type === "index") {
        const addressReg = emitIndexAddress(node.target, context);
        const tempSlot = acquireTempSlot(context, node);
        emitter.emit(`  sw ${addressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        freeReg(context, addressReg);
        let valueReg = null;
        if (assignmentOperator === "=") {
          valueReg = emitExpression(node.value, context);
        } else {
          if (!compoundBinaryOperator) {
            throw createDiagnostic(`Unsupported assignment operator '${assignmentOperator}'.`, node, "codegen");
          }
          const currentReg = allocReg(context, node);
          emitter.emit(`  lw ${currentReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
          emitter.emit(`  lw ${currentReg}, 0(${currentReg})`);
          const rightReg = emitExpression(node.value, context);
          emitBinaryOperation(compoundBinaryOperator, currentReg, rightReg, emitter, node);
          freeReg(context, rightReg);
          valueReg = currentReg;
        }
        const restoredAddressReg = allocReg(context, node);
        emitter.emit(`  lw ${restoredAddressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        releaseTempSlot(context);
        emitter.emit(`  sw ${valueReg}, 0(${restoredAddressReg})`);
        freeReg(context, restoredAddressReg);
        return valueReg;
      }
      if (node.target?.type === "member" || (node.target?.type === "unary" && node.target.operator === "*")) {
        const addressReg = node.target.type === "member"
          ? emitMemberAddress(node.target, context)
          : emitExpression(node.target.argument, context);
        const tempSlot = acquireTempSlot(context, node);
        emitter.emit(`  sw ${addressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        freeReg(context, addressReg);
        let valueReg = null;
        if (assignmentOperator === "=") {
          valueReg = emitExpression(node.value, context);
        } else {
          if (!compoundBinaryOperator) {
            throw createDiagnostic(`Unsupported assignment operator '${assignmentOperator}'.`, node, "codegen");
          }
          const currentReg = allocReg(context, node);
          emitter.emit(`  lw ${currentReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
          emitter.emit(`  lw ${currentReg}, 0(${currentReg})`);
          const rightReg = emitExpression(node.value, context);
          emitBinaryOperation(compoundBinaryOperator, currentReg, rightReg, emitter, node);
          freeReg(context, rightReg);
          valueReg = currentReg;
        }
        const restoredAddressReg = allocReg(context, node);
        emitter.emit(`  lw ${restoredAddressReg}, ${tempSlotOffset(context, tempSlot)}($fp)`);
        releaseTempSlot(context);
        emitter.emit(`  sw ${valueReg}, 0(${restoredAddressReg})`);
        freeReg(context, restoredAddressReg);
        return valueReg;
      }
      throw createDiagnostic("Unsupported assignment target.", node, "codegen");
    }

    if (node.type === "call") {
      return emitCallExpression(node, context);
    }

    if (node.type === "binary") {
      if (node.operator === "&&" || node.operator === "||") {
        return emitLogicalBinary(node, context);
      }
      return emitArithmeticBinary(node, context);
    }

    throw createDiagnostic(`Unsupported expression node '${node.type}'.`, node, "codegen");
  }

  function emitLogicalBinary(node, context) {
    const emitter = context.emitter;
    const resultReg = emitExpression(node.left, context);
    const trueLabel = emitter.createLabel(node.operator === "&&" ? "and_true" : "or_true");
    const falseLabel = emitter.createLabel(node.operator === "&&" ? "and_false" : "or_false");
    const endLabel = emitter.createLabel(node.operator === "&&" ? "and_end" : "or_end");

    if (node.operator === "&&") {
      emitter.emit(`  beq ${resultReg}, $zero, ${falseLabel}`);
      emitter.emit("  nop");
      const rightReg = emitExpression(node.right, context);
      emitter.emit(`  beq ${rightReg}, $zero, ${falseLabel}`);
      emitter.emit("  nop");
      emitter.emit(`${trueLabel}:`);
      emitter.emit(`  li ${resultReg}, 1`);
      emitter.emit(`  b ${endLabel}`);
      emitter.emit("  nop");
      emitter.emit(`${falseLabel}:`);
      emitter.emit(`  move ${resultReg}, $zero`);
      emitter.emit(`${endLabel}:`);
      freeReg(context, rightReg);
    } else {
      emitter.emit(`  bne ${resultReg}, $zero, ${trueLabel}`);
      emitter.emit("  nop");
      const rightReg = emitExpression(node.right, context);
      emitter.emit(`  bne ${rightReg}, $zero, ${trueLabel}`);
      emitter.emit("  nop");
      emitter.emit(`  move ${resultReg}, $zero`);
      emitter.emit(`  b ${endLabel}`);
      emitter.emit("  nop");
      emitter.emit(`${trueLabel}:`);
      emitter.emit(`  li ${resultReg}, 1`);
      emitter.emit(`${endLabel}:`);
      freeReg(context, rightReg);
    }

    return resultReg;
  }

  function emitBinaryOperation(operator, resultReg, rightReg, emitter, nodeForError = null) {
    switch (operator) {
      case "+":
        emitter.emit(`  addu ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case "-":
        emitter.emit(`  subu ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case "*":
        emitter.emit(`  mul ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case "/":
        {
          const divSafeLabel = emitter.createLabel("div_safe");
          const divOverflowSafeLabel = emitter.createLabel("div_overflow_safe");
          emitter.emit(`  bne ${rightReg}, $zero, ${divSafeLabel}`);
          emitter.emit("  nop");
          emitter.emit("  break 7");
          emitter.emit(`${divSafeLabel}:`);
          emitter.emit("  li $t8, -1");
          emitter.emit(`  bne ${rightReg}, $t8, ${divOverflowSafeLabel}`);
          emitter.emit("  nop");
          emitter.emit("  li $t8, -2147483648");
          emitter.emit(`  bne ${resultReg}, $t8, ${divOverflowSafeLabel}`);
          emitter.emit("  nop");
          emitter.emit("  break 6");
          emitter.emit(`${divOverflowSafeLabel}:`);
        }
        emitter.emit(`  div ${resultReg}, ${rightReg}`);
        emitter.emit(`  mflo ${resultReg}`);
        break;
      case "%":
        {
          const modSafeLabel = emitter.createLabel("mod_safe");
          const modOverflowSafeLabel = emitter.createLabel("mod_overflow_safe");
          emitter.emit(`  bne ${rightReg}, $zero, ${modSafeLabel}`);
          emitter.emit("  nop");
          emitter.emit("  break 7");
          emitter.emit(`${modSafeLabel}:`);
          emitter.emit("  li $t8, -1");
          emitter.emit(`  bne ${rightReg}, $t8, ${modOverflowSafeLabel}`);
          emitter.emit("  nop");
          emitter.emit("  li $t8, -2147483648");
          emitter.emit(`  bne ${resultReg}, $t8, ${modOverflowSafeLabel}`);
          emitter.emit("  nop");
          emitter.emit("  break 6");
          emitter.emit(`${modOverflowSafeLabel}:`);
        }
        emitter.emit(`  div ${resultReg}, ${rightReg}`);
        emitter.emit(`  mfhi ${resultReg}`);
        break;
      case "&":
        emitter.emit(`  and ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case "|":
        emitter.emit(`  or ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case "^":
        emitter.emit(`  xor ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case "<<":
        emitter.emit(`  sllv ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case ">>":
        emitter.emit(`  srav ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case "==":
        emitter.emit(`  xor ${resultReg}, ${resultReg}, ${rightReg}`);
        emitter.emit(`  sltiu ${resultReg}, ${resultReg}, 1`);
        break;
      case "!=":
        emitter.emit(`  xor ${resultReg}, ${resultReg}, ${rightReg}`);
        emitter.emit(`  sltu ${resultReg}, $zero, ${resultReg}`);
        break;
      case "<":
        emitter.emit(`  slt ${resultReg}, ${resultReg}, ${rightReg}`);
        break;
      case "<=":
        emitter.emit(`  slt ${resultReg}, ${rightReg}, ${resultReg}`);
        emitter.emit(`  xori ${resultReg}, ${resultReg}, 1`);
        break;
      case ">":
        emitter.emit(`  slt ${resultReg}, ${rightReg}, ${resultReg}`);
        break;
      case ">=":
        emitter.emit(`  slt ${resultReg}, ${resultReg}, ${rightReg}`);
        emitter.emit(`  xori ${resultReg}, ${resultReg}, 1`);
        break;
      default:
        throw createDiagnostic(`Unsupported binary operator '${operator}'.`, nodeForError, "codegen");
    }
  }

  function emitArithmeticBinary(node, context) {
    const emitter = context.emitter;
    const leftReg = emitExpression(node.left, context);
    const slot = acquireTempSlot(context, node);
    emitter.emit(`  sw ${leftReg}, ${tempSlotOffset(context, slot)}($fp)`);
    freeReg(context, leftReg);
    const rightReg = emitExpression(node.right, context);
    const resultReg = allocReg(context, node);
    emitter.emit(`  lw ${resultReg}, ${tempSlotOffset(context, slot)}($fp)`);
    releaseTempSlot(context);

    emitBinaryOperation(node.operator, resultReg, rightReg, emitter, node);

    freeReg(context, rightReg);
    return resultReg;
  }

  function emitCallExpression(node, context) {
    const emitter = context.emitter;
    const signature = node.signature || null;
    if (!signature) throw createDiagnostic(`Unknown call target '${node.callee}'.`, node, "codegen");

    if (signature.intrinsic) {
      return emitIntrinsicCall(node, context);
    }

    const argSlots = [];
    const args = Array.isArray(node.args) ? node.args : [];
    for (let i = 0; i < args.length; i += 1) {
      const argReg = emitExpression(args[i], context);
      const slot = acquireTempSlot(context, node);
      emitter.emit(`  sw ${argReg}, ${tempSlotOffset(context, slot)}($fp)`);
      freeReg(context, argReg);
      argSlots.push(slot);
    }

    const registerArgCount = Math.min(argSlots.length, 4);
    for (let i = 0; i < registerArgCount; i += 1) {
      emitter.emit(`  lw $a${i}, ${tempSlotOffset(context, argSlots[i])}($fp)`);
    }

    const stackArgCount = Math.max(0, argSlots.length - 4);
    const stackArgBytes = stackArgCount * 4;
    if (stackArgBytes > 0) {
      emitter.emit(`  addiu $sp, $sp, -${stackArgBytes}`);
      for (let i = 4; i < argSlots.length; i += 1) {
        const stackOffset = (i - 4) * 4;
        emitter.emit(`  lw $t0, ${tempSlotOffset(context, argSlots[i])}($fp)`);
        emitter.emit(`  sw $t0, ${stackOffset}($sp)`);
      }
    }

    emitter.emit(`  jal ${node.callee}`);
    emitter.emit("  nop");
    if (stackArgBytes > 0) {
      emitter.emit(`  addiu $sp, $sp, ${stackArgBytes}`);
    }

    for (let i = argSlots.length - 1; i >= 0; i -= 1) {
      releaseTempSlot(context);
    }

    const resultReg = allocReg(context, node);
    emitter.emit(`  move ${resultReg}, $v0`);
    return resultReg;
  }

  function emitIntrinsicCall(node, context) {
    const emitter = context.emitter;
    const args = Array.isArray(node.args) ? node.args : [];
    const stashArgs = () => {
      const slots = [];
      for (let i = 0; i < args.length; i += 1) {
        const argReg = emitExpression(args[i], context);
        const slot = acquireTempSlot(context, node);
        emitter.emit(`  sw ${argReg}, ${tempSlotOffset(context, slot)}($fp)`);
        freeReg(context, argReg);
        slots.push(slot);
      }
      return slots;
    };
    const loadStashedArgs = (slots, registers) => {
      for (let i = 0; i < Math.min(slots.length, registers.length); i += 1) {
        emitter.emit(`  lw ${registers[i]}, ${tempSlotOffset(context, slots[i])}($fp)`);
      }
    };
    const releaseStashedArgs = (slots) => {
      for (let i = slots.length - 1; i >= 0; i -= 1) releaseTempSlot(context);
    };
    const emitVoidResult = () => {
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $zero`);
      return resultReg;
    };
    const storeWordToAddress = (valueReg, addressReg) => {
      emitter.emit(`  sw ${valueReg}, 0(${addressReg})`);
    };
    if (node.callee === "print_int") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 1");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "print_char") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 11");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "print_string") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 4");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "read_int") {
      emitter.emit("  li $v0, 5");
      emitter.emit("  syscall");
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $v0`);
      return resultReg;
    }
    if (node.callee === "read_char" || node.callee === "getchar") {
      emitter.emit("  li $v0, 12");
      emitter.emit("  syscall");
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $v0`);
      return resultReg;
    }
    if (node.callee === "print_bool") {
      const argReg = emitExpression(args[0], context);
      const trueLabel = emitter.createLabel("print_bool_true");
      const endLabel = emitter.createLabel("print_bool_end");
      const falseStringLabel = emitter.internStringLiteral("false");
      const trueStringLabel = emitter.internStringLiteral("true");
      emitter.emit(`  bne ${argReg}, $zero, ${trueLabel}`);
      emitter.emit("  nop");
      emitter.emit(`  la $a0, ${falseStringLabel}`);
      emitter.emit("  li $v0, 4");
      emitter.emit("  syscall");
      emitter.emit(`  b ${endLabel}`);
      emitter.emit("  nop");
      emitter.emit(`${trueLabel}:`);
      emitter.emit(`  la $a0, ${trueStringLabel}`);
      emitter.emit("  li $v0, 4");
      emitter.emit("  syscall");
      emitter.emit(`${endLabel}:`);
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "print_hex" || node.callee === "print_binary" || node.callee === "print_unsigned") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      if (node.callee === "print_hex") emitter.emit("  li $v0, 34");
      else if (node.callee === "print_binary") emitter.emit("  li $v0, 35");
      else emitter.emit("  li $v0, 36");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "print_float_bits") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  mtc1 ${argReg}, $f12`);
      emitter.emit("  li $v0, 2");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "print_double_bits") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1"]);
      emitter.emit("  mtc1 $a0, $f12");
      emitter.emit("  mtc1 $a1, $f13");
      emitter.emit("  li $v0, 3");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      return emitVoidResult();
    }
    if (node.callee === "read_string") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1"]);
      emitter.emit("  li $v0, 8");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      return emitVoidResult();
    }
    if (node.callee === "read_float_bits") {
      emitter.emit("  li $v0, 6");
      emitter.emit("  syscall");
      const resultReg = allocReg(context, node);
      emitter.emit(`  mfc1 ${resultReg}, $f0`);
      return resultReg;
    }
    if (node.callee === "read_double_bits") {
      const lowAddressReg = emitExpression(args[0], context);
      const highAddressReg = emitExpression(args[1], context);
      const scratchReg = allocReg(context, node);
      emitter.emit("  li $v0, 7");
      emitter.emit("  syscall");
      emitter.emit(`  mfc1 ${scratchReg}, $f0`);
      storeWordToAddress(scratchReg, lowAddressReg);
      emitter.emit(`  mfc1 ${scratchReg}, $f1`);
      storeWordToAddress(scratchReg, highAddressReg);
      freeReg(context, scratchReg);
      freeReg(context, highAddressReg);
      freeReg(context, lowAddressReg);
      return emitVoidResult();
    }
    if (node.callee === "sbrk") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 9");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $v0`);
      return resultReg;
    }
    if (node.callee === "exit0") {
      emitter.emit("  li $v0, 10");
      emitter.emit("  syscall");
      return emitVoidResult();
    }
    if (node.callee === "exit") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 17");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "sleep_ms") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 32");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "time_low" || node.callee === "time_high") {
      emitter.emit("  li $v0, 30");
      emitter.emit("  syscall");
      const resultReg = allocReg(context, node);
      if (node.callee === "time_low") emitter.emit(`  move ${resultReg}, $a0`);
      else emitter.emit(`  move ${resultReg}, $a1`);
      return resultReg;
    }
    if (node.callee === "time_now") {
      const lowAddressReg = emitExpression(args[0], context);
      const highAddressReg = emitExpression(args[1], context);
      emitter.emit("  li $v0, 30");
      emitter.emit("  syscall");
      storeWordToAddress("$a0", lowAddressReg);
      storeWordToAddress("$a1", highAddressReg);
      freeReg(context, highAddressReg);
      freeReg(context, lowAddressReg);
      return emitVoidResult();
    }
    if (node.callee === "midi_out" || node.callee === "midi_out_sync") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1", "$a2", "$a3"]);
      if (node.callee === "midi_out") emitter.emit("  li $v0, 31");
      else emitter.emit("  li $v0, 33");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      return emitVoidResult();
    }
    if (node.callee === "rand_seed") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1"]);
      emitter.emit("  li $v0, 40");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      return emitVoidResult();
    }
    if (node.callee === "rand_int") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 41");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $a0`);
      return resultReg;
    }
    if (node.callee === "rand_int_range") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1"]);
      emitter.emit("  li $v0, 42");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $a0`);
      return resultReg;
    }
    if (node.callee === "rand_float_bits") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 43");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      const resultReg = allocReg(context, node);
      emitter.emit(`  mfc1 ${resultReg}, $f0`);
      return resultReg;
    }
    if (node.callee === "rand_double_bits") {
      const streamReg = emitExpression(args[0], context);
      const lowAddressReg = emitExpression(args[1], context);
      const highAddressReg = emitExpression(args[2], context);
      const scratchReg = allocReg(context, node);
      emitter.emit(`  move $a0, ${streamReg}`);
      emitter.emit("  li $v0, 44");
      emitter.emit("  syscall");
      emitter.emit(`  mfc1 ${scratchReg}, $f0`);
      storeWordToAddress(scratchReg, lowAddressReg);
      emitter.emit(`  mfc1 ${scratchReg}, $f1`);
      storeWordToAddress(scratchReg, highAddressReg);
      freeReg(context, scratchReg);
      freeReg(context, highAddressReg);
      freeReg(context, lowAddressReg);
      freeReg(context, streamReg);
      return emitVoidResult();
    }
    if (node.callee === "fd_open" || node.callee === "fd_read" || node.callee === "fd_write") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1", "$a2"]);
      if (node.callee === "fd_open") emitter.emit("  li $v0, 13");
      else if (node.callee === "fd_read") emitter.emit("  li $v0, 14");
      else emitter.emit("  li $v0, 15");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $v0`);
      return resultReg;
    }
    if (node.callee === "fd_close") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 16");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      return emitVoidResult();
    }
    if (node.callee === "confirm_dialog") {
      const argReg = emitExpression(args[0], context);
      emitter.emit(`  move $a0, ${argReg}`);
      emitter.emit("  li $v0, 50");
      emitter.emit("  syscall");
      freeReg(context, argReg);
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $a0`);
      return resultReg;
    }
    if (node.callee === "input_dialog_int") {
      const messageReg = emitExpression(args[0], context);
      const statusAddressReg = emitExpression(args[1], context);
      emitter.emit(`  move $a0, ${messageReg}`);
      emitter.emit("  li $v0, 51");
      emitter.emit("  syscall");
      storeWordToAddress("$a1", statusAddressReg);
      freeReg(context, statusAddressReg);
      freeReg(context, messageReg);
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $a0`);
      return resultReg;
    }
    if (node.callee === "input_dialog_float_bits") {
      const messageReg = emitExpression(args[0], context);
      const statusAddressReg = emitExpression(args[1], context);
      emitter.emit(`  move $a0, ${messageReg}`);
      emitter.emit("  li $v0, 52");
      emitter.emit("  syscall");
      storeWordToAddress("$a1", statusAddressReg);
      freeReg(context, statusAddressReg);
      freeReg(context, messageReg);
      const resultReg = allocReg(context, node);
      emitter.emit(`  mfc1 ${resultReg}, $f0`);
      return resultReg;
    }
    if (node.callee === "input_dialog_double_bits") {
      const messageReg = emitExpression(args[0], context);
      const lowAddressReg = emitExpression(args[1], context);
      const highAddressReg = emitExpression(args[2], context);
      const statusAddressReg = emitExpression(args[3], context);
      const scratchReg = allocReg(context, node);
      emitter.emit(`  move $a0, ${messageReg}`);
      emitter.emit("  li $v0, 53");
      emitter.emit("  syscall");
      storeWordToAddress("$a1", statusAddressReg);
      emitter.emit(`  mfc1 ${scratchReg}, $f0`);
      storeWordToAddress(scratchReg, lowAddressReg);
      emitter.emit(`  mfc1 ${scratchReg}, $f1`);
      storeWordToAddress(scratchReg, highAddressReg);
      freeReg(context, scratchReg);
      freeReg(context, statusAddressReg);
      freeReg(context, highAddressReg);
      freeReg(context, lowAddressReg);
      freeReg(context, messageReg);
      return emitVoidResult();
    }
    if (node.callee === "input_dialog_string") {
      const messageReg = emitExpression(args[0], context);
      const bufferAddressReg = emitExpression(args[1], context);
      const maxLengthReg = emitExpression(args[2], context);
      const statusAddressReg = emitExpression(args[3], context);
      emitter.emit(`  move $a0, ${messageReg}`);
      emitter.emit(`  move $a1, ${bufferAddressReg}`);
      emitter.emit(`  move $a2, ${maxLengthReg}`);
      emitter.emit("  li $v0, 54");
      emitter.emit("  syscall");
      storeWordToAddress("$a1", statusAddressReg);
      freeReg(context, statusAddressReg);
      freeReg(context, maxLengthReg);
      freeReg(context, bufferAddressReg);
      freeReg(context, messageReg);
      return emitVoidResult();
    }
    if (node.callee === "message_dialog") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1"]);
      emitter.emit("  li $v0, 55");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      return emitVoidResult();
    }
    if (node.callee === "message_dialog_int") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1"]);
      emitter.emit("  li $v0, 56");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      return emitVoidResult();
    }
    if (node.callee === "message_dialog_float_bits") {
      const messageReg = emitExpression(args[0], context);
      const bitsReg = emitExpression(args[1], context);
      emitter.emit(`  move $a0, ${messageReg}`);
      emitter.emit(`  mtc1 ${bitsReg}, $f12`);
      emitter.emit("  li $v0, 57");
      emitter.emit("  syscall");
      freeReg(context, bitsReg);
      freeReg(context, messageReg);
      return emitVoidResult();
    }
    if (node.callee === "message_dialog_double_bits") {
      const messageReg = emitExpression(args[0], context);
      const lowBitsReg = emitExpression(args[1], context);
      const highBitsReg = emitExpression(args[2], context);
      emitter.emit(`  move $a0, ${messageReg}`);
      emitter.emit(`  mtc1 ${lowBitsReg}, $f12`);
      emitter.emit(`  mtc1 ${highBitsReg}, $f13`);
      emitter.emit("  li $v0, 58");
      emitter.emit("  syscall");
      freeReg(context, highBitsReg);
      freeReg(context, lowBitsReg);
      freeReg(context, messageReg);
      return emitVoidResult();
    }
    if (node.callee === "message_dialog_string") {
      const slots = stashArgs();
      loadStashedArgs(slots, ["$a0", "$a1"]);
      emitter.emit("  li $v0, 59");
      emitter.emit("  syscall");
      releaseStashedArgs(slots);
      return emitVoidResult();
    }
    if (node.callee === "contract_old") {
      const argReg = emitExpression(args[0], context);
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, ${argReg}`);
      freeReg(context, argReg);
      return resultReg;
    }
    if (node.callee === "contract_result") {
      const resultReg = allocReg(context, node);
      emitter.emit(`  move ${resultReg}, $v0`);
      return resultReg;
    }
    if (node.callee === "contract_length") {
      const resultReg = allocReg(context, node);
      if (Number.isFinite(node.contractLength) && (node.contractLength | 0) >= 0) {
        emitter.emit(`  li ${resultReg}, ${node.contractLength | 0}`);
      } else {
        emitter.emit(`  move ${resultReg}, $zero`);
      }
      return resultReg;
    }
    throw createDiagnostic(`Unsupported intrinsic '${node.callee}'.`, node, "codegen");
  }

  function deriveGeneratedAsmName(fileName = "untitled.c") {
    const baseName = String(fileName || "untitled.c").trim().replace(/\\/g, "/").split("/").pop() || "untitled.c";
    const stem = baseName.replace(/\.[^.]+$/g, "");
    return `${stem || "program"}.generated.s`;
  }

  function compile(sourceText, options = {}) {
    const rawSource = String(sourceText ?? "");
    const sourceName = String(options.sourceName || "program.c");
    const requestedSubset = String(options.subset || "C0-S4");
    const subset = normalizeSubsetName(requestedSubset);
    const targetAbi = String(options.targetAbi || "o32").toLowerCase() === "o32" ? "o32" : "o32";
    const logs = [];
    const warnings = [];

    if (requestedSubset.trim().toUpperCase() !== subset) {
      warnings.push(`Unknown subset '${requestedSubset}'. Falling back to '${subset}'.`);
    }

    const preprocessed = preprocessUseDirectives(rawSource, {
      sourceName,
      subset,
      includeResolver: options.includeResolver,
      useLibrarySources: options.useLibrarySources
    });
    preprocessed.warnings.forEach((warning) => warnings.push(warning));
    if (preprocessed.diagnostics.length) {
      return {
        ok: false,
        sourceName,
        generatedAsmName: deriveGeneratedAsmName(sourceName),
        asm: "",
        subset,
        targetAbi,
        logs,
        warnings,
        errors: preprocessed.diagnostics
      };
    }
    const contractPreprocessed = preprocessContractAnnotations(preprocessed.source ?? "");
    contractPreprocessed.warnings.forEach((warning) => warnings.push(warning));
    const source = String(contractPreprocessed.source ?? "");
    setDiagnosticSourceContext(sourceName, source);

    const tokenized = tokenize(source);
    if (tokenized.diagnostics.length) {
      return {
        ok: false,
        sourceName,
        generatedAsmName: deriveGeneratedAsmName(sourceName),
        asm: "",
        subset,
        targetAbi,
        logs,
        warnings,
        errors: tokenized.diagnostics
      };
    }

    const parser = createParser(tokenized.tokens);
    const ast = parser.parseProgram();
    if (parser.diagnostics.length) {
      return {
        ok: false,
        sourceName,
        generatedAsmName: deriveGeneratedAsmName(sourceName),
        asm: "",
        subset,
        targetAbi,
        logs,
        warnings,
        errors: parser.diagnostics
      };
    }

    const semantic = analyzeProgram(ast, { subset });
    if (!semantic.ok) {
      return {
        ok: false,
        sourceName,
        generatedAsmName: deriveGeneratedAsmName(sourceName),
        asm: "",
        subset,
        targetAbi,
        logs,
        warnings,
        errors: semantic.diagnostics
      };
    }

    try {
      const asm = generateProgram(ast, {
        sourceName,
        subset,
        targetAbi,
        emitComments: options.emitComments !== false
      });
      logs.push(`Mini-C phase 5 compile succeeded (${sourceName}).`);
      logs.push(`Functions: ${ast.functions.length}`);
      return {
        ok: true,
        sourceName,
        generatedAsmName: deriveGeneratedAsmName(sourceName),
        asm,
        subset,
        targetAbi,
        logs,
        warnings,
        errors: []
      };
    } catch (error) {
      const diagnostic = (error && typeof error === "object" && typeof error.message === "string")
        ? createDiagnostic(error.message, error, error.phase || "codegen")
        : createDiagnostic(String(error || "Unknown Mini-C compiler error."), null, "codegen");
      return {
        ok: false,
        sourceName,
        generatedAsmName: deriveGeneratedAsmName(sourceName),
        asm: "",
        subset,
        targetAbi,
        logs,
        warnings,
        errors: [diagnostic]
      };
    }
  }

  registry.miniCCompiler = Object.freeze({
    isSourceFile(fileName = "") {
      return SOURCE_EXTENSION_PATTERN.test(String(fileName || "").trim());
    },
    deriveGeneratedAsmName,
    defaultTemplate: DEFAULT_TEMPLATE,
    compile
  });
})(typeof window !== "undefined" ? window : globalThis);
