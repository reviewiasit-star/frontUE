import React, { useState, useEffect } from 'react';

function ProductoModal({ isOpen, onClose, onSave, almacenes, producto }) {
  const [form, setForm] = useState({
    almacen_id: '',
    nombre: '',
    descripcion: '',
    precio_unitario: '',
    stock: '',
    stock_inicial: '',
    unidad: '',
    categoria: '',
    imagen: null,
    fecha_vencimiento: '',
    codigo: '',
    proveedor: '',
    precio_salida: '',
  });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [tipoProducto, setTipoProducto] = useState('no_perecedero');
  const [diasAlerta, setDiasAlerta] = useState(10);

  // Categorías que se consideran perecederas
  const categorias_perecederas = ['alimentos', 'bebidas', 'farmacia'];
  
  // Configuración de alertas por categoría
  const alertas_por_categoria = {
    'alimentos': 7,
    'bebidas': 15,
    'farmacia': 30
  };

  useEffect(() => {
    if (producto) {
      setForm({
        almacen_id: producto.almacen_id,
        nombre: producto.nombre,
        descripcion: producto.descripcion || '',
        precio_unitario: producto.precio_unitario,
        stock: producto.stock,
        stock_inicial: producto.stock_inicial || '',
        unidad: producto.unidad || '',
        categoria: producto.categoria || '',
        imagen: null,
        fecha_vencimiento: producto.fecha_vencimiento ? producto.fecha_vencimiento.slice(0, 10) : '',
        codigo: producto.codigo || '',
        proveedor: producto.proveedor || '',
        precio_salida: producto.precio_salida || '',
      });
      setPreview(producto.imagen ? `http://${window.location.hostname}:3001/uploads/${producto.imagen}` : null);
      setTipoProducto(producto.tipo_producto || 'no_perecedero');
      setDiasAlerta(producto.dias_alerta_vencimiento || 10);
    } else {
      setForm({ almacen_id: '', nombre: '', descripcion: '', precio_unitario: '', stock: '', stock_inicial: '', unidad: '', categoria: '', imagen: null, fecha_vencimiento: '', codigo: '', proveedor: '', precio_salida: '', });
      setPreview(null);
      setTipoProducto('no_perecedero');
      setDiasAlerta(10);
    }
  }, [producto, isOpen]);

  // Actualizar tipo de producto y días de alerta cuando cambia la categoría
  useEffect(() => {
    if (form.categoria) {
      const esPerecedero = categorias_perecederas.includes(form.categoria.toLowerCase());
      setTipoProducto(esPerecedero ? 'perecedero' : 'no_perecedero');
      
      const alertasPorCategoria = alertas_por_categoria[form.categoria.toLowerCase()];
      if (alertasPorCategoria) {
        setDiasAlerta(alertasPorCategoria);
      } else {
        setDiasAlerta(10);
      }
    }
  }, [form.categoria]);

  const handleChange = e => {
    const { name, value, files } = e.target;
    if (name === 'imagen') {
      setForm(f => ({ ...f, imagen: files[0] }));
      setPreview(files[0] ? URL.createObjectURL(files[0]) : null);
    } else {
      setForm(f => ({ ...f, [name]: value }));
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    
    // Validaciones específicas para productos perecederos
    if (tipoProducto === 'perecedero' && !form.fecha_vencimiento) {
      setError('Los productos perecederos requieren fecha de vencimiento');
      return;
    }
    
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && v !== '') formData.append(k, v);
      });
      
      // Si estamos creando un nuevo producto, asignar stock_inicial = stock
      if (!producto) {
        formData.append('stock_inicial', form.stock);
      }
      
      await onSave(formData);
      onClose();
    } catch {
      setError('Error al guardar');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{producto ? 'Editar Producto' : 'Registrar Producto'}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit} encType="multipart/form-data">
            <div className="modal-body row g-3">
              
              {/* Información del sistema de lotes */}
              {!producto && (
                <div className="col-12">
                  <div className={`alert ${tipoProducto === 'perecedero' ? 'alert-warning' : 'alert-info'}`}>
                    <div className="d-flex align-items-center">
                      <i className={`fa ${tipoProducto === 'perecedero' ? 'fa-clock' : 'fa-box'} me-2`}></i>
                      <div>
                        <strong>Tipo de producto: {tipoProducto === 'perecedero' ? 'Perecedero' : 'No Perecedero'}</strong>
                        <br />
                        <small>
                          {tipoProducto === 'perecedero' 
                            ? `Se creará un lote con fecha de vencimiento. Alertas: ${diasAlerta} días antes del vencimiento.`
                            : 'Se manejará como stock simple sin lotes ni fechas de vencimiento.'
                          }
                        </small>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="col-md-4">
                <select className="form-select" name="almacen_id" value={form.almacen_id} onChange={handleChange} required>
                  <option value="">Selecciona almacén</option>
                  {almacenes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div className="col-md-4">
                <input type="text" className="form-control" name="nombre" placeholder="Nombre" value={form.nombre} onChange={handleChange} required />
              </div>
              <div className="col-md-4">
                <input type="text" className="form-control" name="descripcion" placeholder="Descripción" value={form.descripcion} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <input type="number" className="form-control" name="precio_unitario" placeholder="Precio unitario" value={form.precio_unitario} onChange={handleChange} required min="0" step="0.01" />
              </div>
              <div className="col-md-4">
                <label className="form-label">{producto ? 'Stock actual' : 'Stock'}</label>
                <input type="number" className="form-control" name="stock" placeholder={producto ? "Stock actual" : "Stock"} value={form.stock} onChange={handleChange} required min="0" />
              </div>
              <div className="col-md-4">
                <label className="form-label">Unidad</label>
                <select
                  className="form-select"
                  name="unidad"
                  value={form.unidad || ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecciona unidad</option>
                  <option value="unidad">Unidad</option>
                  <option value="ml">Mililitro (ml)</option>
                  <option value="l">Litro (l)</option>
                  <option value="g">Gramo (g)</option>
                  <option value="kg">Kilogramo (kg)</option>
                  <option value="caja">Caja</option>
                  <option value="paquete">Paquete</option>
                  <option value="docena">Docena</option>
                  <option value="metro">Metro</option>
                  <option value="cm">Centímetro (cm)</option>
                  <option value="otro">Otro</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">Categoría</label>
                <select
                  className="form-select"
                  name="categoria"
                  value={form.categoria || ''}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecciona categoría</option>
                  <option value="alimentos">Alimentos 🥗 (Perecedero)</option>
                  <option value="bebidas">Bebidas 🥤 (Perecedero)</option>
                  <option value="farmacia">Farmacia 💊 (Perecedero)</option>
                  <option value="limpieza">Limpieza 🧽</option>
                  <option value="papeleria">Papelería 📝</option>
                  <option value="material escolar">Material escolar 📚</option>
                  <option value="muebles">Muebles 🪑</option>
                  <option value="tecnologia">Tecnología 💻</option>
                  <option value="ropa">Ropa 👕</option>
                  <option value="juguetes">Juguetes 🧸</option>
                  <option value="deportes">Deportes ⚽</option>
                  <option value="ferreteria">Ferretería 🔧</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              <div className="col-md-4">
                <label className="form-label">
                  Fecha de vencimiento 
                  {tipoProducto === 'perecedero' && <span className="text-danger">*</span>}
                </label>
                <input 
                  type="date" 
                  className="form-control" 
                  name="fecha_vencimiento" 
                  value={form.fecha_vencimiento} 
                  onChange={handleChange}
                  required={tipoProducto === 'perecedero'}
                  disabled={tipoProducto === 'no_perecedero'}
                />
                {tipoProducto === 'no_perecedero' && (
                  <small className="text-muted">No aplica para productos no perecederos</small>
                )}
              </div>
              <div className="col-md-4">
                <label className="form-label">Código de item</label>
                <input type="text" className="form-control" name="codigo" placeholder="Código de item" value={form.codigo} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <input type="text" className="form-control" name="proveedor" placeholder="Proveedor" value={form.proveedor || ''} onChange={handleChange} />
              </div>
              <div className="col-md-4">
                <input type="number" className="form-control" name="precio_salida" placeholder="Precio de venta" value={form.precio_salida || ''} onChange={handleChange} min="0" step="0.01" />
              </div>
              <div className="col-md-4">
                <input type="file" className="form-control" name="imagen" accept="image/*" onChange={handleChange} />
              </div>
              {preview && (
                <div className="col-md-4 d-flex align-items-end">
                  <img src={preview} alt="preview" style={{ maxWidth: 80, maxHeight: 80, borderRadius: 8, border: '1px solid #ccc' }} />
                </div>
              )}
              {error && <div className="col-12 alert alert-danger">{error}</div>}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
              <button type="submit" className="btn btn-success">{producto ? 'Actualizar' : 'Registrar'}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default ProductoModal;