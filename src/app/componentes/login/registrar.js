"use client";
import { useState } from "react";
import Link from "next/link";

const API_URL = "https://proyectomalharro.onrender.com"; // Endpoint de la API Strapi

export default function Register() {
  // Estados para el formulario
  const [username, setUsername] = useState(""); // Nombre de usuario
  const [email, setEmail] = useState(""); // Email del usuario
  const [password, setPassword] = useState(""); // Contraseña
  const [mensaje, setMensaje] = useState(""); // Mensajes de feedback

  // Registra un nuevo usuario en Strapi
  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch(`${API_URL}/api/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje("Registro exitoso. Ahora puedes iniciar sesión.");
        // Limpia el formulario después de registro exitoso
        setUsername("");
        setEmail("");
        setPassword("");
      } else {
        setMensaje(data?.error?.message || "Error en el registro.");
      }
    } catch (error) {
      setMensaje("Hubo un error en el registro.");
      console.error("Error:", error);
    }
  };

  return (
    <div className="register">
      <div className="form-container">
        <h2 className="title-text">Registrate!</h2>
        
        <form onSubmit={handleRegister}>
          {/* Campo nombre de usuario */}
          <div className="form-group">
            <label className="form-label">Nombre de Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {/* Campo email */}
          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>

          {/* Campo contraseña */}
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <button type="submit" className="form-button">
            Registrarse
          </button>
        </form>

        {/* Navegación y feedback */}
        <div className="buttons-container">
          <Link href="/">
            <button className="return-button">Volver</button>
          </Link>
        </div>
        
        {mensaje && <p className="error-message">{mensaje}</p>}
      </div>
    </div>
  );
}