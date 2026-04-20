import React, { useCallback, useEffect, useState } from 'react';
import { getApiUrl } from '../config/apiConfig';
import AuthService from '../services/authService';

const CARD_STYLES = [
  {
    key: 'estudiantes',
    label: 'Estudiantes registrados',
    sub: 'Activos en el sistema',
    icon: 'fa-user-graduate',
    iconColor: '#1d4ed8',
    iconBg: 'rgba(29, 78, 216, 0.14)',
    cardBg: 'linear-gradient(155deg, #e8efff 0%, #ffffff 52%)',
    borderAccent: '#3b82f6',
    shadowRgb: '37, 99, 235'
  },
  {
    key: 'inscripciones',
    label: 'Inscripciones',
    sub: 'Año de gestión seleccionado',
    icon: 'fa-file-signature',
    iconColor: '#047857',
    iconBg: 'rgba(4, 120, 87, 0.14)',
    cardBg: 'linear-gradient(155deg, #e8f8f0 0%, #ffffff 52%)',
    borderAccent: '#10b981',
    shadowRgb: '4, 120, 87'
  },
  {
    key: 'cursos',
    label: 'Cursos',
    sub: 'Total en catálogo',
    icon: 'fa-book',
    iconColor: '#7c3aed',
    iconBg: 'rgba(124, 58, 237, 0.12)',
    cardBg: 'linear-gradient(155deg, #f3e8ff 0%, #ffffff 52%)',
    borderAccent: '#8b5cf6',
    shadowRgb: '124, 58, 237'
  },
  {
    key: 'estructura',
    label: 'Niveles y bloques',
    sub: 'Estructura académica',
    icon: 'fa-sitemap',
    iconColor: '#c2410c',
    iconBg: 'rgba(194, 65, 12, 0.12)',
    cardBg: 'linear-gradient(155deg, #fff4e6 0%, #ffffff 52%)',
    borderAccent: '#ea580c',
    shadowRgb: '234, 88, 12'
  },
  {
    key: 'servicios',
    label: 'Con servicios adicionales',
    sub: 'Al menos un servicio activo o concluido',
    icon: 'fa-puzzle-piece',
    iconColor: '#0e7490',
    iconBg: 'rgba(14, 116, 144, 0.12)',
    cardBg: 'linear-gradient(155deg, #ecfeff 0%, #ffffff 52%)',
    borderAccent: '#06b6d4',
    shadowRgb: '14, 116, 144'
  }
];

function StatCard({ theme, value, extraLine, loading }) {
  const display = loading ? '…' : value != null ? String(value) : '—';
  return (
    <div
      className="card shadow-sm border-0 h-100"
      style={{
        background: theme.cardBg,
        borderLeft: `4px solid ${theme.borderAccent}`,
        borderRadius: 12,
        transition: 'box-shadow 0.15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 0.35rem 0.85rem rgba(${theme.shadowRgb}, 0.18)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '';
      }}
    >
      <div className="card-body d-flex gap-3 align-items-start py-3 px-3">
        <div
          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
          style={{
            width: 46,
            height: 46,
            background: theme.iconBg,
            color: theme.iconColor
          }}
          aria-hidden
        >
          <i className={`fas ${theme.icon} fa-lg`}></i>
        </div>
        <div className="flex-grow-1 min-w-0">
          <p
            className="text-muted small mb-0 text-uppercase fw-semibold"
            style={{ fontSize: '0.7rem', letterSpacing: '0.02em' }}
          >
            {theme.label}
          </p>
          <h4 className="mb-0 text-dark h5 mt-1 fw-bold">{display}</h4>
          <small className="text-muted small d-block">{theme.sub}</small>
          {extraLine ? <small className="text-muted small d-block mt-1">{extraLine}</small> : null}
        </div>
      </div>
    </div>
  );
}

/**
 * Panel principal del administrador: indicadores académicos (sin métricas de morosidad).
 */
