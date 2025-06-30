export async function getImagenbyImagenID(ImagenID) {
  try {
    const response = await fetch(`https://proyectomalharro.onrender.com/api/imagens?filters[imagenID][$eq]=${(ImagenID)}&populate=imagen`);
    
    if (!response.ok) {
      throw new Error(`Error HTTP: ${response.status}`);
    }
    
    const { data } = await response.json();

    return data[0].imagen.formats.thumbnail.url || null;
    
  } catch (error) {
    console.error('Error al obtener la imagen:', error);
    return null;
  }
}