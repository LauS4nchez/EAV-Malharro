import { API_URL } from "@/app/config";

export default async function Document() {
  // Se extraen todos los documentos
  const res = await fetch(`${API_URL}/documentos?populate=archivo`);

  const { data: documentos } = await res.json();

  return (
    <div className="documento">
      {documentos.map((doc) => {
        const attrs = doc.attributes || doc;
        const titulo = attrs.titulo || 'Sin título';

        // Para acceder a cada archivo se debe ir hacia la URL original de la api
        const archivoUrl = attrs.archivo?.url
          ? `${attrs.archivo.url}`
          : null;

        // Se renderizan todos los links a pdfs
        return (
          <div key={doc.id} style={{ marginBottom: '1rem' }}>
            <h3>{titulo}</h3>
            {archivoUrl ? (
              <>
                <a
                  href={archivoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="documento-boton"
                >
                  Ver documento
                </a>
              </>
            ) : (
              <p>No hay archivo disponible</p>
            )}
          </div>
        );
      })}
    </div>
  );
}