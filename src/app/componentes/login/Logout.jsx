// componentes/login/Logout.jsx
import { useRouter } from "next/navigation";

export function logout() {
  // Borra todos los datos de sesión
  localStorage.removeItem("jwt");
  localStorage.removeItem("userRole");

  // Redirigir al inicio
  window.location.href = "/";
}
