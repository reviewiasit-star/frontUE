import React, { useState, useEffect } from 'react';
import { getApiUrl } from '../../../config/apiConfig';
import AuthService from '../../../services/authService';

function WhatsAppAdmin() {
  const [status, setStatus] = useState({
    isReady: false,
    qrCode: null,
    qrImage: null,
    phoneNumber: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const cargarEstado = async () => {
    try {
      setError('');
      const token = localStorage.getItem('token');
      if (!token) {
        setError('No autenticado. Por favor, inicia sesión de nuevo.');
        setLoading(false);
        return;
      }

      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/whatsapp', user?.rol);
      
      const response = await fetch(`${apiUrl}/whatsapp/status`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al obtener el estado de WhatsApp');
      }

      const data = await response.json();
      
      // Verificar si la respuesta tiene success (como en el proyecto Entradas)
      if (data.success) {
        setStatus({
          isReady: data.isReady || false,
          qrCode: data.qrCode || null,
          qrImage: data.qrImage || null,
          phoneNumber: data.phoneNumber || null
        });
      } else {
        setStatus({
          isReady: false,
          qrCode: null,
          qrImage: null,
          phoneNumber: null
        });
      }
    } catch (err) {
      console.error('Error al cargar estado:', err);
      setError(err.message || 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  };

  // Cargar estado inicial y actualizar cada 3 segundos (como en el proyecto Entradas)
  useEffect(() => {
    cargarEstado();
    // Actualizar cada 3 segundos para ver cambios en tiempo real
    const interval = setInterval(cargarEstado, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (!window.confirm('¿Estás seguro de que quieres cerrar la sesión de WhatsApp?')) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/whatsapp', user?.rol);

      const response = await fetch(`${apiUrl}/whatsapp/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al cerrar sesión');
      }

      // Actualizar estado local
      setStatus({
        isReady: false,
        qrCode: null,
        qrImage: null,
        phoneNumber: null
      });

      // Recargar estado después de 3 segundos para obtener nuevo QR
      setTimeout(() => {
        cargarEstado();
      }, 3000);
    } catch (err) {
      console.error('Error al cerrar sesión:', err);
      setError(err.message || 'Error al cerrar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleReiniciar = async () => {
    if (!window.confirm('¿Estás seguro de que quieres reiniciar el servicio de WhatsApp? Esto cerrará la sesión actual y generará un nuevo código QR.')) {
      return;
    }

    try {
      setError('');
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/whatsapp', user?.rol);

      const response = await fetch(`${apiUrl}/whatsapp/reiniciar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || 'Error al reiniciar el servicio');
      }

      // Actualizar estado local
      setStatus({
        isReady: false,
        qrCode: null,
        qrImage: null,
        phoneNumber: null
      });

      // Mostrar mensaje de éxito
      setError('');
      
      // Recargar estado después de 5 segundos para obtener nuevo QR
      setTimeout(() => {
        cargarEstado();
      }, 5000);
    } catch (err) {
      console.error('Error al reiniciar:', err);
      setError(err.message || 'Error al reiniciar el servicio');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card shadow">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-3 text-muted">Cargando estado de WhatsApp...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card shadow">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <i className="fab fa-whatsapp me-2"></i>
                Configuración de WhatsApp
              </h4>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  {error}
                </div>
              )}

              {/* Estado de conexión */}
              <div className="mb-4">
                <h5 className="mb-3">Estado de Conexión</h5>
                
                {status.isReady ? (
                  <div className="alert alert-success d-flex align-items-center">
                    <i className="fas fa-check-circle me-3" style={{ fontSize: '2rem' }}></i>
                    <div>
                      <strong>WhatsApp Conectado</strong>
                      <br />
                      <small className="text-muted">
                        Número: {status.phoneNumber || 'No disponible'}
                      </small>
                    </div>
                  </div>
                ) : (
                  <div className="alert alert-info d-flex align-items-center">
                    <i className="fas fa-times-circle me-3" style={{ fontSize: '2rem' }}></i>
                    <div>
                      <strong>WhatsApp Desconectado</strong>
                      <br />
                      <small className="text-muted">
                        Escanea el código QR para conectar WhatsApp
                      </small>
                    </div>
                  </div>
                )}
              </div>

              {/* Código QR - Solo mostrar si NO está conectado */}
              {!status.isReady && (
                <div className="mb-4">
                  <h5 className="mb-3">Código QR para Conectar</h5>
                  <div className="text-center">
                    {status.qrImage ? (
                      <div>
                        <div className="bg-light p-4 rounded d-inline-block mb-3">
                          <img 
                            src={status.qrImage} 
                            alt="Código QR WhatsApp" 
                            style={{ maxWidth: '300px', height: 'auto' }}
                          />
                        </div>
                        <p className="text-muted small">
                          <i className="fas fa-info-circle me-2"></i>
                          El QR se actualiza automáticamente cada 20 segundos
                        </p>
                        <p className="text-muted">
                          Escanea este código con WhatsApp en tu teléfono:
                        </p>
                        <ol className="text-start d-inline-block">
                          <li>Abre WhatsApp en tu teléfono</li>
                          <li>Ve a <strong>Configuración</strong> → <strong>Dispositivos vinculados</strong></li>
                          <li>Selecciona <strong>Vincular un dispositivo</strong></li>
                          <li>Escanea este código QR</li>
                        </ol>
                      </div>
                    ) : (
                      <div className="alert alert-warning">
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        No hay código QR disponible. El servicio puede estar iniciando...
                        <div className="mt-3">
                          <button 
                            className="btn btn-warning btn-sm"
                            onClick={handleReiniciar}
                            disabled={loading}
                          >
                            <i className="fas fa-sync-alt me-2"></i>
                            {loading ? 'Reiniciando...' : 'Reiniciar Servicio'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Botones de acción */}
              <div className="d-flex gap-2 justify-content-center mt-4">
                {/* Botón de reiniciar - Mostrar siempre si no está conectado */}
                {!status.isReady && (
                  <button 
                    className="btn btn-warning"
                    onClick={handleReiniciar}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2"></i>
                    {loading ? 'Reiniciando...' : 'Reiniciar Servicio'}
                  </button>
                )}
                
                {/* Botón de cerrar sesión - Solo mostrar si está conectado */}
                {status.isReady && (
                  <button 
                    className="btn btn-danger btn-lg"
                    onClick={handleLogout}
                    disabled={loading}
                  >
                    <i className="fas fa-sign-out-alt me-2"></i>
                    Cerrar Sesión de WhatsApp
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default WhatsAppAdmin;
