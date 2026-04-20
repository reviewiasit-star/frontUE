import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../config/apiConfig';
import AuthService from '../services/authService';

function formatearFecha(d) {
  if (!d) return '';
  try {
    const x = new Date(d);
    return x.toLocaleString('es-EC', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return String(d);
  }
}

/**
 * @param {{ embedded?: boolean }} props
 * embedded: true = sin marco de página (para modal dentro del Asistente Inteligente)
 */
export default function HistorialChatWhatsAppPanel({ embedded = false }) {
  const [lista, setLista] = useState([]);
  const [loadingLista, setLoadingLista] = useState(true);
  const [errorLista, setErrorLista] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedEtiqueta, setSelectedEtiqueta] = useState('');
  const [mensajes, setMensajes] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const scrollRef = useRef(null);

  const token = localStorage.getItem('token');
  const user = AuthService.getUser();
  const base = getApiUrl('/historial-chat', user?.rol);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoadingLista(true);
      setErrorLista('');
      try {
        const r = await fetch(`${base}/historial-chat/conversaciones`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || 'Error al cargar el listado');
        if (!cancel) setLista(j.conversaciones || []);
      } catch (e) {
        if (!cancel) setErrorLista(e.message || 'Error de red');
      } finally {
        if (!cancel) setLoadingLista(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [base, token]);

  useEffect(() => {
    if (!selected) {
      setMensajes([]);
      setSelectedEtiqueta('');
      return;
    }
    let cancel = false;
    (async () => {
      setLoadingMsgs(true);
      try {
        const q = new URLSearchParams({ telefono: selected });
        const r = await fetch(`${base}/historial-chat/mensajes?${q}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.message || 'Error al cargar mensajes');
        if (!cancel) {
          setMensajes(j.mensajes || []);
          setSelectedEtiqueta(j.etiqueta || '');
        }
      } catch {
        if (!cancel) {
          setMensajes([]);
          setSelectedEtiqueta('');
        }
      } finally {
        if (!cancel) setLoadingMsgs(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [selected, base, token]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, loadingMsgs]);

  const itemSeleccionado = lista.find((c) => c.telefono === selected);

  const listMaxH = embedded ? 'min(52vh, 360px)' : 'min(70vh, 560px)';
  const chatMaxH = embedded ? 'min(52vh, 360px)' : 'min(70vh, 560px)';
  const cardMinH = embedded ? 320 : 420;

  const inner = (
    <div className="row g-3" style={embedded ? { flex: 1, minHeight: 0, margin: 0 } : undefined}>
      <div className="col-12 col-lg-4" style={embedded ? { display: 'flex', flexDirection: 'column', minHeight: 0 } : undefined}>
        <div
          className="card shadow-sm h-100"
          style={{ minHeight: cardMinH, ...(embedded ? { display: 'flex', flexDirection: 'column', minHeight: 0 } : {}) }}
        >
          <div className="card-header bg-white fw-semibold py-2">
            <i className="fas fa-user-friends me-2 text-secondary"></i>
            Contactos ({loadingLista ? '…' : lista.length})
          </div>
          <div
            className="list-group list-group-flush overflow-auto flex-grow-1"
            style={{ maxHeight: listMaxH }}
          >
            {loadingLista && (
              <div className="p-4 text-center text-muted">
                <div className="spinner-border spinner-border-sm me-2" role="status" />
                Cargando…
              </div>
            )}
            {errorLista && !loadingLista && (
              <div className="p-3">
                <div className="alert alert-danger mb-0 small">{errorLista}</div>
              </div>
            )}
            {!loadingLista &&
              !errorLista &&
              lista.map((c) => (
                <button
                  key={c.telefono}
                  type="button"
                  className={`list-group-item list-group-item-action text-start ${selected === c.telefono ? 'active' : ''}`}
                  onClick={() => setSelected(c.telefono)}
                >
                  <div className="fw-semibold text-truncate" title={c.etiqueta || c.telefono}>
                    {c.etiqueta || `WhatsApp ${c.telefono}`}
                  </div>
                  {!c.registrado_en_estudiantes && (
                    <div className="small opacity-75">Sin coincidencia en estudiantes · {c.telefono}</div>
                  )}
                  <div className="small text-truncate opacity-75 mt-1" title={c.ultima_vista_previa}>
                    {c.ultima_vista_previa || '—'}
                  </div>
                  <div className="small mt-1 opacity-75">
                    {formatearFecha(c.ultimo_mensaje_en)} · {c.total_mensajes} mensajes
                  </div>
                </button>
              ))}
            {!loadingLista && !errorLista && lista.length === 0 && (
              <div className="p-4 text-center text-muted small">No hay conversaciones registradas aún.</div>
            )}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-8" style={embedded ? { display: 'flex', flexDirection: 'column', minHeight: 0 } : undefined}>
        <div
          className="card shadow-sm"
          style={{
            minHeight: cardMinH,
            ...(embedded ? { display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 } : {})
          }}
        >
          <div
            className="card-header text-white py-2"
            style={{ background: 'linear-gradient(135deg, #075E54 0%, #128C7E 100%)' }}
          >
            {selected ? (
              <>
                <div className="fw-semibold">
                  {itemSeleccionado?.etiqueta || selectedEtiqueta || `Chat ${selected}`}
                </div>
                <div className="small opacity-90">{selected}</div>
              </>
            ) : (
              <span className="opacity-90">Seleccione un contacto para ver el historial</span>
            )}
          </div>
          <div
            ref={scrollRef}
            className="card-body overflow-auto flex-grow-1"
            style={{
              maxHeight: chatMaxH,
              background: '#e5ddd5',
              backgroundImage:
                'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,.03) 2px, rgba(255,255,255,.03) 4px)',
              minHeight: embedded ? 200 : undefined
            }}
          >
            {loadingMsgs && (
              <div className="text-center text-muted py-5">
                <div className="spinner-border spinner-border-sm me-2" />
                Cargando mensajes…
              </div>
            )}
            {!loadingMsgs && selected && mensajes.length === 0 && (
              <div className="text-center text-muted py-5 small">No hay mensajes para este número.</div>
            )}
            {!loadingMsgs &&
              mensajes.map((m) => {
                const esUsuario = m.rol === 'usuario';
                return (
                  <div
                    key={m.id}
                    className={`d-flex mb-2 ${esUsuario ? 'justify-content-end' : 'justify-content-start'}`}
                  >
                    <div
                      className="px-3 py-2 rounded-3 shadow-sm"
                      style={{
                        maxWidth: '82%',
                        background: esUsuario ? '#dcf8c6' : '#fff',
                        borderTopRightRadius: esUsuario ? 4 : 12,
                        borderTopLeftRadius: esUsuario ? 12 : 4
                      }}
                    >
                      <div className="small text-muted mb-1" style={{ fontSize: '0.7rem' }}>
                        {esUsuario ? 'Padre / madre / contacto' : 'Asistente'} · {formatearFecha(m.creado_en)}
                      </div>
                      <div className="text-break" style={{ whiteSpace: 'pre-wrap', fontSize: '0.95rem' }}>
                        {m.mensaje}
                      </div>
                    </div>
                  </div>
                );
              })}
            {!selected && !loadingMsgs && (
              <div className="text-center text-muted py-5">
                <i className="fab fa-whatsapp fa-3x mb-3 opacity-50"></i>
                <p className="mb-0">Elija una conversación en la lista.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) {
    return (
      <div
        className="historial-chat-panel-embedded px-1"
        style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, maxHeight: '75vh' }}
      >
        <p className="text-muted small mb-2 mb-lg-3">
          Conversaciones del bot con padres por WhatsApp. Los contactos se enlazan con fichas de estudiantes cuando el
          teléfono coincide.
        </p>
        {inner}
      </div>
    );
  }

  return (
    <div className="container-fluid py-3" style={{ maxWidth: 1400 }}>
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
        <div>
          <h4 className="mb-1">
            <i className="fas fa-comments text-primary me-2"></i>
            Historial de chat (WhatsApp)
          </h4>
          <p className="text-muted small mb-0">
            Conversaciones guardadas con el agente; agrupadas por número. Si el contacto coincide con un teléfono de
            estudiantes, se muestra tutor y alumno.
          </p>
        </div>
        <Link to="/whatsapp-admin" className="btn btn-outline-primary">
          <i className="fab fa-whatsapp me-2"></i>
          Volver a WhatsApp
        </Link>
      </div>
      {inner}
    </div>
  );
}
