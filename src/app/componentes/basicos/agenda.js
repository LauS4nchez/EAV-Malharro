const STRAPI_URL = "https://proyectomalharro.onrender.com";

// Obtiene un JSON con TODAS las agendas
async function getAgendas() {
  try {
    const res = await fetch(
      `${STRAPI_URL}/api/agendas?populate=imagen`
    );
    if (!res.ok) {
      console.error("Error en fetch:", res.statusText);
      return [];
    }
    const { data } = await res.json();
    return data;
  } catch (err) {
    console.error("Error en getAgendas:", err);
    return [];
  }
}

export default async function Agenda() {
  const agendas = await getAgendas();

  return (
    <div>
      {agendas.length === 0 ? (
        <p>No hay datos disponibles.</p>
      ) : (
        agendas.map((item) => {
          const { id, tituloActividad, contenidoActividad, fecha, tipoEvento, etiquetas, imagen } = item;
          const imageData = imagen?.data?.attributes;
          const imageUrl = imagen.formats.thumbnail.url;
          const altText = imageData?.alternativeText || tituloActividad;

          // Se returna cada una de las agendas con sus respectivos atributos
          return (
            <div key={id} className="usina-card">
              <h2>{tituloActividad}</h2>
              {imageUrl && (
                <img
                  src={`${imageUrl}`}
                  alt={altText}
                  className="imagen"
                />
              )}
              <p>Actividad: {contenidoActividad}</p>
              <p>Fecha: {fecha}</p>
              <p>Tipo de Evento: {tipoEvento}</p>
              <p>Etiquetas: {etiquetas}</p>
            </div>
          );
        })
      )}
    </div>
  );
}