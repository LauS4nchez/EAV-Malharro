'use client';

import { useEffect, useState } from 'react';
import { API_URL, URL, API_TOKEN } from '@/app/config';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import toast from 'react-hot-toast';
import styles from '@/styles/components/Administrador/PanelModeracionUsina.module.css';

/** Helper notificaciones (ajustado a tu schema real) */
async function crearNotificacionInlineAgenda({
  jwt,
  titulo,
  mensaje,
  receptorId,
  emisorId,
  agendaId,
  usinaId,
  tipo = 'agenda',
}) {
  const token = jwt || API_TOKEN;
  if (!token) return;

  try {
    const data = {
      titulo,
      mensaje,
      tipo,                // "agenda" | "usina" | "sistema"
      leida: 'no-leida',   // enum de tu schema
      fechaEmision: new Date().toISOString(),
    };

    if (receptorId) data.receptor = receptorId;
    if (emisorId) data.emisor = emisorId;
    if (agendaId) data.agendaAfectada = agendaId;
    if (usinaId) data.usinaAfectada = usinaId;

    const res = await fetch(`${API_URL}/notificaciones`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error('Error creando notificación (agenda):', err);
    }
  } catch (err) {
    console.error('Error creando notificación (agenda):', err);
  }
}

export default function Page() {
  // datos
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);

  // auth / rol / user
  const [jwt, setJwt] = useState(null);
  const [rol, setRol] = useState(null);
  const [user, setUser] = useState(null);
  const [checkingRole, setCheckingRole] = useState(true);

  // ui
  const [tab, setTab] = useState('pendientes'); // pendientes | aprobadas | rechazadas
  const [modal, setModal] = useState({ open: false, action: '', agenda: null });
  const [rechazoMotivo, setRechazoMotivo] = useState('');

  // paginación
  const [pagination, setPagination] = useState({ page: 1, pageSize: 10, total: 0 });

  // ============================
  // 1) JWT + rol + user
  // ============================
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    setJwt(token);

    const fetchRole = async () => {
      if (!token) {
        setCheckingRole(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/users/me?populate=role`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const roleName = data?.role?.name || data?.role?.type || data?.role || null;
        setRol(roleName);
        setUser(data);
      } catch (err) {
        console.error('Error obteniendo rol:', err);
        setRol(null);
      } finally {
        setCheckingRole(false);
      }
    };

    fetchRole();
  }, []);

  const isAdmin = rol === 'Administrador' || rol === 'SuperAdministrador';

  // ============================
  // 2) Traer AGENDAS (solo admin)
  // ============================
  useEffect(() => {
    const fetchAgendas = async () => {
      try {
        // populate de los campos comunes
        const res = await fetch(
          `${API_URL}/agendas?populate[0]=creador&populate[1]=imagen&populate[2]=portada&populate[3]=media&sort=createdAt:desc`,
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const normalized = items.map((item) => {
          const a = item.attributes ?? item;

          // Título / descripción (mapeo flexible)
          const titulo =
            a.titulo ??
            a.tituloActividad ??
            'Sin título';

          const descripcion =
            a.descripcion ??
            a.contenidoActividad ??
            '';

          // Fecha (mapeo flexible)
          const fecha =
            a.fecha ??
            a.fechaEvento ??
            '';

          // Estado moderación (mapeo flexible)
          const aprobado =
            a.aprobado ??
            a.estado ??
            'pendiente';

          // Motivo rechazo opcional
          const motivoRechazo = a.motivoRechazo ?? '';

          // Imagen: acepta imagen / portada / media
          let imagenUrl = '/placeholder.jpg';
          const imagenField = a.imagen || a.portada || a.media;
          const imgData = imagenField?.data ?? imagenField;
          const imgAttrs = imgData?.attributes ?? imgData;
          const urlPath = imgAttrs?.url;
          if (urlPath) imagenUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;

          // Creador
          const creadorField = a.creador;
          const creadorData = creadorField?.data ?? creadorField;
          const creadorAttrs = creadorData?.attributes ?? creadorData;
          const creador = creadorAttrs
            ? {
                id: creadorData?.id,
                name: creadorAttrs.name || '',
                surname: creadorAttrs.surname || '',
                username: creadorAttrs.username || '',
                carrera: creadorAttrs.carrera || '',
              }
            : null;

          return {
            id: item.id,                 // ← ID numérico (usado para PUT/DELETE)
            documentId: item.documentId, // opcional, no lo usamos para REST
            titulo,
            descripcion,
            fecha,
            hora: a.hora ?? '',
            lugar: a.lugar ?? '',
            aprobado,
            motivoRechazo,
            imagenUrl,
            creador,
          };
        });

        setAgendas(normalized);
        setPagination((p) => ({ ...p, total: normalized.length }));
      } catch (err) {
        console.error('Error al obtener agendas:', err);
        toast.error('Error al cargar las agendas');
      } finally {
        setLoading(false);
      }
    };

    if (!checkingRole && isAdmin) {
      fetchAgendas();
    } else if (!checkingRole) {
      setLoading(false);
    }
  }, [checkingRole, isAdmin]);

  // helper para id: usar SIEMPRE id numérico
  const getAgendaApiId = (agenda) => {
    if (agenda?.id) return String(agenda.id);
    // Solo como fallback MUY opcional:
    if (agenda?.documentId) return String(agenda.documentId);
    return '';
  };

  // ============================
  // aprobar / rechazar / eliminar
  // ============================
  const actualizarEstadoAgenda = async (agenda, nuevoEstado, motivo = '') => {
    try {
      if (!jwt) return toast.error('No hay token. Iniciá sesión.');
      if (!isAdmin) return toast.error('No tenés permisos.');

      const apiId = getAgendaApiId(agenda);
      if (!apiId) throw new Error('ID de agenda inválido');

      // Validación de motivo
      if (nuevoEstado === 'rechazada') {
        const m = (motivo || '').trim();
        if (!m) return toast.error('Escribí el motivo del rechazo');
        if (m.length > 500) return toast.error('El motivo no puede superar 500 caracteres');
      }

      // Construir payload. Si tu schema usa "estado" en vez de "aprobado", cambialo aquí.
      const payload = {
        aprobado: nuevoEstado,
        motivoRechazo: nuevoEstado === 'rechazada' ? motivo : null,
      };

      const res = await fetch(`${API_URL}/agendas/${encodeURIComponent(apiId)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ data: payload }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.error('Error al actualizar agenda:', errJson);
        throw new Error(`Error HTTP ${res.status}`);
      }

      // actualizar en memoria
      setAgendas((prev) =>
        prev.map((a) =>
          getAgendaApiId(a) === apiId ? { ...a, aprobado: nuevoEstado, motivoRechazo: payload.motivoRechazo } : a
        )
      );

      // Notificar al creador
      if (agenda?.creador?.id) {
        const ahora = new Date();
        const fechaTxt = ahora.toLocaleDateString('es-AR');
        const horaTxt = ahora.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const aprobador =
          user?.name && user?.surname ? `${user.name} ${user.surname}` : user?.username || 'Administrador';

        const msgAprob = `Tu agenda "${agenda.titulo}" fue aprobada el ${fechaTxt} a las ${horaTxt} por ${aprobador}.`;
        const msgRech = `Tu agenda "${agenda.titulo}" fue rechazada el ${fechaTxt} a las ${horaTxt} por ${aprobador}.\nMotivo: ${motivo}`;

        await crearNotificacionInlineAgenda({
          jwt,
          titulo: nuevoEstado === 'aprobada' ? 'Tu agenda fue aprobada' : 'Tu agenda fue rechazada',
          mensaje: nuevoEstado === 'aprobada' ? msgAprob : msgRech,
          receptorId: agenda.creador.id,
          emisorId: user?.id,
          agendaId: agenda.id, // relaciona con agendaAfectada
          tipo: 'agenda',
        });
      }

      toast.success(`Agenda ${nuevoEstado === 'aprobada' ? 'aprobada' : 'rechazada'} correctamente`);
    } catch (error) {
      console.error('Error al actualizar agenda:', error);
      toast.error('Error al actualizar la agenda');
    } finally {
      setModal({ open: false, action: '', agenda: null });
      setRechazoMotivo('');
    }
  };

  const eliminarAgenda = async (agenda) => {
    try {
      if (!jwt) return toast.error('No hay token. Iniciá sesión.');
      if (!isAdmin) return toast.error('No tenés permisos.');

      const apiId = getAgendaApiId(agenda);
      if (!apiId) throw new Error('ID de agenda inválido');

      const res = await fetch(`${API_URL}/agendas/${encodeURIComponent(apiId)}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.error('Error al eliminar agenda:', errJson);
        throw new Error(`Error HTTP ${res.status}`);
      }

      setAgendas((prev) => prev.filter((a) => getAgendaApiId(a) !== apiId));
      toast.success('Agenda eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar la agenda');
    } finally {
      setModal({ open: false, action: '', agenda: null });
      setRechazoMotivo('');
    }
  };

  const confirmarAccion = () => {
    const { action, agenda } = modal;
    if (action === 'aprobar') actualizarEstadoAgenda(agenda, 'aprobada');
    else if (action === 'rechazar') actualizarEstadoAgenda(agenda, 'rechazada', rechazoMotivo.trim());
    else if (action === 'eliminar') eliminarAgenda(agenda);
  };

  // ============================
  // tabs + paginación
  // ============================
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [tab]);

  const agendasFiltradas = agendas.filter((a) =>
    tab === 'pendientes' ? a.aprobado === 'pendiente'
    : tab === 'aprobadas' ? a.aprobado === 'aprobada'
    : a.aprobado === 'rechazada'
  );

  const totalAgendas = agendasFiltradas.length;
  const totalPages = Math.ceil(totalAgendas / pagination.pageSize) || 1;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const agendasPaginated = agendasFiltradas.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => setPagination((p) => ({ ...p, page: newPage }));
  const handlePageSizeChange = (newSize) =>
    setPagination({ page: 1, pageSize: parseInt(newSize), total: agendasFiltradas.length });

  // ============================
  // RENDER
  // ============================
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
          <p>Solo los roles <b>Administrador</b> y <b>SuperAdministrador</b> pueden moderar agendas.</p>
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
          <h1 className={styles.adminTitle}>Panel de Moderación de Agendas</h1>
          <p className={styles.adminSubtitle}>Gestioná los eventos creados por los usuarios</p>

          {/* tabs */}
          <div className={styles.tabs}>
            {['pendientes', 'aprobadas', 'rechazadas'].map((tipo) => {
              const count =
                tipo === 'pendientes'
                  ? agendas.filter((a) => a.aprobado === 'pendiente').length
                  : tipo === 'aprobadas'
                  ? agendas.filter((a) => a.aprobado === 'aprobada').length
                  : agendas.filter((a) => a.aprobado === 'rechazada').length;
              return (
                <button
                  key={tipo}
                  className={`${styles.tab} ${tab === tipo ? styles.activeTab : ''}`}
                  onClick={() => setTab(tipo)}
                >
                  {tipo.charAt(0).toUpperCase() + tipo.slice(1)}{' '}
                  <span className={styles.tabCount}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* paginación arriba */}
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

          {/* grid */}
          <div className={styles.usinaGrid}>
            {agendasPaginated.length > 0 ? (
              agendasPaginated.map((agenda) => (
                <div key={agenda.id ?? agenda.documentId} className={styles.usinaCard}>
                  <div className={styles.imageContainer}>
                    {agenda.imagenUrl && agenda.imagenUrl !== '/placeholder.jpg' ? (
                      <img src={agenda.imagenUrl} alt={agenda.titulo} className={styles.image} />
                    ) : (
                      <div className={styles.noImage}>Sin imagen</div>
                    )}
                  </div>

                  <div className={styles.usinaInfo}>
                    <h2 className={styles.titulo}>{agenda.titulo}</h2>

                    {agenda.fecha && (
                      <p className={styles.creadorCarrera}>
                        📅 {agenda.fecha} {agenda.hora ? `• ${agenda.hora}` : ''}
                      </p>
                    )}
                    {agenda.lugar && <p className={styles.creadorUsername}>📍 {agenda.lugar}</p>}

                    {agenda.creador && (
                      <div className={styles.creadorInfo}>
                        <p className={styles.creadorNombre}>
                          <strong>Creador:</strong> {agenda.creador.name} {agenda.creador.surname}
                        </p>
                        <p className={styles.creadorUsername}>@{agenda.creador.username}</p>
                      </div>
                    )}

                    <div className={`${styles.estado} ${styles[agenda.aprobado]}`}>
                      Estado: {agenda.aprobado}
                    </div>

                    {agenda.aprobado === 'rechazada' && agenda.motivoRechazo && (
                      <div className={styles.motivoBox}>
                        <strong>Motivo:</strong> {agenda.motivoRechazo}
                      </div>
                    )}
                  </div>

                  {/* acciones */}
                  <div className={styles.actions}>
                    {tab === 'pendientes' && (
                      <>
                        <button
                          className={styles.btnAprobar}
                          onClick={() => setModal({ open: true, action: 'aprobar', agenda })}
                        >
                          Aprobar
                        </button>
                        <button
                          className={styles.btnRechazar}
                          onClick={() => {
                            setRechazoMotivo('');
                            setModal({ open: true, action: 'rechazar', agenda });
                          }}
                        >
                          Rechazar
                        </button>
                        <button
                          className={styles.btnEliminar}
                          onClick={() => setModal({ open: true, action: 'eliminar', agenda })}
                        >
                          Eliminar
                        </button>
                      </>
                    )}

                    {tab === 'aprobadas' && (
                      <>
                        <button
                          className={styles.btnRechazar}
                          onClick={() => {
                            setRechazoMotivo('');
                            setModal({ open: true, action: 'rechazar', agenda });
                          }}
                        >
                          Pasar a rechazada
                        </button>
                        <button
                          className={styles.btnEliminar}
                          onClick={() => setModal({ open: true, action: 'eliminar', agenda })}
                        >
                          Eliminar
                        </button>
                      </>
                    )}

                    {tab === 'rechazadas' && (
                      <>
                        <button
                          className={styles.btnAprobar}
                          onClick={() => setModal({ open: true, action: 'aprobar', agenda })}
                        >
                          Aprobar
                        </button>
                        <button
                          className={styles.btnEliminar}
                          onClick={() => setModal({ open: true, action: 'eliminar', agenda })}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noUsinas}>
                <p>No hay agendas {tab} en este momento.</p>
              </div>
            )}
          </div>

          {/* paginación abajo */}
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

          {/* modal confirmación */}
          {modal.open && (
            <div className={styles.modalOverlay}>
              <div className={styles.confirmModal}>
                <h2 className={styles.modalTitle}>Confirmar acción</h2>
                <p className={styles.modalText}>
                  {modal.action === 'rechazar'
                    ? 'Escribí el motivo del rechazo y confirmá.'
                    : '¿Seguro que deseas continuar?'}
                </p>

                {modal.agenda && (
                  <div className={styles.modalUsinaInfo}>
                    <strong>{modal.agenda.titulo}</strong>
                    {modal.agenda.creador && <span> — @{modal.agenda.creador.username}</span>}
                  </div>
                )}

                {modal.action === 'rechazar' && (
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="motivoRechazo">Motivo del rechazo *</label>
                    <textarea
                      id="motivoRechazo"
                      rows={3}
                      className={styles.textareaRechazo}
                      value={rechazoMotivo}
                      onChange={(e) => setRechazoMotivo(e.target.value.slice(0, 500))}
                      placeholder="Ej: El evento tiene fecha pasada, revisá..."
                    />
                    <p className={styles.charCounter}>{rechazoMotivo.length} / 500</p>
                  </div>
                )}

                <div className={styles.modalButtons}>
                  <button className={styles.btnConfirmar} onClick={confirmarAccion}>Confirmar</button>
                  <button
                    className={styles.btnCancelar}
                    onClick={() => {
                      setModal({ open: false, action: '', agenda: null });
                      setRechazoMotivo('');
                    }}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
