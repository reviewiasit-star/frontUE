import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { setupOfflineFetch } from './utils/offlineFetch'
import { cleanOldRequests } from './utils/offlineStorage'

import App from './App.jsx'

// Configurar fetch offline (solo una vez)
if (typeof window !== 'undefined') {
  setupOfflineFetch();

  // Limpiar requests antiguos al iniciar (sin bloquear)
  cleanOldRequests().catch(console.error);
}

// Registrar Service Worker para PWA
if ('serviceWorker' in navigator) {
  try {
    const updateSW = registerSW({
      onNeedRefresh() {
        console.log('Nueva versión disponible. Recargando...');
        // Opcional: mostrar notificación al usuario
        if (confirm('Hay una nueva versión disponible. ¿Deseas actualizar ahora?')) {
          updateSW(true);
        }
      },
      onOfflineReady() {
        // Aplicación lista para funcionar offline
      },
      onRegistered(registration) {
        // Service Worker registrado exitosamente
      },
      onRegisterError(error) {
        console.error('❌ Error registrando Service Worker:', error);
      }
    });

    // Verificar actualizaciones periódicamente (solo si no hay problemas)
    // Reducido a cada 2 horas para evitar carga innecesaria
    const updateInterval = setInterval(() => {
      try {
        updateSW();
      } catch (error) {
        console.warn('Error verificando actualizaciones SW:', error);
      }
    }, 2 * 60 * 60 * 1000); // Cada 2 horas

    // Limpiar intervalo si es necesario
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        clearInterval(updateInterval);
      });
    }
  } catch (error) {
    console.warn('Service Worker no disponible en este entorno:', error);
  }
}

// Solicitar permisos de notificación
if ('Notification' in window && Notification.permission === 'default') {
  Notification.requestPermission().then(permission => {
    console.log('Permiso de notificación:', permission);
  });
}

createRoot(document.getElementById('root')).render(
  // StrictMode deshabilitado - causaba llamadas duplicadas por doble-render en desarrollo
  // <StrictMode>
  <App />
  // </StrictMode>,
)
