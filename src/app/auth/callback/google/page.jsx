"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GoogleCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleGoogleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        console.log('Google callback - URL params:', Object.fromEntries(urlParams));
        console.log('Google callback - Hash params:', Object.fromEntries(hashParams));

        // Para web (code en query params)
        const code = urlParams.get("code");
        
        // Para mobile (token en hash)
        const accessToken = hashParams.get("access_token");
        const error = hashParams.get("error");

        if (code) {
          // Flujo web
          console.log('Google web flow - code:', code);
          if (window.opener) {
            window.opener.postMessage(
              { type: "GOOGLE_AUTH_SUCCESS", code },
              window.location.origin
            );
          }
        } else if (accessToken) {
          // Flujo mobile
          console.log('Google mobile flow - accessToken:', accessToken);
          if (window.opener) {
            window.opener.postMessage(
              { type: "GOOGLE_AUTH_SUCCESS", accessToken },
              window.location.origin
            );
          }
        } else if (error) {
          console.error('Google auth error:', error);
          if (window.opener) {
            window.opener.postMessage(
              { type: "GOOGLE_AUTH_ERROR", error },
              window.location.origin
            );
          }
        }

        // Cerrar ventana después de un tiempo
        setTimeout(() => {
          if (window.opener) {
            window.close();
          } else {
            router.push("/");
          }
        }, 1000);

      } catch (error) {
        console.error("Error en callback Google:", error);
        if (window.opener) {
          window.opener.postMessage(
            { type: "GOOGLE_AUTH_ERROR", error: error.message },
            window.location.origin
          );
        }
      }
    };

    handleGoogleCallback();
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div>Procesando autenticación de Google…</div>
    </div>
  );
}