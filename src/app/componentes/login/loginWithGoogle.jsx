"use client";

import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { API_URL, API_TOKEN } from "@/app/config";
import { toast } from "react-hot-toast";
import { useRouter } from "next/navigation";
import styles from '@/styles/components/Login.module.css';

export default function GoogleAuthButton() {
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
          // Login
          authRes = await fetch(`${API_URL}/auth/local`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: email, password: googleId }),
          });
        } else {
          // Registro
          authRes = await fetch(`${API_URL}/auth/local/register`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: name,
              email: email,
              password: googleId,
              confirmed: true
            }),
          });
        }

        const authData = await authRes.json();
        if (!authRes.ok) {
          throw new Error(authData?.error?.message || "Fallo de autenticación");
        }

        localStorage.setItem("jwt", authData.jwt);
        toast.success(`¡Bienvenido${exists ? ' de vuelta' : ''}, ${authData.user.username}!`);
        router.push("/");
      } catch (error) {
        console.error("Error completo:", error);
        if (error.message.includes('username')) {
          toast.error("El nombre de usuario ya existe. Intenta con Google nuevamente.");
        } else {
          toast.error("Error con el login de Google. Intenta nuevamente.");
        }
      }
    },
    onError: () => toast.error("Falló el login con Google"),
  });

  return (
    <button
      className={styles.googleButton}
      onClick={() => login()}
      type="button"
    >
      <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
      </svg>
      Continuar con Google
    </button>
  );
}