"use client"; // Indica que este es un componente de cliente en Next.js 13+
import { useState } from "react";
import Link from "next/link";

// URL base de la API de Strapi (backend)
const STRAPI_URL = "https://proyectomalharro.onrender.com";

export default function LoginPage() {
  // Estados del componente
  const [identifier, setIdentifier] = useState(""); // Email o nombre de usuario
  const [password, setPassword] = useState(""); // Contraseña del usuario
  const [user, setUser] = useState(null); // Datos del usuario después del login exitoso
  const [error, setError] = useState(""); // Mensajes de error

  /**
   * Maneja el envío del formulario de login
   * @param {Event} e - Evento del formulario
   */
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Request a la API de autenticación de Strapi
      const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error?.message || "Login inválido");

      // Si la autenticación es exitosa:
      setUser(data.user); // Guarda datos del usuario en estado
      localStorage.setItem("jwt", data.jwt); // Almacena token para futuras requests
    } catch (err) {
      setError(err.message); // Muestra errores al usuario
    }
  };

  return (
    <div className="login">
      <div className="form-container">
        <h2 className="title-text">Iniciar sesión</h2>
        
        {/* Formulario de login */}
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="block form-label">Email o usuario</label>
            <input
              type="text"
              className="form-input"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
          </div>
          
          <div className="form-group">
            <label className="block form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <button className="form-button" type="submit">
            Ingresar
          </button>
        </form>

        {/* Botón de navegación */}
        <div className="buttons-container">
          <Link href="/">
            <button className="return-button">Volver</button>
          </Link>
        </div>

        {/* Feedback para el usuario */}
        {error && <p className="error-message">{error}</p>}
        {user && (
          <p className="text-green-600 mt-4">
            Bienvenido, {user.username || user.email}
          </p>
        )}
      </div>
    </div>  
  );
}