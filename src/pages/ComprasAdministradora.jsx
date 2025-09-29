import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import NotificationModal from '../components/NotificationModal';
import { useNotification } from '../hooks/useNotification';

function ComprasAdministradora() {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    proveedor: ''
  });
  
  // Estado para nueva compra
  const [nuevaCompra, setNuevaCompra] = useState({
    proveedor: '',
    fecha_compra: new Date().toISOString().split('T')[0],
    observaciones: '',
    productos: [{
      nombre: '',
      descripcion: '',
      costo_unitario: '',
      precio_venta_sugerido: '',
      cantidad: '',
      fecha_vencimiento: '',
      categoria: ''
    }]
  });

  const categorias = [
    'Uniformes', 'Alimentos', 'Bebidas', 'Útiles escolares', 
    'Materiales', 'Medicamentos', 'Otros'
  ];

  // Hook para notificaciones
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchCompras();
  }, []);

  const fetchCompras = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      let url = `http://${window.location.hostname}:3001/api/compras-administradora`;
      
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.proveedor) params.append('proveedor', filtros.proveedor);
      
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
        setCompras(data.compras);
      }
    } catch (error) {
      console.error('Error al cargar compras:', error);
    }
    setLoading(false);
  };

  const agregarProducto = () => {
    setNuevaCompra(prev => ({
      ...prev,
      productos: [...prev.productos, {
        nombre: '',
        descripcion: '',
        costo_unitario: '',
        precio_venta_sugerido: '',
        cantidad: '',
        fecha_vencimiento: '',
        categoria: ''
      }]
    }));
  };

  const eliminarProducto = (index) => {
    setNuevaCompra(prev => ({
      ...prev,
      productos: prev.productos.filter((_, i) => i !== index)
    }));
  };

  const actualizarProducto = (index, campo, valor) => {
    setNuevaCompra(prev => ({
      ...prev,
      productos: prev.productos.map((producto, i) => 
        i === index ? { ...producto, [campo]: valor } : producto
      )
    }));
  };

  const registrarCompra = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = authService.getToken();
      const response = await fetch(`http://${window.location.hostname}:3001/api/compras-administradora`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(nuevaCompra)
      });
      
      const data = await response.json();
      if (data.ok) {
        showSuccess('Compra registrada', 'Compra registrada exitosamente');
        setShowModal(false);
        setNuevaCompra({
          proveedor: '',
          fecha_compra: new Date().toISOString().split('T')[0],
          observaciones: '',
          productos: [{
            nombre: '',
            descripcion: '',
            costo_unitario: '',
            precio_venta_sugerido: '',
            cantidad: '',
            fecha_vencimiento: '',
            categoria: ''
          }]
        });
        fetchCompras();
      } else {
        showError('Error al registrar', 'Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error al registrar compra:', error);
      showError('Error de conexión', 'Error al registrar la compra');
    }
    setLoading(false);
  };

  const calcularTotalProducto = (producto) => {
    return (parseFloat(producto.costo_unitario) || 0) * (parseInt(producto.cantidad) || 0);
  };

  const calcularTotalCompra = () => {
    return nuevaCompra.productos.reduce((total, producto) => {
      return total + calcularTotalProducto(producto);
    }, 0);
  };

  return (
    <div className="container-fluid">
      <div className="page-inner">
        <div className="page-header">
          <h3 className="fw-bold mb-3">Compras de la Administradora</h3>
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
              <a href="#">Inventario</a>
            </li>
            <li className="separator">
              <i className="icon-arrow-right"></i>
            </li>
            <li className="nav-item">
              <a href="#">Compras</a>
            </li>
          </ul>
        </div>

        {/* Filtros */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <div className="d-flex align-items-center">
                  <h4 className="card-title">Filtros de Búsqueda</h4>
                  <button 
                    className="btn btn-primary btn-round ms-auto"
                    onClick={() => setShowModal(true)}
                  >
                    <i className="fa fa-plus"></i> Nueva Compra
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Fecha Inicio</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filtros.fecha_inicio}
                        onChange={(e) => setFiltros({...filtros, fecha_inicio: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Fecha Fin</label>
                      <input
                        type="date"
                        className="form-control"
                        value={filtros.fecha_fin}
                        onChange={(e) => setFiltros({...filtros, fecha_fin: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Proveedor</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por proveedor..."
                        value={filtros.proveedor}
                        onChange={(e) => setFiltros({...filtros, proveedor: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>&nbsp;</label>
                      <button 
                        className="btn btn-info btn-block"
                        onClick={fetchCompras}
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

        {/* Lista de Compras */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Historial de Compras</h4>
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
                          <th>Proveedor</th>
                          <th>Usuario</th>
                          <th>Total Productos</th>
                          <th>Total Compra</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {compras.map((compra) => (
                          <tr key={compra.id}>
                            <td>{compra.id}</td>
                            <td>{new Date(compra.fecha_compra).toLocaleDateString()}</td>
                            <td>{compra.proveedor}</td>
                            <td>{compra.usuario_nombre}</td>
                            <td>{compra.total_productos}</td>
                            <td>Bs {parseFloat(compra.total_compra || 0).toFixed(2)}</td>
                            <td>
                              <button 
                                className="btn btn-sm btn-info"
                                onClick={() => window.location.href = `#/compra-detalle/${compra.id}`}
                              >
                                <i className="fa fa-eye"></i> Ver Detalle
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {compras.length === 0 && (
                      <div className="text-center py-4">
                        <p>No se encontraron compras</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Nueva Compra */}
      {showModal && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Registrar Nueva Compra</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={registrarCompra}>
                <div className="modal-body">
                  <div className="row">
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Proveedor *</label>
                        <input
                          type="text"
                          className="form-control"
                          value={nuevaCompra.proveedor}
                          onChange={(e) => setNuevaCompra({...nuevaCompra, proveedor: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="form-group">
                        <label>Fecha de Compra *</label>
                        <input
                          type="date"
                          className="form-control"
                          value={nuevaCompra.fecha_compra}
                          onChange={(e) => setNuevaCompra({...nuevaCompra, fecha_compra: e.target.value})}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label>Observaciones</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={nuevaCompra.observaciones}
                      onChange={(e) => setNuevaCompra({...nuevaCompra, observaciones: e.target.value})}
                    ></textarea>
                  </div>

                  <hr />
                  
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5>Productos</h5>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-success"
                      onClick={agregarProducto}
                    >
                      <i className="fa fa-plus"></i> Agregar Producto
                    </button>
                  </div>

                  {nuevaCompra.productos.map((producto, index) => (
                    <div key={index} className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6>Producto {index + 1}</h6>
                          {nuevaCompra.productos.length > 1 && (
                            <button 
                              type="button" 
                              className="btn btn-sm btn-danger"
                              onClick={() => eliminarProducto(index)}
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          )}
                        </div>
                        
                        <div className="row">
                          <div className="col-md-6">
                            <div className="form-group">
                              <label>Nombre del Producto *</label>
                              <input
                                type="text"
                                className="form-control"
                                value={producto.nombre}
                                onChange={(e) => actualizarProducto(index, 'nombre', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-6">
                            <div className="form-group">
                              <label>Categoría</label>
                              <select
                                className="form-control"
                                value={producto.categoria}
                                onChange={(e) => actualizarProducto(index, 'categoria', e.target.value)}
                              >
                                <option value="">Seleccionar categoría</option>
                                {categorias.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>Descripción</label>
                          <textarea
                            className="form-control"
                            rows="2"
                            value={producto.descripcion}
                            onChange={(e) => actualizarProducto(index, 'descripcion', e.target.value)}
                          ></textarea>
                        </div>
                        
                        <div className="row">
                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Costo Unitario (Bs) *</label>
                              <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                value={producto.costo_unitario}
                                onChange={(e) => actualizarProducto(index, 'costo_unitario', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Precio Venta Sugerido (Bs) *</label>
                              <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                value={producto.precio_venta_sugerido}
                                onChange={(e) => actualizarProducto(index, 'precio_venta_sugerido', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Cantidad *</label>
                              <input
                                type="number"
                                className="form-control"
                                value={producto.cantidad}
                                onChange={(e) => actualizarProducto(index, 'cantidad', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Fecha de Vencimiento</label>
                              <input
                                type="date"
                                className="form-control"
                                value={producto.fecha_vencimiento}
                                onChange={(e) => actualizarProducto(index, 'fecha_vencimiento', e.target.value)}
                              />
                            </div>
                          </div>
                        </div>
                        
                        <div className="alert alert-info">
                          <strong>Total del producto:</strong> Bs {calcularTotalProducto(producto).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="alert alert-success">
                    <h5><strong>Total de la compra: Bs {calcularTotalCompra().toFixed(2)}</strong></h5>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Registrando...' : 'Registrar Compra'}
                  </button>
                </div>
              </form>
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

export default ComprasAdministradora;