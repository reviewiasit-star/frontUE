import React, { useEffect, useState } from 'react';
import NotificationModal from '../../../components/NotificationModal';
import { useNotification } from '../../../hooks/useNotification';

const API_URL = `http://${window.location.hostname}:3001/api`;

function ServiciosAdmin() {
  const [servicios, setServicios] = useState([]);
  const [descripcion, setDescripcion] = useState('');
  const [editServicio, setEditServicio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  const cargar = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch(`${API_URL}/servicios`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setServicios(Array.isArray(data) ? data : []);
  };

  useEffect(() => {
    cargar();
  }, []);

  const solicitarGuardar = (e) => {
    e.preventDefault();
    if (!descripcion.trim()) return;
    setShowConfirmSave(true);
  };

  const ejecutarGuardar = async () => {
    setShowConfirmSave(false);
    setLoading(true);
    const token = localStorage.getItem('token');
    const url = editServicio ? `${API_URL}/servicios/${editServicio.id}` : `${API_URL}/servicios`;
    const method = editServicio ? 'PUT' : 'POST';
    try {
      const resp = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ descripcion: descripcion.trim() })
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        showSuccess(
          editServicio ? 'Servicio actualizado' : 'Servicio creado',
          editServicio
            ? 'El servicio fue actualizado correctamente.'
            : 'El servicio fue registrado correctamente.'
        );
        setDescripcion('');
        setEditServicio(null);
        cargar();
      } else {
        showError('Error', data.message || 'No se pudo guardar el servicio');
      }
    } catch {
      showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  const solicitarEliminar = (id) => {
    setDeleteId(id);
    setShowConfirmDelete(true);
  };

  const ejecutarEliminar = async () => {
    if (deleteId == null) return;
    setShowConfirmDelete(false);
    const token = localStorage.getItem('token');
    try {
      const resp = await fetch(`${API_URL}/servicios/${deleteId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json().catch(() => ({}));
      if (resp.ok) {
        showSuccess('Servicio eliminado', 'El servicio fue eliminado correctamente.');
        cargar();
      } else {
        showError('Error', data.message || 'No se pudo eliminar el servicio');
      }
    } catch {
      showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
      setDeleteId(null);
    }
  };

  const cancelarEliminar = () => {
    setShowConfirmDelete(false);
    setDeleteId(null);
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Servicios</h2>
      <form onSubmit={solicitarGuardar} className="card p-3 mb-4">
        <div className="row g-2 align-items-end">
          <div className="col-md-6">
            <label className="form-label">Descripción</label>
            <input
              className="form-control"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Almuerzo, Tutoría"
            />
          </div>
          <div className="col-md-3">
            <button className="btn btn-success w-100" type="submit" disabled={loading}>
              {loading ? 'Guardando...' : editServicio ? 'Actualizar' : 'Crear'}
            </button>
          </div>
          {editServicio && (
            <div className="col-md-3">
              <button
                className="btn btn-secondary w-100"
                type="button"
                onClick={() => {
                  setEditServicio(null);
                  setDescripcion('');
                }}
              >
                Cancelar edición
              </button>
            </div>
          )}
        </div>
      </form>

      <div className="card">
        <div className="card-header">Registrados</div>
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-striped mb-0">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Descripción</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {servicios.map((s) => (
                  <tr key={s.id}>
                    <td>{s.id}</td>
                    <td>{s.descripcion}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-warning me-2"
                        type="button"
                        onClick={() => {
                          setEditServicio(s);
                          setDescripcion(s.descripcion);
                        }}
                      >
                        Editar
                      </button>
                      <button className="btn btn-sm btn-danger" type="button" onClick={() => solicitarEliminar(s.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {servicios.length === 0 && (
                  <tr>
                    <td colSpan="3" className="text-center py-3">
                      Sin registros
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirmar guardar / actualizar */}
      {showConfirmSave && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar</h5>
                <button type="button" className="btn-close" onClick={() => setShowConfirmSave(false)} aria-label="Cerrar" />
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  {editServicio
                    ? '¿Confirma que desea actualizar este servicio?'
                    : '¿Confirma que desea registrar este nuevo servicio?'}
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmSave(false)}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-success" onClick={ejecutarGuardar} disabled={loading}>
                  {loading ? 'Guardando...' : 'Sí, confirmar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {showConfirmDelete && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog" style={{ background: 'rgba(0,0,0,0.35)' }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar eliminación</h5>
                <button type="button" className="btn-close" onClick={cancelarEliminar} aria-label="Cerrar" />
              </div>
              <div className="modal-body">
                <p className="mb-0">¿Está seguro de que desea eliminar este servicio? Esta acción no se puede deshacer.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelarEliminar}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-danger" onClick={ejecutarEliminar}>
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={notification.autoClose}
        autoCloseDelay={notification.autoCloseDelay}
      />
    </div>
  );
}

export default ServiciosAdmin;
