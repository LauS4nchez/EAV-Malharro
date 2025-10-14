"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { API_URL, API_TOKEN } from "@/app/config";
import { toast } from "react-hot-toast";
import Link from "next/link";
import LoginWithGoogle from "./loginWithGoogle";
import styles from '@/styles/components/Login.module.css';

export default function UnifiedAuth() {
  const [step, setStep] = useState('email'); // 'email', 'login', 'register'
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validaciones
  const validateEmail = (email) => /^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
  const validateUsername = (username) => /^[a-zA-Z][a-zA-Z0-9._]{2,19}$/.test(username);
  const validatePassword = (password) => /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(password);

  // Paso 1: Verificar email
  const checkEmail = async (e) => {
    e.preventDefault();
    
    if (!validateEmail(email)) {
      toast.error("Por favor, ingresa un email válido.");
      return;
    }

    setLoading(true);
    try {
      // Verificar si el usuario existe
      const userCheckRes = await fetch(
        `${API_URL}/users?filters[email][$eq]=${encodeURIComponent(email)}`,
        {
          headers: {
            Authorization: `Bearer ${API_TOKEN}`,
          },
        }
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
      toast.error("Error al verificar el email. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  // Login
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/local`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: email, password }),
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data?.error?.message || "Contraseña incorrecta");

      localStorage.setItem("jwt", data.jwt);
      toast.success(`¡Bienvenido de vuelta, ${data.user.username}!`);
      router.push("/");
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Registro
  const handleRegister = async (e) => {
    e.preventDefault();

    if (!validateUsername(username)) {
      toast.error("Usuario inválido. Use 3-20 caracteres, empezando con letra, y solo letras, números, '.' o '_'.");
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
        toast.success(`¡Cuenta creada! Bienvenido, ${data.user.username}`);
        router.push("/");
      } else {
        if (data.error?.message?.includes('username')) {
          toast.error("El nombre de usuario ya está en uso. Elige otro.");
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

  // Volver al inicio
  const resetFlow = () => {
    setStep('email');
    setEmail("");
    setUsername("");
    setPassword("");
  };

  return (
    <div className={styles.container}>
      <div className={styles.formCard}>
        <h2 className={styles.title}>
          {step === 'email' && 'Ingresa a tu cuenta'}
          {step === 'login' && 'Iniciar sesión'}
          {step === 'register' && 'Crear cuenta'}
        </h2>

        <div className={styles.stepIndicator}>
          {step === 'email' && 'Ingresa tu email para continuar'}
          {step === 'login' && `Ingresa tu contraseña para ${email}`}
          {step === 'register' && `Completa tu registro para ${email}`}
        </div>

        <form onSubmit={
          step === 'email' ? checkEmail :
          step === 'login' ? handleLogin :
          handleRegister
        } className={styles.form}>
          
          {/* Paso 1: Email */}
          {step === 'email' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Correo electrónico</label>
              <input
                type="email"
                placeholder="tu@email.com"
                className={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          {/* Paso 2: Login (solo contraseña) */}
          {step === 'login' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Contraseña</label>
              <input
                type="password"
                placeholder="Ingresa tu contraseña"
                className={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoFocus
              />
            </div>
          )}

          {/* Paso 3: Registro (usuario y contraseña) */}
          {step === 'register' && (
            <>
              <div className={styles.formGroup}>
                <label className={styles.label}>Nombre de usuario</label>
                <input
                  type="text"
                  placeholder="Elige un nombre de usuario"
                  className={styles.input}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>Contraseña</label>
                <input
                  type="password"
                  placeholder="Crea una contraseña segura"
                  className={styles.input}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </>
          )}

          <button 
            type="submit" 
            className={styles.primaryButton}
            disabled={loading}
          >
            {loading ? (
              <span className={styles.loading}></span>
            ) : (
              step === 'email' ? 'Continuar' :
              step === 'login' ? 'Ingresar' : 'Crear cuenta'
            )}
          </button>
        </form>

        {/* Botón de Google */}
        {(step === 'email') && (
          <>
            <div className={styles.divider}>
              <span>o continuar con</span>
            </div>
            <LoginWithGoogle mode="login" />
          </>
        )}

        {/* Botones secundarios */}
        <div className={styles.secondaryButtons}>
          {step !== 'email' && (
            <button 
              type="button" 
              className={styles.secondaryButton}
              onClick={resetFlow}
            >
              Volver
            </button>
          )}
          
          <Link href="/" className={styles.secondaryButton}>
            <button type="button" className={styles.secondaryButton}>
              Inicio
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}