import { API_URL } from "@/app/config";

// Obtiene la URL de una imagen a partir de su imagenID
export async function getImagenbyImagenID(ImagenID) {
  try {
    const response = await fetch(`${API_URL}/imagens?filters[imagenID][$eq]=${(ImagenID)}&populate=imagen`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`); // Si la respuesta no es OK, lanza error
    }
    
    const { data } = await response.json();

    return data[0].imagen.formats.thumbnail.url || null; // Devuelve la URL si existe
  } catch (error) {
    console.error('Error al obtener la imagen:', error);
    return null; // En caso de error devuelve null
  }
}
