import React from "react";
import styles from '@/styles/components/Construccion/Footer.module.css'

const Footer = () => {
  return (
    <footer className={styles.footerMalharro}>
      {/* Capa SVG decorativa con curva superior */}
      <div className={styles.footerFormaCurva}>
        <svg
          viewBox="0 0 360 150"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0 0C73 0 146 10 214 30C267 47 316 69 360 95V150H0V0Z"
            fill="#1B1B1B"
          />
        </svg>
      </div>

      <div className="container-fluid">
        <div className={styles.contenidoFooter}>
          {/* Botón flotante para volver al tope */}
          <div className={`${styles.footerScroll} text-end mb-3`}>
            <a href="#" className={styles.footerScrollBtn} aria-label="Ir arriba">
              <img src="/img/Icon_SubirFooter.svg" alt="Subir" />
            </a>
          </div>

          {/* Bloque móvil: lema, ilustración y acceso al Campus */}
          <div className="col-12 d-md-none text-left">
            <p className={`${styles.footerFrase} h1-titulor`}>
              Educación <br /> pública con <br /> identidad
            </p>

            <div>
              <img
                src="/img/Personajes_Footer_Prueba.svg"
                alt="Decoración"
                className="img-fluid"
              />
            </div>

            <div className={`${styles.logoCampus} d-flex align-items-center gap-3`}>
              <div>
                <img
                  src="/img/Logo_Malharro.svg"
                  alt="Logo Malharro"
                  className={`${styles.footerCampusLogo} img-fluid`}
                />
              </div>
              <div className={styles.footerCampus}>
                <a
                  href="https://esavmamalharro-bue.infd.edu.ar/"
                  className={styles.footerCampusLink}
                  target="_blank"
                  rel="noreferrer"
                >
                  CAMPUS
                </a>
              </div>
            </div>
          </div>

          {/* Bloque desktop: ilustración + lema a la izquierda */}
          <div className="col-md-6 d-none d-md-flex align-items-center gap-3">
            <img
              src="/img/Personajes_Footer_Prueba.svg"
              alt=""
              className="img-fluid"
              style={{ maxHeight: "100px" }}
            />
            <p className={`${styles.footerFrase} m-0`}>
              Educación <br /> pública con <br /> identidad
            </p>
          </div>

          {/* Logo institucional a la derecha (desktop) */}
          <div className="col-md-6 mt-4 d-none d-md-block text-start">
            <div>
              <img
                src="/img/Logo_Malharro.svg"
                alt="Logo Malharro"
                className={`${styles.footerCampusLogo} img-fluid`}
              />
            </div>
          </div>

          {/* Links de navegación internos + Campus */}
          <div className="row">
            <div className="col-12">
              <div className={`row g-2 ${styles.footerLinks} justify-content-left`}>
                <div className="col-auto">
                  <a href="#carreras" className={styles.footerLink}>Carreras</a>
                </div>
                <div className="col-auto">
                  <a href="#" className={styles.footerLink}>Institucional</a>
                </div>
                <div className="col-auto">
                  <a href="#estudiantes" className={styles.footerLink}>Estudiantes</a>
                </div>
                <div className="col-auto">
                  <a href="#agenda" className={styles.footerLink}>Agenda</a>
                </div>
                <div className="col-auto">
                  <a href="#" className={styles.footerLink}>Talleres</a>
                </div>
                <div className="col-auto">
                  <a href="#preguntas-frecuentes" className={styles.footerLink}>Preguntas frecuentes</a>
                </div>
                <div className="col-auto">
                  <a
                    href="https://esavmamalharro-bue.infd.edu.ar/"
                    rel="noreferrer noopener"
                    target="_blank"
                    className={styles.footerLink}
                  >
                    Campus
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Dirección */}
          <div className="row">
            <div className="col-12 text-left">
              <p className={styles.footerDireccion}>
                La Pampa 1619, Mar del Plata, Argentina. 7600
              </p>
            </div>
          </div>

          {/* Redes sociales (íconos SVG) */}
          <div className={styles.footerSocial}>
            <a href="https://www.facebook.com/avmalharro/" target="_blank" rel="noreferrer noopener">
              <img src="/img/Icon_Facebook.svg" alt="Facebook" />
            </a>
            <a href="https://www.instagram.com/avmartinmalharro/?hl=es" target="_blank" rel="noreferrer noopener">
              <img src="/img/Icon_Instagram.svg" alt="Instagram" />
            </a>
            <a href="https://x.com/avmalharro" target="_blank" rel="noreferrer noopener">
              <img src="/img/Icon_Twitter.svg" alt="Twitter" />
            </a>
            <a href="https://www.youtube.com/@AVMartinMalharroOK" target="_blank" rel="noreferrer noopener">
              <img src="/img/Icon_YT.svg" alt="YouTube" />
            </a>
          </div>

          {/* Logos institucionales (educación/dirección) */}
          <div className={styles.footerLogos}>
            <div className="container-fluid">
              <div className="row justify-content-center align-items-center">
                <div className="col-auto">
                  <img
                    src="/img/Logo_Educ_Art.svg"
                    alt="Logo Educación Artística"
                    className={`${styles.footerLogo} img-fluid`}
                  />
                </div>
                <div className="col-auto">
                  <img
                    src="/img/Logo_Direcc_BsAs.svg"
                    alt="Logo Dirección Cultura"
                    className={`${styles.footerLogo} img-fluid`}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Créditos legales / autoría */}
          <div className="row">
            <div className="col-12 text-left">
              <p className={styles.footerCreditos}>
                2025 © ESCUELA DE ARTES VISUALES MARTÍN A. MALHARRO | Sitio
                diseñado por alumn@s de la carrera de Diseño Gráfico 4ºA y desarrollado por
                Sánchez Lautaro y Sánchez Brian.
              </p>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;