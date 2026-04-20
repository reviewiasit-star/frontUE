import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AuthService from '../../../services/authService';

function RestablecerPassword() {
  const [token, setToken] = useState('');
  const [nueva, setNueva] = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    if (!token) { setError('Token no presente en la URL'); return; }
    if (nueva.length < 4) { setError('La nueva contraseña debe tener al menos 4 caracteres'); return; }
    if (nueva !== confirmar) { setError('Las contraseñas no coinciden'); return; }

    setLoading(true);
    try {
      const data = await AuthService.restablecerConToken({ token, nueva_password: nueva });
      if (data.ok) {
        setMessage('Contraseña restablecida. Ahora puedes iniciar sesión.');
      } else {
        setError(data.message || 'Error al restablecer contraseña');
      }
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-sm" style={{ borderRadius: '12px' }}>
            <div className="card-body p-4">
              <h3 className="mb-3">Restablecer contraseña</h3>
              <p className="text-muted mb-4">Ingresa tu nueva contraseña para el token proporcionado.</p>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Nueva contraseña</label>
                  <input type="password" className="form-control" value={nueva} onChange={(e) => setNueva(e.target.value)} />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirmar contraseña</label>
                  <input type="password" className="form-control" value={confirmar} onChange={(e) => setConfirmar(e.target.value)} />
                </div>
                {error && <div className="alert alert-danger">{error}</div>}
                {message && <div className="alert alert-success">{message}</div>}
                <button type="submit" className="btn btn-primary w-100" disabled={loading}>
                  {loading ? 'Procesando...' : 'Restablecer'}
                </button>
                <div className="text-center mt-3">
                  <Link to="/login" className="text-decoration-none">Volver al login</Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RestablecerPassword;