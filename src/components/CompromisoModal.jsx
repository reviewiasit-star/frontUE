import React from 'react';
import NotificationModal from './NotificationModal';
import { useNotification } from '../hooks/useNotification';
import { getApiUrl } from '../config/apiConfig';
import AuthService from '../services/authService';

function CompromisoModal({ isOpen, onClose, form, becas, inscripcion }) {
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Obtener los meses de beca de la inscripción
  const mesesBecaInscripcion = inscripcion?.meses_beca ? inscripcion.meses_beca.split(',').map(m => m.trim()) : [];
  
  const mesesDisponibles = [
    'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre'
  ];
  
  if (!isOpen) return null;

  // Utilidad para obtener la beca seleccionada
  const getBecaEstudiante = (id_beca) => {
    if (!id_beca) return null;
    return becas.find(b => String(b.id) === String(id_beca));
  };

  // Función para calcular el resumen detallado del compromiso
  const calcularResumenDetallado = () => {
    if (!form.costo_mensual || !inscripcion) return null;

    const costoTotal = Number(form.costo_mensual);
    const cuotaMensualBase = costoTotal / 10;
    const beca = getBecaEstudiante(form.id_beca);
    const descuentoPorc = beca ? Number(beca.descuento) : 0;

    // Usar los meses con beca de la inscripción
    const mesesConBeca = mesesBecaInscripcion;
    const mesesSinBeca = 10 - mesesConBeca.length;
    const cuotaConDescuento = cuotaMensualBase * (1 - descuentoPorc / 100);
    
    const totalMesesSinBeca = mesesSinBeca * cuotaMensualBase;
    const totalMesesConBeca = mesesConBeca.length * cuotaConDescuento;
    const totalConDescuento = totalMesesSinBeca + totalMesesConBeca;
    const totalGeneral = totalConDescuento;
    const descuentoTotal = (mesesConBeca.length * cuotaMensualBase * descuentoPorc / 100);

    return {
      costoTotal,
      cuotaMensualBase,
      descuentoPorc,
      mesesConBeca,
      mesesSinBeca,
      cuotaConDescuento,
      totalMesesSinBeca,
      totalMesesConBeca,
      totalConDescuento,
      totalGeneral,
      descuentoTotal
    };
  };

  // Función para registrar el compromiso económico
  const registrarCompromiso = async () => {
    if (!inscripcion) {
      showError('No hay inscripción seleccionada');
      return;
    }

    const resumen = calcularResumenDetallado();
    if (!resumen) {
      showError('Error al calcular el compromiso');
      return;
    }
    
    const datosCompromiso = {
      id_estudiante: form.id,
      inscripcion_id: inscripcion.id,
      id_beca: form.id_beca || null,
      meses_beca: mesesBecaInscripcion.join(','),
      total_cuotas: resumen.totalConDescuento,
      total_general: resumen.totalGeneral,
      cuotas: 10,
      descuento_aplicado: resumen.descuentoPorc / 100, // Convertir a decimal
      observacion: ''
    };
    
    try {
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/compromiso-economico', user?.rol);
      const res = await fetch(`${apiUrl}/compromiso-economico`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(datosCompromiso)
      });
      
      const data = await res.json();
      
      if (data.ok) {
        showSuccess(data.message || 'Compromiso registrado correctamente');
        onClose();
      } else {
        showError(`Error: ${data.message || 'Error al registrar el compromiso'}`);
      }
    } catch (error) {
      console.error('Error de conexión:', error);
      showError('Error de conexión al registrar el compromiso');
    }
  };

  const resumen = calcularResumenDetallado();

  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Registrar Compromiso Económico</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            <form>
              <div className="card mb-3">
                <div className="card-header bg-primary text-white">Datos del Estudiante</div>
                <div className="card-body row g-3">
                  {inscripcion && (
                    <div className="col-12 mb-3">
                      <div className="alert alert-info">
                        <strong>Inscripción seleccionada:</strong> {inscripcion.nivel_nombre} - {inscripcion.curso_nombre} - {inscripcion.bloque_nombre}
                      </div>
                    </div>
                  )}
                  <div className="col-md-6">
                    <label className="form-label">Nombre</label>
                    <input type="text" className="form-control" value={form.nombre} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Fecha de nacimiento</label>
                    <input type="text" className="form-control" value={form.fecha_nacimiento} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Mamá</label>
                    <input type="text" className="form-control" value={form.mama} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Papá</label>
                    <input type="text" className="form-control" value={form.papa} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Celular mamá</label>
                    <input type="text" className="form-control" value={form.celular_mama} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Celular papá</label>
                    <input type="text" className="form-control" value={form.celular_papa} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Nivel</label>
                    <input type="text" className="form-control" value={form.nivel} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Precio del nivel</label>
                    <input type="text" className="form-control" value={form.costo_mensual} readOnly />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Turno</label>
                    <input type="text" className="form-control" value={form.turno_tarde ? 'Tarde' : 'Mañana'} readOnly />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Beca</label>
                    <input type="text" className="form-control" value={getBecaEstudiante(form.id_beca)?.descripcion || 'Sin beca'} readOnly />
                  </div>
                </div>
              </div>

              {/* Visualización de meses con estado bloqueado */}
              <div className="card mb-3">
                <div className="card-header bg-info text-white">
                  <h6 className="mb-0">Distribución de Meses - Estado Final</h6>
                </div>
                <div className="card-body">
                  <div className="row">
                    {/* Primera fila: Febrero, Marzo, Abril */}
                    <div className="col-12 mb-3">
                      <div className="row justify-content-center">
                        {['febrero', 'marzo', 'abril'].map(mes => {
                          const tieneBeca = mesesBecaInscripcion.includes(mes);
                          const monto = resumen ? (tieneBeca ? resumen.cuotaConDescuento : resumen.cuotaMensualBase) : 0;
                          return (
                            <div key={mes} className="col-4">
                              <div 
                                className={`border rounded p-1 text-center ${tieneBeca ? 'bg-success text-white' : 'bg-light'}`}
                                style={{ minHeight: '60px', cursor: 'not-allowed' }}
                              >
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                  {mes.charAt(0).toUpperCase() + mes.slice(1)}
                                </div>
                                {tieneBeca && (
                                  <span className="badge bg-warning text-dark mb-1" style={{ fontSize: '0.7rem' }}>
                                    Beca
                                  </span>
                                )}
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                  Bs {monto.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Segunda fila: Mayo, Junio, Julio */}
                    <div className="col-12 mb-3">
                      <div className="row justify-content-center">
                        {['mayo', 'junio', 'julio'].map(mes => {
                          const tieneBeca = mesesBecaInscripcion.includes(mes);
                          const monto = resumen ? (tieneBeca ? resumen.cuotaConDescuento : resumen.cuotaMensualBase) : 0;
                          return (
                            <div key={mes} className="col-4">
                              <div 
                                className={`border rounded p-1 text-center ${tieneBeca ? 'bg-success text-white' : 'bg-light'}`}
                                style={{ minHeight: '60px', cursor: 'not-allowed' }}
                              >
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                  {mes.charAt(0).toUpperCase() + mes.slice(1)}
                                </div>
                                {tieneBeca && (
                                  <span className="badge bg-warning text-dark mb-1" style={{ fontSize: '0.7rem' }}>
                                    Beca
                                  </span>
                                )}
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                  Bs {monto.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tercera fila: Agosto, Septiembre, Octubre */}
                    <div className="col-12 mb-3">
                      <div className="row justify-content-center">
                        {['agosto', 'septiembre', 'octubre'].map(mes => {
                          const tieneBeca = mesesBecaInscripcion.includes(mes);
                          const monto = resumen ? (tieneBeca ? resumen.cuotaConDescuento : resumen.cuotaMensualBase) : 0;
                          return (
                            <div key={mes} className="col-4">
                              <div 
                                className={`border rounded p-1 text-center ${tieneBeca ? 'bg-success text-white' : 'bg-light'}`}
                                style={{ minHeight: '60px', cursor: 'not-allowed' }}
                              >
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                  {mes.charAt(0).toUpperCase() + mes.slice(1)}
                                </div>
                                {tieneBeca && (
                                  <span className="badge bg-warning text-dark mb-1" style={{ fontSize: '0.7rem' }}>
                                    Beca
                                  </span>
                                )}
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                  Bs {monto.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Cuarta fila: Noviembre */}
                    <div className="col-12">
                      <div className="row justify-content-center">
                        {['noviembre'].map(mes => {
                          const tieneBeca = mesesBecaInscripcion.includes(mes);
                          const monto = resumen ? (tieneBeca ? resumen.cuotaConDescuento : resumen.cuotaMensualBase) : 0;
                          return (
                            <div key={mes} className="col-4">
                              <div 
                                className={`border rounded p-1 text-center ${tieneBeca ? 'bg-success text-white' : 'bg-light'}`}
                                style={{ minHeight: '60px', cursor: 'not-allowed' }}
                              >
                                <div style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>
                                  {mes.charAt(0).toUpperCase() + mes.slice(1)}
                                </div>
                                {tieneBeca && (
                                  <span className="badge bg-warning text-dark mb-1" style={{ fontSize: '0.7rem' }}>
                                    Beca
                                  </span>
                                )}
                                <div style={{ fontSize: '0.8rem', fontWeight: 'bold' }}>
                                  Bs {monto.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="row">
                      <div className="col-md-6">
                        <small className="text-muted">
                          <i className="fas fa-square text-success me-1"></i>
                          Meses con beca ({resumen?.descuentoPorc || 0}% descuento)
                        </small>
                      </div>
                      <div className="col-md-6">
                        <small className="text-muted">
                          <i className="fas fa-square text-secondary me-1"></i>
                          Meses sin beca (precio completo)
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen final del compromiso */}
              {resumen && (
                <div className="card mb-3 shadow-sm">
                  <div className="card-header bg-warning text-dark">
                    <h6 className="mb-0">Resumen Final del Compromiso</h6>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-12 col-md-6">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="text-primary">Información de la beca</h6>
                            <p className="mb-1"><strong>Descuento:</strong> {resumen.descuentoPorc}%</p>
                            <p className="mb-1"><strong>Meses con beca:</strong> {resumen.mesesConBeca.length > 0 ? resumen.mesesConBeca.join(', ') : 'Ninguno'}</p>
                            <p className="mb-0"><strong>Meses sin beca:</strong> {resumen.mesesSinBeca}</p>
                          </div>
                        </div>
                      </div>
                      <div className="col-12 col-md-6 mt-3 mt-md-0">
                        <div className="card h-100">
                          <div className="card-body">
                            <h6 className="text-primary">Cálculo de cuotas</h6>
                            <p className="mb-1"><strong>Cuota mensual base:</strong> Bs {resumen.cuotaMensualBase.toFixed(2)}</p>
                            <p className="mb-1"><strong>Cuota con descuento:</strong> Bs {resumen.cuotaConDescuento.toFixed(2)}</p>
                            <p className="mb-0"><strong>Descuento total:</strong> Bs {resumen.descuentoTotal.toFixed(2)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="card">
                        <div className="card-header bg-success text-white">
                          <h6 className="mb-0">Resumen General</h6>
                        </div>
                        <div className="card-body">
                          <div className="row text-center">
                            <div className="col-6 col-md-6">
                              <small className="text-muted d-block">Total cuotas</small>
                              <span className="h6">Bs {resumen.costoTotal.toFixed(2)}</span>
                            </div>
                            <div className="col-6 col-md-6">
                              <small className="text-muted d-block">Total general</small>
                              <span className="h6 text-success">Bs {resumen.totalConDescuento.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="alert alert-info mb-0 mt-3">
                      <h6 className="alert-heading">Desglose detallado:</h6>
                      <p className="mb-1">• {resumen.mesesSinBeca} meses sin beca: {resumen.mesesSinBeca} × Bs {resumen.cuotaMensualBase.toFixed(2)} = Bs {resumen.totalMesesSinBeca.toFixed(2)}</p>
                      <p className="mb-0">• {resumen.mesesConBeca.length} meses con beca ({resumen.descuentoPorc}%): {resumen.mesesConBeca.length} × Bs {resumen.cuotaConDescuento.toFixed(2)} = Bs {resumen.totalMesesConBeca.toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
            <button type="button" className="btn btn-success" onClick={registrarCompromiso}>
              Confirmar y Registrar Compromiso
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompromisoModal;