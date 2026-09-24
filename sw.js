/* 打刻アプリ service worker — キャッシュのみ（ロジックは index.html に集約）
   バージョンは index.html の APP_VERSION から sw.js?v=x.y.z で受け取る */
'use strict';
const VER = new URLSearchParams(self.location.search).get('v') || '0';
const CACHE = 'dakoku-' + VER;
const ASSETS = ['./', './index.html', './manifest.json', './icon-180.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k.startsWith('dakoku-') && k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  // 外部（院内保管庫の Mac mini 等）への通信には手を出さない。横取りすると Mac mini の返事
  // （職員の記録）が iPad のキャッシュに残り、つながらない時に古い内容を最新のように返してしまう
  if (new URL(e.request.url).origin !== location.origin) return;
  // ネット優先・失敗時キャッシュ（更新は同一URL上書き運用のため常に最新を試す）
  e.respondWith(
    fetch(e.request).then(r => {
      const copy = r.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(e.request, {ignoreSearch: true}))
  );
});
