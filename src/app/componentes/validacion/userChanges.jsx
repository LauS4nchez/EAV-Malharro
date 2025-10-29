import { API_URL, API_TOKEN } from '@/app/config'

const getJWT = () => {
  return typeof window !== "undefined" ? localStorage.getItem("jwt") : null
}

// Función para obtener el ID del usuario actual desde el JWT
export const getCurrentUserId = () => {
  const jwt = getJWT()
  if (jwt) {
    try {
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      return payload.id
    } catch (error) {
      console.error('Error parsing JWT:', error)
      return null
    }
  }
  return null
}

// Función para formatear fechas
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  try {
    return new Date(dateString).toLocaleDateString('es-ES')
  } catch (dateError) {
    return 'Fecha inválida'
  }
}

// Función para obtener nombres de roles traducidos
export const getRoleDisplayName = (role) => {
  const roleMap = {
    'Authenticated': 'Autenticado',
    'Public': 'Público',
    'Estudiante': 'Estudiante',
    'Profesor': 'Profesor',
    'Administrador': 'Administrador',
    'SuperAdministrador': 'Super Admin'
  }
  return roleMap[role] || role
}

// Función para obtener valores de campos de usuario con valores por defecto
export const getFieldValue = (user, field) => {
  if (field === 'carrera') {
    return user.carrera || user.Carrera || 'No especificado'
  }
  return user[field] || user[field?.toLowerCase()] || 'No especificado'
}

// Función para verificar permisos de modificación
export const canModifyUser = (currentUserId, currentUser, targetUser) => {
  if (!currentUserId || !currentUser || !targetUser) return false

  // El usuario no puede modificarse a sí mismo
  if (targetUser.id === currentUserId) return false

  // Si el usuario actual es Administrador y el objetivo es Administrador, no puede modificarlo
  if (currentUser.role?.name === 'Administrador' && targetUser.role?.name === 'Administrador') {
    return false
  }

  if (currentUser.role?.name === 'Administrador' && targetUser.role?.name === 'SuperAdministrador') {
    return false
  }

  return true
}

// Función para obtener mensajes de advertencia de modificación
export const getModificationWarning = (currentUserId, currentUser, targetUser) => {
  if (targetUser.id === currentUserId) {
    return "No puedes modificar tu propio usuario"
  }
  
  if (currentUser?.role?.name === 'Administrador' && targetUser.role?.name === 'Administrador') {
    return "No puedes modificar a otro administrador"
  }
  
  return null
}

// Servicio principal
export const userService = {
  // Obtener todos los usuarios
  async getUsers() {
    const response = await fetch(`${API_URL}/users?populate=role`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error('Error al obtener los usuarios')
    }

    return await response.json()
  },

  // Obtener roles disponibles
  async getRoles() {
    const response = await fetch(`${API_URL}/users-permissions/roles`, {
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      }
    })

    if (!response.ok) {
      throw new Error('Error al obtener los roles')
    }

    const data = await response.json()
    return data.roles || []
  },

  // Actualizar rol de usuario
  async updateUserRole(userId, roleId) {
    const jwt = getJWT()
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        role: roleId
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Error al actualizar el rol')
    }

    return await response.json()
  },

  // Actualizar estado de bloqueo
  async updateUserBlockStatus(userId, blocked) {
    const jwt = getJWT()
    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify({
        blocked: blocked
      })
    })

    if (!response.ok) {
      throw new Error('Error al actualizar el estado del usuario')
    }

    return await response.json()
  },

  // ✅ Nueva función: Actualizar datos generales de usuario (nombre, apellido, carrera, email, etc.)
  async updateUser(userId, data) {
    const jwt = getJWT()
    if (!jwt) throw new Error("Token JWT no encontrado")

    const response = await fetch(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${jwt}`
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error?.message || 'Error al actualizar el usuario')
    }

    return await response.json()
  }
}
