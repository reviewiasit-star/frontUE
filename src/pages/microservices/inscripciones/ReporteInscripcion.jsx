import React, { useState, useEffect } from 'react';
import { useNotification } from '../../../hooks/useNotification';
import { getApiUrl } from '../../../config/apiConfig';
import AuthService from '../../../services/authService';

function ReporteInscripcion() {
  const { showSuccess, showError } = useNotification();
  
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    estudiantesInscriptos: 0,
    estudiantesSinInscripcion: 0,
    turnoManana: 0,
    turnoTarde: 0,
    totalEstudiantes: 0
  });
  
  const [filtros, setFiltros] = useState({
    nivel_id: '',
    curso_id: '',
    bloque_id: '',
    anio: ''
  });
  
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [bloques, setBloques] = useState([]);
  const [filtroActivo, setFiltroActivo] = useState('todos');
  const [filtroRapido, setFiltroRapido] = useState(null); // Mantener el filtro rápido incluso cuando se seleccionan filtros avanzados
  // Estados para paginación
  const [paginaActual, setPaginaActual] = useState(1);
  const [itemsPorPagina] = useState(8);

  useEffect(() => {
    cargarEstadisticas();
    cargarEstudiantes();
    cargarNiveles();
    cargarCursos();
    cargarBloques();
  }, []);

  useEffect(() => {
    cargarEstudiantes();
  }, [filtros, filtroActivo, filtroRapido]);

  const cargarEstadisticas = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/dashboard/estudiantes-count', user?.rol);
      
      const [
        estudiantesRes,
        sinInscripcionRes,
        mananaRes,
        tardeRes,
        totalRes
      ] = await Promise.all([
        fetch(`${apiUrl}/dashboard/estudiantes-count`, { headers }),
        fetch(`${apiUrl}/dashboard/estudiantes-sin-inscripcion-count`, { headers }),
        fetch(`${apiUrl}/dashboard/estudiantes-turno-manana-count`, { headers }),
        fetch(`${apiUrl}/dashboard/estudiantes-turno-tarde-count`, { headers }),
        fetch(`${apiUrl}/reportes-inscripcion/total-estudiantes`, { headers })
      ]);

      const [
        estudiantesData,
        sinInscripcionData,
        mananaData,
        tardeData,
        totalData
      ] = await Promise.all([
        estudiantesRes.json(),
        sinInscripcionRes.json(),
        mananaRes.json(),
        tardeRes.json(),
        totalRes.json()
      ]);
      
      setStats({
        estudiantesInscriptos: (estudiantesData.ok ? estudiantesData.count : 0) || 0,
        estudiantesSinInscripcion: (sinInscripcionData.ok ? sinInscripcionData.count : 0) || 0,
        turnoManana: (mananaData.ok ? mananaData.count : 0) || 0,
        turnoTarde: (tardeData.ok ? tardeData.count : 0) || 0,
        totalEstudiantes: (totalData.ok ? totalData.count : 0) || 0
      });
    } catch (error) {
      console.error('Error al cargar estadísticas:', error);
    }
  };

  const cargarNiveles = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/niveles', user?.rol);
      const response = await fetch(`${apiUrl}/niveles`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setNiveles(data);
      }
    } catch (error) {
      console.error('Error al cargar niveles:', error);
    }
  };

  const cargarCursos = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/cursos', user?.rol);
      const response = await fetch(`${apiUrl}/cursos`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setCursos(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al cargar cursos:', error);
    }
  };

  const cargarBloques = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/bloques', user?.rol);
      const response = await fetch(`${apiUrl}/bloques`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok) {
        setBloques(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error al cargar bloques:', error);
    }
  };

  const cargarEstudiantes = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Construir query params
      const params = new URLSearchParams();
      
      // Aplicar filtro rápido si existe (se mantiene incluso cuando se seleccionan filtros avanzados)
      const filtroRapidoActivo = filtroRapido || filtroActivo;
      if (filtroRapidoActivo === 'turno_manana') {
        params.append('turno', 'mañana');
      } else if (filtroRapidoActivo === 'turno_tarde') {
        params.append('turno', 'tarde');
      } else if (filtroRapidoActivo === 'inscritos') {
        params.append('inscrito', 'true');
      } else if (filtroRapidoActivo === 'sin_inscripcion') {
        params.append('inscrito', 'false');
      }
      
      // Aplicar filtros avanzados
      if (filtros.nivel_id) {
        params.append('nivel_id', filtros.nivel_id);
      }
      if (filtros.curso_id) {
        params.append('curso_id', filtros.curso_id);
      }
      if (filtros.bloque_id) {
        params.append('bloque_id', filtros.bloque_id);
      }
      if (filtros.anio) {
        params.append('anio', filtros.anio);
      }

      // Construir URL - si hay parámetros, agregarlos, si no, solo la URL base
      const queryString = params.toString();
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/reportes-inscripcion', user?.rol);
      const url = `${apiUrl}/reportes-inscripcion/estudiantes${queryString ? `?${queryString}` : ''}`;
      
      console.log('Cargando estudiantes desde:', url);
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      console.log('Respuesta del servidor:', data);
      
      if (response.ok) {
        setEstudiantes(Array.isArray(data) ? data : []);
      } else {
        console.error('Error en respuesta:', data);
        showError('Error', data.message || 'Error al cargar los estudiantes');
        setEstudiantes([]);
      }
    } catch (error) {
      console.error('Error al cargar estudiantes:', error);
      showError('Error de conexión', 'Error de conexión al cargar los estudiantes');
      setEstudiantes([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFiltroRapido = (filtro) => {
    setFiltroActivo(filtro);
    setPaginaActual(1); // Resetear a la primera página cuando cambia el filtro
    if (filtro === 'todos') {
      setFiltroRapido(null);
      setFiltros({
        nivel_id: '',
        curso_id: '',
        bloque_id: '',
        anio: ''
      });
    } else if (filtro === 'sin_inscripcion') {
      // Limpiar filtros de inscripción cuando se selecciona "Sin Inscripción"
      // porque estos filtros no tienen sentido para estudiantes sin inscripción
      setFiltroRapido('sin_inscripcion');
      setFiltros({
        nivel_id: '',
        curso_id: '',
        bloque_id: '',
        anio: ''
      });
    } else {
      // Mantener el filtro rápido incluso cuando se seleccionan filtros avanzados
      setFiltroRapido(filtro);
    }
  };

  const handleFiltroChange = (name, value) => {
    setFiltros((prev) => {
      const next = { ...prev, [name]: value };

      if (name === 'nivel_id') {
        next.curso_id = '';
        const nivel = niveles.find((n) => String(n.id) === String(value));
        if (nivel?.bloque_id) {
          next.bloque_id = String(nivel.bloque_id);
        }
      }

      if (name === 'curso_id') {
        if (value) {
          const cursoSeleccionado = cursos.find((c) => String(c.id) === String(value));
          if (cursoSeleccionado) {
            next.nivel_id = String(cursoSeleccionado.nivel_id);
            const nivel = niveles.find((n) => String(n.id) === String(cursoSeleccionado.nivel_id));
            if (nivel?.bloque_id) {
              next.bloque_id = String(nivel.bloque_id);
            }
          }
        } else {
          next.curso_id = '';
        }
      }

      if (name === 'bloque_id') {
        if (!value) {
          next.bloque_id = '';
        } else {
          const nivelesDelBloque = niveles.filter(
            (n) => String(n.bloque_id) === String(value)
          );
          if (
            next.nivel_id &&
            !nivelesDelBloque.some((n) => String(n.id) === String(next.nivel_id))
          ) {
            next.nivel_id = '';
            next.curso_id = '';
          }
          if (!next.nivel_id && nivelesDelBloque.length === 1) {
            next.nivel_id = String(nivelesDelBloque[0].id);
          }
        }
      }

      return next;
    });
    // No cambiar filtroActivo a 'personalizado', mantener el filtro rápido activo si existe
    // Esto permite combinar filtros rápidos con filtros avanzados
    if (!filtroRapido) {
      setFiltroActivo('personalizado');
    }
    setPaginaActual(1); // Resetear a la primera página cuando cambia el filtro
  };

  const limpiarFiltros = () => {
    setFiltros({
      nivel_id: '',
      curso_id: '',
      bloque_id: '',
      anio: ''
    });
    setFiltroActivo('todos');
    setFiltroRapido(null);
    setPaginaActual(1); // Resetear a la primera página
  };

  const nivelSeleccionado = filtros.nivel_id
    ? niveles.find((nivel) => String(nivel.id) === String(filtros.nivel_id))
    : null;

  const nivelesDisponibles = filtros.bloque_id
    ? niveles.filter((nivel) => String(nivel.bloque_id) === String(filtros.bloque_id))
    : niveles;

  const cursosDisponibles = (() => {
    if (filtros.nivel_id) {
      return cursos.filter((curso) => String(curso.nivel_id) === String(filtros.nivel_id));
    }

    if (filtros.bloque_id) {
      const idsNivel = new Set(
        nivelesDisponibles.map((nivel) => String(nivel.id))
      );
      return cursos.filter((curso) => idsNivel.has(String(curso.nivel_id)));
    }

    return cursos;
  })();

  const bloquesDisponibles = nivelSeleccionado?.bloque_id
    ? bloques.filter((bloque) => String(bloque.id) === String(nivelSeleccionado.bloque_id))
    : bloques;

  // Resetear a la primera página cuando cambian los estudiantes
  useEffect(() => {
    if (estudiantes.length > 0 && paginaActual > Math.ceil(estudiantes.length / itemsPorPagina)) {
      setPaginaActual(1);
    }
  }, [estudiantes.length, paginaActual, itemsPorPagina]);

  // Función para exportar a Excel
  const exportarExcel = () => {
    // Importar dinámicamente xlsx
    import('xlsx').then((XLSX) => {
      const datos = estudiantes.map(est => ({
        'Código': est.codigo_estudiante || 'N/A',
        'Nombre': est.nombre,
        'Apellido Paterno': est.apellido_paterno,
        'Apellido Materno': est.apellido_materno || '',
        'CI Estudiante': est.ci_estudiante,
        'Turno': est.turno || 'Sin turno',
        'Nivel': est.nivel_nombre || 'Sin nivel',
        'Curso': est.curso_nombre || 'Sin curso',
        'Bloque': est.bloque_nombre || 'Sin bloque',
        'Estado Inscripción': est.estado_inscripcion || 'Sin inscripción'
      }));

      const ws = XLSX.utils.json_to_sheet(datos);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Estudiantes');
      
      const fecha = new Date().toISOString().split('T')[0];
      XLSX.writeFile(wb, `Reporte_Inscripcion_${fecha}.xlsx`);
      showSuccess('Éxito', 'Archivo Excel exportado correctamente');
    }).catch(error => {
      console.error('Error al exportar Excel:', error);
      showError('Error', 'No se pudo exportar el archivo Excel. Asegúrate de tener la librería xlsx instalada.');
    });
  };

  // Función para exportar a PDF
  const exportarPDF = () => {
    // Importar dinámicamente jspdf y jspdf-autotable
    Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).then(([jsPDF, autoTable]) => {
      const doc = new jsPDF.default();
      
      // Título
      doc.setFontSize(16);
      doc.text('Reporte de Inscripción', 14, 15);
      
      // Fecha
      doc.setFontSize(10);
      const fecha = new Date().toLocaleDateString('es-ES');
      doc.text(`Fecha: ${fecha}`, 14, 22);
      doc.text(`Total de estudiantes: ${estudiantes.length}`, 14, 27);
      
      // Datos de la tabla
      const datos = estudiantes.map(est => [
        est.codigo_estudiante || 'N/A',
        est.nombre,
        est.apellido_paterno,
        est.apellido_materno || '',
        est.ci_estudiante,
        est.turno || 'Sin turno',
        est.nivel_nombre || 'Sin nivel',
        est.curso_nombre || 'Sin curso',
        est.bloque_nombre || 'Sin bloque',
        est.estado_inscripcion || 'Sin inscripción'
      ]);

      autoTable.default(doc, {
        head: [['Código', 'Nombre', 'Ap. Paterno', 'Ap. Materno', 'CI', 'Turno', 'Nivel', 'Curso', 'Bloque', 'Estado']],
        body: datos,
        startY: 35,
        styles: { fontSize: 6 },
        headStyles: { fillColor: [13, 110, 253], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      const fechaArchivo = new Date().toISOString().split('T')[0];
      doc.save(`Reporte_Inscripcion_${fechaArchivo}.pdf`);
      showSuccess('Éxito', 'Archivo PDF exportado correctamente');
    }).catch(error => {
      console.error('Error al exportar PDF:', error);
      showError('Error', 'No se pudo exportar el archivo PDF. Asegúrate de tener las librerías jspdf y jspdf-autotable instaladas.');
    });
  };

  return (
    <div className="container-fluid py-4">
      <style>{`
        .reporte-table thead th {
          background-color: #0d6efd !important;
          color: #ffffff !important;
          font-weight: 700 !important;
          border: 1px solid #0a58ca !important;
        }
        .reporte-table thead {
          background-color: #0d6efd !important;
        }
        .reporte-table thead tr {
          background-color: #0d6efd !important;
        }
      `}</style>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="fas fa-chart-line me-2"></i>
          Reportes de Inscripción
        </h2>
      </div>

      {/* Cards de Estadísticas */}
      <div className="row g-3 mb-4">
        {[
          { 
            title: 'Estudiantes Inscriptos', 
            value: stats.estudiantesInscriptos, 
            icon: 'fas fa-user-check', 
            color: 'success',
            bgGradient: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)'
          },
          { 
            title: 'Estudiantes sin Inscripción', 
            value: stats.estudiantesSinInscripcion, 
            icon: 'fas fa-user-minus', 
            color: 'danger',
            bgGradient: 'linear-gradient(135deg, #dc3545 0%, #fd7e14 100%)'
          },
          { 
            title: 'Estudiantes Turno Mañana', 
            value: stats.turnoManana, 
            icon: 'fas fa-sun', 
            color: 'warning',
            bgGradient: 'linear-gradient(135deg, #ffc107 0%, #ff9800 100%)'
          },
          { 
            title: 'Estudiantes Turno Tarde', 
            value: stats.turnoTarde, 
            icon: 'fas fa-cloud-sun', 
            color: 'info',
            bgGradient: 'linear-gradient(135deg, #17a2b8 0%, #007bff 100%)'
          },
          { 
            title: 'Total Estudiantes', 
            value: stats.totalEstudiantes, 
            icon: 'fas fa-users', 
            color: 'primary',
            bgGradient: 'linear-gradient(135deg, #007bff 0%, #6610f2 100%)'
          }
        ].map((card, index) => (
          <div key={index} className="col-xl-2 col-lg-3 col-md-4 col-sm-6 col-12">
            <div 
              className="card border-0 shadow-sm h-100" 
              style={{ 
                background: card.bgGradient,
                borderRadius: '12px',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.boxShadow = '0 8px 16px rgba(0,0,0,0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
              }}
            >
              <div className="card-body p-3 text-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <i className={`${card.icon} fa-lg`} style={{ opacity: 0.9 }}></i>
                  <div className="text-end">
                    <h3 className="mb-0 fw-bold">{card.value}</h3>
                  </div>
                </div>
                <h6 className="mb-0" style={{ fontSize: '0.75rem', opacity: 0.95, fontWeight: '500' }}>
                  {card.title}
                </h6>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="card mb-3">
        <div className="card-header">
          <h6 className="mb-0">
            <i className="fas fa-filter me-2"></i>
            Filtros de Búsqueda
          </h6>
        </div>
        <div className="card-body">
          {/* Filtros Rápidos */}
          <div className="row g-2 mb-3">
            <div className="col-12">
              <label className="form-label fw-bold">Filtros Rápidos:</label>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${(filtroActivo === 'todos' && !filtroRapido && !filtros.nivel_id && !filtros.curso_id && !filtros.bloque_id && !filtros.anio) ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => handleFiltroRapido('todos')}
              >
                <i className="fas fa-users me-1"></i>
                Todos
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${(filtroActivo === 'turno_manana' || filtroRapido === 'turno_manana') ? 'btn-warning' : 'btn-outline-warning'}`}
                onClick={() => handleFiltroRapido('turno_manana')}
              >
                <i className="fas fa-sun me-1"></i>
                Turno Mañana
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${(filtroActivo === 'turno_tarde' || filtroRapido === 'turno_tarde') ? 'btn-info' : 'btn-outline-info'}`}
                onClick={() => handleFiltroRapido('turno_tarde')}
              >
                <i className="fas fa-cloud-sun me-1"></i>
                Turno Tarde
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${(filtroActivo === 'inscritos' || filtroRapido === 'inscritos') ? 'btn-success' : 'btn-outline-success'}`}
                onClick={() => handleFiltroRapido('inscritos')}
              >
                <i className="fas fa-user-check me-1"></i>
                Solo Inscriptos
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className={`btn w-100 ${(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion') ? 'btn-danger' : 'btn-outline-danger'}`}
                onClick={() => handleFiltroRapido('sin_inscripcion')}
              >
                <i className="fas fa-user-times me-1"></i>
                Sin Inscripción
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={limpiarFiltros}
              >
                <i className="fas fa-redo me-1"></i>
                Limpiar
              </button>
            </div>
          </div>

          {/* Filtros Avanzados */}
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Año</label>
              <select
                className="form-select"
                value={filtros.anio}
                onChange={(e) => handleFiltroChange('anio', e.target.value)}
                disabled={(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion')}
                title={(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion') ? 'Este filtro no aplica para estudiantes sin inscripción' : ''}
              >
                <option value="">Todos los años</option>
                {Array.from({ length: 5 }, (_, i) => {
                  const year = new Date().getFullYear() - i;
                  return (
                    <option key={year} value={year}>{year}</option>
                  );
                })}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Nivel</label>
              <select
                className="form-select"
                value={filtros.nivel_id}
                onChange={(e) => handleFiltroChange('nivel_id', e.target.value)}
                disabled={(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion')}
                title={(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion') ? 'Este filtro no aplica para estudiantes sin inscripción' : ''}
              >
                <option value="">Todos los niveles</option>
                {nivelesDisponibles.map((nivel) => (
                  <option key={nivel.id} value={nivel.id}>{nivel.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Curso</label>
              <select
                className="form-select"
                value={filtros.curso_id}
                onChange={(e) => handleFiltroChange('curso_id', e.target.value)}
                disabled={(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion')}
                title={(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion') ? 'Este filtro no aplica para estudiantes sin inscripción' : ''}
              >
                <option value="">Todos los cursos</option>
                {cursosDisponibles.map((curso) => (
                  <option key={curso.id} value={curso.id}>{curso.nombre}</option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Bloque</label>
              <select
                className="form-select"
                value={filtros.bloque_id}
                onChange={(e) => handleFiltroChange('bloque_id', e.target.value)}
                disabled={(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion')}
                title={(filtroActivo === 'sin_inscripcion' || filtroRapido === 'sin_inscripcion') ? 'Este filtro no aplica para estudiantes sin inscripción' : ''}
              >
                <option value="">Todos los bloques</option>
                {bloquesDisponibles.map((bloque) => (
                  <option key={bloque.id} value={bloque.id}>{bloque.descripcion}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Estudiantes */}
      <div className="card shadow-sm">
        <div className="card-header bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            <i className="fas fa-list me-2"></i>
            Lista de Estudiantes
          </h5>
          <div className="d-flex align-items-center gap-2">
            <div className="badge bg-light text-primary fs-6 px-3 py-2">
              <i className="fas fa-users me-1"></i>
              {estudiantes.length} estudiante{estudiantes.length !== 1 ? 's' : ''}
            </div>
            {estudiantes.length > 0 && (
              <>
                <button 
                  className="btn btn-light btn-sm"
                  onClick={exportarExcel}
                  title="Exportar a Excel"
                >
                  <i className="fas fa-file-excel me-1 text-success"></i>
                  Excel
                </button>
                <button 
                  className="btn btn-light btn-sm"
                  onClick={exportarPDF}
                  title="Exportar a PDF"
                >
                  <i className="fas fa-file-pdf me-1 text-danger"></i>
                  PDF
                </button>
              </>
            )}
          </div>
        </div>
        <div className="card-body p-0" style={{ backgroundColor: '#f8f9fa' }}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }}>
                <span className="visually-hidden">Cargando...</span>
              </div>
              <p className="mt-3 text-muted">Cargando estudiantes...</p>
            </div>
          ) : estudiantes.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-users fa-4x text-muted mb-3"></i>
              <h5 className="text-muted">No se encontraron estudiantes</h5>
              <p className="text-muted">No hay estudiantes que coincidan con los filtros seleccionados</p>
              <button 
                className="btn btn-primary mt-2"
                onClick={limpiarFiltros}
              >
                <i className="fas fa-redo me-2"></i>
                Limpiar Filtros
              </button>
            </div>
          ) : (
            <div className="table-responsive" style={{ maxHeight: '600px', overflowY: 'auto' }}>
              <table className="reporte-table" style={{ 
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
                      minWidth: '100px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Código</th>
                    <th style={{ 
                      minWidth: '120px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Nombre</th>
                    <th style={{ 
                      minWidth: '130px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Apellido Paterno</th>
                    <th style={{ 
                      minWidth: '130px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Apellido Materno</th>
                    <th style={{ 
                      minWidth: '120px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>CI Estudiante</th>
                    <th style={{ 
                      minWidth: '100px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Turno</th>
                    <th style={{ 
                      minWidth: '120px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Nivel</th>
                    <th style={{ 
                      minWidth: '120px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Curso</th>
                    <th style={{ 
                      minWidth: '150px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Bloque</th>
                    <th style={{ 
                      minWidth: '140px', 
                      padding: '14px 10px', 
                      textAlign: 'left',
                      fontSize: '14px',
                      lineHeight: '1.5'
                    }}>Estado Inscripción</th>
                  </tr>
                </thead>
                <tbody style={{ backgroundColor: '#ffffff' }}>
                  {(() => {
                    // Calcular índices para la paginación
                    const indiceInicio = (paginaActual - 1) * itemsPorPagina;
                    const indiceFin = indiceInicio + itemsPorPagina;
                    const estudiantesPagina = estudiantes.slice(indiceInicio, indiceFin);
                    
                    return estudiantesPagina.map((estudiante, index) => (
                    <tr 
                      key={`estudiante-${estudiante.id}-${index}`} 
                      style={{ 
                        cursor: 'pointer',
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
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                        <strong className="text-primary">{estudiante.codigo_estudiante || 'N/A'}</strong>
                      </td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>{estudiante.nombre}</td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>{estudiante.apellido_paterno}</td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>{estudiante.apellido_materno || '-'}</td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                        <code className="text-dark" style={{ color: '#212529' }}>{estudiante.ci_estudiante}</code>
                      </td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                        {estudiante.turno ? (
                          <span className={`badge ${
                            estudiante.turno.toLowerCase() === 'mañana' || estudiante.turno.toLowerCase() === 'manana' ? 'bg-warning text-dark' :
                            estudiante.turno.toLowerCase() === 'tarde' ? 'bg-info' :
                            'bg-secondary'
                          }`}>
                            <i className={`fas ${
                              estudiante.turno.toLowerCase() === 'mañana' || estudiante.turno.toLowerCase() === 'manana' ? 'fa-sun' :
                              estudiante.turno.toLowerCase() === 'tarde' ? 'fa-cloud-sun' :
                              'fa-moon'
                            } me-1`}></i>
                            {estudiante.turno}
                          </span>
                        ) : (
                          <span className="badge bg-secondary">
                            <i className="fas fa-times me-1"></i>
                            Sin turno
                          </span>
                        )}
                      </td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                        {estudiante.nivel_nombre && estudiante.nivel_nombre !== 'Sin nivel' ? (
                          <span className="badge bg-success">{estudiante.nivel_nombre}</span>
                        ) : (
                          <span style={{ color: '#6c757d' }}>Sin nivel</span>
                        )}
                      </td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                        {estudiante.curso_nombre && estudiante.curso_nombre !== 'Sin curso' ? (
                          <span className="badge bg-info">{estudiante.curso_nombre}</span>
                        ) : (
                          <span style={{ color: '#6c757d' }}>Sin curso</span>
                        )}
                      </td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                        {estudiante.bloque_nombre && estudiante.bloque_nombre !== 'Sin bloque' ? (
                          <span style={{ color: '#212529', fontWeight: '600' }}>{estudiante.bloque_nombre}</span>
                        ) : (
                          <span style={{ color: '#6c757d' }}>Sin bloque</span>
                        )}
                      </td>
                      <td style={{ color: '#212529', padding: '10px 8px', border: '1px solid #dee2e6' }}>
                        {estudiante.estado_inscripcion && estudiante.estado_inscripcion !== 'Sin inscripción' ? (
                          <span className={`badge ${
                            estudiante.estado_inscripcion === 'activo' ? 'bg-success' : 'bg-secondary'
                          }`}>
                            <i className="fas fa-check-circle me-1"></i>
                            {estudiante.estado_inscripcion}
                          </span>
                        ) : (
                          <span className="badge bg-danger">
                            <i className="fas fa-times-circle me-1"></i>
                            Sin inscripción
                          </span>
                        )}
                      </td>
                    </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {estudiantes.length > 0 && (
          <div className="card-footer bg-light">
            <div className="d-flex justify-content-between align-items-center flex-wrap">
              <div className="mb-2 mb-md-0">
                <small className="text-muted">
                  <i className="fas fa-info-circle me-1"></i>
                  Mostrando {((paginaActual - 1) * itemsPorPagina) + 1} - {Math.min(paginaActual * itemsPorPagina, estudiantes.length)} de {estudiantes.length} estudiante{estudiantes.length !== 1 ? 's' : ''}
                </small>
              </div>
              <div className="d-flex align-items-center gap-2">
                {estudiantes.length > 8 && (
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
                      {Array.from({ length: Math.ceil(estudiantes.length / itemsPorPagina) }, (_, i) => i + 1).map(num => {
                        // Mostrar solo algunas páginas alrededor de la actual
                        const totalPaginas = Math.ceil(estudiantes.length / itemsPorPagina);
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
                      <li className={`page-item ${paginaActual === Math.ceil(estudiantes.length / itemsPorPagina) ? 'disabled' : ''}`}>
                        <button 
                          className="page-link" 
                          onClick={() => setPaginaActual(prev => Math.min(Math.ceil(estudiantes.length / itemsPorPagina), prev + 1))}
                          disabled={paginaActual === Math.ceil(estudiantes.length / itemsPorPagina)}
                        >
                          Siguiente <i className="fas fa-chevron-right"></i>
                        </button>
                      </li>
                    </ul>
                  </nav>
                )}
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => window.print()}
                >
                  <i className="fas fa-print me-1"></i>
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReporteInscripcion;

