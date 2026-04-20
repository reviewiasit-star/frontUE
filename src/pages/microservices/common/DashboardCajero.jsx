import React, { useState, useEffect, useCallback } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { getApiUrl } from '../../../config/apiConfig';
import AuthService from '../../../services/authService';

const DashboardCajero = () => {
  const [ingresos, setIngresos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [fechaFin, setFechaFin] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    cargarIngresos();
  }, [fechaInicio, fechaFin]);

  const cargarIngresos = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const apiUrl = getApiUrl('/ingresos-academicos', user?.rol);
      
      const headers = {
        'Authorization': `Bearer ${token}`
      };
      
      const url = `${apiUrl}/ingresos-academicos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
      const res = await fetch(url, { headers });
      const data = await res.json();
      
      setIngresos(data.ingresos || []);
      setTotal(data.total || 0);
    } catch (error) {
      console.error('Error al cargar ingresos:', error);
      setIngresos([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [fechaInicio, fechaFin]);

  const exportarPDF = () => {
    if (ingresos.length === 0) {
      alert('No hay ingresos para exportar.');
      return;
    }

    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Reporte de Ingresos', 14, 18);
    doc.setFontSize(10);
    doc.text(`Período: ${new Date(fechaInicio).toLocaleDateString('es-BO')} - ${new Date(fechaFin).toLocaleDateString('es-BO')}`, 14, 25);
    doc.text(`Total: Bs ${total.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 14, 30);
    doc.text(`Fecha de generación: ${new Date().toLocaleString('es-BO')}`, 14, 35);
    
    autoTable(doc, {
      startY: 40,
      head: [['Fecha', 'Estudiante', 'Tipo', 'Monto (Bs)', 'Forma de Pago', 'Detalle']],
      body: ingresos.map(ing => [
        ing.fecha ? new Date(ing.fecha).toLocaleDateString('es-BO') : '-',
        ing.estudiante_nombre || 'Sin asignar',
        ing.tipo_pago || 'Cuota',
        parseFloat(ing.monto || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        ing.forma_pago || 'Otro',
        ing.detalle || '-'
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [28, 167, 69], textColor: 255, fontStyle: 'bold' },
      margin: { left: 10, right: 10 },
      tableWidth: 190,
    });
    
    doc.save(`ingresos_${fechaInicio}_${fechaFin}.pdf`);
  };

  const exportarExcel = async () => {
    if (ingresos.length === 0) {
      alert('No hay ingresos para exportar.');
      return;
    }

    try {
      const xlsx = await import('xlsx');
      const rows = ingresos.map(ing => ({
        Fecha: ing.fecha ? new Date(ing.fecha).toLocaleDateString('es-BO') : '-',
        Estudiante: ing.estudiante_nombre || 'Sin asignar',
        Tipo: ing.tipo_pago || 'Cuota',
        'Monto (Bs)': parseFloat(ing.monto || 0),
        'Forma de Pago': ing.forma_pago || 'Otro',
        Detalle: ing.detalle || '-'
      }));

      const worksheet = xlsx.utils.json_to_sheet(rows);
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, 'Ingresos');
      xlsx.writeFile(workbook, `ingresos_${fechaInicio}_${fechaFin}.xlsx`);
    } catch (error) {
      console.error('Error al exportar a Excel:', error);
      alert('No se pudo generar el archivo Excel. Verifica que la librería esté instalada.');
    }
  };

  return (
    <div className="container-fluid py-4" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)', minHeight: '100vh' }}>
      {/* Header */}
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
                  <h2 className="mb-2 fw-bold">
                    <i className="fas fa-cash-register me-3"></i>
                    Panel de Caja
                  </h2>
                  <p className="mb-0 opacity-90">
                    <i className="fas fa-coins me-2"></i>
                    Consulta de ingresos por rango de fechas
                  </p>
                </div>
                <div className="col-md-4 text-end">
                  <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-white bg-opacity-20 p-3">
                    <i className="fas fa-chart-line fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Selector de Fechas */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="row g-3 align-items-end">
                <div className="col-md-4">
                  <label className="form-label fw-bold">
                    <i className="fas fa-calendar-alt me-2 text-success"></i>
                    Fecha Inicio
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <label className="form-label fw-bold">
                    <i className="fas fa-calendar-check me-2 text-success"></i>
                    Fecha Fin
                  </label>
                  <input
                    type="date"
                    className="form-control"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
                <div className="col-md-4">
                  <button
                    className="btn btn-success w-100"
                    onClick={cargarIngresos}
                    disabled={loading}
                  >
                    <i className="fas fa-sync-alt me-2"></i>
                    {loading ? 'Cargando...' : 'Consultar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Total Acumulado */}
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
                  <p className="mb-0 opacity-90">
                    Período: {new Date(fechaInicio).toLocaleDateString('es-BO')} - {new Date(fechaFin).toLocaleDateString('es-BO')}
                  </p>
                </div>
                <div className="col-md-4 text-end">
                  <h2 className="mb-0 fw-bold">
                    {total.toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                  </h2>
                  <small className="opacity-75">
                    {ingresos.length} registro{ingresos.length !== 1 ? 's' : ''}
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botones de Exportación */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="fas fa-list me-2 text-success"></i>
                  Detalle de Ingresos
                </h5>
                <div className="d-flex gap-2">
                  <button
                    className="btn btn-outline-danger"
                    onClick={exportarPDF}
                    disabled={loading || ingresos.length === 0}
                  >
                    <i className="fas fa-file-pdf me-2"></i>
                    Exportar PDF
                  </button>
                  <button
                    className="btn btn-outline-success"
                    onClick={exportarExcel}
                    disabled={loading || ingresos.length === 0}
                  >
                    <i className="fas fa-file-excel me-2"></i>
                    Exportar Excel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabla de Ingresos */}
      <div className="row">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Cargando...</span>
                  </div>
                  <p className="text-muted mt-3">Cargando ingresos...</p>
                </div>
              ) : ingresos.length === 0 ? (
                <div className="text-center py-5">
                  <i className="fas fa-inbox fa-3x text-muted mb-3"></i>
                  <p className="text-muted">No hay ingresos registrados para el período seleccionado</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle">
                    <thead className="table-light">
                      <tr>
                        <th>Fecha</th>
                        <th>Estudiante</th>
                        <th>Tipo</th>
                        <th>Monto (Bs)</th>
                        <th>Forma de Pago</th>
                        <th>Detalle</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ingresos.map((ing, idx) => (
                        <tr key={idx}>
                          <td>
                            <strong>{ing.fecha ? new Date(ing.fecha).toLocaleDateString('es-BO') : '-'}</strong>
                          </td>
                          <td>
                            <strong>{ing.estudiante_nombre || 'Sin asignar'}</strong>
                            {ing.ci_estudiante && (
                              <>
                                <br />
                                <small className="text-muted">CI: {ing.ci_estudiante}</small>
                              </>
                            )}
                          </td>
                          <td>
                            <span className="badge bg-primary">
                              {ing.tipo_pago || 'Cuota'}
                            </span>
                          </td>
                          <td>
                            <strong className="text-success">
                              {parseFloat(ing.monto || 0).toLocaleString('es-BO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                            </strong>
                          </td>
                          <td>
                            <span className="badge bg-info">
                              {ing.forma_pago || 'Otro'}
                            </span>
                          </td>
                          <td>
                            <small className="text-muted">{ing.detalle || '-'}</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default DashboardCajero;
