import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../config/apiConfig';
import AuthService from '../services/authService';

const SeleccionarComprobanteRecibido = ({ show, onClose, onSeleccionar, pago }) => {
  const [comprobantes, setComprobantes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagenes, setImagenes] = useState({});
  const [mostrarImagenId, setMostrarImagenId] = useState(null);

  useEffect(() => {
    if (show) {
      fetchComprobantes();
    }
  }, [show]);

  const fetchComprobantes = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      // Excluir comprobantes ya usados (asociados a pagos)
      const resp = await fetch(`${apiUrl}/ocr-comprobantes?estado=revisado&limite=50&excluir_usados=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('No se pudo cargar la lista de comprobantes');
      const data = await resp.json();
      setComprobantes(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const cargarImagen = async (id) => {
    if (imagenes[id]) {
      setMostrarImagenId(id);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      const resp = await fetch(`${apiUrl}/ocr-comprobantes/${id}/imagen`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('No se pudo obtener la imagen');
      const data = await resp.json();
      setImagenes((prev) => ({
        ...prev,
        [id]: `data:${data.mimetype};base64,${data.base64}`
      }));
      setMostrarImagenId(id);
    } catch (e) {
      setError(e.message);
    }
  };

  const parseRemitenteDesdeObservaciones = (obs) => {
    const txt = String(obs || '');
    const get = (re) => {
      const m = txt.match(re);
      return m ? String(m[1]).trim() : null;
    };
    return {
      nombre: get(/Nombre\s+remitente:\s*([^|;]+)/i),
      ci: get(/CI\/NIT\s+remitente:\s*([^|;]+)/i),
      telefono: get(/Tel[eé]fono\s+remitente:\s*([^|;]+)/i),
      descripcionMonto: get(/Descripci[oó]n\s+del\s+monto:\s*([^|;]+)/i)
    };
  };

  const formatearFechaHora = (fecha) => {
    try {
      return new Date(fecha).toLocaleString('es-BO');
    } catch {
      return fecha || '';
    }
  };

  const handleSeleccionar = async (comprobante) => {
    try {
      setLoading(true);
      setError('');

      // Obtener la imagen base64
      let imagenBase64 = imagenes[comprobante.id];
      if (!imagenBase64) {
        imagenBase64 = await obtenerImagenBase64(comprobante.id);
        // Guardar en el estado para futuras referencias
        setImagenes((prev) => ({
          ...prev,
          [comprobante.id]: imagenBase64
        }));
      }

      if (!imagenBase64) {
        throw new Error('No se pudo obtener la imagen del comprobante');
      }

      // Convertir base64 a Blob de forma más robusta
      // Extraer el base64 puro (sin el prefijo data:image/...;base64,)
      const base64Data = imagenBase64.includes(',') 
        ? imagenBase64.split(',')[1] 
        : imagenBase64;
      
      // Convertir base64 a bytes
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { 
        type: comprobante.mimetype || 'image/jpeg' 
      });

      // Validar que el blob tenga contenido
      if (blob.size === 0) {
        throw new Error('El archivo está vacío');
      }

      // Determinar extensión basada en mimetype
      let extension = 'jpg';
      if (comprobante.mimetype?.includes('pdf')) {
        extension = 'pdf';
      } else if (comprobante.mimetype?.includes('png')) {
        extension = 'png';
      } else if (comprobante.mimetype?.includes('jpeg') || comprobante.mimetype?.includes('jpg')) {
        extension = 'jpg';
      }
      
      // Crear un File desde el Blob con el nombre y tipo correctos
      const fileName = `comprobante-recibido-${comprobante.id}.${extension}`;
      const file = new File([blob], fileName, {
        type: comprobante.mimetype || 'image/jpeg',
        lastModified: Date.now()
      });

      // Validar el archivo antes de enviarlo
      if (!file || file.size === 0) {
        throw new Error('El archivo generado está vacío');
      }

      console.log('Archivo creado:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      // Llamar a la función de callback con el archivo
      onSeleccionar(file, comprobante);
      onClose();
    } catch (error) {
      console.error('Error al seleccionar comprobante:', error);
      setError('Error al seleccionar el comprobante: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const obtenerImagenBase64 = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      const resp = await fetch(`${apiUrl}/ocr-comprobantes/${id}/imagen`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) {
        const errorText = await resp.text();
        throw new Error(`No se pudo obtener la imagen: ${resp.status} - ${errorText}`);
      }
      const data = await resp.json();
      
      if (!data.base64) {
        throw new Error('La respuesta no contiene datos de imagen');
      }

      // Asegurar que el mimetype sea válido
      const mimetype = data.mimetype || 'image/jpeg';
      console.log('📸 Imagen obtenida:', {
        id,
        mimetype,
        base64Length: data.base64?.length
      });

      return `data:${mimetype};base64,${data.base64}`;
    } catch (e) {
      console.error('❌ Error al obtener imagen base64:', e);
      throw e;
    }
  };

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (show) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [show]);

  if (!show) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="modal-backdrop fade show"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1050,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)'
        }}
        onClick={onClose}
        onMouseDown={(e) => e.preventDefault()}
      />

      {/* Modal */}
      <div
        className="modal fade show"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1051,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none'
        }}
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-lg"
          style={{
            maxWidth: '900px',
            width: '100%',
            margin: '1rem',
            pointerEvents: 'auto'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content shadow-lg" style={{ borderRadius: '12px', border: 'none' }}>
            <div
              className="modal-header"
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px 12px 0 0'
              }}
            >
              <h5 className="modal-title" style={{ color: 'white', fontWeight: 600 }}>
                <i className="fas fa-receipt me-2" />
                Seleccionar comprobante recibido
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                onClick={onClose}
                style={{ opacity: 0.9 }}
              />
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflow: 'auto' }}>
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              {loading && (
                <div className="text-center py-4">
                  <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
                  <div className="mt-2">Cargando comprobantes...</div>
                </div>
              )}
              {!loading && comprobantes.length === 0 && (
                <div className="alert alert-info mb-0">
                  No hay comprobantes revisados disponibles.
                </div>
              )}

              {!loading && comprobantes.length > 0 && (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{
                      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      <tr>
                        <th style={{ fontWeight: 600, fontSize: '0.875rem' }}>Fecha</th>
                        <th style={{ fontWeight: 600, fontSize: '0.875rem' }}>Remitente</th>
                        <th style={{ fontWeight: 600, fontSize: '0.875rem' }}>Descripción</th>
                        <th style={{ fontWeight: 600, fontSize: '0.875rem' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comprobantes.map((item) => {
                        const datos = item.datos || {};
                        const remit = parseRemitenteDesdeObservaciones(datos.observaciones);
                        return (
                          <tr key={item.id}>
                            <td style={{ fontSize: '0.9rem' }}>
                              {formatearFechaHora(item.creado_en)}
                            </td>
                            <td>
                              <div className="fw-semibold" style={{ color: '#212529' }}>
                                {remit.nombre || item.numero_remitente || 'N/D'}
                              </div>
                              {remit.telefono && (
                                <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                                  Tel: {remit.telefono}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="small" style={{ fontSize: '0.875rem' }}>
                                {remit.descripcionMonto ||
                                  datos.descripcion_monto_detectado ||
                                  datos.detalle_detectado ||
                                  'Sin descripción'}
                              </div>
                              {datos.monto_detectado && (
                                <div className="text-success fw-bold">
                                  Bs. {datos.monto_detectado}
                                </div>
                              )}
                            </td>
                            <td>
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-info btn-sm"
                                  onClick={() => cargarImagen(item.id)}
                                  title="Ver imagen"
                                >
                                  <i className="fas fa-eye"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleSeleccionar(item)}
                                  title="Seleccionar este comprobante"
                                >
                                  <i className="fas fa-check me-1"></i>
                                  Seleccionar
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para ver imagen */}
      {mostrarImagenId != null && (
        <>
          <div
            className="modal-backdrop fade show"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1060,
              backgroundColor: 'rgba(0,0,0,0.7)',
              backdropFilter: 'blur(2px)'
            }}
            onClick={() => setMostrarImagenId(null)}
            onMouseDown={(e) => e.preventDefault()}
          />
          <div
            className="modal fade show"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1061,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
            onClick={() => setMostrarImagenId(null)}
          >
            <div
              className="modal-dialog modal-lg"
              style={{
                maxWidth: '800px',
                width: '100%',
                margin: '1rem',
                pointerEvents: 'auto'
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-content shadow-lg" style={{ borderRadius: '12px', border: 'none' }}>
                <div
                  className="modal-header"
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px 12px 0 0'
                  }}
                >
                  <h5 className="modal-title" style={{ color: 'white', fontWeight: 600 }}>
                    <i className="fas fa-image me-2" />
                    Vista previa del comprobante
                  </h5>
                  <button
                    type="button"
                    className="btn-close btn-close-white"
                    onClick={() => setMostrarImagenId(null)}
                    style={{ opacity: 0.9 }}
                  />
                </div>
                <div
                  className="modal-body d-flex justify-content-center align-items-center"
                  style={{
                    maxHeight: '80vh',
                    overflow: 'auto',
                    padding: '1.5rem',
                    background: '#f8f9fa'
                  }}
                >
                  {imagenes[mostrarImagenId] ? (
                    <img
                      src={imagenes[mostrarImagenId]}
                      alt="Comprobante"
                      style={{
                        maxWidth: '100%',
                        maxHeight: '75vh',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    />
                  ) : (
                    <div className="text-center py-5">
                      <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
                      <div>Cargando imagen...</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default SeleccionarComprobanteRecibido;
