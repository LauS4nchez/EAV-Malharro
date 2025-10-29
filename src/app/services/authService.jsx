import { API_URL, API_TOKEN } from "@/app/config";

// Validaciones
export const validateEmail = (email) => /^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
export const validateUsername = (username) => /^[a-zA-Z][a-zA-Z0-9._]{2,19}$/.test(username);
export const validatePassword = (password) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);

// Servicios de autenticación
export const authService = {
  // Verificar email
  async checkEmail(email) {
    const userCheckRes = await fetch(
      `${API_URL}/users?filters[email][$eq]=${encodeURIComponent(email)}`,
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    );
    const users = await userCheckRes.json();
    return users.length > 0;
  },

  // Login manual
  async login(email, password) {
    const res = await fetch(`${API_URL}/auth/local`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: email, password }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data?.error?.message || "Contraseña incorrecta");
    }

    return data;
  },

  // Registro manual
  async register(username, email, password) {
    const res = await fetch(`${API_URL}/auth/local/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data?.error?.message || "Error en el registro");
    }

    return data;
  },

  // Obtener información del usuario
  async getMe(jwt) {
    const meRes = await fetch(`${API_URL}/users/me`, {
      headers: { Authorization: `Bearer ${jwt}` },
    });
    return await meRes.json();
  },

  // Configurar contraseña después de Google
  async setPassword(email, username, password) {
    const res = await fetch(`${API_URL}/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data?.error?.message || "Error al guardar la contraseña");
    }

    return data;
  },

  // Configurar contraseña para proveedores OAuth
  async setPasswordWithProvider(email, username, password, provider = 'google') {
    const res = await fetch(`${API_URL}/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, username, password, provider }),
    });

    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(data?.error?.message || "Error al guardar la contraseña");
    }

    return data;
  }
};