import React, { useState, useEffect } from 'react';
import { BACKEND_PRINCIPAL } from '../../../config/apiConfig';

const BASE = BACKEND_PRINCIPAL.replace(/\/api\/?$/, '');

const TIPO_CONFIG = {
  ausencia:  { color: 'danger',  icon: 'fa-user-slash',   label: 'Ausencia' },
  aviso:     { color: 'warning', icon: 'fa-bullhorn',      label: 'Aviso' },
  horario:   { color: 'info',    icon: 'fa-clock',         label: 'Horario' },
  evento:    { color: 'primary', icon: 'fa-calendar-star', label: 'Evento' },
  otro:      { color: 'secondary', icon: 'fa-sticky-note', label: 'Otro' },
};

function MemoriasAgente() {
  const [memorias, setMemorias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [form, setForm] = useState({ contenido: '', tipo: '', fecha_fin: '' });
  const [msg, setMsg] = useState({ texto: '', tipo: '' });

  const token = () => localStorage.getItem('token');

  const cargar = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${BASE}/api/agente-memorias`, {
        headers: { Authorization: `Bearer ${token()}` },
      });
      const d = await r.json();
      setMemorias(d.memorias || []);
    } catch { setMemorias([]); }
    finally { setLoading(false); }
  };

  useEffect(() => { cargar(); }, []);

  const notify = (texto, tipo = 'success') => {
    setMsg({ texto, tipo });
    setTimeout(() => setMsg({ texto: '', tipo: '' }), 4000);
  };

  const guardar = async () => {
    if (!form.contenido.trim()) return notify('Escribe un aviso para el agente', 'danger');
    setGuardando(true);
    try {
      const r = await fetch(`${BASE}/api/agente-memorias`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` },
        body: JSON.stringify({ ...form, fecha_fin: form.fecha_fin || null }),
      });
      const d = await r.json();
      if (d.ok) {
        notify('✅ Aviso guardado. El agente lo recordará.');
        setShowForm(false);
        setForm({ contenido: '', tipo: '', fecha_fin: '' });
        cargar();
      } else { notify(d.message || 'Error al guardar', 'danger'); }
    } catch { notify('Error de conexión', 'danger'); }
    finally { setGuardando(false); }
  };

  const desactivar = async (id) => {
    if (!confirm('¿Desactivar este aviso? El agente dejará de usarlo.')) return;
    await fetch(`${BASE}/api/agente-memorias/${id}/desactivar`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token()}` },
    });
    notify('Aviso desactivado');
    cargar();
  };

  const eliminar = async (id) => {
    if (!confirm('¿Eliminar permanentemente este aviso?')) return;
    await fetch(`${BASE}/api/agente-memorias/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token()}` },
    });
    notify('Aviso eliminado');
    cargar();
  };

  const activas   = memorias.filter(m => m.activa);
  const inactivas = memorias.filter(m => !m.activa);

  return (
    <div className="container-fluid py-4">
      {/* Notificación */}
      {msg.texto && (
        <div className={`alert alert-${msg.tipo} alert-dismissible fade show position-fixed`}
          style={{ top: 20, right: 20, zIndex: 9999, minWidth: 320 }}>
          {msg.texto}
          <button className="btn-close" onClick={() => setMsg({ texto: '', tipo: '' })} />
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">
              <i className="fas fa-brain me-2" />
              Memoria del Agente Inteligente
            </h5>
            <small className="opacity-75">
              Avisos que el agente recordará al responder preguntas en WhatsApp y el panel
            </small>
          </div>
          <button className="btn btn-light btn-sm" onClick={() => setShowForm(s => !s)}>
            <i className="fas fa-plus me-1" />
            Nuevo Aviso
          </button>
        </div>

        {/* Formulario */}
        {showForm && (
          <div className="card-body border-bottom bg-light">
            <h6 className="fw-bold mb-3">
              <i className="fas fa-pen me-2 text-primary" />
              Decirle algo al agente para que lo recuerde
            </h6>

            <div className="alert alert-info py-2 mb-3">
              <i className="fas fa-lightbulb me-2" />
              <strong>Ejemplos:</strong><br />
              <span className="text-muted small">
                • "La cajera no estará disponible hoy, estará mañana el 21 de mayo"<br />
                • "La directora está de viaje hasta el viernes"<br />
                • "Mañana no hay clases por feriado nacional"<br />
                • "La reunión de padres será el sábado a las 10:00 AM"
              </span>
            </div>

            <div className="row g-3">
              <div className="col-12">
                <label className="form-label fw-semibold">Aviso para el agente *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Escribe lo que quieres que el agente recuerde y use al responder preguntas..."
                  value={form.contenido}
                  onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
                />
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Tipo (opcional)</label>
                <select className="form-select" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option value="">Detectar automáticamente</option>
                  <option value="ausencia">Ausencia de personal</option>
                  <option value="aviso">Aviso general</option>
                  <option value="horario">Cambio de horario</option>
                  <option value="evento">Evento / Actividad</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="col-md-6">
                <label className="form-label fw-semibold">Válido hasta (opcional)</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={form.fecha_fin}
                  onChange={e => setForm(f => ({ ...f, fecha_fin: e.target.value }))}
                />
                <small className="text-muted">Vacío = sin vencimiento automático</small>
              </div>
            </div>

            <div className="mt-3 d-flex gap-2">
              <button className="btn btn-primary" onClick={guardar} disabled={guardando}>
                {guardando ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="fas fa-save me-2" />}
                Guardar aviso
              </button>
              <button className="btn btn-outline-secondary" onClick={() => setShowForm(false)}>
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" />
              <p className="mt-2 text-muted">Cargando avisos...</p>
            </div>
          ) : (
            <>
              {/* Avisos activos */}
              <h6 className="fw-bold text-success mb-3">
                <i className="fas fa-check-circle me-2" />
                Avisos Activos ({activas.length})
                <span className="ms-2 badge bg-success">{activas.length}</span>
              </h6>

              {activas.length === 0 ? (
                <div className="alert alert-secondary">
                  <i className="fas fa-info-circle me-2" />
                  No hay avisos activos. El agente responderá solo con información del sistema.
                </div>
              ) : (
                <div className="row g-3 mb-4">
                  {activas.map(m => {
                    const cfg = TIPO_CONFIG[m.tipo] || TIPO_CONFIG.otro;
                    const vence = m.fecha_fin ? new Date(m.fecha_fin).toLocaleString('es-BO') : null;
                    return (
                      <div key={m.id} className="col-12">
                        <div className={`card border-${cfg.color} border-start border-4`}>
                          <div className="card-body py-2 px-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="flex-grow-1">
                                <span className={`badge bg-${cfg.color} me-2 mb-1`}>
                                  <i className={`fas ${cfg.icon} me-1`} />
                                  {cfg.label}
                                </span>
                                {vence && (
                                  <span className="badge bg-light text-dark me-2 mb-1">
                                    <i className="fas fa-calendar me-1" />
                                    Hasta {vence}
                                  </span>
                                )}
                                <p className="mb-0 mt-1">{m.contenido}</p>
                                <small className="text-muted">
                                  Guardado el {new Date(m.creado_en).toLocaleString('es-BO')}
                                </small>
                              </div>
                              <div className="ms-3 d-flex gap-1 flex-shrink-0">
                                <button
                                  className="btn btn-sm btn-outline-warning"
                                  title="Desactivar (el agente ya no lo usará)"
                                  onClick={() => desactivar(m.id)}
                                >
                                  <i className="fas fa-pause" />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  title="Eliminar permanentemente"
                                  onClick={() => eliminar(m.id)}
                                >
                                  <i className="fas fa-trash" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Avisos inactivos */}
              {inactivas.length > 0 && (
                <>
                  <hr />
                  <h6 className="fw-bold text-secondary mb-3">
                    <i className="fas fa-history me-2" />
                    Avisos Inactivos / Expirados ({inactivas.length})
                  </h6>
                  <div className="row g-2">
                    {inactivas.slice(0, 10).map(m => {
                      const cfg = TIPO_CONFIG[m.tipo] || TIPO_CONFIG.otro;
                      return (
                        <div key={m.id} className="col-12">
                          <div className="card bg-light opacity-75">
                            <div className="card-body py-2 px-3">
                              <div className="d-flex justify-content-between align-items-center">
                                <div>
                                  <span className="badge bg-secondary me-2">{cfg.label}</span>
                                  <span className="text-muted small">{m.contenido}</span>
                                </div>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => eliminar(m.id)}>
                                  <i className="fas fa-trash" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Guía de uso */}
      <div className="card mt-4 border-info">
        <div className="card-header bg-info text-white">
          <i className="fas fa-question-circle me-2" />
          ¿Cómo funciona la Memoria del Agente?
        </div>
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <div className="text-center p-3">
                <i className="fas fa-pen-alt fa-2x text-primary mb-2" />
                <h6>1. Tú le avisas</h6>
                <p className="text-muted small">
                  Escribes aquí: <em>"La cajera no estará hoy, estará disponible mañana"</em>
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3">
                <i className="fas fa-brain fa-2x text-success mb-2" />
                <h6>2. El agente lo recuerda</h6>
                <p className="text-muted small">
                  El agente carga todos los avisos activos cada vez que alguien le escribe
                </p>
              </div>
            </div>
            <div className="col-md-4">
              <div className="text-center p-3">
                <i className="fab fa-whatsapp fa-2x text-success mb-2" />
                <h6>3. Responde correctamente</h6>
                <p className="text-muted small">
                  Si alguien pregunta "¿está la cajera?", el agente responde usando tu aviso
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MemoriasAgente;
