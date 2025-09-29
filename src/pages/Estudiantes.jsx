import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthService from '../services/authService';
import ModoDispositivo from '../components/ModoDispositivo';

function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
  }, []);

  const fetchEstudiantes = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/estudiantes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      console.log('=== DEPURACIÓN ESTUDIANTES ===');
      console.log('Total de registros recibidos:', data.length);
      
      const carmenData = data.filter(e => e.nombre.includes('Carmen'));
      console.log('Registros de Carmen encontrados:', carmenData.length);
      console.log('Detalles de Carmen:', carmenData.map(c => ({
        id: c.id,
        nombre: c.nombre,
        inscripcion_id: c.inscripcion_id,
        compromiso_id: c.compromiso_id,
        nivel_nombre: c.nivel_nombre,
        estado_compromiso: c.estado_compromiso
      })));
      
      setEstudiantes(data);
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
    } finally {
      setLoading(false);
    }
  };

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

      <div className="table-responsive">
        <table className="table table-bordered table-striped">
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Email</th>
              <th>Teléfono</th>
            </tr>
          </thead>
          <tbody>
            {estudiantes.map((estudiante, index) => (
              <tr key={`estudiante-${estudiante.id || index}`}>
                <td>{estudiante.id}</td>
                <td>{estudiante.nombre}</td>
                <td>{estudiante.apellido}</td>
                <td>{estudiante.email}</td>
                <td>{estudiante.telefono}</td>
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