import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../../../styles/Reportes.css';
import AuthService from '../../../services/authService';
import ModoDispositivo from '../../../components/modoDispositivo';
import { getApiUrl } from '../../../config/apiConfig';

const LOGO_PDF_URL = '/dist/icono.jpg';
const COLOR_TURQUESA = [24, 170, 184];
const COLOR_GRIS = [120, 120, 124];
const COLOR_DORADO = [228, 176, 0];

const FORMA_PAGO_LABELS = {
  efectivo: { label: 'Efectivo', color: 'success', icon: 'fa-money-bill-wave' },
  qr: { label: 'QR', color: 'info', icon: 'fa-qrcode' },
  transferencia: { label: 'Transferencia', color: 'primary', icon: 'fa-exchange-alt' },
  otro: { label: 'Otro', color: 'secondary', icon: 'fa-ellipsis-h' },
};

const TIPO_PAGO_LABELS = {
  cuota: { label: 'Cuota', color: 'primary' },
  material: { label: 'Servicio', color: 'success' },
  ambos: { label: 'Cuota + Servicio', color: 'info' },
  servicio: { label: 'Servicio', color: 'success' }
};

function IngresosAcademicos() {
  const [ingresos, setIngresos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [periodoSeleccionado, setPeriodoSeleccionado] = useState('hoy'); // 'hoy', 'semana', 'mes', 'personalizado'
  const [total, setTotal] = useState(0);
  const [totalesPorForma, setTotalesPorForma] = useState({});
  const [formaPagoFiltro, setFormaPagoFiltro] = useState('todos');
  const [tipoPagoFiltro, setTipoPagoFiltro] = useState('todos');
  const [filasPorPagina, setFilasPorPagina] = useState(10);
  const [paginaActual, setPaginaActual] = useState(1);
  const [loading, setLoading] = useState(false);

  // Estados para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  // Función para calcular fechas según el período
  const calcularFechas = (periodo) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    switch (periodo) {
      case 'hoy':
        const hoyStr = hoy.toISOString().split('T')[0];
        return { inicio: hoyStr, fin: hoyStr };
      
      case 'semana':
        const inicioSemana = new Date(hoy);
        inicioSemana.setDate(hoy.getDate() - hoy.getDay()); // Lunes de esta semana
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(inicioSemana.getDate() + 6); // Domingo
        return {
          inicio: inicioSemana.toISOString().split('T')[0],
          fin: finSemana.toISOString().split('T')[0]
        };
      
      case 'mes':
        const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
        return {
          inicio: inicioMes.toISOString().split('T')[0],
          fin: finMes.toISOString().split('T')[0]
        };
      
      case 'personalizado':
        return { inicio: fechaInicio, fin: fechaFin };
      
      default:
        return { inicio: '', fin: '' };
    }
  };

  const fetchIngresos = async (periodo = periodoSeleccionado) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }
      
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const fechas = calcularFechas(periodo);
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ingresos-academicos', user?.rol);
      // Construir URL correctamente
      let url = `${apiUrl}/ingresos-academicos`;
      
      if (fechas.inicio && fechas.fin) {
        url += `?fechaInicio=${fechas.inicio}&fechaFin=${fechas.fin}`;
        // Actualizar campos de fecha si es personalizado
        if (periodo === 'personalizado') {
          setFechaInicio(fechas.inicio);
          setFechaFin(fechas.fin);
        }
      }
      
      console.log('🔍 Consultando ingresos académicos:', url);
      
      const res = await fetch(url, { headers });
      
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('El endpoint de ingresos académicos no está disponible');
        }
        const errorData = await res.text();
        throw new Error(`Error ${res.status}: ${errorData}`);
      }
      
      const data = await res.json();
      
      if (!data || typeof data !== 'object') {
        throw new Error('Respuesta inválida del servidor');
      }
      
      setIngresos(data.ingresos || []);
      setTotal(data.total || 0);
      setTotalesPorForma(data.totalesPorForma || {});
      
      console.log(`✅ Ingresos cargados: ${data.ingresos?.length || 0} registros, Total: ${data.total || 0} Bs`);
    } catch (error) {
      console.error('❌ Error al cargar ingresos académicos:', error);
      setIngresos([]);
      setTotal(0);
      setTotalesPorForma({});
      // Mostrar mensaje de error al usuario
      alert(`Error al cargar ingresos: ${error.message}`);
    }
    setLoading(false);
  };

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);
    
    // Cargar ingresos de hoy por defecto
    fetchIngresos('hoy');
    // eslint-disable-next-line
  }, []);

  const handlePeriodoChange = (periodo) => {
    setPeriodoSeleccionado(periodo);
    if (periodo === 'personalizado') {
      // Si cambia a personalizado, no hacer fetch hasta que seleccione fechas
      return;
    }
    fetchIngresos(periodo);
  };

  const handleFiltrar = (e) => {
    e.preventDefault();
    if (periodoSeleccionado === 'personalizado' && fechaInicio && fechaFin) {
      fetchIngresos('personalizado');
    }
  };

  // Filtrar ingresos por forma de pago y tipo de pago
  const ingresosFiltrados = ingresos.filter(ing => {
    const cumpleFormaPago = formaPagoFiltro === 'todos' ||
      (ing.forma_pago || 'otro').toLowerCase() === formaPagoFiltro;
    const tipo = (ing.tipo_pago || 'cuota').toLowerCase();
    let cumpleTipoPago = tipoPagoFiltro === 'todos';
    if (!cumpleTipoPago) {
      if (tipoPagoFiltro === 'extras') {
        cumpleTipoPago = tipo === 'material' || tipo === 'servicio';
      } else {
        cumpleTipoPago = tipo === tipoPagoFiltro;
      }
    }
    return cumpleFormaPago && cumpleTipoPago;
  });

  /** Totales y suma según filtros (misma base que la tabla y el PDF exportado) */
  const totalesFiltradosPorForma = { efectivo: 0, qr: 0, transferencia: 0, otro: 0 };
  ingresosFiltrados.forEach((ing) => {
    const raw = (ing.forma_pago || 'otro').toLowerCase();
    const key = ['efectivo', 'qr', 'transferencia', 'otro'].includes(raw) ? raw : 'otro';
    totalesFiltradosPorForma[key] += parseFloat(ing.monto || 0);
  });
  const totalFiltradoMonto = ingresosFiltrados.reduce((s, ing) => s + parseFloat(ing.monto || 0), 0);
  const sumaMontosFiltradosParaPct = totalFiltradoMonto > 0 ? totalFiltradoMonto : 1;

  const formatearBs = (valor) =>
    Number(valor || 0).toLocaleString('es-BO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

  const convertirImagenADataUrl = (src) =>
    new Promise((resolve) => {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch {
            resolve(null);
          }
        };
        img.onerror = () => resolve(null);
        img.src = src;
      } catch {
        resolve(null);
      }
    });

  const aplicarMarcaDeAgua = (doc, logoDataUrl) => {
    if (!logoDataUrl) return;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const size = 95;
    try {
      if (doc.GState) {
        doc.setGState(new doc.GState({ opacity: 0.08 }));
      }
      doc.addImage(
        logoDataUrl,
        'PNG',
        (pageWidth - size) / 2,
        (pageHeight - size) / 2,
        size,
        size,
        undefined,
        'FAST'
      );
      if (doc.GState) {
        doc.setGState(new doc.GState({ opacity: 1 }));
      }
    } catch {
      // Si no soporta transparencia, continuar sin interrumpir exportación.
    }
  };

  // Exportar a PDF
  const exportarPDF = async () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    const fechas = calcularFechas(periodoSeleccionado);
    let periodoTexto = '';
    if (periodoSeleccionado === 'hoy') {
      periodoTexto = `Hoy: ${new Date().toLocaleDateString('es-BO')}`;
    } else if (periodoSeleccionado === 'semana') {
      periodoTexto = `Semana: ${new Date(fechas.inicio).toLocaleDateString('es-BO')} - ${new Date(fechas.fin).toLocaleDateString('es-BO')}`;
    } else if (periodoSeleccionado === 'mes') {
      periodoTexto = `Mes: ${new Date(fechas.inicio).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })}`;
    } else {
      periodoTexto = `Período: ${new Date(fechas.inicio).toLocaleDateString('es-BO')} - ${new Date(fechas.fin).toLocaleDateString('es-BO')}`;
    }

    const fechaGeneracion = new Date().toLocaleString('es-BO');
    const logoDataUrl = await convertirImagenADataUrl(LOGO_PDF_URL);
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const dibujarCabecera = () => {
      doc.setFillColor(...COLOR_TURQUESA);
      doc.rect(0, 0, pageWidth, 26, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.text('Reporte de Ingresos Académicos', 14, 12);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      doc.text(`Período: ${periodoTexto}`, 14, 18);
      doc.text(`Generado: ${fechaGeneracion}`, 14, 23);

      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', pageWidth - 28, 4, 20, 20, undefined, 'FAST');
      }

      doc.setTextColor(...COLOR_GRIS);
      doc.setFont('helvetica', 'normal');
    };

    const dibujarPie = () => {
      const numero = doc.internal.getNumberOfPages();
      doc.setFontSize(8.5);
      doc.setTextColor(120, 120, 120);
      doc.text('Unidad Educativa EMI - Reporte financiero académico', 14, pageHeight - 6);
      doc.text(`Página ${numero}`, pageWidth - 28, pageHeight - 6);
      doc.setTextColor(40, 40, 40);
    };

    dibujarCabecera();
    aplicarMarcaDeAgua(doc, logoDataUrl);

    const etiquetaFormaFiltro =
      formaPagoFiltro === 'todos'
        ? 'Todas'
        : FORMA_PAGO_LABELS[formaPagoFiltro]?.label || formaPagoFiltro;
    const etiquetaTipoFiltro =
      tipoPagoFiltro === 'todos'
        ? 'Todos'
        : tipoPagoFiltro === 'extras'
          ? 'Servicio'
          : tipoPagoFiltro === 'ambos'
            ? 'Cuota + Servicio'
            : 'Cuota';

    let y = 34;
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(248, 248, 248);
    doc.roundedRect(12, y - 3, pageWidth - 24, 42, 2.5, 2.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...COLOR_TURQUESA);
    doc.text('Resumen (según filtros de la tabla)', 16, y + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      `Forma de pago: ${etiquetaFormaFiltro}  ·  Tipo: ${etiquetaTipoFiltro}  ·  Registros: ${ingresosFiltrados.length}`,
      16,
      y + 8
    );
    doc.setFontSize(10);
    doc.setTextColor(...COLOR_GRIS);
    doc.text(`Efectivo: ${formatearBs(totalesFiltradosPorForma.efectivo)} Bs`, 16, y + 16);
    doc.text(`QR: ${formatearBs(totalesFiltradosPorForma.qr)} Bs`, 16, y + 22);
    doc.text(`Transferencia: ${formatearBs(totalesFiltradosPorForma.transferencia)} Bs`, 16, y + 28);
    doc.text(`Otro: ${formatearBs(totalesFiltradosPorForma.otro)} Bs`, 16, y + 34);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...COLOR_DORADO);
    doc.text(`Total: ${formatearBs(totalFiltradoMonto)} Bs`, pageWidth - 90, y + 24);
    doc.setTextColor(...COLOR_GRIS);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    y += 46;

    // Tabla de ingresos
    autoTable(doc, {
      startY: y,
      head: [[
        'Fecha',
        'Estudiante',
        'Tipo',
        'Monto (Bs)',
        'Forma de pago',
        'Mes/Año',
        'Detalle',
      ]],
      body: ingresosFiltrados.map(ing => [
        ing.fecha ? new Date(ing.fecha).toLocaleDateString('es-BO') : '-',
        ing.estudiante_nombre || 'Sin asignar',
        TIPO_PAGO_LABELS[(ing.tipo_pago || 'cuota').toLowerCase()]?.label || 'Cuota',
        formatearBs(ing.monto),
        FORMA_PAGO_LABELS[(ing.forma_pago || 'otro').toLowerCase()]?.label || 'Otro',
        (ing.tipo_pago || '').toLowerCase() === 'servicio'
          ? (ing.servicio_nombre || '-')
          : (ing.mes && ing.anio ? `${ing.mes}/${ing.anio}` : '-'),
        ing.detalle || '-'
      ]),
      styles: {
        fontSize: 9.5,
        cellPadding: 2.5
      },
      headStyles: {
        fillColor: COLOR_TURQUESA,
        textColor: 255,
        fontStyle: 'bold',
        halign: 'center'
      },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 44 },
        2: { cellWidth: 24, halign: 'center' },
        3: { cellWidth: 22, halign: 'right' },
        4: { cellWidth: 28, halign: 'center' },
        5: { cellWidth: 22, halign: 'center' },
        6: { cellWidth: 30 }
      },
      margin: { left: 12, right: 12, bottom: 12 },
      rowPageBreak: 'avoid',
      didDrawPage: () => {
        dibujarCabecera();
        aplicarMarcaDeAgua(doc, logoDataUrl);
        dibujarPie();
      }
    });

    dibujarPie();
    doc.save(`ingresos_academicos_${periodoSeleccionado}_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Función para manejar navegación móvil
  const handleMobileNavigate = (path) => {
    setShowMobileMenu(false);
    navigate(path);
  };

  const handleLogout = () => {
    AuthService.logout();
    navigate('/login');
  };

  const fechas = calcularFechas(periodoSeleccionado);
  const periodoTexto = periodoSeleccionado === 'hoy' 
    ? 'Hoy' 
    : periodoSeleccionado === 'semana'
    ? `Esta Semana (${new Date(fechas.inicio).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })} - ${new Date(fechas.fin).toLocaleDateString('es-BO', { day: 'numeric', month: 'short' })})`
    : periodoSeleccionado === 'mes'
    ? `Este Mes (${new Date(fechas.inicio).toLocaleDateString('es-BO', { month: 'long', year: 'numeric' })})`
    : `Personalizado (${fechaInicio && fechaFin ? `${new Date(fechaInicio).toLocaleDateString('es-BO')} - ${new Date(fechaFin).toLocaleDateString('es-BO')}` : 'Seleccione fechas'})`;

  const rolUsuario = AuthService.getUser()?.rol || userInfo?.rol || '';
  const esAdministrador = rolUsuario === 'Administrador';
  const esCajero = rolUsuario === 'Cajero';
  const totalPaginas = Math.max(1, Math.ceil(ingresosFiltrados.length / filasPorPagina));
  const indiceInicio = (paginaActual - 1) * filasPorPagina;
  const ingresosPaginados = ingresosFiltrados.slice(indiceInicio, indiceInicio + filasPorPagina);

  useEffect(() => {
    setPaginaActual(1);
  }, [formaPagoFiltro, tipoPagoFiltro, periodoSeleccionado, ingresos.length, filasPorPagina]);

  useEffect(() => {
    if (paginaActual > totalPaginas) {
      setPaginaActual(totalPaginas);
    }
  }, [paginaActual, totalPaginas]);

  /** Resumen compacto por forma de pago (solo UI admin, una columna) */
  const PanelResumenFormasPagoAdmin = () => (
    <div className="card border-0 shadow-sm h-100" style={{ borderRadius: '12px', borderLeft: '4px solid #0d6efd' }}>
      <div className="card-header py-2 px-3 bg-light border-0">
        <h6 className="mb-0 text-muted text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.04em' }}>
          <i className="fas fa-wallet me-1 text-primary"></i>
          Por forma de pago
        </h6>
      </div>
      <div className="card-body py-2 px-3">
        <ul className="list-unstyled mb-0 small">
          {Object.keys(FORMA_PAGO_LABELS).map((key) => {
            const monto = Number(totalesFiltradosPorForma[key] || 0);
            const pct =
              ingresosFiltrados.length > 0 ? ((monto / sumaMontosFiltradosParaPct) * 100).toFixed(1) : '0.0';
            const meta = FORMA_PAGO_LABELS[key];
            return (
              <li
                key={key}
                className="d-flex justify-content-between align-items-baseline py-1 border-bottom border-light"
                style={{ fontSize: '0.8rem' }}
              >
                <span className={`text-${meta.color} fw-semibold`}>
                  <i className={`fas ${meta.icon} me-1`} style={{ width: '1em' }}></i>
                  {meta.label}
                </span>
                <span className="text-end text-nowrap ms-2">
                  <span className="fw-bold">{monto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-muted" style={{ fontSize: '0.68rem' }}> Bs</span>
                  <span className="text-muted d-block" style={{ fontSize: '0.65rem' }}>{pct}%</span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-2 pt-2 border-top">
          <div className="d-flex justify-content-between align-items-center" style={{ fontSize: '0.82rem' }}>
            <span className="text-muted">Total período</span>
            <span className="fw-bold text-success">
              {totalFiltradoMonto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
            </span>
          </div>
          <div className="text-muted mt-1" style={{ fontSize: '0.68rem' }}>
            {ingresosFiltrados.length} registro{ingresosFiltrados.length !== 1 ? 's' : ''} en tabla
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container-fluid py-3" style={{ background: esAdministrador ? 'linear-gradient(160deg, #e8eef5 0%, #dce8f3 45%, #cfd9e8 100%)' : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      {/* Header mejorado */}
      <div className={`row ${esCajero ? 'mb-3' : 'mb-4'}`}>
        <div className="col-12">
          <div 
            className="card border-0 shadow-lg text-white"
            style={{
              background: esAdministrador
                ? 'linear-gradient(135deg, #0f4c75 0%, #1b6ca8 45%, #3282b8 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: '15px'
            }}
          >
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="mb-2 fw-bold">
                    <i className="fas fa-university me-3"></i>
                    Ingresos Académicos
                    {esAdministrador && (
                      <span className="badge bg-light text-primary ms-2 align-middle" style={{ fontSize: '0.55em', verticalAlign: 'middle' }}>
                        Administración
                      </span>
                    )}
                  </h2>
                  <p className="mb-0 opacity-90">
                    <i className="fas fa-calendar-alt me-2"></i>
                    Período: <strong>{periodoTexto}</strong>
                  </p>
                </div>
        <button 
                  className="btn btn-outline-light d-md-none"
          onClick={() => setShowMobileMenu(true)}
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
            </div>
          </div>
        </div>
      </div>

      {/* Botones de período rápido */}
      <div className={`row ${esCajero ? 'mb-3' : 'mb-4'}`}>
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <label className="form-label fw-bold mb-3">
                <i className="fas fa-clock me-2 text-primary"></i>
                Seleccionar Período
              </label>
              <div className="btn-group w-100 mb-3" role="group">
                <button
                  type="button"
                  className={`btn ${periodoSeleccionado === 'hoy' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handlePeriodoChange('hoy')}
                  disabled={loading}
                >
                  <i className="fas fa-calendar-day me-2"></i>
                  Hoy
                </button>
                <button
                  type="button"
                  className={`btn ${periodoSeleccionado === 'semana' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handlePeriodoChange('semana')}
                  disabled={loading}
                >
                  <i className="fas fa-calendar-week me-2"></i>
                  Esta Semana
                </button>
                <button
                  type="button"
                  className={`btn ${periodoSeleccionado === 'mes' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handlePeriodoChange('mes')}
                  disabled={loading}
                >
                  <i className="fas fa-calendar-alt me-2"></i>
                  Este Mes
                </button>
                <button
                  type="button"
                  className={`btn ${periodoSeleccionado === 'personalizado' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => handlePeriodoChange('personalizado')}
                  disabled={loading}
                >
                  <i className="fas fa-calendar me-2"></i>
                  Personalizado
                </button>
              </div>

              {/* Campos de fecha para período personalizado */}
              {periodoSeleccionado === 'personalizado' && (
                <form className="row g-3" onSubmit={handleFiltrar}>
                  <div className="col-md-4">
                    <label className="form-label">Fecha inicio</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={fechaInicio} 
                      onChange={e => setFechaInicio(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4">
          <label className="form-label">Fecha fin</label>
                    <input 
                      type="date" 
                      className="form-control" 
                      value={fechaFin} 
                      onChange={e => setFechaFin(e.target.value)}
                      required
                    />
                  </div>
                  <div className="col-md-4 d-flex align-items-end">
                    <button className="btn btn-primary w-100" type="submit" disabled={loading || !fechaInicio || !fechaFin}>
                      {loading ? 'Filtrando...' : 'Aplicar Fechas'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filtros y acciones */}
      <div className={`row ${esCajero ? 'mb-3' : 'mb-4'}`}>
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className={`card-body ${esCajero ? 'py-2' : ''}`}>
              <div className="row g-3 align-items-end">
                <div className="col-md-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-filter me-2 text-primary"></i>
                    Forma de pago
                  </label>
                  <select 
                    className="form-select" 
                    value={formaPagoFiltro} 
                    onChange={e => setFormaPagoFiltro(e.target.value)}
                  >
                    <option value="todos">Todas</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="qr">QR</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <label className="form-label fw-bold">
                    <i className="fas fa-tags me-2 text-primary"></i>
                    Tipo de pago
                  </label>
                  <select 
                    className="form-select" 
                    value={tipoPagoFiltro} 
                    onChange={e => setTipoPagoFiltro(e.target.value)}
                  >
                    <option value="todos">Todos</option>
                    <option value="cuota">Cuota</option>
                    <option value="extras">Servicio</option>
                    <option value="ambos">Cuota + Servicio</option>
                  </select>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-primary w-100" 
                    onClick={() => fetchIngresos(periodoSeleccionado)}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2"></i>
                    {loading ? 'Cargando...' : 'Actualizar'}
                  </button>
                </div>
                <div className="col-md-3">
                  <button 
                    className="btn btn-danger w-100" 
                    onClick={exportarPDF} 
                    disabled={loading || ingresosFiltrados.length === 0}
                  >
                    <i className="fas fa-file-pdf me-2"></i>
                    Exportar PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {!esAdministrador && (
        <>
          {/* Tarjetas de totales por forma de pago (Director / otros roles) */}
          <div className="row g-3 mb-4">
            {Object.keys(FORMA_PAGO_LABELS).map((key) => {
              const totalForma = totalesFiltradosPorForma[key] || 0;
              const porcentaje =
                ingresosFiltrados.length > 0
                  ? ((totalForma / sumaMontosFiltradosParaPct) * 100).toFixed(1)
                  : 0;
              return (
                <div className="col-lg-3 col-md-6" key={key}>
                  <div className={`card border-0 shadow-sm h-100 border-start border-4 border-${FORMA_PAGO_LABELS[key].color}`}>
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <p className="text-muted mb-1 small text-uppercase fw-bold">
                            {FORMA_PAGO_LABELS[key].label}
                          </p>
                          <h4 className="mb-0 fw-bold">
                            {totalForma.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                          </h4>
                          <small className="text-muted">{porcentaje}% del total</small>
                        </div>
                        <div className={`bg-${FORMA_PAGO_LABELS[key].color} bg-opacity-10 rounded-circle p-3`}>
                          <i className={`fas ${FORMA_PAGO_LABELS[key].icon} fa-2x text-${FORMA_PAGO_LABELS[key].color}`}></i>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total acumulado destacado */}
          <div className="row mb-4">
            <div className="col-12">
              <div
                className="card border-0 shadow-lg text-white"
                style={{
                  background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
                  borderRadius: '15px'
                }}
              >
                <div className="card-body p-4">
                  <div className="row align-items-center">
                    <div className="col-md-8">
                      <h5 className="mb-1">
                        <i className="fas fa-coins me-2"></i>
                        Total Acumulado
                      </h5>
                      <p className="mb-0 opacity-90">Ingresos del período seleccionado</p>
                    </div>
                    <div className="col-md-4 text-end">
                      <h2 className="mb-0 fw-bold">
                        {totalFiltradoMonto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                      </h2>
                      <small className="opacity-75">
                        {ingresosFiltrados.length} registro{ingresosFiltrados.length !== 1 ? 's' : ''}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tabla de ingresos: admin con resumen lateral compacto a la derecha; director vista ancha */}
      <div className={`row ${esAdministrador ? 'g-3' : ''}`}>
        <div className={esAdministrador ? 'col-12 col-lg-9' : 'col-12'}>
          {esAdministrador && (
            <div className="card border-0 shadow-sm mb-3 py-2 px-3 d-flex flex-row flex-wrap align-items-center justify-content-between gap-2" style={{ borderRadius: '10px', borderLeft: '4px solid #20c997' }}>
              <span className="small text-muted mb-0">
                <i className="fas fa-coins me-1 text-success"></i>
                {formaPagoFiltro === 'todos' && tipoPagoFiltro === 'todos'
                  ? 'Total del período (todos los medios y tipos)'
                  : 'Total según filtros aplicados'}
              </span>
              <strong className="text-success fs-5 mb-0">
                {totalFiltradoMonto.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
              </strong>
            </div>
          )}
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-white border-0 py-3">
              <h5 className="mb-0">
                <i className="fas fa-list me-2 text-primary"></i>
                Detalle de Ingresos
              </h5>
            </div>
            <div className={`card-body ${esCajero ? 'py-2' : ''}`}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="text-muted mt-3">Cargando ingresos...</p>
                </div>
              ) : ingresosFiltrados.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No hay ingresos registrados para el período seleccionado</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <div className="d-flex flex-wrap justify-content-between align-items-center mb-2 gap-2">
                    <small className="text-muted">
                      Mostrando {ingresosPaginados.length} de {ingresosFiltrados.length} registros
                    </small>
                    <div className="d-flex align-items-center gap-2">
                      <label className="small text-muted mb-0">Filas:</label>
                      <select
                        className="form-select form-select-sm"
                        style={{ width: '88px' }}
                        value={filasPorPagina}
                        onChange={(e) => setFilasPorPagina(parseInt(e.target.value, 10))}
                      >
                        <option value={10}>10</option>
                        <option value={15}>15</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </div>
                  </div>
                  <table className={`table table-hover align-middle${esAdministrador ? ' table-sm' : ''}`}>
                    <thead className="table-light">
                      <tr>
                        <th>Fecha</th>
                        <th>Estudiante</th>
                        <th>Tipo</th>
                        <th>Monto (Bs)</th>
                        <th>Forma de pago</th>
                        <th>Mes/Año</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingresosPaginados.map((ing, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{ing.fecha ? new Date(ing.fecha).toLocaleDateString('es-BO') : '-'}</strong>
                          </td>
                          <td>
                            <div>
                              <strong>{ing.estudiante_nombre || 'Sin asignar'}</strong>
                              {ing.ci_estudiante && (
                                <>
                                  <br />
                                  <small className="text-muted">CI: {ing.ci_estudiante}</small>
                                </>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className={`badge bg-${TIPO_PAGO_LABELS[(ing.tipo_pago || 'cuota').toLowerCase()]?.color || 'secondary'}`}>
                              {TIPO_PAGO_LABELS[(ing.tipo_pago || 'cuota').toLowerCase()]?.label || 'Cuota'}
                            </span>
                          </td>
                          <td>
                            <strong className="text-success">
                              {parseFloat(ing.monto || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                            </strong>
                          </td>
                          <td>
                            <span className={`badge bg-${FORMA_PAGO_LABELS[(ing.forma_pago || 'otro').toLowerCase()]?.color || 'secondary'}`}>
                              <i className={`fas ${FORMA_PAGO_LABELS[(ing.forma_pago || 'otro').toLowerCase()]?.icon} me-1`}></i>
                              {FORMA_PAGO_LABELS[(ing.forma_pago || 'otro').toLowerCase()]?.label || 'Otro'}
                            </span>
                          </td>
                          <td>
                            {(ing.tipo_pago || '').toLowerCase() === 'servicio'
                              ? ing.servicio_nombre || '-'
                              : ing.mes && ing.anio
                                ? `${ing.mes}/${ing.anio}`
                                : '-'}
                          </td>
                          <td>
                            <small className="text-muted">{ing.detalle || '-'}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="d-flex flex-wrap justify-content-between align-items-center mt-2 gap-2">
                    <small className="text-muted">
                      Página {paginaActual} de {totalPaginas}
                    </small>
                    <div className="btn-group btn-group-sm" role="group" aria-label="Paginación de ingresos">
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                        disabled={paginaActual === 1}
                      >
                        <i className="fas fa-chevron-left me-1"></i>
                        Anterior
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                        disabled={paginaActual === totalPaginas}
                      >
                        Siguiente
                        <i className="fas fa-chevron-right ms-1"></i>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {esAdministrador && (
          <div className="col-12 col-lg-3">
            <div className="sticky-lg-top" style={{ top: '0.75rem' }}>
              <PanelResumenFormasPagoAdmin />
            </div>
          </div>
        )}
      </div>

      {/* Componente ModoDispositivo */}
      <ModoDispositivo 
        isOpen={showMobileMenu}
        onClose={() => setShowMobileMenu(false)}
        onNavigate={handleMobileNavigate}
        onLogout={handleLogout}
        user={userInfo}
      />
    </div>
  );
}

export default IngresosAcademicos;
