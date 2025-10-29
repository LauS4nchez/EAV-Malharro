'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, URL } from '@/app/config';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import styles from '@/styles/components/Agenda/MisAgendasPage.module.css';

export default function MisAgendasPage() {
  const router = useRouter();

  // --- sesión/rol/propietario ---
  const [rol, setRol] = useState(null);
  const [userId, setUserId] = useState(null);

  // --- datos principales ---
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- modales + selección ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAgenda, setSelectedAgenda] = useState(null);

  // --- formulario de edición ---
  const [editData, setEditData] = useState({
    tituloActividad: '',
    contenidoActividad: '',
    fecha: '',
    imagen: null,
  });

  // --- validación + avisos livianos ---
  const [errors, setErrors] = useState({ tituloActividad: '', contenidoActividad: '', fecha: '' });
  const [notice, setNotice] = useState({ type: '', message: '' }); // type: 'ok' | 'err' | ''

  /** Muestra aviso temporalmente (UX mínima, sin librerías) */
  const showNotice = (type, message, ms = 2500) => {
    setNotice({ type, message });
    if (ms) {
      setTimeout(() => setNotice({ type: '', message: '' }), ms);
    }
  };

  // 🔹 Obtener usuario logueado y rol (necesario para filtrar y autorizar acciones)
  useEffect(() => {
    const fetchUser = async () => {
      const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/users/me?populate=role`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUserId(data.id);
        setRol(data.role?.name ?? null);
      } catch (err) {
        console.error('Error al obtener usuario:', err);
      }
    };
    fetchUser();
  }, []);

  /** Cargar agendas del usuario actual (filtra por `creador.id`) */
  const fetchAgendas = async () => {
    if (!userId) return;
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(
        `${API_URL}/agendas?filters[creador][id][$eq]=${userId}&populate=imagen`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: 'no-store' }
      );

      const json = await res.json();
      const items = Array.isArray(json?.data) ? json.data : [];

      // Normaliza (Strapi v4/v5: puede venir en attributes o plano)
      const normalized = items.map((item) => {
        const a = item.attributes ?? item;
        const id = item.documentId ?? item.id;

        // Resuelve URL de imagen (prefijo base si viene relativa)
        const imgField = a.imagen;
        const imgData = imgField?.data ?? imgField;
        const imgAttrs = imgData?.attributes ?? imgData;
        const urlPath = imgAttrs?.url;

        const imageUrl = urlPath
          ? (urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`)
          : '/placeholder.jpg';

        return {
          id,
          tituloActividad: a.tituloActividad ?? '',
          contenidoActividad: a.contenidoActividad ?? '',
          fecha: a.fecha ?? '',
          imageUrl,
        };
      });

      setAgendas(normalized);
    } catch (err) {
      console.error('Error al cargar agendas:', err);
      showNotice('err', 'No se pudieron cargar tus agendas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  /** Abre modal de confirmación para eliminar */
  const confirmarEliminar = (agenda) => {
    setSelectedAgenda(agenda);
    setShowDeleteModal(true);
  };

  /** Elimina agenda y actualiza estado local (optimista simple) */
  const eliminarAgenda = async () => {
    if (!selectedAgenda) return;
    try {
      const token = localStorage.getItem('jwt');
      const res = await fetch(`${API_URL}/agendas/${selectedAgenda.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Error al eliminar agenda');
      setAgendas((prev) => prev.filter((a) => a.id !== selectedAgenda.id));
      showNotice('ok', 'Agenda eliminada.');
    } catch (err) {
      console.error('Error al eliminar agenda:', err);
      showNotice('err', 'No se pudo eliminar la agenda.');
    } finally {
      setShowDeleteModal(false);
      setSelectedAgenda(null);
    }
  };

  /** Prepara datos y abre modal de edición */
  const abrirEditar = (agenda) => {
    setSelectedAgenda(agenda);
    setEditData({
      tituloActividad: agenda.tituloActividad,
      contenidoActividad: agenda.contenidoActividad,
      fecha: agenda.fecha,
      imagen: null,
    });
    setErrors({ tituloActividad: '', contenidoActividad: '', fecha: '' });
    setShowEditModal(true);
  };

  /** Control del formulario de edición (incluye file input) */
  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));

    // Validación básica en vivo (solo campos de texto/fecha)
    if (['tituloActividad', 'contenidoActividad', 'fecha'].includes(name)) {
      setErrors((prev) => ({
        ...prev,
        [name]: value?.toString().trim() ? '' : 'Este campo es obligatorio',
      }));
    }
  };

  /** Validación mínima antes del PUT */
  const validateForm = () => {
    const err = {
      tituloActividad: editData.tituloActividad.trim() ? '' : 'Este campo es obligatorio',
      contenidoActividad: editData.contenidoActividad.trim() ? '' : 'Este campo es obligatorio',
      fecha: editData.fecha ? '' : 'Este campo es obligatorio',
    };
    setErrors(err);
    return !err.tituloActividad && !err.contenidoActividad && !err.fecha;
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    if (!selectedAgenda) return;

    if (!validateForm()) {
      showNotice('err', 'Completá los campos obligatorios.');
      return;
    }

    const token = localStorage.getItem('jwt');
    let imagenId = null;
    let uploadedImageUrl = null;

    try {
      // 1) Subir nueva imagen si se seleccionó
      if (editData.imagen) {
        const uploadForm = new FormData();
        uploadForm.append('files', editData.imagen);

        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadForm,
        });

        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData?.[0]?.id) {
          throw new Error('Error al subir imagen');
        }

        imagenId = uploadData[0].id;
        const path = uploadData[0].url;
        uploadedImageUrl = path?.startsWith('http') ? path : `${URL}${path}`;
      }

      // 2) PUT de la agenda (pedimos populate para refrescar imagen)
      const body = {
        data: {
          tituloActividad: editData.tituloActividad.trim(),
          contenidoActividad: editData.contenidoActividad.trim(),
          fecha: editData.fecha, // YYYY-MM-DD
          tipoEvento: 'general',
          etiquetas: 'ninguna',
          ...(imagenId && { imagen: { set: [{ id: imagenId }] } }),
        },
      };

      const res = await fetch(`${API_URL}/agendas/${selectedAgenda.id}?populate=imagen`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const updated = await res.json();
      if (!res.ok) throw new Error(JSON.stringify(updated));

      // 3) Normaliza imagen retornada o usa la recién subida
      const a = updated?.data?.attributes ?? {};
      const imgField = a?.imagen;
      const imgData = imgField?.data ?? imgField;
      const imgAttrs = imgData?.attributes ?? imgData;
      const urlPath = imgAttrs?.url;

      const newImageUrl = urlPath
        ? (urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`)
        : uploadedImageUrl || null;

      // 4) Refresca item editado en el estado
      setAgendas((prev) =>
        prev.map((ag) =>
          ag.id === selectedAgenda.id
            ? {
                ...ag,
                tituloActividad: a.tituloActividad ?? editData.tituloActividad.trim(),
                contenidoActividad: a.contenidoActividad ?? editData.contenidoActividad.trim(),
                fecha: a.fecha ?? editData.fecha,
                imageUrl: newImageUrl ?? ag.imageUrl,
              }
            : ag
        )
      );

      setShowEditModal(false);
      showNotice('ok', 'Agenda modificada.');
    } catch (err) {
      console.error('Error al modificar agenda:', err);
      showNotice('err', 'No se pudo modificar la agenda.');
    }
  };

  // ========= Renderizado =========

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando tus agendas...</p>
      </div>
    );

  // Gate simple: roles permitidos
  if (!['Administrador', 'Profesor', 'Estudiante', 'SuperAdministrador'].includes(rol))
    return (
      <div className={styles.loadingContainer}>
        <p>No tienes permiso para acceder aquí.</p>
      </div>
    );

  return (
    <div>
      <Header />
      <div className={styles.container}>
        {/* Botón volver */}
        <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 16 }}>
          <button
            className={styles.btnAprobar}
            onClick={() => router.push('/agendas')}
            aria-label="Volver a Agendas"
          >
            ← Volver a Agendas
          </button>
        </div>

        {/* Aviso no intrusivo (éxito/error) */}
        {notice.message && (
          <div
            role="status"
            aria-live="polite"
            style={{
              marginBottom: 16,
              padding: '10px 12px',
              borderRadius: 10,
              background: notice.type === 'ok' ? '#e6f6ea' : '#fde8e8',
              border: `1px solid ${notice.type === 'ok' ? '#95d5a6' : '#f5b5b5'}`,
              color: '#000',
              fontSize: 14,
            }}
          >
            {notice.message}
          </div>
        )}

        <h1 className={styles.title}>Mis Agendas</h1>

        {agendas.length === 0 ? (
          <p style={{ textAlign: 'center', marginTop: '20px' }}>
            No has creado ninguna agenda todavía.
          </p>
        ) : (
          <div className={styles.usinaGaleria}>
            {agendas.map((agenda) => (
              <div key={agenda.id} className={styles.usinaCard}>
                <img
                  src={agenda.imageUrl}
                  alt={agenda.tituloActividad}
                  className={styles.usinaImage}
                />
                <div className={styles.usinaContenido}>
                  <h3>{agenda.tituloActividad}</h3>
                  <p>
                    <strong>Fecha:</strong> {agenda.fecha}
                  </p>
                  <p>{agenda.contenidoActividad}</p>
                  <div className={styles.usinaBotones}>
                    <button
                      className={styles.btnAprobar}
                      onClick={() => confirmarEliminar(agenda)}
                    >
                      Eliminar
                    </button>
                    <button
                      className={styles.btnModificar}
                      onClick={() => abrirEditar(agenda)}
                    >
                      Modificar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* === Modal Eliminar === */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>¿Eliminar esta agenda?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className={styles.modalButtons}>
              <button onClick={eliminarAgenda} className={styles.btnAprobar}>
                Eliminar
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                className={styles.btnModificar}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Modal Editar === */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <h3>Modificar Agenda</h3>
            <form onSubmit={guardarCambios} noValidate>
              <div>
                <label htmlFor="tituloActividad">Título:</label>
                <input
                  id="tituloActividad"
                  type="text"
                  name="tituloActividad"
                  value={editData.tituloActividad}
                  onChange={handleEditChange}
                  required
                  aria-invalid={!!errors.tituloActividad}
                  aria-describedby="err-titulo"
                />
                {errors.tituloActividad && (
                  <small id="err-titulo" style={{ color: '#c00' }}>
                    {errors.tituloActividad}
                  </small>
                )}
              </div>
              <div>
                <label htmlFor="contenidoActividad">Descripción:</label>
                <textarea
                  id="contenidoActividad"
                  name="contenidoActividad"
                  value={editData.contenidoActividad}
                  onChange={handleEditChange}
                  required
                  aria-invalid={!!errors.contenidoActividad}
                  aria-describedby="err-desc"
                />
                {errors.contenidoActividad && (
                  <small id="err-desc" style={{ color: '#c00' }}>
                    {errors.contenidoActividad}
                  </small>
                )}
              </div>
              <div>
                <label htmlFor="fecha">Fecha:</label>
                <input
                  id="fecha"
                  type="date"
                  name="fecha"
                  value={editData.fecha}
                  onChange={handleEditChange}
                  required
                  aria-invalid={!!errors.fecha}
                  aria-describedby="err-fecha"
                />
                {errors.fecha && (
                  <small id="err-fecha" style={{ color: '#c00' }}>
                    {errors.fecha}
                  </small>
                )}
              </div>
              <div>
                <label htmlFor="imagen">Imagen (opcional):</label>
                <input
                  id="imagen"
                  type="file"
                  name="imagen"
                  accept="image/*"
                  onChange={handleEditChange}
                />
              </div>
              <div className={styles.modalButtons}>
                <button type="submit" className={styles.btnModificar}>
                  Guardar cambios
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className={styles.btnAprobar}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
