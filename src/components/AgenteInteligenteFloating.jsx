import React, { useState, useEffect, useRef } from 'react';
import './AgenteInteligenteFloating.css';
import HistorialChatWhatsAppPanel from './HistorialChatWhatsAppPanel';

// Clave de historial: distinta para admin vs director/secretaria (LangChain)
const getStorageKey = (userRole) => {
  if (userRole === 'Director' || userRole === 'Secretaria') {
    return 'ai_langchain_chat_history';
  }
  return 'ai_admin_chat_history';
};

// Ejemplos de comandos (comunicados / avisos) — el usuario puede editar el texto al enviarlo
const getQuickActions = (userRole) => {
  const ejemplosComunicados = [
    {
      icon: 'fa-bullhorn',
      text: 'Feriado — toda la unidad',
      query:
        'Comunica a toda la unidad educativa que mañana es feriado y no habrá clases.'
    },
    {
      icon: 'fa-layer-group',
      text: 'Sin clases — primer nivel',
      query:
        'Avisa a los estudiantes de primer nivel que mañana no hay clases.'
    },
    {
      icon: 'fa-clock',
      text: '1er nivel, solo turno mañana',
      query:
        'Comunica a las familias del primer nivel de turno mañana que mañana no habrá clases por feriado.'
    },
    {
      icon: 'fa-tshirt',
      text: 'Uniforme — evento nacional',
      query:
        'Comunica a toda la comunidad educativa que mañana deben asistir con uniforme escolar completo por un evento nacional.'
    },
    {
      icon: 'fa-calendar-check',
      text: 'Reunión de padres',
      query:
        'Envía un recordatorio a los tutores indicando fecha, hora y lugar de la reunión de padres.'
    }
  ];

  if (userRole === 'Administrador' || userRole === 'Director') {
    return ejemplosComunicados;
  }
  if (userRole === 'Secretaria') {
    return ejemplosComunicados;
  }
  if (userRole === 'Cajero') {
    return [
      ...ejemplosComunicados.slice(0, 3),
      {
        icon: 'fa-receipt',
        text: 'Consultar pagos de un estudiante',
        query: 'Necesito consultar el estado de pagos de un estudiante por nombre o CI.'
      }
    ];
  }

  return ejemplosComunicados.slice(0, 4);
};

// Formatear texto con markdown básico
const formatMessage = (text) => {
  if (!text) return '';

  // Convertir **texto** a <strong>
  let formatted = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

  // Convertir *texto* a bullet points si está al inicio de línea
  formatted = formatted.replace(/^\* /gm, '• ');

  // Convertir saltos de línea
  formatted = formatted.replace(/\n/g, '<br/>');

  return formatted;
};

