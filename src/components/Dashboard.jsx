import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/authService';
import { inventarioService } from '../services/inventarioService';

function Dashboard() {
  const [userInfo, setUserInfo] = useState(null);
  const [stats, setStats] = useState({
    ventasHoy: 0,
    gananciasHoy: 0,
    productosStock: 0,
    almacenes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = authService.getUserInfo();
    setUserInfo(user);
    cargarEstadisticas();
  }, []);

  const cargarEstadisticas = async () => {
    try {
      setLoading(true);
      
      // Obtener estadísticas básicas según el rol del usuario
      const hoy = new Date().toISOString().split('T')[0];
      
      // Estadísticas de ventas del día
      const ventasHoy = await inventarioService.obtenerReportesVentasInventario({
        fechaInicio: hoy,
        fechaFin: hoy
      });
      
      // Obtener almacenes
      const almacenes = await inventarioService.obtenerAlmacenes();
      
      setStats({
        ventasHoy: ventasHoy.resumen?.totalVentas || 0,
        gananciasHoy: ventasHoy.resumen?.totalGanancias || 0,
        productosStock: ventasHoy.resumen?.totalProductos || 0,
        almacenes: almacenes.length || 0
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB'
    }).format(amount);
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Buenos días';
    if (hour < 18) return 'Buenas tardes';
    return 'Buenas noches';
  };

  const getQuickActions = () => {
    const actions = [];
    
    if (userInfo?.rol === 'Administrador') {
      actions.push(
        { title: 'Registrar Compra', icon: 'fas fa-shopping-cart', link: '/compras-administradora', color: 'primary' },
        { title: 'Ganancias y Pérdidas', icon: 'fas fa-chart-line', link: '/resumen-ganancias-perdidas', color: 'success' },
        { title: 'Gestionar Usuarios', icon: 'fas fa-users', link: '/usuarios', color: 'info' }
      );
    }
    
    if (userInfo?.rol === 'Tienda') {
      actions.push(
        { title: 'Mi Inventario', icon: 'fas fa-boxes', link: '/inventario-almacen', color: 'primary' },
        { title: 'Registrar Venta', icon: 'fas fa-cash-register', link: '/inventario-almacen', color: 'success' }
      );
    }
    
    actions.push(
      { title: 'Reportes de Ventas', icon: 'fas fa-chart-bar', link: '/reportes-ventas-inventario', color: 'warning' },
      { title: 'Reportes Tradicionales', icon: 'fas fa-file-alt', link: '/reportes', color: 'secondary' }
    );
    
    return actions;
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid report-ventas-container">
      {/* Header de bienvenida */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 bg-gradient-primary text-white">
            <div className="card-body">
              <h1 className="h3 mb-2">
                {getGreeting()}, {userInfo?.nombre}!
              </h1>
              <p className="mb-0 opacity-75">
                Bienvenido al Sistema de Gestión Educativa - Rol: {userInfo?.rol}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas principales */}
      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Ventas Hoy
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(stats.ventasHoy)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-calendar fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Ganancias Hoy
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {formatCurrency(stats.gananciasHoy)}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-dollar-sign fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    Productos en Stock
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.productosStock}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-boxes fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Almacenes Activos
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">
                    {stats.almacenes}
                  </div>
                </div>
                <div className="col-auto">
                  <i className="fas fa-warehouse fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-bolt me-2"></i>
                Acciones Rápidas
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                {getQuickActions().map((action, index) => (
                  <div key={index} className="col-xl-3 col-md-6 mb-3">
                    <Link to={action.link} className="text-decoration-none">
                      <div className={`card border-0 bg-${action.color} text-white h-100 hover-shadow`}>
                        <div className="card-body text-center">
                          <i className={`${action.icon} fa-2x mb-3`}></i>
                          <h6 className="card-title">{action.title}</h6>
                        </div>
                      </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información del sistema */}
      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Información del Sistema
              </h5>
            </div>
            <div className="card-body">
              <ul className="list-unstyled mb-0">
                <li className="mb-2">
                  <i className="fas fa-user text-primary me-2"></i>
                  <strong>Usuario:</strong> {userInfo?.nombre}
                </li>
                <li className="mb-2">
                  <i className="fas fa-envelope text-primary me-2"></i>
                  <strong>Email:</strong> {userInfo?.email}
                </li>
                <li className="mb-2">
                  <i className="fas fa-shield-alt text-primary me-2"></i>
                  <strong>Rol:</strong> {userInfo?.rol}
                </li>
                <li className="mb-0">
                  <i className="fas fa-clock text-primary me-2"></i>
                  <strong>Última conexión:</strong> {new Date().toLocaleString()}
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="col-md-6 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-bell me-2"></i>
                Notificaciones
              </h5>
            </div>
            <div className="card-body">
              <div className="alert alert-info mb-2">
                <i className="fas fa-info-circle me-2"></i>
                Sistema de inventario actualizado y funcionando correctamente.
              </div>
              <div className="alert alert-warning mb-0">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Recuerda revisar los productos próximos a vencer.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;