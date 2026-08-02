(function initUiTranslationModule(rootScope) {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);
  const registry = root.WebMarsModules || (root.WebMarsModules = {});

  function translateStaticTree(rootNode) {
    if (!rootNode || typeof document === "undefined") return () => {};
    const textNodes = [];
    const attributes = [];
    const walker = document.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const original = node.nodeValue;
      if (original && original.trim()) {
        const parentTag = node.parentElement?.tagName || "";
        if (parentTag !== "SCRIPT" && parentTag !== "STYLE") {
          // Markup indentation lands inside the text node, so the raw value is
          // not the catalog key. Look the trimmed text up and put the original
          // padding back, otherwise "<label><input> Draw hash marks</label>"
          // and every label written across several lines silently stay English.
          const leading = original.slice(0, original.length - original.trimStart().length);
          const trailing = original.slice(original.trimEnd().length);
          textNodes.push({ node, key: original.trim(), leading, trailing });
        }
      }
      node = walker.nextNode();
    }

    rootNode.querySelectorAll("[title],[aria-label],[placeholder]").forEach((element) => {
      ["title", "aria-label", "placeholder"].forEach((attribute) => {
        if (!element.hasAttribute(attribute)) return;
        const value = element.getAttribute(attribute);
        if (!value || !value.trim()) return;
        attributes.push({ element, attribute, key: value });
      });
    });

    const refresh = () => {
      textNodes.forEach((entry) => {
        if (!entry.node?.isConnected) return;
        entry.node.nodeValue = `${entry.leading}${translateText(entry.key)}${entry.trailing}`;
      });

      attributes.forEach((entry) => {
        if (!entry.element?.isConnected) return;
        entry.element.setAttribute(entry.attribute, translateText(entry.key));
      });
    };

    refresh();
    return refresh;
  }

  registry.uiTranslation = Object.freeze({
    translateStaticTree
  });

  root.translateStaticTree = translateStaticTree;
})(typeof window !== "undefined" ? window : globalThis);
