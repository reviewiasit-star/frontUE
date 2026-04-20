import React, { useState, useEffect } from 'react';

const ModalVisualizarComprobante = ({ 
  isOpen, 
  onClose, 
  comprobanteUrl,
  nombreArchivo = 'comprobante.pdf'
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fileType, setFileType] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [blob, setBlob] = useState(null);

  useEffect(() => {
    if (isOpen && comprobanteUrl) {
      cargarComprobante();
    } else if (!isOpen) {
      // Limpiar cuando se cierra el modal
      if (fileUrl && fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
        setFileUrl(null);
      }
      setError(null);
      setFileType(null);
      setBlob(null);
    }

    // Cleanup al desmontar
    return () => {
      if (fileUrl && fileUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileUrl);
      }
    };
  }, [isOpen, comprobanteUrl]);


  const cargarComprobante = async () => {
    setLoading(true);
    setError(null);
    setFileUrl(null);

    try {
      const token = localStorage.getItem('token');
      console.log('📄 Cargando comprobante desde:', comprobanteUrl);
      
      const response = await fetch(comprobanteUrl, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error en respuesta:', response.status, errorText);
        throw new Error(`Error al cargar el comprobante: ${response.status}`);
      }

      const blobData = await response.blob();
      console.log('📦 Blob recibido:', {
        size: blobData.size,
        type: blobData.type,
        nombreArchivo: nombreArchivo
      });
      
      // Si el tipo no está definido, intentar detectarlo por extensión
      let type = blobData.type;
      if (!type || type === 'application/octet-stream') {
        const ext = nombreArchivo.toLowerCase().split('.').pop();
        if (ext === 'pdf') type = 'application/pdf';
        else if (ext === 'png') type = 'image/png';
        else if (ext === 'jpg' || ext === 'jpeg') type = 'image/jpeg';
        else if (ext === 'gif') type = 'image/gif';
      }
      
      // Crear blob con el tipo correcto
      const blobConTipo = type && blobData.type !== type 
        ? new Blob([blobData], { type })
        : blobData;
      
      const url = URL.createObjectURL(blobConTipo);
      console.log('✅ URL creada:', url, 'Tipo:', type);
      
      setFileType(type);
      setFileUrl(url);
      setBlob(blobData);
      setLoading(false);
    } catch (err) {
      console.error('❌ Error al cargar comprobante:', err);
      setError(`No se pudo cargar el comprobante: ${err.message}. Por favor, intenta descargarlo.`);
      setLoading(false);
    }
  };

  const handleDescargar = () => {
    if (fileUrl) {
      const a = document.createElement('a');
      a.href = fileUrl;
      a.download = nombreArchivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="modal-visualizar-comprobante"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div 
        className="modal-content-comprobante"
        style={{
          backgroundColor: '#fff',
          borderRadius: '8px',
          maxWidth: '90vw',
          maxHeight: '90vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - igual que Vista previa del comprobante */}
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px 8px 0 0',
            padding: '15px 20px'
          }}
        >
          <h5 className="modal-title" style={{ color: 'white', fontWeight: 600, margin: 0 }}>
            <i className="fas fa-image me-2" />
            Vista previa del comprobante
          </h5>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {fileUrl && (
              <button
                onClick={handleDescargar}
                className="btn btn-light btn-sm"
                style={{ display: 'flex', alignItems: 'center', gap: '5px' }}
                title="Descargar comprobante"
              >
                <i className="fas fa-download"></i>
              </button>
            )}
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={onClose}
              style={{ opacity: 0.9 }}
            />
          </div>
        </div>

        {/* Body - igual que Vista previa del comprobante */}
        <div
          className="modal-body d-flex justify-content-center align-items-center"
          style={{
            maxHeight: '80vh',
            overflow: 'auto',
            padding: '1.5rem',
            background: '#f8f9fa',
            minHeight: '400px'
          }}
        >
          {loading && (
            <div className="text-center py-5">
              <i className="fas fa-spinner fa-spin fa-2x text-primary mb-3"></i>
              <div>Cargando imagen...</div>
            </div>
          )}

          {error && (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: '48px', color: '#dc3545', marginBottom: '15px' }}></i>
              <p style={{ color: '#dc3545', fontSize: '16px', marginBottom: '20px' }}>{error}</p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                <button 
                  onClick={() => cargarComprobante()} 
                  className="btn btn-outline-primary"
                >
                  <i className="fas fa-redo me-2"></i>
                  Reintentar
                </button>
                {fileUrl && (
                  <button onClick={handleDescargar} className="btn btn-primary">
                    <i className="fas fa-download me-2"></i>
                    Descargar
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && fileUrl && (
            <>
              {/* Mostrar siempre como imagen primero (igual que Vista previa del comprobante) */}
              {(fileType && fileType.startsWith('image/')) || (blob && blob.size < 500000) ? (
                <img
                  src={fileUrl}
                  alt="Comprobante"
                  style={{
                    maxWidth: '100%',
                    maxHeight: '75vh',
                    borderRadius: '8px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                />
              ) : fileType === 'application/pdf' || nombreArchivo.toLowerCase().endsWith('.pdf') ? (
                <iframe
                  key={fileUrl}
                  src={`${fileUrl}#toolbar=1`}
                  style={{
                    width: '100%',
                    height: '100%',
                    minHeight: '600px',
                    border: 'none',
                    borderRadius: '4px'
                  }}
                  title="Visualizador de PDF"
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <i className="fas fa-file" style={{ fontSize: '48px', color: '#6c757d', marginBottom: '15px' }}></i>
                  <p style={{ color: '#666', marginBottom: '20px' }}>
                    Tipo de archivo no soportado para visualización
                  </p>
                  <button onClick={handleDescargar} className="btn btn-primary">
                    <i className="fas fa-download me-2"></i>
                    Descargar archivo
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalVisualizarComprobante;
