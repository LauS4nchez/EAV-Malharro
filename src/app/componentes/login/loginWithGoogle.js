"use client";

import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { API_URL } from "@/app/config";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import { API_TOKEN } from "@/app/config";

export default function GoogleAuthButton({ mode = "login" }) {
  const router = useRouter();

  const login = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const googleUser = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );

        const { email, name, sub: googleId } = googleUser.data;

        // 1. Verifico si ya existe usuario
        const userCheckRes = await fetch(
          `${API_URL}/users?filters[email][$eq]=${email}`,
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`, 
            },
          }
        );

        let exists = false;
        try {
          const data = await userCheckRes.json();
          exists = data.length > 0;
        } catch (err) {
          console.warn("Error al verificar usuario existente:", err);
        }

        let authRes;
        if (exists) {
          // login
          authRes = await fetch(`${API_URL}/auth/local`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: email, password: googleId }),
          });
        } else {
          // registro
          authRes = await fetch(`${API_URL}/auth/local/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: name,
              email: email,
              password: googleId,
            }),
          });
        }

        const authData = await authRes.json();
        if (!authRes.ok)
          throw new Error(authData?.error?.message || "Fallo de autenticación");

        localStorage.setItem("jwt", authData.jwt);
        toast.success(`Bienvenido, ${authData.user.username}!`);
        router.push("/"); // 🔹 redirige al inicio
      } catch (error) {
        console.error(error);
        toast.error("Error con el login de Google");
      }
    },
    onError: () => toast.error("Falló el login con Google"),
  });

  return (
    <button
      className={`google-button ${
        mode === "login" ? "google-login" : "google-register"
      }`}
      onClick={() => login()}
    >
      {/* logo google */}
      {mode === "login" ? "Iniciar sesión con Google" : "Registrarse con Google"}
    </button>
  );
}
