"use client";
import { toast } from "react-hot-toast";
import { discordService } from "@/app/services/discordService";

export const useDiscordAuth = (setStep, setEmail, setLoading, router) => {
  const discordLogin = () => {
    setLoading(true);
    
    // Abrir popup de Discord
    const popup = discordService.openAuthPopup();
    
    if (!popup || popup.closed) {
      toast.error("Por favor permite popups para este sitio");
      setLoading(false);
      return;
    }

    // Escuchar mensajes del popup
    const handleMessage = async (event) => {
      // Verificar origen por seguridad
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'DISCORD_AUTH_SUCCESS') {
        const { user, jwt } = event.data;
        
        // Guardar sesión
        localStorage.setItem("jwt", jwt);
        localStorage.setItem("userRole", user.role?.name || "Authenticated");
        
        toast.success(`¡Bienvenido ${user.username}!`);
        router.push("/");
        
        // Limpiar event listener
        window.removeEventListener('message', handleMessage);
        setLoading(false);
      }
      
      if (event.data.type === 'DISCORD_AUTH_NEEDS_PASSWORD') {
        const { email, jwt, userData } = event.data;
        
        // Usuario necesita configurar contraseña
        setEmail(email);
        setStep("setPassword");
        
        // Guardar datos temporalmente para el paso de setPassword
        localStorage.setItem("pendingDiscordAuth", JSON.stringify({
          email,
          jwt,
          userData,
          provider: 'discord'
        }));
        
        toast.success("Configura tu usuario y contraseña");
        
        // Limpiar event listener
        window.removeEventListener('message', handleMessage);
        setLoading(false);
      }
      
      if (event.data.type === 'DISCORD_AUTH_ERROR') {
        console.error('Error en auth Discord:', event.data.error);
        toast.error("Error al autenticar con Discord");
        
        // Limpiar event listener
        window.removeEventListener('message', handleMessage);
        setLoading(false);
      }
    };

    // Verificar si el popup se cerró manualmente
    const checkPopup = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkPopup);
        window.removeEventListener('message', handleMessage);
        setLoading(false);
      }
    }, 500);

    window.addEventListener('message', handleMessage);
    
    // Limpiar después de 5 minutos (timeout)
    setTimeout(() => {
      clearInterval(checkPopup);
      window.removeEventListener('message', handleMessage);
      if (!popup.closed) {
        popup.close();
        setLoading(false);
      }
    }, 5 * 60 * 1000);
  };

  return discordLogin;
};