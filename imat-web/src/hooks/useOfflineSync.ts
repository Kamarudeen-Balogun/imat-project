"use client";

import { useEffect, useState } from "react";
import { set, get, del } from "idb-keyval";

const DRAFT_KEY = "imat_defect_draft";

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(true);
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Check if a saved draft exists
    get(DRAFT_KEY).then((draft) => {
      if (draft) setHasDraft(true);
    });

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const saveDraft = async (data: Record<string, unknown>) => {
    await set(DRAFT_KEY, { ...data, savedAt: new Date().toISOString() });
    setHasDraft(true);
  };

  const loadDraft = async (): Promise<Record<string, unknown> | undefined> => {
    return await get(DRAFT_KEY);
  };

  const clearDraft = async () => {
    await del(DRAFT_KEY);
    setHasDraft(false);
  };

  return { isOnline, hasDraft, saveDraft, loadDraft, clearDraft };
}
