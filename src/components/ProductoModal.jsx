import React, { useState, useEffect } from 'react';
import { BACKEND_PRINCIPAL_ORIGIN } from '../config/apiConfig';

const API_BASE = `${BACKEND_PRINCIPAL_ORIGIN}`;

const CATEGORIAS = [
  'alimentos', 'bebidas', 'farmacia', 'limpieza', 'papeleria',
  'material escolar', 'muebles', 'tecnologia', 'ropa', 'juguetes',
  'deportes', 'ferreteria', 'otros'
];

/**
 * Modal para crear/editar un producto de tienda
 */
function ProductoModal({ isOpen, onClose, producto, almacenes, onSave }) {
  const [formData, setFormData] = useState({
    almacen_id: '',
    nombre: '',
    descripcion: '',
    precio_unitario: '',
    precio_salida: '',
    stock: '',
    unidad: 'unidad',
    categoria: '',
    tipo_producto: 'no_perecedero',
    fecha_vencimiento: '',
    dias_alerta_vencimiento: 10,
    codigo: '',
    proveedor: '',
    imagen: null
  });

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');
  const [previewImagen, setPreviewImagen] = useState(null);

  useEffect(() => {
    if (producto) {
      setFormData({
        almacen_id: producto.almacen_id || '',
        nombre: producto.nombre || '',
        descripcion: producto.descripcion || '',
        precio_unitario: producto.precio_unitario || producto.precio_compra_promedio || '',
        precio_salida: producto.precio_salida || producto.precio_venta_promedio || '',
        stock: producto.stock || producto.stock_total || '',
        unidad: producto.unidad || 'unidad',
        categoria: producto.categoria || '',
        tipo_producto: producto.tipo_producto || 'no_perecedero',
        fecha_vencimiento: producto.fecha_vencimiento ? producto.fecha_vencimiento.substring(0, 10) : '',
        dias_alerta_vencimiento: producto.dias_alerta_vencimiento || 10,
        codigo: producto.codigo || '',
        proveedor: producto.proveedor || '',
        imagen: null
      });
      if (producto.imagen) {
        setPreviewImagen(`${API_BASE}/uploads/${producto.imagen}`);
      }
    } else {
      setFormData({
        almacen_id: '',
        nombre: '',
        descripcion: '',
        precio_unitario: '',
        precio_salida: '',
        stock: '',
        unidad: 'unidad',
        categoria: '',
        tipo_producto: 'no_perecedero',
        fecha_vencimiento: '',
        dias_alerta_vencimiento: 10,
        codigo: '',
        proveedor: '',
        imagen: null
      });
      setPreviewImagen(null);
    }
    setError('');
  }, [producto, isOpen]);

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'imagen') {
      const file = files[0];
      setFormData(prev => ({ ...prev, imagen: file }));
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => setPreviewImagen(ev.target.result);
        reader.readAsDataURL(file);
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.nombre || !formData.precio_unitario || !formData.almacen_id) {
      setError('Nombre, precio unitario y almacén son obligatorios');
      return;
    }

    setGuardando(true);
    try {
      const fd = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== null && val !== '' && key !== 'imagen') {
          fd.append(key, val);
        }
      });
      if (formData.imagen) {
        fd.append('imagen', formData.imagen);
      }
      await onSave(fd);
    } catch (err) {
      setError('Error al guardar el producto');
    } finally {
      setGuardando(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }} tabIndex="-1">
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">
              <i className="fas fa-box me-2"></i>
              {producto ? 'Editar Producto' : 'Nuevo Producto'}
            </h5>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}

              <div className="row g-3">
                {/* Imagen preview */}
                <div className="col-12 text-center mb-2">
                  {previewImagen ? (
                    <img src={previewImagen} alt="preview" style={{ maxWidth: 150, maxHeight: 150, objectFit: 'contain', borderRadius: 8, border: '1px solid #dee2e6' }} />
                  ) : (
                    <div style={{ width: 120, height: 120, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                      <i className="fas fa-image fa-3x text-muted"></i>
                    </div>
                  )}
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Nombre del Producto *</label>
                  <input type="text" className="form-control" name="nombre" value={formData.nombre} onChange={handleChange} required placeholder="Ej: Galletas Oreo" />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Almacén *</label>
                  <select className="form-control" name="almacen_id" value={formData.almacen_id} onChange={handleChange} required>
                    <option value="">Seleccionar almacén</option>
                    {(almacenes || []).map(a => (
                      <option key={a.id} value={a.id}>{a.nombre}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Precio Costo (Bs) *</label>
                  <input type="number" step="0.01" min="0" className="form-control" name="precio_unitario" value={formData.precio_unitario} onChange={handleChange} required />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Precio Venta (Bs) *</label>
                  <input type="number" step="0.01" min="0" className="form-control" name="precio_salida" value={formData.precio_salida} onChange={handleChange} placeholder="Precio de venta al público" />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Stock Inicial</label>
                  <input type="number" min="0" className="form-control" name="stock" value={formData.stock} onChange={handleChange} />
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Categoría</label>
                  <select className="form-control" name="categoria" value={formData.categoria} onChange={handleChange}>
                    <option value="">Sin categoría</option>
                    {CATEGORIAS.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Unidad</label>
                  <select className="form-control" name="unidad" value={formData.unidad} onChange={handleChange}>
                    <option value="unidad">Unidad</option>
                    <option value="kg">Kilogramo</option>
                    <option value="litro">Litro</option>
                    <option value="caja">Caja</option>
                    <option value="paquete">Paquete</option>
                    <option value="docena">Docena</option>
                  </select>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Tipo</label>
                  <select className="form-control" name="tipo_producto" value={formData.tipo_producto} onChange={handleChange}>
                    <option value="no_perecedero">No Perecedero</option>
                    <option value="perecedero">Perecedero</option>
                  </select>
                </div>

                {formData.tipo_producto === 'perecedero' && (
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Fecha de Vencimiento</label>
                    <input type="date" className="form-control" name="fecha_vencimiento" value={formData.fecha_vencimiento} onChange={handleChange} />
                  </div>
                )}

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Código / SKU</label>
                  <input type="text" className="form-control" name="codigo" value={formData.codigo} onChange={handleChange} placeholder="Código de barras o SKU" />
                </div>

                <div className="col-md-6">
                  <label className="form-label fw-semibold">Proveedor</label>
                  <input type="text" className="form-control" name="proveedor" value={formData.proveedor} onChange={handleChange} />
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold">Descripción</label>
                  <textarea className="form-control" name="descripcion" value={formData.descripcion} onChange={handleChange} rows={2} placeholder="Descripción opcional del producto"></textarea>
                </div>

                <div className="col-12">
                  <label className="form-label fw-semibold">Imagen del Producto</label>
                  <input type="file" className="form-control" name="imagen" accept="image/*" onChange={handleChange} />
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-outline-secondary" onClick={onClose}>
                <i className="fas fa-times me-2"></i>Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={guardando}>
                {guardando
                  ? <><span className="spinner-border spinner-border-sm me-2"></span>Guardando...</>
                  : <><i className="fas fa-save me-2"></i>{producto ? 'Actualizar' : 'Crear'} Producto</>
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProductoModal;
