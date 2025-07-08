"use client";
import { useState } from "react";
import Link from "next/link";
import { API_URL } from "@/app/config";

// Componente de registro de usuario
export default function Register() {
  const [username, setUsername] = useState(""); // nombre de usuario
  const [email, setEmail] = useState(""); // email del usuario
  const [password, setPassword] = useState(""); // contraseña
  const [mensaje, setMensaje] = useState(""); // mensaje de éxito o error

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      // Enviar datos al endpoint de registro
      const res = await fetch(`${API_URL}/api/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setMensaje("Registro exitoso. Ahora puedes iniciar sesión.");
        setUsername("");
        setEmail("");
        setPassword("");
      } else {
        setMensaje(data?.error?.message || "Error en el registro.");
      }
    } catch (error) {
      console.error("Error:", error);
      setMensaje("Hubo un error en el registro.");
    }
  };

    return (
    <div className="body-register">
      <div className="form-register">
        <h2 className="title-register">Registrarse</h2>
        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label htmlFor="name" className="form-label">Nombre de Usuario</label>
            <input
              type="text"
              placeholder="Nombre de usuario"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">Correo Electrónico</label>
            <input
              type="email"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">Contraseña</label>
            <input
              type="password"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
            />
          </div>
          <button
            type="submit"
            className="form-button-register"
          >
            Registrarse
          </button>
        </form>

        <div className="buttons-container">
          <Link href="/login/">
            <button className="return-button-register">Iniciar Sesion</button>
          </Link>
          <Link href="/">
            <button className="return-button-register">Volver</button>
          </Link>
        </div>
        {mensaje && <p className="error-message">{mensaje}</p>}
      </div>
    </div>
  );
}
