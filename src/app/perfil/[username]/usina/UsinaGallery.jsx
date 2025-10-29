'use client';

import { useState, useEffect, useMemo } from 'react';
import { API_URL, API_TOKEN } from "@/app/config";
import usinaStyles from "@/styles/components/Usina/Usina.module.css";
import styles from "@/styles/components/Perfil/PerfilPublico.module.css";
import toast from 'react-hot-toast';
import UsinaFilters from './UsinaFilters';

export default function UsinaGallery({ usinas, loading, isCurrentUser, currentUserId }) {
  const [selectedUsina, setSelectedUsina] = useState(null);
  const [editingInModal, setEditingInModal] = useState(false);
  const [editData, setEditData] = useState({
    titulo: '',
    imagen: null,
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // 🔹 Estado para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 8,
    total: 0
  });

  // 🔹 Estado para filtros
  const [filters, setFilters] = useState({
    searchTerm: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });

  // 🔹 Función para manejar cambios en filtros
  const handleFiltersChange = (newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // 🔹 Función para normalizar texto (búsqueda sin acentos)
  const normalizeText = (text) => {
    return text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // 🔹 Aplicar filtros y ordenamiento
  const filteredAndSortedUsinas = useMemo(() => {
    if (!usinas.length) return [];

    let filtered = [...usinas];

    // Aplicar búsqueda por título
    if (filters.searchTerm) {
      const searchTermNormalized = normalizeText(filters.searchTerm);
      filtered = filtered.filter(usina =>
        normalizeText(usina.titulo || '').includes(searchTermNormalized)
      );
    }

    // Aplicar ordenamiento
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

  // 🔹 Calcular datos de paginación (usando filteredAndSortedUsinas)
  const totalUsinas = filteredAndSortedUsinas.length;
  const totalPages = Math.ceil(totalUsinas / pagination.pageSize);
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const usinasPaginated = filteredAndSortedUsinas.slice(startIndex, endIndex);

  // Actualizar el efecto para mantener la paginación sincronizada
  useEffect(() => {
    setPagination(prev => ({ 
      ...prev, 
      total: filteredAndSortedUsinas.length 
    }));
  }, [filteredAndSortedUsinas.length]);

  // 🔹 Manejar cambio de página
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 🔹 Manejar cambio de tamaño de página
  const handlePageSizeChange = (newSize) => {
    setPagination({ 
      page: 1, 
      pageSize: parseInt(newSize), 
      total: filteredAndSortedUsinas.length 
    });
  };

  const handleCardClick = (usina) => {
    setSelectedUsina(usina);
    setEditingInModal(false);
    setEditData({
      titulo: usina.titulo || '',
      imagen: null,
    });
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedUsina(null);
    setEditingInModal(false);
    setImageHovered(false);
    document.body.style.overflow = 'auto';
  };

  const handleEditClick = () => {
    setEditingInModal(true);
  };

  const handleCancelEdit = () => {
    setEditingInModal(false);
    setImageHovered(false);
    // Restaurar los datos originales
    if (selectedUsina) {
      setEditData({
        titulo: selectedUsina.titulo || '',
        imagen: null,
      });
    }
  };

  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const handleImageEditClick = (e) => {
    e.stopPropagation();
    const fileInput = document.getElementById('modal-image-input');
    if (fileInput) {
      fileInput.click();
    }
  };

  // 🔹 Función para abrir el modal de confirmación de eliminación
  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  // 🔹 Función para cerrar el modal de confirmación
  const closeDeleteConfirm = () => {
    setShowDeleteConfirm(false);
  };

  // 🔹 Función para eliminar usina
  const handleDeleteUsina = async () => {
    if (!selectedUsina) return;

    setDeleting(true);
    const toastId = toast.loading('Eliminando usina...');
    const token = localStorage.getItem('jwt');
    const usinaId = selectedUsina.documentId || selectedUsina.id;

    try {
      const res = await fetch(`${API_URL}/usinas/${usinaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Error al eliminar usina');
      }

      // Actualizar el estado local eliminando la usina
      // Nota: Ahora esto debería manejarse en el componente padre
      // Para una solución completa, podrías pasar una función onUsinaDeleted al padre
      closeDeleteConfirm();
      closeModal();

      toast.success('Usina eliminada correctamente', { id: toastId });

      // Recargar la página para reflejar los cambios
      window.location.reload();

    } catch (err) {
      console.error('Error al eliminar usina:', err);
      toast.error('Error al eliminar la usina: ' + err.message, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  const guardarCambios = async (e) => {
    e?.preventDefault();
    if (!selectedUsina) return;

    setSaving(true);
    const toastId = toast.loading('Guardando cambios...');
    const token = localStorage.getItem('jwt');
    let mediaId = null;
    const usinaId = selectedUsina.documentId || selectedUsina.id;

    try {
      // Paso 1: subir nueva imagen si existe
      if (editData.imagen) {
        const uploadForm = new FormData();
        uploadForm.append('files', editData.imagen);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${token}`,
          },
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          throw new Error('Error al subir imagen');
        }

        const uploadData = await uploadRes.json();
        if (!uploadData?.[0]?.id) {
          throw new Error('No se pudo obtener el ID de la imagen subida');
        }

        mediaId = uploadData[0].id;
      }

      // Paso 2: preparar datos para la actualización
      const updateData = {
        titulo: editData.titulo.trim(),
        aprobado: 'pendiente', // Vuelve a estado pendiente al editar
      };

      // Solo incluir media si se subió una nueva
      if (mediaId) {
        updateData.media = mediaId;
      }

      // Paso 3: actualizar la usina (Strapi v5 usa data directamente)
      const res = await fetch(`${API_URL}/usinas/${usinaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: updateData,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error?.message || 'Error al actualizar usina');
      }

      closeModal();
      
      toast.success('Usina actualizada correctamente. Volverá a estado pendiente hasta nueva aprobación.', { id: toastId });

      // Recargar la página para reflejar los cambios
      window.location.reload();

    } catch (err) {
      console.error('Error al modificar usina:', err);
      toast.error('Error al modificar la usina: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
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
      {/* 🔹 Filtros para usinas */}
      {usinas.length > 0 && (
        <UsinaFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalUsinas={usinas.length}
          filteredCount={filteredAndSortedUsinas.length}
        />
      )}

      {/* 🔹 Controles de paginación - Superior */}
      {usinas.length > 0 && (
        <div className={styles.paginationControls}>
          <div className={styles.pageSizeSelector}>
            <label htmlFor="pageSize" className={styles.textSizeSelector}>Mostrar:</label>
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
              {/* Siempre usar img para la preview - si es video, previewUrl será el GIF */}
              <img 
                src={usina.previewUrl} 
                alt={usina.titulo} 
                className={usinaStyles.usinaImage} 
              />
              <div className={usinaStyles.usinaContenido}>
                <h3 className={usinaStyles.usinaTitulo}>{usina.titulo}</h3>
                <p className={usinaStyles.usinaCarrera}>{usina.creador?.carrera || 'Sin carrera especificada'}</p>
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
              : 'Este usuario aún no ha publicado trabajos aprobados.'
            }
          </p>
        )}
      </div>

      {/* 🔹 Controles de paginación - Inferior */}
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
              .filter(page => 
                page === 1 || 
                page === totalPages || 
                Math.abs(page - pagination.page) <= 1
              )
              .map((page, index, array) => {
                // Agregar puntos suspensivos para páginas omitidas
                const showEllipsis = index > 0 && page - array[index - 1] > 1;
                return (
                  <span key={page}>
                    {showEllipsis && <span className={styles.paginationEllipsis}>...</span>}
                    <button
                      className={`${styles.paginationBtn} ${pagination.page === page ? styles.paginationBtnActive : ''}`}
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

      {/* Modal de vista detallada */}
      {selectedUsina && (
        <div className={usinaStyles.modalOverlay} onClick={closeModal}>
          <div className={usinaStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={usinaStyles.closeButton} onClick={closeModal}>✕</button>

            <div className={usinaStyles.modalImageContainer}>
              <div 
                className={styles.imageWrapper}
                onMouseEnter={() => setImageHovered(true)}
                onMouseLeave={() => setImageHovered(false)}
              >
                {selectedUsina.mediaType === 'video' ? (
                  <video 
                    src={selectedUsina.mediaUrl} 
                    className={usinaStyles.modalImage}
                    controls
                    autoPlay
                    muted
                    playsInline
                  >
                    Tu navegador no soporta el elemento de video.
                  </video>
                ) : (
                  <img 
                    src={selectedUsina.mediaUrl} 
                    alt={selectedUsina.titulo} 
                    className={usinaStyles.modalImage} 
                  />
                )}
                
                {/* Overlay para editar imagen (solo en modo edición y cuando el mouse está sobre la imagen) */}
                {editingInModal && imageHovered && selectedUsina.mediaType === 'image' && (
                  <div className={styles.imageOverlay}>
                    <input
                      id="modal-image-input"
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setEditData(prev => ({
                            ...prev,
                            imagen: e.target.files[0]
                          }));
                        }
                      }}
                    />
                    <button
                      className={styles.editImageButton}
                      onClick={handleImageEditClick}
                    >
                      Cambiar media
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className={usinaStyles.modalInfo}>
              {editingInModal ? (
                <textarea
                  className={styles.editTextarea}
                  value={editData.titulo}
                  name="titulo"
                  onChange={handleEditChange}
                  rows={2}
                  maxLength={100}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <h2 className={usinaStyles.modalTitulo}>{selectedUsina.titulo}</h2>
              )}

              {selectedUsina.creador && (
                <p className={usinaStyles.modalText}>
                  <strong className={usinaStyles.modalStrong}>Creador:</strong> {selectedUsina.creador.name} {selectedUsina.creador.surname}{' '}
                  <span className={usinaStyles.username}>@{selectedUsina.creador.username}</span>
                </p>
              )}

              <p className={usinaStyles.modalText}><strong className={usinaStyles.modalStrong}>Carrera:</strong> {selectedUsina.creador?.carrera || 'Sin carrera especificada'}</p>

              {selectedUsina.createdAt && (
                <p className={usinaStyles.modalText}><strong className={usinaStyles.modalStrong}>Publicado:</strong> {new Date(selectedUsina.createdAt).toLocaleDateString('es-AR')}</p>
              )}

              <div className={usinaStyles.modalActions}>
                {isCurrentUser && (
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

      {/* Modal de confirmación de eliminación */}
      {showDeleteConfirm && (
        <div className={styles.confirmModalOverlay} onClick={closeDeleteConfirm}>
          <div className={styles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.confirmModalHeader}>
              <h3 className={styles.confirmModalTitle}>Confirmar Eliminación</h3>
              <button className={styles.confirmCloseButton} onClick={closeDeleteConfirm}>✕</button>
            </div>
            
            <div className={styles.confirmModalBody}>
              <div className={styles.warningIcon}>⚠️</div>
              <p className={styles.confirmModalText}>¿Estás seguro de que querés eliminar la usina <strong className={styles.confirmationTitulo}>"{selectedUsina?.titulo}"</strong>?</p>
              <p className={styles.warningText}>Esta acción es irreversible y no se puede deshacer.</p>
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