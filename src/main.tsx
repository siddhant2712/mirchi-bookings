import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  // Helpful runtime log when the app can't mount
  // (prevents a silent blank page in the browser)
  // eslint-disable-next-line no-console
  console.error("Root element with id 'root' not found. App cannot mount.");
} else {
  createRoot(rootEl).render(<App />);
}
