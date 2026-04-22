// ===== Service Worker: 時間割通知 =====
const CACHE_NAME = 'campus-scheduler-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// メインアプリからのメッセージを受信
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SCHEDULE_NOTIFICATIONS') {
    scheduleAll(e.data.notifications);
  }
  if (e.data && e.data.type === 'CANCEL_NOTIFICATIONS') {
    cancelAll();
  }
});

// スケジュール済みタイマーID一覧（再起動で消えるが許容）
const timers = [];

function cancelAll() {
  timers.forEach(id => clearTimeout(id));
  timers.length = 0;
}

function scheduleAll(notifications) {
  cancelAll();
  const now = Date.now();
  notifications.forEach(n => {
    const delay = n.fireAt - now;
    if (delay <= 0) return; // 過去はスキップ
    const id = setTimeout(() => {
      self.registration.showNotification(n.title, {
        body: n.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: n.tag || 'class-notify',
        renotify: false,
        requireInteraction: false,
        data: { url: n.url || '/' }
      });
    }, delay);
    timers.push(id);
  });
  console.log(`[SW] Scheduled ${notifications.length} notification(s)`);
}

// 通知タップでアプリを開く
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || '/';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const existing = clients.find(c => c.url.includes('campus-scheduler'));
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
