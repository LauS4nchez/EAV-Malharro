"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Browser } from "@capacitor/browser";
import { toast } from "react-hot-toast";
import { API_URL } from "@/app/config";

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      
      if (!code) {
        console.error('❌ No code received in callback');
        if (window.Capacitor) {
          window.location.href = 'malharro://login?error=no_code_received';
        } else {
          toast.error("No se recibió código de autorización");
          router.push("/login");
        }
        return;
      }

      try {
        console.log('🔧 Processing Google callback with code:', code.substring(0, 20) + '...');

        // Intercambiar code por token
        const tokenResponse = await fetch("/api/google/auth", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            code: code,
            redirectUri: 'https://eav-malharro.onrender.com/auth/callback/google'
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          throw new Error(`Token exchange failed: ${errorText}`);
        }

        const tokenData = await tokenResponse.json();
        
        if (!tokenData.access_token) {
          throw new Error("No access token received from Google");
        }

        // Obtener info del usuario
        const userResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
          headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        
        if (!userResponse.ok) {
          throw new Error("Failed to get user info from Google");
        }

        const userData = await userResponse.json();

        // Login con Strapi
        const authRes = await fetch(`${API_URL}/google-auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            email: userData.email, 
            googleId: userData.sub, 
            name: userData.name || userData.email.split('@')[0]
          }),
        });

        if (!authRes.ok) {
          const errorText = await authRes.text();
          throw new Error(`Strapi login failed: ${errorText}`);
        }

        const authData = await authRes.json();
        
        console.log('✅ Google login response:', authData);

        // VERIFICAR SI NECESITA SET PASSWORD
        if (authData.user?.loginMethods !== "both") {
          // Usuario necesita configurar contraseña
          console.log('🔧 User needs to set password');
          
          if (window.Capacitor) {
            // Redirigir a la app con información para setPassword
            const appUrl = `malharro://login/setPassword?email=${encodeURIComponent(authData.user.email)}&jwt=${encodeURIComponent(authData.jwt)}`;
            console.log('🔧 Redirecting to setPassword:', appUrl);
            window.location.href = appUrl;
          } else {
            // En web - guardar en localStorage y redirigir a setPassword
            localStorage.setItem("pendingGoogleAuth", JSON.stringify({
              email: authData.user.email,
              jwt: authData.jwt
            }));
            router.push("/login?step=setPassword");
          }
        } else {
          // Login completo - usuario ya tiene ambos métodos
          console.log('✅ User has both login methods, login complete');
          
          if (window.Capacitor) {
            // Redirigir a la app con éxito completo
            const appUrl = `malharro://login/success?jwt=${encodeURIComponent(authData.jwt)}&user=${encodeURIComponent(JSON.stringify(authData.user))}`;
            console.log('🔧 Redirecting to success:', appUrl);
            window.location.href = appUrl;
          } else {
            // En web - login completo
            localStorage.setItem("jwt", authData.jwt);
            localStorage.setItem("userRole", authData.user?.role?.name || "Authenticated");
            toast.success(`¡Bienvenido ${authData.user?.username || userData.name}!`);
            router.push("/");
          }
        }

      } catch (err) {
        console.error("❌ Google callback error:", err);
        
        if (window.Capacitor) {
          const errorUrl = `malharro://login?error=${encodeURIComponent(err.message)}`;
          console.log('🔧 Redirecting to app with error:', errorUrl);
          window.location.href = errorUrl;
        } else {
          toast.error("Error en autenticación: " + err.message);
          router.push("/login");
        }
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Procesando autenticación de Google…</div>
    </div>
  );
}