import { getApiUrl, checkAllServices, BACKEND_PRINCIPAL, BACKEND_CAJAS } from '../config/apiConfig';

const API_URL = BACKEND_PRINCIPAL;

class AuthService {
  // Verificar disponibilidad de servicios
  static async checkServices() {
    return await checkAllServices();
  }
  // Guardar token y datos del usuario
  static setAuth(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  // Obtener token
  static getToken() {
    return localStorage.getItem('token');
  }

  // Obtener usuario
  static getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  }

  // Alias para compatibilidad
  static getCurrentUser() {
    return this.getUser();
  }

  // Alias para compatibilidad
  static getUserInfo() {
    return this.getUser();
  }

  // Verificar si está autenticado
  static isAuthenticated() {
    const token = this.getToken();
    const user = this.getUser();
    return token && user;
  }

  // Limpiar autenticación
  static clearAuth() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  // Verificar token con el servidor
  static async verifyToken() {
    try {
      const token = this.getToken();
      if (!token) {
        return { ok: false, message: 'No hay token' };
      }

      const response = await fetch(`${API_URL}/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.ok) {
        // Actualizar datos del usuario en localStorage
        this.setAuth(token, data.user);
        return { ok: true, user: data.user };
      } else {
        this.clearAuth();
        return { ok: false, message: data.message };
      }
    } catch (error) {
      this.clearAuth();
      return { ok: false, message: 'Error de conexión' };
    }
  }

  // Login con verificación de servicios
  static async login(credentials) {
    try {
      // Intentar login en ambos backends en paralelo
      const [responsePrincipal, responseCajas] = await Promise.allSettled([
        fetch(`${API_URL}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        }).then(r => r.ok ? r.json() : Promise.reject(r)),
        fetch(`${BACKEND_CAJAS}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials)
        }).then(r => r.ok ? r.json() : Promise.reject(r))
      ]);

      let data = null;

      // Procesar respuesta del backend principal
      if (responsePrincipal.status === 'fulfilled') {
        try {
          const dataPrincipal = responsePrincipal.value;
          if (dataPrincipal.ok && dataPrincipal.user && dataPrincipal.user.rol !== 'Cajero') {
            data = dataPrincipal;
          }
        } catch (e) {
          // Error silenciado
        }
      }

      // Procesar respuesta del backend-cajas (prioridad si es Cajero)
      if (responseCajas.status === 'fulfilled') {
        try {
          const dataCajas = responseCajas.value;
          if (dataCajas.ok) {
            // Si es Cajero, usar siempre backend-cajas
            // Si no es Cajero pero no se encontró en principal, también usar
            if (dataCajas.user.rol === 'Cajero' || !data) {
              data = dataCajas;
            }
          }
        } catch (e) {
          // Error silenciado
        }
      }

      // Si no se encontró en ninguno, intentar parsear errores
      if (!data) {
        if (responsePrincipal.status === 'rejected') {
          try {
            const errorResponse = await responsePrincipal.reason.json().catch(() => ({}));
            data = errorResponse;
          } catch (e) {}
        }
        if (!data && responseCajas.status === 'rejected') {
          try {
            const errorResponse = await responseCajas.reason.json().catch(() => ({}));
            data = errorResponse;
          } catch (e) {}
        }
      }
      
      if (data && data.ok) {
        this.setAuth(data.token, data.user);
        
        return { 
          ok: true, 
          user: data.user
        };
      } else {
        return { ok: false, message: data?.message || 'Error en la autenticación' };
      }
    } catch (error) {
      console.error('Error en login:', error);
      return { ok: false, message: 'Error de conexión. Verifica que el servidor esté funcionando.' };
    }
  }

  // Solicitar recuperación de contraseña
  static async solicitarRecuperacion({ usuario, correo }) {
    try {
      const response = await fetch(`${API_URL}/auth/recuperar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, correo })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { ok: false, message: 'Error de conexión' };
    }
  }

  // Restablecer contraseña con token
  static async restablecerConToken({ token, nueva_password }) {
    try {
      const response = await fetch(`${API_URL}/auth/restablecer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, nueva_password })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { ok: false, message: 'Error de conexión' };
    }
  }

  // Obtener perfil del usuario actual
  static async obtenerPerfil() {
    try {
      const token = this.getToken();
      const response = await fetch(`${API_URL}/auth/perfil`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (data.ok && data.user) {
        // Actualizar datos del usuario en localStorage
        this.setAuth(token, data.user);
      }
      return data;
    } catch (error) {
      return { ok: false, message: 'Error de conexión' };
    }
  }

  // Actualizar perfil del usuario actual
  static async actualizarPerfil({ usuario, nombre_completo, correo }) {
    try {
      const token = this.getToken();
      const response = await fetch(`${API_URL}/auth/perfil`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ usuario, nombre_completo, correo })
      });
      const data = await response.json();
      if (data.ok && data.user) {
        const newToken = data.token || token;
        this.setAuth(newToken, data.user);
      }
      return data;
    } catch (error) {
      return { ok: false, message: 'Error de conexión' };
    }
  }

  // Cambiar contraseña (usuario autenticado)
  static async cambiarPassword({ password_actual, password_nueva }) {
    try {
      const token = this.getToken();
      const response = await fetch(`${API_URL}/auth/cambiar-password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password_actual, password_nueva })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { ok: false, message: 'Error de conexión' };
    }
  }

  // Logout
  static logout() {
    this.clearAuth();
  }
}

export default AuthService;

// Exportación nombrada para compatibilidad
export const authService = AuthService;