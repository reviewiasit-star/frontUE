import React, { useEffect, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import logo from '../../../assets/img/logo.jpg';
import { getApiUrl } from '../../../config/apiConfig';
import AuthService from '../../../services/authService';

const MESES_NOMBRES = {
  1: 'Enero', 2: 'Febrero', 3: 'Marzo', 4: 'Abril', 5: 'Mayo', 6: 'Junio',
  7: 'Julio', 8: 'Agosto', 9: 'Septiembre', 10: 'Octubre', 11: 'Noviembre', 12: 'Diciembre'
};

function AdquisicionServicios() {
  const [q, setQ] = useState('');
  const [estudiantes, setEstudiantes] = useState([]); // sugerencias (filtradas)
  const [estudiante, setEstudiante] = useState(null);
  const [servicios, setServicios] = useState([]);
  const [adquisiciones, setAdquisiciones] = useState([]);
  const [form, setForm] = useState({ servicio_id: '', anio: new Date().getFullYear(), monto_mensual: '' });
  const [mesesSeleccionados, setMesesSeleccionados] = useState([]); // números 1-12
  const [estudiantesBasicos, setEstudiantesBasicos] = useState([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [showRegistrarModal, setShowRegistrarModal] = useState(false);
  const [showResumenRegistroModal, setShowResumenRegistroModal] = useState(false);
  const [resumenRegistro, setResumenRegistro] = useState(null);
  const [showConfirmEliminarTodos, setShowConfirmEliminarTodos] = useState(false);
  const [eliminandoTodos, setEliminandoTodos] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [showConfirmPagoModal, setShowConfirmPagoModal] = useState(false);
  const [showPagoExitosoModal, setShowPagoExitosoModal] = useState(false);
  const [resumenPagoExitoso, setResumenPagoExitoso] = useState(null);
  const [payContext, setPayContext] = useState({ item: null, itemsGrupo: [] });
  const [payForm, setPayForm] = useState({ forma_pago: 'efectivo', numero_comprobante: '', nit_ci: '', fecha_pago: new Date().toISOString().split('T')[0], pagar_todos: false });
  const [pagando, setPagando] = useState(false);

  // Función para generar PDF del pago de servicio
  const generarPDFPagoServicio = (pagoData, servicioItem, estudianteData) => {
    const doc = new jsPDF();
    const img = new window.Image();
    img.src = logo;
    img.onload = function() {
      // Logo centrado arriba
      doc.addImage(img, 'JPEG', 80, 5, 50, 20);
      
      // Título
      doc.setFontSize(16);
      doc.text('Comprobante de Pago de Servicio', 105, 32, { align: 'center' });
      
      // Información del comprobante
      doc.setFontSize(11);
      doc.text(`Fecha de emisión: ${new Date().toLocaleDateString('es-BO')}`, 14, 40);
      doc.text(`Fecha de pago: ${pagoData.fecha_pago ? new Date(pagoData.fecha_pago).toLocaleDateString('es-BO') : new Date().toLocaleDateString('es-BO')}`, 14, 47);
      
      // Información del estudiante
      doc.text(`Estudiante: ${estudianteData.nombre} ${estudianteData.apellido_paterno || ''} ${estudianteData.apellido_materno || ''}`.trim(), 14, 54);
      doc.text(`CI: ${estudianteData.ci_estudiante || 'No especificado'}`, 14, 61);
      
      // Información del servicio
      doc.setFontSize(12);
      doc.text('Detalle del Servicio:', 14, 70);
      doc.setFontSize(11);
      doc.text(`Servicio: ${servicioItem.servicio_descripcion || 'No especificado'}`, 14, 77);
      doc.text(`Mes: ${MESES_NOMBRES[servicioItem.mes_inicio] || servicioItem.mes_inicio}`, 14, 84);
      doc.text(`Año: ${servicioItem.anio || new Date().getFullYear()}`, 14, 91);
      
      // Información del pago
      doc.setFontSize(10);
      doc.text(`N° Comprobante: ${pagoData.numero_comprobante || 'No especificado'}`, 14, 98);
      doc.text(`CI del pagador: ${pagoData.nit_ci || 'No especificado'}`, 120, 98);
      doc.text(`Forma de pago: ${pagoData.forma_pago ? pagoData.forma_pago.toUpperCase() : 'EFECTIVO'}`, 14, 105);
      
      // Monto
      doc.setFontSize(13);
      doc.text('Resumen de la transacción', 14, 115);
      doc.setFontSize(11);
      
      // Tabla de resumen
      autoTable(doc, {
        startY: 120,
        head: [['Concepto', 'Detalle', 'Monto (Bs)']],
        body: [[
          'Pago de Servicio',
          `${servicioItem.servicio_descripcion || 'Servicio'} - ${MESES_NOMBRES[servicioItem.mes_inicio] || servicioItem.mes_inicio} ${servicioItem.anio || new Date().getFullYear()}`,
          `Bs ${Number(servicioItem.monto_mensual || 0).toFixed(2)}`
        ]],
        theme: 'grid',
        styles: { fontSize: 11 },
        headStyles: { fillColor: [28, 167, 69] },
        columnStyles: {
          0: { cellWidth: 50 },
          1: { cellWidth: 100 },
          2: { cellWidth: 40, halign: 'right' }
        }
      });
      
      // Total
      const totalY = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(`Total: Bs ${Number(servicioItem.monto_mensual || 0).toFixed(2)}`, 150, totalY, { align: 'right' });
      doc.setFont(undefined, 'normal');
      
      // Sección de firmas
      const firmasY = totalY + 20;
      doc.setFontSize(12);
      doc.text('Firmas:', 14, firmasY);
      
      // Crear dos columnas para las firmas
      const columna1X = 20;
      const columna2X = 110;
      const firmaLineaY = firmasY + 15;
      const firmaTextoY = firmasY + 25;
      
      // Líneas para firmas
      doc.setLineWidth(0.5);
      doc.line(columna1X, firmaLineaY, columna1X + 70, firmaLineaY); // Línea firma encargado
      doc.line(columna2X, firmaLineaY, columna2X + 70, firmaLineaY); // Línea firma responsable
      
      // Texto debajo de las líneas
      doc.setFontSize(10);
      doc.text('Firma del encargado', columna1X + 15, firmaTextoY);
      doc.text('Firma del responsable', columna2X + 10, firmaTextoY);
      
      // Agregar CI del pagador debajo de la firma del responsable
      if (pagoData.nit_ci) {
        doc.setFontSize(9);
        doc.text(`CI: ${pagoData.nit_ci}`, columna2X + 20, firmaTextoY + 8);
      }
      
      // Guardar PDF
      const nombreArchivo = `comprobante_servicio_${estudianteData.nombre}_${servicioItem.servicio_descripcion?.replace(/\s+/g, '_')}_${servicioItem.mes_inicio}_${servicioItem.anio}.pdf`;
      doc.save(nombreArchivo);
    };
  };

  // Función para generar PDF del plan de pagos de servicios (adquisición)
  const generarPDFPlanServicios = (planData) => {
    if (!planData) return;
    const doc = new jsPDF();
    const fechaEmision = new Date().toLocaleDateString('es-BO');

    const filas = (planData.mesesTexto || []).map((mes, idx) => ([
      idx + 1,
      mes,
      `Bs ${Number(planData.montoMensual || 0).toFixed(2)}`
    ]));

    doc.setFontSize(16);
    doc.text('Plan de Pagos de Servicios', 105, 16, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Fecha de emisión: ${fechaEmision}`, 14, 24);

    doc.setFontSize(11);
    doc.text(`Estudiante: ${planData.estudianteNombre || '—'}`, 14, 34);
    doc.text(`Servicio: ${planData.servicio || '—'}`, 14, 41);
    doc.text(`Gestión: ${planData.anio || '—'}`, 14, 48);

    autoTable(doc, {
      startY: 56,
      head: [['#', 'Mes', 'Monto mensual']],
      body: filas,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [40, 167, 69] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 12 },
        1: { cellWidth: 90 },
        2: { halign: 'right', cellWidth: 40 }
      }
    });

    const totalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text(`Cantidad de meses: ${planData.cantidadMeses || 0}`, 14, totalY);
    doc.text(`Total proyectado: Bs ${Number(planData.total || 0).toFixed(2)}`, 14, totalY + 8);
    doc.setFont(undefined, 'normal');

    const nombreArchivo = `plan_servicio_${(planData.estudianteNombre || 'estudiante').replace(/\s+/g, '_')}_${(planData.servicio || 'servicio').replace(/\s+/g, '_')}_${planData.anio || ''}.pdf`;
    doc.save(nombreArchivo);
  };

  const token = localStorage.getItem('token');

  // Carga inicial de estudiantes (búsqueda básica) y filtrado en el cliente, igual que Preinscripción
  const cargarEstudiantesBasicos = async () => {
    try {
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/estudiantes/busqueda-basica', user?.rol);
      const res = await fetch(`${apiUrl}/estudiantes/busqueda-basica`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      if (Array.isArray(data)) setEstudiantesBasicos(data);
    } catch (_) {}
  };

  const cargarServicios = async () => {
    const user = AuthService.getUser();
    const apiUrl = getApiUrl('/servicios', user?.rol);
    const res = await fetch(`${apiUrl}/servicios`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setServicios(Array.isArray(data) ? data : []);
  };

  const cargarAdquisiciones = async (estudianteId) => {
    const user = AuthService.getUser();
    const apiUrl = getApiUrl('/servicios-estudiante', user?.rol);
    const res = await fetch(`${apiUrl}/servicios-estudiante/${estudianteId}`, { headers: { 'Authorization': `Bearer ${token}` } });
    const data = await res.json();
    setAdquisiciones(Array.isArray(data) ? data : []);
  };

  useEffect(() => { cargarServicios(); cargarEstudiantesBasicos(); }, []);

  // Filtrado reactivo como en Preinscripción (2 caracteres mínimo)
  useEffect(() => {
    if (q.trim().length >= 2) {
      const filtrados = estudiantesBasicos.filter(est => {
        const nombreCompleto = `${est.nombre} ${est.apellido_paterno || ''} ${est.apellido_materno || ''}`.toLowerCase();
        const ci = (est.ci_estudiante || '').toLowerCase();
        const term = q.toLowerCase();
        return nombreCompleto.includes(term) || ci.includes(term);
      }).slice(0, 10);
      setEstudiantes(filtrados);
      setMostrarSugerencias(true);
      // Mientras se escribe, ocultar datos previos
      setEstudiante(null);
      setAdquisiciones([]);
    } else {
      setEstudiantes([]);
      setMostrarSugerencias(false);
    }
  }, [q, estudiantesBasicos]);

  // Ocultar registros anulados en la vista principal.
  const adquisicionesVisibles = adquisiciones.filter(
    (a) => String(a.estado || 'activo').toLowerCase() !== 'anulado'
  );

  const obtenerMesesSeleccionadosTexto = () => {
    const mesesOrdenados = [...mesesSeleccionados].sort((a, b) => a - b);
    return mesesOrdenados.map((m) => MESES_NOMBRES[m] || `Mes ${m}`);
  };

  const registrarServicio = async () => {
    if (!form.servicio_id || !form.anio || !form.monto_mensual || mesesSeleccionados.length === 0) return;
    try {
      const payloads = mesesSeleccionados.map(m => ({
        estudiante_id: estudiante.id,
        servicio_id: Number(form.servicio_id),
        anio: Number(form.anio),
        mes_inicio: Number(m),
        mes_fin: Number(m),
        monto_mensual: parseFloat(form.monto_mensual)
      }));
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/servicios-estudiante', user?.rol);
      await Promise.all(payloads.map(p => fetch(`${apiUrl}/servicios-estudiante`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(p)
      })));

      const servicioSeleccionado = servicios.find(s => Number(s.id) === Number(form.servicio_id));
      const mesesTexto = obtenerMesesSeleccionadosTexto();
      const montoMensual = Number(form.monto_mensual || 0);
      const total = montoMensual * mesesSeleccionados.length;
      setResumenRegistro({
        estudianteNombre: `${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''}`.trim(),
        servicio: servicioSeleccionado?.descripcion || 'Servicio',
        anio: Number(form.anio),
        montoMensual,
        cantidadMeses: mesesSeleccionados.length,
        mesesTexto,
        total
      });
      // Generar automáticamente el plan de pagos en PDF al registrar
      generarPDFPlanServicios({
        estudianteNombre: `${estudiante.nombre} ${estudiante.apellido_paterno || ''} ${estudiante.apellido_materno || ''}`.trim(),
        servicio: servicioSeleccionado?.descripcion || 'Servicio',
        anio: Number(form.anio),
        montoMensual,
        cantidadMeses: mesesSeleccionados.length,
        mesesTexto,
        total
      });
      setShowResumenRegistroModal(true);

      setShowRegistrarModal(false);
      setForm({ servicio_id: '', anio: new Date().getFullYear(), monto_mensual: '' });
      setMesesSeleccionados([]);
      cargarAdquisiciones(estudiante.id);
    } catch (err) {
      alert('No se pudo registrar');
    }
  };

  const eliminarTodosServiciosEstudiante = async () => {
    if (!estudiante || adquisicionesVisibles.length === 0) return;
    try {
      setEliminandoTodos(true);
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/servicios-estudiante', user?.rol);
      const porAnular = adquisicionesVisibles.filter(
        (a) => String(a.estado || 'activo').toLowerCase() !== 'anulado'
      );
      await Promise.all(
        porAnular.map((a) =>
          fetch(`${apiUrl}/servicios-estudiante/${a.id}/anular`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ motivo: 'Reinicio de servicios por solicitud del usuario' })
          })
        )
      );
      setShowConfirmEliminarTodos(false);
      await cargarAdquisiciones(estudiante.id);
      alert(`Se eliminaron/anularon ${porAnular.length} servicio(s) del estudiante seleccionado.`);
    } catch (error) {
      alert('No se pudieron eliminar todos los servicios.');
    } finally {
      setEliminandoTodos(false);
    }
  };

  const procesarPagoServicio = async () => {
    try {
      setPagando(true);
      const toPay = payForm.pagar_todos
        ? (payContext.itemsGrupo || []).filter(
            x => String(x.estado || 'activo').toLowerCase() !== 'anulado' && !x.pagado
          )
        : [payContext.item];
      const pagosExitosos = [];

      for (const it of toPay) {
        const user = AuthService.getUser();
        const apiUrl = getApiUrl('/servicios-estudiante', user?.rol);
        const resp = await fetch(`${apiUrl}/servicios-estudiante/${it.id}/pagar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify({
            forma_pago: payForm.forma_pago,
            numero_comprobante: payForm.numero_comprobante || null,
            nit_ci: payForm.nit_ci || null,
            fecha_pago: payForm.fecha_pago
          })
        });
        if (!resp.ok) throw new Error('No se pudo registrar el pago');
        pagosExitosos.push(it);
      }

      // Generar PDF para cada pago exitoso
      if (pagosExitosos.length > 0) {
        pagosExitosos.forEach((itemPagado) => {
          generarPDFPagoServicio(
            {
              fecha_pago: payForm.fecha_pago,
              forma_pago: payForm.forma_pago,
              numero_comprobante: payForm.numero_comprobante,
              nit_ci: payForm.nit_ci
            },
            itemPagado,
            estudiante
          );
        });
      }

      setResumenPagoExitoso({
        estudianteNombre: `${estudiante?.nombre || ''} ${estudiante?.apellido_paterno || ''} ${estudiante?.apellido_materno || ''}`.trim(),
        servicio: payContext.itemsGrupo?.[0]?.servicio_descripcion || payContext.item?.servicio_descripcion || 'Servicio',
        cantidadPagos: pagosExitosos.length,
        formaPago: (payForm.forma_pago || '').toUpperCase(),
        fechaPago: payForm.fecha_pago,
        montoTotal: pagosExitosos.reduce((sum, it) => sum + Number(it.monto_mensual || 0), 0)
      });
      setShowPagoExitosoModal(true);

      setShowConfirmPagoModal(false);
      setShowPayModal(false);
      cargarAdquisiciones(estudiante.id);
    } catch (e) {
      alert(e.message);
    } finally {
      setPagando(false);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Servicios adquiridos</h2>

      {/* Buscador */}
      <div className="card mb-3 p-3">
        <label className="form-label">Buscar estudiante (mín. 2 caracteres)</label>
        <input className="form-control" value={q} onChange={(e) => { setQ(e.target.value); }} placeholder="Nombre, CI o código" onFocus={() => { if (estudiantes.length > 0) setMostrarSugerencias(true); }} />
        {mostrarSugerencias && estudiantes.length > 0 && (
          <div className="list-group mt-2">
            {estudiantes.map(e => (
              <button key={e.id} className="list-group-item list-group-item-action" onClick={() => { setEstudiante(e); setQ(`${e.nombre} ${e.apellido_paterno || ''} ${e.apellido_materno || ''}`.trim()); setMostrarSugerencias(false); cargarAdquisiciones(e.id); }}>
                {e.nombre} {e.apellido_paterno} {e.apellido_materno} - CI {e.ci_estudiante}
              </button>
            ))}
          </div>
        )}
      </div>

      {estudiante && (
        <div className="alert alert-light border d-flex flex-wrap gap-4">
          <div><strong>Nombre:</strong> {estudiante.nombre} {estudiante.apellido_paterno} {estudiante.apellido_materno}</div>
          <div><strong>CI:</strong> {estudiante.ci_estudiante || '—'}</div>
          <div><strong>Padre:</strong> {estudiante.nombre_padre || '—'}</div>
          <div><strong>Madre:</strong> {estudiante.nombre_madre || '—'}</div>
        </div>
      )}

      {/* Servicios del estudiante (agrupados) */}
      {estudiante && (
        <div className="mb-3 d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Servicios adquiridos de {estudiante.nombre}</h5>
          <div className="d-flex gap-2">
            {/* Oculto temporalmente por solicitud:
            {adquisicionesVisibles.length > 0 && (
              <button className="btn btn-outline-danger" onClick={() => setShowConfirmEliminarTodos(true)}>
                Eliminar todos los servicios
              </button>
            )} */}
            <button className="btn btn-success" onClick={() => { setForm({ servicio_id: '', anio: new Date().getFullYear(), monto_mensual: '' }); setMesesSeleccionados([]); setShowRegistrarModal(true); }}>Registrar servicio</button>
          </div>
        </div>
      )}

      {estudiante && adquisicionesVisibles.length === 0 && (
        <div className="alert alert-warning d-flex justify-content-between align-items-center">
          <div>Este estudiante aún no tiene servicios registrados.</div>
        </div>
      )}

      {estudiante && adquisicionesVisibles.length > 0 && (
        Object.entries(adquisicionesVisibles.reduce((acc, item) => {
          const key = `${item.servicio_id}-${item.servicio_descripcion}`;
          if (!acc[key]) acc[key] = [];
          acc[key].push(item);
          return acc;
        }, {})).map(([key, items]) => {
          const descripcion = items[0].servicio_descripcion;
          return (
            <div key={key} className="card mb-3">
              <div className="card-header d-flex justify-content-between align-items-center">
                <strong>{descripcion}</strong>
                <span className="badge bg-secondary">{items.length} registro(s)</span>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-striped mb-0">
                    <thead>
                      <tr>
                        <th>Año</th>
                        <th>Mes</th>
                        <th>Monto mensual</th>
                        <th>Estado</th>
                        <th>Forma de pago</th>
                        <th>Fecha pago</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(a => (
                        <tr key={a.id}>
                          <td>{a.anio}</td>
                          <td>{a.mes_inicio}</td>
                          <td>Bs {Number(a.monto_mensual).toFixed(2)}</td>
                          <td>
                            {a.pagado ? (
                              <span className="badge bg-success">Pagado</span>
                            ) : (
                              <span className="badge bg-warning text-dark">Pendiente</span>
                            )}
                          </td>
                          <td>{a.forma_pago ? a.forma_pago.toUpperCase() : '—'}</td>
                          <td>{a.fecha_pago ? new Date(a.fecha_pago).toLocaleDateString('es-BO') : '—'}</td>
                          <td>
                            {a.estado === 'activo' && !a.pagado && (
                              <>
                                <button className="btn btn-sm btn-primary me-2" onClick={() => {
                                  setPayContext({ item: a, itemsGrupo: items });
                                  setPayForm({ forma_pago: 'efectivo', numero_comprobante: '', nit_ci: '', fecha_pago: new Date().toISOString().split('T')[0], pagar_todos: false });
                                  setShowPayModal(true);
                                }}>Pagar</button>
                                <button className="btn btn-sm btn-outline-danger" onClick={async () => {
                                  if (!window.confirm('¿Anular este servicio?')) return;
                                  const user = AuthService.getUser();
                                  const apiUrl = getApiUrl('/servicios-estudiante', user?.rol);
                                  const resp = await fetch(`${apiUrl}/servicios-estudiante/${a.id}/anular`, { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ motivo: 'Anulado por administrador' }) });
                                  if (resp.ok) cargarAdquisiciones(estudiante.id);
                                }}>Anular</button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })
      )}

      {/* Modal de registro de servicio */}
      {showRegistrarModal && estudiante && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Registrar servicio para {estudiante.nombre}</h5>
                <button type="button" className="btn-close" onClick={() => setShowRegistrarModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Servicio</label>
                    <select className="form-select" value={form.servicio_id} onChange={(e) => setForm({ ...form, servicio_id: e.target.value })}>
                      <option value="">Seleccionar...</option>
                      {servicios.map(s => (<option key={s.id} value={s.id}>{s.descripcion}</option>))}
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Año</label>
                    <input type="number" className="form-control" value={form.anio} onChange={(e) => setForm({ ...form, anio: e.target.value })} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Monto mensual (Bs)</label>
                    <input type="number" step="0.01" className="form-control" value={form.monto_mensual} onChange={(e) => setForm({ ...form, monto_mensual: e.target.value })} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label">Selecciona los meses</label>
                  <div className="row">
                    {[
                      {n:1,nombre:'enero'},{n:2,nombre:'febrero'},{n:3,nombre:'marzo'},{n:4,nombre:'abril'},
                      {n:5,nombre:'mayo'},{n:6,nombre:'junio'},{n:7,nombre:'julio'},{n:8,nombre:'agosto'},
                      {n:9,nombre:'septiembre'},{n:10,nombre:'octubre'},{n:11,nombre:'noviembre'},{n:12,nombre:'diciembre'}
                    ].map(m => (
                      <div key={m.n} className="col-6 col-sm-4 col-md-3 mb-2">
                        <div className="form-check">
                          <input className="form-check-input" type="checkbox" id={`m-${m.n}`} checked={mesesSeleccionados.includes(m.n)} onChange={(e) => setMesesSeleccionados(prev => e.target.checked ? [...prev, m.n] : prev.filter(x => x !== m.n))} />
                          <label htmlFor={`m-${m.n}`} className="form-check-label text-capitalize">{m.nombre}</label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {mesesSeleccionados.length > 0 && form.monto_mensual && (
                  <div className="alert alert-info mt-3">
                    {(() => {
                      const cantidad = mesesSeleccionados.length;
                      const total = (parseFloat(form.monto_mensual || 0) * cantidad) || 0;
                      return `Resumen: ${cantidad} mes(es) x Bs ${Number(form.monto_mensual).toFixed(2)} = Bs ${total.toFixed(2)}`;
                    })()}
                  </div>
                )}
              </div>
              {/* Modal de pago se renderiza fuera del modal de registro */}
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowRegistrarModal(false)}>Cancelar</button>
                <button type="button" className="btn btn-success" onClick={registrarServicio}>Registrar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal resumen de registro (tipo plan de pagos) */}
      {showResumenRegistroModal && resumenRegistro && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="fas fa-check-circle me-2"></i>
                  Servicio registrado correctamente
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowResumenRegistroModal(false)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-3">
                  Se registró la adquisición con los siguientes datos:
                </p>
                <div className="row g-2 mb-3">
                  <div className="col-md-6"><strong>Estudiante:</strong> {resumenRegistro.estudianteNombre}</div>
                  <div className="col-md-6"><strong>Servicio:</strong> {resumenRegistro.servicio}</div>
                  <div className="col-md-4"><strong>Año:</strong> {resumenRegistro.anio}</div>
                  <div className="col-md-4"><strong>Monto mensual:</strong> Bs {resumenRegistro.montoMensual.toFixed(2)}</div>
                  <div className="col-md-4"><strong>Meses:</strong> {resumenRegistro.cantidadMeses}</div>
                </div>
                <div className="card border-success">
                  <div className="card-header bg-success bg-opacity-10">
                    <strong>Plan de meses adquiridos</strong>
                  </div>
                  <div className="card-body">
                    <div className="mb-2">
                      {resumenRegistro.mesesTexto.map((mes) => (
                        <span key={mes} className="badge bg-light text-dark border me-1 mb-1">{mes}</span>
                      ))}
                    </div>
                    <div className="fw-bold text-success">
                      Total proyectado: Bs {resumenRegistro.total.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-primary"
                  onClick={() => generarPDFPlanServicios(resumenRegistro)}
                >
                  <i className="fas fa-file-pdf me-2"></i>
                  Descargar plan PDF
                </button>
                <button type="button" className="btn btn-success" onClick={() => setShowResumenRegistroModal(false)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación eliminar todos */}
      {/* Oculto temporalmente por solicitud:
      {showConfirmEliminarTodos && estudiante && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.45)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  Eliminar todos los servicios
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowConfirmEliminarTodos(false)} disabled={eliminandoTodos}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  ¿Seguro que quieres anular todos los servicios activos de <strong>{estudiante.nombre}</strong>?
                </p>
                <small className="text-muted">
                  Esta acción te permite volver a registrar los servicios desde cero.
                </small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmEliminarTodos(false)} disabled={eliminandoTodos}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-danger" onClick={eliminarTodosServiciosEstudiante} disabled={eliminandoTodos}>
                  {eliminandoTodos ? 'Eliminando...' : 'Sí, eliminar todos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )} */}

      {/* Modal de pago de servicio (fuera del modal de registrar) */}
      {showPayModal && payContext.item && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Pagar servicio</h5>
                <button type="button" className="btn-close" onClick={() => setShowPayModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-2"><strong>Estudiante:</strong> {estudiante?.nombre} {estudiante?.apellido_paterno} {estudiante?.apellido_materno}</div>
                <div className="mb-2"><strong>Servicio:</strong> {payContext.itemsGrupo?.[0]?.servicio_descripcion}</div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label">Forma de pago</label>
                    <select className="form-select" value={payForm.forma_pago} onChange={e => setPayForm({ ...payForm, forma_pago: e.target.value })}>
                      <option value="efectivo">Efectivo</option>
                      <option value="qr">QR</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Fecha de pago</label>
                    <input type="date" className="form-control" value={payForm.fecha_pago} onChange={e => setPayForm({ ...payForm, fecha_pago: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Nº comprobante (opcional)</label>
                    <input className="form-control" value={payForm.numero_comprobante} onChange={e => setPayForm({ ...payForm, numero_comprobante: e.target.value })} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">NIT/CI (opcional)</label>
                    <input className="form-control" value={payForm.nit_ci} onChange={e => setPayForm({ ...payForm, nit_ci: e.target.value })} />
                  </div>
                </div>
                <div className="form-check mt-3">
                  <input className="form-check-input" type="checkbox" id="pagar-todos" checked={payForm.pagar_todos} onChange={e => setPayForm({ ...payForm, pagar_todos: e.target.checked })} />
                  <label className="form-check-label" htmlFor="pagar-todos">Pagar todos los meses pendientes de este servicio</label>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)} disabled={pagando}>Cancelar</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={pagando}
                  onClick={() => setShowConfirmPagoModal(true)}
                >
                  {pagando ? 'Pagando...' : (payForm.pagar_todos ? 'Pagar todos' : 'Pagar')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación previa al pago */}
      {showConfirmPagoModal && payContext.item && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.45)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-primary">
                  <i className="fas fa-check-circle me-2"></i>
                  Confirmar pago de servicio
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowConfirmPagoModal(false)} disabled={pagando}></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  ¿Confirmas registrar {payForm.pagar_todos ? 'todos los pagos pendientes' : 'este pago'} del servicio?
                </p>
                <ul className="mb-0 small text-muted">
                  <li>Forma de pago: <strong>{(payForm.forma_pago || '').toUpperCase()}</strong></li>
                  <li>Fecha de pago: <strong>{payForm.fecha_pago}</strong></li>
                  <li>Al confirmar, se generará automáticamente el comprobante en PDF.</li>
                </ul>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirmPagoModal(false)} disabled={pagando}>
                  Cancelar
                </button>
                <button type="button" className="btn btn-primary" onClick={procesarPagoServicio} disabled={pagando}>
                  {pagando ? 'Procesando...' : 'Sí, confirmar pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmación final de pago exitoso */}
      {showPagoExitosoModal && resumenPagoExitoso && (
        <div className="modal fade show" style={{ display: 'block', background: 'rgba(0,0,0,0.45)' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-success text-white">
                <h5 className="modal-title">
                  <i className="fas fa-check-circle me-2"></i>
                  Pago registrado exitosamente
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowPagoExitosoModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-2"><strong>Estudiante:</strong> {resumenPagoExitoso.estudianteNombre}</div>
                <div className="mb-2"><strong>Servicio:</strong> {resumenPagoExitoso.servicio}</div>
                <div className="mb-2"><strong>Pagos registrados:</strong> {resumenPagoExitoso.cantidadPagos}</div>
                <div className="mb-2"><strong>Forma de pago:</strong> {resumenPagoExitoso.formaPago}</div>
                <div className="mb-2"><strong>Fecha de pago:</strong> {resumenPagoExitoso.fechaPago}</div>
                <div className="fw-bold text-success">
                  Total pagado: Bs {Number(resumenPagoExitoso.montoTotal || 0).toFixed(2)}
                </div>
                <small className="text-muted d-block mt-2">
                  El comprobante PDF se generó automáticamente.
                </small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-success" onClick={() => setShowPagoExitosoModal(false)}>
                  Entendido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdquisicionServicios;


