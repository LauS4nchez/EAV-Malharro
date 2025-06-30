"use client";

import { useEffect, useState } from "react";

export default function textoProtegido() {
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
        true
      ) : (
        false
      )}
    </div>
  );
}