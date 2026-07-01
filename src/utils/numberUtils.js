/**
 * Utilidades para manejo seguro de números y formato de moneda
 * Módulo de Tienda - Unidad Educativa EMI
 */

/**
 * Convierte un valor a float de forma segura
 * @param {any} value - El valor a convertir
 * @param {number} defaultValue - Valor por defecto si la conversión falla
 * @returns {number}
 */
export function safeParseFloat(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Convierte un valor a entero de forma segura
 * @param {any} value - El valor a convertir
 * @param {number} defaultValue - Valor por defecto si la conversión falla
 * @returns {number}
 */
export function safeParseInt(value, defaultValue = 0) {
  if (value === null || value === undefined || value === '') return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Formatea un número como moneda boliviana (Bs)
 * @param {number} value - El valor a formatear
 * @param {number} decimals - Número de decimales (por defecto 2)
 * @returns {string}
 */
export function formatCurrency(value, decimals = 2) {
  const num = safeParseFloat(value, 0);
  return `Bs ${num.toFixed(decimals)}`;
}

/**
 * Formatea un número con separadores de miles
 * @param {number} value - El valor a formatear
 * @param {number} decimals - Número de decimales (por defecto 2)
 * @returns {string}
 */
export function formatNumber(value, decimals = 2) {
  const num = safeParseFloat(value, 0);
  return num.toLocaleString('es-BO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Calcula el porcentaje de ganancia
 * @param {number} costoUnitario - Costo del producto
 * @param {number} precioVenta - Precio de venta del producto
 * @returns {number} Porcentaje de ganancia
 */
export function calcularPorcentajeGanancia(costoUnitario, precioVenta) {
  const costo = safeParseFloat(costoUnitario, 0);
  const precio = safeParseFloat(precioVenta, 0);
  if (costo === 0) return 0;
  return ((precio - costo) / costo) * 100;
}

export default {
  safeParseFloat,
  safeParseInt,
  formatCurrency,
  formatNumber,
  calcularPorcentajeGanancia
};
