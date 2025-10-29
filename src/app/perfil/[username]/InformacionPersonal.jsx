'use client';

import { useState, useEffect } from 'react';
import { API_URL, API_TOKEN } from "@/app/config";
import styles from "@/styles/components/Perfil/PerfilPublico.module.css";
import toast from 'react-hot-toast';

export default function InformacionPersonal({ userData, isCurrentUser, onAvatarUpdate, onUserDataUpdate, onAvatarOverlayChange }) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Inicializar formData cuando userData cambia
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData?.name || '',
        surname: userData?.surname || '',
        carrera: userData?.carrera || '',
      });
    }
  }, [userData]);

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
    onAvatarOverlayChange(true); // ✅ Usar la función pasada como prop
    setSuccessMessage('');
    setError('');
  };

  const handleCancel = () => {
    setEditing(false);
    onAvatarOverlayChange(false); // ✅ Usar la función pasada como prop
    setFormData({
      name: userData?.name || '',
      surname: userData?.surname || '',
      carrera: userData?.carrera || '',
    });
    setError('');
  };

  const handleSave = async () => {
    try {
      setSaveLoading(true);
      setError('');
      const jwt = localStorage.getItem("jwt");
      
      const updateData = {
        name: formData.name,
        surname: formData.surname,
        carrera: formData.carrera,
      };

      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        let errorDetails = 'Error al actualizar los datos';
        try {
          const errorData = await response.json();
          errorDetails = errorData.error?.message || JSON.stringify(errorData);
        } catch (e) {
          errorDetails = await response.text();
        }
        throw new Error(`Error ${response.status}: ${errorDetails}`);
      }

      const result = await response.json();
      
      // Actualizar datos en el componente padre
      onUserDataUpdate(updateData);
      
      setEditing(false);
      onAvatarOverlayChange(false); // ✅ Ocultar overlay al guardar
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
      setError('');
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

      // 5. Actualizar el estado en el componente padre
      onAvatarUpdate(updatedUserData.avatar);
      
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

  if (!userData) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando información...</p>
      </div>
    );
  }

  return (
    <div className={styles.informacionPersonal}>
      {/* Header compacto */}
      <div className={styles.infoHeader}>
        <h2 className={styles.infoTitle}>Información Personal</h2>
        {isCurrentUser && !editing && (
          <button 
            onClick={handleEdit}
            className={styles.editInfoButton}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
            </svg>
            Editar
          </button>
        )}
        {isCurrentUser && editing && (
          <div className={styles.editActions}>
            <button 
              onClick={handleSave}
              className={styles.saveInfoButton}
              disabled={saveLoading}
            >
              {saveLoading ? 'Guardando...' : 'Guardar'}
            </button>
            <button 
              onClick={handleCancel}
              className={styles.cancelInfoButton}
              disabled={saveLoading}
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {/* Mensajes de estado */}
      {successMessage && (
        <div className={styles.successMessage}>
          <p className={styles.successText}>{successMessage}</p>
        </div>
      )}

      {error && (
        <div className={styles.errorMessage}>
          <p className={styles.errorText}>Error: {error}</p>
        </div>
      )}

      {/* Información del usuario - Layout de dos columnas */}
      <div className={styles.infoGrid}>
        <div className={styles.infoColumn}>
          <div className={styles.infoItem}>
            <label className={styles.infoLabel}>Usuario</label>
            <div className={styles.infoValue}>
              <span className={styles.infoText}>{userData.username || 'No especificado'}</span>
            </div>
          </div>

          <div className={styles.infoItem}>
            <label className={styles.infoLabel}>Email</label>
            <div className={styles.emailContainer}>
              <div className={styles.infoValue}>
                <span className={styles.infoText}>
                  {showEmail ? userData.email : getCensoredEmail(userData.email)}
                </span>
              </div>
              {isCurrentUser && (
                <button 
                  type="button"
                  onClick={toggleEmailVisibility}
                  className={styles.emailToggle}
                  title={showEmail ? 'Ocultar email' : 'Mostrar email'}
                >
                  {showEmail ? 'Ocultar' : 'Mostrar'}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className={styles.infoColumn}>
          <div className={styles.infoItem}>
            <label className={styles.infoLabel}>Nombre</label>
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
              <div className={styles.infoValue}>
                <span className={styles.infoText}>{userData.name || 'No especificado'}</span>
              </div>
            )}
          </div>

          <div className={styles.infoItem}>
            <label className={styles.infoLabel}>Apellido</label>
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
              <div className={styles.infoValue}>
                <span className={styles.infoText}>{userData.surname || 'No especificado'}</span>
              </div>
            )}
          </div>

          <div className={styles.infoItem}>
            <label className={styles.infoLabel}>Carrera</label>
            {editing ? (
              <select
                value={formData.carrera}
                onChange={(e) => handleInputChange('carrera', e.target.value)}
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
              <div className={styles.infoValue}>
                <span className={styles.infoText}>{userData.carrera || 'No especificada'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input oculto para avatar */}
      {isCurrentUser && (
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className={styles.avatarUploadInput}
          disabled={avatarUploading}
          style={{ display: 'none' }}
        />
      )}
    </div>
  );
}