import { api } from './api.js';

const supported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const urlBase64ToUint8Array = (base64) => {
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (char) => char.charCodeAt(0));
};

// Subscribes this browser to background push. Call only while logged in.
export async function enablePush() {
  if (!supported() || Notification.permission !== 'granted') return;
  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    await navigator.serviceWorker.ready;
    const { publicKey } = await api.request('/api/push/public-key');
    if (!publicKey) return;
    const subscription = (await registration.pushManager.getSubscription())
      || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) });
    await api.request('/api/push/subscribe', { method: 'POST', body: JSON.stringify({ subscription }) });
  } catch (error) {
    console.warn('Push setup failed:', error.message);
  }
}

// Must run BEFORE the auth token is cleared, so logged-out users stop getting alerts.
export async function disablePush() {
  if (!supported()) return;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return;
    await api.request('/api/push/unsubscribe', { method: 'POST', body: JSON.stringify({ endpoint: subscription.endpoint }) }).catch(() => {});
    await subscription.unsubscribe();
  } catch { /* best-effort */ }
}
