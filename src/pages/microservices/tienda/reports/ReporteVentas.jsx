import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Link } from 'react-router-dom';
import AuthService from '../../../../services/authService';
import './ReporteVentas.css';

function ReporteVentas() {
  const [ventas, setVentas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [clienteFiltro, setClienteFiltro] = useState('');
  const [formaPagoFiltro, setFormaPagoFiltro] = useState('');
  const [almacenFiltro, setAlmacenFiltro] = useState('');
  const [productosFiltroMulti, setProductosFiltroMulti] = useState([]);
  const [modalProductosVisible, setModalProductosVisible] = useState(false);
  const [estudianteFiltro, setEstudianteFiltro] = useState('');
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [soloSinAsignar, setSoloSinAsignar] = useState(false);
  const [sugerenciasEstudiantes, setSugerenciasEstudiantes] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [almacenes, setAlmacenes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [estudiantes, setEstudiantes] = useState([]);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  const [productosExpandidos, setProductosExpandidos] = useState({});
  const user = AuthService.getUser();
  
  // Estado para el menú hamburguesa móvil
  const [menuHamburguesaVisible, setMenuHamburguesaVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  useEffect(() => {
    fetchAlmacenes();
    fetchProductos();
    fetchEstudiantes();
    // Obtener información del usuario
    const userData = AuthService.getUser();
    setUserInfo(userData);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    fetchVentas();
    // eslint-disable-next-line
  }, [fechaInicio, fechaFin, clienteFiltro, formaPagoFiltro, almacenFiltro, productosFiltroMulti, estudianteSeleccionado, soloSinAsignar, pagination.currentPage]);

  // Filtrar estudiantes basado en el texto de búsqueda
  useEffect(() => {
    if (estudianteFiltro.trim().length >= 2) {
      const filtrados = estudiantes.filter(estudiante => {
        const nombreCompleto = `${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''}`.toLowerCase();
        const busqueda = estudianteFiltro.toLowerCase();
        return nombreCompleto.includes(busqueda);
      }).slice(0, 10); // Limitar a 10 sugerencias
      setSugerenciasEstudiantes(filtrados);
      setMostrarSugerencias(true);
    } else {
      setSugerenciasEstudiantes([]);
      setMostrarSugerencias(false);
    }
  }, [estudianteFiltro, estudiantes]);

  const fetchAlmacenes = async () => {
    try {
      const res = await fetch(`http://${window.location.hostname}:3001/api/almacenes`);
      const data = await res.json();
      // El endpoint devuelve directamente el array de almacenes
      setAlmacenes(data || []);
    } catch (error) {
      console.error('Error al obtener almacenes:', error);
      setAlmacenes([]);
    }
  };

  const fetchProductos = async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(`http://${window.location.hostname}:3001/api/productos`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // El endpoint devuelve directamente el array de productos
      setProductos(Array.isArray(data) ? data : (data.productos || []));
    } catch (error) {
      console.error('Error al obtener productos:', error);
      setProductos([]);
    }
  };

  const fetchEstudiantes = async () => {
    try {
      const token = AuthService.getToken();
      const res = await fetch(`http://${window.location.hostname}:3001/api/estudiantes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      // El endpoint devuelve directamente el array de estudiantes
      setEstudiantes(data || []);
    } catch (error) {
      console.error('Error al obtener estudiantes:', error);
      setEstudiantes([]);
    }
  };

  const fetchVentas = async () => {
    setLoading(true);
    try {
      const token = AuthService.getToken();
      let url = `http://${window.location.hostname}:3001/api/ventas?usuario_id=${user.id}`;
      const params = [];
      
      if (fechaInicio) params.push(`fecha_inicio=${fechaInicio}`);
      if (fechaFin) params.push(`fecha_fin=${fechaFin}`);
      if (clienteFiltro) params.push(`cliente=${clienteFiltro}`);
      if (formaPagoFiltro) params.push(`forma_pago=${formaPagoFiltro}`);
      if (almacenFiltro) params.push(`almacen_id=${almacenFiltro}`);
      if (productosFiltroMulti.length > 0) params.push(`productos_ids=${productosFiltroMulti.join(',')}`);
      if (estudianteSeleccionado) params.push(`estudiante_id=${estudianteSeleccionado.id}`);
      if (soloSinAsignar) params.push(`estudiante_filtro=sin_asignar`);
      params.push(`page=${pagination.currentPage}&limit=15`);
      
      if (params.length > 0) url += '&' + params.join('&');
      
      console.log('URL de ventas:', url);
      
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      console.log('Respuesta de ventas:', data);
      
      setVentas(data.ventasAgrupadas || []);
      setPagination({
        currentPage: data.pagination?.currentPage || 1,
        totalPages: data.pagination?.totalPages || 1,
        totalRecords: data.pagination?.totalRecords || 0,
        hasNextPage: data.pagination?.hasNextPage || false,
        hasPrevPage: data.pagination?.hasPrevPage || false
      });
    } catch (error) {
      console.error('Error al obtener ventas:', error);
      setVentas([]);
    }
    setLoading(false);
  };

  const seleccionarEstudiante = (estudiante) => {
    setEstudianteSeleccionado(estudiante);
    setEstudianteFiltro(`${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''}`);
    setMostrarSugerencias(false);
    setSoloSinAsignar(false); // Desactivar filtro de sin asignar si se selecciona un estudiante
  };

  const limpiarEstudiante = () => {
    setEstudianteSeleccionado(null);
    setEstudianteFiltro('');
    setSugerenciasEstudiantes([]);
    setMostrarSugerencias(false);
  };

  const toggleSoloSinAsignar = () => {
    setSoloSinAsignar(!soloSinAsignar);
    if (!soloSinAsignar) {
      // Si se activa el filtro de sin asignar, limpiar la selección de estudiante
      setEstudianteSeleccionado(null);
      setEstudianteFiltro('');
      setSugerenciasEstudiantes([]);
      setMostrarSugerencias(false);
    }
  };

  // Totales
  const totalCantidad = ventas.reduce((sum, v) => sum + (v.productos ? v.productos.reduce((s, p) => s + parseInt(p.cantidad || 0), 0) : 0), 0);
  const totalVentas = ventas.reduce((sum, v) => sum + (parseFloat(v.total) || 0), 0);

  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Ventas', 14, 18);
    doc.setFontSize(10);
    doc.text(`Usuario: ${user.nombre_completo || user.usuario}`, 14, 25);
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-BO')}`, 14, 31);
    if (fechaInicio && fechaFin) doc.text(`Periodo: ${fechaInicio} a ${fechaFin}`, 14, 37);
    if (soloSinAsignar) doc.text('Filtro: Solo ventas sin asignar a estudiantes', 14, 43);
    if (productosFiltroMulti.length > 0) doc.text(`Filtro: ${productosFiltroMulti.length} producto(s) específico(s)`, 14, 49);
    
    // TABLA 1: VENTAS
    autoTable(doc, {
      startY: productosFiltroMulti.length > 0 ? 55 : 50,
      head: [[
        'Fecha',
        'Cliente',
        'Forma de pago',
        'Producto',
        'Cantidad',
        'Precio Unit.',
        'Total'
      ]],
      body: ventas.map(transaccion => [
        transaccion.fecha ? new Date(transaccion.fecha).toLocaleDateString('es-BO') : '-',
        transaccion.estudiante_nombre || 'Sin asignar',
        transaccion.forma_pago || '-',
        transaccion.productos && transaccion.productos.length > 0 ? transaccion.productos[0].producto_nombre : '-',
        transaccion.productos ? transaccion.productos.reduce((s, p) => s + parseInt(p.cantidad || 0), 0) : 0,
        transaccion.productos && transaccion.productos.length > 0 ? `Bs ${parseFloat(transaccion.productos[0].precio_venta || 0).toFixed(2)}` : '-',
        `Bs ${parseFloat(transaccion.total || 0).toFixed(2)}`
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [102, 126, 234], textColor: 255, fontStyle: 'bold' },
      margin: { left: 10, right: 10 },
      tableWidth: 190,
      rowPageBreak: 'avoid',
      foot: [[
        '', '', '', 'Total:', `${totalCantidad}`, '', `Bs ${totalVentas.toFixed(2)}`
      ]]
    });

    // Determinar productos para la segunda tabla
    let productosAReportar = [];
    if (productosFiltroMulti.length > 0) {
      productosAReportar = productos.filter(p => productosFiltroMulti.includes(p.id));
    } else {
      const idsVendidos = new Set();
      ventas.forEach(v => {
        if (v.productos) {
          v.productos.forEach(p => idsVendidos.add(p.producto_id));
        }
      });
      productosAReportar = productos.filter(p => idsVendidos.has(p.id));
    }

    // TABLA 2: STOCK RESTANTE
    if (productosAReportar.length > 0) {
      const finalY = doc.lastAutoTable.finalY || 50;
      doc.setFontSize(12);
      doc.text('Stock Restante en Almacén', 14, finalY + 10);
      
      const totalInversionRestante = productosAReportar.reduce((sum, p) => sum + ((p.stock_total || 0) * parseFloat(p.precio_venta_promedio || p.precio_salida || p.precio_unitario || 0)), 0);
      
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Producto', 'Categoría', 'Precio Unit.', 'Stock Restante', 'Valor Estimado']],
        body: productosAReportar.map(p => {
          const precio = parseFloat(p.precio_venta_promedio || p.precio_salida || p.precio_unitario || 0);
          const stock = p.stock_total || 0;
          return [
            p.nombre,
            p.categoria || '-',
            `Bs ${precio.toFixed(2)}`,
            `${stock}`,
            `Bs ${(stock * precio).toFixed(2)}`
          ];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [40, 167, 69], textColor: 255, fontStyle: 'bold' },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        foot: [[
          '', '', '', 'Total Valor Estimado:', `Bs ${totalInversionRestante.toFixed(2)}`
        ]]
      });
    }

    doc.save('reporte_ventas_inventario.pdf');
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      currentPage: newPage
    }));
  };

  const toggleProductos = (idx) => {
    setProductosExpandidos(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const cerrarMenuHamburguesa = () => {
    setMenuHamburguesaVisible(false);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/';
  };

  return (
    <div className="reporte-ventas-root">
      <div className="reporte-ventas-header">
        <div className="header-top">
          {/* Botón hamburguesa para móvil */}
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-outline-secondary d-md-none me-3" 
              onClick={() => setMenuHamburguesaVisible(true)}
              title="Menú de navegación"
              style={{ fontSize: '0.9rem', padding: '8px 12px' }}
            >
              <i className="fas fa-bars"></i>
            </button>
            <h2 className="mb-0">Reporte de Ventas</h2>
          </div>
          <button 
            className="btn-exportar" 
            onClick={exportarPDF}
            disabled={ventas.length === 0}
          >
            <i className="fas fa-file-pdf"></i>
            Exportar PDF
          </button>
        </div>

        <div className="reporte-ventas-filtros">
          <div className="filtro-grupo">
            <i className="fas fa-calendar-alt"></i>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} placeholder="Fecha inicio" />
          </div>
          <div className="filtro-grupo">
            <i className="fas fa-calendar-check"></i>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} placeholder="Fecha fin" />
          </div>
          <div className="filtro-grupo">
            <i className="fas fa-user"></i>
            <input type="text" value={clienteFiltro} onChange={e => setClienteFiltro(e.target.value)} placeholder="Cliente" />
          </div>
          <div className="filtro-grupo">
            <i className="fas fa-credit-card"></i>
            <select value={formaPagoFiltro} onChange={e => setFormaPagoFiltro(e.target.value)}>
              <option value="">Todas las formas de pago</option>
              <option value="Efectivo">Efectivo</option>
              <option value="QR">QR</option>
            </select>
          </div>
          <div className="filtro-grupo">
            <i className="fas fa-warehouse"></i>
            <select value={almacenFiltro} onChange={e => setAlmacenFiltro(e.target.value)}>
              <option value="">Todos los almacenes</option>
              {almacenes.map(almacen => (
                <option key={almacen.id} value={almacen.id}>{almacen.nombre}</option>
              ))}
            </select>
          </div>
          <div className="filtro-grupo">
            <i className="fas fa-box"></i>
            <button 
              className="btn-select-productos" 
              onClick={() => setModalProductosVisible(true)}
              style={{
                background: 'transparent',
                border: 'none',
                padding: '8px',
                width: '100%',
                textAlign: 'left',
                color: productosFiltroMulti.length > 0 ? '#4a6cf7' : '#6c757d',
                fontWeight: productosFiltroMulti.length > 0 ? '600' : 'normal'
              }}
            >
              {productosFiltroMulti.length === 0 ? 'Todos los productos' : `${productosFiltroMulti.length} productos seleccionados`}
            </button>
          </div>
          <div className="filtro-grupo estudiante-filtro">
            <i className="fas fa-user-graduate"></i>
            <div className="estudiante-input-container">
              <input 
                type="text" 
                value={estudianteFiltro} 
                onChange={e => setEstudianteFiltro(e.target.value)} 
                placeholder="Buscar estudiante (mínimo 2 letras)"
                onFocus={() => setMostrarSugerencias(true)}
                disabled={soloSinAsignar}
              />
              {estudianteSeleccionado && (
                <button 
                  className="btn-limpiar-estudiante" 
                  onClick={limpiarEstudiante}
                  title="Limpiar estudiante"
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
              {mostrarSugerencias && sugerenciasEstudiantes.length > 0 && !soloSinAsignar && (
                <div className="sugerencias-estudiantes">
                  {sugerenciasEstudiantes.map(estudiante => (
                    <div 
                      key={estudiante.id} 
                      className="sugerencia-estudiante"
                      onClick={() => seleccionarEstudiante(estudiante)}
                    >
                      <div className="estudiante-nombre">
                        {estudiante.nombre} {estudiante.apellido_paterno || ''} {estudiante.apellido_materno || ''}
                      </div>
                      {estudiante.codigo_estudiante && (
                        <div className="estudiante-codigo">Código: {estudiante.codigo_estudiante}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="filtro-grupo filtro-checkbox">
            <label className="checkbox-container">
              <input 
                type="checkbox" 
                checked={soloSinAsignar} 
                onChange={toggleSoloSinAsignar}
              />
              <span className="checkmark"></span>
              <span className="checkbox-label">
                <i className="fas fa-user-slash"></i>
                Solo ventas sin asignar
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="reporte-ventas-table-container">
        <table className="reporte-ventas-table">
                     <thead>
             <tr>
               <th>Fecha</th>
               <th>Cliente</th>
               <th>Forma de Pago</th>
               <th>Producto</th>
               <th>Cantidad</th>
               <th>Precio Unit.</th>
               <th>Total</th>
             </tr>
           </thead>
          <tbody>
                         {loading ? (
               <tr><td colSpan={7} className="text-center">Cargando...</td></tr>
             ) : ventas.length === 0 ? (
               <tr><td colSpan={7} className="text-center">No hay ventas para mostrar</td></tr>
            ) : (
              ventas.map((v, idx) => (
                <React.Fragment key={idx}>
                  {/* Fila principal de la transacción */}
                  <tr className={idx % 2 === 0 ? 'fila-par' : 'fila-impar'}>
                    <td>{v.fecha ? new Date(v.fecha).toLocaleDateString('es-BO') : '-'}</td>
                    <td>{v.estudiante_nombre ? (
                      <span className="cliente-nombre">{v.estudiante_nombre}</span>
                    ) : (
                      <span className="cliente-sin-asignar">Sin asignar</span>
                    )}</td>
                    <td>
                      <span className={`badge-pago ${v.forma_pago === 'Efectivo' ? 'efectivo' : v.forma_pago === 'QR' ? 'qr' : 'otro'}`}>
                        {v.forma_pago || 'Sin especificar'}
                      </span>
                    </td>
                    <td>
                      <div className="producto-info">
                        {v.productos && v.productos.length > 0 && v.productos[0].imagen ? (
                          <img 
                            src={`http://${window.location.hostname}:3001/uploads/${v.productos[0].imagen}`} 
                            alt={v.productos[0].producto_nombre} 
                            className="producto-imagen"
                          />
                        ) : (
                          <div className="producto-placeholder">
                            <i className="fas fa-box"></i>
                          </div>
                        )}
                        <span className="producto-nombre">
                          {v.productos && v.productos.length > 0 ? (
                            v.productos.length === 1 ? 
                              v.productos[0].producto_nombre : 
                              `${v.productos[0].producto_nombre} + ${v.productos.length - 1} más`
                          ) : '-'}
                        </span>
                        {v.productos && v.productos.length > 1 && (
                          <button 
                            className="btn-expandir-productos"
                            onClick={() => toggleProductos(idx)}
                            title="Ver todos los productos"
                          >
                            <i className="fas fa-chevron-down"></i>
                          </button>
                        )}
                      </div>
                    </td>
                                         <td>{v.productos ? v.productos.reduce((s, p) => s + parseInt(p.cantidad || 0), 0) : 0}</td>
                     <td className="precio-unitario">
                       {v.productos && v.productos.length > 0 ? (
                         v.productos.length === 1 ? 
                           `Bs ${parseFloat(v.productos[0].precio_venta || 0).toFixed(2)}` : 
                           'Varios'
                       ) : '-'}
                     </td>
                     <td className="total-venta">Bs {parseFloat(v.total || 0).toFixed(2)}</td>
                  </tr>
                  
                                     {/* Filas expandibles para productos adicionales */}
                   {v.productos && v.productos.length > 1 && productosExpandidos[idx] && (
                     <>
                       {/* Fila del primer producto cuando está expandido */}
                       <tr className="fila-producto-detalle">
                         <td></td>
                         <td></td>
                         <td></td>
                         <td>
                           <div className="producto-info producto-detalle">
                             <div className="indentacion"></div>
                             {v.productos[0].imagen ? (
                               <img 
                                 src={`http://${window.location.hostname}:3001/uploads/${v.productos[0].imagen}`} 
                                 alt={v.productos[0].producto_nombre} 
                                 className="producto-imagen"
                               />
                             ) : (
                               <div className="producto-placeholder">
                                 <i className="fas fa-box"></i>
                               </div>
                             )}
                             <span className="producto-nombre">{v.productos[0].producto_nombre}</span>
                           </div>
                         </td>
                         <td className="cantidad-producto">{v.productos[0].cantidad}</td>
                         <td className="precio-unitario">Bs {parseFloat(v.productos[0].precio_venta || 0).toFixed(2)}</td>
                         <td className="subtotal-producto">Bs {(parseFloat(v.productos[0].precio_venta || 0) * parseInt(v.productos[0].cantidad || 0)).toFixed(2)}</td>
                       </tr>
                                                {/* Filas de productos adicionales */}
                         {v.productos.slice(1).map((producto, prodIdx) => (
                           <tr key={`${idx}-${prodIdx}`} className="fila-producto-detalle">
                             <td></td>
                             <td></td>
                             <td></td>
                             <td>
                               <div className="producto-info producto-detalle">
                                 <div className="indentacion"></div>
                                 {producto.imagen ? (
                                   <img 
                                     src={`http://${window.location.hostname}:3001/uploads/${producto.imagen}`} 
                                     alt={producto.producto_nombre} 
                                     className="producto-imagen"
                                   />
                                 ) : (
                                   <div className="producto-placeholder">
                                     <i className="fas fa-box"></i>
                                   </div>
                                 )}
                                 <span className="producto-nombre">{producto.producto_nombre}</span>
                               </div>
                             </td>
                             <td className="cantidad-producto">{producto.cantidad}</td>
                             <td className="precio-unitario">Bs {parseFloat(producto.precio_venta || 0).toFixed(2)}</td>
                             <td className="subtotal-producto">Bs {(parseFloat(producto.precio_venta || 0) * parseInt(producto.cantidad || 0)).toFixed(2)}</td>
                           </tr>
                         ))}
                       </>
                     )}
                </React.Fragment>
              ))
            )}
          </tbody>
                     <tfoot>
             <tr>
               <th colSpan={4} className="text-end">Totales:</th>
               <th>{totalCantidad}</th>
               <th></th>
               <th className="total-venta">Bs {totalVentas.toFixed(2)}</th>
             </tr>
           </tfoot>
        </table>
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && (
        <div className="paginacion">
          <div className="paginacion-info">
            <span>Página {pagination.currentPage} de {pagination.totalPages} ({pagination.totalRecords} registros)</span>
          </div>
          <div className="paginacion-controles">
            <button 
              className="btn-pagina" 
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={!pagination.hasPrevPage}
            >
              Anterior
            </button>
            <button 
              className="btn-pagina" 
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={!pagination.hasNextPage}
            >
              Siguiente
            </button>
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

      {/* Modal para selección de múltiples productos */}
      {modalProductosVisible && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }} tabIndex="-1">
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-check-square me-2"></i>
                  Seleccionar Productos para Reporte
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setModalProductosVisible(false)}></button>
              </div>
              <div className="modal-body p-0">
                <div className="bg-light p-3 border-bottom d-flex justify-content-between align-items-center">
                  <span>Selecciona los productos que quieres incluir en tu reporte:</span>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => setProductosFiltroMulti(productos.map(p => p.id))}
                    >
                      Marcar todos
                    </button>
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={() => setProductosFiltroMulti([])}
                    >
                      Desmarcar todos
                    </button>
                  </div>
                </div>
                <div className="list-group list-group-flush">
                  {productos.map(p => (
                    <label key={p.id} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center" style={{ cursor: 'pointer' }}>
                      <div className="d-flex align-items-center">
                        <input 
                          className="form-check-input me-3" 
                          type="checkbox" 
                          checked={productosFiltroMulti.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setProductosFiltroMulti([...productosFiltroMulti, p.id]);
                            } else {
                              setProductosFiltroMulti(productosFiltroMulti.filter(id => id !== p.id));
                            }
                          }}
                        />
                        <div>
                          <strong>{p.nombre}</strong>
                          <div className="text-muted small">{p.categoria} | Stock: {p.stock_total || 0}</div>
                        </div>
                      </div>
                      <span className="badge bg-light text-dark">Bs {p.precio_salida || p.precio_unitario}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="modal-footer bg-light">
                <button type="button" className="btn btn-secondary" onClick={() => setModalProductosVisible(false)}>
                  Cerrar
                </button>
                <button type="button" className="btn btn-primary" onClick={() => setModalProductosVisible(false)}>
                  Aplicar Filtro ({productosFiltroMulti.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ReporteVentas;