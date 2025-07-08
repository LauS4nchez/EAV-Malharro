import { API_URL } from "@/app/config";

// Función que verifica el rol del usuario autenticado
export async function checkUserRole() {
  try {
    const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

    if (!jwt) return null;

    // Consulta la información del usuario actual usando el JWT
    const res = await fetch(`${API_URL}/users/me?populate=role`, {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    });

    

    if (!res.ok) {
      throw new Error("Error al obtener el rol del usuario");
    }

    const user = await res.json();

    // Devuelve el rol del usuario
    return user.role?.name || null;
  } catch (err) {
    console.error("Error al verificar el rol:", err);
    return null;
  }
}
