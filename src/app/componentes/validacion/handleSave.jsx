import { API_URL } from "@/app/config";

// Función reutilizable para guardar texto editado en cualquier tipo de objeto (texto, acordeón, etc.)
export const handleSave = async ({ objetoAEditar, idObjeto, nuevoContenido, jwt, campoAModificar }) => {
    try {
        // Actualiza el contenido del objeto usando PUT
        const putRes = await fetch(`${API_URL}/${objetoAEditar}s/${idObjeto}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${jwt}`
            },
            body: JSON.stringify({
                data: {
                    [campoAModificar]: nuevoContenido, // Guarda el nuevo contenido
                },
            }),
        });

        const updated = await putRes.json();

        // Si la actualización falla, lanza un error
        if (!putRes.ok) {
            throw new Error(updated.error?.message || 'Error al guardar');
        }

        // Devuelve el nuevo contenido para actualizar el estado del frontend
        return updated.data.texto;
    } catch (err) {
        console.error(err);
        throw err; // Permite que el componente que llama maneje el error
    }
};