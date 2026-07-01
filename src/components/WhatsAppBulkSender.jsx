import React, { useState, useEffect, useRef } from 'react';
import { BACKEND_PRINCIPAL } from '../config/apiConfig';

const BACKEND_PRINCIPAL_ORIGIN = BACKEND_PRINCIPAL.replace(/\/api\/?$/, '');

function WhatsAppBulkSender({ isOpen, onClose, items = [], processItem }) {
  const [whatsappStatus, setWhatsappStatus] = useState({ isReady: false, qrCode: null, qrImage: null });
  const [showQR, setShowQR] = useState(false);
  
  const [status, setStatus] = useState('idle'); // idle, running, paused, completed
  const [results, setResults] = useState([]); // array of { id, name, status: 'pending'|'success'|'error', errorMsg: '' }
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCanceled, setIsCanceled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Refs para controlar asincronía en el loop
  const pausedRef = useRef(false);
  const canceledRef = useRef(false);

  useEffect(() => {
    pausedRef.current = isPaused;
  }, [isPaused]);

  useEffect(() => {
    canceledRef.current = isCanceled;
  }, [isCanceled]);

  useEffect(() => {
    if (isOpen) {
      checkWhatsAppStatus();
      // Inicializar resultados
      setResults(items.map((it, idx) => ({
        index: idx,
        item: it,
        name: it.nombre || `Destinatario ${idx + 1}`,
        status: 'pending',
        errorMsg: ''
      })));
      setStatus('idle');
      setCurrentIndex(0);
      setIsCanceled(false);
      setIsPaused(false);
    }
  }, [isOpen, items]);

  const checkWhatsAppStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/whatsapp/status`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setWhatsappStatus(data);
      
      if (!data.isReady && (data.qrCode || data.qrImage)) {
        setShowQR(true);
      }
    } catch (error) {
      console.error('Error al verificar estado de WhatsApp:', error);
    }
  };

  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const startSending = async () => {
    if (!whatsappStatus.isReady) {
      alert('WhatsApp no está listo. Por favor escanea el código QR primero.');
      return;
    }
    
    setStatus('running');
    setIsPaused(false);
    setIsCanceled(false);

    let currIdx = currentIndex;

    while (currIdx < items.length) {
      // Check cancellation
      if (canceledRef.current) {
        setStatus('idle');
        break;
      }

      // Check pause
      while (pausedRef.current) {
        if (canceledRef.current) break;
        await delay(500); // Polling si está pausado
      }
      if (canceledRef.current) break;

      setCurrentIndex(currIdx);
      const currentItem = items[currIdx];

      // Marcar como procesando
      updateResult(currIdx, { status: 'processing' });

      try {
        // 1. Procesar item (Generar PDF y datos)
        const { blob, fileName, message, phoneNumber } = await processItem(currentItem);

        if (!phoneNumber) {
          throw new Error('Sin número de teléfono');
        }

        // 2. Subir PDF
        const token = localStorage.getItem('token');
        const formData = new FormData();
        formData.append('pdf', blob, fileName || `documento_${currIdx}.pdf`);

        const uploadResponse = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/upload/upload-pdf`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` },
          body: formData
        });
        const uploadData = await uploadResponse.json();
        if (!uploadData.success) throw new Error(uploadData.error || 'Fallo al subir PDF');

        // 3. Enviar WhatsApp
        const sendResponse = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/whatsapp/send-pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            phoneNumber: phoneNumber.trim(),
            pdfPath: uploadData.filePath,
            message: message || ''
          })
        });
        const sendData = await sendResponse.json();
        if (!sendData.success) throw new Error(sendData.error || 'Fallo al enviar mensaje');

        updateResult(currIdx, { status: 'success' });

      } catch (error) {
        updateResult(currIdx, { status: 'error', errorMsg: error.message });
      }

      currIdx++;
      
      // Delay obligatorio entre mensajes (ej. 4 segundos) para no ser baneado
      if (currIdx < items.length && !canceledRef.current) {
        await delay(4000); 
      }
    }

    if (!canceledRef.current && currIdx >= items.length) {
      setStatus('completed');
      setCurrentIndex(currIdx);
    }
  };

  const updateResult = (idx, newData) => {
    setResults(prev => prev.map((r, i) => i === idx ? { ...r, ...newData } : r));
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
    if (!isPaused) {
      setStatus('paused');
    } else {
      setStatus('running');
    }
  };

  const handleCancel = () => {
    setIsCanceled(true);
  };

  if (!isOpen) return null;

  const total = items.length;
  const processedCount = currentIndex;
  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;
  const progressPercent = total > 0 ? (processedCount / total) * 100 : 0;

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Encabezado */}
            <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #128C7E 0%, #075E54 100%)', borderBottom: 'none', padding: '20px 24px' }}>
              <div className="d-flex align-items-center w-100">
                <div className="bg-white text-success rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '48px', height: '48px', fontSize: '24px' }}>
                  <i className="fas fa-bullhorn"></i>
                </div>
                <div className="flex-grow-1">
                  <h4 className="modal-title fw-bold mb-0" style={{ letterSpacing: '0.5px' }}>Notificador Masivo WhatsApp</h4>
                  <p className="mb-0 text-white-50" style={{ fontSize: '0.85rem' }}>Envío en lote a {total} destinatarios</p>
                </div>
                <button type="button" className="btn-close btn-close-white opacity-75 hover-opacity-100" onClick={onClose} disabled={status === 'running'} aria-label="Close"></button>
              </div>
            </div>
            
            <div className="modal-body p-4" style={{ backgroundColor: '#f0f2f5' }}>
              
              {/* Status de Conexión */}
              <div className="d-flex justify-content-between align-items-center bg-white p-3 rounded shadow-sm mb-4">
                <div className="d-flex align-items-center gap-3">
                  <span className="fw-semibold text-secondary">Estado de Conexión:</span>
                  {whatsappStatus.isReady ? (
                    <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2 fs-6">
                      <i className="fas fa-check-circle me-1"></i> Vinculado
                    </span>
                  ) : (
                    <span className="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-3 py-2 fs-6">
                      <i className="fas fa-exclamation-triangle me-1"></i> Desconectado
                    </span>
                  )}
                </div>
                <button className="btn btn-sm btn-outline-secondary rounded-pill px-3" onClick={checkWhatsAppStatus} disabled={status === 'running'}>
                  <i className="fas fa-sync-alt me-1"></i> Actualizar
                </button>
              </div>

              {/* Mostrar QR si desconectado */}
              {showQR && (whatsappStatus.qrImage || whatsappStatus.qrCode) && !whatsappStatus.isReady && (
                <div className="card border-warning mb-4 shadow-sm" style={{ borderRadius: '12px' }}>
                  <div className="card-body text-center p-4">
                    <h6 className="text-warning-emphasis fw-bold mb-3"><i className="fas fa-qrcode me-2"></i>Vincula tu WhatsApp</h6>
                    {whatsappStatus.qrImage ? (
                      <div className="bg-white p-2 d-inline-block rounded shadow-sm mb-3">
                        <img src={whatsappStatus.qrImage} alt="QR Code WhatsApp" style={{ width: '200px', height: '200px' }} />
                      </div>
                    ) : (
                      <div className="text-danger my-4"><i className="fas fa-exclamation-circle me-2"></i>Error cargando QR.</div>
                    )}
                    <p className="text-muted small mb-0">Abre WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo</p>
                  </div>
                </div>
              )}

              {/* Panel de Progreso */}
              <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                <div className="card-body p-4">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="fw-bold text-dark mb-0">Progreso del Envío</h6>
                    <span className="badge bg-primary rounded-pill px-3">{processedCount} / {total}</span>
                  </div>
                  
                  <div className="progress mb-3" style={{ height: '12px', borderRadius: '6px' }}>
                    <div 
                      className={`progress-bar progress-bar-striped ${status === 'running' ? 'progress-bar-animated' : ''} bg-success`} 
                      role="progressbar" 
                      style={{ width: `${progressPercent}%` }} 
                      aria-valuenow={progressPercent} aria-valuemin="0" aria-valuemax="100"
                    ></div>
                  </div>

                  <div className="d-flex justify-content-between text-muted small fw-semibold">
                    <span><i className="fas fa-check-circle text-success me-1"></i> {successCount} Exitosos</span>
                    <span><i className="fas fa-times-circle text-danger me-1"></i> {errorCount} Errores</span>
                    <span><i className="fas fa-hourglass-half text-warning me-1"></i> {total - processedCount} Pendientes</span>
                  </div>
                </div>
              </div>

              {/* Lista Detallada */}
              <div className="card border-0 shadow-sm" style={{ borderRadius: '12px', maxHeight: '300px', overflowY: 'auto' }}>
                <ul className="list-group list-group-flush">
                  {results.map((r, i) => (
                    <li key={i} className={`list-group-item d-flex justify-content-between align-items-center p-3 ${i === currentIndex && status === 'running' ? 'bg-light border-start border-4 border-primary' : ''}`}>
                      <div>
                        <span className="fw-semibold text-dark">{r.name}</span>
                        {r.errorMsg && <small className="d-block text-danger mt-1">{r.errorMsg}</small>}
                      </div>
                      <div>
                        {r.status === 'pending' && <span className="badge bg-secondary-subtle text-secondary border border-secondary-subtle">Pendiente</span>}
                        {r.status === 'processing' && <span className="badge bg-primary-subtle text-primary border border-primary-subtle"><i className="fas fa-spinner fa-spin me-1"></i> Procesando</span>}
                        {r.status === 'success' && <span className="badge bg-success-subtle text-success border border-success-subtle"><i className="fas fa-check"></i> Enviado</span>}
                        {r.status === 'error' && <span className="badge bg-danger-subtle text-danger border border-danger-subtle"><i className="fas fa-times"></i> Error</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

            </div>

            <div className="modal-footer bg-white border-top p-3 d-flex justify-content-between" style={{ borderRadius: '0 0 16px 16px' }}>
              <div>
                {status === 'running' || status === 'paused' ? (
                  <button type="button" className="btn btn-danger fw-bold rounded-pill px-4" onClick={handleCancel}>
                    <i className="fas fa-stop me-2"></i> Detener
                  </button>
                ) : (
                  <button type="button" className="btn btn-light fw-bold text-secondary rounded-pill px-4" onClick={onClose}>
                    {status === 'completed' ? 'Cerrar' : 'Cancelar'}
                  </button>
                )}
              </div>

              <div>
                {status === 'idle' && (
                  <button 
                    type="button" 
                    className="btn btn-success fw-bold px-4 py-2 rounded-pill shadow-sm"
                    onClick={startSending}
                    disabled={!whatsappStatus.isReady || total === 0}
                  >
                    <i className="fas fa-play me-2"></i> Iniciar Envío Masivo
                  </button>
                )}

                {(status === 'running' || status === 'paused') && (
                  <button 
                    type="button" 
                    className={`btn ${isPaused ? 'btn-success' : 'btn-warning'} fw-bold px-4 py-2 rounded-pill shadow-sm`}
                    onClick={handlePauseResume}
                  >
                    {isPaused ? (
                      <><i className="fas fa-play me-2"></i> Reanudar</>
                    ) : (
                      <><i className="fas fa-pause me-2"></i> Pausar</>
                    )}
                  </button>
                )}

                {status === 'completed' && (
                  <button type="button" className="btn btn-primary fw-bold rounded-pill px-4 py-2 shadow-sm" onClick={onClose}>
                    <i className="fas fa-check-double me-2"></i> Finalizado
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default WhatsAppBulkSender;
