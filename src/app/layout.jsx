import { Geist, Geist_Mono } from "next/font/google";
import { Inter } from "next/font/google";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { clientIDGoogle } from "./config";
import { Toaster } from "react-hot-toast";
import DiscordPopupHandler from "./services/discordPopupHandler";
import "bootstrap/dist/css/bootstrap.min.css";
import '@/styles/globals.css'

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "EAV Martín Malharro",
  description: "Escuela de Artes Visuales, Martín Malharro.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GoogleOAuthProvider clientId={clientIDGoogle}>
          {children}
          <Toaster position="top-right" />
          <DiscordPopupHandler/>
          
          {/* Script para auto-resize de textareas */}
          <script
            dangerouslySetInnerHTML={{
              __html: `
                // Función para auto-ajustar textareas
                function autoResizeTextarea(textarea) {
                  textarea.style.height = 'auto';
                  const newHeight = Math.min(textarea.scrollHeight, 300);
                  textarea.style.height = newHeight + 'px';
                }

                // Aplicar a todos los textareas existentes
                document.addEventListener('DOMContentLoaded', function() {
                  const textareas = document.querySelectorAll('textarea');
                  textareas.forEach(textarea => {
                    autoResizeTextarea(textarea);
                    
                    // Configurar para cambios futuros
                    textarea.addEventListener('input', function() {
                      autoResizeTextarea(this);
                    });
                    
                    // También ajustar cuando cambia el valor programáticamente
                    const observer = new MutationObserver(function(mutations) {
                      mutations.forEach(function(mutation) {
                        if (mutation.type === 'attributes' && mutation.attributeName === 'value') {
                          autoResizeTextarea(textarea);
                        }
                      });
                    });
                    
                    observer.observe(textarea, { 
                      attributes: true, 
                      attributeFilter: ['value'] 
                    });
                  });
                });

                // También manejar textareas dinámicos que se agreguen después
                const observer = new MutationObserver(function(mutations) {
                  mutations.forEach(function(mutation) {
                    mutation.addedNodes.forEach(function(node) {
                      if (node.nodeType === 1) { // Element node
                        if (node.tagName === 'TEXTAREA') {
                          autoResizeTextarea(node);
                          node.addEventListener('input', function() {
                            autoResizeTextarea(this);
                          });
                        } else {
                          const textareas = node.querySelectorAll && node.querySelectorAll('textarea');
                          if (textareas) {
                            textareas.forEach(function(textarea) {
                              autoResizeTextarea(textarea);
                              textarea.addEventListener('input', function() {
                                autoResizeTextarea(this);
                              });
                            });
                          }
                        }
                      }
                    });
                  });
                });

                observer.observe(document.body, {
                  childList: true,
                  subtree: true
                });
              `,
            }}
          />
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}