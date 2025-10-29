"use client";
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { discordService } from '@/app/services/discordService';

export default function DiscordPopupHandler() {
  const router = useRouter();

  useEffect(() => {
    // Escuchar mensajes desde el popup
    const handleMessage = async (event) => {
      // Verificar origen del mensaje por seguridad
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'DISCORD_AUTH_SUCCESS') {
        const { user, jwt } = event.data;
        
        // Guardar sesión
        localStorage.setItem("jwt", jwt);
        localStorage.setItem("userRole", user.role?.name || "Authenticated");
        
        // Cerrar popup si está abierto
        if (window.opener) {
          window.close();
        }
        
        // Redirigir o recargar
        window.location.href = '/';
      }
      
      if (event.data.type === 'DISCORD_AUTH_ERROR') {
        console.error('Error en auth Discord:', event.data.error);
        // Manejar error
        if (window.opener) {
          window.close();
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  return null; // Componente invisible
}