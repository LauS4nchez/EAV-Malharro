"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-hot-toast";
import Link from "next/link";

import { useGoogleAuthCross } from "@/app/hooks/useGoogleAuthCross";
import { useDiscordAuthCross } from "@/app/hooks/useDiscordAuthCross";
import { useDeepLinks } from "@/app/hooks/useDeepLinks";

import { authService, validateEmail, validateUsername, validatePassword } from "@/app/services/authService";
import styles from "@/styles/components/Login/Login.module.css";

export default function UnifiedAuth() {
  const [step, setStep] = useState("email");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Usar el hook de deep links para mobile
  useDeepLinks();

  useEffect(() => {
    // Verificar auth pendiente al cargar
    const pendingDiscordAuth = localStorage.getItem("pendingDiscordAuth");
    const pendingGoogleAuth = localStorage.getItem("pendingGoogleAuth");
    
    if (pendingDiscordAuth) {
      const { email } = JSON.parse(pendingDiscordAuth);
      setEmail(email);
      setStep("setPassword");
    }
    
    if (pendingGoogleAuth) {
      const { email } = JSON.parse(pendingGoogleAuth);
      setEmail(email);
      setStep("setPassword");
    }

    // Verificar parámetro de URL para setPassword
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('step') === 'setPassword') {
      const pendingAuth = localStorage.getItem("pendingGoogleAuth") || localStorage.getItem("pendingDiscordAuth");
      if (pendingAuth) {
        const { email } = JSON.parse(pendingAuth);
        setEmail(email);
        setStep("setPassword");
      }
    }
  }, []);

  // Manejar eventos de deep links
  useEffect(() => {
    const handleAuthSetPassword = (event) => {
      if (event.detail?.email) {
        setEmail(event.detail.email);
        setStep("setPassword");
        // Guardar el JWT temporalmente para usarlo después
        if (event.detail.jwt) {
          localStorage.setItem("tempJwt", event.detail.jwt);
        }
      }
    };

    const handleAuthSuccess = (event) => {
      if (event.detail?.user && event.detail?.jwt) {
        localStorage.setItem("jwt", event.detail.jwt);
        localStorage.setItem("userRole", event.detail.user.role?.name || "Authenticated");
        toast.success(`¡Bienvenido ${event.detail.user.username}!`);
        router.push("/");
      }
    };

    window.addEventListener('authSetPassword', handleAuthSetPassword);
    window.addEventListener('authSuccess', handleAuthSuccess);

    return () => {
      window.removeEventListener('authSetPassword', handleAuthSetPassword);
      window.removeEventListener('authSuccess', handleAuthSuccess);
    };
  }, [router]);

  const { signIn: googleLogin } = useGoogleAuthCross({ setStep, setEmail, setLoading, router });
  const discordLogin = useDiscordAuthCross({ setStep, setEmail, setLoading, router });

  const checkEmail = async (e) => {
    e.preventDefault();
    if (!validateEmail(email)) {
      toast.error("Por favor, ingresa un email válido.");
      return;
    }
    setLoading(true);
    try {
      const userExists = await authService.checkEmail(email);
      if (userExists) {
        setStep("login");
        toast.success("Usuario encontrado. Ingresa tu contraseña.");
      } else {
        setStep("register");
        toast.success("Crea tu cuenta. Elige un nombre de usuario y contraseña.");
      }
    } catch (error) {
      console.error("Error al verificar email:", error);
      toast.error("Error al verificar el email.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      localStorage.setItem("jwt", data.jwt);
      const meData = await authService.getMe(data.jwt);
      localStorage.setItem("userRole", meData.role?.name || "Authenticated");
      toast.success(`¡Bienvenido de vuelta, ${meData.username}!`);
      router.push("/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

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
      const data = await authService.register(username, email, password);
      localStorage.setItem("jwt", data.jwt);
      localStorage.setItem("userRole", data.user.role?.name || "Authenticated");
      toast.success(`¡Cuenta creada! Bienvenido, ${data.user.username}`);
      router.push("/");
    } catch (error) {
      console.error("Error:", error);
      if (error.message.includes("username")) {
        toast.error("El nombre de usuario ya está en uso.");
      } else if (error.message.includes("email")) {
        toast.error("El email ya está registrado. Intenta iniciar sesión.");
        setStep("login");
      } else {
        toast.error(error.message || "Hubo un error en el registro.");
      }
    } finally {
      setLoading(false);
    }
  };

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
      let data;
      const pendingDiscordAuth = localStorage.getItem("pendingDiscordAuth");
      const pendingGoogleAuth = localStorage.getItem("pendingGoogleAuth");
      const tempJwt = localStorage.getItem("tempJwt");
      
      if (pendingDiscordAuth) {
        data = await authService.setPasswordWithProvider(email, username, password, "discord");
        localStorage.removeItem("pendingDiscordAuth");
      } else if (pendingGoogleAuth || tempJwt) {
        // Para Google, usa el JWT temporal para linkear la cuenta
        data = await authService.setPasswordWithProvider(email, username, password, "google", tempJwt);
        localStorage.removeItem("pendingGoogleAuth");
        localStorage.removeItem("tempJwt");
      } else {
        data = await authService.setPassword(email, username, password);
      }
      
      localStorage.setItem("jwt", data.jwt);
      localStorage.setItem("userRole", data.user.role?.name || "Authenticated");
      toast.success(`Cuenta configurada correctamente.`);
      router.push("/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep("email");
    setEmail("");
    setUsername("");
    setPassword("");
    localStorage.removeItem("pendingDiscordAuth");
    localStorage.removeItem("pendingGoogleAuth");
    localStorage.removeItem("tempJwt");
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>
            {step === "email" && "Ingresa a tu cuenta"}
            {step === "login" && "Iniciar sesión"}
            {step === "register" && "Crear cuenta"}
            {step === "setPassword" && "Configurar cuenta"}
          </h2>
          <p className={styles.stepIndicator}>
            {step === "email" && "Ingresa tu email para continuar"}
            {step === "login" && `Ingresa tu contraseña para ${email}`}
            {step === "register" && `Completa tu registro para ${email}`}
            {step === "setPassword" && `Establece tu usuario y contraseña para ${email}`}
          </p>
        </div>

        <div className={styles.cardBody}>
          <form
            onSubmit={
              step === "email"
                ? checkEmail
                : step === "login"
                ? handleLogin
                : step === "register"
                ? handleRegister
                : (e) => e.preventDefault()
            }
            className={styles.form}
          >
            {step === "email" && (
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

            {step === "login" && (
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

            {step === "register" && (
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

            {step === "setPassword" && (
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
                <button type="button" className={styles.btnPrimary} disabled={loading} onClick={handleSetPassword}>
                  {loading ? "Guardando..." : "Guardar y continuar"}
                </button>
              </>
            )}

            {step !== "setPassword" && (
              <button type="submit" className={styles.btnPrimary} disabled={loading}>
                {loading
                  ? "Cargando..."
                  : step === "email"
                  ? "Continuar"
                  : step === "login"
                  ? "Ingresar"
                  : "Crear cuenta"}
              </button>
            )}
          </form>

          {step === "email" && (
            <>
              <div className={styles.divider}><span>o continuar con</span></div>

              <button className={styles.googleButton} onClick={() => googleLogin()} type="button" disabled={loading}>
                {/* SVG Google */}
                <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
                Continuar con Google
              </button>

              <button className={styles.discordButton} onClick={() => discordLogin()} type="button" disabled={loading}>
                {/* SVG Discord */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.27 5.33C17.94 4.71 16.5 4.26 15 4a.09.09 0 0 0-.07.03c-.18.33-.39.76-.53 1.09a16.09 16.09 0 0 0-4.8 0c-.14-.34-.35-.76-.54-1.09c-.01-.02-.04-.03-.07-.03c-1.5.26-2.93.71-4.27 1.33c-.01 0-.02.01-.03.02c-2.72 4.07-3.47 8.03-3.1 11.95c0 .02.01.04.03.05c1.8 1.32 3.53 2.12 5.24 2.65c.03.01.06 0 .07-.02c.4-.55.76-1.13 1.07-1.74c.02-.04 0-.08-.04-.09c-.57-.22-1.11-.48-1.64-.78c-.04-.02-.04-.08-.01-.11c.11-.08.22-.17.33-.25c.02-.02.05-.02.07-.01c3.44 1.57 7.15 1.57 10.55 0c.02-.01.05-.01.07.01c.11.09.22.17.33.25c.04.03.04.09-.01.11c-.52.31-1.07.56-1.64.78c-.04.01-.05.06-.04.09c.32.61.68 1.19 1.07 1.74c.03.01.06.02.09.01c1.72-.53 3.45-1.33 5.25-2.65c.02-.01.03-.03.03-.05c.44-4.53-.73-8.46-3.1-11.95c-.01-.01-.02-.02-.04-.02zM8.52 14.91c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.84 2.12-1.89 2.12zm6.97 0c-1.03 0-1.89-.95-1.89-2.12s.84-2.12 1.89-2.12c1.06 0 1.9.96 1.89 2.12c0 1.17-.83 2.12-1.89 2.12z"/>
                </svg>
                Continuar con Discord
              </button>
            </>
          )}

          <div className={styles.links}>
            {step !== "email" && (
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