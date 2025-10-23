// componentes/login/InformacionPersonal.jsx
'use client';

import { useState, useEffect } from 'react';
import { API_URL, API_TOKEN } from "@/app/config";
import { logout } from '@/app/componentes/login/Logout';
import styles from "@/styles/components/Perfil.module.css";

export default function InformacionPersonal() {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    const jwt = localStorage.getItem("jwt");

    const fetchUserData = async () => {
      try {
        // Primero obtenemos el ID del usuario con el endpoint normal
        const meResponse = await fetch(`${API_URL}/users/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json',
          },
        });

        if (!meResponse.ok) {
          throw new Error(`Error ${meResponse.status}: No se pudieron obtener los datos del usuario`);
        }

        const meData = await meResponse.json();
        console.log('Me data:', meData);
        
        // Luego obtenemos los datos completos con avatar usando el API Token
        const userResponse = await fetch(`${API_URL}/users/${meData.id}?populate=avatar`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });

        if (!userResponse.ok) {
          throw new Error(`Error ${userResponse.status}: No se pudieron obtener los datos completos del usuario`);
        }

        const userDataResponse = await userResponse.json();
        console.log('User data with avatar:', userDataResponse);
        
        // En Strapi v5 los datos vienen directamente en el objeto, sin attributes
        const userData = userDataResponse.data || userDataResponse;
        console.log('User data:', userData);
        console.log('Avatar data:', userData?.avatar);
        
        setUserData(userData);
        setFormData({
          name: userData?.name || '',
          surname: userData?.surname || '',
          Carrera: userData?.Carrera || '',
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

  // Función para censurar el email - siempre 5 asteriscos
  const getCensoredEmail = (email) => {
    if (!email) return 'No especificado';
    
    const [username, domain] = email.split('@');
    if (!username || !domain) return email;
    
    const visiblePart = username.substring(0, 3);
    return `${visiblePart}*****@${domain}`;
  };

  const handleEdit = () => {
    setEditing(true);
    setSuccessMessage('');
    setError(null);
  };

  const handleCancel = () => {
    setEditing(false);
    setFormData({
      name: userData?.name || '',
      surname: userData?.surname || '',
      Carrera: userData?.Carrera || '',
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
        ...updateData
      }));
      
      setEditing(false);
      setSuccessMessage('Perfil actualizado correctamente');
      
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

  const handleAvatarChange = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecciona un archivo de imagen válido');
      return;
    }

    // Validar tamaño (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen debe ser menor a 5MB');
      return;
    }

    try {
      setAvatarUploading(true);
      setError(null);
      const jwt = localStorage.getItem("jwt");

      // 1. Primero obtenemos el ID del usuario actual
      const meResponse = await fetch(`${API_URL}/users/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      });

      if (!meResponse.ok) {
        throw new Error('Error al obtener datos del usuario');
      }

      const meData = await meResponse.json();
      const userId = meData.id;

      // 2. Subir la imagen usando el API Token
      const formData = new FormData();
      formData.append('files', file);

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Error al subir la imagen');
      }

      const uploadData = await uploadResponse.json();
      const avatarId = uploadData[0].id;

      console.log('Avatar uploaded with ID:', avatarId);

      // 3. Actualizar el usuario con el nuevo avatar usando el API Token
      const updateResponse = await fetch(`${API_URL}/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar: avatarId
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Error al actualizar el avatar del usuario');
      }

      const updateData = await updateResponse.json();
      console.log('User updated:', updateData);

      // 4. Obtener los datos actualizados del usuario con el avatar
      const userResponse = await fetch(`${API_URL}/users/${userId}?populate=avatar`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        throw new Error('Error al obtener datos actualizados');
      }

      const userDataResponse = await userResponse.json();
      const updatedUserData = userDataResponse.data || userDataResponse;

      // 5. Actualizar el estado local
      setUserData(updatedUserData);
      setSuccessMessage('Avatar actualizado correctamente');
      
      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);

    } catch (err) {
      setError(err.message);
      console.error('Error updating avatar:', err);
    } finally {
      setAvatarUploading(false);
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

  // Verificar JWT antes de renderizar
  useEffect(() => {
    const jwt = localStorage.getItem("jwt");
    if (!jwt) {
      window.location.href = "/";
      return;
    }
  }, []);

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
          <div className={styles.avatarContainer}>
            {userData.avatar?.url ? (
              <img 
                src={userData.avatar.url} 
                alt="Avatar" 
                className={styles.avatar}
                onError={(e) => {
                  console.error('Error loading avatar');
                  e.target.style.display = 'none';
                }}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {userData.username?.charAt(0).toUpperCase() || 'U'}
              </div>
            )}
            
            {editing && (
              <div className={styles.avatarEditOverlay}>
                <label htmlFor="avatar-upload" className={styles.avatarUploadLabel}>
                  {avatarUploading ? 'Subiendo...' : 'Cambiar foto'}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className={styles.avatarUploadInput}
                  disabled={avatarUploading}
                />
              </div>
            )}
          </div>

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
                    {showEmail ? 'Ocultar' : 'Mostrar'}
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
                  <span>{userData.Carrera || 'No se ha especificado una carrera'}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className={styles.errorMessage}>
            <p>Error: {error}</p>
          </div>
        )}
      </div>
    </div>
  );
}