import React, { useState, useEffect } from 'react';
import { BACKEND_PRINCIPAL } from '../config/apiConfig';

const BACKEND_PRINCIPAL_ORIGIN = BACKEND_PRINCIPAL.replace(/\/api\/?$/, '');

function WhatsAppPDFSender({ isOpen, onClose, onSend, pdfBlob, studentName, fileName, defaultMessage, initialPhoneNumber }) {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState({ isReady: false, qrCode: null, qrImage: null });
  const [showQR, setShowQR] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState('');

  useEffect(() => {
    if (isOpen && pdfBlob) {
      if (initialPhoneNumber && !phoneNumber) {
        setPhoneNumber(String(initialPhoneNumber));
      }
      checkWhatsAppStatus();
      uploadPDF();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, pdfBlob, initialPhoneNumber]);

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

  const uploadPDF = async () => {
    if (!pdfBlob) return;

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      const safeStudentName = (studentName || 'documento').toString();
      const suggestedName = fileName
        ? fileName
        : `formulario_${safeStudentName.replace(/\s+/g, '_')}.pdf`;
      formData.append('pdf', pdfBlob, suggestedName);

      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/upload/upload-pdf`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        setUploadedFilePath(data.filePath);
      } else {
        throw new Error(data.error || 'Error al subir el PDF');
      }
    } catch (error) {
      console.error('Error al subir PDF:', error);
      // alert('Error al subir el PDF al servidor');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      alert('Por favor ingresa un número de teléfono');
      return;
    }

    if (!whatsappStatus.isReady) {
      alert('WhatsApp no está listo. Por favor escanea el código QR primero.');
      return;
    }

    if (!uploadedFilePath) {
      alert('El PDF aún no se ha subido al servidor. Por favor espera un momento.');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/whatsapp/send-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          phoneNumber: phoneNumber.trim(),
          pdfPath: uploadedFilePath,
          message: message || defaultMessage || `Aquí tienes el documento solicitado:`
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // alert('¡PDF enviado exitosamente por WhatsApp!');
        onClose();
        if (onSend) onSend();
      } else {
        alert('Error al enviar PDF: ' + (data.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error al enviar PDF:', error);
      alert('Error al enviar PDF. Verifica la conexión.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshStatus = () => {
    checkWhatsAppStatus();
  };

  if (!isOpen) return null;

  const activeMessage = message !== '' ? message : defaultMessage;

  return (
    <>
      <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
        <div className="modal-dialog modal-dialog-centered modal-lg">
          <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '16px', overflow: 'hidden' }}>
            
            {/* Encabezado estilo WhatsApp */}
            <div className="modal-header text-white" style={{ background: 'linear-gradient(135deg, #128C7E 0%, #075E54 100%)', borderBottom: 'none', padding: '20px 24px' }}>
              <div className="d-flex align-items-center w-100">
                <div className="bg-white text-success rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '48px', height: '48px', fontSize: '24px' }}>
                  <i className="fab fa-whatsapp"></i>
                </div>
                <div className="flex-grow-1">
                  <h4 className="modal-title fw-bold mb-0" style={{ letterSpacing: '0.5px' }}>Notificación Vía WhatsApp</h4>
                  <p className="mb-0 text-white-50" style={{ fontSize: '0.85rem' }}>{studentName ? `Para: ${studentName}` : 'Envío de documento'}</p>
                </div>
                <button type="button" className="btn-close btn-close-white opacity-75 hover-opacity-100" onClick={onClose} aria-label="Close"></button>
              </div>
            </div>
            
            <div className="modal-body p-0" style={{ backgroundColor: '#f0f2f5' }}>
              {/* Barra de estado */}
              <div className="d-flex justify-content-between align-items-center px-4 py-2 bg-white border-bottom shadow-sm">
                <div className="d-flex gap-4">
                  {/* Status de Conexión */}
                  <div className="d-flex align-items-center">
                    <span className="text-secondary fw-semibold me-2" style={{ fontSize: '0.85rem' }}>Conexión:</span>
                    {whatsappStatus.isReady ? (
                      <span className="badge rounded-pill bg-success-subtle text-success border border-success-subtle px-3 py-2">
                        <i className="fas fa-check-circle me-1"></i> Conectado
                      </span>
                    ) : (
                      <span className="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle px-3 py-2">
                        <i className="fas fa-exclamation-triangle me-1"></i> Desconectado
                      </span>
                    )}
                  </div>
                  
                  {/* Status de Archivo */}
                  <div className="d-flex align-items-center">
                    <span className="text-secondary fw-semibold me-2" style={{ fontSize: '0.85rem' }}>Archivo:</span>
                    {uploadedFilePath ? (
                      <span className="badge rounded-pill bg-primary-subtle text-primary border border-primary-subtle px-3 py-2">
                        <i className="fas fa-cloud-upload-alt me-1"></i> Subido
                      </span>
                    ) : (
                      <span className="badge rounded-pill bg-secondary-subtle text-secondary border border-secondary-subtle px-3 py-2">
                        <i className="fas fa-spinner fa-spin me-1"></i> Procesando...
                      </span>
                    )}
                  </div>
                </div>
                <button className="btn btn-sm btn-light text-secondary rounded-circle" onClick={handleRefreshStatus} title="Actualizar estado" style={{ width: '32px', height: '32px', padding: 0 }}>
                  <i className="fas fa-sync-alt"></i>
                </button>
              </div>

              <div className="p-4">
                {/* Mostrar QR si es necesario */}
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
                      <p className="text-muted small mb-0">Abre WhatsApp en tu teléfono &gt; Dispositivos vinculados &gt; Vincular un dispositivo</p>
                    </div>
                  </div>
                )}

                <div className="row g-4">
                  {/* Columna Izquierda: Formulario */}
                  <div className="col-md-5">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px' }}>
                      <div className="card-body p-4">
                        <h6 className="fw-bold mb-4 text-dark"><i className="fas fa-paper-plane text-primary me-2"></i>Datos de Envío</h6>
                        
                        <div className="mb-4">
                          <label className="form-label text-muted fw-semibold small mb-1">Número de destino (Tutor)</label>
                          <div className="input-group">
                            <span className="input-group-text bg-light border-end-0 text-muted"><i className="fas fa-mobile-alt"></i></span>
                            <input
                              type="tel"
                              className="form-control border-start-0 ps-0 fw-bold"
                              placeholder="Ej: 70012345"
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              style={{ fontSize: '1.1rem' }}
                            />
                          </div>
                          <div className="form-text small opacity-75 mt-1">
                            <i className="fas fa-info-circle me-1"></i>
                            El código 591 se infiere si son 8 dígitos.
                          </div>
                        </div>

                        {/* Falso Adjunto */}
                        <div className="mt-auto">
                          <label className="form-label text-muted fw-semibold small mb-2">Documento Adjunto</label>
                          <div className="d-flex align-items-center p-3 border rounded bg-light" style={{ borderRadius: '10px' }}>
                            <div className="bg-danger text-white rounded d-flex align-items-center justify-content-center me-3 shadow-sm" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                              <i className="fas fa-file-pdf fs-5"></i>
                            </div>
                            <div className="text-truncate">
                              <h6 className="mb-0 text-dark fw-bold text-truncate" style={{ fontSize: '0.9rem' }}>{fileName || 'Reporte_Pagos.pdf'}</h6>
                              <small className="text-muted text-truncate d-block">{uploadedFilePath ? 'Listo para enviar' : 'Preparando...'}</small>
                            </div>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Previsualización del Mensaje */}
                  <div className="col-md-7">
                    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px', background: '#efeae2', backgroundImage: 'url("https://w0.peakpx.com/wallpaper/818/148/HD-wallpaper-whatsapp-background-solid-color-background.jpg")', backgroundBlendMode: 'soft-light' }}>
                      <div className="card-header bg-white border-bottom-0 py-3" style={{ borderRadius: '12px 12px 0 0' }}>
                         <h6 className="fw-bold mb-0 text-dark"><i className="far fa-eye text-primary me-2"></i>Vista Previa del Mensaje</h6>
                      </div>
                      <div className="card-body p-4 d-flex flex-column">
                        
                        <div className="bg-white p-3 shadow-sm position-relative mb-3 flex-grow-1 d-flex flex-column" style={{ borderRadius: '0 12px 12px 12px' }}>
                          {/* Triangulito del globo de chat */}
                          <div style={{ position: 'absolute', top: 0, left: '-10px', width: 0, height: 0, borderTop: '15px solid white', borderLeft: '15px solid transparent' }}></div>
                          
                          <textarea
                            className="form-control border-0 p-0 text-dark flex-grow-1"
                            style={{ resize: 'none', backgroundColor: 'transparent', boxShadow: 'none', lineHeight: '1.5' }}
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder={defaultMessage}
                          />
                          
                          <div className="text-end mt-2">
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>
                              {new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' })} <i className="fas fa-check-double text-info ms-1"></i>
                            </small>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>

            <div className="modal-footer bg-white border-top p-3" style={{ borderRadius: '0 0 16px 16px' }}>
              <button type="button" className="btn btn-light fw-bold text-secondary px-4 py-2 rounded-pill" onClick={onClose}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-success fw-bold px-4 py-2 rounded-pill shadow-sm d-flex align-items-center gap-2"
                style={{ background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)', border: 'none' }}
                onClick={handleSubmit}
                disabled={loading || !whatsappStatus.isReady || !uploadedFilePath}
              >
                {loading ? (
                  <><i className="fas fa-spinner fa-spin"></i> Enviando...</>
                ) : (
                  <><i className="fas fa-paper-plane"></i> Enviar Mensaje</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default WhatsAppPDFSender;