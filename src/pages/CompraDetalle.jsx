import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { authService } from '../services/authService';
import NotificationModal from '../components/NotificationModal';
import { useNotification } from '../hooks/useNotification';

function CompraDetalle() {
  const { id } = useParams();
  const [compra, setCompra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDistribuirModal, setShowDistribuirModal] = useState(false);
  const [almacenes, setAlmacenes] = useState([]);
  const [distribucion, setDistribucion] = useState({
    producto_id: null,
    distribuciones: []
  });

  // Hook para notificaciones
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    fetchCompraDetalle();
    fetchAlmacenes();
  }, [id]);

  const fetchCompraDetalle = async () => {
    try {
      const token = authService.getToken();
      const response = await fetch(`http://${window.location.hostname}:3001/api/compras-administradora/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      if (data.ok) {
        setCompra(data.compra);
      }
    } catch (error) {
      console.error('Error al cargar detalle de compra:', error);
    }
    setLoading(false);
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

  const abrirModalDistribuir = (producto) => {
    setDistribucion({
      producto_id: producto.id,
      distribuciones: [{
        almacen_id: '',
        cantidad: '',
        precio_venta: producto.precio_venta_sugerido
      }]
    });
    setShowDistribuirModal(true);
  };

  const agregarDistribucion = () => {
    setDistribucion(prev => ({
      ...prev,
      distribuciones: [...prev.distribuciones, {
        almacen_id: '',
        cantidad: '',
        precio_venta: ''
      }]
    }));
  };

  const eliminarDistribucion = (index) => {
    setDistribucion(prev => ({
      ...prev,
      distribuciones: prev.distribuciones.filter((_, i) => i !== index)
    }));
  };

  const actualizarDistribucion = (index, campo, valor) => {
    setDistribucion(prev => ({
      ...prev,
      distribuciones: prev.distribuciones.map((dist, i) => 
        i === index ? { ...dist, [campo]: valor } : dist
      )
    }));
  };

  const distribuirProducto = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = authService.getToken();
      const response = await fetch(`http://${window.location.hostname}:3001/api/distribuir-productos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          producto_id: distribucion.producto_id,
          distribuciones: distribucion.distribuciones
        })
      });
      
      const data = await response.json();
      if (data.ok) {
        showSuccess('Producto distribuido', 'Producto distribuido exitosamente');
        setShowDistribuirModal(false);
        fetchCompraDetalle(); // Recargar para ver las cantidades actualizadas
      } else {
        showError('Error al distribuir', 'Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error al distribuir producto:', error);
      showError('Error de conexión', 'Error al distribuir el producto');
    }
    setLoading(false);
  };

  const getTotalDistribuido = () => {
    return distribucion.distribuciones.reduce((total, dist) => {
      return total + (parseInt(dist.cantidad) || 0);
    }, 0);
  };

  const getProductoSeleccionado = () => {
    if (!compra || !distribucion.producto_id) return null;
    return compra.productos.find(p => p.id === distribucion.producto_id);
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="page-inner">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="sr-only">Cargando...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!compra) {
    return (
      <div className="container-fluid">
        <div className="page-inner">
          <div className="alert alert-danger">
            No se encontró la compra solicitada.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="page-inner">
        <div className="page-header">
          <h3 className="fw-bold mb-3">Detalle de Compra #{compra.id}</h3>
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
              <a href="#/compras-administradora">Compras</a>
            </li>
            <li className="separator">
              <i className="icon-arrow-right"></i>
            </li>
            <li className="nav-item">
              <a href="#">Detalle</a>
            </li>
          </ul>
        </div>

        {/* Información de la Compra */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Información General</h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <strong>Proveedor:</strong><br />
                    {compra.proveedor}
                  </div>
                  <div className="col-md-3">
                    <strong>Fecha de Compra:</strong><br />
                    {new Date(compra.fecha_compra).toLocaleDateString()}
                  </div>
                  <div className="col-md-3">
                    <strong>Usuario:</strong><br />
                    {compra.usuario_nombre}
                  </div>
                  <div className="col-md-3">
                    <strong>Total:</strong><br />
                    <span className="text-success fw-bold">Bs {parseFloat(compra.total_compra || 0).toFixed(2)}</span>
                  </div>
                </div>
                {compra.observaciones && (
                  <div className="row mt-3">
                    <div className="col-md-12">
                      <strong>Observaciones:</strong><br />
                      {compra.observaciones}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Productos de la Compra */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Productos Comprados</h4>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th>Categoría</th>
                        <th>Descripción</th>
                        <th>Costo Unit.</th>
                        <th>Precio Sugerido</th>
                        <th>Cantidad Total</th>
                        <th>Distribuido</th>
                        <th>Disponible</th>
                        <th>Subtotal</th>
                        <th>Vencimiento</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {compra.productos.map((producto) => (
                        <tr key={producto.id}>
                          <td>{producto.nombre}</td>
                          <td>{producto.categoria || 'N/A'}</td>
                          <td>{producto.descripcion || 'N/A'}</td>
                          <td>Bs {parseFloat(producto.costo_unitario).toFixed(2)}</td>
                          <td>Bs {parseFloat(producto.precio_venta_sugerido).toFixed(2)}</td>
                          <td>{producto.cantidad}</td>
                          <td>
                            <span className="badge badge-info">
                              {producto.cantidad_distribuida || 0}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              (producto.cantidad_disponible || 0) > 0 ? 'badge-success' : 'badge-warning'
                            }`}>
                              {producto.cantidad_disponible || 0}
                            </span>
                          </td>
                          <td>Bs {(parseFloat(producto.costo_unitario) * parseInt(producto.cantidad)).toFixed(2)}</td>
                          <td>
                            {producto.fecha_vencimiento ? 
                              new Date(producto.fecha_vencimiento).toLocaleDateString() : 'N/A'
                            }
                          </td>
                          <td>
                            {(producto.cantidad_disponible || 0) > 0 && (
                              <button 
                                className="btn btn-sm btn-primary"
                                onClick={() => abrirModalDistribuir(producto)}
                              >
                                <i className="fa fa-share"></i> Distribuir
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Distribuir Producto */}
      {showDistribuirModal && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Distribuir Producto</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowDistribuirModal(false)}
                ></button>
              </div>
              <form onSubmit={distribuirProducto}>
                <div className="modal-body">
                  {getProductoSeleccionado() && (
                    <div className="alert alert-info">
                      <strong>Producto:</strong> {getProductoSeleccionado().nombre}<br />
                      <strong>Cantidad disponible:</strong> {getProductoSeleccionado().cantidad_disponible || 0}
                    </div>
                  )}
                  
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6>Distribuciones</h6>
                    <button 
                      type="button" 
                      className="btn btn-sm btn-success"
                      onClick={agregarDistribucion}
                    >
                      <i className="fa fa-plus"></i> Agregar Almacén
                    </button>
                  </div>

                  {distribucion.distribuciones.map((dist, index) => (
                    <div key={index} className="card mb-3">
                      <div className="card-body">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <h6>Distribución {index + 1}</h6>
                          {distribucion.distribuciones.length > 1 && (
                            <button 
                              type="button" 
                              className="btn btn-sm btn-danger"
                              onClick={() => eliminarDistribucion(index)}
                            >
                              <i className="fa fa-trash"></i>
                            </button>
                          )}
                        </div>
                        
                        <div className="row">
                          <div className="col-md-6">
                            <div className="form-group">
                              <label>Almacén *</label>
                              <select
                                className="form-control"
                                value={dist.almacen_id}
                                onChange={(e) => actualizarDistribucion(index, 'almacen_id', e.target.value)}
                                required
                              >
                                <option value="">Seleccionar almacén</option>
                                {almacenes.map(almacen => (
                                  <option key={almacen.id} value={almacen.id}>
                                    {almacen.nombre}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Cantidad *</label>
                              <input
                                type="number"
                                className="form-control"
                                value={dist.cantidad}
                                onChange={(e) => actualizarDistribucion(index, 'cantidad', e.target.value)}
                                required
                                min="1"
                              />
                            </div>
                          </div>
                          <div className="col-md-3">
                            <div className="form-group">
                              <label>Precio de Venta (Bs) *</label>
                              <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                value={dist.precio_venta}
                                onChange={(e) => actualizarDistribucion(index, 'precio_venta', e.target.value)}
                                required
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  <div className="alert alert-warning">
                    <strong>Total a distribuir:</strong> {getTotalDistribuido()}<br />
                    <strong>Disponible:</strong> {getProductoSeleccionado()?.cantidad_disponible || 0}
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowDistribuirModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading || getTotalDistribuido() > (getProductoSeleccionado()?.cantidad_disponible || 0)}
                  >
                    {loading ? 'Distribuyendo...' : 'Distribuir'}
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

export default CompraDetalle;