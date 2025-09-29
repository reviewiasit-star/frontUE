import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import WhatsAppPDFSender from '../components/WhatsAppPDFSender';
import NotificationModal from '../components/NotificationModal';
import ModoDispositivo from '../components/ModoDispositivo';
import { useNotification } from '../hooks/useNotification';
import AuthService from '../services/authService';

function ListaInscriptos() {
  // Función para obtener meses disponibles basándose en el nivel seleccionado
  const getMesesDisponibles = () => {
    const nivelSeleccionado = niveles.find(n => n.id == formPreinscripcion.nivel_id);
    if (nivelSeleccionado && nivelSeleccionado.meses && nivelSeleccionado.meses.length > 0) {
      return nivelSeleccionado.meses;
    }
    // Meses por defecto (febrero a noviembre) si no hay nivel seleccionado
    return [
      'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre'
    ];
  };

  const [inscriptos, setInscriptos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingInscripto, setEditingInscripto] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState('');
  // Nuevos estados para selects dependientes
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [bloques, setBloques] = useState([]); // Nuevo estado para bloques
  // Estado para becas
  const [becas, setBecas] = useState([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inscriptoToDelete, setInscriptoToDelete] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  // Estados para el modal de preinscripción
  const [showPreinscripcionModal, setShowPreinscripcionModal] = useState(false);
  const [busquedaEstudiante, setBusquedaEstudiante] = useState('');
  const [sugerenciasEstudiantes, setSugerenciasEstudiantes] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [estudianteSeleccionado, setEstudianteSeleccionado] = useState(null);
  const [estudiantesBasicos, setEstudiantesBasicos] = useState([]);
  const [formPreinscripcion, setFormPreinscripcion] = useState({
    nivel_id: '',
    curso_id: '',
    bloque_id: '',
    turno: '',
    fecha_inscripcion: '',
    id_beca: '',
    meses_beca: [],
    gestion_academica: new Date().getFullYear() + 1 // Por defecto el siguiente año
  });

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
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [menuHamburguesaVisible, setMenuHamburguesaVisible] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

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
    seguro_medico: ''
  });

  // Estados para WhatsApp
  const [whatsappModalOpen, setWhatsappModalOpen] = useState(false);
  const [selectedInscripto, setSelectedInscripto] = useState(null);
  const [pdfBlob, setPdfBlob] = useState(null);

  // Hook para notificaciones
  const { notification, showSuccess, showError, hideNotification } = useNotification();

  // Función para manejar cambios de filtro
  const handleFiltroChange = (filtro) => {
    setFiltroActivo(filtro);
    cargarInscriptos(filtro);
  };

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);
    
    cargarInscriptos();
    cargarEstudiantesBasicos(); // Cargar estudiantes básicos para el buscador
  }, []);

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
  }, [formPreinscripcion.nivel_id, formPreinscripcion.id_beca, formPreinscripcion.meses_beca]);

  const cargarInscriptos = async (filtro = '') => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const url = filtro 
        ? `http://${window.location.hostname}:3001/api/estudiantes?filtro=${filtro}`
        : `http://${window.location.hostname}:3001/api/estudiantes`;
      
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

  // Función separada para cargar estudiantes básicos (sin datos de inscripciones) para el buscador
  const cargarEstudiantesBasicos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/estudiantes/busqueda-basica`, {
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



  // Cargar becas y bloques al inicio
  useEffect(() => {
    const token = localStorage.getItem('token');
    
    // Cargar becas
    fetch(`http://${window.location.hostname}:3001/api/becas`, {
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
    fetch(`http://${window.location.hostname}:3001/api/bloques`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        console.log('Bloques cargados:', data);
        setBloques(data);
      })
      .catch(error => {
        console.error('Error cargando bloques:', error);
        setBloques([]);
      });
  }, []);

  // Cargar niveles cuando cambia el bloque en preinscripción
  useEffect(() => {
    if (formPreinscripcion.bloque_id) {
      const token = localStorage.getItem('token');
      fetch(`http://${window.location.hostname}:3001/api/niveles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(nivelesData => {
          console.log('Niveles cargados:', nivelesData);
          // Filtrar niveles que pertenecen al bloque seleccionado
          const nivelesFiltrados = nivelesData.filter(n => n.bloque_id == formPreinscripcion.bloque_id);
          console.log('Niveles filtrados para bloque', formPreinscripcion.bloque_id, ':', nivelesFiltrados);
          setNiveles(nivelesFiltrados);
          // Limpiar nivel y curso seleccionados
          setFormPreinscripcion(prev => ({
            ...prev,
            nivel_id: '',
            curso_id: ''
          }));
        })
        .catch(error => {
          console.error('Error cargando niveles:', error);
          setNiveles([]);
        });
    } else {
      setNiveles([]);
      setFormPreinscripcion(prev => ({
        ...prev,
        nivel_id: '',
        curso_id: ''
      }));
    }
  }, [formPreinscripcion.bloque_id]);

  // Cargar cursos cuando cambia el nivel en preinscripción
  useEffect(() => {
    if (formPreinscripcion.nivel_id) {
      const token = localStorage.getItem('token');
      fetch(`http://${window.location.hostname}:3001/api/cursos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(cursosData => {
          console.log('Cursos cargados:', cursosData);
          const cursosFiltrados = cursosData.filter(c => c.nivel_id == formPreinscripcion.nivel_id);
          console.log('Cursos filtrados para nivel', formPreinscripcion.nivel_id, ':', cursosFiltrados);
          setCursos(cursosFiltrados);
          // Limpiar curso seleccionado
          setFormPreinscripcion(prev => ({
            ...prev,
            curso_id: ''
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
        curso_id: ''
      }));
    }
  }, [formPreinscripcion.nivel_id]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const abrirModal = async (inscripto = null) => {
    if (inscripto) {
      try {
        // Obtener todos los datos del estudiante desde el backend
        const token = localStorage.getItem('token');
        const response = await fetch(`http://${window.location.hostname}:3001/api/estudiantes/${inscripto.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
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
              genero: data.genero || '',
              codigo_estudiante: data.codigo_estudiante || '',
              nombre_padre: data.nombre_padre || '',
              apellido_padre: data.apellido_padre || '',
              ci_padre: data.ci_padre || '',
              profesion_padre: data.profesion_padre || '',
              lugar_trabajo_padre: data.lugar_trabajo_padre || '',
              telefono_domicilio_padre: data.telefono_domicilio_padre || '',
              telefono_oficina_padre: data.telefono_oficina_padre || '',
              nombre_madre: data.nombre_madre || '',
              apellido_madre: data.apellido_madre || '',
              ci_madre: data.ci_madre || '',
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
              ci_estudiante: data.ci_estudiante || ''
            };
            setEditingInscripto(data);
            setFormData(formDataCompleto);
            setShowModal(true);
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
        ci_padre: '', profesion_padre: '', lugar_trabajo_padre: '', telefono_domicilio_padre: '', telefono_oficina_padre: '', nombre_madre: '', apellido_madre: '',
        ci_madre: '', profesion_madre: '', lugar_trabajo_madre: '', telefono_domicilio_madre: '', telefono_oficina_madre: '', 
        nombre_autorizado1: '',
       telefono_autorizado1: '',
       nombre_autorizado2: '',
       telefono_autorizado2: '',
      alergias: '',
      vacunas: '',
      seguro_medico: '', ci_estudiante: ''
      });
      setShowModal(true);
    }
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingInscripto(null);
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
      seguro_medico: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingInscripto) {
      setPendingSubmit(true);
      setShowUpdateModal(true);
      return;
    }
    try {
      const token = localStorage.getItem('token');
      const url = 'http://' + window.location.hostname + ':3001/api/estudiantes';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.ok) {
        showSuccess('Estudiante registrado', 'Estudiante registrado exitosamente');
        cerrarModal();
        cargarInscriptos();
      } else {
        showError('Error al registrar', 'Error al registrar estudiante: ' + (data.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSubmit:', error);
      showError('Error de conexión', 'Error de conexión al registrar estudiante. Verifique su conexión a internet y que el servidor esté funcionando.');
    }
  };

  // Función para llenar el formulario con datos aleatorios (para pruebas)
  const llenarDatosAleatorios = () => {
    const nombres = ['Juan', 'María', 'Carlos', 'Ana', 'Luis', 'Carmen', 'Pedro', 'Rosa', 'Miguel', 'Elena'];
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

  const confirmUpdate = async () => {
    if (pendingSubmit && editingInscripto) {
      try {
        const token = localStorage.getItem('token');
        const url = `http://${window.location.hostname}:3001/api/estudiantes/${editingInscripto.id}`;
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
          showSuccess('Estudiante actualizado', 'Estudiante actualizado exitosamente');
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

  const confirmDelete = async () => {
    if (inscriptoToDelete) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://${window.location.hostname}:3001/api/estudiantes/${inscriptoToDelete}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const data = await response.json();
        if (data.ok) {
          showSuccess('Estudiante eliminado', 'Estudiante eliminado exitosamente');
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
    setFormPreinscripcion({
      nivel_id: '',
      curso_id: '',
      bloque_id: '',
      turno: '',
      fecha_inscripcion: new Date().toISOString().split('T')[0],
      id_beca: '',
      meses_beca: []
    });
  };

  const cerrarModalPreinscripcion = () => {
    setShowPreinscripcionModal(false);
    setEstudianteSeleccionado(null);
    setBusquedaEstudiante('');
    setSugerenciasEstudiantes([]);
    setMostrarSugerencias(false);
  };

  const seleccionarEstudiante = (estudiante) => {
    setEstudianteSeleccionado(estudiante);
    setBusquedaEstudiante(`${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''}`);
    setMostrarSugerencias(false);
  };

  const limpiarEstudiante = () => {
    setEstudianteSeleccionado(null);
    setBusquedaEstudiante('');
    setSugerenciasEstudiantes([]);
    setMostrarSugerencias(false);
  };

  const handleChangePreinscripcion = (e) => {
    const { name, value } = e.target;
    setFormPreinscripcion(prev => {
      const newForm = { ...prev, [name]: value };
      
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
        return { ...prev, meses_beca: mesesActuales.filter(m => m !== mes) };
      } else {
        // Agregar mes si no está seleccionado
        return { ...prev, meses_beca: [...mesesActuales, mes] };
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
    const cuotaMensual = precioNivel / 10; // Dividir en 10 cuotas
    const descuentoPorcentaje = becaSeleccionada ? Number(becaSeleccionada.descuento) / 100 : 0;
    
    // Meses disponibles según el nivel seleccionado
    const todosLosMeses = getMesesDisponibles();
    
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
      const url = 'http://' + window.location.hostname + ':3001/api/inscripciones';
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
      if (data.ok) {
        showSuccess('Preinscripción exitosa', 'Estudiante inscrito en el nuevo curso exitosamente');
        cerrarModalPreinscripcion();
        cargarInscriptos();
      } else {
        showError('Error al preinscribir', 'Error al registrar la preinscripción: ' + (data.message || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en handleSubmitPreinscripcion:', error);
      showError('Error de conexión', 'Error de conexión al registrar la preinscripción. Verifique su conexión a internet y que el servidor esté funcionando.');
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
      console.log('Generando PDF para inscripto ID:', inscripto.id);
      // Obtener todos los datos del estudiante desde el backend
      const token = localStorage.getItem('token');
      const response = await fetch(`http://${window.location.hostname}:3001/api/estudiantes/${inscripto.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        showError('Error al obtener datos', 'Error al obtener los datos del estudiante: ' + data.message);
        return;
      }
      // Cargar solo el logo a base64
      console.log('Cargando logo...');
      let logoBase64;
      try {
        logoBase64 = await getImageBase64('/src/assets/img/logo.jpg');
        console.log('Logo JPG cargado exitosamente');
      } catch (logoError) {
        console.error('Error al cargar el logo JPG:', logoError);
        try {
          console.log('Intentando cargar logo SVG alternativo...');
          logoBase64 = await getImageBase64('/logo-simple.svg');
          console.log('Logo SVG cargado exitosamente');
        } catch (svgError) {
          console.error('Error al cargar el logo SVG:', svgError);
          // Continuar sin logo si hay error
          logoBase64 = null;
        }
      }
      
      console.log('Creando documento PDF...');
      const doc = new jsPDF();
      console.log('Documento PDF creado');
      
      // Insertar logo centrado arriba, ancho 32 y altura 20 (solo si se cargó correctamente)
      if (logoBase64) {
        console.log('Insertando logo en PDF...');
        doc.addImage(logoBase64, 'JPEG', 89, 8, 32, 20);
        console.log('Logo insertado exitosamente');
      } else {
        console.log('Continuando sin logo debido a error de carga');
      }
      // Fondo blanco semitransparente para el título
      doc.setFillColor(255,255,255);
      doc.rect(20, 28, 170, 14, 'F');
      // Configurar fuente y tamaños (más compacto)
      doc.setFontSize(14);
      doc.text('FORMULARIO DE INSCRIPCIÓN', 105, 35, { align: 'center' });
      doc.setFontSize(9);
      doc.text('Unidad Educativa', 105, 41, { align: 'center' });
      // Línea separadora
      doc.line(20, 45, 190, 45);
      let yPosition = 53;
      
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
          ['Nivel', data.nivel_nombre || data.nivel || ''],
          ['Curso', data.curso_nombre || ''],
          ['Bloque', data.bloque_nombre || ''],
          ['Fecha de Nacimiento', data.fecha_nacimiento ? data.fecha_nacimiento.split('T')[0] : ''],
          ['Lugar de Nacimiento', data.lugar_nacimiento || ''],
          ['Dirección', data.direccion || ''],
          ['Turno', data.turno || ''],
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
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Nombre Completo', `${data.nombre_padre || ''} ${data.apellido_padre || ''}`],
          ['C.I.', data.ci_padre || ''],
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
      
      autoTable(doc, {
        startY: yPosition,
        head: [['Campo', 'Información']],
        body: [
          ['Nombre Completo', `${data.nombre_madre || ''} ${data.apellido_madre || ''}`],
          ['C.I.', data.ci_madre || ''],
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
      console.log('Generando PDF como blob...');
      const pdfBlob = doc.output('blob');
      console.log('PDF blob generado exitosamente');

      // Descargar automáticamente el PDF
      console.log('Iniciando descarga del PDF...');
      doc.save(`Inscripcion_${data.nombre}_${data.apellido_paterno}_${data.apellido_materno}.pdf`);
      console.log('PDF descargado exitosamente');

      console.log('PDF generado exitosamente como blob');
      
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

  const handleMobileNavigate = (path) => {
    setShowMobileMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    AuthService.logout();
    window.location.href = '/login';
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
          <button className="btn btn-success" onClick={abrirModalPreinscripcion}>
            <i className="fas fa-user-plus me-2"></i> Preinscripción
          </button>
          <Link to="/reportes" className="btn btn-secondary">
            <i className="fas fa-chart-bar me-2"></i> Reportes
          </Link>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="fas fa-filter me-2"></i>
            Filtros de Estudiantes
          </h6>
        </div>
        <div className="card-body">
          <div className="row g-2">
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === '' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => handleFiltroChange('')}
              >
                <i className="fas fa-users me-1"></i>
                Todos
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === 'con_nivel' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleFiltroChange('con_nivel')}
              >
                <i className="fas fa-check-circle me-1"></i>
                Con Nivel
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === 'sin_nivel' ? 'btn-warning' : 'btn-outline-warning'}`}
                onClick={() => handleFiltroChange('sin_nivel')}
              >
                <i className="fas fa-exclamation-circle me-1"></i>
                Sin Nivel
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === 'con_curso' ? 'btn-info' : 'btn-outline-info'}`}
                onClick={() => handleFiltroChange('con_curso')}
              >
                <i className="fas fa-book me-1"></i>
                Con Curso
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === 'sin_curso' ? 'btn-secondary' : 'btn-outline-secondary'}`}
                onClick={() => handleFiltroChange('sin_curso')}
              >
                <i className="fas fa-book-open me-1"></i>
                Sin Curso
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === 'con_compromiso' ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleFiltroChange('con_compromiso')}
              >
                <i className="fas fa-dollar-sign me-1"></i>
                Con Compromiso
              </button>
            </div>
          </div>
          <div className="row g-2 mt-2">
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === 'sin_compromiso' ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => handleFiltroChange('sin_compromiso')}
              >
                <i className="fas fa-times-circle me-1"></i>
                Sin Compromiso
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === 'compromiso_activo' ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => handleFiltroChange('compromiso_activo')}
              >
                <i className="fas fa-play-circle me-1"></i>
                Compromiso Activo
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${filtroActivo === 'compromiso_concluido' ? 'btn-dark' : 'btn-outline-dark'}`}
                onClick={() => handleFiltroChange('compromiso_concluido')}
              >
                <i className="fas fa-check-double me-1"></i>
                Compromiso Concluido
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h6 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Lista de Estudiantes
          </h6>
          <div className="badge bg-primary fs-6">
            {inscriptos.length} estudiante{inscriptos.length !== 1 ? 's' : ''} 
            {filtroActivo && ` (filtro: ${filtroActivo.replace('_', ' ')})`}
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
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Código</th>
                    <th>Nombre</th>
                    <th>Apellido Paterno</th>
                    <th>Apellido Materno</th>
                    <th>CI Estudiante</th>
                    <th>Nivel</th>
                    <th>Curso</th>
                    <th>Tiene Nivel</th>
                    <th>Tiene Curso</th>
                    <th>Tiene Compromiso</th>
                    <th>Estado Compromiso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inscriptos.map((inscripto, index) => (
                    <tr key={`inscripto-${inscripto.id}-${index}`}>
                      <td>{inscripto.codigo_estudiante}</td>
                      <td>{inscripto.nombre}</td>
                      <td>{inscripto.apellido_paterno}</td>
                      <td>{inscripto.apellido_materno}</td>
                      <td>{inscripto.ci_estudiante}</td>
                      <td>{inscripto.nivel_nombre || inscripto.nivel || ''}</td>
                      <td>{inscripto.curso_nombre || ''}</td>
                      <td>
                        <span className={`badge ${inscripto.tiene_nivel === 'Sí' ? 'bg-success' : 'bg-warning'}`}>
                          {inscripto.tiene_nivel || 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${inscripto.tiene_curso === 'Sí' ? 'bg-success' : 'bg-warning'}`}>
                          {inscripto.tiene_curso || 'No'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${inscripto.tiene_compromiso === 'Sí' ? 'bg-success' : 'bg-danger'}`}>
                          {inscripto.tiene_compromiso || 'No'}
                        </span>
                      </td>
                      <td>
                        {inscripto.estado_compromiso && (
                          <span className={`badge ${
                            inscripto.estado_compromiso === 'activo' ? 'bg-primary' : 
                            inscripto.estado_compromiso === 'concluido' ? 'bg-dark' : 
                            'bg-secondary'
                          }`}>
                            {inscripto.estado_compromiso}
                          </span>
                        )}
                      </td>
                      <td>
                        {/* Botones de acciones CRUD aquí */}
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm btn-info"
                            onClick={() => generarPDF(inscripto)}
                            title="Generar PDF"
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
                            className="btn btn-sm btn-danger"
                            onClick={() => eliminarInscripto(inscripto.id)}
                            title="Eliminar"
                          >
                            <i className="fas fa-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

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
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {/* Botón para llenar datos aleatorios (solo para nuevos estudiantes) */}
                  {!editingInscripto && (
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
                  <div className="row g-3">
                    {/* Campos principales */}
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
                      <label className="form-label">C.I.</label>
                      <input
                        type="text"
                        className="form-control"
                        name="ci_padre"
                        value={formData.ci_padre}
                        onChange={handleChange}
                      />
                    </div>
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
                    <div className="col-md-4">
                      <label className="form-label">Teléfono Domicilio</label>
                      <input
                        type="text"
                        className="form-control"
                        name="telefono_domicilio_padre"
                        value={formData.telefono_domicilio_padre}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Teléfono Oficina</label>
                      <input
                        type="text"
                        className="form-control"
                        name="telefono_oficina_padre"
                        value={formData.telefono_oficina_padre}
                        onChange={handleChange}
                      />
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
                      <label className="form-label">C.I.</label>
                      <input
                        type="text"
                        className="form-control"
                        name="ci_madre"
                        value={formData.ci_madre}
                        onChange={handleChange}
                      />
                    </div>
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
                    <div className="col-md-4">
                      <label className="form-label">Teléfono Domicilio</label>
                      <input
                        type="text"
                        className="form-control"
                        name="telefono_domicilio_madre"
                        value={formData.telefono_domicilio_madre}
                        onChange={handleChange}
                      />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Teléfono Oficina</label>
                      <input
                        type="text"
                        className="form-control"
                        name="telefono_oficina_madre"
                        value={formData.telefono_oficina_madre}
                        onChange={handleChange}
                      />
                    </div>
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

                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={cerrarModal}>
                    Cancelar
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editingInscripto ? 'Actualizar' : 'Registrar'}
                  </button>
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
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.3)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirmar Eliminación</h5>
                <button type="button" className="btn-close" onClick={cancelDelete}></button>
              </div>
              <div className="modal-body">
                <p>¿Estás seguro de que deseas eliminar este estudiante?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={cancelDelete}>Cancelar</button>
                <button type="button" className="btn btn-danger" onClick={confirmDelete}>Eliminar</button>
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

      {/* Modal de Preinscripción */}
      {showPreinscripcionModal && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-user-plus me-2"></i>
                  Preinscripción de Estudiante
                </h5>
                <button type="button" className="btn-close" onClick={cerrarModalPreinscripcion}></button>
              </div>
              <form onSubmit={handleSubmitPreinscripcion}>
                <div className="modal-body">
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
                  </div>

                  {/* Formulario de inscripción */}
                  {estudianteSeleccionado && (
                    <div>
                      <h6 className="mb-3">
                        <i className="fas fa-graduation-cap me-2"></i>
                        Datos de la Nueva Inscripción
                      </h6>
                      
                      <div className="row">
                        {/* Bloque */}
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

                        {/* Nivel */}
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
                            {niveles.map((nivel, index) => (
                              <option key={`nivel-${nivel.id}-${index}`} value={nivel.id}>{nivel.nombre}</option>
                            ))}
                          </select>
                        </div>

                        {/* Curso */}
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

                        {/* Turno */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Turno</label>
                          <select
                            className="form-select"
                            name="turno"
                            value={formPreinscripcion.turno}
                            onChange={handleChangePreinscripcion}
                          >
                            <option value="">Seleccione turno</option>
                            <option value="mañana">Mañana</option>
                            <option value="tarde">Tarde</option>
                            <option value="noche">Noche</option>
                          </select>
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

                        {/* Gestión Académica */}
                        <div className="col-md-6 mb-3">
                          <label className="form-label">Gestión Académica *</label>
                          <select
                            className="form-select"
                            name="gestion_academica"
                            value={formPreinscripcion.gestion_academica}
                            onChange={handleChangePreinscripcion}
                            required
                          >
                            <option value={new Date().getFullYear()}>{new Date().getFullYear()}</option>
                            <option value={new Date().getFullYear() + 1}>{new Date().getFullYear() + 1}</option>
                            <option value={new Date().getFullYear() + 2}>{new Date().getFullYear() + 2}</option>
                          </select>
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
                    Registrar Preinscripción
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
                    to="/tienda" 
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{ 
                      padding: '15px 20px', 
                      border: 'none', 
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-store me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Tienda</span>
                  </Link>

                  <Link 
                    to="/compras-administradora" 
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{ 
                      padding: '15px 20px', 
                      border: 'none', 
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-shopping-cart me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Compras Administradora</span>
                  </Link>

                  <Link 
                    to="/inventario-almacen" 
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
                    <span>Inventario de Almacén</span>
                  </Link>

                  <Link 
                    to="/reporte-ventas" 
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
                    <span>Reporte de Ventas</span>
                  </Link>

                  <Link 
                    to="/resumen-ganancias-perdidas" 
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{ 
                      padding: '15px 20px', 
                      border: 'none', 
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-chart-line me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Ganancias y Pérdidas</span>
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
                    to="/movimientos-gastos" 
                    className="list-group-item list-group-item-action d-flex align-items-center"
                    onClick={cerrarMenuHamburguesa}
                    style={{ 
                      padding: '15px 20px', 
                      border: 'none', 
                      borderBottom: '1px solid #dee2e6',
                      fontSize: '1rem'
                    }}
                  >
                    <i className="fas fa-exchange-alt me-3 text-primary" style={{ width: '20px' }}></i>
                    <span>Movimientos y Gastos</span>
                  </Link>

                  <Link 
                    to="/reportes" 
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
                    <span>Reportes Tradicionales</span>
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