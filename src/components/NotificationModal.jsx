import React from 'react';
import '../styles/NotificationModal.css';

const NotificationModal = ({ 
  isOpen, 
  onClose, 
  type = 'success', // 'success', 'error', 'warning', 'info'
  title, 
  message,
  autoClose = true,
  autoCloseDelay = 3000 
}) => {
  React.useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return '✅';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '✅';
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'notification-success';
      case 'error':
        return 'notification-error';
      case 'warning':
        return 'notification-warning';
      case 'info':
        return 'notification-info';
      default:
        return 'notification-success';
    }
  };

  return (
    <div className="notification-overlay" onClick={onClose}>
      <div className={`notification-modal ${getTypeClass()}`} onClick={(e) => e.stopPropagation()}>
        <div className="notification-header">
          <div className="notification-icon">{getIcon()}</div>
          <h3 className="notification-title">{title}</h3>
          <button className="notification-close" onClick={onClose}>×</button>
        </div>
        <div className="notification-body">
          <p className="notification-message">{message}</p>
        </div>
        <div className="notification-footer">
          <button className="notification-btn" onClick={onClose}>
            Aceptar
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationModal;