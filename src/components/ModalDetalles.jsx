import React, { useState, useMemo, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../assets/img/logo.jpg';
import WhatsAppPDFSender from './WhatsAppPDFSender';
import WhatsAppBulkSender from './WhatsAppBulkSender';

const MultiSelectDropdown = ({ options, selected, onChange, label }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
  const toggleOption = (opt) => {
    if (selected.includes(opt)) {
      onChange(selected.filter(x => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  };

  return (
    <div className="dropdown w-100 position-relative">
      <button 
        className="form-select shadow-sm text-start"
        type="button" 
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
      >
        <span className="text-truncate" style={{ maxWidth: '85%' }}>
          {selected.length === 0 ? `Todos los ${label}` : `${selected.length} ${label} selec.`}
        </span>
      </button>
      {isOpen && (
        <>
          <div className="position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 999 }} onClick={() => setIsOpen(false)}></div>
          <div 
            className="dropdown-menu show w-100 p-2 shadow" 
            style={{ maxHeight: '250px', overflowY: 'auto', position: 'absolute', top: '100%', left: 0, zIndex: 1000 }}
          >
            <div className="d-flex justify-content-between mb-2 pb-2 border-bottom">
              <button className="btn btn-sm btn-link text-decoration-none p-0" onClick={() => onChange([])}>Limpiar</button>
              <button className="btn btn-sm btn-link text-decoration-none p-0 text-danger" onClick={() => setIsOpen(false)}>Cerrar</button>
            </div>
            {options.map(opt => (
              <div className="form-check d-flex align-items-center mb-2" key={opt}>
                <input 
                  className="form-check-input me-2 mt-0" 
                  type="checkbox" 
                  id={`check-${label}-${opt}`}
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                />
                <label className="form-check-label flex-grow-1 mb-0" htmlFor={`check-${label}-${opt}`} style={{ cursor: 'pointer' }} onClick={(e) => e.stopPropagation()}>
                  {opt}
                </label>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const ModalDetalles = ({ 
  isOpen, onClose, estudiantes = [], mesesAMostrar = [], obtenerEstadoPago,
  mesInicio, mesFin, setMesInicio, setMesFin, meses = [], generarPDF,
  filtroAnio = new Date().getFullYear()
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filasPorPagina, setFilasPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [filtroEstado, setFiltroEstado] = useState('');
  const [filtroNivel, setFiltroNivel] = useState([]);
  const [filtroBloque, setFiltroBloque] = useState('');
  const [filtroTurno, setFiltroTurno] = useState([]);
  // Nuevo filtro: estado de pago en el rango de meses
  const [filtroDeuda, setFiltroDeuda] = useState(''); // '' | 'con_deuda' | 'sin_deuda'

  // WhatsApp sender state
  const [showWaSender, setShowWaSender] = useState(false);
  const [waPdfBlob, setWaPdfBlob] = useState(null);
  const [waEstudiante, setWaEstudiante] = useState(null);
  const [waDefaultMsg, setWaDefaultMsg] = useState('');
  const [waFileName, setWaFileName] = useState('reporte.pdf');
  const [waPhone, setWaPhone] = useState('');

  // Bulk Sender state
  const [showWaBulkSender, setShowWaBulkSender] = useState(false);
  const [waBulkItems, setWaBulkItems] = useState([]);

  // Extraer valores únicos para los filtros desplegables
  const nivelesUnicos = useMemo(() => {
    if (!Array.isArray(estudiantes)) return [];
    return [...new Set(estudiantes.map(e => e?.nivel_nombre).filter(Boolean))].sort();
  }, [estudiantes]);

  const bloquesUnicos = useMemo(() => {
    if (!Array.isArray(estudiantes)) return [];
    return [...new Set(estudiantes.map(e => e?.bloque_nombre || e?.bloque).filter(Boolean))].sort();
  }, [estudiantes]);

  const turnosUnicos = useMemo(() => {
    if (!Array.isArray(estudiantes)) return [];
    return [...new Set(estudiantes.map(e => e?.turno).filter(Boolean))].sort();
  }, [estudiantes]);

  const estadosUnicos = useMemo(() => {
    if (!Array.isArray(estudiantes)) return [];
    return [...new Set(estudiantes.map(e => e?.estado_compromiso).filter(Boolean))].sort();
  }, [estudiantes]);

  // Helper: ¿tiene deuda en el rango visible?
  const tieneDeudaEnRango = useCallback((est) => {
    if (!Array.isArray(mesesAMostrar) || typeof obtenerEstadoPago !== 'function') return false;
    return mesesAMostrar.some(mes => {
      const ep = obtenerEstadoPago(est, mes);
      return ep && (ep.estado === 'Pendiente' || ep.estado === 'Parcial');
    });
  }, [mesesAMostrar, obtenerEstadoPago]);

  // Filtrado local en el modal
  const estudiantesFiltrados = useMemo(() => {
    if (!Array.isArray(estudiantes)) return [];
    return estudiantes.filter(est => {
      if (!est) return false;
      const termino = (busqueda || '').toLowerCase();
      const nombreMatches = est.nombre ? String(est.nombre).toLowerCase().includes(termino) : false;
      const ciMatches = est.ci_estudiante ? String(est.ci_estudiante).toLowerCase().includes(termino) : false;
      const matchesBusqueda = nombreMatches || ciMatches;
      
      const matchesEstado = filtroEstado ? est.estado_compromiso === filtroEstado : true;
      const matchesBloque = filtroBloque ? (est.bloque_nombre === filtroBloque || est.bloque === filtroBloque) : true;
      
      const matchesNivel = filtroNivel.length > 0 ? filtroNivel.includes(est.nivel_nombre) : true;
      const matchesTurno = filtroTurno.length > 0 ? filtroTurno.includes(est.turno) : true;

      let matchesDeuda = true;
      if (filtroDeuda === 'con_deuda') matchesDeuda = tieneDeudaEnRango(est);
      else if (filtroDeuda === 'sin_deuda') matchesDeuda = !tieneDeudaEnRango(est);
      
      return matchesBusqueda && matchesEstado && matchesNivel && matchesBloque && matchesTurno && matchesDeuda;
    });
  }, [estudiantes, busqueda, filtroEstado, filtroNivel, filtroBloque, filtroTurno, filtroDeuda, tieneDeudaEnRango]);

  // Paginación
  const totalPaginas = filasPorPagina === 'Todos' ? 1 : Math.ceil(estudiantesFiltrados.length / (filasPorPagina || 1));
  const datosPaginados = useMemo(() => {
    if (filasPorPagina === 'Todos') return estudiantesFiltrados;
    const limit = Number(filasPorPagina) || 10;
    const inicio = (paginaActual - 1) * limit;
    const fin = inicio + limit;
    return estudiantesFiltrados.slice(inicio, fin);
  }, [estudiantesFiltrados, paginaActual, filasPorPagina]);

  const handleCerrar = () => {
    setBusqueda('');
    setFiltroEstado('');
    setFiltroNivel('');
    setFiltroBloque('');
    setFiltroTurno('');
    setFiltroDeuda('');
    setPaginaActual(1);
    onClose();
  };

  // ===== GENERACIÓN DE PDF INDIVIDUAL PARA TUTOR =====
  const generarPDFTutor = (estudiante, soloMesesConDeuda = false) => {
    return new Promise((resolve) => {
      const doc = new jsPDF('portrait', 'mm', 'a4');
      const img = new window.Image();
      img.src = logo;

      const formatMoney = (n) => `Bs ${(Number(n || 0)).toFixed(2)}`;
      const formatFecha = (d) => {
        if (!d) return '—';
        try { return new Date(d).toLocaleDateString('es-BO', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
        catch { return '—'; }
      };

      const estadoCellColor = (estado) => {
        switch (estado) {
          case 'Pagado': case 'Beca Completa': return { fill: [25, 135, 84], text: [255, 255, 255] };
          case 'Parcial': return { fill: [255, 193, 7], text: [0, 0, 0] };
          case 'Pendiente': return { fill: [220, 53, 69], text: [255, 255, 255] };
          default: return { fill: [108, 117, 125], text: [255, 255, 255] };
        }
      };

      const buildDoc = () => {
        // Header azul
        doc.setFillColor(13, 110, 253);
        doc.rect(0, 0, 210, 20, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(13);
        doc.text('Unidad Educativa EMI — Reporte de Pagos', 12, 13);
        doc.setTextColor(0, 0, 0);

        // Datos del estudiante
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(estudiante.nombre || 'Estudiante', 12, 30);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.setTextColor(70, 70, 70);
        doc.text(`CI: ${estudiante.ci_estudiante || '—'}`, 12, 37);
        doc.text(`Nivel: ${estudiante.nivel_nombre || '—'}`, 12, 43);
        doc.text(`Gestión: ${filtroAnio} | Período: ${mesInicio} — ${mesFin}`, 12, 49);

        const saldo = estudiante.estado_compromiso === 'concluido' ? 0 : parseFloat(estudiante.saldo_pendiente || 0);
        doc.setTextColor(saldo > 0 ? 192 : 25, saldo > 0 ? 0 : 135, saldo > 0 ? 0 : 84);
        doc.setFont(undefined, 'bold');
        doc.text(`Total pagado: ${formatMoney(estudiante.total_pagado)}   Saldo pendiente: ${formatMoney(saldo)}`, 12, 55);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(0, 0, 0);

        // Obtener datos de meses
        let mesesParaTabla = mesesAMostrar;
        if (soloMesesConDeuda && typeof obtenerEstadoPago === 'function') {
          mesesParaTabla = mesesAMostrar.filter(mes => {
            const ep = obtenerEstadoPago(estudiante, mes);
            return ep && (ep.estado === 'Pendiente' || ep.estado === 'Parcial');
          });
        }

        const body = mesesParaTabla.map(mes => {
          const ep = typeof obtenerEstadoPago === 'function' ? (obtenerEstadoPago(estudiante, mes) || {}) : {};
          return [
            mes,
            ep.estado || '—',
            formatMoney(ep.montoEsperado),
            formatMoney(ep.montoPagado),
            formatMoney(ep.montoPendiente),
            formatFecha(ep.fechaVencimiento)
          ];
        });

        autoTable(doc, {
          startY: 62,
          head: [['Mes', 'Estado', 'Esperado', 'Pagado', 'Pendiente', 'Vence']],
          body,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 2.5, valign: 'middle' },
          headStyles: { fillColor: [33, 37, 41], textColor: 255, fontStyle: 'bold' },
          columnStyles: {
            0: { cellWidth: 30 },
            1: { cellWidth: 32, halign: 'center' },
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

        // Mensaje al pie
        const finalY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(`Generado el ${new Date().toLocaleDateString('es-BO')} — Este es un reporte de gestión de la Unidad Educativa EMI.`, 12, finalY);

        const blob = doc.output('blob');
        resolve(blob);
      };

      img.onload = buildDoc;
      img.onerror = buildDoc; // fallback sin logo
    });
  };

  // ===== ARMAR MENSAJE WHATSAPP PARA UN ESTUDIANTE =====
  const construirMensajeTutor = (estudiante) => {
    const mesesPendientes = typeof obtenerEstadoPago === 'function'
      ? mesesAMostrar.filter(mes => {
          const ep = obtenerEstadoPago(estudiante, mes);
          return ep && (ep.estado === 'Pendiente' || ep.estado === 'Parcial');
        })
      : [];

    const saldo = estudiante.estado_compromiso === 'concluido'
      ? 0
      : parseFloat(estudiante.saldo_pendiente || 0);

    if (mesesPendientes.length === 0) {
      return `Estimado tutor,\n\nLe informamos que el estudiante *${estudiante.nombre}* se encuentra al día con sus pagos del período *${mesInicio} – ${mesFin}* de la gestión *${filtroAnio}*.\n\n✅ No hay pendientes en este período.\n\n_Unidad Educativa EMI_`;
    }

    const listaMeses = mesesPendientes.map(mes => {
      const ep = obtenerEstadoPago(estudiante, mes);
      if (ep.estado === 'Parcial') {
        return `  • ${mes}: *Parcial* — Pendiente: Bs ${(ep.montoPendiente || 0).toFixed(2)}`;
      }
      return `  • ${mes}: *Pendiente* — Bs ${(ep.montoEsperado || 0).toFixed(2)}`;
    }).join('\n');

    return `Estimado tutor,\n\nLe comunicamos que el estudiante *${estudiante.nombre}* (Nivel: ${estudiante.nivel_nombre || '—'}) presenta los siguientes pagos pendientes para el período *${mesInicio} – ${mesFin}* — Gestión *${filtroAnio}*:\n\n${listaMeses}\n\n💰 *Saldo total pendiente: Bs ${saldo.toFixed(2)}*\n\nAdjuntamos el detalle en PDF. Para consultas o aclaraciones, por favor comuníquese con administración.\n\n_Unidad Educativa EMI_`;
  };

  // ===== ABRIR MODAL WHATSAPP PARA UN ESTUDIANTE =====
  const abrirWhatsAppTutor = async (estudiante, soloDeuda = true) => {
    const blob = await generarPDFTutor(estudiante, soloDeuda);
    const msg = construirMensajeTutor(estudiante);
    const nombreLimpio = (estudiante.nombre || 'estudiante').replace(/\s+/g, '_');
    
    // Tomar el primer número verificado de contacto_aviso, o hacer fallback a los teléfonos registrados
    const telefonosAviso = estudiante.telefonos_aviso ? estudiante.telefonos_aviso.split(',')[0].trim() : '';
    const telefono = telefonosAviso || 
                     estudiante.telefono_domicilio_madre || 
                     estudiante.telefono_oficina_madre || 
                     estudiante.telefono_domicilio_padre || 
                     estudiante.telefono_oficina_padre || '';
                     
    setWaPdfBlob(blob);
    setWaDefaultMsg(msg);
    setWaFileName(`Reporte_${nombreLimpio}_${filtroAnio}.pdf`);
    setWaEstudiante(estudiante);
    setWaPhone(telefono);
    setShowWaSender(true);
  };

  // ===== PREPARAR DATOS PARA EL BULK SENDER =====
  const prepararEnvioTutor = async (estudiante) => {
    const blob = await generarPDFTutor(estudiante, true);
    const msg = construirMensajeTutor(estudiante);
    const nombreLimpio = (estudiante.nombre || 'estudiante').replace(/\s+/g, '_');
    
    const telefonosAviso = estudiante.telefonos_aviso ? estudiante.telefonos_aviso.split(',')[0].trim() : '';
    const telefono = telefonosAviso || 
                     estudiante.telefono_domicilio_madre || 
                     estudiante.telefono_oficina_madre || 
                     estudiante.telefono_domicilio_padre || 
                     estudiante.telefono_oficina_padre || '';

    return {
      blob,
      fileName: `Reporte_${nombreLimpio}_${filtroAnio}.pdf`,
      message: msg,
      phoneNumber: telefono
    };
  };

  // ===== NOTIFICAR MASIVO (todos con deuda en la vista actual) =====
  const notificarMasivo = () => {
    const conDeuda = estudiantesFiltrados.filter(est => tieneDeudaEnRango(est));
    if (conDeuda.length === 0) {
      alert('No hay estudiantes con deuda en los filtros actuales.');
      return;
    }
    setWaBulkItems(conDeuda);
    setShowWaBulkSender(true);
  };

  if (!isOpen) return null;

  const conDeudaCount = estudiantesFiltrados.filter(est => tieneDeudaEnRango(est)).length;

  return (
    <>
      <div 
        className="bg-light position-fixed top-0 start-0 w-100 h-100" 
        style={{ zIndex: 1050, overflowY: 'auto' }}
      >
        <div className="d-flex flex-column min-vh-100 bg-white">
          {/* Header */}
      <div className="bg-primary text-white py-3 px-4 d-flex justify-content-between align-items-center mb-4">
              <h4 className="modal-title fw-bold">
                <i className="fas fa-list-alt me-2"></i>
                Detalles Completos de Pagos por Estudiante
              </h4>
              <div className="d-flex align-items-center gap-2">
                {/* Botón notificar masivo */}
                <button
                  type="button"
                  className="btn btn-warning fw-bold shadow-sm"
                  onClick={notificarMasivo}
                  title={`Enviar reporte WhatsApp a los ${conDeudaCount} tutores con deuda`}
                  disabled={conDeudaCount === 0}
                >
                  <i className="fab fa-whatsapp me-2"></i>
                  Notificar con deuda ({conDeudaCount})
                </button>
                {generarPDF && (
                  <button 
                    type="button" 
                    className="btn btn-danger shadow-sm fw-bold"
                    onClick={() => generarPDF(estudiantesFiltrados)}
                    title="Generar y descargar el archivo PDF con los filtros actuales"
                  >
                    <i className="fas fa-file-pdf me-2"></i>
                    Exportar PDF
                  </button>
                )}
                <button type="button" className="btn btn-light text-primary fw-bold ms-3" onClick={handleCerrar}>
                  <i className="fas fa-arrow-left me-2"></i> Volver
                </button>
              </div>
            </div>

            <div className="px-4">
              {/* Controles superiores: Meses y Paginación */}
              <div className="row m-0 g-3 mb-3 bg-white p-3 rounded shadow-sm align-items-center">
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <label className="me-2 fw-bold text-secondary mb-0">De:</label>
                    <select 
                      className="form-select form-select-sm shadow-sm"
                      value={mesInicio}
                      onChange={(e) => setMesInicio && setMesInicio(e.target.value)}
                    >
                      {meses.map(mes => <option key={mes} value={mes}>{mes}</option>)}
                    </select>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <label className="me-2 fw-bold text-secondary mb-0">Hasta:</label>
                    <select 
                      className="form-select form-select-sm shadow-sm"
                      value={mesFin}
                      onChange={(e) => setMesFin && setMesFin(e.target.value)}
                    >
                      {meses.map(mes => <option key={mes} value={mes}>{mes}</option>)}
                    </select>
                  </div>
                </div>
                {/* Filtro deuda */}
                <div className="col-md-3">
                  <div className="d-flex align-items-center">
                    <label className="me-2 fw-bold text-secondary mb-0 text-nowrap">Estado pago:</label>
                    <select
                      className="form-select form-select-sm shadow-sm"
                      value={filtroDeuda}
                      onChange={(e) => { setFiltroDeuda(e.target.value); setPaginaActual(1); }}
                    >
                      <option value="">Todos</option>
                      <option value="con_deuda">Con pendientes</option>
                      <option value="sin_deuda">Al día</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-3 text-end">
                  <div className="d-flex align-items-center h-100 justify-content-end">
                    <label className="me-3 fw-bold text-secondary mb-0 fs-5">Ver filas:</label>
                    <select
                      className="form-select form-select-lg w-auto shadow-sm"
                      value={filasPorPagina}
                      onChange={(e) => {
                        setFilasPorPagina(e.target.value === 'Todos' ? 'Todos' : Number(e.target.value));
                        setPaginaActual(1);
                      }}
                    >
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={50}>50</option>
                      <option value="Todos">Todos</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Filtros locales de Búsqueda */}
              <div className="row m-0 g-3 mb-4 bg-white p-3 rounded shadow-sm align-items-center">
                <div className="col-md-3">
                  <div className="input-group">
                    <span className="input-group-text bg-white border-end-0 text-primary"><i className="fas fa-search"></i></span>
                    <input
                      type="text"
                      className="form-control border-start-0 ps-0"
                      placeholder="Buscar por Nombre o CI..."
                      value={busqueda}
                      onChange={(e) => { setBusqueda(e.target.value); setPaginaActual(1); }}
                    />
                  </div>
                </div>
                
                <div className="col-md-2">
                  <select 
                    className="form-select shadow-sm"
                    value={filtroBloque}
                    onChange={(e) => { setFiltroBloque(e.target.value); setPaginaActual(1); }}
                  >
                    <option value="">Todos los Bloques</option>
                    {bloquesUnicos.map(bloque => (
                      <option key={bloque} value={bloque}>{bloque}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-2">
                  <MultiSelectDropdown 
                    options={nivelesUnicos}
                    selected={filtroNivel}
                    onChange={(vals) => { setFiltroNivel(vals); setPaginaActual(1); }}
                    label="Niveles"
                  />
                </div>

                <div className="col-md-2">
                  <MultiSelectDropdown 
                    options={turnosUnicos}
                    selected={filtroTurno}
                    onChange={(vals) => { setFiltroTurno(vals); setPaginaActual(1); }}
                    label="Turnos"
                  />
                </div>

                <div className="col-md-2">
                  <select 
                    className="form-select shadow-sm"
                    value={filtroEstado}
                    onChange={(e) => { setFiltroEstado(e.target.value); setPaginaActual(1); }}
                  >
                    <option value="">Todos los Estados</option>
                    {estadosUnicos.map(estado => (
                      <option key={estado} value={estado}>
                        {estado === 'activo' ? 'Activo' : 
                         estado === 'concluido' ? 'Concluido' : 
                         estado === 'cancelado' ? 'Cancelado' : 
                         estado === 'retirado' ? 'Retirado' : estado}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-md-1 text-end">
                  {filtroDeuda === 'con_deuda' && (
                    <span className="badge bg-danger fs-6" style={{ fontSize: '0.75rem' }}>{conDeudaCount} deuda</span>
                  )}
                </div>
              </div>

              {/* Tabla expandida */}
              <div className="card shadow border-0">
                <div className="table-responsive" style={{ maxHeight: 'none', overflowY: 'visible' }}>
                  <table className="table table-bordered table-hover align-middle mb-0" style={{ fontSize: '0.93rem' }}>
                    <thead className="bg-light sticky-top" style={{ zIndex: 1 }}>
                      <tr>
                        <th className="text-dark fw-bold py-3 bg-light text-center" style={{ minWidth: '120px' }}>
                          <i className="fab fa-whatsapp text-success me-1"></i>TUTOR
                        </th>
                        <th className="text-dark fw-bold py-3 bg-light" style={{ minWidth: '200px' }}>NOMBRE COMPLETO</th>
                        <th className="text-dark fw-bold py-3 bg-light">CI</th>
                        <th className="text-dark fw-bold py-3 bg-light">NIVEL</th>
                        <th className="text-dark fw-bold py-3 bg-light">ESTADO</th>
                        {mesesAMostrar.map(mes => (
                          <th key={mes} className="text-center text-dark fw-bold py-3 bg-light" style={{ minWidth: '120px' }}>
                            {mes ? mes.toUpperCase() : ''}
                          </th>
                        ))}
                        <th className="text-dark fw-bold py-3 bg-light text-end" style={{ minWidth: '130px' }}>TOTAL PAGADO</th>
                        <th className="text-dark fw-bold py-3 bg-light text-end" style={{ minWidth: '150px' }}>SALDO PENDIENTE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {datosPaginados.length === 0 ? (
                        <tr>
                          <td colSpan={mesesAMostrar.length + 6} className="text-center py-4 text-muted">
                            <i className="fas fa-info-circle me-2"></i>No hay registros para mostrar
                          </td>
                        </tr>
                      ) : (
                        datosPaginados.map(estudiante => {
                          const tieneDeuda = tieneDeudaEnRango(estudiante);
                          const saldoMostrar = estudiante.estado_compromiso === 'concluido' ? 0 : (Number(estudiante.saldo_pendiente) || 0);
                          return (
                            <tr key={`${estudiante.id}-${estudiante.compromiso_id}`}
                              style={{ background: tieneDeuda ? '#fff8f8' : 'white' }}
                            >
                              {/* Botón WhatsApp tutor */}
                              <td className="text-center">
                                <button
                                  className="btn btn-sm fw-bold"
                                  style={{
                                    background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
                                    color: 'white',
                                    borderRadius: '8px',
                                    fontSize: '0.75rem',
                                    padding: '4px 10px',
                                    whiteSpace: 'nowrap'
                                  }}
                                  onClick={() => abrirWhatsAppTutor(estudiante, true)}
                                  title="Enviar reporte de pagos al tutor por WhatsApp"
                                >
                                  <i className="fab fa-whatsapp me-1"></i>
                                  {tieneDeuda ? 'Notificar' : 'Enviar'}
                                </button>
                              </td>
                              <td className="fw-bold">
                                {tieneDeuda && <i className="fas fa-exclamation-circle text-danger me-1" title="Tiene pagos pendientes"></i>}
                                {estudiante.nombre}
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
                                let estadoPago = { color: 'secondary', estado: 'N/A', montoEsperado: 0 };
                                if (typeof obtenerEstadoPago === 'function') {
                                  try {
                                    estadoPago = obtenerEstadoPago(estudiante, mes) || estadoPago;
                                  } catch (e) {
                                    console.error(e);
                                  }
                                }
                                return (
                                  <td key={mes} className="text-center">
                                    <div className={`badge bg-${estadoPago.color} w-100 py-2`}>
                                      <div>{estadoPago.estado}</div>
                                      <small className="d-block mt-1">Bs {(Number(estadoPago.montoEsperado) || 0).toFixed(2)}</small>
                                    </div>
                                  </td>
                                );
                              })}
                              <td className="text-end fw-bold text-success align-middle fs-6" style={{ minWidth: '130px' }}>
                                Bs {(Number(estudiante.total_pagado) || 0).toFixed(2)}
                              </td>
                              <td className="text-end fw-bold align-middle fs-6" style={{ minWidth: '150px' }}>
                                <span className={`text-${saldoMostrar > 0 ? 'danger' : 'success'}`}>
                                  Bs {saldoMostrar.toFixed(2)}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Paginación Footer */}
            <div className="bg-white py-3 mt-3 border-top d-flex justify-content-between align-items-center">
              <span className="text-muted">
                Mostrando {datosPaginados.length} de {estudiantesFiltrados.length} registros
                {filtroDeuda === 'con_deuda' && <span className="badge bg-danger ms-2">{conDeudaCount} con deuda</span>}
              </span>
              {filasPorPagina !== 'Todos' && totalPaginas > 1 && (
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${paginaActual === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPaginaActual(p => Math.max(1, p - 1))}>Anterior</button>
                  </li>
                  {[...Array(totalPaginas)].map((_, idx) => (
                    <li key={idx} className={`page-item ${paginaActual === idx + 1 ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPaginaActual(idx + 1)}>{idx + 1}</button>
                    </li>
                  ))}
                  <li className={`page-item ${paginaActual === totalPaginas ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPaginaActual(p => Math.min(totalPaginas, p + 1))}>Siguiente</button>
                  </li>
                </ul>
              )}
              <div className="pe-2">
                <button type="button" className="btn btn-secondary" onClick={handleCerrar}>
                  <i className="fas fa-arrow-left me-2"></i> Volver
                </button>
              </div>
            </div>
        </div>
      </div>

      {/* Modal WhatsApp Sender */}
      {showWaSender && (
        <WhatsAppPDFSender
          isOpen={showWaSender}
          onClose={() => setShowWaSender(false)}
          pdfBlob={waPdfBlob}
          studentName={waEstudiante?.nombre || 'estudiante'}
          fileName={waFileName}
          defaultMessage={waDefaultMsg}
          initialPhoneNumber={waPhone}
        />
      )}

      {/* Modal WhatsApp Bulk Sender */}
      {showWaBulkSender && (
        <WhatsAppBulkSender
          isOpen={showWaBulkSender}
          onClose={() => setShowWaBulkSender(false)}
          items={waBulkItems}
          processItem={prepararEnvioTutor}
        />
      )}
    </>
  );
};

export default ModalDetalles;
