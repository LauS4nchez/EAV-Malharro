// components/Acordeon.jsx
'use client';

import { useState, useEffect } from 'react';
import { getAcordeonByAcordeonID } from './acordeonByID';
import { checkUserRole } from '../../validacion/checkRole';
import { handleSave } from '../../validacion/handleSave';
import dynamic from 'next/dynamic';
import textStyles from "@/styles/components/Texto/TextComponents.module.css";
import acordeonCarrerasStyles from "@/styles/components/Acordeon/AcordeonCarreras.module.css";
import acordeonPreguntasStyles from "@/styles/components/Acordeon/AcordeonPreguntas.module.css";

// Importación dinámica de ReactMarkdown
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false
});

// Mapeo de variantes a estilos
const variantStyles = {
  carreras: acordeonCarrerasStyles,
  preguntas: acordeonPreguntasStyles,
};

export default function Acordeon({ acordeonID, variant = "carreras" }) {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  const [labels, setLabels] = useState([]);
  const [activo, setActivo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedTextColor, setEditedTextColor] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Obtener los estilos según la variante
  const acordeonStyles = variantStyles[variant] || acordeonCarrerasStyles;

  useEffect(() => {
    const verifyAdmin = async () => {
      const role = checkUserRole();
      if (role === "Administrador" || role === 'SuperAdministrador') setIsAdmin(true);
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

  // Flecha para carreras (chevron)
  const FlechaCarreras = ({ abierto }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={`${acordeonStyles.flechaIcono} ${abierto ? acordeonStyles.flechaAbierta : ''}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
    </svg>
  );

  // Flecha para preguntas (plus/close)
  const FlechaPreguntas = ({ abierto }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={1.5} 
      stroke="currentColor" 
      className={`${acordeonStyles.flechaIcono} ${abierto ? acordeonStyles.flechaAbierta : ''}`}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );

  // Seleccionar el ícono según la variante
  const FlechaIcono = variant === 'preguntas' ? FlechaPreguntas : FlechaCarreras;

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

      // Solo guardar textoNegro si la variante es carreras
      if (variant === "carreras") {
        await handleSave({
          objetoAEditar: "texto",
          idObjeto: id,
          nuevoContenido: Boolean(editedTextColor),
          jwt,
          campoAModificar: "textoNegro",
        });
      }

      const updated = await getAcordeonByAcordeonID(acordeonID);
      if (updated) setLabels(updated);

      setEditingItem(null);
      setEditedText('');
      setEditedTitle('');
      setEditedTextColor(false);
    } catch (error) {
      console.error("Error al guardar los cambios:", error);
      alert("Hubo un error al guardar los cambios del acordeón");
    }
  };

  return (
    <div className={textStyles.texto}>
      <div className={acordeonStyles.acordeonContainer}>
        {labels.map((item) => {
          const abierto = activo === item.id;
          const fondo = item.color || '#ffffff';
          // Si la variante es preguntas, texto siempre negro, sino usar textoNegro de Strapi
          const textoColor = variant === 'preguntas' ? '#000000' : (item.textoNegro ? '#000000' : '#FFFFFF');
          const isEditingThis = editingItem === item.id;
          const titulo = item.titulo || 'Sin título';

          return (
            <div 
              key={item.id} 
              className={acordeonStyles.textoItem} 
              style={{ backgroundColor: fondo, color: textoColor }}
            >
              <div 
                className={acordeonStyles.textoHeader} 
                onClick={() => toggle(item.id)}
              >
                <span className={acordeonStyles.tituloContainer}>
                  <h2
                    style={{color: textoColor}}
                    className={acordeonStyles.tituloAcordeon}
                    title={isMobile && titulo.length > 15 && variant === 'carreras' ? titulo : ''}
                  >
                    {isEditingThis ? titulo : titulo}
                  </h2>
                </span>
                <span className={acordeonStyles.botonTexto}>
                  <FlechaIcono abierto={abierto} />
                </span>
              </div>

              <div 
                className={`${acordeonStyles.textoContenido} ${abierto ? acordeonStyles.textoContenidoAbierto : acordeonStyles.textoContenidoCerrado}`}
              >
                <div className={acordeonStyles.contenidoInterno}>
                  {isEditingThis ? (
                    <div className={textStyles.editingContainer}>
                      <input
                        className={textStyles.textareaEditar}
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        placeholder="Editar título"
                      />
                      <textarea
                        className={textStyles.textareaEditar}
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        placeholder="Editar contenido"
                      />
                      {/* Solo mostrar el switch si la variante es carreras */}
                      {variant === 'carreras' && (
                        <div className={textStyles.switchContainer}>
                          <label className={textStyles.switchLabel}>
                            <span>Texto negro</span>
                            <input
                              type="checkbox"
                              checked={editedTextColor}
                              onChange={(e) => setEditedTextColor(e.target.checked)}
                              className={textStyles.switchInput}
                            />
                            <span className={textStyles.switchSlider}></span>
                          </label>
                        </div>
                      )}
                      <div className={textStyles.buttonGroup}>
                        <button onClick={() => saveChanges(item.documentId)} className={textStyles.btnAccion}>
                          Guardar
                        </button>
                        <button onClick={() => setEditingItem(null)} className={textStyles.btnAccion}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={acordeonStyles.contenidoTexto}>
                        <ReactMarkdown
                          components={{
                            // Aplicar el color a todos los elementos del markdown
                            p: ({node, ...props}) => <p style={{color: textoColor}} {...props} />,
                            strong: ({node, ...props}) => <strong style={{color: textoColor}} {...props} />,
                            em: ({node, ...props}) => <em style={{color: textoColor}} {...props} />
                          }}
                        >
                          {item.contenido || 'Sin contenido'}
                        </ReactMarkdown>
                      </div>

                      <div className={textStyles.botonesFila}>
                        {variant === 'carreras' && (
                          <button 
                            className={acordeonStyles.saberMasBtn}
                            style={{ 
                              color: textoColor,
                              borderColor: textoColor 
                            }}
                          >
                            Saber más
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className={textStyles.btnAccion}
                            onClick={() => {
                              setEditingItem(item.id);
                              setEditedText(item.contenido);
                              setEditedTitle(item.titulo);
                              // Solo cargar textoNegro si la variante es carreras
                              if (variant === 'carreras') {
                                setEditedTextColor(Boolean(item.textoNegro));
                              }
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