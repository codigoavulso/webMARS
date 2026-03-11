(function initCoreStoreModule(rootScope) {
  const root = rootScope || (typeof window !== "undefined" ? window : globalThis);
  const registry = root.WebMarsModules || (root.WebMarsModules = {});
  if (registry.coreStore && typeof registry.coreStore.createStore === "function") return;

  function createStore(initialState) {
    let state = { ...initialState };
    const listeners = new Set();

    return {
      getState: () => state,
      setState: (patch) => {
        state = { ...state, ...patch };
        listeners.forEach((listener) => listener(state));
      },
      subscribe: (listener) => {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };
  }

  registry.coreStore = Object.freeze({
    createStore
  });
})(typeof window !== "undefined" ? window : globalThis);
