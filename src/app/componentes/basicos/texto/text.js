'use client'
import { useState, useEffect } from 'react';
import { getTextoByTextoId } from "./textoById";
import { textoProtegido } from "./textoProtegido";

export const Texto = ({ textoID, jwt }) => {
    const [texto, setTexto] = useState('');
    const [status, setStatus] = useState('idle');
    const [isEditing, setIsEditing] = useState(false);
    const [editedText, setEditedText] = useState('');

    const handleSave = async () => {
    try {
        const getRes = await fetch(`https://proyectomalharro.onrender.com/api/textos?filters[textoID][$eq]=${textoID}`);
        const getData = await getRes.json();


        if (!getData.data || getData.data.length === 0) {
            throw new Error('No se encontró el texto en Strapi');
        }

        const realId = getData.data[0].documentId;

        const putRes = await fetch(`https://proyectomalharro.onrender.com/api/textos/${realId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: {
                    texto: editedText,
                },
            }),
        });

        const updated = await putRes.json();

        if (!putRes.ok) {
            throw new Error(updated.error?.message || 'Error al guardar');
        }

        setTexto(updated.data.texto);
        setIsEditing(false);
    } catch (err) {
        console.error(err);
        alert(`Error al guardar: ${err.message}`);
    }
};



    useEffect(() => {
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
        };

        fetchData();
    }, [textoID]);


    if (status === 'loading') return <p className="text">Cargando...</p>;
    if (status === 'error') return <p className="text">No se encontró el texto</p>;

    return (
        <div className="text-container">
        {isEditing ? (
            <>
                <textarea
                    className="text-area"
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                />
                <button onClick={handleSave}>Guardar</button>
                <button onClick={() => setIsEditing(false)}>Cancelar</button>
            </>
            ) : (
            <>
                <p className="text">{texto}</p>
                <button onClick={() => setIsEditing(true)}>Editar</button>
            </>
                )}
        </div>
    );
};