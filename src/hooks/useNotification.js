import { useState, useCallback } from 'react';

export const useNotification = () => {
  const [notification, setNotification] = useState({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    autoClose: true,
    autoCloseDelay: 3000
  });

  const showNotification = useCallback(({
    type = 'success',
    title,
    message,
    autoClose = true,
    autoCloseDelay = 3000
  }) => {
    setNotification({
      isOpen: true,
      type,
      title,
      message,
      autoClose,
      autoCloseDelay
    });
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Funciones de conveniencia
  const showSuccess = useCallback((title, message, options = {}) => {
    showNotification({ type: 'success', title, message, ...options });
  }, [showNotification]);

  const showError = useCallback((title, message, options = {}) => {
    showNotification({ type: 'error', title, message, autoClose: false, ...options });
  }, [showNotification]);

  const showWarning = useCallback((title, message, options = {}) => {
    showNotification({ type: 'warning', title, message, ...options });
  }, [showNotification]);

  const showInfo = useCallback((title, message, options = {}) => {
    showNotification({ type: 'info', title, message, ...options });
  }, [showNotification]);

  return {
    notification,
    showNotification,
    hideNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};