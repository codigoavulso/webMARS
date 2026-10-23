// Small, synchronous editor metadata; the compiler engine loads on demand.
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  if (registry.miniCInterface) return;
  const defaultTemplate = [
    "#include <stdio.h>", "", "int fact(int n) {", "  if (n <= 1) return 1;",
    "  return n * fact(n - 1);", "}", "", "int main(void) {",
    "  int value = fact(5);", "  print_int(value);", "  print_char(10);",
    "  return 0;", "}", ""
  ].join("\n");
  function deriveGeneratedAsmName(fileName = "untitled.c") {
    const baseName = String(fileName || "untitled.c").trim().replace(/\\/g, "/").split("/").pop() || "untitled.c";
    const stem = baseName.replace(/\.[^.]+$/g, "");
    return `${stem || "program"}.generated.s`;
  }
  const sourceUrl = root.document?.currentScript?.src;
  let pending = null;
  function load() {
    if (registry.miniCCompiler) return Promise.resolve(registry.miniCCompiler);
    if (pending) return pending;
    pending = new Promise((resolve, reject) => {
      const script = root.document.createElement("script");
      const path = sourceUrl ? new URL("17-mini-c-compiler.js", sourceUrl).href : "./assets/js/app-modules/17-mini-c-compiler.js";
      script.src = root.WebMarsAppVersion?.withVersion?.(path) || path;
      script.async = true;
      let timer;
      function finish(error) {
        root.clearTimeout(timer);
        script.onload = script.onerror = null;
        if (error) { script.remove(); reject(error); }
        else resolve(registry.miniCCompiler);
      }
      const failure = () => finish(new Error(root.WebMarsI18n?.t?.("Failed to load file.") || "Failed to load file."));
      script.onload = () => typeof registry.miniCCompiler?.compile === "function" ? finish() : failure();
      script.onerror = failure;
      timer = root.setTimeout(failure, 15000);
      root.document.head.appendChild(script);
    });
    pending = pending.catch(error => { pending = null; throw error; });
    return pending;
  }
  registry.miniCInterface = Object.freeze({ defaultTemplate, deriveGeneratedAsmName,
    isSourceFile: name => /\.(c|c0)$/i.test(String(name || "").trim()), load });
})();
