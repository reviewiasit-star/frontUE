import React, { useEffect, useState } from 'react';
import { getApiUrl } from '../../../config/apiConfig';
import AuthService from '../../../services/authService';

const ComprobantesRevisados = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagenes, setImagenes] = useState({});
  const [mostrarImagenId, setMostrarImagenId] = useState(null);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      const resp = await fetch(`${apiUrl}/ocr-comprobantes?estado=revisado&limite=200`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('No se pudo cargar la lista de comprobantes revisados');
      const data = await resp.json();
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (mostrarImagenId != null) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mostrarImagenId]);

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

  return (
    <div className="card shadow-sm" style={{ border: 'none' }}>
      <div className="card-header d-flex justify-content-between align-items-center" style={{ 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '8px 8px 0 0'
      }}>
        <div>
          <h4 className="card-title mb-0" style={{ color: 'white', fontWeight: 600 }}>
            <i className="fas fa-receipt me-2" />
            Comprobantes revisados
          </h4>
          <small style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.875rem' }}>
            Historial de comprobantes recibidos por el formulario / WhatsApp y marcados como revisados.
          </small>
        </div>
        <div className="d-flex gap-2">
          <button
            className="btn btn-light btn-sm"
            type="button"
            onClick={fetchItems}
            disabled={loading}
            style={{ fontWeight: 500 }}
          >
            <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`} />
            Refrescar
          </button>
        </div>
      </div>
      <div className="card-body" style={{ padding: '1.5rem' }}>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {loading && <div>Cargando comprobantes revisados...</div>}
        {!loading && items.length === 0 && (
          <div className="alert alert-info mb-0">
            No hay comprobantes revisados registrados todavía.
          </div>
        )}

        {!loading && items.length > 0 && (
          <div className="table-responsive" style={{ borderRadius: '8px', overflow: 'hidden' }}>
            <table className="table table-hover align-middle mb-0" style={{ marginBottom: 0 }}>
              <thead style={{ 
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderBottom: '2px solid #dee2e6'
              }}>
                <tr>
                  <th style={{ fontWeight: 600, fontSize: '0.875rem', color: '#495057' }}>#</th>
                  <th style={{ fontWeight: 600, fontSize: '0.875rem', color: '#495057' }}>Fecha recibido</th>
                  <th style={{ fontWeight: 600, fontSize: '0.875rem', color: '#495057' }}>Remitente</th>
                  <th style={{ fontWeight: 600, fontSize: '0.875rem', color: '#495057' }}>Origen</th>
                  <th style={{ fontWeight: 600, fontSize: '0.875rem', color: '#495057' }}>Descripción / Monto</th>
                  <th style={{ fontWeight: 600, fontSize: '0.875rem', color: '#495057' }}>Revisado en</th>
                  <th style={{ fontWeight: 600, fontSize: '0.875rem', color: '#495057' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const datos = item.datos || {};
                  const remit = parseRemitenteDesdeObservaciones(datos.observaciones);
                  return (
                    <tr key={item.id} style={{ transition: 'background-color 0.2s' }}>
                      <td style={{ fontWeight: 500 }}>{idx + 1}</td>
                      <td style={{ fontSize: '0.9rem' }}>{formatearFechaHora(item.creado_en)}</td>
                      <td>
                        <div className="fw-semibold" style={{ color: '#212529' }}>
                          {remit.nombre || 'N/D'}
                        </div>
                        <div className="text-muted small" style={{ fontSize: '0.8rem' }}>
                          Tel: {remit.telefono || item.numero_remitente || 'N/D'}
                        </div>
                        {remit.ci && (
                          <div className="text-muted small" style={{ fontSize: '0.8rem' }}>CI/NIT: {remit.ci}</div>
                        )}
                      </td>
                      <td>
                        <span className="badge bg-secondary text-uppercase" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                          {item.origen || 'N/D'}
                        </span>
                      </td>
                      <td>
                        <div className="small" style={{ fontSize: '0.875rem', color: '#495057' }}>
                          {remit.descripcionMonto ||
                            datos.descripcion_monto_detectado ||
                            datos.detalle_detectado ||
                            'Sin descripción'}
                        </div>
                      </td>
                      <td style={{ fontSize: '0.9rem' }}>
                        {item.revisado_en
                          ? formatearFechaHora(item.revisado_en)
                          : '-'}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => cargarImagen(item.id)}
                          style={{ fontWeight: 500 }}
                        >
                          <i className="fas fa-eye me-1" />
                          Ver imagen
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal simple para mostrar la imagen del comprobante */}
      {mostrarImagenId != null && (
        <>
          {/* Backdrop fijo a pantalla completa */}
          <div
            className="modal-backdrop fade show"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1050,
              backgroundColor: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(2px)'
            }}
            onClick={() => setMostrarImagenId(null)}
            onMouseDown={(e) => e.preventDefault()}
          />

          {/* Contenedor del modal fijo y centrado */}
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
            onClick={() => setMostrarImagenId(null)}
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
                <div className="modal-header" style={{ 
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px 12px 0 0'
                }}>
                  <h5 className="modal-title" style={{ color: 'white', fontWeight: 600 }}>
                    <i className="fas fa-receipt me-2" />
                    Imagen del comprobante #{mostrarImagenId}
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
    </div>
  );
};

export default ComprobantesRevisados;

