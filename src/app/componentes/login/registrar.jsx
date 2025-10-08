"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL } from "@/app/config";
import { toast } from "react-hot-toast";
import Link from "next/link";
import LoginWithGoogle from "./loginWithGoogle";

export default function Register() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  // --- VALIDACIONES ---
  const validateEmail = (email) => /^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);

  const validateUsername = (username) => /^[a-zA-Z][a-zA-Z0-9._]{2,19}$/.test(username);

  const validatePassword = (password) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateUsername(username)) {
      toast.error(
        "Su usuario es inválido, escriba uno de 3-20 caracteres, que inicie con una letra y solo contenga letras, números, '.' o '_'."
      );
      return;
    }

    if (!validateEmail(email)) {
      toast.error("Su correo electrónico es inválido, ingrese otro.");
      return;
    }

    if (!validatePassword(password)) {
      toast.error("Su contraseña es inválida use como mínimo 6 caracteres, al menos una letra y un número.");
      return;
    }

    try {
      const res = await fetch(`${API_URL}/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        // login automático y redirección
        localStorage.setItem("jwt", data.jwt);
        router.push("/"); 
      } else {
        toast.error(data?.error?.message || "Error en el registro.");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Hubo un error en el registro.");
    }
  };

  return (
    <div className="body-register">
      <div className="form-register">
        <h2 className="title-register">Registrarse</h2>

        <form onSubmit={handleRegister}>
          <div className="form-group">
            <label className="form-label">Nombre de Usuario</label>
            <input
              type="text"
              placeholder="Nombre de usuario"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Correo Electrónico</label>
            <input
              type="email"
              placeholder="Correo electrónico"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              placeholder="Contraseña"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="form-button-register">
            Registrarse
          </button>
        </form>

        <div className="buttons-container" style={{ marginTop: 12 }}>
          <LoginWithGoogle mode="register" />
        </div>

        <div className="buttons-container">
          <Link href="/login/">
            <button className="return-button-register">Iniciar Sesion</button>
          </Link>
          <Link href="/">
            <button className="return-button-register">Volver</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
