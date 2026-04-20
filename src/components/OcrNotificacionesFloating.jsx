import React, { useEffect, useState, useCallback } from 'react';
import './OcrNotificacionesFloating.css';
import { getApiUrl } from '../config/apiConfig';
import AuthService from '../services/authService';

const OcrNotificacionesFloating = () => {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagenes, setImagenes] = useState({});
  const [mostrarImagen, setMostrarImagen] = useState({});
  const [hijosRemitentes, setHijosRemitentes] = useState({}); // { itemId: [hijos] }
  const [buscandoHijos, setBuscandoHijos] = useState({}); // { itemId: true/false }

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

  const buscarHijosRemitente = useCallback(async (itemId, telefono, ci) => {
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      
      const params = new URLSearchParams();
      if (telefono) params.append('telefono', telefono);
      if (ci) params.append('ci', ci);
      
      console.log('📞 Llamando a buscar-hijos-remitente:', {
        url: `${apiUrl}/ocr-comprobantes/buscar-hijos-remitente?${params.toString()}`,
        telefono,
        ci,
        apiUrl,
        rol: user?.rol
      });
      
      if (params.toString()) {
        const url = `${apiUrl}/ocr-comprobantes/buscar-hijos-remitente?${params.toString()}`;
        
        let resp;
        try {
          // Usar AbortController con timeout más largo para esta petición específica
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 segundos
          
          resp = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
        } catch (fetchError) {
          console.error('❌ Error de conexión al buscar hijos:', fetchError);
          // Si es un error de aborto por timeout, intentar una vez más sin timeout
          if (fetchError.name === 'AbortError') {
            console.log('⏱️ Timeout, intentando nuevamente sin timeout...');
            try {
              resp = await fetch(url, {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (retryError) {
              console.error('❌ Error en reintento:', retryError);
              // Marcar como buscado con array vacío para evitar reintentos
              setHijosRemitentes(prev => ({ ...prev, [itemId]: [] }));
              return;
            }
          } else {
            // Marcar como buscado con array vacío para evitar reintentos
            setHijosRemitentes(prev => ({ ...prev, [itemId]: [] }));
            return;
          }
        }
        
        console.log('📥 Respuesta buscar hijos:', {
          status: resp.status,
          ok: resp.ok,
          statusText: resp.statusText
        });
        
        if (resp.ok) {
          const data = await resp.json();
          console.log('📦 Datos recibidos:', {
            ok: data.ok,
            cantidadHijos: data.hijos?.length || 0,
            hijos: data.hijos
          });
          
          if (data.ok && data.hijos) {
            setHijosRemitentes(prev => {
              // Si ya se buscaron los hijos para este item, no actualizar
              if (prev[itemId]) {
                console.log('⚠️ Ya se buscaron hijos para este item, no actualizar');
                return prev;
              }
              console.log('✅ Guardando hijos encontrados:', data.hijos.length);
              return {
                ...prev,
                [itemId]: data.hijos
              };
            });
          } else {
            console.log('⚠️ No se encontraron hijos o respuesta inválida');
            // Marcar como buscado con array vacío
            setHijosRemitentes(prev => ({ ...prev, [itemId]: [] }));
          }
        } else {
          const errorText = await resp.text();
          console.error('❌ Error en respuesta:', resp.status, errorText);
          // Marcar como buscado con array vacío para evitar reintentos
          setHijosRemitentes(prev => ({ ...prev, [itemId]: [] }));
        }
      } else {
        console.warn('⚠️ No hay parámetros para buscar (ni teléfono ni CI)');
        // Marcar como buscado con array vacío
        setHijosRemitentes(prev => ({ ...prev, [itemId]: [] }));
      }
    } catch (e) {
      console.error('❌ Error al buscar hijos del remitente:', e);
      // Marcar como buscado con array vacío para evitar reintentos
      setHijosRemitentes(prev => ({ ...prev, [itemId]: [] }));
    }
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      const resp = await fetch(`${apiUrl}/ocr-comprobantes?estado=pendiente`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('No se pudo cargar las notificaciones OCR');
      const data = await resp.json();
      setItems(data.items || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchItems();
  }, [open]);

  // Buscar hijos del remitente cuando se muestra la imagen
  useEffect(() => {
    items.forEach((item) => {
      const itemId = item.id;
      const estaMostrandoImagen = mostrarImagen[itemId];
      const imagenCargada = imagenes[itemId];
      const yaSeBuscaronHijos = hijosRemitentes[itemId] !== undefined;
      const estaBuscando = buscandoHijos[itemId];
      
      if (estaMostrandoImagen && imagenCargada && !yaSeBuscaronHijos && !estaBuscando) {
        const datos = item.datos || {};
        const remit = parseRemitenteDesdeObservaciones(datos.observaciones);
        const telefono = remit.telefono || item.numero_remitente;
        const ci = remit.ci;
        
        console.log('🔍 Buscando hijos para comprobante:', {
          itemId,
          telefono,
          ci,
          tieneTelefono: !!telefono,
          tieneCI: !!ci,
          remitenteCompleto: remit
        });
        
        if (telefono || ci) {
          setBuscandoHijos(prev => ({ ...prev, [itemId]: true }));
          buscarHijosRemitente(itemId, telefono, ci).finally(() => {
            setBuscandoHijos(prev => {
              const nuevo = { ...prev };
              delete nuevo[itemId];
              return nuevo;
            });
          });
        } else {
          // Marcar como buscado aunque no haya datos para evitar búsquedas repetidas
          setHijosRemitentes(prev => ({ ...prev, [itemId]: [] }));
        }
      }
    });
  }, [mostrarImagen, imagenes, items, buscarHijosRemitente]);

  const cargarImagen = async (id) => {
    if (imagenes[id]) return;
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      const resp = await fetch(`${apiUrl}/ocr-comprobantes/${id}/imagen`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!resp.ok) throw new Error('No se pudo obtener la imagen');
      const data = await resp.json();
      setImagenes((prev) => ({ ...prev, [id]: `data:${data.mimetype};base64,${data.base64}` }));
    } catch (e) {
      setError(e.message);
    }
  };

  const marcarRevisado = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      const resp = await fetch(`${apiUrl}/ocr-comprobantes/${id}/revisar`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ observaciones: 'Revisado en panel de caja' })
      });
      if (!resp.ok) throw new Error('No se pudo actualizar el estado');
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      setError(e.message);
    }
  };

  const eliminarTodos = async () => {
    const confirmar = window.confirm(
      '⚠️ ¿Está seguro que desea eliminar TODOS los comprobantes?\n\n' +
      'Esta acción no se puede deshacer. Se eliminarán todos los comprobantes (pendientes y revisados).'
    );
    
    if (!confirmar) return;

    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ocr-comprobantes', user?.rol);
      const resp = await fetch(`${apiUrl}/ocr-comprobantes/todos`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      if (!resp.ok) throw new Error('No se pudieron eliminar los comprobantes');
      
      const data = await resp.json();
      alert(`✅ ${data.message || 'Comprobantes eliminados correctamente'}`);
      setItems([]);
      setImagenes({});
      setMostrarImagen({});
    } catch (e) {
      setError(e.message);
      alert(`❌ Error: ${e.message}`);
    }
  };

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <>
      <button 
        className="ocr-floating-button" 
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }} 
        title="Notificaciones OCR"
        type="button"
      >
        <i className="fas fa-bell"></i>
        {items.length > 0 && <span className="ocr-badge">{items.length}</span>}
      </button>

      {open && (
        <div 
          className="ocr-modal-backdrop" 
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setOpen(false);
            }
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              e.preventDefault();
            }
          }}
        >
          <div className="ocr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ocr-modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="fas fa-bell"></i>
                <div>
                  <h5 style={{ margin: 0 }}>Notificaciones de comprobantes</h5>
                  <small>{items.length} pendientes</small>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="ocr-btn neutral" onClick={fetchItems} disabled={loading}>
                  <i className="fas fa-sync-alt"></i> Refrescar
                </button>
                <button 
                  className="ocr-btn danger" 
                  onClick={eliminarTodos}
                  title="Eliminar todos los comprobantes (útil para pruebas)"
                >
                  <i className="fas fa-trash-alt"></i> Eliminar todos
                </button>
                <button className="ocr-btn neutral" onClick={() => setOpen(false)}>
                  <i className="fas fa-times"></i> Cerrar
                </button>
              </div>
            </div>

            <div className="ocr-modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              {loading && <div className="ocr-empty">Cargando...</div>}
              {!loading && items.length === 0 && <div className="ocr-empty">Sin notificaciones pendientes</div>}

              {!loading && items.map((item) => (
                <div key={item.id} className="ocr-card">
                  <div className="ocr-card-header">
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span className={`ocr-chip ${item.estado}`}>{item.estado}</span>
                      <small>{new Date(item.creado_en).toLocaleString('es-BO')}</small>
                    </div>
                    <small>Remitente: {item.numero_remitente || 'N/D'}</small>
                  </div>

                  {(() => {
                    const datos = item.datos || {};
                    const remit = parseRemitenteDesdeObservaciones(datos.observaciones);
                    const cuentaOrigen = datos.cuenta_origen_detectado || datos.emisor_detectado || null;
                    const cuentaDestino = datos.cuenta_destino_detectado || datos.receptor_detectado || null;
                    const showImg = !!mostrarImagen[item.id];
                    const imgReady = !!imagenes[item.id];

                    return (
                      <>
                        <div className="ocr-card-grid">
                          <div className="ocr-panel ocr-panel-data">
                            <div className="ocr-panel-header">
                              <div className="ocr-panel-title">
                                <i className="fas fa-file-invoice-dollar"></i>
                                Información del comprobante
                              </div>
                            </div>
                            <div className="ocr-panel-body">
                              <div className="ocr-kv">
                                <div className="k">
                                  <i className="fas fa-university"></i> Banco
                                </div>
                                <div className={`v ${datos.banco_detectado ? 'success' : 'muted'}`}>
                                  {datos.banco_detectado || 'No detectado'}
                                </div>

                                <div className="k">
                                  <i className="fas fa-money-bill-wave"></i> Monto
                                </div>
                                <div className={`v ${datos.monto_detectado ? 'success' : 'muted'}`}>
                                  {datos.monto_detectado ? (
                                    <span className="ocr-monto">
                                      {datos.monto_detectado} <span className="ocr-moneda">{datos.moneda || 'BOB'}</span>
                                    </span>
                                  ) : (
                                    'No detectado'
                                  )}
                                </div>

                                <div className="k">
                                  <i className="fas fa-calendar-alt"></i> Fecha
                                </div>
                                <div className={`v ${datos.fecha_detectada ? 'success' : 'muted'}`}>
                                  {datos.fecha_detectada || 'No detectada'}
                                </div>

                                <div className="k">
                                  <i className="fas fa-hashtag"></i> Nro/Ref
                                </div>
                                <div className={`v ${datos.numero_comprobante_detectado ? 'success' : 'muted'}`}>
                                  {datos.numero_comprobante_detectado || 'No detectado'}
                                </div>

                                <div className="k">
                                  <i className="fas fa-user-arrow-up"></i> Cuenta origen
                                </div>
                                <div className={`v ${cuentaOrigen ? 'success' : 'muted'}`}>
                                  {cuentaOrigen || 'No detectada'}
                                </div>

                                <div className="k">
                                  <i className="fas fa-user-arrow-down"></i> Cuenta destino
                                </div>
                                <div className={`v ${cuentaDestino ? 'success' : 'muted'}`}>
                                  {cuentaDestino || 'No detectada'}
                                </div>

                                <div className="k">
                                  <i className="fas fa-shield-alt"></i> Confianza
                                </div>
                                <div className="v">
                                  <span className={`ocr-badge-confianza ${datos.confianza_extraccion || 'baja'}`}>
                                    {datos.confianza_extraccion || 'baja'}
                                  </span>
                                </div>
                              </div>

                              {(remit?.nombre || remit?.ci || remit?.telefono || remit?.descripcionMonto) && (
                                <div className="ocr-section-divider">
                                  <div className="ocr-section-title">
                                    <i className="fas fa-user-circle"></i>
                                    Datos del remitente
                                  </div>
                                  <div className="ocr-kv">
                                    <div className="k">
                                      <i className="fas fa-id-card"></i> Nombre
                                    </div>
                                    <div className={`v ${remit.nombre ? 'success' : 'muted'}`}>
                                      {remit.nombre || 'N/D'}
                                    </div>
                                    <div className="k">
                                      <i className="fas fa-fingerprint"></i> CI/NIT
                                    </div>
                                    <div className={`v ${remit.ci ? 'success' : 'muted'}`}>
                                      {remit.ci || 'N/D'}
                                    </div>
                                    <div className="k">
                                      <i className="fas fa-phone"></i> Teléfono
                                    </div>
                                    <div className={`v ${remit.telefono ? 'success' : 'muted'}`}>
                                      {remit.telefono || 'N/D'}
                                    </div>
                                    {remit.descripcionMonto && (
                                      <>
                                        <div className="k">
                                          <i className="fas fa-comment-alt"></i> Descripción
                                        </div>
                                        <div className="v success" style={{ fontStyle: 'italic', fontWeight: 600 }}>
                                          {remit.descripcionMonto}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="ocr-panel ocr-panel-image">
                            <div className="ocr-panel-header">
                              <div className="ocr-panel-title">
                                <i className="fas fa-receipt"></i>
                                Comprobante
                              </div>
                              <button
                                className="ocr-btn-icon"
                                onClick={async () => {
                                  const next = !showImg;
                                  setMostrarImagen((p) => ({ ...p, [item.id]: next }));
                                  if (next) await cargarImagen(item.id);
                                }}
                                title={showImg ? 'Ocultar imagen' : 'Mostrar imagen'}
                              >
                                <i className={`fas fa-${showImg ? 'eye-slash' : 'eye'}`}></i>
                              </button>
                            </div>
                            <div className="ocr-panel-body">
                              {showImg ? (
                                imgReady ? (
                                  <>
                                    <div className="ocr-image-preview">
                                      {item.mimetype === 'application/pdf' ? (
                                        <iframe src={imagenes[item.id]} title={`pdf-${item.id}`} />
                                      ) : (
                                        <img src={imagenes[item.id]} alt="Comprobante" />
                                      )}
                                    </div>
                                    {/* Información de hijos del remitente debajo de la imagen */}
                                    {(() => {
                                      const hijos = hijosRemitentes[item.id];
                                      const estaBuscando = buscandoHijos[item.id];
                                      const yaSeBuscaron = hijos !== undefined;
                                      
                                      // Mostrar loading si está buscando
                                      if (estaBuscando) {
                                        return (
                                          <div style={{
                                            marginTop: '15px',
                                            padding: '12px',
                                            backgroundColor: '#f8f9fa',
                                            borderRadius: '6px',
                                            border: '1px solid #dee2e6',
                                            textAlign: 'center'
                                          }}>
                                            <i className="fas fa-spinner fa-spin" style={{ color: '#667eea', marginRight: '8px' }}></i>
                                            <span style={{ color: '#6c757d', fontSize: '14px' }}>Buscando hijos del remitente...</span>
                                          </div>
                                        );
                                      }
                                      
                                      // Mostrar resultados si ya se buscaron
                                      if (yaSeBuscaron) {
                                        if (hijos && hijos.length > 0) {
                                          return (
                                            <div style={{
                                              marginTop: '15px',
                                              padding: '12px',
                                              backgroundColor: '#f8f9fa',
                                              borderRadius: '6px',
                                              border: '1px solid #dee2e6'
                                            }}>
                                              <div style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '8px',
                                                marginBottom: '10px',
                                                fontWeight: 600,
                                                color: '#495057',
                                                fontSize: '14px'
                                              }}>
                                                <i className="fas fa-users" style={{ color: '#667eea' }}></i>
                                                <span>Hijos del remitente ({hijos.length})</span>
                                              </div>
                                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {hijos.map((hijo, idx) => (
                                                  <div key={hijo.id || idx} style={{
                                                    padding: '8px',
                                                    backgroundColor: '#fff',
                                                    borderRadius: '4px',
                                                    border: '1px solid #e9ecef'
                                                  }}>
                                                    <div style={{ fontWeight: 600, color: '#212529', marginBottom: '4px' }}>
                                                      <i className="fas fa-user-graduate" style={{ color: '#667eea', marginRight: '6px' }}></i>
                                                      {hijo.nombre}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#6c757d', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                      {hijo.ci && (
                                                        <span>
                                                          <i className="fas fa-id-card" style={{ marginRight: '4px' }}></i>
                                                          CI: {hijo.ci}
                                                        </span>
                                                      )}
                                                      {hijo.nivel && hijo.nivel !== 'Sin nivel' && (
                                                        <span>
                                                          <i className="fas fa-layer-group" style={{ marginRight: '4px' }}></i>
                                                          {hijo.nivel}
                                                        </span>
                                                      )}
                                                      {hijo.curso && hijo.curso !== 'Sin curso' && (
                                                        <span>
                                                          <i className="fas fa-book" style={{ marginRight: '4px' }}></i>
                                                          {hijo.curso}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        } else {
                                          // No se encontraron hijos
                                          return (
                                            <div style={{
                                              marginTop: '15px',
                                              padding: '12px',
                                              backgroundColor: '#fff3cd',
                                              borderRadius: '6px',
                                              border: '1px solid #ffc107',
                                              textAlign: 'center'
                                            }}>
                                              <i className="fas fa-info-circle" style={{ color: '#856404', marginRight: '8px' }}></i>
                                              <span style={{ color: '#856404', fontSize: '14px' }}>
                                                No se encontraron hijos registrados para este remitente
                                              </span>
                                            </div>
                                          );
                                        }
                                      }
                                      
                                      // No mostrar nada si aún no se ha buscado
                                      return null;
                                    })()}
                                  </>
                                ) : (
                                  <div className="ocr-loading">
                                    <i className="fas fa-spinner fa-spin"></i>
                                    <span>Cargando imagen...</span>
                                  </div>
                                )
                              ) : (
                                <div className="ocr-placeholder">
                                  <i className="fas fa-image"></i>
                                  <span>Haga clic en el ícono del ojo para ver la imagen</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="ocr-actions">
                          <button
                            className="ocr-btn neutral"
                            onClick={async () => {
                              const next = !showImg;
                              setMostrarImagen((p) => ({ ...p, [item.id]: next }));
                              if (next) await cargarImagen(item.id);
                            }}
                          >
                            <i className={`fas fa-${showImg ? 'eye-slash' : 'eye'}`}></i>
                            {showImg ? 'Ocultar imagen' : 'Ver imagen'}
                          </button>
                          <button className="ocr-btn primary" onClick={() => marcarRevisado(item.id)}>
                            <i className="fas fa-check-circle"></i>
                            Marcar como revisado
                          </button>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OcrNotificacionesFloating;
