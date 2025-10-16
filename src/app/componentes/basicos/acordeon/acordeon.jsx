'use client';

import { useState, useEffect } from 'react';
import { getAcordeonByAcordeonID } from './acordeonByID';
import { checkUserRole } from '../../validacion/checkRole';
import { handleSave } from '../../validacion/handleSave';
import { API_URL } from '@/app/config';
import styles from "@/styles/components/TextComponents.module.css";

export default function Acordeon({ acordeonID }) {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  const [labels, setLabels] = useState([]);
  const [activo, setActivo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
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
    const verifyAdmin = async () => {
      const role = checkUserRole();
      if (role === "Administrador") setIsAdmin(true);
    };

    verifyAdmin();

    const fetchData = async () => {
      if (!acordeonID) return;

      try {
        const result = await getAcordeonByAcordeonID(acordeonID);
        if (result) setLabels(result);
      } catch (error) {
        console.error('Fetch error:', error);
      }
    };

    fetchData();
  }, [acordeonID]);

  const toggle = (id) => setActivo(activo === id ? null : id);

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

  const saveChanges = async (id) => {
    try {
      await handleSave({
        objetoAEditar: "texto",
        idObjeto: id,
        nuevoContenido: editedText,
        jwt,
        campoAModificar: "contenido",
      });

      await handleSave({
        objetoAEditar: "texto",
        idObjeto: id,
        nuevoContenido: editedTitle,
        jwt,
        campoAModificar: "titulo",
      });

      const updated = await getAcordeonByAcordeonID(acordeonID);
      if (updated) setLabels(updated);

      setEditingItem(null);
      setEditedText('');
      setEditedTitle('');
    } catch (error) {
      console.error("Error al guardar los cambios:", error);
      alert("Hubo un error al guardar los cambios del acordeón");
    }
  };

  return (
    <div className={styles.texto}>
      <div className={styles.acordeonContainer}>
        {labels.map((item) => {
          const abierto = activo === item.id;
          const fondo = item.color || '#ffffff';
          const isEditingThis = editingItem === item.id;
          const titulo = item.titulo || 'Sin título';
          const tituloTruncado = truncarTitulo(titulo);

          return (
            <div key={item.id} className={styles.textoItem} style={{ backgroundColor: fondo }}>
              <div className={styles.textoHeader} onClick={() => toggle(item.id)}>
                <span className={styles.tituloContainer}>
                  <h2 
                    className={styles.tituloAcordeon}
                    title={isMobile && titulo.length > 15 ? titulo : ''}
                  >
                    {isEditingThis ? titulo : tituloTruncado}
                  </h2>
                </span>
                <span className={styles.botonTexto} style={{ backgroundColor: fondo }}>
                  <FlechaIcono abierto={abierto} />
                </span>
              </div>

              <div className={`${styles.textoContenido} ${abierto ? styles.textoContenidoAbierto : styles.textoContenidoCerrado}`}>
                <div className={styles.contenidoInterno}>
                  {isEditingThis ? (
                    <div className={styles.editingContainer}>
                      <input
                        className={styles.textareaEditar}
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        placeholder="Editar título"
                        style={{ color: '#000' }}
                      />
                      <textarea
                        className={styles.textareaEditar}
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        placeholder="Editar contenido"
                        style={{ color: '#000' }}
                      />
                      <div className={styles.buttonGroup}>
                        <button onClick={() => saveChanges(item.documentId)} className={styles.btnAccion}>
                          Guardar
                        </button>
                        <button onClick={() => setEditingItem(null)} className={styles.btnAccion}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <h3>{item.contenido || 'Sin contenido'}</h3>

                      {/* Botones en la misma fila */}
                      <div className={styles.botonesFila}>
                        {acordeonID === 'carreras' && (
                          <button className={styles.saberMasBtn}>Saber más</button>
                        )}
                        {isAdmin && (
                          <button
                            className={styles.btnAccion}
                            onClick={() => {
                              setEditingItem(item.id);
                              setEditedText(item.contenido);
                              setEditedTitle(item.titulo);
                            }}
                          >
                            Editar
                          </button>
                        )}
                      </div>
                    </>
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