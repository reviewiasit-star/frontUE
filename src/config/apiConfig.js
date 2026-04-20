// Configuración de URLs de API según el rol y tipo de endpoint
// Backend principal: siempre el mismo host que la página, puerto 3001 (comportamiento original).
// Backend cajas (Railway): opcional con VITE_BACKEND_CAJAS_URL en Vercel o .env.local; si no, puerto 3002 en el mismo host.

const BACKEND_PRINCIPAL = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001/api`;

const envCajas = (import.meta.env.VITE_BACKEND_CAJAS_URL || '').trim().replace(/\/$/, '');
const BACKEND_CAJAS =
  envCajas ||
  `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3002/api`;

// Endpoints que van al backend-cajas (solo para rol Cajero)
const ENDPOINTS_CAJAS = [
  '/compromiso-economico',
  '/pagos-realizados',
  '/comprobantes',
  '/estudiantes-compromisos-concluidos',
  '/servicios-estudiante',
  '/ingresos-academicos', // Para Cajero es escritura, para Admin/Director es solo lectura
  '/ocr-comprobantes' // Bandeja de comprobantes OCR para cajero
];

// Endpoints que están en ambos backends (lectura para Admin/Director, lectura/escritura para Cajero)
const ENDPOINTS_DASHBOARD_PAGOS = [
  '/dashboard/pagos'
];

// Endpoints que van al backend principal para Admin/Director (solo lectura)
// pero también están en backend-cajas para Cajero (lectura/escritura)
const ENDPOINTS_REPORTES = [
  '/reporte-pagos-estudiantes',
  '/estudiantes-compromisos-concluidos'
];

// Endpoints que van al backend principal
const ENDPOINTS_PRINCIPAL = [
  '/auth',
  '/usuarios',
  '/estudiantes',
  '/inscripciones',
  '/niveles',
  '/cursos',
  '/bloques',
  '/becas',
  '/servicios', // Solo lectura para cajas
  '/reportes-inscripcion',
  '/whatsapp',
  '/ai-admin'
];

/**
 * Determina qué URL de API usar según el rol del usuario y el endpoint
 * @param {string} endpoint - El endpoint de la API (ej: '/compromiso-economico')
 * @param {string} userRole - El rol del usuario actual
 * @returns {string} - La URL completa del API
 */
export function getApiUrl(endpoint, userRole = null) {
  // Si no hay rol, intentar obtenerlo del localStorage
  if (!userRole) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userRole = user.rol;
    } catch (e) {
      // Si no se puede obtener, usar backend principal por defecto
    }
  }

  // Si el endpoint es de autenticación, siempre usar backend principal
  if (endpoint.startsWith('/auth')) {
    return BACKEND_PRINCIPAL;
  }

  // Si el rol es Cajero y el endpoint es de cajas, usar backend-cajas
  if (userRole === 'Cajero' && ENDPOINTS_CAJAS.some(ep => endpoint.startsWith(ep))) {
    return BACKEND_CAJAS;
  }

  // Si el rol es Admin/Director y el endpoint es ingresos-academicos, usar backend principal (solo lectura)
  if ((userRole === 'Administrador' || userRole === 'Director') && endpoint.startsWith('/ingresos-academicos')) {
    return BACKEND_PRINCIPAL;
  }

  // Si el endpoint es de reportes y el rol es Admin/Director, usar backend principal (solo lectura)
  if ((userRole === 'Administrador' || userRole === 'Director') && ENDPOINTS_REPORTES.some(ep => endpoint.startsWith(ep))) {
    return BACKEND_PRINCIPAL;
  }

  // Si el endpoint es de reportes y el rol es Cajero, usar backend-cajas
  if (userRole === 'Cajero' && ENDPOINTS_REPORTES.some(ep => endpoint.startsWith(ep))) {
    return BACKEND_CAJAS;
  }

  // Si el endpoint es de dashboard de pagos y el rol es Admin/Director, usar backend principal (solo lectura)
  if ((userRole === 'Administrador' || userRole === 'Director') && ENDPOINTS_DASHBOARD_PAGOS.some(ep => endpoint.startsWith(ep))) {
    return BACKEND_PRINCIPAL;
  }

  // Si el endpoint es de dashboard de pagos y el rol es Cajero, usar backend-cajas
  if (userRole === 'Cajero' && ENDPOINTS_DASHBOARD_PAGOS.some(ep => endpoint.startsWith(ep))) {
    return BACKEND_CAJAS;
  }

  // Si el endpoint es de cajas pero el rol no es Cajero, usar backend principal
  if (ENDPOINTS_CAJAS.some(ep => endpoint.startsWith(ep)) && userRole !== 'Cajero') {
    return BACKEND_PRINCIPAL; // Esto no debería pasar, pero por seguridad
  }

  // Por defecto, usar backend principal
  return BACKEND_PRINCIPAL;
}

/**
 * Obtiene la URL base del backend según el rol
 * @param {string} userRole - El rol del usuario
 * @returns {string} - La URL base del backend
 */
export function getBaseApiUrl(userRole = null) {
  if (!userRole) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userRole = user.rol;
    } catch (e) {
      return BACKEND_PRINCIPAL;
    }
  }

  // Si es Cajero, usar backend-cajas
  if (userRole === 'Cajero') {
    return BACKEND_CAJAS;
  }

  // Para otros roles, usar backend principal
  return BACKEND_PRINCIPAL;
}

/**
 * Verifica la disponibilidad de un servicio
 * @param {string} baseUrl - URL base del servicio (ej: http://localhost:3001/api)
 * @param {number} timeout - Timeout en milisegundos (default: 5000)
 * @returns {Promise<boolean>} - true si el servicio está disponible
 */
export async function checkServiceAvailability(baseUrl, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Asegurarse de que la URL termine con /api y luego agregar /ping
    const pingUrl = baseUrl.endsWith('/api') ? `${baseUrl}/ping` : `${baseUrl}/api/ping`;
    
    const response = await fetch(pingUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const isAvailable = data.ok === true;
      return isAvailable;
    }
    return false;
  } catch (error) {
    // Error silenciado para no llenar la consola
    return false;
  }
}

/**
 * Verifica la disponibilidad de ambos servicios
 * @returns {Promise<{principal: boolean, cajas: boolean}>}
 */
export async function checkAllServices() {
  const [principal, cajas] = await Promise.all([
    checkServiceAvailability(BACKEND_PRINCIPAL),
    checkServiceAvailability(BACKEND_CAJAS)
  ]);

  return { principal, cajas };
}

export default {
  BACKEND_PRINCIPAL,
  BACKEND_CAJAS,
  getApiUrl,
  getBaseApiUrl,
  checkServiceAvailability,
  checkAllServices
};

