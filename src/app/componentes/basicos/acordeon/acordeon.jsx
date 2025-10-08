'use client';

import { useState, useEffect } from 'react';
import { getAcordeonByAcordeonID } from './acordeonByID';
import { API_URL } from '@/app/config';
import styles from "@/styles/components/TextComponents.module.css";

export default function Acordeon({ acordeonID }) {
  const [labels, setLabels] = useState([]); // Almacena los ítems del acordeón
  const [activo, setActivo] = useState(null); // ID del ítem actualmente desplegado

  useEffect(() => {
    if (!acordeonID) {
      console.log("No se ingresó una ID de acordeón");
      return;
    }

    // Función asíncrona que obtiene los datos del acordeón desde la API
    const fetchData = async () => {
      try {
        const result = await getAcordeonByAcordeonID(acordeonID);
        if (result) {
          setLabels(result); // Guarda los datos en el estado
        } else {
          console.log('Error en el fetch de acordeones');
        }
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };

    fetchData(); // Ejecuta la función al cargar el componente
  }, [acordeonID]);

  // Cambia el ítem abierto/cerrado al hacer click
  const toggle = (id) => {
    setActivo(activo === id ? null : id);
  };

  return (
    <div className={styles.texto}>
      <div className={styles.acordeonContainer}>
        {labels.map((item) => {
          const contenido = item.contenido || 'Sin contenido';
          const titulo = item.titulo || 'Sin título';
          const abierto = activo === item.id;
          const fondo = item.color || '#ffffff';

          return (
            <div key={item.id} className={styles.textoItem} style={{ backgroundColor: fondo }}>
              {/* Cabecera clickeable del acordeón */}
              <div className={styles.textoHeader} onClick={() => toggle(item.id)}>
                <span><h2>{titulo}</h2></span>
                <span className={styles.botonTexto} style={{ backgroundColor: fondo }}>
                  {abierto ? '▲' : '▼'} {/* Flecha indicando abierto o cerrado */}
                </span>
              </div>

              {/* Contenido mostrado solo si el ítem está abierto */}
              <div className={`${styles.textoContenido} ${abierto ? styles.textoContenidoAbierto : ''}`}>
                {abierto && <h3>{contenido}</h3>}
              </div>
            </div>
          );
        })}
      </div>
      
    </div>
  );
}