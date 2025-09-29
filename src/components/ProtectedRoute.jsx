import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/authService';

function ProtectedRoute({ children, requiredRoles = [] }) {
  const isAuthenticated = authService.isAuthenticated();
  const userInfo = authService.getUserInfo();

  // Si no está autenticado, redirigir al login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Si se requieren roles específicos, verificar si el usuario tiene acceso
  if (requiredRoles.length > 0) {
    const userRole = userInfo?.rol;
    const hasRequiredRole = requiredRoles.includes(userRole);
    
    if (!hasRequiredRole) {
      // Redirigir a una página de acceso denegado o al dashboard
      return (
        <div className="container mt-5">
          <div className="row justify-content-center">
            <div className="col-md-6">
              <div className="card">
                <div className="card-body text-center">
                  <i className="fas fa-exclamation-triangle text-warning" style={{ fontSize: '4rem' }}></i>
                  <h3 className="mt-3">Acceso Denegado</h3>
                  <p className="text-muted">
                    No tienes permisos para acceder a esta sección.
                  </p>
                  <p className="text-muted">
                    Tu rol actual: <strong>{userRole}</strong>
                  </p>
                  <p className="text-muted">
                    Roles requeridos: <strong>{requiredRoles.join(', ')}</strong>
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => window.history.back()}
                  >
                    Volver
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  // Si está autenticado y tiene los permisos necesarios, mostrar el componente
  return children;
}

export default ProtectedRoute;