import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProductoModal from '../../../components/ProductoModal';
import GestionLotesModal from '../../../components/GestionLotesModal';
import AuthService from '../../../services/authService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const Productos = () => {
  const [productos, setProductos] = useState([]);
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedProducto, setSelectedProducto] = useState(null);
  const [filtrosAlmacenes, setFiltrosAlmacenes] = useState([]);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [filtroVencimiento, setFiltroVencimiento] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [almacenesDropdownOpen, setAlmacenesDropdownOpen] = useState(false);
  
  // Estados para Modal de Reporte Personalizado (Selector)
  const [modalReporteVisible, setModalReporteVisible] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [userInfo, setUserInfo] = useState(null);
  
  // Estados para gestión de lotes
  const [lotesModalVisible, setLotesModalVisible] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState(null);

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

  const handleEditarProducto = async (productoLista) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/productos/${productoLista.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const productoOriginal = await res.json();
        // Mezclamos con los datos promediados que trae la vista
        setSelectedProducto({
          ...productoOriginal,
          stock_total: productoLista.stock_total,
          precio_compra_promedio: productoLista.precio_compra_promedio,
          precio_venta_promedio: productoLista.precio_venta_promedio
        });
      } else {
        setSelectedProducto(productoLista);
      }
    } catch (err) {
      setSelectedProducto(productoLista);
    }
    setShowModal(true);
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

  // Filtrar productos (Base, ignora la selección de checkboxes)
  const productosBaseFiltrados = productos.filter(producto => {
    const cumpleFiltroAlmacen = filtrosAlmacenes.length === 0 || filtrosAlmacenes.includes(producto.almacen_id.toString());
    const cumpleFiltroCategoria = !filtroCategoria || producto.categoria.toLowerCase() === filtroCategoria.toLowerCase();
    const cumpleBusqueda = !busqueda || 
      producto.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      (producto.codigo && producto.codigo.toLowerCase().includes(busqueda.toLowerCase()));
      
    let cumpleVencimiento = true;
    if (filtroVencimiento) {
      if (filtroVencimiento === 'con_vencimiento') {
        cumpleVencimiento = producto.tipo_producto === 'perecedero';
      } else if (filtroVencimiento === 'sin_vencimiento') {
        cumpleVencimiento = producto.tipo_producto !== 'perecedero';
      } else if (filtroVencimiento === 'por_vencer' || filtroVencimiento === 'vencido') {
        if (producto.tipo_producto !== 'perecedero' || !producto.fecha_vencimiento_proxima) {
          cumpleVencimiento = false;
        } else {
          const hoy = new Date();
          hoy.setHours(0,0,0,0);
          const fechaVenc = new Date(producto.fecha_vencimiento_proxima);
          fechaVenc.setHours(0,0,0,0);
          const diasVencimiento = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
          
          if (filtroVencimiento === 'vencido') {
            cumpleVencimiento = diasVencimiento <= 0;
          } else if (filtroVencimiento === 'por_vencer') {
            cumpleVencimiento = diasVencimiento > 0 && diasVencimiento <= 19;
          }
        }
      }
    }
    
    return cumpleFiltroAlmacen && cumpleFiltroCategoria && cumpleBusqueda && cumpleVencimiento;
  });

  // Productos para la vista (Si hay seleccionados, muestra solo esos, si no, muestra todos)
  const productosFiltrados = productosBaseFiltrados.filter(producto => 
    selectedIds.length === 0 || selectedIds.includes(producto.id)
  );

  const handleAlmacenCheckbox = (id) => {
    setFiltrosAlmacenes(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
    setCurrentPage(1); // Reset page on filter
  };

  const toggleProductSelection = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Paginación
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = productosFiltrados.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(productosFiltrados.length / itemsPerPage);

  const nextPage = () => setCurrentPage(prev => (prev < totalPages ? prev + 1 : prev));
  const prevPage = () => setCurrentPage(prev => (prev > 1 ? prev - 1 : prev));

  const toggleSelectAll = () => {
    if (selectedIds.length === productosBaseFiltrados.length && productosBaseFiltrados.length > 0) {
      setSelectedIds([]); // Deseleccionar todos
    } else {
      setSelectedIds(productosBaseFiltrados.map(p => p.id)); // Seleccionar todos los filtrados en el modal
    }
  };



  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
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
    fetchProductos();
  };

  const handleLimpiarDB = async () => {
    if (!window.confirm('⚠️ ADVERTENCIA CRÍTICA: Se borrarán TODOS los productos, lotes, ventas y movimientos de la base de datos. ¿Deseas continuar?')) return;
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/testing/limpiar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        alert(data.message);
        fetchProductos();
      } else {
        alert(data.message);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
      setLoading(false);
    }
  };

  const handleGenerarSeed = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/testing/seed`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        alert(data.message);
        fetchProductos();
      } else {
        alert(data.message);
        setLoading(false);
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión');
      setLoading(false);
    }
  };

  const totalInversion = productosFiltrados.reduce((sum, p) => sum + parseFloat(p.inversion_total || 0), 0);
  const totalRecuperado = productosFiltrados.reduce((sum, p) => sum + parseFloat(p.capital_recuperado || 0), 0);
  const totalRestante = productosFiltrados.reduce((sum, p) => sum + parseFloat(p.ganancia_esperada || 0), 0);
  
  const selectedProducts = productosFiltrados.filter(p => selectedIds.includes(p.id));
  const modalInversion = selectedProducts.reduce((sum, p) => sum + parseFloat(p.inversion_total || 0), 0);
  const modalRecuperado = selectedProducts.reduce((sum, p) => sum + parseFloat(p.capital_recuperado || 0), 0);
  const modalGananciaActual = selectedProducts.reduce((sum, p) => sum + parseFloat(p.ganancia_actual || 0), 0);
  const modalRestante = selectedProducts.reduce((sum, p) => sum + parseFloat(p.ganancia_esperada || 0), 0);

  const handleExportarResumen = () => {
    const dataToExport = selectedIds.length > 0 ? selectedProducts : productosFiltrados;
    
    const doc = new jsPDF();
    doc.text("Resumen Financiero de Productos", 14, 15);
    
    const tableData = dataToExport.map(p => [
      p.nombre,
      p.categoria,
      p.almacen_nombre,
      p.stock_total,
      parseFloat(p.inversion_total || 0).toFixed(2),
      parseFloat(p.capital_recuperado || 0).toFixed(2),
      parseFloat(p.ganancia_actual || 0).toFixed(2),
      parseFloat(p.ganancia_esperada || 0).toFixed(2)
    ]);

    const totInv = selectedIds.length > 0 ? modalInversion : totalInversion;
    const totRec = selectedIds.length > 0 ? modalRecuperado : totalRecuperado;
    const totGan = selectedIds.length > 0 ? modalGananciaActual : productosFiltrados.reduce((sum, p) => sum + parseFloat(p.ganancia_actual || 0), 0);
    const totEsp = selectedIds.length > 0 ? modalRestante : totalRestante;

    tableData.push([
      'TOTALES', '', '', '',
      totInv.toFixed(2),
      totRec.toFixed(2),
      totGan.toFixed(2),
      totEsp.toFixed(2)
    ]);

    autoTable(doc, {
      startY: 20,
      head: [['Producto', 'Categoría', 'Almacén', 'Stock', 'Inversión', 'Recuperado', 'Gan. Actual', 'Gan. Esperada']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save("Resumen_Financiero_Productos.pdf");
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
                className="btn btn-primary btn-round"
                onClick={handleNuevoProducto}
              >
                <i className="fa fa-plus"></i> Nuevo Producto
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
                {/* Los filtros han sido movidos al modal de selección */}

                  {/* Resumen Financiero Dinámico (Afuera de la tabla) */}
                  <div className="card bg-light mb-4 shadow-sm border-0">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="card-title text-primary mb-0">
                          <i className="fas fa-chart-line me-2"></i> 
                          Resumen Financiero {selectedIds.length > 0 ? `(de ${selectedIds.length} productos seleccionados)` : '(Global de productos en vista)'}
                        </h6>
                        <button className="btn btn-sm btn-danger" onClick={handleExportarResumen}>
                          <i className="fas fa-file-pdf me-1"></i> Exportar PDF
                        </button>
                      </div>
                      <div className="row text-center">
                        <div className="col-6 col-md-3 mb-2 mb-md-0">
                          <div className="text-muted small">Inversión Total</div>
                          <h5 className="fw-bold mb-0">Bs {selectedIds.length > 0 ? modalInversion.toFixed(2) : totalInversion.toFixed(2)}</h5>
                        </div>
                        <div className="col-6 col-md-3 mb-2 mb-md-0">
                          <div className="text-muted small">Cap. Recuperado</div>
                          <h5 className="fw-bold text-info mb-0">Bs {selectedIds.length > 0 ? modalRecuperado.toFixed(2) : totalRecuperado.toFixed(2)}</h5>
                        </div>
                        <div className="col-6 col-md-3 mb-2 mb-md-0">
                          <div className="text-muted small">Ganancia Actual</div>
                          <h5 className="fw-bold text-success mb-0">Bs {selectedIds.length > 0 ? modalGananciaActual.toFixed(2) : productosFiltrados.reduce((sum, p) => sum + parseFloat(p.ganancia_actual || 0), 0).toFixed(2)}</h5>
                        </div>
                        <div className="col-6 col-md-3">
                          <div className="text-muted small">Ganancia Esperada</div>
                          <h5 className="fw-bold text-warning mb-0">Bs {selectedIds.length > 0 ? modalRestante.toFixed(2) : totalRestante.toFixed(2)}</h5>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-3 d-flex flex-wrap justify-content-between align-items-center">
                    <div className="d-flex gap-2 mb-2 mb-md-0">
                      <button 
                        className="btn btn-info"
                        onClick={() => setModalReporteVisible(true)}
                        title="Seleccionar productos para ver resumen"
                      >
                        <i className="fas fa-check-square me-2"></i>
                        Seleccionar Productos
                      </button>
                      <button 
                        className="btn btn-outline-danger btn-sm d-none d-md-inline-block"
                        onClick={handleLimpiarDB}
                        title="Borrar todos los productos y ventas para pruebas"
                      >
                        <i className="fas fa-trash-alt me-2"></i>
                        Limpiar BD
                      </button>
                      <button 
                        className="btn btn-outline-success btn-sm d-none d-md-inline-block"
                        onClick={handleGenerarSeed}
                        title="Generar 10 productos de prueba (lácteos, etc.)"
                      >
                        <i className="fas fa-magic me-2"></i>
                        Generar Pruebas
                      </button>
                    </div>
                  </div>

                  {/* Tabla de productos */}
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead className="table-dark">
                        <tr>
                          <th>Imagen</th>
                          <th>Producto</th>
                          <th>Almacén</th>
                          <th>Stock</th>
                          <th>Inversión</th>
                          <th>Recuperado</th>
                          <th>Ganancia Act.</th>
                          <th>Ganancia Esp.</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {currentItems.length === 0 ? (
                          <tr>
                            <td colSpan="9" className="text-center py-4">
                              No se encontraron productos
                            </td>
                          </tr>
                        ) : (
                          currentItems.map(producto => (
                            <tr key={producto.id}>
                              <td>
                                {producto.imagen ? (
                                  <img 
                                    src={`http://${window.location.hostname}:3001/uploads/${producto.imagen}`}
                                    alt={producto.nombre}
                                    style={{ width: '50px', height: '50px', objectFit: 'cover' }}
                                    className="rounded shadow-sm"
                                  />
                                ) : (
                                  <div 
                                    className="bg-secondary rounded d-flex align-items-center justify-content-center shadow-sm"
                                    style={{ width: '50px', height: '50px' }}
                                  >
                                    <i className="fa fa-image text-white"></i>
                                  </div>
                                )}
                              </td>
                              <td>
                                <strong>{producto.nombre}</strong>
                                {producto.descripcion && (
                                  <div className="text-muted small">{producto.descripcion}</div>
                                )}
                                <div className="small mt-1">
                                  <span className="badge bg-light text-dark border">{producto.categoria}</span>
                                </div>
                              </td>
                              <td>{producto.almacen_nombre}</td>
                              <td>
                                <span className={`badge ${producto.stock_total > 10 ? 'bg-success' : producto.stock_total > 0 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                  {producto.stock_total} en stock
                                </span>

                                {/* Alerta de Stock Bajo */}
                                {producto.stock_total <= 5 && producto.stock_total > 0 && (
                                  <div className="text-danger small mt-1 fw-bold" style={{fontSize: '0.75rem', lineHeight: '1.2'}}>
                                    <i className="fas fa-exclamation-triangle"></i> ¡Se acaba, llenar {producto.nombre}!
                                  </div>
                                )}
                                {producto.stock_total === 0 && (
                                  <div className="text-danger small mt-1 fw-bold" style={{fontSize: '0.75rem', lineHeight: '1.2'}}>
                                    <i className="fas fa-times-circle"></i> ¡Agotado, llenar {producto.nombre}!
                                  </div>
                                )}

                                {/* Alerta de Vencimiento */}
                                {producto.tipo_producto === 'perecedero' && producto.fecha_vencimiento_proxima && (() => {
                                  const hoy = new Date();
                                  hoy.setHours(0,0,0,0);
                                  const fechaVenc = new Date(producto.fecha_vencimiento_proxima);
                                  fechaVenc.setHours(0,0,0,0);
                                  const diasVencimiento = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
                                  
                                  if (diasVencimiento > 20) {
                                    return <div className="text-success small mt-1 fw-bold" style={{fontSize: '0.75rem'}}><i className="fas fa-calendar-check"></i> Vence en {diasVencimiento} días</div>;
                                  } else if (diasVencimiento >= 10 && diasVencimiento <= 19) {
                                    return <div className="small mt-1 fw-bold" style={{fontSize: '0.75rem', color: '#fd7e14'}}><i className="fas fa-exclamation-circle"></i> Vence en {diasVencimiento} días</div>;
                                  } else if (diasVencimiento >= 1 && diasVencimiento <= 9) {
                                    return <div className="text-danger small mt-1 fw-bold" style={{fontSize: '0.75rem'}}><i className="fas fa-biohazard"></i> ¡Por vencer en {diasVencimiento} días!</div>;
                                  } else if (diasVencimiento <= 0) {
                                    return <div className="text-danger small mt-1 fw-bold" style={{fontSize: '0.75rem'}}><i className="fas fa-skull-crossbones"></i> ¡VENCIDO!</div>;
                                  }
                                  return null;
                                })()}
                                
                                {producto.tipo_producto === 'perecedero' && !producto.fecha_vencimiento_proxima && producto.stock_total > 0 && (
                                  <div className="text-muted small mt-1" style={{fontSize: '0.7rem'}}>
                                    Sin fecha de vencimiento
                                  </div>
                                )}
                              </td>
                              <td>
                                <div className="text-muted small">Invertido</div>
                                <b>Bs {parseFloat(producto.inversion_total || 0).toFixed(2)}</b>
                              </td>
                              <td>
                                <div className="text-info small">Recuperado</div>
                                <b className="text-info">Bs {parseFloat(producto.capital_recuperado || 0).toFixed(2)}</b>
                              </td>
                              <td>
                                <div className="text-success small">Ganancia Actual</div>
                                <b className="text-success">Bs {parseFloat(producto.ganancia_actual || 0).toFixed(2)}</b>
                              </td>
                              <td>
                                <div className="text-warning small">Ganancia Esperada</div>
                                <b className="text-warning">Bs {parseFloat(producto.ganancia_esperada || 0).toFixed(2)}</b>
                              </td>
                              <td>
                                <div className="btn-group" role="group">
                                  <button
                                    className="btn btn-outline-primary btn-sm me-1"
                                    onClick={() => handleEditarProducto(producto)}
                                    title="Editar"
                                  >
                                    <i className="fa fa-edit"></i>
                                  </button>
                                  <button
                                    className="btn btn-outline-success btn-sm me-1"
                                    onClick={() => abrirGestionLotes(producto)}
                                    title="Gestionar Lotes / Ver Finanzas"
                                  >
                                    <i className="fa fa-boxes"></i> Lotes
                                  </button>
                                  <button
                                    className="btn btn-outline-danger btn-sm"
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
                  
                  {/* Paginación */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <div className="text-muted small">
                        Mostrando {indexOfFirstItem + 1} a {Math.min(indexOfLastItem, productosFiltrados.length)} de {productosFiltrados.length} productos
                      </div>
                      <div className="btn-group">
                        <button 
                          className="btn btn-outline-primary btn-sm" 
                          onClick={prevPage} 
                          disabled={currentPage === 1}
                        >
                          <i className="fas fa-chevron-left me-1"></i> Anterior
                        </button>
                        <span className="btn btn-primary btn-sm disabled">Página {currentPage} de {totalPages}</span>
                        <button 
                          className="btn btn-outline-primary btn-sm" 
                          onClick={nextPage} 
                          disabled={currentPage === totalPages}
                        >
                          Siguiente <i className="fas fa-chevron-right ms-1"></i>
                        </button>
                      </div>
                    </div>
                  )}
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

        

        {/* Modal de Gestión de Lotes */}
        <GestionLotesModal 
          producto={productoSeleccionado}
          isOpen={lotesModalVisible}
          onClose={cerrarGestionLotes}
          onLoteCreado={onLoteCreado}
        />

        {/* Modal de Reporte Financiero */}
        {modalReporteVisible && (
          <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }} tabIndex="-1">
            <div className="modal-dialog modal-xl modal-dialog-scrollable">
              <div className="modal-content">
                <div className="modal-header bg-info text-white">
                  <h5 className="modal-title">
                    <i className="fas fa-file-invoice-dollar me-2"></i>
                    Reporte Financiero de Selección
                  </h5>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setModalReporteVisible(false)}></button>
                </div>
                <div className="modal-body p-0">
                  <div className="bg-light p-3 border-bottom">
                    <div className="row mb-3 g-2">
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Almacenes</label>
                        <div className="dropdown">
                          <button 
                            className="btn btn-outline-secondary dropdown-toggle w-100 text-start btn-sm" 
                            type="button" 
                            onClick={() => setAlmacenesDropdownOpen(!almacenesDropdownOpen)}
                          >
                            {filtrosAlmacenes.length === 0 ? 'Todos' : `${filtrosAlmacenes.length} seleccionados`}
                          </button>
                          <ul className={`dropdown-menu w-100 p-2 ${almacenesDropdownOpen ? 'show' : ''}`} style={{maxHeight: '200px', overflowY: 'auto', position: 'absolute'}}>
                            {almacenes.map(almacen => (
                              <li key={almacen.id} className="form-check">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  id={`modal-almacen-${almacen.id}`} 
                                  checked={filtrosAlmacenes.includes(almacen.id.toString())}
                                  onChange={() => handleAlmacenCheckbox(almacen.id.toString())}
                                />
                                <label className="form-check-label" htmlFor={`modal-almacen-${almacen.id}`}>
                                  {almacen.nombre}
                                </label>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Categoría</label>
                        <select 
                          className="form-select form-select-sm"
                          value={filtroCategoria}
                          onChange={(e) => setFiltroCategoria(e.target.value)}
                        >
                          <option value="">Todas</option>
                          {categorias.map(categoria => (
                            <option key={categoria} value={categoria}>
                              {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-2">
                        <label className="form-label small mb-1">Vencimiento</label>
                        <select 
                          className="form-select form-select-sm"
                          value={filtroVencimiento}
                          onChange={(e) => {
                            setFiltroVencimiento(e.target.value);
                            setCurrentPage(1);
                          }}
                        >
                          <option value="">Todos</option>
                          <option value="con_vencimiento">Con Vencimiento (Perecederos)</option>
                          <option value="sin_vencimiento">Sin Vencimiento</option>
                          <option value="por_vencer">Próximos a Vencer (&lt; 20 días)</option>
                          <option value="vencido">Vencidos</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small mb-1">Buscar</label>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Buscar por nombre, código..."
                          value={busqueda}
                          onChange={(e) => setBusqueda(e.target.value)}
                        />
                      </div>
                      <div className="col-md-2 d-flex align-items-end">
                        <button 
                          className="btn btn-secondary btn-sm w-100"
                          onClick={() => {
                            setFiltrosAlmacenes([]);
                            setFiltroCategoria('');
                            setFiltroVencimiento('');
                            setBusqueda('');
                            setCurrentPage(1);
                            setSelectedIds([]);
                          }}
                        >
                          <i className="fa fa-refresh me-1"></i> Limpiar
                        </button>
                      </div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2 border-top pt-2">
                      <span className="small text-muted">Selecciona los productos de los cuales quieres calcular el total (Se mostrará en el dashboard principal):</span>
                      <div className="d-flex gap-2">
                        <button className="btn btn-sm btn-outline-primary" onClick={toggleSelectAll}>
                          {selectedIds.length === productosBaseFiltrados.length && productosBaseFiltrados.length > 0 ? 'Deseleccionar Todos' : 'Seleccionar Todos'}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3" style={{ maxHeight: '60vh', overflowY: 'auto', overflowX: 'hidden' }} onClick={() => setAlmacenesDropdownOpen(false)}>
                    <div className="row g-3">
                      {productosBaseFiltrados.map(producto => (
                        <div key={producto.id} className="col-6 col-sm-4 col-md-3 col-lg-2">
                          <div 
                            className={`card h-100 cursor-pointer transition-all ${selectedIds.includes(producto.id) ? 'border-primary shadow' : 'border-secondary opacity-75'}`}
                            style={{ cursor: 'pointer', borderWidth: selectedIds.includes(producto.id) ? '2px' : '1px' }}
                            onClick={() => toggleProductSelection(producto.id)}
                          >
                            <div className="position-relative">
                              {producto.imagen ? (
                                <img 
                                  src={`http://${window.location.hostname}:3001/uploads/${producto.imagen}`}
                                  className="card-img-top" 
                                  alt={producto.nombre}
                                  style={{ height: '120px', objectFit: 'cover' }}
                                />
                              ) : (
                                <div className="bg-secondary text-white d-flex align-items-center justify-content-center" style={{ height: '120px' }}>
                                  <i className="fas fa-box fa-3x"></i>
                                </div>
                              )}
                              <div className="position-absolute top-0 end-0 p-2">
                                <input 
                                  type="checkbox" 
                                  className="form-check-input shadow"
                                  style={{ transform: 'scale(1.5)' }}
                                  checked={selectedIds.includes(producto.id)}
                                  onChange={() => toggleProductSelection(producto.id)}
                                  onClick={e => e.stopPropagation()}
                                />
                              </div>
                            </div>
                            <div className="card-body p-2 text-center d-flex flex-column justify-content-between">
                              <h6 className="card-title mb-1 small fw-bold text-truncate" title={producto.nombre}>{producto.nombre}</h6>
                              <span className="badge bg-light text-dark border w-100">{producto.almacen_nombre}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="modal-footer bg-white shadow-lg border-top">
                  <button className="btn btn-secondary" onClick={() => setModalReporteVisible(false)}>Cerrar</button>
                  <button className="btn btn-primary" onClick={() => setModalReporteVisible(false)}>
                    <i className="fas fa-check me-2"></i>
                    Aplicar Selección ({selectedIds.length})
                  </button>
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