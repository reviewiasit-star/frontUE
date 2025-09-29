import React, { useState } from 'react';
import '../assets/css/bootstrap.min.css';
import '../assets/css/plugins.min.css';
import '../assets/css/kaiadmin.min.css';
import '../assets/css/demo.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import AuthService from '../services/authService';

function Login({ onLogin }) {
  const [formData, setFormData] = useState({
    usuario: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await AuthService.login(formData);

      if (result.ok) {
        // Validar el rol aquí
        if (result.user.rol === 'Administrador' || result.user.rol === 'Director' || result.user.rol === 'Secretaria' || result.user.rol === 'Tienda') {
          setSuccess(true);
          setTimeout(() => {
            if (onLogin) onLogin(result.user);
          }, 1000);
        } else {
          setError('Acceso denegado. Solo administradores, directores, secretarias y personal de tienda pueden acceder al sistema.');
          setSuccess(false);
        }
      } else {
        setError(result.message || 'Error en la autenticación');
        setSuccess(false);
      }
    } catch {
      setError('Error de conexión. Verifica que el servidor esté funcionando.');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      {/* Contenedor principal */}
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-sm-8 col-md-6 col-lg-5 col-xl-4">
            <div 
              className="card shadow-lg border-0" 
              style={{ 
                borderRadius: '20px',
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(10px)',
                overflow: 'hidden'
              }}
            >
              {/* Header con gradiente */}
              <div 
                className="card-header text-center border-0 py-4"
                style={{
                  background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                  color: 'white'
                }}
              >
                <div className="mb-3">
                  <div 
                    className="d-inline-flex align-items-center justify-content-center rounded-circle"
                    style={{
                      width: '80px',
                      height: '80px',
                      background: 'rgba(255, 255, 255, 0.2)',
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <i className="fas fa-graduation-cap" style={{ fontSize: '2.5rem' }}></i>
                  </div>
                </div>
                <h3 className="mb-2 fw-bold">Unidad Educativa</h3>
                <p className="mb-0 opacity-75">Sistema de Gestión Académica</p>
              </div>

              {/* Cuerpo del formulario */}
              <div className="card-body p-4">
                <div className="text-center mb-4">
                  <h4 className="text-dark mb-2">Iniciar Sesión</h4>
                  <p className="text-muted small">Ingresa tus credenciales para acceder</p>
                </div>

                <form onSubmit={handleSubmit}>
                  {/* Campo Usuario */}
                  <div className="mb-4">
                    <label htmlFor="usuario" className="form-label fw-semibold text-dark">
                      <i className="fas fa-user me-2 text-primary"></i>Usuario
                    </label>
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0 bg-light"
                        style={{ borderRadius: '12px 0 0 12px' }}
                      >
                        <i className="fas fa-user text-muted"></i>
                      </span>
                      <input
                        type="text"
                        className="form-control border-start-0 bg-light"
                        id="usuario"
                        name="usuario"
                        placeholder="Ingresa tu usuario"
                        value={formData.usuario}
                        onChange={handleChange}
                        required
                        autoFocus
                        disabled={loading}
                        style={{ 
                          borderRadius: '0 12px 12px 0',
                          boxShadow: 'none',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>
                  </div>

                  {/* Campo Contraseña */}
                  <div className="mb-4">
                    <label htmlFor="password" className="form-label fw-semibold text-dark">
                      <i className="fas fa-lock me-2 text-primary"></i>Contraseña
                    </label>
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0 bg-light"
                        style={{ borderRadius: '12px 0 0 12px' }}
                      >
                        <i className="fas fa-lock text-muted"></i>
                      </span>
                      <input
                        type={showPassword ? "text" : "password"}
                        className="form-control border-start-0 border-end-0 bg-light"
                        id="password"
                        name="password"
                        placeholder="Ingresa tu contraseña"
                        value={formData.password}
                        onChange={handleChange}
                        required
                        disabled={loading}
                        style={{ 
                          boxShadow: 'none',
                          border: '2px solid #e9ecef'
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary border-start-0 bg-light"
                        onClick={togglePasswordVisibility}
                        disabled={loading}
                        style={{ 
                          borderRadius: '0 12px 12px 0',
                          border: '2px solid #e9ecef'
                        }}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-muted`}></i>
                      </button>
                    </div>
                  </div>

                  {/* Checkbox Recordarme */}
                  <div className="mb-4">
                    <div className="form-check">
                      <input 
                        type="checkbox" 
                        className="form-check-input" 
                        id="remember" 
                        disabled={loading}
                        style={{ borderRadius: '6px' }}
                      />
                      <label className="form-check-label text-muted" htmlFor="remember">
                        Recordar mis credenciales
                      </label>
                    </div>
                  </div>

                  {/* Mensajes de error y éxito */}
                  {error && (
                    <div 
                      className="alert alert-danger border-0 mb-4"
                      style={{ 
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%)',
                        color: 'white'
                      }}
                    >
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}
                  
                  {success && (
                    <div 
                      className="alert alert-success border-0 mb-4"
                      style={{ 
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
                        color: 'white'
                      }}
                    >
                      <i className="fas fa-check-circle me-2"></i>
                      ¡Login exitoso! Redirigiendo...
                    </div>
                  )}

                  {/* Botón de login */}
                  <button 
                    type="submit" 
                    className="btn w-100 py-3 fw-bold text-white border-0"
                    disabled={loading}
                    style={{
                      borderRadius: '12px',
                      background: loading 
                        ? 'linear-gradient(135deg, #6c757d 0%, #5a6268 100%)'
                        : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
                      boxShadow: '0 4px 15px rgba(30, 60, 114, 0.3)',
                      transition: 'all 0.3s ease',
                      fontSize: '1.1rem'
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 6px 20px rgba(30, 60, 114, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 15px rgba(30, 60, 114, 0.3)';
                      }
                    }}
                  >
                    {loading ? (
                      <>
                        <div className="spinner-border spinner-border-sm me-2" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                        Verificando credenciales...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Iniciar Sesión
                      </>
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="text-center mt-4">
                  <p className="text-muted small mb-2">
                    <i className="fas fa-shield-alt me-1"></i>
                    Acceso restringido a personal autorizado
                  </p>
                  <div className="d-flex justify-content-center gap-3">
                    <span className="badge bg-primary">Administrador</span>
                    <span className="badge bg-success">Director</span>
                    <span className="badge bg-info">Tienda</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer adicional */}
            <div className="text-center mt-4">
              <p className="text-white-50 small mb-0">
                © 2024 Unidad Educativa - Sistema de Gestión Académica
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;