import React, { useState, useEffect } from 'react';
import { FileText, Download, Upload, Eye, Calendar, DollarSign } from 'lucide-react';
import SubirComprobante from './SubirComprobante';
import './VisualizarComprobantes.css';

const VisualizarComprobantes = ({ estudianteId, estudianteNombre, onClose }) => {
  const [comprobantes, setComprobantes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [modalSubir, setModalSubir] = useState(null);

  useEffect(() => {
    cargarComprobantes();
  }, [estudianteId]);

  const cargarComprobantes = async () => {
    try {
      setCargando(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/comprobantes/comprobantes-estudiante/${estudianteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setComprobantes(data.comprobantes);
      } else {
        throw new Error(data.error || 'Error al cargar comprobantes');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setCargando(false);
    }
  };

  const descargarComprobante = async (pagoId, tipo) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/comprobantes/download-comprobante/${pagoId}/${tipo}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `comprobante-${tipo}-${pagoId}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Error al descargar comprobante');
      }
    } catch (error) {
      alert('Error al descargar: ' + error.message);
    }
  };

  const abrirModalSubir = (pago) => {
    setModalSubir(pago);
  };

  const cerrarModalSubir = () => {
    setModalSubir(null);
    cargarComprobantes(); // Recargar para mostrar cambios
  };

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatearMonto = (monto) => {
    return `Bs ${parseFloat(monto).toFixed(2)}`;
  };

  if (cargando) {
    return (
      <div className="comprobantes-modal">
        <div className="modal-content">
          <div className="loading">Cargando comprobantes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="comprobantes-modal">
        <div className="modal-content">
          <div className="error">Error: {error}</div>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="comprobantes-modal">
        <div className="modal-content">
          <div className="modal-header">
            <h3>Comprobantes de Pago</h3>
            <button className="close-btn" onClick={onClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="estudiante-info">
              <h4>{estudianteNombre}</h4>
              <p>Total de pagos registrados: {comprobantes.length}</p>
            </div>

            {comprobantes.length === 0 ? (
              <div className="no-comprobantes">
                <FileText size={48} color="#ccc" />
                <p>No hay comprobantes registrados para este estudiante</p>
              </div>
            ) : (
              <div className="comprobantes-lista">
                {comprobantes.map((comprobante) => (
                  <div key={comprobante.id} className="comprobante-card">
                    <div className="comprobante-header">
                      <div className="fecha-monto">
                        <div className="fecha">
                          <Calendar size={16} />
                          {formatearFecha(comprobante.fecha_pago)}
                        </div>
                        <div className="monto">
                          <DollarSign size={16} />
                          {formatearMonto(comprobante.monto)}
                        </div>
                      </div>
                      <div className="tipo-mes">
                        <span className={`tipo-badge ${comprobante.tipo_pago}`}>
                          {comprobante.tipo_pago}
                        </span>
                        <span className="mes-badge">
                          {comprobante.mes} {comprobante.anio}
                        </span>
                      </div>
                    </div>

                    <div className="comprobante-info">
                      {comprobante.numero_comprobante && (
                        <div className="info-item">
                          <strong>Comprobante:</strong> {comprobante.numero_comprobante}
                        </div>
                      )}
                      {comprobante.nit_ci && (
                        <div className="info-item">
                          <strong>NIT/CI:</strong> {comprobante.nit_ci}
                        </div>
                      )}
                    </div>

                    <div className="comprobante-actions">
                      {/* PDF Original */}
                      <div className="pdf-section">
                        <span className="pdf-label">PDF Original:</span>
                        {comprobante.pdf_original ? (
                          <button
                            className="btn-download original"
                            onClick={() => descargarComprobante(comprobante.id, 'original')}
                          >
                            <Download size={14} />
                            Descargar
                          </button>
                        ) : (
                          <span className="no-disponible">No disponible</span>
                        )}
                      </div>

                      {/* PDF Firmado */}
                      <div className="pdf-section">
                        <span className="pdf-label">PDF Firmado:</span>
                        {comprobante.pdf_firmado ? (
                          <div className="firmado-info">
                            <button
                              className="btn-download firmado"
                              onClick={() => descargarComprobante(comprobante.id, 'firmado')}
                            >
                              <Download size={14} />
                              Descargar
                            </button>
                            <div className="subida-info">
                              <small>
                                Subido: {formatearFecha(comprobante.fecha_subida_firmado)}
                                {comprobante.subido_por && ` por ${comprobante.subido_por}`}
                              </small>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn-upload"
                            onClick={() => abrirModalSubir(comprobante)}
                          >
                            <Upload size={14} />
                            Subir Firmado
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button className="btn-close" onClick={onClose}>
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal para subir comprobante */}
      {modalSubir && (
        <SubirComprobante
          pago={modalSubir}
          onComprobanteSubido={cerrarModalSubir}
          onClose={cerrarModalSubir}
        />
      )}
    </>
  );
};

export default VisualizarComprobantes;