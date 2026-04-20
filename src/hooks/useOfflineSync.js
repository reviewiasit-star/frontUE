import { useEffect, useState, useCallback, useRef } from 'react';
import { syncPendingRequests } from '../utils/offlineFetch';
import { isOnline, getPendingRequests } from '../utils/offlineStorage';

/**
 * Hook para manejar sincronización offline
 * Detecta cuando vuelve la conexión y sincroniza requests pendientes
 * Optimizado para evitar problemas de rendimiento
 */
export function useOfflineSync() {
  const [isOnlineState, setIsOnlineState] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const syncingRef = useRef(false); // Ref para evitar condiciones de carrera
  const backendOfflineRef = useRef(false); // Ref para detectar si el backend está offline

  // Memoizar función de actualización de contador
  const updatePendingCount = useCallback(async () => {
    try {
      const pending = await getPendingRequests();
      setPendingCount(pending.length);
    } catch (error) {
      console.error('Error obteniendo requests pendientes:', error);
    }
  }, []);

  useEffect(() => {
    // Heartbeat para detectar backend offline rápidamente
    let heartbeatInterval = null;
    let lastSuccessfulPing = Date.now();
    
    const pingBackend = async () => {
      try {
        const token = localStorage.getItem('token');
        const apiUrl = `http://${window.location.hostname}:3001/api/ping`;
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout
        
        const response = await fetch(apiUrl, {
          method: 'GET',
          signal: controller.signal,
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }).finally(() => clearTimeout(timeoutId));
        
        if (response.ok) {
          lastSuccessfulPing = Date.now();
          backendOfflineRef.current = false;
        } else {
          // Si el ping falla, considerar backend offline
          if (Date.now() - lastSuccessfulPing > 10000) { // Si no hay ping exitoso en 10 segundos
            backendOfflineRef.current = true;
          }
        }
      } catch (error) {
        // Error de conexión - backend probablemente offline
        if (Date.now() - lastSuccessfulPing > 10000) {
          backendOfflineRef.current = true;
        }
      }
    };
    
    // Detectar cuando hay requests pendientes (backend offline aunque navegador online)
    const checkBackendStatus = async () => {
      if (navigator.onLine) {
        const pending = await getPendingRequests();
        if (pending.length > 0) {
          // Hay requests pendientes, el backend probablemente está offline
          backendOfflineRef.current = true;
        }
      }
    };
    
    // Verificar estado inicial solo una vez
    const checkOnline = async () => {
      const browserOnline = navigator.onLine;
      setIsOnlineState(browserOnline);
      await checkBackendStatus();
      // Hacer ping inicial
      if (browserOnline) {
        await pingBackend();
      }
    };
    
    checkOnline();
    updatePendingCount();
    
    // Heartbeat cada 5 segundos para detectar backend offline rápidamente
    if (navigator.onLine) {
      heartbeatInterval = setInterval(pingBackend, 5000);
    }

    // Listeners para cambios de conexión
    const handleOnline = async () => {
      setIsOnlineState(true);
      backendOfflineRef.current = false;
      
      // Esperar un poco antes de sincronizar
      setTimeout(async () => {
        if (syncingRef.current) return; // Evitar múltiples sincronizaciones simultáneas
        
        syncingRef.current = true;
        setSyncing(true);
        try {
          const result = await syncPendingRequests();
          setLastSync(new Date());
          
          // Mostrar notificación si hubo sincronizaciones exitosas
          if (result.success > 0) {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Sincronización completada', {
                body: `${result.success} operación(es) sincronizada(s) exitosamente`,
                icon: '/logo-simple.svg'
              });
            }
          }
        } catch (error) {
          console.error('Error en sincronización:', error);
        } finally {
          setSyncing(false);
          syncingRef.current = false;
          updatePendingCount();
          await checkBackendStatus();
        }
      }, 2000); // Aumentado a 2 segundos para dar tiempo a la conexión
    };

    const handleOffline = () => {
      setIsOnlineState(false);
      backendOfflineRef.current = true;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Sincronizar periódicamente solo si hay requests pendientes
    // Reducido a cada 60 segundos para evitar carga excesiva
    const syncInterval = setInterval(async () => {
      if (navigator.onLine && !syncingRef.current) {
        try {
          const pending = await getPendingRequests();
          if (pending.length > 0) {
            syncingRef.current = true;
            setSyncing(true);
            try {
              await syncPendingRequests();
              setLastSync(new Date());
              updatePendingCount();
            } catch (error) {
              console.error('Error en sincronización periódica:', error);
            } finally {
              setSyncing(false);
              syncingRef.current = false;
            }
          }
        } catch (error) {
          console.error('Error verificando requests pendientes:', error);
        }
      }
    }, 60000); // Cada 60 segundos (reducido de 30)

    // Actualizar contador periódicamente - reducido a cada 30 segundos
    const countInterval = setInterval(() => {
      if (!syncingRef.current) {
        updatePendingCount();
        checkBackendStatus();
      }
    }, 30000); // Cada 30 segundos (reducido de 5)

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(syncInterval);
      clearInterval(countInterval);
      if (heartbeatInterval) {
        clearInterval(heartbeatInterval);
      }
    };
  }, [updatePendingCount]); // Solo updatePendingCount en dependencias

  const manualSync = useCallback(async () => {
    if (!navigator.onLine) {
      alert('No hay conexión a internet');
      return;
    }

    if (syncingRef.current) {
      console.log('Sincronización ya en progreso');
      return;
    }

    syncingRef.current = true;
    setSyncing(true);
    try {
      const result = await syncPendingRequests();
      setLastSync(new Date());
      updatePendingCount();
      return result;
    } catch (error) {
      console.error('Error en sincronización manual:', error);
      throw error;
    } finally {
      setSyncing(false);
      syncingRef.current = false;
    }
  }, [updatePendingCount]);

  // Combinar estado del navegador con estado del backend
  const isBackendOnline = !backendOfflineRef.current;
  const effectiveOnline = isOnlineState && isBackendOnline;

  return {
    isOnline: effectiveOnline,
    isBackendOnline,
    pendingCount,
    syncing,
    lastSync,
    manualSync,
    updatePendingCount
  };
}
