'use client';

import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/app/config';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from '@/styles/components/Notificaciones/NotificacionesPage.module.css';

/* ============================== CONFIG DEBUG ============================== */
const DEBUG_NOTIS = true;

/* ----------------------------- helpers http ----------------------------- */
async function safeFetchJson(url, options = {}) {
  try {
    const res = await fetch(url, options);
    let data = null;
    try { data = await res.json(); } catch { /* ignore */ }

    if (!res.ok) {
      const msg = data?.error?.message || res.statusText || 'HTTP error';
      const bodyPreview = data ? JSON.stringify(data) : '<no body>';
      if (DEBUG_NOTIS) console.error('❌ Fetch error', { url, status: res.status, statusText: res.statusText, body: bodyPreview });
      throw new Error(`${res.status} ${msg}`);
    }
    return data;
  } catch (err) {
    if (DEBUG_NOTIS) console.error('❌ safeFetchJson failed:', err);
    throw err;
  }
}

const is404 = (e) => String(e?.message || '').trim().startsWith('404');
const is403 = (e) => String(e?.message || '').trim().startsWith('403');

function fechaLinda(iso) {
  if (!iso) return '';
  try {
    return format(new Date(iso), "dd/MM/yyyy HH:mm 'hs'", { locale: es });
  } catch {
    return iso;
  }
}

