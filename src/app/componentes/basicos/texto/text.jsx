'use client'
import { useState, useEffect } from 'react';
import { getTextoByTextoId } from "./textoById";
import { checkUserRole } from '../../validacion/checkRole';
import dynamic from 'next/dynamic';
import { handleSave } from '../../validacion/handleSave';
import { API_URL } from "@/app/config";
import styles from "@/styles/components/Texto/TextComponents.module.css"

// Importación dinámica de ReactMarkdown
const ReactMarkdown = dynamic(() => import('react-markdown'), {
  ssr: false
});

export const Texto = ({ textoID }) => {
    const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

    const [texto, setTexto] = useState('');
    const [status, setStatus] = useState('idle');
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);
    const [realID, setID] = useState('');

    useEffect(() => {
        const verifyAdmin = async () => {
            const role = checkUserRole();
            if (role === "Administrador" || role === 'SuperAdministrador') setIsAdmin(true);
        };
        
        verifyAdmin();

        if (!textoID) {
            setStatus('error');
            return;
        }        

        const fetchData = async () => {
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
            
            if (jwt) {
                try {
                    const getRes = await fetch(`${API_URL}/textos?filters[textoID][$eq]=${textoID}`, {
                        headers: {
                            'Authorization': `Bearer ${jwt}`
                        }
                    });
                    const getData = await getRes.json();
                    if (getData.data && getData.data[0]) {
                        setID(getData.data[0].documentId);
                    }
                } catch (error) {
                    console.error('Error fetching document ID:', error);
                }
            }
        };

        fetchData();
    }, [textoID, jwt]);

    const saveContent = async () => {
        try {
            await handleSave({
                objetoAEditar: "texto",
                idObjeto: realID,
                nuevoContenido: editedText,
                jwt,
                campoAModificar: "contenido"
            });

            const result = await getTextoByTextoId(textoID);
            if (result) {
                setTexto(result);
                setEditedText(result);
            }

            setIsEditing(false);
        } catch (error) {
            alert("Hubo un error al guardar el texto");
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
                    <div className={styles.buttonGroup}>
                        <button onClick={saveContent} className={styles.btnAccion}>
                            Guardar
                        </button>
                        <button
                            onClick={() => {
                                setEditedText(texto);
                                setIsEditing(false);
                            }}
                            className={styles.btnAccion}
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
                                p: ({ node, ...props }) => <p className={styles.textoRegular} {...props} />,
                                strong: ({ node, ...props }) => <strong className={styles.textoNegrita} {...props} />
                            }}
                        >
                            {texto}
                        </ReactMarkdown>
                    </div>

                    {isAdmin && (
                        <div className={styles.adminControls}>
                            <button className={styles.btnAccion} onClick={() => setIsEditing(true)}>
                                Editar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};