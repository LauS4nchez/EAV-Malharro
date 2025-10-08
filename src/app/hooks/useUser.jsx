"use client"
import { useState, useEffect } from "react";
import { API_URL } from "../config";

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("jwt"); // o donde guardes el JWT
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const res = await fetch(`${API_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!res.ok) throw new Error("No autorizado");

        const data = await res.json();
        setUser({
          nombre: data.username,
          email: data.email
        });
      } catch (err) {
        console.error("Error al obtener usuario:", err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  return { user, loading };
}
