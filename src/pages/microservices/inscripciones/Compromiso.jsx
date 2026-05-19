import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import CompromisoModal from '../../../components/CompromisoModal';
import InformacionEstudianteModal from '../../../components/InformacionEstudianteModal';
import NotificationModal from '../../../components/NotificationModal';
import ModoDispositivo from '../../../components/modoDispositivo.jsx';
import ModalVisualizarComprobante from '../../../components/ModalVisualizarComprobante';
import { useNotification } from '../../../hooks/useNotification';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../../assets/img/logo.jpg';
import { getApiUrl } from '../../../config/apiConfig';
import AuthService from '../../../services/authService';

const Compromiso = () => {
  // Estados para búsqueda y selección de estudiante
  const [ci, setCi] = useState("");
  const [nombreBusqueda, setNombreBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);
  const [form, setForm] = useState({
    nombre: "",
    fecha_nacimiento: "",
    mama: "",
    papa: "",
    celular_mama: "",
    celular_papa: "",
    costo_mensual: "",
    nivel: "",
    turno_tarde: false,
    fecha: "",
    detalle: "",
    nit: "",
    contribuyente: "",
    id_beca: "",
    id: undefined
  });
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState("");
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(false);
  const [becas, setBecas] = useState([]);
  const [compromiso, setCompromiso] = useState(null);
  const [pagos, setPagos] = useState([]);
  const [pagosMensuales, setPagosMensuales] = useState([]);
  const [pagoCuota, setPagoCuota] = useState('');
  const [observacionPago, setObservacionPago] = useState("");
  const [showModal, setShowModal] = useState(false);
  // Estado para indicar cuando se está subiendo un comprobante
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  // Estado para el modal de visualización de comprobante
  const [modalVisualizarComprobante, setModalVisualizarComprobante] = useState({
    isOpen: false,
    url: null,
    nombreArchivo: 'comprobante.pdf'
  });
  const [confirmEliminarComprobante, setConfirmEliminarComprobante] = useState({
    isOpen: false,
    pagoId: null,
    origenRegistro: 'pagos_realizados'
  });
  // Agregar estados para mes, año y forma de pago
  const [mesPago, setMesPago] = useState('');
  const [formaPago, setFormaPago] = useState('Efectivo');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().slice(0, 10));
  // Agregar estados para los filtros
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos');
  const [niveles, setNiveles] = useState([]);
  // Estados para número de comprobante y NIT/CI
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [nitCi, setNitCi] = useState('');

  // Estados para selección de meses específicos
  const [mesesSeleccionados, setMesesSeleccionados] = useState([]);
  const [mostrarSeleccionMeses, setMostrarSeleccionMeses] = useState(false);
  const [mostrarModalPago, setMostrarModalPago] = useState(false);
  const [montoEditable, setMontoEditable] = useState('');
  const [modoEdicionMonto, setModoEdicionMonto] = useState(false);

  // Estados para manejar múltiples inscripciones
  const [inscripciones, setInscripciones] = useState([]);
  const [mostrarInscripciones, setMostrarInscripciones] = useState(false);
  const [inscripcionSeleccionada, setInscripcionSeleccionada] = useState(null);

  // Hook para notificaciones
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  const debounceTimeout = useRef(null);

  // Estado para los meses del nivel
  const [mesesNivel, setMesesNivel] = useState([]);

  // Función para obtener los meses de pago dinámicamente
  const getMesesPagos = () => {
    if (compromiso && compromiso.nivel_meses) {
      try {
        const mesesArray = JSON.parse(compromiso.nivel_meses);
        return mesesArray.filter(mes => mes && mes.trim() !== '');
      } catch (error) {
        console.error('Error al parsear meses del nivel:', error);
      }
    }
    // Fallback a los meses por defecto
    return [
      'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre'
    ];
  };

  // Lista de meses para el select (dinámicos basados en el nivel)
  // Usar useMemo para evitar recrear el array en cada render
  const mesesPagos = useMemo(() => getMesesPagos(), [compromiso?.nivel_meses]);

  const [showDatosEstudiante, setShowDatosEstudiante] = useState(false);
  const [showCompromiso, setShowCompromiso] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showSaldos, setShowSaldos] = useState(false);
  const [seccionActiva, setSeccionActiva] = useState('resumen'); // 'resumen', 'pagos', 'historial', 'saldos'
  
  // Estado para el modal unificado de información
  const [showInformacionModal, setShowInformacionModal] = useState(false);

  // Estado adicional para filtro de año del modal de información
  const [filtroAnio, setFiltroAnio] = useState('');

  // Estados para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Estados para los saldos calculados
  const [saldoCuotas, setSaldoCuotas] = useState(0);
  const [saldoTotal, setSaldoTotal] = useState(0);
  const navigate = useNavigate();

  // Función para manejar navegación móvil
  const handleMobileNavigate = (path) => {
    setShowMobileMenu(false);
    navigate(path);
  };

  // Función para manejar logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userInfo');
    navigate('/login');
  };

  // Cargar información del usuario
  useEffect(() => {
    const token = localStorage.getItem('token');
    const storedUserInfo = localStorage.getItem('userInfo');
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = AuthService.getUser();
    const apiUrl = getApiUrl('/becas', user?.rol);
    
    fetch(`${apiUrl}/becas`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(setBecas)
      .catch(() => setBecas([]));
    
    const apiUrlNiveles = getApiUrl('/niveles', user?.rol);
    fetch(`${apiUrlNiveles}/niveles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(setNiveles)
      .catch(() => setNiveles([]));
  }, []);



  const getBecaEstudiante = (id_beca) => {
    if (!id_beca) return null;
    return becas.find(b => String(b.id) === String(id_beca));
  };

  // Buscar por CI
  const handleBuscar = async (e) => {
    e.preventDefault();
    setBuscando(true);
    setError("");
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/estudiantes', user?.rol);
      const res = await fetch(`${apiUrl}/estudiantes/buscar-por-ci-estudiante/${encodeURIComponent(ci)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      let data = null;
      try {
        data = await res.json();
      } catch {
        setError("Error de conexión");
        setBuscando(false);
        return;
      }
      if (!res.ok) {
        if (res.status === 404) {
          setError("CI no pertenece a nadie o no existe");
        } else {
          setError("Error de conexión");
        }
        setForm({
          nombre: "",
          fecha_nacimiento: "",
          mama: "",
          papa: "",
          celular_mama: "",
          celular_papa: "",
          costo_mensual: "",
          nivel: "",
          turno_tarde: false,
          fecha: "",
          detalle: "",
          nit: "",
          contribuyente: "",
          id_beca: "",
          id: undefined
        });
        setBuscando(false);
        return;
      }
      cargarDatosEstudiante(data);
    } catch {
      setError("Error de conexión");
    }
    setBuscando(false);
  };

  // Buscar por nombre (ahora optimizada para autocompletado)
  const buscarNombreTiempoReal = async (valor) => {
    setResultados([]);
    setError("");
    if (!valor.trim() || valor.trim().length < 2) return;
    setBuscando(true);
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/estudiantes', user?.rol);
      const res = await fetch(`${apiUrl}/estudiantes?incluir_concluidos=1&anio=todos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      const normalize = (s) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() : '';
      const filtro = normalize(valor.trim());
      
      // Filtrar estudiantes que coincidan con el nombre Y que tengan inscripciones activas o concluidas completas
      const coincidencias = data.filter(est => {
        const nombreCompleto = normalize(`${est.nombre} ${est.apellido_paterno || ''} ${est.apellido_materno || ''}`);
        const coincideNombre = nombreCompleto.includes(filtro);
        const tieneInscripcionCompleta = est.nivel_nombre && 
                                       est.curso_nombre && 
                                       est.bloque_nombre &&
                                       ['activo','concluido'].includes(est.estado_inscripcion) &&
                                       est.nivel_id && 
                                       est.curso_id;
        
        return coincideNombre && tieneInscripcionCompleta;
      });
      
      // Eliminar duplicados por estudiante (en caso de múltiples inscripciones)
      const estudiantesUnicos = [];
      const idsVistos = new Set();
      
      coincidencias.forEach(est => {
        if (!idsVistos.has(est.id)) {
          idsVistos.add(est.id);
          estudiantesUnicos.push(est);
        }
      });
      
      if (estudiantesUnicos.length === 0) {
        setError("No se encontraron estudiantes con inscripciones (activas o concluidas)");
      }
      setResultados(estudiantesUnicos);
    } catch {
      setError("Error de conexión");
    }
    setBuscando(false);
  };

  const cargarDatosEstudiante = async (data) => {
    let fechaNacimiento = data.fecha_nacimiento;
    if (fechaNacimiento) {
      const d = new Date(fechaNacimiento);
      fechaNacimiento = d.toLocaleDateString('es-ES');
    } else {
      fechaNacimiento = '';
    }
    // Buscar el precio del nivel
    let nivelPrecio = '';
    if (data.nivel_id) {
      const nivelObj = niveles.find(n => String(n.id) === String(data.nivel_id));
      nivelPrecio = nivelObj ? nivelObj.precio : '';
    }
    setForm({
      id: data.id,
      nombre: (data.nombre || '') + (data.apellido_paterno ? (' ' + data.apellido_paterno) : '') + (data.apellido_materno ? (' ' + data.apellido_materno) : ''),
      fecha_nacimiento: fechaNacimiento,
      mama: (data.nombre_madre || '') + (data.apellido_madre ? (' ' + data.apellido_madre) : ''),
      papa: (data.nombre_padre || '') + (data.apellido_padre ? (' ' + data.apellido_padre) : ''),
      celular_mama: data.telefono_domicilio_madre || '',
      celular_papa: data.telefono_domicilio_padre || '',
      costo_mensual: nivelPrecio,
      nivel: data.nivel_nombre || data.nivel || '',
      turno_tarde: data.turno && data.turno.toLowerCase().includes('tarde'),
      fecha: '',
      detalle: '',
      nit: '',
      contribuyente: '',
      id_beca: data.id_beca || '',
      ci_estudiante: data.ci_estudiante || ''
    });
    setResultados([]);
    setError("");
    setEstudianteSeleccionado(true);
    
    // Cargar inscripciones del estudiante
    await cargarInscripciones(data.id);
  };

  const cargarInscripciones = async (estudianteId, mantenerSeleccion = false) => {
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/estudiantes', user?.rol);
      const res = await fetch(`${apiUrl}/estudiantes/${estudianteId}/inscripciones`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const inscripcionesData = await res.json();
        
        // Filtrar solo inscripciones completas (activas o concluidas)
        const inscripcionesCompletas = inscripcionesData.filter(inscripcion => 
          inscripcion.nivel_nombre && 
          inscripcion.curso_nombre && 
          inscripcion.bloque_nombre &&
          (inscripcion.estado === 'activo' || inscripcion.estado === 'concluido') &&
          inscripcion.nivel_id && 
          inscripcion.curso_id
        );
        
        setInscripciones(inscripcionesCompletas);
        
        // Si hay una inscripción seleccionada y queremos mantenerla, actualizar sus datos pero no cambiar la selección
        if (mantenerSeleccion && inscripcionSeleccionada) {
          const inscripcionActualizada = inscripcionesCompletas.find(insc => insc.id === inscripcionSeleccionada.id);
          if (inscripcionActualizada) {
            setInscripcionSeleccionada(inscripcionActualizada);
          }
          return;
        }
        
        // Si solo hay una inscripción completa, seleccionarla automáticamente
        if (inscripcionesCompletas.length === 1) {
          setInscripcionSeleccionada(inscripcionesCompletas[0]);
          await cargarCompromiso(inscripcionesCompletas[0].id);
          setMostrarInscripciones(false);
        } else if (inscripcionesCompletas.length > 1) {
          // Solo mostrar selección si no hay una inscripción ya seleccionada Y no estamos manteniendo la selección
          if (!inscripcionSeleccionada && !mantenerSeleccion) {
            setMostrarInscripciones(true);
          } else if (mantenerSeleccion && inscripcionSeleccionada) {
            // Si estamos manteniendo la selección, asegurarnos de que no se muestre la lista
            setMostrarInscripciones(false);
          }
        }
      }
    } catch (error) {
      // Error silenciado
    }
  };

  const seleccionarInscripcion = async (inscripcion) => {
    // Prevenir doble selección
    if (inscripcionSeleccionada && inscripcionSeleccionada.id === inscripcion.id) {
      return;
    }
    
    setInscripcionSeleccionada(inscripcion);
    setMostrarInscripciones(false);
    await cargarCompromiso(inscripcion.id);
    // Recargar inscripciones para actualizar estados de compromisos, pero manteniendo la selección
    if (form.id) {
      await cargarInscripciones(form.id, true);
    }
  };

  const activarSeccionPagos = () => {
    setSeccionActiva('pagos');
    setShowCompromiso(false);
    setShowHistorial(false);
    setShowSaldos(false);
  };

  // Cargar compromiso y pagos
  const cargarCompromiso = async (inscripcion_id) => {
    // Evitar múltiples cargas simultáneas
    if (cargandoCompromisoRef.current) {
      console.log('⏸️ Ya se está cargando el compromiso, ignorando llamada duplicada');
      return;
    }
    
    cargandoCompromisoRef.current = true;
    
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/compromiso-economico', user?.rol);
      
      const res = await fetch(`${apiUrl}/compromiso-economico/inscripcion/${inscripcion_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.status === 401) {
        const errorData = await res.json().catch(() => ({ message: 'Token inválido o expirado' }));
        setError('Token inválido o expirado. Por favor, inicia sesión nuevamente.');
        setCompromiso(null);
        setPagos([]);
        setPagosMensuales([]);
        return;
      }
      
      if (!res.ok) {
        // Si es un error 503 (Service Unavailable), significa que el backend está offline
        // No resetear los datos ni cambiar la sección activa - mantener estado actual
        if (res.status === 503) {
          // Backend offline - mantener datos existentes, sección activa y NO cambiar nada
          // Esto previene que se cambie a "Resumen previo al compromiso" cuando está offline
          return;
        }
        
        // Para otros errores, intentar parsear pero no resetear si es error de conexión
        try {
          const errorData = await res.json().catch(() => ({ message: 'Error desconocido' }));
        } catch (e) {
          // Si no se puede parsear, probablemente es un error de conexión
        }
        
        // Solo resetear si NO es un error de conexión (503)
        if (res.status !== 503) {
          setCompromiso(null); 
          setPagos([]); 
          setPagosMensuales([]);
        }
        return; 
      }
      
      const data = await res.json();
      
      // Manejar diferentes formatos de respuesta
      let compromiso = null;
      if (data.compromiso) {
        compromiso = data.compromiso;
      } else if (data.ok && data.compromiso) {
        compromiso = data.compromiso;
      } else if (data && data.id) {
        // Si la respuesta es directamente el compromiso
        compromiso = data;
      }
      
      setCompromiso(compromiso);
      
      // Actualizar el estado del compromiso en las inscripciones locales
      if (compromiso && compromiso.estado_compromiso) {
        setInscripciones(prevInscripciones => 
          prevInscripciones.map(insc => 
            insc.id === inscripcion_id 
              ? { ...insc, estado_compromiso: compromiso.estado_compromiso, tiene_compromiso: true }
              : insc
          )
        );
        
        // También actualizar la inscripción seleccionada si es la misma
        if (inscripcionSeleccionada && inscripcionSeleccionada.id === inscripcion_id) {
          setInscripcionSeleccionada(prev => 
            prev ? { ...prev, estado_compromiso: compromiso.estado_compromiso, tiene_compromiso: true } : prev
          );
        }
      }
      
      if (compromiso && compromiso.id) {
        // Cargar pagos realizados
        try {
          const resPagos = await fetch(`${apiUrl}/pagos-realizados/${compromiso.id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (resPagos.status === 401) {
            const errorData = await resPagos.json().catch(() => ({ message: 'Token inválido' }));
            setError('Token inválido o expirado. Por favor, inicia sesión nuevamente.');
          } else if (resPagos.ok) {
            const pagos = await resPagos.json();
            // Mapear pdf_firmado a comprobante_url para compatibilidad con el frontend
            // IMPORTANTE: Crear nuevos objetos en lugar de mutar los existentes para evitar ciclos infinitos
            const user = AuthService.getUser();
            const apiUrl = getApiUrl('/comprobantes', user?.rol);
            const pagosConUrl = Array.isArray(pagos) ? pagos.map(pago => {
              // Crear un nuevo objeto en lugar de mutar el original
              const pagoConUrl = { ...pago };
              pagoConUrl.origen_registro = pago.origen_registro || 'pagos_realizados';
              // Si existe comprobante firmado, SIEMPRE forzar la URL al firmado del pago actual
              // para evitar arrastrar URLs antiguas (ej: plan de pagos u otros archivos).
              if (pago.pdf_firmado) {
                const version = encodeURIComponent(
                  pago.fecha_subida_firmado || pago.pdf_firmado || Date.now().toString()
                );
                pagoConUrl.comprobante_url = `${apiUrl}/comprobantes/view-comprobante/${pago.id}/firmado?origen=${encodeURIComponent(pagoConUrl.origen_registro)}&v=${version}`;
              } else {
                pagoConUrl.comprobante_url = null;
              }
              if (pago.pdf_firmado) {
                pagoConUrl.comprobante_nombre = pago.pdf_firmado;
              }
              return pagoConUrl;
            }) : [];
            
            // Actualizar siempre, pero solo loggear una vez por carga
            setPagos(pagosConUrl);
          } else {
            setPagos([]);
          }
        } catch (pagosError) {
          // Manejar errores de conexión de forma silenciosa para GET requests
          // El service worker debería manejar el cache automáticamente
          if (pagosError.message && (
            pagosError.message.includes('Failed to fetch') || 
            pagosError.message.includes('ERR_CONNECTION_REFUSED') ||
            pagosError.name === 'TypeError'
          )) {
            // Backend offline - mantener datos existentes o usar cache
            // No mostrar error en consola para GET requests offline
          } else {
            console.error('Error al cargar pagos:', pagosError);
          }
        }

        // Cargar detalle de pagos mensuales
        try {
          const resDetalle = await fetch(`${apiUrl}/compromiso-economico/${compromiso.id}/detalle-pagos`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (resDetalle.status === 401) {
            const errorData = await resDetalle.json().catch(() => ({ message: 'Token inválido' }));
          } else if (resDetalle.ok) {
            const detalleData = await resDetalle.json();
            setPagosMensuales(detalleData.pagosMensuales || []);
          } else {
            setPagosMensuales([]);
          }
        } catch (detalleError) {
          // Manejar errores de conexión de forma silenciosa para GET requests
          // El service worker debería manejar el cache automáticamente
          if (detalleError.message && (
            detalleError.message.includes('Failed to fetch') || 
            detalleError.message.includes('ERR_CONNECTION_REFUSED') ||
            detalleError.name === 'TypeError'
          )) {
            // Backend offline - mantener datos existentes o usar cache
            // No mostrar error en consola para GET requests offline
          } else {
            console.error('Error al cargar detalle de pagos:', detalleError);
          }
        }
      } else {
        setPagos([]);
        setPagosMensuales([]);
      }
      
      // Mantener la sección activa actual - NO cambiar la sección cuando se cargan datos
      // Esto previene que se cambie a "Resumen previo al compromiso" cuando el backend está offline
      // La sección solo debe cambiar cuando el usuario hace clic explícitamente
    } catch (error) {
      // Manejar errores de conexión de forma silenciosa para GET requests
      // El service worker debería manejar el cache automáticamente
      if (error.message && (
        error.message.includes('Failed to fetch') || 
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.name === 'TypeError'
      )) {
        // Backend offline - mantener datos existentes, sección activa y estados actuales
        // No mostrar error en consola para GET requests offline
        // Los datos en cache del service worker se mostrarán automáticamente
        // NO resetear compromiso, pagos, ni cambiar sección activa
        cargandoCompromisoRef.current = false; // Resetear flag antes de salir
        return; // Salir temprano para mantener el estado actual
      } else {
        // Solo mostrar errores que no sean de conexión
        console.error('Error al cargar compromiso:', error);
      }
      // No resetear los datos si es un error de conexión (mantener cache y sección activa)
      // Solo resetear si es un error de autenticación u otro error crítico
      if (error.message && error.message.includes('Token')) {
        setCompromiso(null); 
        setPagos([]);
        setPagosMensuales([]);
      }
    } finally {
      // Siempre resetear el flag al finalizar
      cargandoCompromisoRef.current = false;
    }
  };

  // Cargar compromiso cuando se selecciona una inscripción
  useEffect(() => {
    if (inscripcionSeleccionada && inscripcionSeleccionada.id) {
      cargarCompromiso(inscripcionSeleccionada.id);
    }
  }, [inscripcionSeleccionada]);

  const buscarDeNuevo = () => {
    setEstudianteSeleccionado(false);
    setForm({
      nombre: '',
      fecha_nacimiento: '',
      mama: '',
      papa: '',
      celular_mama: '',
      celular_papa: '',
      costo_mensual: '',
      nivel: '',
      turno_tarde: false,
      fecha: '',
      detalle: '',
      nit: '',
      contribuyente: '',
      id_beca: '',
      id: undefined
    });
    setResultados([]);
    setError("");
    setCompromiso(null);
    setPagos([]);
    setInscripciones([]);
    setMostrarInscripciones(false);
    setInscripcionSeleccionada(null);
  };

  // Función para generar el PDF del pago
  const generarPDFPago = (pago, estudiante, saldoPendiente) => {
    const doc = new jsPDF();
    // Cargar el logo como imagen base64
    const img = new window.Image();
    img.src = logo;
    img.onload = function() {
      doc.addImage(img, 'JPEG', 80, 5, 50, 20); // Centrado arriba
      doc.setFontSize(16);
      doc.text('Comprobante de Pago', 105, 32, { align: 'center' });
      doc.setFontSize(11);
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString()}`, 14, 40);
      doc.text(`Estudiante: ${estudiante.nombre}`, 14, 47);
      doc.text(`CI: ${estudiante.ci_estudiante || ''}`, 14, 54);
      doc.text(`Nivel: ${estudiante.nivel || ''}`, 14, 61);
      doc.text(`Turno: ${estudiante.turno_tarde ? 'Tarde' : 'Mañana'}`, 14, 68);
      
      // Agregar campos de comprobante
      doc.setFontSize(10);
      doc.text(`N° Comprobante: ${pago.numero_comprobante || 'No especificado'}`, 14, 75);
      doc.text(`CI del pagador: ${pago.nit_ci || 'No especificado'}`, 120, 75);
      
      doc.setFontSize(13);
      doc.text('Resumen de la transacción', 14, 85);
      doc.setFontSize(11);
      // Construir filas para la tabla de mensualidades
      const bodyRows = [];
      
      // Calcular montos esperados para determinar el estado
      const numeroCuotas = mesesPagos.length;
      const montoEsperadoCuota = compromiso ? Math.round((compromiso.total_cuotas / numeroCuotas) * 100) / 100 : 0;
      
      if (parseFloat(pago.monto_cuota) > 0) {
        // Determinar estado de la cuota basándose en el mes específico
        let estadoCuota = 'Pendiente';
        
        // Si el pago es para un mes específico, calcular el estado real
        if (pago.mes && pago.mes !== 'general') {
          // Para pagos de múltiples meses, tomar el primer mes para el cálculo
          const mesParaCalculo = pago.mes.includes(',') ? pago.mes.split(',')[0].trim() : pago.mes;
          const montoTotalMes = Math.round(calcularMontoMes(mesParaCalculo) * 100) / 100;
          
          // Calcular el monto pagado ANTES de este pago específico
          let montoPagadoAntes = 0;
          pagos.forEach(pagoAnterior => {
            // Solo considerar pagos anteriores a este (por fecha y hora)
            if (pagoAnterior.id !== pago.id && (pagoAnterior.tipo_pago === 'cuota' || pagoAnterior.tipo_pago === 'ambos')) {
              if (pagoAnterior.mes && pagoAnterior.mes.includes(',')) {
                // Pago múltiple (legacy)
                const mesesPago = pagoAnterior.mes.split(',').map(m => m.trim());
                if (mesesPago.includes(mesParaCalculo)) {
                  const montoAPagar = pagoAnterior.tipo_pago === 'ambos' ? Number(pagoAnterior.monto_cuota || 0) : Number(pagoAnterior.monto || 0);
                  montoPagadoAntes += montoAPagar / mesesPago.length;
                }
              } else if (pagoAnterior.mes === mesParaCalculo) {
                // Pago individual
                const montoAPagar = pagoAnterior.tipo_pago === 'ambos' ? Number(pagoAnterior.monto_cuota || 0) : Number(pagoAnterior.monto || 0);
                montoPagadoAntes += montoAPagar;
              }
            }
          });
          
          // Calcular el monto pagado DESPUÉS de este pago (incluyendo este pago)
          const montoPagoActual = pago.tipo_pago === 'ambos' ? Number(pago.monto_cuota || 0) : Number(pago.monto || 0);
          const montoPagadoDespues = Math.round((montoPagadoAntes + montoPagoActual) * 100) / 100;
          
          console.log(`DEBUG PDF - Mes: ${mesParaCalculo}, Total: ${montoTotalMes}, Antes: ${montoPagadoAntes}, Actual: ${montoPagoActual}, Después: ${montoPagadoDespues}`);
          
          // Determinar el estado basándose en el monto después de este pago
          const diferencia = montoTotalMes - montoPagadoDespues;
          
          if (diferencia <= 0.01) { // Consideramos pagado si la diferencia es menor a 1 centavo
            estadoCuota = 'Mes cancelado';
          } else if (montoPagadoDespues > 0) {
            estadoCuota = `Parcial (Falta Bs ${diferencia.toFixed(2)})`;
          }
        } else {
          // Para pagos generales, usar la lógica anterior
          if (pago.saldoPendienteCuota !== undefined) {
            if (pago.saldoPendienteCuota === 0) {
              estadoCuota = 'Mes cancelado';
            } else if (pago.saldoPendienteCuota > 0) {
              estadoCuota = `Parcial (Falta Bs ${pago.saldoPendienteCuota.toFixed(2)})`;
            }
          } else {
            estadoCuota = 'Mes cancelado';
          }
        }
        
        bodyRows.push([
          pago.fecha_pago ? pago.fecha_pago.slice(0, 10) : '',
          pago.mes,
          pago.anio,
          'Mensualidad',
          `Bs ${pago.monto_cuota}`,
          pago.forma_pago || '',
          pago.detalle,
          pago.observacion || 'ninguna observación',
          estadoCuota
        ]);
      }
      

      
      // Si solo hay un monto (por compatibilidad), mostrar como antes
      if (bodyRows.length === 0) {
        let estado = 'Pendiente';
        if (saldoPendiente === 0) {
          estado = pago.tipo_pago === 'cuota' ? 'Mes cancelado' : 'Servicio cancelado';
        } else if (saldoPendiente > 0 && saldoPendiente < parseFloat(pago.monto)) {
          estado = `Parcial (Falta Bs ${saldoPendiente.toFixed(2)})`;
        }
        
        bodyRows.push([
          pago.fecha_pago ? pago.fecha_pago.slice(0, 10) : '',
          pago.mes,
          pago.anio,
          'Mensualidad',
          `Bs ${pago.monto}`,
          pago.forma_pago || '',
          pago.detalle,
          pago.observacion || 'ninguna observación',
          estado
        ]);
      }
      autoTable(doc, {
        startY: 90,
        head: [[
          'Fecha de pago', 'Mes', 'Año', 'Tipo', 'Monto', 'Forma de pago', 'Detalle', 'Observación', 'Estado'
        ]],
        body: bodyRows,
        theme: 'grid',
        styles: { fontSize: 11 },
        headStyles: { fillColor: [41, 128, 185] },
      });
      
      // Sección de firmas mejorada - en una fila separada con más espacio
      const firmasY = doc.lastAutoTable.finalY + 30;
      doc.setFontSize(12);
      doc.text('Firmas:', 14, firmasY);
      
      // Crear dos columnas para las firmas con más espacio
      const columna1X = 20;
      const columna2X = 110;
      const firmaLineaY = firmasY + 15;
      const firmaTextoY = firmasY + 25;
      
      // Líneas para firmas más largas
      doc.setLineWidth(0.5);
      doc.line(columna1X, firmaLineaY, columna1X + 70, firmaLineaY); // Línea firma encargado
      doc.line(columna2X, firmaLineaY, columna2X + 70, firmaLineaY); // Línea firma responsable
      
      // Texto debajo de las líneas
      doc.setFontSize(10);
      doc.text('Firma del encargado', columna1X + 15, firmaTextoY);
      doc.text('Firma del responsable', columna2X + 10, firmaTextoY);
      
      // Agregar CI del pagador debajo de la firma del responsable
      if (pago.nit_ci) {
        doc.setFontSize(9);
        doc.text(`CI: ${pago.nit_ci}`, columna2X + 20, firmaTextoY + 8);
      }
      
      doc.save(`comprobante_pago_${estudiante.nombre}_${pago.mes}_${pago.anio}.pdf`);
    };
  };



  // Funciones para selección de meses específicos
  const toggleMesSeleccionado = (mes) => {
    setMesesSeleccionados(prev => {
      if (prev.includes(mes)) {
        return prev.filter(m => m !== mes);
      } else {
        return [...prev, mes];
      }
    });
  };

  const seleccionarTodosLosMeses = () => {
    setMesesSeleccionados([...mesesPagos]);
  };

  const limpiarSeleccionMeses = () => {
    setMesesSeleccionados([]);
    setMontoEditable('');
    setModoEdicionMonto(false);
  };

  // Función para calcular el resumen correcto del compromiso
  const calcularResumenCompromiso = () => {
    if (!form.costo_mensual || !inscripcionSeleccionada) return null;

    const costoTotal = Number(form.costo_mensual);
    const numeroCuotas = mesesPagos.length;
    const cuotaMensualBase = costoTotal / numeroCuotas; // Dividir en el número real de cuotas
    const beca = getBecaEstudiante(form.id_beca);
    const descuentoPorc = beca ? Number(beca.descuento) : 0;

    // Obtener meses con beca de la inscripción seleccionada
    const mesesConBeca = inscripcionSeleccionada.meses_beca 
      ? inscripcionSeleccionada.meses_beca.split(',').map(m => m.trim()).filter(m => m)
      : [];

    // Calcular totales
    const mesesSinBeca = 10 - mesesConBeca.length;
    const cuotaConDescuento = cuotaMensualBase * (1 - descuentoPorc / 100);
    
    const totalMesesSinBeca = mesesSinBeca * cuotaMensualBase;
    const totalMesesConBeca = mesesConBeca.length * cuotaConDescuento;
    const totalConDescuento = totalMesesSinBeca + totalMesesConBeca;
    const totalGeneral = totalConDescuento;
    const descuentoTotal = (mesesConBeca.length * cuotaMensualBase * descuentoPorc / 100);

    return {
      costoTotal,
      cuotaMensualBase,
      descuentoPorc,
      mesesConBeca,
      mesesSinBeca,
      cuotaConDescuento,
      totalMesesSinBeca,
      totalMesesConBeca,
      totalConDescuento,
      totalGeneral,
      descuentoTotal
    };
  };

  // Función para calcular el monto específico de un mes (considerando becas)
  const calcularMontoMes = (mes) => {
    if (!compromiso || !form.costo_mensual) return 0;

    // Prioridad: si existen datos en pagos_mensuales, usar monto_esperado real por mes.
    // Esto evita que el modal muestre el mismo valor para todos los meses.
    if (pagosMensuales && pagosMensuales.length > 0) {
      const mesesMap = {
        'enero': 1,
        'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11,
        'diciembre': 12
      };
      const numeroMes = mesesMap[String(mes || '').toLowerCase()];
      const pagoMensual = pagosMensuales.find(pm => pm.mes === numeroMes);
      if (pagoMensual && pagoMensual.monto_esperado != null) {
        return Math.round(Number(pagoMensual.monto_esperado || 0) * 100) / 100;
      }
    }
    
    // Usar el monto base sin descuento del nivel
    const numeroCuotas = mesesPagos.length;
    const montoBaseSinDescuento = Number(form.costo_mensual) / numeroCuotas;
    
    // Verificar si este mes específico tiene beca aplicada
    // Buscar en la inscripción original los meses con beca
    if (inscripcionSeleccionada && inscripcionSeleccionada.meses_beca) {
      const mesesConBeca = inscripcionSeleccionada.meses_beca.split(',').map(m => m.trim()).filter(m => m);
      const mesNormalizado = mes.toLowerCase();
      const tieneDescuentoEsteMes = mesesConBeca.some(m => m.toLowerCase() === mesNormalizado);
      
      if (tieneDescuentoEsteMes && compromiso.descuento_aplicado > 0) {
        // Aplicar descuento solo a este mes específico
        return Math.round(montoBaseSinDescuento * (1 - compromiso.descuento_aplicado) * 100) / 100;
      }
    }
    
    // Si no tiene beca este mes específico, devolver monto base sin descuento
    return Math.round(montoBaseSinDescuento * 100) / 100;
  };

  // Función para verificar si un mes ya está pagado
  const mesEstaPagado = (mes) => {
    if (!compromiso) return false;
    
    // Si el compromiso está concluido, todos los meses están pagados
    if (compromiso.estado_compromiso === 'concluido') return true;
    
    if (!pagos || pagos.length === 0) return false;
    
    // Buscar pagos que incluyan este mes (solo cuota o ambos)
    return pagos.some(pago => {
      if (pago.tipo_pago === 'cuota' || pago.tipo_pago === 'ambos') {
        if (pago.mes && pago.mes.includes(',')) {
          // Si el mes contiene comas, es un pago múltiple (legacy)
          const mesesPago = pago.mes.split(',').map(m => m.trim());
          return mesesPago.includes(mes);
        } else {
          // Pago individual (nuevo formato)
          return pago.mes === mes;
        }
      }
      return false;
    });
  };

  // Función para verificar si un mes está completamente pagado
  const mesEstaCompletamentePagado = (mes) => {
    if (!compromiso) return false;
    
    // Si el compromiso está concluido, todos los meses están pagados
    if (compromiso.estado_compromiso === 'concluido') return true;
    
    // Buscar en los pagos mensuales si existe el mes y está pagado
    if (pagosMensuales && pagosMensuales.length > 0) {
      const mesesMap = {
        'enero': 1,
        'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11,
        'diciembre': 12
      };
      
      const numeroMes = mesesMap[mes.toLowerCase()];
      const pagoMensual = pagosMensuales.find(pm => pm.mes === numeroMes);
      
      if (pagoMensual) {
        return pagoMensual.estado === 'pagado';
      }
    }
    
    // Fallback al método anterior si no hay datos de pagos mensuales
    if (!pagos || pagos.length === 0) return false;
    
    const montoTotalMes = calcularMontoMes(mes);
    const montoPagadoMes = obtenerMontoPagadoMes(mes);
    
    return montoPagadoMes >= montoTotalMes;
  };

  // Función para obtener el monto total pagado de un mes específico
  const obtenerMontoPagadoMes = (mes) => {
    if (!pagos || pagos.length === 0) return 0;
    
    let montoPagado = 0;
    
    pagos.forEach(pago => {
      // Solo considerar pagos de cuota o ambos
      if (pago.tipo_pago === 'cuota' || pago.tipo_pago === 'ambos') {
        if (pago.mes && pago.mes.includes(',')) {
          // Pago múltiple (legacy) - dividir el monto entre los meses
          const mesesPago = pago.mes.split(',').map(m => m.trim());
          if (mesesPago.includes(mes)) {
            // Si es tipo 'ambos', usar monto_cuota; si es 'cuota', usar monto
            const montoAPagar = pago.tipo_pago === 'ambos' ? Number(pago.monto_cuota || 0) : Number(pago.monto || 0);
            montoPagado += montoAPagar / mesesPago.length;
          }
        } else if (pago.mes === mes) {
          // Pago individual (nuevo formato)
          // Si es tipo 'ambos', usar monto_cuota; si es 'cuota', usar monto
          const montoAPagar = pago.tipo_pago === 'ambos' ? Number(pago.monto_cuota || 0) : Number(pago.monto || 0);
          montoPagado += montoAPagar;
        }
      }
    });
    
    return montoPagado;
  };

  // Función para obtener el monto pendiente de un mes
  const obtenerMontoPendienteMes = (mes) => {
    if (!compromiso) return 0;
    
    // Si el compromiso está concluido, no hay monto pendiente
    if (compromiso.estado_compromiso === 'concluido') return 0;
    
    // Buscar en los pagos mensuales si existe el mes
    if (pagosMensuales && pagosMensuales.length > 0) {
      const mesesMap = {
        'enero': 1,
        'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11,
        'diciembre': 12
      };
      
      const numeroMes = mesesMap[mes.toLowerCase()];
      const pagoMensual = pagosMensuales.find(pm => pm.mes === numeroMes);
      
      if (pagoMensual) {
        return parseFloat(pagoMensual.saldo_pendiente) || 0;
      }
    }
    
    // Fallback al método anterior si no hay datos de pagos mensuales
    const montoTotal = calcularMontoMes(mes);
    const montoPagado = obtenerMontoPagadoMes(mes);
    const pendiente = montoTotal - montoPagado;
    
    return pendiente > 0 ? pendiente : 0;
  };

  // Función para verificar si un mes tiene pago parcial
  const mesTienePagoParcial = (mes) => {
    if (!compromiso) return false;
    
    // Si el compromiso está concluido, no hay pagos parciales (está completamente pagado)
    if (compromiso.estado_compromiso === 'concluido') return false;
    
    // Buscar en los pagos mensuales si existe el mes
    if (pagosMensuales && pagosMensuales.length > 0) {
      const mesesMap = {
        'enero': 1,
        'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11,
        'diciembre': 12
      };
      
      const numeroMes = mesesMap[mes.toLowerCase()];
      const pagoMensual = pagosMensuales.find(pm => pm.mes === numeroMes);
      
      if (pagoMensual) {
        return pagoMensual.estado === 'parcial';
      }
    }
    
    // Fallback al método anterior si no hay datos de pagos mensuales
    const montoPagado = obtenerMontoPagadoMes(mes);
    const montoTotal = calcularMontoMes(mes);
    
    return montoPagado > 0 && montoPagado < montoTotal;
  };

  // Función para verificar si un mes tiene beca aplicada
  const mesTieneBeca = (mes) => {
    if (!compromiso || !compromiso.descuento_aplicado || !inscripcionSeleccionada) return false;
    
    // Verificar si este mes específico está en la lista de meses con beca
    if (inscripcionSeleccionada.meses_beca) {
      const mesesConBeca = inscripcionSeleccionada.meses_beca.split(',').map(m => m.trim()).filter(m => m);
      const mesNormalizado = mes.toLowerCase();
      return mesesConBeca.some(m => m.toLowerCase() === mesNormalizado);
    }
    
    return false;
  };

  // Función para renderizar el grid de meses de forma organizada
  const renderMesesGrid = () => {
    const mesesPorFila = 3;
    const filas = [];
    
    for (let i = 0; i < mesesPagos.length; i += mesesPorFila) {
      const mesesFila = mesesPagos.slice(i, i + mesesPorFila);
      const esUltimaFila = i + mesesPorFila >= mesesPagos.length;
      
      filas.push(
        <div key={`fila-${i}`} className={`row mb-3 ${esUltimaFila && mesesFila.length < mesesPorFila ? 'justify-content-center' : ''}`}>
          {mesesFila.map(mes => renderMesCard(mes))}
        </div>
      );
    }
    
    return filas;
  };

  // Función para renderizar cada tarjeta de mes
  const renderMesCard = (mes) => {
    const montoMes = calcularMontoMes(mes);
    const estaCompletamentePagado = mesEstaCompletamentePagado(mes);
    const tienePagoParcial = mesTienePagoParcial(mes);
    const montoPendiente = obtenerMontoPendienteMes(mes);
    const tieneBeca = mesTieneBeca(mes);
    const estaSeleccionado = mesesSeleccionados.includes(mes);
    
    // Determinar clases CSS según el estado
    const getCardClasses = () => {
      if (estaCompletamentePagado) {
        return 'bg-light border-secondary text-muted';
      }
      if (tienePagoParcial) {
        return estaSeleccionado 
          ? 'bg-warning bg-opacity-20 border-warning'
          : 'bg-warning bg-opacity-10 border-warning';
      }
      return estaSeleccionado 
        ? 'bg-primary bg-opacity-10 border-primary' 
        : 'bg-white border-secondary';
    };

    return (
      <div key={mes} className="col-4 mb-2">
        <div 
          className={`border rounded p-2 text-center ${getCardClasses()}`}
          style={{
            cursor: estaCompletamentePagado ? 'not-allowed' : 'pointer',
            minHeight: '85px',
            transition: 'all 0.2s ease',
            boxShadow: estaSeleccionado ? '0 2px 8px rgba(0,123,255,0.2)' : '0 1px 3px rgba(0,0,0,0.1)'
          }}
          onClick={() => !estaCompletamentePagado && toggleMesSeleccionado(mes)}
        >
          {/* Checkbox */}
          <div className="mb-2">
            <input
              className="form-check-input"
              type="checkbox"
              id={`mes-${mes}`}
              checked={estaSeleccionado}
              onChange={() => toggleMesSeleccionado(mes)}
              disabled={estaCompletamentePagado}
              style={{transform: 'scale(1.2)'}}
            />
          </div>
          
          {/* Nombre del mes */}
          <div className="fw-bold mb-2" style={{fontSize: '0.9rem', color: '#333'}}>
            {mes.charAt(0).toUpperCase() + mes.slice(1)}
          </div>
          
          {/* Badges de estado */}
          <div className="mb-2">
            {tieneBeca && (
              <span className="badge bg-success me-1" style={{fontSize: '0.7rem'}}>
                Beca
              </span>
            )}
            {estaCompletamentePagado && (
              <span className="badge bg-secondary me-1" style={{fontSize: '0.7rem'}}>
                Pagado
              </span>
            )}
            {tienePagoParcial && (
              <span className="badge bg-warning me-1" style={{fontSize: '0.7rem'}}>
                Parcial
              </span>
            )}
          </div>
          
          {/* Monto */}
          <div style={{fontSize: '0.8rem'}}>
            {estaCompletamentePagado ? (
              <span className="text-success fw-bold">✓ Completo</span>
            ) : tienePagoParcial ? (
              <div>
                <div className="text-warning fw-bold mb-1">Pendiente:</div>
                <div className="fw-bold text-dark">Bs {montoPendiente.toFixed(2)}</div>
              </div>
            ) : (
              <span className="fw-bold text-primary">
                Bs {montoMes}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  const calcularMontoMesesSeleccionados = () => {
    if (!compromiso || mesesSeleccionados.length === 0) return 0;
    
    return mesesSeleccionados.reduce((total, mes) => {
      // Para meses con pago parcial, solo sumar el monto pendiente
      const montoPendiente = obtenerMontoPendienteMes(mes);
      return total + (montoPendiente > 0 ? montoPendiente : calcularMontoMes(mes));
    }, 0);
  };

  // Función para obtener el monto a usar (editable o calculado)
  const obtenerMontoFinal = () => {
    if (modoEdicionMonto && montoEditable !== '') {
      return parseFloat(montoEditable) || 0;
    }
    return calcularMontoMesesSeleccionados();
  };

  // Función para alternar entre modo automático y manual
  const toggleModoEdicionMonto = () => {
    if (!modoEdicionMonto) {
      // Cambiar a modo manual: establecer el monto calculado como base
      setMontoEditable(calcularMontoMesesSeleccionados().toString());
    }
    setModoEdicionMonto(!modoEdicionMonto);
  };

  // Actualizar monto editable cuando cambian los meses seleccionados (solo en modo automático)
  useEffect(() => {
    if (!modoEdicionMonto) {
      setMontoEditable(calcularMontoMesesSeleccionados().toString());
    }
  }, [mesesSeleccionados, modoEdicionMonto]);

  const pagarMesesSeleccionados = async () => {
    if (!compromiso || mesesSeleccionados.length === 0) {
      showError('Error', 'Debe seleccionar al menos un mes para pagar');
      return;
    }

    // Calcular el total real a pagar (solo cuota)
    const montoCuota = obtenerMontoFinal();
    const montoTotal = montoCuota;

    if (montoTotal <= 0) {
      showError('Error', 'El monto a pagar debe ser mayor a 0');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const fechaHoy = fechaPago || new Date().toISOString().slice(0, 10);
      // Usar la gestión/año del compromiso o inscripción si está disponible; fallback al año actual
      const anioCompromiso = (inscripcionSeleccionada && (inscripcionSeleccionada.gestion || inscripcionSeleccionada.gestion_academica))
        || (compromiso && (compromiso.gestion || compromiso.anio))
        || new Date().getFullYear();
      
      let pagosARegistrar = [];
      let pagosExitosos = 0;
      let erroresPago = [];

      // Registrar pago individual para cada mes seleccionado
      if (montoCuota > 0) {
        // Calcular cómo distribuir el monto entre los meses seleccionados
        let montoRestante = montoCuota;
        
        for (let i = 0; i < mesesSeleccionados.length; i++) {
          const mes = mesesSeleccionados[i];
          let montoMes;
          
          if (modoEdicionMonto) {
            // En modo manual, distribuir proporcionalmente o usar el monto restante
            if (i === mesesSeleccionados.length - 1) {
              // Último mes: usar todo el monto restante
              montoMes = montoRestante;
            } else {
              // Calcular proporción basada en el monto pendiente/total de cada mes
              const montoPendienteMes = obtenerMontoPendienteMes(mes) > 0 ? obtenerMontoPendienteMes(mes) : calcularMontoMes(mes);
              const totalCalculado = calcularMontoMesesSeleccionados();
              const proporcion = totalCalculado > 0 ? montoPendienteMes / totalCalculado : 1 / mesesSeleccionados.length;
              montoMes = Math.round(montoCuota * proporcion * 100) / 100;
              montoRestante -= montoMes;
            }
          } else {
            // En modo automático, usar el monto calculado normalmente
            montoMes = obtenerMontoPendienteMes(mes) > 0 ? obtenerMontoPendienteMes(mes) : calcularMontoMes(mes);
          }
          
          const detalleCuota = `Pago de ${mes} - Cuota: Bs ${montoMes} - ${fechaHoy}`;
          
          const pagoCuotaData = {
            id_compromiso: compromiso.id,
            fecha_pago: fechaHoy,
            monto: montoMes,
            tipo_pago: 'cuota',
            detalle: detalleCuota,
            mes: mes,
            anio: anioCompromiso,
            forma_pago: formaPago || 'Efectivo',
            observacion: observacionPago.trim() || `Pago de ${mes}`,
            numero_comprobante: numeroComprobante.trim() || null,
            nit_ci: nitCi.trim() || null
          };

          try {
            // Verificar que el token existe
            if (!token) {
              erroresPago.push(`Error al registrar cuota de ${mes}: No hay token de autenticación. Por favor, inicia sesión nuevamente.`);
              return;
            }

            const user = AuthService.getUser();
            if (!user) {
              erroresPago.push(`Error al registrar cuota de ${mes}: No hay información de usuario. Por favor, inicia sesión nuevamente.`);
              return;
            }

            const apiUrl = getApiUrl('/pagos-realizados', user.rol);
            const url = `${apiUrl}/pagos-realizados`;
            
            console.log('Registrando pago en:', url);
            console.log('Usuario:', user.rol);
            console.log('Token presente:', !!token);
            
            const response = await fetch(url, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify(pagoCuotaData)
            });

            // Verificar el tipo de contenido antes de parsear
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
              const text = await response.text();
              console.error('Respuesta no es JSON:', text.substring(0, 200));
              console.error('Status:', response.status);
              console.error('URL:', url);
              
              if (response.status === 401) {
                erroresPago.push(`Error al registrar cuota de ${mes}: Token inválido o expirado. Por favor, inicia sesión nuevamente.`);
              } else if (response.status === 404) {
                erroresPago.push(`Error al registrar cuota de ${mes}: La ruta no existe. Verifica que el backend-cajas esté funcionando.`);
              } else {
                erroresPago.push(`Error al registrar cuota de ${mes}: El servidor devolvió una respuesta inválida (${response.status})`);
              }
              return;
            }

            if (response.ok) {
              const responseData = await response.json();
              pagosExitosos++;
              
              // Verificar si el compromiso fue marcado como concluido
              if (responseData.compromiso_concluido) {
                showSuccess('¡Compromiso Concluido!', 'El compromiso económico ha sido marcado como CONCLUIDO al completar todos los pagos.');
              }
            } else {
              let errorData;
              try {
                errorData = await response.json();
              } catch (e) {
                errorData = { message: `Error ${response.status}: ${response.statusText}` };
              }
              console.error('Error del servidor:', errorData);
              
              if (response.status === 401) {
                erroresPago.push(`Error al registrar cuota de ${mes}: Token inválido o expirado. Por favor, inicia sesión nuevamente.`);
              } else {
                erroresPago.push(`Error al registrar cuota de ${mes}: ${errorData.message || 'Error desconocido'}`);
              }
            }
          } catch (error) {
            console.error('Error al registrar pago:', error);
            erroresPago.push(`Error de conexión al registrar cuota de ${mes}: ${error.message}`);
          }
        }
      }



      // Mostrar resultados
      if (pagosExitosos > 0) {
        showSuccess('Éxito', `${pagosExitosos} pago(s) registrado(s) exitosamente por un total de Bs ${montoTotal.toFixed(2)}`);
        
        // Generar PDF automáticamente con los datos del pago
        const pagoParaPDF = {
          fecha_pago: fechaHoy,
          mes: mesesSeleccionados.join(', '),
          anio: new Date().getFullYear(),
          monto_cuota: montoCuota,
          monto_material: 0,
          monto: montoTotal,
          forma_pago: formaPago || 'Efectivo',
          detalle: `Pago de ${mesesSeleccionados.length} mes(es): ${mesesSeleccionados.join(', ')}`,
          observacion: observacionPago || 'ninguna observación',
          numero_comprobante: numeroComprobante || 'No especificado',
          nit_ci: nitCi || 'No especificado',
          tipo_pago: 'cuota'
        };
        
        // Calcular saldos pendientes correctamente
        const numeroCuotas = mesesPagos.length;
        const montoEsperadoCuota = compromiso ? Math.round((compromiso.total_cuotas / numeroCuotas) * 100) / 100 : 0;
        
        const saldoPendienteCuota = Math.max(0, montoEsperadoCuota - montoCuota);
        
        // Agregar saldos pendientes al objeto de pago para el PDF
        pagoParaPDF.saldoPendienteCuota = saldoPendienteCuota;
        pagoParaPDF.saldoPendienteMaterial = 0;
        
        generarPDFPago(pagoParaPDF, form, saldoPendienteCuota);
        
        // Limpiar formulario
        setMesesSeleccionados([]);
        setObservacionPago('');
        setNumeroComprobante('');
        setNitCi('');
        setFormaPago('');
        setMontoEditable('');
        setModoEdicionMonto(false);
        
        // Cerrar modal
        setMostrarModalPago(false);
        
        // Recargar datos del compromiso sin resetear el estudiante seleccionado
        if (inscripcionSeleccionada && inscripcionSeleccionada.id) {
          await cargarCompromiso(inscripcionSeleccionada.id);
          // Recargar inscripciones para actualizar estados de compromisos, pero manteniendo la selección
          if (form.id) {
            await cargarInscripciones(form.id, true);
          }
        }
      }

      if (erroresPago.length > 0) {
        showError('Errores en el registro', erroresPago.join('\n'));
      }

    } catch (error) {
      console.error('Error al pagar meses seleccionados:', error);
      showError('Error', 'Error de conexión al registrar el pago');
    }
  };



  // Cálculos de saldos usando las tablas pagos_mensuales y material_didactico
  const calcularSaldoCuotas = () => {
    if (!compromiso) return 0;
    
    // Si el compromiso está concluido, el saldo debe ser 0
    if (compromiso.estado_compromiso === 'concluido') return 0;
    
    // Usar datos de pagos_mensuales si están disponibles
    if (pagosMensuales && pagosMensuales.length > 0) {
      return pagosMensuales.reduce((total, pm) => total + parseFloat(pm.saldo_pendiente || 0), 0);
    }
    
    // Fallback al método anterior
    const pagadoCuotas = pagos.filter(p => p.tipo_pago === 'cuota' || p.tipo_pago === 'ambos').reduce((sum, p) => sum + Number(p.monto), 0);
    return compromiso.total_cuotas - pagadoCuotas;
  };





  // Datos previos para la tabla
  // const becaPrev = getBecaEstudiante(form.id_beca); // No se usa
  // const descuentoPrev = becaPrev ? Number(becaPrev.descuento) : 0; // No se usa
  // const montoOriginalPrev = 7500; // No se usa
  // const montoConDescuentoPrev = Math.round((montoOriginalPrev - (montoOriginalPrev * (descuentoPrev / 100))) * 100) / 100; // No se usa
  // const materialPrev = 400; // No se usa
  // const totalGeneralPrev = montoConDescuentoPrev + materialPrev; // No se usa

  // Ordenar todos los pagos por fecha
  const pagosOrdenados = [...pagos].sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago));

  // Filtrar los pagos antes de renderizar
  const pagosFiltrados = pagosOrdenados.filter(pago => {
    const tipoOk =
      filtroTipo === 'Todos' ||
      (filtroTipo === 'Cuota' && pago.tipo_pago === 'cuota') ||
      (filtroTipo === 'Servicio' && (pago.tipo_pago === 'material' || pago.tipo_pago === 'servicio')) ||
      (filtroTipo === 'Ambos' && pago.tipo_pago === 'ambos') ||
      (filtroTipo === 'Material' && pago.tipo_pago === 'material');
    const mesOk = filtroMes === 'Todos' || pago.mes === filtroMes;
    return tipoOk && mesOk;
  });

  // Función para manejar la subida de comprobantes directamente desde la tabla

  // Funciones para el modal de información
  const formatearFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).toLocaleDateString('es-ES');
  };
  
  // Función para extraer el mes de una fecha
  const obtenerMesDeFecha = (fecha) => {
    if (!fecha) return '-';
    const date = new Date(fecha);
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return meses[date.getMonth()];
  };
  
  // Función para extraer el año de una fecha
  const obtenerAnioDeFecha = (fecha) => {
    if (!fecha) return '-';
    return new Date(fecha).getFullYear();
  };

  const formatearMonto = (monto) => {
    if (!monto) return '0.00';
    return parseFloat(monto).toFixed(2);
  };

  const handleSubirComprobante = async (pago, archivo, idOcrComprobante = null) => {
    if (!archivo) {
      showError('No se seleccionó ningún archivo');
      return;
    }
    
    console.log('📤 Subiendo comprobante:', {
      pagoId: pago.id,
      fileName: archivo.name,
      fileSize: archivo.size,
      fileType: archivo.type,
      isFile: archivo instanceof File,
      isBlob: archivo instanceof Blob
    });
    
    // Validar tipo de archivo
    const tiposPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!tiposPermitidos.includes(archivo.type)) {
      console.warn('⚠️ Tipo de archivo no permitido:', archivo.type);
      showError('Solo se permiten archivos JPG, PNG o PDF');
      return;
    }
    
    // Validar tamaño (máximo 5MB)
    if (archivo.size > 5 * 1024 * 1024) {
      showError('El archivo no puede ser mayor a 5MB');
      return;
    }

    // Validar que el archivo tenga contenido
    if (archivo.size === 0) {
      console.error('❌ El archivo está vacío');
      showError('El archivo está vacío. Por favor, intente nuevamente.');
      return;
    }
    
    setSubiendoComprobante(true);
    try {
      const formData = new FormData();
      formData.append('comprobante', archivo);
      formData.append('pago_id', String(pago.id));
      formData.append('origen_registro', String(pago.origen_registro || 'pagos_realizados'));
      // Si se proporciona el ID del comprobante OCR, agregarlo para rastrear qué comprobante fue usado
      if (idOcrComprobante) {
        formData.append('id_ocr_comprobante', String(idOcrComprobante));
      }

      // Verificar que el FormData tenga el archivo
      console.log('📋 FormData preparado:', {
        tieneComprobante: formData.has('comprobante'),
        tienePagoId: formData.has('pago_id'),
        tieneOcrComprobante: formData.has('id_ocr_comprobante'),
        pagoId: pago.id,
        ocrComprobanteId: idOcrComprobante
      });

      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/comprobantes', user?.rol);
      
      console.log('🌐 Enviando a:', `${apiUrl}/comprobantes/upload-comprobante-firmado`);
      
      const response = await fetch(`${apiUrl}/comprobantes/upload-comprobante-firmado`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
          // NO incluir Content-Type, dejar que el navegador lo establezca automáticamente para FormData
        },
        body: formData
      });

      console.log('📥 Respuesta recibida:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      const result = await response.json();
      console.log('📦 Resultado:', result);

      if (response.ok && result.success) {
        console.log('✅ Comprobante subido correctamente, recargando datos...');
        // Recargar los pagos para actualizar la tabla ANTES de mostrar el éxito
        if (inscripcionSeleccionada && inscripcionSeleccionada.id) {
          console.log('🔄 Recargando compromiso para estudiante:', inscripcionSeleccionada.id);
          try {
            await cargarCompromiso(inscripcionSeleccionada.id);
            // Esperar un momento para que el estado se actualice
            await new Promise(resolve => setTimeout(resolve, 500));
            console.log('✅ Datos recargados correctamente');
          } catch (reloadError) {
            console.error('⚠️ Error al recargar después de subir comprobante:', reloadError);
          }
        }
        const archivoServidor = result.fileName ? `Guardado como: ${result.fileName}` : '';
        const archivoOriginal = archivo?.name ? `Archivo subido: ${archivo.name}` : '';
        const detalle = [archivoOriginal, archivoServidor].filter(Boolean).join(' | ');
        showSuccess(detalle ? `Comprobante subido exitosamente. ${detalle}` : 'Comprobante subido exitosamente');
      } else {
        console.error('❌ Error en la respuesta:', result);
        showError(result.error || 'Error al subir el comprobante');
      }
    } catch (error) {
      console.error('❌ Error al subir comprobante:', error);
      showError('Error de conexión al subir el comprobante: ' + error.message);
    } finally {
      setSubiendoComprobante(false);
    }
  };

  const handleVerComprobante = (comprobanteUrl, nombreArchivo = 'comprobante.pdf') => {
    setModalVisualizarComprobante({
      isOpen: true,
      url: comprobanteUrl,
      nombreArchivo: nombreArchivo
    });
  };

  const handleCerrarModalVisualizar = () => {
    setModalVisualizarComprobante({
      isOpen: false,
      url: null,
      nombreArchivo: 'comprobante.pdf'
    });
  };

  const handleDescargarComprobante = async (comprobanteUrl, nombreArchivo = 'comprobante.pdf') => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(comprobanteUrl, {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombreArchivo || 'comprobante.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al descargar:', error);
      showError('Error al descargar el comprobante');
    }
  };

  const confirmarEliminarComprobante = (pagoRef) => {
    const pago = typeof pagoRef === 'object'
      ? pagoRef
      : pagos.find(p => String(p.id) === String(pagoRef));
    setConfirmEliminarComprobante({
      isOpen: true,
      pagoId: pago?.id || pagoRef,
      origenRegistro: pago?.origen_registro || 'pagos_realizados'
    });
  };

  const cancelarEliminarComprobante = () => {
    setConfirmEliminarComprobante({
      isOpen: false,
      pagoId: null,
      origenRegistro: 'pagos_realizados'
    });
  };

  const handleEliminarComprobante = async () => {
    const pagoId = confirmEliminarComprobante.pagoId;
    const origenRegistro = confirmEliminarComprobante.origenRegistro || 'pagos_realizados';
    if (!pagoId) return;
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/comprobantes', user?.rol);
      const response = await fetch(`${apiUrl}/comprobantes/eliminar/${pagoId}?origen=${encodeURIComponent(origenRegistro)}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (response.ok && result.success) {
        showSuccess('Comprobante eliminado exitosamente');
        cancelarEliminarComprobante();
        // Recargar los pagos
        if (inscripcionSeleccionada && inscripcionSeleccionada.id) {
          cargarCompromiso(inscripcionSeleccionada.id);
        }
      } else {
        showError(result.error || 'Error al eliminar el comprobante');
      }
    } catch (error) {
      console.error('Error:', error);
      showError('Error de conexión al eliminar el comprobante');
    }
  };

  // Filtrar pagos para el modal de información
  const pagosModalFiltrados = pagos.filter(pago => {
    const cumpleTipo =
      filtroTipo === 'Todos' ||
      (filtroTipo === 'Cuota' && pago.tipo_pago === 'cuota') ||
      (filtroTipo === 'Servicio' && (pago.tipo_pago === 'material' || pago.tipo_pago === 'servicio')) ||
      (filtroTipo === 'Ambos' && pago.tipo_pago === 'ambos') ||
      (filtroTipo === 'Material' && pago.tipo_pago === 'material');
    const cumpleMes = filtroMes === 'Todos' || pago.mes === filtroMes;
    const cumpleAnio = !filtroAnio || pago.anio_pagado === parseInt(filtroAnio);
    return cumpleTipo && cumpleMes && cumpleAnio;
  });

  // Usar useRef para almacenar valores previos y evitar loops infinitos
  const prevPagosRef = useRef();
  const prevPagosMensualesRef = useRef();
  const prevCompromisoRef = useRef();
  const cargandoCompromisoRef = useRef(false); // Flag para evitar múltiples cargas simultáneas

  // Calcular saldos usando useCallback para evitar recrear la función
  const calcularSaldos = useCallback(() => {
    if (!compromiso) {
      setSaldoCuotas(0);
      setSaldoTotal(0);
      return;
    }

    let totalEsperadoCuotas = 0;
    let totalPagadoCuotas = 0;

    // Si tenemos datos de pagosMensuales, usarlos
    if (pagosMensuales && pagosMensuales.length > 0) {
      
      // Mapeo de nombres de meses a números
      const mesesNumeros = {
        'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6,
        'julio': 7, 'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11
      };
      
      mesesPagos.forEach(mes => {
        const numeroMes = mesesNumeros[mes];
        const pagoMes = pagosMensuales.find(p => p.mes === numeroMes);
        if (pagoMes) {
          totalEsperadoCuotas += parseFloat(pagoMes.monto_esperado) || 0;
          totalPagadoCuotas += parseFloat(pagoMes.monto_pagado) || 0;
        }
      });
      
    } else {
      // Fallback: calcular basado en el compromiso y pagos directos
      const totalCuotasCompromiso = compromiso.total_cuotas || 0;
      const numeroCuotas = compromiso.cuotas || 10;
      const costoMensual = totalCuotasCompromiso / numeroCuotas;
      totalEsperadoCuotas = totalCuotasCompromiso; // Usar el total directamente
      
      // Calcular pagado desde los pagos directos
      if (pagos && pagos.length > 0) {
        totalPagadoCuotas = pagos
          .filter(p => p.tipo_pago === 'cuota')
          .reduce((sum, p) => sum + (parseFloat(p.monto) || 0), 0);
      }
    }

    const newSaldoCuotas = Math.max(0, totalEsperadoCuotas - totalPagadoCuotas);
    const newSaldoTotal = newSaldoCuotas;

    setSaldoCuotas(newSaldoCuotas);
    setSaldoTotal(newSaldoTotal);
  }, [compromiso, pagosMensuales, pagos, mesesPagos]);

  // useEffect para calcular saldos cuando cambien los datos relevantes
  // Usar comparación optimizada para evitar loops infinitos
  useEffect(() => {
    // Comparar si realmente cambiaron los valores (no solo las referencias)
    // Usar comparación más eficiente: solo IDs y valores clave, NO JSON.stringify
    const pagosChanged = 
      !prevPagosRef.current || 
      prevPagosRef.current.length !== pagos.length ||
      (pagos.length > 0 && prevPagosRef.current.length > 0 && 
       prevPagosRef.current[0]?.id !== pagos[0]?.id);
    
    const pagosMensualesChanged = 
      !prevPagosMensualesRef.current || 
      prevPagosMensualesRef.current.length !== pagosMensuales.length ||
      (pagosMensuales.length > 0 && prevPagosMensualesRef.current.length > 0 &&
       prevPagosMensualesRef.current[0]?.id !== pagosMensuales[0]?.id);
    
    const compromisoChanged = 
      !prevCompromisoRef.current || 
      prevCompromisoRef.current.id !== compromiso?.id ||
      prevCompromisoRef.current.total_cuotas !== compromiso?.total_cuotas ||
      prevCompromisoRef.current.cuotas !== compromiso?.cuotas;

    // Solo ejecutar si realmente cambiaron los valores
    if (pagosChanged || pagosMensualesChanged || compromisoChanged) {
      calcularSaldos();
      
      // Actualizar referencias después de calcular
      prevPagosRef.current = pagos;
      prevPagosMensualesRef.current = pagosMensuales;
      prevCompromisoRef.current = compromiso;
    }
  }, [compromiso, pagosMensuales, pagos]); // Remover calcularSaldos de las dependencias para evitar ciclo infinito

  return (
    <>
      <div className="container py-4">
      {/* Encabezado con botón hamburguesa */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Compromiso Económico</h2>
        <button 
          className="btn btn-outline-primary d-md-none" 
          onClick={() => setShowMobileMenu(true)}
        >
          <i className="fas fa-bars"></i>
        </button>
      </div>

      {/* Búsqueda por CI */}
      {!estudianteSeleccionado && (
        <form className="mb-3" onSubmit={handleBuscar}>
          <div className="row g-2 align-items-end">
            <div className="col-md-8">
              <label className="form-label">C.I. del estudiante</label>
              <input type="text" className="form-control" value={ci} onChange={e => setCi(e.target.value)} />
            </div>
            <div className="col-md-4">
              <button className="btn btn-primary w-100" type="submit" disabled={buscando}>
                {buscando ? 'Buscando...' : 'Buscar por CI'}
              </button>
            </div>
          </div>
        </form>
      )}
      {/* Búsqueda por nombre en tiempo real */}
      {!estudianteSeleccionado && (
        <div className="mb-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-8">
              <label className="form-label">Nombre del estudiante</label>
              <input
                type="text"
                className="form-control"
                value={nombreBusqueda}
                onChange={e => {
                  setNombreBusqueda(e.target.value);
                  if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
                  const valor = e.target.value;
                  debounceTimeout.current = setTimeout(() => {
                    buscarNombreTiempoReal(valor);
                  }, 300);
                }}
                placeholder="Escribe al menos 2 letras..."
              />
            </div>
            <div className="col-md-4 d-flex align-items-center">
              {buscando && <span className="text-info ms-2">Buscando...</span>}
            </div>
          </div>
        </div>
      )}
      {/* Lista de resultados por nombre */}
      {resultados.length > 0 && (
        <div className="mb-3">
          <div className="alert alert-secondary py-2 mb-1">Selecciona un estudiante:</div>
          <ul className="list-group">
            {resultados.map(est => (
              <li key={est.id} className="list-group-item list-group-item-action" style={{cursor:'pointer'}} onClick={() => cargarDatosEstudiante(est)}>
                <div>
                  <strong>{est.nombre} {est.apellido_paterno} {est.apellido_materno}</strong> - CI: {est.ci_estudiante}
                </div>
                <div className="text-muted small">
                  {est.nivel_nombre && est.curso_nombre ? 
                    `Nivel: ${est.nivel_nombre} - Curso: ${est.curso_nombre}` : 
                    'Sin inscripción activa'
                  }
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {error && <div className="alert alert-danger mt-2 py-1">{error}</div>}
      {estudianteSeleccionado && (
        <div>
          <div className="mb-3">
            <button className="btn btn-warning me-2" onClick={buscarDeNuevo}>
              Buscar de nuevo
            </button>
            <button 
              className="btn btn-info"
              onClick={() => {
                setShowInformacionModal(true);
              }}
              style={{
                background: 'linear-gradient(90deg, #17a2b8 0%, #20c997 100%)',
                color: 'white',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(23, 162, 184, 0.15)',
                padding: '8px 16px'
              }}
            >
              <i className="fas fa-info-circle me-2"></i>
              Mostrar Información
            </button>
          </div>


          {/* Mostrar inscripciones si hay múltiples */}
          {mostrarInscripciones && inscripciones.length > 1 && (
            <div className="card mb-3">
              <div className="card-header bg-warning text-dark">
                <i className="fas fa-exclamation-triangle me-2"></i>
                Selecciona una inscripción
              </div>
              <div className="card-body">
                <p className="text-muted mb-3">
                  Este estudiante tiene múltiples inscripciones. Selecciona la inscripción para la cual quieres gestionar el compromiso económico.
                </p>
                <div className="row">
                  {inscripciones.map((inscripcion) => (
                    <div key={inscripcion.id} className="col-md-6 mb-3">
                      <div 
                        className={`card cursor-pointer ${inscripcionSeleccionada?.id === inscripcion.id ? 'border-primary bg-light' : 'border-secondary'}`}
                        onClick={() => seleccionarInscripcion(inscripcion)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div className="card-body">
                          <h6 className="card-title">
                            {inscripcion.nivel_nombre} - {inscripcion.curso_nombre}
                          </h6>
                          <p className="card-text">
                            <small className="text-muted">
                              Bloque: {inscripcion.bloque_nombre}<br/>
                              Turno: {inscripcion.turno}<br/>
                              Fecha: {new Date(inscripcion.fecha_inscripcion).toLocaleDateString()}
                            </small>
                          </p>
                          {inscripcion.tiene_compromiso ? (
                            <span className={`badge ${
                              inscripcion.estado_compromiso === 'concluido' ? 'bg-success' :
                              inscripcion.estado_compromiso === 'activo' ? 'bg-primary' :
                              inscripcion.estado_compromiso === 'cancelado' ? 'bg-warning' :
                              inscripcion.estado_compromiso === 'retirado' ? 'bg-danger' : 'bg-secondary'
                            }`}>
                              {inscripcion.estado_compromiso === 'concluido' ? 'CONCLUIDO' :
                               inscripcion.estado_compromiso === 'activo' ? 'ACTIVO' :
                               inscripcion.estado_compromiso === 'cancelado' ? 'CANCELADO' :
                               inscripcion.estado_compromiso === 'retirado' ? 'RETIRADO' : 'CON COMPROMISO'}
                            </span>
                          ) : (
                            <span className="badge bg-warning">Sin compromiso</span>
                          )}
                          {inscripcionSeleccionada?.id === inscripcion.id && (
                            <span className="badge bg-primary ms-2">Seleccionada</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mostrar información de inscripción seleccionada */}
          {inscripcionSeleccionada && !mostrarInscripciones && (
            <div className="alert alert-info">
              <strong>Inscripción activa:</strong> {inscripcionSeleccionada.nivel_nombre} - {inscripcionSeleccionada.curso_nombre} - {inscripcionSeleccionada.bloque_nombre}
            </div>
          )}

          {/* Si no hay compromiso, mostrar resumen y botón para registrar */}
          {!compromiso && (
            <div className="card mb-3 shadow-sm">
              <div className="card-body">
                <h5 className="card-title mb-3">Resumen previo al compromiso</h5>
                {(() => {
                  const resumen = calcularResumenCompromiso();
                  if (!resumen) return <p className="text-muted">Selecciona una inscripción para ver el resumen</p>;
                  
                  return (
                    <>
                      <div className="row mb-3">
                        <div className="col-md-6">
                          <h6 className="text-primary">Información de la beca</h6>
                          <p className="mb-1"><strong>Descuento:</strong> {resumen.descuentoPorc}%</p>
                          <p className="mb-1"><strong>Meses con beca:</strong> {resumen.mesesConBeca.length > 0 ? resumen.mesesConBeca.join(', ') : 'Ninguno'}</p>
                          <p className="mb-0"><strong>Meses sin beca:</strong> {resumen.mesesSinBeca}</p>
                        </div>
                        <div className="col-md-6">
                          <h6 className="text-primary">Cálculo de cuotas</h6>
                          <p className="mb-1"><strong>Cuota mensual base:</strong> Bs {resumen.cuotaMensualBase.toFixed(2)}</p>
                          <p className="mb-1"><strong>Cuota con descuento:</strong> Bs {resumen.cuotaConDescuento.toFixed(2)}</p>
                          <p className="mb-0"><strong>Descuento total:</strong> Bs {resumen.descuentoTotal.toFixed(2)}</p>
                        </div>
                      </div>
                      
                      <table className="table table-bordered w-auto mb-3">
                        <tbody>
                          <tr>
                            <th>Total sin descuento (nivel {inscripcionSeleccionada?.nivel_nombre})</th>
                            <td>Bs {resumen.costoTotal.toFixed(2)}</td>
                          </tr>
                          <tr>
                            <th>Total con descuento aplicado</th>
                            <td>Bs {resumen.totalConDescuento.toFixed(2)}</td>
                          </tr>

                          <tr className="table-success">
                            <th><strong>Total general</strong></th>
                            <td><strong>Bs {resumen.totalGeneral.toFixed(2)}</strong></td>
                          </tr>
                        </tbody>
                      </table>
                      
                      <div className="alert alert-info">
                        <h6 className="alert-heading">Desglose detallado:</h6>
                        <p className="mb-1">• {resumen.mesesSinBeca} meses sin beca: {resumen.mesesSinBeca} × Bs {resumen.cuotaMensualBase.toFixed(2)} = Bs {resumen.totalMesesSinBeca.toFixed(2)}</p>
                        <p className="mb-0">• {resumen.mesesConBeca.length} meses con beca ({resumen.descuentoPorc}%): {resumen.mesesConBeca.length} × Bs {resumen.cuotaConDescuento.toFixed(2)} = Bs {resumen.totalMesesConBeca.toFixed(2)}</p>
                      </div>
                    </>
                  );
                })()}
                <button className="btn btn-success" onClick={() => setShowModal(true)} disabled={!inscripcionSeleccionada}>
                  Registrar compromiso
                </button>
              </div>
            </div>
          )}
          {/* Si hay compromiso, mostrar datos y pagos */}
          {compromiso && (
            <>


              {/* Justo antes del historial de pagos, muestra el resumen de saldos como una tabla de una sola fila */}
          

              {/* Tabla de control de pagos mensual - Solo mostrar si hay inscripción seleccionada */}
              {compromiso && inscripcionSeleccionada && !mostrarInscripciones && (
                <div className="card mb-3">
                  <div className="card-header bg-secondary text-white">Control de Pagos Mensuales</div>
                  <div className="card-body p-0">
                    <table className="table table-bordered table-sm mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>Mes</th>
                          <th>Monto esperado</th>
                          <th>Monto pagado</th>
                          <th>Saldo pendiente</th>
                          <th>Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Usar datos de la tabla pagos_mensuales */}
                        {pagosMensuales.length > 0 ? (
                          pagosMensuales.map((pagoMensual) => {
                            const montoEsperado = Number(pagoMensual.monto_esperado || 0);
                            const montoPagado = Number(pagoMensual.monto_pagado || 0);
                            const saldoPendiente = Number(pagoMensual.saldo_pendiente || 0);
                            const tieneBeca = pagoMensual.tiene_beca === 1;
                            
                            let estado = '';
                            let color = '';
                            
                            switch (pagoMensual.estado) {
                              case 'pagado':
                                estado = 'Pagado';
                                color = 'success';
                                break;
                              case 'parcial':
                                estado = `Parcial (Falta Bs ${saldoPendiente.toFixed(2)})`;
                                color = 'warning';
                                break;
                              case 'pendiente':
                              default:
                                estado = 'Pendiente';
                                color = 'danger';
                                break;
                            }
                            
                            return (
                              <tr key={`${pagoMensual.mes}-${pagoMensual.anio}`} style={{ background: tieneBeca ? '#d4edda' : 'white' }}>
                                <td style={{ fontWeight: tieneBeca ? 'bold' : 'normal' }}>
                                  {pagoMensual.nombre_mes ? pagoMensual.nombre_mes.charAt(0).toUpperCase() + pagoMensual.nombre_mes.slice(1) : `Mes ${pagoMensual.mes}`}
                                </td>
                                <td>Bs {montoEsperado.toFixed(2)}</td>
                                <td>Bs {montoPagado.toFixed(2)}</td>
                                <td>Bs {saldoPendiente.toFixed(2)}</td>
                                <td>
                                  <span className={`badge bg-${color}`}>{estado}</span>
                                  {tieneBeca && <span className="badge bg-success ms-2">Descuento {pagoMensual.porcentaje_beca}%</span>}
                                </td>
                              </tr>
                            );
                          })
                        ) : (
                          // Fallback: usar cálculos manuales si no hay datos en pagos_mensuales
                          mesesPagos.map((mes) => {
                            const mesesBeca = (compromiso.meses_beca || '').split(',').map(m => m.trim());
                            const tieneDescuento = mesesBeca.includes(mes);
                            
                            // Calcular el monto base sin descuento
                            const numeroCuotas = mesesPagos.length;
                            const montoBaseSinDescuento = Number(form.costo_mensual) / numeroCuotas;
                            
                            // Aplicar descuento solo si este mes específico tiene beca
                            const montoEsperado = tieneDescuento
                              ? Math.round(montoBaseSinDescuento * (1 - compromiso.descuento_aplicado) * 100) / 100
                              : Math.round(montoBaseSinDescuento * 100) / 100;
                            const pagosMes = pagos.filter(p => {
                              if (p.tipo_pago !== 'cuota' && p.tipo_pago !== 'ambos') return false;
                              // Verificar si el mes está incluido en el pago (maneja tanto pagos individuales como múltiples)
                              const mesesPago = p.mes.split(',').map(m => m.trim());
                              return mesesPago.includes(mes);
                            });
                            const montoPagado = pagosMes.reduce((sum, p) => {
                              // Obtener los meses del pago
                              const mesesPago = p.mes.split(',').map(m => m.trim());
                              const cantidadMeses = mesesPago.length;
                              
                              // Si es tipo 'ambos', usar monto_cuota; si es 'cuota', usar monto
                              let montoPago;
                              if (p.tipo_pago === 'ambos') {
                                montoPago = Number(p.monto_cuota || 0);
                              } else {
                                montoPago = Number(p.monto || 0);
                              }
                              
                              // Si el pago cubre múltiples meses, dividir el monto
                              if (cantidadMeses > 1) {
                                montoPago = montoPago / cantidadMeses;
                              }
                              
                              return sum + montoPago;
                            }, 0);
                            const saldoPendiente = Math.max(montoEsperado - montoPagado, 0);
                            let estado = '';
                            let color = '';
                            if (montoPagado >= montoEsperado) {
                              estado = 'Pagado';
                              color = 'success';
                            } else if (montoPagado > 0 && montoPagado < montoEsperado) {
                              estado = `Parcial (Falta Bs ${Math.round((montoEsperado - montoPagado) * 100) / 100})`;
                              color = 'warning';
                            } else {
                              estado = 'Pendiente';
                              color = 'danger';
                            }
                            return (
                              <tr key={mes} style={{ background: tieneDescuento ? '#d4edda' : 'white' }}>
                                <td style={{ fontWeight: tieneDescuento ? 'bold' : 'normal' }}>{mes.charAt(0).toUpperCase() + mes.slice(1)}</td>
                                <td>Bs {montoEsperado}</td>
                                <td>Bs {montoPagado}</td>
                                <td>Bs {saldoPendiente}</td>
                                <td><span className={`badge bg-${color}`}>{estado}</span>{tieneDescuento && <span className="badge bg-success ms-2">Descuento</span>}</td>
                              </tr>
                            );
                          })
                        )}

                      </tbody>
                    </table>
                  </div>
                </div>
              )}


              {/* Botón para abrir modal de pago - Solo mostrar si hay inscripción seleccionada */}
              {compromiso && inscripcionSeleccionada && !mostrarInscripciones && (
                <div className="card mb-3">
                  <div className="card-body text-center">
                    <button 
                      className="btn btn-success btn-lg"
                      onClick={() => setMostrarModalPago(true)}
                    >
                      <i className="fas fa-credit-card me-2"></i>
                      Registrar Nuevo Pago
                    </button>
                  </div>
                </div>
              )}

              {/* Modal de Registro de Pagos */}
              {mostrarModalPago && (
                <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                  <div className="modal-dialog modal-xl">
                    <div className="modal-content">
                      <div className="modal-header bg-success text-white">
                        <h5 className="modal-title">
                          <i className="fas fa-calendar-check me-2"></i>
                          Seleccionar Meses para Pagar
                        </h5>
                        <button 
                          type="button" 
                          className="btn-close btn-close-white" 
                          onClick={() => setMostrarModalPago(false)}
                        ></button>
                      </div>
                      <div className="modal-body">
                        {/* Botones de acción */}
                        <div className="d-flex gap-2 mb-3">
                          <button 
                            className="btn btn-outline-success" 
                            onClick={seleccionarTodosLosMeses}
                          >
                            <i className="fas fa-check-double me-1"></i>
                            Seleccionar Todos los Meses
                          </button>
                          <button 
                            className="btn btn-outline-secondary" 
                            onClick={limpiarSeleccionMeses}
                          >
                            <i className="fas fa-times me-1"></i>
                            Limpiar Selección
                          </button>
                        </div>
                        
                        {/* Instrucciones */}
                        <div className="alert alert-info mb-3">
                          <i className="fas fa-info-circle me-2"></i>
                          <strong>Instrucciones:</strong> Selecciona 1 mes, varios meses, o todos los meses que quieres pagar. Los meses ya pagados aparecen deshabilitados.
                          <br />
                          <strong>Seleccionados: {mesesSeleccionados.length} de {mesesPagos.length} meses</strong>
                        </div>

                        {/* Grid de meses + panel derecho (campos + resumen) */}
                        <div className="row g-3 align-items-start mb-4">
                          <div className={mesesSeleccionados.length > 0 ? 'col-lg-7' : 'col-12'}>
                            {renderMesesGrid()}
                          </div>
                          {mesesSeleccionados.length > 0 && (
                            <div className="col-lg-5">
                              <div className="sticky-lg-top" style={{ top: '70px' }}>
                                <div className="row g-2">
                                  <div className="col-xl-6">
                                    <div className="card border-success mb-0">
                                      <div className="card-header bg-light">
                                        <strong>Datos del pago</strong>
                                      </div>
                                      <div className="card-body">
                                        <div className="mb-3">
                                          <label className="form-label fw-bold">
                                            Monto mensualidad
                                            <button
                                              type="button"
                                              className={`btn btn-sm ms-2 ${modoEdicionMonto ? 'btn-warning' : 'btn-outline-secondary'}`}
                                              onClick={toggleModoEdicionMonto}
                                              title={modoEdicionMonto ? 'Cambiar a modo automático' : 'Cambiar a modo manual'}
                                            >
                                              <i className={`fas ${modoEdicionMonto ? 'fa-edit' : 'fa-calculator'} me-1`}></i>
                                              {modoEdicionMonto ? 'Manual' : 'Auto'}
                                            </button>
                                          </label>
                                          <input
                                            type="number"
                                            className={`form-control ${modoEdicionMonto ? '' : 'bg-light'}`}
                                            value={modoEdicionMonto ? montoEditable : calcularMontoMesesSeleccionados()}
                                            onChange={(e) => setMontoEditable(e.target.value)}
                                            readOnly={!modoEdicionMonto}
                                            placeholder="100"
                                            step="0.01"
                                            min="0"
                                          />
                                          <small className="text-muted">
                                            {modoEdicionMonto
                                              ? 'Modo manual: Puedes editar el monto libremente'
                                              : 'Modo automático: Monto calculado según los meses seleccionados'}
                                          </small>
                                        </div>
                                        <div className="mb-3">
                                          <label className="form-label fw-bold">Fecha de pago</label>
                                          <input
                                            type="date"
                                            className="form-control"
                                            value={fechaPago}
                                            onChange={(e) => setFechaPago(e.target.value)}
                                          />
                                        </div>
                                        <div className="mb-3">
                                          <label className="form-label fw-bold">Forma de pago</label>
                                          <select
                                            className="form-select"
                                            value={formaPago}
                                            onChange={(e) => setFormaPago(e.target.value)}
                                          >
                                            <option value="Efectivo">Efectivo</option>
                                            <option value="Transferencia">Transferencia</option>
                                            <option value="QR">QR</option>
                                            <option value="Otro">Otro</option>
                                          </select>
                                        </div>
                                        <div className="mb-3">
                                          <label className="form-label fw-bold">NIT/CI del pagador</label>
                                          <input
                                            type="text"
                                            className="form-control"
                                            value={nitCi}
                                            onChange={(e) => setNitCi(e.target.value)}
                                            placeholder="12341234"
                                          />
                                        </div>
                                        <div className="mb-3">
                                          <label className="form-label fw-bold">Número de comprobante</label>
                                          <input
                                            type="text"
                                            className="form-control"
                                            value={numeroComprobante}
                                            onChange={(e) => setNumeroComprobante(e.target.value)}
                                            placeholder="123123"
                                          />
                                        </div>
                                        <div className="mb-0">
                                          <label className="form-label fw-bold">Observación</label>
                                          <textarea
                                            className="form-control"
                                            rows="2"
                                            value={observacionPago}
                                            onChange={(e) => setObservacionPago(e.target.value)}
                                            placeholder="(ninguna observación)"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="col-xl-6">
                                    <div className="alert alert-success border-success mb-0 h-100">
                                      <h6 className="mb-3">
                                        <i className="fas fa-calculator me-2"></i>
                                        Resumen del pago:
                                      </h6>
                                      <p className="mb-2"><strong>Total a pagar:</strong> Bs {obtenerMontoFinal().toFixed(2)}</p>
                                      <p className="mb-2"><strong>Meses seleccionados:</strong> {mesesSeleccionados.join(', ')}</p>
                                      <hr />
                                      <p className="mb-2"><strong>Monto mensualidad:</strong> {modoEdicionMonto ? montoEditable || '0' : calcularMontoMesesSeleccionados()}</p>
                                      <p className="mb-2"><strong>Fecha de pago:</strong> {fechaPago || '—'}</p>
                                      <p className="mb-2"><strong>Forma de pago:</strong> {formaPago || 'Efectivo'}</p>
                                      <p className="mb-2"><strong>NIT/CI del pagador:</strong> {nitCi || '—'}</p>
                                      <p className="mb-2"><strong>Número de comprobante:</strong> {numeroComprobante || '—'}</p>
                                      <p className="mb-0"><strong>Observación:</strong> {observacionPago || '(ninguna observación)'}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Footer del modal */}
                      {mesesSeleccionados.length > 0 && (
                        <div className="modal-footer">
                          <button 
                            type="button" 
                            className="btn btn-secondary" 
                            onClick={() => setMostrarModalPago(false)}
                          >
                            Cancelar
                          </button>
                          <button 
                            className="btn btn-success btn-lg" 
                            onClick={pagarMesesSeleccionados}
                            disabled={mesesSeleccionados.length === 0}
                          >
                            <i className="fas fa-check me-2"></i>
                            Confirmar Pago de {mesesSeleccionados.length} Mes{mesesSeleccionados.length > 1 ? 'es' : ''} - Bs {obtenerMontoFinal().toFixed(2)}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
      </div>
      
      {/* Modales */}
      <>
        {/* Modal para registrar compromiso */}
        <CompromisoModal 
        isOpen={showModal} 
        onClose={async () => { 
          setShowModal(false); 
          if (inscripcionSeleccionada) {
            await cargarCompromiso(inscripcionSeleccionada.id);
            await cargarInscripciones(form.id, true);
          }
        }} 
        form={form} 
        becas={becas} 
        inscripcion={inscripcionSeleccionada}
      />
      
      {/* El modal de subir comprobante ya no es necesario porque ahora se sube directamente desde la tabla */}
      
      {/* Modal de información del estudiante */}
      <InformacionEstudianteModal
        show={showInformacionModal}
        onHide={() => setShowInformacionModal(false)}
        form={form}
        compromiso={compromiso}
        becas={becas}
        saldoCuotas={saldoCuotas}
        saldoTotal={saldoTotal}
        pagos={pagos}
        pagosMensuales={pagosMensuales}
        filtroTipo={filtroTipo}
        setFiltroTipo={setFiltroTipo}
        filtroMes={filtroMes}
        setFiltroMes={setFiltroMes}
        filtroAnio={filtroAnio}
        setFiltroAnio={setFiltroAnio}
        pagosFiltrados={pagosModalFiltrados}
        handleSubirComprobante={handleSubirComprobante}
        handleDescargarComprobante={handleDescargarComprobante}
        handleVerComprobante={handleVerComprobante}
        handleEliminarComprobante={confirmarEliminarComprobante}
        formatearFecha={formatearFecha}
        formatearMonto={formatearMonto}
        obtenerMesDeFecha={obtenerMesDeFecha}
        obtenerAnioDeFecha={obtenerAnioDeFecha}
      />

      {/* Modal de confirmación para eliminar comprobante */}
      {confirmEliminarComprobante.isOpen && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle text-warning me-2"></i>
                  Confirmar eliminación
                </h5>
                <button type="button" className="btn-close" onClick={cancelarEliminarComprobante}></button>
              </div>
              <div className="modal-body">
                ¿Estás seguro de que quieres eliminar este comprobante?
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelarEliminarComprobante}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-danger" onClick={handleEliminarComprobante}>
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de visualización de comprobante */}
      <ModalVisualizarComprobante
        isOpen={modalVisualizarComprobante.isOpen}
        onClose={handleCerrarModalVisualizar}
        comprobanteUrl={modalVisualizarComprobante.url}
        nombreArchivo={modalVisualizarComprobante.nombreArchivo}
      />
      
      {/* Modal de notificaciones */}
      <NotificationModal
        isOpen={notification.isOpen}
        onClose={hideNotification}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        autoClose={notification.autoClose}
        autoCloseDelay={notification.autoCloseDelay}
      />

      {/* Componente ModoDispositivo */}
      <ModoDispositivo
        showMobileMenu={showMobileMenu}
        setShowMobileMenu={setShowMobileMenu}
        handleMobileNavigate={handleMobileNavigate}
        handleLogout={handleLogout}
        userInfo={userInfo}
      />
      </>
    </>
  );
};

export default Compromiso;
