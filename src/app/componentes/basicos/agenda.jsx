'use client';

import { useEffect, useRef, useState } from 'react';
import { API_URL } from "@/app/config";
import Slider from 'react-slick';
import ReactMarkdown from 'react-markdown';
import { FaArrowLeft, FaArrowRight } from 'react-icons/fa';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import styles from "@/styles/components/Agenda/Agenda.module.css";

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

  useEffect(() => {
    async function fetchAgendas() {
      try {
        const res = await fetch(`${API_URL}/agendas?populate=imagen`, {
          cache: "no-store",
        });
        if (!res.ok) {
          console.error("Error en fetch:", res.statusText);
          return;
        }

        const { data } = await res.json();
        setAgendas(data);
      } catch (err) {
        console.error("Error en getAgendas:", err);
      }
    }

    fetchAgendas();
  }, []);

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
          slidesToShow: 2,
        },
      },
      {
        breakpoint: 900,
        settings: {
          slidesToShow: 1,
        },
      },
    ],
  };

  return (
    <div className={styles.agendaWrapper}>
      {agendas.length === 0 ? (
        <p>No hay datos disponibles.</p>
      ) : (
        <Slider ref={sliderRef} {...settings}>
          {agendas.map((item) => {
            const { id, tituloActividad, contenidoActividad, fecha, imagen } = item;
            const imageUrl = imagen.url;

            return (
              <div key={id} className={styles.agendaContainer}>
                <div className={styles.agendaCard}>
                  {imageUrl && (
                    <img
                      src={imageUrl}
                      alt="Imagen del evento"
                      className={styles.imagenAgenda}
                    />
                  )}

                  <div className={styles.agendaContenido}>
                    <div className={styles.fecha}>
                      <p>{fecha}</p>
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
    </div>
  );
}