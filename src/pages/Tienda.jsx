import React, { useEffect, useState } from 'react';
import AuthService from '../services/authService';
import { Link } from 'react-router-dom';

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
  
  // Estado para el menú hamburguesa móvil
  const [menuHamburguesaVisible, setMenuHamburguesaVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

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
    } catch {
      setProductos([]);
    }
    setLoading(false);
  };



  const agregarAlCarritoDirecto = (producto) => {
    console.log('Agregando producto al carrito:', producto.nombre);
    console.log('Carrito actual:', carrito);
    
    const productoExistente = carrito.find(item => item.id === producto.id);
    
    if (productoExistente) {
      if (productoExistente.cantidad < producto.stock) {
        const carritoActualizado = carrito.map(item => 
          item.id === producto.id 
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
        setCarrito(carritoActualizado);
        console.log('Producto existente actualizado, nuevo carrito:', carritoActualizado);
      } else {
        setError(`No hay más stock disponible para ${producto.nombre}`);
        setTimeout(() => setError(''), 2000);
      }
    } else {
      const nuevoItem = {
        id: producto.id,
        nombre: producto.nombre,
        precio_salida: producto.precio_salida,
        cantidad: 1,
        stock_disponible: producto.stock,
        almacen_id: producto.almacen_id,
        imagen: producto.imagen
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



  const eliminarDelCarrito = (productoId) => {
    setCarrito(carrito.filter(item => item.id !== productoId));
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

  const actualizarCantidadCarrito = (productoId, nuevaCantidad) => {
    if (nuevaCantidad < 1) return;
    
    setCarrito(carritoActual => 
      carritoActual.map(item => {
        if (item.id === productoId) {
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
            almacen_id: item.almacen_id,
            cantidad: item.cantidad,
            precio_venta: item.precio_salida,
            forma_pago: carritoFormaPago,
            estudiante_id: carritoEstudianteSeleccionado || null,
            observaciones: `Compra realizada el ${new Date(fechaActual).toLocaleString('es-ES')} - Producto: ${item.nombre} - Cantidad: ${item.cantidad} - Total: Bs ${(item.precio_salida * item.cantidad).toFixed(2)} - Pagado con: ${carritoFormaPago}`,
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

  const cerrarMenuHamburguesa = () => {
    setMenuHamburguesaVisible(false);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/';
  };


  const productosFiltrados = productos.filter(p => {
    if (!p.precio_salida || Number(p.precio_salida) <= 0) return false;
    const texto = busqueda.toLowerCase();
    return (
      (p.nombre || '').toLowerCase().includes(texto) ||
      (p.codigo || '').toLowerCase().includes(texto) ||
      (p.descripcion || '').toLowerCase().includes(texto)
    );
  });

  return (
    <div className="container-fluid h-100 d-flex flex-column" style={{ padding: 0, margin: 0 }}>
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 flex-shrink-0" style={{ padding: '10px 15px', margin: 0, backgroundColor: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
        {/* Botón hamburguesa para móvil */}
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-outline-secondary d-md-none me-2" 
            onClick={() => setMenuHamburguesaVisible(true)}
            title="Menú de navegación"
            style={{ fontSize: '0.9rem', padding: '8px 12px' }}
          >
            <i className="fas fa-bars"></i>
          </button>
          <h2 className="mb-0" style={{ fontSize: '1.8rem', margin: 0, color: '#2c3e50' }}>
            <i className="fas fa-store me-2"></i> 
            <span className="d-none d-sm-inline">Tienda</span>
          </h2>
        </div>
        <div className="d-flex gap-2 flex-wrap">
          <button 
            className="btn btn-outline-success position-relative" 
            onClick={abrirCarrito}
            title="Ver carrito"
            style={{ fontSize: '0.9rem', padding: '8px 16px' }}
          >
            <i className="fas fa-shopping-cart me-1"></i>
            <span className="d-none d-sm-inline">Carrito</span>
            {carrito.length > 0 && (
              <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
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
                  {productosFiltrados.map((producto, idx) => (
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
                        {/* Imagen del producto */}
                        <div className="card-img-top text-center p-3" style={{ 
                          height: '150px', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center',
                          backgroundColor: '#f8f9fa'
                        }}>
                          {producto.imagen ? (
                            <img 
                              src={`http://${window.location.hostname}:3001/uploads/${producto.imagen}`} 
                              alt={producto.nombre} 
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
                            {producto.nombre || 'Sin nombre'}
                          </h6>

                          {/* Stock */}
                          <div className="mb-2">
                            <span className={`badge ${producto.stock > 10 ? 'bg-success' : producto.stock > 0 ? 'bg-warning' : 'bg-danger'}`} style={{ fontSize: '0.8rem' }}>
                              <i className="fas fa-boxes me-1"></i>
                              Stock: {producto.stock || 0}
                            </span>
                          </div>

                          {/* Precio */}
                          <div className="mb-3">
                            <span className="h5 text-success fw-bold mb-0" style={{ fontSize: '1.1rem' }}>
                              Bs {producto.precio_salida || '0.00'}
                            </span>
                          </div>

                          {/* Botón de añadir al carrito */}
                          <div className="mt-auto">
                            <button 
                              className="btn btn-success w-100" 
                              onClick={() => agregarAlCarritoDirecto(producto)}
                              disabled={producto.stock <= 0}
                              style={{ 
                                fontSize: '0.9rem', 
                                padding: '8px 12px',
                                borderRadius: '6px'
                              }}
                            >
                              <i className="fas fa-cart-plus me-2"></i>
                              Añadir al Carrito
                            </button>
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
                                        onClick={() => actualizarCantidadCarrito(item.id, item.cantidad - 1)}
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
                                        onClick={() => actualizarCantidadCarrito(item.id, item.cantidad + 1)}
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
                                    onClick={() => eliminarDelCarrito(item.id)}
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
                                        onClick={() => actualizarCantidadCarrito(item.id, item.cantidad - 1)}
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
                                        onClick={() => actualizarCantidadCarrito(item.id, item.cantidad + 1)}
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
                                    onClick={() => eliminarDelCarrito(item.id)}
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

    </div>
  );
}

export default Tienda;