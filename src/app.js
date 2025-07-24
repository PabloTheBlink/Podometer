import AppController from './controllers/AppController.js';

const $app = document.getElementById("app");
AppController.render($app);

// Registrar Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registrado:', registration.scope);
        
        // Escuchar actualizaciones
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Nueva versión disponible
              showUpdateNotification();
            }
          });
        });
      })
      .catch((error) => {
        console.log('Error registrando Service Worker:', error);
      });
  });
  
  // Escuchar mensajes del Service Worker
  navigator.serviceWorker.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'NEW_VERSION_AVAILABLE') {
      showUpdateNotification();
    }
  });
}

// Mostrar notificación de actualización
function showUpdateNotification() {
  // Crear notificación simple
  const notification = document.createElement('div');
  notification.innerHTML = `
    <div style="position: fixed; top: 20px; left: 50%; transform: translateX(-50%); 
                background: #007AFF; color: white; padding: 12px 20px; 
                border-radius: 8px; z-index: 1000; font-family: -apple-system, BlinkMacSystemFont, sans-serif;">
      <div style="margin-bottom: 8px;">Nueva versión disponible</div>
      <button onclick="updateApp()" style="background: white; color: #007AFF; border: none; 
                     padding: 6px 12px; border-radius: 4px; font-weight: bold; cursor: pointer;">
        Actualizar
      </button>
      <button onclick="dismissUpdate()" style="background: transparent; color: white; border: none; 
                     padding: 6px 12px; cursor: pointer; margin-left: 8px;">
        Después
      </button>
    </div>
  `;
  
  document.body.appendChild(notification);
  
  // Auto-dismiss después de 10 segundos
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 10000);
}

// Función global para actualizar
window.updateApp = function() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
};

// Función global para dismiss
window.dismissUpdate = function() {
  const notification = document.querySelector('div[style*="position: fixed"]');
  if (notification) {
    notification.parentNode.removeChild(notification);
  }
};
