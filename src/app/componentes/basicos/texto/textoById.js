export async function getTextoByTextoId(textoID) {
  try {
    // Busca el componente que contenga la ID
    const response = await fetch(`https://proyectomalharro.onrender.com/api/textos?filters[textoID][$eq]=${(textoID)}`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const { data } = await response.json();

    // Returna solo el texto, no un json
    return data[0]?.texto || null;
    
  } catch (error) {
    console.error('Error al obtener texto:', error);
    return null;
  }
}