'use client';

import { useState, useEffect, useMemo } from 'react';
import { API_URL, API_TOKEN } from '@/app/config';
import usinaStyles from '@/styles/components/Usina/Usina.module.css';
import styles from '@/styles/components/Perfil/PerfilPublico.module.css';
import toast from 'react-hot-toast';
import UsinaFilters from './UsinaFilters';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

export default function UsinaGallery({ usinas = [], loading, isCurrentUser, currentUserId }) {
  const [selectedUsina, setSelectedUsina] = useState(null);
  const [editingInModal, setEditingInModal] = useState(false);
  const [editData, setEditData] = useState({
    titulo: '',
    imagen: null,
  });
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 🔹 Estado para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 8,
    total: 0,
  });

  // 🔹 Estado para filtros
  const [filters, setFilters] = useState({
    searchTerm: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // 🔹 normalizar texto
  const normalizeText = (text) =>
    (text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();

  // 🔹 aplicar filtros y orden
  const filteredAndSortedUsinas = useMemo(() => {
    if (!Array.isArray(usinas) || !usinas.length) return [];

    let filtered = [...usinas];

    // búsqueda
    if (filters.searchTerm) {
      const searchTermNormalized = normalizeText(filters.searchTerm);
      filtered = filtered.filter((usina) =>
        normalizeText(usina.titulo || '').includes(searchTermNormalized)
      );
    }

    // orden
    filtered.sort((a, b) => {
      let valueA, valueB;
      switch (filters.sortBy) {
        case 'titulo':
          valueA = normalizeText(a.titulo || '');
          valueB = normalizeText(b.titulo || '');
          break;
        case 'createdAt':
        default:
          valueA = new Date(a.createdAt || a.publishedAt || Date.now());
          valueB = new Date(b.createdAt || b.publishedAt || Date.now());
          break;
      }

      if (valueA < valueB) return filters.sortOrder === 'asc' ? -1 : 1;
      if (valueA > valueB) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [usinas, filters]);

  // 🔹 paginación
  const totalUsinas = filteredAndSortedUsinas.length;
  const totalPages = Math.ceil(totalUsinas / pagination.pageSize) || 1;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const usinasPaginated = filteredAndSortedUsinas.slice(startIndex, endIndex);

  // 🔹 mantener paginación en sync
  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      total: filteredAndSortedUsinas.length,
      // si estoy en la última página y la elimino, vuelvo una página atrás
      page:
        prev.page > 1 && startIndex >= filteredAndSortedUsinas.length
          ? prev.page - 1
          : prev.page,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAndSortedUsinas.length]);

  // 🔹 si hay modal abierto, bloquear scroll y limpiar al desmontar
  useEffect(() => {
    if (selectedUsina) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.body.style.overflow = 'auto';
    };
  }, [selectedUsina]);

  // 🔹 manejo de filtros
  const handleFiltersChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize) => {
    const size = parseInt(newSize, 10) || 8;
    setPagination({
      page: 1,
      pageSize: size,
      total: filteredAndSortedUsinas.length,
    });
  };

  // 🔹 helper: ¿el usuario que ve puede editar esta usina?
  const canCurrentUserEdit = (usina) => {
    if (!isCurrentUser) return false; // no está viendo su propio perfil
    if (!currentUserId) return false;
    // si la usina no tiene creador, igual dejo (caso raro)
    if (!usina?.creador?.id) return true;
    return usina.creador.id === currentUserId;
  };

  const handleCardClick = (usina) => {
    setSelectedUsina(usina);
    setEditingInModal(false);
    setEditData({
      titulo: usina.titulo || '',
      imagen: null,
    });
    setEditErrors({});
  };

  const closeModal = () => {
    setSelectedUsina(null);
    setEditingInModal(false);
    setImageHovered(false);
    setEditErrors({});
  };

  const handleEditClick = () => {
    if (!selectedUsina) return;
    if (!canCurrentUserEdit(selectedUsina)) {
      toast.error('No tenés permisos para editar este trabajo.');
      return;
    }
    setEditingInModal(true);
  };

  const handleCancelEdit = () => {
    setEditingInModal(false);
    setImageHovered(false);
    if (selectedUsina) {
      setEditData({
        titulo: selectedUsina.titulo || '',
        imagen: null,
      });
      setEditErrors({});
    }
  };

  const validateEdit = (data) => {
    const errs = {};
    const title = (data.titulo || '').trim();

    if (!title) {
      errs.titulo = 'El título es obligatorio.';
    } else if (title.length < 3) {
      errs.titulo = 'El título debe tener al menos 3 caracteres.';
    } else if (title.length > 100) {
      errs.titulo = 'El título no puede superar los 100 caracteres.';
    }

    if (data.imagen) {
      const file = data.imagen;
      const isImage = file.type?.startsWith('image/');
      const isVideo = file.type?.startsWith('video/');
      if (!isImage && !isVideo) {
        errs.imagen = 'Formato no soportado. Solo imagen o video.';
      } else if (isImage && file.size > MAX_IMAGE_SIZE) {
        errs.imagen = 'La imagen es muy pesada (máx. 5 MB).';
      } else if (isVideo && file.size > MAX_VIDEO_SIZE) {
        errs.imagen = 'El video es muy pesado (máx. 50 MB).';
      }
    }

    return errs;
  };

  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    const nextData = {
      ...editData,
      [name]: files ? files[0] : value,
    };
    setEditData(nextData);

    // validación on-change
    const errs = validateEdit(nextData);
    setEditErrors(errs);
  };

  const handleImageEditClick = (e) => {
    e.stopPropagation();
    const fileInput = document.getElementById('modal-image-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  // 🔹 borrar
  const handleDeleteClick = () => {
    if (!selectedUsina) return;
    if (!canCurrentUserEdit(selectedUsina)) {
      toast.error('No tenés permisos para eliminar este trabajo.');
      return;
    }
    setShowDeleteConfirm(true);
  };

  const closeDeleteConfirm = () => {
    if (!deleting) setShowDeleteConfirm(false);
  };

  const handleDeleteUsina = async () => {
    if (!selectedUsina) return;

    if (!canCurrentUserEdit(selectedUsina)) {
      toast.error('No tenés permisos para eliminar este trabajo.');
      return;
    }

    setDeleting(true);
    const toastId = toast.loading('Eliminando usina...');
    const token =
      (typeof window !== 'undefined' && localStorage.getItem('jwt')) ||
      API_TOKEN ||
      null;
    const usinaId = selectedUsina.documentId || selectedUsina.id;

    if (!token) {
      toast.error('No hay sesión para eliminar la usina.', { id: toastId });
      setDeleting(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/usinas/${usinaId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Error al eliminar usina');
      }

      closeDeleteConfirm();
      closeModal();

      toast.success('Usina eliminada correctamente', { id: toastId });

      // para refrescar la vista
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error al eliminar usina:', err);
      toast.error('Error al eliminar la usina: ' + err.message, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  // 🔹 guardar edición
  const guardarCambios = async (e) => {
    e?.preventDefault();
    if (!selectedUsina) return;
    if (!canCurrentUserEdit(selectedUsina)) {
      toast.error('No tenés permisos para editar este trabajo.');
      return;
    }

    // validación previa
    const errs = validateEdit(editData);
    if (Object.keys(errs).length > 0) {
      setEditErrors(errs);
      toast.error('Revisá los campos marcados.');
      return;
    }

    setSaving(true);
    const toastId = toast.loading('Guardando cambios...');
    const token =
      (typeof window !== 'undefined' && localStorage.getItem('jwt')) ||
      API_TOKEN ||
      null;
    let mediaId = null;
    const usinaId = selectedUsina.documentId || selectedUsina.id;

    if (!token) {
      toast.error('No hay sesión para editar la usina.', { id: toastId });
      setSaving(false);
      return;
    }

    try {
      // subir nueva media si hay
      if (editData.imagen) {
        const uploadForm = new FormData();
        uploadForm.append('files', editData.imagen);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          throw new Error('Error al subir imagen o video');
        }

        const uploadData = await uploadRes.json();
        if (!uploadData?.[0]?.id) {
          throw new Error('No se pudo obtener el ID de la media subida');
        }

        mediaId = uploadData[0].id;
      }

      const updateData = {
        titulo: editData.titulo.trim(),
        // cuando se edita vuelve a pendiente
        aprobado: 'pendiente',
      };

      if (mediaId) {
        updateData.media = mediaId;
      }

      const res = await fetch(`${API_URL}/usinas/${usinaId}`, {
        method: 'PUT', // si tu Strapi es v5 y solo acepta PATCH, cambiá acá
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ data: updateData }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error?.message || 'Error al actualizar usina');
      }

      toast.success(
        'Usina actualizada correctamente. Volverá a estado pendiente hasta nueva aprobación.',
        { id: toastId }
      );
      closeModal();

      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (err) {
      console.error('Error al modificar usina:', err);
      toast.error('Error al modificar la usina: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // 🔹 helper para imagen de tarjeta
  const getCardImage = (usina) => {
    if (usina.previewUrl) return usina.previewUrl;
    if (usina.mediaUrl) return usina.mediaUrl;
    // strapi style: usina.media.data.attributes.url
    const mediaData = usina.media?.data || usina.media;
    const mediaUrl = mediaData?.attributes?.url || mediaData?.url;
    if (mediaUrl) return mediaUrl;
    return '/placeholder.jpg';
  };

  // 🔹 helper para imagen/video del modal
  const getModalMedia = (usina) => {
    if (!usina) return { url: '/placeholder.jpg', type: 'image' };
    const url =
      usina.mediaUrl ||
      usina.previewUrl ||
      usina.media?.data?.attributes?.url ||
      usina.media?.url ||
      '/placeholder.jpg';
    const type = usina.mediaType || 'image';
    return { url, type };
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p className={styles.loadingText}>Cargando trabajos...</p>
      </div>
    );
  }

  return (
    <>
      {/* 🔹 Filtros */}
      {Array.isArray(usinas) && usinas.length > 0 && (
        <UsinaFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalUsinas={usinas.length}
          filteredCount={filteredAndSortedUsinas.length}
        />
      )}

      {/* 🔹 Controles de paginación - arriba */}
      {Array.isArray(usinas) && usinas.length > 0 && (
        <div className={styles.paginationControls}>
          <div className={styles.pageSizeSelector}>
            <label htmlFor="pageSize" className={styles.textSizeSelector}>
              Mostrar:
            </label>
            <select
              id="pageSize"
              value={pagination.pageSize}
              onChange={(e) => handlePageSizeChange(e.target.value)}
              className={styles.pageSizeSelect}
            >
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={24}>24</option>
              <option value={32}>32</option>
            </select>
            <span className={styles.textSizeSelector}>entradas por página</span>
          </div>

          <div className={styles.paginationInfo}>
            Mostrando {Math.min(endIndex, totalUsinas)} de {totalUsinas} trabajos
          </div>
        </div>
      )}

      {/* 🔹 Galería */}
      <div className={usinaStyles.usinaGaleria}>
        {usinasPaginated.length > 0 ? (
          usinasPaginated.map((usina) => (
            <div
              key={usina.documentId || usina.id}
              className={usinaStyles.usinaCard}
              onClick={() => handleCardClick(usina)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' ? handleCardClick(usina) : null)}
            >
              <img
                src={getCardImage(usina)}
                alt={usina.titulo || 'Trabajo sin título'}
                className={usinaStyles.usinaImage}
              />
              <div className={usinaStyles.usinaContenido}>
                <h3 className={usinaStyles.usinaTitulo}>
                  {usina.titulo || 'Sin título'}
                </h3>
                <p className={usinaStyles.usinaCarrera}>
                  {usina.creador?.carrera || 'Sin carrera especificada'}
                </p>
                {usina.link && (
                  <a
                    href={usina.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={usinaStyles.usinaLink}
                  >
                    Contactar
                  </a>
                )}
              </div>
            </div>
          ))
        ) : (
          <p className={styles.noPublicaciones}>
            {filters.searchTerm
              ? 'No se encontraron trabajos que coincidan con tu búsqueda.'
              : 'Este usuario aún no ha publicado trabajos aprobados.'}
          </p>
        )}
      </div>

      {/* 🔹 Controles de paginación - abajo */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button
            className={styles.paginationBtn}
            onClick={() => handlePageChange(pagination.page - 1)}
            disabled={pagination.page === 1}
          >
            Anterior
          </button>

          <div className={styles.paginationNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(
                (page) =>
                  page === 1 ||
                  page === totalPages ||
                  Math.abs(page - pagination.page) <= 1
              )
              .map((page, index, array) => {
                const showEllipsis = index > 0 && page - array[index - 1] > 1;
                return (
                  <span key={page}>
                    {showEllipsis && (
                      <span className={styles.paginationEllipsis}>...</span>
                    )}
                    <button
                      className={`${styles.paginationBtn} ${
                        pagination.page === page ? styles.paginationBtnActive : ''
                      }`}
                      onClick={() => handlePageChange(page)}
                    >
                      {page}
                    </button>
                  </span>
                );
              })}
          </div>

          <button
            className={styles.paginationBtn}
            onClick={() => handlePageChange(pagination.page + 1)}
            disabled={pagination.page === totalPages}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* 🔹 Modal de vista detallada */}
      {selectedUsina && (
        <div className={usinaStyles.modalOverlay} onClick={closeModal}>
          <div
            className={usinaStyles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <button className={usinaStyles.closeButton} onClick={closeModal}>
              ✕
            </button>

            <div className={usinaStyles.modalImageContainer}>
              <div
                className={styles.imageWrapper}
                onMouseEnter={() => setImageHovered(true)}
                onMouseLeave={() => setImageHovered(false)}
              >
                {(() => {
                  const { url, type } = getModalMedia(selectedUsina);
                  if (type === 'video') {
                    return (
                      <video
                        src={url}
                        className={usinaStyles.modalImage}
                        controls
                        autoPlay
                        muted
                        playsInline
                      >
                        Tu navegador no soporta el elemento de video.
                      </video>
                    );
                  }
                  return (
                    <img
                      src={url}
                      alt={selectedUsina.titulo}
                      className={usinaStyles.modalImage}
                    />
                  );
                })()}

                {/* overlay de edición */}
                {editingInModal &&
                  imageHovered &&
                  selectedUsina.mediaType !== 'video' && (
                    <div className={styles.imageOverlay}>
                      <input
                        id="modal-image-input"
                        type="file"
                        accept="image/*,video/*"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const file = e.target.files[0];
                            const nextData = { ...editData, imagen: file };
                            const errs = validateEdit(nextData);
                            setEditData(nextData);
                            setEditErrors(errs);
                          }
                        }}
                      />
                      <button
                        className={styles.editImageButton}
                        onClick={handleImageEditClick}
                      >
                        Cambiar media
                      </button>
                      {editErrors.imagen && (
                        <p className={styles.errorText}>{editErrors.imagen}</p>
                      )}
                    </div>
                  )}
              </div>
            </div>

            <div className={usinaStyles.modalInfo}>
              {editingInModal ? (
                <>
                  <textarea
                    className={styles.editTextarea}
                    value={editData.titulo}
                    name="titulo"
                    onChange={handleEditChange}
                    rows={2}
                    maxLength={100}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {editErrors.titulo && (
                    <p className={styles.errorText}>{editErrors.titulo}</p>
                  )}
                </>
              ) : (
                <h2 className={usinaStyles.modalTitulo}>
                  {selectedUsina.titulo}
                </h2>
              )}

              {selectedUsina.creador && (
                <p className={usinaStyles.modalText}>
                  <b className={usinaStyles.modalStrong}>Creador:</b>{' '}
                  {selectedUsina.creador.name} {selectedUsina.creador.surname}{' '}
                  <span className={usinaStyles.username}>
                    @{selectedUsina.creador.username}
                  </span>
                </p>
              )}

              <p className={usinaStyles.modalText}>
                <b className={usinaStyles.modalStrong}>Carrera:</b>{' '}
                {selectedUsina.creador?.carrera || 'Sin carrera especificada'}
              </p>

              {selectedUsina.createdAt && (
                <p className={usinaStyles.modalText}>
                  <b className={usinaStyles.modalStrong}>Publicado:</b>{' '}
                  {new Date(selectedUsina.createdAt).toLocaleDateString('es-AR')}
                </p>
              )}

              <div className={usinaStyles.modalActions}>
                {isCurrentUser && canCurrentUserEdit(selectedUsina) && (
                  <>
                    {!editingInModal ? (
                      <div className={styles.actionButtons}>
                        <button
                          className={styles.editButton}
                          onClick={handleEditClick}
                        >
                          Editar
                        </button>
                        <button
                          className={styles.deleteButton}
                          onClick={handleDeleteClick}
                          disabled={deleting}
                        >
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <div className={styles.editActionButtons}>
                        <button
                          className={styles.saveButton}
                          onClick={guardarCambios}
                          disabled={saving}
                        >
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          className={styles.cancelButton}
                          onClick={handleCancelEdit}
                          disabled={saving}
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🔹 Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className={styles.confirmModalOverlay} onClick={closeDeleteConfirm}>
          <div
            className={styles.confirmModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.confirmModalHeader}>
              <h3 className={styles.confirmModalTitle}>Confirmar Eliminación</h3>
              <button
                className={styles.confirmCloseButton}
                onClick={closeDeleteConfirm}
              >
                ✕
              </button>
            </div>

            <div className={styles.confirmModalBody}>
              <div className={styles.warningIcon}>⚠️</div>
              <p className={styles.confirmModalText}>
                ¿Estás seguro de que querés eliminar la usina{' '}
                <strong className={styles.confirmationTitulo}>
                  "{selectedUsina?.titulo}"
                </strong>
                ?
              </p>
              <p className={styles.warningText}>
                Esta acción es irreversible y no se puede deshacer.
              </p>
            </div>

            <div className={styles.confirmModalActions}>
              <button
                className={styles.cancelConfirmButton}
                onClick={closeDeleteConfirm}
                disabled={deleting}
              >
                Cancelar
              </button>
              <button
                className={styles.confirmDeleteButton}
                onClick={handleDeleteUsina}
                disabled={deleting}
              >
                {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
