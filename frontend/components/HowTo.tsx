"use client";

import { useEffect, useState } from "react";

// Compact, dismissible inline guide — teaches first-time readers, disappears on
// return visits (stored per-page in localStorage).
export function HowTo({
  id,
  title,
  steps,
}: {
  id: string;
  title: string;
  steps: (string | React.ReactNode)[];
}) {
  const [open, setOpen] = useState(true);
  const key = `gazette_howto_${id}`;

  useEffect(() => {
    if (localStorage.getItem(key) === "closed") setOpen(false);
  }, [key]);

  function close() {
    setOpen(false);
    localStorage.setItem(key, "closed");
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); localStorage.removeItem(key); }}
        className="btn-quiet"
        style={{ fontSize: 12, padding: "4px 10px", marginBottom: 24 }}
      >
        Show how this works
      </button>
    );
  }

  return (
    <aside
      style={{
        borderLeft: "3px solid var(--stamp)",
        background: "var(--canvas-soft)",
        padding: "16px 20px",
        marginBottom: 32,
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
        <div className="sans-sm-strong" style={{ textTransform: "uppercase", letterSpacing: "1px", color: "var(--stamp)" }}>
          How this works · {title}
        </div>
        <button
          onClick={close}
          aria-label="Dismiss"
          style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, fontSize: 18, lineHeight: 1, color: "var(--ink-soft)" }}
        >
          ×
        </button>
      </div>
      <ol style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 20 }}>
        {steps.map((s, i) => (
          <li key={i} className="serif-body" style={{ fontSize: 14, lineHeight: 1.6 }}>{s}</li>
        ))}
      </ol>
    </aside>
  );
}
