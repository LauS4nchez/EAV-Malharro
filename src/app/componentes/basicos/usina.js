import { API_URL } from "@/app/config";

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

export default async function Usina() {
  const usinas = await getUsinas();

  return (
    <div className="usina-container">
      {usinas.length === 0 ? (
        <p>No hay datos disponibles.</p>
      ) : (
        usinas.map((item) => {
          const { id, nombre, carrera, link, imagen } = item;
          const imageUrl = imagen?.url ?? '';

          return (
            <div key={id} className="usina-card" style={{
                  backgroundImage: `url(${imageUrl})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}>
              <div className="usina-contenido">
                <h2>{nombre}</h2>
                <p>Carrera: {carrera}</p>
                <a href={link} target="_blank" rel="noopener noreferrer">
                Ver contacto
                </a>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
    