import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import NotificationModal from '../components/NotificationModal';
import { useNotification } from '../hooks/useNotification';
import AuthService from '../services/authService';
import ModoDispositivo from '../components/modoDispositivo.jsx';

function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('crear'); // 'crear' o 'editar'
  const [form, setForm] = useState({ usuario: '', password: '', nombre: '', rol_id: 1 });
  const [editId, setEditId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  
  // Estados para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  
  // Hook para notificaciones
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  const fetchRoles = () => {
    const token = localStorage.getItem('token');
    fetch(`http://${window.location.hostname}:3001/api/roles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setRoles(data);
      })
      .catch(() => {
        console.error('Error al cargar roles');
      });
  };

  useEffect(() => {
    fetchUsuarios();
    fetchRoles();
    
    // Obtener información del usuario para el menú móvil
    const user = AuthService.getUser();
    setUserInfo(user);
  }, []);

  const fetchUsuarios = () => {
    setLoading(true);
    const token = localStorage.getItem('token');
    fetch(`http://${window.location.hostname}:3001/api/usuarios`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setUsuarios(data);
        else setError('Error al cargar usuarios');
        setLoading(false);
      })
      .catch(() => {
        setError('Error al cargar usuarios');
        setLoading(false);
      });
  };

  const openModal = (type, usuario = null) => {
    setModalType(type);
    setShowModal(true);
    if (type === 'editar' && usuario) {
      setForm({
        usuario: usuario.usuario,
        password: '',
        nombre: usuario.nombre,
        rol_id: usuario.rol_id || 1
      });
      setEditId(usuario.id);
    } else {
      setForm({ usuario: '', password: '', nombre: '', rol_id: 1 });
      setEditId(null);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setForm({ usuario: '', password: '', nombre: '', rol_id: 1 });
    setEditId(null);
  };

  const handleChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (modalType === 'editar') {
      setPendingSubmit(true);
      setShowUpdateModal(true);
      return;
    }
    if (modalType === 'crear') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://${window.location.hostname}:3001/api/usuarios`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(form)
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.ok) {
          showError('Error al crear usuario', result.message || 'Error desconocido');
          return;
        }
        
        showSuccess('Usuario creado', 'El usuario se ha creado exitosamente');
        closeModal();
        fetchUsuarios();
      } catch (error) {
        showError('Error al crear usuario', error.message);
      }
    }
  };

  const confirmUpdate = async () => {
    if (pendingSubmit && modalType === 'editar') {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://${window.location.hostname}:3001/api/usuarios/${editId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(form)
        });
        
        const result = await response.json();
        
        if (!response.ok || !result.ok) {
          showError('Error al actualizar usuario', result.message || 'Error desconocido');
          return;
        }
        
        showSuccess('Usuario actualizado', 'El usuario se ha actualizado exitosamente');
        setShowUpdateModal(false);
        setPendingSubmit(false);
        closeModal();
        fetchUsuarios();
      } catch (error) {
        showError('Error al actualizar usuario', error.message);
      }
    }
  };

  const cancelUpdate = () => {
    setShowUpdateModal(false);
    setPendingSubmit(false);
  };

  const handleDelete = id => {
    setUserToDelete(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      const token = localStorage.getItem('token');
      await fetch(`http://${window.location.hostname}:3001/api/usuarios/${userToDelete}`, { 
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchUsuarios();
      setShowDeleteModal(false);
      setUserToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setUserToDelete(null);
  };

  // Funciones para el menú móvil
  const handleMobileNavigate = (path) => {
    navigate(`/${path}`);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
  };

  if (loading) return <div>Cargando usuarios...</div>;
  if (error) return <div>{error}</div>;

  return (
    <div className="container py-4">
      {/* Header con botón hamburguesa para móviles */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Lista de Usuarios</h2>
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
      <button className="btn btn-primary mb-3" onClick={() => openModal('crear')}>Agregar Usuario</button>
      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Nombre Completo</th>
              <th>Rol</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map(u => (
              <tr key={u.id}>
                <td>{u.id}</td>
                <td>{u.usuario}</td>
                <td>{u.nombre}</td>
                <td>{u.rol}</td>
                <td>
                  <button className="btn btn-sm btn-warning me-2" onClick={() => openModal('editar', u)}>Editar</button>
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{modalType === 'crear' ? 'Agregar Usuario' : 'Editar Usuario'}</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Usuario</label>
                    <input type="text" className="form-control" name="usuario" value={form.usuario} onChange={handleChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Contraseña</label>
                    <input type="password" className="form-control" name="password" value={form.password} onChange={handleChange} required={modalType === 'crear'} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Nombre Completo</label>
                    <input type="text" className="form-control" name="nombre" value={form.nombre} onChange={handleChange} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Rol</label>
                    <select className="form-select" name="rol_id" value={form.rol_id} onChange={handleChange} required>
                      {roles.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Actualización</h5>
                <button type="button" className="btn-close" onClick={cancelUpdate}></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas actualizar este usuario?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelUpdate}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={confirmUpdate}>Actualizar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Eliminación</h5>
                <button type="button" className="btn-close" onClick={cancelDelete}></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas eliminar este usuario?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelDelete}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>Eliminar</button>
              </div>
            </div>
          </div>
        </div>
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

      {/* Modal de navegación móvil */}
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

export default Usuarios;