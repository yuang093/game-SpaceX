/**
 * sw.js - Service Worker for SpaceX Mission
 * 提供離線遊玩、資源快取、自動更新
 */

const CACHE_VERSION = 'spacex-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

// 預先快取的核心資源（App Shell）
const PRECACHE_URLS = [
    './',
    './index.html',
    './style.css',
    './ui-state.js',
    './physics.js',
    './manifest.json',
    './vercel.json',
    './assets/index.json',
    './assets/ui/icon-192.svg',
    './assets/ui/icon-512.svg'
];

// ================================================
// 安裝：預先快取 App Shell
// ================================================
self.addEventListener('install', (event) => {
    console.log('[SW] 安裝中...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('[SW] 預先快取 App Shell');
                return cache.addAll(PRECACHE_URLS.map(url => new Request(url, { cache: 'reload' })))
                    .catch(err => {
                        console.warn('[SW] 部分資源快取失敗（首次安裝正常）:', err.message);
                    });
            })
            .then(() => self.skipWaiting())
    );
});

// ================================================
// 啟用：清理舊快取
// ================================================
self.addEventListener('activate', (event) => {
    console.log('[SW] 啟用中...');
    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames
                        .filter((name) => name !== STATIC_CACHE && name !== RUNTIME_CACHE)
                        .map((name) => {
                            console.log('[SW] 刪除舊快取:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => self.clients.claim())
    );
});

// ================================================
// 攔截請求：Cache First 策略（圖片），Network First 策略（HTML/JS）
// ================================================
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // 只處理 GET 請求
    if (request.method !== 'GET') return;

    // 跳過非 http/https 協議
    if (!url.protocol.startsWith('http')) return;

    // 圖片 → Cache First
    if (request.destination === 'image' || url.pathname.startsWith('/assets/')) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // HTML/JS/CSS → Network First（確保更新）
    if (request.destination === 'document' || request.destination === 'script' || request.destination === 'style') {
        event.respondWith(networkFirst(request));
        return;
    }

    // 其他 → Network First
    event.respondWith(networkFirst(request));
});

// ================================================
// Cache First：優先使用快取
// ================================================
async function cacheFirst(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        // 離線時回傳預設圖片
        if (request.destination === 'image') {
            return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="#1a1a2e" width="100" height="100"/><text x="50" y="50" text-anchor="middle" fill="#666" font-size="12">離線</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
            );
        }
        throw err;
    }
}

// ================================================
// Network First：優先使用網路
// ================================================
async function networkFirst(request) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(RUNTIME_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (err) {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw err;
    }
}

// ================================================
// 訊息：跳過等待
// ================================================
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});
