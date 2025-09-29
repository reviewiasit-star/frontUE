import React, { useState, useEffect } from "react";
import { Link, useNavigate } from 'react-router-dom';
import NotificationModal from '../components/NotificationModal';
import { useNotification } from '../hooks/useNotification';
import AuthService from '../services/authService';
import ModoDispositivo from '../components/modoDispositivo.jsx';

const API_URL = `http://${window.location.hostname}:3001/api`;

function Academia() {
  // Estados para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();
  
  // Hook para notificaciones
  const { notification, showSuccess, showError, showWarning, hideNotification } = useNotification();
  
  // Estados para gestión de bloques
  const [bloques, setBloques] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [showBloqueModal, setShowBloqueModal] = useState(false);
  const [editingBloque, setEditingBloque] = useState(null);
  
  useEffect(() => {
    // Obtener información del usuario para el menú móvil
    const user = AuthService.getUser();
    setUserInfo(user);
    cargarDatos();
    
    // Inicializar dropdowns de Bootstrap después de que se carguen los scripts
    const initializeDropdowns = () => {
      if (window.bootstrap && window.bootstrap.Dropdown) {
        // Inicializar todos los dropdowns
        const dropdownElementList = document.querySelectorAll('.dropdown-toggle');
        dropdownElementList.forEach(dropdownToggleEl => {
          if (!dropdownToggleEl.hasAttribute('data-bs-initialized')) {
            new window.bootstrap.Dropdown(dropdownToggleEl);
            dropdownToggleEl.setAttribute('data-bs-initialized', 'true');
          }
        });
      } else {
        // Si Bootstrap no está disponible aún, intentar de nuevo en 100ms
        setTimeout(initializeDropdowns, 100);
      }
    };

    // Inicializar dropdowns cuando el componente se monta
    setTimeout(initializeDropdowns, 500);

    // Agregar listener para cerrar dropdowns al hacer clic fuera
    const handleClickOutside = (event) => {
      if (!event.target.closest('.dropdown')) {
        document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
          menu.classList.remove('show');
        });
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  // Reinicializar dropdowns cuando cambian los datos
  useEffect(() => {
    const reinitializeDropdowns = () => {
      if (window.bootstrap && window.bootstrap.Dropdown) {
        const dropdownElementList = document.querySelectorAll('.dropdown-toggle');
        dropdownElementList.forEach(dropdownToggleEl => {
          if (!dropdownToggleEl.hasAttribute('data-bs-initialized')) {
            new window.bootstrap.Dropdown(dropdownToggleEl);
            dropdownToggleEl.setAttribute('data-bs-initialized', 'true');
          }
        });
      }
    };
    
    setTimeout(reinitializeDropdowns, 100);
  }, [bloques, niveles, cursos]);

  // Manejar clicks en dropdowns manualmente si Bootstrap falla
  const handleDropdownClick = (event) => {
    event.preventDefault();
    const dropdownToggle = event.currentTarget;
    const dropdownMenu = dropdownToggle.nextElementSibling;
    
    if (dropdownMenu && dropdownMenu.classList.contains('dropdown-menu')) {
      // Cerrar otros dropdowns abiertos
      document.querySelectorAll('.dropdown-menu.show').forEach(menu => {
        if (menu !== dropdownMenu) {
          menu.classList.remove('show');
        }
      });
      
      // Toggle del dropdown actual
      dropdownMenu.classList.toggle('show');
    }
  };

  const cargarDatos = async () => {
    const token = localStorage.getItem('token');
    try {
      const [bloquesRes, nivelesRes, cursosRes] = await Promise.all([
        fetch(`${API_URL}/bloques`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/niveles`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${API_URL}/cursos`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      setBloques(await bloquesRes.json());
      setNiveles(await nivelesRes.json());
      setCursos(await cursosRes.json());
    } catch (error) {
      showError("Error", "No se pudieron cargar los datos");
    }
  };

  // Funciones para el menú móvil
  const handleMobileNavigate = (path) => {
    navigate(`/${path}`);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
  };
  
  return (
    <div className="container mt-4">
      {/* Header con botón hamburguesa para móviles */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Academia - Gestión Educativa</h2>
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-primary me-2"
            onClick={() => {
              setEditingBloque(null);
              setShowBloqueModal(true);
            }}
          >
            <i className="fas fa-plus me-2"></i>Nuevo Bloque
          </button>
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

      <div className="alert alert-info mb-4">
        <i className="fas fa-info-circle me-2"></i>
        <strong>Estructura Educativa:</strong> Bloques → Niveles → Cursos
      </div>

      <GestionBloques 
        bloques={bloques}
        niveles={niveles}
        cursos={cursos}
        showSuccess={showSuccess} 
        showError={showError} 
        showWarning={showWarning}
        onDataChange={cargarDatos}
        onEditBloque={(bloque) => {
          setEditingBloque(bloque);
          setShowBloqueModal(true);
        }}
        handleDropdownClick={handleDropdownClick}
      />
      
      {/* Modal para gestión de bloques */}
      <BloqueModal
        isOpen={showBloqueModal}
        onClose={() => {
          setShowBloqueModal(false);
          setEditingBloque(null);
        }}
        bloque={editingBloque}
        onSuccess={() => {
          cargarDatos();
          setShowBloqueModal(false);
          setEditingBloque(null);
        }}
        showSuccess={showSuccess}
        showError={showError}
      />
      
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

// Componente Modal para gestión de bloques
function BloqueModal({ isOpen, onClose, bloque, onSuccess, showSuccess, showError }) {
  const [formData, setFormData] = useState({ descripcion: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (bloque) {
      setFormData({ descripcion: bloque.descripcion });
    } else {
      setFormData({ descripcion: '' });
    }
  }, [bloque]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.descripcion.trim()) return;

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      const url = bloque ? `${API_URL}/bloques/${bloque.id}` : `${API_URL}/bloques`;
      const method = bloque ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showSuccess('Éxito', `Bloque ${bloque ? 'actualizado' : 'creado'} correctamente`);
        onSuccess();
      } else {
        showError('Error', `No se pudo ${bloque ? 'actualizar' : 'crear'} el bloque`);
      }
    } catch (error) {
      showError('Error', `No se pudo ${bloque ? 'actualizar' : 'crear'} el bloque`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              <i className="fas fa-layer-group me-2"></i>
              {bloque ? 'Editar Bloque' : 'Nuevo Bloque'}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="mb-3">
                <label className="form-label">Descripción del Bloque</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ej: BLOQUE INICIAL, BLOQUE PRIMARIA"
                  value={formData.descripcion}
                  onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    {bloque ? 'Actualizando...' : 'Creando...'}
                  </>
                ) : (
                  <>
                    <i className="fas fa-save me-2"></i>
                    {bloque ? 'Actualizar' : 'Crear'}
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

function GestionBloques({ bloques, niveles, cursos, showSuccess, showError, showWarning, onDataChange, onEditBloque, handleDropdownClick }) {
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBloque, setSelectedBloque] = useState(null);

  const eliminarBloque = async (bloqueId, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Seguro que deseas eliminar este bloque? Se eliminarán todos sus niveles y cursos.")) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/bloques/${bloqueId}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showSuccess("Éxito", "Bloque eliminado correctamente");
        onDataChange();
      }
    } catch (error) {
      showError("Error", "No se pudo eliminar el bloque");
    }
  };

  const handleBloqueClick = (bloque) => {
    setSelectedBloque(bloque);
    setShowDetailModal(true);
  };

  const getNivelesCount = (bloqueId) => {
    return niveles.filter(nivel => nivel.bloque_id === bloqueId).length;
  };

  const getCursosCount = (bloqueId) => {
    const nivelesDelBloque = niveles.filter(nivel => nivel.bloque_id === bloqueId);
    return cursos.filter(curso => 
      nivelesDelBloque.some(nivel => nivel.id === curso.nivel_id)
    ).length;
  };

  return (
    <div>
      <h3 className="mb-4">
        <i className="fas fa-layer-group me-2"></i>
        Gestión de Bloques Educativos
      </h3>
      
      {bloques.length === 0 ? (
        <div className="text-center py-5">
          <i className="fas fa-layer-group fa-3x text-muted mb-3"></i>
          <h5 className="text-muted">No hay bloques creados</h5>
          <p className="text-muted">Crea tu primer bloque educativo para comenzar</p>
        </div>
      ) : (
        <div className="row">
          {bloques.map((bloque) => (
            <div key={bloque.id} className="col-md-6 col-lg-4 mb-4">
              <div 
                className="card h-100 shadow-sm border-0"
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  borderLeft: '4px solid #007bff'
                }}
                onClick={() => handleBloqueClick(bloque)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-5px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,123,255,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
                }}
              >
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <h5 className="card-title mb-0 text-primary">
                      <i className="fas fa-layer-group me-2"></i>
                      {bloque.descripcion}
                    </h5>
                    <div className="dropdown">
                      <button 
                        className="btn btn-sm btn-outline-secondary dropdown-toggle"
                        type="button"
                        id={`dropdownBloque${bloque.id}`}
                        aria-expanded="false"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDropdownClick(e);
                        }}
                      >
                        <i className="fas fa-ellipsis-v"></i>
                      </button>
                      <ul className="dropdown-menu" aria-labelledby={`dropdownBloque${bloque.id}`}>
                        <li>
                          <button 
                            className="dropdown-item"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditBloque(bloque);
                            }}
                          >
                            <i className="fas fa-edit me-2"></i>Editar
                          </button>
                        </li>
                        <li>
                          <button 
                            className="dropdown-item text-danger"
                            onClick={(e) => eliminarBloque(bloque.id, e)}
                          >
                            <i className="fas fa-trash me-2"></i>Eliminar
                          </button>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  <div className="row text-center">
                    <div className="col-6">
                      <div className="border-end">
                        <h4 className="text-success mb-1">{getNivelesCount(bloque.id)}</h4>
                        <small className="text-muted">Niveles</small>
                      </div>
                    </div>
                    <div className="col-6">
                      <h4 className="text-info mb-1">{getCursosCount(bloque.id)}</h4>
                      <small className="text-muted">Cursos</small>
                    </div>
                  </div>
                  
                  <div className="mt-3 pt-3 border-top">
                    <small className="text-muted">
                      <i className="fas fa-mouse-pointer me-1"></i>
                      Haz clic para gestionar niveles y cursos
                    </small>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalle del bloque */}
      <BloqueDetailModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedBloque(null);
        }}
        bloque={selectedBloque}
        niveles={niveles}
        cursos={cursos}
        onDataChange={onDataChange}
        showSuccess={showSuccess}
        showError={showError}
        showWarning={showWarning}
        handleDropdownClick={handleDropdownClick}
      />
    </div>
  );
}

// Modal detallado para gestión de niveles y cursos dentro de un bloque
function BloqueDetailModal({ isOpen, onClose, bloque, niveles, cursos, onDataChange, showSuccess, showError, showWarning, handleDropdownClick }) {
  const [activeTab, setActiveTab] = useState('niveles');
  const [showNivelForm, setShowNivelForm] = useState(false);
  const [showCursoForm, setShowCursoForm] = useState(false);
  const [editingNivel, setEditingNivel] = useState(null);
  const [editingCurso, setEditingCurso] = useState(null);
  const [viewMode, setViewMode] = useState('niveles'); // 'niveles' o 'cursos'
  const [selectedNivel, setSelectedNivel] = useState(null);
  const [nivelFormData, setNivelFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    meses: ['febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre']
  });
  const [cursoFormData, setCursoFormData] = useState({
    nombre: '',
    nivel_id: ''
  });

  const bloquesNiveles = niveles.filter(nivel => nivel.bloque_id === bloque?.id);
  const bloquesCursos = cursos.filter(curso => 
    bloquesNiveles.some(nivel => nivel.id === curso.nivel_id)
  );

  const resetNivelForm = () => {
    setNivelFormData({ 
      nombre: '', 
      descripcion: '', 
      precio: '',
      meses: ['febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre']
    });
    setEditingNivel(null);
    setShowNivelForm(false);
  };

  const resetCursoForm = () => {
    setCursoFormData({ nombre: '', nivel_id: '' });
    setEditingCurso(null);
    setShowCursoForm(false);
  };

  const handleNivelClick = (nivel) => {
    setSelectedNivel(nivel);
    setViewMode('cursos');
  };

  const handleBackToNiveles = () => {
    setViewMode('niveles');
    setSelectedNivel(null);
    setShowCursoForm(false);
    setEditingCurso(null);
  };

  const handleEditCurso = (curso) => {
    setEditingCurso(curso);
    setCursoFormData({
      nombre: curso.nombre,
      nivel_id: curso.nivel_id
    });
    setShowCursoForm(true);
  };

  const handleDeleteCurso = (cursoId) => {
    eliminarCurso(cursoId);
  };

  const handleEditNivel = (nivel) => {
    setEditingNivel(nivel);
    setNivelFormData({
      nombre: nivel.nombre,
      descripcion: nivel.descripcion,
      precio: nivel.precio
    });
    setShowNivelForm(true);
  };

  const handleDeleteNivel = async (nivelId) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar este nivel?')) {
      try {
        await AuthService.deleteNivel(nivelId);
        showSuccess('Nivel eliminado exitosamente');
        onDataChange();
      } catch (error) {
        showError('Error al eliminar el nivel');
      }
    }
  };

  useEffect(() => {
    if (editingNivel) {
      setNivelFormData({
        nombre: editingNivel.nombre,
        descripcion: editingNivel.descripcion,
        precio: editingNivel.precio,
        meses: editingNivel.meses || ['febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre']
      });
      setShowNivelForm(true);
    } else {
      setNivelFormData({ 
        nombre: '', 
        descripcion: '', 
        precio: '',
        meses: ['febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre']
      });
    }
  }, [editingNivel]);

  useEffect(() => {
    if (editingCurso) {
      setCursoFormData({
        nombre: editingCurso.nombre,
        nivel_id: editingCurso.nivel_id
      });
      setShowCursoForm(true);
    } else {
      setCursoFormData({ nombre: '', nivel_id: '' });
    }
  }, [editingCurso]);

  const handleNivelSubmit = async (e) => {
    e.preventDefault();
    if (!nivelFormData.nombre || !nivelFormData.descripcion || !nivelFormData.precio) return;

    const token = localStorage.getItem('token');
    try {
      const url = editingNivel ? `${API_URL}/niveles/${editingNivel.id}` : `${API_URL}/niveles`;
      const method = editingNivel ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...nivelFormData,
          bloque_id: bloque.id
        })
      });

      if (response.ok) {
        showSuccess('Éxito', `Nivel ${editingNivel ? 'actualizado' : 'creado'} correctamente`);
        setShowNivelForm(false);
        setEditingNivel(null);
        onDataChange();
      }
    } catch (error) {
      showError('Error', `No se pudo ${editingNivel ? 'actualizar' : 'crear'} el nivel`);
    }
  };

  const handleCursoSubmit = async (e) => {
    e.preventDefault();
    if (!cursoFormData.nombre || !cursoFormData.nivel_id) return;

    const token = localStorage.getItem('token');
    try {
      const url = editingCurso ? `${API_URL}/cursos/${editingCurso.id}` : `${API_URL}/cursos`;
      const method = editingCurso ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(cursoFormData)
      });

      if (response.ok) {
        showSuccess('Éxito', `Curso ${editingCurso ? 'actualizado' : 'creado'} correctamente`);
        setShowCursoForm(false);
        setEditingCurso(null);
        onDataChange();
      }
    } catch (error) {
      showError('Error', `No se pudo ${editingCurso ? 'actualizar' : 'crear'} el curso`);
    }
  };

  const eliminarNivel = async (nivelId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este nivel? Se eliminarán todos sus cursos.")) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/niveles/${nivelId}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showSuccess("Éxito", "Nivel eliminado correctamente");
        onDataChange();
      }
    } catch (error) {
      showError("Error", "No se pudo eliminar el nivel");
    }
  };

  const eliminarCurso = async (cursoId) => {
    if (!window.confirm("¿Seguro que deseas eliminar este curso?")) return;
    
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`${API_URL}/cursos/${cursoId}`, {
        method: "DELETE",
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        showSuccess("Éxito", "Curso eliminado correctamente");
        onDataChange();
      }
    } catch (error) {
      showError("Error", "No se pudo eliminar el curso");
    }
  };

  if (!isOpen || !bloque) return null;

  return (
    <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl">
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <div className="d-flex align-items-center">
              {viewMode === 'cursos' && (
                <button
                  onClick={handleBackToNiveles}
                  className="btn btn-outline-light btn-sm me-3"
                >
                  <i className="fas fa-arrow-left me-2"></i>Volver
                </button>
              )}
              <h5 className="modal-title mb-0">
                <i className="fas fa-layer-group me-2"></i>
                {viewMode === 'niveles' ? bloque.descripcion : `Cursos de ${selectedNivel?.nombre}`}
              </h5>
            </div>
            <button type="button" className="btn-close btn-close-white" onClick={onClose}></button>
          </div>
          
          <div className="modal-body p-0">
            {viewMode === 'niveles' && (
              <>
                {/* Tabs */}
                <ul className="nav nav-tabs">
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeTab === 'niveles' ? 'active' : ''}`}
                      onClick={() => setActiveTab('niveles')}
                    >
                      <i className="fas fa-layer-group me-2"></i>
                      Niveles ({bloquesNiveles.length})
                    </button>
                  </li>
                  <li className="nav-item">
                    <button 
                      className={`nav-link ${activeTab === 'cursos' ? 'active' : ''}`}
                      onClick={() => setActiveTab('cursos')}
                    >
                      <i className="fas fa-book me-2"></i>
                      Cursos ({bloquesCursos.length})
                    </button>
                  </li>
                </ul>
              </>
            )}

            {/* Contenido de las tabs */}
            <div className="p-4">
              {activeTab === 'niveles' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">Gestión de Niveles</h5>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setEditingNivel(null);
                        setShowNivelForm(true);
                      }}
                    >
                      <i className="fas fa-plus me-2"></i>Nuevo Nivel
                    </button>
                  </div>

                  {/* Formulario de nivel */}
                  {showNivelForm && (
                    <div className="card mb-4">
                      <div className="card-header">
                        <h6 className="mb-0">
                          {editingNivel ? 'Editar Nivel' : 'Nuevo Nivel'}
                        </h6>
                      </div>
                      <div className="card-body">
                        <form onSubmit={handleNivelSubmit}>
                          <div className="row">
                            <div className="col-md-4">
                              <label className="form-label">Nombre</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Ej: Primer Nivel"
                                value={nivelFormData.nombre}
                                onChange={(e) => setNivelFormData({...nivelFormData, nombre: e.target.value})}
                                required
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Precio</label>
                              <input
                                type="number"
                                step="0.01"
                                className="form-control"
                                placeholder="0.00"
                                value={nivelFormData.precio}
                                onChange={(e) => setNivelFormData({...nivelFormData, precio: e.target.value})}
                                required
                              />
                            </div>
                            <div className="col-md-4">
                              <label className="form-label">Descripción</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Descripción del nivel"
                                value={nivelFormData.descripcion}
                                onChange={(e) => setNivelFormData({...nivelFormData, descripcion: e.target.value})}
                                required
                              />
                            </div>
                          </div>
                          
                          {/* Campo de selección de meses */}
                          <div className="row mt-3">
                            <div className="col-12">
                              <label className="form-label">Duración del nivel (meses)</label>
                              <div className="row">
                                {['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'].map((mes) => (
                                  <div key={mes} className="col-md-3 col-sm-4 col-6 mb-2">
                                    <div className="form-check">
                                      <input
                                        className="form-check-input"
                                        type="checkbox"
                                        id={`mes-${mes}`}
                                        checked={nivelFormData.meses.includes(mes)}
                                        onChange={(e) => {
                                          const mesesActuales = [...nivelFormData.meses];
                                          if (e.target.checked) {
                                            if (!mesesActuales.includes(mes)) {
                                              mesesActuales.push(mes);
                                            }
                                          } else {
                                            const index = mesesActuales.indexOf(mes);
                                            if (index > -1) {
                                              mesesActuales.splice(index, 1);
                                            }
                                          }
                                          setNivelFormData({...nivelFormData, meses: mesesActuales});
                                        }}
                                      />
                                      <label className="form-check-label text-capitalize" htmlFor={`mes-${mes}`}>
                                        {mes}
                                      </label>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <small className="form-text text-muted">
                                Selecciona los meses en los que estará activo este nivel educativo
                              </small>
                            </div>
                          </div>
                          <div className="mt-3">
                            <button type="submit" className="btn btn-success me-2">
                              <i className="fas fa-save me-2"></i>
                              {editingNivel ? 'Actualizar' : 'Crear'}
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-secondary"
                              onClick={() => {
                                setShowNivelForm(false);
                                setEditingNivel(null);
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Lista de niveles */}
                  {bloquesNiveles.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-layer-group fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">No hay niveles en este bloque</h5>
                      <p className="text-muted">Crea el primer nivel para comenzar</p>
                    </div>
                  ) : (
                    <div className="row">
                      {bloquesNiveles.map((nivel) => (
                        <div key={nivel.id} className="col-md-6 col-lg-4 mb-3">
                          <div 
                            className="card border-success"
                            style={{ cursor: 'pointer' }}
                            onClick={() => handleNivelClick(nivel)}
                          >
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="card-title text-success mb-0">
                                  <i className="fas fa-layer-group me-2"></i>
                                  {nivel.nombre}
                                </h6>
                                <div className="dropdown">
                                  <button 
                                    className="btn btn-sm btn-outline-secondary dropdown-toggle"
                                    type="button"
                                    id={`dropdownNivel${nivel.id}`}
                                    aria-expanded="false"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDropdownClick(e);
                                    }}
                                  >
                                    <i className="fas fa-ellipsis-v"></i>
                                  </button>
                                  <ul className="dropdown-menu" aria-labelledby={`dropdownNivel${nivel.id}`}>
                                    <li>
                                      <button 
                                        className="dropdown-item"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingNivel(nivel);
                                        }}
                                      >
                                        <i className="fas fa-edit me-2"></i>Editar
                                      </button>
                                    </li>
                                    <li>
                                      <button 
                                        className="dropdown-item text-danger"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          eliminarNivel(nivel.id);
                                        }}
                                      >
                                        <i className="fas fa-trash me-2"></i>Eliminar
                                      </button>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                              <p className="card-text small text-muted mb-2">{nivel.descripcion}</p>
                              
                              {/* Mostrar meses del nivel */}
                              {nivel.meses && nivel.meses.length > 0 && (
                                <div className="mb-2">
                                  <small className="text-muted d-block mb-1">
                                    <i className="fas fa-calendar-alt me-1"></i>
                                    Duración: {nivel.meses.length} meses
                                  </small>
                                  <div className="d-flex flex-wrap gap-1">
                                    {nivel.meses.slice(0, 3).map((mes, index) => (
                                      <span key={index} className="badge bg-light text-dark text-capitalize" style={{fontSize: '0.7rem'}}>
                                        {mes.substring(0, 3)}
                                      </span>
                                    ))}
                                    {nivel.meses.length > 3 && (
                                      <span className="badge bg-light text-dark" style={{fontSize: '0.7rem'}}>
                                        +{nivel.meses.length - 3}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              <div className="d-flex justify-content-between align-items-center">
                                <span className="badge bg-success">${nivel.precio}</span>
                                <small className="text-muted">
                                  {cursos.filter(c => c.nivel_id === nivel.id).length} cursos
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'cursos' && (
                <div>
                  <div className="d-flex justify-content-between align-items-center mb-4">
                    <h5 className="mb-0">Gestión de Cursos</h5>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setEditingCurso(null);
                        setShowCursoForm(true);
                      }}
                      disabled={bloquesNiveles.length === 0}
                    >
                      <i className="fas fa-plus me-2"></i>Nuevo Curso
                    </button>
                  </div>

                  {bloquesNiveles.length === 0 && (
                    <div className="alert alert-warning">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      Primero debes crear al menos un nivel para poder agregar cursos.
                    </div>
                  )}

                  {/* Formulario de curso */}
                  {showCursoForm && bloquesNiveles.length > 0 && (
                    <div className="card mb-4">
                      <div className="card-header">
                        <h6 className="mb-0">
                          {editingCurso ? 'Editar Curso' : 'Nuevo Curso'}
                        </h6>
                      </div>
                      <div className="card-body">
                        <form onSubmit={handleCursoSubmit}>
                          <div className="row">
                            <div className="col-md-6">
                              <label className="form-label">Nombre del Curso</label>
                              <input
                                type="text"
                                className="form-control"
                                placeholder="Ej: Matemáticas Básicas"
                                value={cursoFormData.nombre}
                                onChange={(e) => setCursoFormData({...cursoFormData, nombre: e.target.value})}
                                required
                              />
                            </div>
                            <div className="col-md-6">
                              <label className="form-label">Nivel</label>
                              <select
                                className="form-select"
                                value={cursoFormData.nivel_id}
                                onChange={(e) => setCursoFormData({...cursoFormData, nivel_id: e.target.value})}
                                required
                              >
                                <option value="">Seleccionar nivel...</option>
                                {bloquesNiveles.map((nivel) => (
                                  <option key={nivel.id} value={nivel.id}>
                                    {nivel.nombre} - ${nivel.precio} ({nivel.meses ? nivel.meses.length : 0} meses)
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                          <div className="mt-3">
                            <button type="submit" className="btn btn-success me-2">
                              <i className="fas fa-save me-2"></i>
                              {editingCurso ? 'Actualizar' : 'Crear'}
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-secondary"
                              onClick={() => {
                                setShowCursoForm(false);
                                setEditingCurso(null);
                              }}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Lista de cursos */}
                  {bloquesCursos.length === 0 ? (
                    <div className="text-center py-5">
                      <i className="fas fa-book fa-3x text-muted mb-3"></i>
                      <h5 className="text-muted">No hay cursos en este bloque</h5>
                      <p className="text-muted">Crea el primer curso para comenzar</p>
                    </div>
                  ) : (
                    <div className="row">
                      {bloquesCursos.map((curso) => {
                        const nivel = niveles.find(n => n.id === curso.nivel_id);
                        return (
                          <div key={curso.id} className="col-md-6 col-lg-4 mb-3">
                            <div className="card border-info">
                              <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                  <h6 className="card-title text-info mb-0">
                                    <i className="fas fa-book me-2"></i>
                                    {curso.nombre}
                                  </h6>
                                  <div className="dropdown">
                                    <button 
                                      className="btn btn-sm btn-outline-secondary"
                                      data-bs-toggle="dropdown"
                                    >
                                      <i className="fas fa-ellipsis-v"></i>
                                    </button>
                                    <ul className="dropdown-menu">
                                      <li>
                                        <button 
                                          className="dropdown-item"
                                          onClick={() => setEditingCurso(curso)}
                                        >
                                          <i className="fas fa-edit me-2"></i>Editar
                                        </button>
                                      </li>
                                      <li>
                                        <button 
                                          className="dropdown-item text-danger"
                                          onClick={() => eliminarCurso(curso.id)}
                                        >
                                          <i className="fas fa-trash me-2"></i>Eliminar
                                        </button>
                                      </li>
                                    </ul>
                                  </div>
                                </div>
                                {nivel && (
                                  <div className="d-flex justify-content-between align-items-center">
                                    <small className="text-muted">
                                      <i className="fas fa-layer-group me-1"></i>
                                      {nivel.nombre}
                                    </small>
                                    <span className="badge bg-info">${nivel.precio}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Vista de Cursos */}
              {viewMode === 'cursos' && selectedNivel && (
                <div className="p-4">
                  {/* Formulario de Curso */}
                  {showCursoForm && (
                    <div className="card mb-4">
                      <div className="card-header bg-light">
                        <h6 className="mb-0">
                          <i className="fas fa-book me-2"></i>
                          {editingCurso ? 'Editar Curso' : 'Nuevo Curso'}
                        </h6>
                      </div>
                      <div className="card-body">
                        <form onSubmit={handleCursoSubmit}>
                          <div className="mb-3">
                            <label className="form-label">Nombre del Curso</label>
                            <input
                              type="text"
                              className="form-control"
                              value={cursoFormData.nombre}
                              onChange={(e) => setCursoFormData({...cursoFormData, nombre: e.target.value})}
                              required
                            />
                          </div>
                          <div className="d-flex gap-2">
                            <button type="submit" className="btn btn-primary">
                              <i className="fas fa-save me-2"></i>
                              {editingCurso ? 'Actualizar' : 'Crear'}
                            </button>
                            <button 
                              type="button" 
                              className="btn btn-secondary"
                              onClick={resetCursoForm}
                            >
                              Cancelar
                            </button>
                          </div>
                        </form>
                      </div>
                    </div>
                  )}

                  {/* Botón para agregar curso */}
                  {!showCursoForm && (
                    <div className="mb-4">
                      <button 
                        className="btn btn-success"
                        onClick={() => setShowCursoForm(true)}
                      >
                        <i className="fas fa-plus me-2"></i>
                        Agregar Curso
                      </button>
                    </div>
                  )}

                  {/* Título de la sección de cursos */}
                  <div className="mb-4">
                    <div className="alert alert-info border-0 shadow-sm">
                      <h5 className="mb-0 text-center">
                        <i className="fas fa-graduation-cap me-2"></i>
                        CURSOS DE {selectedNivel.nombre.toUpperCase()}
                      </h5>
                    </div>
                  </div>

                  {/* Lista de Cursos */}
                  <div className="row">
                    {cursos
                      .filter(curso => curso.nivel_id === selectedNivel.id)
                      .map(curso => (
                        <div key={curso.id} className="col-md-6 col-lg-4 mb-3">
                          <div className="card border-info">
                            <div className="card-body">
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <h6 className="card-title text-info mb-0">
                                  <i className="fas fa-book me-2"></i>
                                  {curso.nombre}
                                </h6>
                                <div className="dropdown">
                                  <button 
                                    className="btn btn-sm btn-outline-secondary dropdown-toggle"
                                    type="button"
                                    id={`dropdownCurso${curso.id}`}
                                    aria-expanded="false"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDropdownClick(e);
                                    }}
                                  >
                                    <i className="fas fa-ellipsis-v"></i>
                                  </button>
                                  <ul className="dropdown-menu" aria-labelledby={`dropdownCurso${curso.id}`}>
                                    <li>
                                      <button 
                                        className="dropdown-item"
                                        onClick={() => handleEditCurso(curso)}
                                      >
                                        <i className="fas fa-edit me-2"></i>Editar
                                      </button>
                                    </li>
                                    <li>
                                      <button 
                                        className="dropdown-item text-danger"
                                        onClick={() => handleDeleteCurso(curso.id)}
                                      >
                                        <i className="fas fa-trash me-2"></i>Eliminar
                                      </button>
                                    </li>
                                  </ul>
                                </div>
                              </div>
                              <small className="text-muted">
                                <i className="fas fa-layer-group me-1"></i>
                                {selectedNivel.nombre}
                              </small>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {cursos.filter(curso => curso.nivel_id === selectedNivel.id).length === 0 && (
                    <div className="text-center py-4">
                      <i className="fas fa-book fa-3x text-muted mb-3"></i>
                      <p className="text-muted">No hay cursos en este nivel</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


    </div>
  );
}

// Modal específico para gestión de cursos dentro de un nivel


export default Academia;