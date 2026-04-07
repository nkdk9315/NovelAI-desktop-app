import "@testing-library/jest-dom/vitest";

// Radix UI primitives (Slider etc.) require ResizeObserver
globalThis.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
