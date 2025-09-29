import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

const DashboardDirector = () => {
  const [loading, setLoading] = useState(true);
  // Variables de estado del sistema bancario removidas
  const navigate = useNavigate();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Cargar estadísticas del director
      // Las estadísticas bancarias han sido removidas

    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalSolicitud = (solicitud, accion) => {
    setSolicitudSeleccionada(solicitud);
    setAccionModal(accion);
    setComentarios('');
    setShowSolicitudModal(true);
  };



  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-BO', {
      style: 'currency',
      currency: 'BOB',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <div className="container mt-5">
        <div className="d-flex justify-content-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header del Dashboard */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h3 className="mb-1">
                    <i className="fas fa-user-tie me-2"></i>
                    Panel de Dirección
                  </h3>
                  <p className="mb-0">Gestión y supervisión del sistema educativo</p>
                </div>
                <div className="col-md-4 text-end">
                  <div className="d-flex justify-content-end gap-2">
                    {/* Botones de navegación removidos */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas principales - Sistema bancario removido */}

      {/* Contenido del dashboard - Sistema bancario removido */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-graduation-cap me-2"></i>
                Panel de Dirección - Sistema Educativo
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-4">
                <i className="fas fa-school fa-3x text-primary mb-3"></i>
                <h5>Dashboard de Dirección</h5>
                <p className="text-muted">Sistema de gestión educativa disponible</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modales del sistema bancario removidos */}
    </div>
  );
};

export default DashboardDirector;