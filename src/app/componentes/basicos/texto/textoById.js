import { API_URL } from "@/app/config";

// Función que obtiene un texto desde la API a partir de su textoID
export async function getTextoByTextoId(textoID) {
  try {
    // Realiza una consulta con filtro por textoID, incluyendo relaciones
    const res = await fetch(`${API_URL}/textos?filters[textoID][$eq]=${textoID}&populate=*`);
    
    if (!res.ok) {
      throw new Error(`Error HTTP: ${res.status}`);
    }

    const { data } = await res.json();

    // Devuelve el contenido del primer resultado si existe
    return data[0]?.contenido || null;
  } catch (err) {
    console.error("Error al obtener texto:", err);
    return null;
  }
}
