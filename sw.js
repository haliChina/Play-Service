// Service Worker: 绕过浏览器缓存，确保总是加载最新的 JS/CSS 文件
const CACHE_NAME = 'bypass-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((key) => caches.delete(key)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  // 只拦截同源请求
  if (url.origin !== self.location.origin) return;

  // 对 JS 和 CSS 文件，总是从网络获取最新版本
  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then((response) => {
          // 返回新响应（不能直接缓存）
          return response;
        })
        .catch(() => {
          // 网络失败时尝试缓存
          return caches.match(event.request);
        })
    );
  }
});
