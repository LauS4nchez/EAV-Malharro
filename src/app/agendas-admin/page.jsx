'use client';

import { useEffect, useState } from 'react';
import { API_URL, URL, API_TOKEN } from '@/app/config';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import toast from 'react-hot-toast';
import styles from '@/styles/components/Administrador/PanelModeracionUsina.module.css';

async function crearNotificacionInline({
  jwt,
  titulo,
  mensaje,
  receptorId,
  emisorId,
  agendaId,
  tipo = 'agenda',
}) {
  if (!jwt) return;
  try {
    const data = {
      titulo,
      mensaje,
      tipo,
      leida: 'no-leida',
      fechaEmision: new Date().toISOString(),
    };

    if (receptorId) data.receptor = receptorId;
    if (emisorId) data.emisor = emisorId;
    if (agendaId) data.agendaAfectada = agendaId;

    const res = await fetch(`${API_URL}/notificaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ data }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => null);
      console.error('Error creando notificación:', err);
    }
  } catch (err) {
    console.error('Error creando notificación:', err);
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
  const [tab, setTab] = useState('todas'); // todas | futuras | pasadas
  const [selectedImage, setSelectedImage] = useState(null);
  const [modalDelete, setModalDelete] = useState({ open: false, agenda: null });

  // modal editar
  const [editModal, setEditModal] = useState({ open: false, agenda: null });
  const [editForm, setEditForm] = useState({
    tituloActividad: '',
    contenidoActividad: '',
    fecha: '',
    imagenFile: null,
    imagenPreview: '',
  });
  const [editErrors, setEditErrors] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);

  // paginación
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
  });

  // ============================
  // 1) JWT + rol + user
  // ============================
  useEffect(() => {
    const token =
      typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    setJwt(token);

    const fetchUser = async () => {
      if (!token) {
        setCheckingRole(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/users/me?populate=role`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        const roleName =
          data?.role?.name ||
          data?.role?.type ||
          data?.role ||
          null;
        setRol(roleName);
        setUser(data);
      } catch (err) {
        console.error('Error obteniendo rol:', err);
        setRol(null);
      } finally {
        setCheckingRole(false);
      }
    };

    fetchUser();
  }, []);

  const isAdmin = rol === 'Administrador' || rol === 'SuperAdministrador';

  // ============================
  // 2) Traer agendas (solo admin)
  // ============================
  useEffect(() => {
    const fetchAgendas = async () => {
      try {
        const res = await fetch(
          `${API_URL}/agendas?populate[0]=imagen&populate[1]=creador&sort=fecha:asc`,
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

          // imagen
          let imageUrl = '/placeholder.jpg';
          const imagenField = a.imagen;
          const imgData = imagenField?.data ?? imagenField;
          const imgAttrs = imgData?.attributes ?? imgData;
          const urlPath = imgAttrs?.url;
          if (urlPath) {
            imageUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;
          }

          // creador
          const creadorField = a.creador;
          const creadorData = creadorField?.data ?? creadorField;
          const creadorAttrs = creadorData?.attributes ?? creadorData;

          return {
            id: item.id, // ← ID numérico (usado para PUT/DELETE)
            documentId: item.documentId,
            tituloActividad: a.tituloActividad ?? 'Sin título',
            contenidoActividad: a.contenidoActividad ?? '',
            fecha: a.fecha ?? '',
            imageUrl,
            creador: creadorAttrs
              ? {
                  id: creadorData?.id,
                  name: creadorAttrs.name || '',
                  surname: creadorAttrs.surname || '',
                  username: creadorAttrs.username || '',
                }
              : null,
          };
        });

        setAgendas(normalized);
        setPagination((prev) => ({ ...prev, total: normalized.length }));
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

  // ============================
  // helper: id para API (usar SIEMPRE el id numérico)
  // ============================
  const getAgendaApiId = (agenda) => {
    if (agenda?.id) return String(agenda.id);         // ← preferimos id
    if (agenda?.documentId) return String(agenda.documentId); // fallback (no recomendado)
    return '';
  };

  // ============================
  // editar agenda
  // ============================
  const abrirModalEdicion = (agenda) => {
    setEditModal({ open: true, agenda });
    setEditForm({
      tituloActividad: agenda.tituloActividad || '',
      contenidoActividad: agenda.contenidoActividad || '',
      fecha: agenda.fecha ? agenda.fecha.slice(0, 10) : '',
      imagenFile: null,
      imagenPreview: agenda.imageUrl || '',
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
    });
    setEditErrors({});
  };

  const validarEdicion = (form) => {
    const errors = {};
    const titulo = form.tituloActividad?.trim();
    const desc = form.contenidoActividad?.trim();
    const fecha = form.fecha;

    if (!titulo) errors.tituloActividad = 'El título es obligatorio.';
    else if (titulo.length < 3)
      errors.tituloActividad = 'Usá al menos 3 caracteres.';
    else if (titulo.length > 80)
      errors.tituloActividad = 'Máximo 80 caracteres.';

    if (!desc) errors.contenidoActividad = 'La descripción es obligatoria.';
    else if (desc.length < 10)
      errors.contenidoActividad = 'Describí un poco más (mín. 10).';

    if (!fecha) errors.fecha = 'La fecha es obligatoria.';

    if (!form.imagenPreview && !form.imagenFile) {
      errors.imagen = 'La agenda debe tener una imagen.';
    }

    if (form.imagenFile) {
      const file = form.imagenFile;
      const okType = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      if (!okType.includes(file.type)) {
        errors.imagen = 'Formato inválido (JPG, PNG, WEBP o AVIF).';
      } else if (file.size > 3 * 1024 * 1024) {
        errors.imagen = 'La imagen supera los 3 MB.';
      }
    }

    return errors;
  };

  const handleEditInputChange = (e) => {
    const { name, value, files } = e.target;

    if (name === 'imagen' && files && files[0]) {
      const file = files[0];

      const reader = new FileReader();
      reader.onload = (ev) => {
        setEditForm((prev) => ({
          ...prev,
          imagenFile: file,
          imagenPreview: ev.target.result,
        }));
      };
      reader.readAsDataURL(file);

      const tempForm = {
        ...editForm,
        imagenFile: file,
      };
      const errs = validarEdicion(tempForm);
      setEditErrors(errs);
    } else {
      const tempForm = {
        ...editForm,
        [name]: value,
      };
      const errs = validarEdicion(tempForm);
      setEditForm(tempForm);
      setEditErrors(errs);
    }
  };

  const handleGuardarEdicion = async (e) => {
    e?.preventDefault();
    if (!editModal.agenda) return;
    if (!jwt) {
      toast.error('No hay token. Inicia sesión.');
      return;
    }
    if (!isAdmin) {
      toast.error('No tenés permisos.');
      return;
    }

    const errs = validarEdicion(editForm);
    if (Object.keys(errs).length > 0) {
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

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${jwt}`,
          },
          body: uploadForm,
        });

        if (!uploadRes.ok) {
          throw new Error('Error al subir la imagen');
        }

        const uploadData = await uploadRes.json();
        imagenId = uploadData?.[0]?.id;
      }

      // 2) detectar cambios para la notificación
      const original = editModal.agenda;
      const cambios = [];
      if (original.tituloActividad !== editForm.tituloActividad.trim()) {
        cambios.push('título');
      }
      if (original.contenidoActividad !== editForm.contenidoActividad.trim()) {
        cambios.push('descripción');
      }
      const originalFecha = original.fecha ? original.fecha.slice(0, 10) : '';
      if (originalFecha !== editForm.fecha) {
        cambios.push('fecha');
      }
      if (imagenId) {
        cambios.push('imagen');
      }

      // 3) actualizar agenda (👈 usar id numérico)
      const apiId = getAgendaApiId(original);
      const updateData = {
        tituloActividad: editForm.tituloActividad.trim(),
        contenidoActividad: editForm.contenidoActividad.trim(),
        fecha: editForm.fecha,
      };
      if (imagenId) updateData.imagen = imagenId;

      const res = await fetch(`${API_URL}/agendas/${apiId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({ data: updateData }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        console.error('Error al actualizar agenda:', errJson);
        throw new Error(errJson?.error?.message || 'Error al actualizar agenda');
      }

      // 4) actualizar en memoria
      setAgendas((prev) =>
        prev.map((a) =>
          getAgendaApiId(a) === apiId
            ? {
                ...a,
                tituloActividad: updateData.tituloActividad,
                contenidoActividad: updateData.contenidoActividad,
                fecha: updateData.fecha,
                imageUrl: imagenId ? editForm.imagenPreview : a.imageUrl,
              }
            : a
        )
      );

      // 5) notificar al creador (sin fechaEvento)
      if (original?.creador?.id) {
        const ahora = new Date();
        const fecha = ahora.toLocaleDateString('es-AR');
        const hora = ahora.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
        });
        const editor =
          user?.name && user?.surname
            ? `${user.name} ${user.surname}`
            : user?.username || 'Administrador';

        const detalleCambios = cambios.length
          ? `Cambios: ${cambios.join(', ')}.`
          : 'Se guardaron los mismos datos.';

        await crearNotificacionInline({
          jwt,
          titulo: 'Tu agenda fue modificada',
          mensaje: `Tu agenda "${original.tituloActividad}" fue modificada el ${fecha} a las ${hora} por ${editor}. ${detalleCambios}`,
          receptorId: original.creador.id,
          emisorId: user?.id,
          agendaId: original.id, // ← queda en agendaAfectada
          tipo: 'agenda',
        });
      }

      toast.success('Agenda actualizada correctamente.', { id: toastId });
      cerrarModalEdicion();
    } catch (err) {
      console.error(err);
      toast.error('Error al editar la agenda: ' + err.message, { id: toastId });
    } finally {
      setSavingEdit(false);
    }
  };

  // ============================
  // eliminar agenda
  // ============================
  const eliminarAgenda = async (agenda) => {
    try {
      if (!jwt) {
        toast.error('No hay token. Inicia sesión.');
        return;
      }
      if (!isAdmin) {
        toast.error('No tenés permisos.');
        return;
      }

      const apiId = getAgendaApiId(agenda); // ← id numérico
      const res = await fetch(`${API_URL}/agendas/${apiId}`, {
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
      setModalDelete({ open: false, agenda: null });
    }
  };

  // ============================
  // tabs + paginación
  // ============================
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [tab]);

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const agendasFiltradas = agendas.filter((a) => {
    if (tab === 'todas') return true;
    if (!a.fecha) return tab === 'todas';
    const f = new Date(a.fecha);
    f.setHours(0, 0, 0, 0);
    if (tab === 'futuras') return f >= hoy;
    if (tab === 'pasadas') return f < hoy;
    return true;
  });

  const totalAgendas = agendasFiltradas.length;
  const totalPages = Math.ceil(totalAgendas / pagination.pageSize) || 1;
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const agendasPaginated = agendasFiltradas.slice(startIndex, endIndex);

  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  const handlePageSizeChange = (newSize) => {
    setPagination({
      page: 1,
      pageSize: parseInt(newSize),
      total: agendasFiltradas.length,
    });
  };

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
          <p>
            Solo los roles <b>Administrador</b> y <b>SuperAdministrador</b> pueden
            administrar agendas.
          </p>
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
          <p className={styles.adminSubtitle}>
            Gestioná, editá o eliminá las agendas creadas por los usuarios.
          </p>

          {/* tabs */}
          <div className={styles.tabs}>
            {['todas', 'futuras', 'pasadas'].map((tipo) => {
              const count =
                tipo === 'todas'
                  ? agendas.length
                  : tipo === 'futuras'
                  ? agendas.filter((a) => {
                      if (!a.fecha) return false;
                      const f = new Date(a.fecha);
                      f.setHours(0, 0, 0, 0);
                      return f >= hoy;
                    }).length
                  : agendas.filter((a) => {
                      if (!a.fecha) return false;
                      const f = new Date(a.fecha);
                      f.setHours(0, 0, 0, 0);
                      return f < hoy;
                    }).length;
              return (
                <button
                  key={tipo}
                  className={`${styles.tab} ${
                    tab === tipo ? styles.activeTab : ''
                  }`}
                  onClick={() => setTab(tipo)}
                >
                  {tipo === 'todas'
                    ? 'Todas'
                    : tipo === 'futuras'
                    ? 'Futuras'
                    : 'Pasadas'}{' '}
                  <span className={styles.tabCount}>({count})</span>
                </button>
              );
            })}
          </div>

          {/* paginación arriba */}
          {agendasFiltradas.length > 0 && (
            <div className={styles.paginationControls}>
              <div className={styles.pageSizeSelector}>
                <label className={styles.textPageSize} htmlFor="pageSize">
                  Mostrar:
                </label>
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
                <div key={getAgendaApiId(agenda)} className={styles.usinaCard}>
                  <div
                    className={styles.imageContainer}
                    onClick={() =>
                      agenda.imageUrl && setSelectedImage(agenda.imageUrl)
                    }
                  >
                    {agenda.imageUrl &&
                    agenda.imageUrl !== '/placeholder.jpg' ? (
                      <img
                        src={agenda.imageUrl}
                        alt={agenda.tituloActividad}
                        className={styles.image}
                      />
                    ) : (
                      <div className={styles.noImage}>Sin imagen</div>
                    )}
                  </div>

                  <div className={styles.usinaInfo}>
                    <h2 className={styles.titulo}>{agenda.tituloActividad}</h2>

                    {agenda.creador && (
                      <div className={styles.creadorInfo}>
                        <p className={styles.creadorNombre}>
                          <strong>Creador:</strong> {agenda.creador.name}{' '}
                          {agenda.creador.surname}
                        </p>
                        <p className={styles.creadorUsername}>
                          @{agenda.creador.username}
                        </p>
                      </div>
                    )}

                    <div className={styles.estado}>
                      Fecha del evento:{' '}
                      {agenda.fecha
                        ? new Date(agenda.fecha).toLocaleDateString('es-AR')
                        : 'Sin fecha'}
                    </div>

                    {agenda.contenidoActividad && (
                      <p className={styles.descripcion}>
                        {agenda.contenidoActividad.slice(0, 120)}
                        {agenda.contenidoActividad.length > 120 ? '...' : ''}
                      </p>
                    )}
                  </div>

                  {/* acciones */}
                  <div className={styles.actions}>
                    <button
                      className={styles.btnEditar}
                      onClick={() => abrirModalEdicion(agenda)}
                    >
                      Editar
                    </button>
                    <button
                      className={styles.btnEliminar}
                      onClick={() =>
                        setModalDelete({ open: true, agenda })
                      }
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noUsinas}>
                <p>No hay agendas en esta vista.</p>
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
                  .filter(
                    (page) =>
                      page === 1 ||
                      page === totalPages ||
                      Math.abs(page - pagination.page) <= 1
                  )
                  .map((page, index, array) => {
                    const showEllipsis =
                      index > 0 && page - array[index - 1] > 1;
                    return (
                      <span key={page}>
                        {showEllipsis && (
                          <span className={styles.paginationEllipsis}>...</span>
                        )}
                        <button
                          className={`${styles.paginationBtn} ${
                            pagination.page === page
                              ? styles.paginationBtnActive
                              : ''
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

          {/* modal imagen */}
          {selectedImage && (
            <div
              className={styles.modalOverlay}
              onClick={() => setSelectedImage(null)}
            >
              <div
                className={styles.modalContent}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  className={styles.modalClose}
                  onClick={() => setSelectedImage(null)}
                >
                  ✕
                </button>
                <img
                  src={selectedImage}
                  alt="Agenda"
                  className={styles.modalImage}
                />
              </div>
            </div>
          )}

          {/* modal eliminar */}
          {modalDelete.open && (
            <div className={styles.modalOverlay}>
              <div className={styles.confirmModal}>
                <h2 className={styles.modalTitle}>Eliminar agenda</h2>
                <p className={styles.modalText}>
                  ¿Seguro que querés eliminar esta agenda?
                </p>
                {modalDelete.agenda && (
                  <div className={styles.modalUsinaInfo}>
                    <strong>{modalDelete.agenda.tituloActividad}</strong>
                  </div>
                )}
                <div className={styles.modalButtons}>
                  <button
                    className={styles.btnConfirmar}
                    onClick={() => eliminarAgenda(modalDelete.agenda)}
                  >
                    Confirmar
                  </button>
                  <button
                    className={styles.btnCancelar}
                    onClick={() =>
                      setModalDelete({ open: false, agenda: null })
                    }
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* modal edición */}
          {editModal.open && (
            <div className={styles.modalOverlay}>
              <div
                className={styles.editModal}
                onClick={(e) => e.stopPropagation()}
              >
                <h2 className={styles.modalTitle}>Editar agenda</h2>
                <p className={styles.modalText}>
                  Al guardar se avisará al creador de esta agenda.
                </p>

                <form onSubmit={handleGuardarEdicion} className={styles.editForm}>
                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="tituloActividad">
                      Título *
                    </label>
                    <textarea
                      id="tituloActividad"
                      name="tituloActividad"
                      value={editForm.tituloActividad}
                      onChange={handleEditInputChange}
                      rows={2}
                      className={`${styles.input} ${
                        editErrors.tituloActividad ? styles.inputError : ''
                      }`}
                      placeholder="Título de la agenda..."
                    />
                    {editErrors.tituloActividad && (
                      <p className={styles.errorText}>
                        {editErrors.tituloActividad}
                      </p>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="contenidoActividad">
                      Descripción *
                    </label>
                    <textarea
                      id="contenidoActividad"
                      name="contenidoActividad"
                      value={editForm.contenidoActividad}
                      onChange={handleEditInputChange}
                      rows={4}
                      className={`${styles.input} ${
                        editErrors.contenidoActividad ? styles.inputError : ''
                      }`}
                      placeholder="Descripción del evento..."
                    />
                    {editErrors.contenidoActividad && (
                      <p className={styles.errorText}>
                        {editErrors.contenidoActividad}
                      </p>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label} htmlFor="fecha">
                      Fecha *
                    </label>
                    <input
                      type="date"
                      id="fecha"
                      name="fecha"
                      value={editForm.fecha}
                      onChange={handleEditInputChange}
                      className={`${styles.input} ${
                        editErrors.fecha ? styles.inputError : ''
                      }`}
                    />
                    {editErrors.fecha && (
                      <p className={styles.errorText}>{editErrors.fecha}</p>
                    )}
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Imagen *</label>
                    <div className={styles.mediaEditWrapper}>
                      {editForm.imagenPreview ? (
                        <div className={styles.mediaPreviewBox}>
                          <img
                            src={editForm.imagenPreview}
                            alt="Preview"
                            className={styles.mediaPreviewImg}
                          />
                        </div>
                      ) : (
                        <div className={styles.noMedia}>Sin imagen actual</div>
                      )}
                      <input
                        type="file"
                        name="imagen"
                        id="imagen"
                        accept="image/*"
                        onChange={handleEditInputChange}
                        className={styles.fileInput}
                      />
                    </div>
                    {editErrors.imagen && (
                      <p className={styles.errorText}>{editErrors.imagen}</p>
                    )}
                  </div>

                  <div className={styles.modalButtons}>
                    <button
                      type="button"
                      className={styles.btnCancelar}
                      onClick={cerrarModalEdicion}
                      disabled={savingEdit}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className={styles.btnConfirmar}
                      disabled={savingEdit}
                    >
                      {savingEdit ? 'Guardando...' : 'Guardar cambios'}
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
