import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // Si ya está autenticado, redirigir al dashboard
    if (authService.isAuthenticated()) {
      navigate('/');
    }
  }, [navigate]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    // Limpiar error cuando el usuario empiece a escribir
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.login(formData.email, formData.password);
      navigate('/');
    } catch (error) {
      setError(error.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: '#f8f9fa' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow-lg border-0">
              <div className="card-body p-5">
                {/* Logo o título */}
                <div className="text-center mb-4">
                  <h2 className="fw-bold text-primary">Sistema Educativo</h2>
                  <p className="text-muted">Iniciar Sesión</p>
                </div>

                {/* Formulario */}
                <form onSubmit={handleSubmit}>
                  {/* Email */}
                  <div className="mb-3">
                    <label htmlFor="email" className="form-label">
                      <i className="fas fa-envelope me-2"></i>
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      placeholder="ejemplo@correo.com"
                      disabled={loading}
                    />
                  </div>

                  {/* Password */}
                  <div className="mb-4">
                    <label htmlFor="password" className="form-label">
                      <i className="fas fa-lock me-2"></i>
                      Contraseña
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleChange}
                      required
                      placeholder="••••••••"
                      disabled={loading}
                    />
                  </div>

                  {/* Error message */}
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      <i className="fas fa-exclamation-triangle me-2"></i>
                      {error}
                    </div>
                  )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Iniciando sesión...
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
                  <small className="text-muted">
                    ¿Olvidaste tu contraseña? 
                    <a href="#" className="text-primary text-decoration-none ms-1">
                      Recuperar
                    </a>
                  </small>
                </div>
              </div>
            </div>

            {/* Información adicional */}
            <div className="text-center mt-3">
              <small className="text-muted">
                © 2024 Sistema de Gestión Educativa. Todos los derechos reservados.
              </small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;