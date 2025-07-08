'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from "@/app/config";
import Slider from 'react-slick'; // Librería para carruseles
import ReactMarkdown from 'react-markdown'; // Para renderizar texto con formato Markdown
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa'; // Íconos de flechas
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";

// Componente de flecha izquierda personalizada
const PrevArrow = ({ onClick }) => (
  <button className="custom-arrow prev-arrow" onClick={onClick}>
    <FaArrowLeft />
  </button>
);

// Componente de flecha derecha personalizada
const NextArrow = ({ onClick }) => (
  <button className="custom-arrow next-arrow" onClick={onClick}>
    <FaArrowRight />
  </button>
);

export default function Agenda() {
  const sliderRef = useRef(null); // Referencia al componente Slider
  const [agendas, setAgendas] = useState([]); // Lista de eventos o actividades

  // Efecto que carga los datos de la API al montar el componente
  useEffect(() => {
    async function fetchAgendas() {
      try {
        // Llama a la API de agendas incluyendo las imágenes
        const res = await fetch(`${API_URL}/agendas?populate=imagen`, {
          cache: "no-store", // Evita usar caché (siempre solicita datos nuevos)
        });
        if (!res.ok) {
          console.error("Error en fetch:", res.statusText);
          return;
        }

        const { data } = await res.json(); // Extrae los datos del JSON
        setAgendas(data); // Almacena los datos en el estado
      } catch (err) {
        console.error("Error en getAgendas:", err);
      }
    }

    fetchAgendas();
  }, []);

  // Configuración del carrusel
  const settings = {
    dots: false,
    infinite: true,
    speed: 300,
    slidesToShow: 3,
    slidesToScroll: 1,
    arrows: true,
    autoplay: false,
    adaptiveHeight: true,
    swipe: true,
    touchThreshold: 100,
    centerMode: true,
    centerPadding: "0px",
    nextArrow: <NextArrow />,
    prevArrow: <PrevArrow />,
    responsive: [
      {
        breakpoint: 1200,
        settings: {
          slidesToShow: 2, // En pantallas medianas muestra 2
        },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 1, // En pantallas pequeñas muestra 1
        },
      },
    ],
  };

  return (
    <div className="agenda-wrapper">
      {/* Si no hay datos disponibles, muestra un mensaje */}
      {agendas.length === 0 ? (
        <p>No hay datos disponibles.</p>
      ) : (
        // Muestra el carrusel de agendas con sus datos
        <Slider ref={sliderRef} {...settings}>
          {agendas.map((item) => {
            const { id, tituloActividad, contenidoActividad, fecha, imagen } = item;
            const imageUrl = imagen.url;

            return (
              <div key={id} className="agenda-container">
                <div className="agenda-card">
                  {/* Imagen principal del evento */}
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Imagen del evento"
                      className="imagen-agenda"
                    />
                  )}

                  {/* Información visible siempre */}
                  <div className="agenda-contenido">
                    <div className="fecha">
                      <p>{fecha}</p>
                    </div>
                    {/* Título renderizado como markdown */}
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="texto-regular" {...props} />,
                        strong: ({ node, ...props }) => <strong className="texto-negrita" {...props} />
                      }}
                    >
                      {tituloActividad}
                    </ReactMarkdown>
                  </div>

                  {/* Información que aparece al pasar el mouse */}
                  <div className="agenda-contenido-hover">
                    <ReactMarkdown
                      components={{
                        p: ({ node, ...props }) => <p className="texto-regular" {...props} />,
                        strong: ({ node, ...props }) => <strong className="texto-negrita" {...props} />
                      }}
                    >
                      {tituloActividad}
                    </ReactMarkdown>

                    {/* Texto adicional del evento */}
                    <div className="texto-contenido-actividad">
                      <p>{contenidoActividad}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </Slider>
      )}
    </div>
  );
}
