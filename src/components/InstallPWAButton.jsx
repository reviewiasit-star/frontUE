import React, { useState, useEffect } from 'react';

/**
 * Componente para mostrar botón de instalación de PWA
 * Aparece cuando la aplicación es instalable
 */
function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    // Logs de depuración
    console.log('🔍 InstallPWAButton: Verificando condiciones de instalación...');
    console.log('📍 URL actual:', window.location.href);
    console.log('🔒 Protocolo:', window.location.protocol);
    console.log('🌐 Host:', window.location.host);
    
    // Verificar si la app ya está instalada
    const checkIfInstalled = () => {
      // En modo standalone significa que ya está instalada
      if (window.matchMedia('(display-mode: standalone)').matches) {
        console.log('✅ App ya está instalada (standalone mode)');
        setShowInstallButton(false);
        return true;
      }
      
      // Verificar si está en la pantalla de inicio (iOS)
      if (window.navigator.standalone === true) {
        console.log('✅ App ya está instalada (iOS standalone)');
        setShowInstallButton(false);
        return true;
      }
      return false;
    };

    // Verificar requisitos de PWA
    const checkPWARequirements = () => {
      const isHTTPS = window.location.protocol === 'https:';
      const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const isSecureContext = window.isSecureContext;
      
      console.log('🔐 HTTPS:', isHTTPS);
      console.log('🏠 Localhost:', isLocalhost);
      console.log('🛡️ Secure Context:', isSecureContext);
      
      // Para IPs de red local, se necesita HTTPS
      if (!isLocalhost && !isHTTPS) {
        console.warn('⚠️ PWA requiere HTTPS cuando se accede por IP de red local');
        console.warn('💡 Soluciones:');
        console.warn('   1. Usar localhost en lugar de IP');
        console.warn('   2. Configurar HTTPS con certificado autofirmado');
        console.warn('   3. Usar ngrok o similar para túnel HTTPS');
        return false;
      }
      
      return true;
    };

    // Detectar cuando el navegador muestra el prompt de instalación
    const handleBeforeInstallPrompt = (e) => {
      console.log('🎉 Evento beforeinstallprompt detectado!');
      // Prevenir que el navegador muestre el prompt automático
      e.preventDefault();
      // Guardar el evento para mostrarlo más tarde
      setDeferredPrompt(e);
      setShowInstallButton(true);
      console.log('✅ Botón de instalación activado');
    };

    // Verificar requisitos primero
    if (!checkPWARequirements()) {
      console.warn('⚠️ No se cumplen los requisitos para PWA instalable');
      // Mostrar mensaje informativo al usuario
      setTimeout(() => {
        console.log('💡 Para instalar la app en red local, se requiere HTTPS');
      }, 2000);
    }

    // Verificar si ya está instalada
    if (checkIfInstalled()) {
      return;
    }

    // Escuchar el evento de instalación
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Verificar después de un delay (a veces el evento tarda)
    const timeoutId = setTimeout(() => {
      if (!deferredPrompt) {
        console.log('⏱️ No se recibió beforeinstallprompt después de 3 segundos');
        console.log('💡 Posibles razones:');
        console.log('   - La app ya está instalada');
        console.log('   - No se cumplen los requisitos de PWA (HTTPS en red local)');
        console.log('   - El manifest.json no es válido');
        console.log('   - El service worker no está registrado');
      }
    }, 3000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      clearTimeout(timeoutId);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Mostrar el prompt de instalación
    deferredPrompt.prompt();

    // Esperar a que el usuario responda
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('Usuario aceptó instalar la aplicación');
    } else {
      console.log('Usuario rechazó instalar la aplicación');
    }

    // Limpiar el prompt
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  // No mostrar si no hay prompt disponible o si ya está instalada
  if (!showInstallButton || !deferredPrompt) {
    return null;
  }

  return (
    <>
      <div className="install-pwa-banner" style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10000,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '16px 24px',
        borderRadius: '12px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        maxWidth: '90%',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{ 
          width: '48px', 
          height: '48px', 
          borderRadius: '10px',
          overflow: 'hidden',
          flexShrink: 0,
          background: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <img 
            src="/icono.jpg" 
            alt="Icono de la aplicación" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover' 
            }} 
          />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '16px' }}>
            <i className="fas fa-download me-2"></i>
            Instalar Aplicación
          </div>
          <div style={{ fontSize: '13px', opacity: 0.9 }}>
            Instala la app para acceso rápido y funcionamiento offline
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleInstallClick}
            style={{
              background: 'white',
              color: '#667eea',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              transition: 'all 0.2s'
            }}
            onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
            onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          >
            Instalar
          </button>
          <button
            onClick={() => {
              setShowInstallButton(false);
              setDeferredPrompt(null);
            }}
            style={{
              background: 'transparent',
              color: 'white',
              border: '1px solid white',
              padding: '10px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            ×
          </button>
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
        @media (max-width: 576px) {
          .install-pwa-banner {
            flex-direction: column;
            text-align: center;
            padding: 12px 16px;
          }
          .install-pwa-banner > div:first-child {
            margin: 0 auto;
          }
        }
      `}</style>
    </>
  );
}

export default InstallPWAButton;
