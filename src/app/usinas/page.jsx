'use client';

import { useEffect, useState } from 'react';
import { API_URL, URL } from '@/app/config';
import styles from '@/styles/components/Usina/UsinaPage.module.css';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import Link from 'next/link';
import { checkUserRole } from '@/app/componentes/validacion/checkRole';

export default function UsinasPage() {
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRole, setUserRole] = useState(null); // 🔹 rol del usuario

  useEffect(() => {
    // 🔹 Obtener rol del usuario (puede venir de localStorage o token)
    const role = checkUserRole();
    setUserRole(role);

    const fetchUsinas = async () => {
      try {
        const res = await fetch(`${API_URL}/usinas?populate=media`, {
          cache: 'no-store',
        });

        if (!res.ok) {
          console.error('Error en fetch usinas:', res.status, res.statusText);
          setUsinas([]);
          return;
        }

        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        // 🔹 Solo mostrar usinas aprobadas
        const normalized = items
          .map((item) => {
            const attributes = item.attributes ?? item;
            if (!attributes || attributes.aprobado !== 'aprobada') return null;

            let imageUrl = '/placeholder.jpg';
            const imagenField = attributes.imagen;
            const imgData = imagenField?.data ?? imagenField;
            const imgAttrs = imgData?.attributes ?? imgData;
            const urlPath = imgAttrs?.url;

            if (urlPath)
              imageUrl = urlPath.startsWith('http')
                ? urlPath
                : `${URL}${urlPath}`;

            return {
              id:
                item.documentId ??
                attributes.documentId ??
                item.id ??
                Math.random(),
              nombre: attributes.nombre ?? attributes.titulo ?? 'Sin nombre',
              carrera: attributes.carrera ?? '',
              link: attributes.link ?? '',
              imageUrl,
            };
          })
          .filter(Boolean);

        setUsinas(normalized);
      } catch (err) {
        console.error('Error al obtener usinas:', err);
        setUsinas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsinas();
  }, []);

  // 🔹 Filtrado por nombre o carrera
  const filteredUsinas = usinas.filter((u) => {
    const search = searchTerm.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(search) ||
      u.carrera.toLowerCase().includes(search)
    );
  });

  // 🔹 Loading
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando usinas...</p>
      </div>
    );
  }

  if (usinas.length === 0) return <p>No hay usinas disponibles.</p>;

  return (
    <div>
      <Header />

      <div className={styles.usinaCircularContainer}>
        <div className={styles.usinaContent}>
          <div className={styles.usinaTitulo}>
            <h2>Todas las Usinas</h2>
          </div>

          <div className={styles.usinaParrafo}>
            <p>
              Explorá todos los proyectos creados por nuestros estudiantes y
              egresados.
            </p>
          </div>

          {/* 🔹 Buscador */}
          <div className={styles.usinaBuscadorContainer}>
            <input
              type="text"
              placeholder="Buscar por nombre o carrera"
              className={styles.usinaBuscador}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* 🔹 Botón visible solo para Estudiante o Profesor */}
          {(userRole === 'Estudiante' || userRole === 'Profesor') && (
            <div className={styles.usinaBotonContainer}>
              <Link href="/mis-usinas" className={styles.usinaVerMas}>
                Mis Usinas
              </Link>
            </div>
          )}

          {/* 🔹 Galería filtrada */}
          <div className={styles.usinaGaleria}>
            {filteredUsinas.length > 0 ? (
              filteredUsinas.map((u) => (
                <div key={u.id} className={styles.usinaCard}>
                  <div
                    className={styles.usinaImageContainer}
                    onClick={() => setSelectedImage(u.imageUrl)}
                  >
                    <img
                      src={u.imageUrl}
                      alt={u.nombre}
                      className={styles.usinaImage}
                    />
                  </div>

                  <div className={styles.usinaContenido}>
                    <h3>{u.nombre}</h3>
                    <p>{u.carrera}</p>
                    {u.link && (
                      <a
                        href={u.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.usinaLink}
                      >
                        Contactar
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.noUsinas}>
                No se encontraron usinas que coincidan con tu búsqueda.
              </p>
            )}
          </div>

          {/* 🔹 Modal de imagen */}
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
                  alt="Usina"
                  className={styles.modalImage}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
