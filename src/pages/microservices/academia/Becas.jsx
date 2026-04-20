import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationModal from '../../../components/NotificationModal';
import { useNotification } from '../../../hooks/useNotification';
import AuthService from '../../../services/authService';
import ModoDispositivo from '../../../components/modoDispositivo.jsx';

function Becas() {
  const [becas, setBecas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [becaToDelete, setBecaToDelete] = useState(null);
  const [editingBeca, setEditingBeca] = useState(null);
  const [formData, setFormData] = useState({
    descripcion: '',
    descuento: ''
  });

  // Estados para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  // Hook para notificaciones
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);
    
    cargarBecas();
  }, []);

  const cargarBecas = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/becas`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setBecas(data);
      } else {
        setError('Error al cargar las becas');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const abrirModal = (beca = null) => {
    if (beca) {
      setEditingBeca(beca);
      setFormData({
        descripcion: beca.descripcion,
        descuento: beca.descuento
      });
    } else {
      setEditingBeca(null);
      setFormData({ descripcion: '', descuento: '' });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingBeca(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const url = editingBeca
        ? `http://${window.location.hostname}:3001/api/becas/${editingBeca.id}`
        : `http://${window.location.hostname}:3001/api/becas`;
      const method = editingBeca ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.ok) {
        showSuccess(
          editingBeca ? 'Beca actualizada' : 'Beca creada',
          editingBeca ? 'Beca actualizada exitosamente' : 'Beca creada exitosamente'
        );
        cerrarModal();
        cargarBecas();
      } else {
        showError('Error', data.message);
      }
    } catch (err) {
      showError('Error de conexión', 'No se pudo conectar con el servidor');
    }
  };

  const eliminarBeca = (beca) => {
    setBecaToDelete(beca);
    setShowDeleteModal(true);
  };

  const confirmarEliminarBeca = async () => {
    if (!becaToDelete) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/becas/${becaToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.ok) {
        if (data.action === 'desactivada') {
          showSuccess('Beca actualizada', data.message || 'La beca en uso se actualizó a 0%');
        } else {
          showSuccess('Beca eliminada', data.message || 'Beca eliminada exitosamente');
        }
        cargarBecas();
      } else {
        showError('Error', data.message);
      }
    } catch {
      showError('Error de conexión', 'No se pudo conectar con el servidor');
    } finally {
      setShowDeleteModal(false);
      setBecaToDelete(null);
    }
  };

  const cancelarEliminarBeca = () => {
    setShowDeleteModal(false);
    setBecaToDelete(null);
  };

  // Funciones para el menú móvil
  const handleMobileNavigate = (path) => {
    setShowMobileMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
  };

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <div className="d-flex justify-content-between align-items-center w-100">
            <h4 className="mb-0">Gestión de Becas</h4>
            <div className="d-flex align-items-center">
              <button className="btn btn-primary me-2" onClick={() => abrirModal()}>Nueva Beca</button>
              <button 
                className="btn btn-outline-primary d-md-none"
                onClick={() => setShowMobileMenu(true)}
                style={{ 
                  border: 'none', 
                  background: 'transparent',
                  fontSize: '1.5rem',
                  padding: '0.5rem'
                }}
              >
                <i className="fas fa-bars"></i>
              </button>
            </div>
          </div>
        </div>
        <div className="card-body">
          {loading ? (
            <div>Cargando...</div>
          ) : error ? (
            <div className="alert alert-danger">{error}</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-bordered table-hover">
                <thead className="thead-light">
                  <tr>
                    <th>ID</th>
                    <th>Descripción</th>
                    <th>Descuento (%)</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {becas.length === 0 ? (
                    <tr><td colSpan="4" className="text-center">No hay becas registradas</td></tr>
                  ) : (
                    becas.map(beca => (
                      <tr key={beca.id}>
                        <td>{beca.id}</td>
                        <td>{beca.descripcion}</td>
                        <td>{beca.descuento}</td>
                        <td>
                          <button className="btn btn-sm btn-warning me-2" onClick={() => abrirModal(beca)}>Editar</button>
                          <button className="btn btn-sm btn-danger" onClick={() => eliminarBeca(beca)}>Eliminar</button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      {/* Modal */}
      {showModal && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingBeca ? 'Editar Beca' : 'Nueva Beca'}</h5>
                <button type="button" className="btn-close" onClick={cerrarModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Descripción</label>
                    <input
                      type="text"
                      className="form-control"
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Descuento (%)</label>
                    <input
                      type="number"
                      className="form-control"
                      name="descuento"
                      value={formData.descuento}
                      onChange={handleChange}
                      min="0"
                      max="100"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrarModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">{editingBeca ? 'Actualizar' : 'Crear'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Overlay del modal */}
      {showModal && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Modal de confirmación para eliminar beca */}
      {showDeleteModal && (
        <div className="modal fade show d-block" tabIndex="-1" role="dialog">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar eliminación</h5>
                <button type="button" className="btn-close" onClick={cancelarEliminarBeca}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  ¿Estás seguro de que quieres eliminar la beca
                  {becaToDelete?.descripcion ? ` "${becaToDelete.descripcion}"` : ''}?
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelarEliminarBeca}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={confirmarEliminarBeca}>Sí, eliminar</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteModal && (
        <div className="modal-backdrop fade show"></div>
      )}
      
      {/* Modal de notificaciones */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={notification.autoClose}
        autoCloseDelay={notification.autoCloseDelay}
      />

      {/* Modal del menú móvil */}
      <ModoDispositivo
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        onNavigate={handleMobileNavigate}
        onLogout={handleLogout}
        user={userInfo}
      />
    </div>
  );
}

export default Becas;