
import "../componentes-styles.css";

const STRAPI_URL = "https://proyectomalharro.onrender.com";

async function getUsinas() {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/usinas?populate=imagen`
    );
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

export default async function Usina() {
  const usinas = await getUsinas();

  return (
    <div>
      {usinas.length === 0 ? (
        <p>No hay datos disponibles.</p>
      ) : (
        usinas.map((item) => {
          const { id, nombre, carrera, link, imagen } = item;
          const imageData = imagen?.data?.attributes;
          const imageUrl = imagen.formats.thumbnail.url;
          const altText = imageData?.alternativeText || nombre;

          return (
            <div key={id} className="usina-card">
              <h2>{nombre}</h2>
              {imageUrl && (
                <img
                  src={`${imageUrl}`}
                  alt={altText}
                  className="imagen"
                />
              )}
              <p>Carrera: {carrera}</p>
              <a href={link} target="_blank" rel="noopener noreferrer">
                Ver perfil
              </a>
            </div>
          );
        })
      )}
    </div>
  );
}
    