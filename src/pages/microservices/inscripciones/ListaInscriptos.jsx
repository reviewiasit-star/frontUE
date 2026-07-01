import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import WhatsAppPDFSender from '../../../components/WhatsAppPDFSender';
import NotificationModal from '../../../components/NotificationModal';
import ModoDispositivo from '../../../components/modoDispositivo.jsx';
import { useNotification } from '../../../hooks/useNotification';
import { useOfflineSync } from '../../../hooks/useOfflineSync';
import { getPendingRequests, deletePendingRequest } from '../../../utils/offlineStorage';
import AuthService from '../../../services/authService';
import { BACKEND_PRINCIPAL } from '../../../config/apiConfig';

const BACKEND_PRINCIPAL_ORIGIN = BACKEND_PRINCIPAL.replace(/\/api\/?$/, '');

function ListaInscriptos() {
  // Función para ordenar meses cronológicamente
  const ordenarMesesCronologicamente = (meses) => {
    const ordenMeses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];

    return meses.sort((a, b) => {
      const indexA = ordenMeses.indexOf(a.toLowerCase());
      const indexB = ordenMeses.indexOf(b.toLowerCase());
      return indexA - indexB;
    });
  };

  // Función para obtener meses disponibles basándose en el nivel seleccionado
  const getMesesDisponibles = () => {
    const nivelSeleccionado = niveles.find(n => n.id == formPreinscripcion.nivel_id);
    if (nivelSeleccionado && nivelSeleccionado.meses && nivelSeleccionado.meses.length > 0) {
      return ordenarMesesCronologicamente([...nivelSeleccionado.meses]);
    }
    // Meses por defecto (enero a diciembre) si no hay nivel seleccionado
    return [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
    ];
  };

  const [inscriptos, setInscriptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingInscripto, setEditingInscripto] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [searchQuery, setSearchQuery] = useState('');
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(8);
  // Nuevos estados para selects dependientes
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [bloques, setBloques] = useState([]); // Nuevo estado para bloques
  // Estado para becas
  const [becas, setBecas] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inscriptoToDelete, setInscriptoToDelete] = useState(null);
  const [showRetiroModal, setShowRetiroModal] = useState(false);
  const [inscriptoToRetirar, setInscriptoToRetirar] = useState(null);
  const [estadosEstudiante, setEstadosEstudiante] = useState([]);
  const [retiroEstadoId, setRetiroEstadoId] = useState('');
  const [retiroMotivo, setRetiroMotivo] = useState('');
  const [showRegistroConfirmModal, setShowRegistroConfirmModal] = useState(false);
  const [registroConfirmMessage, setRegistroConfirmMessage] = useState('');
  const [showActualizacionConfirmModal, setShowActualizacionConfirmModal] = useState(false);
  const [actualizacionConfirmMessage, setActualizacionConfirmMessage] = useState('');
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);
  // Estado para el wizard multi-paso
  const [currentStep, setCurrentStep] = useState(1);
  // Flag para controlar si se puede hacer submit (solo cuando se hace clic en Finalizar)
  const [allowSubmit, setAllowSubmit] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false); // Flag para prevenir múltiples submits

  // Estados para el modal de preinscripción
  const [showPreinscripcionModal, setShowPreinscripcionModal] = useState(false);
  // Hook para detectar estado offline y requests pendientes
  const { isOnline, pendingCount, updatePendingCount, manualSync } = useOfflineSync();
  
  // Estado para datos pendientes
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Función para obtener información del estudiante desde el body
  const getStudentInfo = (body) => {
    if (!body) return null;
    try {
      // El body puede venir como string o como objeto
      let parsed = body;
      if (typeof body === 'string') {
        try {
          parsed = JSON.parse(body);
        } catch (e) {
          // Si no se puede parsear, intentar como objeto directo
          console.warn('No se pudo parsear body como JSON:', e);
          return null;
        }
      }
      
      // Verificar si tiene datos de estudiante
      if (parsed && (parsed.nombre || parsed.apellido_paterno || parsed.ci_estudiante)) {
        return {
          nombre: parsed.nombre || '',
          apellidoPaterno: parsed.apellido_paterno || '',
          apellidoMaterno: parsed.apellido_materno || '',
          ci: parsed.ci_estudiante || parsed.ci || 'N/A',
          codigo: parsed.codigo_estudiante || parsed.codigo || 'N/A',
          fechaNacimiento: parsed.fecha_nacimiento || 'N/A',
          genero: parsed.genero || 'N/A'
        };
      }
      return null;
    } catch (e) {
      console.error('Error obteniendo información del estudiante:', e);
      return null;
    }
  };

  // Función para obtener tipo de request
  const getRequestType = (url, method) => {
    const urlLower = url.toLowerCase();
    const methodUpper = method?.toUpperCase() || 'GET';

    if (urlLower.includes('/estudiantes') && methodUpper === 'POST') {
      return { type: 'Registro de Estudiante', icon: '👤', color: 'primary' };
    }
    if (urlLower.includes('/inscripciones') && methodUpper === 'POST') {
      return { type: 'Nueva inscripción', icon: '📝', color: 'info' };
    }
    if (urlLower.includes('/pagos-realizados') || (urlLower.includes('/pagos') && methodUpper === 'POST')) {
      return { type: 'Registro de Pago', icon: '💰', color: 'success' };
    }
    if (urlLower.includes('/compromiso-economico') && methodUpper === 'POST') {
      return { type: 'Compromiso Económico', icon: '📋', color: 'warning' };
    }
    return { type: 'Operación', icon: '📌', color: 'secondary' };
  };

  // Función para formatear fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Cargar requests pendientes
  const loadPendingRequests = async () => {
    try {
      setLoadingPending(true);
      const requests = await getPendingRequests();
      setPendingRequests(requests || []);
    } catch (error) {
      console.error('Error cargando requests pendientes:', error);
      setPendingRequests([]);
    } finally {
      setLoadingPending(false);
    }
  };

  // Descartar una operación pendiente individual
  const handleDescartarPendiente = async (id) => {
    if (!window.confirm('¿Descartar esta operación pendiente? No se podrá recuperar.')) return;
    try {
      await deletePendingRequest(id);
      setPendingRequests((prev) => prev.filter((r) => r.id !== id));
      updatePendingCount();
    } catch (error) {
      console.error('Error descartando operación:', error);
    }
  };

  // Cargar requests pendientes cuando cambia el contador o el estado offline
  useEffect(() => {
    if (!isOnline || pendingCount > 0) {
      loadPendingRequests();
      // Actualizar cada 3 segundos cuando hay datos pendientes (más frecuente)
      const interval = setInterval(loadPendingRequests, 3000);
      return () => clearInterval(interval);
    } else {
      setPendingRequests([]);
    }
  }, [isOnline, pendingCount]);

  // También escuchar eventos personalizados cuando se guarda un nuevo request
  useEffect(() => {
    const handleRequestSaved = () => {
      setTimeout(() => {
        updatePendingCount();
        loadPendingRequests();
      }, 500);
    };

    window.addEventListener('offline-request-saved', handleRequestSaved);
    return () => {
      window.removeEventListener('offline-request-saved', handleRequestSaved);
    };
  }, [updatePendingCount]);


  const [busquedaEstudiante, setBusquedaEstudiante] = useState('');
  const [sugerenciasEstudiantes, setSugerenciasEstudiantes] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [estudiantesBasicos, setEstudiantesBasicos] = useState([]);
  const [inscripcionExistente, setInscripcionExistente] = useState(null);
  const [sugerenciasAgente, setSugerenciasAgente] = useState([]);
  const [formPreinscripcion, setFormPreinscripcion] = useState({
    nivel_id: '',
    curso_id: '',
    bloque_id: '',
    turno: '',
    hora_inicio: '',
    hora_fin: '',
    fecha_inscripcion: '',
    id_beca: '',
    meses_beca: [],
    gestion_academica: new Date().getFullYear() // Por defecto el año actual
  });

  // Adquisición de servicios movida a Administración Académica

  // Estado para el cálculo previo
  const [calculoPrevio, setCalculoPrevio] = useState({
    precioNivel: 0,
    cuotaMensual: 0,
    mesesConDescuento: [],
    mesesSinDescuento: [],
    totalConDescuento: 0,
    totalSinDescuento: 0,
    totalCuotas: 0,
    totalGeneral: 0
  });

  // Estados para el menú hamburguesa
  // const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [menuHamburguesaVisible, setMenuHamburguesaVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  // const navigate = useNavigate();

  // Estado inicial actualizado - Solo datos generales del estudiante
  const [formData, setFormData] = useState({
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    ci_estudiante: '',
    fecha_nacimiento: '',
    lugar_nacimiento: '',
    genero: '',
    direccion: '',
    codigo_estudiante: '',
    nombre_padre: '',
    apellido_padre: '',
    ci_padre: '',
    profesion_padre: '',
    lugar_trabajo_padre: '',
    telefono_domicilio_padre: '',
    telefono_oficina_padre: '',
    nombre_madre: '',
    apellido_madre: '',
    ci_madre: '',
    profesion_madre: '',
    lugar_trabajo_madre: '',
    telefono_domicilio_madre: '',
    telefono_oficina_madre: '',
    nombre_autorizado1: '',
    telefono_autorizado1: '',
    nombre_autorizado2: '',
    telefono_autorizado2: '',
    alergias: '',
    vacunas: '',
    seguro_medico: '',
    // ✅ NUEVO: Checkboxes WhatsApp
    whatsapp_domicilio_padre: false,
    whatsapp_oficina_padre: false,
    whatsapp_domicilio_madre: false,
    whatsapp_oficina_madre: false
  });

  // Estados para WhatsApp
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedInscripto, setSelectedInscripto] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  // Hook para notificaciones
  const { notification, showSuccess, showError, hideNotification } = useNotification();
  
  // Referencias estables para evitar problemas de inicialización
  const showSuccessRef = useRef(showSuccess);
  const cargarInscriptosRef = useRef(null);
  
  // Actualizar referencias cuando cambian
  useEffect(() => {
    showSuccessRef.current = showSuccess;
  }, [showSuccess]);

  // Función para manejar cambios de filtro
  const handleFiltroChange = (filtro) => {
    setFiltroActivo(filtro);
    setPaginaActual(1); // Resetear a la primera página cuando cambia el filtro
    cargarInscriptos(filtro);
  };

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);

    cargarInscriptos();
    cargarEstudiantesBasicos(); // Cargar estudiantes básicos para el buscador
    cargarEstadosEstudiante();
  }, []);
  const cargarEstadosEstudiante = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/estados-estudiante`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      const estados = Array.isArray(data) ? data : [];
      setEstadosEstudiante(estados);

      // Seleccionar por defecto "Retirado" si existe
      const estadoRetirado = estados.find((e) => String(e.nombre || '').toLowerCase() === 'retirado');
      if (estadoRetirado) {
        setRetiroEstadoId(String(estadoRetirado.id));
      } else if (estados[0]) {
        setRetiroEstadoId(String(estados[0].id));
      }
    } catch (error) {
      console.error('Error al cargar estados de estudiante:', error);
    }
  };


  // Re-cargar lista cuando cambia el año seleccionado
  useEffect(() => {
    cargarInscriptos(filtroActivo);
    // Al cambiar de año, resetear a primera página
    setPaginaActual(1);
  }, [selectedYear]);

  // Resetear a la primera página cuando cambian los inscriptos (por ejemplo, después de filtrar)
  useEffect(() => {
    if (inscriptos.length > 0 && paginaActual > Math.ceil(inscriptos.length / itemsPorPagina)) {
      setPaginaActual(1);
    }
  }, [inscriptos.length, paginaActual, itemsPorPagina]);

  // Filtrar estudiantes basado en la búsqueda (usando estudiantes básicos)
  useEffect(() => {
    if (busquedaEstudiante.trim().length >= 2) {
      const filtrados = estudiantesBasicos.filter(estudiante => {
        const nombreCompleto = `${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''}`.toLowerCase();
        const ci = estudiante.ci_estudiante || '';
        const busqueda = busquedaEstudiante.toLowerCase();
        return nombreCompleto.includes(busqueda) || ci.includes(busqueda);
      }).slice(0, 10); // Limitar a 10 sugerencias
      setSugerenciasEstudiantes(filtrados);
      setMostrarSugerencias(true);
    } else {
      setSugerenciasEstudiantes([]);
      setMostrarSugerencias(false);
    }
  }, [busquedaEstudiante, estudiantesBasicos]);

  // Calcular previo cuando cambien los datos relevantes
  useEffect(() => {
    if (formPreinscripcion.nivel_id || formPreinscripcion.id_beca || formPreinscripcion.meses_beca.length > 0) {
      calcularPrevio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formPreinscripcion.nivel_id, formPreinscripcion.id_beca, formPreinscripcion.meses_beca]);

  const cargarInscriptos = async (filtro = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const base = `${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes`;
      const url = filtro
        ? `${base}?filtro=${encodeURIComponent(filtro)}&anio=${encodeURIComponent(selectedYear)}&incluir_concluidos=1&incluir_todos_estados=1`
        : `${base}?anio=${encodeURIComponent(selectedYear)}&incluir_concluidos=1&incluir_todos_estados=1`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setInscriptos(data);
      } else {
        setError('Error al cargar los estudiantes');
      }
    } catch {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  };
  
  // Actualizar referencia de cargarInscriptos directamente (sin useEffect para evitar loops)
  cargarInscriptosRef.current = cargarInscriptos;

  // Escuchar cuando se completa la sincronización de datos pendientes
  // Usar referencias para evitar problemas de inicialización
  useEffect(() => {
    const handleSyncCompleted = (event) => {
      try {
        const { success, failed } = event.detail || {};
        
        if (success > 0) {
          // Usar referencia para showSuccess
          if (showSuccessRef.current && typeof showSuccessRef.current === 'function') {
            showSuccessRef.current(
              'Sincronización Completada', 
              `${success} operación(es) sincronizada(s) exitosamente${failed > 0 ? `. ${failed} operación(es) fallaron.` : '.'}`
            );
          }
          
          // Esperar un momento para que el servidor procese los datos
          setTimeout(() => {
            try {
              // Usar referencia para cargarInscriptos
              if (cargarInscriptosRef.current && typeof cargarInscriptosRef.current === 'function') {
                cargarInscriptosRef.current(filtroActivo);
              }
              
              if (typeof updatePendingCount === 'function') {
                updatePendingCount();
              }
              
              if (typeof loadPendingRequests === 'function') {
                loadPendingRequests();
              }
            } catch (error) {
              console.error('Error al actualizar después de sincronización:', error);
            }
          }, 1000); // Esperar 1 segundo para dar tiempo al servidor
        }
      } catch (error) {
        console.error('Error en handleSyncCompleted:', error);
      }
    };

    window.addEventListener('offline-sync-completed', handleSyncCompleted);
    return () => {
      window.removeEventListener('offline-sync-completed', handleSyncCompleted);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtroActivo, updatePendingCount]);

  // Lista de años (actual -1 a actual +2)
  const currentYear = new Date().getFullYear();
  const years = [currentYear - 1, currentYear, currentYear + 1, currentYear + 2];

  // Filtrado por buscador (nombre, apellidos, CI, código)
  const inscriptosFiltrados = inscriptos.filter((e) => {
    const nombre = (e.nombre || '').toLowerCase();
    const apPat = (e.apellido_paterno || '').toLowerCase();
    const apMat = (e.apellido_materno || '').toLowerCase();
    const ci = (e.ci_estudiante || '').toLowerCase();
    const codigo = (e.codigo_estudiante || '').toLowerCase();
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      nombre.includes(q) ||
      apPat.includes(q) ||
      apMat.includes(q) ||
      ci.includes(q) ||
      codigo.includes(q)
    );
  });

  // Función separada para cargar estudiantes básicos (sin datos de inscripciones) para el buscador
  const cargarEstudiantesBasicos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes/busqueda-basica`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();

      if (response.ok) {
        setEstudiantesBasicos(data);
      }
    } catch (error) {
      console.error('Error al cargar estudiantes básicos:', error);
    }
  };

  // (sin uso aquí)



  // Cargar becas y bloques al inicio
  useEffect(() => {
    const token = localStorage.getItem('token');

    // Cargar becas
    fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/becas`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(setBecas)
      .catch(error => {
        console.error('Error cargando becas:', error);
        setBecas([]);
      });

    // Cargar bloques
    fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/bloques`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        setBloques(data);
      })
      .catch(error => {
        console.error('Error cargando bloques:', error);
        setBloques([]);
      });
  }, []);

  // Cargar todos los niveles al inicio
  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/niveles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(nivelesData => {
        setNiveles(nivelesData);
      })
      .catch(error => {
        console.error('Error cargando niveles:', error);
        setNiveles([]);
      });
  }, []);

  // Cargar cursos cuando cambia el nivel en preinscripción
  useEffect(() => {
    if (formPreinscripcion.nivel_id) {
      const token = localStorage.getItem('token');
      fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/cursos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(cursosData => {
          const cursosFiltrados = cursosData.filter(c => c.nivel_id == formPreinscripcion.nivel_id);
          setCursos(cursosFiltrados);
          // Limpiar curso seleccionado
          setFormPreinscripcion(prev => ({
            ...prev,
            curso_id: '',
            turno: '',
            hora_inicio: '',
            hora_fin: ''
          }));
        })
        .catch(error => {
          console.error('Error cargando cursos:', error);
          setCursos([]);
        });
    } else {
      setCursos([]);
      setFormPreinscripcion(prev => ({
        ...prev,
        curso_id: '',
        turno: '',
        hora_inicio: '',
        hora_fin: ''
      }));
    }
  }, [formPreinscripcion.nivel_id]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  // Validación por paso
  const validateStep = (step) => {
    if (step === 1) {
      // Validar campos requeridos del paso 1
      const requiredFields = ['codigo_estudiante', 'nombre', 'apellido_paterno', 'apellido_materno', 'ci_estudiante', 'fecha_nacimiento', 'lugar_nacimiento', 'direccion', 'genero'];
      const missingFields = requiredFields.filter(field => !formData[field] || formData[field].trim() === '');

      if (missingFields.length > 0) {
        showError('Campos requeridos', 'Por favor complete todos los campos marcados con * antes de continuar.');
        return false;
      }
    }
    // Pasos 2 y 3 no tienen campos requeridos, permitir avanzar
    return true;
  };

  // Funciones de navegación del wizard
  const nextStep = () => {
    if (validateStep(currentStep)) {
      const nextStepValue = Math.min(currentStep + 1, 3);
      setCurrentStep(nextStepValue);
      // Scroll al inicio del modal al cambiar de paso
      setTimeout(() => {
        const modalBody = document.querySelector('.modal-body');
        if (modalBody) {
          modalBody.scrollTop = 0;
        }
      }, 100);
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    // Scroll al inicio del modal al cambiar de paso
    const modalBody = document.querySelector('.modal-body');
    if (modalBody) {
      modalBody.scrollTop = 0;
    }
  };

  const abrirModal = async (inscripto = null) => {
    if (inscripto) {
      try {
        // Obtener todos los datos del estudiante desde el backend
        const token = localStorage.getItem('token');
        // Fetch para datos del estudiante
        const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes/${inscripto.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();

        // ✅ NUEVO: Fetch para estados de WhatsApp
        let estadosWhatsApp = {
          whatsapp_domicilio_padre: false,
          whatsapp_oficina_padre: false,
          whatsapp_domicilio_madre: false,
          whatsapp_oficina_madre: false
        };

        try {
          const respWA = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/contacto-aviso/${inscripto.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const dataWA = await respWA.json();
          if (dataWA.ok && dataWA.estados) {
            estadosWhatsApp = dataWA.estados;
          }
        } catch (waErr) {
          console.error('Error cargando estados WhatsApp:', waErr);
        }

        if (response.ok) {
          // Setear formData y mostrar modal (solo datos generales del estudiante)
          setTimeout(() => {
            const formDataCompleto = {
              nombre: data.nombre || '',
              apellido_paterno: data.apellido_paterno || '',
              apellido_materno: data.apellido_materno || '',
              fecha_nacimiento: data.fecha_nacimiento ? data.fecha_nacimiento.split('T')[0] : '',
              lugar_nacimiento: data.lugar_nacimiento || '',
              direccion: data.direccion || '',
              genero: (data.genero && data.genero.toUpperCase().startsWith('M')) ? 'M' : 
                      (data.genero && data.genero.toUpperCase().startsWith('F')) ? 'F' : (data.genero || ''),
              codigo_estudiante: data.codigo_estudiante || '',
              nombre_padre: data.nombre_padre || '',
              apellido_padre: data.apellido_padre || '',
              ci_padre: data.ci_padre || '',
              tipo_ci_padre: data.tipo_ci_padre || 'ci',
              extension_ci_padre: data.extension_ci_padre || '',
              profesion_padre: data.profesion_padre || '',
              lugar_trabajo_padre: data.lugar_trabajo_padre || '',
              telefono_domicilio_padre: data.telefono_domicilio_padre || '',
              telefono_oficina_padre: data.telefono_oficina_padre || '',
              nombre_madre: data.nombre_madre || '',
              apellido_madre: data.apellido_madre || '',
              ci_madre: data.ci_madre || '',
              tipo_ci_madre: data.tipo_ci_madre || 'ci',
              extension_ci_madre: data.extension_ci_madre || '',
              profesion_madre: data.profesion_madre || '',
              lugar_trabajo_madre: data.lugar_trabajo_madre || '',
              telefono_domicilio_madre: data.telefono_domicilio_madre || '',
              telefono_oficina_madre: data.telefono_oficina_madre || '',
              nombre_autorizado1: data.nombre_autorizado1 || '',
              telefono_autorizado1: data.telefono_autorizado1 || '',
              nombre_autorizado2: data.nombre_autorizado2 || '',
              telefono_autorizado2: data.telefono_autorizado2 || '',
              alergias: data.alergias || '',
              vacunas: data.vacunas || '',
              seguro_medico: data.seguro_medico || '',
              ci_estudiante: data.ci_estudiante || '',
              // Unir estados de WhatsApp
              ...estadosWhatsApp
            };
            setEditingInscripto(data);
            setFormData(formDataCompleto);
            setShowModal(true);
            setCurrentStep(1); // Resetear al paso 1 al abrir modal para editar
            setAllowSubmit(false); // Resetear el flag de submit
            setIsSubmitting(false); // Resetear flag de submitting
          }, 0);
        } else {
          showError('Error al cargar datos', 'Error al cargar los datos del inscripto: ' + data.message);
          return;
        }
      } catch {
        showError('Error de conexión', 'Error de conexión al cargar los datos del estudiante');
        return;
      }
    } else {
      setEditingInscripto(null);
      setFormData({
        nombre: '', apellido_paterno: '', apellido_materno: '', fecha_nacimiento: '', lugar_nacimiento: '', direccion: '',
        genero: '', codigo_estudiante: '', nombre_padre: '', apellido_padre: '',
        ci_padre: '', tipo_ci_padre: 'ci', extension_ci_padre: '', profesion_padre: '', lugar_trabajo_padre: '', telefono_domicilio_padre: '', telefono_oficina_padre: '', nombre_madre: '', apellido_madre: '',
        ci_madre: '', tipo_ci_madre: 'ci', extension_ci_madre: '', profesion_madre: '', lugar_trabajo_madre: '', telefono_domicilio_madre: '', telefono_oficina_madre: '',
        nombre_autorizado1: '',
        telefono_autorizado1: '',
        nombre_autorizado2: '',
        telefono_autorizado2: '',
        alergias: '',
        vacunas: '',
        seguro_medico: '', ci_estudiante: ''
      });
      setShowModal(true);
      setCurrentStep(1); // Resetear al paso 1 al abrir modal para nuevo estudiante
      setAllowSubmit(false); // Resetear el flag de submit
      setIsSubmitting(false); // Resetear flag de submitting
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setIsSubmitting(false); // Resetear flag de submit al cerrar modal
    setAllowSubmit(false); // Asegurar que allowSubmit también se resetee
    setEditingInscripto(null);
    setCurrentStep(1); // Resetear al paso 1 al cerrar modal
    setAllowSubmit(false); // Resetear el flag de submit
    // Reset del formulario
    setFormData({
      nombre: '',
      apellido_paterno: '',
      apellido_materno: '',
      ci_estudiante: '',
      fecha_nacimiento: '',
      lugar_nacimiento: '',
      genero: '',
      direccion: '',
      codigo_estudiante: '',
      nombre_padre: '',
      apellido_padre: '',
      ci_padre: '',
      tipo_ci_padre: 'ci',
      extension_ci_padre: '',
      profesion_padre: '',
      lugar_trabajo_padre: '',
      telefono_domicilio_padre: '',
      telefono_oficina_padre: '',
      nombre_madre: '',
      apellido_madre: '',
      ci_madre: '',
      tipo_ci_madre: 'ci',
      extension_ci_madre: '',
      profesion_madre: '',
      lugar_trabajo_madre: '',
      telefono_domicilio_madre: '',
      telefono_oficina_madre: '',
      nombre_autorizado1: '',
      telefono_autorizado1: '',
      nombre_autorizado2: '',
      telefono_autorizado2: '',
      alergias: '',
      vacunas: '',
      seguro_medico: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    // Verificar que el modal esté abierto
    if (!showModal) {
      return;
    }

    // Si no está editando y no está en el paso 3, no hacer submit
    if (!editingInscripto && currentStep !== 3) {
      // Si se intenta hacer submit antes del paso 3, avanzar al siguiente paso
      nextStep();
      return;
    }

    // CRÍTICO: Si no está editando y estamos en el paso 3, solo permitir submit si allowSubmit es true
    if (!editingInscripto && currentStep === 3 && !allowSubmit) {
      return;
    }

    // Validar que realmente estamos en el paso 3 antes de enviar
    if (!editingInscripto && currentStep !== 3) {
      return;
    }

    if (editingInscripto) {
      setPendingSubmit(true);
      setShowUpdateModal(true);
      return;
    }

    // Solo proceder si estamos en el paso 3 y allowSubmit es true
    if (currentStep === 3 && allowSubmit && !isSubmitting) {
      // Prevenir múltiples submits simultáneos
      setIsSubmitting(true);
      setAllowSubmit(false); // Resetear el flag INMEDIATAMENTE

      try {
        const token = localStorage.getItem('token');
        const url = `${BACKEND_PRINCIPAL}/estudiantes`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        const data = await response.json();

        // Verificar si es una respuesta offline (guardada para sincronización)
        if (response.status === 202 && data.offline && data.saved) {
          showSuccess('Operación guardada', data.message || 'Se guardó correctamente. Se sincronizará automáticamente cuando vuelva la conexión.');
          cerrarModal();
          setIsSubmitting(false);
          // Actualizar contador y cargar requests pendientes
          updatePendingCount();
          setTimeout(() => {
            loadPendingRequests();
          }, 500);
          // No recargar la lista porque aún no está en el servidor
          return; // Salir temprano para evitar procesamiento adicional
        }

        if (data.ok) {
          const nombreRegistrado = `${formData.nombre || ''} ${formData.apellido_paterno || ''} ${formData.apellido_materno || ''}`.trim();
          const mensajeRegistro = nombreRegistrado
            ? `El estudiante ${nombreRegistrado} fue registrado correctamente.`
            : 'Estudiante registrado exitosamente.';
          showSuccess('Estudiante registrado', mensajeRegistro, { autoClose: false });
          setRegistroConfirmMessage(mensajeRegistro);
          setShowRegistroConfirmModal(true);
          cerrarModal();
          cargarInscriptos();
          setIsSubmitting(false);
        } else {
          const detalle = (data.sqlError || data.error || data.message || 'Error desconocido');
          showError('Error al registrar', `Error al registrar estudiante (HTTP ${response.status}): ${detalle}`);
          setIsSubmitting(false);
        }
      } catch (error) {
        // Si el error es de conexión, puede que se haya guardado offline
        // Verificar si hay requests pendientes antes de mostrar error

        // Si es un error de conexión, puede que se haya guardado offline
        if (error.message && (error.message.includes('Failed to fetch') || error.message.includes('ERR_CONNECTION_REFUSED') || error.message.includes('network'))) {
          // El offlineFetch debería haberlo manejado, pero por si acaso
          showSuccess('Operación guardada', 'Se guardó correctamente. Se sincronizará automáticamente cuando vuelva la conexión.');
          cerrarModal();
        } else {
          showError('Error de conexión', 'Error de conexión al registrar estudiante. Verifique su conexión a internet y que el servidor esté funcionando.');
        }
        setIsSubmitting(false);
      }
    }
  };

  // Función para llenar el formulario con datos aleatorios (para pruebas)
  const llenarDatosAleatorios = () => {
    const nombres = ['Cristian', 'Mariana', 'Alizon', 'Analia', 'Victor', 'Carol', 'Amalia', 'Lizeth', 'Miguel', 'Elena'];
    const apellidos = ['García', 'Rodríguez', 'López', 'Martínez', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Cruz', 'Flores'];
    const lugares = ['La Paz', 'Santa Cruz', 'Cochabamba', 'Oruro', 'Potosí', 'Tarija', 'Sucre', 'Beni', 'Pando'];
    const profesiones = ['Ingeniero', 'Médico', 'Profesor', 'Abogado', 'Contador', 'Comerciante', 'Técnico', 'Enfermera'];
    const empresas = ['YPFB', 'ENDE', 'Banco Nacional', 'Universidad Mayor', 'Hospital Central', 'Ministerio de Educación'];

    const randomNombre = nombres[Math.floor(Math.random() * nombres.length)];
    const randomApellidoP = apellidos[Math.floor(Math.random() * apellidos.length)];
    const randomApellidoM = apellidos[Math.floor(Math.random() * apellidos.length)];
    const randomCI = Math.floor(Math.random() * 9000000) + 1000000;
    const randomFecha = new Date(2010 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
    const fechaFormateada = randomFecha.toISOString().split('T')[0];

    setFormData({
      nombre: randomNombre,
      apellido_paterno: randomApellidoP,
      apellido_materno: randomApellidoM,
      ci_estudiante: randomCI.toString(),
      fecha_nacimiento: fechaFormateada,
      lugar_nacimiento: lugares[Math.floor(Math.random() * lugares.length)],
      genero: Math.random() > 0.5 ? 'M' : 'F',
      direccion: `Av. ${apellidos[Math.floor(Math.random() * apellidos.length)]} #${Math.floor(Math.random() * 500) + 100}`,
      codigo_estudiante: `EST${randomCI}`,
      nombre_padre: nombres[Math.floor(Math.random() * nombres.length)],
      apellido_padre: apellidos[Math.floor(Math.random() * apellidos.length)],
      ci_padre: (Math.floor(Math.random() * 9000000) + 1000000).toString(),
      profesion_padre: profesiones[Math.floor(Math.random() * profesiones.length)],
      lugar_trabajo_padre: empresas[Math.floor(Math.random() * empresas.length)],
      telefono_domicilio_padre: `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000) + 1000}`,
      telefono_oficina_padre: `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000) + 1000}`,
      nombre_madre: nombres[Math.floor(Math.random() * nombres.length)],
      apellido_madre: apellidos[Math.floor(Math.random() * apellidos.length)],
      ci_madre: (Math.floor(Math.random() * 9000000) + 1000000).toString(),
      profesion_madre: profesiones[Math.floor(Math.random() * profesiones.length)],
      lugar_trabajo_madre: empresas[Math.floor(Math.random() * empresas.length)],
      telefono_domicilio_madre: `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000) + 1000}`,
      telefono_oficina_madre: `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000) + 1000}`,
      nombre_autorizado1: nombres[Math.floor(Math.random() * nombres.length)] + ' ' + apellidos[Math.floor(Math.random() * apellidos.length)],
      telefono_autorizado1: `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000) + 1000}`,
      nombre_autorizado2: nombres[Math.floor(Math.random() * nombres.length)] + ' ' + apellidos[Math.floor(Math.random() * apellidos.length)],
      telefono_autorizado2: `${Math.floor(Math.random() * 900) + 100}${Math.floor(Math.random() * 9000) + 1000}`,
      alergias: Math.random() > 0.7 ? 'Ninguna alergia conocida' : 'Alergia a medicamentos',
      vacunas: 'BCG, DPT, Polio, Sarampión, Hepatitis B',
      seguro_medico: Math.random() > 0.5 ? 'CNS' : 'Seguro Privado'
    });
  };

  // ===== NUEVO: Buscar datos del padre/madre por CI =====
  // Permite autocompletar datos al registrar hermanos
  const buscarDatosPadrePorCI = async (ci, tipo) => {
    if (!ci || ci.length < 5) {
      showError('CI inválido', 'Por favor ingrese un CI válido (mínimo 5 dígitos)');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes/buscar-padre-por-ci/${ci}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (data.encontrado) {
        // Autocompletar campos según el tipo (padre o madre)
        const datosEncontrados = data.datos;

        if (tipo === 'padre' && datosEncontrados.nombre_padre) {
          setFormData(prev => ({
            ...prev,
            nombre_padre: datosEncontrados.nombre_padre || prev.nombre_padre,
            apellido_padre: datosEncontrados.apellido_padre || prev.apellido_padre,
            ci_padre: datosEncontrados.ci_padre || prev.ci_padre,
            tipo_ci_padre: datosEncontrados.tipo_ci_padre || prev.tipo_ci_padre || 'ci',
            extension_ci_padre: datosEncontrados.extension_ci_padre || prev.extension_ci_padre,
            profesion_padre: datosEncontrados.profesion_padre || prev.profesion_padre,
            lugar_trabajo_padre: datosEncontrados.lugar_trabajo_padre || prev.lugar_trabajo_padre,
            telefono_domicilio_padre: datosEncontrados.telefono_domicilio_padre || prev.telefono_domicilio_padre,
            telefono_oficina_padre: datosEncontrados.telefono_oficina_padre || prev.telefono_oficina_padre,
            // También autocompletar datos de la madre si existen
            nombre_madre: datosEncontrados.nombre_madre || prev.nombre_madre,
            apellido_madre: datosEncontrados.apellido_madre || prev.apellido_madre,
            ci_madre: datosEncontrados.ci_madre || prev.ci_madre,
            tipo_ci_madre: datosEncontrados.tipo_ci_madre || prev.tipo_ci_madre || 'ci',
            extension_ci_madre: datosEncontrados.extension_ci_madre || prev.extension_ci_madre,
            profesion_madre: datosEncontrados.profesion_madre || prev.profesion_madre,
            lugar_trabajo_madre: datosEncontrados.lugar_trabajo_madre || prev.lugar_trabajo_madre,
            telefono_domicilio_madre: datosEncontrados.telefono_domicilio_madre || prev.telefono_domicilio_madre,
            telefono_oficina_madre: datosEncontrados.telefono_oficina_madre || prev.telefono_oficina_madre,
            // Dirección y autorizados
            direccion: datosEncontrados.direccion || prev.direccion,
            nombre_autorizado1: datosEncontrados.nombre_autorizado1 || prev.nombre_autorizado1,
            telefono_autorizado1: datosEncontrados.telefono_autorizado1 || prev.telefono_autorizado1,
            nombre_autorizado2: datosEncontrados.nombre_autorizado2 || prev.nombre_autorizado2,
            telefono_autorizado2: datosEncontrados.telefono_autorizado2 || prev.telefono_autorizado2
          }));
          showSuccess('✅ Datos encontrados', `Se completaron automáticamente los datos del padre/madre. ${data.totalHijos > 1 ? `Este padre ya tiene ${data.totalHijos - 1} hijo(s) registrado(s).` : ''}`);
        } else if (tipo === 'madre' && datosEncontrados.nombre_madre) {
          setFormData(prev => ({
            ...prev,
            nombre_madre: datosEncontrados.nombre_madre || prev.nombre_madre,
            apellido_madre: datosEncontrados.apellido_madre || prev.apellido_madre,
            ci_madre: datosEncontrados.ci_madre || prev.ci_madre,
            tipo_ci_madre: datosEncontrados.tipo_ci_madre || prev.tipo_ci_madre || 'ci',
            extension_ci_madre: datosEncontrados.extension_ci_madre || prev.extension_ci_madre,
            profesion_madre: datosEncontrados.profesion_madre || prev.profesion_madre,
            lugar_trabajo_madre: datosEncontrados.lugar_trabajo_madre || prev.lugar_trabajo_madre,
            telefono_domicilio_madre: datosEncontrados.telefono_domicilio_madre || prev.telefono_domicilio_madre,
            telefono_oficina_madre: datosEncontrados.telefono_oficina_madre || prev.telefono_oficina_madre,
            // También autocompletar datos del padre si existen
            nombre_padre: datosEncontrados.nombre_padre || prev.nombre_padre,
            apellido_padre: datosEncontrados.apellido_padre || prev.apellido_padre,
            ci_padre: datosEncontrados.ci_padre || prev.ci_padre,
            tipo_ci_padre: datosEncontrados.tipo_ci_padre || prev.tipo_ci_padre || 'ci',
            extension_ci_padre: datosEncontrados.extension_ci_padre || prev.extension_ci_padre,
            profesion_padre: datosEncontrados.profesion_padre || prev.profesion_padre,
            lugar_trabajo_padre: datosEncontrados.lugar_trabajo_padre || prev.lugar_trabajo_padre,
            telefono_domicilio_padre: datosEncontrados.telefono_domicilio_padre || prev.telefono_domicilio_padre,
            telefono_oficina_padre: datosEncontrados.telefono_oficina_padre || prev.telefono_oficina_padre,
            // Dirección y autorizados
            direccion: datosEncontrados.direccion || prev.direccion,
            nombre_autorizado1: datosEncontrados.nombre_autorizado1 || prev.nombre_autorizado1,
            telefono_autorizado1: datosEncontrados.telefono_autorizado1 || prev.telefono_autorizado1,
            nombre_autorizado2: datosEncontrados.nombre_autorizado2 || prev.nombre_autorizado2,
            telefono_autorizado2: datosEncontrados.telefono_autorizado2 || prev.telefono_autorizado2
          }));
          showSuccess('✅ Datos encontrados', `Se completaron automáticamente los datos del padre/madre. ${data.totalHijos > 1 ? `Este padre ya tiene ${data.totalHijos - 1} hijo(s) registrado(s).` : ''}`);
        } else {
          showError('No se encontraron datos', 'El CI fue encontrado pero no tiene datos del padre/madre correspondiente.');
        }
      } else {
        showError('No encontrado', data.mensaje || 'No se encontró ningún padre/madre con ese CI en el sistema.');
      }
    } catch (error) {
      console.error('Error buscando datos del padre por CI:', error);
      showError('Error de conexión', 'No se pudo conectar con el servidor para buscar los datos.');
    }
  };

  const confirmUpdate = async () => {
    if (pendingSubmit && editingInscripto) {
      try {
        const token = localStorage.getItem('token');
        const url = `${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes/${editingInscripto.id}`;
        const response = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        const data = await response.json();
        if (data.ok) {
          const nombreActualizado = `${formData.nombre || ''} ${formData.apellido_paterno || ''} ${formData.apellido_materno || ''}`.trim();
          const mensajeActualizacion = nombreActualizado
            ? `Los cambios del estudiante ${nombreActualizado} fueron actualizados correctamente.`
            : 'Los cambios del estudiante fueron actualizados correctamente.';
          showSuccess('Estudiante actualizado', mensajeActualizacion, { autoClose: false });
          setActualizacionConfirmMessage(mensajeActualizacion);
          setShowActualizacionConfirmModal(true);
          setShowUpdateModal(false);
          setPendingSubmit(false);
          cerrarModal();
          cargarInscriptos();
        } else {
          showError('Error al actualizar', 'Error al actualizar estudiante: ' + (data.message || 'Error desconocido'));
        }
      } catch (error) {
        console.error('Error en confirmUpdate:', error);
        showError('Error de conexión', 'Error de conexión al actualizar estudiante. Verifique su conexión a internet y que el servidor esté funcionando.');
      }
    }
  };

  const cancelUpdate = () => {
    setShowUpdateModal(false);
    setPendingSubmit(false);
  };

  const eliminarInscripto = id => {
    setInscriptoToDelete(id);
    setShowDeleteModal(true);
  };

  const abrirModalRetiro = (inscripto) => {
    setInscriptoToRetirar(inscripto);
    setRetiroMotivo('');
    if (!retiroEstadoId && estadosEstudiante.length > 0) {
      const estadoRetirado = estadosEstudiante.find((e) => String(e.nombre || '').toLowerCase() === 'retirado');
      setRetiroEstadoId(String((estadoRetirado || estadosEstudiante[0]).id));
    }
    setShowRetiroModal(true);
  };

  const confirmarRetiro = async () => {
    if (!inscriptoToRetirar) return;
    if (!retiroEstadoId) {
      showError('Seleccione un estado', 'Debe seleccionar el nuevo estado del estudiante.');
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/inscripciones/retirar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estudiante_id: inscriptoToRetirar.id,
          gestion_academica: selectedYear,
          estado_id: Number(retiroEstadoId),
          motivo: retiroMotivo
        })
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        showError('No se pudo dar de baja', data.message || 'Error desconocido');
        return;
      }
      showSuccess('Estado actualizado', data.message || 'El estado del estudiante fue actualizado correctamente.');
      setShowRetiroModal(false);
      setInscriptoToRetirar(null);
      cargarInscriptos();
    } catch (error) {
      console.error('Error al marcar retiro:', error);
      showError('Error de conexión', 'No se pudo registrar la baja. Verifique conexión y servidor.');
    }
  };

  const confirmDelete = async () => {
    if (inscriptoToDelete) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes/${inscriptoToDelete}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.ok) {
          const mensaje = data.eliminado 
            ? `Estudiante "${data.eliminado.estudiante}" y todos sus datos relacionados eliminados exitosamente:\n\n${data.eliminado.datos_eliminados.map(d => `• ${d}`).join('\n')}`
            : 'Estudiante y todos sus datos relacionados eliminados exitosamente';
          showSuccess('Eliminación Completa', mensaje);
          cargarInscriptos();
        } else {
          showError('Error al eliminar', 'Error al eliminar estudiante: ' + (data.message || 'Error desconocido'));
        }
      } catch (error) {
        console.error('Error en confirmDelete:', error);
        showError('Error de conexión', 'Error de conexión al eliminar estudiante. Verifique su conexión a internet y que el servidor esté funcionando.');
      }
      setShowDeleteModal(false);
      setInscriptoToDelete(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setInscriptoToDelete(null);
  };

  // Funciones para el modal de preinscripción
  const abrirModalPreinscripcion = () => {
    setShowPreinscripcionModal(true);
    setEstudianteSeleccionado(null);
    setBusquedaEstudiante('');
    setInscripcionExistente(null);
    setSugerenciasAgente([]);
    setSugerenciasEstudiantes([]);
    setMostrarSugerencias(false);
    setFormPreinscripcion({
      nivel_id: '',
      curso_id: '',
      bloque_id: '',
      turno: '',
      hora_inicio: '',
      hora_fin: '',
      fecha_inscripcion: new Date().toISOString().split('T')[0],
      id_beca: '',
      meses_beca: [],
      gestion_academica: new Date().getFullYear()
    });
  };

  const cerrarModalPreinscripcion = () => {
    setShowPreinscripcionModal(false);
    setEstudianteSeleccionado(null);
    setBusquedaEstudiante('');
    setSugerenciasEstudiantes([]);
    setMostrarSugerencias(false);
    setInscripcionExistente(null);
    setSugerenciasAgente([]);
    // Limpiar formulario de preinscripción
    setFormPreinscripcion({
      nivel_id: '',
      curso_id: '',
      bloque_id: '',
      turno: '',
      hora_inicio: '',
      hora_fin: '',
      fecha_inscripcion: '',
      id_beca: '',
      meses_beca: [],
      gestion_academica: new Date().getFullYear()
    });
  };

  const seleccionarEstudiante = async (estudiante) => {
    try {
      const token = localStorage.getItem('token');
      const gestionObjetivo = parseInt(formPreinscripcion.gestion_academica, 10) || new Date().getFullYear();

      const response = await fetch(
        `${BACKEND_PRINCIPAL_ORIGIN}/api/inscripciones/estado-actual/${estudiante.id}?anio=${gestionObjetivo}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (response.ok) {
        const data = await response.json();

        if (data.tiene_inscripcion) {
          const inscripcion = data.inscripcion;
          // Guardar la información de la inscripción existente para mostrarla en el modal
          setInscripcionExistente({
            estudiante: estudiante,
            inscripcion: inscripcion,
            gestion: gestionObjetivo
          });

          const fechaFormateada = inscripcion.fecha_inscripcion
            ? new Date(inscripcion.fecha_inscripcion).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })
            : 'Fecha no disponible';

          showError(
            'Inscripción existente',
            `⚠️ ${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''} ya cuenta con una inscripción para la gestión ${gestionObjetivo}.\n\n` +
            `📅 Fecha de inscripción: ${fechaFormateada}\n` +
            `${inscripcion.nivel_nombre ? `📚 Nivel: ${inscripcion.nivel_nombre}\n` : ''}` +
            `${inscripcion.curso_nombre ? `📖 Curso: ${inscripcion.curso_nombre}\n` : ''}` +
            `${inscripcion.bloque_nombre ? `🏫 Bloque: ${inscripcion.bloque_nombre}` : ''}`
          );

          setEstudianteSeleccionado(null);
          setBusquedaEstudiante('');
          setSugerenciasEstudiantes([]);
          setMostrarSugerencias(false);
          return;
        } else {
          // No hay inscripción existente, limpiar el estado
          setInscripcionExistente(null);
        }
      } else {
        console.error('Error al verificar inscripción actual:', await response.text());
      }
    } catch (error) {
      console.error('Error al verificar inscripción actual:', error);
      showError('Error', 'No se pudo verificar la inscripción actual del estudiante. Intente nuevamente.');
      return;
    }

    setEstudianteSeleccionado(estudiante);
    setBusquedaEstudiante(`${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''}`);
    setMostrarSugerencias(false);
    setInscripcionExistente(null);
    setSugerenciasAgente([]);

    // Obtener sugerencias del agente inteligente
    cargarSugerenciasAgente(estudiante.id);
  };

  // Función para cargar sugerencias del agente
  const cargarSugerenciasAgente = async (estudianteId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/ai-admin/sugerencias-preinscripcion/${estudianteId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.ok && data.sugerencias && data.sugerencias.length > 0) {
        setSugerenciasAgente(data.sugerencias);

        // Auto-completar campos si hay sugerencias
        if (data.siguiente_nivel) {
          setFormPreinscripcion(prev => ({
            ...prev,
            nivel_id: data.siguiente_nivel.id.toString()
          }));
        }

        // Aplicar sugerencias de turno y beca
        data.sugerencias.forEach(sug => {
          if (sug.tipo === 'turno' && sug.valor) {
            setFormPreinscripcion(prev => ({
              ...prev,
              turno: sug.valor
            }));
          }
          if (sug.tipo === 'beca' && sug.valor) {
            setFormPreinscripcion(prev => ({
              ...prev,
              id_beca: sug.valor.toString()
            }));
          }
        });
      } else {
        setSugerenciasAgente([]);
      }
    } catch (error) {
      console.error('Error al cargar sugerencias del agente:', error);
      setSugerenciasAgente([]);
    }
  };

  const limpiarEstudiante = () => {
    setEstudianteSeleccionado(null);
    setBusquedaEstudiante('');
    setSugerenciasEstudiantes([]);
    setMostrarSugerencias(false);
    setInscripcionExistente(null);
    setSugerenciasAgente([]);
  };

  const handleChangePreinscripcion = (e) => {
    const { name, value } = e.target;
    setFormPreinscripcion(prev => {
      const newForm = { ...prev, [name]: value };

      if (name === 'bloque_id') {
        newForm.nivel_id = '';
        newForm.curso_id = '';
        newForm.turno = '';
        newForm.hora_inicio = '';
        newForm.hora_fin = '';
      }

      if (name === 'nivel_id') {
        newForm.curso_id = '';
        newForm.turno = '';
        newForm.hora_inicio = '';
        newForm.hora_fin = '';
      }

      if (name === 'curso_id') {
        const cursoSeleccionado = cursos.find(c => String(c.id) === String(value));
        newForm.turno = cursoSeleccionado?.turno || '';
        newForm.hora_inicio = cursoSeleccionado?.hora_inicio || '';
        newForm.hora_fin = cursoSeleccionado?.hora_fin || '';
      }

      // Si se cambia la beca, limpiar los meses seleccionados
      if (newForm.id_beca !== prev.id_beca) {
        newForm.meses_beca = [];
      }

      return newForm;
    });
  };

  const handleMesesBecaChange = (mes) => {
    setFormPreinscripcion(prev => {
      const mesesActuales = [...prev.meses_beca];
      if (mesesActuales.includes(mes)) {
        // Remover mes si ya está seleccionado
        const mesesFiltrados = mesesActuales.filter(m => m !== mes);
        return { ...prev, meses_beca: ordenarMesesCronologicamente(mesesFiltrados) };
      } else {
        // Agregar mes si no está seleccionado y ordenar cronológicamente
        const mesesNuevos = [...mesesActuales, mes];
        return { ...prev, meses_beca: ordenarMesesCronologicamente(mesesNuevos) };
      }
    });
  };

  const seleccionarTodosLosMeses = () => {
    setFormPreinscripcion(prev => ({
      ...prev,
      meses_beca: [...getMesesDisponibles()]
    }));
  };

  const limpiarSeleccionMeses = () => {
    setFormPreinscripcion(prev => ({
      ...prev,
      meses_beca: []
    }));
  };



  // Función para calcular el previo del compromiso
  const calcularPrevio = () => {
    const nivelSeleccionado = niveles.find(n => n.id == formPreinscripcion.nivel_id);
    const becaSeleccionada = becas.find(b => b.id == formPreinscripcion.id_beca);

    if (!nivelSeleccionado) {
      setCalculoPrevio({
        precioNivel: 0,
        cuotaMensual: 0,
        mesesConDescuento: [],
        mesesSinDescuento: [],
        totalConDescuento: 0,
        totalSinDescuento: 0,
        totalCuotas: 0,
        totalGeneral: 0
      });
      return;
    }

    const precioNivel = Number(nivelSeleccionado.precio);
    // Meses disponibles según el nivel seleccionado
    const todosLosMeses = getMesesDisponibles();
    const cuotaMensual = precioNivel / todosLosMeses.length; // Dividir según la duración real del nivel
    const descuentoPorcentaje = becaSeleccionada ? Number(becaSeleccionada.descuento) / 100 : 0;

    // Separar meses con y sin descuento
    const mesesConDescuento = formPreinscripcion.meses_beca.filter(mes => todosLosMeses.includes(mes));
    const mesesSinDescuento = todosLosMeses.filter(mes => !formPreinscripcion.meses_beca.includes(mes));

    // Calcular totales
    const totalConDescuento = mesesConDescuento.length * (cuotaMensual * (1 - descuentoPorcentaje));
    const totalSinDescuento = mesesSinDescuento.length * cuotaMensual;
    const totalCuotas = totalConDescuento + totalSinDescuento;
    const totalGeneral = totalCuotas;

    setCalculoPrevio({
      precioNivel,
      cuotaMensual,
      mesesConDescuento,
      mesesSinDescuento,
      totalConDescuento,
      totalSinDescuento,
      totalCuotas,
      totalGeneral
    });
  };

  const handleSubmitPreinscripcion = async (e) => {
    e.preventDefault();

    if (!estudianteSeleccionado) {
      showError('Error', 'Debe seleccionar un estudiante');
      return;
    }

    if (!formPreinscripcion.nivel_id || !formPreinscripcion.curso_id || !formPreinscripcion.bloque_id) {
      showError('Error', 'Debe completar nivel, curso y bloque');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = `${BACKEND_PRINCIPAL}/inscripciones`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          estudiante_id: estudianteSeleccionado.id,
          nivel_id: formPreinscripcion.nivel_id,
          curso_id: formPreinscripcion.curso_id,
          bloque_id: formPreinscripcion.bloque_id,
          turno: formPreinscripcion.turno,
          fecha_inscripcion: formPreinscripcion.fecha_inscripcion,
          id_beca: formPreinscripcion.id_beca || null,
          meses_beca: formPreinscripcion.meses_beca.length > 0 ? formPreinscripcion.meses_beca.join(',') : null,
          estado: 'activo',
          gestion_academica: formPreinscripcion.gestion_academica
        })
      });
      const data = await response.json();

      // Verificar si es una respuesta offline (guardada para sincronización)
      if (response.status === 202 && data.offline && data.saved) {
        showSuccess('Nueva inscripción guardada', data.message || 'Se guardó correctamente. Se sincronizará automáticamente cuando vuelva la conexión.');
        cerrarModalPreinscripcion();
        // No recargar la lista porque aún no está en el servidor
        return; // Salir temprano para evitar procesamiento adicional
      }

      if (data.ok) {
        const nombrePreinscrito = `${estudianteSeleccionado?.nombre || ''} ${estudianteSeleccionado?.apellido_paterno || ''} ${estudianteSeleccionado?.apellido_materno || ''}`.trim();
        showSuccess(
          'Nueva inscripción exitosa',
          nombrePreinscrito
            ? `El estudiante ${nombrePreinscrito} fue inscrito correctamente en la gestión ${formPreinscripcion.gestion_academica}.`
            : 'Estudiante inscrito en el nuevo curso exitosamente',
          { autoClose: false }
        );
        // Generar automáticamente PDFs: Formulario de Inscripción y Plan de Pagos
        try {
          await generarPDFFormularioInscripcionPorGestion(estudianteSeleccionado.id, formPreinscripcion.gestion_academica);
          generarPlanPagosPDF(estudianteSeleccionado, formPreinscripcion, calculoPrevio);
        } catch (pdfErr) {
          console.error('Error generando PDFs post-preinscripción:', pdfErr);
        }
        cerrarModalPreinscripcion();
        cargarInscriptos();
      } else {
        // Si hay una inscripción existente, mostrar mensaje más detallado
        if (data.inscripcion_existente) {
          const inscripcion = data.inscripcion_existente;
          const fechaFormateada = new Date(inscripcion.fecha).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          });
          showError(
            'Inscripción Duplicada',
            `⚠️ El estudiante ya cuenta con una inscripción para esta gestión.\n\n` +
            `📅 Fecha de inscripción: ${fechaFormateada}\n` +
            `${inscripcion.nivel ? `📚 Nivel: ${inscripcion.nivel}` : ''}\n` +
            `${inscripcion.curso ? `📖 Curso: ${inscripcion.curso}` : ''}\n\n` +
            `No se puede registrar otra inscripción en la misma gestión.`
          );
        } else {
          showError('Error al inscribir', data.message || 'Error al registrar la nueva inscripción. Por favor, intente nuevamente.');
        }
      }
    } catch (error) {
      // Si el error es de conexión, puede que se haya guardado offline
      // El offlineFetch debería haberlo manejado, pero por si acaso verificamos
      if (error.message && (
        error.message.includes('Failed to fetch') ||
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.name === 'TypeError'
      )) {
        // Puede que se haya guardado offline, mostrar mensaje apropiado
        showError('Error de conexión', 'No se pudo conectar al servidor. Si el sistema está offline, la nueva inscripción se guardará automáticamente cuando vuelva la conexión.');
      } else {
        console.error('Error en handleSubmitPreinscripcion:', error);
        showError('Error de conexión', 'Error de conexión al registrar la nueva inscripción. Verifique su conexión a internet y que el servidor esté funcionando.');
      }
    }
  };

  // Genera Formulario de Inscripción para una gestión específica (post-preinscripción)
  const generarPDFFormularioInscripcionPorGestion = async (estudianteId, gestion) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes/${estudianteId}?anio=${gestion}&incluir_concluidos=1`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      let data = null;
      try {
        data = await response.json();
      } catch (_) { }
      // Fallback si la respuesta no es OK: usar datos del estado actual
      if (!response.ok || !data) {
        data = {
          nombre: estudianteSeleccionado?.nombre || '',
          apellido_paterno: estudianteSeleccionado?.apellido_paterno || '',
          apellido_materno: estudianteSeleccionado?.apellido_materno || '',
          ci_estudiante: estudianteSeleccionado?.ci_estudiante || '',
          genero: estudianteSeleccionado?.genero || '',
          codigo_estudiante: estudianteSeleccionado?.codigo_estudiante || '',
          nivel_nombre: '',
          curso_nombre: '',
          bloque_nombre: '',
          turno: formPreinscripcion?.turno || '',
          fecha_inscripcion: formPreinscripcion?.fecha_inscripcion || '',
          // Campos adicionales para secciones Padre/Madre/Autorizados/Salud (fallback)
          nombre_padre: '',
          apellido_padre: '',
          ci_padre: '',
          tipo_ci_padre: '',
          extension_ci_padre: '',
          profesion_padre: '',
          lugar_trabajo_padre: '',
          telefono_domicilio_padre: '',
          telefono_oficina_padre: '',
          nombre_madre: '',
          apellido_madre: '',
          ci_madre: '',
          tipo_ci_madre: '',
          extension_ci_madre: '',
          profesion_madre: '',
          lugar_trabajo_madre: '',
          telefono_domicilio_madre: '',
          telefono_oficina_madre: '',
          nombre_autorizado1: '',
          telefono_autorizado1: '',
          nombre_autorizado2: '',
          telefono_autorizado2: '',
          seguro_medico: '',
          alergias: '',
          vacunas: ''
        };
      }
      // Completar nombres de nivel/curso/bloque desde selecciones si faltan
      const nivelNombre = data.nivel_nombre || data.nivel || (niveles.find(n => String(n.id) === String(formPreinscripcion?.nivel_id))?.nombre || '');
      const cursoNombre = data.curso_nombre || (cursos.find(c => String(c.id) === String(formPreinscripcion?.curso_id))?.nombre || '');
      const bloqueNombre = data.bloque_nombre || (bloques.find(b => String(b.id) === String(formPreinscripcion?.bloque_id))?.descripcion || '');
      const turnoFinal = data.turno || formPreinscripcion?.turno || '';
      // Si faltan datos de Padre/Madre/Autorizados/Salud, intentar obtener perfil completo del estudiante
      try {
        const sinFamilia = !data.nombre_padre && !data.apellido_padre && !data.ci_padre &&
          !data.nombre_madre && !data.apellido_madre && !data.ci_madre &&
          !data.nombre_autorizado1 && !data.telefono_autorizado1 &&
          !data.seguro_medico && !data.alergias && !data.vacunas;
        if (sinFamilia) {
          const respPerfil = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes/${estudianteId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (respPerfil.ok) {
            const perfil = await respPerfil.json();
            // Importante: el perfil completo debe sobrescribir los valores vacíos del fallback
            // para que aparezcan nombre completo, CI, teléfonos y autorizados.
            data = { ...data, ...perfil };
          }
        }
      } catch (_) { }

      const bloqueMatch = bloques.find(b => String(b.id) === String(formPreinscripcion?.bloque_id) || b.descripcion === bloqueNombre);
      let logoUrl = '/src/assets/img/logo.jpg';
      if (bloqueMatch && bloqueMatch.logo_url) {
        logoUrl = bloqueMatch.logo_url.startsWith('http')
          ? bloqueMatch.logo_url
          : BACKEND_PRINCIPAL_ORIGIN + (bloqueMatch.logo_url.startsWith('/') ? bloqueMatch.logo_url : '/' + bloqueMatch.logo_url);
      }

      let logoBase64 = null;
      try { 
        logoBase64 = await getImageBase64(logoUrl); 
      } catch { 
        try { logoBase64 = await getImageBase64('/src/assets/img/logo.jpg'); } catch { }
      }
      const doc = new jsPDF();
      if (logoBase64) doc.addImage(logoBase64, 'JPEG', 89, 8, 32, 20);
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 28, 170, 14, 'F');
      doc.setFontSize(14);
      doc.text('FORMULARIO DE INSCRIPCIÓN', 105, 35, { align: 'center' });
      doc.setFontSize(9);
      const gestionTexto = gestion || formPreinscripcion?.gestion_academica || new Date().getFullYear();
      doc.text(`Gestión ${gestionTexto}`, 105, 41, { align: 'center' });
      // Detalle académico (igual que botón Generar PDF)
      doc.setFontSize(7);
      const detalleAcademico = `Nivel: ${nivelNombre || 'Sin nivel'} • Curso: ${cursoNombre || 'Sin curso'} • Bloque: ${bloqueNombre || 'Sin bloque'} • Turno: ${turnoFinal || 'Sin turno'}`;
      doc.text(detalleAcademico, 105, 46, { align: 'center' });
      doc.line(20, 50, 190, 50);
      let yPosition = 57;
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('DATOS DEL ESTUDIANTE', 20, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);
      yPosition += 6;
      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Nombre Completo', `${data.nombre} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`],
          ['C.I. del Estudiante', data.ci_estudiante || ''],
          ['Género', data.genero || ''],
          ['Código Estudiante', data.codigo_estudiante || ''],
          ['Nivel', nivelNombre || ''],
          ['Curso', cursoNombre || ''],
          ['Bloque', bloqueNombre || ''],
          ['Turno', turnoFinal || ''],
          ['Fecha de Inscripción', data.fecha_inscripcion ? data.fecha_inscripcion.split('T')[0] : '']
        ],
        theme: 'grid', styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 }, tableWidth: 190, rowMinHeight: 4
      });
      // Secciones adicionales: Padre, Madre, Personas Autorizadas, Salud y Firmas
      yPosition = doc.lastAutoTable.finalY + 2;
      // Datos del Padre
      yPosition += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('DATOS DEL PADRE', 10, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);
      yPosition += 4;
      const tipoPadreTxt =
        data.tipo_ci_padre === 'extranjero'
          ? 'Carnet Extranjero'
          : data.tipo_ci_padre === 'ci_extension'
            ? 'CI con Extensión (Bolivia)'
            : 'Carnet de Identidad';
      const extensionPadreTxt = data.tipo_ci_padre === 'ci_extension' ? (data.extension_ci_padre || '') : '';
      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Nombre Completo', `${data.nombre_padre || ''} ${data.apellido_padre || ''}`],
          ['C.I.', data.ci_padre || ''],
          ['Tipo de CI', tipoPadreTxt],
          ...(data.tipo_ci_padre === 'ci_extension' ? [['Extensión', extensionPadreTxt]] : []),
          ['Profesión', data.profesion_padre || ''],
          ['Lugar de Trabajo', data.lugar_trabajo_padre || ''],
          ['Teléfonos', `${data.telefono_domicilio_padre || ''} / ${data.telefono_oficina_padre || ''}`]
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });
      yPosition = doc.lastAutoTable.finalY + 2;
      // Datos de la Madre
      yPosition += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('DATOS DE LA MADRE', 10, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);
      yPosition += 4;
      const tipoMadreTxt =
        data.tipo_ci_madre === 'extranjero'
          ? 'Carnet Extranjero'
          : data.tipo_ci_madre === 'ci_extension'
            ? 'CI con Extensión (Bolivia)'
            : 'Carnet de Identidad';
      const extensionMadreTxt = data.tipo_ci_madre === 'ci_extension' ? (data.extension_ci_madre || '') : '';
      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Nombre Completo', `${data.nombre_madre || ''} ${data.apellido_madre || ''}`],
          ['C.I.', data.ci_madre || ''],
          ['Tipo de CI', tipoMadreTxt],
          ...(data.tipo_ci_madre === 'ci_extension' ? [['Extensión', extensionMadreTxt]] : []),
          ['Profesión', data.profesion_madre || ''],
          ['Lugar de Trabajo', data.lugar_trabajo_madre || ''],
          ['Teléfonos', `${data.telefono_domicilio_madre || ''} / ${data.telefono_oficina_madre || ''}`]
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });
      yPosition = doc.lastAutoTable.finalY + 2;
      // Personas Autorizadas
      yPosition += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('PERSONAS AUTORIZADAS', 10, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);
      yPosition += 4;
      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Autorizado 1', `${data.nombre_autorizado1 || ''} - ${data.telefono_autorizado1 || ''}`],
          ['Autorizado 2', `${data.nombre_autorizado2 || ''} - ${data.telefono_autorizado2 || ''}`]
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });
      yPosition = doc.lastAutoTable.finalY + 2;
      // Salud y Otros
      yPosition += 6;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('SALUD Y OTROS', 10, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);
      yPosition += 4;
      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Seguro Médico', data.seguro_medico || ''],
          ['Alergias', data.alergias || ''],
          ['Vacunas', data.vacunas || '']
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });
      yPosition = doc.lastAutoTable.finalY + 4;
      // Firmas
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('FIRMAS', 105, yPosition, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);
      yPosition += 6;
      doc.line(30, yPosition, 90, yPosition);
      doc.line(120, yPosition, 180, yPosition);
      doc.text('Firma del Tutor/Padre/Madre', 60, yPosition + 3, { align: 'center' });
      doc.text('Firma de la Unidad Educativa', 150, yPosition + 3, { align: 'center' });
      doc.save(`Formulario_Inscripcion_${data.nombre}_${gestionTexto}.pdf`);
    } catch (e) {
      console.error('Error al generar Formulario de Inscripción por gestión:', e);
    }
  };

  // Genera Plan de Pagos/Compromiso Económico basado en la preinscripción
  const generarPlanPagosPDF = async (estudiante, formPre, calculo) => {
    try {
      const doc = new jsPDF();
      
      const bloqueMatch = bloques.find(b => String(b.id) === String(formPre?.bloque_id));
      let logoUrl = '/src/assets/img/logo.jpg';
      if (bloqueMatch && bloqueMatch.logo_url) {
        logoUrl = bloqueMatch.logo_url.startsWith('http')
          ? bloqueMatch.logo_url
          : BACKEND_PRINCIPAL_ORIGIN + (bloqueMatch.logo_url.startsWith('/') ? bloqueMatch.logo_url : '/' + bloqueMatch.logo_url);
      }

      let logoBase64 = null;
      try {
        logoBase64 = await getImageBase64(logoUrl);
      } catch {
        try { logoBase64 = await getImageBase64('/src/assets/img/logo.jpg'); } catch { }
      }
      
      if (logoBase64) doc.addImage(logoBase64, 'JPEG', 89, 8, 32, 20);
      
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 28, 170, 14, 'F');
      doc.setFontSize(14);
      doc.text('PLAN DE PAGOS - COMPROMISO ECONÓMICO', 105, 35, { align: 'center' });
      doc.setFontSize(9);
      const gestionTexto = formPre?.gestion_academica || new Date().getFullYear();
      doc.text(`Gestión ${gestionTexto}`, 105, 41, { align: 'center' });
      // Detalle académico (igual que botón Generar PDF)
      doc.setFontSize(7);
      const nivelNombrePP = niveles.find(n => String(n.id) === String(formPre?.nivel_id))?.nombre || '';
      const cursoNombrePP = cursos.find(c => String(c.id) === String(formPre?.curso_id))?.nombre || '';
      const bloqueNombrePP = bloques.find(b => String(b.id) === String(formPre?.bloque_id))?.descripcion || '';
      const turnoPP = formPre?.turno || '';
      const detalleAcademicoPP = `Nivel: ${nivelNombrePP || 'Sin nivel'} • Curso: ${cursoNombrePP || 'Sin curso'} • Bloque: ${bloqueNombrePP || 'Sin bloque'} • Turno: ${turnoPP || 'Sin turno'}`;
      doc.text(detalleAcademicoPP, 105, 46, { align: 'center' });
      doc.line(20, 50, 190, 50);
      let y = 56;
      const becaSel = becas.find(b => String(b.id) === String(formPre?.id_beca));
      const bodyData = [
        ['Estudiante', `${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''}`],
        ['CI', estudiante.ci_estudiante || ''],
        ['Turno', formPre.turno || '']
      ];
      if (becaSel) {
        bodyData.push(['Beca', `${becaSel.descripcion} (${becaSel.descuento}%)`]);
        bodyData.push(['Meses con beca', (formPre.meses_beca || []).join(', ') || 'Ninguno']);
      }
      autoTable(doc, {
        startY: y,
        head: [['Campo', 'Detalle']],
        body: bodyData,
        theme: 'grid', styles: { fontSize: 6 }
      });
      y = doc.lastAutoTable.finalY + 6;
      const descuento = becaSel ? (becaSel.descuento || 0) : 0;
      const mesesCon = calculo.mesesConDescuento || [];
      const mesesSin = calculo.mesesSinDescuento || [];
      const filas = [];
      mesesCon.forEach(m => {
        const montoBase = calculo.cuotaMensual;
        const monto = Math.round(montoBase * (1 - descuento / 100) * 100) / 100;
        filas.push([m, `Bs ${montoBase.toFixed(2)}`, `${descuento}%`, `Bs ${monto.toFixed(2)}`]);
      });
      mesesSin.forEach(m => {
        const montoBase = calculo.cuotaMensual;
        filas.push([m, `Bs ${montoBase.toFixed(2)}`, '0%', `Bs ${montoBase.toFixed(2)}`]);
      });
      autoTable(doc, {
        startY: y,
        head: [['Mes', 'Monto Base', 'Descuento', 'Monto a Pagar']],
        body: filas,
        theme: 'grid', styles: { fontSize: 6 }
      });
      y = doc.lastAutoTable.finalY + 6;
      autoTable(doc, {
        startY: y,
        head: [['Concepto', 'Valor']],
        body: [
          ['Cuota mensual', `Bs ${calculo.cuotaMensual.toFixed(2)}`],
          ['Subtotal con descuento', `Bs ${calculo.totalConDescuento.toFixed(2)}`],
          ['Subtotal sin descuento', `Bs ${calculo.totalSinDescuento.toFixed(2)}`],
          ['Total cuotas', `Bs ${calculo.totalCuotas.toFixed(2)}`],
          ['Total general', `Bs ${calculo.totalGeneral.toFixed(2)}`]
        ],
        theme: 'grid', styles: { fontSize: 6 }
      });
      const firmasY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(8);
      doc.text('Firma del Padre/Madre/Tutor', 40, firmasY);
      doc.line(20, firmasY - 2, 90, firmasY - 2);
      doc.text('Firma de Administración', 140, firmasY);
      doc.line(120, firmasY - 2, 190, firmasY - 2);
      doc.save(`Plan_Pagos_${estudiante.nombre}_${gestionTexto}.pdf`);
    } catch (e) {
      console.error('Error al generar Plan de Pagos:', e);
    }
  };

  // Utilidad para convertir imagen a base64
  const getImageBase64 = (url) => {
    return new Promise((resolve, reject) => {
      const img = new window.Image();
      img.crossOrigin = 'Anonymous';
      img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        // Rellenar con blanco para evitar fondo negro en PNGs con transparencia
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg'));
      };
      img.onerror = function (err) {
        reject(err);
      };
      img.src = url;
    });
  };

  const generarPDF = async (inscripto) => {
    try {
      // Obtener todos los datos del estudiante desde el backend
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/estudiantes/${inscripto.id}?anio=${selectedYear}&incluir_concluidos=1`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        showError('Error al obtener datos', 'Error al obtener los datos del estudiante: ' + data.message);
        return;
      }
      // Preparar datos de gestión y detalle académico con fallbacks
      const gestionTexto = selectedYear || new Date().getFullYear();
      let finalNivel = data.nivel_nombre || data.nivel || '';
      let finalCurso = data.curso_nombre || '';
      let finalBloque = data.bloque_nombre || '';
      let finalTurno = data.turno || '';

      // Fallback adicional: si no hay datos académicos, consultar estado actual de inscripción por gestión
      if (!finalNivel && !finalCurso && !finalBloque) {
        try {
          const respIns = await fetch(
            `${BACKEND_PRINCIPAL_ORIGIN}/api/inscripciones/estado-actual/${inscripto.id}?anio=${gestionTexto}`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (respIns.ok) {
            const d2 = await respIns.json();
            if (d2.tiene_inscripcion && d2.inscripcion) {
              finalNivel = d2.inscripcion.nivel_nombre || finalNivel;
              finalCurso = d2.inscripcion.curso_nombre || finalCurso;
              finalBloque = d2.inscripcion.bloque_nombre || finalBloque;
              finalTurno = d2.inscripcion.turno || finalTurno;
            }
          }
        } catch (_) {
          // Ignorar errores en fallback
        }
      }
      // Cargar solo el logo a base64
      const bloqueMatch = bloques.find(b => String(b.id) === String(inscripto.bloque_id) || b.descripcion === finalBloque);
      let logoUrl = '/src/assets/img/logo.jpg';
      if (bloqueMatch && bloqueMatch.logo_url) {
        logoUrl = bloqueMatch.logo_url.startsWith('http')
          ? bloqueMatch.logo_url
          : BACKEND_PRINCIPAL_ORIGIN + (bloqueMatch.logo_url.startsWith('/') ? bloqueMatch.logo_url : '/' + bloqueMatch.logo_url);
      }

      let logoBase64;
      try {
        logoBase64 = await getImageBase64(logoUrl);
      } catch (logoError) {
        try {
          logoBase64 = await getImageBase64('/src/assets/img/logo.jpg');
        } catch (svgError) {
          // Continuar sin logo si hay error
          logoBase64 = null;
        }
      }

      const doc = new jsPDF();

      // Insertar logo centrado arriba, ancho 32 y altura 20 (solo si se cargó correctamente)
      if (logoBase64) {
        doc.addImage(logoBase64, 'JPEG', 89, 8, 32, 20);
      }
      // Fondo blanco semitransparente para el título
      doc.setFillColor(255, 255, 255);
      doc.rect(20, 28, 170, 14, 'F');
      // Configurar fuente y tamaños (más compacto)
      doc.setFontSize(14);
      doc.text('FORMULARIO DE INSCRIPCIÓN', 105, 35, { align: 'center' });
      doc.setFontSize(9);
      doc.text('Unidad Educativa', 105, 41, { align: 'center' });
      // Añadir Gestión y detalle académico en encabezado
      doc.setFontSize(8);
      doc.text(`Gestión ${gestionTexto}`, 105, 46, { align: 'center' });
      doc.setFontSize(7);
      const detalleAcademico = `Nivel: ${finalNivel || 'Sin nivel'} • Curso: ${finalCurso || 'Sin curso'} • Bloque: ${finalBloque || 'Sin bloque'} • Turno: ${finalTurno || 'Sin turno'}`;
      doc.text(detalleAcademico, 105, 51, { align: 'center' });
      // Línea separadora
      doc.line(20, 55, 190, 55);
      let yPosition = 62;

      // Datos del Estudiante
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('DATOS DEL ESTUDIANTE', 20, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(7);

      yPosition += 6;

      // Tabla de datos del estudiante (muy compacta)
      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Nombre Completo', `${data.nombre} ${data.apellido_paterno || ''} ${data.apellido_materno || ''}`],
          ['C.I. del Estudiante', data.ci_estudiante || ''],
          ['Género', data.genero || ''],
          ['Código Estudiante', data.codigo_estudiante || ''],
          ['Nivel', finalNivel || ''],
          ['Curso', finalCurso || ''],
          ['Bloque', finalBloque || ''],
          ['Fecha de Nacimiento', data.fecha_nacimiento ? data.fecha_nacimiento.split('T')[0] : ''],
          ['Lugar de Nacimiento', data.lugar_nacimiento || ''],
          ['Dirección', data.direccion || ''],
          ['Turno', finalTurno || ''],
          ['Fecha de Inscripción', data.fecha_inscripcion ? data.fecha_inscripcion.split('T')[0] : '']
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });

      yPosition = doc.lastAutoTable.finalY + 2;

      // Datos del Padre (muy compacto)
      yPosition += 6; // Espacio extra antes del título
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('DATOS DEL PADRE', 10, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);

      yPosition += 4;

      const tipoPadreTxt =
        data.tipo_ci_padre === 'extranjero'
          ? 'Carnet Extranjero'
          : data.tipo_ci_padre === 'ci_extension'
            ? 'CI con Extensión (Bolivia)'
            : 'Carnet de Identidad';
      const extensionPadreTxt = data.tipo_ci_padre === 'ci_extension' ? (data.extension_ci_padre || '') : '';

      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Nombre Completo', `${data.nombre_padre || ''} ${data.apellido_padre || ''}`],
          ['C.I.', data.ci_padre || ''],
          ['Tipo de CI', tipoPadreTxt],
          ...(data.tipo_ci_padre === 'ci_extension' ? [['Extensión', extensionPadreTxt]] : []),
          ['Profesión', data.profesion_padre || ''],
          ['Lugar de Trabajo', data.lugar_trabajo_padre || ''],
          ['Teléfonos', `${data.telefono_domicilio_padre || ''} / ${data.telefono_oficina_padre || ''}`]
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });

      yPosition = doc.lastAutoTable.finalY + 2;

      // Datos de la Madre (muy compacto)
      yPosition += 6; // Espacio extra antes del título
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('DATOS DE LA MADRE', 10, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);

      yPosition += 4;

      const tipoMadreTxt =
        data.tipo_ci_madre === 'extranjero'
          ? 'Carnet Extranjero'
          : data.tipo_ci_madre === 'ci_extension'
            ? 'CI con Extensión (Bolivia)'
            : 'Carnet de Identidad';
      const extensionMadreTxt = data.tipo_ci_madre === 'ci_extension' ? (data.extension_ci_madre || '') : '';

      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Nombre Completo', `${data.nombre_madre || ''} ${data.apellido_madre || ''}`],
          ['C.I.', data.ci_madre || ''],
          ['Tipo de CI', tipoMadreTxt],
          ...(data.tipo_ci_madre === 'ci_extension' ? [['Extensión', extensionMadreTxt]] : []),
          ['Profesión', data.profesion_madre || ''],
          ['Lugar de Trabajo', data.lugar_trabajo_madre || ''],
          ['Teléfonos', `${data.telefono_domicilio_madre || ''} / ${data.telefono_oficina_madre || ''}`]
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });

      yPosition = doc.lastAutoTable.finalY + 2;

      // Personas Autorizadas (muy compacto)
      yPosition += 6; // Espacio extra antes del título
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('PERSONAS AUTORIZADAS', 10, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);

      yPosition += 4;

      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Autorizado 1', `${data.nombre_autorizado1 || ''} - ${data.telefono_autorizado1 || ''}`],
          ['Autorizado 2', `${data.nombre_autorizado2 || ''} - ${data.telefono_autorizado2 || ''}`]
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });

      yPosition = doc.lastAutoTable.finalY + 2;

      // Salud y Otros (muy compacto)
      yPosition += 6; // Espacio extra antes del título
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('SALUD Y OTROS', 10, yPosition);
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);

      yPosition += 4;

      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Seguro Médico', data.seguro_medico || ''],
          ['Alergias', data.alergias || ''],
          ['Vacunas', data.vacunas || '']
        ],
        theme: 'grid',
        styles: { fontSize: 5, cellPadding: 1 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold', fontSize: 5 },
        margin: { left: 10, right: 10 },
        tableWidth: 190,
        rowMinHeight: 4
      });

      yPosition = doc.lastAutoTable.finalY + 4;

      // Sección de Firmas (más compacta)
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');
      doc.text('FIRMAS', 105, yPosition, { align: 'center' });
      doc.setFont(undefined, 'normal');
      doc.setFontSize(5);

      yPosition += 6;

      // Líneas para firmas
      doc.line(30, yPosition, 90, yPosition); // Línea para firma del tutor/padre/madre
      doc.line(120, yPosition, 180, yPosition); // Línea para firma de la unidad

      doc.text('Firma del Tutor/Padre/Madre', 60, yPosition + 3, { align: 'center' });
      doc.text('Firma de la Unidad Educativa', 150, yPosition + 3, { align: 'center' });

      // Información adicional (más compacta)
      yPosition += 8;
      doc.setFontSize(4);
      doc.text(`Documento generado el: ${new Date().toLocaleDateString('es-ES')}`, 10, yPosition);
      doc.text(`ID de Inscripción: ${data.id}`, 10, yPosition + 2);

      // Generar el PDF como blob
      const pdfBlob = doc.output('blob');

      // Descargar automáticamente el PDF
      doc.save(`Inscripcion_${data.nombre}_${data.apellido_paterno}_${data.apellido_materno}.pdf`);

      // Guardar el blob del PDF para WhatsApp
      setPdfBlob(pdfBlob);
      setSelectedInscripto(data);

      return pdfBlob;
    } catch (error) {
      console.error('Error al generar PDF:', error);
      showError('Error al generar PDF', 'Error al generar el PDF. Verifica la consola para más detalles.');
      return null;
    }
  };

  // Función para abrir modal de WhatsApp
  const abrirWhatsAppModal = async (inscripto) => {
    const pdfPath = await generarPDF(inscripto);
    if (pdfPath) {
      setWhatsappModalOpen(true);
    }
  };

  // Función para cerrar modal de WhatsApp
  const cerrarWhatsAppModal = () => {
    setWhatsappModalOpen(false);
    setSelectedInscripto(null);
    setPdfBlob(null);
  };

  // Funciones para el menú hamburguesa
  const cerrarMenuHamburguesa = () => {
    setMenuHamburguesaVisible(false);
  };

  // Navegación móvil no utilizada aquí; se gestiona por menú hamburguesa

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
  };

  // Función para eliminar todas las inscripciones del año 2026 en adelante
  const handleEliminarInscripciones2026 = async () => {
    // Confirmación doble para evitar eliminaciones accidentales
    const confirmacion1 = window.confirm(
      '⚠️ ADVERTENCIA: Esta acción eliminará TODAS las inscripciones del año 2026 en adelante, incluyendo:\n\n' +
      '• Todas las inscripciones del 2026, 2027, 2028, etc.\n' +
      '• Todos los compromisos económicos asociados\n' +
      '• Todos los pagos mensuales asociados\n\n' +
      'Esta acción NO se puede deshacer.\n\n' +
      '¿Está seguro de continuar?'
    );

    if (!confirmacion1) {
      return;
    }

    const confirmacion2 = window.confirm(
      '⚠️ ÚLTIMA CONFIRMACIÓN\n\n' +
      'Está a punto de eliminar permanentemente todas las inscripciones del año 2026 en adelante.\n\n' +
      '¿Desea continuar?'
    );

    if (!confirmacion2) {
      return;
    }

    const confirmacionTexto = window.prompt(
      'Para confirmar, escriba exactamente: ELIMINAR 2026'
    );

    if (confirmacionTexto !== 'ELIMINAR 2026') {
      showError('Eliminación cancelada. El texto no coincide.');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${BACKEND_PRINCIPAL_ORIGIN}/api/inscripciones/eliminar-por-anio/2026`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (response.ok && data.ok) {
        showSuccess(
          `✅ ${data.message}\n` +
          `Inscripciones eliminadas: ${data.eliminadas}\n` +
          `Compromisos eliminados: ${data.compromisos_eliminados || 0}`
        );
        // Recargar la lista
        cargarInscriptos(filtroActivo);
      } else {
        showError(data.message || 'Error al eliminar inscripciones');
      }
    } catch (error) {
      console.error('Error al eliminar inscripciones:', error);
      showError('Error al conectar con el servidor');
    }
  };

  if (loading) {
    return (
      <div className="container py-4">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin fa-2x text-primary"></i>
          <p className="mt-2">Cargando estudiantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <style>{`
        .estudiantes-table thead th {
          background-color: #0d6efd !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          border: 1px solid #0a58ca !important;
        }
        .estudiantes-table thead {
          background-color: #0d6efd !important;
        }
        .estudiantes-table thead tr {
          background-color: #0d6efd !important;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
      {/* Header con título y botón hamburguesa */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h2 className="mb-0">Estudiantes</h2>
          <button
            className="btn btn-outline-primary d-md-none"
            onClick={() => setMenuHamburguesaVisible(true)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '1.5rem',
              padding: '0.5rem'
            }}
          >
            <i className="fas fa-bars"></i>
          </button>
        </div>

        {/* Botones de acción */}
        <div className="d-flex flex-column flex-md-row gap-2">
          <button className="btn btn-primary" onClick={() => abrirModal()}>
            <i className="fas fa-plus me-2"></i> Nuevo Estudiante
          </button>
          {/* Ocultar botón de Nueva inscripción para el rol de Secretaria */}
          {userInfo?.rol !== 'Secretaria' && (
            <button className="btn btn-success" onClick={abrirModalPreinscripcion}>
              <i className="fas fa-user-plus me-2"></i> Nueva inscripción
            </button>
          )}
          <Link to="/reportes-inscripcion" className="btn btn-secondary">
            <i className="fas fa-chart-bar me-2"></i> Reportes
          </Link>

        </div>
        {/* Controles: selector de año y buscador */}
        <div className="row g-3 mt-3 align-items-end">
          <div className="col-12 col-md-3">
            <label className="form-label">Año</label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="col-12 col-md-7">
            <label className="form-label">Buscar</label>
            <input
              type="text"
              className="form-control"
              placeholder="Nombre, apellidos, CI o código"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-2 d-flex">
            <button
              className="btn btn-outline-primary mt-auto w-100"
              onClick={() => {
                if (typeof cargarInscriptos === 'function') {
                  cargarInscriptos(typeof filtroActivo !== 'undefined' ? filtroActivo : 'todos');
                } else if (typeof fetchEstudiantes === 'function') {
                  fetchEstudiantes();
                } else {
                  window.location.reload();
                }
              }}
            >
              <i className="fas fa-sync-alt me-2"></i>Actualizar
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}


      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Lista de Estudiantes
          </h6>
          <div className="badge bg-primary fs-6">
            {inscriptosFiltrados.length} estudiante{inscriptosFiltrados.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div className="card-body">
          {inscriptos.length === 0 ? (
            <div className="text-center py-4">
              <i className="fas fa-users fa-3x text-muted mb-3"></i>
              <p className="text-muted">No hay estudiantes registrados</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="estudiantes-table" style={{
                width: '100%',
                borderCollapse: 'collapse',
                backgroundColor: '#ffffff',
                border: '1px solid #dee2e6'
              }}>
                <thead style={{
                  position: 'sticky',
                  top: 0,
                  zIndex: 10
                }}>
                  <tr>
                    <th style={{
                      padding: '14px 10px',
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Código</th>
                    <th style={{
                      padding: '14px 10px',
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Nombre</th>
                    <th style={{
                      padding: '14px 10px',
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Apellido Paterno</th>
                    <th style={{
                      padding: '14px 10px',
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Apellido Materno</th>
                    <th style={{
                      padding: '14px 10px',
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>CI Estudiante</th>
                    <th style={{
                      padding: '14px 10px',
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Estado estudiante</th>
                    <th style={{
                      padding: '14px 10px',
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Acciones</th>
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: '#ffffff' }}>
                  {(() => {
                    // Calcular índices para la paginación
                    const indiceInicio = (paginaActual - 1) * itemsPorPagina;
                    const indiceFin = indiceInicio + itemsPorPagina;
                    const inscriptosPagina = inscriptosFiltrados.slice(indiceInicio, indiceFin);

                    return inscriptosPagina.map((inscripto, index) => (
                      <tr
                        key={`inscripto-${inscripto.id}-${index}`}
                        style={{
                          backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                          color: '#212529'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = '#e9ecef';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa';
                        }}
                      >
                        <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>{inscripto.codigo_estudiante}</td>
                        <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>{inscripto.nombre}</td>
                        <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>{inscripto.apellido_paterno}</td>
                        <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>{inscripto.apellido_materno}</td>
                        <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>{inscripto.ci_estudiante}</td>
                        <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                          {(() => {
                            const estado = String(inscripto.estado_estudiante_nombre || '').toLowerCase();
                            if (estado === 'retirado') {
                              return (
                                <span className="badge bg-warning text-dark">
                                  <i className="fas fa-user-slash me-1"></i>
                                  Retirado
                                </span>
                              );
                            }
                            if (estado === 'inactivo') {
                              return (
                                <span className="badge bg-secondary">
                                  <i className="fas fa-pause-circle me-1"></i>
                                  Inactivo
                                </span>
                              );
                            }
                            if (estado === 'egresado') {
                              return (
                                <span className="badge bg-primary">
                                  <i className="fas fa-graduation-cap me-1"></i>
                                  Egresado
                                </span>
                              );
                            }
                            return (
                              <span className="badge bg-success">
                                <i className="fas fa-check-circle me-1"></i>
                                Activo
                              </span>
                            );
                          })()}
                        </td>
                        <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                          {/* Botones de acciones CRUD aquí */}
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-sm btn-info"
                              onClick={() => generarPDF(inscripto)}
                              title="Visualizar información en PDF"
                            >
                              <i className="fas fa-file-pdf"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => abrirWhatsAppModal(inscripto)}
                              title="Enviar por WhatsApp"
                            >
                              <i className="fab fa-whatsapp"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-warning"
                              onClick={() => abrirModal(inscripto)}
                              title="Editar"
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => abrirModalRetiro(inscripto)}
                              title="Actualizar estado"
                            >
                              <i className="fas fa-user-slash"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}

          {/* Controles de Paginación */}
          {inscriptosFiltrados.length > 8 && (
            <div className="card-footer bg-light">
              <div className="d-flex justify-content-between align-items-center flex-wrap">
                <div className="mb-2 mb-md-0">
                  <small className="text-muted">
                    Mostrando {((paginaActual - 1) * itemsPorPagina) + 1} - {Math.min(paginaActual * itemsPorPagina, inscriptosFiltrados.length)} de {inscriptosFiltrados.length} estudiantes
                  </small>
                </div>
                <nav>
                  <ul className="pagination pagination-sm mb-0">
                    <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPaginaActual(prev => Math.max(1, prev - 1))}
                        disabled={paginaActual === 1}
                      >
                        <i className="fas fa-chevron-left"></i> Anterior
                      </button>
                    </li>
                    {Array.from({ length: Math.ceil(inscriptosFiltrados.length / itemsPorPagina) }, (_, i) => i + 1).map(num => {
                      // Mostrar solo algunas páginas alrededor de la actual
                      const totalPaginas = Math.ceil(inscriptosFiltrados.length / itemsPorPagina);
                      if (totalPaginas <= 7 || num === 1 || num === totalPaginas || (num >= paginaActual - 1 && num <= paginaActual + 1)) {
                        return (
                          <li key={num} className={`page-item ${paginaActual === num ? 'active' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPaginaActual(num)}
                            >
                              {num}
                            </button>
                          </li>
                        );
                      } else if (num === paginaActual - 2 || num === paginaActual + 2) {
                        return (
                          <li key={num} className="page-item disabled">
                            <span className="page-link">...</span>
                          </li>
                        );
                      }
                      return null;
                    })}
                    <li className={`page-item ${paginaActual === Math.ceil(inscriptosFiltrados.length / itemsPorPagina) ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => setPaginaActual(prev => Math.min(Math.ceil(inscriptosFiltrados.length / itemsPorPagina), prev + 1))}
                        disabled={paginaActual === Math.ceil(inscriptosFiltrados.length / itemsPorPagina)}
                      >
                        Siguiente <i className="fas fa-chevron-right"></i>
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Tabla de Operaciones Pendientes - Debajo de la tabla de estudiantes */}
      {(!isOnline || pendingCount > 0) && (
        <div className="card mt-4 shadow-lg" style={{ 
          border: '2px solid #ffc107',
          borderRadius: '8px',
          overflow: 'hidden'
        }}>
          <div className="card-header text-white d-flex justify-content-between align-items-center" style={{
            background: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)',
            padding: '15px 20px'
          }}>
            <h6 className="mb-0 d-flex align-items-center" style={{ fontSize: '1.1rem', fontWeight: '600' }}>
              <i className="fas fa-hourglass-half me-2"></i>
              Operaciones Pendientes de Registro
              <span className="badge bg-danger ms-2" style={{ fontSize: '0.9rem', padding: '5px 10px' }}>{pendingCount}</span>
            </h6>
            <button
              type="button"
              className="btn btn-sm btn-light"
              onClick={async () => {
                setLoadingPending(true);
                try {
                  await manualSync();
                  await loadPendingRequests();
                } finally {
                  setLoadingPending(false);
                }
              }}
              disabled={loadingPending}
              style={{ fontWeight: '500' }}
            >
              <i className={`fas fa-sync ${loadingPending ? 'fa-spin' : ''} me-1`}></i>
              Actualizar
            </button>
          </div>
          <div className="card-body" style={{ padding: '20px' }}>
            {loadingPending ? (
              <div className="text-center py-4">
                <div className="spinner-border text-warning" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="alert alert-success mb-0">
                <i className="fas fa-check-circle me-2"></i>
                No hay operaciones pendientes. Todo está sincronizado.
              </div>
            ) : (
              <div className="table-responsive" style={{ borderRadius: '6px', overflow: 'hidden' }}>
                <table className="table table-hover mb-0" style={{ 
                  marginBottom: 0,
                  backgroundColor: '#fff'
                }}>
                  <thead style={{
                    background: 'linear-gradient(135deg, #343a40 0%, #495057 100%)',
                    color: '#fff'
                  }}>
                    <tr>
                      <th style={{ 
                        padding: '12px 15px',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6'
                      }}>Tipo</th>
                      <th style={{ 
                        padding: '12px 15px',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6'
                      }}>Método</th>
                      <th style={{ 
                        padding: '12px 15px',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6'
                      }}>Datos del Estudiante</th>
                      <th style={{ 
                        padding: '12px 15px',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6'
                      }}>Fecha/Hora</th>
                      <th style={{ 
                        padding: '12px 15px',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6',
                        textAlign: 'center'
                      }}>Intentos</th>
                      <th style={{ 
                        padding: '12px 15px',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6',
                        textAlign: 'center'
                      }}>Estado</th>
                      <th style={{ 
                        padding: '12px 15px',
                        fontWeight: '600',
                        borderBottom: '2px solid #dee2e6',
                        textAlign: 'center'
                      }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.map((request, index) => {
                      const requestInfo = getRequestType(request.url, request.method);
                      const studentInfo = getStudentInfo(request.body);
                      return (
                        <tr 
                          key={request.id} 
                          style={{
                            backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8f9fa',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e9ecef'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8f9fa'}
                        >
                          <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                            <span className={`badge bg-${requestInfo.color}`} style={{ 
                              fontSize: '0.85rem',
                              padding: '6px 12px'
                            }}>
                              {requestInfo.icon} {requestInfo.type}
                            </span>
                          </td>
                          <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                            <span className="badge bg-secondary" style={{ 
                              fontSize: '0.85rem',
                              padding: '6px 10px'
                            }}>
                              {request.method || 'POST'}
                            </span>
                          </td>
                          <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                            {studentInfo ? (
                              <div>
                                <div style={{ 
                                  fontWeight: '600',
                                  color: '#212529',
                                  marginBottom: '5px',
                                  fontSize: '0.95rem'
                                }}>
                                  {studentInfo.nombre} {studentInfo.apellidoPaterno} {studentInfo.apellidoMaterno}
                                </div>
                                <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                                  <span className="me-3">
                                    <i className="fas fa-id-card me-1"></i>
                                    <strong>CI:</strong> {studentInfo.ci}
                                  </span>
                                  <span className="me-3">
                                    <i className="fas fa-barcode me-1"></i>
                                    <strong>Código:</strong> {studentInfo.codigo}
                                  </span>
                                  {studentInfo.fechaNacimiento !== 'N/A' && (
                                    <span className="me-3">
                                      <i className="fas fa-birthday-cake me-1"></i>
                                      <strong>Nacimiento:</strong> {new Date(studentInfo.fechaNacimiento).toLocaleDateString('es-ES')}
                                    </span>
                                  )}
                                  {studentInfo.genero !== 'N/A' && (
                                    <span>
                                      <i className="fas fa-venus-mars me-1"></i>
                                      <strong>Género:</strong> {studentInfo.genero}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div style={{ fontSize: '0.85rem', color: '#6c757d' }}>
                                <div><strong>URL:</strong> {request.url}</div>
                                {request.body && (
                                  <div className="mt-1">
                                    {typeof request.body === 'string' ? request.body.substring(0, 100) + '...' : JSON.stringify(request.body).substring(0, 100) + '...'}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '15px', verticalAlign: 'middle' }}>
                            <div style={{ fontSize: '0.85rem' }}>
                              <i className="fas fa-clock me-1 text-muted"></i>
                              {formatDate(request.timestamp)}
                            </div>
                          </td>
                          <td style={{ padding: '15px', verticalAlign: 'middle', textAlign: 'center' }}>
                            {request.retries > 0 ? (
                              <span className="badge bg-warning text-dark" style={{ 
                                fontSize: '0.85rem',
                                padding: '6px 10px'
                              }}>
                                <i className="fas fa-redo me-1"></i>
                                {request.retries}
                              </span>
                            ) : (
                              <span className="badge bg-info" style={{ 
                                fontSize: '0.85rem',
                                padding: '6px 10px'
                              }}>0</span>
                            )}
                          </td>
                          <td style={{ padding: '15px', verticalAlign: 'middle', textAlign: 'center' }}>
                            <span className="badge bg-warning text-dark" style={{ 
                              fontSize: '0.85rem',
                              padding: '6px 10px'
                            }}>
                              <i className="fas fa-hourglass-half me-1"></i>
                              Pendiente
                            </span>
                          </td>
                          <td style={{ padding: '15px', verticalAlign: 'middle', textAlign: 'center' }}>
                            <button
                              type="button"
                              className="btn btn-sm btn-outline-danger"
                              onClick={() => handleDescartarPendiente(request.id)}
                              title="Descartar esta operación"
                            >
                              <i className="fas fa-trash-alt me-1"></i>
                              Descartar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal para crear/editar inscripto */}
      {showModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingInscripto ? 'Editar Estudiante' : 'Nuevo Estudiante'}
                </h5>
                <button type="button" className="btn-close" onClick={cerrarModal}></button>
              </div>
              <form onSubmit={handleSubmit} onKeyDown={(e) => {
                try {
                  // Prevenir submit al presionar Enter en campos de texto, excepto cuando se está en el paso 3
                  if (e.key === 'Enter' && !editingInscripto && currentStep !== 3) {
                    const target = e.target;
                    // Solo prevenir si es un input de texto, no un botón
                    if (target && target.tagName === 'INPUT' && target.type !== 'submit' && target.type !== 'button') {
                      e.preventDefault();
                      e.stopPropagation();
                      nextStep();
                    }
                  }
                } catch (error) {
                  console.error('Error en onKeyDown:', error);
                }
              }}>
                <div className="modal-body">
                  {/* Stepper - Indicador de pasos */}
                  {!editingInscripto && (
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-3">
                        <div className={`step-indicator ${currentStep >= 1 ? 'active' : ''} ${currentStep > 1 ? 'completed' : ''}`} style={{ flex: 1, textAlign: 'center' }}>
                          <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${currentStep >= 1 ? 'bg-primary text-white' : 'bg-secondary text-white'}`} style={{ width: '40px', height: '40px', marginBottom: '8px' }}>
                            {currentStep > 1 ? <i className="fas fa-check"></i> : '1'}
                          </div>
                          <div className="small fw-bold">Datos Principales</div>
                        </div>
                        <div className={`step-line ${currentStep > 1 ? 'completed' : ''}`} style={{ flex: 1, height: '2px', backgroundColor: currentStep > 1 ? '#0d6efd' : '#dee2e6', margin: '0 10px', marginTop: '-20px' }}></div>
                        <div className={`step-indicator ${currentStep >= 2 ? 'active' : ''} ${currentStep > 2 ? 'completed' : ''}`} style={{ flex: 1, textAlign: 'center' }}>
                          <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${currentStep >= 2 ? 'bg-primary text-white' : 'bg-secondary text-white'}`} style={{ width: '40px', height: '40px', marginBottom: '8px' }}>
                            {currentStep > 2 ? <i className="fas fa-check"></i> : '2'}
                          </div>
                          <div className="small fw-bold">Padre/Madre</div>
                        </div>
                        <div className={`step-line ${currentStep > 2 ? 'completed' : ''}`} style={{ flex: 1, height: '2px', backgroundColor: currentStep > 2 ? '#0d6efd' : '#dee2e6', margin: '0 10px', marginTop: '-20px' }}></div>
                        <div className={`step-indicator ${currentStep >= 3 ? 'active' : ''}`} style={{ flex: 1, textAlign: 'center' }}>
                          <div className={`rounded-circle d-inline-flex align-items-center justify-content-center ${currentStep >= 3 ? 'bg-primary text-white' : 'bg-secondary text-white'}`} style={{ width: '40px', height: '40px', marginBottom: '8px' }}>
                            3
                          </div>
                          <div className="small fw-bold">Autorizados/Salud</div>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="badge bg-info">Paso {currentStep} de 3</span>
                      </div>
                    </div>
                  )}

                  {/* Botón para llenar datos aleatorios (solo para nuevos estudiantes, solo en paso 1) */}
                  {!editingInscripto && currentStep === 1 && (
                    <div className="mb-3 text-center">
                      <button
                        type="button"
                        className="btn btn-outline-info btn-sm"
                        onClick={llenarDatosAleatorios}
                        title="Llenar formulario con datos aleatorios para pruebas"
                      >
                        <i className="fas fa-random me-2"></i>
                        Llenar Datos Aleatorios (Prueba)
                      </button>
                    </div>
                  )}

                  <div className="row g-3" style={{ transition: 'opacity 0.3s ease' }}>
                    {/* PASO 1: Datos Principales del Estudiante */}
                    {(currentStep === 1 || editingInscripto) && (
                      <>
                        <div className="col-12 mt-4">
                          <h6 className="bg-primary text-white p-2 rounded shadow-sm d-flex align-items-center">
                            <i className="fas fa-id-card me-2"></i> Datos Principales del Estudiante
                          </h6>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Código Estudiante *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="codigo_estudiante"
                            value={formData.codigo_estudiante}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Nombres *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Apellido Paterno *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="apellido_paterno"
                            value={formData.apellido_paterno}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Apellido Materno *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="apellido_materno"
                            value={formData.apellido_materno}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">CI del Estudiante *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="ci_estudiante"
                            value={formData.ci_estudiante || ''}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Fecha de Nacimiento *</label>
                          <input
                            type="date"
                            className="form-control"
                            name="fecha_nacimiento"
                            value={formData.fecha_nacimiento}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Lugar de Nacimiento *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="lugar_nacimiento"
                            value={formData.lugar_nacimiento}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Dirección *</label>
                          <input
                            type="text"
                            className="form-control"
                            name="direccion"
                            value={formData.direccion}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Género *</label>
                          <select
                            className="form-select"
                            name="genero"
                            value={formData.genero}
                            onChange={handleChange}
                            required
                          >
                            <option value="">Selecciona género</option>
                            <option value="M">Masculino</option>
                            <option value="F">Femenino</option>
                          </select>
                        </div>
                      </>
                    )}

                    {/* PASO 2: Datos del Padre y Madre */}
                    {(currentStep === 2 || editingInscripto) && (
                      <>
                        {/* Datos del padre */}
                        <div className="col-12 mt-4">
                          <h6 className="bg-info text-white p-2 rounded shadow-sm d-flex align-items-center">
                            <i className="fas fa-male me-2"></i> Datos del Padre
                          </h6>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Nombres</label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre_padre"
                            value={formData.nombre_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Apellidos</label>
                          <input
                            type="text"
                            className="form-control"
                            name="apellido_padre"
                            value={formData.apellido_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">C.I. Padre/Tutor</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              name="ci_padre"
                              value={formData.ci_padre}
                              onChange={handleChange}
                              placeholder="Ingrese CI"
                            />
                            <button
                              type="button"
                              className="btn btn-outline-primary"
                              onClick={() => buscarDatosPadrePorCI(formData.ci_padre, 'padre')}
                              title="Buscar datos del padre por CI (si ya tiene otro hijo registrado)"
                              disabled={!formData.ci_padre || formData.ci_padre.length < 5}
                            >
                              <i className="fas fa-search"></i>
                            </button>
                          </div>
                          <small className="text-muted">💡 Si ya tiene un hijo registrado, ingrese el CI y presione 🔍</small>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Tipo de CI</label>
                          <select
                            className="form-select"
                            name="tipo_ci_padre"
                            value={formData.tipo_ci_padre}
                            onChange={handleChange}
                          >
                            <option value="ci">Carnet de Identidad</option>
                            <option value="extranjero">Carnet Extranjero</option>
                            <option value="ci_extension">CI con Extensión (Bolivia)</option>
                          </select>
                        </div>
                        {formData.tipo_ci_padre === 'ci_extension' && (
                          <div className="col-md-4">
                            <label className="form-label">Extensión (Departamento)</label>
                            <select
                              className="form-select"
                              name="extension_ci_padre"
                              value={formData.extension_ci_padre}
                              onChange={handleChange}
                            >
                              <option value="">Seleccione</option>
                              <option value="Chuquisaca">Chuquisaca</option>
                              <option value="La Paz">La Paz</option>
                              <option value="Cochabamba">Cochabamba</option>
                              <option value="Oruro">Oruro</option>
                              <option value="Potosí">Potosí</option>
                              <option value="Tarija">Tarija</option>
                              <option value="Santa Cruz">Santa Cruz</option>
                              <option value="Beni">Beni</option>
                              <option value="Pando">Pando</option>
                            </select>
                          </div>
                        )}
                        <div className="col-md-4">
                          <label className="form-label">Profesión</label>
                          <input
                            type="text"
                            className="form-control"
                            name="profesion_padre"
                            value={formData.profesion_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Lugar de Trabajo</label>
                          <input
                            type="text"
                            className="form-control"
                            name="lugar_trabajo_padre"
                            value={formData.lugar_trabajo_padre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Teléfono Domicilio</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              name="telefono_domicilio_padre"
                              value={formData.telefono_domicilio_padre}
                              onChange={handleChange}
                            />
                            <div className="input-group-text bg-light">
                              <div className="form-check mb-0">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id="whatsapp_domicilio_padre"
                                  name="whatsapp_domicilio_padre"
                                  checked={formData.whatsapp_domicilio_padre || false}
                                  onChange={handleChange}
                                  disabled={!formData.telefono_domicilio_padre}
                                />
                                <label className="form-check-label" htmlFor="whatsapp_domicilio_padre" style={{ fontSize: '0.85rem' }}>
                                  <i className="fab fa-whatsapp text-success"></i> WhatsApp
                                </label>
                              </div>
                            </div>
                          </div>
                          {formData.whatsapp_domicilio_padre && (
                            <small className="text-success">
                              <i className="fas fa-check-circle"></i> Configurado para notificaciones
                            </small>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Teléfono Oficina</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              name="telefono_oficina_padre"
                              value={formData.telefono_oficina_padre}
                              onChange={handleChange}
                            />
                            <div className="input-group-text bg-light">
                              <div className="form-check mb-0">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id="whatsapp_oficina_padre"
                                  name="whatsapp_oficina_padre"
                                  checked={formData.whatsapp_oficina_padre || false}
                                  onChange={handleChange}
                                  disabled={!formData.telefono_oficina_padre}
                                />
                                <label className="form-check-label" htmlFor="whatsapp_oficina_padre" style={{ fontSize: '0.85rem' }}>
                                  <i className="fab fa-whatsapp text-success"></i> WhatsApp
                                </label>
                              </div>
                            </div>
                          </div>
                          {formData.whatsapp_oficina_padre && (
                            <small className="text-success">
                              <i className="fas fa-check-circle"></i> Configurado para notificaciones
                            </small>
                          )}
                        </div>


                        {/* Datos de la madre */}
                        <div className="col-12 mt-4">
                          <h6 className="bg-warning text-dark p-2 rounded shadow-sm d-flex align-items-center">
                            <i className="fas fa-female me-2"></i> Datos de la Madre
                          </h6>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Nombres</label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre_madre"
                            value={formData.nombre_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Apellidos</label>
                          <input
                            type="text"
                            className="form-control"
                            name="apellido_madre"
                            value={formData.apellido_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">C.I. Madre/Tutora</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              name="ci_madre"
                              value={formData.ci_madre}
                              onChange={handleChange}
                              placeholder="Ingrese CI"
                            />
                            <button
                              type="button"
                              className="btn btn-outline-warning"
                              onClick={() => buscarDatosPadrePorCI(formData.ci_madre, 'madre')}
                              title="Buscar datos de la madre por CI (si ya tiene otro hijo registrado)"
                              disabled={!formData.ci_madre || formData.ci_madre.length < 5}
                            >
                              <i className="fas fa-search"></i>
                            </button>
                          </div>
                          <small className="text-muted">💡 Si ya tiene un hijo registrado, ingrese el CI y presione 🔍</small>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Tipo de CI</label>
                          <select
                            className="form-select"
                            name="tipo_ci_madre"
                            value={formData.tipo_ci_madre}
                            onChange={handleChange}
                          >
                            <option value="ci">Carnet de Identidad</option>
                            <option value="extranjero">Carnet Extranjero</option>
                            <option value="ci_extension">CI con Extensión (Bolivia)</option>
                          </select>
                        </div>
                        {formData.tipo_ci_madre === 'ci_extension' && (
                          <div className="col-md-4">
                            <label className="form-label">Extensión (Departamento)</label>
                            <select
                              className="form-select"
                              name="extension_ci_madre"
                              value={formData.extension_ci_madre}
                              onChange={handleChange}
                            >
                              <option value="">Seleccione</option>
                              <option value="Chuquisaca">Chuquisaca</option>
                              <option value="La Paz">La Paz</option>
                              <option value="Cochabamba">Cochabamba</option>
                              <option value="Oruro">Oruro</option>
                              <option value="Potosí">Potosí</option>
                              <option value="Tarija">Tarija</option>
                              <option value="Santa Cruz">Santa Cruz</option>
                              <option value="Beni">Beni</option>
                              <option value="Pando">Pando</option>
                            </select>
                          </div>
                        )}
                        <div className="col-md-4">
                          <label className="form-label">Profesión</label>
                          <input
                            type="text"
                            className="form-control"
                            name="profesion_madre"
                            value={formData.profesion_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Lugar de Trabajo</label>
                          <input
                            type="text"
                            className="form-control"
                            name="lugar_trabajo_madre"
                            value={formData.lugar_trabajo_madre}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Teléfono Domicilio</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              name="telefono_domicilio_madre"
                              value={formData.telefono_domicilio_madre}
                              onChange={handleChange}
                            />
                            <div className="input-group-text bg-light">
                              <div className="form-check mb-0">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id="whatsapp_domicilio_madre"
                                  name="whatsapp_domicilio_madre"
                                  checked={formData.whatsapp_domicilio_madre || false}
                                  onChange={handleChange}
                                  disabled={!formData.telefono_domicilio_madre}
                                />
                                <label className="form-check-label" htmlFor="whatsapp_domicilio_madre" style={{ fontSize: '0.85rem' }}>
                                  <i className="fab fa-whatsapp text-success"></i> WhatsApp
                                </label>
                              </div>
                            </div>
                          </div>
                          {formData.whatsapp_domicilio_madre && (
                            <small className="text-success">
                              <i className="fas fa-check-circle"></i> Configurado para notificaciones
                            </small>
                          )}
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Teléfono Oficina</label>
                          <div className="input-group">
                            <input
                              type="text"
                              className="form-control"
                              name="telefono_oficina_madre"
                              value={formData.telefono_oficina_madre}
                              onChange={handleChange}
                            />
                            <div className="input-group-text bg-light">
                              <div className="form-check mb-0">
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  id="whatsapp_oficina_madre"
                                  name="whatsapp_oficina_madre"
                                  checked={formData.whatsapp_oficina_madre || false}
                                  onChange={handleChange}
                                  disabled={!formData.telefono_oficina_madre}
                                />
                                <label className="form-check-label" htmlFor="whatsapp_oficina_madre" style={{ fontSize: '0.85rem' }}>
                                  <i className="fab fa-whatsapp text-success"></i> WhatsApp
                                </label>
                              </div>
                            </div>
                          </div>
                          {formData.whatsapp_oficina_madre && (
                            <small className="text-success">
                              <i className="fas fa-check-circle"></i> Configurado para notificaciones
                            </small>
                          )}
                        </div>
                      </>
                    )}

                    {/* PASO 3: Personas Autorizadas y Salud */}
                    {(currentStep === 3 || editingInscripto) && showModal && (
                      <>
                        {/* Personas autorizadas */}
                        <div className="col-12 mt-4">
                          <h6 className="bg-success text-white p-2 rounded shadow-sm d-flex align-items-center">
                            <i className="fas fa-users me-2"></i> Personas Autorizadas
                          </h6>
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Autorizado 1 - Nombre</label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre_autorizado1"
                            value={formData.nombre_autorizado1}
                            onChange={handleChange}
                          />
                        </div>


                        <div className="col-md-3">
                          <label className="form-label">Autorizado 1 - Teléfono</label>
                          <input
                            type="text"
                            className="form-control"
                            name="telefono_autorizado1"
                            value={formData.telefono_autorizado1}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label">Autorizado 2 - Nombre</label>
                          <input
                            type="text"
                            className="form-control"
                            name="nombre_autorizado2"
                            value={formData.nombre_autorizado2}
                            onChange={handleChange}
                          />
                        </div>


                        <div className="col-md-3">
                          <label className="form-label">Autorizado 2 - Teléfono</label>
                          <input
                            type="text"
                            className="form-control"
                            name="telefono_autorizado2"
                            value={formData.telefono_autorizado2}
                            onChange={handleChange}
                          />
                        </div>

                        {/* Salud y otros */}
                        <div className="col-12 mt-4">
                          <h6 className="bg-danger text-white p-2 rounded shadow-sm d-flex align-items-center">
                            <i className="fas fa-heartbeat me-2"></i> Salud y Otros
                          </h6>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Alergias</label>
                          <input
                            type="text"
                            className="form-control"
                            name="alergias"
                            value={formData.alergias}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Vacunas</label>
                          <input
                            type="text"
                            className="form-control"
                            name="vacunas"
                            value={formData.vacunas}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label">Seguro Médico</label>
                          <input
                            type="text"
                            className="form-control"
                            name="seguro_medico"
                            value={formData.seguro_medico}
                            onChange={handleChange}
                          />
                        </div>
                      </>
                    )}

                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  {editingInscripto ? (
                    <button type="submit" className="btn btn-primary">
                      Actualizar
                    </button>
                  ) : (
                    <>
                      {currentStep > 1 && (
                        <button type="button" className="btn btn-outline-secondary me-2" onClick={prevStep}>
                          <i className="fas fa-arrow-left me-2"></i>Anterior
                        </button>
                      )}
                      {currentStep < 3 ? (
                        <button type="button" className="btn btn-primary" onClick={nextStep}>
                          Siguiente<i className="fas fa-arrow-right ms-2"></i>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-success"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setAllowSubmit(true);
                            // Usar setTimeout para asegurar que el estado se actualice antes del submit
                            setTimeout(() => {
                              const form = e.target.closest('form');
                              if (form) {
                                form.requestSubmit();
                              }
                            }, 0);
                          }}
                        >
                          <i className="fas fa-check me-2"></i>Finalizar
                        </button>
                      )}
                    </>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Overlay del modal */}
      {showModal && (
        <div className="modal-backdrop fade show"></div>
      )}

      {/* Modal de WhatsApp */}
      <WhatsAppPDFSender
        isOpen={whatsappModalOpen}
        onClose={cerrarWhatsAppModal}
        pdfBlob={pdfBlob}
        studentName={selectedInscripto ? `${selectedInscripto.nombre} ${selectedInscripto.apellido_paterno} ${selectedInscripto.apellido_materno}` : ''}
      />

      {/* Modal de confirmación de eliminación */}
      {showDeleteModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-danger" style={{ borderWidth: '2px' }}>
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Confirmar Eliminación Completa
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={cancelDelete}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-danger">
                  <strong>⚠️ ADVERTENCIA: Esta acción NO se puede deshacer</strong>
                </div>
                <p>Se eliminarán <strong>TODOS</strong> los datos relacionados con este estudiante:</p>
                <ul className="list-unstyled ms-3">
                  <li><i className="fas fa-check text-danger me-2"></i>Datos del estudiante</li>
                  <li><i className="fas fa-check text-danger me-2"></i>Todas las inscripciones</li>
                  <li><i className="fas fa-check text-danger me-2"></i>Compromisos económicos</li>
                  <li><i className="fas fa-check text-danger me-2"></i>Pagos mensuales</li>
                  <li><i className="fas fa-check text-danger me-2"></i>Pagos realizados</li>
                  <li><i className="fas fa-check text-danger me-2"></i>Servicios adquiridos</li>
                  <li><i className="fas fa-check text-danger me-2"></i>Ingresos relacionados</li>
                  <li><i className="fas fa-check text-danger me-2"></i>Contactos de aviso</li>
                </ul>
                <p className="mt-3"><strong>¿Estás seguro de continuar?</strong></p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelDelete}>
                  <i className="fas fa-times me-2"></i>Cancelar
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                  <i className="fas fa-trash me-2"></i>Eliminar Todo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUpdateModal && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Actualización</h5>
                <button type="button" className="btn-close" onClick={cancelUpdate}></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas actualizar este estudiante?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelUpdate}>Cancelar</button>
                <button type="button" className="btn btn-primary" onClick={confirmUpdate}>Actualizar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nueva inscripción */}
      {showPreinscripcionModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-plus me-2"></i>
                  Nueva inscripción de estudiante
                </h5>
                <button type="button" className="btn-close" onClick={cerrarModalPreinscripcion}></button>
              </div>
              <form onSubmit={handleSubmitPreinscripcion}>
                <div className="modal-body">
                  {/* Alerta de estado offline - TEMPORALMENTE DESHABILITADA */}

                  {/* Búsqueda de estudiante */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">
                      <i className="fas fa-search me-2"></i>
                      Buscar Estudiante Existente
                    </label>
                    <div className="position-relative">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Escriba nombre o CI del estudiante (mínimo 2 letras)"
                        value={busquedaEstudiante}
                        onChange={(e) => setBusquedaEstudiante(e.target.value)}
                        onFocus={() => setMostrarSugerencias(true)}
                      />
                      {estudianteSeleccionado && (
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-danger position-absolute"
                          style={{ right: '10px', top: '50%', transform: 'translateY(-50%)' }}
                          onClick={limpiarEstudiante}
                          title="Limpiar selección"
                        >
                          <i className="fas fa-times"></i>
                        </button>
                      )}
                      {/* Mensaje de inscripción existente */}
                      {inscripcionExistente && (
                        <div className="alert alert-danger mt-3 mb-0" role="alert">
                          <div className="d-flex align-items-start">
                            <i className="fas fa-exclamation-triangle fa-2x me-3 mt-1"></i>
                            <div className="flex-grow-1">
                              <h6 className="alert-heading mb-2">
                                <strong>⚠️ Ya cuenta con inscripción activa</strong>
                              </h6>
                              <p className="mb-2">
                                <strong>{inscripcionExistente.estudiante.nombre} {inscripcionExistente.estudiante.apellido_paterno || ''} {inscripcionExistente.estudiante.apellido_materno || ''}</strong> ya cuenta con una inscripción activa para la gestión <strong>{inscripcionExistente.gestion}</strong>.
                              </p>
                              <div className="mt-2">
                                {inscripcionExistente.inscripcion.fecha_inscripcion && (
                                  <p className="mb-1">
                                    <i className="fas fa-calendar me-2"></i>
                                    <strong>Fecha de inscripción:</strong> {new Date(inscripcionExistente.inscripcion.fecha_inscripcion).toLocaleDateString('es-ES', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric'
                                    })}
                                  </p>
                                )}
                                {inscripcionExistente.inscripcion.nivel_nombre && (
                                  <p className="mb-1">
                                    <i className="fas fa-book me-2"></i>
                                    <strong>Nivel:</strong> {inscripcionExistente.inscripcion.nivel_nombre}
                                  </p>
                                )}
                                {inscripcionExistente.inscripcion.curso_nombre && (
                                  <p className="mb-1">
                                    <i className="fas fa-graduation-cap me-2"></i>
                                    <strong>Curso:</strong> {inscripcionExistente.inscripcion.curso_nombre}
                                  </p>
                                )}
                                {inscripcionExistente.inscripcion.bloque_nombre && (
                                  <p className="mb-0">
                                    <i className="fas fa-building me-2"></i>
                                    <strong>Bloque:</strong> {inscripcionExistente.inscripcion.bloque_nombre}
                                  </p>
                                )}
                              </div>
                              <hr className="my-2" />
                              <p className="mb-0 text-danger fw-bold">
                                No se puede registrar otra inscripción en el mismo año.
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                      {mostrarSugerencias && sugerenciasEstudiantes.length > 0 && (
                        <div className="position-absolute w-100 bg-white border rounded-bottom shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                          {sugerenciasEstudiantes.map((estudiante, index) => (
                            <div
                              key={`sugerencia-${estudiante.id}-${index}`}
                              className="p-2 border-bottom cursor-pointer hover-bg-light"
                              style={{ cursor: 'pointer' }}
                              onClick={() => seleccionarEstudiante(estudiante)}
                            >
                              <div className="fw-bold">
                                {estudiante.nombre} {estudiante.apellido_paterno || ''} {estudiante.apellido_materno || ''}
                              </div>
                              <div className="text-muted small">
                                CI: {estudiante.ci_estudiante} | Código: {estudiante.codigo_estudiante || 'Sin código'}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    {estudianteSeleccionado && (
                      <div className="alert alert-success mt-2">
                        <i className="fas fa-check-circle me-2"></i>
                        <strong>Estudiante seleccionado:</strong> {estudianteSeleccionado.nombre} {estudianteSeleccionado.apellido_paterno || ''} {estudianteSeleccionado.apellido_materno || ''}
                      </div>
                    )}

                    {/* Sugerencias del Agente Inteligente */}
                    {sugerenciasAgente.length > 0 && (
                      <div className="alert alert-success mt-3" style={{ backgroundColor: '#d4edda', borderColor: '#c3e6cb' }}>
                        <div className="d-flex align-items-start">
                          <i className="fas fa-robot fa-2x me-3 mt-1 text-success"></i>
                          <div className="flex-grow-1">
                            <h6 className="alert-heading mb-2 text-success">
                              <strong>🤖 Sugerencias del Agente Inteligente</strong>
                            </h6>
                            {sugerenciasAgente.map((sug, index) => (
                              <p key={index} className="mb-2 text-success" style={{ marginBottom: '0.5rem' }}>
                                <i className="fas fa-lightbulb me-2"></i>
                                {sug.mensaje}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Formulario de inscripción */}
                  {estudianteSeleccionado && (
                    <div>
                      <h6 className="mb-3">
                        <i className="fas fa-graduation-cap me-2"></i>
                        Datos de la Nueva Inscripción
                      </h6>

                      <div className="row">
                        {/* Bloque - Primero */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Bloque *</label>
                          <select
                            className="form-select"
                            name="bloque_id"
                            value={formPreinscripcion.bloque_id}
                            onChange={handleChangePreinscripcion}
                            required
                          >
                            <option value="">Seleccione bloque</option>
                            {bloques.map((bloque, index) => (
                              <option key={`bloque-${bloque.id}-${index}`} value={bloque.id}>{bloque.descripcion}</option>
                            ))}
                          </select>
                        </div>

                        {/* Nivel - Segundo */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Nivel *</label>
                          <select
                            className="form-select"
                            name="nivel_id"
                            value={formPreinscripcion.nivel_id}
                            onChange={handleChangePreinscripcion}
                            required
                            disabled={!formPreinscripcion.bloque_id}
                          >
                            <option value="">Seleccione nivel</option>
                            {niveles
                              .filter(nivel => !formPreinscripcion.bloque_id || nivel.bloque_id == formPreinscripcion.bloque_id)
                              .map((nivel, index) => (
                              <option key={`nivel-${nivel.id}-${index}`} value={nivel.id}>{nivel.nombre}</option>
                            ))}
                          </select>
                        </div>

                        {/* Curso - Tercero */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Curso *</label>
                          <select
                            className="form-select"
                            name="curso_id"
                            value={formPreinscripcion.curso_id}
                            onChange={handleChangePreinscripcion}
                            required
                            disabled={!formPreinscripcion.nivel_id}
                          >
                            <option value="">Seleccione curso</option>
                            {cursos.map((curso, index) => (
                              <option key={`curso-${curso.id}-${index}`} value={curso.id}>{curso.nombre}</option>
                            ))}
                          </select>
                        </div>

                        {/* Turno (automático desde curso) */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Turno</label>
                          <input
                            type="text"
                            className="form-control"
                            value={formPreinscripcion.turno || 'Se asigna al elegir curso'}
                            disabled
                          />
                        </div>

                        {/* Horario (automático desde curso) */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Horario</label>
                          <input
                            type="text"
                            className="form-control"
                            value={(formPreinscripcion.hora_inicio || formPreinscripcion.hora_fin)
                              ? `${(formPreinscripcion.hora_inicio || '').slice(0, 5)} - ${(formPreinscripcion.hora_fin || '').slice(0, 5)}`
                              : 'Se asigna al elegir curso'}
                            disabled
                          />
                        </div>

                        {/* Fecha de inscripción */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Fecha de Inscripción</label>
                          <input
                            type="date"
                            className="form-control"
                            name="fecha_inscripcion"
                            value={formPreinscripcion.fecha_inscripcion}
                            onChange={handleChangePreinscripcion}
                          />
                        </div>

                        {/* Beca */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Beca</label>
                          <select
                            className="form-select"
                            name="id_beca"
                            value={formPreinscripcion.id_beca}
                            onChange={handleChangePreinscripcion}
                          >
                            <option value="">Sin beca</option>
                            {becas.map((b, index) => (
                              <option key={`beca-${b.id}-${index}`} value={b.id}>{b.descripcion} ({b.descuento}%)</option>
                            ))}
                          </select>
                        </div>

                        {/* Meses de Beca - Solo mostrar si hay beca seleccionada */}
                        {formPreinscripcion.id_beca && (
                          <div className="col-12 mb-3">
                            <label className="form-label">
                              <i className="fas fa-calendar-alt me-2"></i>
                              Meses en los que se aplicará la beca
                            </label>

                            {/* Botones de selección rápida */}
                            <div className="mb-3">
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={seleccionarTodosLosMeses}
                                title="Seleccionar todos los meses disponibles"
                              >
                                <i className="fas fa-check-double me-1"></i>
                                Seleccionar todos
                              </button>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-secondary"
                                onClick={limpiarSeleccionMeses}
                                title="Limpiar selección de meses"
                              >
                                <i className="fas fa-times me-1"></i>
                                Limpiar selección
                              </button>
                            </div>

                            <div className="row">
                              {getMesesDisponibles().map((mes) => (
                                <div key={mes} className="col-md-3 col-sm-4 col-6 mb-2">
                                  <div className="form-check">
                                    <input
                                      className="form-check-input"
                                      type="checkbox"
                                      id={`mes-${mes}`}
                                      checked={formPreinscripcion.meses_beca.includes(mes)}
                                      onChange={() => handleMesesBecaChange(mes)}
                                    />
                                    <label className="form-check-label" htmlFor={`mes-${mes}`}>
                                      {mes.charAt(0).toUpperCase() + mes.slice(1)}
                                    </label>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {formPreinscripcion.meses_beca.length > 0 && (
                              <div className="alert alert-info mt-2">
                                <i className="fas fa-info-circle me-2"></i>
                                <strong>Meses seleccionados ({formPreinscripcion.meses_beca.length} de {getMesesDisponibles().length}):</strong> {formPreinscripcion.meses_beca.map(mes =>
                                  mes.charAt(0).toUpperCase() + mes.slice(1)
                                ).join(', ')}
                              </div>
                            )}
                          </div>
                        )}


                      </div>
                    </div>
                  )}

                  {/* Panel de Cálculo Previo */}
                  {(formPreinscripcion.nivel_id || formPreinscripcion.id_beca || formPreinscripcion.meses_beca.length > 0) && (
                    <div className="mt-4">
                      <div className="card border-primary">
                        <div className="card-header bg-primary text-white">
                          <h6 className="mb-0">
                            <i className="fas fa-calculator me-2"></i>
                            Cálculo Previo del Compromiso Económico
                          </h6>
                        </div>
                        <div className="card-body">
                          <div className="row">
                            <div className="col-md-6">
                              <h6 className="text-primary">Información del Nivel</h6>
                              <table className="table table-sm">
                                <tbody>
                                  <tr>
                                    <td><strong>Precio del nivel:</strong></td>
                                    <td>Bs {calculoPrevio.precioNivel.toFixed(2)}</td>
                                  </tr>
                                  <tr>
                                    <td><strong>Cuota mensual base:</strong></td>
                                    <td>Bs {calculoPrevio.cuotaMensual.toFixed(2)}</td>
                                  </tr>

                                </tbody>
                              </table>

                              {/* Nueva sección: Información con Descuento */}
                              {formPreinscripcion.id_beca && becas.find(b => b.id == formPreinscripcion.id_beca)?.descuento > 0 && (
                                <div className="mt-3">
                                  <h6 className="text-success">
                                    <i className="fas fa-percentage me-2"></i>
                                    Información del Nivel con Descuento
                                  </h6>
                                  <div className="alert alert-success p-2">
                                    <small className="text-muted">
                                      Descuento aplicado: {becas.find(b => b.id == formPreinscripcion.id_beca)?.descuento || 0}%
                                    </small>
                                  </div>
                                  <table className="table table-sm table-success">
                                    <tbody>
                                      <tr>
                                        <td><strong>Precio del nivel con descuento:</strong></td>
                                        <td>Bs {(calculoPrevio.precioNivel * (1 - (becas.find(b => b.id == formPreinscripcion.id_beca)?.descuento || 0) / 100)).toFixed(2)}</td>
                                      </tr>
                                      <tr>
                                        <td><strong>Cuota mensual con descuento:</strong></td>
                                        <td>Bs {(calculoPrevio.cuotaMensual * (1 - (becas.find(b => b.id == formPreinscripcion.id_beca)?.descuento || 0) / 100)).toFixed(2)}</td>
                                      </tr>

                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                            <div className="col-md-6">
                              <h6 className="text-success">Desglose de Cuotas</h6>
                              <table className="table table-sm">
                                <tbody>
                                  <tr>
                                    <td><strong>Meses con descuento:</strong></td>
                                    <td>{calculoPrevio.mesesConDescuento.length} meses</td>
                                  </tr>
                                  <tr className="table-success">
                                    <td><strong>Subtotal con descuento:</strong></td>
                                    <td>Bs {calculoPrevio.totalConDescuento.toFixed(2)}</td>
                                  </tr>
                                  <tr>
                                    <td><strong>Meses sin descuento:</strong></td>
                                    <td>{calculoPrevio.mesesSinDescuento.length} meses</td>
                                  </tr>
                                  <tr className="table-secondary">
                                    <td><strong>Subtotal sin descuento:</strong></td>
                                    <td>Bs {calculoPrevio.totalSinDescuento.toFixed(2)}</td>
                                  </tr>
                                  <tr className="table-info">
                                    <td><strong>Total cuotas:</strong></td>
                                    <td>Bs {calculoPrevio.totalCuotas.toFixed(2)}</td>
                                  </tr>
                                  <tr className="table-warning">
                                    <td><strong>Total general:</strong></td>
                                    <td><strong>Bs {calculoPrevio.totalGeneral.toFixed(2)}</strong></td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* Detalle de meses */}
                          {formPreinscripcion.meses_beca.length > 0 && (
                            <div className="mt-3">
                              <h6 className="text-info">Detalle por Mes</h6>
                              <div className="row">
                                <div className="col-md-6">
                                  <div className="alert alert-success">
                                    <strong>Meses con descuento ({calculoPrevio.mesesConDescuento.length}):</strong>
                                    <br />
                                    {calculoPrevio.mesesConDescuento.map(mes =>
                                      mes.charAt(0).toUpperCase() + mes.slice(1)
                                    ).join(', ')}
                                    <br />
                                    <small>Precio por mes: Bs {(calculoPrevio.cuotaMensual * (1 - (becas.find(b => b.id == formPreinscripcion.id_beca)?.descuento || 0) / 100)).toFixed(2)}</small>
                                    <br />
                                    <strong>Subtotal: Bs {calculoPrevio.totalConDescuento.toFixed(2)}</strong>
                                  </div>
                                </div>
                                <div className="col-md-6">
                                  <div className="alert alert-secondary">
                                    <strong>Meses sin descuento ({calculoPrevio.mesesSinDescuento.length}):</strong>
                                    <br />
                                    {calculoPrevio.mesesSinDescuento.map(mes =>
                                      mes.charAt(0).toUpperCase() + mes.slice(1)
                                    ).join(', ')}
                                    <br />
                                    <small>Precio por mes: Bs {calculoPrevio.cuotaMensual.toFixed(2)}</small>
                                    <br />
                                    <strong>Subtotal: Bs {calculoPrevio.totalSinDescuento.toFixed(2)}</strong>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrarModalPreinscripcion}>
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success"
                    disabled={!estudianteSeleccionado}
                  >
                    <i className="fas fa-user-plus me-2"></i>
                    Registrar nueva inscripción
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Overlay del modal de preinscripción */}
      {showPreinscripcionModal && (
        <div className="modal-backdrop fade show"></div>
      )}


      {/* Componente de notificaciones */}
      <NotificationModal
        show={notification.show}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={hideNotification}
      />

      {/* Confirmación explícita de registro de estudiante */}
      {showRegistroConfirmModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="fas fa-check-circle me-2"></i>
                  Registro exitoso
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowRegistroConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">{registroConfirmMessage}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setShowRegistroConfirmModal(false)}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación explícita de actualización de estudiante */}
      {showActualizacionConfirmModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">
                  <i className="fas fa-check-circle me-2"></i>
                  Actualización exitosa
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => setShowActualizacionConfirmModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">{actualizacionConfirmMessage}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setShowActualizacionConfirmModal(false)}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Baja (Retiro) fuera de contenedores con overflow para evitar recortes */}
      {showRetiroModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header bg-warning">
                <h5 className="modal-title text-dark">
                  <i className="fas fa-user-slash me-2"></i>
                      Actualización de estado
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowRetiroModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  Se actualizará el estado del estudiante y se marcará como <strong>retirado</strong> la inscripción/compromiso económico más reciente.
                  <br />
                  <small className="text-muted">No se elimina información; solo cambia el estado para reportes.</small>
                </p>
                <div className="mb-2">
                  <label className="form-label">Estado del estudiante</label>
                  <select
                    className="form-select"
                    value={retiroEstadoId}
                    onChange={(e) => setRetiroEstadoId(e.target.value)}
                  >
                    {estadosEstudiante.map((estado) => (
                      <option key={estado.id} value={estado.id}>
                        {estado.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="mb-2">
                  <label className="form-label">Motivo (opcional)</label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={retiroMotivo}
                    onChange={(e) => setRetiroMotivo(e.target.value)}
                    placeholder="Ej: Abandonó por viaje"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowRetiroModal(false)}>Cancelar</button>
                <button className="btn btn-warning" onClick={confirmarRetiro}>
                  <i className="fas fa-check me-2"></i>
                      Confirmar actualización
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de adquisición de servicios movido a Academia.jsx */}

      {/* Modal del menú hamburguesa */}
      {menuHamburguesaVisible && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-fullscreen-sm-down">
            <div className="modal-content" style={{
              border: 'none',
              borderRadius: '0',
              height: '100vh',
              maxHeight: '100vh'
            }}>
              <div className="modal-header" style={{
                borderBottom: '1px solid #dee2e6',
                backgroundColor: '#f8f9fa'
              }}>
                <div className="d-flex align-items-center">
                  <div className="me-3">
                    <i className="fas fa-user-circle text-primary" style={{ fontSize: '2rem' }}></i>
                  </div>
                  <div>
                    <h6 className="mb-0">{userInfo?.nombre || 'Usuario'}</h6>
                    <small className="text-muted">{userInfo?.rol || 'Rol'}</small>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-close"
                  onClick={cerrarMenuHamburguesa}
                ></button>
              </div>

              <div className="modal-body p-0">
                <div className="list-group list-group-flush">
                  <Link
                    to="/"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-home me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Dashboard</span>
                  </Link>

                  <Link
                    to="/usuarios"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-users me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Usuarios</span>
                  </Link>

                  <Link
                    to="/estudiantes"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-list me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Estudiantes</span>
                  </Link>

                  <Link
                    to="/becas"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-gift me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Becas</span>
                  </Link>

                  <Link
                    to="/compromiso"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-file-invoice-dollar me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Compromiso Económico</span>
                  </Link>

                  <Link
                    to="/academia"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-graduation-cap me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Academia</span>
                  </Link>

                  <Link
                    to="/almacenes"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-warehouse me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Almacenes</span>
                  </Link>

                  <Link
                    to="/productos"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-boxes me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Productos</span>
                  </Link>

                  <Link
                    to="/ingresos-academicos"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-university me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Ingresos Académicos</span>
                  </Link>

                  <Link
                    to="/reportes-inscripcion"
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-chart-bar me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Reportes Inscripción</span>
                  </Link>

                  <button
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={handleLogout}
                    style={{
                      padding: '15px 20px',
                      border: 'none',
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem',
                      background: 'none',
                      width: '100%',
                      textAlign: 'left'
                    }}
                  >
                    <i className="fas fa-sign-out-alt me-3 text-danger" style={{ width: '20px' }}></i>
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListaInscriptos;