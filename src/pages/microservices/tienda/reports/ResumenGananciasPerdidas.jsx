import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';
import NotificationModal from '../components/NotificationModal';
import { useNotification } from '../hooks/useNotification';

function ResumenGananciasPerdidas() {
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  const [resumen, setResumen] = useState({
    resumen_almacenes: [],
    resumen_categorias: [],
    totales_generales: {
      total_ventas: 0,
      total_costos: 0,
      total_ganancias: 0,
      margen_ganancia: 0
    }
  });
  const [almacenes, setAlmacenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filtros, setFiltros] = useState({
    fecha_inicio: '',
    fecha_fin: '',
    almacen_id: ''
  });

  useEffect(() => {
    fetchAlmacenes();
    // Cargar resumen del mes actual por defecto
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
      fetchResumen();
    }
  }, [filtros.fecha_inicio, filtros.fecha_fin]);

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

  const fetchResumen = async () => {
    setLoading(true);
    try {
      const token = authService.getToken();
      let url = `http://${window.location.hostname}:3001/api/resumen-ganancias-perdidas`;
      
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.almacen_id) params.append('almacen_id', filtros.almacen_id);
      
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
        setResumen(data.resumen);
      }
    } catch (error) {
      console.error('Error al cargar resumen:', error);
    }
    setLoading(false);
  };

  const exportarExcel = async () => {
    try {
      const token = authService.getToken();
      let url = `http://${window.location.hostname}:3001/api/resumen-ganancias-perdidas`;
      
      const params = new URLSearchParams();
      if (filtros.fecha_inicio) params.append('fecha_inicio', filtros.fecha_inicio);
      if (filtros.fecha_fin) params.append('fecha_fin', filtros.fecha_fin);
      if (filtros.almacen_id) params.append('almacen_id', filtros.almacen_id);
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
        link.download = `resumen_ganancias_perdidas_${filtros.fecha_inicio}_${filtros.fecha_fin}.xlsx`;
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

  const getAlmacenNombre = (almacenId) => {
    const almacen = almacenes.find(a => a.id === almacenId);
    return almacen ? almacen.nombre : 'N/A';
  };

  const formatearPorcentaje = (valor) => {
    return `${parseFloat(valor || 0).toFixed(1)}%`;
  };

  const formatearMoneda = (valor) => {
    return `Bs ${parseFloat(valor || 0).toFixed(2)}`;
  };

  return (
    <div className="container-fluid">
      <div className="page-inner">
        <div className="page-header">
          <h3 className="fw-bold mb-3">Resumen de Ganancias y Pérdidas</h3>
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
              <a href="#">Ganancias y Pérdidas</a>
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
                    className="btn btn-success btn-round ms-auto"
                    onClick={exportarExcel}
                    disabled={loading}
                  >
                    <i className="fa fa-download"></i> Exportar Excel
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
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
                  <div className="col-md-4">
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
                      <label>&nbsp;</label>
                      <button 
                        className="btn btn-info btn-block"
                        onClick={fetchResumen}
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

        {/* Resumen General */}
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
                      <h4 className="card-title">{formatearMoneda(resumen.totales_generales.total_ventas)}</h4>
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
                      <h4 className="card-title">{formatearMoneda(resumen.totales_generales.total_costos)}</h4>
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
                      <h4 className="card-title">{formatearMoneda(resumen.totales_generales.total_ganancias)}</h4>
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
                    <div className={`icon-big text-center ${
                      parseFloat(resumen.totales_generales.margen_ganancia) >= 20 ? 'icon-success' :
                      parseFloat(resumen.totales_generales.margen_ganancia) >= 10 ? 'icon-warning' : 'icon-danger'
                    } bubble-shadow-small`}>
                      <i className="fas fa-percentage"></i>
                    </div>
                  </div>
                  <div className="col col-stats ms-3 ms-sm-0">
                    <div className="numbers">
                      <p className="card-category">Margen de Ganancia</p>
                      <h4 className="card-title">{formatearPorcentaje(resumen.totales_generales.margen_ganancia)}</h4>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Resumen por Almacenes */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Resumen por Almacenes</h4>
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
                          <th>Almacén</th>
                          <th>Total Ventas</th>
                          <th>Total Costos</th>
                          <th>Total Ganancias</th>
                          <th>Margen de Ganancia</th>
                          <th>Cantidad Productos Vendidos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resumen.resumen_almacenes.map((almacen) => (
                          <tr key={almacen.almacen_id}>
                            <td>{getAlmacenNombre(almacen.almacen_id)}</td>
                            <td>{formatearMoneda(almacen.total_ventas)}</td>
                            <td>{formatearMoneda(almacen.total_costos)}</td>
                            <td>
                              <span className="text-success fw-bold">
                                {formatearMoneda(almacen.total_ganancias)}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${
                                parseFloat(almacen.margen_ganancia) >= 20 ? 'badge-success' :
                                parseFloat(almacen.margen_ganancia) >= 10 ? 'badge-warning' : 'badge-danger'
                              }`}>
                                {formatearPorcentaje(almacen.margen_ganancia)}
                              </span>
                            </td>
                            <td>{almacen.cantidad_productos_vendidos}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {resumen.resumen_almacenes.length === 0 && (
                      <div className="text-center py-4">
                        <p>No se encontraron datos para el período seleccionado</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Resumen por Categorías */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Resumen por Categorías</h4>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Categoría</th>
                        <th>Total Ventas</th>
                        <th>Total Costos</th>
                        <th>Total Ganancias</th>
                        <th>Margen de Ganancia</th>
                        <th>Cantidad Productos Vendidos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumen.resumen_categorias.map((categoria) => (
                        <tr key={categoria.categoria}>
                          <td>
                            <span className="badge badge-info">
                              {categoria.categoria || 'Sin categoría'}
                            </span>
                          </td>
                          <td>{formatearMoneda(categoria.total_ventas)}</td>
                          <td>{formatearMoneda(categoria.total_costos)}</td>
                          <td>
                            <span className="text-success fw-bold">
                              {formatearMoneda(categoria.total_ganancias)}
                            </span>
                          </td>
                          <td>
                            <span className={`badge ${
                              parseFloat(categoria.margen_ganancia) >= 20 ? 'badge-success' :
                              parseFloat(categoria.margen_ganancia) >= 10 ? 'badge-warning' : 'badge-danger'
                            }`}>
                              {formatearPorcentaje(categoria.margen_ganancia)}
                            </span>
                          </td>
                          <td>{categoria.cantidad_productos_vendidos}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {resumen.resumen_categorias.length === 0 && (
                    <div className="text-center py-4">
                      <p>No se encontraron datos por categorías para el período seleccionado</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Análisis de Rendimiento */}
        <div className="row">
          <div className="col-md-12">
            <div className="card">
              <div className="card-header">
                <h4 className="card-title">Análisis de Rendimiento</h4>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <div className="alert alert-info">
                      <h5><i className="fa fa-info-circle"></i> Interpretación del Margen de Ganancia</h5>
                      <ul className="mb-0">
                        <li><strong>Excelente:</strong> 20% o más</li>
                        <li><strong>Bueno:</strong> 10% - 19%</li>
                        <li><strong>Bajo:</strong> Menos del 10%</li>
                      </ul>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <div className="alert alert-success">
                      <h5><i className="fa fa-lightbulb"></i> Recomendaciones</h5>
                      <ul className="mb-0">
                        <li>Enfócate en productos con mayor margen</li>
                        <li>Revisa precios de productos con bajo margen</li>
                        <li>Considera promociones para productos de alta rotación</li>
                        <li>Analiza costos de productos con pérdidas</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

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

export default ResumenGananciasPerdidas;