function toISOStringZ(d) {
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const ss = pad(d.getUTCSeconds());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}.000Z`;
}

/* --------------------------------- page --------------------------------- */
export default function NotificacionesPage() {
  const [jwt, setJwt] = useState(null);
  const [user, setUser] = useState(null);
  const [rol, setRol] = useState(null);
  const [loading, setLoading] = useState(true);

  const [notificaciones, setNotificaciones] = useState([]);
  const [filtro, setFiltro] = useState('todas');
  const [marcando, setMarcando] = useState(false);

  /* ------------------------- 1) JWT + usuario --------------------------- */
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    setJwt(token);

    const fetchUser = async () => {
      if (!token) { setLoading(false); return; }
      try {
        const data = await safeFetchJson(`${API_URL}/users/me?populate=role`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(data);
        const roleName = data?.role?.name || data?.role?.type || null;
        setRol(roleName);
      } catch {
        toast.error('No se pudo obtener el usuario');
      } finally {
        setLoading(false);
      }
    };
    fetchUser();
  }, []);

  /* --------------------- normalizador (v4/v5 safe) ---------------------- */
  function normalizeNoti(item) {
    const root = item.attributes ?? item;
    const attr = root || {};

    const emisor = attr.emisor?.data || attr.emisor || null;
    const receptor = attr.receptor?.data || attr.receptor || null;
    const usina = attr.usinaAfectada?.data || attr.usinaAfectada || null;
    const agenda = attr.agendaAfectada?.data || attr.agendaAfectada || null;

    const emisorAttrs = emisor?.attributes ?? emisor;
    const usinaAttrs = usina?.attributes ?? usina;
    const agendaAttrs = agenda?.attributes ?? agenda;

    return {
      id: item.id ?? attr.id ?? null,
      documentId: item.documentId ?? attr.documentId ?? null,
      titulo: attr.titulo ?? 'Notificación',
      mensaje: attr.mensaje ?? '',
      tipo: attr.tipo ?? 'sistema',
      leido: attr.leida ?? 'no-leida',
      createdAt: attr.createdAt ?? null,
      fechaEmision: attr.fechaEmision ?? null,

      emisor: emisor ? {
        id: emisor.id,
        username: emisorAttrs?.username,
        name: emisorAttrs?.name,
        surname: emisorAttrs?.surname,
      } : null,

      receptor: receptor ? { id: receptor.id } : null,

      usina: usina ? {
        id: usina.id,
        titulo: usinaAttrs?.titulo,
        estado: usinaAttrs?.aprobado,
      } : null,

      agenda: agenda ? {
        id: agenda.id,
        tituloActividad: agendaAttrs?.tituloActividad,
        fecha: agendaAttrs?.fecha,
      } : null,
    };
  }

  /* ------------------- 2) Fetch notificaciones (A→B→C) ------------------ */
  const fetchNotis = async (token, userId) => {
    const qA = new URLSearchParams();
    qA.set('filters[receptor][id][$eq]', userId);
    qA.set('sort', 'createdAt:desc');
    qA.set('pagination[page]', '1');
    qA.set('pagination[pageSize]', '200');
    ['id','documentId','titulo','mensaje','tipo','leida','createdAt','fechaEmision']
      .forEach((f, i) => qA.set(`fields[${i}]`, f));
    qA.set('populate[emisor][fields][0]', 'id');
    qA.set('populate[emisor][fields][1]', 'username');
    qA.set('populate[emisor][fields][2]', 'name');
    qA.set('populate[emisor][fields][3]', 'surname');
    qA.set('populate[receptor][fields][0]', 'id');
    qA.set('populate[usinaAfectada][fields][0]', 'titulo');
    qA.set('populate[usinaAfectada][fields][1]', 'aprobado');
    qA.set('populate[agendaAfectada][fields][0]', 'tituloActividad');
    qA.set('populate[agendaAfectada][fields][1]', 'fecha');

    let data;
    try {
      data = await safeFetchJson(`${API_URL}/notificaciones?${qA.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      data = null;
    }

    let items = Array.isArray(data?.data) ? data.data : [];

    const looksEmpty =
      items.length > 0 &&
      items.every((it) => {
        const a = it.attributes ?? it;
        return !a?.titulo && !a?.mensaje && !a?.tipo && !a?.leida;
      });

    if (!items.length || looksEmpty) {
      try {
        const qB = new URLSearchParams();
        qB.set('filters[receptor][id][$eq]', userId);
        qB.set('sort', 'createdAt:desc');
        qB.set('pagination[pageSize]', '200');
        qB.set('populate', '*');
        const dataB = await safeFetchJson(`${API_URL}/notificaciones?${qB.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        items = Array.isArray(dataB?.data) ? dataB.data : [];
      } catch {
        try {
          const qC = new URLSearchParams();
          qC.set('filters[receptor][id][$eq]', userId);
          qC.set('fields[0]', 'id');
          qC.set('fields[1]', 'documentId');
          qC.set('pagination[pageSize]', '200');
          const list = await safeFetchJson(`${API_URL}/notificaciones?${qC.toString()}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const rows = Array.isArray(list?.data) ? list.data : [];
          const full = await Promise.all(
            rows.map((r) =>
              safeFetchJson(`${API_URL}/notificaciones/${r.id}?populate=*`, {
                headers: { Authorization: `Bearer ${token}` },
              }).catch(() => null)
            )
          );
          items = full.map((x) => x?.data).filter(Boolean);
        } catch (errC) {
          if (DEBUG_NOTIS) console.error('❌ Fetch notificaciones C también falló:', errC);
          throw errC;
        }
      }
    }

    setNotificaciones(items.map(normalizeNoti));
  };

  useEffect(() => {
    if (jwt && user?.id) {
      fetchNotis(jwt, user.id).catch(() =>
        toast.error('No se pudieron cargar las notificaciones')
      );
    }
  }, [jwt, user]);

  /* --------------------------- 3) Filtro local --------------------------- */
  const notisFiltradas = useMemo(() => {
    if (filtro === 'todas') return notificaciones;
    return notificaciones.filter((n) => n.tipo === filtro);
  }, [filtro, notificaciones]);

  /* ------------------- helpers update (id / documentId) ------------------ */
  async function updateNotiCoreById(id, token) {
    const payload = { data: { leida: 'leida' } };
    if (DEBUG_NOTIS) console.log('📝 PUT notificaciones/', id, payload);
    return safeFetchJson(`${API_URL}/notificaciones/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  }

  async function deleteNotiCoreById(id, token) {
    if (DEBUG_NOTIS) console.log('🗑️ DELETE notificaciones/', id);
    return safeFetchJson(`${API_URL}/notificaciones/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Resolver id real:
  // 1) documentId
  // 2) receptor + titulo + ventana de tiempo por createdAt (±60 min)
  // 3) fallback: últimas 200 por receptor y mismo titulo en el mismo día
  async function resolveRealId(noti, token, userId) {
    if (DEBUG_NOTIS) console.log('🔎 resolveRealId for', { id: noti.id, documentId: noti.documentId, titulo: noti.titulo, createdAt: noti.createdAt, userId });

    // 1) documentId (Strapi v5 Document Service)
    if (noti.documentId) {
      const q = new URLSearchParams();
      q.set('filters[documentId][$eq]', noti.documentId);
      q.set('fields[0]', 'id');
      const res = await safeFetchJson(`${API_URL}/notificaciones?${q.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const it = Array.isArray(res?.data) ? res.data[0] : null;
      if (DEBUG_NOTIS) console.log('🔎 by documentId ->', it?.id);
      if (it?.id != null) return it.id;
    }

    // 2) receptor + titulo + ventana de tiempo
    if (userId && noti.titulo && noti.createdAt) {
      const created = new Date(noti.createdAt);
      const from = new Date(created.getTime() - 60 * 60 * 1000); // -60 min
      const to   = new Date(created.getTime() + 60 * 60 * 1000); // +60 min

      const q2 = new URLSearchParams();
      q2.set('filters[$and][0][receptor][id][$eq]', userId);
      q2.set('filters[$and][1][titulo][$eq]', noti.titulo);
      q2.set('filters[$and][2][createdAt][$gte]', toISOStringZ(from));
      q2.set('filters[$and][3][createdAt][$lte]', toISOStringZ(to));
      q2.set('sort', 'createdAt:desc');
      q2.set('pagination[pageSize]', '10');
      q2.set('fields[0]', 'id');
      q2.set('fields[1]', 'titulo');
      q2.set('fields[2]', 'createdAt');

      const res2 = await safeFetchJson(`${API_URL}/notificaciones?${q2.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const candidates = Array.isArray(res2?.data) ? res2.data : [];
      if (DEBUG_NOTIS) console.log('🔎 by window candidates ->', candidates.map(c => c?.id));
      if (candidates[0]?.id != null) return candidates[0].id;
    }

    // 3) fallback: últimas 200 por receptor, mismo título y mismo día
    if (userId && noti.titulo && noti.createdAt) {
      const q3 = new URLSearchParams();
      q3.set('filters[receptor][id][$eq]', userId);
      q3.set('sort', 'createdAt:desc');
      q3.set('pagination[pageSize]', '200');
      q3.set('fields[0]', 'id');
      q3.set('fields[1]', 'titulo');
      q3.set('fields[2]', 'createdAt');

      const res3 = await safeFetchJson(`${API_URL}/notificaciones?${q3.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const rows = Array.isArray(res3?.data) ? res3.data : [];
      const d0 = new Date(noti.createdAt);
      const sameDay = (a, b) =>
        a.getUTCFullYear() === b.getUTCFullYear() &&
        a.getUTCMonth() === b.getUTCMonth() &&
        a.getUTCDate() === b.getUTCDate();

      const match = rows.find(r => {
        const ca = new Date((r.attributes ?? r).createdAt);
        const ti = (r.attributes ?? r).titulo;
        return ti === noti.titulo && sameDay(ca, d0);
      });
      if (DEBUG_NOTIS) console.log('🔎 fallback by day ->', match?.id);
      if (match?.id != null) return match.id;
    }

    if (DEBUG_NOTIS) console.warn('⚠️ No se pudo resolver un id real para la notificación');
    return null;
  }

  async function updateNotiByAnyIdentifier(noti, token, userId) {
    // Primero intento con el id que vino
    if (noti.id != null) {
      try {
        return await updateNotiCoreById(noti.id, token);
      } catch (err) {
        if (!is404(err)) throw err;
        // 404 -> resolvemos y reintentamos
        const realId = await resolveRealId(noti, token, userId);
        if (!realId) throw err;
        return await updateNotiCoreById(realId, token);
      }
    }
    // No teníamos id -> resolver
    const realId = await resolveRealId(noti, token, userId);
    if (!realId) throw new Error('No se pudo resolver el id real de la notificación');
    return await updateNotiCoreById(realId, token);
  }

  async function deleteNotiByAnyIdentifier(noti, token, userId) {
    if (noti.id != null) {
      try {
        return await deleteNotiCoreById(noti.id, token);
      } catch (err) {
        if (!is404(err)) throw err;
        const realId = await resolveRealId(noti, token, userId);
        if (!realId) throw err;
        return await deleteNotiCoreById(realId, token);
      }
    }
    const realId = await resolveRealId(noti, token, userId);
    if (!realId) throw new Error('No se pudo resolver el id real para eliminar');
    return await deleteNotiCoreById(realId, token);
  }

  /* --------------- 4) UPDATE: marcar una como leída (click) ------------- */
  const marcarLeida = async (noti) => {
    if (!jwt) return;
    if (noti.leido === 'leida') return;

    setMarcando(true);
    try {
      await updateNotiByAnyIdentifier(noti, jwt, user?.id);

      setNotificaciones((prev) =>
        prev.map((n) =>
          (n.id === noti.id) || (noti.documentId && n.documentId === noti.documentId)
            ? { ...n, leido: 'leida' }
            : n
        )
      );
    } catch (err) {
      if (is403(err)) {
        toast.error('Sin permisos de UPDATE en Strapi (habilitá UPDATE para Authenticated).');
      } else if (is404(err)) {
        toast.error('No encontrada en el backend (id/docId no coincide en este entorno).');
      } else {
        toast.error('No se pudo marcar como leída');
      }
      if (DEBUG_NOTIS) console.error('marcarLeida error:', err);
    } finally {
      setMarcando(false);
    }
  };

  /* --------------------------- 5) Marcar todas --------------------------- */
  const marcarTodas = async () => {
    if (!jwt) return;
    const pendientes = notificaciones.filter((n) => n.leido !== 'leida');
    if (!pendientes.length) return;

    setMarcando(true);
    try {
      await Promise.all(
        pendientes.map((n) => updateNotiByAnyIdentifier(n, jwt, user?.id).catch(() => null))
      );

      setNotificaciones((prev) => prev.map((n) => ({ ...n, leido: 'leida' })));
      toast.success('Todas marcadas como leídas');
    } catch (err) {
      if (DEBUG_NOTIS) console.error(err);
      toast.error('No se pudieron marcar todas');
    } finally {
      setMarcando(false);
    }
  };

  /* -------------------------------- render ------------------------------- */
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando notificaciones...</p>
      </div>
    );
  }

  if (!jwt || !user) {
    return (
      <>
        <Header variant="dark" />
        <div className={styles.noPermisos}>
          <h1>Iniciá sesión para ver tus notificaciones</h1>
        </div>
        <Footer />
      </>
    );
  }

  const getBadge = (tipo) => {
    if (tipo === 'usina') return <span className={styles.badgeUsina}>Usina</span>;
    if (tipo === 'agenda') return <span className={styles.badgeAgenda}>Agenda</span>;
    return <span className={styles.badgeSistema}>Sistema</span>;
  };

  return (
    <div className={styles.pageWrapper}>
      <Header variant="dark" />
      <main className={styles.main}>
        <div className={styles.head}>
          <div>
            <h1 className={styles.title}>Notificaciones</h1>
            <p className={styles.subtitle}>
              Hola {user?.name || user?.username}, acá tenés todo lo que pasó.
            </p>
          </div>
          <div className={styles.headActions}>
            <button
              className={styles.markAllBtn}
              onClick={marcarTodas}
              disabled={marcando || !notificaciones.length}
            >
              Marcar todas como leídas
            </button>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${filtro === 'todas' ? styles.tabActive : ''}`}
            onClick={() => setFiltro('todas')}
          >
            Todas ({notificaciones.length})
          </button>
          <button
            className={`${styles.tab} ${filtro === 'usina' ? styles.tabActive : ''}`}
            onClick={() => setFiltro('usina')}
          >
            Usinas ({notificaciones.filter((n) => n.tipo === 'usina').length})
          </button>
          <button
            className={`${styles.tab} ${filtro === 'agenda' ? styles.tabActive : ''}`}
            onClick={() => setFiltro('agenda')}
          >
            Agendas ({notificaciones.filter((n) => n.tipo === 'agenda').length})
          </button>
          <button
            className={`${styles.tab} ${filtro === 'sistema' ? styles.tabActive : ''}`}
            onClick={() => setFiltro('sistema')}
          >
            Sistema ({notificaciones.filter((n) => n.tipo === 'sistema').length})
          </button>
        </div>

        <div className={styles.list}>
          {notisFiltradas.length ? (
            notisFiltradas.map((n) => (
              <article
                key={n.id || n.documentId}
                className={`${styles.item} ${n.leido !== 'leida' ? styles.itemUnread : ''}`}
                onClick={() => marcarLeida(n)}
              >
                <div className={styles.itemHeader}>
                  <div className={styles.itemLeft}>
                    {getBadge(n.tipo)}
                    <h2 className={styles.itemTitle}>{n.titulo}</h2>
                  </div>
                  <div className={styles.itemRight}>
                    <time className={styles.itemTime}>{fechaLinda(n.createdAt)}</time>
                    <button
                      className={styles.deleteBtn}
                      onClick={async (e) => {
                        e.stopPropagation();
                        if (!jwt) return;
                        try {
                          await deleteNotiByAnyIdentifier(n, jwt, user?.id);
                          setNotificaciones((prev) =>
                            prev.filter((x) =>
                              x.id ? x.id !== n.id : x.documentId !== n.documentId
                            )
                          );
                        } catch (err) {
                          if (is403(err)) toast.error('Sin permisos para eliminar.');
                          else if (is404(err)) toast.error('No se encontró la notificación en este entorno.');
                          else toast.error('Error al eliminar notificación');
                        }
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {n.mensaje && (
                  <div
                    className={styles.itemMsg}
                    dangerouslySetInnerHTML={{ __html: n.mensaje }}
                  />
                )}

                <div className={styles.meta}>
                  {n.emisor && (
                    <span className={styles.metaItem}>
                      Por: {n.emisor.name || n.emisor.username}
                    </span>
                  )}
                  {n.usina && (
                    <span className={styles.metaItem}>
                      Usina: <b>{n.usina.titulo}</b> ({n.usina.estado})
                    </span>
                  )}
                  {n.agenda && (
                    <span className={styles.metaItem}>
                      Agenda: <b>{n.agenda.tituloActividad}</b>
                    </span>
                  )}
                  {n.leido !== 'leida' && <span className={styles.metaUnread}>Nueva</span>}
                </div>
              </article>
            ))
          ) : (
            <div className={styles.empty}>
              <p>No tenés notificaciones todavía 👀</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
