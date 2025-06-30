// Se buscan todos los links 
export async function getLink() {
  try {
    const res = await fetch('https://proyectomalharro.onrender.com/api/links');
    
    if (!res.ok) {
      console.error('Error en fetch:', res.statusText);
      return [];
      }
    
    const { data } = await res.json();
    return data;
  } 
  catch (err) {
      console.error('Error en getLink:', err);
      return [];
  }
}

// Función para renderizar los links
export default async function Links() {
  // Se obtienen todos los links
  const links = await getLink();
  
  // Error por si no hay links
  if (!links || links.length === 0) {
    return (
      <div className="texto-error">
        No se pudieron cargar los links.
      </div>
    );
  }
  
  return (
    <div className="links">
      {/* Se mapean todos los links para renderizarlos con sus clases */}
      {links.map((link) => {
        const url = link.link || link?.link?.url || null;
        return (
          <div key={link.id}>
            {url ? (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="links-boton"
              >
                Ver link
              </a>
            ) : (
              <p>No hay un link disponible</p>
            )}
          </div>
        );
      })}
    </div>
  );
}