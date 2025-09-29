import React from 'react';

const ModoDispositivo = ({ isOpen, onClose, onNavigate, onLogout, user }) => {
  if (!isOpen) return null;

  // Definir menús según el rol del usuario
  const getMenuItems = () => {
    const commonItems = [
      {
        icon: 'fas fa-home',
        label: 'Dashboard',
        path: ''
      }
    ];

    if (user?.rol === 'Tienda') {
      return [
        ...commonItems,
        {
          icon: 'fas fa-store',
          label: 'Tienda',
          path: 'tienda'
        },
        {
          icon: 'fas fa-file-invoice-dollar',
          label: 'Reporte de Ventas',
          path: 'reporte-ventas'
        }
      ];
    }

    // Para administrador - menú completo
    if (user?.rol === 'Administrador') {
      return [
        ...commonItems,
        {
          icon: 'fas fa-users',
          label: 'Usuarios',
          path: 'usuarios'
        },
        {
          icon: 'fas fa-list',
          label: 'Estudiantes',
          path: 'estudiantes'
        },
        {
          icon: 'fas fa-gift',
          label: 'Becas',
          path: 'becas'
        },
        {
          icon: 'fas fa-file-contract',
          label: 'Compromiso Económico',
          path: 'compromiso'
        },
        {
          icon: 'fas fa-graduation-cap',
          label: 'Academia',
          path: 'academia'
        },
        {
          icon: 'fas fa-warehouse',
          label: 'Almacenes',
          path: 'almacenes'
        },
        {
          icon: 'fas fa-boxes',
          label: 'Productos',
          path: 'productos'
        },
        {
          icon: 'fas fa-money-bill-wave',
          label: 'Movimiento de Gastos',
          path: 'movimientos-gastos'
        },
        {
          icon: 'fas fa-chart-line',
          label: 'Reportes',
          path: 'reportes'
        },
        {
          icon: 'fas fa-university',
          label: 'Ingresos Académicos',
          path: 'ingresos-academicos'
        },

      ];
    }

    // Para director - solo Panel de Dirección
    if (user?.rol === 'Director') {
      return [
        ...commonItems,
        {
          icon: 'fas fa-user-tie',
          label: 'Panel de Dirección',
          path: 'dashboard-director'
        }
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
          <div className="modal-content" style={{ height: '100vh', borderRadius: 0, border: 'none' }}>
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
                  <button
                    key={index}
                    className="list-group-item list-group-item-action border-0 py-3 px-4"
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