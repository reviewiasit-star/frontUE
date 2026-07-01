import React, { useState, useEffect } from 'react';
import AuthService from '../services/authService';
import { BACKEND_PRINCIPAL_ORIGIN } from '../config/apiConfig';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = `${BACKEND_PRINCIPAL_ORIGIN}`;

/**
 * Modal para gestión de lotes de un producto
 * Permite crear y editar lotes con stock, precios y fechas de vencimiento
 */
function GestionLotesModal({ producto, isOpen, onClose, onLoteCreado }) {
  const [lotes, setLotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [showFormLote, setShowFormLote] = useState(false);
  const [editandoLote, setEditandoLote] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [tieneVencimiento, setTieneVencimiento] = useState(false);

  const [formLote, setFormLote] = useState({
    codigo_lote: '',
    titulo_lote: '',
    precio_compra: '',
    precio_venta: '',
    stock_inicial: '',
    stock_actual: '',
    fecha_vencimiento: '',
    proveedor: '',
    observaciones: '',
    estado: 'activo',
    imagen_lote: null
  });

  useEffect(() => {
    if (isOpen && producto) {
      fetchLotes();
    }
    // eslint-disable-next-line
  }, [isOpen, producto]);

  const fetchLotes = async () => {
    if (!producto) return;
    setLoading(true);
    setError('');
    try {
      const token = AuthService.getToken();
      const res = await fetch(`${API_BASE}/api/productos/${producto.id}/lotes`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.ok) {
        setLotes(data.lotes || []);
      } else {
        setError(data.message || 'Error al cargar lotes');
      }
    } catch (err) {
      setError('Error de conexión al cargar lotes');
    } finally {
      setLoading(false);
    }
  };

  const abrirFormNuevoLote = () => {
    setEditandoLote(null);
    setFormLote({
      codigo_lote: `${(producto?.nombre || 'LOTE').toString().toUpperCase().replace(/\s+/g, '').slice(0, 6)}-${Date.now().toString().slice(-6)}`,
      titulo_lote: producto?.nombre || '',
      precio_compra: producto?.precio_unitario || '',
      precio_venta: producto?.precio_salida || '',
      stock_inicial: '',
      stock_actual: '',
      fecha_vencimiento: '',
      proveedor: '',
      observaciones: '',
      estado: 'activo',
      imagen_lote: null
    });
    // Si el producto es de tipo 'perecedero', lo activamos por defecto.
    setTieneVencimiento(producto?.tipo_producto === 'perecedero');
    setShowFormLote(true);
  };

  const abrirFormEditarLote = (lote) => {
    setEditandoLote(lote);
    setFormLote({
      codigo_lote: lote.codigo_lote || '',
      titulo_lote: lote.titulo_lote || '',
      precio_compra: lote.precio_compra || '',
      precio_venta: lote.precio_venta || '',
      stock_inicial: lote.stock_inicial || '',
      stock_actual: lote.stock_actual || '',
      fecha_vencimiento: lote.fecha_vencimiento ? lote.fecha_vencimiento.substring(0, 10) : '',
      proveedor: lote.proveedor || '',
      observaciones: lote.observaciones || '',
      estado: lote.estado || 'activo',
      imagen_lote: null
    });
    setTieneVencimiento(!!lote.fecha_vencimiento);
    setShowFormLote(true);
  };

  const cerrarForm = () => {
    setShowFormLote(false);
    setEditandoLote(null);
    setError('');
  };

  const handleInputChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'imagen_lote') {
      setFormLote(prev => ({ ...prev, imagen_lote: files[0] || null }));
    } else {
      setFormLote(prev => ({ ...prev, [name]: value }));
    }
  };

  const guardarLote = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setError('');
    setMensaje('');

    try {
      const token = AuthService.getToken();
      const fd = new FormData();
      fd.append('codigo_lote', formLote.codigo_lote);
      fd.append('titulo_lote', formLote.titulo_lote);
      fd.append('precio_compra', formLote.precio_compra);
      fd.append('precio_venta', formLote.precio_venta);
      fd.append('stock_inicial', formLote.stock_inicial);
      if (editandoLote) fd.append('stock_actual', formLote.stock_actual);
      
      // Si tiene vencimiento y llenó el campo, lo enviamos. Si no, lo enviamos vacío para que sea null en DB.
      if (tieneVencimiento && formLote.fecha_vencimiento) {
        fd.append('fecha_vencimiento', formLote.fecha_vencimiento);
      } else {
        fd.append('fecha_vencimiento', ''); 
      }
      
      if (formLote.proveedor) fd.append('proveedor', formLote.proveedor);
      if (formLote.observaciones) fd.append('observaciones', formLote.observaciones);
      if (editandoLote) fd.append('estado', formLote.estado);
      if (formLote.imagen_lote) fd.append('imagen_lote', formLote.imagen_lote);

      let url, method;
      if (editandoLote) {
        url = `${API_BASE}/api/lotes/${editandoLote.id}`;
        method = 'PUT';
      } else {
        url = `${API_BASE}/api/productos/${producto.id}/lotes`;
        method = 'POST';
      }

      const res = await fetch(url, {
        method,
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd
      });

      const data = await res.json();
      if (data.ok) {
        setMensaje(editandoLote ? 'Lote actualizado exitosamente' : 'Lote creado exitosamente');
        cerrarForm();
        fetchLotes();
        if (onLoteCreado) onLoteCreado();
        setTimeout(() => setMensaje(''), 2500);
      } else {
        setError(data.message || 'Error al guardar lote');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setGuardando(false);
    }
  };

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'activo': return 'bg-success';
      case 'agotado': return 'bg-secondary';
      case 'vencido': return 'bg-danger';
      default: return 'bg-info';
    }
  };

  const handleExportarLotes = () => {
    if (lotes.length === 0) {
      alert("No hay lotes para exportar.");
      return;
    }
    
    const doc = new jsPDF('landscape');
    doc.text(`Reporte de Lotes - ${producto.nombre}`, 14, 15);

    const tableData = lotes.map(lote => {
      const inversion = parseFloat(lote.precio_compra || 0) * parseInt(lote.stock_inicial || 0);
      const vendidos = parseInt(lote.stock_inicial || 0) - parseInt(lote.stock_actual || 0);
      const recuperado = parseFloat(lote.precio_venta || 0) * vendidos;
      const ganancia = (parseFloat(lote.precio_venta || 0) - parseFloat(lote.precio_compra || 0)) * vendidos;
      const esperada = ((parseFloat(lote.precio_venta || 0) - parseFloat(lote.precio_compra || 0)) * parseInt(lote.stock_inicial || 0));

      return [
        lote.codigo_lote,
        lote.titulo_lote || '-',
        parseFloat(lote.precio_compra || 0).toFixed(2),
        parseFloat(lote.precio_venta || 0).toFixed(2),
        lote.stock_inicial,
        lote.stock_actual,
        vendidos,
        inversion.toFixed(2),
        recuperado.toFixed(2),
        ganancia.toFixed(2),
        esperada.toFixed(2),
        lote.fecha_vencimiento ? new Date(lote.fecha_vencimiento).toLocaleDateString('es-BO') : 'N/A',
        lote.estado
      ];
    });

    autoTable(doc, {
      startY: 20,
      head: [['Código', 'Título', 'P. Compra', 'P. Venta', 'Stk Inicial', 'Stk Actual', 'Vendidos', 'Inversión', 'Recuperado', 'Gan. Act.', 'Gan. Esp.', 'Vencimiento', 'Estado']],
      body: tableData,
      theme: 'grid',
      styles: { fontSize: 7 },
      headStyles: { fillColor: [41, 128, 185] }
    });

    doc.save(`Lotes_${producto.nombre.replace(/\s+/g, '_')}.pdf`);
  };

  if (!isOpen || !producto) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }} tabIndex="-1">
      <div className="modal-dialog modal-xl modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="fas fa-boxes me-2"></i>
              Gestión de Lotes — {producto.nombre}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <div className="modal-body">
            {mensaje && <div className="alert alert-success">{mensaje}</div>}
            {error && <div className="alert alert-danger">{error}</div>}

            {/* Formulario de nuevo/editar lote */}
            {showFormLote ? (
              <form onSubmit={guardarLote}>
                <h6 className="mb-3 text-primary">
                  <i className="fas fa-edit me-2"></i>
                  {editandoLote ? 'Editar Lote' : 'Nuevo Lote'}
                </h6>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Código de Lote *</label>
                    <input type="text" className="form-control" name="codigo_lote" value={formLote.codigo_lote} onChange={handleInputChange} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Título del Lote</label>
                    <input type="text" className="form-control" name="titulo_lote" value={formLote.titulo_lote} onChange={handleInputChange} placeholder="Ej: Galletas Oreo 2024" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold">Imagen del Lote</label>
                    <input type="file" className="form-control" name="imagen_lote" accept="image/*" onChange={handleInputChange} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Precio Compra (Bs) *</label>
                    <input type="number" step="0.01" min="0" className="form-control" name="precio_compra" value={formLote.precio_compra} onChange={handleInputChange} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Precio Venta (Bs) *</label>
                    <input type="number" step="0.01" min="0" className="form-control" name="precio_venta" value={formLote.precio_venta} onChange={handleInputChange} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Stock Inicial *</label>
                    <input type="number" min="1" className="form-control" name="stock_inicial" value={formLote.stock_inicial} onChange={handleInputChange} required />
                  </div>
                  {editandoLote && (
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Stock Actual</label>
                      <input type="number" min="0" className="form-control" name="stock_actual" value={formLote.stock_actual} onChange={handleInputChange} />
                    </div>
                  )}
                  
                  <div className="col-md-3 d-flex align-items-center mt-4">
                    <div className="form-check form-switch">
                      <input 
                        className="form-check-input" 
                        type="checkbox" 
                        id="checkVencimiento" 
                        checked={tieneVencimiento} 
                        onChange={(e) => {
                          setTieneVencimiento(e.target.checked);
                          if (!e.target.checked) setFormLote(p => ({...p, fecha_vencimiento: ''}));
                        }} 
                      />
                      <label className="form-check-label fw-semibold" htmlFor="checkVencimiento">
                        Tiene Vencimiento
                      </label>
                    </div>
                  </div>

                  {tieneVencimiento && (
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Fecha Vencimiento *</label>
                      <input type="date" className="form-control" name="fecha_vencimiento" value={formLote.fecha_vencimiento} onChange={handleInputChange} required />
                    </div>
                  )}

                  <div className="col-md-3">
                    <label className="form-label fw-semibold">Proveedor</label>
                    <input type="text" className="form-control" name="proveedor" value={formLote.proveedor} onChange={handleInputChange} />
                  </div>
                  {editandoLote && (
                    <div className="col-md-3">
                      <label className="form-label fw-semibold">Estado</label>
                      <select className="form-control" name="estado" value={formLote.estado} onChange={handleInputChange}>
                        <option value="activo">Activo</option>
                        <option value="agotado">Agotado</option>
                        <option value="vencido">Vencido</option>
                      </select>
                    </div>
                  )}
                  <div className="col-12">
                    <label className="form-label fw-semibold">Observaciones</label>
                    <textarea className="form-control" name="observaciones" value={formLote.observaciones} onChange={handleInputChange} rows={2}></textarea>
                  </div>
                </div>
                <div className="d-flex gap-2 mt-3">
                  <button type="submit" className="btn btn-primary" disabled={guardando}>
                    {guardando ? <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</> : <><i className="fas fa-save me-2"></i>Guardar Lote</>}
                  </button>
                  <button type="button" className="btn btn-outline-secondary" onClick={cerrarForm}>
                    <i className="fas fa-times me-2"></i>Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="mb-0 text-primary">
                    <i className="fas fa-list me-2"></i>
                    Lotes del producto ({lotes.length})
                  </h6>
                  <div className="d-flex gap-2">
                    {lotes.length > 0 && (
                      <button className="btn btn-danger btn-sm" onClick={handleExportarLotes}>
                        <i className="fas fa-file-pdf me-2"></i>Exportar PDF
                      </button>
                    )}
                    <button className="btn btn-primary btn-sm" onClick={abrirFormNuevoLote}>
                      <i className="fas fa-plus me-2"></i>Nuevo Lote
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" role="status"></div>
                  </div>
                ) : lotes.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="fas fa-boxes fa-3x text-muted mb-3"></i>
                    <p className="text-muted">No hay lotes registrados para este producto</p>
                    <button className="btn btn-primary" onClick={abrirFormNuevoLote}>
                      <i className="fas fa-plus me-2"></i>Crear primer lote
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-sm">
                      <thead className="table-dark">
                        <tr>
                          <th>Imagen</th>
                          <th>Código</th>
                          <th>Costo / Venta</th>
                          <th>Stock</th>
                          <th>Vencimiento</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lotes.map(lote => {
                          const inversion = parseFloat(lote.precio_compra || 0) * parseInt(lote.stock_inicial || 0);
                          const vendidos = parseInt(lote.stock_inicial || 0) - parseInt(lote.stock_actual || 0);
                          const recuperado = parseFloat(lote.precio_venta || 0) * vendidos;
                          const ganancia = (parseFloat(lote.precio_venta || 0) - parseFloat(lote.precio_compra || 0)) * vendidos;
                          
                          return (
                            <React.Fragment key={lote.id}>
                              <tr>
                                <td>
                                  {lote.imagen_lote ? (
                                    <img
                                      src={`${API_BASE}/uploads/${lote.imagen_lote}`}
                                      alt={lote.titulo_lote || lote.codigo_lote}
                                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4 }}
                                    />
                                  ) : (
                                    <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: 40, height: 40, borderRadius: 4 }}>
                                      <i className="fas fa-image text-muted"></i>
                                    </div>
                                  )}
                                </td>
                                <td>
                                  <span className="badge bg-primary">{lote.codigo_lote}</span>
                                  {lote.titulo_lote && <div className="small text-muted mt-1">{lote.titulo_lote}</div>}
                                </td>
                                <td>
                                  <div className="small">Compra: <b>Bs {parseFloat(lote.precio_compra || 0).toFixed(2)}</b></div>
                                  <div className="small text-success">Venta: <b>Bs {parseFloat(lote.precio_venta || 0).toFixed(2)}</b></div>
                                </td>
                                <td>
                                  <span className={`badge ${lote.stock_actual > 10 ? 'bg-success' : lote.stock_actual > 0 ? 'bg-warning text-dark' : 'bg-danger'}`}>
                                    {lote.stock_actual} / {lote.stock_inicial}
                                  </span>
                                  <div className="small text-muted mt-1">{vendidos} vendidos</div>
                                </td>
                                <td>
                                  {lote.fecha_vencimiento ? (
                                    <small>{new Date(lote.fecha_vencimiento).toLocaleDateString('es-BO')}</small>
                                  ) : '-'}
                                </td>
                                <td>
                                  <span className={`badge ${getEstadoBadge(lote.estado)}`}>{lote.estado}</span>
                                </td>
                                <td>
                                  <button
                                    className="btn btn-outline-primary btn-sm"
                                    onClick={() => abrirFormEditarLote(lote)}
                                    title="Editar lote"
                                  >
                                    <i className="fas fa-edit"></i>
                                  </button>
                                </td>
                              </tr>
                              {/* Fila de resumen financiero */}
                              <tr className="table-light">
                                <td colSpan="7" className="p-2 border-bottom">
                                  <div className="d-flex justify-content-between align-items-center px-2" style={{ fontSize: '0.85rem' }}>
                                    <div>
                                      <i className="fas fa-chart-pie me-1 text-primary"></i>
                                      <span className="text-muted me-1">Inversión Total:</span>
                                      <strong>Bs {inversion.toFixed(2)}</strong>
                                    </div>
                                    <div>
                                      <i className="fas fa-hand-holding-usd me-1 text-info"></i>
                                      <span className="text-muted me-1">Cap. Recuperado:</span>
                                      <strong>Bs {recuperado.toFixed(2)}</strong>
                                    </div>
                                    <div>
                                      <i className="fas fa-level-up-alt me-1 text-success"></i>
                                      <span className="text-muted me-1">Ganancia Actual:</span>
                                      <strong className="text-success">Bs {ganancia.toFixed(2)}</strong>
                                    </div>
                                    <div>
                                      <i className="fas fa-bullseye me-1 text-warning"></i>
                                      <span className="text-muted me-1">Ganancia Esperada:</span>
                                      <strong>Bs {((parseFloat(lote.precio_venta || 0) - parseFloat(lote.precio_compra || 0)) * parseInt(lote.stock_inicial || 0)).toFixed(2)}</strong>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <i className="fas fa-times me-2"></i>Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default GestionLotesModal;
