import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Index from './pages/Index';
import AuthService from './services/authService';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar si hay un usuario autenticado al cargar la aplicación
    const checkAuth = async () => {
      try {
        if (AuthService.isAuthenticated()) {
          // Verificar token con el servidor
          const result = await AuthService.verifyToken();
          
          if (result.ok) {
            setIsAuthenticated(true);
            setUser(result.user);
          } else {
            // Token inválido o expirado
            AuthService.clearAuth();
            setIsAuthenticated(false);
            setUser(null);
          }
        }
      } catch (error) {
        // Error de conexión, limpiar autenticación
        AuthService.clearAuth();
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleLogin = (userData) => {
    setIsAuthenticated(true);
    setUser(userData);
  };

  const handleLogout = () => {
    AuthService.logout();
    setIsAuthenticated(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f4f6fa'
      }}>
        <div className="text-center">
          <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
          <p className="mt-2">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }
  
  return <Index onLogout={handleLogout} user={user} />;
}

export default App;
