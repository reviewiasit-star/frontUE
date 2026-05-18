import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getApiUrl, BACKEND_PRINCIPAL } from '../config/apiConfig';

const BACKEND_PRINCIPAL_ORIGIN = BACKEND_PRINCIPAL.replace(/\/api\/?$/, '');
import AuthService from '../services/authService';
import logo from '../assets/img/logo.jpg';

const MESES = [
  { numero: 1, nombre: 'Enero' },
  { numero: 2, nombre: 'Febrero' },
  { numero: 3, nombre: 'Marzo' },
  { numero: 4, nombre: 'Abril' },
  { numero: 5, nombre: 'Mayo' },
  { numero: 6, nombre: 'Junio' },
  { numero: 7, nombre: 'Julio' },
  { numero: 8, nombre: 'Agosto' },
  { numero: 9, nombre: 'Septiembre' },
  { numero: 10, nombre: 'Octubre' },
  { numero: 11, nombre: 'Noviembre' },
  { numero: 12, nombre: 'Diciembre' }
];

const formatCurrency = (value) =>
  `Bs ${Number(value || 0).toLocaleString('es-BO', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const estadoBadgeClass = (estado) => {
  switch (estado) {
    case 'vencido':
      return 'badge bg-danger';
    case 'parcial':
      return 'badge bg-warning text-dark';
    case 'pendiente':
      return 'badge bg-secondary';
    case 'pagado':
      return 'badge bg-success';
    default:
      return 'badge bg-secondary';
  }
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const fecha = new Date(value);
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateLong = (value) => {
  if (!value) return 'Sin fecha';
  const fecha = new Date(value);
  return fecha.toLocaleDateString('es-BO', { day: '2-digit', month: 'long', year: 'numeric' });
};

const tipoLabel = (tipo) => {
  switch (tipo) {
    case 'bloque':
      return 'Bloque';
    case 'nivel':
      return 'Nivel';
    case 'curso':
      return 'Curso';
    default:
      return 'Detalle';
  }
};

/** Estilos visuales para tarjetas KPI del dashboard de morosidad */
const KPI_CARD_THEMES = {
  monitoreadas: {
    icon: 'fa-clipboard-list',
    iconColor: '#1d4ed8',
    iconBg: 'rgba(29, 78, 216, 0.14)',
    cardBg: 'linear-gradient(155deg, #e8efff 0%, #ffffff 52%)',
    borderAccent: '#3b82f6'
  },
  pagado: {
    icon: 'fa-circle-check',
    iconColor: '#047857',
    iconBg: 'rgba(4, 120, 87, 0.14)',
    cardBg: 'linear-gradient(155deg, #e8f8f0 0%, #ffffff 52%)',
    borderAccent: '#10b981'
  },
  pendiente: {
    icon: 'fa-hourglass-half',
    iconColor: '#b45309',
    iconBg: 'rgba(180, 83, 9, 0.14)',
    cardBg: 'linear-gradient(155deg, #fff7e6 0%, #ffffff 52%)',
    borderAccent: '#f59e0b'
  },
  vencido: {
    icon: 'fa-triangle-exclamation',
    iconColor: '#b91c1c',
    iconBg: 'rgba(185, 28, 28, 0.12)',
    cardBg: 'linear-gradient(155deg, #fdecec 0%, #ffffff 52%)',
    borderAccent: '#ef4444'
  }
};

/** Cabeceras y acentos por tipo de ranking */
const RANKING_THEMES = {
  bloque: {
    gradient: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #818cf8 100%)',
    shadow: '0 6px 20px rgba(79, 70, 229, 0.22)',
    footerTint: '#f5f5ff',
    badgeClass: 'text-white',
    badgeStyle: { background: 'linear-gradient(135deg, #4f46e5, #6366f1)' }
  },
  nivel: {
    gradient: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 55%, #2dd4bf 100%)',
    shadow: '0 6px 20px rgba(13, 148, 136, 0.2)',
    footerTint: '#f0fdfa',
    badgeClass: 'text-white',
    badgeStyle: { background: 'linear-gradient(135deg, #0d9488, #14b8a6)' }
  },
  curso: {
    gradient: 'linear-gradient(135deg, #7c3aed 0%, #8b5cf6 55%, #a78bfa 100%)',
    shadow: '0 6px 20px rgba(124, 58, 237, 0.22)',
    footerTint: '#faf5ff',
    badgeClass: 'text-white',
    badgeStyle: { background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)' }
  }
};

// Componente para mostrar notificaciones programadas del agente inteligente
function NotificacionesAgentePanel() {
  const [notificaciones, setNotificaciones] = useState([]);
  const [agrupadas, setAgrupadas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [diasAnticipacionVista, setDiasAnticipacionVista] = useState(30);
  const [diasAnticipacionSistema, setDiasAnticipacionSistema] = useState(2);

  const cargarNotificaciones = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/notificaciones', user?.rol);
      
      const response = await fetch(`${apiUrl}/notificaciones-programadas?dias_anticipacion_vista=${diasAnticipacionVista}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar notificaciones programadas');
      }

      const data = await response.json();
      if (data.ok) {
        setNotificaciones(data.notificaciones || []);
        setAgrupadas(data.agrupadas_por_tutor || []);
        setDiasAnticipacionSistema(data.dias_anticipacion_sistema || 2);
      }
    } catch (error) {
      // Error silenciado
    } finally {
      setLoading(false);
    }
  }, [diasAnticipacionVista]);

  useEffect(() => {
    cargarNotificaciones();
    // Actualizar cada 30 segundos
    const interval = setInterval(cargarNotificaciones, 30000);
    return () => clearInterval(interval);
  }, [cargarNotificaciones]);

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-info text-white">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-robot me-2"></i>
            Notificaciones Automáticas del Agente Inteligente
          </h5>
          <div className="d-flex gap-2 align-items-center">
            <label className="text-white small me-2">Mostrar vencimientos próximos:</label>
            <select 
              className="form-select form-select-sm" 
              value={diasAnticipacionVista} 
              onChange={(e) => setDiasAnticipacionVista(parseInt(e.target.value))}
              style={{ width: 'auto' }}
            >
              <option value="15">15 días</option>
              <option value="30">30 días</option>
              <option value="60">60 días</option>
              <option value="90">90 días</option>
            </select>
            <button 
              className="btn btn-light btn-sm"
              onClick={cargarNotificaciones}
              disabled={loading}
            >
              <i className="fas fa-sync-alt"></i>
            </button>
          </div>
        </div>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center py-3">
            <div className="spinner-border text-info" role="status"></div>
            <p className="text-muted mt-2 mb-0">Cargando notificaciones programadas...</p>
          </div>
        ) : notificaciones.length === 0 ? (
          <div className="alert alert-info mb-0">
            <i className="fas fa-info-circle me-2"></i>
            No hay cuotas pendientes que vencen en los próximos {diasAnticipacionVista} días.
          </div>
        ) : (
          <>
            <div className="alert alert-success mb-3">
              <i className="fas fa-robot me-2"></i>
              <strong>El agente inteligente revisará automáticamente la base de datos</strong> y enviará {notificaciones.length} notificación(es) 
              a {agrupadas.length} tutor(es) cuando las cuotas estén por vencer (con {diasAnticipacionSistema} días de anticipación).
            </div>
            
            {/* Mensajes del agente */}
            <div className="mb-3">
              <h6 className="text-muted mb-2">
                <i className="fas fa-comments me-2"></i>
                Plan de Notificaciones del Agente
              </h6>
              <div className="list-group">
                {notificaciones
                  .filter(notif => notif.dias_hasta_notificacion >= 0)
                  .sort((a, b) => a.dias_hasta_notificacion - b.dias_hasta_notificacion)
                  .map((notif, idx) => {
                    const fechaVencimiento = new Date(notif.fecha_vencimiento);
                    const fechaVencimientoStr = fechaVencimiento.toLocaleDateString('es-BO', { 
                      day: '2-digit', 
                      month: 'long', 
                      year: 'numeric' 
                    });
                    
                    let mensajeAgente = '';
                    if (notif.dias_hasta_notificacion === 0) {
                      mensajeAgente = `Hoy voy a notificar a ${notif.tutor} que la mensualidad de ${notif.mes} de su hijo ${notif.estudiante} vence el ${fechaVencimientoStr}.`;
                    } else if (notif.dias_hasta_notificacion === 1) {
                      mensajeAgente = `Mañana voy a notificar a ${notif.tutor} que la mensualidad de ${notif.mes} de su hijo ${notif.estudiante} vence el ${fechaVencimientoStr}.`;
                    } else {
                      mensajeAgente = `En ${notif.dias_hasta_notificacion} días voy a notificar a ${notif.tutor} que la mensualidad de ${notif.mes} de su hijo ${notif.estudiante} vence el ${fechaVencimientoStr}.`;
                    }
                    
                    return (
                      <div key={`mensaje-${notif.id}-${idx}`} className="list-group-item">
                        <div className="d-flex align-items-start">
                          <i className="fas fa-robot text-info me-2 mt-1"></i>
                          <div className="flex-grow-1">
                            <p className="mb-1">{mensajeAgente}</p>
                            <small className="text-muted">
                              Monto: {formatCurrency(notif.monto_pendiente)} | 
                              Vencimiento: {formatDate(notif.fecha_vencimiento)} | 
                              {notif.nivel} - {notif.curso}
                            </small>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
            
            <div className="table-responsive">
              <table className="table table-sm table-hover">
                <thead className="table-light">
                  <tr>
                    <th>Tutor</th>
                    <th>Estudiante</th>
                    <th>Mes</th>
                    <th>Monto</th>
                    <th>Vencimiento</th>
                    <th>Notificación en</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {notificaciones.map((notif, idx) => (
                    <tr key={`${notif.id}-${idx}`}>
                      <td>
                        <strong>{notif.tutor}</strong>
                        {notif.telefono && (
                          <div className="small text-muted">{notif.telefono}</div>
                        )}
                      </td>
                      <td>
                        {notif.estudiante}
                        <div className="small text-muted">
                          {notif.nivel} - {notif.curso}
                        </div>
                      </td>
                      <td>{notif.mes}</td>
                      <td>
                        <strong>{formatCurrency(notif.monto_pendiente)}</strong>
                      </td>
                      <td>{formatDate(notif.fecha_vencimiento)}</td>
                      <td>
                        {notif.dias_hasta_notificacion < 0 ? (
                          <span className="badge bg-secondary">Ya pasó</span>
                        ) : notif.dias_hasta_notificacion === 0 ? (
                          <span className="badge bg-warning text-dark">Hoy</span>
                        ) : notif.dias_hasta_notificacion === 1 ? (
                          <span className="badge bg-info">Mañana</span>
                        ) : (
                          <span className="badge bg-primary">
                            En {notif.dias_hasta_notificacion} días
                          </span>
                        )}
                        <div className="small text-muted mt-1">
                          {formatDate(notif.fecha_notificacion)}
                        </div>
                      </td>
                      <td>
                        <span className={estadoBadgeClass(notif.estado)}>
                          {notif.estado}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {agrupadas.length > 0 && (
              <div className="mt-3">
                <h6 className="text-muted mb-2">
                  <i className="fas fa-users me-2"></i>
                  Resumen por Tutor
                </h6>
                <div className="row g-2">
                  {agrupadas.map((grupo, idx) => (
                    <div key={idx} className="col-md-6 col-lg-4">
                      <div className="card border-info">
                        <div className="card-body p-2">
                          <div className="d-flex justify-content-between align-items-start">
                            <div>
                              <strong className="small">{grupo.tutor}</strong>
                              {grupo.telefono && (
                                <div className="small text-muted">{grupo.telefono}</div>
                              )}
                            </div>
                            <span className="badge bg-info">
                              {grupo.total_notificaciones}
                            </span>
                          </div>
                          <div className="small text-muted mt-1">
                            {grupo.estudiantes.map(e => e.estudiante).join(', ')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PagosMorosidadPanel({
  title = 'Dashboard de Pagos',
  showHint = true,
  variant = 'default'
}) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  // Estado para el filtro de mes (por defecto 'todos' para mostrar todos los meses)
  const [mesFiltro, setMesFiltro] = useState('todos');
  const [anioFiltro, setAnioFiltro] = useState(currentYear);

  const [resumen, setResumen] = useState(null);
  const [ranking, setRanking] = useState({ bloques: [], niveles: [], cursos: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copyFeedback, setCopyFeedback] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalDeudores, setModalDeudores] = useState([]);
  const [modalType, setModalType] = useState(''); // 'todos', 'pagado', 'pendiente', 'vencido'
  const [modalFilters, setModalFilters] = useState({
    anio: currentYear,
    mes: 'todos',
    estado: 'todos',
    bloque_id: '',
    nivel_id: '',
    curso_id: ''
  });
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);

  const yearsOptions = Array.from({ length: 5 }, (_, index) => currentYear - 2 + index);
  const isAdminVariant = variant === 'admin';
  const isCajeroVariant = variant === 'cajero';

  useEffect(() => {
    const cargarCatalogos = async () => {
      try {
        const token = localStorage.getItem('token');
        const headers = token
          ? {
              Authorization: `Bearer ${token}`
            }
          : {};

        const [nivelesRes, cursosRes, bloquesRes] = await Promise.all([
          fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/niveles`, { headers }),
          fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/cursos`, { headers }),
          fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/bloques`)
        ]);

        const [nivelesData, cursosData, bloquesData] = await Promise.all([
          nivelesRes.json(),
          cursosRes.json(),
          bloquesRes.json()
        ]);

        setNiveles(Array.isArray(nivelesData) ? nivelesData : []);
        setCursos(Array.isArray(cursosData) ? cursosData : []);
        setBloques(Array.isArray(bloquesData) ? bloquesData : []);
      } catch (catalogError) {
        console.error('Error al cargar catálogos:', catalogError);
      }
    };

    cargarCatalogos();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const token = localStorage.getItem('token');
      
      // Obtener datos de deudores
      const paramsDeudores = new URLSearchParams();
      paramsDeudores.append('anio', anioFiltro);
      // Si mesFiltro es 'todos', no agregar el parámetro mes (o agregarlo como 'todos')
      if (mesFiltro !== 'todos') {
        paramsDeudores.append('mes', mesFiltro);
      } else {
        paramsDeudores.append('mes', 'todos');
      }

      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/dashboard/pagos', user?.rol);
      const urlDeudores = `${apiUrl}/dashboard/pagos/deudores?${paramsDeudores.toString()}`;
      
      const responseDeudores = await fetch(urlDeudores, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const dataDeudores = await responseDeudores.json();

      if (!responseDeudores.ok || !dataDeudores.ok) {
        console.error('[PagosMorosidadPanel] Error en respuesta:', dataDeudores);
        throw new Error(dataDeudores.message || 'No se pudo cargar la información del dashboard');
      }

      // Obtener datos de pagados para calcular el total correcto
      const paramsPagados = new URLSearchParams();
      paramsPagados.append('anio', anioFiltro);
      if (mesFiltro !== 'todos') {
        paramsPagados.append('mes', mesFiltro);
      } else {
        paramsPagados.append('mes', 'todos');
      }
      paramsPagados.append('incluir_pagados', 'true');

      const responsePagados = await fetch(
        `${apiUrl}/dashboard/pagos/deudores?${paramsPagados.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const dataPagados = await responsePagados.json();

      // Combinar resúmenes: usar deudores para cuotas/pendientes y pagados para total_pagado
      const resumenCombinado = {
        ...dataDeudores.resumen,
        total_pagado: dataPagados.ok ? dataPagados.resumen.total_pagado : dataDeudores.resumen.total_pagado,
        total_esperado: dataPagados.ok ? dataPagados.resumen.total_esperado : dataDeudores.resumen.total_esperado,
        porcentaje_pagado: dataPagados.ok 
          ? dataPagados.resumen.porcentaje_pagado 
          : dataDeudores.resumen.porcentaje_pagado
      };

      setResumen(resumenCombinado);
      setRanking(dataDeudores.ranking || { bloques: [], niveles: [], cursos: [] });
    } catch (dashError) {
      console.error('Error al obtener datos del dashboard:', dashError);
      setError(dashError.message || 'Error al obtener datos');
    } finally {
      setLoading(false);
    }
  }, [anioFiltro, mesFiltro]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const nivelesDisponiblesModal = useMemo(() => {
    if (!modalFilters.bloque_id) return niveles;
    return niveles.filter((nivel) => String(nivel.bloque_id) === String(modalFilters.bloque_id));
  }, [niveles, modalFilters.bloque_id]);

  const cursosDisponiblesModal = useMemo(() => {
    if (modalFilters.nivel_id) {
      return cursos.filter((curso) => String(curso.nivel_id) === String(modalFilters.nivel_id));
    }
    if (modalFilters.bloque_id) {
      const idsNivel = new Set(nivelesDisponiblesModal.map((nivel) => String(nivel.id)));
      return cursos.filter((curso) => idsNivel.has(String(curso.nivel_id)));
    }
    return cursos;
  }, [cursos, modalFilters.nivel_id, modalFilters.bloque_id, nivelesDisponiblesModal]);

  const handleModalFilterChange = (name, value) => {
    setModalFilters((prev) => {
      const newFilters = { ...prev, [name]: value };
      // Si cambia bloque, limpiar nivel y curso
      if (name === 'bloque_id') {
        newFilters.nivel_id = '';
        newFilters.curso_id = '';
      }
      // Si cambia nivel, limpiar curso
      if (name === 'nivel_id') {
        newFilters.curso_id = '';
      }
      return newFilters;
    });
  };

  const limpiarFiltrosModal = () => {
    setModalFilters({
      anio: currentYear,
      mes: 'todos',
      estado: 'todos',
      bloque_id: '',
      nivel_id: '',
      curso_id: ''
    });
  };

  const fetchModalData = useCallback(async () => {
    if (!modalVisible) return;
    
    try {
      setLoadingModal(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('anio', modalFilters.anio);
      // Enviar 'todos' explícitamente cuando sea 'todos', o el número del mes
      if (modalFilters.mes) {
        if (modalFilters.mes === 'todos') {
          params.append('mes', 'todos');
        } else {
          params.append('mes', modalFilters.mes);
        }
      }
      if (modalFilters.estado && modalFilters.estado !== 'todos') params.append('estado', modalFilters.estado);
      if (modalFilters.bloque_id) params.append('bloque_id', modalFilters.bloque_id);
      if (modalFilters.nivel_id) params.append('nivel_id', modalFilters.nivel_id);
      if (modalFilters.curso_id) params.append('curso_id', modalFilters.curso_id);

      // Incluir pagados si el modal es de tipo 'pagado' o 'todos'
      if (modalType === 'pagado' || modalType === 'todos') {
        params.append('incluir_pagados', 'true');
      }

      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/dashboard/pagos', user?.rol);
      const response = await fetch(
        `${apiUrl}/dashboard/pagos/deudores?${params.toString()}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.message || 'No se pudo cargar la información');
      }

      let estudiantes = Array.isArray(data.deudores) ? data.deudores : [];

      // Filtrar según el tipo de modal
      if (modalType === 'pagado') {
        estudiantes = estudiantes.filter((item) => item.estado === 'pagado' || item.saldo_pendiente <= 0.05);
      } else if (modalType === 'pendiente') {
        estudiantes = estudiantes.filter((item) => item.estado === 'pendiente' || item.estado === 'parcial');
      } else if (modalType === 'vencido') {
        estudiantes = estudiantes.filter((item) => item.estado === 'vencido');
      }
      // Si es 'todos', mostrar todos los estudiantes

      setModalDeudores(estudiantes);
    } catch (error) {
      console.error('Error al cargar datos del modal:', error);
      setError(error.message || 'Error al cargar datos');
    } finally {
      setLoadingModal(false);
    }
  }, [modalFilters, modalType, modalVisible]);

  useEffect(() => {
    if (modalVisible) {
      fetchModalData();
    }
  }, [modalVisible, modalFilters, modalType, fetchModalData]);

  const handleCopyMessage = async (mensaje) => {
    try {
      await navigator.clipboard.writeText(mensaje);
      setCopyFeedback('Mensaje copiado al portapapeles');
      setTimeout(() => setCopyFeedback(''), 2500);
    } catch (clipboardError) {
      console.error('No se pudo copiar el mensaje:', clipboardError);
      alert('No se pudo copiar el mensaje automáticamente. Intenta copiarlo manualmente.');
    }
  };

  const exportarExcel = async () => {
    if (!modalDeudores.length) {
      alert('No hay datos para exportar.');
      return;
    }

    try {
      const xlsx = await import('xlsx');
      const rows = modalDeudores.map((item) => ({
        Estudiante: item.estudiante,
        Nivel: item.nivel_nombre,
        Curso: item.curso_nombre,
        Bloque: item.bloque_nombre,
        Mes: item.mes_nombre,
        Estado: item.estado,
        'Monto esperado': item.monto_esperado,
        'Monto pagado': item.monto_pagado,
        'Saldo pendiente': item.saldo_pendiente,
        'Tutor / contacto': item.tutor || '',
        'Teléfono domicilio': item.telefono_referencia || '',
        'Fecha vencimiento': item.fecha_vencimiento ? formatDate(item.fecha_vencimiento) : '',
        'Días en mora': item.dias_atraso || 0
      }));

      const worksheet = xlsx.utils.json_to_sheet(rows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Morosidad');
      const nombreArchivo = `Reporte_${modalTitle.replace(/\s+/g, '_')}_${modalFilters.anio}_${modalFilters.mes || 'todos'}.xlsx`;
      xlsx.writeFile(workbook, nombreArchivo);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('No se pudo generar el archivo. Revisa la consola para más detalles.');
    }
  };

  const exportarPDF = async () => {
    if (!modalDeudores.length) {
      alert('No hay datos para exportar.');
      return;
    }

    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable')
      ]);

      const mesLabel =
        modalFilters.mes === 'todos'
          ? 'Todos'
          : MESES.find((m) => m.numero === parseInt(modalFilters.mes, 10))?.nombre || String(modalFilters.mes || 'Todos');

      const estadoLabel = modalFilters.estado && modalFilters.estado !== 'todos' ? modalFilters.estado : 'Todos';

      // Agrupar por estudiante para visualizar claramente quién debe y quién está al día
      const porEstudiante = new Map();
      modalDeudores.forEach((item) => {
        const key = item.estudiante || 'Sin nombre';
        const deuda = Number(item.saldo_pendiente || 0);

        if (!porEstudiante.has(key)) {
          porEstudiante.set(key, {
            estudiante: key,
            tutor: item.tutor || '',
            telefono: item.telefono_referencia || '',
            nivel: item.nivel_nombre || '',
            curso: item.curso_nombre || '',
            bloque: item.bloque_nombre || '',
            deuda_total: 0,
            meses_deuda: new Set()
          });
        }

        const agg = porEstudiante.get(key);
        agg.deuda_total += deuda;
        if (deuda > 0.05) {
          agg.meses_deuda.add(item.mes_nombre || '');
        }
      });

      const estudiantesAgg = Array.from(porEstudiante.values()).map((s) => ({
        ...s,
        meses_deuda_txt: Array.from(s.meses_deuda).filter(Boolean).join(', '),
        estado: s.deuda_total > 0.05 ? 'DEBE' : 'AL DÍA'
      }));

      estudiantesAgg.sort((a, b) => {
        if (b.deuda_total !== a.deuda_total) return b.deuda_total - a.deuda_total;
        return a.estudiante.localeCompare(b.estudiante);
      });

      const totalEstudiantes = estudiantesAgg.length;
      const estudiantesConDeuda = estudiantesAgg.filter((s) => s.deuda_total > 0.05).length;
      const estudiantesAlDia = totalEstudiantes - estudiantesConDeuda;
      const montoTotalPendiente = estudiantesAgg.reduce((acc, s) => acc + (Number(s.deuda_total) || 0), 0);

      const nombreArchivo = `Reporte_${modalTitle.replace(/\s+/g, '_')}_${modalFilters.anio}_${mesLabel}.pdf`;

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const generarPDFSinLogo = () => {
        // Header
        doc.setFillColor(13, 110, 253); // bootstrap primary
        doc.rect(0, 0, 210, 22, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('Reporte de Pagos por Curso', 12, 14);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(11);
        doc.text(`${modalTitle}`, 12, 30);

        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        doc.text(`Año: ${modalFilters.anio}   Mes: ${mesLabel}   Estado: ${estadoLabel}`, 12, 36);
        doc.text(`Generado: ${formatDateLong(new Date())}`, 12, 41);

        // Resumen (tarjetas)
        const y0 = 48;
        const cardW = 62;
        const cardH = 16;
        const gap = 6;

        const drawCard = (x, y, title, value, color) => {
          doc.setDrawColor(230, 230, 230);
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(x, y, cardW, cardH, 3, 3, 'FD');
          doc.setTextColor(100, 100, 100);
          doc.setFontSize(8);
          doc.text(title, x + 4, y + 6);
          doc.setTextColor(...color);
          doc.setFontSize(12);
          doc.text(value, x + 4, y + 13);
          doc.setTextColor(0, 0, 0);
        };

        drawCard(12, y0, 'Estudiantes', String(totalEstudiantes), [13, 110, 253]);
        drawCard(12 + cardW + gap, y0, 'AL DÍA', String(estudiantesAlDia), [25, 135, 84]);
        drawCard(12 + (cardW + gap) * 2, y0, 'DEBEN', String(estudiantesConDeuda), [220, 53, 69]);

        doc.setTextColor(70, 70, 70);
        doc.setFontSize(9);
        doc.text(`Monto total pendiente: ${formatCurrency(montoTotalPendiente)}`, 12, y0 + cardH + 8);

        // Tabla principal (por estudiante)
        const body = estudiantesAgg.map((s, idx) => ([
          String(idx + 1),
          s.estudiante,
          s.tutor,
          s.telefono || '—',
          s.estado,
          formatCurrency(s.deuda_total),
          s.meses_deuda_txt || '—'
        ]));

        autoTable(doc, {
          startY: y0 + cardH + 12,
          head: [[
            '#',
            'Estudiante',
            'Tutor',
            'Teléfono',
            'Estado',
            'Deuda total',
            'Meses con deuda'
          ]],
          body,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
          headStyles: { fillColor: [33, 37, 41], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20 },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 45 }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              const estado = data.cell.raw;
              if (estado === 'DEBE') {
                data.cell.styles.fillColor = [220, 53, 69];
                data.cell.styles.textColor = 255;
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.fillColor = [25, 135, 84];
                data.cell.styles.textColor = 255;
                data.cell.styles.fontStyle = 'bold';
              }
            }
            if (data.section === 'body' && data.column.index === 5) {
              // Deuda total en rojo si debe
              const estado = data.row.raw?.[4];
              if (estado === 'DEBE') {
                data.cell.styles.textColor = [220, 53, 69];
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [25, 135, 84];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
          margin: { left: 12, right: 12 }
        });

        // Página 2: detalle (para respaldo visual)
        doc.addPage('a4', 'landscape');
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Detalle de cuotas · ${modalTitle} · Año ${modalFilters.anio} · Mes ${mesLabel}`, 12, 12);

        const detalleBody = [...modalDeudores]
          .sort((a, b) => (a.estudiante || '').localeCompare(b.estudiante || ''))
          .map((item) => ([
            item.estudiante || '',
            item.mes_nombre || '',
            item.estado || '',
            formatCurrency(item.monto_esperado),
            formatCurrency(item.monto_pagado),
            formatCurrency(item.saldo_pendiente),
            item.fecha_vencimiento ? formatDate(item.fecha_vencimiento) : 'Sin fecha',
            item.tutor || '',
            item.telefono_referencia || '—'
          ]));

        autoTable(doc, {
          startY: 18,
          head: [[
            'Estudiante',
            'Mes',
            'Estado',
            'Esperado',
            'Pagado',
            'Saldo',
            'Vencimiento',
            'Tutor',
            'Teléfono'
          ]],
          body: detalleBody,
          theme: 'striped',
          styles: { fontSize: 7, cellPadding: 1.6, valign: 'middle' },
          headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 18 },
            2: { cellWidth: 16, halign: 'center' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 20, halign: 'right' },
            5: { cellWidth: 18, halign: 'right' },
            6: { cellWidth: 24 },
            7: { cellWidth: 40 },
            8: { cellWidth: 22 }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const estado = String(data.cell.raw || '').toLowerCase();
              if (estado === 'pagado') {
                data.cell.styles.fillColor = [25, 135, 84];
                data.cell.styles.textColor = 255;
              } else if (estado === 'vencido') {
                data.cell.styles.fillColor = [220, 53, 69];
                data.cell.styles.textColor = 255;
              } else if (estado === 'parcial') {
                data.cell.styles.fillColor = [255, 193, 7];
                data.cell.styles.textColor = 0;
              }
            }
          },
          margin: { left: 10, right: 10 }
        });

        doc.save(nombreArchivo);
      };

      // Con logo (si carga)
      const img = new window.Image();
      img.src = logo;
      img.onload = () => {
        // Header con logo
        doc.setFillColor(13, 110, 253);
        doc.rect(0, 0, 210, 22, 'F');
        try {
          doc.addImage(img, 'JPEG', 12, 4, 18, 14);
        } catch {
          // Si falla addImage, seguir sin logo
        }
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(14);
        doc.text('Reporte de Pagos por Curso', 34, 14);
        doc.setTextColor(0, 0, 0);

        // Reutilizar el generador (ya dibuja el header sin logo, así que solo dibujamos desde debajo)
        // Solución simple: crear un doc nuevo para evitar duplicar header
        const doc2 = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        // Dibujar header con logo en doc2
        doc2.setFillColor(13, 110, 253);
        doc2.rect(0, 0, 210, 22, 'F');
        try {
          doc2.addImage(img, 'JPEG', 12, 4, 18, 14);
        } catch {
          // ignore
        }
        doc2.setTextColor(255, 255, 255);
        doc2.setFontSize(14);
        doc2.text('Reporte de Pagos por Curso', 34, 14);
        doc2.setTextColor(0, 0, 0);

        // Ahora generamos el resto en doc2, sin volver a dibujar el header completo
        // (copiamos la lógica del generador con ajustes de Y)
        doc2.setFontSize(11);
        doc2.text(`${modalTitle}`, 12, 30);
        doc2.setFontSize(9);
        doc2.setTextColor(70, 70, 70);
        doc2.text(`Año: ${modalFilters.anio}   Mes: ${mesLabel}   Estado: ${estadoLabel}`, 12, 36);
        doc2.text(`Generado: ${formatDateLong(new Date())}`, 12, 41);

        const y0 = 48;
        const cardW = 62;
        const cardH = 16;
        const gap = 6;

        const drawCard = (x, y, title, value, color) => {
          doc2.setDrawColor(230, 230, 230);
          doc2.setFillColor(255, 255, 255);
          doc2.roundedRect(x, y, cardW, cardH, 3, 3, 'FD');
          doc2.setTextColor(100, 100, 100);
          doc2.setFontSize(8);
          doc2.text(title, x + 4, y + 6);
          doc2.setTextColor(...color);
          doc2.setFontSize(12);
          doc2.text(value, x + 4, y + 13);
          doc2.setTextColor(0, 0, 0);
        };

        drawCard(12, y0, 'Estudiantes', String(totalEstudiantes), [13, 110, 253]);
        drawCard(12 + cardW + gap, y0, 'AL DÍA', String(estudiantesAlDia), [25, 135, 84]);
        drawCard(12 + (cardW + gap) * 2, y0, 'DEBEN', String(estudiantesConDeuda), [220, 53, 69]);

        doc2.setTextColor(70, 70, 70);
        doc2.setFontSize(9);
        doc2.text(`Monto total pendiente: ${formatCurrency(montoTotalPendiente)}`, 12, y0 + cardH + 8);

        const body = estudiantesAgg.map((s, idx) => ([
          String(idx + 1),
          s.estudiante,
          s.tutor,
          s.telefono || '—',
          s.estado,
          formatCurrency(s.deuda_total),
          s.meses_deuda_txt || '—'
        ]));

        autoTable(doc2, {
          startY: y0 + cardH + 12,
          head: [[
            '#',
            'Estudiante',
            'Tutor',
            'Teléfono',
            'Estado',
            'Deuda total',
            'Meses con deuda'
          ]],
          body,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
          headStyles: { fillColor: [33, 37, 41], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 7, halign: 'center' },
            1: { cellWidth: 45 },
            2: { cellWidth: 35 },
            3: { cellWidth: 20 },
            4: { cellWidth: 18, halign: 'center' },
            5: { cellWidth: 22, halign: 'right' },
            6: { cellWidth: 45 }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 4) {
              const estado = data.cell.raw;
              if (estado === 'DEBE') {
                data.cell.styles.fillColor = [220, 53, 69];
                data.cell.styles.textColor = 255;
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.fillColor = [25, 135, 84];
                data.cell.styles.textColor = 255;
                data.cell.styles.fontStyle = 'bold';
              }
            }
            if (data.section === 'body' && data.column.index === 5) {
              const estado = data.row.raw?.[4];
              if (estado === 'DEBE') {
                data.cell.styles.textColor = [220, 53, 69];
                data.cell.styles.fontStyle = 'bold';
              } else {
                data.cell.styles.textColor = [25, 135, 84];
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
          margin: { left: 12, right: 12 }
        });

        doc2.addPage('a4', 'landscape');
        doc2.setFontSize(12);
        doc2.setTextColor(0, 0, 0);
        doc2.text(`Detalle de cuotas · ${modalTitle} · Año ${modalFilters.anio} · Mes ${mesLabel}`, 12, 12);

        const detalleBody = [...modalDeudores]
          .sort((a, b) => (a.estudiante || '').localeCompare(b.estudiante || ''))
          .map((item) => ([
            item.estudiante || '',
            item.mes_nombre || '',
            item.estado || '',
            formatCurrency(item.monto_esperado),
            formatCurrency(item.monto_pagado),
            formatCurrency(item.saldo_pendiente),
            item.fecha_vencimiento ? formatDate(item.fecha_vencimiento) : 'Sin fecha',
            item.tutor || '',
            item.telefono_referencia || '—'
          ]));

        autoTable(doc2, {
          startY: 18,
          head: [[
            'Estudiante',
            'Mes',
            'Estado',
            'Esperado',
            'Pagado',
            'Saldo',
            'Vencimiento',
            'Tutor',
            'Teléfono'
          ]],
          body: detalleBody,
          theme: 'striped',
          styles: { fontSize: 7, cellPadding: 1.6, valign: 'middle' },
          headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 45 },
            1: { cellWidth: 18 },
            2: { cellWidth: 16, halign: 'center' },
            3: { cellWidth: 22, halign: 'right' },
            4: { cellWidth: 20, halign: 'right' },
            5: { cellWidth: 18, halign: 'right' },
            6: { cellWidth: 24 },
            7: { cellWidth: 40 },
            8: { cellWidth: 22 }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 2) {
              const estado = String(data.cell.raw || '').toLowerCase();
              if (estado === 'pagado') {
                data.cell.styles.fillColor = [25, 135, 84];
                data.cell.styles.textColor = 255;
              } else if (estado === 'vencido') {
                data.cell.styles.fillColor = [220, 53, 69];
                data.cell.styles.textColor = 255;
              } else if (estado === 'parcial') {
                data.cell.styles.fillColor = [255, 193, 7];
                data.cell.styles.textColor = 0;
              }
            }
          },
          margin: { left: 10, right: 10 }
        });

        doc2.save(nombreArchivo);
      };
      img.onerror = () => generarPDFSinLogo();
    } catch (error) {
      console.error('Error al exportar PDF:', error);
      alert('No se pudo generar el PDF. Revisa la consola para más detalles.');
    }
  };

  const normalizarTelefono = (telefono) => {
    if (!telefono) return '';
    const soloNumeros = telefono.replace(/\D/g, '');
    if (!soloNumeros) return '';
    if (soloNumeros.startsWith('591')) return soloNumeros;
    return `591${soloNumeros}`;
  };

  const handleSendWhatsApp = (telefono, mensaje) => {
    const telefonoNormalizado = normalizarTelefono(telefono);
    if (!telefonoNormalizado) {
      alert('No hay un número de contacto válido para este estudiante.');
      return;
    }
    const url = `https://wa.me/${telefonoNormalizado}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };

  const abrirModalCard = (tipo) => {
    setModalType(tipo);
    let titulo = '';
    if (tipo === 'todos') {
      titulo = 'Cuotas Monitoreadas';
    } else if (tipo === 'pagado') {
      titulo = 'Estudiantes que han Pagado';
    } else if (tipo === 'pendiente') {
      titulo = 'Estudiantes con Pagos Pendientes';
    } else if (tipo === 'vencido') {
      titulo = 'Estudiantes con Pagos Vencidos';
    }
    setModalTitle(titulo);
    setModalFilters({
      anio: currentYear,
      mes: 'todos',
      estado: tipo === 'todos' ? 'todos' : tipo,
      bloque_id: '',
      nivel_id: '',
      curso_id: ''
    });
    setModalVisible(true);
  };

  const abrirModalDetalle = (tipo, item) => {
    if (!item) return;
    setModalType('todos');
    setModalTitle(`${tipoLabel(tipo)}: ${item.nombre}`);
    setModalFilters({
      anio: currentYear,
      mes: 'todos',
      estado: 'todos',
      bloque_id: tipo === 'bloque' ? String(item.id) : '',
      nivel_id: tipo === 'nivel' ? String(item.id) : '',
      curso_id: tipo === 'curso' ? String(item.id) : ''
    });
    setModalVisible(true);
  };

  const cerrarModalDetalle = () => {
    setModalVisible(false);
    setModalDeudores([]);
    setModalType('');
  };

  useEffect(() => {
    if (modalVisible) {
      fetchModalData();
    }
  }, [modalVisible, modalFilters, modalType, fetchModalData]);

  const renderRanking = (titulo, datos, icono, tipo) => {
    const isCajero = variant === 'cajero';
    const rankTheme = RANKING_THEMES[tipo] || RANKING_THEMES.bloque;
    const listPad = 'py-2 px-3';
    return (
    <div className="col-lg-4 col-md-6">
      <div
        className="card h-100 border-0 shadow-sm overflow-hidden"
        style={{ borderRadius: 12 }}
      >
        <div
          className={
            isCajero
              ? 'card-header bg-success text-white py-2 px-3 border-0'
              : 'card-header text-white border-0 py-3 px-3'
          }
          style={
            isCajero
              ? undefined
              : { background: rankTheme.gradient, boxShadow: rankTheme.shadow }
          }
        >
          <h6 className="mb-0 fw-semibold d-flex align-items-center gap-2">
            <span
              className="d-inline-flex align-items-center justify-content-center rounded-3 flex-shrink-0"
              style={{
                width: 38,
                height: 38,
                background: isCajero ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.22)'
              }}
            >
              <i className={`fas ${icono}`}></i>
            </span>
            <span className="text-white">{titulo}</span>
          </h6>
        </div>
        <ul className="list-group list-group-flush" style={{ background: isCajero ? '#fff' : rankTheme.footerTint }}>
          {datos.length === 0 ? (
            <li className={`list-group-item text-muted border-0 ${listPad} small`}>Sin datos para mostrar</li>
          ) : (
            datos.map((item, index) => (
              <button
                key={`${item.nombre}-${index}`}
                type="button"
                className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center gap-2 text-start border-0 rounded-0 ${listPad}`}
                style={{ minHeight: 52, background: 'transparent' }}
                onClick={() => abrirModalDetalle(tipo, item)}
              >
                <div className="flex-grow-1 min-w-0">
                  <div className={`fw-semibold small text-dark text-truncate`}>{item.nombre}</div>
                  <div className="small text-muted">{item.deudores} deudor(es)</div>
                </div>
                <div className="d-flex align-items-center gap-2 flex-shrink-0">
                  <span
                    className={`badge px-2 py-2 ${isCajero ? 'bg-secondary' : rankTheme.badgeClass}`}
                    style={isCajero ? undefined : rankTheme.badgeStyle}
                  >
                    {formatCurrency(item.montoPendiente)}
                  </span>
                  <i className="fas fa-chevron-right text-muted small opacity-75"></i>
                </div>
              </button>
            ))
          )}
        </ul>
      </div>
    </div>
    );
  };

  const containerClass = isAdminVariant ? 'card shadow-sm mb-0' : 'container-fluid py-4';
  const headerBgClass = isCajeroVariant ? 'bg-success text-white' : '';
  const btnClass = isCajeroVariant ? 'btn-success' : 'btn-primary';
  const iconClass = isCajeroVariant ? 'text-white' : 'text-success';

  return (
    <>
      <div 
        className={containerClass} 
        style={
          isAdminVariant
            ? {
                marginTop: 0,
                marginBottom: 0,
                borderRadius: 0,
                background: 'linear-gradient(180deg, #eef2f7 0%, #f8fafc 48%, #ffffff 100%)',
                border: '1px solid rgba(15, 23, 42, 0.06)'
              }
            : isCajeroVariant
            ? { background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)', minHeight: '100vh', padding: '2rem' }
            : {}
        }
      >
        <div
          className={isAdminVariant ? 'card-body' : ''}
          style={isAdminVariant ? { padding: '0.75rem 1rem' } : {}}
        >
        <div
          className={`d-flex flex-wrap justify-content-between align-items-stretch ${isAdminVariant ? 'mb-3 gap-2' : 'align-items-center mb-4 gap-3'} ${isCajeroVariant ? 'p-3 rounded' : ''}`}
          style={isCajeroVariant ? { background: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px' } : {}}
        >
          <div className="flex-grow-1 me-2" style={isAdminVariant ? { minWidth: '200px' } : undefined}>
            <h2 className={`mb-0 ${isCajeroVariant ? 'text-success' : ''} ${isAdminVariant ? 'h5 fw-bold' : ''}`}>
              <i className={`fas fa-cash-register me-2 ${isCajeroVariant ? 'text-success' : iconClass}`}></i>
              {title}
            </h2>
            <small className={isCajeroVariant ? 'text-muted' : 'text-muted'}>
              Seguimiento automático de cuotas · Año {anioFiltro} · Mes {mesFiltro === 'todos' ? 'Todos' : (MESES.find((m) => m.numero === parseInt(mesFiltro))?.nombre || '')}
            </small>
          </div>
          <div
            className={`d-flex flex-wrap align-items-stretch ${isAdminVariant ? 'gap-2' : 'gap-2 align-items-center'}`}
            style={isAdminVariant ? { flex: '1 1 280px', justifyContent: 'flex-end' } : undefined}
          >
            <select
              className={`form-select ${isAdminVariant ? '' : 'form-select-sm'}`}
              value={anioFiltro}
              onChange={(e) => setAnioFiltro(parseInt(e.target.value))}
              style={
                isAdminVariant
                  ? { width: 'auto', minWidth: 108, minHeight: 44, paddingTop: '0.5rem', paddingBottom: '0.5rem' }
                  : { width: 'auto' }
              }
              aria-label="Año"
            >
              {yearsOptions.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            <select
              className={`form-select ${isAdminVariant ? '' : 'form-select-sm'}`}
              value={mesFiltro}
              onChange={(e) => setMesFiltro(e.target.value)}
              style={
                isAdminVariant
                  ? { width: 'auto', minWidth: 168, minHeight: 44, paddingTop: '0.5rem', paddingBottom: '0.5rem' }
                  : { width: 'auto' }
              }
              aria-label="Mes"
            >
              <option value="todos">Todos los meses</option>
              {MESES.map(mes => (
                <option key={mes.numero} value={mes.numero}>{mes.nombre}</option>
              ))}
            </select>
            <button
              type="button"
              className={`btn ${btnClass} d-inline-flex align-items-center justify-content-center`}
              style={isAdminVariant ? { minHeight: 44, minWidth: 132, paddingLeft: '1rem', paddingRight: '1rem' } : undefined}
              onClick={fetchDashboardData}
            >
              <i className="fas fa-sync-alt me-2"></i>
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        {copyFeedback && (
          <div className="alert alert-success" role="alert">
            <i className="fas fa-check-circle me-2"></i>
            {copyFeedback}
          </div>
        )}


        <div className={`row ${isAdminVariant ? 'g-2 mb-3' : 'g-3 mb-4'}`}>
          <div className="col-lg-3 col-md-6">
            <div
              className="card shadow-sm border-0 h-100"
              style={{
                cursor: 'pointer',
                background: KPI_CARD_THEMES.monitoreadas.cardBg,
                borderLeft: `4px solid ${KPI_CARD_THEMES.monitoreadas.borderAccent}`,
                borderRadius: 12,
                ...(isAdminVariant ? { transition: 'box-shadow 0.15s ease' } : {})
              }}
              onMouseEnter={(e) => isAdminVariant && (e.currentTarget.style.boxShadow = '0 0.35rem 0.85rem rgba(37, 99, 235, 0.18)')}
              onMouseLeave={(e) => isAdminVariant && (e.currentTarget.style.boxShadow = '')}
              onClick={() => abrirModalCard('todos')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  abrirModalCard('todos');
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="card-body d-flex gap-3 align-items-start" style={{ padding: isAdminVariant ? '0.75rem 0.95rem' : '1rem' }}>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 46,
                    height: 46,
                    background: KPI_CARD_THEMES.monitoreadas.iconBg,
                    color: KPI_CARD_THEMES.monitoreadas.iconColor
                  }}
                  aria-hidden
                >
                  <i className={`fas ${KPI_CARD_THEMES.monitoreadas.icon} fa-lg`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <p className={`text-muted mb-1 ${isAdminVariant ? 'small mb-0 text-uppercase fw-semibold' : ''}`} style={isAdminVariant ? { fontSize: '0.7rem', letterSpacing: '0.02em' } : undefined}>
                    Cuotas monitoreadas
                  </p>
                  <h4 className={`mb-0 text-dark ${isAdminVariant ? 'h5 mt-1' : ''}`}>{resumen?.total_cuotas || 0}</h4>
                  <small className={`text-muted ${isAdminVariant ? 'small' : ''}`}>Estudiantes con deuda: {resumen?.estudiantes_con_deuda || 0}</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div
              className="card shadow-sm border-0 h-100"
              style={{
                cursor: 'pointer',
                background: KPI_CARD_THEMES.pagado.cardBg,
                borderLeft: `4px solid ${KPI_CARD_THEMES.pagado.borderAccent}`,
                borderRadius: 12,
                ...(isAdminVariant ? { transition: 'box-shadow 0.15s ease' } : {})
              }}
              onMouseEnter={(e) => isAdminVariant && (e.currentTarget.style.boxShadow = '0 0.35rem 0.85rem rgba(4, 120, 87, 0.2)')}
              onMouseLeave={(e) => isAdminVariant && (e.currentTarget.style.boxShadow = '')}
              onClick={() => abrirModalCard('pagado')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  abrirModalCard('pagado');
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="card-body d-flex gap-3 align-items-start" style={{ padding: isAdminVariant ? '0.75rem 0.95rem' : '1rem' }}>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 46,
                    height: 46,
                    background: KPI_CARD_THEMES.pagado.iconBg,
                    color: KPI_CARD_THEMES.pagado.iconColor
                  }}
                  aria-hidden
                >
                  <i className={`fas ${KPI_CARD_THEMES.pagado.icon} fa-lg`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <p className={`text-muted mb-1 ${isAdminVariant ? 'small mb-0 text-uppercase fw-semibold' : ''}`} style={isAdminVariant ? { fontSize: '0.7rem', letterSpacing: '0.02em' } : undefined}>
                    Pagado
                  </p>
                  <h4 className={`mb-0 text-dark ${isAdminVariant ? 'h5 mt-1' : ''}`}>{formatCurrency(resumen?.total_pagado)}</h4>
                  <div className="progress mt-1" style={{ height: isAdminVariant ? '4px' : '6px', background: 'rgba(16, 185, 129, 0.2)' }}>
                    <div
                      className="progress-bar bg-success"
                      role="progressbar"
                      style={{ width: `${resumen?.porcentaje_pagado || 0}%` }}
                      aria-valuenow={resumen?.porcentaje_pagado || 0}
                      aria-valuemin="0"
                      aria-valuemax="100"
                    ></div>
                  </div>
                  <small className={`text-muted ${isAdminVariant ? 'small' : ''}`}>{resumen?.porcentaje_pagado || 0}% del monto esperado</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div
              className="card shadow-sm border-0 h-100"
              style={{
                cursor: 'pointer',
                background: KPI_CARD_THEMES.pendiente.cardBg,
                borderLeft: `4px solid ${KPI_CARD_THEMES.pendiente.borderAccent}`,
                borderRadius: 12,
                ...(isAdminVariant ? { transition: 'box-shadow 0.15s ease' } : {})
              }}
              onMouseEnter={(e) => isAdminVariant && (e.currentTarget.style.boxShadow = '0 0.35rem 0.85rem rgba(245, 158, 11, 0.22)')}
              onMouseLeave={(e) => isAdminVariant && (e.currentTarget.style.boxShadow = '')}
              onClick={() => abrirModalCard('pendiente')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  abrirModalCard('pendiente');
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="card-body d-flex gap-3 align-items-start" style={{ padding: isAdminVariant ? '0.75rem 0.95rem' : '1rem' }}>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 46,
                    height: 46,
                    background: KPI_CARD_THEMES.pendiente.iconBg,
                    color: KPI_CARD_THEMES.pendiente.iconColor
                  }}
                  aria-hidden
                >
                  <i className={`fas ${KPI_CARD_THEMES.pendiente.icon} fa-lg`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <p className={`text-muted mb-1 ${isAdminVariant ? 'small mb-0 text-uppercase fw-semibold' : ''}`} style={isAdminVariant ? { fontSize: '0.7rem', letterSpacing: '0.02em' } : undefined}>
                    Pendiente
                  </p>
                  <h4 className={`mb-0 text-dark ${isAdminVariant ? 'h5 mt-1' : ''}`}>{formatCurrency(resumen?.total_pendiente)}</h4>
                  <small className={`text-muted ${isAdminVariant ? 'small' : ''}`}>Incluye pagos parciales</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-lg-3 col-md-6">
            <div
              className="card shadow-sm border-0 h-100"
              style={{
                cursor: 'pointer',
                background: KPI_CARD_THEMES.vencido.cardBg,
                borderLeft: `4px solid ${KPI_CARD_THEMES.vencido.borderAccent}`,
                borderRadius: 12,
                ...(isAdminVariant ? { transition: 'box-shadow 0.15s ease' } : {})
              }}
              onMouseEnter={(e) => isAdminVariant && (e.currentTarget.style.boxShadow = '0 0.35rem 0.85rem rgba(239, 68, 68, 0.22)')}
              onMouseLeave={(e) => isAdminVariant && (e.currentTarget.style.boxShadow = '')}
              onClick={() => abrirModalCard('vencido')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  abrirModalCard('vencido');
                }
              }}
              role="button"
              tabIndex={0}
            >
              <div className="card-body d-flex gap-3 align-items-start" style={{ padding: isAdminVariant ? '0.75rem 0.95rem' : '1rem' }}>
                <div
                  className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{
                    width: 46,
                    height: 46,
                    background: KPI_CARD_THEMES.vencido.iconBg,
                    color: KPI_CARD_THEMES.vencido.iconColor
                  }}
                  aria-hidden
                >
                  <i className={`fas ${KPI_CARD_THEMES.vencido.icon} fa-lg`}></i>
                </div>
                <div className="flex-grow-1 min-w-0">
                  <p className={`text-muted mb-1 ${isAdminVariant ? 'small mb-0 text-uppercase fw-semibold' : ''}`} style={isAdminVariant ? { fontSize: '0.7rem', letterSpacing: '0.02em' } : undefined}>
                    Vencido
                  </p>
                  <h4 className={`mb-0 text-dark ${isAdminVariant ? 'h5 mt-1' : ''}`}>{formatCurrency(resumen?.total_vencido)}</h4>
                  <small className={`text-muted ${isAdminVariant ? 'small' : ''}`}>Monto en mora</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={`row ${isAdminVariant ? 'g-2 mb-3' : 'g-3 mb-4'}`}>
          {renderRanking('Bloques con más deuda', ranking.bloques || [], 'fa-th-large', 'bloque')}
          {renderRanking('Niveles con más deuda', ranking.niveles || [], 'fa-layer-group', 'nivel')}
          {renderRanking('Cursos con más deuda', ranking.cursos || [], 'fa-book-open', 'curso')}
        </div>


        {loading && (
          <div className="text-center py-5">
            <div className={`spinner-border ${isCajeroVariant ? 'text-success' : 'text-primary'}`} role="status"></div>
            <p className="text-muted mt-3 mb-0">Cargando información...</p>
          </div>
        )}

        {!loading && showHint && (
          <div
            className={`alert ${isCajeroVariant ? 'alert-success' : 'alert-info'} ${isAdminVariant ? 'py-2 px-3 mb-0 small' : ''}`}
          >
            <i className={`fas ${isCajeroVariant ? 'fa-info-circle' : 'fa-info-circle'} me-2`}></i>
            Haz clic en cualquier bloque, nivel o curso del ranking para ver el detalle de estudiantes y enviarles un
            recordatorio personalizado.
          </div>
        )}
        </div>
      </div>

      {modalVisible && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className={`modal-header ${isCajeroVariant ? 'bg-success' : 'bg-primary'} text-white`}>
                <h5 className="modal-title">
                  <i className="fas fa-users me-2"></i>
                  {modalTitle} ({modalDeudores.length} estudiante{modalDeudores.length === 1 ? '' : 's'})
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={cerrarModalDetalle}></button>
              </div>
              <div className="modal-body">
                  <div className="card mb-3">
                    <div className="card-header bg-light">
                      <h6 className="mb-0">
                        <i className="fas fa-filter me-2"></i>
                        Filtros
                      </h6>
                    </div>
                    <div className="card-body">
                      <div className="row g-3">
                        <div className="col-sm-6 col-md-2">
                          <label className="form-label">Año</label>
                          <select
                            className="form-select"
                            value={modalFilters.anio}
                            onChange={(e) => handleModalFilterChange('anio', parseInt(e.target.value, 10))}
                          >
                            {yearsOptions.map((year) => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-sm-6 col-md-2">
                          <label className="form-label">Mes</label>
                          <select
                            className="form-select"
                            value={modalFilters.mes}
                            onChange={(e) => handleModalFilterChange('mes', e.target.value)}
                          >
                            <option value="todos">Todos</option>
                            {MESES.map((mes) => (
                              <option key={mes.numero} value={mes.numero}>
                                {mes.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-sm-6 col-md-2">
                          <label className="form-label">Estado</label>
                          <select
                            className="form-select"
                            value={modalFilters.estado}
                            onChange={(e) => handleModalFilterChange('estado', e.target.value)}
                          >
                            <option value="todos">Todos</option>
                            <option value="pendiente">Pendiente</option>
                            <option value="parcial">Parcial</option>
                            <option value="vencido">Vencido</option>
                            <option value="pagado">Pagado</option>
                          </select>
                        </div>
                        <div className="col-sm-6 col-md-2">
                          <label className="form-label">Bloque</label>
                          <select
                            className="form-select"
                            value={modalFilters.bloque_id}
                            onChange={(e) => handleModalFilterChange('bloque_id', e.target.value)}
                          >
                            <option value="">Todos</option>
                            {bloques.map((bloque) => (
                              <option key={bloque.id} value={bloque.id}>
                                {bloque.descripcion}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-sm-6 col-md-2">
                          <label className="form-label">Nivel</label>
                          <select
                            className="form-select"
                            value={modalFilters.nivel_id}
                            onChange={(e) => handleModalFilterChange('nivel_id', e.target.value)}
                          >
                            <option value="">Todos</option>
                            {nivelesDisponiblesModal.map((nivel) => (
                              <option key={nivel.id} value={nivel.id}>
                                {nivel.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-sm-6 col-md-2">
                          <label className="form-label">Curso</label>
                          <select
                            className="form-select"
                            value={modalFilters.curso_id}
                            onChange={(e) => handleModalFilterChange('curso_id', e.target.value)}
                          >
                            <option value="">Todos</option>
                            {cursosDisponiblesModal.map((curso) => (
                              <option key={curso.id} value={curso.id}>
                                {curso.nombre}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="col-12 d-flex gap-2">
                          <button className="btn btn-outline-secondary" onClick={limpiarFiltrosModal}>
                            <i className="fas fa-broom me-2"></i>
                            Limpiar filtros
                          </button>
                          <button className="btn btn-outline-success" onClick={exportarExcel} disabled={!modalDeudores.length}>
                            <i className="fas fa-file-excel me-2"></i>
                            Exportar Excel
                          </button>
                          <button className="btn btn-outline-danger" onClick={exportarPDF} disabled={!modalDeudores.length}>
                            <i className="fas fa-file-pdf me-2"></i>
                            Exportar PDF
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {loadingModal ? (
                    <div className="text-center py-5">
                      <div className={`spinner-border ${isCajeroVariant ? 'text-success' : 'text-primary'}`} role="status"></div>
                      <p className="text-muted mt-3 mb-0">Cargando información...</p>
                    </div>
                  ) : modalDeudores.length === 0 ? (
                    <div className="text-center py-4 text-muted">No hay estudiantes para mostrar con los filtros seleccionados.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table align-middle">
                        <thead className="table-light">
                          <tr>
                            <th>Estudiante</th>
                            <th>Nivel</th>
                            <th>Curso</th>
                            <th>Bloque</th>
                            <th>Mes</th>
                            <th>Saldo</th>
                            <th>Vencimiento</th>
                            <th>Estado</th>
                            <th>Tutor</th>
                            {modalType !== 'pagado' && <th>Acciones</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {modalDeudores.map((item) => (
                            <tr key={item.pago_id}>
                              <td>
                                <strong>{item.estudiante}</strong>
                              </td>
                              <td>{item.nivel_nombre}</td>
                              <td>{item.curso_nombre}</td>
                              <td>{item.bloque_nombre}</td>
                              <td>{item.mes_nombre}</td>
                              <td>
                                <strong>{formatCurrency(item.saldo_pendiente)}</strong>
                                <div className="small text-muted">Esperado: {formatCurrency(item.monto_esperado)}</div>
                                <div className="small text-muted">Pagado: {formatCurrency(item.monto_pagado)}</div>
                              </td>
                              <td>
                                <div>{formatDate(item.fecha_vencimiento)}</div>
                                {item.dias_atraso > 0 && (
                                  <small className="text-danger">{item.dias_atraso} día(s)</small>
                                )}
                              </td>
                              <td>
                                <span className={estadoBadgeClass(item.estado)}>{item.estado}</span>
                              </td>
                              <td>
                                <div>{item.tutor}</div>
                                <small className="text-muted">{item.telefono_referencia || 'Sin contacto'}</small>
                              </td>
                              {modalType !== 'pagado' && (
                                <td>
                                  <div className="d-grid gap-2">
                                    {item.mensaje_recordatorio && (
                                      <>
                                        <button
                                          className="btn btn-sm btn-outline-secondary"
                                          onClick={() => handleCopyMessage(item.mensaje_recordatorio)}
                                        >
                                          <i className="far fa-copy me-1"></i>
                                          Copiar mensaje
                                        </button>
                                        <button
                                          className="btn btn-sm btn-success"
                                          disabled={!item.telefono_referencia}
                                          onClick={() => handleSendWhatsApp(item.telefono_referencia, item.mensaje_recordatorio)}
                                        >
                                          <i className="fab fa-whatsapp me-1"></i>
                                          WhatsApp
                                        </button>
                                      </>
                                    )}
                                  </div>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={cerrarModalDetalle}>
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default PagosMorosidadPanel;

