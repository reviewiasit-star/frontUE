import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { authService } from '../services/authService';

function Layout() {
  const [userInfo, setUserInfo] = useState(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    const user = authService.getUserInfo();
    console.log('=== DEBUG USUARIO ===');
    console.log('Usuario obtenido:', user);
    console.log('Rol del usuario:', user?.rol);
    console.log('====================');
    setUserInfo(user);
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const hasAccess = (allowedRoles) => {
    console.log('=== DEBUG ACCESO ===');
    console.log('Roles permitidos:', allowedRoles);
    console.log('Rol del usuario:', userInfo?.rol);
    const hasPermission = allowedRoles.includes(userInfo?.rol);
    console.log('Tiene permiso:', hasPermission);
    console.log('==================');
    return hasPermission;
  };

  return (
    <div className="wrapper">
      <div className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`} data-background-color="dark">
        <div className="sidebar-logo">
          <div className="logo-header" data-background-color="dark">
            <Link to="/" className="logo">
              <img
                src="/assets/img/kaiadmin/logo_light.svg"
                alt="navbar brand"
                className="navbar-brand"
                height="20"
              />
            </Link>
            <div className="nav-toggle">
              <button className="btn btn-toggle toggle-sidebar" onClick={toggleSidebar}>
                <i className="gg-menu-right"></i>
              </button>
              <button className="btn btn-toggle sidenav-toggler">
                <i className="gg-menu-left"></i>
              </button>
            </div>
            <button className="topbar-toggler more">
              <i className="gg-more-vertical-alt"></i>
            </button>
          </div>
        </div>
        
        <div className="sidebar-wrapper scrollbar scrollbar-inner">
          <div className="sidebar-content">
            <ul className="nav nav-secondary">
              <li className="nav-item">
                <Link to="/" className="nav-link">
                  <i className="fas fa-home"></i>
                  <p>Dashboard</p>
                </Link>
              </li>

              {hasAccess(['Tienda']) && (
                <li className="nav-item">
                  <Link to="/tienda" className="nav-link">
                    <i className="fas fa-store"></i>
                    <p>Tienda</p>
                  </Link>
                </li>
              )}

              {hasAccess(['administrador', 'director']) && (
                <li className="nav-item">
                  <Link to="/usuarios" className="nav-link">
                    <i className="fas fa-users"></i>
                    <p>Usuarios</p>
                  </Link>
                </li>
              )}

              {/* GESTIÓN PRODUCTOS - Nuevo menú desplegable */}
              <li className="nav-item">
                <a data-bs-toggle="collapse" href="#gestion-productos" className="collapsed" aria-expanded="false">
                  <i className="fas fa-shopping-cart"></i>
                  <p>Gestión Productos</p>
                  <span className="caret"></span>
                </a>
                <div className="collapse" id="gestion-productos">
                  <ul className="nav nav-collapse">
                    {hasAccess(['administrador', 'director']) && (
                      <li>
                        <Link to="/almacenes">
                          <span className="sub-item">Almacén</span>
                        </Link>
                      </li>
                    )}
                    
                    {hasAccess(['administrador', 'Tienda']) && (
                      <li>
                        <Link to="/productos">
                          <span className="sub-item">Productos</span>
                        </Link>
                      </li>
                    )}
                    
                    <li>
                      <Link to="/movimientos-gastos">
                        <span className="sub-item">Movimientos Gastos</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </li>

              <li className="nav-item">
                <a data-bs-toggle="collapse" href="#inventario" className="collapsed" aria-expanded="false">
                  <i className="fas fa-boxes"></i>
                  <p>Sistema de Inventario</p>
                  <span className="caret"></span>
                </a>
                <div className="collapse" id="inventario">
                  <ul className="nav nav-collapse">
                    {hasAccess(['administrador']) && (
                      <li>
                        <Link to="/compras-administradora">
                          <span className="sub-item">Compras Administradora</span>
                        </Link>
                      </li>
                    )}
                    
                    {hasAccess(['administrador', 'Tienda']) && (
                      <li>
                        <Link to="/inventario-almacen">
                          <span className="sub-item">Inventario de Almacén</span>
                        </Link>
                      </li>
                    )}
                    
                    <li>
                      <Link to="/reportes-ventas-inventario">
                        <span className="sub-item">Reportes de Ventas</span>
                      </Link>
                    </li>
                    
                    {hasAccess(['administrador', 'director']) && (
                      <li>
                        <Link to="/resumen-ganancias-perdidas">
                          <span className="sub-item">Ganancias y Pérdidas</span>
                        </Link>
                      </li>
                    )}
                  </ul>
                </div>
              </li>

              <li className="nav-item">
                <a data-bs-toggle="collapse" href="#academico" className="collapsed" aria-expanded="false">
                  <i className="fas fa-graduation-cap"></i>
                  <p>Gestión Académica</p>
                  <span className="caret"></span>
                </a>
                <div className="collapse" id="academico">
                  <ul className="nav nav-collapse">
                    <li>
                      <Link to="/ingresos-academicos">
                        <span className="sub-item">Ingresos Académicos</span>
                      </Link>
                    </li>
                  </ul>
                </div>
              </li>



              <li className="nav-item">
                <Link to="/reportes" className="nav-link">
                  <i className="fas fa-chart-bar"></i>
                  <p>Reportes Tradicionales</p>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="main-panel">
        <div className="main-header">
          <div className="main-header-logo">
            <div className="logo-header" data-background-color="dark">
              <Link to="/" className="logo">
                <img
                  src="/assets/img/kaiadmin/logo_light.svg"
                  alt="navbar brand"
                  className="navbar-brand"
                  height="20"
                />
              </Link>
              <div className="nav-toggle">
                <button className="btn btn-toggle toggle-sidebar" onClick={toggleSidebar}>
                  <i className="gg-menu-right"></i>
                </button>
                <button className="btn btn-toggle sidenav-toggler">
                  <i className="gg-menu-left"></i>
                </button>
              </div>
              <button className="topbar-toggler more">
                <i className="gg-more-vertical-alt"></i>
              </button>
            </div>
          </div>
          
          <nav className="navbar navbar-header navbar-header-transparent navbar-expand-lg border-bottom">
            <div className="container-fluid">
              <nav className="navbar navbar-header-left navbar-expand-lg navbar-form nav-search p-0 d-none d-lg-flex">
                <div className="input-group">
                  <div className="input-group-prepend">
                    <button type="submit" className="btn btn-search pe-1">
                      <i className="fa fa-search search-icon"></i>
                    </button>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="form-control"
                  />
                </div>
              </nav>

              <ul className="navbar-nav topbar-nav ms-md-auto align-items-center">
                <li className="nav-item topbar-user dropdown hidden-caret">
                  <a
                    className="dropdown-toggle profile-pic"
                    data-bs-toggle="dropdown"
                    href="#"
                    aria-expanded="false"
                  >
                    <div className="avatar-sm">
                      <img
                        src="/assets/img/profile.jpg"
                        alt="..."
                        className="avatar-img rounded-circle"
                      />
                    </div>
                    <span className="profile-username">
                      <span className="op-7">Hola,</span>
                      <span className="fw-bold">{userInfo?.nombre || 'Usuario'}</span>
                    </span>
                  </a>
                  <ul className="dropdown-menu dropdown-user animated fadeIn">
                    <div className="dropdown-user-scroll scrollbar-outer">
                      <li>
                        <div className="user-box">
                          <div className="avatar-lg">
                            <img
                              src="/assets/img/profile.jpg"
                              alt="image profile"
                              className="avatar-img rounded"
                            />
                          </div>
                          <div className="u-text">
                            <h4>{userInfo?.nombre}</h4>
                            <p className="text-muted">{userInfo?.email}</p>
                            <p className="text-muted">Rol: {userInfo?.rol}</p>
                          </div>
                        </div>
                      </li>
                      <li>
                        <div className="dropdown-divider"></div>
                        <a className="dropdown-item" href="#" onClick={() => authService.logout()}>
                          Cerrar Sesión
                        </a>
                      </li>
                    </div>
                  </ul>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="container">
          <div className="page-inner">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Layout;