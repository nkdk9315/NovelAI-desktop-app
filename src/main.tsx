import "@fontsource-variable/inter";
import "@fontsource/noto-sans-jp/400.css";
import "@fontsource/noto-sans-jp/500.css";
import "@fontsource/noto-sans-jp/700.css";
import "@fontsource-variable/jetbrains-mono";

import "./i18n";
import "./index.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";

// Log uncaught errors to Tauri terminal
window.onerror = (message, source, lineno, colno, error) => {
  console.error("[window.onerror]", message, source, lineno, colno, error?.stack);
};
window.onunhandledrejection = (event) => {
  console.error("[unhandledrejection]", event.reason);
};

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
