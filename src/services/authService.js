const API_URL = `http://${window.location.hostname}:3001/api`;

class AuthService {
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

  // Login
  static async login(credentials) {
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(credentials)
      });

      const data = await response.json();
      
      if (data.ok) {
        this.setAuth(data.token, data.user);
        return { ok: true, user: data.user };
      } else {
        return { ok: false, message: data.message };
      }
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