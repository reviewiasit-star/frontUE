import React, { useEffect, useState } from 'react';
import '../assets/css/bootstrap.min.css';
import '../assets/css/plugins.min.css';
import '../assets/css/kaiadmin.min.css';
import '../assets/css/demo.css';
import logo from '../assets/img/kaiadmin/logo_light.svg';
import '@fortawesome/fontawesome-free/css/all.min.css';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import Usuarios from './Usuarios';
import ListaInscriptos from './ListaInscriptos';
import CerrarSesion from './CerrarSesion';
import Becas from './Becas';
import Compromiso from './Compromiso';
import CompromisoModal from '../components/CompromisoModal';
import Academia from './Academia';
import Estudiantes from './Estudiantes';
// Si necesitas fuentes personalizadas, importa su CSS aquí
import Reportes from './Reportes';
import IngresosAcademicos from './IngresosAcademicos';
import Almacenes from './Almacenes';
import Productos from './Productos';
import MovimientosGastos from './MovimientosGastos';
import Tienda from './Tienda';
import ReporteProductos from './ReporteProductos';
import ReporteVentas from './ReporteVentas';
import Dashboard from './Dashboard';
import ModoDispositivo from '../components/modoDispositivo';

import DashboardDirector from './DashboardDirector';

// Componente wrapper que usa useNavigate dentro del Router
function IndexContent({ onLogout, user }) {
  const [stats, setStats] = useState({ estudiantes: 0, compromisos: 0, usuarios: 0 });
  const [pagosPendientes, setPagosPendientes] = useState([]);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [filtroMes, setFiltroMes] = useState(new Date().getMonth() + 1);
  const [mostrarTodosLosMeses, setMostrarTodosLosMeses] = useState(false);
  const [filtroAnio, setFiltroAnio] = useState(2025);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [gestionProductosOpen, setGestionProductosOpen] = useState(false);

  const [administracionAcademicaOpen, setAdministracionAcademicaOpen] = useState(false);
  const [gestionInscripcionesOpen, setGestionInscripcionesOpen] = useState(false);
  const navigate = useNavigate();
  
  // Redireccionar directores a su dashboard específico
  useEffect(() => {
    if (user.rol === 'Director' && window.location.hash === '#/') {
      navigate('/dashboard-director');
    }
  }, [user.rol, navigate]);

  // Función para cargar pagos pendientes
  const fetchPagosPendientes = async () => {
    if (user.rol !== 'Administrador') return;
    
    setLoadingPagos(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      // Construir parámetros de consulta
      const params = new URLSearchParams({
        anio: filtroAnio,
        todos_los_meses: mostrarTodosLosMeses
      });
      
      if (!mostrarTodosLosMeses) {
        params.append('mes', filtroMes);
      }
      
      const response = await fetch(`http://${window.location.hostname}:3001/api/dashboard/pagos-pendientes?${params}`, { headers });
      const data = await response.json();
      
      if (data.ok) {
        setPagosPendientes(data.pagos || []);
      }
    } catch (error) {
      console.error('Error al cargar pagos pendientes:', error);
    } finally {
      setLoadingPagos(false);
    }
  };

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem('token');
        const headers = {
          'Authorization': `Bearer ${token}`
        };
        
        // Obtener cantidad de estudiantes inscritos
        const estudiantesRes = await fetch(`http://${window.location.hostname}:3001/api/dashboard/estudiantes-count`, { headers });
        const estudiantesData = await estudiantesRes.json();
        
        // Obtener cantidad de compromisos registrados
        const compromisosRes = await fetch(`http://${window.location.hostname}:3001/api/dashboard/compromisos-count`, { headers });
        const compromisosData = await compromisosRes.json();
        
        // Obtener cantidad de usuarios
        const usuariosRes = await fetch(`http://${window.location.hostname}:3001/api/dashboard/usuarios-count`, { headers });
        const usuariosData = await usuariosRes.json();
        
        setStats({
          estudiantes: (estudiantesData.ok ? estudiantesData.count : 0) || 0,
          compromisos: (compromisosData.ok ? compromisosData.count : 0) || 0,
          usuarios: (usuariosData.ok ? usuariosData.count : 0) || 0
        });
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      }
    }

    fetchStats();
    fetchPagosPendientes();
  }, [user.rol]);

  // Efecto para recargar pagos cuando cambien los filtros
  useEffect(() => {
    if (user.rol === 'Administrador') {
      fetchPagosPendientes();
    }
  }, [filtroMes, mostrarTodosLosMeses, filtroAnio]);

  useEffect(() => {
    // 1. Cargar jQuery primero
    const jqueryScript = document.createElement('script');
    jqueryScript.src = '/src/assets/js/core/jquery-3.7.1.min.js';
    jqueryScript.async = false;
    document.body.appendChild(jqueryScript);

    let scriptElements = [];
    jqueryScript.onload = () => {
      window.$ = window.jQuery = window.$ || window.jQuery || window.$;
      // 2. Cargar el resto de scripts en orden
      const scripts = [
        '/src/assets/js/core/popper.min.js',
        '/src/assets/js/core/bootstrap.min.js',
        '/src/assets/js/plugin/jquery-scrollbar/jquery.scrollbar.min.js',
        '/src/assets/js/plugin/chart.js/chart.min.js',
        '/src/assets/js/plugin/jquery.sparkline/jquery.sparkline.min.js',
        '/src/assets/js/plugin/chart-circle/circles.min.js',
        '/src/assets/js/plugin/datatables/datatables.min.js',
        '/src/assets/js/plugin/jsvectormap/jsvectormap.min.js',
        '/src/assets/js/plugin/jsvectormap/world.js',
        '/src/assets/js/plugin/sweetalert/sweetalert.min.js',
        '/src/assets/js/plugin/bootstrap-notify/bootstrap-notify.min.js',
        '/src/assets/js/kaiadmin.min.js',
        '/src/assets/js/setting-demo.js',
      ];
      scriptElements = scripts.map(src => {
        const script = document.createElement('script');
        script.src = src;
        script.async = false;
        document.body.appendChild(script);
        return script;
      });
    };

    // Limpieza
    return () => {
      scriptElements.forEach(script => {
        if (document.body.contains(script)) {
          document.body.removeChild(script);
        }
      });
      if (document.body.contains(jqueryScript)) {
        document.body.removeChild(jqueryScript);
      }
    };
  }, []);

  const [showCompromiso, setShowCompromiso] = React.useState(false);

  // Función para manejar navegación móvil
  const handleMobileNavigate = (path) => {
    setShowMobileMenu(false);
    // Si el path está vacío, navegar a la raíz, sino agregar la barra
    navigate(path === '' ? '/' : `/${path}`);
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  // Función para manejar el menú desplegable de Gestión Productos
  const toggleGestionProductos = (e) => {
    e.preventDefault();
    setGestionProductosOpen(!gestionProductosOpen);
  };



  // Función para manejar el menú desplegable de Administración Académica
  const toggleAdministracionAcademica = (e) => {
    e.preventDefault();
    setAdministracionAcademicaOpen(!administracionAcademicaOpen);
  };

  // Función para manejar el menú desplegable de Gestión Inscripciones
  const toggleGestionInscripciones = (e) => {
    e.preventDefault();
    setGestionInscripcionesOpen(!gestionInscripcionesOpen);
  };

  return (
    <>
        <div className="wrapper">
        {/* Sidebar - Oculto en móviles */}
        <div className="sidebar d-none d-lg-block" data-background-color="dark">
          <div className="sidebar-logo">
            <div className="logo-header" data-background-color="dark">
              <a href="#" className="logo">
                <img
                  src={logo}
                  alt="navbar brand"
                  className="navbar-brand"
                  height="20"
                />
              </a>
              <div className="nav-toggle">
                <button className="btn btn-toggle toggle-sidebar">
                  <i className="gg-menu-right"></i>
                </button>
                <button className="btn btn-toggle sidenav-toggler">
                  <i className="gg-menu-left"></i>
                </button>
              </div>
              {/* Eliminar el botón innecesario de los tres puntos verticales */}
            </div>
          </div>
          <div className="sidebar-wrapper scrollbar scrollbar-inner">
            <div className="sidebar-content">

              
              <ul className="nav nav-secondary">
                <li className="nav-item active">
                  <Link to="/" className="nav-link">
                    <i className="fas fa-home"></i>
                    <p>Dashboard</p>
                  </Link>
                </li>
                <li className="nav-section">
                  <span className="sidebar-mini-icon">
                    <i className="fa fa-ellipsis-h"></i>
                  </span>
                  <h4 className="text-section">Menú</h4>
                </li>
                {/* Menú específico para administradores */}
                {user.rol === 'Administrador' && (
                  <>
                    {/* ADMINISTRACIÓN ACADÉMICA */}
                    <li className={`nav-item ${administracionAcademicaOpen ? 'submenu' : ''}`}>
                      <a 
                        href="#" 
                        onClick={toggleAdministracionAcademica}
                        className={administracionAcademicaOpen ? '' : 'collapsed'} 
                        aria-expanded={administracionAcademicaOpen}
                      >
                        <i className="fas fa-graduation-cap"></i>
                        <p>Administración Académica</p>
                        <span className="caret"></span>
                      </a>
                      <div className={`collapse ${administracionAcademicaOpen ? 'show' : ''}`} id="administracion-academica">
                        <ul className="nav nav-collapse">
                          <li>
                            <Link to="/usuarios">
                              <span className="sub-item">Usuarios</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/becas">
                              <span className="sub-item">Becas</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/academia">
                              <span className="sub-item">Academia</span>
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </li>
                    {/* GESTIÓN INSCRIPCIONES */}
                    <li className={`nav-item ${gestionInscripcionesOpen ? 'submenu' : ''}`}>
                      <a 
                        href="#" 
                        onClick={toggleGestionInscripciones}
                        className={gestionInscripcionesOpen ? '' : 'collapsed'} 
                        aria-expanded={gestionInscripcionesOpen}
                      >
                        <i className="fas fa-clipboard-list"></i>
                        <p>Gestión Inscripciones</p>
                        <span className="caret"></span>
                      </a>
                      <div className={`collapse ${gestionInscripcionesOpen ? 'show' : ''}`} id="gestion-inscripciones">
                        <ul className="nav nav-collapse">
                          <li>
                            <Link to="/estudiantes">
                              <span className="sub-item">Estudiantes</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/compromiso">
                              <span className="sub-item">Compromiso Económico</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/reportes">
                              <span className="sub-item">Reportes</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/ingresos-academicos">
                              <span className="sub-item">Ingresos Académicos</span>
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </li>
                    {/* GESTIÓN PRODUCTOS - Nuevo menú desplegable con funcionalidad personalizada */}
                    <li className={`nav-item ${gestionProductosOpen ? 'submenu' : ''}`}>
                      <a 
                        href="#" 
                        onClick={toggleGestionProductos}
                        className={gestionProductosOpen ? '' : 'collapsed'} 
                        aria-expanded={gestionProductosOpen}
                      >
                        <i className="fas fa-shopping-cart"></i>
                        <p>Gestión Productos</p>
                        <span className="caret"></span>
                      </a>
                      <div className={`collapse ${gestionProductosOpen ? 'show' : ''}`} id="gestion-productos">
                        <ul className="nav nav-collapse">
                          <li>
                            <Link to="/almacenes">
                              <span className="sub-item">Almacén</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/productos">
                              <span className="sub-item">Productos</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/movimientos-gastos">
                              <span className="sub-item">Movimientos Gastos</span>
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </li>

                    <li className="nav-item">
                      <Link to="/cerrar-sesion" className="nav-link" onClick={e => { e.preventDefault(); if (onLogout) onLogout(); }}>
                        <i className="fas fa-sign-out-alt"></i>
                        <p>Cerrar Sesión</p>
                      </Link>
                    </li>
                  </>
                )}

                {/* Menú específico para directores - Panel de Dirección */}
                {user.rol === 'Director' && (
                  <>
                    <li className="nav-item">
                      <Link to="/dashboard-director" className="nav-link">
                        <i className="fas fa-user-tie"></i>
                        <p>Panel de Dirección</p>
                      </Link>
                    </li>
                    {/* GESTIÓN INSCRIPCIONES PARA DIRECTORES */}
                    <li className={`nav-item ${gestionInscripcionesOpen ? 'submenu' : ''}`}>
                      <a 
                        href="#" 
                        onClick={toggleGestionInscripciones}
                        className={gestionInscripcionesOpen ? '' : 'collapsed'} 
                        aria-expanded={gestionInscripcionesOpen}
                      >
                        <i className="fas fa-clipboard-list"></i>
                        <p>Gestión Inscripciones</p>
                        <span className="caret"></span>
                      </a>
                      <div className={`collapse ${gestionInscripcionesOpen ? 'show' : ''}`} id="gestion-inscripciones-director">
                        <ul className="nav nav-collapse">
                          <li>
                            <Link to="/estudiantes">
                              <span className="sub-item">Estudiantes</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/compromiso">
                              <span className="sub-item">Compromiso Económico</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/reportes">
                              <span className="sub-item">Reportes</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/ingresos-academicos">
                              <span className="sub-item">Ingresos Académicos</span>
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </li>
                    {/* ADMINISTRACIÓN ACADÉMICA PARA DIRECTORES */}
                    <li className={`nav-item ${administracionAcademicaOpen ? 'submenu' : ''}`}>
                      <a 
                        href="#" 
                        onClick={toggleAdministracionAcademica}
                        className={administracionAcademicaOpen ? '' : 'collapsed'} 
                        aria-expanded={administracionAcademicaOpen}
                      >
                        <i className="fas fa-graduation-cap"></i>
                        <p>Administración Académica</p>
                        <span className="caret"></span>
                      </a>
                      <div className={`collapse ${administracionAcademicaOpen ? 'show' : ''}`} id="administracion-academica-director">
                        <ul className="nav nav-collapse">
                          <li>
                            <Link to="/becas">
                              <span className="sub-item">Becas</span>
                            </Link>
                          </li>
                          <li>
                            <Link to="/academia">
                              <span className="sub-item">Academia</span>
                            </Link>
                          </li>
                        </ul>
                      </div>
                    </li>

                    <li className="nav-item">
                      <Link to="/cerrar-sesion" className="nav-link" onClick={e => { e.preventDefault(); if (onLogout) onLogout(); }}>
                        <i className="fas fa-sign-out-alt"></i>
                        <p>Cerrar Sesión</p>
                      </Link>
                    </li>
                  </>
                )}

                {/* Menú para tienda */}
                {user.rol === 'Tienda' && (
                  <>
                    <li className="nav-item">
                      <Link to="/tienda" className="nav-link">
                        <i className="fas fa-store"></i>
                        <p>Tienda</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/reporte-ventas" className="nav-link">
                        <i className="fas fa-file-invoice-dollar"></i>
                        <p>Reporte de ventas</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/cerrar-sesion" className="nav-link" onClick={e => { e.preventDefault(); if (onLogout) onLogout(); }}>
                        <i className="fas fa-sign-out-alt"></i>
                        <p>Cerrar Sesión</p>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
            </div>
          </div>
        </div>
        {/* End Sidebar */}

        {/* Header móvil */}
        <div className="d-lg-none position-fixed w-100 bg-primary text-white p-3" style={{ zIndex: 1030, top: 0 }}>
          <div className="d-flex align-items-center justify-content-between">
            <button 
              className="btn btn-outline-light me-3" 
              onClick={() => setShowMobileMenu(true)}
              title="Menú de navegación"
            >
              <i className="fas fa-bars"></i>
            </button>
            <h5 className="mb-0">Sistema Educativo</h5>
            <div style={{ width: '40px' }}></div> {/* Espaciador para centrar el título */}
          </div>
        </div>

        <div className="main-panel" style={{ marginLeft: window.innerWidth < 992 ? '0' : undefined }}>
          <div className="container" style={{ paddingTop: window.innerWidth < 992 ? '80px' : undefined }}>
            <Routes>
              {/* Ruta principal con dashboards específicos por rol */}
              <Route path="/" element={
                user.rol === 'Tienda' ? (
                  <Dashboard />
                ) : user.rol === 'Director' ? (
                  <DashboardDirector />
                ) : (
                  // Dashboard para administradores
                  <div className="row">
                    <div className="col-12">
                      <div className="row g-4 mb-4">
                        <div className="col-md-4 col-12">
                          <div className="card text-center shadow-sm">
                            <div className="card-body">
                              <i className="fas fa-users fa-2x mb-2 text-primary"></i>
                              <h5 className="card-title">Estudiantes Inscritos</h5>
                              <h2 className="fw-bold">{stats.estudiantes}</h2>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4 col-12">
                          <div className="card text-center shadow-sm">
                            <div className="card-body">
                              <i className="fas fa-file-invoice-dollar fa-2x mb-2 text-success"></i>
                              <h5 className="card-title">Compromisos Registrados</h5>
                              <h2 className="fw-bold">{stats.compromisos}</h2>
                            </div>
                          </div>
                        </div>
                        <div className="col-md-4 col-12">
                          <div className="card text-center shadow-sm">
                            <div className="card-body">
                              <i className="fas fa-user-shield fa-2x mb-2 text-warning"></i>
                              <h5 className="card-title">Usuarios</h5>
                              <h2 className="fw-bold">{stats.usuarios}</h2>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Tabla de Pagos Pendientes */}
                      <div className="card shadow-sm">
                        <div className="card-header bg-primary text-white">
                          <div className="d-flex justify-content-between align-items-center">
                            <div>
                              <h5 className="mb-0">
                                <i className="fas fa-exclamation-triangle me-2"></i>
                                Pagos Pendientes - Año {filtroAnio}
                              </h5>
                              <small>
                                {mostrarTodosLosMeses 
                                  ? 'Todos los meses con pagos pendientes, parciales o vencidos'
                                  : `Pagos pendientes de ${['', 'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][filtroMes]} ${filtroAnio}`
                                }
                              </small>
                            </div>
                            <div className="d-flex gap-2">
                              {/* Filtro de Año */}
                              <select 
                                className="form-select form-select-sm" 
                                style={{width: 'auto'}}
                                value={filtroAnio}
                                onChange={(e) => setFiltroAnio(parseInt(e.target.value))}
                              >
                                <option value={2024}>2024</option>
                                <option value={2025}>2025</option>
                                <option value={2026}>2026</option>
                              </select>
                              
                              {/* Toggle para todos los meses */}
                              <div className="form-check form-switch">
                                <input 
                                  className="form-check-input" 
                                  type="checkbox" 
                                  id="todosLosMeses"
                                  checked={mostrarTodosLosMeses}
                                  onChange={(e) => setMostrarTodosLosMeses(e.target.checked)}
                                />
                                <label className="form-check-label text-white" htmlFor="todosLosMeses">
                                  Todos los meses
                                </label>
                              </div>
                              
                              {/* Filtro de Mes (solo si no está marcado "todos los meses") */}
                              {!mostrarTodosLosMeses && (
                                <select 
                                  className="form-select form-select-sm" 
                                  style={{width: 'auto'}}
                                  value={filtroMes}
                                  onChange={(e) => setFiltroMes(parseInt(e.target.value))}
                                >
                                  <option value={1}>Enero</option>
                                  <option value={2}>Febrero</option>
                                  <option value={3}>Marzo</option>
                                  <option value={4}>Abril</option>
                                  <option value={5}>Mayo</option>
                                  <option value={6}>Junio</option>
                                  <option value={7}>Julio</option>
                                  <option value={8}>Agosto</option>
                                  <option value={9}>Septiembre</option>
                                  <option value={10}>Octubre</option>
                                  <option value={11}>Noviembre</option>
                                  <option value={12}>Diciembre</option>
                                </select>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="card-body">
                          {loadingPagos ? (
                            <div className="text-center py-4">
                              <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Cargando...</span>
                              </div>
                              <p className="mt-2">Cargando pagos pendientes...</p>
                            </div>
                          ) : pagosPendientes.length === 0 ? (
                            <div className="text-center py-4">
                              <i className="fas fa-check-circle fa-3x text-success mb-3"></i>
                              <h5>¡Excelente!</h5>
                              <p className="text-muted">No hay pagos pendientes para este mes.</p>
                            </div>
                          ) : (
                            <div className="table-responsive">
                              <table className="table table-hover">
                                <thead className="table-light">
                                  <tr>
                                    <th>Estudiante</th>
                                    <th>CI</th>
                                    <th>Nivel/Curso</th>
                                    <th>Mes</th>
                                    <th>Monto a Pagar</th>
                                    <th>Fecha Vencimiento</th>
                                    <th>Estado</th>
                                    <th>Días</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {pagosPendientes.map((pago, index) => {
                                    const fechaVencimiento = new Date(pago.fecha_vencimiento);
                                    const hoy = new Date();
                                    const diasDiferencia = Math.ceil((fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                                    const estaVencido = diasDiferencia < 0;
                                    const proximoVencer = diasDiferencia <= 7 && diasDiferencia >= 0;

                                    return (
                                      <tr key={`${pago.pago_id}-${index}`} className={estaVencido ? 'table-danger' : proximoVencer ? 'table-warning' : ''}>
                                        <td>
                                          <strong>{pago.nombre} {pago.apellido_paterno} {pago.apellido_materno}</strong>
                                        </td>
                                        <td>{pago.ci_estudiante}</td>
                                        <td>
                                          <small className="text-muted">
                                            {pago.nivel_nombre} - {pago.curso_nombre}
                                            {pago.bloque_nombre && ` (${pago.bloque_nombre})`}
                                          </small>
                                        </td>
                                        <td>
                                          <span className="badge bg-info">
                                            {pago.nombre_mes} {pago.anio}
                                          </span>
                                        </td>
                                        <td>
                                          <strong className="text-success">
                                            Bs {parseFloat(pago.saldo_pendiente || 0).toFixed(2)}
                                          </strong>
                                        </td>
                                        <td>
                                          {fechaVencimiento.toLocaleDateString('es-ES')}
                                        </td>
                                        <td>
                                          <span className={`badge ${
                                            pago.estado === 'vencido' ? 'bg-danger' :
                                            pago.estado === 'parcial' ? 'bg-warning' : 'bg-secondary'
                                          }`}>
                                            {pago.estado === 'vencido' ? 'Vencido' :
                                             pago.estado === 'parcial' ? 'Parcial' : 'Pendiente'}
                                          </span>
                                        </td>
                                        <td>
                                          <span className={`badge ${
                                            estaVencido ? 'bg-danger' :
                                            proximoVencer ? 'bg-warning' : 'bg-success'
                                          }`}>
                                            {estaVencido ? `${Math.abs(diasDiferencia)} días vencido` :
                                             proximoVencer ? `${diasDiferencia} días restantes` :
                                             `${diasDiferencia} días`}
                                          </span>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                              
                              {/* Resumen */}
                              <div className="row mt-3">
                                <div className="col-md-2">
                                  <div className="card bg-danger text-white">
                                    <div className="card-body text-center">
                                      <h6>Vencidos</h6>
                                      <h4>{pagosPendientes.filter(p => new Date(p.fecha_vencimiento) < new Date()).length}</h4>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-md-2">
                                  <div className="card bg-warning text-white">
                                    <div className="card-body text-center">
                                      <h6>Por Vencer (7 días)</h6>
                                      <h4>{pagosPendientes.filter(p => {
                                        const dias = Math.ceil((new Date(p.fecha_vencimiento) - new Date()) / (1000 * 60 * 60 * 24));
                                        return dias <= 7 && dias >= 0;
                                      }).length}</h4>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-md-2">
                                  <div className="card bg-info text-white">
                                    <div className="card-body text-center">
                                      <h6>Total Pendientes</h6>
                                      <h4>{pagosPendientes.length}</h4>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-md-3">
                                  <div className="card bg-success text-white">
                                    <div className="card-body text-center">
                                      <h6>Monto Total</h6>
                                      <h4>Bs {pagosPendientes.reduce((sum, p) => sum + parseFloat(p.saldo_pendiente || 0), 0).toFixed(2)}</h4>
                                    </div>
                                  </div>
                                </div>
                                <div className="col-md-3">
                                  <div className="card bg-secondary text-white">
                                    <div className="card-body text-center">
                                      <h6>Meses con Deudas</h6>
                                      <h4>{[...new Set(pagosPendientes.map(p => p.mes))].length}</h4>
                                      <small>{[...new Set(pagosPendientes.map(p => p.nombre_mes))].join(', ')}</small>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              } />
              {(user.rol === 'Administrador' || user.rol === 'Director') && (
                <>
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/estudiantes" element={<ListaInscriptos />} />
                  <Route path="/estudiantes" element={<Estudiantes />} />
                  <Route path="/becas" element={<Becas />} />
                  <Route path="/compromiso" element={<Compromiso />} />
                  <Route path="/academia" element={<Academia />} />
                  <Route path="/almacenes" element={<Almacenes />} />
                  <Route path="/productos" element={<Productos />} />
                  <Route path="/movimientos-gastos" element={<MovimientosGastos />} />
                </>
              )}
              {user.rol === 'Tienda' && (
                <>
                  <Route path="/tienda" element={<Tienda />} />
                  <Route path="/reporte-ventas" element={<ReporteVentas />} />
                </>
              )}
              {/* Rutas específicas para directores */}
              {user.rol === 'Director' && (
                <>
                  <Route path="/dashboard-director" element={<DashboardDirector />} />

                </>
              )}
              {/* Rutas específicas para administradores */}
              {user.rol === 'Administrador' && (
                <>
                  <Route path="/reportes" element={<Reportes />} />
                  <Route path="/ingresos-academicos" element={<IngresosAcademicos />} />

                </>
              )}

              <Route path="/cerrar-sesion" element={<CerrarSesion />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          <footer className="footer">
          </footer>
        </div>
      </div>
      
      <CompromisoModal isOpen={showCompromiso} onClose={() => setShowCompromiso(false)} />

      {/* Componente ModoDispositivo */}
      <ModoDispositivo 
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        onNavigate={handleMobileNavigate}
        onLogout={handleLogout}
        user={user}
      />

      </>
    );
}

// Función Index principal que envuelve todo en Router
function Index({ onLogout, user }) {
  return (
    <Router>
      <IndexContent onLogout={onLogout} user={user} />
    </Router>
  );
}

export default Index;
