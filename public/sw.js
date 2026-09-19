self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { title: 'New message' }; }
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // Skip only when the user is already looking at that exact inbox.
    if (windows.some((client) => client.focused && client.visibilityState === 'visible' && new URL(client.url).pathname === data.url)) return;
    await self.registration.showNotification(data.title || 'New message', {
      body: data.body || '',
      icon: '/leadoslogo.png',
      tag: `inbox-${data.url}-${data.leadId}`,
      renotify: true,
      data: { url: data.url || '/inbox', leadId: data.leadId },
    });
  })());
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, leadId } = event.notification.data || {};
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    if (windows.length) {
      const client = windows[0];
      await client.focus();
      client.postMessage({ type: 'open-inbox', url, leadId });
    } else {
      await self.clients.openWindow(`${url}?lead=${encodeURIComponent(leadId || '')}`);
    }
  })());
});
