"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "react-hot-toast";
import { discordService } from "@/app/services/discordService";

export default function DiscordCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [debugInfo, setDebugInfo] = useState("");

  const addDebug = (message) => {
    console.log(`🔍 ${message}`);
    setDebugInfo(prev => prev + `\n${new Date().toISOString()} - ${message}`);
  };

  useEffect(() => {
    const handleCallback = async () => {
      try {
        addDebug("🟡 Iniciando callback de Discord...");
        
        const code = searchParams.get('code');
        addDebug(`🔑 Code recibido: ${code ? 'SÍ (' + code.length + ' chars)' : 'NO'}`);
        
        if (!code) {
          throw new Error('No se recibió el código de autorización de Discord');
        }

        // 1. Obtener access token de Discord
        addDebug("🔄 Obteniendo access token de Discord...");
        const tokenData = await discordService.getAccessToken(code);
        addDebug(`✅ Access token recibido: ${tokenData ? 'SÍ' : 'NO'}`);
        
        // 2. Obtener información del usuario
        addDebug("🔄 Obteniendo información del usuario de Discord...");
        const discordUser = await discordService.getUserInfo(tokenData.access_token);
        addDebug(`✅ Usuario de Discord: ${discordUser.username} (${discordUser.email})`);
        
        // 3. Procesar en nuestro backend
        addDebug("🔄 Enviando datos a nuestro backend...");
        const authData = await discordService.handleDiscordAuth(discordUser);
        addDebug(`✅ Respuesta del backend: ${authData ? 'SÍ' : 'NO'}`);
        
        if (authData) {
          addDebug(`📊 Backend response: ${JSON.stringify({
            hasJwt: !!authData.jwt,
            hasUser: !!authData.user,
            loginMethods: authData.user?.loginMethods,
            username: authData.user?.username
          })}`);
        }

        // 4. Manejar respuesta del backend
        if (authData.user && authData.user.loginMethods && authData.user.loginMethods !== "both") {
          addDebug("📝 Usuario necesita configurar contraseña");
          // Usuario necesita configurar contraseña
          localStorage.setItem("pendingDiscordAuth", JSON.stringify({
            email: authData.user.email,
            jwt: authData.jwt,
            userData: authData.user
          }));
          toast.success("Configura tu usuario y contraseña");
          setTimeout(() => {
            router.push("/auth");
          }, 2000); // Delay para ver el log
        } else if (authData.jwt && authData.user) {
          addDebug("🎉 Login exitoso - redirigiendo a /");
          // Login completo
          localStorage.setItem("jwt", authData.jwt);
          localStorage.setItem("userRole", authData.user.role?.name || "Authenticated");
          localStorage.removeItem("pendingDiscordAuth");
          toast.success(`¡Bienvenido ${authData.user.username}!`);
          setTimeout(() => {
            router.push("/");
          }, 2000); // Delay para ver el log
        } else {
          throw new Error('Estructura de respuesta inválida del servidor');
        }

      } catch (error) {
        addDebug(`❌ ERROR: ${error.message}`);
        console.error('❌ Error completo en Discord callback:', error);
        
        let errorMessage = "Error al autenticar con Discord";
        
        if (error.message.includes('Failed to fetch')) {
          errorMessage = "Error de conexión con el servidor.";
        } else if (error.message.includes('401')) {
          errorMessage = "Error de autenticación con Discord.";
        } else if (error.message.includes('400')) {
          errorMessage = "Error en la solicitud.";
        } else {
          errorMessage = error.message || "Error desconocido";
        }
        
        toast.error(errorMessage, { duration: 5000 });
        setTimeout(() => {
          router.push("/auth");
        }, 3000); // Delay para ver el error
      } finally {
        setLoading(false);
      }
    };

    // Pequeño delay para asegurar que se renderice primero
    setTimeout(() => {
      handleCallback();
    }, 500);
  }, [router, searchParams]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem',
      padding: '2rem'
    }}>
      <div style={{ fontSize: '1.5rem' }}>
        {loading ? "🔄 Procesando autenticación..." : "✅ Redirigiendo..."}
      </div>
      
      {/* Debug info visible */}
      <div style={{ 
        marginTop: '2rem',
        padding: '1rem',
        backgroundColor: '#f5f5f5',
        borderRadius: '8px',
        maxWidth: '600px',
        maxHeight: '300px',
        overflow: 'auto',
        fontSize: '12px',
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap'
      }}>
        <strong>Debug Info:</strong>
        {debugInfo || "Cargando..."}
      </div>

      {loading && (
        <div style={{ 
          width: '50px', 
          height: '50px', 
          border: '3px solid #f3f3f3', 
          borderTop: '3px solid #5865F2', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
      )}
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}