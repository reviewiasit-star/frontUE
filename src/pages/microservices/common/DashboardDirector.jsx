import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../../services/authService';
import { getApiUrl } from '../../../config/apiConfig';

const DashboardDirector = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [estadisticas, setEstadisticas] = useState({
    totalEstudiantes: null,
    totalInscripciones: null,
    totalCursos: null,
    totalNiveles: null,
    totalBloques: null,
    estudiantesConServicios: null
  });
  const navigate = useNavigate();
  const yearsOptions = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      const user = authService.getUser();
      const baseReportes = `${getApiUrl('/reportes-inscripcion', user?.rol)}/reportes-inscripcion`;
      const basePrincipal = getApiUrl('', user?.rol);

      const [
        resEstudiantes,
        resInscripciones,
        resCursos,
        resNiveles,
        resBloques,
        resServicios
      ] = await Promise.all([
        fetch(`${baseReportes}/total-estudiantes`, { headers }),
        fetch(`${baseReportes}/inscripciones-count?anio=${anio}`, { headers }),
        fetch(`${basePrincipal}/cursos`, { headers }),
        fetch(`${basePrincipal}/niveles`, { headers }),
        fetch(`${basePrincipal}/bloques`, { headers }),
        fetch(`${baseReportes}/estudiantes-con-servicios-count?anio=${anio}`, { headers })
      ]);

      const [dataEstudiantes, dataInscripciones, dataCursos, dataNiveles, dataBloques, dataServicios] = await Promise.all([
        resEstudiantes.json().catch(() => ({})),
        resInscripciones.json().catch(() => ({})),
        resCursos.json().catch(() => []),
        resNiveles.json().catch(() => []),
        resBloques.json().catch(() => []),
        resServicios.json().catch(() => ({}))
      ]);

      if (!resEstudiantes.ok || !dataEstudiantes.ok) {
        throw new Error(dataEstudiantes.message || 'No se pudo cargar estudiantes');
      }
      if (!resInscripciones.ok || !dataInscripciones.ok) {
        throw new Error(dataInscripciones.message || 'No se pudo cargar inscripciones');
      }
      if (!resServicios.ok || !dataServicios.ok) {
        throw new Error(dataServicios.message || 'No se pudo cargar servicios');
      }

      setEstadisticas({
        totalEstudiantes: dataEstudiantes.count ?? 0,
        totalInscripciones: dataInscripciones.count ?? 0,
        totalCursos: Array.isArray(dataCursos) ? dataCursos.length : 0,
        totalNiveles: Array.isArray(dataNiveles) ? dataNiveles.length : 0,
        totalBloques: Array.isArray(dataBloques) ? dataBloques.length : 0,
        estudiantesConServicios: dataServicios.count ?? 0
      });
    } catch (error) {
      console.error('Error al cargar datos:', error);
      setError(error.message || 'Error al cargar estadísticas del panel');
    } finally {
      setLoading(false);
    }
  }, [anio]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
              <span className="visually-hidden">Cargando...</span>
            </div>
            <p className="text-muted">Cargando información del director...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4" style={{ backgroundColor: '#f8fafc', minHeight: '100vh' }}>
      {/* Header del Dashboard con diseño moderno */}
      <div className="row mb-4">
        <div className="col-12">
          <div 
            className="card border-0 text-white position-relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 50%, #3d7ab5 100%)',
              borderRadius: '20px',
              boxShadow: '0 10px 40px rgba(30, 58, 95, 0.3)'
            }}
          >
            <div className="card-body p-4 p-lg-5">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <div className="d-flex align-items-center mb-3">
                    <div 
                      className="d-flex align-items-center justify-content-center me-3"
                      style={{ 
                        width: '56px', 
                        height: '56px', 
                        background: 'rgba(255,255,255,0.15)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(10px)'
                      }}
                    >
                      <i className="fas fa-user-shield fa-lg"></i>
                    </div>
                    <div>
                      <h2 className="mb-0 fw-bold" style={{ letterSpacing: '-0.5px' }}>
                        Panel de Dirección
                      </h2>
                      <p className="mb-0 opacity-75 small">
                        <i className="fas fa-building me-1"></i>
                        Sistema de Gestión Educativa
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4 text-md-end mt-3 mt-md-0">
                  <div className="d-flex flex-column align-items-md-end gap-2">
                    <span className="badge px-3 py-2" style={{ background: 'rgba(255,255,255,0.2)', borderRadius: '20px' }}>
                      <i className="fas fa-clock me-1"></i>
                      {new Date().toLocaleDateString('es-BO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                    <div className="d-flex gap-2 justify-content-md-end">
                      <select
                        className="form-select form-select-sm"
                        style={{ minWidth: 100 }}
                        value={anio}
                        onChange={(e) => setAnio(parseInt(e.target.value, 10))}
                        aria-label="Año de gestión"
                      >
                        {yearsOptions.map((y) => (
                          <option key={y} value={y}>{y}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        className="btn btn-sm btn-light"
                        onClick={cargarDatos}
                        disabled={loading}
                      >
                        <i className={`fas fa-sync-alt me-1 ${loading ? 'fa-spin' : ''}`}></i>
                        Actualizar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            {/* Decorative elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '200px',
              height: '200px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              right: '100px',
              width: '100px',
              height: '100px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%'
            }}></div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-warning d-flex align-items-center mb-4" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>
          <span>{error}</span>
        </div>
      )}

      {/* Tarjetas de estadísticas principales */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-lg-6 col-md-6">
          <div 
            className="card border-0 h-100 position-relative overflow-hidden"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    Estudiantes registrados
                  </p>
                  <h2 className="mb-1 fw-bold" style={{ color: '#1e3a5f', fontSize: '2.2rem' }}>
                    {estadisticas.totalEstudiantes ?? '—'}
                  </h2>
                  <div className="d-flex align-items-center">
                    <span className="badge me-2" style={{ background: '#e3f2fd', color: '#1565c0' }}>
                      <i className="fas fa-user-graduate me-1"></i>
                      Activos en el sistema
                    </span>
                  </div>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center"
                  style={{ 
                    width: '52px', 
                    height: '52px', 
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                    borderRadius: '12px'
                  }}
                >
                  <i className="fas fa-user-graduate text-white fa-lg"></i>
                </div>
              </div>
            </div>
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'linear-gradient(90deg, #1e3a5f 0%, #2d5a87 100%)' 
            }}></div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6 col-md-6">
          <div 
            className="card border-0 h-100 position-relative overflow-hidden"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    Inscripciones
                  </p>
                  <h2 className="mb-1 fw-bold" style={{ color: '#0d6832', fontSize: '2.2rem' }}>
                    {estadisticas.totalInscripciones ?? '—'}
                  </h2>
                  <div className="d-flex align-items-center">
                    <span className="badge" style={{ background: '#e8f5e9', color: '#2e7d32' }}>
                      <i className="fas fa-file-signature me-1"></i>
                      Gestión {anio}
                    </span>
                  </div>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center"
                  style={{ 
                    width: '52px', 
                    height: '52px', 
                    background: 'linear-gradient(135deg, #0d6832 0%, #28a745 100%)',
                    borderRadius: '12px'
                  }}
                >
                  <i className="fas fa-file-signature text-white fa-lg"></i>
                </div>
              </div>
            </div>
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'linear-gradient(90deg, #0d6832 0%, #28a745 100%)' 
            }}></div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6 col-md-6">
          <div 
            className="card border-0 h-100 position-relative overflow-hidden"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    Cursos
                  </p>
                  <h2 className="mb-1 fw-bold" style={{ color: '#b8860b', fontSize: '2.2rem' }}>
                    {estadisticas.totalCursos ?? '—'}
                  </h2>
                  <div className="d-flex align-items-center">
                    <span className="badge" style={{ background: '#fff8e1', color: '#f57c00' }}>
                      <i className="fas fa-book me-1"></i>
                      Catálogo académico
                    </span>
                  </div>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center"
                  style={{ 
                    width: '52px', 
                    height: '52px', 
                    background: 'linear-gradient(135deg, #b8860b 0%, #f4a100 100%)',
                    borderRadius: '12px'
                  }}
                >
                  <i className="fas fa-book text-white fa-lg"></i>
                </div>
              </div>
            </div>
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'linear-gradient(90deg, #b8860b 0%, #f4a100 100%)' 
            }}></div>
          </div>
        </div>

        <div className="col-xl-3 col-lg-6 col-md-6">
          <div 
            className="card border-0 h-100 position-relative overflow-hidden"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    Estructura académica
                  </p>
                  <h2 className="mb-1 fw-bold" style={{ color: '#0277bd', fontSize: '1.7rem' }}>
                    {estadisticas.totalNiveles ?? '—'} / {estadisticas.totalBloques ?? '—'}
                  </h2>
                  <div className="d-flex align-items-center">
                    <span className="badge" style={{ background: '#e3f2fd', color: '#1565c0' }}>
                      <i className="fas fa-sitemap me-1"></i>
                      Niveles / Bloques
                    </span>
                  </div>
                </div>
                <div 
                  className="d-flex align-items-center justify-content-center"
                  style={{ 
                    width: '52px', 
                    height: '52px', 
                    background: 'linear-gradient(135deg, #0277bd 0%, #29b6f6 100%)',
                    borderRadius: '12px'
                  }}
                >
                  <i className="fas fa-sitemap text-white fa-lg"></i>
                </div>
              </div>
            </div>
            <div style={{ 
              position: 'absolute', 
              bottom: 0, 
              left: 0, 
              right: 0, 
              height: '4px', 
              background: 'linear-gradient(90deg, #0277bd 0%, #29b6f6 100%)' 
            }}></div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        <div className="col-xl-4 col-lg-6 col-md-6">
          <div
            className="card border-0 h-100 position-relative overflow-hidden"
            style={{
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              transition: 'all 0.3s ease'
            }}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-start justify-content-between">
                <div>
                  <p className="text-muted mb-2 small fw-semibold text-uppercase" style={{ letterSpacing: '0.5px' }}>
                    Servicios adquiridos
                  </p>
                  <h2 className="mb-1 fw-bold" style={{ color: '#0b7285', fontSize: '2.2rem' }}>
                    {estadisticas.estudiantesConServicios ?? '—'}
                  </h2>
                  <div className="d-flex align-items-center">
                    <span className="badge" style={{ background: '#e3fafc', color: '#0c8599' }}>
                      <i className="fas fa-puzzle-piece me-1"></i>
                      Estudiantes con servicios ({anio})
                    </span>
                  </div>
                </div>
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    width: '52px',
                    height: '52px',
                    background: 'linear-gradient(135deg, #0b7285 0%, #15aabf 100%)',
                    borderRadius: '12px'
                  }}
                >
                  <i className="fas fa-puzzle-piece text-white fa-lg"></i>
                </div>
              </div>
            </div>
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #0b7285 0%, #15aabf 100%)'
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Título de sección */}
      <div className="row mb-3">
        <div className="col-12">
          <h5 className="fw-bold text-muted mb-0">
            <i className="fas fa-th-large me-2"></i>
            Accesos Rápidos
          </h5>
        </div>
      </div>

      {/* Accesos rápidos - Nuevo diseño */}
      <div className="row g-4">
        <div className="col-xl-4 col-lg-4 col-md-6">
          <div 
            className="card border-0 h-100"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(30, 58, 95, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
            onClick={() => navigate('/becas')}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
                    borderRadius: '14px'
                  }}
                >
                  <i className="fas fa-hand-holding-heart text-white fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-1 fw-bold">Gestión de Becas</h6>
                  <p className="text-muted mb-0 small">Administrar becas y descuentos</p>
                </div>
                <i className="fas fa-chevron-right text-muted"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-lg-4 col-md-6">
          <div 
            className="card border-0 h-100"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(13, 104, 50, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
            onClick={() => navigate('/academia')}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: 'linear-gradient(135deg, #0d6832 0%, #28a745 100%)',
                    borderRadius: '14px'
                  }}
                >
                  <i className="fas fa-school text-white fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-1 fw-bold">Administración Académica</h6>
                  <p className="text-muted mb-0 small">Gestionar niveles, cursos y bloques</p>
                </div>
                <i className="fas fa-chevron-right text-muted"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-lg-4 col-md-6">
          <div 
            className="card border-0 h-100"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(184, 134, 11, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
            onClick={() => navigate('/ingresos-academicos')}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: 'linear-gradient(135deg, #b8860b 0%, #f4a100 100%)',
                    borderRadius: '14px'
                  }}
                >
                  <i className="fas fa-chart-line text-white fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-1 fw-bold">Ingresos Académicos</h6>
                  <p className="text-muted mb-0 small">Ver ingresos y reportes financieros</p>
                </div>
                <i className="fas fa-chevron-right text-muted"></i>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-4 col-lg-4 col-md-6">
          <div 
            className="card border-0 h-100"
            style={{ 
              borderRadius: '16px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-8px)';
              e.currentTarget.style.boxShadow = '0 12px 40px rgba(2, 119, 189, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
            }}
            onClick={() => navigate('/servicios')}
          >
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div 
                  className="d-flex align-items-center justify-content-center me-3"
                  style={{ 
                    width: '56px', 
                    height: '56px', 
                    background: 'linear-gradient(135deg, #0277bd 0%, #29b6f6 100%)',
                    borderRadius: '14px'
                  }}
                >
                  <i className="fas fa-concierge-bell text-white fa-lg"></i>
                </div>
                <div className="flex-grow-1">
                  <h6 className="mb-1 fw-bold">Servicios</h6>
                  <p className="text-muted mb-0 small">Gestionar servicios disponibles</p>
                </div>
                <i className="fas fa-chevron-right text-muted"></i>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardDirector;
