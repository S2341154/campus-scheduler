// ===== Service Worker: 時間割アプリ =====
const CACHE_NAME = 'campus-scheduler-v2';
const CACHE_URLS = ['./'];

// インストール
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

// アクティベート（古いキャッシュ削除）
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// フェッチ（キャッシュファースト）
self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// メインアプリからのメッセージ受信
const scheduledTimers = [];

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    cancelAll();
    scheduleAll(e.data.notifications || []);
    // 受信確認を返す
    if (e.source) e.source.postMessage({ type: 'NOTIFICATIONS_SCHEDULED', count: (e.data.notifications || []).length });
  }
  if (e.data.type === 'CANCEL_NOTIFICATIONS') {
    cancelAll();
  }
  if (e.data.type === 'TEST_NOTIFICATION') {
    self.registration.showNotification('🔔 テスト通知', {
      body: '通知は正常に動作しています！',
      icon: './icon-192.png',
      tag: 'test',
    });
  }
});

function cancelAll() {
  scheduledTimers.forEach(id => clearTimeout(id));
  scheduledTimers.length = 0;
}

function scheduleAll(notifications) {
  const now = Date.now();
  notifications.forEach(n => {
    const delay = n.fireAt - now;
    if (delay <= 0) return;
    const id = setTimeout(() => {
      self.registration.showNotification(n.title, {
        body: n.body,
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: n.tag || 'notify',
        renotify: true,
        data: { url: n.url || './' }
      });
    }, delay);
    scheduledTimers.push(id);
  });
}

// 通知タップでアプリを開く
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('campus-scheduler'));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
