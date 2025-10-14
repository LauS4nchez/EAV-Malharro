'use client';

import { useState, useEffect } from 'react';
import { getAcordeonByAcordeonID } from './acordeonByID';
import styles from "@/styles/components/TextComponents.module.css";

export default function Acordeon({ acordeonID }) {
  const [labels, setLabels] = useState([]);
  const [activo, setActivo] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar si es móvil
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Verificar al cargar
    checkMobile();

    // Escuchar cambios de tamaño
    window.addEventListener('resize', checkMobile);

    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  useEffect(() => {
    if (!acordeonID) {
      console.log("No se ingresó una ID de acordeón");
      return;
    }

    const fetchData = async () => {
      try {
        const result = await getAcordeonByAcordeonID(acordeonID);
        if (result) {
          setLabels(result);
        } else {
          console.log('Error en el fetch de acordeones');
        }
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };

    fetchData();
  }, [acordeonID]);

  const toggle = (id) => {
    setActivo(activo === id ? null : id);
  };

  // Función para truncar el título si es necesario
  const truncarTitulo = (titulo, limite = 12) => {
    if (!isMobile || !titulo) return titulo;
    
    if (titulo.length > limite) {
      return titulo.substring(0, limite) + '...';
    }
    return titulo;
  };

  const FlechaIcono = ({ abierto }) => (
    <svg 
      width="20" 
      height="20" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={`${styles.flechaIcono} ${abierto ? styles.flechaAbierta : ''}`}
    >
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  );

  return (
    <div className={styles.texto}>
      <div className={styles.acordeonContainer}>
        {labels.map((item) => {
          const contenido = item.contenido || 'Sin contenido';
          const titulo = item.titulo || 'Sin título';
          const tituloTruncado = truncarTitulo(titulo);
          const abierto = activo === item.id;
          const fondo = item.color || '#ffffff';

          return (
            <div key={item.id} className={styles.textoItem} style={{ backgroundColor: fondo }}>
              <div className={styles.textoHeader} onClick={() => toggle(item.id)}>
                <span className={styles.tituloContainer}>
                  <h2 
                    className={styles.tituloAcordeon}
                    title={isMobile && titulo.length > 15 ? titulo : ''}
                  >
                    {tituloTruncado}
                  </h2>
                </span>
                <span className={styles.botonTexto} style={{ backgroundColor: fondo }}>
                  <FlechaIcono abierto={abierto} />
                </span>
              </div>

              <div 
                className={`${styles.textoContenido} ${abierto ? styles.textoContenidoAbierto : styles.textoContenidoCerrado}`}
              >
                <div className={styles.contenidoInterno}>
                  <h3>{contenido}</h3>
                  {acordeonID === 'carreras' && (
                    <button className={styles.saberMasBtn}>
                      Saber más
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}