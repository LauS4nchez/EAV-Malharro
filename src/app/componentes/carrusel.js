'use client';

import { useEffect, useRef, useState } from 'react';
import Slider from 'react-slick';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

export default function Carrusel() {
  const sliderRef = useRef(null); // Referencia al componente Slider
  const [imagenesCarrusel, setImagenesCarrusel] = useState([]); // Estado para almacenar las imágenes
  const URL = "https://proyectomalharro.onrender.com"; // Base URL de la API

  // Configuración del carrusel
  const settings = {
    dots: false,
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: false,
    fade: false,
    adaptiveHeight: true,
    swipe: true,
    touchThreshold: 100
  };

  // Obtiene las imágenes del carrusel al montar el componente
  useEffect(() => {
    fetch(`${URL}/api/carrusels?populate=carrusel`)
      .then(res => res.json())
      .then(data => {
        const imagenes = data.data?.[0]?.carrusel ?? []; // Manejo seguro de datos
        setImagenesCarrusel(imagenes);
      })
      .catch(err => console.error('Error al cargar imágenes:', err));
  }, []);

  return (
    <div style={{ width: '100%', margin: '0 auto', position: 'relative' }}>
      <Slider ref={sliderRef} {...settings}>
        {imagenesCarrusel.map((imagen, index) => (
          <div key={`slide-${index}`} style={{ width: '100%' }}>
            <img
              src={`${imagen.formats?.thumbnail.url || imagen.url}`} // Fallback a imagen.url si formats no existe
              alt={`Slide ${index + 1}`}
              style={{
                maxHeight: '70vh',
                width: '300px',
                margin: '30px auto 0',
                display: 'block',
                borderRadius: '5px'
              }}
            />
          </div>
        ))}
      </Slider>
    </div>
  );
}