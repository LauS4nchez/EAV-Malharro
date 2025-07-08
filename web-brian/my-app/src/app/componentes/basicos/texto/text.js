'use client'
import { useState, useEffect } from 'react';
import { getTextoByTextoId } from "./textoById";
import { checkUserRole } from '../../validacion/checkRole';
import ReactMarkdown from 'react-markdown';
import { handleSave } from '../../validacion/handleSave';
import { API_URL } from "@/app/config";

export const Texto = ({ textoID }) => {
    const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

    const [texto, setTexto] = useState(''); // Contenido original
    const [status, setStatus] = useState('idle'); // Estado de carga: 'idle', 'loading', 'success', 'error'
    const [isEditing, setIsEditing] = useState(false); // Indica si el usuario está editando
    const [editedText, setEditedText] = useState(''); // Contenido modificado
    const [isAdmin, setIsAdmin] = useState(false); // Rol de administrador
    const [realID, setID] = useState('');

    useEffect(() => {
        // Verifica si el usuario es administrador
        const verifyAdmin = async () => {
            const role = await checkUserRole();
            if (role === "Administrador") setIsAdmin(true);
        };
        
        verifyAdmin();

        if (!textoID) {
            setStatus('error');
            return;
        }        

        // Obtiene el texto desde el backend
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
            const getRes = await fetch(`${API_URL}/textos?filters[textoID][$eq]=${textoID}`, {
                headers: {
                    'Authorization': `Bearer ${jwt}` // Agrega el token de autenticación
                }
            });
            const getData = await getRes.json();
            setID(getData.data[0].documentId);

        };

        fetchData();
    }, [textoID, jwt]);

    // Guarda los cambios realizados al texto
    const saveContent = async () => {
        try {
            await handleSave({
                objetoAEditar: "texto",
                idObjeto: realID,
                nuevoTexto: editedText,
                jwt
            });

            // Recarga el contenido actualizado desde el servidor
            const result = await getTextoByTextoId(textoID);
            if (result) {
                setTexto(result);
                setEditedText(result);
            }

            setIsEditing(false); // Cierra modo edición
        } catch (error) {
            alert("Hubo un error al guardar el texto");
        }
    };

    // Muestra mensajes según el estado de carga
    if (status === 'loading') return <p className="text">Cargando...</p>;
    if (status === 'error') return <p className="text">No se encontró el texto</p>;

    return (
        <div className="text-container">  
            {isEditing ? (
                <>
                    {/* Campo editable para modificar el texto */}
                    <textarea
                        className="textarea-editar"
                        value={editedText}
                        onChange={(e) => setEditedText(e.target.value)}
                    />
                    {/* Botón de guardar */}
                    <button onClick={saveContent} className="btn-accion">
                        <svg xmlns="http://www.w3.org/2000/svg" className="icono-boton" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" style={{color:"black"}}/>
                        </svg>
                    </button>
                    {/* Botón para cancelar la edición */}
                    <button
                        onClick={() => {
                            setEditedText(texto);
                            setIsEditing(false);
                        }}
                        className="btn-accion"
                        >
                        <svg xmlns="http://www.w3.org/2000/svg" className="icono-boton" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" style={{color:"black"}}/>
                        </svg>
                    </button>
                </>
            ) : (
                <>
                    {/* Renderizado del texto como Markdown */}
                    <ReactMarkdown
                        components={{
                            p: ({ node, ...props }) => <p className="texto-regular" {...props} />,
                            strong: ({ node, ...props }) => <strong className="texto-negrita" {...props} />
                        }}
                        >
                        {texto}
                    </ReactMarkdown>

                    {/* Botón de edición visible solo para admins */}
                    {isAdmin && <button className="btn-accion" onClick={() => setIsEditing(true)}>
                                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="white" viewBox="0 0 24 24" stroke="black" strokeWidth="1.25">
                                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 
                                    7.04a1.003 1.003 0 000-1.41l-2.34-2.34a1.003 
                                    1.003 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" 
                                    />
                                  </svg>
                                </button>}
                </>
            )}
        </div>
    );
};
