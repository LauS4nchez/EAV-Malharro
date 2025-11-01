'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from '@/app/config';
import Slider from 'react-slick';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import styles from "@/styles/components/Carrusel/Carousel.module.css";

export default function Carrusel() {
  const sliderRef = useRef(null);
  const [imagenesCarrusel, setImagenesCarrusel] = useState([]);
  const [title, setTitle] = useState('');

  // Configuración responsive del carrusel
  const settings = {
    dots: true, // ← ACTIVAMOS LOS DOTS
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: true,
    autoplay: false,
    fade: false,
    adaptiveHeight: false,
    swipe: true,
    touchThreshold: 50,
    swipeToSlide: true,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 480, // En móviles pequeños
        settings: {
          arrows: false, // ← OCULTAMOS FLECHAS
          dots: true     // ← MANTENEMOS DOTS VISIBLES
        }
      }
    ]
  };

  useEffect(() => {
    fetch(`${API_URL}/carrusels?populate=carrusel`)
      .then(res => res.json())
      .then(data => {
        const item = data.data?.[0];
        if (item) {
          setTitle(item.title);
          setImagenesCarrusel(item.carrusel ?? []);
        }
      })
      .catch(err => console.error('Error al cargar imágenes:', err));
  }, []);

  return (
    <div className={styles.carruselContainer}>
      <Slider ref={sliderRef} {...settings}>
        {imagenesCarrusel.map((imagen, index) => {
          const url = imagen.formats?.large?.url || imagen.url;
          return (
            <div key={`slide-${index}`} style={{ width: '100%' }}>
              <div
                className={styles.carruselImg}
                style={{
                  backgroundImage: `linear-gradient(rgba(120, 51, 51, 0.5), rgba(0, 0, 0, 0.5)), url(${url})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat'
                }}
              >
                {title && (
                  <div className={styles.titulo}>
                    <ReactMarkdown>{title}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </Slider>
    </div>
  );
}

// Componentes de flechas (se ocultarán en móviles)
const PrevArrow = ({ onClick }) => (
  <button 
    className="slick-prev" 
    onClick={onClick}
    aria-label="Imagen anterior"
  >
    <FaArrowLeft color="white" size={20} />
  </button>
);

const NextArrow = ({ onClick }) => (
  <button 
    className="slick-next" 
    onClick={onClick}
    aria-label="Siguiente imagen"
  >
    <FaArrowRight color="white" size={20} />
  </button>
);