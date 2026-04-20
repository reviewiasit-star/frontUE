/**
 * Wrapper de fetch que maneja requests offline
 * Guarda requests fallidos y los sincroniza cuando vuelve la conexión
 */

import { savePendingRequest, isOnline } from './offlineStorage';

// Guardar referencia al fetch nativo ANTES de cualquier interceptación
// Esto previene loops infinitos
let NATIVE_FETCH = null;
if (typeof window !== 'undefined') {
  NATIVE_FETCH = window.fetch;
}

/**
 * Obtiene el fetch original (no interceptado) de forma segura
 * NUNCA usar window.fetch directamente porque puede estar interceptado
 */
function getOriginalFetch() {
  // Prioridad 1: _originalFetch guardado por setupOfflineFetch
  if (typeof window !== 'undefined' && window.fetch?._originalFetch) {
    return window.fetch._originalFetch;
  }
  // Prioridad 2: NATIVE_FETCH guardado antes de interceptar
  if (NATIVE_FETCH) {
    return NATIVE_FETCH;
  }
  // Último recurso: fetch global (solo si no está interceptado)
  if (typeof fetch !== 'undefined' && !fetch._offlineWrapped) {
    return fetch;
  }
  // Si todo falla, lanzar error
  throw new Error('No se pudo obtener el fetch original. El sistema puede estar en un estado inconsistente.');
}

export async function offlineFetch(url, options = {}) {
  const isGetRequest = !options.method || options.method === 'GET';
  // Usar navigator.onLine directamente (más rápido que función async)
  const online = navigator.onLine;

  // Obtener fetch original para evitar loops de interceptación
  // NUNCA usar window.fetch directamente porque está interceptado
  const originalFetch = getOriginalFetch();

  // Si estamos online, intentar el request normal
  if (online) {
    try {
      // No sobrescribir Content-Type si es FormData (el navegador lo establece automáticamente)
      const isFormData = options.body instanceof FormData;
      const headers = isFormData
        ? { ...options.headers }  // Dejar que el navegador maneje el Content-Type para FormData
        : {
          ...options.headers,
          'Content-Type': options.headers?.['Content-Type'] || 'application/json'
        };
      const response = await originalFetch(url, {
        ...options,
        headers
      });

      // Si el request fue exitoso, retornar la respuesta
      if (response.ok) {
        return response;
      }

      // Si falló pero es un GET, lanzar error para que se maneje
      if (isGetRequest) {
        throw new Error(`Request failed: ${response.status}`);
      }

      // POST/PUT/DELETE que obtuvo respuesta del servidor (4xx, 5xx): retornarla
      // para que el frontend pueda mostrarla (ej. 409 "documento ya existe")
      return response;
    } catch (error) {
      // Verificar si es un error de conexión (backend offline aunque navegador dice online)
      const isConnectionError = error.message && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('network') ||
        error.name === 'TypeError'
      );

      // Si es un GET y falló, lanzar el error
      if (isGetRequest) {
        throw error;
      }

      // Si es POST/PUT/DELETE y es error de conexión, guardar para sincronización
      // (aunque navigator.onLine sea true, el backend puede estar offline)
      if (isConnectionError && !isGetRequest) {
        // Continuar para guardar en IndexedDB
      } else if (!isGetRequest) {
        // Para otros errores de POST/PUT/DELETE, también intentar guardar
      }
    }
  }

  // Si es un request de escritura (POST, PUT, DELETE) y estamos offline o falló
  if (!isGetRequest) {
    // NO guardar subidas de documentos: FormData no se puede serializar para reintento
    const urlStr = typeof url === 'string' ? url : (url?.url || '');
    const esSubidaDocumento = urlStr.includes('documentos-agente/subir') && options.body instanceof FormData;
    if (esSubidaDocumento) {
      throw new Error('No se pudo subir el documento. Verifica que el servidor esté activo e inténtalo de nuevo.');
    }

    try {
      // Guardar el request para sincronización posterior
      const requestId = await savePendingRequest(url, options);

      // Mensaje claro en consola para el usuario
      try {
        const urlObj = new URL(url);
        const endpoint = urlObj.pathname;
        const method = options.method || 'POST';

        // Determinar tipo de operación basado en el endpoint
        let tipoOperacion = 'operación';
        if (endpoint.includes('/estudiantes')) {
          tipoOperacion = 'registro de estudiante';
        } else if (endpoint.includes('/pagos-realizados') || endpoint.includes('/pagos') || endpoint.includes('/pago')) {
          tipoOperacion = 'registro de pago';
        } else if (endpoint.includes('/inscripciones')) {
          tipoOperacion = 'inscripción';
        } else if (endpoint.includes('/compromiso')) {
          tipoOperacion = 'compromiso económico';
        }

        console.log(`💾 ${tipoOperacion.toUpperCase()} guardado offline: ${method} ${endpoint}`);
        console.log(`   ⏳ Pendiente de registro - Se sincronizará automáticamente cuando vuelva la conexión`);
        console.log(`   📋 ID de solicitud: ${requestId}`);
      } catch (e) {
        // Si no se puede parsear la URL, mostrar mensaje genérico
        console.log(`💾 Operación guardada offline (ID: ${requestId})`);
        console.log(`   ⏳ Pendiente de registro - Se sincronizará automáticamente cuando vuelva la conexión`);
      }

      // Disparar evento personalizado para notificar que se guardó un request
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('offline-request-saved', {
          detail: { requestId, url, method: options.method || 'POST' }
        }));
      }

      // Retornar una respuesta simulada exitosa
      // Nota: El usuario verá esta respuesta, pero el request real se ejecutará cuando vuelva la conexión
      return new Response(
        JSON.stringify({
          ok: true,
          message: 'Operación guardada. Se sincronizará automáticamente cuando vuelva la conexión.',
          offline: true,
          saved: true,
          requestId: requestId
        }),
        {
          status: 202,
          statusText: 'Accepted',
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (storageError) {
      console.error('Error guardando request offline:', storageError);
      throw new Error('No se pudo guardar el request. Intente nuevamente.');
    }
  }

  // Si es GET y estamos offline, intentar obtener del cache
  if (!online && isGetRequest) {
    // El service worker deber?a manejar esto con cache
    // Pero si no est? disponible, lanzar error
    throw new Error('Sin conexi?n a internet y sin datos en cache');
  }

  // Fallback: lanzar error
  throw new Error('Request fall? y no se pudo procesar offline');
}

