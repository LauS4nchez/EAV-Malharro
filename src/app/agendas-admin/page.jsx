'use client';

import { useEffect, useState } from 'react';
import { API_URL, URL, API_TOKEN } from '@/app/config';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import toast from 'react-hot-toast';
import styles from '@/styles/components/Administrador/PanelModeracionUsina.module.css';

/* ================= Utils ================= */
const tryJson = async (res) => {
  try { return await res.json(); } catch { return null; }
};
const sanitize = (s='') => s.replace(/\s+/g, ' ').trim();

/* ============== Resolver existencia de agenda por id numérico (para relacionar) ============== */
async function agendaExists(numericId, bearer) {
  if (!numericId) return false;
  try {
    const r = await fetch(`${API_URL}/agendas/${numericId}`, {
      headers: bearer ? { Authorization: `Bearer ${bearer}` } : {},
    });
    return r.ok;
  } catch {
    return false;
  }
}

/* ============== Notificación robusta: relación segura + fallback sin relación ============== */
async function crearNotificacionInline({
  jwt,                       // token del admin logueado
  adminToken = API_TOKEN,    // fallback
  titulo,
  mensaje,
  receptorId,                // user id (número)
  emisorId,                  // user id (número)
  agendaNumericId,           // id numérico de agenda (para agendaAfectada)
  tipo = 'agenda',
}) {
  const base = {
    titulo,
    mensaje,
    tipo,                                  // 'agenda' | 'usina' | 'sistema'
    leida: 'no-leida',
    fechaEmision: new Date().toISOString(),
    publishedAt: new Date().toISOString(), // por si el CT usa draft&publish
  };
  if (receptorId) base.receptor = Number(receptorId);
  if (emisorId)   base.emisor   = Number(emisorId);

  const auths = [jwt, adminToken].filter(Boolean);

  for (const bearer of auths) {
    const canRelate = await agendaExists(agendaNumericId, bearer);

    const variants = canRelate
      ? [
          { agendaAfectada: Number(agendaNumericId) },                          // id plano
          { agendaAfectada: { connect: [{ id: Number(agendaNumericId) }] } },   // connect
          { agendaAfectada: { set:     [{ id: Number(agendaNumericId) }] } },   // set
          {},                                                                   // sin relación
        ]
      : [{}]; // si no existe, directo sin relación

    for (const rel of variants) {
      const res = await fetch(`${API_URL}/notificaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearer}` },
        body: JSON.stringify({ data: { ...base, ...rel } }),
      });
      if (res.ok) return true;

      const body = await tryJson(res);
      const msg = body?.error?.message || '';
      const isMissingRelation = res.status === 400 && /relation\(s\).+do not exist/i.test(msg);

      // si no fue error de relación y tampoco 401/403, probamos siguiente variante; si 401/403, probamos próximo bearer
      if (isMissingRelation) continue;
    }
  }
  return false;
}

/* ============== PUT de agenda robusto (documentId primero, fallback numérico) ============== */
async function putAgendaRobusto({ agendaIdDoc, agendaIdNum, jwt, body, withPopulate = true }) {
  const suffix = withPopulate ? '?populate=imagen' : '';
  // 1) Intento por documentId (como en tu MisAgendasPage que funciona)
  if (agendaIdDoc) {
    const r1 = await fetch(`${API_URL}/agendas/${agendaIdDoc}${suffix}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify(body),
    });
    if (r1.ok) return r1;
  }
  // 2) Fallback por id numérico
  if (agendaIdNum) {
    const r2 = await fetch(`${API_URL}/agendas/${agendaIdNum}${suffix}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
      body: JSON.stringify(body),
    });
    return r2;
  }
  // 3) Nada
  return new Response(null, { status: 404 });
}

/* ============== DELETE robusto (documentId → id numérico) ============== */
async function deleteAgendaRobusto({ agendaIdDoc, agendaIdNum, jwt }) {
  // 1) por documentId
  if (agendaIdDoc) {
    const r1 = await fetch(`${API_URL}/agendas/${agendaIdDoc}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` },
    });
    if (r1.ok) return r1;
  }
  // 2) por numérico
  if (agendaIdNum) {
    const r2 = await fetch(`${API_URL}/agendas/${agendaIdNum}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${jwt}` },
    });
    return r2;
  }
  return new Response(null, { status: 404 });
}

