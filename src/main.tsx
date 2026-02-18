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
  // Global error overlay for any runtime/module errors that prevent React from mounting
  function showGlobalError(title: string, details: string) {
    try {
      if (document.getElementById("global-error-overlay")) return;
      const o = document.createElement("div");
      o.id = "global-error-overlay";
      Object.assign(o.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(0,0,0,0.6)",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
      } as any);
      o.innerHTML = `
        <div style="max-width:980px;width:100%;background:#fff;border-radius:8px;padding:20px;box-shadow:0 8px 36px rgba(0,0,0,.4);font-family:system-ui,Segoe UI,Roboto;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;">
            <div>
              <h2 style="margin:0 0 6px;color:#b91c1c">${title}</h2>
              <div style="color:#374151;font-size:13px">An error occurred while starting the app. See details below.</div>
            </div>
            <div style="display:flex;gap:8px">
              <button id="global-error-reload" style="background:#dc2626;color:#fff;border:none;padding:8px 10px;border-radius:6px;cursor:pointer">Reload</button>
              <button id="global-error-copy" style="border:1px solid #e5e7eb;background:#fff;padding:6px 10px;border-radius:6px;cursor:pointer">Copy</button>
            </div>
          </div>
          <pre id="global-error-details" style="margin-top:12px;background:#f3f4f6;padding:12px;border-radius:6px;max-height:60vh;overflow:auto;font-size:12px;color:#111827;white-space:pre-wrap">${details}</pre>
        </div>`;
      document.body.appendChild(o);
      const reloadBtn = document.getElementById("global-error-reload");
      const copyBtn = document.getElementById("global-error-copy");
      if (reloadBtn)
        reloadBtn.addEventListener("click", () => window.location.reload());
      if (copyBtn)
        copyBtn.addEventListener("click", () => {
          const el = document.getElementById("global-error-details");
          if (!el) return;
          try {
            navigator.clipboard.writeText((el as HTMLElement).innerText || "");
            alert("Error copied to clipboard");
          } catch {
            alert("Could not copy");
          }
        });
    } catch (e) {
      // ignore overlay errors
      // eslint-disable-next-line no-console
      console.error("Failed to show global error overlay", e);
    }
  }

  window.addEventListener("error", (ev) => {
    try {
      const msg = (ev && (ev as ErrorEvent).message) || String(ev);
      const stack =
        (ev && (ev as ErrorEvent).error && (ev as any).error.stack) || "";
      // eslint-disable-next-line no-console
      console.error("Global error:", ev);
      showGlobalError("Error", `${msg}\n\n${stack}`);
    } catch (e) {
      // ignore
    }
  });

  window.addEventListener("unhandledrejection", (ev) => {
    try {
      const reason = (ev && (ev as PromiseRejectionEvent).reason) || String(ev);
      // eslint-disable-next-line no-console
      console.error("Unhandled rejection:", reason);
      showGlobalError("Unhandled Promise Rejection", String(reason));
    } catch (e) {
      // ignore
    }
  });

  try {
    createRoot(rootEl).render(<App />);
  } catch (err) {
    // render-time error before React could mount
    // eslint-disable-next-line no-console
    console.error("Error rendering App:", err);
    showGlobalError(
      "Render Error",
      String(err && (err as Error).stack ? (err as Error).stack : String(err)),
    );
  }
}
