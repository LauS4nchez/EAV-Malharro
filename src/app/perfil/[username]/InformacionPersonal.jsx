'use client';

import { useState, useEffect } from 'react';
import { API_URL, API_TOKEN } from '@/app/config';
import { isNativePlatform, openMediaPicker } from '@/app/utils/mediaPicker';
import styles from '@/styles/components/Perfil/PerfilPublico.module.css';
import toast from 'react-hot-toast';

export default function InformacionPersonal({
  userData,
  isCurrentUser,
  onAvatarUpdate,
  onUserDataUpdate,
  onAvatarOverlayChange,
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showEmail, setShowEmail] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});

  const CARRERAS_VALIDAS = [
    'Diseño Gráfico',
    'Escenografía',
    'Fotografía',
    'Ilustración',
    'Medios Audiovisuales',
    'Profesorado',
    'Realizador en Artes Visuales',
  ];

  // Inicializar formData cuando userData cambia
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData?.name || '',
        surname: userData?.surname || '',
        carrera: userData?.carrera || '',
      });
      setFieldErrors({});
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

  // Validación inteligente
  const validarFormulario = (data) => {
    const errors = {};

    const limpiar = (v) => (typeof v === 'string' ? v.trim() : v);

    const name = limpiar(data.name);
    const surname = limpiar(data.surname);
    const carrera = limpiar(data.carrera);

    // Nombre
    if (!name) {
      errors.name = 'El nombre es obligatorio';
    } else if (name.length < 2) {
      errors.name = 'El nombre debe tener al menos 2 caracteres';
    } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) {
      errors.name = 'El nombre solo puede tener letras y espacios';
    }

    // Apellido
    if (!surname) {
      errors.surname = 'El apellido es obligatorio';
    } else if (surname.length < 2) {
      errors.surname = 'El apellido debe tener al menos 2 caracteres';
    } else if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(surname)) {
      errors.surname = 'El apellido solo puede tener letras y espacios';
    }

    // Carrera (opcional, pero si elige, que sea una de la lista)
    if (carrera && !CARRERAS_VALIDAS.includes(carrera)) {
      errors.carrera = 'Seleccioná una carrera válida';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
    };
  };

  const handleEdit = () => {
    setEditing(true);
    onAvatarOverlayChange && onAvatarOverlayChange(true);
    setSuccessMessage('');
    setError('');
  };

  const handleCancel = () => {
    setEditing(false);
    onAvatarOverlayChange && onAvatarOverlayChange(false);
    setFormData({
      name: userData?.name || '',
      surname: userData?.surname || '',
      carrera: userData?.carrera || '',
    });
    setFieldErrors({});
    setError('');
  };

  const handleSave = async () => {
    const { isValid, errors } = validarFormulario(formData);
    if (!isValid) {
      setFieldErrors(errors);
      setError('Revisá los campos marcados.');
      toast.error('Revisá los campos marcados.');
      return;
    }

    try {
      setSaveLoading(true);
      setError('');
      setFieldErrors({});

      const jwt = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
      if (!jwt) {
        setError('No se encontró la sesión del usuario. Volvé a iniciar sesión.');
        toast.error('No se encontró la sesión del usuario.');
        return;
      }

      const updateData = {
        name: formData.name.trim(),
        surname: formData.surname.trim(),
        carrera: formData.carrera?.trim() || '',
      };

      const response = await fetch(`${API_URL}/users/me`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${jwt}`,
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

      // Actualizar datos en el componente padre
      onUserDataUpdate && onUserDataUpdate(updateData);

      setEditing(false);
      onAvatarOverlayChange && onAvatarOverlayChange(false);
      setSuccessMessage('Perfil actualizado correctamente');
      toast.success('Perfil actualizado correctamente');

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error updating user data:', err);
      toast.error('No se pudo actualizar el perfil');
    } finally {
      setSaveLoading(false);
    }
  };

  // ========== NUEVO: Manejo de avatar con Capacitor ==========
  const handleAvatarChange = async () => {
    if (avatarUploading) return;

    const jwt = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (!jwt) {
      setError('No se encontró la sesión del usuario. Volvé a iniciar sesión.');
      toast.error('No se encontró la sesión del usuario.');
      return;
    }

    try {
      setAvatarUploading(true);
      setError('');

      // Usar el mediaPicker para seleccionar imagen
      const mediaResult = await openMediaPicker({
        source: 'photos',
        allowEditing: true, // Permitir recorte para avatar
        quality: 80,
        resultType: 'DataUrl'
      });

      if (!mediaResult || !mediaResult.file) {
        console.log('Usuario canceló la selección');
        return;
      }

      const file = mediaResult.file;

      // Validaciones
      if (!file.type.startsWith('image/')) {
        toast.error('Por favor, selecciona un archivo de imagen válido');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        toast.error('La imagen debe ser menor a 5MB');
        return;
      }

      // 1. Primero obtenemos el ID del usuario actual
      const meResponse = await fetch(`${API_URL}/users/me`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${jwt}`,
          'Content-Type': 'application/json',
        },
      });

      if (!meResponse.ok) {
        throw new Error('Error al obtener datos del usuario');
      }

      const meData = await meResponse.json();
      const userId = meData.id;

      // 2. Subir la imagen usando el API Token
      const fd = new FormData();
      fd.append('files', file);

      const uploadResponse = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
        },
        body: fd,
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
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          avatar: avatarId,
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Error al actualizar el avatar del usuario');
      }

      // 4. Obtener los datos actualizados del usuario con el avatar
      const userResponse = await fetch(`${API_URL}/users/${userId}?populate=avatar`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      });

      if (!userResponse.ok) {
        throw new Error('Error al obtener datos actualizados');
      }

      const userDataResponse = await userResponse.json();
      const updatedUserData = userDataResponse.data || userDataResponse;

      // 5. Actualizar el estado en el componente padre
      onAvatarUpdate && onAvatarUpdate(updatedUserData.avatar);

      setSuccessMessage('Avatar actualizado correctamente');
      toast.success('Avatar actualizado correctamente');

      setTimeout(() => {
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message);
      console.error('Error updating avatar:', err);
      toast.error('No se pudo actualizar el avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // limpiar error de ese campo cuando el user escribe
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const nuevo = { ...prev };
      delete nuevo[field];
      return nuevo;
    });
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
          <button onClick={handleEdit} className={styles.editInfoButton}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
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
              <>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className={`${styles.editInput} ${fieldErrors.name ? styles.inputError : ''}`}
                  placeholder="Ingresa tu nombre"
                  disabled={saveLoading}
                  maxLength={20}
                />
                {fieldErrors.name && (
                  <p className={styles.fieldErrorText}>{fieldErrors.name}</p>
                )}
              </>
            ) : (
              <div className={styles.infoValue}>
                <span className={styles.infoText}>{userData.name || 'No especificado'}</span>
              </div>
            )}
          </div>

          <div className={styles.infoItem}>
            <label className={styles.infoLabel}>Apellido</label>
            {editing ? (
              <>
                <input
                  type="text"
                  value={formData.surname}
                  onChange={(e) => handleInputChange('surname', e.target.value)}
                  className={`${styles.editInput} ${fieldErrors.surname ? styles.inputError : ''}`}
                  placeholder="Ingresa tu apellido"
                  disabled={saveLoading}
                  maxLength={30}
                />
                {fieldErrors.surname && (
                  <p className={styles.fieldErrorText}>{fieldErrors.surname}</p>
                )}
              </>
            ) : (
              <div className={styles.infoValue}>
                <span className={styles.infoText}>{userData.surname || 'No especificado'}</span>
              </div>
            )}
          </div>

          <div className={styles.infoItem}>
            <label className={styles.infoLabel}>Carrera</label>
            {editing ? (
              <>
                <select
                  value={formData.carrera}
                  onChange={(e) => handleInputChange('carrera', e.target.value)}
                  className={`${styles.editInput} ${fieldErrors.carrera ? styles.inputError : ''}`}
                  disabled={saveLoading}
                >
                  <option className={styles.options} value="">
                    Selecciona una carrera
                  </option>
                  {CARRERAS_VALIDAS.map((c) => (
                    <option key={c} className={styles.options} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                {fieldErrors.carrera && (
                  <p className={styles.fieldErrorText}>{fieldErrors.carrera}</p>
                )}
              </>
            ) : (
              <div className={styles.infoValue}>
                <span className={styles.infoText}>{userData.carrera || 'No especificada'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Botón para cambiar avatar - solo visible cuando se está editando */}
      {isCurrentUser && editing && (
        <div className={styles.avatarChangeSection}>
          <p className={styles.avatarChangeLabel}>Cambiar avatar:</p>
          <button
            onClick={handleAvatarChange}
            className={styles.avatarChangeButton}
            disabled={avatarUploading}
          >
            {avatarUploading ? 'Subiendo...' : 
             isNativePlatform() ? '📱 Elegir imagen de perfil' : 'Seleccionar imagen de perfil'}
          </button>
        </div>
      )}
    </div>
  );
}