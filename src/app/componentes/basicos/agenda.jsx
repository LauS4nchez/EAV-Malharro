'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { API_URL } from "@/app/config";
import Slider from 'react-slick';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import styles from "@/styles/components/Agenda/Agenda.module.css";

/** Flechas personalizadas para slick (usamos nuestros estilos y los íconos de react-icons) */
const PrevArrow = ({ onClick }) => (
  <button className={`${styles.customArrow} ${styles.prevArrow}`} onClick={onClick}>
    <FaArrowLeft />
  </button>
);

const NextArrow = ({ onClick }) => (
  <button className={`${styles.customArrow} ${styles.nextArrow}`} onClick={onClick}>
    <FaArrowRight />
  </button>
);

export default function Agenda() {
  const sliderRef = useRef(null);
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [slidesToShow, setSlidesToShow] = useState(3); // Estado para slides visibles

  /** Carga inicial: obtiene agendas con imagen; ordena por fecha desc y limita a 7 */
  useEffect(() => {
    async function fetchAgendas() {
      try {
        const res = await fetch(`${API_URL}/agendas?populate=imagen`, { cache: 'no-store' });
        if (!res.ok) {
          console.error("Error en fetch:", res.statusText);
          return;
        }
        const { data } = await res.json();

        const sorted = data
          .filter(item => item.fecha)
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha))
          .slice(0, 7);

        setAgendas(sorted);
        setCurrentSlide(0);
      } catch (err) {
        console.error("Error en getAgendas:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAgendas();
  }, []);

  // Detectar cambios en el número de slides visibles
  const handleBeforeChange = (oldIndex, newIndex) => {
    // Esta función se ejecuta antes del cambio, podemos usarla para detectar el breakpoint actual
    if (window.innerWidth <= 900) {
      setSlidesToShow(1);
    } else if (window.innerWidth <= 1200) {
      setSlidesToShow(2);
    } else {
      setSlidesToShow(3);
    }
  };

  const settings = {
    dots: false,
    infinite: agendas.length > 3,
    speed: 300,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    autoplay: false,
    adaptiveHeight: false,
    swipe: true,
    touchThreshold: 100,
    centerMode: true,
    centerPadding: "0px",
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    beforeChange: handleBeforeChange, // 🔥 Nueva función para detectar breakpoints
    afterChange: (current) => setCurrentSlide(current),
    responsive: [
      { 
        breakpoint: 1200, 
        settings: { 
          slidesToShow: 2,
          centerMode: true
        } 
      },
      { 
        breakpoint: 900, 
        settings: { 
          slidesToShow: 1, 
          centerMode: false 
        } 
      },
      {
        breakpoint: 600,
        settings: { 
          slidesToShow: 1, 
          arrows: false, 
          dots: true, 
          centerMode: false 
        },
      },
    ],
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando agendas...</p>
      </div>
    );
  }

  return (
    <div className={styles.agendaWrapper}>
      {agendas.length === 0 ? (
        <p>No hay datos disponibles.</p>
      ) : (
        <Slider ref={sliderRef} {...settings}>
          {agendas.map((item, index) => {
            const { id, tituloActividad, contenidoActividad, fecha, imagen } = item;

            const imageUrl = imagen?.url || imagen?.data?.attributes?.url || "";

            // 🔥 LÓGICA CORREGIDA: Solo desactivar hover cuando hay centerMode activo
            // En móvil (slidesToShow = 1), todas las agendas pueden hacer hover
            const isCenter = slidesToShow > 1 ? index === currentSlide : true;
            const canHoverClass = isCenter ? styles.canHover : styles.noHover;

            return (
              <div key={id} className={styles.agendaContainer}>
                <div className={`${styles.agendaCard} ${canHoverClass}`}>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Imagen del evento"
                      className={styles.imagenAgenda}
                    />
                  )}

                  {/* Vista compacta (siempre visible) */}
                  <div className={styles.agendaContenido}>
                    <div className={styles.fecha}>
                      <p>{new Date(fecha).toLocaleDateString("es-AR")}</p>
                    </div>
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className={styles.textoRegular} {...props} />,
                        strong: ({ node, ...props }) => <strong className={styles.textoNegrita} {...props} />
                      }}
                    >
                      {tituloActividad}
                    </ReactMarkdown>
                  </div>

                  {/* Overlay con detalle (aparece en hover si .canHover) */}
                  <div className={styles.agendaContenidoHover}>
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className={styles.textoRegular} {...props} />,
                        strong: ({ node, ...props }) => <strong className={styles.textoNegrita} {...props} />
                      }}
                    >
                      {tituloActividad}
                    </ReactMarkdown>
                    <div className={styles.textoContenidoActividad}>
                      <p>{contenidoActividad}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Slider>
      )}

      {/* CTA al calendario completo */}
      <div className={styles.ctaCalendario}>
        <Link href="/agendas" className={styles.verCalendarioBtn}>
          Ver Calendario
        </Link>
      </div>
    </div>
  );
}