import React, { useState } from 'react';
import '../../../assets/css/bootstrap.min.css';
import '../../../assets/css/plugins.min.css';
import '../../../assets/css/kaiadmin.min.css';
import '../../../assets/css/demo.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { Link } from 'react-router-dom';
import AuthService from '../../../services/authService';

function RecuperarPassword() {
  const [usuario, setUsuario] = useState('');
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleChange = (field, value) => {
    if (field === 'usuario') {
      setUsuario(value);
    } else {
      setCorreo(value);
    }
    if (error) setError('');
    if (message) setMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const data = await AuthService.solicitarRecuperacion({ usuario: usuario || undefined, correo: correo || undefined });
      if (data.ok) {
        setMessage('Se envió el enlace de recuperación a tu correo.');
      } else {
        setError(data.message || 'Error al solicitar la recuperación');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
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
                  <h4 className="text-dark mb-2">Recuperar Contraseña</h4>
                  <p className="text-muted small">Ingresa tu usuario o correo para recuperar tu acceso</p>
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
                        value={usuario}
                        onChange={(e) => handleChange('usuario', e.target.value)}
                        disabled={loading}
                        style={{ 
                          borderRadius: '0 12px 12px 0',
                          boxShadow: 'none',
                          border: '2px solid #e9ecef'
                        }}
                      />
                    </div>
                  </div>

                  {/* Campo Correo */}
                  <div className="mb-4">
                    <label htmlFor="correo" className="form-label fw-semibold text-dark">
                      <i className="fas fa-envelope me-2 text-primary"></i>Correo Electrónico <span className="text-muted small">(opcional)</span>
                    </label>
                    <div className="input-group">
                      <span 
                        className="input-group-text border-end-0 bg-light"
                        style={{ borderRadius: '12px 0 0 12px' }}
                      >
                        <i className="fas fa-envelope text-muted"></i>
                      </span>
                      <input
                        type="email"
                        className="form-control border-start-0 bg-light"
                        id="correo"
                        name="correo"
                        placeholder="ejemplo@correo.com"
                        value={correo}
                        onChange={(e) => handleChange('correo', e.target.value)}
                        disabled={loading}
                        style={{ 
                          borderRadius: '0 12px 12px 0',
                          boxShadow: 'none',
                          border: '2px solid #e9ecef'
                        }}
                      />
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
                  
                  {message && (
                    <div 
                      className="alert alert-success border-0 mb-4"
                      style={{ 
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #51cf66 0%, #40c057 100%)',
                        color: 'white'
                      }}
                    >
                      <i className="fas fa-check-circle me-2"></i>
                      {message}
                    </div>
                  )}

                  {/* Botón de recuperación */}
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
                        Procesando...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-paper-plane me-2"></i>
                        Enviar Enlace de Recuperación
                      </>
                    )}
                  </button>

                  {/* Enlace de regreso al login */}
                  <div className="text-center mt-3">
                    <Link to="/login" className="text-decoration-none" style={{ color: '#2a5298' }}>
                      <i className="fas fa-arrow-left me-2"></i>
                      ¿Recordaste tu contraseña? Volver al login
                    </Link>
                  </div>
                </form>

                {/* Footer */}
            
              </div>
            </div>

            {/* Footer adicional */}
            <div className="text-center mt-4">
              <p className="text-white-50 small mb-0">
                © 2025 Unidad Educativa - Sistema Académica
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RecuperarPassword;