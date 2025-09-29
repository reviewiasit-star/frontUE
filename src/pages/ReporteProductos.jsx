import React, { useEffect, useState } from 'react';
import '@fortawesome/fontawesome-free/css/all.min.css'; // Importar FontAwesome

function ReporteProductos() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProductos();
  }, []);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      let url = `http://${window.location.hostname}:3001/api/productos`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      setProductos(data);
    } catch {
      setProductos([]);
    }
    setLoading(false);
  };

  const totalInvertido = productos.reduce((acc, p) => acc + (Number(p.precio_unitario) * Number(p.stock)), 0);
  const totalRecuperacion = productos.reduce((acc, p) => acc + (Number(p.precio_salida || 0) * Number(p.stock)), 0);
  const gananciaPotencial = totalRecuperacion - totalInvertido;

  if (loading) {
    return (
      <div className="container">
        <div className="page-inner">
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
          <div>
            <h3 className="fw-bold mb-3">Reporte de Productos</h3>
            <h6 className="op-7 mb-2">Análisis de inventario y valoración de productos</h6>
          </div>
        </div>

        {/* Resumen de Productos */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card bg-gradient-info text-white shadow-lg">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h6 className="card-title mb-1">
                      <i className="fas fa-box me-2"></i>
                      Total Productos
                    </h6>
                    <h3 className="mb-0 fw-bold">
                      {productos.length}
                    </h3>
                  </div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-3">
                    <i className="fas fa-cubes fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-gradient-danger text-white shadow-lg">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h6 className="card-title mb-1">
                      <i className="fas fa-dollar-sign me-2"></i>
                      Capital Invertido
                    </h6>
                    <h3 className="mb-0 fw-bold">
                      Bs {totalInvertido.toFixed(2)}
                    </h3>
                  </div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-3">
                    <i className="fas fa-wallet fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-gradient-success text-white shadow-lg">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h6 className="card-title mb-1">
                      <i className="fas fa-chart-line me-2"></i>
                      Valor de Recuperación
                    </h6>
                    <h3 className="mb-0 fw-bold">
                      Bs {totalRecuperacion.toFixed(2)}
                    </h3>
                  </div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-3">
                    <i className="fas fa-arrow-trend-up fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-gradient-warning text-white shadow-lg">
              <div className="card-body">
                <div className="d-flex align-items-center">
                  <div className="flex-grow-1">
                    <h6 className="card-title mb-1">
                      <i className="fas fa-calculator me-2"></i>
                      Ganancia Potencial
                    </h6>
                    <h3 className="mb-0 fw-bold">
                      Bs {gananciaPotencial.toFixed(2)}
                    </h3>
                  </div>
                  <div className="bg-white bg-opacity-25 rounded-circle p-3">
                    <i className="fas fa-equals fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Productos */}
        <div className="card shadow-sm">
          <div className="card-header bg-gradient-info">
            <div className="d-flex align-items-center">
              <h4 className="card-title text-white mb-0">
                <i className="fas fa-clipboard-list me-2"></i>
                Inventario de Productos
              </h4>
              <div className="ms-auto">
                <span className="badge bg-light text-dark">
                  {productos.length} productos
                </span>
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="border-0 fw-bold">
                      <i className="fas fa-box me-2 text-primary"></i>
                      Nombre
                    </th>
                    <th className="border-0 fw-bold text-center">
                      <i className="fas fa-barcode me-2 text-info"></i>
                      Código
                    </th>
                    <th className="border-0 fw-bold text-center">
                      <i className="fas fa-cubes me-2 text-warning"></i>
                      Stock
                    </th>
                    <th className="border-0 fw-bold text-center">
                      <i className="fas fa-dollar-sign me-2 text-danger"></i>
                      Precio Unitario
                    </th>
                    <th className="border-0 fw-bold text-center">
                      <i className="fas fa-tag me-2 text-success"></i>
                      Precio de Venta
                    </th>
                    <th className="border-0 fw-bold text-center">
                      <i className="fas fa-wallet me-2 text-danger"></i>
                      Total Invertido
                    </th>
                    <th className="border-0 fw-bold text-center">
                      <i className="fas fa-chart-line me-2 text-success"></i>
                      Capital de Recuperación
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {productos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-4">
                        <div className="d-flex flex-column align-items-center">
                          <i className="fas fa-box-open fa-3x text-muted mb-3"></i>
                          <p className="text-muted mb-0">No hay productos para mostrar.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    productos.map((p, idx) => (
                      <tr key={idx} className="align-middle">
                        <td>
                          <div>
                            <strong className="text-dark">{p.nombre || '-'}</strong>
                            {p.categoria && (
                              <>
                                <br />
                                <small className="text-muted">
                                  <i className="fas fa-tag me-1"></i>
                                  {p.categoria}
                                </small>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="text-center">
                          <span className="badge badge-secondary badge-sm">
                            {p.codigo || '-'}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className={`badge ${(p.stock || 0) < 10 ? 'badge-danger' : 'badge-success'} badge-lg`}>
                            <i className="fas fa-cubes me-1"></i>
                            {p.stock || 0}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="fw-bold text-danger">
                            <i className="fas fa-dollar-sign me-1"></i>
                            Bs {parseFloat(p.precio_unitario || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="fw-bold text-success">
                            <i className="fas fa-tag me-1"></i>
                            Bs {parseFloat(p.precio_salida || 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="fw-bold text-danger fs-6">
                            <i className="fas fa-wallet me-1"></i>
                            Bs {(Number(p.precio_unitario || 0) * Number(p.stock || 0)).toFixed(2)}
                          </span>
                        </td>
                        <td className="text-center">
                          <span className="fw-bold text-success fs-6">
                            <i className="fas fa-chart-line me-1"></i>
                            Bs {(Number(p.precio_salida || 0) * Number(p.stock || 0)).toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {productos.length > 0 && (
                  <tfoot className="table-dark">
                    <tr>
                      <th colSpan="5" className="text-center">
                        <i className="fas fa-calculator me-2"></i>
                        <strong>TOTALES GENERALES</strong>
                      </th>
                      <th className="text-center">
                        <div className="d-flex flex-column">
                          <span className="text-warning">
                            <i className="fas fa-wallet me-1"></i>
                            Total Invertido
                          </span>
                          <span className="fs-5 fw-bold text-white">
                            Bs {totalInvertido.toFixed(2)}
                          </span>
                        </div>
                      </th>
                      <th className="text-center">
                        <div className="d-flex flex-column">
                          <span className="text-success">
                            <i className="fas fa-chart-line me-1"></i>
                            Total Recuperación
                          </span>
                          <span className="fs-5 fw-bold text-white">
                            Bs {totalRecuperacion.toFixed(2)}
                          </span>
                        </div>
                      </th>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReporteProductos;