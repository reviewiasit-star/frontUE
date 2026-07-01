import React, { useEffect, useState } from "react";
import "../../../assets/css/bootstrap.min.css";
import "../../../assets/css/plugins.min.css";
import "../../../assets/css/kaiadmin.min.css";
import "../../../assets/css/demo.css";
// Reemplazado logo de imagen por texto
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Routes, Route, Link, useNavigate, Navigate } from "react-router-dom";
import { getApiUrl } from "../../../config/apiConfig";
import AuthService from "../../../services/authService";
import Usuarios from "../academia/Usuarios";
import ListaInscriptos from "../inscripciones/ListaInscriptos";
import CerrarSesion from "./CerrarSesion";
import Becas from "../academia/Becas";
import Compromiso from "../inscripciones/Compromiso";
import CompromisoModal from "../../../components/CompromisoModal";
import Academia from "../academia/Academia";
import Estudiantes from "../inscripciones/Estudiantes";
import ServiciosAdmin from "../academia/ServiciosAdmin";
import AIAdminChat from "../academia/AIAdminChat";
import WhatsAppAdmin from "../academia/WhatsAppAdmin";
import HistorialChatWhatsApp from "../academia/HistorialChatWhatsApp";
import DocumentosAgente from "../academia/DocumentosAgente";
import MemoriasAgente from "../academia/MemoriasAgente";
import AdquisicionServicios from "../inscripciones/AdquisicionServicios";
import ReporteInscripcion from "../inscripciones/ReporteInscripcion";
import AdminDashboardResumen from "../../../components/AdminDashboardResumen";
// Si necesitas fuentes personalizadas, importa su CSS aquí
import Reportes from "../reports/Reportes";
import IngresosAcademicos from "../inscripciones/IngresosAcademicos";
import ModoDispositivo from "../../../components/modoDispositivo";

import DashboardDirector from "./DashboardDirector";
import DashboardCajero from "./DashboardCajero";
import ConfigUsuario from "./ConfigUsuario";
import AgenteInteligenteFloating from "../../../components/AgenteInteligenteFloating";
import OfflineIndicator from "../../../components/OfflineIndicator";

// Módulo de Tienda
import TiendaVentas from "../tienda/Tienda";
import TiendaProductos from "../tienda/Productos";
import TiendaReporteVentas from "../tienda/reports/ReporteVentas";
import TiendaAlmacenes from "../tienda/Almacenes";

// Componente wrapper que usa useNavigate dentro del Router
function IndexContent({ onLogout, user }) {
  const [stats, setStats] = useState({
    usuarios: 0,
  });
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const navigate = useNavigate();

  // Redireccionar por rol a su dashboard específico al entrar a la raíz
  useEffect(() => {
    if (window.location.hash === "#/") {
      if (user.rol === "Director") {
        navigate("/dashboard-director");
      } else if (user.rol === "Secretaria") {
        navigate("/estudiantes");
      } else if (user.rol === "Cajero") {
        navigate("/dashboard-cajero");
      } else if (user.rol === "Tienda") {
        navigate("/tienda");
      }
    }
  }, [user.rol, navigate]);

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = localStorage.getItem("token");
        const headers = {
          Authorization: `Bearer ${token}`,
        };

        const user = AuthService.getUser();
        const apiUrl = getApiUrl("/dashboard/usuarios-count", user?.rol);
        const url = `${apiUrl}/dashboard/usuarios-count`;

        const usuariosRes = await fetch(url, { headers });

        // Verificar el tipo de contenido antes de parsear
        const contentType = usuariosRes.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await usuariosRes.text();
          console.error("Respuesta no es JSON:", text.substring(0, 200));
          console.error("Status:", usuariosRes.status);
          console.error("URL:", url);

          if (usuariosRes.status === 401) {
            console.error(
              "Token inválido o expirado. Por favor, inicia sesión nuevamente.",
            );
            // No establecer stats para evitar errores en la UI
            return;
          } else if (usuariosRes.status === 404) {
            console.error(
              "La ruta no existe. Verifica que el backend esté funcionando.",
            );
            return;
          } else {
            console.error(
              `El servidor devolvió una respuesta inválida (${usuariosRes.status})`,
            );
            return;
          }
        }

        const usuariosData = await usuariosRes.json();

        if (usuariosRes.ok && usuariosData.ok) {
          setStats({
            usuarios: usuariosData.count || 0,
          });
        } else {
          console.error("Error en respuesta:", usuariosData);
        }
      } catch (error) {
        console.error("Error al cargar estadísticas:", error);
        // No establecer stats para evitar errores en la UI
      }
    }

    fetchStats();
  }, [user.rol]);

  useEffect(() => {
    // 1. Cargar jQuery primero
    const jqueryScript = document.createElement("script");
    jqueryScript.src = "/src/assets/js/core/jquery-3.7.1.min.js";
    jqueryScript.async = false;
    document.body.appendChild(jqueryScript);

    let scriptElements = [];

    jqueryScript.onload = () => {
      window.$ = window.jQuery = window.$ || window.jQuery || window.$;
      // 2. Cargar el resto de scripts en orden
      const scripts = [
        "/src/assets/js/core/popper.min.js",
        "/src/assets/js/core/bootstrap.min.js",
        "/src/assets/js/plugin/jquery-scrollbar/jquery.scrollbar.min.js",
        "/src/assets/js/plugin/chart.js/chart.min.js",
        "/src/assets/js/plugin/jquery.sparkline/jquery.sparkline.min.js",
        "/src/assets/js/plugin/chart-circle/circles.min.js",
        "/src/assets/js/plugin/datatables/datatables.min.js",
        "/src/assets/js/plugin/jsvectormap/jsvectormap.min.js",
        "/src/assets/js/plugin/jsvectormap/world.js",
        "/src/assets/js/plugin/sweetalert/sweetalert.min.js",
        "/src/assets/js/plugin/bootstrap-notify/bootstrap-notify.min.js",
        "/src/assets/js/kaiadmin.min.js",
        "/src/assets/js/setting-demo.js",
      ];

      scripts.forEach((src) => {
        const script = document.createElement("script");
        script.src = src;
        script.async = false;

        // Detectar cuando Chart.js se carga
        if (src.includes("chart.min.js")) {
          script.onload = () => {
            // Disparar evento personalizado cuando Chart.js esté listo
            window.dispatchEvent(new Event("chartjs-loaded"));
          };
        }

        document.body.appendChild(script);
        scriptElements.push(script);
      });
    };

    // Limpieza
    return () => {
      scriptElements.forEach((script) => {
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
    navigate(path === "" ? "/" : `/${path}`);
  };

  const handleLogout = () => {
    if (onLogout) onLogout();
  };

  return (
    <>
      <div className="wrapper">
        {/* Sidebar - Oculto en móviles */}
        <div className="sidebar d-none d-lg-block" data-background-color="dark">
          <div className="sidebar-logo">
            <div className="logo-header" data-background-color="dark">
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
              {/* Tarjeta de perfil: ubicada dentro del contenido del sidebar, encima del menú */}
              <div className="px-3">
                <div
                  className="user-card d-flex flex-column align-items-center text-white"
                  style={{
                    backgroundColor: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: "14px",
                    padding: "14px 12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center"
                    style={{
                      width: 56,
                      height: 56,
                      backgroundColor: "rgba(255,255,255,0.12)",
                      border: "2px solid rgba(255,255,255,0.2)",
                    }}
                    aria-label="avatar"
                  >
                    <i
                      className="fas fa-user"
                      style={{ fontSize: "22px", color: "#fff" }}
                    ></i>
                  </div>
                  <div
                    className="mt-2 text-center"
                    style={{ maxWidth: "220px" }}
                  >
                    <div className="text-white-50" style={{ fontSize: "12px" }}>
                      Hola,
                    </div>
                    <div
                      className="fw-semibold text-truncate"
                      title={user?.nombreCompleto || user?.nombre || "Usuario"}
                      style={{ fontSize: "15px" }}
                    >
                      {user?.nombreCompleto || user?.nombre || "Usuario"}
                    </div>
                    <div
                      className="text-truncate"
                      title={user?.rol || ""}
                      style={{
                        fontSize: "12px",
                        color: "rgba(255,255,255,0.9)",
                        marginTop: "6px",
                        border: "1px solid rgba(255,255,255,0.2)",
                        borderRadius: "999px",
                        padding: "4px 10px",
                        display: "inline-block",
                        backgroundColor: "rgba(255,255,255,0.08)",
                      }}
                    >
                      {user?.rol || ""}
                    </div>
                  </div>
                </div>
              </div>

              <ul className="nav nav-secondary">
                {user.rol === "Administrador" && (
                  <li className="nav-item active">
                    <Link to="/" className="nav-link">
                      <i className="fas fa-home"></i>
                      <p>Panel Principal</p>
                    </Link>
                  </li>
                )}

                {/* Menú específico para administradores */}
                {user.rol === "Administrador" && (
                  <>
                    <li className="nav-item">
                      <Link to="/usuarios" className="nav-link">
                        <i className="fas fa-users"></i>
                        <p>Usuarios</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/whatsapp-admin" className="nav-link">
                        <i className="fab fa-whatsapp"></i>
                        <p>WhatsApp</p>
                      </Link>
                    </li>

                    <li className="nav-item">
                      <Link to="/documentos-agente" className="nav-link">
                        <i className="fas fa-file-alt"></i>
                        <p>Documentos Agente</p>
                      </Link>
                    </li>

                    {/* Sección GESTIÓN INSCRIPCIÓN */}
                    <li className="nav-section">
                      <span className="sidebar-mini-icon">
                        <i className="fas fa-clipboard-list"></i>
                      </span>
                      <h4 className="text-section">GESTIÓN INSCRIPCIÓN</h4>
                    </li>
                    <li className="nav-item">
                      <Link to="/estudiantes" className="nav-link">
                        <i className="fas fa-user-graduate"></i>
                        <p>Estudiantes</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/reportes-inscripcion" className="nav-link">
                        <i className="fas fa-chart-bar"></i>
                        <p>Reportes Inscripción</p>
                      </Link>
                    </li>

                    {/* Sección CONTROL DE PAGO */}
                    <li className="nav-section">
                      <span className="sidebar-mini-icon">
                        <i className="fas fa-money-bill-wave"></i>
                      </span>
                      <h4 className="text-section">CONTROL DE PAGO</h4>
                    </li>
                    <li className="nav-item">
                      <Link to="/reportes" className="nav-link">
                        <i className="fas fa-chart-line"></i>
                        <p>Reportes</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/ingresos-academicos" className="nav-link">
                        <i className="fas fa-university"></i>
                        <p>Ingresos Académicos</p>
                      </Link>
                    </li>

                    <li className="nav-item">
                      <Link
                        to="/cerrar-sesion"
                        className="nav-link"
                        onClick={(e) => {
                          e.preventDefault();
                          if (onLogout) onLogout();
                        }}
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        <p>Cerrar Sesión</p>
                      </Link>
                    </li>
                  </>
                )}

                {/* Menú específico para directores - Panel de Dirección */}
                {user.rol === "Director" && (
                  <>
                    <li className="nav-item">
                      <Link to="/dashboard-director" className="nav-link">
                        <i className="fas fa-user-tie"></i>
                        <p>Panel de Dirección</p>
                      </Link>
                    </li>

                    {/* Sección ACADEMIA */}
                    <li className="nav-section">
                      <span className="sidebar-mini-icon">
                        <i className="fas fa-graduation-cap"></i>
                      </span>
                      <h4 className="text-section">ACADEMIA</h4>
                    </li>
                    <li className="nav-item">
                      <Link to="/becas" className="nav-link">
                        <i className="fas fa-gift"></i>
                        <p>Becas</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/academia" className="nav-link">
                        <i className="fas fa-book"></i>
                        <p>Academia</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/servicios" className="nav-link">
                        <i className="fas fa-cogs"></i>
                        <p>Servicios</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/ingresos-academicos" className="nav-link">
                        <i className="fas fa-university"></i>
                        <p>Ingresos Académicos</p>
                      </Link>
                    </li>

                    <li className="nav-item">
                      <Link
                        to="/cerrar-sesion"
                        className="nav-link"
                        onClick={(e) => {
                          e.preventDefault();
                          if (onLogout) onLogout();
                        }}
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        <p>Cerrar Sesión</p>
                      </Link>
                    </li>
                  </>
                )}

                {/* Menú específico para secretarias */}
                {user.rol === "Secretaria" && (
                  <>
                    {/* Sección GESTIÓN INSCRIPCIÓN */}
                    <li className="nav-section">
                      <span className="sidebar-mini-icon">
                        <i className="fas fa-clipboard-list"></i>
                      </span>
                      <h4 className="text-section">GESTIÓN INSCRIPCIÓN</h4>
                    </li>
                    <li className="nav-item">
                      <Link to="/estudiantes" className="nav-link">
                        <i className="fas fa-user-graduate"></i>
                        <p>Estudiantes</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/reportes-inscripcion" className="nav-link">
                        <i className="fas fa-chart-bar"></i>
                        <p>Reportes Inscripción</p>
                      </Link>
                    </li>

                    <li className="nav-item">
                      <Link
                        to="/cerrar-sesion"
                        className="nav-link"
                        onClick={(e) => {
                          e.preventDefault();
                          if (onLogout) onLogout();
                        }}
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        <p>Cerrar Sesión</p>
                      </Link>
                    </li>
                  </>
                )}

                {/* Menú específico para cajeros */}
                {user.rol === "Cajero" && (
                  <>
                    <li className="nav-item">
                      <Link to="/dashboard-cajero" className="nav-link">
                        <i className="fas fa-cash-register"></i>
                        <p>Panel de Caja</p>
                      </Link>
                    </li>

                    {/* Sección GESTIÓN INSCRIPCIÓN */}
                    <li className="nav-section">
                      <span className="sidebar-mini-icon">
                        <i className="fas fa-clipboard-list"></i>
                      </span>
                      <h4 className="text-section">GESTIÓN INSCRIPCIÓN</h4>
                    </li>
                    <li className="nav-item">
                      <Link to="/adquisicion-servicios" className="nav-link">
                        <i className="fas fa-hands-helping"></i>
                        <p>Servicios adquiridos</p>
                      </Link>
                    </li>

                    {/* Sección CONTROL DE PAGO */}
                    <li className="nav-section">
                      <span className="sidebar-mini-icon">
                        <i className="fas fa-money-bill-wave"></i>
                      </span>
                      <h4 className="text-section">CONTROL DE PAGO</h4>
                    </li>
                    <li className="nav-item">
                      <Link to="/compromiso" className="nav-link">
                        <i className="fas fa-file-contract"></i>
                        <p>Compromiso Económico</p>
                      </Link>
                    </li>

                    <li className="nav-item">
                      <Link
                        to="/cerrar-sesion"
                        className="nav-link"
                        onClick={(e) => {
                          e.preventDefault();
                          if (onLogout) onLogout();
                        }}
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        <p>Cerrar Sesión</p>
                      </Link>
                    </li>
                  </>
                )}

                {/* Menú específico para el rol Tienda */}
                {user.rol === "Tienda" && (
                  <>
                    <li className="nav-item active">
                      <Link to="/tienda" className="nav-link">
                        <i className="fas fa-store"></i>
                        <p>Ventas / Tienda</p>
                      </Link>
                    </li>

                    {/* Sección INVENTARIO */}
                    <li className="nav-section">
                      <span className="sidebar-mini-icon">
                        <i className="fas fa-boxes"></i>
                      </span>
                      <h4 className="text-section">INVENTARIO</h4>
                    </li>
                    <li className="nav-item">
                      <Link to="/tienda-almacenes" className="nav-link">
                        <i className="fas fa-warehouse"></i>
                        <p>Almacenes</p>
                      </Link>
                    </li>
                    <li className="nav-item">
                      <Link to="/tienda-productos" className="nav-link">
                        <i className="fas fa-box-open"></i>
                        <p>Productos</p>
                      </Link>
                    </li>

                    {/* Sección REPORTES */}
                    <li className="nav-section">
                      <span className="sidebar-mini-icon">
                        <i className="fas fa-chart-bar"></i>
                      </span>
                      <h4 className="text-section">REPORTES</h4>
                    </li>
                    <li className="nav-item">
                      <Link to="/tienda-reporte-ventas" className="nav-link">
                        <i className="fas fa-chart-line"></i>
                        <p>Reporte de Ventas</p>
                      </Link>
                    </li>

                    <li className="nav-item">
                      <Link
                        to="/cerrar-sesion"
                        className="nav-link"
                        onClick={(e) => {
                          e.preventDefault();
                          if (onLogout) onLogout();
                        }}
                      >
                        <i className="fas fa-sign-out-alt"></i>
                        <p>Cerrar Sesión</p>
                      </Link>
                    </li>
                  </>
                )}
              </ul>
              {/* Enlace común a Configuración para todos los roles */}
              <div className="mt-3 px-3">
                <Link
                  to="/configuracion"
                  className="btn btn-outline-light w-100"
                >
                  <i className="fas fa-user-cog me-2"></i>
                  Configuración
                </Link>
              </div>
            </div>
          </div>
        </div>
        {/* End Sidebar */}

        {/* Header móvil */}
        <div
          className="d-lg-none position-fixed w-100 bg-primary text-white p-3"
          style={{ zIndex: 1030, top: 0 }}
        >
          <div className="d-flex align-items-center justify-content-between">
            <button
              className="btn btn-outline-light me-3"
              onClick={() => setShowMobileMenu(true)}
              title="Menú de navegación"
            >
              <i className="fas fa-bars"></i>
            </button>
            <h5 className="mb-0">Sistema Educativo</h5>
            <div style={{ width: "40px" }}></div>{" "}
            {/* Espaciador para centrar el título */}
          </div>
        </div>

        <div className="main-panel">
          <div className="container py-4">
            <Routes>
              {/* Ruta principal con dashboards específicos por rol */}
              <Route
                path="/"
                element={
                  user.rol === "Administrador" ? (
                    <AdminDashboardResumen title="Resumen institucional" />
                  ) : user.rol === "Director" ? (
                    <DashboardDirector />
                  ) : user.rol === "Secretaria" ? (
                    <Navigate to="/estudiantes" replace />
                  ) : user.rol === "Cajero" ? (
                    <DashboardCajero />
                  ) : user.rol === "Tienda" ? (
                    <Navigate to="/tienda" replace />
                  ) : (
                    <Navigate to="/" />
                  )
                }
              />
              {user.rol === "Administrador" && (
                <>
                  <Route path="/usuarios" element={<Usuarios />} />
                  <Route path="/estudiantes" element={<ListaInscriptos />} />
                  <Route path="/estudiantes" element={<Estudiantes />} />
                  <Route
                    path="/reportes-inscripcion"
                    element={<ReporteInscripcion />}
                  />
                </>
              )}
              {/* Rutas específicas para directores */}
              {user.rol === "Director" && (
                <>
                  <Route
                    path="/dashboard-director"
                    element={<DashboardDirector />}
                  />
                  <Route path="/becas" element={<Becas />} />
                  <Route path="/academia" element={<Academia />} />
                  <Route path="/servicios" element={<ServiciosAdmin />} />
                  <Route
                    path="/ingresos-academicos"
                    element={<IngresosAcademicos />}
                  />
                </>
              )}
              {/* Rutas específicas para secretarias */}
              {user.rol === "Secretaria" && (
                <>
                  <Route path="/estudiantes" element={<ListaInscriptos />} />
                  <Route
                    path="/reportes-inscripcion"
                    element={<ReporteInscripcion />}
                  />
                </>
              )}
              {/* Rutas específicas para cajeros */}
              {user.rol === "Cajero" && (
                <>
                  <Route
                    path="/dashboard-cajero"
                    element={<DashboardCajero />}
                  />
                  <Route path="/compromiso" element={<Compromiso />} />
                  <Route
                    path="/adquisicion-servicios"
                    element={<AdquisicionServicios />}
                  />
                </>
              )}
              {/* Rutas específicas para administradores */}
              {user.rol === "Administrador" && (
                <>
                  <Route path="/reportes" element={<Reportes />} />
                  <Route
                    path="/ingresos-academicos"
                    element={<IngresosAcademicos />}
                  />
                  <Route path="/whatsapp-admin" element={<WhatsAppAdmin />} />
                  <Route
                    path="/historial-chat"
                    element={<HistorialChatWhatsApp />}
                  />
                  <Route
                    path="/documentos-agente"
                    element={<DocumentosAgente />}
                  />
                  <Route path="/memorias-agente" element={<MemoriasAgente />} />
                </>
              )}

              {/* Rutas específicas para el rol Tienda */}
              {user.rol === "Tienda" && (
                <>
                  <Route path="/tienda" element={<TiendaVentas />} />
                  <Route path="/tienda-almacenes" element={<TiendaAlmacenes />} />
                  <Route path="/tienda-productos" element={<TiendaProductos />} />
                  <Route
                    path="/tienda-reporte-ventas"
                    element={<TiendaReporteVentas />}
                  />
                </>
              )}

              <Route path="/cerrar-sesion" element={<CerrarSesion />} />
              {/* Configuración disponible para cualquier rol */}
              <Route path="/configuracion" element={<ConfigUsuario />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
          {user.rol !== "Administrador" && <footer className="footer"></footer>}
        </div>
      </div>

      <CompromisoModal
        isOpen={showCompromiso}
        onClose={() => setShowCompromiso(false)}
      />

      {/* Botón flotante del Asistente Inteligente - Admin, Director y Secretaria */}
      {(user.rol === "Administrador" ||
        user.rol === "Director" ||
        user.rol === "Secretaria") && <AgenteInteligenteFloating user={user} />}

      {/* Componente ModoDispositivo */}
      <ModoDispositivo
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        onNavigate={handleMobileNavigate}
        onLogout={handleLogout}
        user={user}
      />

      {/* Indicador de estado offline */}
      <OfflineIndicator />
    </>
  );
}

// Función Index principal que envuelve todo en Router
function Index({ onLogout, user }) {
  return <IndexContent onLogout={onLogout} user={user} />;
}

export default Index;
