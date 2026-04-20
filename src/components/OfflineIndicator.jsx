import React, { memo, useState, useEffect } from 'react';
import { useOfflineSync } from '../hooks/useOfflineSync';
import PendingRequestsModal from './PendingRequestsModal';

/**
 * Componente que muestra el estado de conexión y requests pendientes
 * TEMPORALMENTE DESHABILITADO - No mostrar alertas de conexión
 */
function OfflineIndicator() {
  // TEMPORALMENTE DESHABILITADO
  return null;
  
  /* CÓDIGO ORIGINAL COMENTADO - Descomentar para reactivar
  const { isOnline, isBackendOnline, pendingCount, syncing, lastSync, manualSync } = useOfflineSync();
  const [showModal, setShowModal] = useState(false);
  const [showAlert, setShowAlert] = useState(false);

  // Mostrar alerta inmediatamente cuando se detecta pérdida de conexión
  useEffect(() => {
    if (!isOnline || pendingCount > 0) {
      setShowAlert(true);
    } else {
      // Ocultar alerta después de 2 segundos cuando vuelve la conexión
      const timer = setTimeout(() => setShowAlert(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, pendingCount]);

  // NO mostrar el indicador flotante si hay datos pendientes - la tabla en la página es suficiente
  // Solo mostrar si está offline pero NO hay datos pendientes (para alertar sobre pérdida de conexión)
  if (pendingCount > 0) {
    return null; // No mostrar indicador flotante cuando hay datos pendientes
  }
  
  // Solo mostrar si está offline y no hay datos pendientes
  if (isOnline && pendingCount === 0 && !showAlert) {
    return null;
  }
  
  // Si hay requests pendientes o backend offline, mostrar indicador
  const showOfflineWarning = !isOnline || !isBackendOnline;
  */

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '300px'
      }}
    >
      {showOfflineWarning && (
        <div className={`alert alert-danger shadow-lg mb-2 ${showAlert ? 'animate__animated animate__shakeX' : ''}`} style={{ 
          border: '2px solid #dc3545',
          backgroundColor: '#f8d7da',
          animation: showAlert ? 'shake 0.5s' : 'none'
        }}>
          <div className="d-flex align-items-center">
            <i className="fas fa-exclamation-triangle me-2" style={{ fontSize: '1.5rem' }}></i>
            <div className="flex-grow-1">
              <strong style={{ fontSize: '1.1rem' }}>
                {!isOnline ? '⚠️ Se perdió la conexión con el servidor' : '⚠️ Backend Offline'}
              </strong>
              <div className="small mt-1">
                <strong>Modo offline activado</strong> - Los datos se guardarán localmente y se sincronizarán automáticamente cuando vuelva la conexión.
              </div>
            </div>
          </div>
        </div>
      )}

      {pendingCount > 0 && (
        <div className={`alert ${isOnline ? 'alert-info' : 'alert-secondary'} shadow-lg`}>
          <div className="d-flex align-items-center justify-content-between">
            <div className="flex-grow-1" style={{ cursor: 'pointer' }} onClick={() => setShowModal(true)}>
              <i className={`fas ${syncing ? 'fa-sync fa-spin' : 'fa-clock'} me-2`}></i>
              <strong>{pendingCount} operación(es) pendiente(s)</strong>
              <div className="small text-muted">Click para ver detalles</div>
              {lastSync && (
                <div className="small">
                  Última sync: {new Date(lastSync).toLocaleTimeString()}
                </div>
              )}
            </div>
            <div className="d-flex gap-1">
              {isOnline && !syncing && (
                <button
                  className="btn btn-sm btn-primary"
                  onClick={manualSync}
                  title="Sincronizar ahora"
                >
                  <i className="fas fa-sync"></i>
                </button>
              )}
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowModal(true)}
                title="Ver operaciones pendientes"
              >
                <i className="fas fa-list"></i>
              </button>
            </div>
          </div>
        </div>
      )}

      <PendingRequestsModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {syncing && (
        <div className="alert alert-info shadow-lg mt-2">
          <i className="fas fa-sync fa-spin me-2"></i>
          Sincronizando...
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}

// Memoizar componente para evitar re-renders innecesarios
export default memo(OfflineIndicator);
