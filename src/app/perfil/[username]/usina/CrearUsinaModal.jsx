'use client';

import { useState, useRef, useMemo } from 'react';
import { API_URL, URL, API_TOKEN } from '@/app/config';
import toast from 'react-hot-toast';
import styles from '@/styles/components/Usina/CrearUsinaModal.module.css';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const MIN_TITLE_LEN = 5;

/**
 * Helper notificaciones (ajustado a tu schema):
 * - leida: "leida" | "no-leida"
 * - usinaAfectada: relation -> api::usina.usina
 * - fechaEmision: datetime
 */
async function crearNotificacionInline({
  jwt,
  adminToken,
  titulo,
  mensaje,
  receptorId,
  emisorId,
  usinaId,     // ← ID NUMÉRICO de la usina
  tipo = 'usina',
}) {
  const token = jwt || adminToken;
  if (!token) return;

  try {
    const data = {
      titulo,
      mensaje,
      tipo,               // "usina" | "agenda" | "sistema"
      leida: 'no-leida',
      fechaEmision: new Date().toISOString(),
    };

    if (receptorId) data.receptor = receptorId;
    if (emisorId) data.emisor = emisorId;
    if (usinaId)   data.usinaAfectada = usinaId;

    const res = await fetch(`${API_URL}/notificaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error('Error creando notificación desde CrearUsinaModal:', err);
    }
  } catch (err) {
    console.error('Error creando notificación desde CrearUsinaModal:', err);
  }
}

export default function CrearUsinaModal({
  userId,
  onUsinaCreada,
  isOpen,
  onClose,
  userData,
}) {
  const [formData, setFormData] = useState({ titulo: '', media: null });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState(null);
  const fileInputRef = useRef(null);

  // -------- validaciones --------
  const validarInformacionPersonal = () => {
    if (!userData) return false;
    const tieneNombre   = !!(userData.name && userData.name.trim());
    const tieneApellido = !!(userData.surname && userData.surname.trim());
    const tieneCarrera  = !!(userData.carrera && userData.carrera.trim());
    return tieneNombre && tieneApellido && tieneCarrera;
  };

  const infoPersonalCompleta = useMemo(() => validarInformacionPersonal(), [userData]);

  const validarTitulo = (titulo) => {
    if (!titulo || !titulo.trim()) return 'El título es obligatorio.';
    if (titulo.trim().length < MIN_TITLE_LEN) return `El título debe tener al menos ${MIN_TITLE_LEN} caracteres.`;
    if (titulo.trim().length > 200) return 'El título no puede superar los 200 caracteres.';
    return '';
  };

  const validarArchivo = (file) => {
    if (!file) return 'Debes subir una imagen o video.';
    const { type, size } = file;
    const isImage = type?.startsWith('image/');
    const isVideo = type?.startsWith('video/');
    if (!isImage && !isVideo) return 'Formato no soportado. Solo imágenes o videos.';
    if (isImage && size > MAX_IMAGE_SIZE) return 'La imagen es muy pesada (máx. 5 MB).';
    if (isVideo && size > MAX_VIDEO_SIZE) return 'El video es muy pesado (máx. 50 MB).';
    return '';
  };

  // -------- handlers --------
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    setErrors((prev) => ({ ...prev, [name]: '' }));

    if (name === 'media' && files && files[0]) {
      const file = files[0];
      const errorMedia = validarArchivo(file);
      if (errorMedia) {
        setErrors((prev) => ({ ...prev, media: errorMedia }));
        setFormData((prev) => ({ ...prev, media: null }));
        setMediaPreview(null);
        return;
      }
      setFormData((prev) => ({ ...prev, media: file }));

      const reader = new FileReader();
      reader.onload = (ev) => {
        setMediaPreview({
          url: ev.target.result,
          type: file.type.startsWith('image/') ? 'image' : 'video',
        });
      };
      reader.readAsDataURL(file);
    } else {
      const errorTitulo = name === 'titulo' ? validarTitulo(value) : '';
      if (errorTitulo) setErrors((prev) => ({ ...prev, titulo: errorTitulo }));
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleMediaClick = () => {
    if (!loading) fileInputRef.current?.click();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!infoPersonalCompleta) {
      toast.error('Si querés publicar trabajos, tenés que completar tu información personal');
      return;
    }

    const { titulo, media } = formData;
    const tituloError = validarTitulo(titulo);
    const mediaError  = validarArchivo(media);

    if (tituloError || mediaError) {
      setErrors({ titulo: tituloError, media: mediaError });
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

      // 1) Subir media
      const uploadForm = new FormData();
      uploadForm.append('files', media);

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      });

      if (!uploadRes.ok) {
        const errJson = await uploadRes.json().catch(() => null);
        console.error('Error al subir archivo:', errJson);
        throw new Error('Error al subir el archivo');
      }

      const uploadData = await uploadRes.json();
      const mediaId = uploadData?.[0]?.id;
      if (!mediaId) throw new Error('No se pudo obtener el ID del archivo subido');

      // 2) Crear usina (⚠️ devolvemos ID numérico)
      const usinaPayload = {
        titulo: titulo.trim(),
        aprobado: 'pendiente',
        media: mediaId,
        ...(userId ? { creador: userId } : {}),
      };

      const res = await fetch(`${API_URL}/usinas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: usinaPayload }),
      });

      const created = await res.json();
      if (!res.ok) {
        console.error('Error response:', created);
        throw new Error(created?.error?.message || 'Error al crear trabajo');
      }

      // newUsina: { id, attributes } (v4/v5)
      const newUsina = created?.data ?? created;
      const usinaNumericId =
        newUsina?.id ??
        created?.data?.id ??
        null; // ← ESTE ES EL QUE USAMOS PARA notificación (relation)

      // 3) URL del media (para el preview local)
      let mediaUrl = '/placeholder.jpg';
      const mediaField = newUsina?.attributes?.media ?? newUsina?.media;
      const mediaData  = mediaField?.data ?? mediaField;
      const mediaAttrs = mediaData?.attributes ?? mediaData;
      const urlPath    = mediaAttrs?.url;
      if (urlPath) mediaUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;

      // 4) Notificación al creador (pendiente)
      const ahora = new Date();
      const fecha = ahora.toLocaleDateString('es-AR');
      const hora  = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

      await crearNotificacionInline({
        jwt: token,
        titulo: 'Usina enviada',
        mensaje: `Tu usina "${titulo.trim()}" quedó en estado pendiente el ${fecha} a las ${hora}.`,
        receptorId: userId || undefined,
        emisorId:   userId || undefined,
        usinaId:    usinaNumericId,          // ← RELACIÓN CON ID NUMÉRICO
        tipo: 'usina',
      });

      // 5) Notificar a Admin/Profesor/SuperAdministrador (tolerante a v4/v5)
      try {
        if (API_TOKEN) {
          const usersRes = await fetch(
            `${API_URL}/users?populate=role&pagination[pageSize]=1000`,
            { headers: { Authorization: `Bearer ${API_TOKEN}` } }
          );
          const raw = await usersRes.json();

          // v4: array; algunos setups custom: {data:[]}
          const rawUsers = Array.isArray(raw)
            ? raw
            : Array.isArray(raw?.data)
            ? raw.data.map((u) => ({ id: u.id, ...u.attributes }))
            : [];

          const admins = rawUsers.filter((u) => {
            const r = u.role?.name || u.role?.type || u.role || u?.role?.displayName;
            return r === 'Administrador' || r === 'SuperAdministrador' || r === 'Profesor';
          });

          const nombreCreador  = userData?.name || userData?.username || 'Un usuario';
          const apellidoCreador = userData?.surname || '';
          const msgAdmin = `El usuario ${nombreCreador} ${apellidoCreador} creó la usina "${titulo.trim()}" y está en pendiente.`;

          await Promise.all(
            admins.map((adminUser) =>
              crearNotificacionInline({
                adminToken: API_TOKEN,       // usamos API_TOKEN para notificar “como sistema”
                titulo: 'Nueva usina pendiente',
                mensaje: msgAdmin,
                receptorId: adminUser.id,
                emisorId: userId || undefined,
                usinaId: usinaNumericId,     // ← ID NUMÉRICO
                tipo: 'usina',
              })
            )
          );
        } else {
          console.warn('No hay API_TOKEN, no se pudo notificar a los administradores/profesores.');
        }
      } catch (err) {
        console.error('No se pudieron notificar a los roles superiores:', err);
      }

      // 6) Actualizar la galería local
      const usinaCreada = {
        id: usinaNumericId, // devolvemos el mismo id que usa Strapi internamente
        titulo: newUsina?.attributes?.titulo ?? 'Sin título',
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

      setFormData({ titulo: '', media: null });
      setMediaPreview(null);
      setErrors({});
      onUsinaCreada?.(usinaCreada);
      onClose?.();
    } catch (err) {
      console.error('Error creando trabajo:', err);
      toast.error('Error al crear trabajo: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return;
    setFormData({ titulo: '', media: null });
    setMediaPreview(null);
    setErrors({});
    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={handleClose} disabled={loading}>✕</button>

        <h2 className={styles.modalTitle}>Subir Nuevo Trabajo</h2>

        {!infoPersonalCompleta && (
          <div className={styles.warningBox}>
            Tenés que completar tu información personal (nombre, apellido y carrera) para publicar trabajos.
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formLayout}>
            {/* Izquierda: formulario */}
            <div className={styles.formColumn}>
              <div className={styles.formGroup}>
                <label htmlFor="titulo" className={styles.label}>Título del trabajo *</label>
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
                <div className={styles.charCount}>{formData.titulo.length}/200 caracteres</div>
                {errors.titulo && <p className={styles.errorText}>{errors.titulo}</p>}
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Imagen o Video *</label>
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
                {formData.media && <p className={styles.fileName}>{formData.media.name}</p>}
                {errors.media && <p className={styles.errorText}>{errors.media}</p>}
              </div>
            </div>

            {/* Derecha: preview */}
            <div className={styles.previewColumn}>
              <h3 className={styles.previewTitle}>Vista Previa</h3>
              <div className={styles.previewContainer}>
                {mediaPreview ? (
                  <div className={styles.previewModal}>
                    <div className={styles.previewImageContainer}>
                      {mediaPreview.type === 'image' ? (
                        <img src={mediaPreview.url} alt="Preview" className={styles.previewImage} />
                      ) : (
                        <video src={mediaPreview.url} className={styles.previewImage} controls />
                      )}
                    </div>
                    <div className={styles.previewInfo}>
                      <h2 className={styles.previewTitulo}>
                        {formData.titulo || 'Título del trabajo'}
                      </h2>

                      {userData && (
                        <p className={styles.previewCreador}>
                          <b>Creador:</b>{' '}
                          {userData.name || 'Nombre no especificado'}{' '}
                          {userData.surname || 'Apellido no especificado'}{' '}
                          <span className={styles.previewUsername}>@{userData.username}</span>
                        </p>
                      )}

                      {userData?.carrera && (
                        <p className={styles.previewCarrera}>
                          <b>Carrera:</b> {userData.carrera || 'Carrera no especificada'}
                        </p>
                      )}

                      <p className={styles.previewFecha}>
                        <b>Publicado:</b> {new Date().toLocaleDateString('es-AR')}
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
