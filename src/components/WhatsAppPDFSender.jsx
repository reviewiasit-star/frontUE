import React, { useState, useEffect } from 'react';

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
  }, [isOpen, pdfBlob, initialPhoneNumber]);

  const checkWhatsAppStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/whatsapp/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

      const response = await fetch(`http://${window.location.hostname}:3001/api/upload/upload-pdf`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
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
      alert('Error al subir el PDF al servidor');
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
      const response = await fetch(`http://${window.location.hostname}:3001/api/whatsapp/send-pdf`, {
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
        alert('¡PDF enviado exitosamente por WhatsApp!');
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

  return (
    <>
      {/* Modal */}
      <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">
                <i className="fab fa-whatsapp text-success me-2"></i>
                Enviar PDF por WhatsApp
              </h5>
              <button type="button" className="btn-close" onClick={onClose}></button>
            </div>
            
            <div className="modal-body">
              {/* Estado de WhatsApp */}
              <div className="alert alert-info mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <strong>Estado de WhatsApp:</strong>
                    {whatsappStatus.isReady ? (
                      <span className="text-success ms-2">
                        <i className="fas fa-check-circle"></i> Conectado
                      </span>
                    ) : (
                      <span className="text-warning ms-2">
                        <i className="fas fa-exclamation-triangle"></i> No conectado
                      </span>
                    )}
                  </div>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={handleRefreshStatus}
                  >
                    <i className="fas fa-sync-alt"></i> Actualizar
                  </button>
                </div>
              </div>

              {/* Estado de subida del PDF */}
              <div className={`alert ${uploadedFilePath ? 'alert-success' : 'alert-warning'} mb-3`}>
                <div className="d-flex align-items-center">
                  <i className={`fas ${uploadedFilePath ? 'fa-check-circle' : 'fa-spinner fa-spin'} me-2`}></i>
                  <div>
                    <strong>Estado del PDF:</strong>
                    {uploadedFilePath ? (
                      <span className="ms-2">PDF subido exitosamente al servidor</span>
                    ) : (
                      <span className="ms-2">Subiendo PDF al servidor...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Código QR */}
              {showQR && (whatsappStatus.qrImage || whatsappStatus.qrCode) && (
                <div className="alert alert-warning mb-3">
                  <h6>Escanea el código QR para conectar WhatsApp:</h6>
                  <div className="text-center">
                    {whatsappStatus.qrImage ? (
                      <img 
                        src={whatsappStatus.qrImage} 
                        alt="QR Code"
                        style={{ maxWidth: '300px', border: '1px solid #ddd', borderRadius: '8px' }}
                      />
                    ) : (
                      <div className="text-danger">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        Error al generar el código QR. Intenta recargar la página.
                      </div>
                    )}
                  </div>
                  <small className="text-muted">
                    Abre WhatsApp en tu teléfono y escanea este código QR
                  </small>
                </div>
              )}

              {/* Formulario */}
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">
                    <i className="fas fa-phone me-2"></i>
                    Número de teléfono *
                  </label>
                  <input
                    type="tel"
                    className="form-control"
                    placeholder="Ej: 70012345 o 59170012345"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <small className="text-muted">
                    Incluye el código de país (591 para Bolivia) o solo el número local
                  </small>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    <i className="fas fa-comment me-2"></i>
                    Mensaje (opcional)
                  </label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder={defaultMessage || `Aquí tienes el documento solicitado:`}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    <i className="fas fa-file-pdf me-2"></i>
                    Archivo a enviar
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    value={uploadedFilePath || 'Subiendo archivo...'}
                    readOnly
                  />
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancelar
              </button>
              <button 
                type="button" 
                className="btn btn-success"
                onClick={handleSubmit}
                disabled={loading || !whatsappStatus.isReady || !uploadedFilePath}
              >
                {loading ? (
                  <>
                    <i className="fas fa-spinner fa-spin me-2"></i>
                    Enviando...
                  </>
                ) : (
                  <>
                    <i className="fab fa-whatsapp me-2"></i>
                    Enviar por WhatsApp
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Overlay */}
      <div className="modal-backdrop fade show"></div>
    </>
  );
}

export default WhatsAppPDFSender;