import React, { useState, useEffect, useRef } from 'react';
import { useNotification } from '../../../hooks/useNotification';
import AuthService from '../../../services/authService';
import ModoDispositivo from '../../../components/modoDispositivo.jsx';

const PASOS_SUBIDA = [
  { id: 1, label: 'Subiendo archivo...', icon: 'fa-upload' },
  { id: 2, label: 'Extrayendo texto del documento...', icon: 'fa-file-alt' },
  { id: 3, label: 'Generando chunks para búsqueda...', icon: 'fa-puzzle-piece' },
  { id: 4, label: 'Actualizando agente inteligente...', icon: 'fa-robot' }
];

function DocumentosAgente() {
  const [documentos, setDocumentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [pasoActual, setPasoActual] = useState(1);
  const [archivoSeleccionado, setArchivoSeleccionado] = useState(null);
  const [tipoDocumento, setTipoDocumento] = useState('otros');
  const [mostrarInactivos, setMostrarInactivos] = useState(false);
  const [showModalChunks, setShowModalChunks] = useState(false);
  const [chunks, setChunks] = useState([]);
  const [documentoNombreChunks, setDocumentoNombreChunks] = useState('');
  const [loadingChunks, setLoadingChunks] = useState(false);
  const [chunkSeleccionado, setChunkSeleccionado] = useState(null);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);
  const [confirmDeleteData, setConfirmDeleteData] = useState({ id: null, eliminarFisico: false });
  const [eliminandoDocumento, setEliminandoDocumento] = useState(false);
  const subiendoRef = useRef(false);
  const fileInputRef = useRef(null);
  const pasoIntervalRef = useRef(null);

  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    cargarDocumentos();
  }, [mostrarInactivos]);

  const cargarDocumentos = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://${window.location.hostname}:3001/api/documentos-agente/listar?activos=${mostrarInactivos ? 'false' : 'true'}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (response.ok && data.ok) {
        setDocumentos(data.documentos || []);
      } else {
        setError(data.message || 'Error al cargar los documentos');
        showError(data.message || 'Error al cargar los documentos');
      }
    } catch (err) {
      setError('Error de conexión');
      showError('Error de conexión al servidor');
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validar tipo de archivo
      const extension = file.name.split('.').pop().toLowerCase();
      const tiposPermitidos = ['pdf', 'docx', 'doc', 'txt'];
      
      if (!tiposPermitidos.includes(extension)) {
        showError('Solo se permiten archivos PDF, Word (DOCX) o TXT');
        return;
      }

      // Validar tamaño (10MB máximo)
      if (file.size > 10 * 1024 * 1024) {
        showError('El archivo no puede ser mayor a 10MB');
        return;
      }

      setArchivoSeleccionado(file);
    }
  };

  const handleSubir = async () => {
    if (!archivoSeleccionado) {
      showError('Por favor selecciona un archivo');
      return;
    }
    // Evitar doble envío (el setState es asíncrono, usamos ref)
    if (subiendoRef.current) return;
    subiendoRef.current = true;
    setSubiendo(true);
    setPasoActual(1);

    // Avanzar pasos cada 2.5 segundos para mostrar progreso visual
    pasoIntervalRef.current = setInterval(() => {
      setPasoActual((prev) => (prev < 4 ? prev + 1 : prev));
    }, 2500);

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('documento', archivoSeleccionado);
      formData.append('tipo', tipoDocumento);

      const response = await fetch(
        `http://${window.location.hostname}:3001/api/documentos-agente/subir`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        }
      );

      const data = await response.json();
      if (response.ok && data.ok) {
        showSuccess('Documento subido exitosamente. El agente inteligente ha sido actualizado.');
        setShowModal(false);
        setArchivoSeleccionado(null);
        setTipoDocumento('otros');
        if (fileInputRef.current) fileInputRef.current.value = '';
        cargarDocumentos();
      } else {
        const msg = data.message || 'Error al subir el documento';
        const esDuplicado = msg.includes('Ya existe un documento activo');
        if (esDuplicado) {
          showError(msg);
          setShowModal(false);
          cargarDocumentos(); // Actualizar lista por si ya estaba registrado
        } else {
          showError(msg);
        }
      }
    } catch (err) {
      console.error('Error:', err);
      showError('Error de conexión al subir el documento');
    } finally {
      if (pasoIntervalRef.current) {
        clearInterval(pasoIntervalRef.current);
        pasoIntervalRef.current = null;
      }
      setSubiendo(false);
      subiendoRef.current = false;
    }
  };

  const cerrarModal = () => {
    if (!subiendo) {
      setShowModal(false);
      setArchivoSeleccionado(null);
      setTipoDocumento('otros');
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleEliminar = async (id, eliminarFisico = false) => {
    setConfirmDeleteData({ id, eliminarFisico });
    setShowConfirmDeleteModal(true);
  };

  const confirmarEliminar = async () => {
    const { id, eliminarFisico } = confirmDeleteData;
    if (!id || eliminandoDocumento) return;
    setEliminandoDocumento(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://${window.location.hostname}:3001/api/documentos-agente/${id}?eliminar_fisico=${eliminarFisico}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (response.ok && data.ok) {
        showSuccess(data.message || 'Documento eliminado exitosamente');
        setShowConfirmDeleteModal(false);
        cargarDocumentos();
      } else {
        showError(data.message || 'Error al eliminar el documento');
      }
    } catch (err) {
      console.error('Error:', err);
      showError('Error de conexión al eliminar el documento');
    } finally {
      setEliminandoDocumento(false);
      setConfirmDeleteData({ id: null, eliminarFisico: false });
    }
  };

  const handleRegenerarChunks = async (doc) => {
    if (!window.confirm(`¿Regenerar chunks de "${doc.nombre}"? Esto actualizará los fragmentos con la configuración mejorada (menos cortes).`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://${window.location.hostname}:3001/api/documentos-agente/${doc.id}/regenerar-chunks`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok && data.ok) {
        showSuccess(data.message || 'Chunks regenerados correctamente');
        cargarDocumentos();
      } else {
        showError(data.message || 'Error al regenerar chunks');
      }
    } catch (err) {
      showError('Error de conexión al regenerar chunks');
    }
  };

  const handleVerChunks = async (doc) => {
    setShowModalChunks(true);
    setDocumentoNombreChunks(doc.nombre);
    setChunkSeleccionado(null);
    setLoadingChunks(true);
    setChunks([]);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://${window.location.hostname}:3001/api/documentos-agente/${doc.id}/chunks`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await response.json();
      if (response.ok && data.ok) {
        setChunks(data.chunks || []);
      } else {
        showError(data.message || 'Error al cargar los chunks');
      }
    } catch (err) {
      showError('Error de conexión al cargar los chunks');
    } finally {
      setLoadingChunks(false);
    }
  };

  const handleActivar = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://${window.location.hostname}:3001/api/documentos-agente/${id}/activar`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      if (response.ok && data.ok) {
        showSuccess('Documento activado exitosamente');
        cargarDocumentos();
      } else {
        showError(data.message || 'Error al activar el documento');
      }
    } catch (err) {
      console.error('Error:', err);
      showError('Error de conexión al activar el documento');
    }
  };

  const formatearTamanio = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleString('es-BO');
  };

  return (
    <div className="container-fluid py-4">
      <ModoDispositivo />
      
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h4 className="mb-0">Gestión de Documentos del Agente Inteligente</h4>
          <button
            className="btn btn-light btn-sm"
            onClick={() => setShowModal(true)}
          >
            <i className="fas fa-upload me-2"></i>
            Subir Documento
          </button>
        </div>

        <div className="card-body">
          <div className="mb-3 d-flex justify-content-between align-items-center">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="mostrarInactivos"
                checked={mostrarInactivos}
                onChange={(e) => setMostrarInactivos(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="mostrarInactivos">
                Mostrar documentos inactivos
              </label>
            </div>
            <div>
              <span className="badge bg-info">
                Total: {documentos.length} documento(s)
              </span>
            </div>
          </div>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Cargando...</span>
              </div>
            </div>
          ) : documentos.length === 0 ? (
            <div className="alert alert-info">
              <i className="fas fa-info-circle me-2"></i>
              No hay documentos {mostrarInactivos ? 'inactivos' : 'activos'}.
              {!mostrarInactivos && (
                <span> Sube un documento para que el agente inteligente pueda usarlo.</span>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Tipo</th>
                    <th>Formato</th>
                    <th>Tamaño</th>
                    <th>Estado</th>
                    <th>Fecha de Carga</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {documentos.map((doc) => (
                    <tr key={doc.id}>
                      <td>
                        <strong>{doc.nombre}</strong>
                        {doc.preview && (
                          <div className="text-muted small mt-1" style={{ maxWidth: '300px' }}>
                            {doc.preview}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className={`badge bg-${getTipoColor(doc.tipo)}`}>
                          {doc.tipo}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          {doc.formato.toUpperCase()}
                        </span>
                      </td>
                      <td>{formatearTamanio(doc.tamanio_bytes)}</td>
                      <td>
                        {doc.activo ? (
                          <span className="badge bg-success">Activo</span>
                        ) : (
                          <span className="badge bg-secondary">Inactivo</span>
                        )}
                      </td>
                      <td>{formatearFecha(doc.creado_en)}</td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-info"
                            onClick={() => handleVerChunks(doc)}
                            title="Ver chunks extraídos"
                          >
                            <i className="fas fa-puzzle-piece"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-outline-primary"
                            onClick={() => handleRegenerarChunks(doc)}
                            title="Regenerar chunks (aplica nuevo tamaño, evita cortes)"
                          >
                            <i className="fas fa-sync-alt"></i>
                          </button>
                          {!doc.activo && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handleActivar(doc.id)}
                              title="Activar documento"
                            >
                              <i className="fas fa-check"></i>
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => handleEliminar(doc.id, false)}
                            title="Desactivar documento"
                            disabled={eliminandoDocumento}
                          >
                            <i className="fas fa-eye-slash"></i>
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleEliminar(doc.id, true)}
                            title="Eliminar permanentemente"
                            disabled={eliminandoDocumento}
                          >
                            <i className="fas fa-trash"></i>
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

      {/* Modal para subir documento */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Subir Documento</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarModal}
                  disabled={subiendo}
                ></button>
              </div>
              <div className="modal-body">
                {subiendo && (
                  <div className="mb-4 p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <span className="spinner-border spinner-border-sm text-primary me-2"></span>
                      <strong>Registrando documento...</strong>
                    </div>
                    <div className="progress mb-2" style={{ height: '8px' }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated"
                        role="progressbar"
                        style={{ width: `${(pasoActual / 4) * 100}%` }}
                        aria-valuenow={pasoActual}
                        aria-valuemin="0"
                        aria-valuemax="4"
                      />
                    </div>
                    <div className="small text-muted">
                      {PASOS_SUBIDA.map((p) => (
                        <div key={p.id} className={`py-1 ${pasoActual >= p.id ? 'text-primary fw-medium' : 'text-secondary'}`}>
                          <i className={`fas ${p.icon} me-2`} style={{ width: '18px' }}></i>
                          {p.label}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Tipo de Documento</label>
                  <select
                    className="form-select"
                    value={tipoDocumento}
                    onChange={(e) => setTipoDocumento(e.target.value)}
                    disabled={subiendo}
                  >
                    <option value="reglamento">Reglamento</option>
                    <option value="becas">Reglamento de Becas</option>
                    <option value="inscripcion">Inscripción</option>
                    <option value="otros">Otros</option>
                  </select>
                  <small className="form-text text-muted">
                    El tipo ayuda al agente a clasificar y buscar información relevante.
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">Archivo (PDF, Word o TXT)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="form-control"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={handleFileChange}
                    disabled={subiendo}
                  />
                  <small className="form-text text-muted">
                    Formatos permitidos: PDF, DOCX, DOC, TXT. Tamaño máximo: 10MB
                  </small>
                  {archivoSeleccionado && (
                    <div className="mt-2">
                      <span className="badge bg-info">
                        {archivoSeleccionado.name} ({formatearTamanio(archivoSeleccionado.size)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="alert alert-info">
                  <i className="fas fa-info-circle me-2"></i>
                  <strong>Importante:</strong> El documento será procesado y el texto extraído será usado
                  por el agente inteligente para responder consultas. El agente se actualizará automáticamente.
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={cerrarModal}
                  disabled={subiendo}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSubir}
                  disabled={!archivoSeleccionado || subiendo}
                >
                  {subiendo ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Subiendo...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-upload me-2"></i>
                      Subir
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para ver chunks del documento */}
      {showModalChunks && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">
                  <i className="fas fa-puzzle-piece me-2"></i>
                  Chunks extraídos: {documentoNombreChunks}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => { setShowModalChunks(false); setChunkSeleccionado(null); }}
                />
              </div>
              <div className="modal-body p-0">
                {loadingChunks ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-info" role="status" />
                    <p className="mt-2 mb-0">Cargando chunks...</p>
                  </div>
                ) : chunks.length === 0 ? (
                  <div className="alert alert-warning m-3 mb-0">
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    Este documento aún no tiene chunks. Sube el documento para que se procese.
                  </div>
                ) : (
                  <div className="d-flex" style={{ minHeight: '400px' }}>
                    <div className="border-end overflow-auto" style={{ width: '45%', maxHeight: '70vh' }}>
                      <div className="list-group list-group-flush">
                        {chunks.map((chunk, idx) => {
                          const m = chunk.metadata || {};
                          const etiqueta = m.titulo || m.capitulo || m.articulo
                            ? [m.titulo, m.capitulo, m.articulo].filter(Boolean).join(' · ')
                            : `Chunk ${idx + 1}`;
                          const preview = chunk.texto ? chunk.texto.substring(0, 120) + (chunk.texto.length > 120 ? '…' : '') : '';
                          const activo = chunkSeleccionado?.id === chunk.id;
                          return (
                            <button
                              key={chunk.id}
                              type="button"
                              className={`list-group-item list-group-item-action text-start border-0 rounded-0 ${activo ? 'active' : ''}`}
                              onClick={() => setChunkSeleccionado(chunk)}
                              style={{ fontSize: '0.9rem' }}
                            >
                              <div className="fw-medium small">{etiqueta || `#${idx + 1}`}</div>
                              <div className={`small ${activo ? 'text-white-50' : 'text-muted'}`} title="Vista previa — clic para ver contenido completo">{preview}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="flex-grow-1 p-3 overflow-auto" style={{ maxHeight: '70vh' }}>
                      {chunkSeleccionado ? (
                        <div>
                          <div className="mb-3">
                            <span className="badge bg-secondary me-1">Posición {chunkSeleccionado.posicion + 1}</span>
                            {(chunkSeleccionado.metadata || {}).tipo && (
                              <span className="badge bg-primary me-1">{chunkSeleccionado.metadata.tipo}</span>
                            )}
                            {(chunkSeleccionado.metadata || {}).titulo && (
                              <span className="badge bg-info me-1">{(chunkSeleccionado.metadata || {}).titulo}</span>
                            )}
                            {(chunkSeleccionado.metadata || {}).capitulo && (
                              <span className="badge bg-warning text-dark me-1">{(chunkSeleccionado.metadata || {}).capitulo}</span>
                            )}
                            {(chunkSeleccionado.metadata || {}).articulo && (
                              <span className="badge bg-success me-1">Art. {(chunkSeleccionado.metadata || {}).articulo}</span>
                            )}
                            {(chunkSeleccionado.metadata || {}).titulo_articulo && (
                              <span className="badge bg-dark">{(chunkSeleccionado.metadata || {}).titulo_articulo}</span>
                            )}
                          </div>
                          <div
                            className="bg-light p-3 rounded small"
                            style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
                          >
                            {chunkSeleccionado.texto}
                          </div>
                        </div>
                      ) : (
                        <div className="text-muted text-center py-5">
                          <i className="fas fa-hand-pointer fa-2x mb-2"></i>
                          <p className="mb-0">Selecciona un chunk de la lista para ver su contenido completo</p>
                          <small className="text-muted">La lista muestra vista previa; al seleccionar se muestra el texto completo sin cortes</small>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <span className="me-auto text-muted small">
                  {chunks.length} chunk{chunks.length !== 1 ? 's' : ''} en total
                </span>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setShowModalChunks(false); setChunkSeleccionado(null); }}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para eliminar/desactivar documento */}
      {showConfirmDeleteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {confirmDeleteData.eliminarFisico ? 'Confirmar eliminación permanente' : 'Confirmar desactivación'}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    if (eliminandoDocumento) return;
                    setShowConfirmDeleteModal(false);
                    setConfirmDeleteData({ id: null, eliminarFisico: false });
                  }}
                  disabled={eliminandoDocumento}
                ></button>
              </div>
              <div className="modal-body">
                {eliminandoDocumento && (
                  <div className="mb-3 p-3 bg-light rounded">
                    <div className="d-flex align-items-center mb-2">
                      <span className="spinner-border spinner-border-sm text-danger me-2"></span>
                      <strong>Eliminando documento...</strong>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div
                        className="progress-bar progress-bar-striped progress-bar-animated bg-danger"
                        role="progressbar"
                        style={{ width: '100%' }}
                      />
                    </div>
                  </div>
                )}
                <p className="mb-0">
                  {confirmDeleteData.eliminarFisico
                    ? '¿Estás seguro de que quieres eliminar permanentemente este documento? Esta acción no se puede deshacer.'
                    : '¿Estás seguro de que quieres desactivar este documento?'}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    if (eliminandoDocumento) return;
                    setShowConfirmDeleteModal(false);
                    setConfirmDeleteData({ id: null, eliminarFisico: false });
                  }}
                  disabled={eliminandoDocumento}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className={`btn ${confirmDeleteData.eliminarFisico ? 'btn-danger' : 'btn-warning'}`}
                  onClick={confirmarEliminar}
                  disabled={eliminandoDocumento}
                >
                  {eliminandoDocumento
                    ? 'Eliminando...'
                    : confirmDeleteData.eliminarFisico
                      ? 'Sí, eliminar permanentemente'
                      : 'Sí, desactivar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {notification.show && (
        <div
          className={`alert alert-${notification.type} alert-dismissible fade show position-fixed`}
          style={{ top: '20px', right: '20px', zIndex: 9999, minWidth: '300px' }}
          role="alert"
        >
          {notification.message}
          <button
            type="button"
            className="btn-close"
            onClick={hideNotification}
          ></button>
        </div>
      )}
    </div>
  );
}

function getTipoColor(tipo) {
  const colores = {
    reglamento: 'primary',
    becas: 'success',
    inscripcion: 'info',
    otros: 'secondary'
  };
  return colores[tipo] || 'secondary';
}

export default DocumentosAgente;

