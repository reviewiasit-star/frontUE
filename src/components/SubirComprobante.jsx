import React, { useState, useRef } from 'react';
import { Camera, Upload, FileText } from 'lucide-react';
import './SubirComprobante.css';

const SubirComprobante = ({ pago, onComprobanteSubido, onClose }) => {
  const [archivo, setArchivo] = useState(null);
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [nitCi, setNitCi] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [preview, setPreview] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const handleArchivoSeleccionado = (event) => {
    const file = event.target.files[0];
    if (file) {
      setArchivo(file);
      
      // Crear preview si es imagen
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
      } else {
        setPreview(null);
      }
    }
  };

  const handleTomarFoto = () => {
    cameraInputRef.current?.click();
  };

  const handleSeleccionarArchivo = () => {
    fileInputRef.current?.click();
  };

  const handleSubir = async () => {
    if (!archivo) {
      alert('Por favor selecciona un archivo');
      return;
    }

    setSubiendo(true);
    try {
      const formData = new FormData();
      formData.append('comprobante', archivo);
      formData.append('pago_id', pago.id);
      formData.append('numero_comprobante', numeroComprobante);
      formData.append('nit_ci', nitCi);

      const token = localStorage.getItem('token');
      const response = await fetch('/api/comprobantes/upload-comprobante-firmado', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        alert('Comprobante subido exitosamente');
        onComprobanteSubido && onComprobanteSubido();
        onClose && onClose();
      } else {
        throw new Error(data.error || 'Error al subir comprobante');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error al subir comprobante: ' + error.message);
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div className="subir-comprobante-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Subir Comprobante Firmado</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {/* Información del pago */}
          <div className="pago-info">
            <h4>Información del Pago</h4>
            <div className="info-grid">
              <div><strong>Fecha:</strong> {pago.fecha_pago}</div>
              <div><strong>Monto:</strong> Bs {pago.monto}</div>
              <div><strong>Tipo:</strong> {pago.tipo_pago}</div>
              <div><strong>Mes:</strong> {pago.mes} {pago.anio}</div>
            </div>
          </div>

          {/* Campos adicionales */}
          <div className="form-group">
            <label>Número de Comprobante/Factura (opcional):</label>
            <input
              type="text"
              value={numeroComprobante}
              onChange={(e) => setNumeroComprobante(e.target.value)}
              placeholder="Ej: 001-002-0000123"
            />
          </div>

          <div className="form-group">
            <label>NIT/CI del Pagador (opcional):</label>
            <input
              type="text"
              value={nitCi}
              onChange={(e) => setNitCi(e.target.value)}
              placeholder="Ej: 1234567 LP"
            />
          </div>

          {/* Opciones de subida */}
          <div className="upload-options">
            <h4>Subir Comprobante Firmado</h4>
            <div className="upload-buttons">
              <button 
                className="btn-camera" 
                onClick={handleTomarFoto}
                type="button"
              >
                <Camera size={20} />
                Tomar Foto
              </button>
              
              <button 
                className="btn-file" 
                onClick={handleSeleccionarArchivo}
                type="button"
              >
                <Upload size={20} />
                Seleccionar Archivo
              </button>
            </div>

            {/* Inputs ocultos */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleArchivoSeleccionado}
              style={{ display: 'none' }}
            />
            
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={handleArchivoSeleccionado}
              style={{ display: 'none' }}
            />
          </div>

          {/* Preview del archivo */}
          {archivo && (
            <div className="file-preview">
              <h4>Archivo Seleccionado</h4>
              <div className="preview-info">
                <FileText size={20} />
                <span>{archivo.name}</span>
                <span className="file-size">
                  ({(archivo.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              
              {preview && (
                <div className="image-preview">
                  <img src={preview} alt="Preview" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button 
            className="btn-cancel" 
            onClick={onClose}
            disabled={subiendo}
          >
            Cancelar
          </button>
          
          <button 
            className="btn-upload" 
            onClick={handleSubir}
            disabled={!archivo || subiendo}
          >
            {subiendo ? 'Subiendo...' : 'Subir Comprobante'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubirComprobante;