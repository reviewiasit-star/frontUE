import React, { useState, useEffect } from 'react';

const DuplicarProductoModal = ({ isOpen, onClose, producto, almacenes, onSave }) => {
  const [formData, setFormData] = useState({
    codigo: '',
    stock: '',
    precio_salida: '',
    fecha_vencimiento: ''
  });
  const [errors, setErrors] = useState({});
  const [imagen, setImagen] = useState(null);
  const [previewImagen, setPreviewImagen] = useState('');
  const [mantenerImagenOriginal, setMantenerImagenOriginal] = useState(true);

  useEffect(() => {
    if (producto && isOpen) {
      setFormData({
        codigo: producto.codigo ? `${producto.codigo}-COPIA` : '',
        stock: '',
        precio_salida: producto.precio_salida || '',
        fecha_vencimiento: producto.fecha_vencimiento || ''
      });
      setErrors({});
      setImagen(null);
      setPreviewImagen('');
      setMantenerImagenOriginal(true);
    }
  }, [producto, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Limpiar error del campo cuando el usuario empiece a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleImagenChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagen(file);
      setMantenerImagenOriginal(false);
      
      // Crear preview de la imagen
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImagen(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMantenerImagenChange = (e) => {
    const mantener = e.target.checked;
    setMantenerImagenOriginal(mantener);
    
    if (mantener) {
      setImagen(null);
      setPreviewImagen('');
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.codigo.trim()) {
      newErrors.codigo = 'El código es requerido';
    }

    if (!formData.stock || formData.stock <= 0) {
      newErrors.stock = 'El stock debe ser mayor a 0';
    }

    if (!formData.precio_salida || formData.precio_salida <= 0) {
      newErrors.precio_salida = 'El precio de venta debe ser mayor a 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Crear el FormData con todos los datos del producto original más los nuevos valores
    const submitFormData = new FormData();
    
    // Datos del producto original
    submitFormData.append('almacen_id', producto.almacen_id);
    submitFormData.append('nombre', producto.nombre);
    submitFormData.append('descripcion', producto.descripcion || '');
    submitFormData.append('precio_unitario', producto.precio_unitario);
    submitFormData.append('unidad', producto.unidad);
    submitFormData.append('categoria', producto.categoria);
    submitFormData.append('proveedor', producto.proveedor || '');
    
    // Nuevos valores modificados
    submitFormData.append('codigo', formData.codigo);
    submitFormData.append('stock', formData.stock);
    submitFormData.append('stock_inicial', formData.stock);
    submitFormData.append('precio_salida', formData.precio_salida);
    submitFormData.append('fecha_vencimiento', formData.fecha_vencimiento || '');

    // Manejar imagen
    if (mantenerImagenOriginal && producto.imagen) {
      // Enviar el nombre de la imagen original
      submitFormData.append('imagen_original', producto.imagen);
    } else if (imagen) {
      // Enviar nueva imagen
      submitFormData.append('imagen', imagen);
    }

    onSave(submitFormData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa fa-copy me-2"></i>
              Duplicar Producto: {producto?.nombre}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              {/* Información del producto original */}
              <div className="alert alert-info">
                <h6><i className="fa fa-info-circle me-2"></i>Producto a duplicar:</h6>
                <p className="mb-1"><strong>Nombre:</strong> {producto?.nombre}</p>
                <p className="mb-1"><strong>Categoría:</strong> {producto?.categoria}</p>
                <p className="mb-1"><strong>Almacén:</strong> {almacenes.find(a => a.id === producto?.almacen_id)?.nombre}</p>
                <p className="mb-0"><strong>Precio Compra:</strong> ${parseFloat(producto?.precio_unitario || 0).toFixed(2)}</p>
              </div>

              <div className="row">
                {/* Código del nuevo producto */}
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">
                      Código del nuevo producto <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${errors.codigo ? 'is-invalid' : ''}`}
                      name="codigo"
                      value={formData.codigo}
                      onChange={handleChange}
                      placeholder="Ingrese el código único"
                    />
                    {errors.codigo && (
                      <div className="invalid-feedback">{errors.codigo}</div>
                    )}
                  </div>
                </div>

                {/* Stock inicial */}
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">
                      Stock inicial <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${errors.stock ? 'is-invalid' : ''}`}
                      name="stock"
                      value={formData.stock}
                      onChange={handleChange}
                      placeholder="Cantidad inicial"
                      min="1"
                      step="1"
                    />
                    {errors.stock && (
                      <div className="invalid-feedback">{errors.stock}</div>
                    )}
                    <small className="form-text text-muted">
                      Unidad: {producto?.unidad}
                    </small>
                  </div>
                </div>

                {/* Precio de venta */}
                <div className="col-md-6">
                  <div className="form-group">
                    <label className="form-label">
                      Precio de venta <span className="text-danger">*</span>
                    </label>
                    <input
                      type="number"
                      className={`form-control ${errors.precio_salida ? 'is-invalid' : ''}`}
                      name="precio_salida"
                      value={formData.precio_salida}
                      onChange={handleChange}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                    />
                    {errors.precio_salida && (
                      <div className="invalid-feedback">{errors.precio_salida}</div>
                    )}
                  </div>
                </div>

                {/* Fecha de vencimiento (solo si el producto original la tiene) */}
                {producto?.fecha_vencimiento && (
                  <div className="col-md-6">
                    <div className="form-group">
                      <label className="form-label">Fecha de vencimiento</label>
                      <input
                        type="date"
                        className="form-control"
                        name="fecha_vencimiento"
                        value={formData.fecha_vencimiento || ''}
                        onChange={handleChange}
                      />
                      <small className="form-text text-muted">
                        Fecha original: {new Date(producto.fecha_vencimiento).toLocaleDateString()}
                      </small>
                    </div>
                  </div>
                )}

                {/* Sección de imagen */}
                <div className="col-12">
                  <div className="form-group">
                    <label className="form-label">Imagen del producto</label>
                    
                    {/* Checkbox para mantener imagen original */}
                    <div className="form-check mb-3">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="mantenerImagen"
                        checked={mantenerImagenOriginal}
                        onChange={handleMantenerImagenChange}
                      />
                      <label className="form-check-label" htmlFor="mantenerImagen">
                        Mantener imagen del producto original
                      </label>
                    </div>

                    {/* Preview de imagen original o nueva */}
                    <div className="row">
                      {/* Imagen original */}
                      {producto?.imagen && (
                        <div className="col-md-6">
                          <div className="card">
                            <div className="card-header">
                              <small className="text-muted">Imagen original</small>
                            </div>
                            <div className="card-body text-center">
                              <img 
                                src={`http://${window.location.hostname}:3001/uploads/${producto.imagen}`}
                                alt="Imagen original"
                                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                className="rounded"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Nueva imagen o placeholder */}
                      <div className="col-md-6">
                        <div className="card">
                          <div className="card-header">
                            <small className="text-muted">
                              {mantenerImagenOriginal ? 'Se usará la imagen original' : 'Nueva imagen'}
                            </small>
                          </div>
                          <div className="card-body text-center">
                            {!mantenerImagenOriginal && previewImagen ? (
                              <img 
                                src={previewImagen}
                                alt="Nueva imagen"
                                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                className="rounded"
                              />
                            ) : (
                              <div 
                                className="bg-light rounded d-flex align-items-center justify-content-center"
                                style={{ width: '100px', height: '100px', margin: '0 auto' }}
                              >
                                <i className="fa fa-image text-muted"></i>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Input de archivo para nueva imagen */}
                    {!mantenerImagenOriginal && (
                      <div className="mt-3">
                        <input
                          type="file"
                          className="form-control"
                          accept="image/*"
                          onChange={handleImagenChange}
                        />
                        <small className="form-text text-muted">
                          Selecciona una nueva imagen para el producto duplicado
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="alert alert-warning mt-3">
                <i className="fa fa-exclamation-triangle me-2"></i>
                <strong>Nota:</strong> Se creará un nuevo producto con los mismos datos del original, 
                pero con el código, stock y precio de venta que especifiques aquí.
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                <i className="fa fa-times me-2"></i>Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                <i className="fa fa-copy me-2"></i>Duplicar Producto
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DuplicarProductoModal;