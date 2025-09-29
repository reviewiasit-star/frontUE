import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

const Reportes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [mesInicio, setMesInicio] = useState('Febrero');
  const [mesFin, setMesFin] = useState('Noviembre');
  const [filtroEstadoCompromiso, setFiltroEstadoCompromiso] = useState('todos');

  const meses = [
    'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre'
  ];

  useEffect(() => {
    console.log('useEffect ejecutado - filtroAnio:', filtroAnio, 'filtroEstadoCompromiso:', filtroEstadoCompromiso);
    cargarDatos();
  }, [filtroAnio, filtroEstadoCompromiso]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/reporte-pagos-estudiantes?anio=${filtroAnio}&estado_compromiso=${filtroEstadoCompromiso}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }

      const data = await response.json();
      
      if (data.ok) {
        console.log('=== DEPURACIÓN REPORTES ===');
        console.log('Datos recibidos del backend:', data.estudiantes);
        console.log('Cantidad total de estudiantes recibidos:', data.estudiantes.length);
        
        const carmenData = data.estudiantes.filter(e => e.nombre.includes('Carmen'));
        console.log('Registros de Carmen encontrados:', carmenData.length);
        console.log('Detalles de Carmen:', carmenData.map(c => ({
          id: c.id,
          compromiso_id: c.compromiso_id,
          nombre: c.nombre,
          nivel: c.nivel,
          estado_compromiso: c.estado_compromiso,
          anio_inscripcion: c.anio_inscripcion
        })));
        
        console.log('Estado anterior de estudiantes:', estudiantes.length);
        setEstudiantes(data.estudiantes);
        console.log('=== FIN DEPURACIÓN ===');
      } else {
        throw new Error(data.message || 'Error al cargar datos');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const obtenerEstadoPago = (estudiante, mes) => {
    const pagoMes = estudiante.pagos_por_mes[mes];
    
    // IMPORTANTE: Si el compromiso está concluido, no mostrar deudas pendientes
    if (estudiante.estado_compromiso === 'concluido') {
      // Si hay información del pago, mostrarla como está
      if (pagoMes) {
        const montoPagado = parseFloat(pagoMes.cuota) || 0;
        const montoEsperado = parseFloat(pagoMes.monto_con_descuento) || 0;
        
        return { 
          estado: montoPagado > 0 ? 'Pagado' : 'No Aplica', 
          color: montoPagado > 0 ? 'success' : 'secondary',
          montoPendiente: 0, // No hay pendientes en compromisos concluidos
          montoPagado: montoPagado,
          montoEsperado: montoEsperado,
          conBeca: pagoMes.tiene_beca === 1,
          descuentoBeca: pagoMes.descuento_beca || 0
        };
      } else {
        // Si no hay información del mes en un compromiso concluido
        return { 
          estado: 'No Aplica', 
          color: 'secondary',
          montoPendiente: 0,
          montoPagado: 0,
          montoEsperado: 0,
          conBeca: false
        };
      }
    }
    
    // Si no hay información del mes, mostrar como pendiente (solo para compromisos activos)
    if (!pagoMes) {
      const cuotaMensual = estudiante.total_cuotas / 10;
      return { 
        estado: 'Pendiente', 
        color: 'danger',
        montoPendiente: cuotaMensual,
        montoPagado: 0,
        montoEsperado: cuotaMensual,
        conBeca: false
      };
    }

    const montoPagado = parseFloat(pagoMes.cuota) || 0;
    const montoEsperado = parseFloat(pagoMes.monto_con_descuento) || 0;
    const montoPendiente = Math.max(0, montoEsperado - montoPagado);

    // Usar el estado directamente de la nueva estructura
    switch (pagoMes.estado) {
      case 'pagado':
        return { 
          estado: 'Pagado', 
          color: 'success',
          montoPendiente: 0,
          montoPagado: montoPagado,
          montoEsperado: montoEsperado,
          conBeca: pagoMes.tiene_beca === 1,
          descuentoBeca: pagoMes.descuento_beca || 0
        };
        
      case 'parcial':
        return { 
          estado: 'Parcial', 
          color: 'warning',
          montoPendiente: montoPendiente,
          montoPagado: montoPagado,
          montoEsperado: montoEsperado,
          conBeca: pagoMes.tiene_beca === 1,
          descuentoBeca: pagoMes.descuento_beca || 0
        };
        
      case 'beca_completa':
        return { 
          estado: 'Beca Completa', 
          color: 'info',
          montoPendiente: 0,
          montoPagado: montoPagado,
          montoEsperado: montoEsperado,
          conBeca: true,
          descuentoBeca: 100
        };
        
      case 'pendiente':
      default:
        // Verificar si tiene beca pero aún no ha pagado
        if (pagoMes.tiene_beca === 1 && pagoMes.descuento_beca > 0) {
          return { 
            estado: 'Pendiente', 
            color: 'danger',
            montoPendiente: montoEsperado,
            montoPagado: 0,
            montoEsperado: montoEsperado,
            conBeca: true,
            descuentoBeca: pagoMes.descuento_beca || 0
          };
        } else {
          return { 
            estado: 'Pendiente', 
            color: 'danger',
            montoPendiente: montoEsperado,
            montoPagado: 0,
            montoEsperado: montoEsperado,
            conBeca: false,
            descuentoBeca: 0
          };
        }
    }
  };

  const estudiantesFiltrados = estudiantes.filter(estudiante => {
    const nombreCompleto = estudiante.nombre.toLowerCase();
    const ci = estudiante.ci_estudiante.toString();
    const busqueda = filtroBusqueda.toLowerCase();
    
    return nombreCompleto.includes(busqueda) || ci.includes(busqueda);
  });

  const mesesAMostrar = meses.slice(
    meses.indexOf(mesInicio),
    meses.indexOf(mesFin) + 1
  );

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-2">Cargando reporte de pagos...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center">
                <div className="alert alert-danger">
                  <h5>Error al cargar datos</h5>
                  <p>{error}</p>
                  <button className="btn btn-primary" onClick={cargarDatos}>
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row">
        <div className="col-12">
          <div className="page-title-box">
            <div className="row align-items-center">
              <div className="col-sm-6">
                <h4 className="page-title">Resumen de Pagos de Estudiantes</h4>
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to="/">Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item active">Reportes</li>
                </ol>
              </div>
              <div className="col-sm-6">
                <div className="float-end d-none d-md-block">
                  <div className="dropdown">
                    <button className="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                      <i className="fas fa-download me-1"></i> Exportar
                    </button>
                    <ul className="dropdown-menu">
                      <li><a className="dropdown-item" href="#"><i className="fas fa-file-excel me-2"></i>Excel</a></li>
                      <li><a className="dropdown-item" href="#"><i className="fas fa-file-pdf me-2"></i>PDF</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-filter me-2"></i>
                Filtros de Búsqueda
              </h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-2">
                  <label className="form-label">Mes Inicio</label>
                  <select 
                    className="form-select" 
                    value={mesInicio} 
                    onChange={(e) => setMesInicio(e.target.value)}
                  >
                    {meses.map(mes => (
                      <option key={mes} value={mes}>{mes}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Mes Fin</label>
                  <select 
                    className="form-select" 
                    value={mesFin} 
                    onChange={(e) => setMesFin(e.target.value)}
                  >
                    {meses.map(mes => (
                      <option key={mes} value={mes}>{mes}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Año</label>
                  <select 
                    className="form-select" 
                    value={filtroAnio} 
                    onChange={(e) => setFiltroAnio(e.target.value)}
                  >
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Estado Compromiso</label>
                  <select 
                    className="form-select" 
                    value={filtroEstadoCompromiso} 
                    onChange={(e) => setFiltroEstadoCompromiso(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="activo">Activos</option>
                    <option value="concluido">Concluidos</option>
                    <option value="cancelado">Cancelados</option>
                    <option value="retirado">Retirados</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Buscar estudiante</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre o CI..."
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <label className="form-label">&nbsp;</label>
                  <div className="d-flex gap-1">
                    <button className="btn btn-success btn-sm">
                      <i className="fas fa-file-excel me-1"></i>
                      Excel
                    </button>
                    <button className="btn btn-danger btn-sm">
                      <i className="fas fa-file-pdf me-1"></i>
                      PDF
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-users me-2"></i>
                Resumen de Pagos por Estudiante
              </h5>
              <span className="badge bg-primary fs-6">
                {estudiantesFiltrados.length} estudiantes
              </span>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-light">
                    <tr>
                      <th>
                        <i className="fas fa-user me-1"></i>
                        NOMBRE
                      </th>
                      <th>
                        <i className="fas fa-id-card me-1"></i>
                        CI
                      </th>
                      <th>
                        <i className="fas fa-graduation-cap me-1"></i>
                        NIVEL
                      </th>
                      <th>
                        <i className="fas fa-flag me-1"></i>
                        ESTADO
                      </th>
                      {mesesAMostrar.map(mes => (
                        <th key={mes}>
                          <i className="fas fa-calendar me-1"></i>
                          {mes.toUpperCase()}
                        </th>
                      ))}
                      <th>
                        <i className="fas fa-money-bill me-1"></i>
                        TOTAL PAGADO
                      </th>
                      <th>
                        <i className="fas fa-balance-scale me-1"></i>
                        SALDO PENDIENTE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={mesesAMostrar.length + 6} className="text-center">
                          <div className="alert alert-info mb-0">
                            No se encontraron estudiantes con los filtros aplicados
                          </div>
                        </td>
                      </tr>
                    ) : (
                      estudiantesFiltrados.map((estudiante, index) => (
                        <tr key={`${estudiante.id}-${estudiante.compromiso_id}`}>
                          <td>
                            <strong>{estudiante.nombre}</strong>
                          </td>
                          <td>{estudiante.ci_estudiante}</td>
                          <td>
                            <span className={`badge bg-${estudiante.nivel_nombre === 'Primario' ? 'primary' : 
                                                   estudiante.nivel_nombre === 'Kinder' ? 'info' : 
                                                   estudiante.nivel_nombre === 'Secundario' ? 'success' : 'warning'}`}>
                              {estudiante.nivel_nombre}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${
                              estudiante.estado_compromiso === 'activo' ? 'success' :
                              estudiante.estado_compromiso === 'concluido' ? 'primary' :
                              estudiante.estado_compromiso === 'cancelado' ? 'danger' :
                              estudiante.estado_compromiso === 'retirado' ? 'warning' : 'secondary'
                            }`}>
                              {estudiante.estado_compromiso === 'activo' ? 'Activo' :
                               estudiante.estado_compromiso === 'concluido' ? 'Concluido' :
                               estudiante.estado_compromiso === 'cancelado' ? 'Cancelado' :
                               estudiante.estado_compromiso === 'retirado' ? 'Retirado' : 
                               estudiante.estado_compromiso}
                            </span>
                          </td>
                                                     {mesesAMostrar.map(mes => {
                             const estadoPago = obtenerEstadoPago(estudiante, mes);
                             
                             return (
                                <td key={mes} className="text-center" style={{minWidth: '140px'}}>
                                  <div className="d-flex flex-column align-items-center">
                                    {/* Badge de estado */}
                                    <span className={`badge bg-${estadoPago.color} mb-2`} 
                                          style={{fontSize: '0.75rem', minWidth: '70px'}}>
                                      {estadoPago.estado}
                                    </span>
                                    
                                    {/* Información de beca */}
                                    {estadoPago.conBeca && estadoPago.descuentoBeca > 0 && (
                                      <div className="mb-2">
                                        <small className="text-info fw-bold" 
                                               title={`Descuento aplicado: ${estadoPago.descuentoBeca}%`}>
                                          <i className="fas fa-gift me-1"></i>
                                          {estadoPago.descuentoBeca}% desc.
                                        </small>
                                      </div>
                                    )}
                                    
                                    {/* Información de montos */}
                                    <div className="text-center w-100">
                                      {/* Monto esperado */}
                                      <div className="mb-1">
                                        <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>
                                          Esperado:
                                        </small>
                                        <span className="fw-bold text-dark" style={{fontSize: '0.8rem'}}>
                                          Bs {estadoPago.montoEsperado.toFixed(2)}
                                        </span>
                                      </div>
                                      
                                      {/* Para pagos parciales, mostrar ambos montos con colores específicos */}
                                      {estadoPago.estado === 'Parcial' ? (
                                        <>
                                          {/* Monto pagado en naranja */}
                                          <div className="mb-1">
                                            <small className="d-block" style={{fontSize: '0.7rem', color: '#fd7e14'}}>
                                              <i className="fas fa-coins me-1"></i>
                                              Pagado:
                                            </small>
                                            <span className="fw-bold" style={{fontSize: '0.8rem', color: '#fd7e14'}}>
                                              Bs {estadoPago.montoPagado.toFixed(2)}
                                            </span>
                                          </div>
                                          
                                          {/* Monto pendiente en rojo */}
                                          <div className="mb-1">
                                            <small className="text-danger d-block" style={{fontSize: '0.7rem'}}>
                                              <i className="fas fa-exclamation-triangle me-1"></i>
                                              Pendiente:
                                            </small>
                                            <span className="fw-bold text-danger" style={{fontSize: '0.8rem'}}>
                                              Bs {estadoPago.montoPendiente.toFixed(2)}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          {/* Monto pagado (si hay) para otros estados */}
                                          {estadoPago.montoPagado > 0 && (
                                            <div className="mb-1">
                                              <small className="text-success d-block" style={{fontSize: '0.7rem'}}>
                                                <i className="fas fa-check-circle me-1"></i>
                                                Pagado:
                                              </small>
                                              <span className="fw-bold text-success" style={{fontSize: '0.8rem'}}>
                                                Bs {estadoPago.montoPagado.toFixed(2)}
                                              </span>
                                            </div>
                                          )}
                                          
                                          {/* Monto pendiente (si hay) para otros estados */}
                                          {estadoPago.montoPendiente > 0 && (
                                            <div className="mb-1">
                                              <small className="text-danger d-block" style={{fontSize: '0.7rem'}}>
                                                <i className="fas fa-exclamation-triangle me-1"></i>
                                                Pendiente:
                                              </small>
                                              <span className="fw-bold text-danger" style={{fontSize: '0.8rem'}}>
                                                Bs {estadoPago.montoPendiente.toFixed(2)}
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      
                                      {/* Mensaje especial para pagos completos */}
                                      {estadoPago.estado === 'Pagado' && (
                                        <div className="mt-1">
                                          <small className="text-success">
                                            <i className="fas fa-check-double me-1"></i>
                                            Completo
                                          </small>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                           })}
                          <td className="text-end">
                            <strong className="text-success">
                              Bs {parseFloat(estudiante.total_pagado).toFixed(2)}
                            </strong>
                          </td>

                          <td className="text-end">
                            {(() => {
                              // Si el compromiso está concluido, el saldo pendiente debe ser 0
                              const saldoMostrar = estudiante.estado_compromiso === 'concluido' ? 0 : parseFloat(estudiante.saldo_pendiente);
                              return (
                                <strong className={`text-${saldoMostrar > 0 ? 'danger' : 'success'}`}>
                                  Bs {saldoMostrar.toFixed(2)}
                                </strong>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leyenda */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="card-title mb-0">
                <i className="fas fa-info-circle me-2"></i>
                Leyenda de Estados
              </h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-2">
                  <span className="badge bg-success me-2">Pagado</span>
                  <small>Pago completo del mes</small>
                </div>
                <div className="col-md-2">
                  <span className="badge bg-warning me-2">Parcial</span>
                  <small>Pago parcial del mes</small>
                </div>
                <div className="col-md-2">
                  <span className="badge bg-danger me-2">Pendiente</span>
                  <small>Sin pago del mes</small>
                </div>
                <div className="col-md-3">
                  <span className="badge bg-info me-2">Beca Completa</span>
                  <small>Beca cubre 100% del mes</small>
                </div>
                <div className="col-md-3">
                  <i className="fas fa-gift text-info me-2"></i>
                  <small><strong>% desc.</strong> - Descuento por beca aplicado</small>
                </div>
              </div>
              <div className="row mt-3">
                <div className="col-12">
                  <h6 className="mb-2">Información mostrada en cada mes:</h6>
                  <div className="row">
                    <div className="col-md-3">
                      <ul className="list-unstyled mb-0">
                        <li><i className="fas fa-bullseye text-dark me-2"></i><strong>Esperado:</strong> Monto que debe pagar</li>
                        <li><i className="fas fa-check-circle text-success me-2"></i><strong>Pagado:</strong> Monto ya pagado (completo)</li>
                      </ul>
                    </div>
                    <div className="col-md-3">
                      <ul className="list-unstyled mb-0">
                        <li><i className="fas fa-exclamation-triangle text-danger me-2"></i><strong>Pendiente:</strong> Monto que falta pagar</li>
                        <li><i className="fas fa-gift text-info me-2"></i><strong>Beca:</strong> Porcentaje de descuento</li>
                      </ul>
                    </div>
                    <div className="col-md-3">
                      <ul className="list-unstyled mb-0">
                        <li><i className="fas fa-coins me-2" style={{color: '#fd7e14'}}></i><strong style={{color: '#fd7e14'}}>Pagado (Parcial):</strong> En naranja</li>
                        <li><i className="fas fa-exclamation-triangle text-danger me-2"></i><strong>Pendiente (Parcial):</strong> En rojo</li>
                      </ul>
                    </div>
                    <div className="col-md-3">
                        <div className="alert alert-info py-2 mb-0">
                          <small>
                            <i className="fas fa-info-circle me-2"></i>
                            <strong>Ejemplo:</strong> Si un mes tiene beca del 40%, el monto esperado será 120 Bs en lugar de 200 Bs.
                            Si se paga parcialmente 100 Bs, se mostrará:
                            <br />
                            <span style={{color: '#fd7e14'}}><strong>Pagado: 100 Bs</strong></span> (naranja)
                            <br />
                            <span className="text-danger"><strong>Pendiente: 20 Bs</strong></span> (rojo)
                          </small>
                        </div>
                      </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reportes;