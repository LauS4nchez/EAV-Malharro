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
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <GoogleOAuthProvider clientId={clientIDGoogle}>
          {children}
          <Toaster position="top-right" />
          <DiscordPopupHandler/>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
