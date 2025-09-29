import React, { useState } from 'react';

const InformacionEstudianteModal = ({ 
  show, 
  onHide, 
  form, 
  compromiso, 
  becas, 
  saldoCuotas, 
  saldoTotal, 
  pagos,
  pagosMensuales = [],
  filtroTipo,
  setFiltroTipo,
  filtroMes,
  setFiltroMes,
  filtroAnio,
  setFiltroAnio,
  pagosFiltrados,
  handleSubirComprobante,
  handleDescargarComprobante,
  handleEliminarComprobante,
  formatearFecha,
  formatearMonto
}) => {
  const [activeTab, setActiveTab] = useState('datos');

  const getBecaEstudiante = (id_beca) => {
    if (!id_beca) return null;
    return becas.find(b => String(b.id) === String(id_beca));
  };

  if (!show) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="fas fa-info-circle me-2"></i>
              Información Completa del Estudiante
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onHide}></button>
          </div>
          
          <div className="modal-body">
            {/* Navegación por pestañas */}
            <ul className="nav nav-tabs mb-3" id="informacionTabs" role="tablist">
              <li className="nav-item" role="presentation">
                <button 
                  className={`nav-link ${activeTab === 'datos' ? 'active' : ''}`}
                  onClick={() => setActiveTab('datos')}
                  type="button"
                >
                  <i className="fas fa-user me-2"></i>
                  Datos del Estudiante
                </button>
              </li>
              {compromiso && (
                <>
                  <li className="nav-item" role="presentation">
                    <button 
                      className={`nav-link ${activeTab === 'compromiso' ? 'active' : ''}`}
                      onClick={() => setActiveTab('compromiso')}
                      type="button"
                    >
                      <i className="fas fa-file-contract me-2"></i>
                      Compromiso Económico
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button 
                      className={`nav-link ${activeTab === 'saldos' ? 'active' : ''}`}
                      onClick={() => setActiveTab('saldos')}
                      type="button"
                    >
                      <i className="fas fa-money-bill-wave me-2"></i>
                      Saldos Pendientes
                    </button>
                  </li>
                  <li className="nav-item" role="presentation">
                    <button 
                      className={`nav-link ${activeTab === 'historial' ? 'active' : ''}`}
                      onClick={() => setActiveTab('historial')}
                      type="button"
                    >
                      <i className="fas fa-history me-2"></i>
                      Historial de Pagos
                    </button>
                  </li>
                </>
              )}
            </ul>

            {/* Contenido de las pestañas */}
            <div className="tab-content">
              {/* Pestaña Datos del Estudiante */}
              {activeTab === 'datos' && (
                <div className="tab-pane fade show active">
                  <div className="card">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">Datos del Estudiante</h6>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Nombre</label>
                          <input type="text" className="form-control" value={form.nombre} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Fecha de nacimiento</label>
                          <input type="text" className="form-control" value={form.fecha_nacimiento} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Mamá</label>
                          <input type="text" className="form-control" value={form.mama} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Papá</label>
                          <input type="text" className="form-control" value={form.papa} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Celular Mamá</label>
                          <input type="text" className="form-control" value={form.celular_mama} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Celular Papá</label>
                          <input type="text" className="form-control" value={form.celular_papa} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Nivel</label>
                          <input type="text" className="form-control" value={form.nivel} readOnly />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">Turno</label>
                          <input type="text" className="form-control" value={form.turno_tarde ? 'Tarde' : 'Mañana'} readOnly />
                        </div>
                      </div>
                    </div>
                  </div>


                </div>
              )}

              {/* Pestaña Compromiso Económico */}
              {activeTab === 'compromiso' && compromiso && (
                <div className="tab-pane fade show active">
                  <div className="card">
                    <div className="card-header bg-success text-white">
                      <h6 className="mb-0">Compromiso Económico Registrado</h6>
                    </div>
                    <div className="card-body">
                      <div className="row g-3 align-items-center">
                        <div className="col-md-4">
                          <strong>Estado del compromiso:</strong> 
                          <span className={`badge ms-2 ${
                            compromiso.estado_compromiso === 'concluido' ? 'bg-success' :
                            compromiso.estado_compromiso === 'activo' ? 'bg-primary' :
                            compromiso.estado_compromiso === 'cancelado' ? 'bg-warning' :
                            compromiso.estado_compromiso === 'retirado' ? 'bg-danger' : 'bg-secondary'
                          }`} style={{ fontSize: '0.9em' }}>
                            {compromiso.estado_compromiso === 'concluido' ? 'CONCLUIDO' :
                             compromiso.estado_compromiso === 'activo' ? 'ACTIVO' :
                             compromiso.estado_compromiso === 'cancelado' ? 'CANCELADO' :
                             compromiso.estado_compromiso === 'retirado' ? 'RETIRADO' : 'SIN ESTADO'}
                          </span>
                        </div>
                        <div className="col-md-4">
                          <strong>Beca:</strong> {compromiso.id_beca ? getBecaEstudiante(compromiso.id_beca)?.descripcion : 'Sin beca'}
                        </div>
                        <div className="col-md-4">
                          <strong>Fecha:</strong> {formatearFecha(compromiso.fecha)}
                        </div>
                        <div className="col-md-4">
                          <strong>Total cuotas:</strong> Bs {formatearMonto(compromiso.total_cuotas)}
                        </div>
                        {compromiso.detalle && (
                          <div className="col-12">
                            <strong>Detalle:</strong> {compromiso.detalle}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Sección de Cálculo Previo del Compromiso Económico */}
                  <div className="card mt-3">
                    <div className="card-header bg-primary text-white">
                      <h6 className="mb-0">
                        <i className="fas fa-calculator me-2"></i>
                        Cálculo Previo del Compromiso Económico
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row">
                        {/* Información del Nivel */}
                        <div className="col-md-6">
                          <div className="card h-100">
                            <div className="card-header bg-light">
                              <h6 className="mb-0 text-primary">Información del Nivel</h6>
                            </div>
                            <div className="card-body">
                               {(() => {
                                 // Usar datos de pagosMensuales si están disponibles
                                 if (pagosMensuales && pagosMensuales.length > 0) {
                                   const primerPago = pagosMensuales[0];
                                   const montoBase = parseFloat(primerPago.monto_base) || 0;
                                   const totalMeses = pagosMensuales.length;
                                   const precioNivel = montoBase * totalMeses;
                                   
                                   return (
                                     <>
                                       <p className="mb-2"><strong>Precio del nivel:</strong> Bs {precioNivel.toFixed(2)}</p>
                                       <p className="mb-2"><strong>Cuota mensual base:</strong> Bs {montoBase.toFixed(2)}</p>
                                     </>
                                   );
                                 } else {
                                   // Fallback a cálculo manual si no hay datos de pagosMensuales
                                   const precioNivel = ((parseFloat(compromiso.total_cuotas) || 0) / (1 - (parseFloat(compromiso.descuento_aplicado) || 0)));
                                   const cuotaMensual = precioNivel / (parseInt(compromiso.cuotas) || 10);
                                   
                                   return (
                                     <>
                                       <p className="mb-2"><strong>Precio del nivel:</strong> Bs {precioNivel.toFixed(2)}</p>
                                       <p className="mb-2"><strong>Cuota mensual base:</strong> Bs {cuotaMensual.toFixed(2)}</p>
                                     </>
                                   );
                                 }
                               })()}
                             </div>
                          </div>
                        </div>

                        {/* Desglose de Cuotas */}
                        <div className="col-md-6">
                          <div className="card h-100">
                            <div className="card-header bg-light">
                              <h6 className="mb-0 text-success">Desglose de Cuotas</h6>
                            </div>
                            <div className="card-body">
                               {(() => {
                                 // Usar datos de pagosMensuales si están disponibles
                                 if (pagosMensuales && pagosMensuales.length > 0) {
                                   const mesesConDescuento = pagosMensuales.filter(pago => pago.tiene_beca === 1).length;
                                   const mesesSinDescuento = pagosMensuales.filter(pago => pago.tiene_beca === 0).length;
                                   const subtotalConDescuento = pagosMensuales
                                     .filter(pago => pago.tiene_beca === 1)
                                     .reduce((sum, pago) => sum + (parseFloat(pago.monto_esperado) || 0), 0);
                                   const subtotalSinDescuento = pagosMensuales
                                     .filter(pago => pago.tiene_beca === 0)
                                     .reduce((sum, pago) => sum + (parseFloat(pago.monto_esperado) || 0), 0);
                                   
                                   return (
                                     <>
                                       <p className="mb-1"><strong>Meses con descuento:</strong> {mesesConDescuento} meses</p>
                                       <div className="bg-success text-white p-2 rounded mb-2">
                                         <strong>Subtotal con descuento:</strong> Bs {subtotalConDescuento.toFixed(2)}
                                       </div>
                                       <p className="mb-1"><strong>Meses sin descuento:</strong> {mesesSinDescuento} meses</p>
                                       <div className="bg-secondary text-white p-2 rounded">
                                         <strong>Subtotal sin descuento:</strong> Bs {subtotalSinDescuento.toFixed(2)}
                                       </div>
                                     </>
                                   );
                                 } else {
                                   // Fallback a cálculo manual
                                   const mesesBeca = compromiso.meses_beca ? compromiso.meses_beca.split(',').map(m => m.trim()) : [];
                                   const mesesConDescuento = mesesBeca.length;
                                   const mesesSinDescuento = (parseInt(compromiso.cuotas) || 10) - mesesConDescuento;
                                   return (
                                     <>
                                       <p className="mb-1"><strong>Meses con descuento:</strong> {mesesConDescuento} meses</p>
                                       <div className="bg-success text-white p-2 rounded mb-2">
                                         <strong>Subtotal con descuento:</strong> Bs {(parseFloat(compromiso.total_cuotas) || 0).toFixed(2)}
                                       </div>
                                       <p className="mb-1"><strong>Meses sin descuento:</strong> {mesesSinDescuento} meses</p>
                                       <div className="bg-secondary text-white p-2 rounded">
                                         <strong>Subtotal sin descuento:</strong> Bs 0.00
                                       </div>
                                     </>
                                   );
                                 }
                               })()}
                             </div>
                          </div>
                        </div>
                      </div>

                      {/* Información del Nivel con Descuento */}
                       {parseFloat(compromiso.descuento_aplicado) > 0 && (
                         <div className="row mt-3">
                           <div className="col-12">
                             <div className="card">
                               <div className="card-header bg-success text-white">
                                 <h6 className="mb-0">
                                   <i className="fas fa-percentage me-2"></i>
                                   Información del Nivel con Descuento
                                 </h6>
                               </div>
                               <div className="card-body">
                                 {(() => {
                                   // Usar datos de pagosMensuales si están disponibles
                                   if (pagosMensuales && pagosMensuales.length > 0) {
                                     const pagosConDescuento = pagosMensuales.filter(pago => pago.tiene_beca === 1);
                                     const porcentajeDescuento = pagosConDescuento.length > 0 ? pagosConDescuento[0].porcentaje_beca : 0;
                                     const totalConDescuento = pagosMensuales.reduce((sum, pago) => sum + (parseFloat(pago.monto_esperado) || 0), 0);
                                     const promedioMensualConDescuento = totalConDescuento / pagosMensuales.length;
                                     const mesesConDescuentoTexto = pagosConDescuento.map(pago => pago.nombre_mes).join(', ');
                                     
                                     return (
                                       <>
                                         <p className="mb-2"><strong>Descuento aplicado:</strong> {porcentajeDescuento}%</p>
                                         <div className="row">
                                           <div className="col-md-6">
                                             <p className="mb-1"><strong>Precio del nivel con descuento:</strong> Bs {totalConDescuento.toFixed(2)}</p>
                                             <p className="mb-0"><strong>Cuota mensual con descuento:</strong> Bs {promedioMensualConDescuento.toFixed(2)}</p>
                                           </div>
                                           <div className="col-md-6">
                                             <p className="mb-1"><strong>Meses con descuento ({porcentajeDescuento}%):</strong></p>
                                             <p className="mb-0 text-success">{mesesConDescuentoTexto || 'No hay meses con descuento'}</p>
                                             <p className="mb-0"><strong>Precio por mes:</strong> Bs {promedioMensualConDescuento.toFixed(2)}</p>
                                           </div>
                                         </div>
                                       </>
                                     );
                                   } else {
                                     // Fallback a cálculo manual
                                     const mesesBeca = compromiso.meses_beca ? compromiso.meses_beca.split(',').map(m => m.trim()) : [];
                                     return (
                                       <>
                                         <p className="mb-2"><strong>Descuento aplicado:</strong> {((parseFloat(compromiso.descuento_aplicado) || 0) * 100).toFixed(1)}%</p>
                                         <div className="row">
                                           <div className="col-md-6">
                                             <p className="mb-1"><strong>Precio del nivel con descuento:</strong> Bs {(parseFloat(compromiso.total_cuotas) || 0).toFixed(2)}</p>
                                             <p className="mb-0"><strong>Cuota mensual con descuento:</strong> Bs {((parseFloat(compromiso.total_cuotas) || 0) / (parseInt(compromiso.cuotas) || 10)).toFixed(2)}</p>
                                           </div>
                                           <div className="col-md-6">
                                             <p className="mb-1"><strong>Meses con descuento ({((parseFloat(compromiso.descuento_aplicado) || 0) * 100).toFixed(0)}%):</strong></p>
                                             <p className="mb-0 text-success">{mesesBeca.join(', ')}</p>
                                             <p className="mb-0"><strong>Precio por mes:</strong> Bs {((parseFloat(compromiso.total_cuotas) || 0) / mesesBeca.length).toFixed(2)}</p>
                                           </div>
                                         </div>
                                       </>
                                     );
                                   }
                                 })()}
                               </div>
                             </div>
                           </div>
                         </div>
                       )}

                      {/* Detalle por Mes */}
                      <div className="row mt-3">
                        <div className="col-12">
                          <div className="card">
                            <div className="card-header bg-info text-white">
                              <h6 className="mb-0">Detalle por Mes</h6>
                            </div>
                            <div className="card-body">
                               {(() => {
                                 // Usar datos de pagosMensuales si están disponibles
                                 if (pagosMensuales && pagosMensuales.length > 0) {
                                   const mesesConDescuento = pagosMensuales.filter(pago => pago.tiene_beca === 1);
                                   const mesesSinDescuento = pagosMensuales.filter(pago => pago.tiene_beca === 0);
                                   const subtotalConDescuento = mesesConDescuento.reduce((sum, pago) => sum + (parseFloat(pago.monto_esperado) || 0), 0);
                                   const subtotalSinDescuento = mesesSinDescuento.reduce((sum, pago) => sum + (parseFloat(pago.monto_esperado) || 0), 0);
                                   
                                   return (
                                     <div className="row">
                                       <div className="col-md-6">
                                         <div className="border-start border-success border-4 ps-3">
                                           <h6 className="text-success">Meses con descuento ({mesesConDescuento.length}):</h6>
                                           {mesesConDescuento.map((pago, index) => (
                                             <p key={index} className="mb-1">
                                               <strong>{pago.nombre_mes}:</strong> Bs {(parseFloat(pago.monto_esperado) || 0).toFixed(2)}
                                             </p>
                                           ))}
                                           {mesesConDescuento.length > 0 && (
                                             <>
                                               <p className="mb-1"><strong>Precio por mes:</strong> Bs {(subtotalConDescuento / mesesConDescuento.length).toFixed(2)}</p>
                                               <p className="mb-0"><strong>Subtotal:</strong> Bs {subtotalConDescuento.toFixed(2)}</p>
                                             </>
                                           )}
                                         </div>
                                       </div>
                                       <div className="col-md-6">
                                         <div className="border-start border-secondary border-4 ps-3">
                                           <h6 className="text-secondary">Meses sin descuento ({mesesSinDescuento.length}):</h6>
                                           {mesesSinDescuento.map((pago, index) => (
                                             <p key={index} className="mb-1">
                                               <strong>{pago.nombre_mes}:</strong> Bs {(parseFloat(pago.monto_esperado) || 0).toFixed(2)}
                                             </p>
                                           ))}
                                           {mesesSinDescuento.length > 0 && (
                                             <>
                                               <p className="mb-1"><strong>Precio por mes:</strong> Bs {(subtotalSinDescuento / mesesSinDescuento.length).toFixed(2)}</p>
                                               <p className="mb-0"><strong>Subtotal:</strong> Bs {subtotalSinDescuento.toFixed(2)}</p>
                                             </>
                                           )}
                                         </div>
                                       </div>
                                     </div>
                                   );
                                 } else {
                                   // Fallback a cálculo manual
                                   const mesesBeca = compromiso.meses_beca ? compromiso.meses_beca.split(',').map(m => m.trim()) : [];
                                   const mesesConDescuento = mesesBeca.length;
                                   const mesesSinDescuento = (parseInt(compromiso.cuotas) || 10) - mesesConDescuento;
                                   const cuotaMensual = (parseFloat(compromiso.total_cuotas) || 0) / mesesConDescuento;
                                   
                                   return (
                                     <div className="row">
                                       <div className="col-md-6">
                                         <div className="border-start border-success border-4 ps-3">
                                           <h6 className="text-success">Meses con descuento ({mesesConDescuento}):</h6>
                                           <p className="mb-1">{mesesBeca.join(', ')}</p>
                                           <p className="mb-1"><strong>Precio por mes:</strong> Bs {cuotaMensual.toFixed(2)}</p>
                                           <p className="mb-0"><strong>Subtotal:</strong> Bs {(parseFloat(compromiso.total_cuotas) || 0).toFixed(2)}</p>
                                         </div>
                                       </div>
                                       <div className="col-md-6">
                                         <div className="border-start border-secondary border-4 ps-3">
                                           <h6 className="text-secondary">Meses sin descuento ({mesesSinDescuento}):</h6>
                                           <p className="mb-1">Precio por mes: Bs 750.00</p>
                                           <p className="mb-0"><strong>Subtotal:</strong> Bs 0.00</p>
                                         </div>
                                       </div>
                                     </div>
                                   );
                                 }
                               })()}
                              
                              {/* Totales */}
                               <div className="row mt-3">
                                 <div className="col-12">
                                   <div className="bg-light p-3 rounded">
                                     <div className="row text-center">
                                       <div className="col-md-4">
                                         <div className="bg-primary text-white p-2 rounded">
                                           <strong>Total cuotas:</strong><br/>
                                           Bs {(() => {
                                             if (pagosMensuales && pagosMensuales.length > 0) {
                                               return pagosMensuales.reduce((sum, pago) => sum + (parseFloat(pago.monto_esperado) || 0), 0).toFixed(2);
                                             }
                                             return (parseFloat(compromiso.total_cuotas) || 0).toFixed(2);
                                           })()}
                                         </div>
                                       </div>
                                       <div className="col-md-6">
                                         <div className="bg-success text-white p-2 rounded">
                                           <strong>Total general:</strong><br/>
                                           Bs {(() => {
                                             if (pagosMensuales && pagosMensuales.length > 0) {
                                               const totalCuotas = pagosMensuales.reduce((sum, pago) => sum + (parseFloat(pago.monto_esperado) || 0), 0);
                                               return totalCuotas.toFixed(2);
                                             }
                                             return (parseFloat(compromiso.total_cuotas) || 0).toFixed(2);
                                           })()}
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
                    </div>
                  </div>
                </div>
              )}

              {/* Pestaña Saldos Pendientes */}
              {activeTab === 'saldos' && compromiso && (
                <div className="tab-pane fade show active">
                  <div className="card">
                    <div className="card-header bg-warning text-dark">
                      <h6 className="mb-0">Saldos Pendientes</h6>
                    </div>
                    <div className="card-body p-0">
                      <table className="table table-bordered mb-0 text-center" style={{ background: "#f8f9fa", fontSize: "1.1em" }}>
                        <thead className="table-light">
                          <tr>
                            <th className="text-center fw-bold">Saldo pendiente de cuotas</th>
                            <th className="text-center fw-bold">Saldo total pendiente</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="fw-bold text-primary">Bs {formatearMonto(saldoCuotas)}</td>
                            <td className="fw-bold text-danger">Bs {formatearMonto(saldoTotal)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Pestaña Historial de Pagos */}
              {activeTab === 'historial' && compromiso && (
                <div className="tab-pane fade show active">
                  <div className="card">
                    <div className="card-header bg-info text-white">
                      <h6 className="mb-0">Historial de Pagos</h6>
                    </div>
                    <div className="card-body">
                      {/* Filtros */}
                      <div className="row mb-3">
                        <div className="col-md-3">
                          <select className="form-select" value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)}>
                            <option value="">Todos los tipos</option>
                            <option value="cuota">Cuota mensual</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <select className="form-select" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}>
                            <option value="">Todos los meses</option>
                            <option value="1">Enero</option>
                            <option value="2">Febrero</option>
                            <option value="3">Marzo</option>
                            <option value="4">Abril</option>
                            <option value="5">Mayo</option>
                            <option value="6">Junio</option>
                            <option value="7">Julio</option>
                            <option value="8">Agosto</option>
                            <option value="9">Septiembre</option>
                            <option value="10">Octubre</option>
                            <option value="11">Noviembre</option>
                            <option value="12">Diciembre</option>
                          </select>
                        </div>
                        <div className="col-md-3">
                          <select className="form-select" value={filtroAnio} onChange={e => setFiltroAnio(e.target.value)}>
                            <option value="">Todos los años</option>
                            <option value="2024">2024</option>
                            <option value="2025">2025</option>
                            <option value="2026">2026</option>
                          </select>
                        </div>
                      </div>

                      {/* Tabla de pagos */}
                      <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                        <table className="table table-striped table-hover">
                          <thead className="table-dark sticky-top">
                            <tr>
                              <th>Fecha</th>
                              <th>Tipo</th>
                              <th>Mes</th>
                              <th>Año</th>
                              <th>Monto</th>
                              <th>Observación</th>
                              <th>Comprobante</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagosFiltrados.length > 0 ? (
                              pagosFiltrados.map((pago, index) => (
                                <tr key={index}>
                                  <td>{formatearFecha(pago.fecha_pago)}</td>
                                  <td>
                                    <span className="badge bg-primary">
                                      Cuota mensual
                                    </span>
                                  </td>
                                  <td>{pago.mes_pagado}</td>
                                  <td>{pago.anio_pagado}</td>
                                  <td className="fw-bold">Bs {formatearMonto(pago.monto)}</td>
                                  <td>{pago.observacion || '-'}</td>
                                  <td>
                                    {pago.comprobante_url ? (
                                      <div className="btn-group btn-group-sm">
                                        <button 
                                          className="btn btn-outline-primary btn-sm"
                                          onClick={() => handleDescargarComprobante(pago.comprobante_url)}
                                          title="Descargar comprobante"
                                        >
                                          <i className="fas fa-download"></i>
                                        </button>
                                        <button 
                                          className="btn btn-outline-danger btn-sm"
                                          onClick={() => handleEliminarComprobante(pago.id)}
                                          title="Eliminar comprobante"
                                        >
                                          <i className="fas fa-trash"></i>
                                        </button>
                                      </div>
                                    ) : (
                                      <button 
                                        className="btn btn-outline-success btn-sm"
                                        onClick={() => handleSubirComprobante(pago)}
                                        title="Subir comprobante"
                                      >
                                        <i className="fas fa-upload"></i>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan="7" className="text-center text-muted">
                                  No se encontraron pagos con los filtros aplicados
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onHide}>
              <i className="fas fa-times me-2"></i>
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InformacionEstudianteModal;