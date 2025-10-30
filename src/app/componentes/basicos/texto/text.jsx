'use client';

import { useState, useEffect } from 'react';
import { getTextoByTextoId } from './textoById';
import { checkUserRole } from '../../validacion/checkRole';
import dynamic from 'next/dynamic';
import { handleSave } from '../../validacion/handleSave';
import { API_URL } from '@/app/config';
import styles from '@/styles/components/Texto/TextComponents.module.css';

// Carga ReactMarkdown solo en cliente (evita SSR)
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });

export const Texto = ({ textoID }) => {
  const [jwt, setJwt] = useState(null);
  const [texto, setTexto] = useState('');
  const [status, setStatus] = useState('idle'); // idle | loading | success | error
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [realID, setID] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');

  // 🔒 nuevo: para no mandar null
  const [textoNegro, setTextoNegro] = useState(false);
  const [hasTextoNegro, setHasTextoNegro] = useState(false);

  // JWT + rol
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const token = localStorage.getItem('jwt');
    if (token) setJwt(token);

    const role = checkUserRole?.();
    if (role === 'Administrador' || role === 'SuperAdministrador') {
      setIsAdmin(true);
    }
  }, []);

  // Traer contenido (solo el texto)
  useEffect(() => {
    const fetchContent = async () => {
      if (!textoID) {
        setStatus('error');
        return;
      }

      setStatus('loading');

      try {
        const result = await getTextoByTextoId(textoID);
        if (result) {
          setTexto(result);
          setEditedText(result);
          setStatus('success');
        } else {
          setStatus('error');
        }
      } catch (error) {
        console.error('Fetch error:', error);
        setStatus('error');
      }
    };

    fetchContent();
  }, [textoID]);

  // Traer documentId + textoNegro desde Strapi si hay JWT
  useEffect(() => {
    const fetchDocumentId = async () => {
      if (!jwt || !textoID) return;

      try {
        const getRes = await fetch(
          `${API_URL}/textos?filters[textoID][$eq]=${encodeURIComponent(textoID)}`,
          {
            headers: {
              Authorization: `Bearer ${jwt}`,
            },
          }
        );

        const getData = await getRes.json();
        const item = getData?.data?.[0];

        if (item) {
          // Strapi v4 → item.attributes
          const attrs = item.attributes || {};

          // id/documentId
          setID(item.documentId || item.id);

          // detectar si el modelo tiene ese campo
          if (Object.prototype.hasOwnProperty.call(attrs, 'textoNegro')) {
            setHasTextoNegro(true);
            // si viene null/undefined → lo pasamos a false
            setTextoNegro(typeof attrs.textoNegro === 'boolean' ? attrs.textoNegro : false);
          } else {
            // el modelo no tiene el campo, no lo mandamos después
            setHasTextoNegro(false);
            setTextoNegro(false);
          }
        }
      } catch (error) {
        console.error('Error fetching document ID:', error);
      }
    };

    fetchDocumentId();
  }, [jwt, textoID]);

  // Guardar contenido
  const saveContent = async () => {
    setSaveError('');

    if (!isAdmin) {
      setSaveError('No tenés permisos para editar este contenido.');
      return;
    }
    if (!jwt) {
      setSaveError('No se encontró token de sesión.');
      return;
    }
    if (!realID) {
      setSaveError('No se pudo identificar el texto en el servidor (sin documentId).');
      return;
    }
    if (!editedText || !editedText.trim()) {
      setSaveError('El contenido no puede estar vacío.');
      return;
    }

    try {
      setSaveLoading(true);

      // 1) Guardar el contenido
      await handleSave({
        objetoAEditar: 'texto',
        idObjeto: realID,
        nuevoContenido: editedText,
        jwt,
        campoAModificar: 'contenido',
      });

      // 2) Solo si el modelo tiene textoNegro, lo mandamos SIEMPRE como boolean
      if (hasTextoNegro) {
        await handleSave({
          objetoAEditar: 'texto',
          idObjeto: realID,
          nuevoContenido: Boolean(textoNegro), // 🔒 nunca null
          jwt,
          campoAModificar: 'textoNegro',
        });
      }

      // refrescamos el contenido visible
      const result = await getTextoByTextoId(textoID);
      if (result) {
        setTexto(result);
        setEditedText(result);
      }

      setIsEditing(false);
    } catch (error) {
      console.error('Error al guardar el texto:', error);
      setSaveError('Hubo un error al guardar el texto.');
    } finally {
      setSaveLoading(false);
    }
  };

  if (status === 'loading') return <p className={styles.loading}>Cargando...</p>;
  if (status === 'error') return <p className={styles.error}>No se encontró el texto</p>;

  return (
    <div className={styles.textContainer}>
      {isEditing ? (
        <div className={styles.editingContainer}>
          <textarea
            className={styles.textareaEditar}
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
          />
          {saveError && <p className={styles.error}>{saveError}</p>}
          <div className={styles.buttonGroup}>
            <button
              onClick={saveContent}
              className={styles.btnAccion}
              disabled={saveLoading}
              type='button'
            >
              {saveLoading ? 'Guardando...' : 'Guardar'}
            </button>
            <button
              onClick={() => {
                setEditedText(texto);
                setSaveError('');
                setIsEditing(false);
              }}
              className={styles.btnAccion}
              type='button'
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.viewContainer}>
          <div className={styles.markdownContent}>
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => (
                  <p className={styles.textoRegular} {...props} />
                ),
                strong: ({ node, ...props }) => (
                  <strong className={styles.textoNegrita} {...props} />
                ),
              }}
            >
              {texto}
            </ReactMarkdown>
          </div>

          {isAdmin && (
            <div className={styles.adminControls}>
              <button
                className={styles.btnAccion}
                onClick={() => {
                  setEditedText(texto);
                  setSaveError('');
                  setIsEditing(true);
                }}
                type='button'
              >
                Editar
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
