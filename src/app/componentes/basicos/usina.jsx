'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_URL, URL, API_TOKEN } from '@/app/config';
import styles from '@/styles/components/Usina.module.css';

export default function Usina() {
  const [usinas, setUsinas] = useState([]);
  const [displayUsinas, setDisplayUsinas] = useState([]); // las que se muestran
  const [loading, setLoading] = useState(true);
  const [selectedUsina, setSelectedUsina] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const getImageUrl = (imagenField) => {
    if (!imagenField) return '/placeholder.jpg';
    const data = imagenField.data ?? imagenField;
    const attrs = data?.attributes ?? data;
    // URL original
    if (attrs?.url) return attrs.url.startsWith('http') ? attrs.url : `${URL}${attrs.url}`;
    return '/placeholder.jpg';
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
            const attrs = item.attributes ?? item;
            if (!attrs) return null;

            const imageUrl = getImageUrl(attrs.imagen);
            const creadorData = attrs.creador?.data ?? attrs.creador;
            const creadorAttrs = creadorData?.attributes ?? creadorData ?? null;

            return {
              id: item.id ?? Math.random(),
              titulo: attrs.titulo ?? attrs.nombre ?? 'Sin título',
              creado: attrs.createdAt ?? attrs.publishedAt ?? null,
              imageUrl,
              creador: creadorAttrs
                ? {
                    name: creadorAttrs.name ?? '',
                    surname: creadorAttrs.surname ?? '',
                    username: creadorAttrs.username ?? '',
                    carrera: creadorAttrs.Carrera ?? 'Sin carrera',
                  }
                : null,
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
                <img src={u.imageUrl} alt={u.titulo} className={styles.usinaImage} />
              </div>
            ))}
          </div>

          <Link className={styles.usinaVerMas} href="/usinas">
            Ver más
          </Link>
        </div>
      </div>

      {selectedUsina && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={closeModal}>✕</button>

            <div className={styles.modalImageContainer}>
              <img src={selectedUsina.imageUrl} alt={selectedUsina.titulo} className={styles.modalImage} />
            </div>

            <div className={styles.modalInfo}>
              <h2>{selectedUsina.titulo}</h2>

              {selectedUsina.creador && (
                <p>
                  <strong>Creador:</strong> {selectedUsina.creador.name} {selectedUsina.creador.surname}{' '}
                  <span className={styles.username}>@{selectedUsina.creador.username}</span>
                </p>
              )}

              <p><strong>Carrera:</strong> {selectedUsina.creador?.carrera}</p>

              {selectedUsina.creado && (
                <p><strong>Publicado:</strong> {new Date(selectedUsina.creado).toLocaleDateString('es-AR')}</p>
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
