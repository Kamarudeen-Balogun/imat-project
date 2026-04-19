const DB_NAME = "imat-report-upload-db";
const STORE_NAME = "report-upload-queue";
const DB_VERSION = 1;
const SYNC_TAG = "imat-report-upload-sync";

function openQueueDb() {
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

async function getAllQueuedUploads() {
  const db = await openQueueDb();

  const items = await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  db.close();
  return items;
}

async function deleteQueuedUpload(id) {
  const db = await openQueueDb();

  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

  db.close();
}

async function notifyClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    client.postMessage(message);
  }
}

async function uploadPhotosToCloudinary(item) {
  if (!item.photos || item.photos.length === 0) return [];

  const { cloudinaryCloudName, cloudinaryUploadPreset } = item.config || {};
  if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
    throw new Error("Missing Cloudinary config for queued upload.");
  }

  const uploadedUrls = [];

  for (const photo of item.photos) {
    const formData = new FormData();
    formData.append("file", photo.blob, photo.name || "queued-image");
    formData.append("upload_preset", cloudinaryUploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const payload = await response.text().catch(() => "");
      throw new Error(`Cloudinary upload failed: ${payload || response.statusText}`);
    }

    const data = await response.json();
    uploadedUrls.push(data.secure_url);
  }

  return uploadedUrls;
}

async function postDefectToApi(item, photos) {
  const response = await fetch("/api/public-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...item.payload,
      photos,
    }),
  });

  if (!response.ok) {
    const payload = await response.text().catch(() => "");
    throw new Error(`Public report API failed: ${payload || response.statusText}`);
  }
}

async function processQueue() {
  const items = await getAllQueuedUploads();
  if (!items.length) return;

  for (const item of items) {
    try {
      const photos = await uploadPhotosToCloudinary(item);
      await postDefectToApi(item, photos);
      await deleteQueuedUpload(item.id);
      await notifyClients({ type: "REPORT_UPLOAD_SYNC_SUCCESS" });
    } catch (error) {
      console.error("Queued report upload failed", error);
      await notifyClients({ type: "REPORT_UPLOAD_SYNC_PENDING" });
    }
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("sync", (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(processQueue());
  }
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PROCESS_UPLOAD_QUEUE") {
    event.waitUntil(processQueue());
  }
});
