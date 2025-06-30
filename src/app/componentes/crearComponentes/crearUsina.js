"use client";

import { useState } from "react";

const STRAPI_URL = "https://proyectomalharro.onrender.com";

export default function CrearUsina() {
  const [nombre, setNombre] = useState("");
  const [carrera, setCarrera] = useState("");
  const [link, setLink] = useState("");
  const [imagen, setImagen] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      // Subir imagen
      const formData = new FormData();
      formData.append("files", imagen);

      const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadRes.json();
      const imagenId = uploadData[0]?.id;

      if (!imagenId) throw new Error("Error al subir la imagen.");

      // Crear usina
      const res = await fetch(`${STRAPI_URL}/api/usinas`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: {
            nombre,
            carrera,
            link,
            imagen: imagenId,
          },
        }),
      });

      if (!res.ok) throw new Error("No se pudo crear la usina");

      // Limpiar formulario
      setNombre("");
      setCarrera("");
      setLink("");
      setImagen(null);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} className="form-in-container">
        <h2>Agregar nueva usina</h2>
        <div className="form-group">
          <label className="block form-label">Nombre Completo</label>
          <input
            className="form-input"
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            required
          />
        </div>

        <div className="form-group">
          <label className="block form-label">Carrera</label>
          <input
            className="form-input"
            type="text"
            value={carrera}
            onChange={(e) => setCarrera(e.target.value)}
            placeholder="Carrera"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block form-label">Contacto</label>
          <input
            className="form-input"
            type="url"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Link"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="block form-label">Trabajo</label>
          <input
            className="form-input"
            type="file"
            onChange={(e) => setImagen(e.target.files[0])}
            accept="image/*"
            required
          />
        </div>

        <button type="submit" className="form-button">Crear Usina</button>
      </form>
    </div>
  );
}