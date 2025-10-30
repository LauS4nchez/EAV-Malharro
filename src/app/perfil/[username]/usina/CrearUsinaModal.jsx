'use client';

import { useState, useRef, useMemo } from 'react';
import { API_URL, URL } from '@/app/config';
import toast from 'react-hot-toast';
import styles from '@/styles/components/Usina/CrearUsinaModal.module.css';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const MIN_TITLE_LEN = 5;

export default function CrearUsinaModal({ userId, onUsinaCreada, isOpen, onClose, userData }) {
  const [formData, setFormData] = useState({
    titulo: '',
    media: null,
  });
  const [errors, setErrors] = useState({});
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

  const infoPersonalCompleta = useMemo(() => validarInformacionPersonal(), [userData]);

  const validarTitulo = (titulo) => {
    if (!titulo || !titulo.trim()) {
      return 'El título es obligatorio.';
    }
    if (titulo.trim().length < MIN_TITLE_LEN) {
      return `El título debe tener al menos ${MIN_TITLE_LEN} caracteres.`;
    }
    if (titulo.trim().length > 200) {
      return 'El título no puede superar los 200 caracteres.';
    }
    return '';
  };

  const validarArchivo = (file) => {
    if (!file) {
      return 'Debes subir una imagen o video.';
    }

    const { type, size } = file;
    const isImage = type?.startsWith('image/');
    const isVideo = type?.startsWith('video/');

    if (!isImage && !isVideo) {
      return 'Formato no soportado. Solo imágenes o videos.';
    }

    if (isImage && size > MAX_IMAGE_SIZE) {
      return 'La imagen es muy pesada (máx. 5 MB).';
    }

    if (isVideo && size > MAX_VIDEO_SIZE) {
      return 'El video es muy pesado (máx. 50 MB).';
    }

    return '';
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;

    // reset de errores parciales
    setErrors((prev) => ({ ...prev, [name]: '' }));

    if (name === 'media' && files && files[0]) {
      const file = files[0];

      const errorMedia = validarArchivo(file);
      if (errorMedia) {
        setErrors((prev) => ({ ...prev, media: errorMedia }));
        // no guardo el archivo inválido
        setFormData((prev) => ({ ...prev, media: null }));
        setMediaPreview(null);
        return;
      }

      setFormData((prev) => ({ ...prev, media: file }));

      // Crear preview
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMediaPreview({
          url: ev.target.result,
          type: file.type.startsWith('image/') ? 'image' : 'video',
        });
      };
      reader.readAsDataURL(file);
    } else {
      // título u otro campo
      const errorTitulo = name === 'titulo' ? validarTitulo(value) : '';
      if (errorTitulo) {
        setErrors((prev) => ({ ...prev, titulo: errorTitulo }));
      }
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleMediaClick = () => {
    if (!loading) {
      fileInputRef.current?.click();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 🔹 Validar información personal solo cuando se presiona el botón
    if (!infoPersonalCompleta) {
      toast.error('Si querés publicar trabajos, tenés que completar tu información personal');
      return;
    }

    const { titulo, media } = formData;

    // 🔹 Validar título
    const tituloError = validarTitulo(titulo);
    // 🔹 Validar media
    const mediaError = validarArchivo(media);

    if (tituloError || mediaError) {
      setErrors({
        titulo: tituloError,
        media: mediaError,
      });
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (!token) {
      toast.error('No tenés sesión iniciada. Volvé a iniciar sesión.');
      return;
    }

    setLoading(true);

    try {
      const toastId = toast.loading('Creando trabajo...');
      let mediaId = null;

      // 1) Subir media
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
        const errJson = await uploadRes.json().catch(() => null);
        console.error('Error al subir archivo:', errJson);
        throw new Error('Error al subir el archivo');
      }

      const uploadData = await uploadRes.json();
      if (!uploadData?.[0]?.id) {
        throw new Error('No se pudo obtener el ID del archivo subido');
      }

      mediaId = uploadData[0].id;

      // 2) Crear usina
      const usinaData = {
        titulo: titulo.trim(),
        aprobado: 'pendiente',
        media: mediaId,
      };

      if (userId) {
        usinaData.creador = userId;
      }

      const res = await fetch(`${API_URL}/usinas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ data: usinaData }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error('Error response:', errorData);
        throw new Error(errorData?.error?.message || 'Error al crear trabajo');
      }

      const created = await res.json();
      const newUsina = created.data || created;

      // 3) Obtener URL del media
      let mediaUrl = '/placeholder.jpg';
      const mediaField = newUsina.attributes?.media || newUsina.media;
      const mediaData = mediaField?.data ?? mediaField;
      const mediaAttrs = mediaData?.attributes ?? mediaData;
      const urlPath = mediaAttrs?.url;

      if (urlPath) {
        mediaUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;
      }

      const usinaCreada = {
        id: newUsina.documentId ?? newUsina.id,
        titulo: newUsina.attributes?.titulo ?? newUsina.titulo,
        aprobado: 'pendiente',
        mediaUrl,
        mediaType: formData.media?.type?.startsWith('image/') ? 'image' : 'video',
        creador: userData
          ? {
              name: userData.name || '',
              surname: userData.surname || '',
              username: userData.username || '',
              carrera: userData.carrera || '',
            }
          : null,
      };

      toast.success('Trabajo creado correctamente. Estará pendiente de aprobación.', { id: toastId });

      // Reset
      setFormData({
        titulo: '',
        media: null,
      });
      setMediaPreview(null);
      setErrors({});

      if (onUsinaCreada) {
        onUsinaCreada(usinaCreada);
      }

      onClose?.();
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
      setErrors({});
      onClose?.();
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

        {!infoPersonalCompleta && (
          <div className={styles.warningBox}>
            Tenés que completar tu información personal (nombre, apellido y carrera) para publicar trabajos.
          </div>
        )}

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
                  className={`${styles.textarea} ${errors.titulo ? styles.inputError : ''}`}
                  disabled={loading}
                  rows={4}
                  maxLength={200}
                />
                <div className={styles.charCount}>
                  {formData.titulo.length}/200 caracteres
                </div>
                {errors.titulo && <p className={styles.errorText}>{errors.titulo}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  Imagen o Video *
                </label>
                <div
                  className={`${styles.mediaUploadArea} ${errors.media ? styles.inputError : ''}`}
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
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14,2 14,8 20,8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                      <polyline points="10,9 9,9 8,9" />
                    </svg>
                    <p>Haz clic para subir imagen o video</p>
                    <span>Formatos soportados: JPG, PNG, MP4, MOV</span>
                  </div>
                </div>
                {formData.media && (
                  <p className={styles.fileName}>{formData.media.name}</p>
                )}
                {errors.media && <p className={styles.errorText}>{errors.media}</p>}
              </div>
            </div>

            {/* Columna derecha - Preview */}
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
                        {formData.titulo || 'Título del trabajo'}
                      </h2>

                      {userData && (
                        <p className={styles.previewCreador}>
                          <b className="textBlack">Creador:</b>{' '}
                          {userData.name || 'Nombre no especificado'}{' '}
                          {userData.surname || 'Apellido no especificado'}{' '}
                          <span className={styles.previewUsername}>@{userData.username}</span>
                        </p>
                      )}

                      {userData?.carrera && (
                        <p className={styles.previewCarrera}>
                          <b className="textBlack">Carrera:</b> {userData.carrera || 'Carrera no especificada'}
                        </p>
                      )}

                      <p className={styles.previewFecha}>
                        <b className="textBlack">Publicado:</b>{' '}
                        {new Date().toLocaleDateString('es-AR')}
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
              disabled={
                loading ||
                !formData.titulo.trim() ||
                !formData.media ||
                !!errors.titulo ||
                !!errors.media ||
                !infoPersonalCompleta
              }
            >
              {loading ? 'Subiendo...' : 'Subir Trabajo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
