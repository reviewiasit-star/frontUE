import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthService from '../../../services/authService';
import ModoDispositivo from '../../../components/modoDispositivo';
import { BACKEND_PRINCIPAL } from '../../../config/apiConfig';

const BACKEND_PRINCIPAL_ORIGIN = BACKEND_PRINCIPAL.replace(/\/api\/?$/, '');

function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Estados para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);
    
    // Cargar estudiantes
    fetchEstudiantes();
  }, [selectedYear]);

  const fetchEstudiantes = async () => {
    try {
      const token = localStorage.getItem('token');
      const url = `${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes?anio=${encodeURIComponent(selectedYear)}&incluir_concluidos=1`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setEstudiantes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Lista de años para seleccionar (dinámico: actual -1 a actual +2)
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  // Filtrado por buscador (nombre, apellidos, CI, código)
  const filteredEstudiantes = estudiantes.filter((e) => {
    const nombre = (e.nombre || '').toLowerCase();
    const apPat = (e.apellido_paterno || e.apellido || '').toLowerCase();
    const apMat = (e.apellido_materno || '').toLowerCase();
    const ci = (e.ci_estudiante || '').toLowerCase();
    const codigo = (e.codigo_estudiante || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      nombre.includes(q) ||
      apPat.includes(q) ||
      apMat.includes(q) ||
      ci.includes(q) ||
      codigo.includes(q)
    );
  });

  // Función para manejar navegación móvil
  const handleMobileNavigate = (path) => {
    setShowMobileMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  if (loading) return <div>Cargando estudiantes...</div>;

  return (
    <div className="container py-4">
      {/* Header con botón hamburguesa para móviles */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Lista de Estudiantes</h2>
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

      {/* Controles: selector de año y buscador */}
      <div className="row g-3 mb-3 align-items-end">
        <div className="col-12 col-md-3">
          <label className="form-label">Año</label>
          <select
            className="form-select"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="col-12 col-md-6">
          <label className="form-label">Buscar</label>
          <input
            type="text"
            className="form-control"
            placeholder="Nombre, apellidos, CI o código"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="col-12 col-md-3 d-flex">
          <button
            className="btn btn-primary ms-md-auto"
            onClick={() => fetchEstudiantes()}
          >
            Recargar
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Teléfono</th>
              <th>Estado Inscripción</th>
            </tr>
          </thead>
          <tbody>
            {filteredEstudiantes.map((estudiante, index) => (
              <tr key={`estudiante-${estudiante.id || index}`}>
                <td>{estudiante.id}</td>
                <td>{estudiante.nombre}</td>
                <td>{`${estudiante.apellido_paterno || estudiante.apellido || ''} ${estudiante.apellido_materno || ''}`.trim()}</td>
                <td>{estudiante.email || '-'}</td>
                <td>{estudiante.telefono || '-'}</td>
                <td>
                  {estudiante.estado_inscripcion && estudiante.estado_inscripcion === 'activo' ? (
                    <span className="badge bg-success">
                      <i className="fas fa-check-circle me-1"></i>
                      Inscripto
                    </span>
                  ) : (
                    <span className="badge bg-danger">
                      <i className="fas fa-times-circle me-1"></i>
                      Sin Inscripción
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Componente ModoDispositivo */}
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

export default Estudiantes;