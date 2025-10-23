'use client';

import { useEffect, useState } from 'react';
import { API_URL, URL } from '@/app/config';
import styles from '@/styles/components/MisUsinasPage.module.css';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';

export default function MisUsinasPage() {
  const [rol, setRol] = useState(null);
  const [userId, setUserId] = useState(null);
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('crear');

  // Estado para modales
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUsina, setSelectedUsina] = useState(null);

  // Formulario de edición
  const [editData, setEditData] = useState({
    nombre: '',
    carrera: '',
    link: '',
    imagen: null,
  });

  // Verificar usuario y rol
  useEffect(() => {
    const verificarUsuario = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) return;
      try {
        const res = await fetch(`${API_URL}/users/me?populate=role`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const user = await res.json();
        setRol(user.role?.name);
        setUserId(user.id);
      } catch (err) {
        console.error('Error al verificar usuario:', err);
      }
    };
    verificarUsuario();
  }, []);

  // Cargar mis usinas
  useEffect(() => {
    if (!userId) return;

    const fetchUsinas = async () => {
      try {
        const token = localStorage.getItem('jwt');
        const res = await fetch(
          `${API_URL}/usinas?filters[creador][id][$eq]=${userId}&populate=imagen`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            cache: 'no-store',
          }
        );

        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const normalized = items.map((item) => {
          const attributes = item.attributes ?? item;
          const imagenField = attributes.imagen;
          const imgData = imagenField?.data ?? imagenField;
          const imgAttrs = imgData?.attributes ?? imgData;
          const urlPath = imgAttrs?.url;

          let imageUrl = '/placeholder.jpg';
          if (urlPath)
            imageUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;
          return {
            id: item.documentId ?? item.id,
            nombre: attributes.nombre ?? 'Sin nombre',
            carrera: attributes.carrera ?? '',
            link: attributes.link ?? '',
            aprobado: attributes.aprobado ?? 'pendiente',
            imageUrl,
          };
        });

        setUsinas(normalized);
      } catch (err) {
        console.error('Error al obtener mis usinas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsinas();
  }, [userId]);

  // Crear nueva usina
  const crearUsina = async (e) => {
  e.preventDefault();
  const formData = new FormData(e.target);
  const nombre = formData.get('nombre').trim();
  const carrera = formData.get('carrera').trim();
  const imagenFile = formData.get('imagen');

  if (!nombre || !carrera) {
    alert('Todos los campos obligatorios deben completarse.');
    return;
  }

  const token = localStorage.getItem('jwt');
  let imagenId = null;

  try {
    // Paso 1: subir imagen a la Media Library si hay archivo
    if (imagenFile && imagenFile.size > 0) {
      const uploadForm = new FormData();
      uploadForm.append('files', imagenFile);

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData?.[0]?.id)
        throw new Error('Error al subir imagen');

      imagenId = uploadData[0].id; // ✅ obtenemos el ID de la imagen subida
    }

    // Paso 2: crear la usina usando el ID de la imagen
    const res = await fetch(`${API_URL}/usinas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          nombre,
          carrera,
          link: formData.get('link') || '',
          aprobado: 'pendiente',
          creador: userId ? { connect: [{ id: userId }] } : undefined,
          imagen: imagenId ? { connect: [{ id: imagenId }] } : undefined, // 👈 conexión correcta
        },
      }),
    });

    const created = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(created));

    alert('Usina creada correctamente.');
    e.target.reset();
    setTab('pendientes');
  } catch (err) {
    console.error('Error creando usina:', err);
    alert('Error al crear usina. Revisa la consola para más detalles.');
  }
};

  // Modal eliminar
  const confirmarEliminar = (usina) => {
    setSelectedUsina(usina);
    setShowDeleteModal(true);
  };

  const eliminarUsina = async () => {
    if (!selectedUsina) return;
    try {
      await fetch(`${API_URL}/usinas/${selectedUsina.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('jwt')}` },
      });
      setUsinas(usinas.filter((u) => u.id !== selectedUsina.id));
    } catch (err) {
      console.error('Error eliminando usina:', err);
    } finally {
      setShowDeleteModal(false);
      setSelectedUsina(null);
    }
  };

  // Modal modificar
  const abrirEditar = (usina) => {
    setSelectedUsina(usina);
    setEditData({
      nombre: usina.nombre,
      carrera: usina.carrera,
      link: usina.link,
      imagen: null,
    });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value, files } = e.target;
    setEditData((prev) => ({
      ...prev,
      [name]: files ? files[0] : value,
    }));
  };

  const guardarCambios = async (e) => {
  e.preventDefault();
  const token = localStorage.getItem('jwt');
  let imagenId = null;

  try {
    // Paso 1: subir nueva imagen si existe
    if (editData.imagen) {
      const uploadForm = new FormData();
      uploadForm.append('files', editData.imagen);

      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: uploadForm,
      });

      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData?.[0]?.id)
        throw new Error('Error al subir imagen');

      imagenId = uploadData[0].id;
    }

    // Paso 2: actualizar la usina con los nuevos datos + imagen si hay
    const res = await fetch(`${API_URL}/usinas/${selectedUsina.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        data: {
          nombre: editData.nombre.trim(),
          carrera: editData.carrera.trim(),
          link: editData.link.trim(),
          aprobado: 'pendiente',
          ...(imagenId && { imagen: { connect: [{ id: imagenId }] } }), // 👈 actualiza imagen
        },
      }),
    });

    const updated = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(updated));

    // Actualizar la vista local
    setUsinas((prev) =>
      prev.map((u) =>
        u.id === selectedUsina.id
          ? {
              ...u,
              nombre: editData.nombre.trim(),
              carrera: editData.carrera.trim(),
              link: editData.link.trim(),
              aprobado: 'pendiente',
              imageUrl: imagenId
                ? `${URL}${updated.data?.attributes?.imagen?.data?.attributes?.url ?? ''}`
                : u.imageUrl,
            }
          : u
      )
    );

    setShowEditModal(false);
  } catch (err) {
    console.error('Error al modificar usina:', err);
    alert('Error al modificar la usina.');
  }
};

  // ========= Renderizado =========

  if (loading)
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando tus usinas...</p>
      </div>
    );

  if (rol !== 'Estudiante' && rol !== 'Profesor' && rol !== 'Administrador'&& rol !== 'SuperAdministrador')
    return (
      <div className={styles.loadingContainer}>
        <p>No tienes permiso para acceder aquí.</p>
      </div>
    );

  return (
    <div>
      <Header />
      <div className={styles.usinaCircularContainer}>
        <div className={styles.usinaContent}>
          <h1 className={styles.usinaTitulo}>Mis Usinas</h1>

          <div className={styles.tabs}>
            {['crear', 'pendientes', 'aprobadas', 'rechazadas'].map((t) => (
              <button
                key={t}
                className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
                onClick={() => setTab(t)}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {tab === 'crear' && (
            <form onSubmit={crearUsina} className={styles.form}>
              <input name="nombre" placeholder="Nombre" required />
              <input name="carrera" placeholder="Carrera" required />
              <input name="link" placeholder="Link del proyecto (opcional)" />
              <input type="file" name="imagen" accept="image/*" />
              <button type="submit" className={styles.btnAprobar}>Enviar Usina</button>
            </form>
          )}

          {['pendientes', 'aprobadas', 'rechazadas'].includes(tab) && (
            <div className={styles.usinaGaleria}>
              {usinas.filter((u) => u.aprobado === tab.slice(0, -1)).length === 0 ? (
                <p className={styles.usinaEmpty}>No tienes usinas {tab}.</p>
              ) : (
                usinas
                  .filter((u) => u.aprobado === tab.slice(0, -1))
                  .map((u) => (
                    <div key={u.id} className={styles.usinaCard}>
                      <img src={u.imageUrl} alt={u.nombre} className={styles.usinaImage} />
                      <div className={styles.usinaContenido}>
                        <h3>{u.nombre}</h3>
                        <p>{u.carrera}</p>
                        {u.link && (
                          <a href={u.link} target="_blank" rel="noopener noreferrer" className={styles.usinaLink}>
                            Ver Proyecto
                          </a>
                        )}
                        <div className={styles.usinaBotones}>
                          <button className={styles.btnAprobar} onClick={() => confirmarEliminar(u)}>Eliminar</button>
                          <button className={styles.btnModificar} onClick={() => abrirEditar(u)}>Modificar</button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* === Modal Eliminar === */}
      {showDeleteModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>¿Eliminar esta usina?</h3>
            <p>Esta acción no se puede deshacer.</p>
            <div className={styles.modalButtons}>
              <button onClick={eliminarUsina} className={styles.btnAprobar}>Eliminar</button>
              <button onClick={() => setShowDeleteModal(false)} className={styles.btnModificar}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {/* === Modal Editar === */}
      {showEditModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h3>Modificar Usina</h3>
            <form onSubmit={guardarCambios} className={styles.form}>
              <input name="nombre" value={editData.nombre} onChange={handleEditChange} required />
              <input name="carrera" value={editData.carrera} onChange={handleEditChange} required />
              <input name="link" value={editData.link} onChange={handleEditChange} placeholder="Link del proyecto" />
              <input type="file" name="imagen" accept="image/*" onChange={handleEditChange} />
              <div className={styles.modalButtons}>
                <button type="submit" className={styles.btnModificar}>Guardar Cambios</button>
                <button type="button" onClick={() => setShowEditModal(false)} className={styles.btnAprobar}>
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