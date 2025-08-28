"use client"
import { useUser } from "../../hooks/useUser";
import { useState } from "react";

export const UserMenu = () => {
  const { user, loading } = useUser();
  const [open, setOpen] = useState(false);

  if (loading) return null; // O un spinner

  if (!user) return null; // Si no hay usuario, no mostramos nada

  const handleLogout = () => {
    localStorage.removeItem("jwt");
    window.location.reload(); // O redirigir al login
  };

  return (
    <div style={{ position: "fixed", top: "10px", right: "10px", zIndex: 1000 }}>
<button className="user-menu-btn" onClick={() => setOpen(!open)}>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
    <path d="M3 14s-1 0-1-1 1-4 6-4 6 3 6 4-1 1-1 1H3zm5-6a3 3 0 1 0-3-3 3 3 0 0 0 3 3z"/>
  </svg>
</button>

{open && (
  <div className="user-menu-dropdown">
    <p><strong>{user.nombre}</strong></p>
    <p>{user.email}</p>
    <button onClick={handleLogout}>Cerrar sesión</button>
  </div>
)}
    </div>
  );
}
