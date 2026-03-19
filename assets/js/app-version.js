(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const APP_NAME = "webMARS";
  const APP_VERSION = "0.4.5";
  const VERSION_TOKEN = "__WEBMARS_APP_VERSION__";

  function replaceVersionToken(value) {
    if (typeof value !== "string" || value.indexOf(VERSION_TOKEN) === -1) return value;
    return value.split(VERSION_TOKEN).join(APP_VERSION);
  }

  function applyVersionTokens(rootDocument = document) {
    if (!rootDocument || !(rootDocument.documentElement instanceof HTMLElement)) return;

    if (typeof rootDocument.title === "string") {
      rootDocument.title = replaceVersionToken(rootDocument.title);
    }

    const rootElement = rootDocument.documentElement;
    const attributeNames = ["content", "title", "aria-label", "value", "placeholder"];
    rootElement.querySelectorAll("*").forEach((node) => {
      if (!(node instanceof HTMLElement)) return;
      attributeNames.forEach((attributeName) => {
        const current = node.getAttribute(attributeName);
        if (typeof current !== "string") return;
        const next = replaceVersionToken(current);
        if (next !== current) node.setAttribute(attributeName, next);
      });
    });

    const walker = rootDocument.createTreeWalker(rootElement, NodeFilter.SHOW_TEXT, null);
    let textNode = walker.nextNode();
    while (textNode) {
      const parentTag = textNode.parentElement?.tagName;
      if (parentTag !== "SCRIPT" && parentTag !== "STYLE") {
        const current = textNode.nodeValue || "";
        const next = replaceVersionToken(current);
        if (next !== current) textNode.nodeValue = next;
      }
      textNode = walker.nextNode();
    }
  }

  globalScope.WebMarsAppVersion = Object.freeze({
    name: APP_NAME,
    version: APP_VERSION,
    token: VERSION_TOKEN,
    label: `${APP_NAME} ${APP_VERSION}`,
    replaceVersionToken,
    applyVersionTokens
  });

  if (typeof document !== "undefined") {
    applyVersionTokens(document);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => applyVersionTokens(document), { once: true });
    }
  }
})();
