(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const previous = (root && typeof root.WebMarsLayoutConfig === "object" && root.WebMarsLayoutConfig)
    ? root.WebMarsLayoutConfig
    : {};

  const STACKED_BREAKPOINT_PX = 800;
  const COMPACT_BREAKPOINT_PX = Number(previous.COMPACT_BREAKPOINT_PX) > 0
    ? Number(previous.COMPACT_BREAKPOINT_PX)
    : 500;

  root.WebMarsLayoutConfig = Object.freeze({
    ...previous,
    STACKED_BREAKPOINT_PX,
    STACKED_MAX_WIDTH_PX: Math.max(0, STACKED_BREAKPOINT_PX - 1),
    COMPACT_BREAKPOINT_PX
  });
})();
