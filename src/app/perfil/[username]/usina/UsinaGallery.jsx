'use client';

import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { API_URL, API_TOKEN, URL } from '@/app/config';
import usinaStyles from '@/styles/components/Usina/Usina.module.css';
import styles from '@/styles/components/Perfil/PerfilPublico.module.css';
import toast from 'react-hot-toast';
import UsinaFilters from './UsinaFilters';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB

/* =========================================================
   Helpers de notificaciones
========================================================= */
async function crearNotificacionInline({
  token,
  titulo,
  mensaje,
  receptorId,
  emisorId,
  usinaId,
}) {
  if (!token) return;
  try {
    const data = {
      titulo,
      mensaje,
      tipo: 'usina',
      leida: 'no-leida',
      fechaEmision: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
    };
    if (receptorId) data.receptor = Number(receptorId);
    if (emisorId) data.emisor = Number(emisorId);
    if (usinaId) data.usinaAfectada = Number(usinaId);

    const res = await fetch(`${API_URL}/notificaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ data }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error('[noti] error creando notificación:', err);
    }
  } catch (e) {
    console.error('[noti] exception:', e);
  }
}

/**
 * Notifica a todos los usuarios con rol Admin/Profesor/SuperAdmin que una usina volvió a "pendiente".
 * Usa API_TOKEN para actuar como sistema.
 */
async function notificarRolesVuelveAPendiente({ usinaTitulo, usinaId, editorId }) {
  if (!API_TOKEN) return;
  try {
    const usersRes = await fetch(
      `${API_URL}/users?populate=role&pagination[pageSize]=1000`,
      { headers: { Authorization: `Bearer ${API_TOKEN}` } }
    );
    const raw = await usersRes.json();

    const usuarios = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.data)
      ? raw.data.map((u) => ({ id: u.id, ...u.attributes }))
      : [];

    const destinatarios = usuarios.filter((u) => {
      const r = u.role?.name || u.role?.type || u.role?.displayName || u.role;
      return r === 'Administrador' || r === 'Profesor' || r === 'SuperAdministrador';
    });

    const titulo = 'Usina editada: quedó pendiente';
    const mensaje = `La usina "${usinaTitulo}" fue editada y pasó a estado pendiente para revisión.`;

    await Promise.all(
      destinatarios.map((u) =>
        crearNotificacionInline({
          token: API_TOKEN,
          titulo,
          mensaje,
          receptorId: u.id,
          emisorId: editorId,
          usinaId,
        })
      )
    );
  } catch (err) {
    console.error('[noti roles] fallo al listar/notificar:', err);
  }
}

export default function UsinaGallery({ usinas = [], loading, isCurrentUser, currentUserId }) {
  const [selectedUsina, setSelectedUsina] = useState(null);
  const [editingInModal, setEditingInModal] = useState(false);
  const [editData, setEditData] = useState({ titulo: '', imagen: null });
  const [editErrors, setEditErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [imageHovered, setImageHovered] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Paginación
  const [pagination, setPagination] = useState({ page: 1, pageSize: 8, total: 0 });

  // Filtros (incluye estado para ver rechazadas/pendientes/aprobadas)
  const [filters, setFilters] = useState(() => ({
    searchTerm: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    status: isCurrentUser ? 'todas' : 'aprobada',
  }));

  // Lista de usinas efectiva (cuando es tu perfil, sobreescribimos con fetch "full")
  const [ownUsinas, setOwnUsinas] = useState(usinas);
  useEffect(() => setOwnUsinas(usinas), [usinas]);

  // Carga FULL de mis usinas (incluye rechazadas/pendientes) si es mi perfil
  useEffect(() => {
    if (!isCurrentUser || !currentUserId) return;
    let ignore = false;

    (async () => {
      const jwt = (typeof window !== 'undefined' && localStorage.getItem('jwt')) || null;

      const headers = jwt
        ? { Authorization: `Bearer ${jwt}` }
        : API_TOKEN
        ? { Authorization: `Bearer ${API_TOKEN}` }
        : {};

      const qs =
        `filters[creador][id][$eq]=${currentUserId}` +
        `&publicationState=preview` +
        `&sort=createdAt:desc` +
        `&pagination[pageSize]=200` +
        `&populate[0]=media` +
        `&populate[1]=creador`;

      try {
        const res = await fetch(`${API_URL}/usinas?${qs}`, { headers });
        const json = await res.json().catch(() => null);
        const items = Array.isArray(json?.data) ? json.data : [];

        // Normalización calcada al Panel de Moderación
        const normalized = items.map((item) => {
          const a = item.attributes ?? item;

          // media
          let mediaUrl = '/placeholder.jpg';
          let mediaType = 'image';
          const mediaField = a.media;
          const mediaData = mediaField?.data ?? mediaField;
          const mediaAttrs = mediaData?.attributes ?? mediaData;
          const urlPath = mediaAttrs?.url;
          const mime = mediaAttrs?.mime || '';
          if (urlPath) mediaUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;
          if (mime.startsWith('video/')) mediaType = 'video';

          // creador
          const creadorField = a.creador;
          const creadorData = creadorField?.data ?? creadorField;
          const creadorAttrs = creadorData?.attributes ?? creadorData;

          return {
            id: item.id,
            documentId: item.documentId ?? item.id,
            titulo: a.titulo ?? 'Sin título',
            aprobado: (a.aprobado ?? 'pendiente').toLowerCase(),
            mediaUrl,
            mediaType,
            creador: creadorAttrs
              ? {
                  id: creadorData?.id,
                  name: creadorAttrs.name || '',
                  surname: creadorAttrs.surname || '',
                  username: creadorAttrs.username || '',
                  carrera: creadorAttrs.carrera || 'Sin carrera',
                }
              : null,
            createdAt: a.createdAt || item.createdAt,
            publishedAt: a.publishedAt || item.publishedAt,
          };
        });

        if (!ignore) setOwnUsinas(normalized);
      } catch (e) {
        console.error('No se pudieron traer todas las usinas del usuario:', e);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [isCurrentUser, currentUserId]);

  // normalizar texto
  const normalizeText = (text) =>
    (text || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

  // Fuente de datos: si es tu perfil → ownUsinas; si no → props
  const sourceUsinas = isCurrentUser ? ownUsinas : usinas;

  // aplicar filtros y orden
  const filteredAndSortedUsinas = useMemo(() => {
    if (!Array.isArray(sourceUsinas) || !sourceUsinas.length) return [];

    let filtered = [...sourceUsinas];

    // Estado
    if (isCurrentUser) {
      if (filters.status && filters.status !== 'todas') {
        filtered = filtered.filter(
          (u) => (u.aprobado || '').toLowerCase() === filters.status
        );
      }
    } else {
      filtered = filtered.filter((u) => (u.aprobado || '').toLowerCase() === 'aprobada');
    }

    // búsqueda
    if (filters.searchTerm) {
      const st = normalizeText(filters.searchTerm);
      filtered = filtered.filter((u) => normalizeText(u.titulo || '').includes(st));
    }

    // orden
    filtered.sort((a, b) => {
      let A, B;
      switch (filters.sortBy) {
        case 'titulo':
          A = normalizeText(a.titulo || '');
          B = normalizeText(b.titulo || '');
          break;
        case 'createdAt':
        default:
          A = new Date(a.createdAt || a.publishedAt || Date.now());
          B = new Date(b.createdAt || b.publishedAt || Date.now());
          break;
      }
      if (A < B) return filters.sortOrder === 'asc' ? -1 : 1;
      if (A > B) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [sourceUsinas, filters, isCurrentUser]);

  // paginación
  const totalUsinas = filteredAndSortedUsinas.length;
  const totalPages = Math.ceil(totalUsinas / pagination.pageSize) || 1;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const usinasPaginated = filteredAndSortedUsinas.slice(startIndex, endIndex);

  useEffect(() => {
    setPagination((prev) => ({
      ...prev,
      total: filteredAndSortedUsinas.length,
      page:
        prev.page > 1 && startIndex >= filteredAndSortedUsinas.length
          ? prev.page - 1
          : prev.page,
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredAndSortedUsinas.length]);

  // bloquear scroll al abrir modal principal
  useEffect(() => {
    if (selectedUsina) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => (document.body.style.overflow = 'auto');
  }, [selectedUsina]);

  const handleFiltersChange = (newFilters) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (p) => {
    if (p < 1 || p > totalPages) return;
    setPagination((prev) => ({ ...prev, page: p }));
  };

  const handlePageSizeChange = (val) => {
    const size = parseInt(val, 10) || 8;
    setPagination({ page: 1, pageSize: size, total: filteredAndSortedUsinas.length });
  };

  const canCurrentUserEdit = (usina) => {
    if (!isCurrentUser) return false;
    if (!currentUserId) return false;
    if (!usina?.creador?.id) return true;
    return usina.creador.id === currentUserId;
  };

  const handleCardClick = (usina) => {
    setSelectedUsina(usina);
    setEditingInModal(false);
    setEditData({ titulo: usina.titulo || '', imagen: null });
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
      setEditData({ titulo: selectedUsina.titulo || '', imagen: null });
      setEditErrors({});
    }
  };

  const validateEdit = (data) => {
    const errs = {};
    const t = (data.titulo || '').trim();
    if (!t) errs.titulo = 'El título es obligatorio.';
    else if (t.length < 3) errs.titulo = 'Mínimo 3 caracteres.';
    else if (t.length > 100) errs.titulo = 'Máximo 100 caracteres.';

    if (data.imagen) {
      const f = data.imagen;
      const isImage = f.type?.startsWith('image/');
      const isVideo = f.type?.startsWith('video/');
      if (!isImage && !isVideo) errs.imagen = 'Formato no soportado.';
      else if (isImage && f.size > MAX_IMAGE_SIZE) errs.imagen = 'Imagen > 5MB.';
      else if (isVideo && f.size > MAX_VIDEO_SIZE) errs.imagen = 'Video > 50MB.';
    }
    return errs;
  };

  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    const next = { ...editData, [name]: files ? files[0] : value };
    setEditData(next);
    setEditErrors(validateEdit(next));
  };

  const handleImageEditClick = (e) => {
    e.stopPropagation();
    const inp = document.getElementById('modal-image-input');
    if (inp) inp.click();
  };

  // eliminar
  const handleDeleteClick = () => {
    if (!selectedUsina) return;
    if (!canCurrentUserEdit(selectedUsina)) {
      toast.error('No tenés permisos para eliminar este trabajo.');
      return;
    }
    setShowDeleteConfirm(true);
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
      toast.error('No hay sesión.', { id: toastId });
      setDeleting(false);
      return;
    }

    try {
      const res = await fetch(`${API_URL}/usinas/${usinaId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error?.message || 'Error al eliminar usina');
      }
      setShowDeleteConfirm(false);
      closeModal();
      toast.success('Usina eliminada correctamente.', { id: toastId });
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error('Error: ' + err.message, { id: toastId });
    } finally {
      setDeleting(false);
    }
  };

  // guardar edición → vuelve a pendiente + notificación a roles
  const guardarCambios = async (e) => {
    e?.preventDefault();
    if (!selectedUsina) return;
    if (!canCurrentUserEdit(selectedUsina)) return toast.error('Sin permisos.');

    const errs = validateEdit(editData);
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      return toast.error('Revisá los campos.');
    }

    setSaving(true);
    const toastId = toast.loading('Guardando...');
    const token =
      (typeof window !== 'undefined' && localStorage.getItem('jwt')) ||
      API_TOKEN ||
      null;
    let mediaId = null;
    const usinaIdParaPUT = selectedUsina.documentId || selectedUsina.id;

    if (!token) {
      toast.error('No hay sesión.', { id: toastId });
      setSaving(false);
      return;
    }

    try {
      // subir media nueva si corresponde
      if (editData.imagen) {
        const fd = new FormData();
        fd.append('files', editData.imagen);
        const up = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        if (!up.ok) throw new Error('Error al subir imagen/video');
        const upJson = await up.json();
        if (!upJson?.[0]?.id) throw new Error('No se obtuvo el ID de la media');
        mediaId = upJson[0].id;
      }

      // actualizar usina → vuelve a "pendiente"
      const updateData = {
        titulo: editData.titulo.trim(),
        aprobado: 'pendiente',
        ...(mediaId ? { media: mediaId } : {}),
      };

      const res = await fetch(`${API_URL}/usinas/${usinaIdParaPUT}`, {
        method: 'PUT', // si tu Strapi solo admite PATCH, cambialo aquí
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ data: updateData }),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error?.message || 'Error al actualizar');

      const usinaIdNumerico = json?.data?.id || selectedUsina.id || null;

      // notificar a Admin/Profesor/SuperAdministrador
      try {
        await notificarRolesVuelveAPendiente({
          usinaTitulo: editData.titulo.trim(),
          usinaId: usinaIdNumerico,
          editorId: currentUserId,
        });
      } catch (notifErr) {
        console.error('No se pudo notificar a roles:', notifErr);
      }

      toast.success('Usina actualizada y vuelta a pendiente.', { id: toastId });
      closeModal();
      if (typeof window !== 'undefined') window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error('Error: ' + err.message, { id: toastId });
    } finally {
      setSaving(false);
    }
  };

  // helpers media (usamos lo normalizado)
  const getCardImage = (u) => u?.mediaUrl || '/placeholder.jpg';

  const getModalMedia = (u) => {
    if (!u) return { url: '/placeholder.jpg', type: 'image' };
    return { url: u.mediaUrl || '/placeholder.jpg', type: u.mediaType || 'image' };
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
      {/* Filtros - si hay usinas */}
      {Array.isArray(sourceUsinas) && sourceUsinas.length > 0 && (
        <UsinaFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
          totalUsinas={sourceUsinas.length}
          filteredCount={filteredAndSortedUsinas.length}
        />
      )}

      {/* Controles arriba */}
      {Array.isArray(sourceUsinas) && sourceUsinas.length > 0 && (
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

          {/* Selector de estado (solo si es tu perfil) */}
          <div className={styles.pageSizeSelector}>
            <label htmlFor="status" className={styles.textSizeSelector}>Estado:</label>
            <select
              id="status"
              value={filters.status}
              onChange={(e) => handleFiltersChange({ status: e.target.value })}
              className={styles.pageSizeSelect}
              disabled={!isCurrentUser}
            >
              <option value="todas">Todas</option>
              <option value="aprobada">Aprobadas</option>
              <option value="pendiente">Pendientes</option>
              <option value="rechazada">Rechazadas</option>
            </select>
          </div>

          <div className={styles.paginationInfo}>
            Mostrando {Math.min(endIndex, totalUsinas)} de {totalUsinas} trabajos
          </div>
        </div>
      )}

      {/* Galería */}
      <div className={usinaStyles.usinaGaleria}>
        {usinasPaginated.length > 0 ? (
          usinasPaginated.map((u) => (
            <div
              key={u.documentId || u.id}
              className={usinaStyles.usinaCard}
              onClick={() => handleCardClick(u)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === 'Enter' ? handleCardClick(u) : null)}
            >
              <img src={getCardImage(u)} alt={u.titulo || 'Trabajo sin título'} className={usinaStyles.usinaImage} />
              <div className={usinaStyles.usinaContenido}>
                <h3 className={usinaStyles.usinaTitulo}>{u.titulo || 'Sin título'}</h3>
                <p className={usinaStyles.usinaCarrera}>{u.creador?.carrera || 'Sin carrera especificada'}</p>
                {u.link && (
                  <a href={u.link} target="_blank" rel="noopener noreferrer" className={usinaStyles.usinaLink}>
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
              : isCurrentUser
              ? 'No tenés trabajos con el estado seleccionado.'
              : 'Este usuario aún no ha publicado trabajos aprobados.'}
          </p>
        )}
      </div>

      {/* Paginación abajo */}
      {totalPages > 1 && (
        <div className={styles.pagination}>
          <button className={styles.paginationBtn} onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
            Anterior
          </button>

          <div className={styles.paginationNumbers}>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - pagination.page) <= 1)
              .map((p, idx, arr) => {
                const ellipsis = idx > 0 && p - arr[idx - 1] > 1;
                return (
                  <span key={p}>
                    {ellipsis && <span className={styles.paginationEllipsis}>...</span>}
                    <button
                      className={`${styles.paginationBtn} ${pagination.page === p ? styles.paginationBtnActive : ''}`}
                      onClick={() => handlePageChange(p)}
                    >
                      {p}
                    </button>
                  </span>
                );
              })}
          </div>

          <button className={styles.paginationBtn} onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === totalPages}>
            Siguiente
          </button>
        </div>
      )}

      {/* Modal principal */}
      {selectedUsina && (
        <div className={usinaStyles.modalOverlay} onClick={closeModal}>
          <div className={usinaStyles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={usinaStyles.closeButton} onClick={closeModal}>✕</button>

            <div className={usinaStyles.modalImageContainer}>
              <div
                className={usinaStyles.imageWrapper}
                onMouseEnter={() => setImageHovered(true)}
                onMouseLeave={() => setImageHovered(false)}
              >
                {(() => {
                  const { url, type } = getModalMedia(selectedUsina);
                  if (type === 'video') {
                    return (
                      <video src={url} className={usinaStyles.modalImage} controls autoPlay muted playsInline>
                        Tu navegador no soporta el elemento de video.
                      </video>
                    );
                  }
                  return <img src={url} alt={selectedUsina.titulo} className={usinaStyles.modalImage} />;
                })()}

                {/* Overlay de edición SOLO si está en modo edición y no es video */}
                {editingInModal && imageHovered && selectedUsina.mediaType !== 'video' && (
                  <div className={usinaStyles.imageOverlay}>
                    <input
                      id="modal-image-input"
                      type="file"
                      accept="image/*,video/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          const next = { ...editData, imagen: file };
                          setEditData(next);
                          setEditErrors(validateEdit(next));
                        }
                      }}
                    />
                    <button className={usinaStyles.editImageButton} onClick={handleImageEditClick}>
                      Cambiar media
                    </button>
                    {editErrors.imagen && <p className={usinaStyles.errorText}>{editErrors.imagen}</p>}
                  </div>
                )}
              </div>
            </div>

            <div className={usinaStyles.modalInfo}>
              {editingInModal ? (
                <>
                  <textarea
                    className={usinaStyles.editTextarea}
                    value={editData.titulo}
                    name="titulo"
                    onChange={handleEditChange}
                    rows={2}
                    maxLength={100}
                    onClick={(e) => e.stopPropagation()}
                  />
                  {editErrors.titulo && <p className={usinaStyles.errorText}>{editErrors.titulo}</p>}
                </>
              ) : (
                <h2 className={usinaStyles.modalTitulo}>{selectedUsina.titulo}</h2>
              )}

              {selectedUsina.creador && (
                <p className={usinaStyles.modalText}>
                  <b className={usinaStyles.modalStrong}>Creador:</b>{' '}
                  {selectedUsina.creador.name} {selectedUsina.creador.surname}{' '}
                  <span className={usinaStyles.username}>@{selectedUsina.creador.username}</span>
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
                      <div className={usinaStyles.actionButtons}>
                        <button className={usinaStyles.editButton} onClick={handleEditClick}>Editar</button>
                        <button className={usinaStyles.deleteButton} onClick={handleDeleteClick} disabled={deleting}>
                          Eliminar
                        </button>
                      </div>
                    ) : (
                      <div className={usinaStyles.editActionButtons}>
                        <button className={usinaStyles.saveButton} onClick={guardarCambios} disabled={saving}>
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button className={usinaStyles.cancelButton} onClick={handleCancelEdit} disabled={saving}>
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

      {/* Modal de confirmación de eliminación (Portal en body) */}
      {mounted && showDeleteConfirm &&
        createPortal(
          <div className={usinaStyles.confirmModalOverlay} onClick={() => !deleting && setShowDeleteConfirm(false)}>
            <div className={usinaStyles.confirmModalContent} onClick={(e) => e.stopPropagation()}>
              <div className={usinaStyles.confirmModalHeader}>
                <h3 className={usinaStyles.confirmModalTitle}>Confirmar Eliminación</h3>
                <button
                  className={usinaStyles.confirmCloseButton}
                  onClick={() => !deleting && setShowDeleteConfirm(false)}
                >
                  ✕
                </button>
              </div>

              <div className={usinaStyles.confirmModalBody}>
                <div className={usinaStyles.warningIcon}>⚠️</div>
                <p className={usinaStyles.confirmModalText}>
                  ¿Estás seguro de que querés eliminar la usina{' '}
                  <strong className={usinaStyles.confirmationTitulo}>"{selectedUsina?.titulo}"</strong>?
                </p>
                <p className={usinaStyles.warningText}>Esta acción es irreversible.</p>
              </div>

              <div className={usinaStyles.confirmModalActions}>
                <button
                  className={usinaStyles.cancelConfirmButton}
                  onClick={() => !deleting && setShowDeleteConfirm(false)}
                  disabled={deleting}
                >
                  Cancelar
                </button>
                <button
                  className={usinaStyles.confirmDeleteButton}
                  onClick={handleDeleteUsina}
                  disabled={deleting}
                >
                  {deleting ? 'Eliminando...' : 'Sí, Eliminar'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )
      }
    </>
  );
}
