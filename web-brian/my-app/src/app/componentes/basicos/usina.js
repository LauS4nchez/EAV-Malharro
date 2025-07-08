import { API_URL } from "@/app/config";

// Función que obtiene todas las usinas desde la API, incluyendo su imagen
async function getUsinas() {
  try {
    const res = await fetch(`${API_URL}/usinas?populate=imagen`);
    if (!res.ok) {
      console.error("Error en fetch:", res.statusText);
      return [];
    }
    const { data } = await res.json();
    return data;
  } catch (err) {
    console.error("Error en getUsinas:", err);
    return [];
  }
}

// Componente principal que muestra la lista de usinas
export default async function Usina() {
  const usinas = await getUsinas(); // Obtiene los datos desde el servidor

  return (
    <div>
      {/* Muestra un mensaje si no hay datos */}
      {usinas.length === 0 ? (
        <p>No hay datos disponibles.</p>
      ) : (
        // Muestra cada usina en una tarjeta
        usinas.map((item) => {
          const { id, nombre, carrera, link, imagen } = item;
          const imageUrl = imagen.url;

          return (
            <div key={id} className="usina-card">
              <h2>{nombre}</h2>
              {/* Muestra la imagen si está disponible */}
              {imageUrl && (
                <img
                  src={`${imageUrl}`}
                  alt="..."
                  className="imagen"
                />
              )}
              <p>Carrera: {carrera}</p>
              {/* Enlace para más información */}
              <a href={link} target="_blank" rel="noopener noreferrer">
                Ver contacto
              </a>
            </div>
          );
        })
      )}
    </div>
  );
}
