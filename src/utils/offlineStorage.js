/**
 * Utilidad para manejar almacenamiento offline usando IndexedDB
 * Guarda requests fallidos para sincronizarlos cuando vuelva la conexión
 */

const DB_NAME = 'emi-offline-db';
const DB_VERSION = 1;
const STORE_NAME = 'pending-requests';

let db = null;

/**
 * Abre la base de datos IndexedDB
 */
function openDB() {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const objectStore = database.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });
        objectStore.createIndex('timestamp', 'timestamp', { unique: false });
        objectStore.createIndex('url', 'url', { unique: false });
      }
    };
  });
}

/**
 * Guarda un request fallido para sincronización posterior
 * @param {string} url - URL del request
 * @param {object} options - Opciones del fetch (method, body, headers, etc.)
 * @returns {Promise<number>} - ID del request guardado
 */
export async function savePendingRequest(url, options = {}) {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Asegurar que el body se guarde como string si es un objeto
    let bodyToSave = options.body || null;
    if (bodyToSave && typeof bodyToSave === 'object' && !(bodyToSave instanceof String)) {
      bodyToSave = JSON.stringify(bodyToSave);
    }
    
    // Log para debugging (solo en desarrollo)
    if (process.env.NODE_ENV === 'development') {
      console.log('💾 Guardando request offline:', {
        url,
        method: options.method || 'GET',
        bodyLength: bodyToSave ? bodyToSave.length : 0,
        bodyPreview: bodyToSave ? bodyToSave.substring(0, 100) : 'null'
      });
    }

    const requestData = {
      url,
      method: options.method || 'GET',
      headers: options.headers || {},
      body: bodyToSave,
      timestamp: Date.now(),
      retries: 0
    };

    return new Promise((resolve, reject) => {
      const request = store.add(requestData);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error guardando request pendiente:', error);
    throw error;
  }
}

/**
 * Obtiene todos los requests pendientes
 * @returns {Promise<Array>} - Array de requests pendientes
 */
export async function getPendingRequests() {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    return new Promise((resolve, reject) => {
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error obteniendo requests pendientes:', error);
    return [];
  }
}

/**
 * Elimina un request pendiente después de sincronizarlo exitosamente
 * @param {number} id - ID del request a eliminar
 */
export async function deletePendingRequest(id) {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error eliminando request pendiente:', error);
    throw error;
  }
}

/**
 * Incrementa el contador de reintentos de un request
 * @param {number} id - ID del request
 */
export async function incrementRetries(id) {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const getRequest = store.get(id);
      getRequest.onsuccess = () => {
        const data = getRequest.result;
        if (data) {
          data.retries = (data.retries || 0) + 1;
          const updateRequest = store.put(data);
          updateRequest.onsuccess = () => resolve();
          updateRequest.onerror = () => reject(updateRequest.error);
        } else {
          resolve();
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  } catch (error) {
    console.error('Error incrementando reintentos:', error);
    throw error;
  }
}

/**
 * Limpia requests antiguos (más de 30 días)
 * NOTA: Solo limpia datos muy antiguos para evitar pérdida de datos importantes
 */
export async function cleanOldRequests() {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');

    // 30 días en lugar de 7 para mayor seguridad
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    return new Promise((resolve, reject) => {
      const request = index.openCursor();
      let deletedCount = 0;

      request.onsuccess = (event) => {
        const cursor = event.target.result;
        if (cursor) {
          if (cursor.value.timestamp < thirtyDaysAgo) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
            // Limpieza completada silenciosamente
            resolve(deletedCount);
          }
      };

      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error limpiando requests antiguos:', error);
    return 0;
  }
}

/**
 * Verifica si hay conexión a internet
 * @returns {Promise<boolean>}
 */
export async function isOnline() {
  return navigator.onLine;
}

/**
 * Limpia TODAS las operaciones pendientes
 * @returns {Promise<number>} - Número de operaciones eliminadas
 */
export async function clearAllPendingRequests() {
  try {
    const database = await openDB();
    const transaction = database.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      // Primero contar cuántas hay
      const countRequest = store.count();
      countRequest.onsuccess = () => {
        const count = countRequest.result;
        // Luego limpiar todo
        const clearRequest = store.clear();
        clearRequest.onsuccess = () => {
          console.log(`🧹 ${count} operaciones pendientes eliminadas`);
          // Disparar evento para actualizar UI
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('offline-requests-cleared'));
          }
          resolve(count);
        };
        clearRequest.onerror = () => reject(clearRequest.error);
      };
      countRequest.onerror = () => reject(countRequest.error);
    });
  } catch (error) {
    console.error('Error limpiando operaciones pendientes:', error);
    return 0;
  }
}

/**
 * Guarda datos en localStorage para acceso rápido offline
 * @param {string} key - Clave
 * @param {any} data - Datos a guardar
 */
export function saveOfflineData(key, data) {
  try {
    localStorage.setItem(`offline_${key}`, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.error('Error guardando datos offline:', error);
  }
}

/**
 * Obtiene datos guardados offline
 * @param {string} key - Clave
 * @param {number} maxAge - Edad máxima en milisegundos (opcional)
 * @returns {any|null}
 */
export function getOfflineData(key, maxAge = null) {
  try {
    const stored = localStorage.getItem(`offline_${key}`);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    
    if (maxAge && (Date.now() - parsed.timestamp) > maxAge) {
      localStorage.removeItem(`offline_${key}`);
      return null;
    }

    return parsed.data;
  } catch (error) {
    console.error('Error obteniendo datos offline:', error);
    return null;
  }
}
