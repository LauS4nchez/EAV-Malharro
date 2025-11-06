// @/app/gestor-usuarios/page.jsx
'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import {
  userService,
  getCurrentUserId,
  formatDate,
  getRoleDisplayName,
  getFieldValue,
  canModifyUser,
  getModificationWarning
} from '../componentes/validacion/userChanges'
import { checkUserRole } from '../componentes/validacion/checkRole'
import { applyAllFilters } from '../componentes/validacion/userFilters'
import UserFilters from './UserFilters'
import styles from '@/styles/components/Perfil/GestorUsuarios.module.css'
import Link from 'next/link'
import Header from '../componentes/construccion/Header'
import Footer from '../componentes/construccion/Footer'
import { API_URL, API_TOKEN } from '@/app/config'

export default function GestorUsuarios() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedUserId, setExpandedUserId] = useState(null)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [updatingUser, setUpdatingUser] = useState(null)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [currentUserRole, setCurrentUserRole] = useState(null)
  const [editingField, setEditingField] = useState(null)
  const [editValues, setEditValues] = useState({})
  const [deletingUser, setDeletingUser] = useState(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [userToDelete, setUserToDelete] = useState(null)
  const [jwt, setJwt] = useState(null)
  const router = useRouter()

  const [filters, setFilters] = useState({
    searchTerm: '',
    selectedRoles: [],
    blockedFilter: 'all',
    confirmedFilter: 'all',
    sortBy: 'id',
    sortOrder: 'asc'
  })

  useEffect(() => {
    const initializeData = async () => {
      try {
        setLoading(true)

        const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null
        setJwt(token || null)

        const userRole = await checkUserRole()
        setCurrentUserRole(userRole)

        if (userRole !== 'Administrador' && userRole !== 'SuperAdministrador') {
          router.push('/')
          return
        }

        await fetchUsers()
        await fetchRoles()
        setCurrentUserId(getCurrentUserId())
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [router])

  const fetchUsers = async () => {
    try {
      const usersData = await userService.getUsers()
      setUsers(usersData)
    } catch (err) {
      throw err
    }
  }

  const fetchRoles = async () => {
    try {
      const rolesData = await userService.getRoles()
      const filteredRoles = rolesData.filter(role =>
        role.name !== 'Public' && role.name !== 'SuperAdministrador'
      )
      setRoles(filteredRoles)
    } catch (err) {
      throw err
    }
  }

  const filteredUsers = useMemo(() => {
    return applyAllFilters(users, filters)
  }, [users, filters])

  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setCurrentPage(1)
  }

  const handleUserClick = (userId) => {
    setExpandedUserId(expandedUserId === userId ? null : userId)
    setEditingField(null)
  }

  const startEditing = (userId, field, currentValue) => {
    setEditingField({ userId, field })
    setEditValues(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: currentValue || ''
      }
    }))
  }

  const cancelEditing = () => {
    setEditingField(null)
  }

  const handleEditChange = (userId, field, value) => {
    setEditValues(prev => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: value
      }
    }))
  }

  /* ========================= Helpers de Notificación ========================= */

  const humanFieldName = (field) => {
    switch (field) {
      case 'username': return 'usuario'
      case 'name': return 'nombre'
      case 'surname': return 'apellido'
      case 'email': return 'email'
      case 'Carrera': return 'carrera'
      default: return field
    }
  }

  const getActorName = () => {
    const admin = users.find(u => u.id === currentUserId)
    if (!admin) return 'Administrador'
    if (admin.name || admin.surname) return `${admin.name || ''} ${admin.surname || ''}`.trim()
    return admin.username || 'Administrador'
  }

  async function crearNotificacionCambioUsuario({ receptorId, titulo, mensaje }) {
    // Si no hay token de sesión, intentamos con API_TOKEN (solo si existe y tiene permisos)
    const bearerChain = [jwt, API_TOKEN].filter(Boolean)

    const data = {
      titulo,
      mensaje,
      tipo: 'sistema',
      leida: 'no-leida',
      fechaEmision: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      receptor: Number(receptorId),
      emisor: Number(currentUserId)
    }

    for (const bearer of bearerChain) {
      try {
        const res = await fetch(`${API_URL}/notificaciones`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${bearer}`
          },
          body: JSON.stringify({ data })
        })
        if (res.ok) return true
        // Log mínimo en consola; no interrumpimos el flujo principal
        const j = await res.json().catch(() => null)
        console.warn('[noti:cambio-usuario] fallo POST', res.status, j?.error || j)
      } catch (e) {
        console.warn('[noti:cambio-usuario] error POST', e)
      }
    }
    return false
  }

  /* ========================= Guardar campo editable ========================= */

  const saveField = async (userId, field) => {
    try {
      setUpdatingUser(userId)

      const userToUpdate = users.find(user => user.id === userId)
      const currentUser = users.find(user => user.id === currentUserId)

      if (userId === currentUserId) {
        toast.error('No puedes modificar tu propia información')
        setUpdatingUser(null)
        setEditingField(null)
        return
      }

      if (!canModifyUser(currentUserId, currentUser, userToUpdate)) {
        toast.error('No tienes permisos para modificar este usuario')
        setUpdatingUser(null)
        setEditingField(null)
        return
      }

      const newValue = (editValues[userId]?.[field] ?? '').trim()
      const oldValue = (userToUpdate?.[field] ?? '').toString()

      if (field === 'username' && !newValue) {
        toast.error('El nombre de usuario no puede estar vacío')
        setUpdatingUser(null)
        return
      }
      if (field === 'name' && !newValue) {
        toast.error('El nombre no puede estar vacío')
        setUpdatingUser(null)
        return
      }
      if (field === 'surname' && !newValue) {
        toast.error('El apellido no puede estar vacío')
        setUpdatingUser(null)
        return
      }
      if (field === 'email' && !newValue) {
        toast.error('El email no puede estar vacío')
        setUpdatingUser(null)
        return
      }

      const updateData = { [field]: newValue }

      const updatePromise = userService.updateUser(userId, updateData)

      toast.promise(updatePromise, {
        loading: 'Actualizando información...',
        success: 'Información actualizada correctamente',
        error: 'Error al actualizar la información'
      })

      await updatePromise

      // Actualizar UI
      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, [field]: newValue }
          : user
      ))
      setEditingField(null)

      // Notificación al usuario modificado
      const actor = getActorName()
      const niceField = humanFieldName(field)
      const when = new Date().toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })
      const titulo = `Tu ${niceField} fue actualizado`
      const mensaje =
        `Se actualizó tu **${niceField}**: "${oldValue || '—'}" → "${newValue || '—'}". ` +
        `Realizado por **${actor}** a las ${when}.`

      crearNotificacionCambioUsuario({
        receptorId: userId,
        titulo,
        mensaje
      }).then(ok => {
        if (!ok) console.warn('[noti] No se pudo notificar el cambio de campo.')
      })

    } catch (err) {
      console.error('Error updating user field:', err)
    } finally {
      setUpdatingUser(null)
    }
  }

  // Modal eliminar
  const openDeleteModal = (userId) => {
    const user = users.find(user => user.id === userId)
    const currentUser = users.find(user => user.id === currentUserId)

    if (userId === currentUserId) {
      toast.error('No puedes eliminar tu propia cuenta')
      return
    }

    if (!canModifyUser(currentUserId, currentUser, user)) {
      toast.error('No tienes permisos para eliminar este usuario')
      return
    }

    if (currentUser?.role?.name === 'Administrador' &&
        user?.role?.name === 'Administrador') {
      toast.error('No puedes eliminar a otro administrador')
      return
    }

    if (currentUser?.role?.name === 'Administrador' &&
        user?.role?.name === 'SuperAdministrador') {
      toast.error('No puedes eliminar a un Super Administrador')
      return
    }

    setUserToDelete(user)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setUserToDelete(null)
  }

  const confirmDeleteUser = async () => {
    if (!userToDelete) return

    try {
      setDeletingUser(userToDelete.id)

      const deletePromise = userService.deleteUser(userToDelete.id)

      toast.promise(deletePromise, {
        loading: 'Eliminando usuario...',
        success: 'Usuario eliminado correctamente',
        error: 'Error al eliminar el usuario'
      })

      await deletePromise

      setUsers(users.filter(user => user.id !== userToDelete.id))

      if (expandedUserId === userToDelete.id) {
        setExpandedUserId(null)
      }

      // Nota: no enviamos notificación porque el usuario ya no existirá.
      closeDeleteModal()

    } catch (err) {
      console.error('Error deleting user:', err)
    } finally {
      setDeletingUser(null)
    }
  }

  const handleRoleChange = async (userId, newRoleId) => {
    try {
      setUpdatingUser(userId)

      const selectedRole = roles.find(role => role.id === parseInt(newRoleId))
      const userToUpdate = users.find(user => user.id === userId)
      const currentUser = users.find(user => user.id === currentUserId)

      if (userId === currentUserId) {
        toast.error('No puedes modificar tu propio rol')
        setUpdatingUser(null)
        return
      }

      if (currentUser?.role?.name === 'Administrador' &&
          userToUpdate?.role?.name === 'Administrador' &&
          selectedRole?.name !== 'Administrador') {
        toast.error('No puedes quitar el rol de Administrador a otro administrador')
        setUpdatingUser(null)
        return
      }

      if (currentUser?.role?.name === 'Administrador' &&
          userToUpdate?.role?.name === 'SuperAdministrador' &&
          selectedRole?.name !== 'SuperAdministrador') {
        toast.error('No puedes quitar el rol de Administrador a otro administrador')
        setUpdatingUser(null)
        return
      }

      if (selectedRole?.name === 'SuperAdministrador') {
        toast.error('No puedes asignar el rol de Super Administrador')
        setUpdatingUser(null)
        return
      }

      const updatePromise = userService.updateUserRole(userId, newRoleId)

      toast.promise(updatePromise, {
        loading: 'Actualizando rol...',
        success: 'Rol actualizado correctamente',
        error: 'Error al actualizar el rol'
      })

      await updatePromise

      setUsers(users.map(user =>
        user.id === userId
          ? {
              ...user,
              role: {
                id: selectedRole?.id,
                name: selectedRole?.name,
                type: selectedRole?.type
              }
            }
          : user
      ))

      // Notificación de cambio de rol
      const actor = getActorName()
      const when = new Date().toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })
      const titulo = 'Tu rol fue actualizado'
      const mensaje =
        `Tu **rol** ahora es **${getRoleDisplayName(selectedRole?.name)}**. ` +
        `Realizado por **${actor}** a las ${when}.`

      crearNotificacionCambioUsuario({
        receptorId: userId,
        titulo,
        mensaje
      }).then(ok => {
        if (!ok) console.warn('[noti] No se pudo notificar el cambio de rol.')
      })

    } catch (err) {
      console.error('Error updating user role:', err)
    } finally {
      setUpdatingUser(null)
    }
  }

  const handleBlockUser = async (userId, block) => {
    try {
      setUpdatingUser(userId)

      const userToUpdate = users.find(user => user.id === userId)
      const currentUser = users.find(user => user.id === currentUserId)

      if (userId === currentUserId) {
        toast.error('No puedes bloquear tu propia cuenta')
        setUpdatingUser(null)
        return
      }

      if (currentUser?.role?.name === 'Administrador' &&
          userToUpdate?.role?.name === 'Administrador') {
        toast.error('No puedes bloquear a otro administrador')
        setUpdatingUser(null)
        return
      }

      if (currentUser?.role?.name === 'Administrador' &&
          userToUpdate?.role?.name === 'SuperAdministrador') {
        toast.error('No puedes bloquear a otro Superadministrador')
        setUpdatingUser(null)
        return
      }

      const action = block ? 'bloquear' : 'desbloquear'
      const updatePromise = userService.updateUserBlockStatus(userId, block)

      toast.promise(updatePromise, {
        loading: `${block ? 'Bloqueando' : 'Desbloqueando'} usuario...`,
        success: `Usuario ${block ? 'bloqueado' : 'desbloqueado'} correctamente`,
        error: `Error al ${action} el usuario`
      })

      await updatePromise

      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, blocked: block }
          : user
      ))

      // Notificación de bloqueo/desbloqueo
      const actor = getActorName()
      const when = new Date().toLocaleString('es-AR', { hour: '2-digit', minute: '2-digit' })
      const titulo = block ? 'Tu cuenta fue bloqueada' : 'Tu cuenta fue desbloqueada'
      const mensaje = block
        ? `Tu cuenta fue **bloqueada** por **${actor}** a las ${when}.`
        : `Tu cuenta fue **desbloqueada** por **${actor}** a las ${when}.`

      crearNotificacionCambioUsuario({
        receptorId: userId,
        titulo,
        mensaje
      }).then(ok => {
        if (!ok) console.warn('[noti] No se pudo notificar el cambio de estado (bloqueo).')
      })

    } catch (err) {
      console.error('Error updating user block status:', err)
    } finally {
      setUpdatingUser(null)
    }
  }

  const getUserModificationStatus = (user) => {
    const currentUser = users.find(u => u.id === currentUserId)
    const isCurrentUser = user.id === currentUserId
    const canModify = canModifyUser(currentUserId, currentUser, user)
    const modificationWarning = getModificationWarning(currentUserId, currentUser, user)

    return {
      isCurrentUser,
      canModify,
      modificationWarning,
      isRoleChangeDisabled: updatingUser === user.id || roles.length === 0 || !canModify || isCurrentUser,
      isBlockActionDisabled: updatingUser === user.id || !canModify || isCurrentUser,
      isFieldEditingDisabled: updatingUser === user.id || !canModify || isCurrentUser,
      isDeleteDisabled: deletingUser === user.id || !canModify || isCurrentUser
    }
  }

  const indexOfLastUser = currentPage * itemsPerPage
  const indexOfFirstUser = indexOfLastUser - itemsPerPage
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)

  const handleItemsPerPageChange = (value) => {
    setItemsPerPage(parseInt(value))
    setCurrentPage(1)
  }

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page)
    }
  }

  if (currentUserRole && currentUserRole !== 'Administrador' && currentUserRole !== 'SuperAdministrador') {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a esta página.</p>
          <Link href="/" className={styles.backButton}>
            Volver al Inicio
          </Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>
          <p>Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <h2>Error</h2>
          <p>{error}</p>
          <Link href="/" className={styles.backButton}>
            Volver al Inicio
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <Header variant='dark'/>
            <span className={`${styles.currentRoleInfo} mt-5`}>
              Rol actual: {getRoleDisplayName(currentUserRole)}
            </span>
          </div>
          <h1>Gestor de Usuarios</h1>
          <p className={styles.subtitle}>
            Total de usuarios: {users.length} | Mostrando: {filteredUsers.length}
          </p>
        </div>

        <UserFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          availableRoles={roles}
          totalUsers={users.length}
          filteredCount={filteredUsers.length}
        />

        <div className={styles.tableContainer}>
          <table className={styles.usersTable}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Usuario</th>
                <th>Email</th>
                <th className={styles.roleHeader}>Rol</th>
                <th>Confirmado</th>
                <th>Bloqueado</th>
                <th>Creado</th>
                <th>Actualizado</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map((user) => {
                const {
                  isCurrentUser,
                  canModify,
                  modificationWarning,
                  isRoleChangeDisabled,
                  isBlockActionDisabled,
                  isFieldEditingDisabled,
                  isDeleteDisabled
                } = getUserModificationStatus(user)

                return (
                  <React.Fragment key={user.id}>
                    <tr
                      className={`${styles.userRow} ${expandedUserId === user.id ? styles.expanded : ''}`}
                      onClick={() => handleUserClick(user.id)}
                    >
                      <td className={styles.idCell}>{user.id}</td>
                      <td className={`${styles.usernameCell} mb-1`}>
                        {user.username}
                        {isCurrentUser && <span className={styles.youBadge}>Vos</span>}
                      </td>
                      <td className={styles.emailCell}>{user.email}</td>
                      <td className={styles.roleCell}>
                        <span className={`${styles.roleBadge} ${styles[user.role?.name || 'Public']}`}>
                          {getRoleDisplayName(user.role?.name || 'Autenticado')}
                        </span>
                      </td>
                      <td className={styles.confirmedCell}>
                        <span className={user.confirmed ? styles.confirmed : styles.notConfirmed}>
                          {user.confirmed ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className={styles.blockedCell}>
                        <span className={user.blocked ? styles.blocked : styles.notBlocked}>
                          {user.blocked ? 'Sí' : 'No'}
                        </span>
                      </td>
                      <td className={styles.dateCell}>{formatDate(user.createdAt)}</td>
                      <td className={styles.dateCell}>{formatDate(user.updatedAt)}</td>
                    </tr>

                    {expandedUserId === user.id && (
                      <tr className={styles.expandedRow}>
                        <td colSpan="8" className={styles.expandedContent}>
                          <div className={styles.userDetails}>
                            <div className={styles.detailsHeader}>
                              <h3>Detalles del Usuario - {user.username}</h3>
                              {isCurrentUser && (
                                <span className={styles.youIndicator}>¡Este sos vos!</span>
                              )}
                            </div>

                            <div className={styles.detailsGrid}>
                              <div className={styles.detailItem}>
                                <label>Usuario:</label>
                                <div className={styles.fieldContainer}>
                                  {editingField?.userId === user.id && editingField?.field === 'username' ? (
                                    <div className={styles.editField}>
                                      <input
                                        type="text"
                                        value={editValues[user.id]?.username ?? ''}
                                        onChange={(e) => handleEditChange(user.id, 'username', e.target.value)}
                                        className={styles.editInput}
                                        autoFocus
                                        placeholder="Nombre de usuario"
                                      />
                                      <div className={styles.editActions}>
                                        <button
                                          onClick={() => saveField(user.id, 'username')}
                                          disabled={updatingUser === user.id}
                                          className={styles.saveBtn}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className={styles.cancelBtn}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={styles.fieldWithEdit}>
                                      <span className={styles.fieldValue}>{user.username || 'No especificado'}</span>
                                      {!isFieldEditingDisabled && (
                                        <button
                                          onClick={() => startEditing(user.id, 'username', user.username)}
                                          className={styles.editBtn}
                                          title="Editar usuario"
                                        >
                                          ✎
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={styles.detailItem}>
                                <label>Nombre:</label>
                                <div className={styles.fieldContainer}>
                                  {editingField?.userId === user.id && editingField?.field === 'name' ? (
                                    <div className={styles.editField}>
                                      <input
                                        type="text"
                                        value={editValues[user.id]?.name ?? ''}
                                        onChange={(e) => handleEditChange(user.id, 'name', e.target.value)}
                                        className={styles.editInput}
                                        autoFocus
                                        placeholder="Nombre"
                                      />
                                      <div className={styles.editActions}>
                                        <button
                                          onClick={() => saveField(user.id, 'name')}
                                          disabled={updatingUser === user.id}
                                          className={styles.saveBtn}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className={styles.cancelBtn}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={styles.fieldWithEdit}>
                                      <span className={styles.fieldValue}>{user.name || 'No especificado'}</span>
                                      {!isFieldEditingDisabled && (
                                        <button
                                          onClick={() => startEditing(user.id, 'name', user.name)}
                                          className={styles.editBtn}
                                          title="Editar nombre"
                                        >
                                          ✎
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={styles.detailItem}>
                                <label>Apellido:</label>
                                <div className={styles.fieldContainer}>
                                  {editingField?.userId === user.id && editingField?.field === 'surname' ? (
                                    <div className={styles.editField}>
                                      <input
                                        type="text"
                                        value={editValues[user.id]?.surname ?? ''}
                                        onChange={(e) => handleEditChange(user.id, 'surname', e.target.value)}
                                        className={styles.editInput}
                                        autoFocus
                                        placeholder="Apellido"
                                      />
                                      <div className={styles.editActions}>
                                        <button
                                          onClick={() => saveField(user.id, 'surname')}
                                          disabled={updatingUser === user.id}
                                          className={styles.saveBtn}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className={styles.cancelBtn}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={styles.fieldWithEdit}>
                                      <span className={styles.fieldValue}>{user.surname || 'No especificado'}</span>
                                      {!isFieldEditingDisabled && (
                                        <button
                                          onClick={() => startEditing(user.id, 'surname', user.surname)}
                                          className={styles.editBtn}
                                          title="Editar apellido"
                                        >
                                          ✎
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={styles.detailItem}>
                                <label>Carrera:</label>
                                <div className={styles.fieldContainer}>
                                  {editingField?.userId === user.id && editingField?.field === 'Carrera' ? (
                                    <div className={styles.editField}>
                                      <select
                                        value={editValues[user.id]?.Carrera ?? ''}
                                        onChange={(e) => handleEditChange(user.id, 'Carrera', e.target.value)}
                                        className={styles.editInput}
                                        autoFocus
                                      >
                                        <option value="">Selecciona una carrera</option>
                                        <option value="Diseño Gráfico">Diseño Gráfico</option>
                                        <option value="Escenografía">Escenografía</option>
                                        <option value="Fotografía">Fotografía</option>
                                        <option value="Ilustración">Ilustración</option>
                                        <option value="Medios Audiovisuales">Medios Audiovisuales</option>
                                        <option value="Profesorado">Profesorado</option>
                                        <option value="Realizador en Artes Visuales">Realizador en Artes Visuales</option>
                                      </select>
                                      <div className={styles.editActions}>
                                        <button
                                          onClick={() => saveField(user.id, 'Carrera')}
                                          disabled={updatingUser === user.id}
                                          className={styles.saveBtn}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className={styles.cancelBtn}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={styles.fieldWithEdit}>
                                      <span className={styles.fieldValue}>{user.Carrera || 'No especificada'}</span>
                                      {!isFieldEditingDisabled && (
                                        <button
                                          onClick={() => startEditing(user.id, 'Carrera', user.Carrera)}
                                          className={styles.editBtn}
                                          title="Editar carrera"
                                        >
                                          ✎
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={styles.detailItem}>
                                <label>Email:</label>
                                <div className={styles.fieldContainer}>
                                  {editingField?.userId === user.id && editingField?.field === 'email' ? (
                                    <div className={styles.editField}>
                                      <input
                                        type="email"
                                        value={editValues[user.id]?.email ?? ''}
                                        onChange={(e) => handleEditChange(user.id, 'email', e.target.value)}
                                        className={styles.editInput}
                                        autoFocus
                                        placeholder="Email"
                                      />
                                      <div className={styles.editActions}>
                                        <button
                                          onClick={() => saveField(user.id, 'email')}
                                          disabled={updatingUser === user.id}
                                          className={styles.saveBtn}
                                        >
                                          ✓
                                        </button>
                                        <button
                                          onClick={cancelEditing}
                                          className={styles.cancelBtn}
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className={styles.fieldWithEdit}>
                                      <span className={styles.fieldValue}>{user.email || 'No especificado'}</span>
                                      {!isFieldEditingDisabled && (
                                        <button
                                          onClick={() => startEditing(user.id, 'email', user.email)}
                                          className={styles.editBtn}
                                          title="Editar email"
                                        >
                                          ✎
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className={styles.detailItem}>
                                <label>Rol Actual:</label>
                                <span className={`${styles.currentRole} ${styles.fieldValue}`}>
                                  {getRoleDisplayName(user.role?.name || 'Autenticado')}
                                </span>
                              </div>
                            </div>

                            {modificationWarning && (
                              <div className={styles.modificationWarning}>
                                {modificationWarning}
                              </div>
                            )}

                            <div className={styles.actions}>
                              <div className={styles.actionGroup}>
                                <label>Cambiar Rol:</label>
                                <select
                                  value={user.role?.id || ''}
                                  onChange={(e) => handleRoleChange(user.id, e.target.value)}
                                  disabled={isRoleChangeDisabled}
                                  className={styles.roleSelect}
                                >
                                  <option value="">Seleccionar rol...</option>
                                  {roles.map((role) => (
                                    <option key={role.id} value={role.id}>
                                      {getRoleDisplayName(role.name)}
                                    </option>
                                  ))}
                                </select>
                                {isRoleChangeDisabled && !updatingUser && (
                                  <span className={styles.disabledReason}>
                                    {isCurrentUser
                                      ? "No puedes modificar tu propio rol"
                                      : !canModify
                                        ? "No tienes permisos para modificar este usuario"
                                        : "No disponible"
                                    }
                                  </span>
                                )}
                              </div>

                              <div className={styles.actionGroup}>
                                <label>Estado:</label>
                                <div className={styles.blockButtons}>
                                  <button
                                    onClick={() => handleBlockUser(user.id, true)}
                                    disabled={user.blocked || isBlockActionDisabled}
                                    className={`${styles.blockBtn} ${user.blocked || isBlockActionDisabled ? styles.disabled : ''}`}
                                  >
                                    Bloquear
                                  </button>
                                  <button
                                    onClick={() => handleBlockUser(user.id, false)}
                                    disabled={!user.blocked || isBlockActionDisabled}
                                    className={`${styles.unblockBtn} ${!user.blocked || isBlockActionDisabled ? styles.disabled : ''}`}
                                  >
                                    Desbloquear
                                  </button>
                                </div>
                                {isBlockActionDisabled && !updatingUser && (
                                  <span className={styles.disabledReason}>
                                    {isCurrentUser
                                      ? "No puedes bloquear tu propia cuenta"
                                      : !canModify
                                        ? "No tienes permisos para bloquear este usuario"
                                        : "No disponible"
                                    }
                                  </span>
                                )}
                              </div>

                              <div className={styles.actionGroup}>
                                <label>Eliminar Usuario:</label>
                                <button
                                  onClick={() => openDeleteModal(user.id)}
                                  disabled={isDeleteDisabled}
                                  className={`${styles.deleteBtn} ${isDeleteDisabled ? styles.disabled : ''}`}
                                >
                                  Eliminar Usuario
                                </button>
                                {isDeleteDisabled && !deletingUser && (
                                  <span className={styles.disabledReason}>
                                    {isCurrentUser
                                      ? "No puedes eliminar tu propia cuenta"
                                      : !canModify
                                        ? "No tienes permisos para eliminar este usuario"
                                        : "No disponible"
                                    }
                                  </span>
                                )}
                              </div>
                            </div>

                            {updatingUser === user.id && (
                              <div className={styles.updating}>
                                Actualizando...
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className={styles.paginationContainer}>
          <div className={styles.itemsPerPage}>
            <span className={styles.paginationText}>Mostrar </span>
            <select
              value={itemsPerPage}
              onChange={(e) => handleItemsPerPageChange(e.target.value)}
              className={styles.pageSelect}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className={styles.paginationText}> entradas por página</span>
          </div>

          <div className={styles.pagination}>
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className={styles.pageButton}
            >
              ‹
            </button>

            <span className={styles.pageInfo}>
              Página {currentPage} de {totalPages}
            </span>

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className={styles.pageButton}
            >
              ›
            </button>
          </div>
        </div>

        {filteredUsers.length === 0 && (
          <div className={styles.empty}>
            <p>No se encontraron usuarios{users.length > 0 ? ' con los filtros aplicados' : ''}</p>
            <Link href="/" className={styles.backButton}>
              Volver al Inicio
            </Link>
          </div>
        )}
      </div>

      {/* Modal de confirmación para eliminar usuario */}
      {showDeleteModal && userToDelete && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Confirmar Eliminación</h3>
            </div>
            <div className={styles.modalBody}>
              <p>
                ¿Estás seguro de que quieres eliminar al usuario <strong>"{userToDelete.username}"</strong>?
              </p>
              <p className={styles.warningText}>
                Esta acción no se puede deshacer. Se eliminarán todos los datos del usuario permanentemente.
              </p>
            </div>
            <div className={styles.modalActions}>
              <button
                onClick={closeDeleteModal}
                className={styles.cancelModalBtn}
                disabled={deletingUser === userToDelete.id}
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteUser}
                className={styles.confirmDeleteBtn}
                disabled={deletingUser === userToDelete.id}
              >
                {deletingUser === userToDelete.id ? 'Eliminando...' : 'Eliminar Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer/>
    </div>
  )
}
