'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API_URL, URL } from '@/app/config';
import styles from '@/styles/components/Usina.module.css';

export default function Usina() {
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsinas = async () => {
      try {
        const res = await fetch(
          `${API_URL}/usinas?populate=imagen&filters[aprobado][$eq]=aprobada&sort=createdAt:desc&pagination[limit]=8`,
          { cache: 'no-store' }
        );

        if (!res.ok) {
          console.error('Error en fetch usinas:', res.status, res.statusText);
          setUsinas([]);
          return;
        }

        const json = await res.json();
        const items = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
          ? json
          : [];

        const normalized = items
          .map((item) => {
            const attributes = item.attributes ?? item;
            if (!attributes) return null;

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
              id: item.id ?? attributes.id ?? Math.random(),
              nombre: attributes.nombre ?? attributes.titulo ?? 'Sin nombre',
              carrera: attributes.carrera ?? '',
              link: attributes.link ?? '',
              imageUrl,
              raw: item,
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

  if (loading) return <p>Cargando usinas...</p>;
  if (usinas.length === 0) return <p>No hay usinas aprobadas disponibles.</p>;

  return (
    <div className={styles.usinaCircularContainer}>
      <div className={styles.usinaContent}>
        <div className={styles.usinaTitulo}>
          <h2>Usina</h2>
        </div>

        <div className={styles.usinaParrafo}>
          <p>
            Conocé los emprendimientos y proyectos de nuestros estudiantes y
            egresados.
          </p>
        </div>

        <div className={styles.usinaGaleria}>
          {usinas.map((u) => (
            <div key={u.id} className={styles.usinaCard}>
              <div className={styles.usinaImageContainer}>
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
          ))}
        </div>
        <Link className={styles.usinaVerMas} href="/usinas">
          Ver más
        </Link>
      </div>
    </div>
  );
}