/**
 * Verifica si el backend está disponible
 * @returns {Promise<boolean>}
 */
async function isBackendAvailable() {
  try {
    const originalFetch = getOriginalFetch();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const response = await originalFetch('http://localhost:3001/api/ping', {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Sincroniza todos los requests pendientes
 * IMPORTANTE: Solo elimina datos cuando la sincronización es EXITOSA
 * @returns {Promise<{success: number, failed: number, pending: number}>}
 */
export async function syncPendingRequests() {
  const { getPendingRequests, deletePendingRequest } = await import('./offlineStorage');

  const pending = await getPendingRequests();
  
  // Si no hay pendientes, no hacer nada
  if (pending.length === 0) {
    return { success: 0, failed: 0, pending: 0 };
  }

  // Primero verificar si el backend está disponible
  const backendAvailable = await isBackendAvailable();
  if (!backendAvailable) {
    console.log(`⏳ Backend no disponible - ${pending.length} operaciones pendientes se mantienen guardadas`);
    return { success: 0, failed: 0, pending: pending.length };
  }

  let success = 0;
  let failed = 0;

  for (const request of pending) {
    // Eliminar operaciones de subida de documentos: no se pueden sincronizar (FormData no serializable)
    if (request.url && request.url.includes('documentos-agente/subir')) {
      await deletePendingRequest(request.id);
      console.log(`🗑️ Operación de documento eliminada (no sincronizable): ${request.url}`);
      success++; // Cuenta como "resuelta" (eliminada)
      continue;
    }

    try {
      // Usar fetch original para evitar interceptación durante sincronización
      const originalFetch = getOriginalFetch();
      const response = await originalFetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body
      });

      if (response.ok) {
        // SOLO eliminar si la sincronización fue EXITOSA
        await deletePendingRequest(request.id);
        success++;
        console.log(`✅ Sincronizado: ${request.method} ${request.url}`);
      } else {
        // Si falla con error del servidor, NO eliminar, mantener para reintentar
        console.warn(`⚠️ Falló sincronización (${response.status}): ${request.url} - Se reintentará`);
        failed++;
      }
    } catch (error) {
      // Si hay error de conexión, NO eliminar, mantener para reintentar
      console.warn(`⚠️ Error de conexión: ${request.url} - Se reintentará`);
      failed++;
    }
  }

  // Disparar evento personalizado cuando se completa la sincronización
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('offline-sync-completed', {
      detail: { success, failed, total: pending.length }
    }));
  }

  // Mostrar resumen
  if (success > 0 || failed > 0) {
    console.log(`📤 Sincronización: ${success} exitosos, ${failed} pendientes de reintento`);
  }

  return { success, failed, pending: failed };
}

