'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/app/config';
import Slider from 'react-slick';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import { checkUserRole } from '@/app/componentes/validacion/checkRole';
import toast from 'react-hot-toast';
import 'slick-carousel/slick/slick.css';
import 'slick-carousel/slick/slick-theme.css';
import styles from '@/styles/components/Carrusel/Carousel.module.css';

// si tu collection type en Strapi se llama distinto, cambiá esto
const COLLECTION_PATH = '/carrusels';

export default function Carrusel() {
  const sliderRef = useRef(null);
  const fileInputRef = useRef(null);

  const [imagenesCarrusel, setImagenesCarrusel] = useState([]);
  const [title, setTitle] = useState('');
  const [carruselDocumentId, setCarruselDocumentId] = useState(null);
  const [carruselNumericId, setCarruselNumericId] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editImages, setEditImages] = useState([]);

  const [canEdit, setCanEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Config del slider
  const settings = {
    dots: true,
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: false,
    fade: false,
    adaptiveHeight: false,
    swipe: true,
    touchThreshold: 50,
    swipeToSlide: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 480,
        settings: {
          arrows: false,
          dots: true,
        },
      },
    ],
  };

  // ========== CARGA INICIAL ==========
  useEffect(() => {
    const fetchCarrusel = async () => {
      try {
        const res = await fetch(`${API_URL}${COLLECTION_PATH}?populate=carrusel`, {
          headers: { 'Content-Type': 'application/json' },
        });
        const json = await res.json();
        const item = json?.data?.[0];

        if (!item) {
          setLoading(false);
          return;
        }

        const tituloStrapi = item.title || '';
        const docId = item.documentId || null;
        const numId = item.id || null;

        let imgs = [];
        if (item.carrusel?.data && Array.isArray(item.carrusel.data)) {
          imgs = item.carrusel.data.map((img) => {
            const rel = img.url || img.attributes?.url || '';
            const abs = rel?.startsWith('http') ? rel : `${API_URL}${rel}`;
            return { id: img.id, url: abs };
          });
        } else if (Array.isArray(item.carrusel)) {
          imgs = item.carrusel.map((img) => ({
            id: img.id || img.documentId || null,
            url: img.url?.startsWith('http') ? img.url : `${API_URL}${img.url}`,
          }));
        }

        setTitle(tituloStrapi);
        setCarruselDocumentId(docId);
        setCarruselNumericId(numId);
        setImagenesCarrusel(imgs);

        setEditTitle(tituloStrapi);
        setEditImages(imgs.map((i) => ({ id: i.id, url: i.url })));
      } catch (err) {
        console.error('Error al cargar carrusel:', err);
        toast.error('No se pudo cargar el carrusel.');
      } finally {
        setLoading(false);
      }
    };

    const fetchRole = async () => {
      try {
        const role = await checkUserRole();
        setCanEdit(role === 'Administrador' || role === 'SuperAdministrador');
      } catch {
        setCanEdit(false);
      }
    };

    fetchCarrusel();
    fetchRole();
  }, []);

  // Bloquear scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isEditing) {
      const prev = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.documentElement.style.overflow = prev;
      };
    }
  }, [isEditing]);

  // ========== VALIDACIÓN INTELIGENTE ==========
  const validate = () => {
    const errors = [];
    const hasTitle = editTitle.trim().length > 0;
    const imagesWithId = editImages.filter((img) => img && img.id);

    if (!hasTitle) errors.push('El título no puede quedar vacío.');
    if (editImages.length === 0) errors.push('Debe haber al menos una imagen en el carrusel.');
    if (editImages.length > 0 && imagesWithId.length !== editImages.length) {
      errors.push('Hay imágenes sin subir a Strapi (falta el ID). Volvé a subirlas.');
    }

    if (errors.length) {
      errors.forEach((msg) => toast.error(msg));
      return false;
    }
    return true;
  };

  // ========== GUARDAR (Strapi 5 → documentId/numericId) ==========
  const handleSave = async (e) => {
    e?.preventDefault?.();

    if (!canEdit) {
      toast.error('No tenés permiso para editar este carrusel.');
      return;
    }

    const jwt = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (!jwt) {
      toast.error('Tenés que iniciar sesión.');
      return;
    }

    if (!validate()) return;

    const targetId = carruselDocumentId || carruselNumericId;
    if (!targetId) {
      toast.error('No se encontró el documentId del carrusel.');
      return;
    }

    const payload = {
      data: {
        title: editTitle,
        carrusel: editImages.map((img) => img.id),
      },
    };

    try {
      const res = await fetch(`${API_URL}${COLLECTION_PATH}/${targetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();

      if (!res.ok) {
        console.error('❌ Strapi NO OK');
        console.error('status:', res.status);
        console.error('body:', text);

        if (res.status === 404) {
          toast.error('Strapi no encontró el documento (revisá el API ID o el documentId).');
        } else if (res.status === 403 || res.status === 401) {
          toast.error('No tenés permisos en Strapi para actualizar este carrusel.');
        } else {
          toast.error(`Error ${res.status} al actualizar el carrusel.`);
        }
        return;
      }

      let updated = null;
      try {
        updated = JSON.parse(text);
      } catch {
        updated = null;
      }

      if (!updated || !updated.data) {
        setTitle(editTitle);
        setImagenesCarrusel(editImages);
        setIsEditing(false);
        toast.success('Carrusel actualizado.');
        return;
      }

      const upd = updated.data;
      const newTitle = upd.title || editTitle;
      let newImages = [];

      if (upd.carrusel?.data && Array.isArray(upd.carrusel.data)) {
        newImages = upd.carrusel.data.map((img) => {
          const rel = img.url || img.attributes?.url || '';
          const abs = rel?.startsWith('http') ? rel : `${API_URL}${rel}`;
          return { id: img.id, url: abs };
        });
      } else if (Array.isArray(upd.carrusel)) {
        newImages = upd.carrusel.map((img) => ({
          id: img.id || img.documentId || null,
          url: img.url?.startsWith('http') ? img.url : `${API_URL}${img.url}`,
        }));
      } else {
        newImages = editImages;
      }

      setTitle(newTitle);
      setImagenesCarrusel(newImages);
      setIsEditing(false);
      toast.success('Carrusel actualizado.');
    } catch (error) {
      console.error('❌ Error en fetch:', error);
      toast.error('No se pudo guardar el carrusel.');
    }
  };

  // ========== SUBIR IMG DESDE DISPOSITIVO ==========
  const handleOpenFilePicker = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    const jwt = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (!jwt) {
      toast.error('Tenés que iniciar sesión para subir imágenes.');
      return;
    }

    const file = files[0];

    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('La imagen es muy grande (máx 5MB).');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('files', file);

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: formData,
      });

      const uploadText = await uploadRes.text();

      if (!uploadRes.ok) {
        console.error('❌ Error upload:', uploadText);
        toast.error('No se pudo subir la imagen.');
        return;
      }

      const uploaded = JSON.parse(uploadText);
      const uploadedFile = uploaded[0];

      setEditImages((prev) => [
        ...prev,
        {
          id: uploadedFile.id,
          url: uploadedFile.url.startsWith('http')
            ? uploadedFile.url
            : `${API_URL}${uploadedFile.url}`,
        },
      ]);

      toast.success('Imagen subida.');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo subir la imagen.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = (index) => {
    setEditImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditTitle(title);
    setEditImages(imagenesCarrusel.map((img) => ({ id: img.id, url: img.url })));
  };

  if (loading) {
    return <div className={styles.carruselContainer}>Cargando carrusel...</div>;
  }

  return (
    <div className={styles.carruselContainer} style={{ position: 'relative' }}>
      {/* BOTÓN ABAJO */}
      {canEdit && !isEditing && (
        <div className={styles.adminBarCarruselBottom}>
          <button
            type="button"
            onClick={() => setIsEditing(true)}
            className={styles.adminBtn}
          >
            Editar carrusel
          </button>
        </div>
      )}

      {/* CARRUSEL */}
      <Slider ref={sliderRef} {...settings}>
        {imagenesCarrusel.length ? (
          imagenesCarrusel.map((imagen, index) => (
            <div key={`slide-${index}`} style={{ width: '100%' }}>
              <div
                className={styles.carruselImg}
                style={{
                  backgroundImage: `linear-gradient(rgba(120, 51, 51, 0.5), rgba(0, 0, 0, 0.5)), url(${imagen.url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                }}
              >
                {title && (
                  <div className={styles.titulo}>
                    <ReactMarkdown>{title}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '4rem 1rem', textAlign: 'center', color: '#fff' }}>
            No hay imágenes para mostrar.
          </div>
        )}
      </Slider>

      {/* MODAL */}
      {isEditing && canEdit && (
        <div
          className={styles.editPanelOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Editar carrusel"
          onClick={handleCancel}
        >
          <div
            className={styles.editPanelCarrusel}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3>Editar carrusel</h3>
              <button
                type="button"
                onClick={handleCancel}
                className={styles.modalClose}
                aria-label="Cerrar"
                title="Cerrar"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSave} className={styles.modalForm}>
              <label className={styles.label}>
                Título (markdown):
                <textarea
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className={styles.textarea}
                  rows={3}
                />
              </label>

              <p className={styles.label}>Imágenes:</p>

              {editImages.map((img, index) => (
                <div key={index} className={styles.imageRow}>
                  <div className={styles.imagePreview}>
                    {img.url ? (
                      <img
                        src={img.url}
                        alt=""
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div className={styles.imagePlaceholder}>IMG</div>
                    )}
                  </div>
                  <div className={styles.imageData}>
                    <span>ID: {img.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(index)}
                    className={styles.removeBtn}
                    aria-label="Quitar imagen"
                  >
                    ×
                  </button>
                </div>
              ))}

              {/* input oculto */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />

              <button
                type="button"
                onClick={handleOpenFilePicker}
                className={styles.addBtn}
                disabled={uploading}
              >
                {uploading ? 'Subiendo...' : 'Subir imagen desde dispositivo'}
              </button>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.adminBtnSave} disabled={uploading}>
                  Guardar cambios
                </button>
                <button type="button" onClick={handleCancel} className={styles.adminBtnCancel}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// Flechas
function PrevArrow({ onClick }) {
  return (
    <button className="slick-prev" onClick={onClick} aria-label="Imagen anterior">
      <FaArrowLeft color="white" size={20} />
    </button>
  );
}

function NextArrow({ onClick }) {
  return (
    <button className="slick-next" onClick={onClick} aria-label="Siguiente imagen">
      <FaArrowRight color="white" size={20} />
    </button>
  );
}