function AgenteInteligenteFloating({ user: userProp }) {
  const [isOpen, setIsOpen] = useState(false);
  const [historialWhatsappOpen, setHistorialWhatsappOpen] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [conversacion, setConversacion] = useState([]);
  const [sesionId, setSesionId] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(userProp?.rol || '');
  const chatContainerRef = useRef(null);
  const inputRef = useRef(null);

  const storageKey = getStorageKey(userRole);
  // LangChain solo para Director y Secretaria. Administrador usa /api/ai-admin/chat (comunicados masivos, agente principal).
  const useLangChain = userRole === 'Director' || userRole === 'Secretaria';

  // Cargar historial y obtener rol del usuario
  useEffect(() => {
    const rol = userProp?.rol || '';
    if (userProp?.rol) setUserRole(userProp.rol);

    const key = getStorageKey(rol);
    const historialGuardado = localStorage.getItem(key);
    if (historialGuardado) {
      try {
        const historial = JSON.parse(historialGuardado);
        setConversacion(historial);
      } catch (e) {
        console.error('Error al cargar historial:', e);
        localStorage.removeItem(key);
      }
    }

    if (!userProp) {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const payload = JSON.parse(atob(token.split('.')[1]));
          setUserRole(payload.rol || '');
        }
      } catch (e) {
        console.error('Error al obtener rol:', e);
      }
    }
  }, [userProp]);

  // Guardar historial
  useEffect(() => {
    if (conversacion.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(conversacion));
    }
  }, [conversacion, storageKey]);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current && isOpen) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversacion, cargando, isOpen]);

  // Focus en input al abrir
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  const limpiarHistorial = () => {
    if (window.confirm('¿Limpiar el historial de conversación?')) {
      setConversacion([]);
      setSesionId(null);
      localStorage.removeItem(storageKey);
    }
  };

  const handleQuickAction = (query) => {
    setMensaje(query);
    // Auto-enviar
    enviarMensajeDirecto(query);
  };

  const enviarMensajeDirecto = async (texto) => {
    setError('');
    if (!texto.trim()) return;

    const nuevoHistorial = [
      ...conversacion,
      { autor: 'user', texto: texto.trim(), timestamp: new Date().toISOString() },
    ];
    setConversacion(nuevoHistorial);
    setMensaje('');
    setCargando(true);

    try {
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;

      if (useLangChain) {
        // Director y Secretaria: API LangChain
        const body = { pregunta: texto.trim() };
        if (sesionId) body.sesion_id = sesionId;
        const resp = await fetch(`${baseUrl}/api/ai-admin-langchain/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.message || 'Error al comunicarse con el agente');
        }

        const data = await resp.json();
        if (data.sesion_id) setSesionId(data.sesion_id);

        setConversacion((prev) => [
          ...prev,
          {
            autor: 'assistant',
            texto: data.respuesta || 'Sin respuesta del agente.',
            timestamp: new Date().toISOString(),
            herramienta: data.herramienta,
            tiempo: data.tiempo_ms,
            herramientas_usadas: data.herramientas_usadas,
            documentoAsistencia: data.documentoAsistencia || null
          },
        ]);
      } else {
        // Administrador (y Cajero): API agente principal
        const body = { mensaje: texto.trim() };
        if (sesionId) body.sesion_id = sesionId;
        const resp = await fetch(`${baseUrl}/api/ai-admin/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(body),
        });

        if (!resp.ok) {
          throw new Error('Error al comunicarse con el agente');
        }

        const data = await resp.json();
        if (data.sesion_id) setSesionId(data.sesion_id);

        setConversacion((prev) => [
          ...prev,
          {
            autor: 'assistant',
            texto: data.respuesta || 'Sin respuesta del agente.',
            timestamp: new Date().toISOString(),
            herramienta: data.herramienta_usada || data.herramienta,
            tiempo: data.tiempo_respuesta_ms ?? data.tiempo_ms
          },
        ]);
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo conectar con el agente. Verifica tu conexión.');
    } finally {
      setCargando(false);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    await enviarMensajeDirecto(mensaje);
  };

  const quickActions = getQuickActions(userRole);

  const descargarDocumentoAsistencia = async (doc) => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      const baseUrl = import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3001`;
      const resp = await fetch(`${baseUrl}/api/ai-admin-langchain/generar-asistencia`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          nivel: doc.nivel,
          turno: doc.turno || null,
          formato: doc.formato || 'pdf',
          anio: doc.anio || new Date().getFullYear()
        }),
      });
      const contentType = resp.headers.get('Content-Type') || '';
      if (!resp.ok) {
        const errBody = contentType.includes('application/json') ? await resp.json().catch(() => ({})) : {};
        throw new Error(errBody.message || `Error ${resp.status} al generar el documento`);
      }
      const blob = await resp.blob();
      if (blob.type && blob.type.includes('application/json')) {
        const errData = await blob.text().then(t => { try { return JSON.parse(t); } catch { return {}; } });
        throw new Error(errData.message || 'El servidor no devolvió un archivo');
      }
      const ext = (doc.formato === 'word' || doc.formato === 'docx') ? 'docx' : 'pdf';
      const nombre = `asistencia_${(doc.nivel || 'lista').replace(/\s+/g, '_')}_${doc.turno || 'todos'}_${doc.anio || ''}.${ext}`;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      setError(err.message || 'No se pudo descargar el documento');
    }
  };

  return (
    <>
      {/* Botón flotante */}
      <button
        className="ai-floating-button"
        onClick={() => setIsOpen(true)}
        title="Abrir Agente Inteligente"
      >
        <i className="fas fa-robot"></i>
      </button>

      {/* Modal */}
      {isOpen && (
        <div className="ai-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}>
          <div className="ai-modal-container" onClick={(e) => e.stopPropagation()}>

            {/* Header */}
            <div className="ai-modal-header">
              <div className="ai-header-info">
                <i className="fas fa-robot"></i>
                <h5>Asistente Inteligente</h5>
              </div>
              <div className="ai-header-actions">
                <span className="ai-badge">
                  <i className="fas fa-bolt"></i> IA
                </span>
                {userRole === 'Administrador' && (
                  <button
                    type="button"
                    className="ai-btn-icon"
                    onClick={() => setHistorialWhatsappOpen(true)}
                    title="Ver historial de chat (WhatsApp con padres)"
                  >
                    <i className="fas fa-comments"></i>
                  </button>
                )}
                {conversacion.length > 0 && (
                  <button className="ai-btn-icon" onClick={limpiarHistorial} title="Limpiar historial">
                    <i className="fas fa-trash-alt"></i>
                  </button>
                )}
                <button className="ai-btn-icon" onClick={() => setIsOpen(false)} title="Cerrar">
                  <i className="fas fa-times"></i>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="ai-modal-body">
              <div ref={chatContainerRef} className="ai-chat-container">
                {conversacion.length === 0 ? (
                  <div className="ai-empty-state">
                    <i className="fas fa-comments"></i>
                    <p><strong>¡Hola! Soy el asistente de la Unidad Educativa</strong></p>
                    <p>
                      {useLangChain
                        ? 'Pregúntame sobre estadísticas, inscripciones, pagos, listas de asistencia y más.'
                        : userRole === 'Administrador'
                          ? 'Puedes consultar datos del sistema y enviar comunicados por WhatsApp a familias con contacto verificado (contacto_aviso).'
                          : 'Pregúntame sobre inscripciones, pagos, requisitos, horarios, becas y más.'}
                    </p>
                    <p style={{ fontSize: '0.85rem', marginTop: '12px' }}>
                      <i className="fas fa-lightbulb"></i> Usa los botones de abajo para consultas rápidas
                    </p>
                  </div>
                ) : (
                  conversacion.map((msg, idx) => (
                    <div key={idx} className={`ai-message ${msg.autor === 'user' ? 'user' : 'assistant'}`}>
                      <div className="ai-message-bubble">
                        <div className="ai-message-header">
                          <i className={msg.autor === 'user' ? 'fas fa-user' : 'fas fa-robot'}></i>
                          <span>{msg.autor === 'user' ? 'Tú' : 'Asistente'}</span>
                          <span>
                            {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          {msg.tiempo && <span style={{ marginLeft: '8px', opacity: 0.6 }}>({msg.tiempo}ms)</span>}
                        </div>
                        <div
                          className="ai-message-content"
                          dangerouslySetInnerHTML={{ __html: formatMessage(msg.texto) }}
                        />
                        {msg.documentoAsistencia && (
                          <div className="ai-documento-descarga" style={{ marginTop: '10px' }}>
                            <button
                              type="button"
                              className="ai-btn-descargar"
                              onClick={() => descargarDocumentoAsistencia(msg.documentoAsistencia)}
                            >
                              <i className={`fas ${(msg.documentoAsistencia.formato === 'word' || msg.documentoAsistencia.formato === 'docx') ? 'fa-file-word' : 'fa-file-pdf'}`}></i>
                              Descargar {msg.documentoAsistencia.formato === 'word' || msg.documentoAsistencia.formato === 'docx' ? 'Word' : 'PDF'}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}

                {cargando && (
                  <div className="ai-typing-indicator">
                    <div className="ai-typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                    <span className="ai-typing-text">Procesando mensaje...</span>
                  </div>
                )}
              </div>

              {error && (
                <div className="ai-error">
                  <i className="fas fa-exclamation-circle"></i>
                  {error}
                </div>
              )}

              {/* Ejemplos de comandos (comunicados) */}
              {conversacion.length === 0 && (
                <div className="ai-quick-actions">
                  {quickActions.map((action, idx) => (
                    <button
                      key={idx}
                      className="ai-quick-btn"
                      onClick={() => handleQuickAction(action.query)}
                      disabled={cargando}
                    >
                      <i className={`fas ${action.icon}`}></i>
                      {action.text}
                    </button>
                  ))}
                </div>
              )}

              {/* Input */}
              <div className="ai-input-area">
                <form onSubmit={enviarMensaje} className="ai-input-wrapper">
                  <input
                    ref={inputRef}
                    type="text"
                    className="ai-input"
                    placeholder="Escribe un aviso o pregunta (puedes partir de un ejemplo de arriba)…"
                    value={mensaje}
                    onChange={(e) => setMensaje(e.target.value)}
                    disabled={cargando}
                  />
                  <button
                    type="submit"
                    className="ai-send-btn"
                    disabled={cargando || !mensaje.trim()}
                  >
                    {cargando ? (
                      <i className="fas fa-spinner fa-spin"></i>
                    ) : (
                      <i className="fas fa-paper-plane"></i>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {historialWhatsappOpen && (
        <div
          className="ai-historial-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="ai-historial-title"
          onClick={(e) => e.target === e.currentTarget && setHistorialWhatsappOpen(false)}
        >
          <div className="ai-historial-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-historial-header">
              <div className="ai-historial-title-wrap">
                <i className="fab fa-whatsapp text-success"></i>
                <h5 id="ai-historial-title">Historial de chat (WhatsApp)</h5>
              </div>
              <button
                type="button"
                className="ai-btn-icon"
                onClick={() => setHistorialWhatsappOpen(false)}
                title="Cerrar"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <div className="ai-historial-body">
              <HistorialChatWhatsAppPanel embedded />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AgenteInteligenteFloating;
