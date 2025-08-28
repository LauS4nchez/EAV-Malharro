import { API_URL } from "@/app/config";

// Obtiene los textos del acordeón según el ID proporcionado
export async function getAcordeonByAcordeonID(acordeonID) {
  try {
    // Llama a la API de acordeones filtrando por acordeonID y expandiendo relaciones
    const response = await fetch(`${API_URL}/acordeons?filters[acordeonID][$eq]=${(acordeonID)}&populate=*`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }

    const { data } = await response.json();

    // Devuelve los textos del primer resultado (estructura esperada del backend)
    return data[0].textos || null;

  } catch (error) {
    console.error('Error al obtener acordeon:', error);
    return null; // Devuelve null en caso de error
  }
}
