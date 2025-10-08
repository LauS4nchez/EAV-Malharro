'use client'

import { useState, useEffect } from 'react';
import { getImagenbyImagenID } from "./imagenByID";

// Componente que muestra una imagen basada en un ID recibido por props
export const Imagen = ({ ImagenID }) => {
    const [urlImagen, setUrlImagen] = useState('');
    const [status, setStatus] = useState('idle'); // Maneja el estado de carga de la imagen

    useEffect(() => {
        if (!ImagenID) {
            setStatus('error'); // Si no hay ID, marcar como error
            return;
        }

        const fetchData = async () => {
            setStatus('loading'); // Inicia la carga
            try {
                const result = await getImagenbyImagenID(ImagenID); // Llama a la API con el ID
                if (result) {
                    setUrlImagen(result); // Guarda la URL si existe
                    setStatus('success');
                } else {
                    setStatus('error'); // Si no hay resultado, marca error
                }
            } catch (error) {
                console.error('Fetch error:', error);
                setStatus('error'); // Captura errores de red o API
            }
        };

        fetchData();
    }, [ImagenID]);

    if (status === 'loading') return <p className="text">Cargando...</p>;
    if (status === 'error') return <p className="text">No se encontró la imagen</p>;

    return (
        <div className={`relative`}>
            {urlImagen ? (
                <img 
                    src={urlImagen}
                    alt="..."
                    className="w-full h-auto"
                    sizes="(max-width: 768px) 40vw, 180px"
                />
            ) : null}
        </div>
    );
};
