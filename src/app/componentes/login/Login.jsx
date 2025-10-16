"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, API_TOKEN } from "@/app/config";
import { toast } from "react-hot-toast";
import Link from "next/link";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import styles from '@/styles/components/Login.module.css';

export default function UnifiedAuth() {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validaciones
  const validateEmail = (email) => /^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  const validateUsername = (username) => /^[a-zA-Z][a-zA-Z0-9._]{2,19}$/.test(username);
  const validatePassword = (password) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);

  // Google Login
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        setLoading(true);
        const googleUser = await axios.get(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
          }
        );

        const { email, name, sub: googleId } = googleUser.data;

        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, googleId, name }),
        });

        const responseText = await authRes.text();

        if (authRes.ok) {
          const authData = JSON.parse(responseText);

          // Si el usuario aún no tiene contraseña → paso "setPassword"
          if (authData.user.loginMethods !== "both") {
            setEmail(authData.user.email);
            setStep("setPassword");
            toast("Configura tu usuario y contraseña para poder iniciar sesión manualmente.");
            return;
          }


          // Si ya tiene contraseña
          localStorage.setItem("jwt", authData.jwt);
          localStorage.setItem("userRole", authData.user.role?.name || "Authenticated");
          toast.success(`¡Bienvenido ${authData.user.username}!`);
          router.push("/");
        } else {
          throw new Error(responseText);
        }

      } catch (error) {
        console.error("Error Google Login:", error);
        toast.error("Error al ingresar con Google.");
      } finally {
        setLoading(false);
      }
    },
    onError: (error) => {
      console.error("Error Google OAuth:", error);
      toast.error("Falló el login con Google");
    },
  });

  // Paso 1: Verificar email
  const checkEmail = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast.error("Por favor, ingresa un email válido.");
      return;
    }

    setLoading(true);
    try {
      const userCheckRes = await fetch(
        `${API_URL}/users?filters[email][$eq]=${encodeURIComponent(email)}`,
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      );

      const users = await userCheckRes.json();
      const userExists = users.length > 0;

      if (userExists) {
        setStep('login');
        toast.success("Usuario encontrado. Ingresa tu contraseña.");
      } else {
        setStep('register');
        toast.success("Crea tu cuenta. Elige un nombre de usuario y contraseña.");
      }
    } catch (error) {
      console.error("Error al verificar email:", error);
      toast.error("Error al verificar el email.");
    } finally {
      setLoading(false);
    }
  };

  // Login manual
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Login básico
      const res = await fetch(`${API_URL}/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error?.message || "Contraseña incorrecta");

      // Guardamos el JWT primero
      localStorage.setItem("jwt", data.jwt);

      // Traer info completa del usuario (incluye rol actualizado)
      const meRes = await fetch(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${data.jwt}` },
      });

      const meData = await meRes.json();

      // Guardamos rol actualizado
      localStorage.setItem("userRole", meData.role?.name || "Authenticated");

      toast.success(`¡Bienvenido de vuelta, ${meData.username}!`);
      router.push("/");

    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };


  // Registro manual
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateUsername(username)) {
      toast.error("Usuario inválido. Usa 3-20 caracteres válidos.");
      return;
    }
    if (!validatePassword(password)) {
      toast.error("Contraseña inválida. Mínimo 6 caracteres, con al menos una letra y un número.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/local/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("userRole", data.user.role?.name || "Authenticated");
        toast.success(`¡Cuenta creada! Bienvenido, ${data.user.username}`);
        router.push("/");
      } else {
        if (data.error?.message?.includes('username')) {
          toast.error("El nombre de usuario ya está en uso.");
        } else if (data.error?.message?.includes('email')) {
          toast.error("El email ya está registrado. Intenta iniciar sesión.");
          setStep('login');
        } else {
          throw new Error(data?.error?.message || "Error en el registro");
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Hubo un error en el registro.");
    } finally {
      setLoading(false);
    }
  };

  // Nuevo paso: guardar contraseña tras login con Google
  const handleSetPassword = async () => {
    if (!validateUsername(username)) {
      toast.error("Usuario inválido. Usa 3-20 caracteres válidos.");
      return;
    }
    if (!validatePassword(password)) {
      toast.error("Contraseña inválida. Mínimo 6 caracteres, con al menos una letra y un número.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/set-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        localStorage.setItem("jwt", data.jwt);
        localStorage.setItem("userRole", data.user.role?.name || "Authenticated");
        toast.success(`Cuenta configurada correctamente.`);
        router.push("/");
      } else {
        throw new Error(data?.error?.message || "Error al guardar la contraseña");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Volver al inicio
  const resetFlow = () => {
    setStep('email');
    setEmail("");
    setUsername("");
    setPassword("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>
            {step === 'email' && 'Ingresa a tu cuenta'}
            {step === 'login' && 'Iniciar sesión'}
            {step === 'register' && 'Crear cuenta'}
            {step === 'setPassword' && 'Configurar cuenta'}
          </h2>
          <p className={styles.stepIndicator}>
            {step === 'email' && 'Ingresa tu email para continuar'}
            {step === 'login' && `Ingresa tu contraseña para ${email}`}
            {step === 'register' && `Completa tu registro para ${email}`}
            {step === 'setPassword' && `Establece tu usuario y contraseña para ${email}`}
          </p>
        </div>

        <div className={styles.cardBody}>
          <form
            onSubmit={
              step === 'email'
                ? checkEmail
                : step === 'login'
                ? handleLogin
                : step === 'register'
                ? handleRegister
                : (e) => e.preventDefault()
            }
            className={styles.form}
          >
            {/* Paso 1: Email */}
            {step === 'email' && (
              <div className={styles.formGroup}>
                <label htmlFor="email" className={styles.formLabel}>Correo electrónico</label>
                <input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  className={styles.formControl}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}

            {/* Paso 2: Login */}
            {step === 'login' && (
              <div className={styles.formGroup}>
                <label htmlFor="password" className={styles.formLabel}>Contraseña</label>
                <input
                  id="password"
                  type="password"
                  placeholder="Ingresa tu contraseña"
                  className={styles.formControl}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            {/* Paso 3: Registro */}
            {step === 'register' && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="username" className={styles.formLabel}>Nombre de usuario</label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Elige un nombre de usuario"
                    className={styles.formControl}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="registerPassword" className={styles.formLabel}>Contraseña</label>
                  <input
                    id="registerPassword"
                    type="password"
                    placeholder="Crea una contraseña segura"
                    className={styles.formControl}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            {/* Paso 4: Set password tras Google */}
            {step === 'setPassword' && (
              <>
                <div className={styles.formGroup}>
                  <label htmlFor="username" className={styles.formLabel}>Nombre de usuario</label>
                  <input
                    id="username"
                    type="text"
                    placeholder="Elige un nombre de usuario"
                    className={styles.formControl}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <div className={styles.formGroup}>
                  <label htmlFor="password" className={styles.formLabel}>Contraseña</label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Crea una contraseña segura"
                    className={styles.formControl}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="button"
                  className={styles.btnPrimary}
                  disabled={loading}
                  onClick={handleSetPassword}
                >
                  {loading ? "Guardando..." : "Guardar y continuar"}
                </button>
              </>
            )}

            {/* Botón principal */}
            {step !== 'setPassword' && (
              <button
                type="submit"
                className={styles.btnPrimary}
                disabled={loading}
              >
                {loading
                  ? "Cargando..."
                  : step === 'email'
                  ? 'Continuar'
                  : step === 'login'
                  ? 'Ingresar'
                  : 'Crear cuenta'}
              </button>
            )}
          </form>

          {/* Botón de Google - solo en paso email */}
          {step === 'email' && (
            <>
              <div className={styles.divider}><span>o continuar con</span></div>
              <button
                className={styles.googleButton}
                onClick={() => googleLogin()}
                type="button"
                disabled={loading}
              >
                  <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Continuar con Google
              </button>
            </>
          )}

          <div className={styles.links}>
            {step !== 'email' && (
              <button type="button" className={styles.link} onClick={resetFlow}>
                ← Volver atrás
              </button>
            )}
            <Link href="/" className={styles.link}>Ir al inicio</Link>
          </div>
        </div>
      </div>
    </div>
  );
}