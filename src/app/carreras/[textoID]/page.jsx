'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import styles from '@/styles/components/Carrera.module.css';
import { API_URL } from '@/app/config';

export default function CarreraDetalle() {
  const { textoID } = useParams();
  const [carrera, setCarrera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (textoID) {
      fetchCarrera(textoID);
    }
  }, [textoID]);

  const fetchCarrera = async (textoID) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${API_URL}/carreras?populate=*`
      );

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      console.log('Datos recibidos:', data);
      const carreraEncontrada = Array.isArray(data.data)
        ? data.data.find(item => item.infoCarrera?.textoID === textoID)
        : null;

      console.log('Carrera encontrada:', carreraEncontrada);
      setCarrera(carreraEncontrada || null);
    } catch (err) {
      console.error('Error fetching carrera:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatContenido = (text) => {
    if (!text) return '';
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  };

  // Estado: cargando
  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Cargando información de la carrera...</div>
      </div>
    );
  }

  // Estado: error
  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          Error al cargar la carrera: {error}
        </div>
      </div>
    );
  }

  // Estado: carrera no encontrada
  if (!carrera || !carrera.infoCarrera) {
    return (
      <div className={styles.container}>
        <div className={styles.notFound}>
          No se encontró la carrera solicitada
        </div>
      </div>
    );
  }

  const { infoCarrera, PrimerParrafo, SegundoParrafo, ImagenDecoracion, PlanEstudios } = carrera;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.titulo}>{infoCarrera?.titulo || 'Carrera'}</h1>
        {infoCarrera?.color && (
          <div 
            className={styles.colorLine} 
            style={{ backgroundColor: infoCarrera.color }}
          />
        )}
      </header>

      <main className={styles.main}>
        {/* Contenido principal */}
        {infoCarrera?.contenido && (
          <section className={styles.seccion}>
            <div 
              className={styles.contenido}
              dangerouslySetInnerHTML={{ 
                __html: formatContenido(infoCarrera.contenido)
              }} 
            />
          </section>
        )}

        {/* Línea divisoria */}
        {infoCarrera?.color && (
          <div 
            className={styles.divisor} 
            style={{ backgroundColor: infoCarrera.color }}
          />
        )}

        {/* Primer párrafo */}
        {PrimerParrafo && (
          <section className={styles.seccion}>
            <p className={styles.parrafo}>{PrimerParrafo}</p>
          </section>
        )}

        {/* Línea divisoria */}
        {infoCarrera?.color && (
          <div 
            className={styles.divisor} 
            style={{ backgroundColor: infoCarrera.color }}
          />
        )}

        {/* Segundo párrafo */}
        {SegundoParrafo && (
          <section className={styles.seccion}>
            <p className={styles.parrafo}>{SegundoParrafo}</p>
          </section>
        )}

        {/* Imagen decorativa */}
        {ImagenDecoracion?.data?.attributes?.url && (
          <section className={styles.imagenSection}>
            <img 
              src={ImagenDecoracion.data.attributes.url} 
              alt={
                ImagenDecoracion.data.attributes.alternativeText ||
                `Imagen de ${infoCarrera?.titulo}`
              }
              className={styles.imagen}
            />
          </section>
        )}

        {/* Plan de estudios */}
        {PlanEstudios?.data?.attributes?.url && (
          <section className={styles.planSection}>
            <a 
              href={PlanEstudios.data.attributes.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className={styles.planLink}
            >
              📥 Descargar Plan de Estudios
            </a>
          </section>
        )}
      </main>
    </div>
  );
}
