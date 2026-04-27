const PUSH_BROWSER_KEY_STORAGE = "imat_push_browser_key_v1";
const PUSH_SUBSCRIPTION_ROUTE = "/api/push-subscriptions";
const PUSH_SERVICE_WORKER_PATH = "/upload-sync-sw.js";

type PushSubscriptionJson = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
};

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

export function isPushNotificationSupported() {
  return (
    typeof window !== "undefined" &&
    window.isSecureContext &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getOrCreatePushBrowserKey() {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(PUSH_BROWSER_KEY_STORAGE);
  if (existing) {
    return existing;
  }

  const nextKey = window.crypto.randomUUID();
  window.localStorage.setItem(PUSH_BROWSER_KEY_STORAGE, nextKey);
  return nextKey;
}

export async function ensurePushServiceWorker() {
  if (!isPushNotificationSupported()) {
    throw new Error("Browser push notifications are not supported in this browser.");
  }

  return navigator.serviceWorker.register(PUSH_SERVICE_WORKER_PATH);
}

async function getPushSubscriptionJson() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("Push notifications are not configured.");
  }

  const registration = await ensurePushServiceWorker();
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  return subscription.toJSON() as PushSubscriptionJson;
}

async function persistSubscription(enabled: boolean, subscription?: PushSubscriptionJson) {
  const response = await fetch(PUSH_SUBSCRIPTION_ROUTE, {
    method: enabled ? "POST" : "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      browserKey: getOrCreatePushBrowserKey(),
      subscription,
    }),
  });

  if (!response.ok) {
    const payloadText = await response.text().catch(() => "");

    if (payloadText) {
      try {
        const parsed = JSON.parse(payloadText) as { error?: string };
        if (parsed.error) {
          throw new Error(parsed.error);
        }
      } catch {
        throw new Error(payloadText);
      }
    }

    throw new Error("Failed to update push subscription.");
  }
}

export async function enableBrowserPushNotifications() {
  if (!isPushNotificationSupported()) {
    throw new Error("Browser push notifications are not supported in this browser.");
  }

  if (Notification.permission === "default") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      throw new Error("Browser notification permission was not granted.");
    }
  }

  if (Notification.permission === "denied") {
    throw new Error("Browser notifications are blocked. Please allow them in browser settings.");
  }

  const subscription = await getPushSubscriptionJson();
  await persistSubscription(true, subscription);
}

export async function disableBrowserPushNotifications() {
  if (!isPushNotificationSupported()) {
    return;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }

  await persistSubscription(false);
}