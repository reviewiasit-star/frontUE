import React, { useState } from 'react';
import apiConfig from '../../../config/apiConfig';

const EnvioComprobantes = () => {
  const [telefono, setTelefono] = useState('');
  const [descripcionMonto, setDescripcionMonto] = useState('');
  const [ci, setCi] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [datosOCR, setDatosOCR] = useState(null);
  const [procesandoOCR, setProcesandoOCR] = useState(false);
  const [previewImagen, setPreviewImagen] = useState(null);

  const handleArchivoChange = async (e) => {
    const file = e.target.files?.[0] || null;
    setArchivo(file);
    setDatosOCR(null);
    setError('');

    if (!file) {
      setPreviewImagen(null);
      return;
    }

    // Mostrar preview de imagen
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImagen(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewImagen(null);
    }

    // Procesar OCR inmediatamente
    try {
      setProcesandoOCR(true);
      const formData = new FormData();
      formData.append('archivo', file);

      const baseUrl = apiConfig.BACKEND_PRINCIPAL;
      const resp = await fetch(`${baseUrl}/ocr-comprobantes-public/preview`, {
        method: 'POST',
        body: formData
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.ok) {
        throw new Error(data.message || 'No se pudo procesar el comprobante.');
      }

      setDatosOCR(data.datos || null);
    } catch (e) {
      console.error('Error procesando OCR:', e);
      setError('No se pudo procesar el comprobante para previsualización. Puede continuar con el envío.');
    } finally {
      setProcesandoOCR(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    setError('');

    if (!archivo) {
      setError('Por favor seleccione una imagen o PDF del comprobante.');
      return;
    }

    if (!telefono.trim()) {
      setError('Por favor ingrese su número de WhatsApp.');
      return;
    }

    if (!ci.trim()) {
      setError('Por favor ingrese su CI/NIT para validar el comprobante.');
      return;
    }

    try {
      setEnviando(true);

      const formData = new FormData();
      formData.append('telefono', telefono.trim());
      formData.append('descripcion_monto', descripcionMonto.trim());
      formData.append('ci', ci.trim());
      formData.append('archivo', archivo);

      const baseUrl = apiConfig.BACKEND_PRINCIPAL;
      const resp = await fetch(`${baseUrl}/ocr-comprobantes-public/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await resp.json().catch(() => ({}));

      if (!resp.ok || !data.ok) {
        throw new Error(data.message || 'No se pudo enviar el comprobante.');
      }

      setMensaje('✅ Comprobante enviado correctamente. La cajera revisará la información y le confirmará su pago por WhatsApp.');
      setArchivo(null);
      setDatosOCR(null);
      setPreviewImagen(null);
      setDescripcionMonto('');
      setTelefono('');
      setCi('');
      (document.getElementById('archivo-comprobante') || {}).value = '';
    } catch (e) {
      setError(e.message || 'Ocurrió un error al enviar el comprobante. Intente nuevamente.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="container-fluid d-flex align-items-center justify-content-center" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)' }}>
      <div className="card shadow-lg border-0" style={{ maxWidth: 520, width: '100%', borderRadius: 16 }}>
        <div className="card-body p-4 p-md-5">
          <div className="text-center mb-4">
            <h3 className="fw-bold mb-1">
              <i className="fas fa-receipt me-2 text-success"></i>
              Envío de comprobantes
            </h3>
            <p className="text-muted mb-0" style={{ fontSize: '0.9rem' }}>
              Cargue aquí la foto o PDF del comprobante de pago para que la Caja pueda revisarlo.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">
                Número de WhatsApp del remitente
              </label>
              <div className="input-group">
                <span className="input-group-text">+591</span>
                <input
                  type="tel"
                  className="form-control"
                  placeholder="Ej: 70000000"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                />
              </div>
              <small className="text-muted">
                Usaremos este número para relacionar el comprobante con su chat de WhatsApp.
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                Descripción del monto
              </label>
              <textarea
                className="form-control"
                rows="3"
                placeholder="Ej: Quiero cancelar del mes de marzo la cuota, le envío el comprobante"
                value={descripcionMonto}
                onChange={(e) => setDescripcionMonto(e.target.value)}
              />
              <small className="text-muted">
                Indique qué mes o concepto está pagando. Ej: "mes de marzo", "mes de febrero", etc.
              </small>
            </div>

            <div className="mb-3">
              <label className="form-label fw-semibold">
                CI/NIT del remitente
              </label>
              <input
                type="text"
                className="form-control"
                  placeholder="CI o NIT"
                value={ci}
                onChange={(e) => setCi(e.target.value)}
              />
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">
                Archivo del comprobante (imagen o PDF)
              </label>
              <input
                id="archivo-comprobante"
                type="file"
                accept="image/*,application/pdf"
                className="form-control"
                onChange={handleArchivoChange}
              />
              <small className="text-muted">
                Puede subir una foto nítida del comprobante o un archivo PDF descargado del banco.
              </small>

              {/* Preview de imagen */}
              {previewImagen && (
                <div className="mt-3 text-center">
                  <img
                    src={previewImagen}
                    alt="Preview del comprobante"
                    className="img-fluid rounded shadow-sm"
                    style={{ maxHeight: '300px', maxWidth: '100%' }}
                  />
                </div>
              )}

              {/* Indicador de procesamiento OCR */}
              {procesandoOCR && (
                <div className="mt-3 alert alert-info py-2">
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Procesando comprobante con OCR...
                </div>
              )}

              {/* Mostrar datos detectados por OCR */}
              {datosOCR && !procesandoOCR && (
                <div className="mt-3 card border-info">
                  <div className="card-header bg-info text-white py-2">
                    <i className="fas fa-eye me-2"></i>
                    <strong>Datos detectados del comprobante:</strong>
                  </div>
                  <div className="card-body p-3">
                    <div className="row g-2">
                      <div className="col-6">
                        <small className="text-muted d-block">Tipo de documento:</small>
                        <strong>{datosOCR.tipo_documento || 'No detectado'}</strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Confianza:</small>
                        <span className={`badge ${
                          datosOCR.confianza_extraccion === 'alta' ? 'bg-success' :
                          datosOCR.confianza_extraccion === 'media' ? 'bg-warning' :
                          'bg-secondary'
                        }`}>
                          {datosOCR.confianza_extraccion || 'baja'}
                        </span>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Monto:</small>
                        <strong className={datosOCR.monto_detectado ? 'text-success' : 'text-muted'}>
                          {datosOCR.monto_detectado 
                            ? `${datosOCR.monto_detectado} ${datosOCR.moneda || 'BOB'}` 
                            : 'No detectado'}
                        </strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Fecha:</small>
                        <strong className={datosOCR.fecha_detectada ? 'text-success' : 'text-muted'}>
                          {datosOCR.fecha_detectada || 'No detectada'}
                        </strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Banco:</small>
                        <strong className={datosOCR.banco_detectado ? 'text-success' : 'text-muted'}>
                          {datosOCR.banco_detectado || 'No detectado'}
                        </strong>
                      </div>
                      <div className="col-6">
                        <small className="text-muted d-block">Número de comprobante:</small>
                        <strong className={datosOCR.numero_comprobante_detectado ? 'text-success' : 'text-muted'}>
                          {datosOCR.numero_comprobante_detectado || 'No detectado'}
                        </strong>
                      </div>
                      {datosOCR.emisor_detectado && (
                        <div className="col-6">
                          <small className="text-muted d-block">Emisor:</small>
                          <strong>{datosOCR.emisor_detectado}</strong>
                        </div>
                      )}
                      {datosOCR.receptor_detectado && (
                        <div className="col-6">
                          <small className="text-muted d-block">Receptor:</small>
                          <strong>{datosOCR.receptor_detectado}</strong>
                        </div>
                      )}
                      {datosOCR.observaciones && (
                        <div className="col-12 mt-2">
                          <small className="text-muted d-block">Observaciones:</small>
                          <small className="text-muted">{datosOCR.observaciones}</small>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="alert alert-danger py-2">
                <i className="fas fa-exclamation-circle me-2"></i>
                {error}
              </div>
            )}
            {mensaje && (
              <div className="alert alert-success py-2">
                <i className="fas fa-check-circle me-2"></i>
                {mensaje}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-success w-100 fw-semibold"
              disabled={enviando}
            >
              {enviando ? (
                <>
                  <i className="fas fa-spinner fa-spin me-2"></i>
                  Enviando comprobante...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Enviar comprobante
                </>
              )}
            </button>

            <p className="text-center text-muted mt-3 mb-0" style={{ fontSize: '0.8rem' }}>
              No es necesario iniciar sesión para usar este formulario.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EnvioComprobantes;

