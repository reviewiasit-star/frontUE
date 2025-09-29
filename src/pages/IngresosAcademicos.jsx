import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import '../styles/Reportes.css';
import AuthService from '../services/authService';
import ModoDispositivo from '../components/modoDispositivo';

const FORMA_PAGO_LABELS = {
  efectivo: { label: 'Efectivo', color: 'success' },
  qr: { label: 'QR', color: 'info' },
  transferencia: { label: 'Transferencia', color: 'primary' },
  otro: { label: 'Otro', color: 'secondary' },
};

const TIPO_PAGO_LABELS = {
  cuota: { label: 'Cuota', color: 'primary' },
  material: { label: 'Material', color: 'warning' },
  ambos: { label: 'Cuota + Material', color: 'info' }
};

function IngresosAcademicos() {
  const [ingresos, setIngresos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [total, setTotal] = useState(0);
  const [totalesPorForma, setTotalesPorForma] = useState({});
  const [formaPagoFiltro, setFormaPagoFiltro] = useState('todos');
  const [tipoPagoFiltro, setTipoPagoFiltro] = useState('todos');
  const [loading, setLoading] = useState(false);

  // Estados para el menú móvil
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const navigate = useNavigate();

  const fetchIngresos = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      let url = `http://${window.location.hostname}:3001/api/ingresos-academicos`;
      if (fechaInicio && fechaFin) {
        url += `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      }
      const res = await fetch(url, { headers });
      const data = await res.json();
      setIngresos(data.ingresos || []);
      setTotal(data.total || 0);
      setTotalesPorForma(data.totalesPorForma || {});
    } catch (error) {
      console.error('Error al cargar ingresos académicos:', error);
      setIngresos([]);
      setTotal(0);
      setTotalesPorForma({});
    }
    setLoading(false);
  };

  useEffect(() => {
    // Obtener información del usuario para el menú hamburguesa
    const user = AuthService.getUser();
    setUserInfo(user);
    
    fetchIngresos();
    // eslint-disable-next-line
  }, []);

  const handleFiltrar = (e) => {
    e.preventDefault();
    fetchIngresos();
  };

  // Filtrar ingresos por forma de pago y tipo de pago
  const ingresosFiltrados = ingresos.filter(ing => {
    const cumpleFormaPago = formaPagoFiltro === 'todos' || 
      (ing.forma_pago || 'otro').toLowerCase() === formaPagoFiltro;
    const cumpleTipoPago = tipoPagoFiltro === 'todos' || 
      (ing.tipo_pago || 'cuota').toLowerCase() === tipoPagoFiltro;
    return cumpleFormaPago && cumpleTipoPago;
  });

  // Exportar a PDF
  const exportarPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Ingresos Académicos', 14, 18);
    doc.setFontSize(10);
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-BO')}`, 14, 25);
    let y = 32;
    // Totales por forma de pago
    doc.setFontSize(12);
    doc.text('Totales por forma de pago:', 14, y);
    y += 6;
    Object.keys(FORMA_PAGO_LABELS).forEach(key => {
      doc.text(
        `${FORMA_PAGO_LABELS[key].label}: ${(totalesPorForma[key] || 0)} Bs`,
        18,
        y
      );
      y += 6;
    });
    doc.text(`Total acumulado: ${total} Bs`, 14, y);
    y += 8;
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
        ing.monto,
        FORMA_PAGO_LABELS[(ing.forma_pago || 'otro').toLowerCase()]?.label || 'Otro',
        ing.mes && ing.anio ? `${ing.mes}/${ing.anio}` : '-',
        ing.detalle || '-'
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
      margin: { left: 10, right: 10 },
      tableWidth: 190,
      rowPageBreak: 'avoid',
    });
    doc.save('ingresos_academicos.pdf');
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

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0"><i className="fas fa-university"></i> Ingresos Académicos</h2>
        <button 
          className="btn btn-outline-primary d-md-none"
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
      
      <form className="row g-3 mb-4" onSubmit={handleFiltrar}>
        <div className="col-md-3">
          <label className="form-label">Fecha inicio</label>
          <input type="date" className="form-control" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} />
        </div>
        <div className="col-md-3">
          <label className="form-label">Fecha fin</label>
          <input type="date" className="form-control" value={fechaFin} onChange={e => setFechaFin(e.target.value)} />
        </div>
        <div className="col-md-2">
          <label className="form-label">Forma de pago</label>
          <select className="form-select" value={formaPagoFiltro} onChange={e => setFormaPagoFiltro(e.target.value)}>
            <option value="todos">Todas</option>
            <option value="efectivo">Efectivo</option>
            <option value="qr">QR</option>
            <option value="transferencia">Transferencia</option>
            <option value="otro">Otro</option>
          </select>
        </div>
        <div className="col-md-2">
          <label className="form-label">Tipo de pago</label>
          <select className="form-select" value={tipoPagoFiltro} onChange={e => setTipoPagoFiltro(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="cuota">Cuota</option>
            <option value="material">Material</option>
            <option value="ambos">Cuota + Material</option>
          </select>
        </div>
        <div className="col-md-2 d-flex align-items-end">
          <button className="btn btn-primary w-100" type="submit" disabled={loading}>
            {loading ? 'Filtrando...' : 'Filtrar'}
          </button>
        </div>
      </form>
      <div className="row mb-4">
        {Object.keys(FORMA_PAGO_LABELS).map(key => (
          <div className="col-md-3 mb-2" key={key}>
            <div className={`card border-${FORMA_PAGO_LABELS[key].color} shadow-sm`}> 
              <div className={`card-body text-center text-${FORMA_PAGO_LABELS[key].color}`}> 
                <h6 className="card-title mb-1">{FORMA_PAGO_LABELS[key].label}</h6>
                <span className={`fw-bold fs-5`}>{totalesPorForma[key] || 0} Bs</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h5 className="card-title mb-0">
          <i className="fas fa-university me-2 text-primary"></i>
          Total acumulado: <span className="text-success">{total} Bs</span>
        </h5>
        <button className="btn btn-outline-danger" onClick={exportarPDF}>
          <i className="fas fa-file-pdf"></i> Exportar PDF
        </button>
      </div>
      <div className="card">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-striped align-middle reportes-table">
              <thead>
                <tr>
                  <th className="col-fecha">Fecha</th>
                  <th className="col-estudiante">Estudiante</th>
                  <th className="col-tipo">Tipo</th>
                  <th className="col-monto">Monto (Bs)</th>
                  <th className="col-forma-pago">Forma de pago</th>
                  <th className="col-mes">Mes/Año</th>
                  <th className="col-detalle">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {ingresosFiltrados.length === 0 ? (
                  <tr><td colSpan="7" className="text-center">No hay ingresos registrados</td></tr>
                ) : (
                  ingresosFiltrados.map((ing, idx) => (
                    <tr key={idx}>
                      <td className="col-fecha">{ing.fecha ? new Date(ing.fecha).toLocaleDateString('es-BO') : '-'}</td>
                      <td className="col-estudiante">
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
                      <td className="col-tipo">
                        <span className={`badge bg-${TIPO_PAGO_LABELS[(ing.tipo_pago || 'cuota').toLowerCase()]?.color || 'secondary'}`}>
                          {TIPO_PAGO_LABELS[(ing.tipo_pago || 'cuota').toLowerCase()]?.label || 'Cuota'}
                        </span>
                      </td>
                      <td className="col-monto">{ing.monto}</td>
                      <td className="col-forma-pago">
                        <span className={`badge bg-${FORMA_PAGO_LABELS[(ing.forma_pago || 'otro').toLowerCase()]?.color || 'secondary'}`}>
                          {FORMA_PAGO_LABELS[(ing.forma_pago || 'otro').toLowerCase()]?.label || 'Otro'}
                        </span>
                      </td>
                      <td className="col-mes">
                        {ing.mes && ing.anio ? `${ing.mes}/${ing.anio}` : '-'}
                      </td>
                      <td className="col-detalle">{ing.detalle || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
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