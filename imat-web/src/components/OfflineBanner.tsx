"use client";

import { WifiOff, Wifi, AlertCircle } from "lucide-react";
import { useOfflineSync } from "@/hooks/useOfflineSync";
import { useEffect, useState } from "react";

export function OfflineBanner() {
  const { isOnline, hasDraft } = useOfflineSync();
  const [show, setShow] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    if (!isOnline) {
      setShow(true);
      setJustCameOnline(false);
    } else if (show) {
      // Was offline, now online
      setJustCameOnline(true);
      const t = setTimeout(() => {
        setShow(false);
        setJustCameOnline(false);
      }, 4000);
      return () => clearTimeout(t);
    }
  }, [isOnline, show]);

  if (!show) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-[9999] py-2 px-4 flex items-center justify-center gap-2 text-sm font-bold transition-colors duration-500 ${
        justCameOnline
          ? "bg-success text-bg"
          : "bg-danger text-white"
      }`}
    >
      {justCameOnline ? (
        <>
          <Wifi size={16} className="shrink-0" />
          Connection restored!{hasDraft ? " Syncing draft assessment..." : " You are back online."}
        </>
      ) : (
        <>
          <WifiOff size={16} className="shrink-0" />
          Offline — Assessment form is still usable. Draft will sync when you reconnect.
          {hasDraft && (
            <span className="ml-2 flex items-center gap-1 text-yellow-200">
              <AlertCircle size={14} /> Draft saved locally
            </span>
          )}
        </>
      )}
    </div>
  );
}
