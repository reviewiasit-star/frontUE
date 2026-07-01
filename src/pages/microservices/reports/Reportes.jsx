import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getApiUrl } from '../../../config/apiConfig';
import AuthService from '../../../services/authService';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../../assets/img/logo.jpg';
import WhatsAppPDFSender from '../../../components/WhatsAppPDFSender';
import ModalDetalles from '../../../components/ModalDetalles';

const Reportes = () => {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filtroAnio, setFiltroAnio] = useState(new Date().getFullYear());
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [mesInicio, setMesInicio] = useState('Enero');
  const [mesFin, setMesFin] = useState('Diciembre');
  const [filtroEstadoCompromiso, setFiltroEstadoCompromiso] = useState('todos');
  const [bloques, setBloques] = useState([]);
  const [niveles, setNiveles] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [filtroBloqueId, setFiltroBloqueId] = useState('todos');
  const [filtroNivelId, setFiltroNivelId] = useState('todos');
  const [filtroCursoId, setFiltroCursoId] = useState('todos');
  const [showWhatsAppSender, setShowWhatsAppSender] = useState(false);
  const [showModalDetalles, setShowModalDetalles] = useState(false);
  const [pdfWhatsAppBlob, setPdfWhatsAppBlob] = useState(null);
  const [seleccionIds, setSeleccionIds] = useState(new Set());
  const [telefonoWhatsApp, setTelefonoWhatsApp] = useState('');

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  useEffect(() => {
    cargarDatos();
  }, [filtroAnio, filtroEstadoCompromiso, filtroBloqueId, filtroNivelId, filtroCursoId]);

  useEffect(() => {
    cargarCatalogos();
  }, []);

  const cargarCatalogos = async () => {
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const headers = token ? { 'Authorization': `Bearer ${token}` } : undefined;

      const [respBloques, respNiveles, respCursos] = await Promise.all([
        fetch(`${getApiUrl('/bloques', user?.rol)}/bloques`, { headers }),
        fetch(`${getApiUrl('/niveles', user?.rol)}/niveles`, { headers }),
        fetch(`${getApiUrl('/cursos', user?.rol)}/cursos`, { headers })
      ]);

      if (respBloques.ok) {
        const dataBloques = await respBloques.json();
        setBloques(Array.isArray(dataBloques) ? dataBloques : []);
      }

      if (respNiveles.ok) {
        const dataNiveles = await respNiveles.json();
        setNiveles(Array.isArray(dataNiveles) ? dataNiveles : []);
      }

      if (respCursos.ok) {
        const dataCursos = await respCursos.json();
        setCursos(Array.isArray(dataCursos) ? dataCursos : []);
      }
    } catch (e) {
      // Catálogos son opcionales; si falla no bloquea el reporte
      console.warn('No se pudieron cargar catálogos (bloques/niveles/cursos):', e);
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/reporte-pagos-estudiantes', user?.rol);
      const params = new URLSearchParams({
        anio: filtroAnio,
        estado_compromiso: filtroEstadoCompromiso,
        bloque_id: filtroBloqueId,
        nivel_id: filtroNivelId,
        curso_id: filtroCursoId
      });

      const response = await fetch(`${apiUrl}/reporte-pagos-estudiantes?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Error al cargar datos');
      }

      const data = await response.json();
      
      if (data.ok) {
        setEstudiantes(data.estudiantes);
      } else {
        throw new Error(data.message || 'Error al cargar datos');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const obtenerEstadoPago = (estudiante, mes) => {
    const pagoMes = estudiante.pagos_por_mes[mes];

    // Determinar los meses correspondientes al nivel del estudiante (si están disponibles)
    let mesesNivel = [];
    if (estudiante.nivel_meses) {
      try {
        const parsed = JSON.parse(estudiante.nivel_meses);
        if (Array.isArray(parsed)) {
          mesesNivel = parsed
            .filter(m => typeof m === 'string' && m.trim() !== '')
            .map(m => {
              const limpio = m.trim().toLowerCase();
              // Normalizar a formato con mayúscula inicial para coincidir con 'mes'
              return limpio.charAt(0).toUpperCase() + limpio.slice(1);
            });
        }
      } catch (e) {
        console.error('Error al parsear nivel_meses:', e);
      }
    }
    
    // IMPORTANTE: Si el compromiso está concluido, no mostrar deudas pendientes
    if (estudiante.estado_compromiso === 'concluido') {
      // Si hay información del pago, mostrarla como está
      if (pagoMes) {
        const montoPagado = parseFloat(pagoMes.cuota) || 0;
        const montoEsperado = parseFloat(pagoMes.monto_con_descuento) || 0;
        
        return { 
          estado: montoPagado > 0 ? 'Pagado' : 'No Aplica', 
          color: montoPagado > 0 ? 'success' : 'secondary',
          montoPendiente: 0, // No hay pendientes en compromisos concluidos
          montoPagado: montoPagado,
          montoEsperado: montoEsperado,
          conBeca: pagoMes.tiene_beca === 1,
          descuentoBeca: pagoMes.descuento_beca || 0,
          fechaVencimiento: pagoMes.fecha_vencimiento || null
        };
      } else {
        // Si no hay información del mes en un compromiso concluido
        return { 
          estado: 'No Aplica', 
          color: 'secondary',
          montoPendiente: 0,
          montoPagado: 0,
          montoEsperado: 0,
          conBeca: false,
          fechaVencimiento: null
        };
      }
    }
    
    // Si no hay información del mes
    if (!pagoMes) {
      // Si el mes NO corresponde al plan del nivel, no aplica
      if (mesesNivel.length > 0 && !mesesNivel.includes(mes)) {
        return {
          estado: 'No Aplica',
          color: 'secondary',
          montoPendiente: 0,
          montoPagado: 0,
          montoEsperado: 0,
          conBeca: false,
          fechaVencimiento: null
        };
      }

      // Obtener el número de meses del nivel
      let numeroCuotas = 10; // Fallback por defecto
      if (mesesNivel.length > 0) {
        numeroCuotas = mesesNivel.length;
      }
      const cuotaMensual = estudiante.total_cuotas / numeroCuotas;
      return { 
        estado: 'Pendiente', 
        color: 'danger',
        montoPendiente: cuotaMensual,
        montoPagado: 0,
        montoEsperado: cuotaMensual,
        conBeca: false,
        fechaVencimiento: null
      };
    }

    const montoPagado = parseFloat(pagoMes.cuota) || 0;
    const montoEsperado = parseFloat(pagoMes.monto_con_descuento) || 0;
    const montoPendiente = Math.max(0, montoEsperado - montoPagado);

    // Usar el estado directamente de la nueva estructura
    switch (pagoMes.estado) {
      case 'no_aplica':
        return {
          estado: 'No contado',
          color: 'secondary',
          montoPendiente: 0,
          montoPagado: 0,
          montoEsperado: 0,
          conBeca: false,
          descuentoBeca: 0,
          fechaVencimiento: pagoMes.fecha_vencimiento || null
        };
      case 'pagado':
        return { 
          estado: 'Pagado', 
          color: 'success',
          montoPendiente: 0,
          montoPagado: montoPagado,
          montoEsperado: montoEsperado,
          conBeca: pagoMes.tiene_beca === 1,
          descuentoBeca: pagoMes.descuento_beca || 0,
          fechaVencimiento: pagoMes.fecha_vencimiento || null
        };
        
      case 'parcial':
        return { 
          estado: 'Parcial', 
          color: 'warning',
          montoPendiente: montoPendiente,
          montoPagado: montoPagado,
          montoEsperado: montoEsperado,
          conBeca: pagoMes.tiene_beca === 1,
          descuentoBeca: pagoMes.descuento_beca || 0,
          fechaVencimiento: pagoMes.fecha_vencimiento || null
        };
        
      case 'beca_completa':
        return { 
          estado: 'Beca Completa', 
          color: 'info',
          montoPendiente: 0,
          montoPagado: montoPagado,
          montoEsperado: montoEsperado,
          conBeca: true,
          descuentoBeca: 100,
          fechaVencimiento: pagoMes.fecha_vencimiento || null
        };
        
      case 'pendiente':
      default:
        // Verificar si tiene beca pero aún no ha pagado
        if (pagoMes.tiene_beca === 1 && pagoMes.descuento_beca > 0) {
          return { 
            estado: 'Pendiente', 
            color: 'danger',
            montoPendiente: montoEsperado,
            montoPagado: 0,
            montoEsperado: montoEsperado,
            conBeca: true,
            descuentoBeca: pagoMes.descuento_beca || 0,
            fechaVencimiento: pagoMes.fecha_vencimiento || null
          };
        } else {
          return { 
            estado: 'Pendiente', 
            color: 'danger',
            montoPendiente: montoEsperado,
            montoPagado: 0,
            montoEsperado: montoEsperado,
            conBeca: false,
            descuentoBeca: 0,
            fechaVencimiento: pagoMes.fecha_vencimiento || null
          };
        }
    }
  };

  const estudiantesFiltrados = estudiantes.filter(estudiante => {
    const nombreCompleto = estudiante.nombre.toLowerCase();
    const ci = estudiante.ci_estudiante.toString();
    const busqueda = filtroBusqueda.toLowerCase();
    
    return nombreCompleto.includes(busqueda) || ci.includes(busqueda);
  });

  const nivelesFiltrados = filtroBloqueId === 'todos'
    ? niveles
    : niveles.filter(n => String(n.bloque_id) === String(filtroBloqueId));

  const cursosFiltrados = cursos.filter(c => {
    const matchBloque = filtroBloqueId === 'todos' || String(c.bloque_id) === String(filtroBloqueId);
    const matchNivel = filtroNivelId === 'todos' || String(c.nivel_id) === String(filtroNivelId);
    return matchBloque && matchNivel;
  });

  const mesesAMostrar = meses.slice(
    meses.indexOf(mesInicio),
    meses.indexOf(mesFin) + 1
  ).filter(m => m !== 'Enero' && m !== 'Diciembre');

  // Función para generar PDF del reporte
  const generarPDF = (datosPDF) => {
    const dataAUsar = Array.isArray(datosPDF) ? datosPDF : estudiantesFiltrados;
    try {
      // A3 (más ancho) para que las columnas de meses no se vean tan pequeñas
      const doc = new jsPDF('landscape', 'mm', 'a3');
      
      // A3 landscape: ~420mm de ancho (descontando márgenes)
      const anchoDisponible = 400;
      const numColumnasFijas = 4; // Nombre, CI, Nivel, Estado
      const numColumnasMeses = mesesAMostrar.length;
      
      // Anchos fijos para columnas básicas
      const anchoNombre = 40;
      const anchoNivel = 30;
      const anchoEstado = 25;
      const anchoTotal = 28;
      const anchoFijoTotal = anchoNombre + anchoNivel + anchoEstado + (anchoTotal * 2);
      
      // Calcular ancho para cada mes (distribuir el espacio restante)
      const anchoRestante = anchoDisponible - anchoFijoTotal;
      const anchoPorMes = Math.max(26, Math.floor(anchoRestante / numColumnasMeses));
      
      // Cargar logo
      const img = new window.Image();
      const bloqueSeleccionado = bloques.find(b => String(b.id) === String(filtroBloqueId));
      img.src = (bloqueSeleccionado && bloqueSeleccionado.logo_url) ? bloqueSeleccionado.logo_url : logo;
      
      const generarTabla = () => {
        // Preparar datos para la tabla con formato más compacto
        const tableData = [];
        
        dataAUsar.forEach((estudiante) => {
          const row = [
            estudiante.nombre,
            estudiante.nivel_nombre || '',
            estudiante.estado_compromiso || ''
          ];
          
          // Agregar datos de cada mes con formato compacto
          mesesAMostrar.forEach(mes => {
            const estadoPago = obtenerEstadoPago(estudiante, mes);
            // Formato en varias líneas para mejorar legibilidad
            const lineas = [];
            if (estadoPago.fechaVencimiento) {
              const fechaVenc = new Date(estadoPago.fechaVencimiento).toLocaleDateString('es-BO', {
                day: '2-digit',
                month: '2-digit'
              });
              lineas.push(`Vence: ${fechaVenc}`);
            }
            lineas.push(`Esperado: Bs ${estadoPago.montoEsperado.toFixed(2)}`);
            if (estadoPago.montoPagado > 0) {
              lineas.push(`Pagado: Bs ${estadoPago.montoPagado.toFixed(2)}`);
            }
            if (estadoPago.montoPendiente > 0) {
              lineas.push(`Pendiente: Bs ${estadoPago.montoPendiente.toFixed(2)}`);
            }
            lineas.push(`Estado: ${estadoPago.estado}`);
            const infoMes = lineas.join('\n');
            
            row.push(infoMes);
          });
          
          // Agregar totales
          row.push(`Bs ${parseFloat(estudiante.total_pagado).toFixed(2)}`);
          const saldoMostrar = estudiante.estado_compromiso === 'concluido' ? 0 : parseFloat(estudiante.saldo_pendiente);
          row.push(`Bs ${saldoMostrar.toFixed(2)}`);
          
          tableData.push(row);
        });
        
        // Encabezados de la tabla (abreviados para ahorrar espacio)
        const headers = [
          'Nombre',
          'Nivel',
          'Estado',
          ...mesesAMostrar.map(m => m.substring(0, 3).toUpperCase()), // Solo primeras 3 letras
          'Total Pag.',
          'Saldo Pend.'
        ];
        
        // Configurar estilos de columnas
        const columnStyles = {
          0: { cellWidth: anchoNombre, fontSize: 8 },
          1: { cellWidth: anchoNivel, fontSize: 8 },
          2: { cellWidth: anchoEstado, fontSize: 8 }
        };
        
        // Agregar estilos para meses
        mesesAMostrar.forEach((_, index) => {
          columnStyles[3 + index] = { 
            cellWidth: anchoPorMes, 
            fontSize: 7,
            cellPadding: 2
          };
        });
        
        // Agregar estilos para totales
        columnStyles[3 + numColumnasMeses] = { cellWidth: anchoTotal, fontSize: 8, cellPadding: 2 };
        columnStyles[4 + numColumnasMeses] = { cellWidth: anchoTotal, fontSize: 8, cellPadding: 2 };
        
        // Generar tabla
        autoTable(doc, {
          startY: 38,
          head: [headers],
          body: tableData,
          styles: { 
            fontSize: 8,
            cellPadding: 2,
            overflow: 'linebreak',
            halign: 'left',
            valign: 'middle'
          },
          headStyles: { 
            fillColor: [66, 139, 202], 
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 10,
            cellPadding: 3
          },
          didParseCell: function(data) {
            if (data.section === 'body' && data.column.index >= 3 && data.column.index < 3 + numColumnasMeses) {
              if (data.cell.raw && data.cell.raw.includes('Estado: Pendiente')) {
                data.cell.styles.textColor = [220, 53, 69]; // Rojo
                data.cell.styles.fontStyle = 'bold';
              } else if (data.cell.raw && data.cell.raw.includes('Estado: Pagado')) {
                data.cell.styles.textColor = [25, 135, 84]; // Verde
                data.cell.styles.fontStyle = 'bold';
              }
            }
          },
          columnStyles: columnStyles,
          margin: { top: 35, left: 8, right: 8 },
          tableWidth: 'auto',
          showHead: 'everyPage',
          pageBreak: 'auto',
          rowPageBreak: 'avoid'
        });
      };
      
      img.onload = function() {
        // Logo y título
        doc.addImage(img, 'JPEG', 8, 6, 30, 12);
        doc.setFontSize(14);
        doc.text('Reporte de Pagos de Estudiantes', 45, 15);
        
        // Información del reporte (más compacta)
        doc.setFontSize(8);
        doc.text(`Año: ${filtroAnio === 'todos' ? 'Todos' : filtroAnio} | Estado: ${filtroEstadoCompromiso === 'todos' ? 'Todos' : filtroEstadoCompromiso}`, 45, 26);
        doc.text(`Bloque: ${filtroBloqueId === 'todos' ? 'Todos' : filtroBloqueId} | Nivel: ${filtroNivelId === 'todos' ? 'Todos' : filtroNivelId} | Curso: ${filtroCursoId === 'todos' ? 'Todos' : filtroCursoId}`, 45, 31);
        doc.text(`Meses: ${mesInicio} - ${mesFin} | Fecha: ${new Date().toLocaleDateString('es-BO')} | Total: ${dataAUsar.length} estudiantes`, 45, 36);
        
        generarTabla();
        
        // Generar página de resumen
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Resumen de Estado de Pagos', 15, 20);

        let alDia = 0;
        let conDeuda = [];

        dataAUsar.forEach(est => {
          const mesesPendientes = [];
          mesesAMostrar.forEach(mes => {
            const ep = obtenerEstadoPago(est, mes);
            if (ep && (ep.estado === 'Pendiente' || ep.estado === 'Parcial')) {
              mesesPendientes.push(mes);
            }
          });
          if (mesesPendientes.length === 0) {
            alDia++;
          } else {
            conDeuda.push({ nombre: est.nombre, meses: mesesPendientes.join(', ') });
          }
        });

        doc.setFontSize(12);
        doc.setTextColor(25, 135, 84); // Verde
        doc.text(`Estudiantes al día: ${alDia}`, 15, 32);
        
        doc.setTextColor(220, 53, 69); // Rojo
        doc.text(`Estudiantes que faltan cancelar: ${conDeuda.length}`, 15, 42);
        
        doc.setTextColor(0, 0, 0);

        if (conDeuda.length > 0) {
          doc.setFontSize(14);
          doc.text('Detalle de estudiantes con deudas pendientes:', 15, 55);
          
          const deudoresData = conDeuda.map(d => [d.nombre, d.meses]);
          autoTable(doc, {
            startY: 60,
            head: [['Nombre del Estudiante', 'Meses Pendientes']],
            body: deudoresData,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [220, 53, 69] }
          });
        }
        
        // Guardar PDF
        const nombreArchivo = `Reporte_Pagos_${filtroAnio}_${new Date().getTime()}.pdf`;
        doc.save(nombreArchivo);
      };
      
      img.onerror = function() {
        // Si no se puede cargar el logo, generar PDF sin logo
        doc.setFontSize(14);
        doc.text('Reporte de Pagos de Estudiantes', 8, 15);
        doc.setFontSize(8);
        doc.text(`Año: ${filtroAnio === 'todos' ? 'Todos' : filtroAnio} | Estado: ${filtroEstadoCompromiso === 'todos' ? 'Todos' : filtroEstadoCompromiso}`, 8, 26);
        doc.text(`Bloque: ${filtroBloqueId === 'todos' ? 'Todos' : filtroBloqueId} | Nivel: ${filtroNivelId === 'todos' ? 'Todos' : filtroNivelId} | Curso: ${filtroCursoId === 'todos' ? 'Todos' : filtroCursoId}`, 8, 31);
        doc.text(`Meses: ${mesInicio} - ${mesFin} | Fecha: ${new Date().toLocaleDateString('es-BO')} | Total: ${dataAUsar.length} estudiantes`, 8, 36);
        
        generarTabla();
        
        // Generar página de resumen
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Resumen de Estado de Pagos', 15, 20);

        let alDia = 0;
        let conDeuda = [];

        dataAUsar.forEach(est => {
          const mesesPendientes = [];
          mesesAMostrar.forEach(mes => {
            const ep = obtenerEstadoPago(est, mes);
            if (ep && (ep.estado === 'Pendiente' || ep.estado === 'Parcial')) {
              mesesPendientes.push(mes);
            }
          });
          if (mesesPendientes.length === 0) {
            alDia++;
          } else {
            conDeuda.push({ nombre: est.nombre, meses: mesesPendientes.join(', ') });
          }
        });

        doc.setFontSize(12);
        doc.setTextColor(25, 135, 84); // Verde
        doc.text(`Estudiantes al día: ${alDia}`, 15, 32);
        
        doc.setTextColor(220, 53, 69); // Rojo
        doc.text(`Estudiantes que faltan cancelar: ${conDeuda.length}`, 15, 42);
        
        doc.setTextColor(0, 0, 0);

        if (conDeuda.length > 0) {
          doc.setFontSize(14);
          doc.text('Detalle de estudiantes con deudas pendientes:', 15, 55);
          
          const deudoresData = conDeuda.map(d => [d.nombre, d.meses]);
          autoTable(doc, {
            startY: 60,
            head: [['Nombre del Estudiante', 'Meses Pendientes']],
            body: deudoresData,
            styles: { fontSize: 10 },
            headStyles: { fillColor: [220, 53, 69] }
          });
        }
        
        const nombreArchivo = `Reporte_Pagos_${filtroAnio}_${new Date().getTime()}.pdf`;
        doc.save(nombreArchivo);
      };
    } catch (error) {
      console.error('Error al generar PDF:', error);
      alert('Error al generar el PDF. Por favor, intente nuevamente.');
    }
  };

  const generarPDFBlobParaWhatsApp = () => {
    try {
      const seleccionados = estudiantesFiltrados.filter((e) => seleccionIds.has(String(e.id)));
      if (seleccionados.length === 0) {
        alert('Selecciona al menos 1 estudiante para enviar por WhatsApp.');
        return;
      }

      if (seleccionados.length > 5) {
        const ok = window.confirm('Seleccionaste muchos estudiantes. El PDF puede salir muy pesado. ¿Continuar?');
        if (!ok) return;
      }

      // Formato WhatsApp: A4 vertical, 1 estudiante por página, meses como FILAS (más legible).
      const doc = new jsPDF('portrait', 'mm', 'a4');

      const formatMoney = (n) => `Bs ${(Number(n || 0)).toFixed(2)}`;
      const formatFecha = (d) => {
        if (!d) return '—';
        try {
          return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
          return '—';
        }
      };

      const estadoCellColor = (estado) => {
        switch (estado) {
          case 'Pagado':
          case 'Beca Completa':
            return { fill: [25, 135, 84], text: [255, 255, 255] };
          case 'Parcial':
            return { fill: [255, 193, 7], text: [0, 0, 0] };
          case 'Pendiente':
            return { fill: [220, 53, 69], text: [255, 255, 255] };
          case 'No Aplica':
          case 'No contado':
          default:
            return { fill: [108, 117, 125], text: [255, 255, 255] };
        }
      };

      const drawHeader = (pageTitle) => {
        doc.setFillColor(13, 110, 253);
        doc.rect(0, 0, 210, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.text(pageTitle, 12, 12);
        doc.setTextColor(0, 0, 0);
      };

      seleccionados.forEach((estudiante, idx) => {
        if (idx > 0) doc.addPage();

        drawHeader('Resumen de Pagos (WhatsApp)');

        const saldoMostrar =
          estudiante.estado_compromiso === 'concluido' ? 0 : parseFloat(estudiante.saldo_pendiente || 0);

        doc.setFontSize(11);
        doc.text(estudiante.nombre || 'Estudiante', 12, 28);
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        doc.text(`CI: ${estudiante.ci_estudiante || '—'}`, 12, 34);
        doc.text(`Nivel: ${estudiante.nivel_nombre || '—'}`, 12, 39);
        doc.text(`Estado compromiso: ${estudiante.estado_compromiso || '—'}`, 12, 44);
        doc.text(`Gestión: ${filtroAnio} | Meses: ${mesInicio} - ${mesFin}`, 12, 49);
        doc.text(`Total pagado: ${formatMoney(estudiante.total_pagado)} | Saldo: ${formatMoney(saldoMostrar)}`, 12, 54);
        doc.setTextColor(0, 0, 0);

        const body = mesesAMostrar.map((mes) => {
          const ep = obtenerEstadoPago(estudiante, mes);
          return [
            mes,
            ep.estado,
            formatMoney(ep.montoEsperado),
            formatMoney(ep.montoPagado),
            formatMoney(ep.montoPendiente),
            formatFecha(ep.fechaVencimiento)
          ];
        });

        autoTable(doc, {
          startY: 60,
          head: [['Mes', 'Estado', 'Esperado', 'Pagado', 'Pendiente', 'Vence']],
          body,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 2, valign: 'middle' },
          headStyles: { fillColor: [33, 37, 41], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 30, halign: 'center' },
            2: { cellWidth: 30, halign: 'right' },
            3: { cellWidth: 30, halign: 'right' },
            4: { cellWidth: 30, halign: 'right' },
            5: { cellWidth: 30, halign: 'center' }
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 1) {
              const c = estadoCellColor(String(data.cell.raw || ''));
              data.cell.styles.fillColor = c.fill;
              data.cell.styles.textColor = c.text;
              data.cell.styles.fontStyle = 'bold';
            }
          },
          margin: { left: 12, right: 12 }
        });
      });

      const blob = doc.output('blob');
      setPdfWhatsAppBlob(blob);
      setShowWhatsAppSender(true);
    } catch (error) {
      console.error('Error generando PDF para WhatsApp:', error);
      alert('No se pudo generar el PDF para WhatsApp.');
    }
  };

  const buscarHijosPorTelefono = async () => {
    try {
      const tel = String(telefonoWhatsApp || '').trim();
      if (!tel) {
        alert('Ingresa un número de WhatsApp para buscar sus estudiantes.');
        return;
      }

      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/estudiantes', user?.rol);

      const params = new URLSearchParams({ telefono: tel });
      const resp = await fetch(`${apiUrl}/estudiantes/hijos-por-telefono?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await resp.json();
      if (!resp.ok || !data.ok) {
        alert(data.message || 'No se pudo buscar por teléfono');
        return;
      }

      const ids = new Set((data.estudiantes || []).map((e) => String(e.id)));
      if (ids.size === 0) {
        alert('No se encontraron estudiantes asociados a ese número.');
        return;
      }

      // Seleccionar solo los que están actualmente visibles en este reporte
      const visibles = new Set(estudiantesFiltrados.map((e) => String(e.id)));
      const idsEnReporte = new Set([...ids].filter((id) => visibles.has(id)));

      setSeleccionIds(idsEnReporte);
      if (idsEnReporte.size === 0) {
        alert('Se encontraron estudiantes para el número, pero no aparecen con los filtros actuales del reporte.');
      }
    } catch (error) {
      console.error('Error buscando hijos por teléfono:', error);
      alert('Error al buscar por teléfono.');
    }
  };

  if (loading) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center">
                <div className="spinner-border" role="status">
                  <span className="visually-hidden">Cargando...</span>
                </div>
                <p className="mt-2">Cargando reporte de pagos...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-body text-center">
                <div className="alert alert-danger">
                  <h5>Error al cargar datos</h5>
                  <p>{error}</p>
                  <button className="btn btn-primary" onClick={cargarDatos}>
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showModalDetalles) {
    return (
      <ModalDetalles
        isOpen={showModalDetalles}
        onClose={() => setShowModalDetalles(false)}
        estudiantes={estudiantesFiltrados}
        mesesAMostrar={mesesAMostrar}
        obtenerEstadoPago={obtenerEstadoPago}
        mesInicio={mesInicio}
        mesFin={mesFin}
        setMesInicio={setMesInicio}
        setMesFin={setMesFin}
        meses={meses}
        generarPDF={generarPDF}
        filtroAnio={filtroAnio}
      />
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <div className="row">
        <div className="col-12">
          <div className="page-title-box">
            <div className="row align-items-center">
              <div className="col-sm-6">
                <h4 className="page-title">Resumen de Pagos de Estudiantes</h4>
                <ol className="breadcrumb">
                  <li className="breadcrumb-item">
                    <Link to="/">Dashboard</Link>
                  </li>
                  <li className="breadcrumb-item active">Reportes</li>
                </ol>
              </div>
              <div className="col-sm-6">
                <div className="float-end d-none d-md-block">
                  <div className="dropdown">
                    <button className="btn btn-primary dropdown-toggle" type="button" data-bs-toggle="dropdown">
                      <i className="fas fa-download me-1"></i> Exportar
                    </button>
                    <ul className="dropdown-menu">
                      <li><a className="dropdown-item" href="#"><i className="fas fa-file-excel me-2"></i>Excel</a></li>
                      <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); generarPDF(); }}><i className="fas fa-file-pdf me-2"></i>PDF</a></li>
                      <li><a className="dropdown-item" href="#" onClick={(e) => { e.preventDefault(); generarPDFBlobParaWhatsApp(); }}><i className="fab fa-whatsapp me-2 text-success"></i>WhatsApp (PDF)</a></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="alert alert-light border d-flex justify-content-between align-items-center">
            <div>
              <strong>Envío por WhatsApp:</strong> marca los estudiantes que quieres incluir en el PDF.
              <span className="ms-2 badge bg-secondary">{seleccionIds.size} seleccionados</span>
            </div>
            <div className="d-flex gap-2">
              <input
                type="tel"
                className="form-control form-control-sm"
                placeholder="WhatsApp: 70012345"
                value={telefonoWhatsApp}
                onChange={(e) => setTelefonoWhatsApp(e.target.value)}
                style={{ width: '200px' }}
              />
              <button className="btn btn-outline-primary btn-sm" onClick={buscarHijosPorTelefono}>
                Buscar hijos
              </button>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => setSeleccionIds(new Set())}
                disabled={seleccionIds.size === 0}
              >
                Limpiar
              </button>
              <button
                className="btn btn-success btn-sm"
                onClick={generarPDFBlobParaWhatsApp}
                disabled={seleccionIds.size === 0}
                title="Generar PDF y enviarlo por WhatsApp"
              >
                <i className="fab fa-whatsapp me-2"></i>
                Enviar PDF
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="fas fa-filter me-2"></i>
                Filtros de Búsqueda
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-2">
                <div className="col-md-2">
                  <label className="form-label">Mes Inicio</label>
                  <select 
                    className="form-select" 
                    value={mesInicio} 
                    onChange={(e) => setMesInicio(e.target.value)}
                  >
                    {meses.map(mes => (
                      <option key={mes} value={mes}>{mes}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Mes Fin</label>
                  <select 
                    className="form-select" 
                    value={mesFin} 
                    onChange={(e) => setMesFin(e.target.value)}
                  >
                    {meses.map(mes => (
                      <option key={mes} value={mes}>{mes}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Año</label>
                  <select 
                    className="form-select" 
                    value={filtroAnio} 
                    onChange={(e) => setFiltroAnio(e.target.value)}
                  >
                    <option value="todos">Todos los años</option>
                    <option value="2026">2026</option>
                    <option value="2025">2025</option>
                    <option value="2024">2024</option>
                    <option value="2023">2023</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Estado Compromiso</label>
                  <select 
                    className="form-select" 
                    value={filtroEstadoCompromiso} 
                    onChange={(e) => setFiltroEstadoCompromiso(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="activo">Activos</option>
                    <option value="concluido">Concluidos</option>
                    <option value="cancelado">Cancelados</option>
                    <option value="retirado">Retirados</option>
                  </select>
                </div>
              </div>
              <div className="row g-2 mt-1">
                <div className="col-md-3">
                  <label className="form-label">Bloque</label>
                  <select
                    className="form-select"
                    value={filtroBloqueId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFiltroBloqueId(v);
                      setFiltroNivelId('todos');
                      setFiltroCursoId('todos');
                    }}
                  >
                    <option value="todos">Todos</option>
                    {bloques.map(b => (
                      <option key={b.id} value={b.id}>{b.descripcion}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Nivel</label>
                  <select
                    className="form-select"
                    value={filtroNivelId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setFiltroNivelId(v);
                      setFiltroCursoId('todos');
                    }}
                  >
                    <option value="todos">Todos</option>
                    {nivelesFiltrados.map(n => (
                      <option key={n.id} value={n.id}>{n.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label">Curso</label>
                  <select
                    className="form-select"
                    value={filtroCursoId}
                    onChange={(e) => setFiltroCursoId(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    {cursosFiltrados.map(c => (
                      <option key={c.id} value={c.id}>{c.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <label className="form-label">Buscar estudiante</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nombre o CI..."
                    value={filtroBusqueda}
                    onChange={(e) => setFiltroBusqueda(e.target.value)}
                  />
                </div>
                <div className="col-md-1">
                  <label className="form-label">&nbsp;</label>
                  <div className="d-flex gap-1 justify-content-end">
                    <button className="btn btn-danger btn-sm" onClick={generarPDF} title="Exportar PDF">
                      <i className="fas fa-file-pdf"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="fas fa-users me-2"></i>
                Resumen de Pagos por Estudiante
              </h5>
              <div>
                <button 
                  className="btn btn-outline-primary btn-sm me-3"
                  onClick={() => setShowModalDetalles(true)}
                  title="Ver resumen completo y detallado"
                >
                  <i className="fas fa-expand-arrows-alt me-2"></i>
                  Ampliar detalles
                </button>
                <span className="badge bg-primary fs-6">
                  {estudiantesFiltrados.length} estudiantes
                </span>
              </div>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered table-hover">
                  <thead className="table-light">
                    <tr>
                      <th style={{ width: '40px' }} title="Seleccionar para WhatsApp">
                        <i className="fab fa-whatsapp text-success"></i>
                      </th>
                      <th>
                        <i className="fas fa-user me-1"></i>
                        NOMBRE
                      </th>
                      <th>
                        <i className="fas fa-id-card me-1"></i>
                        CI
                      </th>
                      <th>
                        <i className="fas fa-graduation-cap me-1"></i>
                        NIVEL
                      </th>
                      <th>
                        <i className="fas fa-flag me-1"></i>
                        ESTADO
                      </th>
                      {mesesAMostrar.map(mes => (
                        <th key={mes}>
                          <i className="fas fa-calendar me-1"></i>
                          {mes.toUpperCase()}
                        </th>
                      ))}
                      <th>
                        <i className="fas fa-money-bill me-1"></i>
                        TOTAL PAGADO
                      </th>
                      <th>
                        <i className="fas fa-balance-scale me-1"></i>
                        SALDO PENDIENTE
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {estudiantesFiltrados.length === 0 ? (
                      <tr>
                        <td colSpan={mesesAMostrar.length + 7} className="text-center">
                          <div className="alert alert-info mb-0">
                            No se encontraron estudiantes con los filtros aplicados
                          </div>
                        </td>
                      </tr>
                    ) : (
                      estudiantesFiltrados.map((estudiante, index) => (
                        <tr key={`${estudiante.id}-${estudiante.compromiso_id}`}>
                          <td style={{ width: '40px' }}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={seleccionIds.has(String(estudiante.id))}
                              onChange={(e) => {
                                const idStr = String(estudiante.id);
                                setSeleccionIds((prev) => {
                                  const next = new Set(prev);
                                  if (e.target.checked) next.add(idStr);
                                  else next.delete(idStr);
                                  return next;
                                });
                              }}
                              title="Seleccionar para WhatsApp"
                            />
                          </td>
                          <td>
                            <strong>{estudiante.nombre}</strong>
                          </td>
                          <td>{estudiante.ci_estudiante}</td>
                          <td>
                            <span className={`badge bg-${estudiante.nivel_nombre === 'Primario' ? 'primary' : 
                                                   estudiante.nivel_nombre === 'Kinder' ? 'info' : 
                                                   estudiante.nivel_nombre === 'Secundario' ? 'success' : 'warning'}`}>
                              {estudiante.nivel_nombre}
                            </span>
                          </td>
                          <td>
                            <span className={`badge bg-${
                              estudiante.estado_compromiso === 'activo' ? 'success' :
                              estudiante.estado_compromiso === 'concluido' ? 'primary' :
                              estudiante.estado_compromiso === 'cancelado' ? 'danger' :
                              estudiante.estado_compromiso === 'retirado' ? 'warning' : 'secondary'
                            }`}>
                              {estudiante.estado_compromiso === 'activo' ? 'Activo' :
                               estudiante.estado_compromiso === 'concluido' ? 'Concluido' :
                               estudiante.estado_compromiso === 'cancelado' ? 'Cancelado' :
                               estudiante.estado_compromiso === 'retirado' ? 'Retirado' : 
                               estudiante.estado_compromiso}
                            </span>
                          </td>
                                                     {mesesAMostrar.map(mes => {
                             const estadoPago = obtenerEstadoPago(estudiante, mes);
                             
                             return (
                                <td key={mes} className="text-center" style={{minWidth: '140px'}}>
                                  <div className="d-flex flex-column align-items-center">
                                    {/* Badge de estado */}
                                    <span className={`badge bg-${estadoPago.color} mb-2`} 
                                          style={{fontSize: '0.75rem', minWidth: '70px'}}>
                                      {estadoPago.estado}
                                    </span>
                                    
                                    {/* Información de beca */}
                                    {estadoPago.conBeca && estadoPago.descuentoBeca > 0 && (
                                      <div className="mb-2">
                                        <small className="text-info fw-bold" 
                                               title={`Descuento aplicado: ${estadoPago.descuentoBeca}%`}>
                                          <i className="fas fa-gift me-1"></i>
                                          {estadoPago.descuentoBeca}% desc.
                                        </small>
                                      </div>
                                    )}
                                    
                                    {/* Información de montos */}
                                    <div className="text-center w-100">
                                      {/* Monto esperado */}
                                      <div className="mb-1">
                                        <small className="text-muted d-block" style={{fontSize: '0.7rem'}}>
                                          Esperado:
                                        </small>
                                        <span className="fw-bold text-dark" style={{fontSize: '0.8rem'}}>
                                          Bs {estadoPago.montoEsperado.toFixed(2)}
                                        </span>
                                      </div>
                                      
                                      {/* Para pagos parciales, mostrar ambos montos con colores específicos */}
                                      {estadoPago.estado === 'Parcial' ? (
                                        <>
                                          {/* Monto pagado en naranja */}
                                          <div className="mb-1">
                                            <small className="d-block" style={{fontSize: '0.7rem', color: '#fd7e14'}}>
                                              <i className="fas fa-coins me-1"></i>
                                              Pagado:
                                            </small>
                                            <span className="fw-bold" style={{fontSize: '0.8rem', color: '#fd7e14'}}>
                                              Bs {estadoPago.montoPagado.toFixed(2)}
                                            </span>
                                          </div>
                                          
                                          {/* Monto pendiente en rojo */}
                                          <div className="mb-1">
                                            <small className="text-danger d-block" style={{fontSize: '0.7rem'}}>
                                              <i className="fas fa-exclamation-triangle me-1"></i>
                                              Pendiente:
                                            </small>
                                            <span className="fw-bold text-danger" style={{fontSize: '0.8rem'}}>
                                              Bs {estadoPago.montoPendiente.toFixed(2)}
                                            </span>
                                          </div>
                                        </>
                                      ) : (
                                        <>
                                          {/* Monto pagado (si hay) para otros estados */}
                                          {estadoPago.montoPagado > 0 && (
                                            <div className="mb-1">
                                              <small className="text-success d-block" style={{fontSize: '0.7rem'}}>
                                                <i className="fas fa-check-circle me-1"></i>
                                                Pagado:
                                              </small>
                                              <span className="fw-bold text-success" style={{fontSize: '0.8rem'}}>
                                                Bs {estadoPago.montoPagado.toFixed(2)}
                                              </span>
                                            </div>
                                          )}
                                          
                                          {/* Monto pendiente (si hay) para otros estados */}
                                          {estadoPago.montoPendiente > 0 && (
                                            <div className="mb-1">
                                              <small className="text-danger d-block" style={{fontSize: '0.7rem'}}>
                                                <i className="fas fa-exclamation-triangle me-1"></i>
                                                Pendiente:
                                              </small>
                                              <span className="fw-bold text-danger" style={{fontSize: '0.8rem'}}>
                                                Bs {estadoPago.montoPendiente.toFixed(2)}
                                              </span>
                                            </div>
                                          )}
                                        </>
                                      )}
                                      
                                      {/* Mensaje especial para pagos completos */}
                                      {estadoPago.estado === 'Pagado' && (
                                        <div className="mt-1">
                                          <small className="text-success">
                                            <i className="fas fa-check-double me-1"></i>
                                            Completo
                                          </small>
                                        </div>
                                      )}
                                      
                                      {/* Fecha de vencimiento */}
                                      {estadoPago.fechaVencimiento && (
                                        <div className="mt-1">
                                          <small className="text-muted d-block" style={{fontSize: '0.65rem'}}>
                                            <i className="fas fa-calendar-alt me-1"></i>
                                            Vence:
                                          </small>
                                          <span className="fw-bold" style={{fontSize: '0.7rem'}}>
                                            {new Date(estadoPago.fechaVencimiento).toLocaleDateString('es-BO', { 
                                              day: '2-digit', 
                                              month: '2-digit', 
                                              year: 'numeric' 
                                            })}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </td>
                              );
                           })}
                          <td className="text-end">
                            <strong className="text-success">
                              Bs {parseFloat(estudiante.total_pagado).toFixed(2)}
                            </strong>
                          </td>

                          <td className="text-end">
                            {(() => {
                              // Si el compromiso está concluido, el saldo pendiente debe ser 0
                              const saldoMostrar = estudiante.estado_compromiso === 'concluido' ? 0 : parseFloat(estudiante.saldo_pendiente);
                              return (
                                <strong className={`text-${saldoMostrar > 0 ? 'danger' : 'success'}`}>
                                  Bs {saldoMostrar.toFixed(2)}
                                </strong>
                              );
                            })()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <WhatsAppPDFSender
        isOpen={showWhatsAppSender}
        onClose={() => setShowWhatsAppSender(false)}
        pdfBlob={pdfWhatsAppBlob}
        studentName="resumen_pagos"
        fileName={`Resumen_Pagos_${filtroAnio}_${new Date().getTime()}.pdf`}
        defaultMessage="Le envío el resumen de pagos solicitado. Si tiene dudas, por favor responda a este mensaje."
        initialPhoneNumber={telefonoWhatsApp}
      />
    </div>
  );
};

export default Reportes;