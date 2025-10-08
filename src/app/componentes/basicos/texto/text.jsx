'use client'
import { useState, useEffect } from 'react';
import { getTextoByTextoId } from "./textoById";
import { checkUserRole } from '../../validacion/checkRole';
import dynamic from 'next/dynamic';
import { handleSave } from '../../validacion/handleSave';
import { API_URL } from "@/app/config";
import styles from "@/styles/components/TextComponents.module.css"

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
            const role = await checkUserRole();
            if (role === "Administrador") setIsAdmin(true);
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
                            <svg xmlns="http://www.w3.org/2000/svg" className={styles.iconoBoton} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5"/>
                            </svg>
                            Guardar
                        </button>
                        <button
                            onClick={() => {
                                setEditedText(texto);
                                setIsEditing(false);
                            }}
                            className={styles.btnAccion}
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className={styles.iconoBoton} fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12"/>
                            </svg>
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
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 
                                    7.04a1.003 1.003 0 000-1.41l-2.34-2.34a1.003 
                                    0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" 
                                    />
                                </svg>
                                Editar
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};