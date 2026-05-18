import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_PRINCIPAL_ORIGIN } from '../../../config/apiConfig';

const STORAGE_KEY = 'ai_admin_chat_history';

function AIAdminChat() {
  const [mensaje, setMensaje] = useState('');
  const [conversacion, setConversacion] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const chatContainerRef = useRef(null);

  // Cargar historial guardado al montar el componente
  useEffect(() => {
    const historialGuardado = localStorage.getItem(STORAGE_KEY);
    if (historialGuardado) {
      try {
        const historial = JSON.parse(historialGuardado);
        setConversacion(historial);
      } catch (e) {
        console.error('Error al cargar historial:', e);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Guardar historial en localStorage cada vez que cambie
  useEffect(() => {
    if (conversacion.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversacion));
    }
  }, [conversacion]);

  // Auto-scroll al final del chat cuando hay nuevos mensajes
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [conversacion, cargando]);

  // Función para limpiar el historial
  const limpiarHistorial = () => {
    if (window.confirm('¿Estás seguro de que quieres limpiar el historial de conversación?')) {
      setConversacion([]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const enviarMensaje = async (e) => {
    e.preventDefault();
    setError('');

    const texto = mensaje.trim();
    if (!texto) return;

    const nuevoHistorial = [
      ...conversacion,
      { autor: 'admin', texto, timestamp: new Date().toISOString() },
    ];
    setConversacion(nuevoHistorial);
    setMensaje('');
    setCargando(true);

    try {
      const baseUrl = `${BACKEND_PRINCIPAL_ORIGIN}`;
      const resp = await fetch(`${baseUrl}/api/ai-admin/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mensaje: texto }),
      });

      if (!resp.ok) {
        throw new Error('Error al comunicarse con el agente inteligente');
      }

      const data = await resp.json();

      setConversacion((prev) => [
        ...prev,
        {
          autor: 'ia',
          texto: data.respuesta || 'No se recibió respuesta del agente.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error(err);
      setError('Ocurrió un error al contactar al agente inteligente.');
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="card shadow-sm">
      <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
        <h4 className="mb-0" style={{ fontSize: '1.1rem' }}>
          Chat con Agente Inteligente
        </h4>
        <div className="d-flex align-items-center gap-2">
          {conversacion.length > 0 && (
            <button
              className="btn btn-sm btn-outline-light"
              onClick={limpiarHistorial}
              title="Limpiar historial"
            >
              <i className="fas fa-trash-alt"></i>
            </button>
          )}
          <span className="badge bg-light text-primary">
            Reglamentos + Datos
          </span>
        </div>
      </div>
      <div
        className="card-body"
        style={{ maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}
      >
        <div
          ref={chatContainerRef}
          className="mb-3"
          style={{
            flex: 1,
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '8px',
            padding: '10px',
            backgroundColor: '#f9fafb',
          }}
        >
          {conversacion.length === 0 && (
            <div className="text-muted text-center" style={{ fontSize: '0.9rem' }}>
              Escribe una pregunta sobre el reglamento o sobre datos del sistema
              (por ejemplo: &quot;¿Cuándo son las inscripciones ordinarias?&quot; o &quot;¿Cuántos usuarios hay?&quot;).
              <br />
              <small>Tu conversación se guardará automáticamente.</small>
            </div>
          )}
          {conversacion.map((msg, idx) => (
            <div
              key={idx}
              className={`d-flex mb-2 ${
                msg.autor === 'admin' ? 'justify-content-end' : 'justify-content-start'
              }`}
            >
              <div
                className={`p-2 rounded ${
                  msg.autor === 'admin'
                    ? 'bg-primary text-white'
                    : 'bg-white border'
                }`}
                style={{ maxWidth: '75%' }}
              >
                <div style={{ fontSize: '0.8rem', marginBottom: 2, opacity: 0.8 }}>
                  {msg.autor === 'admin' ? 'Tú' : 'Agente'}
                  <span style={{ marginLeft: '8px', fontSize: '0.75rem' }}>
                    {new Date(msg.timestamp).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <div style={{ fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                  {msg.texto}
                </div>
              </div>
            </div>
          ))}
        </div>

        {error && (
          <div className="alert alert-danger py-1" style={{ fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={enviarMensaje} className="mt-2">
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              placeholder="Escribe tu pregunta para el agente..."
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              disabled={cargando}
            />
            <button className="btn btn-primary" type="submit" disabled={cargando}>
              {cargando ? (
                <>
                  <i className="fas fa-spinner fa-spin me-1" /> Enviando
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-1" /> Enviar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AIAdminChat;


