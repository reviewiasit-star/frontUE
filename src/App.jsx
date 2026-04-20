import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/microservices/common/Login';
import Index from './pages/microservices/common/Index';
import RecuperarPassword from './pages/microservices/common/RecuperarPassword';
import RestablecerPassword from './pages/microservices/common/RestablecerPassword';
import EnvioComprobantes from './pages/microservices/common/EnvioComprobantes';
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

  return (
    <Router>
      <Routes>
        {/* Rutas públicas */}
        <Route 
          path="/login" 
          element={
            isAuthenticated 
              ? <Navigate to="/" replace /> 
              : <Login onLogin={handleLogin} />
          } 
        />
        <Route path="/recuperar-password" element={<RecuperarPassword />} />
        <Route path="/restablecer-password" element={<RestablecerPassword />} />
        <Route path="/envio-comprobantes" element={<EnvioComprobantes />} />

        {/* Rutas autenticadas: permitir que Index maneje todo el resto */}
        <Route 
          path="/*" 
          element={
            isAuthenticated 
              ? <Index onLogout={handleLogout} user={user} /> 
              : <Navigate to="/login" replace />
          } 
        />

        {/* Fallback eliminado: Index maneja rutas internas con */}
      </Routes>
    </Router>
  );
}

export default App;
