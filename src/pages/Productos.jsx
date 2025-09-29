import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductoModal from '../components/ProductoModal';
import DuplicarProductoModal from '../components/DuplicarProductoModal';
import AuthService from '../services/authService';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDuplicarModal, setShowDuplicarModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [productoDuplicar, setProductoDuplicar] = useState(null);
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [busqueda, setBusqueda] = useState('');

  // Estados para el menú hamburguesa
  const [menuHamburguesaVisible, setMenuHamburguesaVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  const categorias = [
    'alimentos', 'bebidas', 'farmacia', 'limpieza', 'papeleria', 
    'material escolar', 'muebles', 'tecnologia', 'ropa', 'juguetes', 
    'deportes', 'ferreteria', 'otros'
  ];

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);
    
    fetchProductos();
    fetchAlmacenes();
  }, []);

  const fetchProductos = async () => {
    try {
      setLoading(true);
      setError('');
      console.log('🔍 Iniciando carga de productos...');
      
      const token = localStorage.getItem('token');
      console.log('🔑 Token encontrado:', token ? 'Sí' : 'No');
      
      const url = `http://${window.location.hostname}:3001/api/productos`;
      console.log('🌐 URL de la petición:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Respuesta del servidor:', response.status, response.statusText);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Productos recibidos:', data.length || 0);
        console.log('📦 Datos:', data);
        setProductos(data);
      } else {
        const errorText = await response.text();
        console.error('❌ Error del servidor:', response.status, errorText);
        setError(`Error al cargar productos: ${response.status} - ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      setError(`Error de conexión: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchAlmacenes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/almacenes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAlmacenes(data);
      }
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const handleNuevoProducto = () => {
    setSelectedProducto(null);
    setShowModal(true);
  };

  const handleEditarProducto = (producto) => {
    setSelectedProducto(producto);
    setShowModal(true);
  };

  const handleDuplicarProducto = (producto) => {
    setProductoDuplicar(producto);
    setShowDuplicarModal(true);
  };

  const handleEliminarProducto = async (id) => {
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://${window.location.hostname}:3001/api/productos/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchProductos();
        } else {
          setError('Error al eliminar producto');
        }
      } catch (error) {
        console.error('Error:', error);
        setError('Error de conexión');
      }
    }
  };

  const handleGuardarProductoDuplicado = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/productos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        fetchProductos();
        setShowDuplicarModal(false);
        setProductoDuplicar(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al duplicar producto');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    }
  };

  const handleGuardarProducto = async (formData) => {
    try {
      const token = localStorage.getItem('token');
      const url = selectedProducto 
        ? `http://${window.location.hostname}:3001/api/productos/${selectedProducto.id}`
        : `http://${window.location.hostname}:3001/api/productos`;
      
      const method = selectedProducto ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        fetchProductos();
        setShowModal(false);
        setSelectedProducto(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Error al guardar producto');
      }
    } catch (error) {
      console.error('Error:', error);
      setError('Error de conexión');
    }
  };

  // Filtrar productos
  const productosFiltrados = productos.filter(producto => {
    const cumpleFiltroAlmacen = !filtroAlmacen || producto.almacen_id.toString() === filtroAlmacen;
    const cumpleFiltroCategoria = !filtroCategoria || producto.categoria.toLowerCase() === filtroCategoria.toLowerCase();
    const cumpleBusqueda = !busqueda || 
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (producto.codigo && producto.codigo.toLowerCase().includes(busqueda.toLowerCase()));
    
    return cumpleFiltroAlmacen && cumpleFiltroCategoria && cumpleBusqueda;
  });

  // Funciones para el menú hamburguesa
  const cerrarMenuHamburguesa = () => {
    setMenuHamburguesaVisible(false);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
  };

  if (loading) {
    return (
      <div className="container">
        <div className="page-inner">
          <div className="d-flex align-items-left align-items-md-center flex-column flex-md-row pt-2 pb-4">
            <div>
              <h3 className="fw-bold mb-3">Productos</h3>
            </div>
          </div>
          <div className="d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
            <div className="spinner-border text-primary" role="status">
              <span className="sr-only">Cargando...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="page-inner">
        <div className="d-flex align-items-left align-items-md-center flex-column flex-md-row pt-2 pb-4">
          <div className="d-flex justify-content-between align-items-center w-100">
            <div>
              <h3 className="fw-bold mb-3">Gestión de Productos</h3>
              <h6 className="op-7 mb-2">Administración de productos del inventario</h6>
            </div>
            <div className="d-flex align-items-center">
              <button 
                className="btn btn-primary btn-round me-2"
                onClick={handleNuevoProducto}
              >
                <i className="fa fa-plus"></i> Nuevo Producto
              </button>
              <button 
                className="btn btn-outline-primary d-md-none"
                onClick={() => setMenuHamburguesaVisible(true)}
                style={{ 
                  border: 'none', 
                  background: 'transparent',
                  fontSize: '1.5rem',
                  padding: '0.5rem'
                }}
              >
                <i className="fas fa-bars"></i>
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fa fa-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {/* Estadísticas rápidas */}
        <div className="row mb-4">
          <div className="col-sm-6 col-md-3">
            <div className="card card-stats card-round">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-icon">
                    <div className="icon-big text-center icon-primary bubble-shadow-small">
                      <i className="fas fa-boxes"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Total Productos</p>
                      <h4 className="card-title">{productos.length}</h4>
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
                    <div className="icon-big text-center icon-danger bubble-shadow-small">
                      <i className="fas fa-exclamation-triangle"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Stock Crítico</p>
                      <h4 className="card-title">
                        {productos.filter(p => p.stock <= 5).length}
                      </h4>
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
                      <i className="fas fa-clock"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Productos Perecederos</p>
                      <h4 className="card-title">
                        {productos.filter(p => p.tipo_producto === 'perecedero').length}
                      </h4>
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
                      <i className="fas fa-warehouse"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Almacenes</p>
                      <h4 className="card-title">{almacenes.length}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <div className="d-flex align-items-center">
                  <h4 className="card-title">Lista de Productos</h4>
                </div>
              </div>
              <div className="card-body">
                {/* Filtros */}
                <div className="row mb-3">
                  <div className="col-md-3">
                    <label className="form-label">Almacén</label>
                    <select 
                      className="form-control"
                      value={filtroAlmacen}
                      onChange={(e) => setFiltroAlmacen(e.target.value)}
                    >
                      <option value="">Todos los almacenes</option>
                      {almacenes.map(almacen => (
                        <option key={almacen.id} value={almacen.id}>
                          {almacen.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Categoría</label>
                    <select 
                      className="form-control"
                      value={filtroCategoria}
                      onChange={(e) => setFiltroCategoria(e.target.value)}
                    >
                      <option value="">Todas las categorías</option>
                      {categorias.map(categoria => (
                        <option key={categoria} value={categoria}>
                          {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Buscar</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Buscar por nombre, código..."
                      value={busqueda}
                      onChange={(e) => setBusqueda(e.target.value)}
                    />
                  </div>
                  <div className="col-md-3 d-flex align-items-end">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        setFiltroAlmacen('');
                        setFiltroCategoria('');
                        setBusqueda('');
                      }}
                    >
                      <i className="fa fa-refresh"></i> Limpiar Filtros
                    </button>
                  </div>
                </div>

                {/* Tabla de productos */}
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Imagen</th>
                        <th>Código</th>
                        <th>Nombre</th>
                        <th>Categoría</th>
                        <th>Almacén</th>
                        <th>Stock</th>
                        <th>Precio Compra</th>
                        <th>Precio Venta</th>
                        <th>Fecha Vencimiento</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan="10" className="text-center">
                            No se encontraron productos
                          </td>
                        </tr>
                      ) : (
                        productosFiltrados.map(producto => (
                          <tr key={producto.id}>
                            <td>
                              {producto.imagen ? (
                                <img 
                                  src={`http://${window.location.hostname}:3001/uploads/${producto.imagen}`}
                                  alt={producto.nombre}
                                  style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                  className="rounded"
                                />
                              ) : (
                                <div 
                                  className="bg-secondary rounded d-flex align-items-center justify-content-center"
                                  style={{ width: '50px', height: '50px' }}
                                >
                                  <i className="fa fa-image text-white"></i>
                                </div>
                              )}
                            </td>
                            <td>
                              {producto.codigo ? (
                                <code>{producto.codigo}</code>
                              ) : (
                                <span className="text-muted">Sin código</span>
                              )}
                            </td>
                            <td>
                              <strong>{producto.nombre}</strong>
                              {producto.descripcion && (
                                <div className="text-muted small">{producto.descripcion}</div>
                              )}
                            </td>
                            <td>
                              <span className="badge badge-secondary">
                                {producto.categoria}
                              </span>
                            </td>
                            <td>{producto.almacen_nombre}</td>
                            <td>
                              <span className={`badge ${producto.stock <= 5 ? 'badge-danger' : 'badge-success'}`}>
                                {producto.stock} {producto.unidad}
                              </span>
                            </td>
                            <td>
                              <strong>${parseFloat(producto.precio_unitario || 0).toFixed(2)}</strong>
                            </td>
                            <td>
                              <strong>${parseFloat(producto.precio_salida || 0).toFixed(2)}</strong>
                            </td>
                            <td>
                              {producto.fecha_vencimiento ? (
                                <span className="text-warning">
                                  {new Date(producto.fecha_vencimiento).toLocaleDateString()}
                                </span>
                              ) : (
                                <span className="text-muted">No aplica</span>
                              )}
                            </td>
                            <td>
                              <div className="btn-group" role="group">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => handleEditarProducto(producto)}
                                  title="Editar"
                                >
                                  <i className="fa fa-edit"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-info"
                                  onClick={() => handleDuplicarProducto(producto)}
                                  title="Duplicar Producto"
                                >
                                  <i className="fa fa-copy"></i>
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleEliminarProducto(producto.id)}
                                  title="Eliminar"
                                >
                                  <i className="fa fa-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Modal de Producto */}
        {showModal && (
          <ProductoModal
            isOpen={showModal}
            onClose={() => {
              setShowModal(false);
              setSelectedProducto(null);
            }}
            producto={selectedProducto}
            almacenes={almacenes}
            onSave={handleGuardarProducto}
          />
        )}

        {/* Modal de Duplicar Producto */}
        {showDuplicarModal && (
          <DuplicarProductoModal
            isOpen={showDuplicarModal}
            onClose={() => {
              setShowDuplicarModal(false);
              setProductoDuplicar(null);
            }}
            producto={productoDuplicar}
            almacenes={almacenes}
            onSave={handleGuardarProductoDuplicado}
          />
        )}

        {/* Modal del menú hamburguesa */}
        {menuHamburguesaVisible && (
          <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
            <div className="modal-dialog modal-fullscreen-sm-down">
              <div className="modal-content" style={{ 
                border: 'none', 
                borderRadius: '0',
                height: '100vh',
                maxHeight: '100vh'
              }}>
                <div className="modal-header" style={{ 
                  borderBottom: '1px solid #dee2e6',
                  backgroundColor: '#f8f9fa'
                }}>
                  <div className="d-flex align-items-center">
                    <div className="me-3">
                      <i className="fas fa-user-circle text-primary" style={{ fontSize: '2rem' }}></i>
                    </div>
                    <div>
                      <h6 className="mb-0">{userInfo?.nombre || 'Usuario'}</h6>
                      <small className="text-muted">{userInfo?.rol || 'Rol'}</small>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={cerrarMenuHamburguesa}
                  ></button>
                </div>
                
                <div className="modal-body p-0">
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
                      to="/usuarios" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-users me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Usuarios</span>
                    </Link>

                    <Link 
                      to="/estudiantes" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-list me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Estudiantes</span>
                    </Link>

                    <Link 
                      to="/becas" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-gift me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Becas</span>
                    </Link>

                    <Link 
                      to="/compromiso" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-file-invoice-dollar me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Compromiso Económico</span>
                    </Link>

                    <Link 
                      to="/academia" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-graduation-cap me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Academia</span>
                    </Link>

                    <Link 
                      to="/almacenes" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-warehouse me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Almacenes</span>
                    </Link>

                    <Link 
                      to="/productos" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-boxes me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Productos</span>
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
                      to="/compras-administradora" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-shopping-cart me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Compras Administradora</span>
                    </Link>

                    <Link 
                      to="/inventario-almacen" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-boxes me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Inventario de Almacén</span>
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
                      <span>Reporte de Ventas</span>
                    </Link>

                    <Link 
                      to="/resumen-ganancias-perdidas" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-chart-line me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Ganancias y Pérdidas</span>
                    </Link>

                    <Link 
                      to="/ingresos-academicos" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-university me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Ingresos Académicos</span>
                    </Link>

                    <Link 
                      to="/movimientos-gastos" 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={cerrarMenuHamburguesa}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem'
                      }}
                    >
                      <i className="fas fa-exchange-alt me-3 text-primary" style={{ width: '20px' }}></i>
                      <span>Movimientos y Gastos</span>
                    </Link>

                    <Link 
                      to="/reportes" 
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
                      <span>Reportes Tradicionales</span>
                    </Link>

                    <button 
                      className="list-group-item list-group-item-action d-flex align-items-center"
                      onClick={handleLogout}
                      style={{ 
                        padding: '15px 20px', 
                        border: 'none', 
                        borderBottom: '1px solid #dee2e6',
                        fontSize: '1rem',
                        background: 'none',
                        width: '100%',
                        textAlign: 'left'
                      }}
                    >
                      <i className="fas fa-sign-out-alt me-3 text-danger" style={{ width: '20px' }}></i>
                      <span>Cerrar Sesión</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Productos;