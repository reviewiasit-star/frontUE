import React, { useState } from 'react';

function AgregarStockModal({ isOpen, onClose, producto, onStockAdded }) {
  const [form, setForm] = useState({
    cantidad: '',
    fecha_vencimiento: '',
    numero_lote: '',
    motivo: 'compra'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validaciones
    if (!form.cantidad || form.cantidad <= 0) {
      setError('La cantidad debe ser mayor a 0');
      setLoading(false);
      return;
    }

    if (producto?.tipo_producto === 'perecedero' && !form.fecha_vencimiento) {
      setError('Los productos perecederos requieren fecha de vencimiento');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`http://${window.location.hostname}:3001/api/productos/${producto.id}/agregar-stock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cantidad: parseInt(form.cantidad),
          fecha_vencimiento: form.fecha_vencimiento || null,
          numero_lote: form.numero_lote || null,
          motivo: form.motivo
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Resetear formulario
        setForm({
          cantidad: '',
          fecha_vencimiento: '',
          numero_lote: '',
          motivo: 'compra'
        });
        
        // Notificar al componente padre
        if (onStockAdded) {
          onStockAdded(data);
        }
        
        onClose();
      } else {
        setError(data.error || 'Error al agregar stock');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      cantidad: '',
      fecha_vencimiento: '',
      numero_lote: '',
      motivo: 'compra'
    });
    setError('');
  };

  // Resetear formulario cuando se abre/cierra el modal
  React.useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen || !producto) return null;

  const esPerecedero = producto.tipo_producto === 'perecedero';

  return (
    <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fa fa-plus-circle me-2"></i>
              Agregar Stock - {producto.nombre}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              
              {/* Información del producto */}
              <div className="alert alert-info mb-3">
                <div className="d-flex align-items-center">
                  <i className={`fa ${esPerecedero ? 'fa-clock' : 'fa-box'} me-2`}></i>
                  <div>
                    <strong>Tipo: {esPerecedero ? 'Perecedero' : 'No Perecedero'}</strong>
                    <br />
                    <small>
                      Stock actual: {producto.stock} {producto.unidad} | 
                      Categoría: {producto.categoria}
                    </small>
                  </div>
                </div>
              </div>

              {/* Formulario */}
              <div className="mb-3">
                <label className="form-label">Cantidad a agregar *</label>
                <div className="input-group">
                  <input
                    type="number"
                    className="form-control"
                    name="cantidad"
                    value={form.cantidad}
                    onChange={handleChange}
                    min="1"
                    required
                    placeholder="Ingrese la cantidad"
                  />
                  <span className="input-group-text">{producto.unidad}</span>
                </div>
              </div>

              {esPerecedero && (
                <>
                  <div className="mb-3">
                    <label className="form-label">
                      Fecha de vencimiento *
                      <span className="text-danger ms-1">Requerido para productos perecederos</span>
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      name="fecha_vencimiento"
                      value={form.fecha_vencimiento}
                      onChange={handleChange}
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Número de lote
                      <small className="text-muted ms-2">(Opcional - se generará automáticamente si no se especifica)</small>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="numero_lote"
                      value={form.numero_lote}
                      onChange={handleChange}
                      placeholder="Ej: LOTE-2024-001"
                    />
                  </div>
                </>
              )}

              <div className="mb-3">
                <label className="form-label">Motivo del ingreso</label>
                <select
                  className="form-select"
                  name="motivo"
                  value={form.motivo}
                  onChange={handleChange}
                >
                  <option value="compra">Compra</option>
                  <option value="devolucion">Devolución</option>
                  <option value="ajuste_inventario">Ajuste de inventario</option>
                  <option value="transferencia">Transferencia</option>
                  <option value="produccion">Producción interna</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              {error && (
                <div className="alert alert-danger">
                  <i className="fa fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* Información adicional para productos perecederos */}
              {esPerecedero && (
                <div className="alert alert-warning">
                  <i className="fa fa-info-circle me-2"></i>
                  <strong>Información importante:</strong>
                  <ul className="mb-0 mt-2">
                    <li>Se creará un nuevo lote con la fecha de vencimiento especificada</li>
                    <li>Las alertas se configurarán automáticamente según la categoría del producto</li>
                    <li>El sistema aplicará la lógica FIFO (primero en entrar, primero en salir) para las ventas</li>
                  </ul>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button 
                type="button" 
                className="btn btn-secondary" 
                onClick={onClose}
                disabled={loading}
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Agregando...
                  </>
                ) : (
                  <>
                    <i className="fa fa-plus me-2"></i>
                    Agregar Stock
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default AgregarStockModal;