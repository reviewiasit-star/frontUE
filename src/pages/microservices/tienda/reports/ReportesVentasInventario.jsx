import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import { Link } from 'react-router-dom';
import NotificationModal from '../components/NotificationModal';
import { useNotification } from '../hooks/useNotification';
import '../../styles/Reportes.css';

function ReportesVentasInventario() {
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [reportes, setReportes] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totales, setTotales] = useState({
    total_ventas: 0,
    total_ganancias: 0,
    total_costos: 0,
    cantidad_ventas: 0
  });
  
  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    usuario_id: '',
    almacen_id: '',
    forma_pago: ''
  });

  // Estado para el menú hamburguesa móvil
  const [menuHamburguesaVisible, setMenuHamburguesaVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const formasPago = ['efectivo', 'transferencia', 'tarjeta', 'qr'];

  useEffect(() => {
    fetchUsuarios();
    fetchAlmacenes();
    // Obtener información del usuario
    const userData = authService.getUser();
    setUserInfo(userData);
    // Cargar reportes del mes actual por defecto
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    setFiltros(prev => ({
      ...prev,
      fecha_inicio: primerDia.toISOString().split('T')[0],
      fecha_fin: hoy.toISOString().split('T')[0]
    }));
  }, []);

  useEffect(() => {
    if (filtros.fecha_inicio && filtros.fecha_fin) {
      fetchReportes();
    }
  }, [filtros.fecha_inicio, filtros.fecha_fin]);

  const fetchUsuarios = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(`http://${window.location.hostname}:3001/api/usuarios`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.ok) {
        setUsuarios(data.usuarios.filter(u => u.rol === 'Tienda' || u.rol === 'Administrador'));
      }
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  const fetchAlmacenes = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(`http://${window.location.hostname}:3001/api/almacenes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.ok) {
        setAlmacenes(data.almacenes);
      }
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const fetchReportes = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      let url = `http://${window.location.hostname}:3001/api/reportes-ventas-inventario`;
      
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.usuario_id) params.append('usuario_id', filtros.usuario_id);
      if (filtros.almacen_id) params.append('almacen_id', filtros.almacen_id);
      if (filtros.forma_pago) params.append('forma_pago', filtros.forma_pago);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.ok) {
        setReportes(data.ventas);
        setTotales(data.totales);
      }
    } catch (error) {
      console.error('Error al cargar reportes:', error);
    }
    setLoading(false);
  };

  const exportarExcel = async () => {
    try {
      const token = authService.getToken();
      let url = `http://${window.location.hostname}:3001/api/reportes-ventas-inventario`;
      
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.usuario_id) params.append('usuario_id', filtros.usuario_id);
      if (filtros.almacen_id) params.append('almacen_id', filtros.almacen_id);
      if (filtros.forma_pago) params.append('forma_pago', filtros.forma_pago);
      params.append('formato', 'excel');
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `reporte_ventas_${filtros.fecha_inicio}_${filtros.fecha_fin}.xlsx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error al exportar:', error);
      showError('Error al exportar el reporte');
    }
  };

  const getUsuarioNombre = (usuarioId) => {
    const usuario = usuarios.find(u => u.id === usuarioId);
    return usuario ? usuario.nombre : 'N/A';
  };

  const getAlmacenNombre = (almacenId) => {
    const almacen = almacenes.find(a => a.id === almacenId);
    return almacen ? almacen.nombre : 'N/A';
  };

  const cerrarMenuHamburguesa = () => {
    setMenuHamburguesaVisible(false);
  };

  const handleLogout = () => {
    authService.logout();
    window.location.href = '/';
  };

  return (
    <div className="container-fluid">
      <div className="page-inner">
        <div className="page-header">
          {/* Botón hamburguesa para móvil */}
          <div className="d-flex align-items-center mb-3">
            <button 
              className="btn btn-outline-secondary d-md-none me-3" 
              onClick={() => setMenuHamburguesaVisible(true)}
              title="Menú de navegación"
              style={{ fontSize: '0.9rem', padding: '8px 12px' }}
            >
              <i className="fas fa-bars"></i>
            </button>
            <h3 className="fw-bold mb-0">Reportes de Ventas - Sistema de Inventario</h3>
          </div>
          <ul className="breadcrumbs mb-3">
            <li className="nav-home">
              <a href="#">
                <i className="icon-home"></i>
              </a>
            </li>
            <li className="separator">
              <i className="icon-arrow-right"></i>
            </li>
            <li className="nav-item">
              <a href="#">Reportes</a>
            </li>
            <li className="separator">
              <i className="icon-arrow-right"></i>
            </li>
            <li className="nav-item">
              <a href="#">Ventas Inventario</a>
            </li>
          </ul>
        </div>

        {/* Resumen de Totales */}
        <div className="row">
          <div className="col-sm-6 col-md-3">
            <div className="card card-stats card-round">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-icon">
                    <div className="icon-big text-center icon-primary bubble-shadow-small">
                      <i className="fas fa-shopping-cart"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Total Ventas</p>
                      <h4 className="card-title">Bs {parseFloat(totales.total_ventas || 0).toFixed(2)}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="card card-stats card-round">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-icon">
                    <div className="icon-big text-center icon-success bubble-shadow-small">
                      <i className="fas fa-chart-line"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Total Ganancias</p>
                      <h4 className="card-title">Bs {parseFloat(totales.total_ganancias || 0).toFixed(2)}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="card card-stats card-round">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-icon">
                    <div className="icon-big text-center icon-warning bubble-shadow-small">
                      <i className="fas fa-dollar-sign"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Total Costos</p>
                      <h4 className="card-title">Bs {parseFloat(totales.total_costos || 0).toFixed(2)}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-sm-6 col-md-3">
            <div className="card card-stats card-round">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-icon">
                    <div className="icon-big text-center icon-info bubble-shadow-small">
                      <i className="fas fa-list"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Cantidad Ventas</p>
                      <h4 className="card-title">{totales.cantidad_ventas || 0}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <div className="d-flex align-items-center">
                  <h4 className="card-title">Filtros de Búsqueda</h4>
                  <button 
                    className="btn btn-success btn-round ms-auto"
                    onClick={exportarExcel}
                    disabled={loading || reportes.length === 0}
                  >
                    <i className="fa fa-download"></i> Exportar Excel
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Fecha Inicio *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filtros.fecha_inicio}
                        onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Fecha Fin *</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filtros.fecha_fin}
                        onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Usuario</label>
                      <select
                        className="form-control"
                        value={filtros.usuario_id}
                        onChange={(e) => setFiltros({...filtros, usuario_id: e.target.value})}
                      >
                        <option value="">Todos los usuarios</option>
                        {usuarios.map(usuario => (
                          <option key={usuario.id} value={usuario.id}>
                            {usuario.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Almacén</label>
                      <select
                        className="form-control"
                        value={filtros.almacen_id}
                        onChange={(e) => setFiltros({...filtros, almacen_id: e.target.value})}
                      >
                        <option value="">Todos los almacenes</option>
                        {almacenes.map(almacen => (
                          <option key={almacen.id} value={almacen.id}>
                            {almacen.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>Forma de Pago</label>
                      <select
                        className="form-control"
                        value={filtros.forma_pago}
                        onChange={(e) => setFiltros({...filtros, forma_pago: e.target.value})}
                      >
                        <option value="">Todas las formas</option>
                        {formasPago.map(forma => (
                          <option key={forma} value={forma}>
                            {forma.charAt(0).toUpperCase() + forma.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>&nbsp;</label>
                      <button 
                        className="btn btn-info btn-block"
                        onClick={fetchReportes}
                        disabled={loading}
                      >
                        <i className="fa fa-search"></i> Buscar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Reportes */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Detalle de Ventas</h4>
              </div>
              <div className="card-body">
                {loading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="sr-only">Cargando...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Fecha</th>
                          <th>Usuario</th>
                          <th>Almacén</th>
                          <th>Producto</th>
                          <th>Cantidad</th>
                          <th>Precio Unit.</th>
                          <th>Total Venta</th>
                          <th>Costo Unit.</th>
                          <th>Ganancia Unit.</th>
                          <th>Ganancia Total</th>
                          <th>Forma Pago</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportes.map((venta) => (
                          <tr key={venta.id}>
                            <td>{venta.id}</td>
                            <td>{new Date(venta.fecha).toLocaleDateString()}</td>
                            <td>{getUsuarioNombre(venta.usuario_id)}</td>
                            <td>{getAlmacenNombre(venta.almacen_id)}</td>
                            <td>{venta.producto_nombre}</td>
                            <td>{venta.cantidad}</td>
                            <td>Bs {parseFloat(venta.precio_venta).toFixed(2)}</td>
                            <td>Bs {(parseFloat(venta.precio_venta) * parseInt(venta.cantidad)).toFixed(2)}</td>
                            <td>Bs {parseFloat(venta.costo_unitario).toFixed(2)}</td>
                            <td>Bs {parseFloat(venta.ganancia_unitaria).toFixed(2)}</td>
                            <td>
                              <span className="text-success fw-bold">
                                Bs {(parseFloat(venta.ganancia_unitaria) * parseInt(venta.cantidad)).toFixed(2)}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                venta.forma_pago === 'efectivo' ? 'badge-success' :
                                venta.forma_pago === 'transferencia' ? 'badge-info' :
                                venta.forma_pago === 'tarjeta' ? 'badge-warning' : 'badge-primary'
                              }`}>
                                {venta.forma_pago.charAt(0).toUpperCase() + venta.forma_pago.slice(1)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {reportes.length === 0 && (
                      <div className="text-center py-4">
                        <p>No se encontraron ventas en el período seleccionado</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal del Menú Hamburguesa para Dispositivos Móviles */}
      {menuHamburguesaVisible && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-fullscreen-sm-down">
            <div className="modal-content h-100" style={{ borderRadius: '0', border: 'none' }}>
              <div className="modal-header bg-dark text-white" style={{ borderBottom: '1px solid #dee2e6' }}>
                <h5 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                  <i className="fas fa-bars me-2"></i> 
                  Menú de Navegación
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={cerrarMenuHamburguesa}
                  aria-label="Cerrar"
                ></button>
              </div>
              
              <div className="modal-body p-0" style={{ overflowY: 'auto' }}>
                <div className="p-3">
                  {/* Información del usuario */}
                  <div className="card bg-primary text-white mb-3">
                    <div className="card-body text-center" style={{ padding: '20px' }}>
                      <i className="fas fa-user-circle fa-3x mb-3"></i>
                      <h6 className="mb-1">Bienvenido</h6>
                      <p className="mb-0" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                        {userInfo?.nombre || 'Usuario'} {userInfo?.apellido || ''}
                      </p>
                      <small style={{ fontSize: '0.8rem', opacity: 0.8 }}>
                        {userInfo?.rol || 'Usuario'}
                      </small>
                    </div>
                  </div>

                  {/* Opciones de navegación */}
                  <div className="list-group list-group-flush">
                    <Link 
                      to="/" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-home me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Dashboard</span>
                    </Link>

                    <Link 
                      to="/tienda" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-store me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Tienda</span>
                    </Link>

                    <Link 
                      to="/reporte-ventas" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-chart-bar me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Reporte de ventas</span>
                    </Link>

                    {/* Cerrar sesión */}
                    <button 
                      className="list-group-item list-group-item-action d-flex align-items-center text-danger"
                      onClick={() => {
                        cerrarMenuHamburguesa();
                        handleLogout();
                      }}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem',
                        backgroundColor: 'transparent',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <i className="fas fa-sign-out-alt me-3" style={{ width: '20px' }}></i>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Componente de notificaciones */}
      <NotificationModal
        show={notification.show}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={hideNotification}
      />
    </div>
  );
}

export default ReportesVentasInventario;