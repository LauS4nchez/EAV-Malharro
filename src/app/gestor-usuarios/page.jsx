// app/gestor-usuarios/page.jsx
'use client'

import { useState, useEffect } from 'react'
import { API_URL, API_TOKEN } from '@/app/config'
import styles from '@/styles/components/GestorUsuarios.module.css'

export default function GestorUsuarios() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await fetch(`${API_URL}/users`, {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`
          }
        })

        if (!response.ok) {
          throw new Error('Error al obtener los usuarios')
        }

        const usersData = await response.json()
        setUsers(usersData)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching users:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('es-ES')
  }

  const getRoleDisplayName = (role) => {
    const roleMap = {
      'Authenticated': 'Autenticado',
      'Public': 'Público',
      'Estudiante': 'Estudiante',
      'Profesor': 'Profesor',
      'Administrador': 'Administrador'
    }
    return roleMap[role] || role
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
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>Gestor de Usuarios</h1>
        <p className={styles.subtitle}>
          Total de usuarios: {users.length}
        </p>
      </div>

      <div className={styles.tableContainer}>
        <table className={styles.usersTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Confirmado</th>
              <th>Bloqueado</th>
              <th>Creado</th>
              <th>Actualizado</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className={styles.idCell}>{user.id}</td>
                <td className={styles.usernameCell}>
                  <strong>{user.username}</strong>
                </td>
                <td className={styles.emailCell}>{user.email}</td>
                <td className={styles.roleCell}>
                  <span className={`${styles.roleBadge} ${styles[user.role?.name || 'Public']}`}>
                    {getRoleDisplayName(user.role?.name || 'Public')}
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
            ))}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className={styles.empty}>
          <p>No se encontraron usuarios</p>
        </div>
      )}
    </div>
  )
}