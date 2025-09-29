import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import NotificationModal from '../components/NotificationModal';
import { useNotification } from '../hooks/useNotification';

function InventarioAlmacen() {
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [inventario, setInventario] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showVentaModal, setShowVentaModal] = useState(false);
  const [filtros, setFiltros] = useState({
    almacen_id: '',
    categoria: '',
    busqueda: ''
  });
  
  // Estado para nueva venta
  const [nuevaVenta, setNuevaVenta] = useState({
    inventario_almacen_id: null,
    cantidad: '',
    precio_venta: '',
    forma_pago: 'efectivo',
    observaciones: ''
  });

  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  const userInfo = authService.getUserInfo();
  const categorias = [
    'Uniformes', 'Alimentos', 'Bebidas', 'Útiles escolares', 
    'Materiales', 'Medicamentos', 'Otros'
  ];

  useEffect(() => {
    fetchAlmacenes();
  }, []);

  useEffect(() => {
    if (filtros.almacen_id) {
      fetchInventario();
    }
  }, [filtros.almacen_id]);

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
        // Si el usuario es de rol tienda, seleccionar automáticamente su almacén
        if (userInfo.rol === 'Tienda' && data.almacenes.length > 0) {
          // Aquí podrías implementar lógica para asociar usuarios con almacenes específicos
          // Por ahora, seleccionamos el primer almacén
          setFiltros(prev => ({...prev, almacen_id: data.almacenes[0].id.toString()}));
        }
      }
    } catch (error) {
      console.error('Error al cargar almacenes:', error);
    }
  };

  const fetchInventario = async () => {
    if (!filtros.almacen_id) return;
    
    setLoading(true);
    try {
      const token = authService.getToken();
      let url = `http://${window.location.hostname}:3001/api/inventario-almacen/${filtros.almacen_id}`;
      
      const params = new URLSearchParams();
      if (filtros.categoria) params.append('categoria', filtros.categoria);
      if (filtros.busqueda) params.append('busqueda', filtros.busqueda);
      
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
        setInventario(data.inventario);
      }
    } catch (error) {
      console.error('Error al cargar inventario:', error);
    }
    setLoading(false);
  };

  const abrirModalVenta = (item) => {
    setProductoSeleccionado(item);
    setNuevaVenta({
      inventario_almacen_id: item.id,
      cantidad: '1',
      precio_venta: item.precio_venta,
      forma_pago: 'efectivo',
      observaciones: ''
    });
    setShowVentaModal(true);
  };

  const registrarVenta = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const token = authService.getToken();
      const response = await fetch(`http://${window.location.hostname}:3001/api/ventas-inventario`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(nuevaVenta)
      });
      
      const data = await response.json();
      if (data.ok) {
        showSuccess('Venta registrada exitosamente');
        setShowVentaModal(false);
        fetchInventario(); // Recargar inventario para ver stock actualizado
      } else {
        showError('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error al registrar venta:', error);
      showError('Error al registrar la venta');
    }
    setLoading(false);
  };

  const calcularTotalVenta = () => {
    return (parseFloat(nuevaVenta.precio_venta) || 0) * (parseInt(nuevaVenta.cantidad) || 0);
  };

  const getAlmacenNombre = (almacenId) => {
    const almacen = almacenes.find(a => a.id === parseInt(almacenId));
    return almacen ? almacen.nombre : 'Almacén';
  };

  return (
    <div className="container-fluid">
      <div className="page-inner">
        <div className="page-header">
          <h3 className="fw-bold mb-3">Inventario de Almacén</h3>
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
              <a href="#">Almacén</a>
            </li>
          </ul>
        </div>

        {/* Filtros */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Filtros de Búsqueda</h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-3">
                    <div className="form-group">
                      <label>Almacén</label>
                      <select
                        className="form-control"
                        value={filtros.almacen_id}
                        onChange={(e) => setFiltros({...filtros, almacen_id: e.target.value})}
                        disabled={userInfo.rol === 'tienda'} // Los usuarios de tienda solo ven su almacén
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
                      <label>Categoría</label>
                      <select
                        className="form-control"
                        value={filtros.categoria}
                        onChange={(e) => setFiltros({...filtros, categoria: e.target.value})}
                      >
                        <option value="">Todas las categorías</option>
                        {categorias.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="form-group">
                      <label>Buscar Producto</label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Buscar por nombre..."
                        value={filtros.busqueda}
                        onChange={(e) => setFiltros({...filtros, busqueda: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="col-md-2">
                    <div className="form-group">
                      <label>&nbsp;</label>
                      <button 
                        className="btn btn-info btn-block"
                        onClick={fetchInventario}
                        disabled={loading || !filtros.almacen_id}
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

        {/* Inventario */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">
                  Inventario - {filtros.almacen_id ? getAlmacenNombre(filtros.almacen_id) : 'Seleccionar Almacén'}
                </h4>
              </div>
              <div className="card-body">
                {!filtros.almacen_id ? (
                  <div className="alert alert-info">
                    <i className="fa fa-info-circle"></i> Selecciona un almacén para ver el inventario.
                  </div>
                ) : loading ? (
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
                          <th>Producto</th>
                          <th>Categoría</th>
                          <th>Descripción</th>
                          <th>Stock</th>
                          <th>Costo Unit.</th>
                          <th>Precio Venta</th>
                          <th>Ganancia Unit.</th>
                          <th>Vencimiento</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventario.map((item) => (
                          <tr key={item.id}>
                            <td>{item.nombre}</td>
                            <td>{item.categoria || 'N/A'}</td>
                            <td>{item.descripcion || 'N/A'}</td>
                            <td>
                              <span className={`badge ${
                                item.stock > 10 ? 'badge-success' : 
                                item.stock > 0 ? 'badge-warning' : 'badge-danger'
                              }`}>
                                {item.stock}
                              </span>
                            </td>
                            <td>Bs {parseFloat(item.costo_unitario).toFixed(2)}</td>
                            <td>Bs {parseFloat(item.precio_venta).toFixed(2)}</td>
                            <td>
                              <span className="text-success">
                                Bs {(parseFloat(item.precio_venta) - parseFloat(item.costo_unitario)).toFixed(2)}
                              </span>
                            </td>
                            <td>
                              {item.fecha_vencimiento ? (
                                <span className={`badge ${
                                  new Date(item.fecha_vencimiento) < new Date() ? 'badge-danger' :
                                  new Date(item.fecha_vencimiento) < new Date(Date.now() + 30*24*60*60*1000) ? 'badge-warning' :
                                  'badge-success'
                                }`}>
                                  {new Date(item.fecha_vencimiento).toLocaleDateString()}
                                </span>
                              ) : 'N/A'}
                            </td>
                            <td>
                              {item.stock > 0 && (
                                <button 
                                  className="btn btn-sm btn-primary"
                                  onClick={() => abrirModalVenta(item)}
                                >
                                  <i className="fa fa-shopping-cart"></i> Vender
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {inventario.length === 0 && (
                      <div className="text-center py-4">
                        <p>No se encontraron productos en el inventario</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Registrar Venta */}
      {showVentaModal && productoSeleccionado && (
        <div className="modal fade show" style={{display: 'block'}} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Registrar Venta</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowVentaModal(false)}
                ></button>
              </div>
              <form onSubmit={registrarVenta}>
                <div className="modal-body">
                  <div className="alert alert-info">
                    <strong>Producto:</strong> {productoSeleccionado.nombre}<br />
                    <strong>Stock disponible:</strong> {productoSeleccionado.stock}<br />
                    <strong>Precio sugerido:</strong> Bs {parseFloat(productoSeleccionado.precio_venta).toFixed(2)}
                  </div>
                  
                  <div className="form-group">
                    <label>Cantidad *</label>
                    <input
                      type="number"
                      className="form-control"
                      value={nuevaVenta.cantidad}
                      onChange={(e) => setNuevaVenta({...nuevaVenta, cantidad: e.target.value})}
                      required
                      min="1"
                      max={productoSeleccionado.stock}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Precio de Venta (Bs) *</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      value={nuevaVenta.precio_venta}
                      onChange={(e) => setNuevaVenta({...nuevaVenta, precio_venta: e.target.value})}
                      required
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>Forma de Pago *</label>
                    <select
                      className="form-control"
                      value={nuevaVenta.forma_pago}
                      onChange={(e) => setNuevaVenta({...nuevaVenta, forma_pago: e.target.value})}
                      required
                    >
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="tarjeta">Tarjeta</option>
                      <option value="qr">QR</option>
                    </select>
                  </div>
                  
                  <div className="form-group">
                    <label>Observaciones</label>
                    <textarea
                      className="form-control"
                      rows="2"
                      value={nuevaVenta.observaciones}
                      onChange={(e) => setNuevaVenta({...nuevaVenta, observaciones: e.target.value})}
                    ></textarea>
                  </div>
                  
                  <div className="alert alert-success">
                    <strong>Total de la venta: Bs {calcularTotalVenta().toFixed(2)}</strong><br />
                    <strong>Ganancia unitaria: Bs {(parseFloat(nuevaVenta.precio_venta) - parseFloat(productoSeleccionado.costo_unitario)).toFixed(2)}</strong><br />
                    <strong>Ganancia total: Bs {((parseFloat(nuevaVenta.precio_venta) - parseFloat(productoSeleccionado.costo_unitario)) * parseInt(nuevaVenta.cantidad || 0)).toFixed(2)}</strong>
                  </div>
                </div>
                
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowVentaModal(false)}
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? 'Registrando...' : 'Registrar Venta'}
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

export default InventarioAlmacen;