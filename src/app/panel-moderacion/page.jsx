'use client';

import { useEffect, useState } from 'react';
import { API_URL, URL, API_TOKEN } from '@/app/config';
import styles from '@/styles/components/Administrador/PanelModeracionUsina.module.css';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import { isNativePlatform, openMediaPicker } from '@/app/utils/mediaPicker';
import toast from 'react-hot-toast';

/* =========================================================
   Utils visibles de errores
========================================================= */
const parseErr = async (res) => {
  try { return await res.json(); } catch { return null; }
};

const logHttpError = async (res, ctx='') => {
  const body = await parseErr(res);
  console.error(`[${ctx}] status: ${res.status}`, body?.error || body || '—');
  return body;
};

/* =========================================================
   Resolver ID de usina (documentId -> id numérico)
========================================================= */
async function resolveUsinaNumericId({ id, documentId }) {
  // 1) validar id numérico
  if (typeof id === 'number' && Number.isInteger(id) && id > 0) {
    try {
      const res = await fetch(`${API_URL}/usinas/${id}`, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      if (res.ok) return id;
      await logHttpError(res, 'resolveUsinaNumericId:GET by id');
    } catch (e) {
      console.error('[resolveUsinaNumericId:id] error:', e);
    }
  }
  // 2) resolver por documentId
  if (documentId) {
    try {
      const url = `${API_URL}/usinas?fields[0]=id&filters[documentId][$eq]=${encodeURIComponent(documentId)}&pagination[pageSize]=1`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${API_TOKEN}` },
      });
      const json = await res.json();
      const found = Array.isArray(json?.data) && json.data[0]?.id;
      if (found) return Number(json.data[0].id);
      console.warn('[resolveUsinaNumericId:documentId] No se encontró numeric id para', documentId);
    } catch (e) {
      console.error('[resolveUsinaNumericId:documentId] error:', e);
    }
  }
  return null;
}

/* =========================================================
   Crear notificación (USINA) con fallback y publishedAt
========================================================= */
async function crearNotificacionInlineUsina({
  jwt,
  titulo,
  mensaje,
  receptorId,
  emisorId,
  usinaId,          // numérico (si lo tenés)
  usinaDocumentId,  // documentId como respaldo
  tipo = 'usina',
}) {
  const baseData = {
    titulo,
    mensaje,
    tipo,                    // 'usina' | 'agenda' | 'sistema'
    leida: 'no-leida',
    fechaEmision: new Date().toISOString(),
    publishedAt: new Date().toISOString(),
  };
  if (receptorId) baseData.receptor = Number(receptorId);
  if (emisorId)   baseData.emisor   = Number(emisorId);

  // resolve id numérico
  let usinaNumericId = await resolveUsinaNumericId({
    id: typeof usinaId === 'number' ? usinaId : null,
    documentId: usinaDocumentId || null,
  });

  const attempt = async (bearer, withRelation = true) => {
    const data = { ...baseData };
    if (withRelation && usinaNumericId) data.usinaAfectada = usinaNumericId;

    const res = await fetch(`${API_URL}/notificaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${bearer}`,
      },
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      const body = await logHttpError(res, withRelation ? 'noti:create(withRelation)' : 'noti:create(noRelation)');
      const valErr = body?.error?.name === 'ValidationError';
      const msg = body?.error?.message || '';
      if (valErr && /relation/i.test(msg)) {
        return { ok: false, retryNoRel: true, body };
      }
      return { ok: false, retryNoRel: false, body };
    }
    return { ok: true, body: await res.json().catch(() => null) };
  };

  const primary = jwt || API_TOKEN;

  // 1) intentar con relación si tenemos id numérico
  if (usinaNumericId) {
    const r1 = await attempt(primary, true);
    if (r1.ok) return true;

    if (r1.retryNoRel) {
      const r2 = await attempt(primary, false);
      if (r2.ok) return true;
      if (API_TOKEN && (r2.body?.error?.status === 401 || r2.body?.error?.status === 403)) {
        const r3 = await attempt(API_TOKEN, false);
        return !!r3.ok;
      }
      return false;
    }

    if (API_TOKEN && (r1.body?.error?.status === 401 || r1.body?.error?.status === 403)) {
      const r2 = await attempt(API_TOKEN, true);
      if (r2.ok) return true;
      if (r2.retryNoRel) {
        const r3 = await attempt(API_TOKEN, false);
        return !!r3.ok;
      }
      return false;
    }
    return false;
  }

  // 2) sin id numérico => crear sin relación
  console.warn('[noti:create] No se pudo resolver id numérico de usina. Creando sin relación.');
  const rA = await attempt(primary, false);
  if (rA.ok) return true;
  if (API_TOKEN && (rA.body?.error?.status === 401 || rA.body?.error?.status === 403)) {
    const rB = await attempt(API_TOKEN, false);
    return !!rB.ok;
  }
  return false;
}

/* =========================================================
   Funciones para manejar media (imágenes y videos)
========================================================= */
const getPreviewUrl = (media) => {
  if (!media) return '/placeholder.jpg';
  
  // Para imágenes - usar la URL original
  if (media.mime?.startsWith('image/')) {
    return media.url;
  }
  
  // Para videos - usar el preview GIF si existe
  if (media.mime?.startsWith('video/') && media.previewUrl) {
    return media.previewUrl;
  }
  
  // Fallback
  return media.url || '/placeholder.jpg';
};

const getMediaUrl = (media) => {
  if (!media) return '/placeholder.jpg';
  
  // Para ambos casos (imágenes y videos) usar la URL original
  return media.url || '/placeholder.jpg';
};

const getMediaType = (media) => {
  if (!media) return 'image';
  return media.mime?.startsWith('video/') ? 'video' : 'image';
};

export default function AdminUsinasPage() {
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [modal, setModal] = useState({ open: false, action: '', usina: null });
  const [tab, setTab] = useState('pendientes');

  // auth / user / rol
  const [jwt, setJwt] = useState(null);
  const [yo, setYo] = useState(null);
  const [rol, setRol] = useState(null);
  const isAdmin = rol === 'Administrador' || rol === 'SuperAdministrador';

  // paginación
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  /* ========= Estado de EDICIÓN ========= */
  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editTitulo, setEditTitulo] = useState('');
  const [editFile, setEditFile] = useState(null);
  const [editMotivo, setEditMotivo] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // JWT + me + rol
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    setJwt(t || null);

    (async () => {
      if (!t) return;
      try {
        const r = await fetch(`${API_URL}/users/me?populate=role`, {
          headers: { Authorization: `Bearer ${t}` },
        });
        const me = await r.json();
        if (me?.id) {
          setYo(me);
          const roleName = me?.role?.name || me?.role?.type || null;
          setRol(roleName);
        }
      } catch (e) {
        console.error('[me] error:', e);
      }
    })();
  }, []);

  // Cargar usinas
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_URL}/usinas?populate[0]=media&populate[1]=creador`, {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          },
        });
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const normalized = items.map((item) => {
          const a = item.attributes ?? item;

          // media - usando las nuevas funciones
          const mediaField = a.media;
          const mediaData = mediaField?.data ?? mediaField;
          const mediaAttrs = mediaData?.attributes ?? mediaData;
          
          const previewUrl = getPreviewUrl(mediaAttrs);
          const mediaUrl = getMediaUrl(mediaAttrs);
          const mediaType = getMediaType(mediaAttrs);

          // creador
          const creadorField = a.creador;
          const creadorData = creadorField?.data ?? creadorField;
          const creadorAttrs = creadorData?.attributes ?? creadorData;

          return {
            id: item.id,                                   // numérico
            documentId: item.documentId ?? item.id,        // respaldo
            titulo: a.titulo ?? 'Sin título',
            aprobado: a.aprobado ?? 'pendiente',
            previewUrl: previewUrl,
            mediaUrl: mediaUrl.startsWith('http') ? mediaUrl : `${URL}${mediaUrl}`,
            mediaType,
            mimeType: mediaAttrs?.mime,
            creador: creadorAttrs
              ? {
                  id: creadorData?.id,
                  name: creadorAttrs.name || '',
                  surname: creadorAttrs.surname || '',
                  username: creadorAttrs.username || '',
                  carrera: creadorAttrs.carrera || 'Sin carrera',
                }
              : null,
          };
        });

        setUsinas(normalized);
        setPagination((p) => ({ ...p, total: normalized.length }));
      } catch (err) {
        console.error('Error al obtener usinas:', err);
        toast.error('Error al cargar las usinas');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Aprobar / Rechazar
  const actualizarEstado = async (usina, nuevoEstado) => {
    try {
      if (!jwt) { toast.error('No hay token. Iniciá sesión.'); return; }

      const res = await fetch(`${API_URL}/usinas/${usina.documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data: { aprobado: nuevoEstado } }),
      });

      if (!res.ok) {
        await logHttpError(res, 'usina:update');
        throw new Error(`HTTP ${res.status}`);
      }

      setUsinas((prev) =>
        prev.map((u) => (u.documentId === usina.documentId ? { ...u, aprobado: nuevoEstado } : u))
      );

      // Notificación al creador
      if (usina?.creador?.id) {
        const fecha = new Date();
        const fechaAR = fecha.toLocaleDateString('es-AR');
        const horaAR = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const actor =
          (yo?.name || '') && (yo?.surname || '') ? `${yo.name} ${yo.surname}` : yo?.username || 'Administrador';

        const ok = await crearNotificacionInlineUsina({
          jwt,
          titulo: nuevoEstado === 'aprobada' ? 'Tu trabajo fue aprobado' : 'Tu trabajo fue rechazado',
          mensaje:
            nuevoEstado === 'aprobada'
              ? `Tu usina "${usina.titulo}" fue aprobada el ${fechaAR} a las ${horaAR} por ${actor}.`
              : `Tu usina "${usina.titulo}" fue rechazada el ${fechaAR} a las ${horaAR} por ${actor}.`,
          receptorId: usina.creador.id,
          emisorId: yo?.id,
          usinaId: usina.id,
          usinaDocumentId: usina.documentId,
        });

        if (!ok) { toast.error('Se actualizó, pero no se pudo notificar.'); }
      }

      toast.success(`Trabajo ${nuevoEstado === 'aprobada' ? 'aprobado' : 'rechazado'} correctamente`);
    } catch (e) {
      console.error('Error al actualizar usina:', e);
      toast.error('Error al actualizar el trabajo');
    } finally {
      setModal({ open: false, action: '', usina: null });
    }
  };

  // Eliminar
  const eliminarUsina = async (usina) => {
    try {
      if (!jwt) { toast.error('No hay token. Iniciá sesión.'); return; }

      const res = await fetch(`${API_URL}/usinas/${usina.documentId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        await logHttpError(res, 'usina:delete');
        throw new Error(`HTTP ${res.status}`);
      }

      setUsinas((prev) => prev.filter((u) => u.documentId !== usina.documentId));

      // (Opcional) notificar eliminación
      if (usina?.creador?.id) {
        const fecha = new Date();
        const fechaAR = fecha.toLocaleDateString('es-AR');
        const horaAR = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });

        const ok = await crearNotificacionInlineUsina({
          jwt,
          titulo: 'Tu trabajo fue eliminado',
          mensaje: `Tu usina "${usina.titulo}" fue eliminada el ${fechaAR} a las ${horaAR}.`,
          receptorId: usina.creador.id,
          emisorId: yo?.id,
          usinaId: usina.id,
          usinaDocumentId: usina.documentId,
        });

        if (!ok) { console.warn('[noti] No se pudo crear la notificación de eliminación.'); }
      }

      toast.success('Trabajo eliminado correctamente');
    } catch (e) {
      console.error('Error al eliminar usina:', e);
      toast.error('Error al eliminar el trabajo');
    } finally {
      setModal({ open: false, action: '', usina: null });
    }
  };

  const confirmarAccion = () => {
    const { action, usina } = modal;
    if (action === 'aprobar') actualizarEstado(usina, 'aprobada');
    else if (action === 'rechazar') actualizarEstado(usina, 'rechazada');
    else if (action === 'eliminar') eliminarUsina(usina);
  };

  /* =================== NUEVO: Manejo de selección de media con Capacitor =================== */
  const handleSelectMedia = async () => {
    if (uploadingMedia) return;

    try {
      setUploadingMedia(true);

      const mediaResult = await openMediaPicker({
        source: 'photos',
        allowEditing: false,
        quality: 90,
        resultType: 'DataUrl'
      });

      if (!mediaResult || !mediaResult.file) {
        console.log('Usuario canceló la selección');
        return;
      }

      const file = mediaResult.file;

      // Validaciones para imágenes y videos
      const okImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      const okVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v', 'video/*'];
      const maxImageMB = 5;
      const maxVideoMB = 50;

      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        toast.error('Solo se permiten imágenes o videos.');
        return;
      }

      if (isImage && !okImageTypes.includes(file.type)) {
        toast.error('Formato de imagen inválido (JPG, PNG, WEBP o AVIF).');
        return;
      }

      if (isVideo && !okVideoTypes.some(type => type === file.type || type === 'video/*')) {
        toast.error('Formato de video inválido (MP4, MOV, M4V).');
        return;
      }

      const maxSize = isImage ? maxImageMB : maxVideoMB;
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`El archivo supera ${maxSize} MB.`);
        return;
      }

      // Actualizar el estado con el archivo seleccionado
      setEditFile(file);
      toast.success(isImage ? 'Imagen seleccionada correctamente' : 'Video seleccionado correctamente');

    } catch (err) {
      console.error('Error seleccionando media:', err);
      toast.error('Error al seleccionar el archivo: ' + err.message);
    } finally {
      setUploadingMedia(false);
    }
  };

  /* =================== EDICIÓN =================== */
  const validarEdicion = () => {
    const e = {};
    if (!editTitulo || editTitulo.trim().length < 3) e.titulo = 'Mínimo 3 caracteres.';
    if (!editMotivo || editMotivo.trim().length < 5) e.motivo = 'Especificá el motivo (mín. 5).';
    if (editFile) {
      const isImage = editFile.type.startsWith('image/');
      const isVideo = editFile.type.startsWith('video/');
      
      if (isImage) {
        const okImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
        if (!okImageTypes.includes(editFile.type)) e.media = 'Formato de imagen inválido (JPG, PNG, WEBP o AVIF).';
        const maxImageMB = 5;
        if (editFile.size > maxImageMB * 1024 * 1024) e.media = `La imagen supera ${maxImageMB} MB.`;
      } else if (isVideo) {
        const okVideoTypes = ['video/mp4', 'video/quicktime', 'video/x-m4v'];
        if (!okVideoTypes.includes(editFile.type)) e.media = 'Formato de video inválido (MP4, MOV, M4V).';
        const maxVideoMB = 50;
        if (editFile.size > maxVideoMB * 1024 * 1024) e.media = `El video supera ${maxVideoMB} MB.`;
      } else {
        e.media = 'Tipo de archivo no soportado.';
      }
    }
    return e;
  };

  const abrirEditar = (usina) => {
    if (!isAdmin) { toast.error('No tenés permisos para editar.'); return; }
    setEditTarget(usina);
    setEditTitulo(usina?.titulo || '');
    setEditFile(null);
    setEditMotivo('');
    setEditErrors({});
    setEditOpen(true);
  };

  const guardarEdicion = async () => {
    if (!jwt) { toast.error('No hay token. Iniciá sesión.'); return; }
    const errs = validarEdicion();
    setEditErrors(errs);
    if (Object.keys(errs).length) return;

    try {
      setEditSaving(true);

      // 1) subir media si corresponde
      let mediaId = null;
      if (editFile) {
        const fd = new FormData();
        fd.append('files', editFile);
        const upRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${jwt}` },
          body: fd,
        });
        const upJson = await upRes.json();
        if (!upRes.ok || !upJson?.[0]?.id) {
          await logHttpError(upRes, 'media:upload');
          throw new Error('Error al subir el archivo.');
        }
        mediaId = upJson[0].id;
      }

      // 2) armar payload
      const data = { titulo: editTitulo.trim() };
      if (mediaId) data.media = mediaId;

      // 3) PUT a la usina (por documentId, como venías usando)
      const res = await fetch(`${API_URL}/usinas/${editTarget.documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data }),
      });

      if (!res.ok) {
        await logHttpError(res, 'usina:edit');
        throw new Error(`HTTP ${res.status}`);
      }

      // 4) actualizar en memoria
      setUsinas((prev) =>
        prev.map((u) =>
          u.documentId === editTarget.documentId
            ? {
                ...u,
                titulo: editTitulo.trim(),
                // Si se subió nueva media, actualizamos la URL (esto se refrescará en el próximo fetch)
              }
            : u
        )
      );

      // 5) notificar al creador con el motivo
      if (editTarget?.creador?.id) {
        const fecha = new Date();
        const fechaAR = fecha.toLocaleDateString('es-AR');
        const horaAR = fecha.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const actor =
          (yo?.name || '') && (yo?.surname || '') ? `${yo.name} ${yo.surname}` : yo?.username || 'Administrador';

        const msg =
          `Tu usina "${editTarget.titulo}" fue **modificada** el ${fechaAR} a las ${horaAR} por ${actor}.\n` +
          `**Motivo:** ${editMotivo.trim()}`;

        const ok = await crearNotificacionInlineUsina({
          jwt,
          titulo: 'Tu usina fue modificada',
          mensaje: msg,
          receptorId: editTarget.creador.id,
          emisorId: yo?.id,
          usinaId: editTarget.id,
          usinaDocumentId: editTarget.documentId,
        });

        if (!ok) {
          toast.error('La usina se editó, pero no se pudo notificar.');
        }
      }

      toast.success('Usina editada correctamente');
      setEditOpen(false);
      setEditTarget(null);
    } catch (e) {
      console.error('Error al editar usina:', e);
      toast.error('No se pudo guardar la edición.');
    } finally {
      setEditSaving(false);
    }
  };

  // paginación y tabs
  useEffect(() => {
    setPagination((p) => ({ ...p, page: 1 }));
  }, [tab]);

  const usinasFiltradas = usinas.filter((u) =>
    tab === 'pendientes' ? u.aprobado === 'pendiente' : tab === 'aprobadas' ? u.aprobado === 'aprobada' : u.aprobado === 'rechazada'
  );

  const totalUsinas = usinasFiltradas.length;
  const totalPages = Math.ceil(totalUsinas / pagination.pageSize) || 1;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const usinasPaginated = usinasFiltradas.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => setPagination((p) => ({ ...p, page: newPage }));
  const handlePageSizeChange = (newSize) =>
    setPagination({ page: 1, pageSize: parseInt(newSize), total: usinasFiltradas.length });

  // Función para manejar clic en la imagen/video
  const handleMediaClick = (usina) => {
    setSelectedMedia(usina);
    document.body.style.overflow = 'hidden';
  };

  const closeMediaModal = () => {
    setSelectedMedia(null);
    document.body.style.overflow = 'auto';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando trabajos...</p>
      </div>
    );
  }

  return (
    <div className={styles.bodyPanel}>
      <Header variant="dark" />
      <div className={styles.adminContainer}>
        <div className={`${styles.adminContent} mt-5`}>
          <h1 className={styles.adminTitle}>Panel de Moderación</h1>
          <p className={styles.adminSubtitle}>Gestiona los trabajos enviados por los usuarios</p>

          {/* Tabs */}
          <div className={styles.tabs}>
            {['pendientes', 'aprobadas', 'rechazadas'].map((tipo) => (
              <button
                key={tipo}
                className={`${styles.tab} ${tab === tipo ? styles.activeTab : ''}`}
                onClick={() => setTab(tipo)}
              >
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                <span className={styles.tabCount}>
                  ({usinas.filter((u) => {
                    if (tipo === 'pendientes') return u.aprobado === 'pendiente';
                    if (tipo === 'aprobadas') return u.aprobado === 'aprobada';
                    if (tipo === 'rechazadas') return u.aprobado === 'rechazada';
                    return false;
                  }).length})
                </span>
              </button>
            ))}
          </div>

          {/* Controles de paginación (arriba) */}
          {usinasFiltradas.length > 0 && (
            <div className={styles.paginationControls}>
              <div className={styles.pageSizeSelector}>
                <label className={styles.textPageSize} htmlFor="pageSize">Mostrar:</label>
                <select
                  id="pageSize"
                  value={pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className={styles.pageSizeSelect}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className={styles.textPageSize}>entradas por página</span>
              </div>
              <div className={styles.paginationInfo}>
                Mostrando {Math.min(endIndex, totalUsinas)} de {totalUsinas} trabajos
              </div>
            </div>
          )}

          {/* Paginación (abajo) */}
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
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - pagination.page) <= 1)
                  .map((page, index, array) => {
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

          {/* Grid */}
          <div className={styles.usinaGrid}>
            {usinasPaginated.length > 0 ? (
              usinasPaginated.map((usina) => (
                <div key={usina.documentId} className={styles.usinaCard}>
                  <div
                    className={styles.imageContainer}
                    onClick={() => handleMediaClick(usina)}
                  >
                    {usina.previewUrl && usina.previewUrl !== '/placeholder.jpg' ? (
                      <>
                        {/* Siempre usar img para la preview - si es video, previewUrl será el GIF */}
                        <img 
                          src={usina.previewUrl} 
                          alt={usina.titulo} 
                          className={styles.image}
                        />
                        {/* Indicador de video */}
                        {usina.mediaType === 'video' && (
                          <div className={styles.videoIndicator}>▶</div>
                        )}
                      </>
                    ) : (
                      <div className={styles.noImage}>Sin archivo</div>
                    )}
                  </div>

                  <div className={styles.usinaInfo}>
                    <h2 className={styles.titulo}>{usina.titulo}</h2>

                    {usina.creador && (
                      <div className={styles.creadorInfo}>
                        <p className={styles.creadorNombre}>
                          <strong>Creador:</strong> {usina.creador.name} {usina.creador.surname}
                        </p>
                        <p className={styles.creadorUsername}>@{usina.creador.username}</p>
                        <p className={styles.creadorCarrera}>{usina.creador.carrera}</p>
                      </div>
                    )}

                    <div className={`${styles.estado} ${styles[usina.aprobado]}`}>
                      Estado: {usina.aprobado}
                    </div>

                    {/* Indicador de tipo de media */}
                    <div className={styles.mediaType}>
                      Tipo: {usina.mediaType === 'video' ? 'Video' : 'Imagen'}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className={styles.actions}>
                    {tab === 'pendientes' && (
                      <>
                        <button
                          className={styles.btnAprobar}
                          onClick={() => setModal({ open: true, action: 'aprobar', usina })}
                        >
                          Aprobar
                        </button>
                        <button
                          className={styles.btnRechazar}
                          onClick={() => setModal({ open: true, action: 'rechazar', usina })}
                        >
                          Rechazar
                        </button>
                        {isAdmin && (
                          <button
                            className={styles.btnEditar}
                            onClick={() => abrirEditar(usina)}
                            title="Editar esta usina"
                          >
                            Editar
                          </button>
                        )}
                      </>
                    )}

                    {tab === 'aprobadas' && (
                      <>
                        <button
                          className={styles.btnRechazar}
                          onClick={() => setModal({ open: true, action: 'rechazar', usina })}
                        >
                          Rechazar
                        </button>
                        {isAdmin && (
                          <button
                            className={styles.btnEditar}
                            onClick={() => abrirEditar(usina)}
                          >
                            Editar
                          </button>
                        )}
                      </>
                    )}

                    {tab === 'rechazadas' && (
                      <>
                        <button
                          className={styles.btnAprobar}
                          onClick={() => setModal({ open: true, action: 'aprobar', usina })}
                        >
                          Aprobar
                        </button>
                        <button
                          className={styles.btnEliminar}
                          onClick={() => setModal({ open: true, action: 'eliminar', usina })}
                        >
                          Eliminar
                        </button>
                        {isAdmin && (
                          <button
                            className={styles.btnEditar}
                            onClick={() => abrirEditar(usina)}
                          >
                            Editar
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noUsinas}>
                <p>No hay trabajos {tab} en este momento.</p>
              </div>
            )}
          </div>

          {/* Modal Media (imagen/video) */}
          {selectedMedia && (
            <div className={styles.modalOverlay} onClick={closeMediaModal}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={closeMediaModal}>
                  ✕
                </button>

                <div className={styles.modalMediaContainer}>
                  {selectedMedia.mediaType === 'video' ? (
                    <video 
                      src={selectedMedia.mediaUrl} 
                      className={styles.modalMedia}
                      controls
                      autoPlay
                      muted
                      playsInline
                    >
                      Tu navegador no soporta el elemento de video.
                    </video>
                  ) : (
                    <img src={selectedMedia.mediaUrl} alt={selectedMedia.titulo} className={styles.modalMedia} />
                  )}
                </div>

                <div className={styles.modalInfo}>
                  <h2>{selectedMedia.titulo}</h2>

                  {selectedMedia.creador && (
                    <p>
                      <b>Creador:</b> {selectedMedia.creador.name} {selectedMedia.creador.surname}{' '}
                      <span className={styles.username}>@{selectedMedia.creador.username}</span>
                    </p>
                  )}

                  <p><b>Carrera:</b> {selectedMedia.creador?.carrera || 'No especificada'}</p>
                  <p><b>Tipo:</b> {selectedMedia.mediaType === 'video' ? 'Video' : 'Imagen'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Modal Confirmación (aprobar/rechazar/eliminar) */}
          {modal.open && (
            <div className={styles.modalOverlay}>
              <div className={styles.confirmModal}>
                <h2 className={styles.modalTitle}>Confirmar acción</h2>
                <p className={styles.modalText}>
                  {modal.action === 'eliminar'
                    ? '¿Seguro que deseas eliminar este trabajo?'
                    : `¿Seguro que deseas ${modal.action} este trabajo?`}
                </p>
                {modal.usina && (
                  <div className={styles.modalUsinaInfo}>
                    <strong>{modal.usina.titulo}</strong>
                    {modal.usina.creador && <span> - @{modal.usina.creador.username}</span>}
                  </div>
                )}
                <div className={styles.modalButtons}>
                  <button className={styles.btnConfirmar} onClick={confirmarAccion}>
                    Confirmar
                  </button>
                  <button
                    className={styles.btnCancelar}
                    onClick={() => setModal({ open: false, action: '', usina: null })}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Modal EDICIÓN (solo Admin/SuperAdmin) */}
          {editOpen && isAdmin && (
            <div className={styles.modalOverlay} onClick={() => setEditOpen(false)}>
              <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.modalTitle}>Editar usina</h2>
                <p className={styles.modalText}>
                  Modificá el título y/o el archivo multimedia. <br/>
                  <strong>El motivo de la modificación</strong> se enviará al creador por notificación.
                </p>

                <form className={styles.editForm} onSubmit={(e) => { e.preventDefault(); guardarEdicion(); }}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="titulo">Título *</label>
                    <input
                      id="titulo"
                      className={`${styles.input} ${editErrors.titulo ? styles.inputError : ''}`}
                      type="text"
                      value={editTitulo}
                      onChange={(e) => setEditTitulo(e.target.value)}
                      placeholder="Nuevo título"
                    />
                    {editErrors.titulo && <span className={styles.errorText}>{editErrors.titulo}</span>}
                  </div>

                  <div className={`${styles.formGroup} ${styles.mediaEditWrapper}`}>
                    <div className={styles.mediaPreviewBox}>
                      {editFile ? (
                        editFile.type.startsWith('video/') ? (
                          <video
                            src={URL.createObjectURL(editFile)}
                            className={styles.mediaPreviewImg}
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={URL.createObjectURL(editFile)}
                            alt="Nueva imagen"
                            className={styles.mediaPreviewImg}
                          />
                        )
                      ) : editTarget?.previewUrl && editTarget.previewUrl !== '/placeholder.jpg' ? (
                        editTarget.mediaType === 'video' ? (
                          <video
                            src={editTarget.previewUrl}
                            className={styles.mediaPreviewImg}
                            muted
                            playsInline
                          />
                        ) : (
                          <img src={editTarget.previewUrl} alt="Actual" className={styles.mediaPreviewImg} />
                        )
                      ) : (
                        <span className={styles.noMedia}>Sin archivo</span>
                      )}
                    </div>
                    
                    {/* Input file tradicional solo para web */}
                    {!isNativePlatform() && (
                      <input
                        id="media"
                        className={styles.fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/quicktime,video/x-m4v"
                        onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                      />
                    )}

                    {/* Botón para seleccionar media en app nativa */}
                    <button
                      type="button"
                      onClick={handleSelectMedia}
                      className={styles.mediaSelectButton}
                      disabled={uploadingMedia}
                    >
                      {uploadingMedia ? 'Seleccionando...' : 
                       isNativePlatform() ? '📱 Elegir archivo' : 'Seleccionar archivo'}
                    </button>

                    {/* Mostrar información del archivo seleccionado */}
                    {editFile && (
                      <div className={styles.selectedFileInfo}>
                        <p>Archivo seleccionado: {editFile.name}</p>
                        <p>Tipo: {editFile.type.startsWith('video/') ? 'Video' : 'Imagen'}</p>
                        <p>Tamaño: {(editFile.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    )}
                    
                    {editErrors.media && <span className={styles.errorText}>{editErrors.media}</span>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="motivo">Motivo de la modificación *</label>
                    <textarea
                      id="motivo"
                      rows={3}
                      className={`${styles.input} ${editErrors.motivo ? styles.inputError : ''}`}
                      value={editMotivo}
                      onChange={(e) => setEditMotivo(e.target.value)}
                      placeholder="Explicá brevemente qué cambiaste y por qué"
                    />
                    {editErrors.motivo && <span className={styles.errorText}>{editErrors.motivo}</span>}
                  </div>

                  <div className={styles.modalButtons}>
                    <button
                      type="button"
                      className={styles.btnCancelar}
                      onClick={() => setEditOpen(false)}
                      disabled={editSaving}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={styles.btnConfirmar}
                      disabled={editSaving}
                    >
                      {editSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </div>
      </div>
      <Footer />
    </div>
  );
}