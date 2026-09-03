(() => {
  const globalScope = typeof window !== "undefined" ? window : globalThis;
  const APP_NAME = "webMARS";
  const APP_VERSION = "0.6.1";
  const VERSION_TOKEN = "__WEBMARS_APP_VERSION__";

  function replaceVersionToken(value) {
    if (typeof value !== "string" || value.indexOf(VERSION_TOKEN) === -1) return value;
    return value.split(VERSION_TOKEN).join(APP_VERSION);
  }

  function withVersion(value) {
    const source = String(value || "");
    if (!source || /^(?:data:|blob:|#)/i.test(source) || /(?:[?&])v=/.test(source)) return source;
    const separator = source.includes("?") ? "&" : "?";
    return `${source}${separator}v=${encodeURIComponent(APP_VERSION)}`;
  }

  function applyVersionTokens(rootDocument = document) {
    const rootElement = rootDocument?.documentElement;
    // Elements that belong to an iframe have a different JavaScript realm, so
    // they fail an `instanceof HTMLElement` check made in the parent window.
    // Use the DOM surface we need instead, which works for both documents.
    if (!rootElement || typeof rootElement.querySelectorAll !== "function") return;

    if (typeof rootDocument.title === "string") {
      rootDocument.title = replaceVersionToken(rootDocument.title);
    }

    const attributeNames = ["content", "title", "aria-label", "value", "placeholder"];
    rootElement.querySelectorAll("*").forEach((node) => {
      if (typeof node?.getAttribute !== "function" || typeof node?.setAttribute !== "function") return;
      attributeNames.forEach((attributeName) => {
        const current = node.getAttribute(attributeName);
        if (typeof current !== "string") return;
        const next = replaceVersionToken(current);
        if (next !== current) node.setAttribute(attributeName, next);
      });
    });

    if (typeof rootDocument.createTreeWalker !== "function") return;
    const showText = rootDocument.defaultView?.NodeFilter?.SHOW_TEXT
      ?? globalScope.NodeFilter?.SHOW_TEXT
      ?? 4;
    const walker = rootDocument.createTreeWalker(rootElement, showText, null);
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
    withVersion,
    applyVersionTokens
  });

  if (typeof document !== "undefined") {
    applyVersionTokens(document);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => applyVersionTokens(document), { once: true });
    }
  }
})();
