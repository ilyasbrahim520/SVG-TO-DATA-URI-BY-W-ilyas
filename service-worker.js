const CACHE_NAME = 'svg-uri-cache-v2';
const urlsToCache = [
  // الصفحات الأساسية
  '/',
  '/index.html',
  './index.html',
  
  // ملفات CSS و JS
  '/style.css',
  './style.css',
  '/script.js',
  './script.js',
  
  // الصور والأيقونات
  '/favicon.png',
  './favicon.png',
  '/favicon-512.png',
  './favicon-512.png',
  '/W-LOGO.svg',
  './W-LOGO.svg',
  '/load.svg',
  './load.svg',
  '/preview-img.jpg',
  './preview-img.jpg',
  '/preview.png',
  './preview.png',
  
  // الملفات الإضافية
  '/manifest.json',
  './manifest.json'
];

// تثبيت Service Worker وتخزين الملفات
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: All files cached successfully');
        // إجبار التفعيل الفوري للـ Service Worker الجديد
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Failed to cache files:', error);
      })
  );
});

// تفعيل Service Worker والتحكم في الصفحات
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // حذف الـ cache القديم
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activated successfully');
      // السيطرة على جميع الصفحات فوراً
      return self.clients.claim();
    })
  );
});

// اعتراض طلبات الشبكة
self.addEventListener('fetch', event => {
  console.log('Service Worker: Fetching:', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // إذا وُجد الملف في الـ cache، أرجعه
        if (response) {
          console.log('Service Worker: Found in cache:', event.request.url);
          return response;
        }
        
        // إذا لم يوجد في الـ cache، جرب تحميله من الشبكة
        console.log('Service Worker: Fetching from network:', event.request.url);
        return fetch(event.request)
          .then(response => {
            // تأكد من أن الاستجابة صالحة
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }
            
            // انسخ الاستجابة لأنها قابلة للقراءة مرة واحدة فقط
            const responseToCache = response.clone();
            
            // أضف الاستجابة إلى الـ cache
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('Service Worker: Network fetch failed:', error);
            
            // إذا فشل التحميل من الشبكة، أرجع صفحة خطأ مخصصة
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // للملفات الأخرى، أرجع استجابة خطأ
            return new Response('Network error happened', {
              status: 408,
              headers: { 'Content-Type': 'text/plain' }
            });
          });
      })
  );
});

// معالجة رسائل من الصفحة الرئيسية
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_CACHE_STATUS') {
    caches.open(CACHE_NAME).then(cache => {
      cache.keys().then(keys => {
        event.ports[0].postMessage({
          type: 'CACHE_STATUS',
          cached: keys.length,
          total: urlsToCache.length
        });
      });
    });
  }
});

// معالجة تحديثات الـ Service Worker
self.addEventListener('controllerchange', () => {
  console.log('Service Worker: Controller changed');
  window.location.reload();
});
