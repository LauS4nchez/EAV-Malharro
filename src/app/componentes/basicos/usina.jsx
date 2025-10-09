import { API_URL } from "@/app/config";
import styles from "@/styles/components/Usina.module.css";

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
    <div className={styles.usinaCircularContainer}>
      <div className={styles.usinaContent}>
        <div className={styles.usinaTitulo}>
          <h2>Usina</h2>
        </div>
        
        <div className={styles.usinaParrafo}>
          <p>Conocé los emprendimientos y proyectos de nuestros estudiantes y egresados.</p>
        </div>

        <div className={styles.usinaGaleria}>
          {usinas.length === 0 ? (
            <div className={styles.usinaEmpty}>
              <p>No hay usinas disponibles en este momento.</p>
            </div>
          ) : (
            usinas.map((item) => {
              const { id, nombre, carrera, link, imagen } = item;
              const imageUrl = imagen?.url ? `${imagen.url}` : '';

              return (
                <div key={id} className={styles.usinaCard}>
                  <div className={styles.usinaImageContainer}>
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={nombre}
                        className={styles.usinaImage}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: '#333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ccc'
                      }}>
                        Sin imagen
                      </div>
                    )}
                  </div>
                  
                  <div className={styles.usinaContenido}>
                    <h3>{nombre}</h3>
                    <p>{carrera}</p>
                    {link && (
                      <a 
                        href={link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.usinaLink}
                      >
                        Contactar
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}