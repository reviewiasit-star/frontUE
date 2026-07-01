import React, { useEffect, useState } from 'react';
import AuthService from '../../../services/authService';
import { Link } from 'react-router-dom';
import GestionLotesModal from '../../../components/GestionLotesModal';
import { formatCurrency, safeParseFloat } from '../../../utils/numberUtils';

function Tienda() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [carrito, setCarrito] = useState([]);
  const [procesandoVenta, setProcesandoVenta] = useState(false);
  const [estudiantes, setEstudiantes] = useState([]);
  
  // Estados específicos para el carrito
  const [carritoEstudianteSeleccionado, setCarritoEstudianteSeleccionado] = useState('');
  const [carritoFormaPago, setCarritoFormaPago] = useState('Efectivo');
  const [carritoVisible, setCarritoVisible] = useState(false);
  const [carritoModalVisible, setCarritoModalVisible] = useState(false);
  const [fechaCompra, setFechaCompra] = useState(new Date());
  
  const [userInfo, setUserInfo] = useState(null);
  
  // Estados para gestión de lotes
  const [lotesModalVisible, setLotesModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);
  
  // Estados para selección de lotes en ventas
  const [lotesProductos, setLotesProductos] = useState({});
  const [lotesSeleccionados, setLotesSeleccionados] = useState({});
  const [mostrarTodo, setMostrarTodo] = useState(false);
  
  // Estados para modal de selección de lotes en tienda
  const [modalSeleccionLotesVisible, setModalSeleccionLotesVisible] = useState(false);
  const [productoParaSeleccionarLote, setProductoParaSeleccionarLote] = useState(null);

  useEffect(() => {
    fetchProductos();
    fetchEstudiantes();
    // Obtener información del usuario
    const user = AuthService.getUser();
    setUserInfo(user);
    // Actualizar fecha cada minuto
    const interval = setInterval(() => {
      setFechaCompra(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchEstudiantes = async () => {
    setLoadingEstudiantes(true);
    try {
      const token = AuthService.getToken();
      const res = await fetch(`http://${window.location.hostname}:3001/api/estudiantes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Estudiantes cargados para tienda:', data);
      setEstudiantes(data || []);
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
      setEstudiantes([]);
    } finally {
      setLoadingEstudiantes(false);
    }
  };

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const token = AuthService.getToken();
      let url = `http://${window.location.hostname}:3001/api/productos`;
      const res = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      setProductos(data);
      
      // Cargar lotes para productos que tienen múltiples lotes
      await cargarLotesProductos(data);
    } catch {
      setProductos([]);
    }
    setLoading(false);
  };

  const cargarLotesProductos = async (productos) => {
    const token = AuthService.getToken();
    const lotesPromises = productos
      .filter(producto => producto.lotes_activos > 0) // Cambiar a > 0 para incluir productos con 1 lote
      .map(async (producto) => {
        try {
          const res = await fetch(`http://${window.location.hostname}:3001/api/productos/${producto.id}/lotes-venta`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (res.ok) {
            const data = await res.json();
            return { productoId: producto.id, lotes: data.lotes };
          }
        } catch (error) {
          console.error(`Error al cargar lotes para ${producto.nombre}:`, error);
        }
        return { productoId: producto.id, lotes: [] };
      });

    const lotesResults = await Promise.all(lotesPromises);
    const lotesMap = {};
    const seleccionadosMap = {};

    lotesResults.forEach(({ productoId, lotes }) => {
      if (lotes.length > 0) {
        lotesMap[productoId] = lotes;
        // Seleccionar automáticamente el primer lote (el de mayor prioridad)
        seleccionadosMap[productoId] = lotes[0];
      }
    });

    setLotesProductos(lotesMap);
    setLotesSeleccionados(seleccionadosMap);
  };

  const cambiarLoteSeleccionado = (productoId, lote) => {
    setLotesSeleccionados(prev => ({
      ...prev,
      [productoId]: lote
    }));
  };

  const abrirModalSeleccionLotes = async (producto) => {
    setProductoParaSeleccionarLote(producto);
    setModalSeleccionLotesVisible(true);
    
    // Si no tenemos los lotes cargados para este producto, cargarlos
    if (!lotesProductos[producto.id]) {
      try {
        const token = AuthService.getToken();
        const res = await fetch(`http://${window.location.hostname}:3001/api/productos/${producto.id}/lotes-venta`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setLotesProductos(prev => ({
            ...prev,
            [producto.id]: data.lotes
          }));
          
          // Si no hay lote seleccionado, seleccionar el primero
          if (!lotesSeleccionados[producto.id] && data.lotes.length > 0) {
            setLotesSeleccionados(prev => ({
              ...prev,
              [producto.id]: data.lotes[0]
            }));
          }
        }
      } catch (error) {
        console.error(`Error al cargar lotes para ${producto.nombre}:`, error);
      }
    }
  };

  const cerrarModalSeleccionLotes = () => {
    setModalSeleccionLotesVisible(false);
    setProductoParaSeleccionarLote(null);
  };

  const seleccionarLoteParaVenta = (lote) => {
    if (productoParaSeleccionarLote) {
      cambiarLoteSeleccionado(productoParaSeleccionarLote.id, lote);
      cerrarModalSeleccionLotes();
    }
  };



  const agregarAlCarritoDirecto = (producto) => {
    console.log('Agregando producto al carrito:', producto.nombre);
    console.log('Carrito actual:', carrito);
    
    // Si mostrarTodo y viene un lote inyectado en la tarjeta, úsalo; si no, usar seleccionado
    const loteTarjeta = producto.__lote__;
    const loteSeleccionado = loteTarjeta || lotesSeleccionados[producto.id];
    const precioVenta = loteSeleccionado ? loteSeleccionado.precio_venta : producto.precio_venta_promedio;
    const stockDisponible = loteSeleccionado ? loteSeleccionado.stock_actual : producto.stock_total;
    const loteId = loteSeleccionado ? loteSeleccionado.id : null;
    
    const productoExistente = carrito.find(item => 
      item.id === producto.id && item.lote_id === loteId
    );
    
    if (productoExistente) {
      if (productoExistente.cantidad < stockDisponible) {
        const carritoActualizado = carrito.map(item => 
          item.id === producto.id && item.lote_id === loteId
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
        setCarrito(carritoActualizado);
        console.log('Producto existente actualizado, nuevo carrito:', carritoActualizado);
      } else {
        setError(`No hay más stock disponible para ${producto.nombre} (${loteSeleccionado?.codigo_lote || 'lote general'})`);
        setTimeout(() => setError(''), 2000);
      }
    } else {
      const nuevoItem = {
        id: producto.id,
        lote_id: loteId,
        nombre: loteSeleccionado?.titulo_lote || producto.nombre,
        codigo_lote: loteSeleccionado?.codigo_lote || null,
        precio_salida: safeParseFloat(precioVenta, 0),
        cantidad: 1,
        stock_disponible: stockDisponible,
        almacen_id: producto.almacen_id,
        imagen: loteSeleccionado?.imagen_lote || producto.imagen
      };
      const carritoActualizado = [...carrito, nuevoItem];
      setCarrito(carritoActualizado);
      console.log('Nuevo producto agregado, carrito actualizado:', carritoActualizado);
      
      // Si era el primer producto agregado, mostrar el carrito
      if (carrito.length === 0) {
        setCarritoVisible(true);
        console.log('Primer producto agregado, mostrando carrito');
      }
    }
  };



  const eliminarDelCarrito = (productoId, loteId = null) => {
    setCarrito(carrito.filter(item => !(item.id === productoId && item.lote_id === loteId)));
    if (carrito.length === 1) {
      setCarritoVisible(false);
    }
  };

  const limpiarCarrito = () => {
    setCarrito([]);
    setCarritoEstudianteSeleccionado('');
    setCarritoFormaPago('Efectivo');
    setCarritoVisible(false);
    setCarritoModalVisible(false);
  };

  const actualizarCantidadCarrito = (productoId, nuevaCantidad, loteId = null) => {
    if (nuevaCantidad < 1) {
      eliminarDelCarrito(productoId, loteId);
      return;
    }
    
    setCarrito(carritoActual => 
      carritoActual.map(item => {
        if (item.id === productoId && item.lote_id === loteId) {
          const cantidadFinal = Math.min(nuevaCantidad, item.stock_disponible);
          return { ...item, cantidad: cantidadFinal };
        }
        return item;
      })
    );
  };

  const calcularTotalCarrito = () => {
    return carrito.reduce((total, item) => total + (item.precio_salida * item.cantidad), 0);
  };

  const generateUUID = () => {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  };

  const procesarVentaCarrito = async () => {
    console.log('Procesando venta del carrito');
    console.log('Carrito actual:', carrito);
    console.log('Longitud del carrito:', carrito.length);
    
    if (carrito.length === 0) {
      console.log('Error: El carrito está vacío');
      setError('El carrito está vacío');
      return;
    }

    if (!carritoFormaPago) {
      console.log('Error: No se ha seleccionado forma de pago');
      setError('Debe seleccionar la forma de pago');
      return;
    }
    
    console.log('Forma de pago seleccionada:', carritoFormaPago);

    setProcesandoVenta(true);
    setMensaje('');
    setError('');

    try {
      const token = AuthService.getToken();
      const transaccionId = generateUUID();
      const fechaActual = new Date().toISOString();
      
      for (const item of carrito) {
        const res = await fetch(`http://${window.location.hostname}:3001/api/ventas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            producto_id: item.id,
            lote_id: item.lote_id,
            almacen_id: item.almacen_id,
            cantidad: item.cantidad,
            precio_venta: item.precio_salida,
            forma_pago: carritoFormaPago,
            estudiante_id: carritoEstudianteSeleccionado || null,
            observaciones: `Compra realizada el ${new Date(fechaActual).toLocaleString('es-ES')} - Producto: ${item.nombre}${item.codigo_lote ? ` (Lote: ${item.codigo_lote})` : ''} - Cantidad: ${item.cantidad} - Total: Bs ${(item.precio_salida * item.cantidad).toFixed(2)} - Pagado con: ${carritoFormaPago}`,
            transaccion_id: transaccionId
          })
        });
        
        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.message || `Error al vender ${item.nombre}`);
        }
      }
      
      setMensaje('¡Venta del carrito procesada correctamente!');
      limpiarCarrito();
      fetchProductos();
      setTimeout(() => {
        setMensaje('');
      }, 2000);
      
    } catch (error) {
      setError(error.message || 'Error al procesar la venta del carrito');
    } finally {
      setProcesandoVenta(false);
    }
  };

  const abrirCarrito = () => {
    // En dispositivos móviles, abrir modal; en desktop, sidebar
    if (window.innerWidth < 768) {
      setCarritoModalVisible(true);
    } else {
      setCarritoVisible(!carritoVisible);
    }
  };



  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/';
  };

  const abrirGestionLotes = (producto) => {
    setProductoSeleccionado(producto);
    setLotesModalVisible(true);
  };

  const cerrarGestionLotes = () => {
    setLotesModalVisible(false);
    setProductoSeleccionado(null);
  };

  const onLoteCreado = () => {
    // Recargar productos para actualizar el stock consolidado
    fetchProductos();
  };


  const productosFiltrados = productos.filter(p => {
    const precio = safeParseFloat(p.precio_venta_promedio, 0);
    if (precio <= 0) return false;
    const texto = busqueda.toLowerCase();
    return (
      (p.nombre || '').toLowerCase().includes(texto) ||
      (p.descripcion || '').toLowerCase().includes(texto)
    );
  });

  return (
    <div className="container-fluid h-100 d-flex flex-column" style={{ padding: 0, margin: 0 }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 flex-shrink-0" style={{ padding: '10px 15px', margin: 0, backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        <div className="d-flex align-items-center">
          <h2 className="mb-0" style={{ fontSize: '1.8rem', margin: 0, color: '#2c3e50' }}>
            <i className="fas fa-store me-2"></i> 
            <span className="d-none d-sm-inline">Tienda</span>
          </h2>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <div className="form-check form-switch d-flex align-items-center me-2">
            <input 
              className="form-check-input" 
              type="checkbox" 
              id="toggleMostrarTodo"
              checked={mostrarTodo}
              onChange={(e) => setMostrarTodo(e.target.checked)}
            />
            <label className="form-check-label ms-2" htmlFor="toggleMostrarTodo" style={{ fontSize: '0.9rem' }}>
              Mostrar todo (productos por lote)
            </label>
          </div>
          <button 
            className="btn btn-success btn-round shadow-lg position-fixed" 
            onClick={abrirCarrito}
            title="Ver carrito"
            style={{ 
              bottom: '30px', 
              right: '30px', 
              zIndex: 1050,
              padding: '15px 20px',
              fontSize: '1.2rem',
              borderRadius: '50px'
            }}
          >
            <i className="fas fa-shopping-cart me-2"></i>
            <span className="d-none d-sm-inline">Carrito</span>
            {carrito.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ fontSize: '0.9rem', padding: '0.5em 0.8em' }}>
                {carrito.length}
              </span>
            )}
          </button>
        </div>
      </div>
      
      <div className="row flex-shrink-0" style={{ margin: 0, padding: '15px' }}>
        <div className="col-12" style={{ padding: 0 }}>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Buscar productos por nombre, código o descripción..." 
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{ fontSize: '1rem', padding: '10px 15px', borderRadius: '8px' }}
          />
        </div>
      </div>
      
      {mensaje && <div className="alert alert-success flex-shrink-0" style={{ margin: '0 15px 10px 15px', padding: '10px 15px', fontSize: '0.9rem' }}>{mensaje}</div>}
      {error && <div className="alert alert-danger flex-shrink-0" style={{ margin: '0 15px 10px 15px', padding: '10px 15px', fontSize: '0.9rem' }}>{error}</div>}
      
      <div className="row flex-grow-1" style={{ minHeight: 0, margin: 0, padding: '0 15px 15px 15px' }}>
        <div className={carritoVisible ? "col-lg-8 col-md-12" : "col-12"} style={{ height: '100%', padding: 0 }}>
          <div className="card h-100" style={{ margin: 0, border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            <div className="card-body p-3 d-flex flex-column" style={{ padding: '15px' }}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                </div>
              ) : productosFiltrados.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-box fa-3x text-muted mb-3"></i>
                  <h5 className="text-muted">No hay productos disponibles</h5>
                </div>
              ) : (
                <div className="row g-3">
                  {productosFiltrados.flatMap((producto) => {
                    if (!mostrarTodo) return [producto];
                    const lotes = lotesProductos[producto.id] || [];
                    if (lotes.length === 0) return [producto];
                    // Mapear cada lote como una "tarjeta" derivada del producto
                    return lotes.map(lote => ({ ...producto, __lote__: lote }));
                  }).map((producto, idx) => (
                    <div key={idx} className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                      <div className="card h-100 product-card" style={{ 
                        border: '1px solid #dee2e6', 
                        borderRadius: '8px', 
                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                        transition: 'transform 0.2s, box-shadow 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }}>
                        {/* Imagen del producto o del lote seleccionado */}
                        <div className="card-img-top text-center p-3" style={{ 
                          height: '150px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: '#f8f9fa'
                        }}>
                          {producto.__lote__?.imagen_lote || lotesSeleccionados[producto.id]?.imagen_lote || producto.imagen ? (
                            <img 
                              src={`http://${window.location.hostname}:3001/uploads/${producto.__lote__?.imagen_lote || lotesSeleccionados[producto.id]?.imagen_lote || producto.imagen}`} 
                              alt={producto.__lote__?.titulo_lote || lotesSeleccionados[producto.id]?.titulo_lote || producto.nombre} 
                              style={{ 
                                maxWidth: '100%', 
                                maxHeight: '100%', 
                                objectFit: 'contain',
                                borderRadius: '4px'
                              }} 
                            />
                          ) : (
                            <div style={{ 
                              width: '80px', 
                              height: '80px', 
                              backgroundColor: '#e9ecef', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              borderRadius: '8px' 
                            }}>
                              <i className="fas fa-image text-muted fa-2x"></i>
                            </div>
                          )}
                        </div>

                        {/* Información del producto */}
                        <div className="card-body d-flex flex-column p-3">
                          {/* Nombre del producto */}
                          <h6 className="card-title mb-2" style={{ 
                            fontSize: '0.95rem', 
                            fontWeight: 'bold',
                            lineHeight: '1.2',
                            height: '2.4rem',
                            overflow: 'hidden',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical'
                          }}>
                            {producto.__lote__?.titulo_lote || lotesSeleccionados[producto.id]?.titulo_lote || producto.nombre || 'Sin nombre'}
                          </h6>

                          {/* Información del Lote Seleccionado */}
                          {(!mostrarTodo && lotesSeleccionados[producto.id]) && (
                            <div className="mb-2">
                              <div className="d-flex justify-content-between align-items-center">
                                <small className="text-muted">Lote actual:</small>
                                {lotesProductos[producto.id] && lotesProductos[producto.id].length > 1 && (
                                  <button 
                                    className="btn btn-outline-info btn-sm"
                                    onClick={() => abrirModalSeleccionLotes(producto)}
                                    style={{ fontSize: '0.7rem', padding: '2px 6px' }}
                                  >
                                    Cambiar
                                  </button>
                                )}
                              </div>
                              <div className="small">
                                <span className="badge bg-success" style={{ fontSize: '0.7rem' }}>
                                  {lotesSeleccionados[producto.id].codigo_lote}
                                </span>
                                {lotesSeleccionados[producto.id].fecha_vencimiento && (
                                  <small className="text-muted ms-1">
                                    Vence: {new Date(lotesSeleccionados[producto.id].fecha_vencimiento).toLocaleDateString()}
                                  </small>
                                )}
                                {lotesSeleccionados[producto.id].estado_lote && lotesSeleccionados[producto.id].estado_lote !== 'Disponible' && (
                                  <span className={`badge ms-1 ${
                                    lotesSeleccionados[producto.id].estado_lote === 'Por vencer' ? 'bg-warning' :
                                    lotesSeleccionados[producto.id].estado_lote === 'Vencido' ? 'bg-danger' :
                                    'bg-info'
                                  }`} style={{ fontSize: '0.6rem' }}>
                                    {lotesSeleccionados[producto.id].estado_lote}
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Stock */}
                          <div className="mb-2">
                            {mostrarTodo && producto.__lote__ ? (
                              <>
                                <span className={`badge ${
                                  producto.__lote__.estado_lote === 'Por vencer' ? 'bg-warning' :
                                  producto.__lote__.estado_lote === 'Vencido' ? 'bg-danger' :
                                  'bg-success'
                                }`} style={{ fontSize: '0.8rem' }}>
                                  <i className="fas fa-boxes me-1"></i>
                                  Stock: {producto.__lote__.stock_actual}
                                </span>
                              </>
                            ) : (
                              <>
                                <span className={`badge ${
                                  lotesSeleccionados[producto.id] 
                                    ? lotesSeleccionados[producto.id].estado_lote === 'Por vencer' ? 'bg-warning' :
                                      lotesSeleccionados[producto.id].estado_lote === 'Vencido' ? 'bg-danger' :
                                      'bg-success'
                                    : producto.stock_total > 10 ? 'bg-success' : producto.stock_total > 0 ? 'bg-warning' : 'bg-danger'
                                }`} style={{ fontSize: '0.8rem' }}>
                                  <i className="fas fa-boxes me-1"></i>
                                  Stock: {lotesSeleccionados[producto.id]?.stock_actual || producto.stock_total || 0}
                                </span>
                                {lotesSeleccionados[producto.id] && lotesSeleccionados[producto.id].estado_lote !== 'Disponible' && (
                                  <span className={`badge ms-1 ${
                                    lotesSeleccionados[producto.id].estado_lote === 'Por vencer' ? 'bg-warning' :
                                    lotesSeleccionados[producto.id].estado_lote === 'Vencido' ? 'bg-danger' :
                                    'bg-info'
                                  }`} style={{ fontSize: '0.7rem' }}>
                                    {lotesSeleccionados[producto.id].estado_lote}
                                  </span>
                                )}
                                {producto.lotes_activos > 1 && (
                                  <span className="badge bg-info ms-1" style={{ fontSize: '0.7rem' }}>
                                    {producto.lotes_activos} lotes
                                  </span>
                                )}
                              </>
                            )}
                          </div>

                          {/* Precio */}
                          <div className="mb-3">
                            <span className="h5 text-success fw-bold mb-0" style={{ fontSize: '1.1rem' }}>
                              {formatCurrency(mostrarTodo && producto.__lote__ ? producto.__lote__.precio_venta : (lotesSeleccionados[producto.id]?.precio_venta || producto.precio_venta_promedio))}
                            </span>
                            {mostrarTodo && producto.__lote__ ? (
                              <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                Precio del lote
                              </small>
                            ) : (
                              lotesSeleccionados[producto.id] ? (
                                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                  Precio del lote
                                </small>
                              ) : producto.lotes_activos > 1 && (
                                <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>
                                  Precio promedio
                                </small>
                              )
                            )}
                          </div>

                          {/* Botones de acción */}
                          <div className="mt-auto">
                            <div className="d-grid gap-2">
                              <button 
                                className="btn btn-success" 
                                onClick={() => agregarAlCarritoDirecto(producto)}
                                disabled={(lotesSeleccionados[producto.id]?.stock_actual || producto.stock_total) <= 0}
                                style={{ 
                                  fontSize: '0.9rem', 
                                  padding: '8px 12px',
                                  borderRadius: '6px'
                                }}
                              >
                                <i className="fas fa-cart-plus me-2"></i>
                                Añadir al Carrito
                              </button>
                              {!mostrarTodo && (
                                <button 
                                  className="btn btn-outline-primary btn-sm" 
                                  onClick={() => abrirModalSeleccionLotes(producto)}
                                style={{ 
                                  fontSize: '0.8rem', 
                                  padding: '6px 10px',
                                  borderRadius: '4px'
                                }}
                                title="Ver lotes del producto"
                                >
                                  <i className="fas fa-boxes me-1"></i>
                                  Lotes
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {carritoVisible && (
          <div className="col-lg-4 col-md-12 d-none d-lg-block" style={{ height: '100%', padding: 0 }}>
            <div className="card h-100 d-flex flex-column" style={{ margin: 0, border: '1px solid #dee2e6', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div className="card-header bg-success text-white flex-shrink-0" style={{ padding: '12px 15px', borderBottom: '1px solid #dee2e6' }}>
                <div className="d-flex justify-content-between align-items-center">
                  <h6 className="mb-0" style={{ fontSize: '1rem', margin: 0 }}>
                    <i className="fas fa-shopping-cart me-2"></i> 
                    <span className="d-none d-sm-inline">Carrito</span>
                    <span className="badge bg-light text-dark ms-2" style={{ fontSize: '0.8rem' }}>{carrito.length}</span>
                  </h6>
                  <button 
                    className="btn btn-sm btn-outline-light" 
                    onClick={() => setCarritoVisible(false)}
                    title="Ocultar carrito"
                    style={{ fontSize: '0.8rem', padding: '4px 8px' }}
                  >
                    <i className="fas fa-times"></i>
                  </button>
                </div>
              </div>

              <div className="card-body p-3 flex-grow-1" style={{ overflowY: 'auto' }}>
                {carrito.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-shopping-cart fa-3x text-muted mb-3"></i>
                    <h6 className="text-muted" style={{ fontSize: '1rem' }}>El carrito está vacío</h6>
                    <p className="text-muted small" style={{ fontSize: '0.85rem' }}>Agrega productos desde la tienda para comenzar</p>
                    <div className="mt-3">
                      <div className="card bg-light">
                        <div className="card-body text-center" style={{ padding: '15px' }}>
                          <h6 className="text-muted" style={{ fontSize: '1.1rem', margin: 0 }}>Total: Bs 0.00</h6>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Información de la transacción */}
                    <div className="card bg-info text-white mb-3">
                      <div className="card-body p-3" style={{ padding: '12px' }}>
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <h6 className="mb-1" style={{ fontSize: '0.9rem', margin: 0 }}>
                              <i className="fas fa-calendar-alt me-2"></i>
                              Fecha de Compra
                            </h6>
                            <p className="mb-0" style={{ fontSize: '0.85rem', margin: 0 }}>
                              {fechaCompra.toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="mb-0" style={{ fontSize: '0.85rem', margin: 0 }}>
                              {fechaCompra.toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <div className="text-end">
                            <div className="badge bg-light text-dark" style={{ fontSize: '0.8rem' }}>
                              #{carrito.length} productos
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h6 className="mb-3" style={{ fontSize: '1rem', margin: 0 }}>
                        <i className="fas fa-list me-2"></i> Productos seleccionados
                      </h6>
                      <div className="space-y-2">
                        {carrito.map((item, idx) => (
                          <div key={idx} className="card border-0 shadow-sm mb-3" style={{ fontSize: '0.9rem' }}>
                            <div className="card-body p-3" style={{ padding: '12px' }}>
                              <div className="d-flex align-items-center">
                                <div className="me-3 flex-shrink-0">
                                  {item.imagen ? (
                                    <img 
                                      src={`http://${window.location.hostname}:3001/uploads/${item.imagen}`} 
                                      alt={item.nombre} 
                                      style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '4px' }} 
                                      className="img-thumbnail"
                                    />
                                  ) : (
                                    <div className="bg-light d-flex align-items-center justify-content-center" 
                                         style={{ width: '50px', height: '50px', borderRadius: '4px' }}>
                                      <i className="fas fa-image text-muted"></i>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-grow-1 min-w-0">
                                  <div className="fw-bold small text-truncate" style={{ fontSize: '0.9rem' }}>{item.nombre}</div>
                                  {item.codigo_lote && (
                                    <small className="text-info" style={{ fontSize: '0.7rem' }}>Lote: {item.codigo_lote}</small>
                                  )}
                                  <div className="text-success fw-bold" style={{ fontSize: '0.9rem' }}>Bs {item.precio_salida}</div>
                                  <small className="text-muted" style={{ fontSize: '0.8rem' }}>Stock: {item.stock_disponible}</small>
                                </div>
                                <div className="text-end flex-shrink-0">
                                  {/* Nuevos botones de cantidad mejorados */}
                                  <div className="d-flex flex-column align-items-center mb-2">
                                    <div className="d-flex align-items-center mb-2">
                                      <button 
                                        className="btn btn-outline-primary btn-sm rounded-circle" 
                                        type="button"
                                        onClick={() => actualizarCantidadCarrito(item.id, item.cantidad - 1, item.lote_id)}
                                        disabled={item.cantidad <= 1}
                                        style={{ 
                                          width: '32px', 
                                          height: '32px', 
                                          padding: '0',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.8rem',
                                          border: '2px solid #007bff'
                                        }}
                                        title="Reducir cantidad"
                                      >
                                        <i className="fas fa-minus"></i>
                                      </button>
                                      <div className="mx-2 px-3 py-1 bg-light rounded" style={{ 
                                        minWidth: '50px',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '1rem',
                                        border: '2px solid #dee2e6'
                                      }}>
                                        {item.cantidad || 1}
                                      </div>
                                      <button 
                                        className="btn btn-outline-primary btn-sm rounded-circle" 
                                        type="button"
                                        onClick={() => actualizarCantidadCarrito(item.id, item.cantidad + 1, item.lote_id)}
                                        disabled={item.cantidad >= item.stock_disponible}
                                        style={{ 
                                          width: '32px', 
                                          height: '32px', 
                                          padding: '0',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.8rem',
                                          border: '2px solid #007bff'
                                        }}
                                        title="Aumentar cantidad"
                                      >
                                        <i className="fas fa-plus"></i>
                                      </button>
                                    </div>
                                    <div className="fw-bold text-success" style={{ fontSize: '0.9rem' }}>
                                      Bs {(item.precio_salida * item.cantidad).toFixed(2)}
                                    </div>
                                  </div>
                                  <button 
                                    className="btn btn-outline-danger btn-sm rounded-circle"
                                    onClick={() => eliminarDelCarrito(item.id, item.lote_id)}
                                    title="Eliminar producto"
                                    style={{ 
                                      width: '28px', 
                                      height: '28px', 
                                      padding: '0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.7rem'
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card bg-success text-white mb-3">
                      <div className="card-body text-center" style={{ padding: '15px' }}>
                        <div className="h5 mb-0 fw-bold" style={{ fontSize: '1.3rem' }}>
                          <i className="fas fa-calculator me-2"></i>
                          Total: Bs {calcularTotalCarrito().toFixed(2)}
                        </div>
                        <small style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                          {carrito.length} producto{carrito.length !== 1 ? 's' : ''} seleccionado{carrito.length !== 1 ? 's' : ''}
                        </small>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold" style={{ fontSize: '1rem', margin: 0, color: '#2c3e50' }}>
                        <i className="fas fa-credit-card me-2 text-primary"></i>Forma de pago:
                      </label>
                      <select 
                        className="form-select" 
                        value={carritoFormaPago} 
                        onChange={e => setCarritoFormaPago(e.target.value)}
                        style={{ 
                          fontSize: '0.95rem', 
                          padding: '10px 12px',
                          border: '2px solid #dee2e6',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="QR">📱 QR</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold" style={{ fontSize: '1rem', margin: 0, color: '#2c3e50' }}>
                        <i className="fas fa-user-graduate me-2 text-primary"></i>Estudiante:
                      </label>
                      <select 
                        className="form-select" 
                        value={carritoEstudianteSeleccionado} 
                        onChange={e => setCarritoEstudianteSeleccionado(e.target.value)}
                        style={{ 
                          fontSize: '0.95rem', 
                          padding: '10px 12px',
                          border: '2px solid #dee2e6',
                          borderRadius: '6px',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <option value="">👤 Sin estudiante asignado</option>
                        {loadingEstudiantes ? (
                          <option value="" disabled>Cargando estudiantes...</option>
                        ) : estudiantes.length > 0 ? (
                          estudiantes.map(estudiante => (
                            <option key={estudiante.id} value={estudiante.id}>
                              {estudiante.nombre} {estudiante.apellido_paterno} - CI: {estudiante.ci_estudiante}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No hay estudiantes disponibles</option>
                        )}
                      </select>
                      <small className="form-text text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        <i className="fas fa-info-circle me-1"></i>
                        {loadingEstudiantes 
                          ? 'Cargando lista de estudiantes...'
                          : estudiantes.length > 0 
                            ? `Opcional: Seleccione si la compra es para un estudiante específico (${estudiantes.length} estudiantes disponibles)`
                            : 'No hay estudiantes registrados en el sistema'
                        }
                      </small>
                    </div>

                    {error && <div className="alert alert-danger small" style={{ fontSize: '0.8rem', padding: '8px 12px', margin: '8px 0' }}>{error}</div>}
                    {mensaje && <div className="alert alert-success small" style={{ fontSize: '0.8rem', padding: '8px 12px', margin: '8px 0' }}>{mensaje}</div>}
                  </>
                )}
              </div>

              {carrito.length > 0 && (
                <div className="card-footer bg-light flex-shrink-0" style={{ padding: '12px 15px', borderTop: '1px solid #dee2e6' }}>
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-success" 
                      onClick={procesarVentaCarrito}
                      disabled={procesandoVenta}
                      style={{ fontSize: '0.9rem', padding: '10px 16px' }}
                    >
                      {procesandoVenta ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Procesando venta...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-cash-register me-2"></i>
                          Procesar Venta
                        </>
                      )}
                    </button>
                    <button 
                      className="btn btn-warning" 
                      onClick={limpiarCarrito}
                      style={{ fontSize: '0.9rem', padding: '10px 16px' }}
                    >
                      <i className="fas fa-trash me-2"></i> Vaciar carrito
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal del Carrito para Dispositivos Móviles */}
      {carritoModalVisible && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-fullscreen-sm-down modal-lg">
            <div className="modal-content h-100" style={{ borderRadius: '0', border: 'none' }}>
              <div className="modal-header bg-success text-white" style={{ borderBottom: '1px solid #dee2e6' }}>
                <h5 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                  <i className="fas fa-shopping-cart me-2"></i> 
                  Carrito de Compras
                  <span className="badge bg-light text-dark ms-2" style={{ fontSize: '0.8rem' }}>{carrito.length}</span>
                </h5>
                <button 
                  type="button" 
                  className="btn-close btn-close-white" 
                  onClick={() => setCarritoModalVisible(false)}
                  aria-label="Cerrar"
                ></button>
              </div>
              
              <div className="modal-body p-0" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}>
                {carrito.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-shopping-cart fa-4x text-muted mb-4"></i>
                    <h5 className="text-muted mb-3">El carrito está vacío</h5>
                    <p className="text-muted">Agrega productos desde la tienda para comenzar</p>
                    <button 
                      className="btn btn-outline-secondary"
                      onClick={() => setCarritoModalVisible(false)}
                    >
                      <i className="fas fa-arrow-left me-2"></i>
                      Volver a la tienda
                    </button>
                  </div>
                ) : (
                  <div className="p-3">
                    {/* Información de la transacción */}
                    <div className="card bg-info text-white mb-3">
                      <div className="card-body p-3">
                        <div className="d-flex align-items-center justify-content-between">
                          <div>
                            <h6 className="mb-1" style={{ fontSize: '0.9rem', margin: 0 }}>
                              <i className="fas fa-calendar-alt me-2"></i>
                              Fecha de Compra
                            </h6>
                            <p className="mb-0" style={{ fontSize: '0.85rem', margin: 0 }}>
                              {fechaCompra.toLocaleDateString('es-ES', { 
                                weekday: 'long', 
                                year: 'numeric', 
                                month: 'long', 
                                day: 'numeric' 
                              })}
                            </p>
                            <p className="mb-0" style={{ fontSize: '0.85rem', margin: 0 }}>
                              {fechaCompra.toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </p>
                          </div>
                          <div className="text-end">
                            <div className="badge bg-light text-dark" style={{ fontSize: '0.8rem' }}>
                              #{carrito.length} productos
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-3">
                      <h6 className="mb-3" style={{ fontSize: '1rem', margin: 0 }}>
                        <i className="fas fa-list me-2"></i> Productos seleccionados
                      </h6>
                      <div className="space-y-2">
                        {carrito.map((item, idx) => (
                          <div key={idx} className="card border-0 shadow-sm mb-3" style={{ fontSize: '0.9rem' }}>
                            <div className="card-body p-3">
                              <div className="d-flex align-items-center">
                                <div className="me-3 flex-shrink-0">
                                  {item.imagen ? (
                                    <img 
                                      src={`http://${window.location.hostname}:3001/uploads/${item.imagen}`} 
                                      alt={item.nombre} 
                                      style={{ width: '60px', height: '60px', objectFit: 'cover', borderRadius: '4px' }} 
                                      className="img-thumbnail"
                                    />
                                  ) : (
                                    <div className="bg-light d-flex align-items-center justify-content-center" 
                                         style={{ width: '60px', height: '60px', borderRadius: '4px' }}>
                                      <i className="fas fa-image text-muted"></i>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-grow-1 min-w-0">
                                  <div className="fw-bold text-truncate" style={{ fontSize: '1rem' }}>{item.nombre}</div>
                                  {item.codigo_lote && (
                                    <small className="text-info" style={{ fontSize: '0.8rem' }}>Lote: {item.codigo_lote}</small>
                                  )}
                                  <div className="text-success fw-bold" style={{ fontSize: '1rem' }}>Bs {item.precio_salida}</div>
                                  <small className="text-muted" style={{ fontSize: '0.8rem' }}>Stock: {item.stock_disponible}</small>
                                </div>
                                <div className="text-end flex-shrink-0">
                                  {/* Botones de cantidad para móvil */}
                                  <div className="d-flex flex-column align-items-center mb-2">
                                    <div className="d-flex align-items-center mb-2">
                                      <button 
                                        className="btn btn-outline-primary btn-sm rounded-circle" 
                                        type="button"
                                        onClick={() => actualizarCantidadCarrito(item.id, item.cantidad - 1, item.lote_id)}
                                        disabled={item.cantidad <= 1}
                                        style={{ 
                                          width: '36px', 
                                          height: '36px', 
                                          padding: '0',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.9rem',
                                          border: '2px solid #007bff'
                                        }}
                                        title="Reducir cantidad"
                                      >
                                        <i className="fas fa-minus"></i>
                                      </button>
                                      <div className="mx-3 px-3 py-2 bg-light rounded" style={{ 
                                        minWidth: '60px',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        fontSize: '1.1rem',
                                        border: '2px solid #dee2e6'
                                      }}>
                                        {item.cantidad || 1}
                                      </div>
                                      <button 
                                        className="btn btn-outline-primary btn-sm rounded-circle" 
                                        type="button"
                                        onClick={() => actualizarCantidadCarrito(item.id, item.cantidad + 1, item.lote_id)}
                                        disabled={item.cantidad >= item.stock_disponible}
                                        style={{ 
                                          width: '36px', 
                                          height: '36px', 
                                          padding: '0',
                                          display: 'flex',
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          fontSize: '0.9rem',
                                          border: '2px solid #007bff'
                                        }}
                                        title="Aumentar cantidad"
                                      >
                                        <i className="fas fa-plus"></i>
                                      </button>
                                    </div>
                                    <div className="fw-bold text-success" style={{ fontSize: '1rem' }}>
                                      Bs {(item.precio_salida * item.cantidad).toFixed(2)}
                                    </div>
                                  </div>
                                  <button 
                                    className="btn btn-outline-danger btn-sm rounded-circle"
                                    onClick={() => eliminarDelCarrito(item.id, item.lote_id)}
                                    title="Eliminar producto"
                                    style={{ 
                                      width: '32px', 
                                      height: '32px', 
                                      padding: '0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontSize: '0.8rem'
                                    }}
                                  >
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card bg-success text-white mb-3">
                      <div className="card-body text-center" style={{ padding: '20px' }}>
                        <div className="h4 mb-0 fw-bold" style={{ fontSize: '1.5rem' }}>
                          <i className="fas fa-calculator me-2"></i>
                          Total: Bs {calcularTotalCarrito().toFixed(2)}
                        </div>
                        <small style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                          {carrito.length} producto{carrito.length !== 1 ? 's' : ''} seleccionado{carrito.length !== 1 ? 's' : ''}
                        </small>
                      </div>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold" style={{ fontSize: '1rem', margin: 0, color: '#2c3e50' }}>
                        <i className="fas fa-credit-card me-2 text-primary"></i>Forma de pago:
                      </label>
                      <select 
                        className="form-select" 
                        value={carritoFormaPago} 
                        onChange={e => setCarritoFormaPago(e.target.value)}
                        style={{ 
                          fontSize: '1rem', 
                          padding: '12px 15px',
                          border: '2px solid #dee2e6',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <option value="Efectivo">💵 Efectivo</option>
                        <option value="QR">📱 QR</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label fw-bold" style={{ fontSize: '1rem', margin: 0, color: '#2c3e50' }}>
                        <i className="fas fa-user-graduate me-2 text-primary"></i>Estudiante:
                      </label>
                      <select 
                        className="form-select" 
                        value={carritoEstudianteSeleccionado} 
                        onChange={e => setCarritoEstudianteSeleccionado(e.target.value)}
                        style={{ 
                          fontSize: '1rem', 
                          padding: '12px 15px',
                          border: '2px solid #dee2e6',
                          borderRadius: '8px',
                          backgroundColor: '#ffffff'
                        }}
                      >
                        <option value="">👤 Sin estudiante asignado</option>
                        {loadingEstudiantes ? (
                          <option value="" disabled>Cargando estudiantes...</option>
                        ) : estudiantes.length > 0 ? (
                          estudiantes.map(estudiante => (
                            <option key={estudiante.id} value={estudiante.id}>
                              {estudiante.nombre} {estudiante.apellido_paterno} - CI: {estudiante.ci_estudiante}
                            </option>
                          ))
                        ) : (
                          <option value="" disabled>No hay estudiantes disponibles</option>
                        )}
                      </select>
                      <small className="form-text text-muted" style={{ fontSize: '0.85rem', marginTop: '4px' }}>
                        <i className="fas fa-info-circle me-1"></i>
                        {loadingEstudiantes 
                          ? 'Cargando lista de estudiantes...'
                          : estudiantes.length > 0 
                            ? `Opcional: Seleccione si la compra es para un estudiante específico (${estudiantes.length} estudiantes disponibles)`
                            : 'No hay estudiantes registrados en el sistema'
                        }
                      </small>
                    </div>

                    {error && <div className="alert alert-danger" style={{ fontSize: '0.9rem', padding: '12px 15px', margin: '8px 0' }}>{error}</div>}
                    {mensaje && <div className="alert alert-success" style={{ fontSize: '0.9rem', padding: '12px 15px', margin: '8px 0' }}>{mensaje}</div>}
                  </div>
                )}
              </div>

              {carrito.length > 0 && (
                <div className="modal-footer bg-light" style={{ borderTop: '1px solid #dee2e6' }}>
                  <div className="d-grid gap-2 w-100">
                    <button 
                      className="btn btn-success btn-lg" 
                      onClick={procesarVentaCarrito}
                      disabled={procesandoVenta}
                      style={{ fontSize: '1rem', padding: '12px 20px' }}
                    >
                      {procesandoVenta ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Procesando venta...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-cash-register me-2"></i>
                          Procesar Venta
                        </>
                      )}
                    </button>
                    <button 
                      className="btn btn-warning btn-lg" 
                      onClick={limpiarCarrito}
                      style={{ fontSize: '1rem', padding: '12px 20px' }}
                    >
                      <i className="fas fa-trash me-2"></i> Vaciar carrito
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
              )}



      {/* Modal de Gestión de Lotes */}
      <GestionLotesModal 
        producto={productoSeleccionado}
        isOpen={lotesModalVisible}
        onClose={cerrarGestionLotes}
        onLoteCreado={onLoteCreado}
      />

      {/* Modal de Selección de Lotes para Tienda */}
      {modalSeleccionLotesVisible && productoParaSeleccionarLote && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-boxes me-2"></i>
                  Seleccionar Lote - {productoParaSeleccionarLote.nombre}
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={cerrarModalSeleccionLotes}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-12">
                    <p className="text-muted mb-3">
                      Selecciona el lote que quieres mostrar para las ventas. El lote actualmente seleccionado aparece en verde.
                    </p>
                  </div>
                </div>
                
                <div className="row g-3">
                  {lotesProductos[productoParaSeleccionarLote.id]?.map((lote, index) => {
                    const esLoteActual = lotesSeleccionados[productoParaSeleccionarLote.id]?.id === lote.id;
                    const stockAgotado = lote.stock_actual <= 0;
                    
                    return (
                      <div key={lote.id} className="col-md-6">
                        <div 
                          className={`card h-100 cursor-pointer ${esLoteActual ? 'border-success bg-light' : 'border-secondary'}`}
                          onClick={() => !stockAgotado && seleccionarLoteParaVenta(lote)}
                          style={{ 
                            cursor: stockAgotado ? 'not-allowed' : 'pointer',
                            opacity: stockAgotado ? 0.6 : 1,
                            borderWidth: '2px'
                          }}
                        >
                          <div className="card-body">
                            {/* Imagen y título del lote */}
                            {(lote.imagen_lote || lote.titulo_lote) && (
                              <div className="d-flex align-items-center mb-2">
                                {lote.imagen_lote && (
                                  <img 
                                    src={`http://${window.location.hostname}:3001/uploads/${lote.imagen_lote}`}
                                    alt={lote.titulo_lote || lote.codigo_lote}
                                    style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px' }}
                                    className="me-2"
                                  />
                                )}
                                {lote.titulo_lote && (
                                  <div className="fw-bold text-truncate" style={{ maxWidth: '100%' }}>
                                    {lote.titulo_lote}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="d-flex justify-content-between align-items-start mb-2">
                              <h6 className="card-title mb-0">
                                <span className={`badge ${esLoteActual ? 'bg-success' : 'bg-secondary'}`}>
                                  {lote.codigo_lote}
                                </span>
                              </h6>
                              {esLoteActual && (
                                <span className="badge bg-success">
                                  <i className="fas fa-check me-1"></i>
                                  Actual
                                </span>
                              )}
                            </div>
                            
                            <div className="mb-2">
                              <span className={`badge ${stockAgotado ? 'bg-danger' : 'bg-info'}`}>
                                <i className="fas fa-boxes me-1"></i>
                                Stock: {lote.stock_actual}
                              </span>
                            </div>
                            
                            <div className="mb-2">
                              <span className="badge bg-success">
                                <i className="fas fa-dollar-sign me-1"></i>
                                Precio: {formatCurrency(lote.precio_venta)}
                              </span>
                            </div>
                            
                            {lote.fecha_vencimiento && (
                              <div className="mb-2">
                                <small className="text-muted">
                                  <i className="fas fa-calendar me-1"></i>
                                  Vence: {new Date(lote.fecha_vencimiento).toLocaleDateString()}
                                </small>
                              </div>
                            )}
                            
                            <div className="mb-2">
                              <span className={`badge ${
                                lote.estado_lote === 'Vencido' ? 'bg-danger' :
                                lote.estado_lote === 'Por vencer' ? 'bg-warning' :
                                lote.estado_lote === 'Próximo a vencer' ? 'bg-info' :
                                'bg-success'
                              }`}>
                                {lote.estado_lote}
                              </span>
                            </div>
                            
                            {lote.proveedor && (
                              <div className="mb-2">
                                <small className="text-muted">
                                  <i className="fas fa-truck me-1"></i>
                                  Proveedor: {lote.proveedor}
                                </small>
                              </div>
                            )}
                            
                            {stockAgotado && (
                              <div className="text-center mt-2">
                                <span className="badge bg-danger">
                                  <i className="fas fa-exclamation-triangle me-1"></i>
                                  Stock Agotado
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {lotesProductos[productoParaSeleccionarLote.id]?.length === 0 && (
                  <div className="text-center py-4">
                    <i className="fas fa-box fa-3x text-muted mb-3"></i>
                    <h5 className="text-muted">No hay lotes disponibles</h5>
                    <p className="text-muted">Este producto no tiene lotes activos.</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cerrarModalSeleccionLotes}>
                  <i className="fas fa-times me-2"></i>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Tienda;