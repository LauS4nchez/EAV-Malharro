'use client';
import { useState, useEffect } from "react";
import CircularContainer from "./componentes/basicos/acordeon/CircularContainerAcordeon";
import Acordeon from "./componentes/basicos/acordeon/acordeon";
import Header from "./componentes/construccion/Header";
import Carrusel from './componentes/basicos/carrusel';
import Agenda from './componentes/basicos/agenda';
import Footer from "./componentes/construccion/Footer";
import Usina from "./componentes/basicos/usina/usina";
import { Texto } from "./componentes/basicos/texto/text";
import Spinner from "./componentes/construccion/Spinner";
import styles from "@/styles/components/Construccion/Common.module.css";
import textStyles from "@/styles/components/Texto/TextComponents.module.css";

export default function Page() {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleLoad = () => {
      setTimeout(() => setLoading(false), 3000); // Retardo 
    };

    if (document.readyState === "complete") handleLoad();
    else window.addEventListener("load", handleLoad);

    return () => window.removeEventListener("load", handleLoad);
  }, []);

  return (
    <>
      <Spinner visible={loading} />

      <div className="home">
        <Header/>
        <div className={styles.carruselContainer}>
          <Carrusel />
        </div>

        <div className={`${textStyles.textosRow} mt-5`}>
          <div className={textStyles.textoContenedor}>
            <h3><Texto textoID="texto-introduccion" /></h3>
          </div>
          <div className={textStyles.textoContenedor2}>
            <h4><Texto textoID="texto-introduccion2" /></h4>
          </div>
        </div>

        <div id="carreras">
          <CircularContainer title="Nuestras Carreras">
            <Acordeon acordeonID="carreras" variant="carreras"/>
          </CircularContainer>
        </div>

        <div className={styles.titleAgenda}>
          <h2 id="agenda">Agenda</h2>
        </div>
        <div className={styles.agendaSection}>
          <Agenda />
        </div>

        <div className={`${textStyles.textosRow} mt-5`}>
          <div className={textStyles.textoContenedor}>
            <h3><Texto textoID="texto-introduccion3" /></h3>
          </div>
          <div className={textStyles.textoContenedor2}>
            <h4><Texto textoID="texto-introduccion4" /></h4>
          </div>
        </div>

        <div id="estudiantes">
          <Usina />
        </div>

        <div className={styles.titlePreguntas}>
          <h2 id="preguntas-frecuentes">Preguntas Frecuentes</h2>
        </div>
        <div className={styles.preguntasSection}>
          <Acordeon acordeonID="preguntas" variant="preguntas"/>
        </div>

        <Footer/>
      </div>
    </>
  );
}

// Developed by Sánchez Lautaro and Sánchez Brian
