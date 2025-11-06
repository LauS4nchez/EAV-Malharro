'use client';

import { useEffect, useMemo, useState } from 'react';
import { API_URL } from '@/app/config';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import styles from '@/styles/components/Notificaciones/NotificacionesPage.module.css';

/* ============================== CONFIG ============================== */
const DEBUG_NOTIS = true;

/* ----------------------------- helpers ----------------------------- */
async function safeFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    const msg = data?.error?.message || res.statusText || 'HTTP error';
    if (DEBUG_NOTIS) console.error('❌ Fetch error', data || {});
    const err = new Error(`${res.status} ${msg}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }
  return data;
}

const is404 = (e) => String(e?.message || '').startsWith('404');
const is403 = (e) => String(e?.message || '').startsWith('403');
const is405 = (e) => String(e?.message || '').startsWith('405');

function fechaLinda(iso) {
  try { return format(new Date(iso), "dd/MM/yyyy HH:mm 'hs'", { locale: es }); }
  catch { return iso || ''; }
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

/* ---------- PUT→PATCH fallback ---------- */
async function putOrPatch(url, payload, token) {
  try {
    return await safeFetchJson(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    if (is405(e)) {
      if (DEBUG_NOTIS) console.warn('⚠️ PUT 405 → reintento PATCH', url);
      return await safeFetchJson(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
    }
    throw e;
  }
}

/* ---------- UPDATE por id ó documentId en la URL (como usinas) ---------- */
async function updateByIdOrDocPath({ id, documentId, token, payload }) {
  // 1) Si tengo documentId, intento primero con /notificaciones/:documentId (igual que usinas)
  if (documentId) {
    try {
      return await putOrPatch(`${API_URL}/notificaciones/${encodeURIComponent(documentId)}`, payload, token);
    } catch (e) {
      if (!is404(e)) throw e; // si no es 404, propago
    }
  }
  // 2) Si tengo id numérico, intento /notificaciones/:id
  if (id != null) {
    return await putOrPatch(`${API_URL}/notificaciones/${id}`, payload, token);
  }
  // si no tenía nada, lanzo
  throw new Error('404 Not Found');
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

    (async () => {
      if (!token) { setLoading(false); return; }
      try {
        const me = await safeFetchJson(`${API_URL}/users/me?populate=role`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUser(me);
        setRol(me?.role?.name || me?.role?.type || null);
      } catch {
        toast.error('No se pudo obtener el usuario');
      } finally {
        setLoading(false);
      }
    })();
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
      id: item.id ?? attr.id ?? null,                 // numérico si viene
      documentId: item.documentId ?? attr.documentId ?? null, // v5
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
  async function fetchNotis(token, userId) {
    const baseA = new URLSearchParams();
    baseA.set('filters[receptor][id][$eq]', userId);
    baseA.set('sort', 'createdAt:desc');
    baseA.set('pagination[pageSize]', '200');
    ['id','documentId','titulo','mensaje','tipo','leida','createdAt','fechaEmision']
      .forEach((f, i) => baseA.set(`fields[${i}]`, f));
    baseA.set('populate[emisor][fields][0]', 'id');
    baseA.set('populate[emisor][fields][1]', 'username');
    baseA.set('populate[emisor][fields][2]', 'name');
    baseA.set('populate[emisor][fields][3]', 'surname');
    baseA.set('populate[receptor][fields][0]', 'id');
    baseA.set('populate[usinaAfectada][fields][0]', 'titulo');
    baseA.set('populate[usinaAfectada][fields][1]', 'aprobado');
    baseA.set('populate[agendaAfectada][fields][0]', 'tituloActividad');
    baseA.set('populate[agendaAfectada][fields][1]', 'fecha');

    let dataA = null;
    try {
      dataA = await safeFetchJson(`${API_URL}/notificaciones?${baseA.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* pasamos a B */ }

    let items = Array.isArray(dataA?.data) ? dataA.data : [];

    const looksEmpty =
      items.length > 0 &&
      items.every((it) => {
        const a = it.attributes ?? it;
        return !a?.titulo && !a?.mensaje && !a?.tipo && !a?.leida;
      });

    if (!items.length || looksEmpty) {
      // Variante B: populate=*
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
        // Variante C: listado id + GET por id
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
      }
    }

    setNotificaciones(items.map(normalizeNoti));
  }

  useEffect(() => {
    if (jwt && user?.id) {
      fetchNotis(jwt, user.id).catch(() => toast.error('No se pudieron cargar las notificaciones'));
    }
  }, [jwt, user]);

  /* --------------------------- 3) Filtro local --------------------------- */
  const notisFiltradas = useMemo(() => {
    if (filtro === 'todas') return notificaciones;
    return notificaciones.filter((n) => n.tipo === filtro);
  }, [filtro, notificaciones]);

  /* --------- Resolver id real por documentId / título / ventana ---------- */
  async function resolveRealId(noti, token, userId) {
    // a) por documentId → devuelvo id numérico
    if (noti.documentId) {
      try {
        const q = new URLSearchParams();
        q.set('filters[documentId][$eq]', noti.documentId);
        q.set('fields[0]', 'id');
        const res = await safeFetchJson(`${API_URL}/notificaciones?${q.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const it = Array.isArray(res?.data) ? res.data[0] : null;
        if (it?.id != null) return it.id;
      } catch { /* sigo */ }
    }

    // b) receptor + título + ventana ±60 min
    if (userId && noti.titulo && noti.createdAt) {
      const created = new Date(noti.createdAt);
      const from = new Date(created.getTime() - 60 * 60 * 1000);
      const to   = new Date(created.getTime() + 60 * 60 * 1000);

      const q2 = new URLSearchParams();
      q2.set('filters[$and][0][receptor][id][$eq]', userId);
      q2.set('filters[$and][1][titulo][$eq]', noti.titulo);
      q2.set('filters[$and][2][createdAt][$gte]', toISOStringZ(from));
      q2.set('filters[$and][3][createdAt][$lte]', toISOStringZ(to));
      q2.set('sort', 'createdAt:desc');
      q2.set('pagination[pageSize]', '10');
      q2.set('fields[0]', 'id');

      try {
        const r2 = await safeFetchJson(`${API_URL}/notificaciones?${q2.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const candidates = Array.isArray(r2?.data) ? r2.data : [];
        if (candidates[0]?.id != null) return candidates[0].id;
      } catch { /* sigo */ }
    }

    // c) últimas 200 por receptor, mismo título y mismo día
    if (userId && noti.titulo && noti.createdAt) {
      const q3 = new URLSearchParams();
      q3.set('filters[receptor][id][$eq]', userId);
      q3.set('sort', 'createdAt:desc');
      q3.set('pagination[pageSize]', '200');
      q3.set('fields[0]', 'id');
      q3.set('fields[1]', 'titulo');
      q3.set('fields[2]', 'createdAt');

      try {
        const r3 = await safeFetchJson(`${API_URL}/notificaciones?${q3.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const rows = Array.isArray(r3?.data) ? r3.data : [];
        const d0 = new Date(noti.createdAt);
        const sameDay = (a, b) =>
          a.getUTCFullYear() === b.getUTCFullYear() &&
          a.getUTCMonth() === b.getUTCMonth() &&
          a.getUTCDate() === b.getUTCDate();

        const match = rows.find(r => {
          const a = r.attributes ?? r;
          const ca = new Date(a.createdAt);
          return a.titulo === noti.titulo && sameDay(ca, d0);
        });
        if (match?.id != null) return match.id;
      } catch { /* nada */ }
    }

    return null;
  }

  /* ---------------------- UPDATE: marcar como leída ---------------------- */
  async function updateNotiByAnyIdentifier(noti, token, userId) {
    const payload = { data: { leida: 'leida' } };

    // 1) Intento directo por PATH con documentId (como usinas)
    try {
      return await updateByIdOrDocPath({
        id: noti.id ?? null,
        documentId: noti.documentId ?? null,
        token,
        payload,
      });
    } catch (e1) {
      if (!is404(e1)) throw e1; // si no es 404, propago (403/405/etc.)
    }

    // 2) Resuelvo id numérico y reintento por PATH /:id
    const realId = await resolveRealId(noti, token, userId);
    if (realId != null) {
      return await updateByIdOrDocPath({
        id: realId,
        documentId: null,
        token,
        payload,
      });
    }

    // 3) No se pudo resolver
    throw new Error('404 Not Found');
  }

  const marcarLeida = async (noti) => {
    if (!jwt) return;
    if (noti.leido === 'leida') return;

    setMarcando(true);
    try {
      const resp = await updateNotiByAnyIdentifier(noti, jwt, user?.id);
      const updatedId = resp?.data?.id ?? null;
      const updatedDocId = resp?.data?.documentId ?? null;

      setNotificaciones((prev) =>
        prev.map((n) => {
          const sameById = updatedId != null ? n.id === updatedId : n.id === noti.id;
          const sameByDoc = updatedDocId ? n.documentId === updatedDocId : n.documentId === noti.documentId;
          const sameHeuristic =
            n.titulo === noti.titulo &&
            new Date(n.createdAt).toDateString() === new Date(noti.createdAt).toDateString();
          return (sameById || sameByDoc || sameHeuristic) ? { ...n, leido: 'leida' } : n;
        })
      );
    } catch (err) {
      if (is403(err)) {
        toast.error('Sin permisos de UPDATE en Strapi (habilitá UPDATE para Authenticated).');
      } else if (is404(err)) {
        toast.error('No se encontró la notificación en el backend (id/documentId).');
      } else if (is405(err)) {
        toast.error('Método no permitido: habilitá PUT o PATCH en el despliegue.');
      } else {
        toast.error('No se pudo marcar como leída');
      }
      if (DEBUG_NOTIS) console.error('marcarLeida error:', err);
    } finally {
      setMarcando(false);
    }
  };

  /* --------------------------- Marcar todas --------------------------- */
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
            <p className={styles.subtitle}>Hola {user?.name || user?.username}, acá tenés todo lo que pasó.</p>
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
          <button className={`${styles.tab} ${filtro === 'todas' ? styles.tabActive : ''}`} onClick={() => setFiltro('todas')}>
            Todas ({notificaciones.length})
          </button>
          <button className={`${styles.tab} ${filtro === 'usina' ? styles.tabActive : ''}`} onClick={() => setFiltro('usina')}>
            Usinas ({notificaciones.filter((n) => n.tipo === 'usina').length})
          </button>
          <button className={`${styles.tab} ${filtro === 'agenda' ? styles.tabActive : ''}`} onClick={() => setFiltro('agenda')}>
            Agendas ({notificaciones.filter((n) => n.tipo === 'agenda').length})
          </button>
          <button className={`${styles.tab} ${filtro === 'sistema' ? styles.tabActive : ''}`} onClick={() => setFiltro('sistema')}>
            Sistema ({notificaciones.filter((n) => n.tipo === 'sistema').length})
          </button>
        </div>

        <div className={styles.list}>
          {notisFiltradas.length ? (
            notisFiltradas.map((n) => (
              <article
                key={n.id || n.documentId || `${n.titulo}-${n.createdAt}`}
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
                          // delete: igual que update, primero con docId
                          try {
                            await safeFetchJson(`${API_URL}/notificaciones/${encodeURIComponent(n.documentId || n.id)}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${jwt}` },
                            });
                          } catch (e1) {
                            if (!is404(e1)) throw e1;
                            // resolver id numérico y borrar
                            const realId = await resolveRealId(n, jwt, user?.id);
                            if (realId == null) throw e1;
                            await safeFetchJson(`${API_URL}/notificaciones/${realId}`, {
                              method: 'DELETE',
                              headers: { Authorization: `Bearer ${jwt}` },
                            });
                          }
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
