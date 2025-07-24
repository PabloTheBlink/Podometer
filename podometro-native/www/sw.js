const CACHE_NAME = 'stepflow-v1.0.0';
const STATIC_CACHE = 'stepflow-static-v1.0.0';
const DYNAMIC_CACHE = 'stepflow-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap',
  'https://unpkg.com/lucide@latest/dist/umd/lucide.js'
];

// Files to cache on demand
const DYNAMIC_FILES = [
  'https://fonts.gstatic.com/',
  'https://fonts.googleapis.com/'
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('Static files cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Error caching static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('Old caches cleaned up');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve cached files or fetch from network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-HTTP requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Handle different types of requests
  if (isStaticFile(request.url)) {
    // Static files - cache first strategy
    event.respondWith(cacheFirst(request));
  } else if (isDynamicFile(request.url)) {
    // Dynamic files (fonts, external resources) - network first with cache fallback
    event.respondWith(networkFirst(request));
  } else {
    // Other requests - network first
    event.respondWith(networkFirst(request));
  }
});

// Cache first strategy - for static files
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.error('Cache first strategy failed:', error);
    // Return offline page or error response
    return new Response('Offline - Content not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Network first strategy - for dynamic content
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline response for navigation requests
    if (request.mode === 'navigate') {
      const cache = await caches.open(STATIC_CACHE);
      return cache.match('./');
    }
    
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

// Helper functions
function isStaticFile(url) {
  return STATIC_FILES.some(file => url.includes(file.replace('./', ''))) ||
         url.includes('index.html') ||
         url.includes('manifest.json') ||
         url.includes('.png') ||
         url.includes('.jpg') ||
         url.includes('.css') ||
         url.includes('.js');
}

function isDynamicFile(url) {
  return DYNAMIC_FILES.some(pattern => url.includes(pattern)) ||
         url.includes('fonts.googleapis.com') ||
         url.includes('fonts.gstatic.com') ||
         url.includes('cdn.tailwindcss.com') ||
         url.includes('unpkg.com');
}

// Background sync for step data
self.addEventListener('sync', (event) => {
  if (event.tag === 'step-data-sync') {
    event.waitUntil(syncStepData());
  }
});

async function syncStepData() {
  try {
    // Get pending step data from IndexedDB or localStorage
    const pendingData = await getPendingStepData();
    
    if (pendingData && pendingData.length > 0) {
      // Sync data when online
      for (const data of pendingData) {
        await syncSingleStepRecord(data);
      }
      
      // Clear pending data after successful sync
      await clearPendingStepData();
      console.log('Step data synced successfully');
    }
  } catch (error) {
    console.error('Error syncing step data:', error);
  }
}

async function getPendingStepData() {
  // This would typically read from IndexedDB
  // For now, return empty array as this is a client-side only app
  return [];
}

async function syncSingleStepRecord(data) {
  // This would typically send data to a server
  // For now, just log the data
  console.log('Syncing step record:', data);
}

async function clearPendingStepData() {
  // This would typically clear IndexedDB records
  console.log('Cleared pending step data');
}

// Handle push notifications (for future features)
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  const options = {
    body: data.body || 'You have a new notification from StepFlow',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: 'stepflow-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View App',
        icon: './icon-192.png'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'StepFlow', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        if (clientList.length > 0) {
          return clientList[0].focus();
        }
        return clients.openWindow('./');
      })
    );
  }
});

// Periodic background sync (for step counting when app is closed)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'step-count-sync') {
    event.waitUntil(performPeriodicStepSync());
  }
});

async function performPeriodicStepSync() {
  try {
    // This would typically update step count in the background
    // For now, just log the sync
    console.log('Performing periodic step sync');
    
    // Notify all clients about the sync
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'BACKGROUND_SYNC',
        timestamp: Date.now()
      });
    });
  } catch (error) {
    console.error('Error in periodic step sync:', error);
  }
}