export default function AdminDashboardResumen({ title = 'Resumen institucional' }) {
  const currentYear = new Date().getFullYear();
  const [anio, setAnio] = useState(currentYear);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [totalEstudiantes, setTotalEstudiantes] = useState(null);
  const [inscripcionesCount, setInscripcionesCount] = useState(null);
  const [cursosCount, setCursosCount] = useState(null);
  const [nivelesCount, setNivelesCount] = useState(null);
  const [bloquesCount, setBloquesCount] = useState(null);
  const [serviciosEstudiantesCount, setServiciosEstudiantesCount] = useState(null);

  const yearsOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  const cargar = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const token = localStorage.getItem('token');
      const user = AuthService.getUser();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const baseReportes = `${getApiUrl('/reportes-inscripcion', user?.rol)}/reportes-inscripcion`;
      const basePrincipal = getApiUrl('', user?.rol);

      const [
        rEst,
        rIns,
        rCursos,
        rNiveles,
        rBloques,
        rServ
      ] = await Promise.all([
        fetch(`${baseReportes}/total-estudiantes`, { headers }),
        fetch(`${baseReportes}/inscripciones-count?anio=${anio}`, { headers }),
        fetch(`${basePrincipal}/cursos`, { headers }),
        fetch(`${basePrincipal}/niveles`, { headers }),
        fetch(`${basePrincipal}/bloques`, { headers }),
        fetch(`${baseReportes}/estudiantes-con-servicios-count?anio=${anio}`, { headers })
      ]);

      const [dEst, dIns, dCursos, dNiveles, dBloques, dServ] = await Promise.all([
        rEst.json().catch(() => ({})),
        rIns.json().catch(() => ({})),
        rCursos.json().catch(() => []),
        rNiveles.json().catch(() => []),
        rBloques.json().catch(() => []),
        rServ.json().catch(() => ({}))
      ]);

      if (!rEst.ok || !dEst.ok) throw new Error(dEst.message || 'No se pudo cargar estudiantes');
      if (!rIns.ok || !dIns.ok) throw new Error(dIns.message || 'No se pudo cargar inscripciones');
      if (!rServ.ok || !dServ.ok) throw new Error(dServ.message || 'No se pudo cargar servicios');

      setTotalEstudiantes(dEst.count ?? 0);
      setInscripcionesCount(dIns.count ?? 0);

      const cursosArr = Array.isArray(dCursos) ? dCursos : [];
      const nivelesArr = Array.isArray(dNiveles) ? dNiveles : [];
      const bloquesArr = Array.isArray(dBloques) ? dBloques : [];
      setCursosCount(cursosArr.length);
      setNivelesCount(nivelesArr.length);
      setBloquesCount(bloquesArr.length);
      setServiciosEstudiantesCount(dServ.count ?? 0);
    } catch (e) {
      console.error('[AdminDashboardResumen]', e);
      setError(e.message || 'Error al cargar el resumen');
    } finally {
      setLoading(false);
    }
  }, [anio]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  const estructuraExtra =
    nivelesCount != null && bloquesCount != null
      ? `${nivelesCount} nivel(es) · ${bloquesCount} bloque(s)`
      : null;

  return (
    <div
      className="card shadow-sm mb-0"
      style={{
        marginTop: 0,
        marginBottom: 0,
        borderRadius: 0,
        background: 'linear-gradient(180deg, #eef2f7 0%, #f8fafc 48%, #ffffff 100%)',
        border: '1px solid rgba(15, 23, 42, 0.06)'
      }}
    >
      <div className="card-body" style={{ padding: '0.75rem 1rem' }}>
        <div className="d-flex flex-wrap justify-content-between align-items-stretch mb-3 gap-2">
          <div className="flex-grow-1 me-2" style={{ minWidth: '200px' }}>
            <h2 className="mb-0 h5 fw-bold">
              <i className="fas fa-chart-pie me-2 text-success"></i>
              {title}
            </h2>
            <small className="text-muted">
              Indicadores generales · Gestión académica {anio}
            </small>
          </div>
          <div
            className="d-flex flex-wrap align-items-stretch gap-2"
            style={{ flex: '1 1 220px', justifyContent: 'flex-end' }}
          >
            <select
              className="form-select"
              value={anio}
              onChange={(e) => setAnio(parseInt(e.target.value, 10))}
              style={{ width: 'auto', minWidth: 108, minHeight: 44, paddingTop: '0.5rem', paddingBottom: '0.5rem' }}
              aria-label="Año de gestión"
            >
              {yearsOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn btn-primary d-inline-flex align-items-center justify-content-center"
              style={{ minHeight: 44, minWidth: 132, paddingLeft: '1rem', paddingRight: '1rem' }}
              onClick={cargar}
              disabled={loading}
            >
              <i className={`fas fa-sync-alt me-2 ${loading ? 'fa-spin' : ''}`}></i>
              Actualizar
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small" role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            {error}
          </div>
        )}

        <div className="row row-cols-1 row-cols-md-2 row-cols-xl-5 g-3">
          <div className="col">
            <StatCard theme={CARD_STYLES[0]} value={totalEstudiantes} loading={loading} />
          </div>
          <div className="col">
            <StatCard
              theme={CARD_STYLES[1]}
              value={inscripcionesCount}
              extraLine={`Año ${anio}`}
              loading={loading}
            />
          </div>
          <div className="col">
            <StatCard theme={CARD_STYLES[2]} value={cursosCount} loading={loading} />
          </div>
          <div className="col">
            <StatCard
              theme={CARD_STYLES[3]}
              value={
                nivelesCount != null && bloquesCount != null
                  ? `${nivelesCount} / ${bloquesCount}`
                  : null
              }
              extraLine={estructuraExtra}
              loading={loading}
            />
          </div>
          <div className="col">
            <StatCard
              theme={CARD_STYLES[4]}
              value={serviciosEstudiantesCount}
              extraLine={`Servicios en gestión ${anio}`}
              loading={loading}
            />
          </div>
        </div>

        <p className="text-muted small mt-3 mb-0">
          <i className="fas fa-info-circle me-1"></i>
          Las inscripciones y el conteo de servicios adicionales corresponden al año de gestión elegido. Estudiantes
          registrados y catálogo de cursos son totales actuales del sistema.
        </p>
      </div>
    </div>
  );
}
