"use client";

import { Toaster } from "react-hot-toast";

export default function ClientToaster() {
  return (
    <Toaster
      position="bottom-center"
      toastOptions={{
        className: "bg-bg2 text-textDefault border border-borderDark font-mono text-sm",
        duration: 4000,
        style: {
          background: "var(--color-bg2)",
          color: "var(--color-text)",
          border: "1px solid var(--color-border-dark)",
          borderRadius: "8px",
        },
      }}
    />
  );
}
