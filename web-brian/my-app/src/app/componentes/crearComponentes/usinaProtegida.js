"use client";

import { useEffect, useState } from "react";
import CrearUsina from "./crearUsina"; // Ajustá la ruta si es necesario

export default function UsinaProtegida() {
  const [logueado, setLogueado] = useState(false);
  const [verificado, setVerificado] = useState(false); // Esperamos a verificar

  useEffect(() => {
    const token = localStorage.getItem("jwt");
    if (token && token.trim() !== "") {
      setLogueado(true);
    }
    setVerificado(true); // Marcamos que ya se verificó
  }, []);

  if (!verificado) return <p>Verificando sesión...</p>;

  return (
    <div>
      {logueado ? (
        <CrearUsina />
      ) : (
        <p>Debes iniciar sesión para cargar una usina.</p>
      )}
    </div>
  );
}