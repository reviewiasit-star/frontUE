import React from 'react';

const ModoDispositivo = ({ isOpen, onClose, onNavigate, onLogout, user }) => {
  if (!isOpen) return null;

  // Definir menús según el rol del usuario
  const getMenuItems = () => {
    // Ítems comunes para todos los roles (sin Dashboard por defecto)
    const commonItems = [];
    const adminDashboardItem = {
      icon: 'fas fa-home',
      label: 'Dashboard',
      path: '',
      type: 'simple'
    };

    // Para administrador - menú completo sin submenús
    if (user?.rol === 'Administrador') {
      return [
        adminDashboardItem,
        ...commonItems,
        { icon: 'fas fa-users', label: 'Usuarios', path: 'usuarios', type: 'simple' },
        { icon: 'fab fa-whatsapp', label: 'WhatsApp', path: 'whatsapp-admin', type: 'simple' },
        { icon: 'fas fa-file-alt', label: 'Documentos Agente', path: 'documentos-agente', type: 'simple' },
        // Separador GESTIÓN INSCRIPCIÓN
        { type: 'separator', label: 'GESTIÓN INSCRIPCIÓN' },
        { icon: 'fas fa-user-graduate', label: 'Estudiantes', path: 'estudiantes', type: 'simple' },
        { icon: 'fas fa-chart-bar', label: 'Reportes Inscripción', path: 'reportes-inscripcion', type: 'simple' },
        // Separador CONTROL DE PAGO
        { type: 'separator', label: 'CONTROL DE PAGO' },
        { icon: 'fas fa-chart-line', label: 'Reportes', path: 'reportes', type: 'simple' },
        { icon: 'fas fa-university', label: 'Ingresos Académicos', path: 'ingresos-academicos', type: 'simple' },
        // Separador AJUSTES
        { type: 'separator', label: 'AJUSTES' },
        { icon: 'fas fa-user-cog', label: 'Configuración', path: 'configuracion', type: 'simple' }
      ];
    }

    // Para secretaria - accesos de gestión de inscripciones
    if (user?.rol === 'Secretaria') {
      return [
        ...commonItems,
        // Separador GESTIÓN INSCRIPCIÓN
        { type: 'separator', label: 'GESTIÓN INSCRIPCIÓN' },
        { icon: 'fas fa-user-graduate', label: 'Estudiantes', path: 'estudiantes', type: 'simple' },
        { icon: 'fas fa-chart-bar', label: 'Reportes Inscripción', path: 'reportes-inscripcion', type: 'simple' },
        // Separador AJUSTES
        { type: 'separator', label: 'AJUSTES' },
        { icon: 'fas fa-user-cog', label: 'Configuración', path: 'configuracion', type: 'simple' }
      ];
    }

    // Para director - menús específicos
    if (user?.rol === 'Director') {
      return [
        ...commonItems,
        {
          icon: 'fas fa-user-tie',
          label: 'Panel de Dirección',
          path: 'dashboard-director',
          type: 'simple'
        },
        // Separador ACADEMIA
        { type: 'separator', label: 'ACADEMIA' },
        { icon: 'fas fa-gift', label: 'Becas', path: 'becas', type: 'simple' },
        { icon: 'fas fa-book', label: 'Academia', path: 'academia', type: 'simple' },
        { icon: 'fas fa-cogs', label: 'Servicios', path: 'servicios', type: 'simple' },
        { icon: 'fas fa-university', label: 'Ingresos Académicos', path: 'ingresos-academicos', type: 'simple' },
        // Separador AJUSTES
        { type: 'separator', label: 'AJUSTES' },
        { icon: 'fas fa-user-cog', label: 'Configuración', path: 'configuracion', type: 'simple' }
      ];
    }

    // Para cajero - accesos solicitados
    if (user?.rol === 'Cajero') {
      return [
        ...commonItems,
        {
          icon: 'fas fa-cash-register',
          label: 'Panel de Caja',
          path: 'dashboard-cajero',
          type: 'simple'
        },
        // Separador GESTIÓN INSCRIPCIÓN
        { type: 'separator', label: 'GESTIÓN INSCRIPCIÓN' },
        { icon: 'fas fa-hands-helping', label: 'Servicios adquiridos', path: 'adquisicion-servicios', type: 'simple' },
        // Separador CONTROL DE PAGO
        { type: 'separator', label: 'CONTROL DE PAGO' },
        { icon: 'fas fa-file-contract', label: 'Compromiso Económico', path: 'compromiso', type: 'simple' },
        // Separador AJUSTES
        { type: 'separator', label: 'AJUSTES' },
        { icon: 'fas fa-user-cog', label: 'Configuración', path: 'configuracion', type: 'simple' }
      ];
    }

    // Para tienda - menús específicos
    if (user?.rol === 'Tienda') {
      return [
        ...commonItems,
        {
          icon: 'fas fa-store',
          label: 'Ventas / Tienda',
          path: 'tienda',
          type: 'simple'
        },
        // Separador INVENTARIO
        { type: 'separator', label: 'INVENTARIO' },
        { icon: 'fas fa-warehouse', label: 'Almacenes', path: 'tienda-almacenes', type: 'simple' },
        { icon: 'fas fa-box-open', label: 'Productos', path: 'tienda-productos', type: 'simple' },
        // Separador REPORTES
        { type: 'separator', label: 'REPORTES' },
        { icon: 'fas fa-chart-line', label: 'Reporte de Ventas', path: 'tienda-reporte-ventas', type: 'simple' },
        // Separador AJUSTES
        { type: 'separator', label: 'AJUSTES' },
        { icon: 'fas fa-user-cog', label: 'Configuración', path: 'configuracion', type: 'simple' }
      ];
    }

    // Fallback para otros roles
    return commonItems;
  };

  const menuItems = getMenuItems();

  const handleItemClick = (path) => {
    onNavigate(path);
    onClose();
  };

  const handleLogout = () => {
    onLogout();
    onClose();
  };

  return (
    <>
      {/* Overlay */}
      <div 
        className="modal-backdrop fade show" 
        style={{ zIndex: 1040 }}
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div 
        className="modal fade show d-block" 
        style={{ zIndex: 1050 }}
        tabIndex="-1"
      >
        <div className="modal-dialog modal-dialog-start" style={{ margin: 0, height: '100vh', maxWidth: '300px' }}>
          <div className="modal-content" style={{ 
            height: '100vh', 
            borderRadius: 0, 
            border: 'none',
            animation: 'slideInLeft 0.3s ease-out'
          }}>
            {/* Header con información del usuario */}
            <div className="modal-header bg-primary text-white" style={{ borderBottom: '1px solid #dee2e6' }}>
              <div className="d-flex align-items-center">
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center me-3" 
                     style={{ width: '40px', height: '40px' }}>
                  <i className="fas fa-user text-primary"></i>
                </div>
                <div>
                  <h6 className="mb-0">{user?.nombre || 'Usuario'}</h6>
                  <small className="opacity-75">{user?.rol || 'administrador'}</small>
                </div>
              </div>
              <button 
                type="button" 
                className="btn-close btn-close-white" 
                onClick={onClose}
                aria-label="Close"
              ></button>
            </div>
            
            {/* Body con el menú */}
            <div className="modal-body p-0" style={{ overflowY: 'auto' }}>
              <div className="list-group list-group-flush">
                {menuItems.map((item, index) => (
                  <div key={index}>
                    {item.type === 'separator' ? (
                      <div 
                        className="px-4 py-2 text-uppercase fw-bold" 
                        style={{ 
                          fontSize: '11px',
                          color: '#6c757d',
                          backgroundColor: '#f8f9fa',
                          borderBottom: '1px solid #dee2e6'
                        }}
                      >
                        {item.label}
                      </div>
                    ) : item.type === 'simple' ? (
                      <button
                        className="list-group-item list-group-item-action border-0 py-3 px-4 mobile-menu-item"
                        onClick={() => handleItemClick(item.path)}
                        style={{ 
                          borderBottom: '1px solid #f8f9fa',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <i className={`${item.icon} text-primary me-3`} style={{ width: '20px' }}></i>
                          <span className="fw-medium">{item.label}</span>
                        </div>
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer con cerrar sesión */}
            <div className="modal-footer border-top" style={{ padding: '1rem' }}>
              <button 
                className="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center"
                onClick={handleLogout}
              >
                <i className="fas fa-sign-out-alt me-2"></i>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ModoDispositivo;