export type QueuedReportPhoto = {
  name: string;
  type: string;
  blob: Blob;
};

export type QueuedReportPayload = {
  title: string;
  category: string;
  defect_type: string;
  severity: number;
  campus_zone_id: string | null;
  affected_area_sqm: number | null;
  description: string;
  location_lat: number | null;
  location_lng: number | null;
};

export type QueuedReportUpload = {
  id: string;
  createdAt: string;
  payload: QueuedReportPayload;
  photos: QueuedReportPhoto[];
  verification: {
    turnstileToken: string;
    honeypot: string;
  };
  config: {
    cloudinaryCloudName: string;
    cloudinaryUploadPreset: string;
  };
};

const DB_NAME = "imat-report-upload-db";
const STORE_NAME = "report-upload-queue";
const DB_VERSION = 1;

function openQueueDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueueReportUpload(item: QueuedReportUpload): Promise<void> {
  const db = await openQueueDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(item);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  db.close();
}

export async function getQueuedUploadCount(): Promise<number> {
  const db = await openQueueDb();

  const count = await new Promise<number>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();

    request.onsuccess = () => resolve(request.result ?? 0);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return count;
}

export async function setTurnstileTokenForNextQueuedUpload(token: string, honeypot: string): Promise<boolean> {
  if (!token.trim()) {
    return false;
  }

  const db = await openQueueDb();

  const updated = await new Promise<boolean>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = (request.result ?? []) as QueuedReportUpload[];
      if (!items.length) {
        resolve(false);
        return;
      }

      const sorted = items
        .slice()
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      const nextItem = sorted[0];
      const patched: QueuedReportUpload = {
        ...nextItem,
        verification: {
          turnstileToken: token.trim(),
          honeypot,
        },
      };

      store.put(patched);
      resolve(true);
    };

    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  db.close();
  return updated;
}
