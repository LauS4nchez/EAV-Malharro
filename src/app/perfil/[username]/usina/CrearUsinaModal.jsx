'use client';

import { useState, useRef } from 'react';
import { API_URL, URL } from '@/app/config';
import toast from 'react-hot-toast';
import styles from '@/styles/components/Usina/CrearUsinaModal.module.css';

export default function CrearUsinaModal({ userId, onUsinaCreada, isOpen, onClose, userData }) {
  const [formData, setFormData] = useState({
    titulo: '',
    media: null,
  });
  const [loading, setLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const fileInputRef = useRef(null);

  // 🔹 Validar si el usuario tiene la información personal completa
  const validarInformacionPersonal = () => {
    if (!userData) return false;
    
    const tieneNombre = userData.name && userData.name.trim() !== '';
    const tieneApellido = userData.surname && userData.surname.trim() !== '';
    const tieneCarrera = userData.carrera && userData.carrera.trim() !== '';
    
    return tieneNombre && tieneApellido && tieneCarrera;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'media' && files && files[0]) {
      const file = files[0];
      setFormData(prev => ({ ...prev, media: file }));
      
      // Crear preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setMediaPreview({
          url: e.target.result,
          type: file.type.startsWith('image/') ? 'image' : 'video'
        });
      };
      reader.readAsDataURL(file);
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleMediaClick = () => {
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 🔹 Validar información personal solo cuando se presiona el botón
    if (!validarInformacionPersonal()) {
      toast.error('Si querés publicar trabajos, tenés que completar tu información personal');
      return;
    }
    
    const { titulo, media } = formData;
    
    if (!titulo.trim()) {
      toast.error('El título es obligatorio.');
      return;
    }

    if (!media) {
      toast.error('Debes subir una imagen o video.');
      return;
    }

    setLoading(true);
    const token = localStorage.getItem('jwt');
    let mediaId = null;

    try {
      const toastId = toast.loading('Creando trabajo...');

      // Subir media
      const uploadForm = new FormData();
      uploadForm.append('files', media);

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
        },
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        throw new Error('Error al subir el archivo');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData?.[0]?.id) {
        throw new Error('No se pudo obtener el ID del archivo subido');
      }

      mediaId = uploadData[0].id;

      // CORREGIDO: Sintaxis correcta para la relación many-to-one
      const usinaData = {
        titulo: titulo.trim(),
        aprobado: 'pendiente',
        media: mediaId,
      };

      // Solo agregar la relación del creador si userId existe
      if (userId) {
        usinaData.creador = userId; // Para Strapi v4, esto debería funcionar
      }

      console.log('Enviando datos:', usinaData); // Para debug

      const res = await fetch(`${API_URL}/usinas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: usinaData,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error('Error response:', errorData); // Para debug
        throw new Error(errorData.error?.message || 'Error al crear trabajo');
      }

      const created = await res.json();
      const newUsina = created.data || created;

      console.log('Usina creada:', newUsina); // Para debug

      // Obtener la URL del media para la vista local
      let mediaUrl = '/placeholder.jpg';
      const mediaField = newUsina.attributes?.media || newUsina.media;
      const mediaData = mediaField?.data ?? mediaField;
      const mediaAttrs = mediaData?.attributes ?? mediaData;
      const urlPath = mediaAttrs?.url;
      
      if (urlPath) {
        mediaUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;
      }

      // Crear objeto de usina para pasar al callback
      const usinaCreada = {
        id: newUsina.documentId ?? newUsina.id,
        titulo: newUsina.attributes?.titulo ?? newUsina.titulo,
        aprobado: 'pendiente',
        mediaUrl,
        mediaType: media.type.startsWith('image/') ? 'image' : 'video',
        creador: userData ? {
          name: userData.name || '',
          surname: userData.surname || '',
          username: userData.username || '',
          carrera: userData.carrera || '',
        } : null
      };

      toast.success('Trabajo creado correctamente. Estará pendiente de aprobación.', { id: toastId });
      
      // Resetear formulario
      setFormData({
        titulo: '',
        media: null,
      });
      setMediaPreview(null);

      // Ejecutar callback si existe
      if (onUsinaCreada) {
        onUsinaCreada(usinaCreada);
      }

      onClose();

    } catch (err) {
      console.error('Error creando trabajo:', err);
      toast.error('Error al crear trabajo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setFormData({
        titulo: '',
        media: null,
      });
      setMediaPreview(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose} disabled={loading}>
          ✕
        </button>

        <h2 className={styles.modalTitle}>Subir Nuevo Trabajo</h2>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formLayout}>
            {/* Columna izquierda - Formulario */}
            <div className={styles.formColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="titulo" className={styles.label}>
                  Título del trabajo *
                </label>
                <textarea
                  id="titulo"
                  name="titulo"
                  value={formData.titulo}
                  onChange={handleChange}
                  placeholder="Describe tu trabajo..."
                  required
                  className={styles.textarea}
                  disabled={loading}
                  rows={4}
                  maxLength={200}
                />
                <div className={styles.charCount}>
                  {formData.titulo.length}/200 caracteres
                </div>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Imagen o Video *
                </label>
                <div 
                  className={styles.mediaUploadArea}
                  onClick={handleMediaClick}
                >
                  <input
                    ref={fileInputRef}
                    id="media"
                    name="media"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleChange}
                    className={styles.fileInput}
                    disabled={loading}
                  />
                  <div className={styles.uploadPlaceholder}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                    <p>Haz clic para subir imagen o video</p>
                    <span>Formatos soportados: JPG, PNG, MP4, MOV</span>
                  </div>
                </div>
                {formData.media && (
                  <p className={styles.fileName}>{formData.media.name}</p>
                )}
              </div>
            </div>

            {/* Columna derecha - Preview (como el modal real) */}
            <div className={styles.previewColumn}>
              <h3 className={styles.previewTitle}>Vista Previa</h3>
              <div className={styles.previewContainer}>
                {mediaPreview ? (
                  <div className={styles.previewModal}>
                    <div className={styles.previewImageContainer}>
                      {mediaPreview.type === 'image' ? (
                        <img 
                          src={mediaPreview.url} 
                          alt="Preview" 
                          className={styles.previewImage}
                        />
                      ) : (
                        <video 
                          src={mediaPreview.url} 
                          className={styles.previewImage}
                          controls
                        />
                      )}
                    </div>
                    <div className={styles.previewInfo}>
                      <h2 className={styles.previewTitulo}>
                        {formData.titulo || "Título del trabajo"}
                      </h2>
                      
                      {userData && (
                        <p className={styles.previewCreador}>
                          <strong>Creador:</strong> {userData.name || 'Nombre no especificado'} {userData.surname || 'Apellido no especificado'}{' '}
                          <span className={styles.previewUsername}>@{userData.username}</span>
                        </p>
                      )}

                      {userData?.carrera && (
                        <p className={styles.previewCarrera}>
                          <strong>Carrera:</strong> {userData.carrera || 'Carrera no especificada'}
                        </p>
                      )}

                      <p className={styles.previewFecha}>
                        <strong>Publicado:</strong> {new Date().toLocaleDateString('es-AR')}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className={styles.previewPlaceholder}>
                    <p>La vista previa aparecerá aquí</p>
                    <span>Se verá exactamente como en el perfil</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.formActions}>
            <button 
              type="button" 
              onClick={handleClose}
              className={styles.cancelButton}
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className={styles.submitButton}
              disabled={loading || !formData.titulo.trim() || !formData.media}
            >
              {loading ? 'Subiendo...' : 'Subir Trabajo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}