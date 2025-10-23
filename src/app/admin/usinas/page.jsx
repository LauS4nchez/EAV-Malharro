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
  const [modal, setModal] = useState({ open: false, action: '', usina: null });

  // 🔹 Cargar usinas
  useEffect(() => {
    const fetchUsinas = async () => {
      try {
        const res = await fetch(`${API_URL}/usinas?populate=imagen`, { cache: 'no-store' });
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const normalized = items.map((item) => {
          const a = item.attributes ?? item;
          let imageUrl = '/placeholder.jpg';
            const imagenField = a.imagen;
            const imgData = imagenField?.data ?? imagenField;
            const imgAttrs = imgData?.a ?? imgData;
            const urlPath = imgAttrs?.url;

            if (urlPath)
              imageUrl = urlPath.startsWith('http')
                ? urlPath
                : `${URL}${urlPath}`;
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
  }, []);

  // 🔹 Actualizar estado
  const actualizarEstado = async (usina, nuevoEstado) => {
    try {
      const token = localStorage.getItem('jwt');
      if (!token) {
        alert('No hay token. Inicia sesión.');
        return;
      }

      const url = `${API_URL}/usinas/${usina.documentId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          data: { aprobado: nuevoEstado },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error Strapi:', res.status, errorText);
        alert(`Error al actualizar (HTTP ${res.status})`);
        return;
      }

      setUsinas((prev) =>
        prev.map((u) =>
          u.documentId === usina.documentId ? { ...u, aprobado: nuevoEstado } : u
        )
      );
    } catch (error) {
      console.error('Error al actualizar:', error);
    } finally {
      setModal({ open: false, action: '', usina: null });
    }
  };

  // 🔹 Eliminar usina
  const eliminarUsina = async (usina) => {
    try {
      const token = localStorage.getItem('jwt');
      const url = `${API_URL}/usinas/${usina.documentId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error Strapi:', res.status, errorText);
        alert(`Error al eliminar (HTTP ${res.status})`);
        return;
      }
      setUsinas((prev) => prev.filter((u) => u.documentId !== usina.documentId));
    } catch (error) {
      console.error('Error al eliminar:', error);
    } finally {
      setModal({ open: false, action: '', usina: null });
    }
  };

  // 🔹 Confirmar acción desde el modal
  const confirmarAccion = () => {
    const { action, usina } = modal;
    if (action === 'aprobar') actualizarEstado(usina, 'aprobada');
    else if (action === 'rechazar') actualizarEstado(usina, 'rechazada');
    else if (action === 'eliminar') eliminarUsina(usina);
  };

  // 🔹 Filtrar según tab
  const usinasFiltradas = usinas.filter((u) =>
    tab === 'pendientes'
      ? u.aprobado === 'pendiente'
      : tab === 'aprobadas'
      ? u.aprobado === 'aprobada'
      : u.aprobado === 'rechazada'
  );

    if (loading) {
      return (
        <div className={styles.loadingContainer}>
          <div className={styles.spinner}></div>
          <p>Cargando Usinas...</p>
        </div>
      );
    }

  return (
    <div>
      <Header />
      <div className={styles.container}>
        <h1 className={styles.title}>Panel de Administración</h1>

        {/* 🔹 Tabs */}
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

        {/* 🔹 Grid de usinas */}
        <div className={styles.grid}>
          {usinasFiltradas.length > 0 ? (
            usinasFiltradas.map((u) => (
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

                {/* 🔹 Botones según tab */}
                <div className={styles.actions}>
                  {tab === 'pendientes' && (
                    <>
                      <button
                        className={styles.btnAprobar}
                        onClick={() => setModal({ open: true, action: 'aprobar', usina: u })}
                      >
                        Aprobar
                      </button>
                      <button
                        className={styles.btnRechazar}
                        onClick={() => setModal({ open: true, action: 'rechazar', usina: u })}
                      >
                        Rechazar
                      </button>
                    </>
                  )}

                  {tab === 'aprobadas' && (
                    <button
                      className={styles.btnRechazar}
                      onClick={() => setModal({ open: true, action: 'rechazar', usina: u })}
                    >
                      Rechazar
                    </button>
                  )}

                  {tab === 'rechazadas' && (
                    <>
                      <button
                        className={styles.btnAprobar}
                        onClick={() => setModal({ open: true, action: 'aprobar', usina: u })}
                      >
                        Aprobar
                      </button>
                      <button
                        className={styles.btnEliminar}
                        onClick={() => setModal({ open: true, action: 'eliminar', usina: u })}
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

        {/* 🔹 Modal para imagen */}
        {selectedImage && (
          <div className={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button className={styles.modalClose} onClick={() => setSelectedImage(null)}>✕</button>
              <img src={selectedImage} alt="Usina" className={styles.modalImage} />
            </div>
          </div>
        )}

        {/* 🔹 Modal de confirmación */}
        {modal.open && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalBox}>
              <h2 className={styles.modalTitle}>Confirmar acción</h2>
              <p className={styles.modalText}>
                ¿Seguro que deseas {modal.action === 'eliminar'
                  ? 'eliminar esta usina'
                  : `${modal.action} esta usina`
                }?
              </p>
              <div className={styles.modalButtons}>
                <button
                  className={styles.btnConfirmar}
                  onClick={confirmarAccion}
                >
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
      </div>
      <Footer />
    </div>
  );
}
