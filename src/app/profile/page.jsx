'use client';

import { useState, useEffect } from 'react';
import { API_URL } from "@/app/config";
import { logout } from '../componentes/login/Logout';
import styles from "../../styles/components/Perfil.module.css";

export default function PerfilPage() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showEmail, setShowEmail] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const jwt = localStorage.getItem("jwt");
        
        if (!jwt) {
          setError("No estás autenticado");
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: No se pudieron obtener los datos del usuario`);
        }

        const userData = await response.json();
        console.log('User data received:', userData);
        setUserData(userData);
        setFormData({
          name: userData.name || '',
          surname: userData.surname || '',
          Carrera: userData.Carrera || '',
        });
        
      } catch (err) {
        setError(err.message);
        console.error('Error fetching user data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Función para censurar el email
  const getCensoredEmail = (email) => {
    if (!email) return 'No especificado';
    
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    const visiblePart = username.substring(0, 3);
    const censoredPart = '*'.repeat(Math.max(username.length - 3, 5));
    return `${visiblePart}${censoredPart}@${domain}`;
  };

  const handleEdit = () => {
    setEditing(true);
    setSuccessMessage('');
    setError(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: userData.name || '',
      surname: userData.surname || '',
      Carrera: userData.Carrera || '',
    });
    setError(null);
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError(null);
      const jwt = localStorage.getItem("jwt");
      
      const updateData = {
        name: formData.name,
        surname: formData.surname,
        Carrera: formData.Carrera,
      };

      console.log('Sending update data:', updateData);

      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorDetails = 'Error al actualizar los datos';
        try {
          const errorData = await response.json();
          console.error('Error response details:', errorData);
          errorDetails = errorData.error?.message || JSON.stringify(errorData);
        } catch (e) {
          errorDetails = await response.text();
        }
        throw new Error(`Error ${response.status}: ${errorDetails}`);
      }

      const result = await response.json();
      console.log('Update successful:', result);
      
      setUserData(prev => ({
        ...prev,
        ...updateData,
        updatedAt: new Date().toISOString()
      }));
      
      setEditing(false);
      setSuccessMessage(result.message || 'Perfil actualizado correctamente');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
      
    } catch (err) {
      setError(err.message);
      console.error('Error updating user data:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleEmailVisibility = () => {
    setShowEmail(!showEmail);
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (error && !userData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <div className={styles.errorActions}>
          <button 
            onClick={() => window.location.reload()}
            className={styles.retryButton}
          >
            Reintentar
          </button>
          <button 
            onClick={() => window.location.href = "/login"}
            className={styles.loginButton}
          >
            Ir al Login
          </button>
        </div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className={styles.errorContainer}>
        <h2>No se encontraron datos del usuario</h2>
        <button 
          onClick={() => window.location.href = "/login"}
          className={styles.loginButton}
        >
          Iniciar Sesión
        </button>
      </div>
    );
  }

  return (
    <div className={styles.perfilContainer}>
      <div className={styles.perfilHeader}>
        <h1>Mi Perfil</h1>
        <div className={styles.headerButtons}>
          {!editing ? (
            <button 
              onClick={handleEdit}
              className={styles.editButton}
            >
              Editar Perfil
            </button>
          ) : (
            <div className={styles.editActions}>
              <button 
                onClick={handleSave}
                className={styles.saveButton}
                disabled={saveLoading}
              >
                {saveLoading ? 'Guardando...' : 'Guardar'}
              </button>
              <button 
                onClick={handleCancel}
                className={styles.cancelButton}
                disabled={saveLoading}
              >
                Cancelar
              </button>
            </div>
          )}
          <button 
            onClick={logout}
            className={styles.logoutButton}
          >
            Cerrar Sesión
          </button>
        </div>
      </div>

      <div className={styles.perfilContent}>
        {successMessage && (
          <div className={styles.successMessage}>
            <p>{successMessage}</p>
          </div>
        )}

        <div className={styles.infoSection}>
          {/* Avatar comentado por ahora
          <div className={styles.avatarContainer}>
            {userData.avatar ? (
              <img 
                src={`${API_URL}${userData.avatar.url}`} 
                alt="Avatar" 
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {userData.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
          </div>
          */}

          <div className={styles.userInfo}>
            <h2>Información Personal</h2>
            
            <div className={styles.infoGrid}>
              <div className={styles.infoItem}>
                <label>Usuario:</label>
                <span>{userData.username || 'No especificado'}</span>
              </div>
              
              <div className={styles.infoItem}>
                <label>Email:</label>
                <div className={styles.emailContainer}>
                  <span className={styles.emailText}>
                    {showEmail ? userData.email : getCensoredEmail(userData.email)}
                  </span>
                  <button 
                    type="button"
                    onClick={toggleEmailVisibility}
                    className={styles.emailToggle}
                    title={showEmail ? 'Ocultar email' : 'Mostrar email'}
                  >
                    {showEmail ? 'Ver' : 'Ver'}
                  </button>
                </div>
              </div>
              
              <div className={styles.infoItem}>
                <label>Nombre:</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={styles.editInput}
                    placeholder="Ingresa tu nombre"
                    disabled={saveLoading}
                    maxLength={20}
                  />
                ) : (
                  <span>{userData.name || 'No hay un nombre especificado'}</span>
                )}
              </div>
              
              <div className={styles.infoItem}>
                <label>Apellido:</label>
                {editing ? (
                  <input
                    type="text"
                    value={formData.surname}
                    onChange={(e) => handleInputChange('surname', e.target.value)}
                    className={styles.editInput}
                    placeholder="Ingresa tu apellido"
                    disabled={saveLoading}
                    maxLength={30}
                  />
                ) : (
                  <span>{userData.surname || 'No hay un apellido especificado'}</span>
                )}
              </div>
              
              <div className={styles.infoItem}>
                <label>Carrera:</label>
                {editing ? (
                  <select
                    value={formData.Carrera}
                    onChange={(e) => handleInputChange('Carrera', e.target.value)}
                    className={styles.editInput}
                    disabled={saveLoading}
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
                ) : (
                  <span>{userData.Carrera || 'No hay una carrera especificada'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && editing && (
          <div className={styles.errorMessage}>
            <p>Error al guardar: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}