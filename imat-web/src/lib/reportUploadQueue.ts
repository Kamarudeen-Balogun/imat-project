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
