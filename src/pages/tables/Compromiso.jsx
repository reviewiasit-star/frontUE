import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import CompromisoModal from '../components/CompromisoModal';
import NotificationModal from '../components/NotificationModal';
import { useNotification } from '../hooks/useNotification';
import AuthService from '../services/authService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/img/logo.jpg';

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
  const [pagoCuota, setPagoCuota] = useState('');
  const [observacionPago, setObservacionPago] = useState("");
  const [showModal, setShowModal] = useState(false);
  // Estados para subir comprobantes
  const [showSubirModal, setShowSubirModal] = useState(false);
  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [archivoComprobante, setArchivoComprobante] = useState(null);
  const [subiendoComprobante, setSubiendoComprobante] = useState(false);
  // Agregar estados para mes, año y forma de pago
  const [mesPago, setMesPago] = useState('');
  const [anioPago, setAnioPago] = useState(new Date().getFullYear());
  const [formaPago, setFormaPago] = useState('Efectivo');
  // Agregar estados para los filtros
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos');
  const [niveles, setNiveles] = useState([]);
  const [errorCuota, setErrorCuota] = useState("");
  // Estados para número de comprobante y NIT/CI
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [nitCi, setNitCi] = useState('');
  
  // Estados para selección de meses específicos
  const [mesesSeleccionados, setMesesSeleccionados] = useState([]);
  const [mostrarSeleccionMeses, setMostrarSeleccionMeses] = useState(false);

  // Estados para manejar múltiples inscripciones
  const [inscripciones, setInscripciones] = useState([]);
  const [mostrarInscripciones, setMostrarInscripciones] = useState(false);
  const [inscripcionSeleccionada, setInscripcionSeleccionada] = useState(null);

  // Estados para pagos mensuales
  const [pagosMensuales, setPagosMensuales] = useState([]);

  // Estados para el menú hamburguesa
  const [menuHamburguesaVisible, setMenuHamburguesaVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);

  // Hook para notificaciones
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  const debounceTimeout = useRef(null);

  // Lista de meses para el select (solo los 10 meses escolares)
  const mesesPagos = [
    'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre'
  ];

  const [showDatosEstudiante, setShowDatosEstudiante] = useState(false);
  const [showCompromiso, setShowCompromiso] = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showSaldos, setShowSaldos] = useState(false);
  const [showRegistroPago, setShowRegistroPago] = useState(false);

  const [seccionActiva, setSeccionActiva] = useState('resumen'); // 'resumen', 'pagos', 'historial', 'saldos'

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);
    
    const token = localStorage.getItem('token');
    fetch(`http://${window.location.hostname}:3001/api/becas`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log('Becas cargadas:', data);
        setBecas(data);
      })
      .catch(error => {
        console.error('Error cargando becas:', error);
        setBecas([]);
      });
    fetch(`http://${window.location.hostname}:3001/api/niveles`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log('Niveles cargados:', data);
        setNiveles(data);
      })
      .catch(error => {
        console.error('Error cargando niveles:', error);
        setNiveles([]);
      });
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
      const res = await fetch(`http://${window.location.hostname}:3001/api/estudiantes/buscar-por-ci-estudiante/${encodeURIComponent(ci)}`, {
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
      const res = await fetch(`http://${window.location.hostname}:3001/api/estudiantes`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      const filtro = valor.trim().toLowerCase();
      
      // Filtrar estudiantes que coincidan con el nombre Y que tengan inscripciones activas completas
      const coincidencias = data.filter(est => {
        const nombreCompleto = `${est.nombre} ${est.apellido_paterno || ''} ${est.apellido_materno || ''}`.toLowerCase();
        const coincideNombre = nombreCompleto.includes(filtro);
        const tieneInscripcionCompleta = est.nivel_nombre && 
                                       est.curso_nombre && 
                                       est.bloque_nombre &&
                                       est.estado_inscripcion === 'activo' &&
                                       est.nivel_id && 
                                       est.curso_id;
        
        return coincideNombre && tieneInscripcionCompleta;
      });
      
      // Eliminar duplicaciones por estudiante (agrupar por ID)
      const estudiantesUnicos = [];
      const estudiantesIds = new Set();
      
      coincidencias.forEach(estudiante => {
        if (!estudiantesIds.has(estudiante.id)) {
          estudiantesIds.add(estudiante.id);
          estudiantesUnicos.push(estudiante);
        }
      });
      
      if (estudiantesUnicos.length === 0) {
        setError("No se encontraron estudiantes activos con inscripciones vigentes");
      }
      setResultados(estudiantesUnicos);
    } catch {
      setError("Error de conexión");
    }
    setBuscando(false);
  };

  const cargarDatosEstudiante = async (data) => {
    console.log('Datos del estudiante recibidos:', data);
    console.log('Niveles disponibles:', niveles);
    
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
      console.log('Nivel encontrado:', nivelObj);
    }
    
    // Mejorar la carga del nombre del nivel - intentar diferentes campos
    let nivelNombre = '';
    if (data.nivel_nombre) {
      nivelNombre = data.nivel_nombre;
      console.log('Usando nivel_nombre:', nivelNombre);
    } else if (data.nivel) {
      nivelNombre = data.nivel;
      console.log('Usando nivel:', nivelNombre);
    } else if (data.nivel_id) {
      // Si no hay nombre, intentar obtenerlo de la lista de niveles
      const nivelObj = niveles.find(n => String(n.id) === String(data.nivel_id));
      nivelNombre = nivelObj ? nivelObj.nombre : '';
      console.log('Usando nivel de lista:', nivelNombre);
    }
    
    setForm({
      id: data.id,
      nombre: (data.nombre || '') + (data.apellido_paterno ? (' ' + data.apellido_paterno) : '') + (data.apellido_materno ? (' ' + data.apellido_materno) : ''),
      fecha_nacimiento: fechaNacimiento,
      mama: (data.nombre_madre || '') + (data.apellido_madre ? (' ' + data.apellido_madre) : ''),
      papa: (data.nombre_padre || '') + (data.apellido_padre ? (' ' + data.apellido_padre) : ''),
      celular_mama: data.telefono_celular_madre || '',
      celular_papa: data.telefono_celular_padre || '',
      costo_mensual: nivelPrecio,
      nivel: nivelNombre,
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
    
    // Automáticamente mostrar los datos del estudiante
    setShowDatosEstudiante(true);
    
    // Cargar inscripciones del estudiante
    await cargarInscripciones(data.id);
  };

  const cargarInscripciones = async (estudianteId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/estudiantes/${estudianteId}/inscripciones`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (res.ok) {
        const inscripcionesData = await res.json();
        
        // Filtrar solo inscripciones completas y activas
        const inscripcionesCompletas = inscripcionesData.filter(inscripcion => 
          inscripcion.nivel_nombre && 
          inscripcion.curso_nombre && 
          inscripcion.bloque_nombre &&
          inscripcion.estado === 'activo' &&
          inscripcion.nivel_id && 
          inscripcion.curso_id
        );
        
        setInscripciones(inscripcionesCompletas);
        
        // Siempre mostrar las inscripciones para que el usuario pueda elegir
        if (inscripcionesCompletas.length > 0) {
          setMostrarInscripciones(true);
          setInscripcionSeleccionada(null); // Limpiar selección previa
        }
      }
    } catch (error) {
      console.error('Error al cargar inscripciones:', error);
    }
  };

  const seleccionarInscripcion = async (inscripcion) => {
    console.log('Inscripción seleccionada:', inscripcion);
    setInscripcionSeleccionada(inscripcion);
    setMostrarInscripciones(false);
    
    // Actualizar el nivel en el form con la información de la inscripción
    if (inscripcion.nivel_nombre) {
      setForm(prev => ({
        ...prev,
        nivel: inscripcion.nivel_nombre
      }));
    }
    
    await cargarCompromiso(inscripcion.id);
  };

  const activarSeccionPagos = () => {
    setSeccionActiva('pagos');
    setShowCompromiso(false);
    setShowHistorial(false);
    setShowSaldos(false);
  };

  // Cargar compromiso y pagos
  const cargarCompromiso = async (inscripcion_id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://${window.location.hostname}:3001/api/compromiso-economico/inscripcion/${inscripcion_id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!res.ok) { 
        setCompromiso(null); 
        setPagos([]);
        setPagosMensuales([]);
        return; 
      }
      
      const data = await res.json();
      const compromiso = data.compromiso;
      console.log('Compromiso cargado:', compromiso);
      console.log('Form actual:', form);
      setCompromiso(compromiso);
      
      if (compromiso) {
        // Cargar pagos
        const resPagos = await fetch(`http://${window.location.hostname}:3001/api/pagos-realizados/${compromiso.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const pagos = await resPagos.json();
        setPagos(pagos);

        // Cargar detalles de pagos mensuales
        try {
          const resDetalle = await fetch(`http://${window.location.hostname}:3001/api/compromiso-economico/${compromiso.id}/detalle-pagos`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (resDetalle.ok) {
            const detalleData = await resDetalle.json();
            setPagosMensuales(detalleData.pagosMensuales || []);
          } else {
            setPagosMensuales([]);
          }
        } catch (error) {
          console.error('Error cargando detalle de pagos:', error);
          setPagosMensuales([]);
        }
        
        // Automáticamente mostrar las secciones cuando hay un compromiso
        setShowCompromiso(true);
        setShowDatosEstudiante(true);
        setShowHistorial(true);
        setShowSaldos(true);
      } else {
        setPagos([]);
        setPagosMensuales([]);
        // Si no hay compromiso, solo mostrar datos del estudiante
        setShowDatosEstudiante(true);
        setShowCompromiso(false);
        setShowHistorial(false);
        setShowSaldos(false);
      }
      
      // Mantener la sección activa actual
      if (seccionActiva === 'pagos') {
        setShowCompromiso(false);
        setShowHistorial(false);
        setShowSaldos(false);
      }
    } catch (error) { 
      setCompromiso(null); 
      setPagos([]);
      setPagosMensuales([]);
    }
  };

  useEffect(() => {
    if (form.id) cargarCompromiso(form.id);
  }, [form.id]);

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
      material_didactico: '',
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
      const montoEsperadoCuota = compromiso ? Math.round((compromiso.total_cuotas / 10) * 100) / 100 : 0;
      
      if (parseFloat(pago.monto_cuota) > 0) {
        // Determinar estado de la cuota
        let estadoCuota = 'Pendiente';
        if (pago.saldoPendienteCuota !== undefined) {
          if (pago.saldoPendienteCuota === 0) {
            estadoCuota = 'Mes cancelado';
          } else if (pago.saldoPendienteCuota > 0) {
            estadoCuota = `Parcial (Falta Bs ${pago.saldoPendienteCuota.toFixed(2)})`;
          }
        } else {
          // Si no hay saldoPendienteCuota, asumir que está pagado completo
          estadoCuota = 'Mes cancelado';
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
          estado = 'Mes cancelado';
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

  // Función para calcular el total real a pagar basado en los montos ingresados
  const calcularTotalRealAPagar = () => {
    const montoCuotas = parseFloat(pagoCuota) || 0;
    return montoCuotas;
  };

  // Registro de pagos
  const registrarPagoFlexible = async () => {
    if (!compromiso) return;
    
    try {

      
      // Validación: no permitir pagar más de lo pendiente en mensualidad
      const montoEsperadoCuota = compromiso ? Math.round((compromiso.total_cuotas / 10) * 100) / 100 : 0;
      const montoPagadoCuota = pagos.filter(p => p.mes === mesPago && p.tipo_pago === 'cuota').reduce((sum, p) => sum + Number(p.monto), 0);
      const saldoPendienteCuotaTemp = Math.max(montoEsperadoCuota - montoPagadoCuota, 0);
      if (parseFloat(pagoCuota) > saldoPendienteCuotaTemp) {
        setErrorCuota(`No puedes pagar más de Bs ${saldoPendienteCuotaTemp} en la mensualidad de este mes.`);
        return;
      } else {
        setErrorCuota("");
      }
      
      let pagosARegistrar = [];
      // Generar detalle automático mejorado
      let detalleAuto = '';
      const fechaHoy = new Date().toISOString().slice(0, 10);
      const anioActual = new Date().getFullYear();
      if (parseFloat(pagoCuota) > 0) {
        detalleAuto = `Pago registrado el ${fechaHoy}: Bs ${pagoCuota} por la mensualidad.`;
      }
      
      const obsFinal = observacionPago.trim() ? observacionPago : 'ninguna observación';
      let pagoCuotaObj = null;
      
      if (parseFloat(pagoCuota) > 0) {
        pagoCuotaObj = {
          id_compromiso: compromiso.id,
          fecha_pago: fechaHoy,
          monto: pagoCuota,
          tipo_pago: 'cuota',
          detalle: detalleAuto,
          mes: mesPago, // Usar el mes específico seleccionado
          anio: anioActual,
          forma_pago: formaPago,
          observacion: obsFinal,
          numero_comprobante: numeroComprobante.trim() || null,
          nit_ci: nitCi.trim() || null
        };
        pagosARegistrar.push(pagoCuotaObj);
      }

      
      // Registrar pagos y verificar respuestas
      let pagosExitosos = 0;
      let erroresPago = [];
      
      for (const pago of pagosARegistrar) {
        try {
          const response = await fetch(`http://${window.location.hostname}:3001/api/pagos-realizados`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify(pago)
          });
          
          const result = await response.json();
          
          if (response.ok && result.ok) {
            pagosExitosos++;
            console.log('Pago registrado exitosamente:', result);
            
            // Verificar si el compromiso fue marcado como concluido
            if (result.compromiso_concluido) {
              showSuccess('¡Compromiso Concluido!', 'El compromiso económico ha sido marcado como CONCLUIDO al completar todos los pagos.');
            }
          } else {
            erroresPago.push(`Error al registrar pago de ${pago.tipo_pago}: ${result.message || 'Error desconocido'}`);
            console.error('Error en respuesta del servidor:', result);
          }
        } catch (fetchError) {
          erroresPago.push(`Error de conexión al registrar pago de ${pago.tipo_pago}: ${fetchError.message}`);
          console.error('Error de fetch:', fetchError);
        }
      }
      
      // Mostrar resultados al usuario
      if (pagosExitosos > 0) {
        showSuccess('Pagos registrados', `${pagosExitosos} pago(s) registrado(s) exitosamente. Puedes continuar registrando más pagos.`);
        
        // Calcular saldos pendientes para cuotas
        let pagadoMesCuota = pagos.filter(p => p.mes === mesPago && p.tipo_pago === 'cuota').reduce((sum, p) => sum + Number(p.monto), 0);
        if (pagoCuotaObj) pagadoMesCuota += Number(pagoCuota);
        const esperadoCuota = compromiso ? Math.round((compromiso.total_cuotas / 10) * 100) / 100 : 0;
        const saldoPendienteCuota = Math.max(esperadoCuota - pagadoMesCuota, 0);
        
        // Llamar a generarPDFPago solo con datos de cuota
        generarPDFPago({
          ...pagoCuotaObj,
          monto_cuota: pagoCuotaObj ? pagoCuotaObj.monto : 0,
          saldoPendienteCuota,
          tipo_pago: 'cuota',
          monto: pagoCuotaObj ? pagoCuotaObj.monto : 0
        }, form, saldoPendienteCuota);
        
        // Limpiar formulario
        setPagoCuota('');
        setObservacionPago('');
        setMesPago('');
        setFormaPago('Efectivo');
        setNumeroComprobante('');
        setNitCi('');
        
        // Recargar pagos y compromiso para actualizar la tabla
        if (inscripcionSeleccionada) {
          await cargarCompromiso(inscripcionSeleccionada.id);
        }
        
        // Mantener la sección de pagos activa
        activarSeccionPagos();
      }
      
      if (erroresPago.length > 0) {
        showError('Errores en el registro', erroresPago.join('\n'));
      }
      
    } catch (error) {
      console.error('Error general al registrar pagos:', error);
      showError('Error inesperado', `Error inesperado al registrar los pagos: ${error.message}`);
    }
  };

  // Cálculos de saldos
  const pagadoCuotas = pagos.filter(p => p.tipo_pago === 'cuota' || p.tipo_pago === 'ambos').reduce((sum, p) => sum + Number(p.monto), 0);
  
  // Si el compromiso está concluido, los saldos deben ser 0
  const saldoCuotas = compromiso ? (() => {
    if (compromiso.estado_compromiso === 'concluido') return 0;
    
    // Usar datos de pagosMensuales si están disponibles
    if (pagosMensuales && pagosMensuales.length > 0) {
      return pagosMensuales.reduce((total, pago) => total + (pago.saldo_pendiente || 0), 0);
    }
    
    // Fallback al método anterior
    return compromiso.total_cuotas - pagadoCuotas;
  })() : 0;



  const saldoTotal = compromiso ? 
    (compromiso.estado_compromiso === 'concluido' ? 0 : saldoCuotas) : 0;

  // Ordenar todos los pagos por fecha
  const pagosOrdenados = [...pagos].sort((a, b) => new Date(a.fecha_pago) - new Date(b.fecha_pago));

  // Filtrar los pagos antes de renderizar
  const pagosFiltrados = pagosOrdenados.filter(pago => {
    const tipoOk = filtroTipo === 'Todos' || (filtroTipo === 'Cuota' && pago.tipo_pago === 'cuota') || (filtroTipo === 'Material' && pago.tipo_pago === 'material');
    const mesOk = filtroMes === 'Todos' || pago.mes === filtroMes;
    return tipoOk && mesOk;
  });

  // Funciones para el menú hamburguesa
  const cerrarMenuHamburguesa = () => {
    setMenuHamburguesaVisible(false);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
  };

  return (
    <div className="container py-4">
      {/* Header con botón hamburguesa para móviles */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">Compromiso Económico</h2>
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
            {resultados.map((est, index) => (
              <li key={`resultado-${est.id}-${index}`} className="list-group-item list-group-item-action" style={{cursor:'pointer'}} onClick={() => cargarDatosEstudiante(est)}>
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
            <button className="btn btn-warning" onClick={buscarDeNuevo}>
              Buscar de nuevo
            </button>
          </div>
          {/* Toggle Datos del Estudiante */}
          <div className="mb-2">
            <button
              className="btn w-100 d-flex align-items-center justify-content-center"
              style={{
                background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.15em',
                borderRadius: '8px',
                boxShadow: '0 2px 8px rgba(25, 118, 210, 0.15)',
                border: 'none',
                padding: '12px 0',
                marginBottom: '8px',
                transition: 'background 0.2s'
              }}
              onClick={() => setShowDatosEstudiante(v => !v)}
              onMouseOver={e => e.currentTarget.style.background = 'linear-gradient(90deg, #1565c0 0%, #1976d2 100%)'}
              onMouseOut={e => e.currentTarget.style.background = 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)'}
            >
              <i className={`fas fa-chevron-${showDatosEstudiante ? 'up' : 'down'} me-2`} style={{ fontSize: '1.2em' }}></i>
              {showDatosEstudiante ? 'Ocultar Datos del Estudiante' : 'Mostrar Datos del Estudiante'}
            </button>
            {showDatosEstudiante && (
              <div className="card mb-3">
                <div className="card-header bg-primary text-white">Datos del Estudiante</div>
                <div className="card-body row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Nombre</label>
                    <input type="text" className="form-control" value={form.nombre} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Fecha de nacimiento</label>
                    <input type="text" className="form-control" value={form.fecha_nacimiento} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Mamá</label>
                    <input type="text" className="form-control" value={form.mama} readOnly />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Papá</label>
                    <input type="text" className="form-control" value={form.papa} readOnly />
                  </div>
                  <div className="col-md-6">
 