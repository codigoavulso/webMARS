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
          textNodes.push({ node, key: original });
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
        entry.node.nodeValue = translateText(entry.key);
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
