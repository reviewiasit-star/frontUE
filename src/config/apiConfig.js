// URLs fijas de Railway (respaldo si no hay .env en Vercel)
const RAILWAY_BACKEND_PRINCIPAL = 'https://backprincipalemiwch-production.up.railway.app';
const RAILWAY_BACKEND_CAJAS = 'https://backendcajasemiwch-production.up.railway.app';

function isLocalHost() {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

function normalizeBase(url) {
  return String(url || '').replace(/\/$/, '');
}

function resolvePrincipalOrigin() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return normalizeBase(fromEnv);
  if (isLocalHost()) {
    return `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001`;
  }
  return RAILWAY_BACKEND_PRINCIPAL;
}

function resolveCajasOrigin() {
  const fromEnv = import.meta.env.VITE_API_CAJAS_URL;
  if (fromEnv) return normalizeBase(fromEnv);
  if (isLocalHost()) {
    return `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3002`;
  }
  if (RAILWAY_BACKEND_CAJAS) return RAILWAY_BACKEND_CAJAS;
  return `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3002`;
}

export const BACKEND_PRINCIPAL_ORIGIN = resolvePrincipalOrigin();
export const BACKEND_CAJAS_ORIGIN = resolveCajasOrigin();
export const BACKEND_PRINCIPAL = `${BACKEND_PRINCIPAL_ORIGIN}/api`;
export const BACKEND_CAJAS = `${BACKEND_CAJAS_ORIGIN}/api`;

// Endpoints que van al backend-cajas (solo para rol Cajero)
const ENDPOINTS_CAJAS = [
  '/compromiso-economico',
  '/pagos-realizados',
  '/comprobantes',
  '/estudiantes-compromisos-concluidos',
  '/servicios-estudiante',
  '/servicios',
  '/estudiantes',
  '/becas',
  '/niveles',
  '/ingresos-academicos',
  '/ocr-comprobantes'
];

const ENDPOINTS_DASHBOARD_PAGOS = ['/dashboard/pagos'];

const ENDPOINTS_REPORTES = [
  '/reporte-pagos-estudiantes',
  '/estudiantes-compromisos-concluidos'
];

export function getApiUrl(endpoint, userRole = null) {
  if (!userRole) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userRole = user.rol;
    } catch {
      // usar backend principal por defecto
    }
  }

  if (endpoint.startsWith('/auth')) {
    return BACKEND_PRINCIPAL;
  }

  if (userRole === 'Cajero' && ENDPOINTS_CAJAS.some((ep) => endpoint.startsWith(ep))) {
    return BACKEND_CAJAS;
  }

  if (
    (userRole === 'Administrador' || userRole === 'Director') &&
    endpoint.startsWith('/ingresos-academicos')
  ) {
    return BACKEND_PRINCIPAL;
  }

  if (
    (userRole === 'Administrador' || userRole === 'Director') &&
    ENDPOINTS_REPORTES.some((ep) => endpoint.startsWith(ep))
  ) {
    return BACKEND_PRINCIPAL;
  }

  if (userRole === 'Cajero' && ENDPOINTS_REPORTES.some((ep) => endpoint.startsWith(ep))) {
    return BACKEND_CAJAS;
  }

  if (
    (userRole === 'Administrador' || userRole === 'Director') &&
    ENDPOINTS_DASHBOARD_PAGOS.some((ep) => endpoint.startsWith(ep))
  ) {
    return BACKEND_PRINCIPAL;
  }

  if (userRole === 'Cajero' && ENDPOINTS_DASHBOARD_PAGOS.some((ep) => endpoint.startsWith(ep))) {
    return BACKEND_CAJAS;
  }

  if (ENDPOINTS_CAJAS.some((ep) => endpoint.startsWith(ep)) && userRole !== 'Cajero') {
    return BACKEND_PRINCIPAL;
  }

  return BACKEND_PRINCIPAL;
}

export function getBaseApiUrl(userRole = null) {
  if (!userRole) {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      userRole = user.rol;
    } catch {
      return BACKEND_PRINCIPAL;
    }
  }

  if (userRole === 'Cajero') {
    return BACKEND_CAJAS;
  }

  return BACKEND_PRINCIPAL;
}

export async function checkServiceAvailability(baseUrl, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const pingUrl = baseUrl.endsWith('/api') ? `${baseUrl}/ping` : `${baseUrl}/api/ping`;

    const response = await fetch(pingUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'Content-Type': 'application/json' }
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      return data.ok === true;
    }
    return false;
  } catch {
    return false;
  }
}

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
  BACKEND_PRINCIPAL_ORIGIN,
  BACKEND_CAJAS_ORIGIN,
  getApiUrl,
  getBaseApiUrl,
  checkServiceAvailability,
  checkAllServices
};
