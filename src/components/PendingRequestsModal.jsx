import React, { useState, useEffect } from 'react';
import { getPendingRequests } from '../utils/offlineStorage';

const PendingRequestsModal = ({ isOpen, onClose }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPendingRequests();
      // Actualizar cada 5 segundos cuando el modal está abierto
      const interval = setInterval(loadPendingRequests, 5000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const loadPendingRequests = async () => {
    try {
      setLoading(true);
      const requests = await getPendingRequests();
      setPendingRequests(requests || []);
    } catch (error) {
      console.error('Error cargando requests pendientes:', error);
      setPendingRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getRequestType = (url, method) => {
    const urlLower = url.toLowerCase();
    const methodUpper = method?.toUpperCase() || 'GET';

    if (urlLower.includes('/estudiantes') && methodUpper === 'POST') {
      return { type: 'Registro de Estudiante', icon: '👤', color: 'primary' };
    }
    if (urlLower.includes('/inscripciones') && methodUpper === 'POST') {
      return { type: 'Preinscripción', icon: '📝', color: 'info' };
    }
    if (urlLower.includes('/pagos-realizados') || urlLower.includes('/pagos') && methodUpper === 'POST') {
      return { type: 'Registro de Pago', icon: '💰', color: 'success' };
    }
    if (urlLower.includes('/compromiso-economico') && methodUpper === 'POST') {
      return { type: 'Compromiso Económico', icon: '📋', color: 'warning' };
    }
    return { type: 'Operación', icon: '📌', color: 'secondary' };
  };

  const formatBody = (body) => {
    if (!body) return null;
    try {
      const parsed = typeof body === 'string' ? JSON.parse(body) : body;
      return parsed;
    } catch (e) {
      return null;
    }
  };

  const getStudentInfo = (body) => {
    const parsed = formatBody(body);
    if (!parsed) return null;
    
    if (parsed.nombre || parsed.apellido_paterno) {
      return {
        nombre: parsed.nombre || '',
        apellidoPaterno: parsed.apellido_paterno || '',
        apellidoMaterno: parsed.apellido_materno || '',
        ci: parsed.ci_estudiante || parsed.ci || 'N/A',
        codigo: parsed.codigo_estudiante || 'N/A',
        fechaNacimiento: parsed.fecha_nacimiento || 'N/A',
        genero: parsed.genero || 'N/A'
      };
    }
    return null;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-warning text-dark">
            <h5 className="modal-title">
              <i className="fas fa-exclamation-triangle me-2"></i>
              Operaciones Pendientes de Registro
            </h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
              aria-label="Close"
            ></button>
          </div>
          <div className="modal-body">
            <div className="alert alert-warning mb-3">
              <strong>⚠️ Backend Offline</strong>
              <br />
              <small>Modo offline activado - Los datos se guardarán localmente</small>
              <br />
              <small>Estas operaciones se sincronizarán automáticamente cuando vuelva la conexión.</small>
            </div>

            {loading ? (
              <div className="text-center py-4">
                <div className="spinner-border text-warning" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="alert alert-success">
                <i className="fas fa-check-circle me-2"></i>
                No hay operaciones pendientes. Todo está sincronizado.
              </div>
            ) : (
              <>
                <div className="mb-3">
                  <strong>Total de operaciones pendientes: <span className="badge bg-danger">{pendingRequests.length}</span></strong>
                </div>
                
                {/* Tabla mejorada para mostrar datos */}
                <div className="table-responsive">
                  <table className="table table-bordered table-hover">
                    <thead className="table-dark">
                      <tr>
                        <th>Tipo</th>
                        <th>Método</th>
                        <th>Datos del Estudiante</th>
                        <th>Fecha/Hora</th>
                        <th>Intentos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingRequests.map((request) => {
                        const requestInfo = getRequestType(request.url, request.method);
                        const studentInfo = getStudentInfo(request.body);
                        return (
                          <tr key={request.id} className={`table-${requestInfo.color === 'primary' ? 'primary' : requestInfo.color === 'info' ? 'info' : 'warning'}`}>
                            <td>
                              <span className={`badge bg-${requestInfo.color}`}>
                                {requestInfo.icon} {requestInfo.type}
                              </span>
                            </td>
                            <td>
                              <span className="badge bg-secondary">{request.method || 'POST'}</span>
                            </td>
                            <td>
                              {studentInfo ? (
                                <div>
                                  <strong>Nombre:</strong> {studentInfo.nombre} {studentInfo.apellidoPaterno} {studentInfo.apellidoMaterno}
                                  <br />
                                  <small className="text-muted">
                                    <strong>CI:</strong> {studentInfo.ci} | 
                                    <strong> Código:</strong> {studentInfo.codigo}
                                    {studentInfo.fechaNacimiento !== 'N/A' && (
                                      <> | <strong>Nacimiento:</strong> {new Date(studentInfo.fechaNacimiento).toLocaleDateString('es-ES')}</>
                                    )}
                                  </small>
                                </div>
                              ) : (
                                <div>
                                  <small className="text-muted">
                                    <strong>URL:</strong> {request.url}
                                    <br />
                                    {request.body && (
                                      <span>{typeof request.body === 'string' ? request.body.substring(0, 80) + '...' : JSON.stringify(request.body).substring(0, 80) + '...'}</span>
                                    )}
                                  </small>
                                </div>
                              )}
                            </td>
                            <td>
                              <small>
                                <i className="fas fa-clock me-1"></i>
                                {formatDate(request.timestamp)}
                              </small>
                            </td>
                            <td>
                              {request.retries > 0 ? (
                                <span className="badge bg-warning text-dark">
                                  <i className="fas fa-redo me-1"></i>
                                  {request.retries}
                                </span>
                              ) : (
                                <span className="badge bg-success">Pendiente</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cerrar
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={loadPendingRequests}
              disabled={loading}
            >
              <i className="fas fa-sync me-2"></i>
              Actualizar
            </button>
          </div>
        </div>
      </div>
      <div className="modal-backdrop fade show" onClick={onClose}></div>
    </div>
  );
};

export default PendingRequestsModal;
