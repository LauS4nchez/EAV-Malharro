'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_URL, URL, API_TOKEN } from '@/app/config';
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  parseISO,
  format,
} from 'date-fns';
import { es } from 'date-fns/locale';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import { isNativePlatform, openMediaPicker } from '@/app/utils/mediaPicker';
import styles from '@/styles/components/Agenda/AgendaPage.module.css';
import toast from 'react-hot-toast';

async function crearNotificacionInline({
  jwt,
  adminToken,
  titulo,
  mensaje,
  receptorId,
  emisorId,
  agendaId,
  tipo = 'agenda',
}) {
  const token = jwt || adminToken;
  if (!token) return;

  try {
    const data = {
      titulo,
      mensaje,
      tipo,                 // "agenda" | "usina" | "sistema"
      leida: 'no-leida',    // coincide con el enum
      fechaEmision: new Date().toISOString(),
    };

    if (receptorId) data.receptor = receptorId;
    if (emisorId) data.emisor = emisorId;
    if (agendaId) data.agendaAfectada = agendaId; // nombre real de la relación

    const res = await fetch(`${API_URL}/notificaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
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

export default function CalendarioPage() {
  // Estado principal
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedAgenda, setSelectedAgenda] = useState(null);
  const [modalOpen, setModalOpen] = useState(false); // Modal de detalle
  const [formModalOpen, setFormModalOpen] = useState(false); // Modal de creación

  // user + rol
  const [userId, setUserId] = useState(null);
  const [rol, setRol] = useState(null);
  const [jwt, setJwt] = useState(null);

  // Avisos compactos para feedback (éxito/error)
  const [notice, setNotice] = useState(null); // {type:'success'|'error', text:string}

  const router = useRouter();

  // Formulario controlado para crear agendas
  const [agendaForm, setAgendaForm] = useState({
    tituloActividad: '',
    contenidoActividad: '',
    fecha: '',
    imagen: null, // requerida
  });

  // Gestión de validaciones
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [uploading, setUploading] = useState(false);

  // ---------- helpers de validación ----------
  const isFutureOrToday = (yyyyMMdd) => {
    if (!yyyyMMdd) return false;
    const d = new Date(`${yyyyMMdd}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return d >= today;
  };

  const sanitize = (s = '') => s.replace(/\s+/g, ' ').trim();

  const validateAgenda = (form, list) => {
    const e = {};
    const titulo = sanitize(form.tituloActividad);
    const desc = sanitize(form.contenidoActividad);
    const fecha = form.fecha;

    // Título: 3-80 caracteres
    if (!titulo) e.tituloActividad = 'El título es obligatorio.';
    else if (titulo.length < 3) e.tituloActividad = 'Usá al menos 3 caracteres.';
    else if (titulo.length > 80) e.tituloActividad = 'Máximo 80 caracteres.';

    // Descripción: 10-2000 caracteres
    if (!desc) e.contenidoActividad = 'La descripción es obligatoria.';
    else if (desc.length < 10) e.contenidoActividad = 'Describí un poco más (mín. 10).';
    else if (desc.length > 2000) e.contenidoActividad = 'Máximo 2000 caracteres.';

    // Fecha ISO yyyy-mm-dd y no pasada
    if (!fecha) e.fecha = 'La fecha es obligatoria.';
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) e.fecha = 'Fecha inválida.';
    else if (!isFutureOrToday(fecha)) e.fecha = 'La fecha no puede ser pasada.';

    // Imagen obligatoria
    if (!form.imagen) {
      e.imagen = 'La imagen es obligatoria.';
    } else {
      const file = form.imagen;
      const okType = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      const maxMB = 3;
      if (!okType.includes(file.type)) e.imagen = 'Formato inválido (JPG, PNG, WEBP o AVIF).';
      else if (file.size > maxMB * 1024 * 1024) e.imagen = `La imagen supera ${maxMB} MB.`;
    }

    // Duplicados
    if (titulo && fecha && Array.isArray(list)) {
      const dup = list.some(
        (a) =>
          sanitize(a.tituloActividad).toLowerCase() === titulo.toLowerCase() &&
          a.fecha?.slice(0, 10) === fecha
      );
      if (dup) e.tituloActividad = 'Ya existe una agenda con ese título en esa fecha.';
    }

    return e;
  };

  const liveErrors = useMemo(() => validateAgenda(agendaForm, agendas), [agendaForm, agendas]);
  const formIsValid = Object.keys(liveErrors).length === 0;

  // ---------- usuario y rol ----------
  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
    if (token) setJwt(token);

    const fetchUser = async () => {
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/users/me?populate=role`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setUserId(data.id);
        setRol(data.role?.name ?? null);
      } catch (err) {
        console.error(err);
      }
    };
    fetchUser();
  }, []);

  // ---------- cargar agendas ----------
  const fetchAgendas = async () => {
    try {
      const res = await fetch(
        `${API_URL}/agendas?populate=imagen&populate=creador&sort=fecha:asc`,
        {
          cache: 'no-store',
        }
      );
      const json = await res.json();
      const items = Array.isArray(json?.data) ? json.data : [];

      const normalized = items.map((item) => {
        const a = item.attributes ?? item;
        const imagenField = a.imagen;
        const imgData = imagenField?.data ?? imagenField;
        const imgAttrs = imgData?.attributes ?? imgData;
        const urlPath = imgAttrs?.url;

        let imageUrl = '/placeholder.jpg';
        if (urlPath) imageUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;

        // creador
        const creadorField = a.creador;
        const creadorData = creadorField?.data ?? creadorField;
        const creadorAttrs = creadorData?.attributes ?? creadorData;

        return {
          id: item.id,
          documentId: item.documentId,
          tituloActividad: a.tituloActividad ?? '',
          contenidoActividad: a.contenidoActividad ?? '',
          fecha: a.fecha ?? '',
          creador: creadorAttrs
            ? {
                id: creadorData?.id,
                name: creadorAttrs.name || '',
                surname: creadorAttrs.surname || '',
                username: creadorAttrs.username || '',
              }
            : null,
          imageUrl,
        };
      });

      setAgendas(normalized);
    } catch (err) {
      console.error('Error al cargar agendas:', err);
      setNotice({ type: 'error', text: 'No se pudieron cargar las agendas.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgendas();
  }, []);

  // ---------- notificar "hoy" y "mañana" al usuario actual ----------
  useEffect(() => {
    if (!jwt || !userId || agendas.length === 0) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const mañana = new Date(hoy);
    mañana.setDate(hoy.getDate() + 1);

    const checkYNotificar = async () => {
      for (const ag of agendas) {
        if (!ag.fecha) continue;

        let f;
        try {
          f = parseISO(ag.fecha);
        } catch {
          f = new Date(ag.fecha);
        }
        f.setHours(0, 0, 0, 0);

        // notificación para hoy
        if (f.getTime() === hoy.getTime()) {
          const key = `noti-agenda-hoy-${ag.id}-${userId}`;
          if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
            await crearNotificacionInline({
              jwt,
              titulo: 'Evento de hoy',
              mensaje: `Tenés el evento "${ag.tituloActividad}" hoy (${f.toLocaleDateString(
                'es-AR'
              )}).`,
              receptorId: userId,
              agendaId: ag.id,
              tipo: 'agenda',
            });
            localStorage.setItem(key, '1');
          }
        }

        // notificación para mañana
        if (f.getTime() === mañana.getTime()) {
          const key = `noti-agenda-mañana-${ag.id}-${userId}`;
          if (typeof window !== 'undefined' && !localStorage.getItem(key)) {
            await crearNotificacionInline({
              jwt,
              titulo: 'Evento mañana',
              mensaje: `Mañana tenés el evento "${ag.tituloActividad}" (${f.toLocaleDateString(
                'es-AR'
              )}).`,
              receptorId: userId,
              agendaId: ag.id,
              tipo: 'agenda',
            });
            localStorage.setItem(key, '1');
          }
        }
      }
    };

    checkYNotificar();
  }, [jwt, userId, agendas]);

  // ---------- NUEVO: Manejo de selección de imagen con Capacitor ----------
  const handleSelectImage = async () => {
    if (uploading) return;

    const token = jwt;
    if (!token) {
      setNotice({ type: 'error', text: 'Debes iniciar sesión para subir imágenes.' });
      return;
    }

    try {
      setUploading(true);

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

      // Validaciones
      const okType = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      const maxMB = 3;

      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes.');
        return;
      }

      if (!okType.includes(file.type)) {
        toast.error('Formato inválido (JPG, PNG, WEBP o AVIF).');
        return;
      }

      if (file.size > maxMB * 1024 * 1024) {
        toast.error(`La imagen supera ${maxMB} MB.`);
        return;
      }

      // Actualizar el formulario con la imagen seleccionada
      setAgendaForm((prev) => ({ ...prev, imagen: file }));
      setTouched((prev) => ({ ...prev, imagen: true }));
      
      toast.success('Imagen seleccionada correctamente');

    } catch (err) {
      console.error('Error seleccionando imagen:', err);
      toast.error('Error al seleccionar la imagen: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  // ---------- formulario ----------
  const handleFormChange = (e) => {
    const { name, value, files } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    if (name === 'imagen') {
      const file = files?.[0] ?? null;
      setAgendaForm((prev) => ({ ...prev, imagen: file }));
    } else {
      setAgendaForm((prev) => ({ ...prev, [name]: value }));
    }
    setErrors(liveErrors);
  };

  const handleBlur = (e) => {
    const { name } = e.target;
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors(liveErrors);
  };

  const resetForm = () => {
    setAgendaForm({
      tituloActividad: '',
      contenidoActividad: '',
      fecha: '',
      imagen: null,
    });
    setErrors({});
    setTouched({});
  };

  // ---------- crear agenda ----------
  const handleSubmitAgenda = async (e) => {
    e.preventDefault();
    if (!userId) {
      setNotice({ type: 'error', text: 'Usuario no identificado.' });
      return;
    }

    const token = jwt;
    if (!token) {
      setNotice({ type: 'error', text: 'Debes iniciar sesión.' });
      return;
    }

    const errs = validateAgenda(agendaForm, agendas);
    setErrors(errs);
    setTouched({
      tituloActividad: true,
      contenidoActividad: true,
      fecha: true,
      imagen: true,
    });
    if (Object.keys(errs).length) {
      setNotice({ type: 'error', text: 'Revisá los campos marcados en rojo.' });
      return;
    }

    try {
      setUploading(true);

      // 1) Subida de imagen
      let imagenId = null;
      if (agendaForm.imagen) {
        const uploadForm = new FormData();
        uploadForm.append('files', agendaForm.imagen);
        const uploadRes = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: uploadForm,
        });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData?.[0]?.id) {
          throw new Error(uploadData?.error?.message || 'Error al subir la imagen');
        }
        imagenId = uploadData[0].id;
      }

      // 2) Crear agenda
      const res = await fetch(`${API_URL}/agendas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: {
            tituloActividad: sanitize(agendaForm.tituloActividad),
            contenidoActividad: sanitize(agendaForm.contenidoActividad),
            fecha: agendaForm.fecha,
            creador: userId,
            imagen: imagenId,
          },
        }),
      });

      const created = await res.json();
      if (!res.ok) throw new Error(created?.error?.message || 'Error al crear agenda');

      // id real de la agenda creada
      const nuevaAgendaId = created?.data?.id ?? created?.id ?? null;

      // 3) Notificar al que la creó (⚠️ sin fechaEvento)
      await crearNotificacionInline({
        jwt: token,
        titulo: 'Agenda creada',
        mensaje: `Creaste la agenda "${agendaForm.tituloActividad}" para el ${new Date(
          agendaForm.fecha
        ).toLocaleDateString('es-AR')}.`,
        receptorId: userId,
        emisorId: userId,
        agendaId: nuevaAgendaId,
        tipo: 'agenda',
      });

      // 4) Notificar a TODOS los usuarios (con API_TOKEN)
      try {
        if (API_TOKEN) {
          const usersRes = await fetch(
            `${API_URL}/users?pagination[pageSize]=1000`,
            {
              headers: {
                Authorization: `Bearer ${API_TOKEN}`,
              },
            }
          );
          const usersData = await usersRes.json();

          // puede venir como [] o como {data: []}
          const users = Array.isArray(usersData)
            ? usersData
            : Array.isArray(usersData?.data)
            ? usersData.data
            : [];

          const fechaBonita = new Date(agendaForm.fecha).toLocaleDateString('es-AR');

          await Promise.all(
            users.map((u) =>
              crearNotificacionInline({
                adminToken: API_TOKEN,
                titulo: 'Nuevo evento en la agenda',
                mensaje: `Se creó el evento "${agendaForm.tituloActividad}" para el ${fechaBonita}.`,
                receptorId: u.id,
                emisorId: userId,
                agendaId: nuevaAgendaId,
                tipo: 'agenda',
              })
            )
          );
        } else {
          console.warn('No hay API_TOKEN para notificar a todos los usuarios.');
        }
      } catch (err) {
        console.error('No se pudieron notificar a todos los usuarios:', err);
      }

      setNotice({ type: 'success', text: 'Agenda creada correctamente.' });
      resetForm();
      setFormModalOpen(false);
      fetchAgendas();
    } catch (err) {
      console.error('Error al crear agenda:', err);
      setNotice({ type: 'error', text: 'Ocurrió un problema al crear la agenda.' });
    } finally {
      setUploading(false);
    }
  };

  // ---------- calendario ----------
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const renderHeader = () => (
    <div className={styles.header}>
      <button onClick={prevMonth} className={styles.navButton}>
        ‹
      </button>
      <h2>{format(currentMonth, 'MMMM yyyy', { locale: es })}</h2>
      <button onClick={nextMonth} className={styles.navButton}>
        ›
      </button>
    </div>
  );

  const renderDays = () => {
    const days = [];
    const startDate = startOfWeek(currentMonth, { locale: es, weekStartsOn: 1 });
    for (let i = 0; i < 7; i++)
      days.push(
        <div key={i} className={styles.weekDay}>
          {format(addDays(startDate, i), 'EEE', { locale: es })}
        </div>
      );
    return <div className={styles.daysRow}>{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { locale: es, weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { locale: es, weekStartsOn: 1 });

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const dayAgendas = agendas.filter((a) => {
          try {
            return isSameDay(parseISO(a.fecha), day);
          } catch {
            return false;
          }
        });

        days.push(
          <div
            key={day.toISOString()}
            className={`${styles.cell} ${!isSameMonth(day, monthStart) ? styles.disabled : ''}`}
          >
            <div className={styles.dateNumber}>{format(day, 'd', { locale: es })}</div>
            {dayAgendas.map((agenda) => (
              <div key={agenda.id} className={styles.agendaItem}>
                <span
                  onClick={() => {
                    setSelectedAgenda(agenda);
                    setModalOpen(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  {agenda.tituloActividad}
                </span>
              </div>
            ))}
          </div>
        );

        day = addDays(day, 1);
      }

      rows.push(
        <div key={day.toISOString()} className={styles.row}>
          {days}
        </div>
      );
      days = [];
    }

    return <div>{rows}</div>;
  };

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando agendas...</p>
      </div>
    );

  const fechaBonita = (iso) => {
    try {
      return format(parseISO(iso), "EEEE d 'de' MMMM, yyyy", { locale: es });
    } catch {
      return iso || '';
    }
  };

  return (
    <div>
      <Header variant="dark" />
      <div className={styles.container}>
        {/* Avisos globales */}
        {notice && (
          <div
            className={notice.type === 'success' ? styles.noticeSuccess : styles.noticeError}
            role="status"
          >
            {notice.text}
          </div>
        )}

        <h1 className={styles.title}>Calendario de Agendas</h1>

        {/* Acciones superiores */}
        <div className={styles.actions}>
          {(rol === 'Administrador' || rol === 'Profesor' || rol === 'SuperAdministrador') && (
            <>
              <button
                className={styles.navButton}
                onClick={() => {
                  resetForm();
                  setFormModalOpen(true);
                  setNotice(null);
                }}
              >
                + Crear Agenda
              </button>

              <button className={styles.navButton} onClick={() => router.push('/mis-agendas')}>
                Ver mis agendas
              </button>
            </>
          )}

          <button
            className={styles.navButton}
            onClick={() => router.push('/')}
            aria-label="Volver a la página principal"
            title="Volver a la página principal"
          >
            Volver al inicio
          </button>
        </div>

        {renderHeader()}
        {renderDays()}
        {renderCells()}

        {/* Modal crear agenda */}
        {formModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setFormModalOpen(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setFormModalOpen(false)}>
                ✕
              </button>
              <h3>Crear Nueva Agenda</h3>

              <form onSubmit={handleSubmitAgenda} noValidate>
                <div>
                  <label>Título:</label>
                  <input
                    type="text"
                    name="tituloActividad"
                    value={agendaForm.tituloActividad}
                    onChange={handleFormChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(touched.tituloActividad && liveErrors.tituloActividad)}
                    required
                  />
                  {touched.tituloActividad && liveErrors.tituloActividad && (
                    <small className={styles.error}>{liveErrors.tituloActividad}</small>
                  )}
                </div>

                <div>
                  <label>Descripción:</label>
                  <textarea
                    name="contenidoActividad"
                    value={agendaForm.contenidoActividad}
                    onChange={handleFormChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(
                      touched.contenidoActividad && liveErrors.contenidoActividad
                    )}
                    required
                  />
                  {touched.contenidoActividad && liveErrors.contenidoActividad && (
                    <small className={styles.error}>{liveErrors.contenidoActividad}</small>
                  )}
                </div>

                <div>
                  <label>Fecha:</label>
                  <input
                    type="date"
                    name="fecha"
                    value={agendaForm.fecha}
                    onChange={handleFormChange}
                    onBlur={handleBlur}
                    aria-invalid={!!(touched.fecha && liveErrors.fecha)}
                    required
                  />
                  {touched.fecha && liveErrors.fecha && (
                    <small className={styles.error}>{liveErrors.fecha}</small>
                  )}
                </div>

                <div>
                  <label>Imagen:</label>
                  
                  {/* Input file tradicional solo para web */}
                  {!isNativePlatform() && (
                    <input
                      type="file"
                      name="imagen"
                      accept="image/jpeg,image/png,image/webp,image/avif"
                      onChange={handleFormChange}
                      onBlur={handleBlur}
                      aria-invalid={!!(touched.imagen && liveErrors.imagen)}
                      required
                    />
                  )}

                  {/* Botón para seleccionar imagen en app nativa */}
                  <button
                    type="button"
                    onClick={handleSelectImage}
                    className={styles.imageSelectButton}
                    disabled={uploading}
                  >
                    {uploading ? 'Seleccionando...' : 
                     isNativePlatform() ? '📱 Elegir imagen' : 'Seleccionar imagen'}
                  </button>

                  {/* Mostrar información del archivo seleccionado */}
                  {agendaForm.imagen && (
                    <div className={styles.selectedFileInfo}>
                      <p>Archivo seleccionado: {agendaForm.imagen.name}</p>
                      <p>Tamaño: {(agendaForm.imagen.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                  )}

                  {touched.imagen && liveErrors.imagen && (
                    <small className={styles.error}>{liveErrors.imagen}</small>
                  )}
                </div>

                <button
                  type="submit"
                  className={styles.navButton}
                  disabled={!formIsValid || uploading}
                  title={!formIsValid ? 'Completá y corregí los campos' : 'Crear'}
                >
                  {uploading ? 'Creando...' : 'Crear'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Modal ver agenda */}
        {modalOpen && selectedAgenda && (
          <div className={styles.modalOverlay} onClick={() => setModalOpen(false)}>
            <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setModalOpen(false)}>
                ✕
              </button>
              <h3>{selectedAgenda.tituloActividad}</h3>
              {selectedAgenda.imageUrl && (
                <img
                  src={selectedAgenda.imageUrl}
                  alt={selectedAgenda.tituloActividad}
                  className={styles.modalImage}
                />
              )}
              <p>
                <strong>Fecha:</strong> {fechaBonita(selectedAgenda.fecha)}
              </p>
              <p>
                <strong>Descripción:</strong> {selectedAgenda.contenidoActividad}
              </p>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}