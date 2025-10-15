import UsinaProtegida from "./componentes/crearComponentes/usinaProtegida";
import CircularContainer from "./componentes/construccion/CircularContainer";
import Acordeon from "./componentes/basicos/acordeon/acordeon";
import Header from "./componentes/construccion/Header";
import Carrusel from './componentes/basicos/carrusel';
import Agenda from './componentes/basicos/agenda';
import Footer from "./componentes/construccion/Footer";
import Usina from "./componentes/basicos/usina";
import { Texto } from "./componentes/basicos/texto/text";
import styles from "@/styles/components/Common.module.css";
import textStyles from "@/styles/components/TextComponents.module.css";

export default function Page() {
  return (
    <div className="home">
      <Header/>
      <div className={styles.carruselContainer}>
        <Carrusel />
      </div>

      <div className={textStyles.textosRow}>
        <div className={textStyles.textoContenedor}>
          <Texto textoID="texto-introduccion" />
        </div>
        <div className={textStyles.textoContenedor}>
          <Texto textoID="texto-introduccion2" />
        </div>
      </div>

      <CircularContainer title="Nuestras Carreras">
        <Acordeon acordeonID="carreras" />
      </CircularContainer>

      <div className={styles.titleAgenda}>
        <h2 id="agenda">Agenda</h2>
      </div>
      <div className={styles.agendaSection}>
        <Agenda />
      </div>

      <Usina />
      <UsinaProtegida />

      <Footer/>
    </div>
  );
}