export default function AgendasAdminPage() {
  /* =================== Auth / rol / user =================== */
  const [jwt, setJwt] = useState(null);
  const [rol, setRol] = useState(null);
  const [me, setMe] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    setJwt(token || null);
    (async () => {
      if (!token) { setCheckingRole(false); return; }
      try {
        const r = await fetch(`${API_URL}/users/me?populate=role`, { headers: { Authorization: `Bearer ${token}` } });
        const user = await r.json();
        setMe(user);
        setRol(user?.role?.name || user?.role?.type || null);
      } catch (e) {
        console.error('[me] error:', e);
        setRol(null);
      } finally {
        setCheckingRole(false);
      }
    })();
  }, []);

  const isAdmin = rol === 'Administrador' || rol === 'SuperAdministrador';

  /* =================== Datos =================== */
  const [agendas, setAgendas] = useState([]);    // cada item: { id: documentId, numericId: number, ... }
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAgendas = async () => {
      try {
        // Usamos API_TOKEN para listar TODO (evita permisos del usuario); si no hay, cae a jwt
        const bearer = API_TOKEN || jwt;
        const res = await fetch(
          `${API_URL}/agendas?populate[0]=imagen&populate[1]=creador&sort=fecha:asc`,
          { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {}, cache: 'no-store' }
        );
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const norm = items.map((item) => {
          const a = item.attributes ?? item;

          // id para editar/borrar: documentId si existe, si no numérico (como en tu comp que funciona)
          const idDoc = item.documentId ?? null;
          const idNum = item.id ?? null;
          const idForEdit = idDoc || idNum; // endpoint

          // imagen
          let imageUrl = '/placeholder.jpg';
          const imgField = a.imagen;
          const imgData = imgField?.data ?? imgField;
          const imgAttrs = imgData?.attributes ?? imgData;
          const urlPath = imgAttrs?.url;
          if (urlPath) imageUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;

          // creador
          const creadorField = a.creador;
          const creadorData = creadorField?.data ?? creadorField;
          const creadorAttrs = creadorData?.attributes ?? creadorData;
          const creador = creadorAttrs
            ? {
                id: creadorData?.id,
                name: creadorAttrs.name || '',
                surname: creadorAttrs.surname || '',
                username: creadorAttrs.username || '',
              }
            : null;

          return {
            id: idForEdit,          // ← documentId si existe (para PUT/DELETE)
            numericId: idNum,       // ← numérico (para relaciones en notificaciones)
            tituloActividad: a.tituloActividad ?? '',
            contenidoActividad: a.contenidoActividad ?? '',
            fecha: a.fecha ?? '',
            imageUrl,
            creador,
          };
        });

        setAgendas(norm);
      } catch (e) {
        console.error('Error al obtener agendas:', e);
        toast.error('No se pudieron cargar las agendas.');
      } finally {
        setLoading(false);
      }
    };

    if (!checkingRole && isAdmin) fetchAgendas();
    else if (!checkingRole) setLoading(false);
  }, [checkingRole, isAdmin, jwt]);

  /* =================== Tabs + paginación =================== */
  const [tab, setTab] = useState('todas'); // todas | futuras | pasadas
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10 });
  useEffect(() => { setPagination((p) => ({ ...p, page: 1 })); }, [tab]);

  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const agendasFiltradas = agendas.filter((a) => {
    if (tab === 'todas') return true;
    if (!a.fecha) return tab === 'todas';
    const f = new Date(a.fecha); f.setHours(0, 0, 0, 0);
    if (tab === 'futuras') return f >= hoy;
    if (tab === 'pasadas') return f < hoy;
    return true;
  });

  const totalAgendas = agendasFiltradas.length;
  const totalPages = Math.ceil(totalAgendas / pagination.pageSize) || 1;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const agendasPaginated = agendasFiltradas.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => setPagination((p) => ({ ...p, page: newPage }));
  const handlePageSizeChange = (newSize) => setPagination({ page: 1, pageSize: parseInt(newSize, 10) });

  /* =================== Modales =================== */
  const [selectedImage, setSelectedImage] = useState(null);

  // Editar
  const [editModal, setEditModal] = useState({ open: false, agenda: null });
  const [editForm, setEditForm] = useState({
    tituloActividad: '',
    contenidoActividad: '',
    fecha: '',
    imagenFile: null,
    imagenPreview: '',
    motivo: '',
  });
  const [editErrors, setEditErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  const abrirModalEdicion = (agenda) => {
    setEditModal({ open: true, agenda });
    setEditForm({
      tituloActividad: agenda.tituloActividad || '',
      contenidoActividad: agenda.contenidoActividad || '',
      fecha: agenda.fecha ? agenda.fecha.slice(0, 10) : '',
      imagenFile: null,
      imagenPreview: agenda.imageUrl || '',
      motivo: '',
    });
    setEditErrors({});
  };
  const cerrarModalEdicion = () => {
    if (savingEdit) return;
    setEditModal({ open: false, agenda: null });
    setEditForm({
      tituloActividad: '',
      contenidoActividad: '',
      fecha: '',
      imagenFile: null,
      imagenPreview: '',
      motivo: '',
    });
    setEditErrors({});
  };

  // Eliminar
  const [deleteModal, setDeleteModal] = useState({ open: false, agenda: null, motivo: '' });
  const abrirModalDelete = (agenda) => setDeleteModal({ open: true, agenda, motivo: '' });
  const cerrarModalDelete = () => setDeleteModal({ open: false, agenda: null, motivo: '' });

  /* =================== Validaciones =================== */
  const validarEdicion = (form) => {
    const errors = {};
    const titulo = sanitize(form.tituloActividad);
    const desc = sanitize(form.contenidoActividad);
    const fecha = form.fecha;
    const motivo = sanitize(form.motivo);

    if (!titulo) errors.tituloActividad = 'El título es obligatorio.';
    else if (titulo.length < 3) errors.tituloActividad = 'Usá al menos 3 caracteres.';
    else if (titulo.length > 80) errors.tituloActividad = 'Máximo 80 caracteres.';

    if (!desc) errors.contenidoActividad = 'La descripción es obligatoria.';
    else if (desc.length < 10) errors.contenidoActividad = 'Describí un poco más (mín. 10).';

    if (!fecha) errors.fecha = 'La fecha es obligatoria.';

    if (!form.imagenPreview && !form.imagenFile) errors.imagen = 'La agenda debe tener una imagen.';

    if (!motivo) errors.motivo = 'Debés indicar el motivo de la modificación.';

    if (form.imagenFile) {
      const file = form.imagenFile;
      const okType = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      if (!okType.includes(file.type)) errors.imagen = 'Formato inválido (JPG, PNG, WEBP o AVIF).';
      else if (file.size > 3 * 1024 * 1024) errors.imagen = 'La imagen supera los 3 MB.';
    }
    return errors;
  };

  const handleEditInputChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'imagen' && files && files[0]) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (ev) => setEditForm((prev) => ({ ...prev, imagenFile: file, imagenPreview: ev.target.result }));
      reader.readAsDataURL(file);
      setEditErrors(validarEdicion({ ...editForm, imagenFile: file }));
    } else {
      const next = { ...editForm, [name]: value };
      setEditForm(next);
      setEditErrors(validarEdicion(next));
    }
  };

  /* =================== Guardar edición =================== */
  const handleGuardarEdicion = async (e) => {
    e?.preventDefault();
    if (!editModal.agenda) return;
    if (!jwt) { toast.error('Iniciá sesión.'); return; }
    if (!isAdmin) { toast.error('Sin permisos.'); return; }

    const errs = validarEdicion(editForm);
    if (Object.keys(errs).length) {
      setEditErrors(errs);
      toast.error('Revisá los campos marcados.');
      return;
    }

    setSavingEdit(true);
    const toastId = toast.loading('Guardando cambios...');

    try {
      let imagenId = null;

      // 1) subir imagen si cambió
      if (editForm.imagenFile) {
        const uploadForm = new FormData();
        uploadForm.append('files', editForm.imagenFile);
        const uploadRes = await fetch(`${API_URL}/upload`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}` }, body: uploadForm });
        if (!uploadRes.ok) throw new Error('Error al subir la imagen');
        const uploadData = await uploadRes.json();
        imagenId = uploadData?.[0]?.id || null;
      }

      // 2) detectar cambios
      const original = editModal.agenda;
      const cambios = [];
      if (sanitize(original.tituloActividad) !== sanitize(editForm.tituloActividad)) cambios.push('título');
      if (sanitize(original.contenidoActividad) !== sanitize(editForm.contenidoActividad)) cambios.push('descripción');
      const origFecha = original.fecha ? original.fecha.slice(0, 10) : '';
      const fechaCambio = origFecha !== editForm.fecha;
      if (fechaCambio) cambios.push('fecha');
      if (imagenId) cambios.push('imagen');

      // 3) construir body (Strapi v4/v5 single media → probamos set)
      const body = {
        data: {
          tituloActividad: sanitize(editForm.tituloActividad),
          contenidoActividad: sanitize(editForm.contenidoActividad),
          fecha: editForm.fecha,
          ...(imagenId && { imagen: { set: [{ id: imagenId }] } }),
        },
      };

      // 4) PUT robusto (documentId → id numérico)
      const res = await putAgendaRobusto({
        agendaIdDoc: original.id,
        agendaIdNum: original.numericId,
        jwt,
        body,
        withPopulate: true,
      });

      const updated = await tryJson(res);
      if (!res.ok) {
        console.error('Error al actualizar agenda:', updated || {});
        throw new Error(`No se pudo actualizar (status=${res.status})`);
      }

      // 5) normalizar imagen actualizada (por si cambia)
      const a = updated?.data?.attributes ?? {};
      const imgField = a?.imagen;
      const imgData = imgField?.data ?? imgField;
      const imgAttrs = imgData?.attributes ?? imgData;
      const urlPath = imgAttrs?.url;
      const newImageUrl = urlPath ? (urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`) : (editForm.imagenPreview || original.imageUrl);

      // 6) actualizar estado
      setAgendas((prev) =>
        prev.map((ag) =>
          ag.id === original.id
            ? {
                ...ag,
                tituloActividad: a.tituloActividad ?? sanitize(editForm.tituloActividad),
                contenidoActividad: a.contenidoActividad ?? sanitize(editForm.contenidoActividad),
                fecha: a.fecha ?? editForm.fecha,
                imageUrl: newImageUrl,
              }
            : ag
        )
      );

      // 7) notificar al creador (con motivo)
      if (original?.creador?.id) {
        const ahora = new Date();
        const fechaAR = ahora.toLocaleDateString('es-AR');
        const horaAR = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const editor = (me?.name && me?.surname) ? `${me.name} ${me.surname}` : (me?.username || 'Administrador');

        const detalleCambios = cambios.length ? `Cambios: ${cambios.join(', ')}.` : 'Sin cambios sustanciales.';
        const motivoTxt = sanitize(editForm.motivo);

        await crearNotificacionInline({
          jwt,
          titulo: 'Tu agenda fue modificada',
          mensaje: `Tu agenda "${original.tituloActividad}" fue modificada el ${fechaAR} a las ${horaAR} por ${editor}. ${detalleCambios} Motivo: ${motivoTxt}`,
          receptorId: original.creador.id,
          emisorId: me?.id,
          agendaNumericId: original.numericId,
          tipo: 'agenda',
        });
      }

      // 8) si se cambió la fecha → notificar a todos los usuarios
      if (fechaCambio && API_TOKEN) {
        try {
          const usersRes = await fetch(`${API_URL}/users?pagination[pageSize]=1000`, {
            headers: { Authorization: `Bearer ${API_TOKEN}` },
          });
          const usersData = await usersRes.json();
          const users = Array.isArray(usersData) ? usersData : Array.isArray(usersData?.data) ? usersData.data : [];

          const nuevaFechaBonita = new Date(editForm.fecha).toLocaleDateString('es-AR');
          const titulo = sanitize(editForm.tituloActividad);

          await Promise.all(
            users.map((u) =>
              crearNotificacionInline({
                jwt: null, // forzamos adminToken
                adminToken: API_TOKEN,
                titulo: 'Evento reprogramado',
                mensaje: `El evento "${titulo}" cambió su fecha a ${nuevaFechaBonita}.`,
                receptorId: u.id,
                emisorId: me?.id,
                agendaNumericId: editModal.agenda.numericId,
                tipo: 'agenda',
              })
            )
          );
        } catch (e) {
          console.error('No se pudo notificar a todos los usuarios:', e);
        }
      }

      toast.success('Agenda actualizada correctamente.', { id: toastId });
      cerrarModalEdicion();
    } catch (err) {
      console.error(err);
      toast.error(String(err.message || 'Error al editar la agenda'), { id: toastId });
    } finally {
      setSavingEdit(false);
    }
  };

  /* =================== Eliminar (con motivo obligatorio) =================== */
  const eliminarAgenda = async () => {
    const agenda = deleteModal.agenda;
    const motivo = sanitize(deleteModal.motivo);
    if (!agenda) return;
    if (!jwt) { toast.error('Iniciá sesión.'); return; }
    if (!isAdmin) { toast.error('Sin permisos.'); return; }
    if (!motivo) { toast.error('Debés indicar el motivo.'); return; }

    const tId = toast.loading('Eliminando agenda...');
    try {
      // Notificar al creador antes de borrar (para que quede registro)
      if (agenda?.creador?.id) {
        const ahora = new Date();
        const fechaAR = ahora.toLocaleDateString('es-AR');
        const horaAR = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const editor = (me?.name && me?.surname) ? `${me.name} ${me.surname}` : (me?.username || 'Administrador');

        await crearNotificacionInline({
          jwt,
          titulo: 'Tu agenda fue eliminada',
          mensaje: `Tu agenda "${agenda.tituloActividad}" fue eliminada el ${fechaAR} a las ${horaAR} por ${editor}. Motivo: ${motivo}`,
          receptorId: agenda.creador.id,
          emisorId: me?.id,
          agendaNumericId: agenda.numericId,
          tipo: 'agenda',
        });
      }

      // Borrar
      const res = await deleteAgendaRobusto({
        agendaIdDoc: agenda.id,
        agendaIdNum: agenda.numericId,
        jwt,
      });
      const j = await tryJson(res);
      if (!res.ok) {
        console.error('Error al eliminar agenda:', j || {});
        throw new Error(`No se pudo eliminar (status=${res.status})`);
      }

      // Actualizar estado
      setAgendas((prev) => prev.filter((a) => a.id !== agenda.id));
      toast.success('Agenda eliminada.', { id: tId });
      cerrarModalDelete();
    } catch (err) {
      console.error(err);
      toast.error(String(err.message || 'Error al eliminar'), { id: tId });
    }
  };

  /* =================== Render =================== */
  if (checkingRole || loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando panel...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <>
        <Header variant="dark" />
        <div className={styles.noPermisos}>
          <h1>No tenés permisos para ver este panel</h1>
          <p>Solo <b>Administrador</b> y <b>SuperAdministrador</b> pueden administrar agendas.</p>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <div className={styles.bodyPanel}>
      <Header variant="dark" />
      <div className={styles.adminContainer}>
        <div className={`${styles.adminContent} mt-5`}>
          <h1 className={styles.adminTitle}>Panel de Agendas</h1>
          <p className={styles.adminSubtitle}>Gestioná, editá o eliminá las agendas creadas por los usuarios.</p>

          {/* Tabs */}
          <div className={styles.tabs}>
            {['todas', 'futuras', 'pasadas'].map((tipo) => {
              const count =
                tipo === 'todas'
                  ? agendas.length
                  : tipo === 'futuras'
                  ? agendas.filter((a) => a.fecha && new Date(a.fecha).setHours(0,0,0,0) >= hoy.getTime()).length
                  : agendas.filter((a) => a.fecha && new Date(a.fecha).setHours(0,0,0,0) < hoy.getTime()).length;

              return (
                <button
                  key={tipo}
                  className={`${styles.tab} ${tab === tipo ? styles.activeTab : ''}`}
                  onClick={() => setTab(tipo)}
                >
                  {tipo === 'todas' ? 'Todas' : tipo === 'futuras' ? 'Futuras' : 'Pasadas'}
                  <span className={styles.tabCount}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* Controles de paginación (arriba) */}
          {agendasFiltradas.length > 0 && (
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
                Mostrando {Math.min(endIndex, totalAgendas)} de {totalAgendas} agendas
              </div>
            </div>
          )}

          {/* Grid */}
          <div className={styles.usinaGrid}>
            {agendasPaginated.length > 0 ? (
              agendasPaginated.map((agenda) => (
                <div key={agenda.id} className={styles.usinaCard}>
                  <div className={styles.imageContainer} onClick={() => agenda.imageUrl && setSelectedImage(agenda.imageUrl)}>
                    {agenda.imageUrl && agenda.imageUrl !== '/placeholder.jpg'
                      ? <img src={agenda.imageUrl} alt={agenda.tituloActividad} className={styles.image} />
                      : <div className={styles.noImage}>Sin imagen</div>}
                  </div>

                  <div className={styles.usinaInfo}>
                    <h2 className={styles.titulo}>{agenda.tituloActividad}</h2>

                    {agenda.creador && (
                      <div className={styles.creadorInfo}>
                        <p className={styles.creadorNombre}>
                          <strong>Creador:</strong> {agenda.creador.name} {agenda.creador.surname}
                        </p>
                        <p className={styles.creadorUsername}>@{agenda.creador.username}</p>
                      </div>
                    )}

                    <div className={styles.estado}>
                      Fecha del evento: {agenda.fecha ? new Date(agenda.fecha).toLocaleDateString('es-AR') : 'Sin fecha'}
                    </div>

                    {agenda.contenidoActividad && (
                      <p className={styles.descripcion}>
                        {agenda.contenidoActividad.slice(0, 120)}{agenda.contenidoActividad.length > 120 ? '…' : ''}
                      </p>
                    )}
                  </div>

                  <div className={styles.actions}>
                    <button className={styles.btnEditar} onClick={() => abrirModalEdicion(agenda)}>Editar</button>
                    <button className={styles.btnEliminar} onClick={() => abrirModalDelete(agenda)}>Eliminar</button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noUsinas}>
                <p>No hay agendas en esta vista.</p>
              </div>
            )}
          </div>

          {/* Paginación (abajo) */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button className={styles.paginationBtn} onClick={() => handlePageChange(pagination.page - 1)} disabled={pagination.page === 1}>
                Anterior
              </button>

              <div className={styles.paginationNumbers}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => page === 1 || page === totalPages || Math.abs(page - pagination.page) <= 1)
                  .map((page, index, array) => {
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <span key={page}>
                        {showEllipsis && <span className={styles.paginationEllipsis}>…</span>}
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

              <button className={styles.paginationBtn} onClick={() => handlePageChange(pagination.page + 1)} disabled={pagination.page === totalPages}>
                Siguiente
              </button>
            </div>
          )}

          {/* Modal Imagen */}
          {selectedImage && (
            <div className={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={() => setSelectedImage(null)}>✕</button>
                <img src={selectedImage} alt="Agenda" className={styles.modalImage} />
              </div>
            </div>
          )}

          {/* Modal Eliminar (con motivo) */}
          {deleteModal.open && (
            <div className={styles.modalOverlay}>
              <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.modalTitle}>Eliminar agenda</h2>
                <p className={styles.modalText}>Indicá el <b>motivo</b> para el creador (obligatorio):</p>
                <div className={styles.formGroup}>
                  <textarea
                    className={styles.input}
                    rows={3}
                    placeholder="Motivo de la eliminación…"
                    value={deleteModal.motivo}
                    onChange={(e) => setDeleteModal((d) => ({ ...d, motivo: e.target.value }))}
                  />
                </div>
                {deleteModal.agenda && (
                  <div className={styles.modalUsinaInfo}>
                    <strong>{deleteModal.agenda.tituloActividad}</strong>
                    {deleteModal.agenda.creador && <span> — @{deleteModal.agenda.creador.username}</span>}
                  </div>
                )}
                <div className={styles.modalButtons}>
                  <button className={styles.btnConfirmar} onClick={eliminarAgenda}>Confirmar</button>
                  <button className={styles.btnCancelar} onClick={cerrarModalDelete}>Cancelar</button>
                </div>
              </div>
            </div>
          )}

          {/* Modal Edición (con motivo) */}
          {editModal.open && (
            <div className={styles.modalOverlay}>
              <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.modalTitle}>Editar agenda</h2>
                <p className={styles.modalText}>Al guardar se avisará al creador. Cambiar la <b>fecha</b> reenviará notificación a todos.</p>

                <form onSubmit={handleGuardarEdicion} className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="tituloActividad">Título *</label>
                    <textarea
                      id="tituloActividad"
                      name="tituloActividad"
                      value={editForm.tituloActividad}
                      onChange={handleEditInputChange}
                      rows={2}
                      className={`${styles.input} ${editErrors.tituloActividad ? styles.inputError : ''}`}
                      placeholder="Título de la agenda…"
                    />
                    {editErrors.tituloActividad && <p className={styles.errorText}>{editErrors.tituloActividad}</p>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="contenidoActividad">Descripción *</label>
                    <textarea
                      id="contenidoActividad"
                      name="contenidoActividad"
                      value={editForm.contenidoActividad}
                      onChange={handleEditInputChange}
                      rows={4}
                      className={`${styles.input} ${editErrors.contenidoActividad ? styles.inputError : ''}`}
                      placeholder="Descripción del evento…"
                    />
                    {editErrors.contenidoActividad && <p className={styles.errorText}>{editErrors.contenidoActividad}</p>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="fecha">Fecha *</label>
                    <input
                      type="date"
                      id="fecha"
                      name="fecha"
                      value={editForm.fecha}
                      onChange={handleEditInputChange}
                      className={`${styles.input} ${editErrors.fecha ? styles.inputError : ''}`}
                    />
                    {editErrors.fecha && <p className={styles.errorText}>{editErrors.fecha}</p>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Imagen *</label>
                    <div className={styles.mediaEditWrapper}>
                      {editForm.imagenPreview
                        ? (
                          <div className={styles.mediaPreviewBox}>
                            <img src={editForm.imagenPreview} alt="Preview" className={styles.mediaPreviewImg} />
                          </div>
                        )
                        : <div className={styles.noMedia}>Sin imagen actual</div>
                      }
                      <input
                        type="file"
                        name="imagen"
                        id="imagen"
                        accept="image/jpeg,image/png,image/webp,image/avif"
                        onChange={handleEditInputChange}
                        className={styles.fileInput}
                      />
                    </div>
                    {editErrors.imagen && <p className={styles.errorText}>{editErrors.imagen}</p>}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="motivo">Motivo de la edición *</label>
                    <textarea
                      id="motivo"
                      name="motivo"
                      value={editForm.motivo}
                      onChange={handleEditInputChange}
                      rows={3}
                      className={`${styles.input} ${editErrors.motivo ? styles.inputError : ''}`}
                      placeholder="Explicá brevemente por qué estás modificando esta agenda…"
                    />
                    {editErrors.motivo && <p className={styles.errorText}>{editErrors.motivo}</p>}
                  </div>

                  <div className={styles.modalButtons}>
                    <button type="button" className={styles.btnCancelar} onClick={cerrarModalEdicion} disabled={savingEdit}>
                      Cancelar
                    </button>
                    <button type="submit" className={styles.btnConfirmar} disabled={savingEdit}>
                      {savingEdit ? 'Guardando…' : 'Guardar cambios'}
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
