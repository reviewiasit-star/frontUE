import axios from 'axios';
import { authService } from './authService';

const API_URL = `http://${window.location.hostname}:3001/api`;

// Configurar interceptor para incluir token en todas las peticiones
axios.interceptors.request.use(
  (config) => {
    const token = authService.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const inventarioService = {
  // ==================== COMPRAS DE LA ADMINISTRADORA ====================
  
  // Registrar nueva compra de la administradora
  registrarCompraAdministradora: async (compraData) => {
    try {
      const response = await axios.post(`${API_URL}/compras-administradora`, compraData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtener lista de compras de la administradora
  obtenerComprasAdministradora: async (filtros = {}) => {
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.proveedor) params.append('proveedor', filtros.proveedor);
      
      const response = await axios.get(`${API_URL}/compras-administradora?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtener detalle de una compra específica
  obtenerDetalleCompra: async (compraId) => {
    try {
      const response = await axios.get(`${API_URL}/compras-administradora/${compraId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // ==================== DISTRIBUCIÓN DE PRODUCTOS ====================
  
  // Distribuir productos a almacenes
  distribuirProductos: async (distribucionData) => {
    try {
      const response = await axios.post(`${API_URL}/distribuir-productos`, distribucionData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // ==================== INVENTARIO DE ALMACENES ====================
  
  // Obtener inventario de un almacén específico
  obtenerInventarioAlmacen: async (almacenId, filtros = {}) => {
    try {
      const params = new URLSearchParams();
      if (filtros.categoria) params.append('categoria', filtros.categoria);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
      
      const response = await axios.get(`${API_URL}/inventario-almacen/${almacenId}?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // ==================== VENTAS CON NUEVO SISTEMA ====================
  
  // Registrar venta con el nuevo sistema de inventario
  registrarVentaInventario: async (ventaData) => {
    try {
      const response = await axios.post(`${API_URL}/ventas-inventario`, ventaData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // ==================== REPORTES ====================
  
  // Obtener reportes de ventas del nuevo sistema
  obtenerReportesVentasInventario: async (filtros = {}) => {
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.usuario) params.append('usuario', filtros.usuario);
      if (filtros.almacen) params.append('almacen', filtros.almacen);
      if (filtros.formaPago) params.append('formaPago', filtros.formaPago);
      if (filtros.page) params.append('page', filtros.page);
      if (filtros.limit) params.append('limit', filtros.limit);
      
      const response = await axios.get(`${API_URL}/reportes-ventas-inventario?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtener resumen de ganancias y pérdidas
  obtenerResumenGananciasPerdidas: async (filtros = {}) => {
    try {
      const params = new URLSearchParams();
      if (filtros.fechaInicio) params.append('fechaInicio', filtros.fechaInicio);
      if (filtros.fechaFin) params.append('fechaFin', filtros.fechaFin);
      if (filtros.almacen) params.append('almacen', filtros.almacen);
      
      const response = await axios.get(`${API_URL}/resumen-ganancias-perdidas?${params}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // ==================== UTILIDADES ====================
  
  // Obtener lista de almacenes (reutilizar del servicio existente si está disponible)
  obtenerAlmacenes: async () => {
    try {
      const response = await axios.get(`${API_URL}/almacenes`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtener lista de usuarios (para filtros en reportes)
  obtenerUsuarios: async () => {
    try {
      const response = await axios.get(`${API_URL}/usuarios`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error.message;
    }
  },

  // Obtener categorías de productos
  obtenerCategorias: async () => {
    try {
      // Asumiendo que existe un endpoint para categorías
      const response = await axios.get(`${API_URL}/categorias`);
      return response.data;
    } catch (error) {
      // Si no existe el endpoint, devolver categorías por defecto
      return [
        'Alimentos',
        'Bebidas',
        'Útiles Escolares',
        'Uniformes',
        'Libros',
        'Tecnología',
        'Limpieza',
        'Otros'
      ];
    }
  },

  // Exportar datos a Excel (utilidad para reportes)
  exportarAExcel: (datos, nombreArchivo) => {
    try {
      // Crear un CSV simple para exportar
      const csvContent = "data:text/csv;charset=utf-8," 
        + datos.map(row => Object.values(row).join(",")).join("\n");
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `${nombreArchivo}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error al exportar:', error);
      throw new Error('Error al exportar los datos');
    }
  }
};