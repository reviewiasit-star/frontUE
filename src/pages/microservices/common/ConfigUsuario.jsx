import React, { useState, useEffect } from 'react';
import '../../../assets/css/bootstrap.min.css';
import '../../../assets/css/plugins.min.css';
import '../../../assets/css/kaiadmin.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import AuthService from '../../../services/authService';
import NotificationModal from '../../../components/NotificationModal';
import { useNotification } from '../../../hooks/useNotification';

function ConfigUsuario() {
  const [userData, setUserData] = useState({
    usuario: '',
    nombre_completo: '',
    correo: '',
    rol: ''
  });
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState('');
  const [editMode, setEditMode] = useState(false);
  const { notification, showSuccess, hideNotification } = useNotification();
  
  // Estados para cambio de contraseña
  const [passwordActual, setPasswordActual] = useState('');
  const [passwordNueva, setPasswordNueva] = useState('');
  const [passwordConfirmar, setPasswordConfirmar] = useState('');
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [successPassword, setSuccessPassword] = useState('');
  const [errorPassword, setErrorPassword] = useState('');
  const [showPwdActual, setShowPwdActual] = useState(false);
  const [showPwdNueva, setShowPwdNueva] = useState(false);
  const [showPwdConfirmar, setShowPwdConfirmar] = useState(false);

  useEffect(() => {
    cargarPerfil();
  }, []);

  const cargarPerfil = async () => {
    try {
      setLoadingProfile(true);
      // Primero intentar obtener del servidor
      const resp = await AuthService.obtenerPerfil();
      if (resp?.ok && resp?.user) {
        setUserData({
          usuario: resp.user.usuario || '',
          nombre_completo: resp.user.nombre_completo || '',
          correo: resp.user.correo || '',
          rol: resp.user.rol || ''
        });
      } else {
        // Si falla, usar datos del localStorage
        const user = AuthService.getUser();
        if (user) {
          setUserData({
            usuario: user.usuario || '',
            nombre_completo: user.nombre || user.nombre_completo || '',
            correo: user.correo || '',
            rol: user.rol || ''
          });
        }
      }
    } catch (err) {
      console.error('Error al cargar perfil:', err);
      // Usar datos del localStorage como respaldo
      const user = AuthService.getUser();
      if (user) {
        setUserData({
          usuario: user.usuario || '',
          nombre_completo: user.nombre || user.nombre_completo || '',
          correo: user.correo || '',
          rol: user.rol || ''
        });
      }
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setUserData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!userData.usuario.trim()) {
      setError('El nombre de usuario es requerido');
      setLoading(false);
      return;
    }

    if (!userData.nombre_completo.trim()) {
      setError('El nombre completo es requerido');
      setLoading(false);
      return;
    }

    try {
      const resp = await AuthService.actualizarPerfil({
        usuario: userData.usuario.trim(),
        nombre_completo: userData.nombre_completo.trim(),
        correo: userData.correo.trim() || null
      });

      if (resp?.ok) {
        setEditMode(false);
        await cargarPerfil();
        showSuccess(
          'Datos actualizados',
          'Los datos de usuario fueron actualizados correctamente.'
        );
      } else {
        setError(resp?.message || 'Error al actualizar el perfil');
      }
    } catch (err) {
      setError('Error de conexión al actualizar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setErrorPassword('');
    setSuccessPassword('');

    if (!passwordActual || !passwordNueva) {
      setErrorPassword('Debe ingresar su contraseña actual y la nueva.');
      return;
    }
    if (passwordNueva.length < 4) {
      setErrorPassword('La nueva contraseña debe tener al menos 4 caracteres.');
      return;
    }
    if (passwordNueva !== passwordConfirmar) {
      setErrorPassword('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setLoadingPassword(true);
    try {
      const resp = await AuthService.cambiarPassword({ 
        password_actual: passwordActual, 
        password_nueva: passwordNueva 
      });
      
      if (resp?.ok) {
        setSuccessPassword('Contraseña actualizada exitosamente.');
        setPasswordActual('');
        setPasswordNueva('');
        setPasswordConfirmar('');
      } else {
        setErrorPassword(resp?.message || 'Error al cambiar la contraseña');
      }
    } catch (err) {
      setErrorPassword('Error de conexión');
    } finally {
      setLoadingPassword(false);
    }
  };

  if (loadingProfile) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8">
          {/* Información del Usuario */}
          <div className="card shadow-lg border-0 mb-4" style={{ borderRadius: '15px' }}>
            <div 
              className="card-header border-0 py-3"
              style={{
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                borderRadius: '15px 15px 0 0',
                color: 'white'
              }}
            >
              <div className="d-flex justify-content-between align-items-center">
                <h4 className="mb-0">
                  <i className="fas fa-user-circle me-2"></i>
                  Información del Usuario
                </h4>
                {!editMode && (
                  <button
                    className="btn btn-light btn-sm"
                    onClick={() => setEditMode(true)}
                  >
                    <i className="fas fa-edit me-1"></i>
                    Editar
                  </button>
                )}
              </div>
            </div>
            <div className="card-body p-4">
              {!editMode ? (
                // Vista de solo lectura
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-muted">
                      <i className="fas fa-user me-2 text-primary"></i>
                      Usuario
                    </label>
                    <div className="form-control bg-light border-0">
                      {userData.usuario || 'N/A'}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-muted">
                      <i className="fas fa-shield-alt me-2 text-primary"></i>
                      Rol
                    </label>
                    <div className="form-control bg-light border-0">
                      {userData.rol || 'N/A'}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-muted">
                      <i className="fas fa-id-card me-2 text-primary"></i>
                      Nombre Completo
                    </label>
                    <div className="form-control bg-light border-0">
                      {userData.nombre_completo || 'N/A'}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <label className="form-label fw-semibold text-muted">
                      <i className="fas fa-envelope me-2 text-primary"></i>
                      Correo Electrónico
                    </label>
                    <div className="form-control bg-light border-0">
                      {userData.correo || 'No especificado'}
                    </div>
                  </div>
                </div>
              ) : (
                // Modo de edición
                <form onSubmit={handleUpdateProfile}>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-user me-2 text-primary"></i>
                        Usuario <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="usuario"
                        value={userData.usuario}
                        onChange={handleInputChange}
                        required
                        autoComplete="username"
                        placeholder="Nombre de usuario"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-shield-alt me-2 text-primary"></i>
                        Rol
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={userData.rol}
                        disabled
                        style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                      />
                      <small className="text-muted">El rol no se puede modificar</small>
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-id-card me-2 text-primary"></i>
                        Nombre Completo <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        name="nombre_completo"
                        value={userData.nombre_completo}
                        onChange={handleInputChange}
                        required
                        placeholder="Ingrese su nombre completo"
                      />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        <i className="fas fa-envelope me-2 text-primary"></i>
                        Correo Electrónico
                      </label>
                      <input
                        type="email"
                        className="form-control"
                        name="correo"
                        value={userData.correo}
                        onChange={handleInputChange}
                        placeholder="correo@ejemplo.com"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="alert alert-danger border-0 mb-3" style={{ borderRadius: '10px' }}>
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}

                  <div className="d-flex gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Guardando...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>
                          Guardar Cambios
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditMode(false);
                        setError('');
                        cargarPerfil();
                      }}
                      disabled={loading}
                    >
                      <i className="fas fa-times me-2"></i>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Cambio de Contraseña */}
          <div className="card shadow-lg border-0" style={{ borderRadius: '15px' }}>
            <div 
              className="card-header border-0 py-3"
              style={{
                background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                borderRadius: '15px 15px 0 0',
                color: 'white'
              }}
            >
              <h4 className="mb-0">
                <i className="fas fa-lock me-2"></i>
                Cambiar Contraseña
              </h4>
            </div>
            <div className="card-body p-4">
              <form onSubmit={handleChangePassword}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-key me-2 text-primary"></i>
                    Contraseña Actual
                  </label>
                  <div className="input-group">
                    <input
                      type={showPwdActual ? 'text' : 'password'}
                      className="form-control"
                      value={passwordActual}
                      onChange={(e) => setPasswordActual(e.target.value)}
                      placeholder="Ingrese su contraseña actual"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPwdActual((v) => !v)}
                      aria-label={showPwdActual ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      tabIndex={-1}
                    >
                      <i className={`fas ${showPwdActual ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-lock me-2 text-primary"></i>
                    Nueva Contraseña
                  </label>
                  <div className="input-group">
                    <input
                      type={showPwdNueva ? 'text' : 'password'}
                      className="form-control"
                      value={passwordNueva}
                      onChange={(e) => setPasswordNueva(e.target.value)}
                      placeholder="Ingrese la nueva contraseña (mín. 4 caracteres)"
                      required
                      minLength={4}
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPwdNueva((v) => !v)}
                      aria-label={showPwdNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      tabIndex={-1}
                    >
                      <i className={`fas ${showPwdNueva ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label fw-semibold">
                    <i className="fas fa-lock me-2 text-primary"></i>
                    Confirmar Nueva Contraseña
                  </label>
                  <div className="input-group">
                    <input
                      type={showPwdConfirmar ? 'text' : 'password'}
                      className="form-control"
                      value={passwordConfirmar}
                      onChange={(e) => setPasswordConfirmar(e.target.value)}
                      placeholder="Confirme la nueva contraseña"
                      required
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowPwdConfirmar((v) => !v)}
                      aria-label={showPwdConfirmar ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      tabIndex={-1}
                    >
                      <i className={`fas ${showPwdConfirmar ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                    </button>
                  </div>
                </div>

                {errorPassword && (
                  <div className="alert alert-danger border-0 mb-3" style={{ borderRadius: '10px' }}>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    {errorPassword}
                  </div>
                )}

                {successPassword && (
                  <div className="alert alert-success border-0 mb-3" style={{ borderRadius: '10px' }}>
                    <i className="fas fa-check-circle me-2"></i>
                    {successPassword}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loadingPassword}
                >
                  {loadingPassword ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Guardando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-save me-2"></i>
                      Cambiar Contraseña
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

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

export default ConfigUsuario;