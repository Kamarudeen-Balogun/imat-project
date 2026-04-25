"use client";

import { useEffect, useId, useRef } from "react";
import { TURNSTILE_DEV_BYPASS_TOKEN, isTurnstileDevBypassEnabled } from "@/lib/turnstile";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: Record<string, unknown>) => string;
      reset: (widgetId?: string) => void;
      remove?: (widgetId: string) => void;
    };
  }
}

type TurnstileWidgetProps = {
  onTokenChange?: (token: string) => void;
  onError?: () => void;
  theme?: "light" | "dark" | "auto";
  className?: string;
};

let turnstileScriptPromise: Promise<void> | null = null;

function loadTurnstileScript() {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (window.turnstile) {
    return Promise.resolve();
  }

  if (turnstileScriptPromise) {
    return turnstileScriptPromise;
  }

  turnstileScriptPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>('script[data-turnstile="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), { once: true });
      existingScript.addEventListener("error", () => reject(new Error("Turnstile script failed to load")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
    script.async = true;
    script.defer = true;
    script.dataset.turnstile = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Turnstile script failed to load"));
    document.head.appendChild(script);
  });

  return turnstileScriptPromise;
}

export default function TurnstileWidget({ onTokenChange, onError, theme = "auto", className = "" }: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const elementId = useId();
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const devBypassEnabled = isTurnstileDevBypassEnabled();

  useEffect(() => {
    if (devBypassEnabled) {
      onTokenChange?.(TURNSTILE_DEV_BYPASS_TOKEN);
      return;
    }

    if (!siteKey || !containerRef.current) {
      return;
    }

    let isMounted = true;

    const renderWidget = async () => {
      try {
        await loadTurnstileScript();

        if (!isMounted || !containerRef.current || !window.turnstile) {
          return;
        }

        containerRef.current.innerHTML = "";
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          theme,
          callback: (token: string) => onTokenChange?.(token),
          "error-callback": () => onError?.(),
          "expired-callback": () => onTokenChange?.(""),
        });
      } catch {
        onTokenChange?.("");
        onError?.();
      }
    };

    void renderWidget();

    return () => {
      isMounted = false;
      if (widgetIdRef.current && window.turnstile?.remove) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, [devBypassEnabled, onError, onTokenChange, siteKey, theme]);

  if (devBypassEnabled) {
    return (
      <div className={`rounded-lg border border-dashed border-borderDark bg-bg2 p-4 text-xs text-text3 ${className}`.trim()}>
        Turnstile bypass is enabled for local testing.
      </div>
    );
  }

  if (!siteKey) {
    return (
      <div className={`rounded-lg border border-dashed border-borderDark bg-bg2 p-4 text-xs text-text3 ${className}`.trim()}>
        Turnstile is not configured. Add NEXT_PUBLIC_TURNSTILE_SITE_KEY to enable bot protection.
      </div>
    );
  }

  return <div id={elementId} ref={containerRef} className={className} />;
}