/**
 * Limpia todas las operaciones pendientes (para uso manual o en desarrollo)
 */
export async function clearPendingRequests() {
  const { clearAllPendingRequests } = await import('./offlineStorage');
  return await clearAllPendingRequests();
}

/**
 * Intercepta fetch globalmente para usar offlineFetch
 * Solo para requests a la API
 * Optimizado para no agregar overhead cuando est? online
 */
export function setupOfflineFetch() {
  if (typeof window === 'undefined') return;

  // Evitar múltiples interceptaciones
  if (window.fetch._offlineWrapped) {
    return;
  }

  // Guardar el fetch nativo ANTES de interceptarlo (si no se guardó antes)
  if (!NATIVE_FETCH) {
    NATIVE_FETCH = window.fetch || fetch;
  }

  const originalFetch = window.fetch;

  // Guardar referencia al fetch original para uso interno
  // Esto es crítico para evitar loops infinitos
  window.fetch._originalFetch = originalFetch;

  // También actualizar NATIVE_FETCH si no estaba guardado
  if (!NATIVE_FETCH) {
    NATIVE_FETCH = originalFetch;
  }

  window.fetch = async function (url, options = {}) {
    // Solo interceptar requests a la API
    const urlString = typeof url === 'string' ? url : url.url;
    const isApiRequest = urlString && (
      urlString.includes('/api/') ||
      urlString.includes('localhost:3001') ||
      urlString.includes('localhost:3002')
    );

    // Si no es request de API, usar fetch original directamente (sin overhead)
    if (!isApiRequest) {
      return originalFetch(url, options);
    }

    // EXCLUIR endpoints de autenticación - deben ser rápidos y sin overhead
    const isAuthRequest = urlString && (
      urlString.includes('/auth/login') ||
      urlString.includes('/auth/verify') ||
      urlString.includes('/auth/recuperar') ||
      urlString.includes('/auth/restablecer') ||
      urlString.includes('/auth/perfil') ||
      urlString.includes('/auth/cambiar-password')
    );

    // EXCLUIR endpoint de búsqueda de hijos - necesita timeout más largo y no debe ser interceptado
    const isBuscarHijosRequest = urlString && urlString.includes('/buscar-hijos-remitente');

    // Para autenticación o búsqueda de hijos, usar fetch original directamente (sin interceptación)
    if (isAuthRequest || isBuscarHijosRequest) {
      return originalFetch(url, options);
    }

    // Para requests de API (no autenticación), verificar si estamos online primero
    // Si estamos online, intentar fetch normal primero (más rápido)
    if (navigator.onLine) {
      try {
        // Usar AbortController para timeout y mejor manejo de errores
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 segundos timeout

        // No sobrescribir Content-Type si es FormData (el navegador lo establece automáticamente)
        const isFormData = options.body instanceof FormData;
        const headers = isFormData
          ? { ...options.headers }  // Dejar que el navegador maneje el Content-Type para FormData
          : {
            ...options.headers,
            'Content-Type': options.headers?.['Content-Type'] || 'application/json'
          };

        const response = await originalFetch(url, {
          ...options,
          signal: controller.signal,
          headers
        }).finally(() => clearTimeout(timeoutId));

        // Si el request fue exitoso, retornar directamente (sin pasar por offlineFetch)
        if (response.ok) {
          return response;
        }

        // Si falló pero es GET, retornar respuesta controlada sin lanzar error
        const isGetRequest = !options.method || options.method === 'GET';
        if (isGetRequest) {
          // Para GET requests que fallan, retornar respuesta vacía en lugar de lanzar error
          // Esto evita errores repetidos en consola cuando el backend está offline
          return new Response(
            JSON.stringify({ ok: false, message: 'Sin conexión y sin datos en cache' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        // Si es POST/PUT/DELETE y falló, pasar a offlineFetch para guardarlo
      } catch (error) {
        const isGetRequest = !options.method || options.method === 'GET';

        // Si es un error de conexión (backend offline), manejar según el tipo de request
        const isConnectionError = error.message && (
          error.message.includes('Failed to fetch') ||
          error.message.includes('ERR_CONNECTION_REFUSED') ||
          error.message.includes('network') ||
          error.name === 'TypeError'
        );

        if (isGetRequest && isConnectionError) {
          // Para GET requests offline, retornar respuesta vacía SIN lanzar error
          // Esto evita errores repetidos en consola y permite que el componente maneje el estado offline
          // IMPORTANTE: No usar console.error aquí para evitar spam en consola
          return new Response(
            JSON.stringify({ ok: false, message: 'Sin conexión y sin datos en cache' }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'application/json' }
            }
          );
        }

        if (isGetRequest && !isConnectionError) {
          throw error; // Para otros errores de GET, lanzar normalmente
        }

        // Para POST/PUT/DELETE con error de conexión, pasar directamente a offlineFetch
        // sin lanzar el error para que se guarde en IndexedDB
        if (isConnectionError) {
          // Continuar con offlineFetch para guardarlo
        } else {
          // Para otros errores, también intentar guardarlo offline
        }
      }
    }

    // Solo usar offlineFetch si:
    // 1. Estamos offline, O
    // 2. Es POST/PUT/DELETE que falló online
    try {
      // Pasar el originalFetch a offlineFetch para evitar loops
      return await offlineFetch(url, options);
    } catch (error) {
      // Si offlineFetch falla completamente, intentar con fetch original como último recurso
      // Pero esto no debería pasar normalmente
      console.warn('offlineFetch falló completamente, usando fetch original como último recurso:', error.message);
      return originalFetch(url, options);
    }
  };

  // Marcar como envuelto para evitar múltiples interceptaciones
  window.fetch._offlineWrapped = true;

  // Agregar comando global para limpiar operaciones pendientes desde la consola
  window.clearOfflinePending = async () => {
    const { clearAllPendingRequests } = await import('./offlineStorage');
    const count = await clearAllPendingRequests();
    console.log(`✅ Limpieza completada: ${count} operaciones eliminadas`);
    return count;
  };

  // Sincronizar automáticamente cuando vuelve la conexión
  window.addEventListener('online', async () => {
    console.log('🌐 Conexión de red restaurada');
    // Esperar 5 segundos para asegurar que el backend esté listo
    setTimeout(async () => {
      try {
        const { getPendingRequests } = await import('./offlineStorage');
        const pending = await getPendingRequests();
        if (pending.length > 0) {
          console.log(`📋 Intentando sincronizar ${pending.length} operaciones pendientes...`);
          const result = await syncPendingRequests();
          if (result.pending > 0) {
            console.log(`⏳ ${result.pending} operaciones aún pendientes (backend no disponible o error)`);
          }
        }
      } catch (error) {
        console.warn('No se pudo sincronizar automáticamente - los datos se mantienen guardados');
      }
    }, 5000);
  });

  // Al iniciar, solo mostrar info de pendientes (no sincronizar automáticamente para evitar pérdida de datos)
  setTimeout(async () => {
    try {
      const { getPendingRequests } = await import('./offlineStorage');
      const pending = await getPendingRequests();
      if (pending.length > 0) {
        console.log(`📋 Hay ${pending.length} operaciones pendientes guardadas`);
        console.log(`   💡 Usa syncOfflinePending() para sincronizar manualmente`);
        console.log(`   💡 Usa clearOfflinePending() para limpiar (cuidado: elimina datos)`);
      }
    } catch (error) {
      // Silenciar error
    }
  }, 2000);

  // Agregar comando para sincronizar manualmente
  window.syncOfflinePending = async () => {
    const result = await syncPendingRequests();
    if (result.success === 0 && result.pending > 0) {
      console.log(`⚠️ No se pudo sincronizar - ${result.pending} operaciones siguen pendientes`);
    }
    return result;
  };
}

export default offlineFetch;
