"use client";
import { useState } from "react";
import Link from "next/link";
import { API_URL } from "@/app/config";

// Componente de inicio de sesión
export default function LoginPage() {
  const [identifier, setIdentifier] = useState(""); // usuario o email
  const [password, setPassword] = useState(""); // contraseña
  const [user, setUser] = useState(null); // datos del usuario si login exitoso
  const [error, setError] = useState(""); // mensaje de error

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Enviar datos al endpoint de autenticación
      const res = await fetch(`${API_URL}/api/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error?.message || "Login inválido");

      setUser(data.user); // guardar usuario
      localStorage.setItem("jwt", data.jwt); // guardar token
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="body-inicio-sesion">
      <div className="form-inicio-sesion">
        <h2 className="title-inicio-sesion">Iniciar sesión</h2>
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
          <button className="form-button">
            Ingresar
          </button>
        </form>
        <div className="buttons-container">
          <Link href="/registrar/">
          <button className="return-button">Registrarse</button>
          </Link>
          <Link href="/">
            <button className="return-button">Volver</button>
          </Link>
        </div>

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
