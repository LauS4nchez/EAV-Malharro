'use client'
import { useState, useEffect } from 'react';
import { getImagenbyImagenID } from "./imagenByID";

export const Imagen = ({ ImagenID }) => {
    const [urlImagen, setUrlImagen] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle'|'loading'|'success'|'error'

    useEffect(() => {
        if (!ImagenID) {
            setStatus('error');
            return;
        }

        const fetchData = async () => {
            setStatus('loading');
            try {
                const result = await getImagenbyImagenID(ImagenID);
                if (result) {
                    setUrlImagen(result);
                    setStatus('success');
                } else {
                    setStatus('error');
                }
            } catch (error) {
                console.error('Fetch error:', error);
                setStatus('error');
            }
        };

        fetchData();
    }, [ImagenID]);

    if (status === 'loading') return <p className="text">Cargando...</p>;
    if (status === 'error') return <p className="text">No se encontró la imagen</p>;

    return (
        <div className="relative w-full">
            <img 
                src={`${urlImagen}`}
                className="object-cover rounded"
                sizes="(max-width: 768px) 100vw, 50vw"
            />
        </div>
    );
};