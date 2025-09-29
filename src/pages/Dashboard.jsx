import React, { useEffect, useState } from 'react';
import AuthService from '../services/authService';
import { Link, useNavigate } from 'react-router-dom';
import '../components/DashboardCards.css';
import ModoDispositivo from '../components/modoDispositivo';

function Dashboard() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [productos, setProductos] = useState([]);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date().toISOString().split('T')[0]); // Fecha de hoy por defecto
  const user = AuthService.getUser();
  
  // Estados para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProductos();
    fetchVentas();
    // Obtener información del usuario
    const userData = AuthService.getUser();
    setUserInfo(userData);
    // eslint-disable-next-line
  }, [fechaSeleccionada]); // Actualizar cuando cambie la fecha

  const fetchProductos = async () => {
    try {
      const token = AuthService.getToken();
      let url = `http://${window.location.hostname}:3001/api/productos`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      setProductos(data.filter(p => p.precio_salida && Number(p.precio_salida) > 0));
    } catch {
      setProductos([]);
    }
  };

  const fetchVentas = async () => {
    setLoading(true);
    try {
      const token = AuthService.getToken();
      let url = `http://${window.location.hostname}:3001/api/ventas-dashboard?usuario_id=${user.id}&fecha_inicio=${fechaSeleccionada}&fecha_fin=${fechaSeleccionada}`;
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      console.log('Datos recibidos del backend:', data);
      console.log('Ventas:', data.ventas);
      setVentas(data.ventas || []);
    } catch {
      setVentas([]);
    }
    setLoading(false);
  };

  // Cálculos de métricas con validación para evitar NaN
  const totalGanancia = ventas.reduce((acc, v) => {
    const precio = parseFloat(v.precio_venta) || 0;
    const cantidad = parseInt(v.cantidad) || 0;
    return acc + (precio * cantidad);
  }, 0);
  
  const totalProductosVendidos = ventas.reduce((acc, v) => {
    const cantidad = parseInt(v.cantidad) || 0;
    return acc + cantidad;
  }, 0);
  
  const totalTransacciones = ventas.length;
  
  // Producto más vendido
  const productosVendidos = {};
  ventas.forEach(v => {
    const nombre = v.producto_nombre || 'Sin nombre';
    const cantidad = parseInt(v.cantidad) || 0;
    if (nombre !== 'Sin nombre' && cantidad > 0) {
      productosVendidos[nombre] = (productosVendidos[nombre] || 0) + cantidad;
    }
  });
  
  const productoMasVendido = Object.keys(productosVendidos).length > 0 
    ? Object.keys(productosVendidos).reduce((a, b) => productosVendidos[a] > productosVendidos[b] ? a : b)
    : 'Sin ventas';

  // Debug logs
  console.log('Productos vendidos:', productosVendidos);
  console.log('Total ganancia:', totalGanancia);
  console.log('Total productos vendidos:', totalProductosVendidos);
  console.log('Producto más vendido:', productoMasVendido);

  // Ventas por forma de pago
  const ventasPorFormaPago = ventas.reduce((acc, v) => {
    const forma = v.forma_pago || 'Sin especificar';
    const precio = parseFloat(v.precio_venta) || 0;
    const cantidad = parseInt(v.cantidad) || 0;
    acc[forma] = (acc[forma] || 0) + (precio * cantidad);
    return acc;
  }, {});

  // Función para manejar navegación móvil
  const handleMobileNavigate = (path) => {
    setShowMobileMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-container h-100 report-ventas-container">
      {/* Header */}
      <div className="dashboard-header mb-3">
        <div className="dashboard-title-section">
          {/* Botón hamburguesa para móvil */}
          <div className="d-flex align-items-center mb-2">
            <button 
              className="btn btn-outline-secondary me-3" 
              onClick={() => setShowMobileMenu(true)}
              title="Menú de navegación"
              style={{ fontSize: '0.9rem', padding: '8px 12px' }}
            >
              <i className="fas fa-bars"></i>
            </button>
            <h1 className="dashboard-title mb-0">
              <i className="fas fa-chart-line me-3"></i>
              Dashboard de Ventas
            </h1>
          </div>
          <p className="dashboard-subtitle">
            Análisis completo de tus ventas y métricas de rendimiento
          </p>
        </div>
        <div className="dashboard-controls">
          <div className="date-selector">
            <label htmlFor="fechaSeleccionada" className="form-label">
              <i className="fas fa-calendar-alt me-2"></i>
              Fecha de reporte:
            </label>
            <input
              type="date"
              id="fechaSeleccionada"
              className="form-control"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              max={new Date().toISOString().split('T')[0]} // No permitir fechas futuras
            />
          </div>
        </div>
      </div>

      {/* Métricas principales */}
      <div className="metrics-grid">
        <div className="metric-card total-sales">
          <div className="metric-icon">
            <i className="fas fa-dollar-sign"></i>
          </div>
          <div className="metric-value">Bs {totalGanancia.toFixed(2)}</div>
          <div className="metric-label">Ganancia Total</div>
        </div>

        <div className="metric-card products-sold">
          <div className="metric-icon">
            <i className="fas fa-box"></i>
          </div>
          <div className="metric-value">{totalProductosVendidos}</div>
          <div className="metric-label">Productos Vendidos</div>
        </div>

        <div className="metric-card transactions">
          <div className="metric-icon">
            <i className="fas fa-receipt"></i>
          </div>
          <div className="metric-value">{totalTransacciones}</div>
          <div className="metric-label">Transacciones</div>
        </div>

        <div className="metric-card top-product">
          <div className="metric-icon">
            <i className="fas fa-trophy"></i>
          </div>
          <div className="metric-value" style={{fontSize: '1.5rem'}}>
            {productoMasVendido.length > 15 ? productoMasVendido.substring(0, 15) + '...' : productoMasVendido}
          </div>
          <div className="metric-label">Producto Más Vendido</div>
        </div>
      </div>

      {/* Ventas por forma de pago */}
      <div className="payment-methods-grid">
        {Object.entries(ventasPorFormaPago).map(([forma, total]) => (
          <div key={forma} className={`payment-card ${forma.toLowerCase()}`}>
            <div className="payment-icon">
              <i className={forma === 'Efectivo' ? 'fas fa-money-bill-wave' : 'fas fa-qrcode'}></i>
            </div>
            <div className="payment-amount">Bs {total.toFixed(2)}</div>
            <div className="payment-label">{forma}</div>
          </div>
        ))}
      </div>

      {/* Tabla de ventas recientes */}
      <div className="table-section">
        <div className="card shadow-sm">
          <div className="card-header bg-gradient-primary text-white">
            <div className="d-flex align-items-center">
              <h3 className="card-title mb-0">
                <i className="fas fa-chart-bar me-2"></i>
                Ventas del {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-BO', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </h3>
              <div className="ms-auto">
                <span className="badge bg-light text-dark">
                  <i className="fas fa-shopping-cart me-1"></i>
                  {ventas.length} ventas
                </span>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive table-container">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0 fw-bold">
                      <i className="fas fa-box me-2 text-primary"></i>
                      Producto
                    </th>
                    <th className="border-0 fw-bold">
                      <i className="fas fa-warehouse me-2 text-info"></i>
                      Almacén
                    </th>
                    <th className="border-0 fw-bold">
                      <i className="fas fa-sort-numeric-up me-2 text-warning"></i>
                      Cantidad
                    </th>
                    <th className="border-0 fw-bold">
                      <i className="fas fa-tag me-2 text-success"></i>
                      Precio de Venta
                    </th>
                    <th className="border-0 fw-bold">
                      <i className="fas fa-credit-card me-2 text-warning"></i>
                      Forma de Pago
                    </th>
                    <th className="border-0 fw-bold">
                      <i className="fas fa-calendar me-2 text-secondary"></i>
                      Fecha de Venta
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Cargando...</span>
                        </div>
                        <p className="mt-2 text-muted">Cargando datos...</p>
                      </td>
                    </tr>
                  ) : ventas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-5">
                        <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                        <p className="text-muted">No hay ventas para mostrar en esta fecha</p>
                      </td>
                    </tr>
                  ) : (
                    ventas.map((v, idx) => (
                      <tr key={idx} className="align-middle">
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="me-3">
                              <div className="bg-primary rounded-circle d-flex align-items-center justify-content-center"
                                   style={{ width: '40px', height: '40px' }}>
                                <i className="fas fa-cube text-white"></i>
                              </div>
                            </div>
                            <div>
                              <strong className="text-dark">{v.producto_nombre || 'Sin nombre'}</strong>
                              <br />
                              <small className="text-muted">
                                <i className="fas fa-tag me-1"></i>
                                ID: {v.id}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="badge bg-secondary rounded-pill">
                            <i className="fas fa-building me-1"></i>
                            {v.almacen_nombre || 'Sin almacén'}
                          </span>
                        </td>
                        <td>
                          <span className="badge bg-primary rounded-pill fs-6">
                            <i className="fas fa-times me-1"></i>
                            {v.cantidad}
                          </span>
                        </td>
                        <td>
                          <span className="fw-bold text-success fs-5">
                            <i className="fas fa-dollar-sign me-1"></i>
                            Bs {(parseFloat(v.precio_venta) || 0).toFixed(2)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge rounded-pill fs-6 ${
                            v.forma_pago === 'Efectivo' ? 'bg-success' :
                            v.forma_pago === 'QR' ? 'bg-info' :
                            v.forma_pago === 'Tarjeta' ? 'bg-warning' : 'bg-secondary'
                          }`}>
                            <i className={`fas ${
                              v.forma_pago === 'Efectivo' ? 'fa-money-bill-wave' :
                              v.forma_pago === 'QR' ? 'fa-qrcode' :
                              v.forma_pago === 'Tarjeta' ? 'fa-credit-card' : 'fa-question'
                            } me-1`}></i>
                            {v.forma_pago || 'Sin especificar'}
                          </span>
                        </td>
                        <td>
                          <span className="text-muted">
                            <i className="fas fa-calendar-alt me-1"></i>
                            {v.fecha ? new Date(v.fecha).toLocaleDateString('es-BO') : '-'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {ventas.length > 0 && (
                  <tfoot className="table-dark">
                    <tr>
                      <th className="text-center">
                        <div className="d-flex flex-column">
                          <span className="text-info">
                            <i className="fas fa-box me-1"></i>
                            Productos
                          </span>
                          <span className="fs-5 fw-bold text-white">
                            {new Set(ventas.map(v => v.producto_nombre)).size}
                          </span>
                        </div>
                      </th>
                      <th className="text-center">
                        <div className="d-flex flex-column">
                          <span className="text-warning">
                            <i className="fas fa-warehouse me-1"></i>
                            Almacenes
                          </span>
                          <span className="fs-5 fw-bold text-white">
                            {new Set(ventas.map(v => v.almacen_nombre)).size}
                          </span>
                        </div>
                      </th>
                      <th className="text-center">
                        <div className="d-flex flex-column">
                          <span className="text-primary">
                            <i className="fas fa-sort-numeric-up me-1"></i>
                            Cantidad Total
                          </span>
                          <span className="fs-5 fw-bold text-white">
                            {ventas.reduce((sum, v) => sum + (parseInt(v.cantidad) || 0), 0)}
                          </span>
                        </div>
                      </th>
                      <th className="text-center">
                        <div className="d-flex flex-column">
                          <span className="text-success">
                            <i className="fas fa-dollar-sign me-1"></i>
                            Total Ventas
                          </span>
                          <span className="fs-4 fw-bold text-warning">
                            Bs {ventas.reduce((sum, v) => {
                              const precio = parseFloat(v.precio_venta) || 0;
                              const cantidad = parseInt(v.cantidad) || 0;
                              return sum + (precio * cantidad);
                            }, 0).toFixed(2)}
                          </span>
                        </div>
                      </th>
                      <th className="text-center">
                        <div className="d-flex flex-column">
                          <span className="text-info">
                            <i className="fas fa-credit-card me-1"></i>
                            Formas de Pago
                          </span>
                          <span className="fs-5 fw-bold text-white">
                            {new Set(ventas.map(v => v.forma_pago)).size}
                          </span>
                        </div>
                      </th>
                      <th className="text-center">
                        <div className="d-flex flex-column">
                          <span className="text-light">
                            <i className="fas fa-calendar-check me-1"></i>
                            Transacciones
                          </span>
                          <span className="fs-5 fw-bold text-white">
                            {ventas.length}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Componente ModoDispositivo */}
      <ModoDispositivo 
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        onNavigate={handleMobileNavigate}
        onLogout={handleLogout}
        user={userInfo}
      />

    </div>
  );
}

export default Dashboard;