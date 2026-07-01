// URL fija de Railway para el backend principal
const RAILWAY_BACKEND_PRINCIPAL = 'https://backendprincipal-production-6f16.up.railway.app';

function isLocalEnvironment() {
  if (typeof window === 'undefined') return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1' || host.startsWith('192.168.') || host.startsWith('10.') || host.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./);
}

function normalizeBase(url) {
  let u = String(url || '').trim().replace(/\/$/, '');
  // Si no tiene protocolo, añadir https://
  if (u && !u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'https://' + u;
  }
  return u;
}

function resolvePrincipalOrigin() {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return normalizeBase(fromEnv);
  if (isLocalEnvironment()) {
    return `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3001`;
  }
  return RAILWAY_BACKEND_PRINCIPAL;
}

export const BACKEND_PRINCIPAL_ORIGIN = resolvePrincipalOrigin();
export const BACKEND_PRINCIPAL = `${BACKEND_PRINCIPAL_ORIGIN}/api`;

// Mantener BACKEND_CAJAS como alias del principal para retrocompatibilidad
// (por si algún archivo aún lo importa directamente)
export const BACKEND_CAJAS_ORIGIN = BACKEND_PRINCIPAL_ORIGIN;
export const BACKEND_CAJAS = BACKEND_PRINCIPAL;

/**
 * Retorna la URL base del API para un endpoint dado.
 * Todo el tráfico va al backend principal (ya no existe backend-cajas separado).
 */
export function getApiUrl(endpoint, userRole = null) {
  return BACKEND_PRINCIPAL;
}

export function getBaseApiUrl(userRole = null) {
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
  const principal = await checkServiceAvailability(BACKEND_PRINCIPAL);
  return { principal, cajas: principal }; // cajas = principal ahora
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
