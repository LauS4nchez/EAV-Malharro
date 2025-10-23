'use client';

import { useEffect, useState } from 'react';
import { API_URL, URL } from '@/app/config';
import styles from '@/styles/components/UsinaAdmin.module.css';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';

export default function AdminUsinasPage() {
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pendientes');
  const [selectedImage, setSelectedImage] = useState(null);
  const [autorizado, setAutorizado] = useState(null); // 🔹 Control de rol

  // 🔹 Verificar rol antes de todo
  useEffect(() => {
    const verificarRol = async () => {
      const token = localStorage.getItem('jwt');
      if (!token) {
        setAutorizado(false);
        return;
      }

      try {
        const res = await fetch(`${API_URL}/users/me?populate=role`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const user = await res.json();
        const rol = user.role?.name;

        if (rol === 'Administrador' || rol === 'Profesor') {
          setAutorizado(true);
        } else {
          setAutorizado(false);
        }
      } catch (error) {
        console.error('Error al verificar rol:', error);
        setAutorizado(false);
      }
    };

    verificarRol();
  }, []);

  // 🔹 Cargar usinas (solo si está autorizado)
  useEffect(() => {
    if (autorizado !== true) return;

    const fetchUsinas = async () => {
      try {
        const res = await fetch(`${API_URL}/usinas?populate=imagen`, { cache: 'no-store' });
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const normalized = items.map((item) => {
          const a = item.attributes ?? item;
          let imageUrl = '/placeholder.jpg';
          const img = a.imagen?.data?.attributes?.url;
          if (img) imageUrl = img;
          return {
            id: item.id,
            documentId: item.documentId,
            nombre: a.nombre ?? 'Sin nombre',
            carrera: a.carrera ?? 'Sin carrera',
            descripcion: a.descripcion ?? '',
            aprobado: a.aprobado ?? 'pendiente',
            link: a.link ?? '',
            imageUrl,
          };
        });

        setUsinas(normalized);
      } catch (err) {
        console.error('Error al obtener usinas:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUsinas();
  }, [autorizado]);

  // 🔹 Estado de carga o restricción
  if (autorizado === null) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Verificando acceso...</p>
      </div>
    );
  }

  if (autorizado === false) {
    return (
      <div className={styles.loadingContainer}>
        <p>No tienes permiso para acceder a esta página.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando usinas...</p>
      </div>
    );
  }

  // 🔹 Resto del componente (sin cambios)
  return (
    <div>
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>Panel de Administración</h1>
        {/* Tabs */}
        <div className={styles.tabs}>
          {['pendientes', 'aprobadas', 'rechazadas'].map((tipo) => (
            <button
              key={tipo}
              className={`${styles.tab} ${tab === tipo ? styles.activeTab : ''}`}
              onClick={() => setTab(tipo)}
            >
              {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
            </button>
          ))}
        </div>

        <div className={styles.grid}>
          {usinas.length > 0 ? (
            usinas
              .filter((u) =>
                tab === 'pendientes'
                  ? u.aprobado === 'pendiente'
                  : tab === 'aprobadas'
                  ? u.aprobado === 'aprobada'
                  : u.aprobado === 'rechazada'
              )
              .map((u) => (
                <div key={u.documentId} className={styles.card}>
                  <div
                    className={styles.imageContainer}
                    onClick={() => u.imageUrl && setSelectedImage(u.imageUrl)}
                  >
                    {u.imageUrl && u.imageUrl !== '/placeholder.jpg' ? (
                      <img src={u.imageUrl} alt={u.nombre} className={styles.image} />
                    ) : (
                      <div className={styles.noImage}>Sin imagen</div>
                    )}
                  </div>

                  <div className={styles.info}>
                    <h2 className={styles.nombre}>{u.nombre}</h2>
                    <p className={styles.carrera}>{u.carrera}</p>
                    {u.descripcion && <p className={styles.descripcion}>{u.descripcion}</p>}
                    {u.link && (
                      <a
                        href={u.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.usinaLink}
                      >
                        Ver proyecto
                      </a>
                    )}
                    <p className={styles.estado}>Estado: {u.aprobado}</p>
                  </div>

                  <div className={styles.actions}>
                    {tab === 'pendientes' && (
                      <>
                        <button
                          className={styles.btnAprobar}
                          onClick={() => actualizarEstado(u, 'aprobada')}
                        >
                          Aprobar
                        </button>
                        <button
                          className={styles.btnRechazar}
                          onClick={() => actualizarEstado(u, 'rechazada')}
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {tab === 'aprobadas' && (
                      <button
                        className={styles.btnRechazar}
                        onClick={() => actualizarEstado(u, 'rechazada')}
                      >
                        Rechazar
                      </button>
                    )}

                    {tab === 'rechazadas' && (
                      <>
                        <button
                          className={styles.btnAprobar}
                          onClick={() => actualizarEstado(u, 'aprobada')}
                        >
                          Aprobar
                        </button>
                        <button
                          className={styles.btnEliminar}
                          onClick={() => eliminarUsina(u)}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
          ) : (
            <p className={styles.noUsinas}>No hay usinas en esta categoría.</p>
          )}
        </div>

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
              <img src={selectedImage} alt="Usina" className={styles.modalImage} />
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
