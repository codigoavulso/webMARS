export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();

  const getState = () => state;

  const setState = (patch) => {
    state = { ...state, ...patch };
    listeners.forEach((listener) => listener(state));
  };

  const update = (updater) => {
    state = updater(state);
    listeners.forEach((listener) => listener(state));
  };

  const subscribe = (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  return {
    getState,
    setState,
    update,
    subscribe
  };
}
