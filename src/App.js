import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/authService';
import Login from './pages/Login';
import Index from './pages/Index';
import Usuarios from './pages/Usuarios';
import Almacenes from './pages/Almacenes';
import Productos from './pages/Productos';
import IngresosAcademicos from './pages/IngresosAcademicos';
import MovimientosGastos from './pages/MovimientosGastos';
import Reportes from './pages/Reportes';
import ComprasAdministradora from './pages/ComprasAdministradora';
import CompraDetalle from './pages/CompraDetalle';
import InventarioAlmacen from './pages/InventarioAlmacen';
import ReportesVentasInventario from './pages/ReportesVentasInventario';
import ResumenGananciasPerdidas from './pages/ResumenGananciasPerdidas';
import Tienda from './pages/Tienda';

import DashboardDirector from './pages/DashboardDirector';
import Layout from './components/Layout';

// Importar estilos responsivos personalizados
import './assets/css/responsive.css';

// Componente para rutas protegidas
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const isAuthenticated = authService.isAuthenticated();
  const userInfo = authService.getUserInfo();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(userInfo?.rol)) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

// Componente para redireccionar si ya está autenticado
const PublicRoute = ({ children }) => {
  const isAuthenticated = authService.isAuthenticated();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Ruta pública - Login */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } 
        />
        
        {/* Rutas protegidas con Layout */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          {/* Dashboard principal */}
          <Route index element={<Index />} />
          
          {/* Gestión de usuarios - Solo administrador y director */}
          <Route 
            path="usuarios" 
            element={
              <ProtectedRoute allowedRoles={['Administrador', 'Director']}>
                <Usuarios />
              </ProtectedRoute>
            } 
          />
          
          {/* Gestión de almacenes - Solo administrador y director */}
          <Route 
            path="almacenes" 
            element={
              <ProtectedRoute allowedRoles={['Administrador', 'Director']}>
                <Almacenes />
              </ProtectedRoute>
            } 
          />
          
          {/* Gestión de productos - Administrador y tienda */}
          <Route 
            path="productos" 
            element={
              <ProtectedRoute allowedRoles={['Administrador', 'Tienda']}>
                <Productos />
              </ProtectedRoute>
            } 
          />
          
          {/* Ingresos académicos - Todos los roles */}
          <Route path="ingresos-academicos" element={<IngresosAcademicos />} />
          
          {/* Movimientos y gastos - Todos los roles */}
          <Route path="movimientos-gastos" element={<MovimientosGastos />} />
          
          {/* Reportes tradicionales - Todos los roles */}
          <Route path="reportes" element={<Reportes />} />
          
          {/* === NUEVAS RUTAS DEL SISTEMA DE INVENTARIO === */}
          
          {/* Compras de la administradora - Solo administrador */}
          <Route 
            path="compras-administradora" 
            element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <ComprasAdministradora />
              </ProtectedRoute>
            } 
          />
          
          {/* Detalle de compra específica - Solo administrador */}
          <Route 
            path="compra-detalle/:id" 
            element={
              <ProtectedRoute allowedRoles={['Administrador']}>
                <CompraDetalle />
              </ProtectedRoute>
            } 
          />
          
          {/* Inventario de almacén - Administrador y tienda */}
          <Route 
            path="inventario-almacen" 
            element={
              <ProtectedRoute allowedRoles={['Administrador', 'Tienda']}>
                <InventarioAlmacen />
              </ProtectedRoute>
            } 
          />
          
          {/* Tienda - Administrador y tienda */}
          <Route 
            path="tienda" 
            element={
              <ProtectedRoute allowedRoles={['Administrador', 'Tienda']}>
                <Tienda />
              </ProtectedRoute>
            } 
          />
          
          {/* Reportes de ventas del nuevo sistema - Todos los roles */}
          <Route 
            path="reportes-ventas-inventario" 
            element={
              <ProtectedRoute>
                <ReportesVentasInventario />
              </ProtectedRoute>
            } 
          />
          
          {/* Resumen de ganancias y pérdidas - Administrador y director */}
          <Route 
            path="resumen-ganancias-perdidas" 
            element={
              <ProtectedRoute allowedRoles={['Administrador', 'Director']}>
                <ResumenGananciasPerdidas />
              </ProtectedRoute>
            } 
          />
          
          {/* Dashboard específico para directores */}
          <Route 
            path="dashboard-director" 
            element={
              <ProtectedRoute allowedRoles={['Director']}>
                <DashboardDirector />
              </ProtectedRoute>
            } 
          />

        </Route>
        
        {/* Ruta por defecto - redireccionar al login si no está autenticado */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;