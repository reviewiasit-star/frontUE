import React, { useState, useEffect } from 'react';

function AlertasVencimiento() {
  const [productos, setProductos] = useState([]);
  const [resumen, setResumen] = useState({});
  const [almacenes, setAlmacenes] = useState([]);
  const [filtroAlmacen, setFiltroAlmacen] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarProductosVencimiento();
    cargarAlmacenes();
  }, [filtroAlmacen]);

  const cargarProductosVencimiento = async () => {
    try {
      setLoading(true);
      const url = filtroAlmacen 
        ? `http://${window.location.hostname}:3001/api/productos?almacen_id=${filtroAlmacen}`
        : `http://${window.location.hostname}:3001/api/productos`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        // Filtrar solo productos perecederos con fecha de vencimiento
        const productosConVencimiento = data.filter(producto => 
          producto.tipo_producto === 'perecedero' && 
          producto.fecha_vencimiento &&
          producto.stock > 0
        );

        // Calcular estado de vencimiento para cada producto
        const productosConEstado = productosConVencimiento.map(producto => {
          const hoy = new Date();
          const vencimiento = new Date(producto.fecha_vencimiento);
          const diffTime = vencimiento - hoy;
          const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          
          let estado = 'normal';
          if (diasRestantes < 0) estado = 'vencido';
          else if (diasRestantes <= 3) estado = 'critico';
          else if (diasRestantes <= 7) estado = 'alerta';

          const valorRiesgo = producto.stock * producto.precio_unitario;

          return {
            ...producto,
            dias_restantes: diasRestantes,
            estado,
            valor_riesgo: valorRiesgo
          };
        });

        // Filtrar solo productos con alertas (vencidos, críticos o en alerta)
        const productosConAlertas = productosConEstado.filter(p => 
          p.estado === 'vencido' || p.estado === 'critico' || p.estado === 'alerta'
        );

        setProductos(productosConAlertas);

        // Calcular resumen
        const resumenCalculado = {
          vencidos: productosConAlertas.filter(p => p.estado === 'vencido').length,
          criticos: productosConAlertas.filter(p => p.estado === 'critico').length,
          en_alerta: productosConAlertas.filter(p => p.estado === 'alerta').length,
          valor_total_riesgo: productosConAlertas.reduce((sum, p) => sum + p.valor_riesgo, 0)
        };

        setResumen(resumenCalculado);
      } else {
        setError(data.error || 'Error al cargar productos');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const cargarAlmacenes = async () => {
    try {
      const response = await fetch(`http://${window.location.hostname}:3001/api/almacenes`);
      const data = await response.json();
      setAlmacenes(data);
    } catch (err) {
      console.error('Error al cargar almacenes:', err);
    }
  };

  const getAlertClass = (estado) => {
    switch (estado) {
      case 'vencido': return 'table-danger';
      case 'critico': return 'table-warning';
      case 'alerta': return 'table-info';
      default: return '';
    }
  };

  const getAlertIcon = (estado) => {
    switch (estado) {
      case 'vencido': return 'fa-times-circle text-danger';
      case 'critico': return 'fa-exclamation-triangle text-warning';
      case 'alerta': return 'fa-info-circle text-info';
      default: return 'fa-check-circle text-success';
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-BO');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="row mb-4">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h2><i className="fa fa-clock me-2"></i>Alertas de Vencimiento</h2>
            <div className="d-flex gap-2">
              <select 
                className="form-select" 
                value={filtroAlmacen} 
                onChange={(e) => setFiltroAlmacen(e.target.value)}
                style={{ width: 'auto' }}
              >
                <option value="">Todos los almacenes</option>
                {almacenes.map(almacen => (
                  <option key={almacen.id} value={almacen.id}>{almacen.nombre}</option>
                ))}
              </select>
              <button className="btn btn-outline-primary" onClick={cargarProductosVencimiento}>
                <i className="fa fa-refresh"></i> Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Resumen de alertas */}
      {resumen && Object.keys(resumen).length > 0 && (
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card border-danger">
              <div className="card-body text-center">
                <i className="fa fa-times-circle fa-2x text-danger mb-2"></i>
                <h5 className="card-title">Vencidos</h5>
                <h3 className="text-danger">{resumen.vencidos || 0}</h3>
                <small className="text-muted">Productos</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-warning">
              <div className="card-body text-center">
                <i className="fa fa-exclamation-triangle fa-2x text-warning mb-2"></i>
                <h5 className="card-title">Críticos</h5>
                <h3 className="text-warning">{resumen.criticos || 0}</h3>
                <small className="text-muted">Productos</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-info">
              <div className="card-body text-center">
                <i className="fa fa-info-circle fa-2x text-info mb-2"></i>
                <h5 className="card-title">En Alerta</h5>
                <h3 className="text-info">{resumen.en_alerta || 0}</h3>
                <small className="text-muted">Productos</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-primary">
              <div className="card-body text-center">
                <i className="fa fa-dollar-sign fa-2x text-primary mb-2"></i>
                <h5 className="card-title">Valor en Riesgo</h5>
                <h3 className="text-primary">{formatCurrency(resumen.valor_total_riesgo || 0)}</h3>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="alert alert-danger">
          <i className="fa fa-exclamation-triangle me-2"></i>
          {error}
        </div>
      )}

      {/* Tabla de alertas */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            <i className="fa fa-list me-2"></i>
            Productos con Alertas de Vencimiento
            {productos.length > 0 && <span className="badge bg-primary ms-2">{productos.length}</span>}
          </h5>
        </div>
        <div className="card-body">
          {productos.length === 0 ? (
            <div className="text-center py-4">
              <i className="fa fa-check-circle fa-3x text-success mb-3"></i>
              <h5>¡Excelente!</h5>
              <p className="text-muted">No hay productos con alertas de vencimiento en este momento.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Estado</th>
                    <th>Producto</th>
                    <th>Código</th>
                    <th>Almacén</th>
                    <th>Stock</th>
                    <th>Fecha Vencimiento</th>
                    <th>Días Restantes</th>
                    <th>Valor en Riesgo</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto, index) => (
                    <tr key={index} className={getAlertClass(producto.estado)}>
                      <td>
                        <i className={`fa ${getAlertIcon(producto.estado)} me-2`}></i>
                        <span className="text-capitalize">{producto.estado}</span>
                      </td>
                      <td>
                        <strong>{producto.nombre}</strong>
                        <br />
                        <small className="text-muted">{producto.categoria}</small>
                      </td>
                      <td>
                        {producto.codigo ? (
                          <code>{producto.codigo}</code>
                        ) : (
                          <span className="text-muted">Sin código</span>
                        )}
                      </td>
                      <td>{producto.almacen_nombre}</td>
                      <td>
                        <span className="badge bg-secondary">
                          {producto.stock} {producto.unidad}
                        </span>
                      </td>
                      <td>{formatDate(producto.fecha_vencimiento)}</td>
                      <td>
                        <span className={`badge ${
                          producto.dias_restantes < 0 ? 'bg-danger' :
                          producto.dias_restantes <= 3 ? 'bg-warning' :
                          producto.dias_restantes <= 7 ? 'bg-info' : 'bg-success'
                        }`}>
                          {producto.dias_restantes < 0 
                            ? `${Math.abs(producto.dias_restantes)} días vencido`
                            : `${producto.dias_restantes} días`
                          }
                        </span>
                      </td>
                      <td>{formatCurrency(producto.valor_riesgo)}</td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-primary"
                            title="Ver detalles del producto"
                            onClick={() => {
                              // Aquí se implementaría la navegación a detalles
                              console.log('Ver producto:', producto.id);
                            }}
                          >
                            <i className="fa fa-eye"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertasVencimiento;