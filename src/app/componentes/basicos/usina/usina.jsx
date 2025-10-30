'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_URL, API_TOKEN } from '@/app/config';
import styles from '@/styles/components/Usina/Usina.module.css';

export default function Usina() {
  const [usinas, setUsinas] = useState([]);
  const [displayUsinas, setDisplayUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsina, setSelectedUsina] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const getPreviewUrl = (media) => {
    if (!media) return '/img/placeholder.jpg';
    
    // Para imágenes - usar la URL original
    if (media.mime?.startsWith('image/')) {
      return media.url;
    }
    
    // Para videos - usar el preview GIF si existe
    if (media.mime?.startsWith('video/') && media.previewUrl) {
      return media.previewUrl;
    }
    
    // Fallback
    return media.url || '/img/placeholder.jpg';
  };

  const getMediaUrl = (media) => {
    if (!media) return '/img/placeholder.jpg';
    
    // Para ambos casos (imágenes y videos) usar la URL original
    return media.url || '/img/placeholder.jpg';
  };

  // Detecta tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const fetchUsinas = async () => {
      try {
        const res = await fetch(
          `${API_URL}/usinas?populate=*&filters[aprobado][$eq]=aprobada&sort=createdAt:desc`,
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
            },
            cache: 'no-store',
          }
        );

        if (!res.ok) {
          console.error('Error en fetch usinas:', res.status, res.statusText);
          setUsinas([]);
          return;
        }

        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const normalized = items
          .map((item) => {
            if (!item) return null;

            const previewUrl = getPreviewUrl(item.media);
            const mediaUrl = getMediaUrl(item.media);
            
            // En Strapi v5, las relaciones vienen directamente en el objeto
            const creador = item.creador;

            return {
              id: item.id,
              titulo: item.titulo || 'Sin título',
              creado: item.createdAt || item.publishedAt || null,
              previewUrl,
              mediaUrl,
              creador: creador ? {
                name: creador.name || '',
                surname: creador.surname || '',
                username: creador.username || '',
                carrera: creador.carrera || 'Sin carrera',
              } : null,
              mediaType: item.media?.mime?.startsWith('video/') ? 'video' : 'image',
              mimeType: item.media?.mime
            };
          })
          .filter(Boolean);

        // Randomizar orden
        const shuffled = normalized.sort(() => Math.random() - 0.5);

        setUsinas(shuffled);
      } catch (err) {
        console.error('Error al obtener usinas:', err);
        setUsinas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsinas();
  }, []);

  // Actualiza cuántas usinas mostrar según pantalla y lista randomizada
  useEffect(() => {
    if (usinas.length === 0) return;
    const limit = isMobile ? 4 : 8;
    setDisplayUsinas(usinas.slice(0, limit));
  }, [usinas, isMobile]);

  const handleCardClick = (usina) => {
    setSelectedUsina(usina);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedUsina(null);
    document.body.style.overflow = 'auto';
  };

  if (loading) return <p>Cargando usinas...</p>;
  if (usinas.length === 0) return <p>No hay usinas aprobadas disponibles.</p>;

  return (
    <>
      <div className={styles.usinaCircularContainer}>
        <div className={styles.usinaContent}>
          <div className={styles.usinaTitulo}>
            <h2 id="estudiantes">Nuestros Estudiantes</h2>
          </div>

          <div className={styles.usinaParrafo}>
            <p>Conocé los emprendimientos y proyectos de nuestros estudiantes y egresados.</p>
          </div>

          <div className={styles.usinaGaleria}>
            {displayUsinas.map((u) => (
              <div
                key={u.id}
                className={styles.usinaCard}
                onClick={() => handleCardClick(u)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => (e.key === 'Enter' ? handleCardClick(u) : null)}
              >
                {/* Siempre usar img para la preview - si es video, previewUrl será el GIF */}
                <img 
                  src={u.previewUrl} 
                  alt={u.titulo} 
                  className={styles.usinaImage}
                />
              </div>
            ))}
          </div>

          <Link className={styles.usinaVerMas} href="/galeria">
            Ver más
          </Link>
        </div>
      </div>

      {selectedUsina && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={closeModal}>✕</button>

            <div className={styles.modalImageContainer}>
              {selectedUsina.mediaType === 'video' ? (
                <video 
                  src={selectedUsina.mediaUrl} 
                  className={styles.modalImage}
                  controls
                  autoPlay
                  muted
                  playsInline
                >
                  Tu navegador no soporta el elemento de video.
                </video>
              ) : (
                <img src={selectedUsina.mediaUrl} alt={selectedUsina.titulo} className={styles.modalImage} />
              )}
            </div>

            <div className={styles.modalInfo}>
              <h2>{selectedUsina.titulo}</h2>

              {selectedUsina.creador && (
                <p>
                  <b>Creador:</b> {selectedUsina.creador.name} {selectedUsina.creador.surname}{' '}
                  <span className={styles.username}>@{selectedUsina.creador.username}</span>
                </p>
              )}

              <p><b>Carrera:</b> {selectedUsina.creador?.carrera || 'No especificada'}</p>

              {selectedUsina.creado && (
                <p><b>Publicado:</b> {new Date(selectedUsina.creado).toLocaleDateString('es-AR')}</p>
              )}

              {selectedUsina.creador?.username && (
                <Link href={`/perfil/${selectedUsina.creador.username}#trabajos`} className={styles.modalLink}>
                  Ver más →
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}