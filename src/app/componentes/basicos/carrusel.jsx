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
  const [title, setTitle] = useState(''); // ← Mantenemos el estado del título

  // Configuración del carrusel con flechas personalizadas
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
    touchThreshold: 100,
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />
  };

  // Carga las imágenes del carrusel
  useEffect(() => {
    fetch(`${API_URL}/carrusels?populate=carrusel`)
      .then(res => res.json())
      .then(data => {
        const item = data.data?.[0];
        if (item) {
          setTitle(item.title); // ← Seteamos el título global
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
                }}
              >
                {/* Título global - aparece en todas las imágenes */}
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

// Componentes de flechas
const PrevArrow = ({ onClick }) => (
  <button className="slick-prev" onClick={onClick}>
    <FaArrowLeft color="white" size={20} />
  </button>
);

const NextArrow = ({ onClick }) => (
  <button className="slick-next" onClick={onClick}>
    <FaArrowRight color="white" size={20} />
  </button>
);