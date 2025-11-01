// components/Acordeon.jsx
'use client';

import { useState, useEffect } from 'react';
import { getAcordeonByAcordeonID } from './acordeonByID';
import { checkUserRole } from '../../validacion/checkRole';
import { handleSave } from '../../validacion/handleSave';
import dynamic from 'next/dynamic';
import textStyles from '@/styles/components/Texto/TextComponents.module.css';
import acordeonCarrerasStyles from '@/styles/components/Acordeon/AcordeonCarreras.module.css';
import acordeonPreguntasStyles from '@/styles/components/Acordeon/AcordeonPreguntas.module.css';

// Importación dinámica para evitar SSR con ReactMarkdown
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false
});

// Mapeo de variantes → módulos de estilos
const variantStyles = {
  carreras: acordeonCarrerasStyles,
  preguntas: acordeonPreguntasStyles,
};

export default function Acordeon({ acordeonID, variant = 'carreras' }) {
  const jwt = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;

  // Estado UI/datos
  const [labels, setLabels] = useState([]);
  const [activo, setActivo] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editedText, setEditedText] = useState('');
  const [editedTitle, setEditedTitle] = useState('');
  const [editedTextColor, setEditedTextColor] = useState(false); // para textoNegro
  const [isMobile, setIsMobile] = useState(false);

  // nuevos estados de validación
  const [validationErrors, setValidationErrors] = useState({});
  const [saving, setSaving] = useState(false);

  // Selección de estilos según variante
  const acordeonStyles = variantStyles[variant] || acordeonCarrerasStyles;

  useEffect(() => {
    // detectar mobile (opcional)
    if (typeof window !== 'undefined') {
      const handleResize = () => setIsMobile(window.innerWidth < 768);
      handleResize();
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  // Carga inicial: rol y datos
  useEffect(() => {
    const verifyAdmin = async () => {
      const role = checkUserRole();
      if (role === 'Administrador' || role === 'SuperAdministrador') setIsAdmin(true);
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

  const FlechaCarreras = ({ abierto }) => (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={1.5}
      stroke='currentColor'
      className={`${acordeonStyles.flechaIcono} ${abierto ? acordeonStyles.flechaAbierta : ''}`}
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='m4.5 15.75 7.5-7.5 7.5 7.5' />
    </svg>
  );

  const FlechaPreguntas = ({ abierto }) => (
    <svg
      xmlns='http://www.w3.org/2000/svg'
      fill='none'
      viewBox='0 0 24 24'
      strokeWidth={1.5}
      stroke='currentColor'
      className={`${acordeonStyles.flechaIcono} ${abierto ? acordeonStyles.flechaAbierta : ''}`}
    >
      <path strokeLinecap='round' strokeLinejoin='round' d='M12 4.5v15m7.5-7.5h-15' />
    </svg>
  );

  const FlechaIcono = variant === 'preguntas' ? FlechaPreguntas : FlechaCarreras;

  // ==== VALIDACIÓN INTELIGENTE ====
  const validateFields = (originalItem) => {
    const errors = {};

    const tituloTrim = editedTitle.trim();
    const contenidoTrim = editedText.trim();

    if (!tituloTrim) {
      errors.titulo = 'El título es obligatorio.';
    } else if (tituloTrim.length < 3) {
      errors.titulo = 'El título debe tener al menos 3 caracteres.';
    }

    if (!contenidoTrim) {
      errors.contenido = 'El contenido no puede estar vacío.';
    } else if (contenidoTrim.length < 5) {
      errors.contenido = 'El contenido es demasiado corto, agregá un poco más.';
    }

    // en carreras, textoNegro siempre boolean
    if (variant === 'carreras') {
      // aunque el usuario toque o no el switch, lo forzamos a boolean
      if (typeof editedTextColor !== 'boolean') {
        errors.textoNegro = 'Ocurrió un problema con el color del texto. Volvé a marcar la opción.';
      }
    }

    // evitar guardar si no cambió nada
    const noTitleChange = originalItem && originalItem.titulo === tituloTrim;
    const noContentChange = originalItem && (originalItem.contenido || '') === contenidoTrim;
    const noTextColorChange =
      variant !== 'carreras' ||
      (originalItem && Boolean(originalItem.textoNegro) === Boolean(editedTextColor));

    if (noTitleChange && noContentChange && noTextColorChange) {
      errors.sinCambios = 'No hay cambios para guardar.';
    }

    return errors;
  };

  const saveChanges = async (id) => {
    if (!jwt) {
      // si no hay token, no intentamos guardar
      setValidationErrors({
        auth: 'No tenés sesión activa para guardar cambios.'
      });
      return;
    }

    const originalItem =
      labels.find((l) => l.documentId === id) ||
      labels.find((l) => l.id === id) ||
      null;

    const errors = validateFields(originalItem);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    setValidationErrors({});
    setSaving(true);

    try {
      const tituloTrim = editedTitle.trim();
      const contenidoTrim = editedText.trim();
      const mustSendTextColor = variant === 'carreras';

      // guardamos SOLO lo que cambió
      if (!originalItem || originalItem.contenido !== contenidoTrim) {
        await handleSave({
          objetoAEditar: 'texto',
          idObjeto: id,
          nuevoContenido: contenidoTrim,
          jwt,
          campoAModificar: 'contenido',
        });
      }

      if (!originalItem || originalItem.titulo !== tituloTrim) {
        await handleSave({
          objetoAEditar: 'texto',
          idObjeto: id,
          nuevoContenido: tituloTrim,
          jwt,
          campoAModificar: 'titulo',
        });
      }

      if (mustSendTextColor) {
        const boolToSend = Boolean(editedTextColor); // 🔒 nunca null
        if (!originalItem || Boolean(originalItem.textoNegro) !== boolToSend) {
          await handleSave({
            objetoAEditar: 'texto',
            idObjeto: id,
            nuevoContenido: boolToSend,
            jwt,
            campoAModificar: 'textoNegro',
          });
        }
      }

      const updated = await getAcordeonByAcordeonID(acordeonID);
      if (updated) setLabels(updated);

      // Reset
      setEditingItem(null);
      setEditedText('');
      setEditedTitle('');
      setEditedTextColor(false);
    } catch (error) {
      console.error('Error al guardar los cambios del acordeón:', error);
      // no usamos alert porque ya me dijiste en otros componentes que no lo querés
      setValidationErrors({
        general: 'No se pudieron guardar los cambios. Revisá la consola.'
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={textStyles.texto}>
      <div className={acordeonStyles.acordeonContainer}>
        {labels.map((item) => {
          const abierto = activo === item.id;
          const fondo = item.color || '#ffffff';
          const textoColor =
            variant === 'preguntas' ? '#000000' : item.textoNegro ? '#000000' : '#FFFFFF';
          const isEditingThis = editingItem === item.id;
          const titulo = item.titulo || 'Sin título';

          return (
            <div
              key={item.id}
              className={acordeonStyles.textoItem}
              style={{ backgroundColor: fondo, color: textoColor }}
            >
              {/* Header clickeable */}
              <div
                className={acordeonStyles.textoHeader}
                onClick={() => toggle(item.id)}
              >
                <span className={acordeonStyles.tituloContainer}>
                  <h2
                    style={{ color: textoColor }}
                    className={acordeonStyles.tituloAcordeon}
                    title={isMobile && titulo.length > 15 && variant === 'carreras' ? titulo : ''}
                  >
                    {titulo}
                  </h2>
                </span>
                <span className={acordeonStyles.botonTexto}>
                  <FlechaIcono abierto={abierto} />
                </span>
              </div>

              {/* Cuerpo colapsable */}
              <div
                className={`${acordeonStyles.textoContenido} ${
                  abierto
                    ? acordeonStyles.textoContenidoAbierto
                    : acordeonStyles.textoContenidoCerrado
                }`}
              >
                <div className={acordeonStyles.contenidoInterno}>
                  {isEditingThis ? (
                    <div className={textStyles.editingContainer}>
                      <input
                        className={textStyles.textareaEditar}
                        value={editedTitle}
                        onChange={(e) => setEditedTitle(e.target.value)}
                        placeholder='Editar título'
                      />
                      {validationErrors.titulo && (
                        <p className={textStyles.errorTexto}>{validationErrors.titulo}</p>
                      )}

                      <textarea
                        className={textStyles.textareaEditar}
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                        placeholder='Editar contenido'
                      />
                      {validationErrors.contenido && (
                        <p className={textStyles.errorTexto}>{validationErrors.contenido}</p>
                      )}

                      {variant === 'carreras' && (
                        <div className={textStyles.switchContainer}>
                          <label className={textStyles.switchLabel}>
                            <span>Texto negro</span>
                            <input
                              type='checkbox'
                              checked={!!editedTextColor}
                              onChange={(e) => setEditedTextColor(e.target.checked)}
                              className={textStyles.switchInput}
                            />
                            <span className={textStyles.switchSlider}></span>
                          </label>
                          {validationErrors.textoNegro && (
                            <p className={textStyles.errorTexto}>{validationErrors.textoNegro}</p>
                          )}
                        </div>
                      )}

                      {validationErrors.sinCambios && (
                        <p className={textStyles.errorTexto}>{validationErrors.sinCambios}</p>
                      )}
                      {validationErrors.auth && (
                        <p className={textStyles.errorTexto}>{validationErrors.auth}</p>
                      )}
                      {validationErrors.general && (
                        <p className={textStyles.errorTexto}>{validationErrors.general}</p>
                      )}

                      <div className={textStyles.buttonGroup}>
                        <button
                          onClick={() => saveChanges(item.documentId)}
                          className={textStyles.btnAccion}
                          disabled={saving}
                        >
                          {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(null);
                            setValidationErrors({});
                          }}
                          className={textStyles.btnAccion}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className={acordeonStyles.contenidoTexto}>
                        <ReactMarkdown
                          components={{
                            p: ({ node, ...props }) => <p style={{ color: textoColor }} {...props} />,
                            strong: ({ node, ...props }) => (
                              <strong style={{ color: textoColor }} {...props} />
                            ),
                            em: ({ node, ...props }) => <em style={{ color: textoColor }} {...props} />,
                          }}
                        >
                          {item.contenido || 'Sin contenido'}
                        </ReactMarkdown>
                      </div>

                      <div className={textStyles.botonesFila}>
                        {isAdmin && (
                          <button
                            className={textStyles.btnAccion}
                            onClick={() => {
                              setEditingItem(item.id);
                              setEditedText(item.contenido || '');
                              setEditedTitle(item.titulo || '');
                              if (variant === 'carreras') {
                                setEditedTextColor(Boolean(item.textoNegro));
                              } else {
                                setEditedTextColor(false);
                              }
                              setValidationErrors({});
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
