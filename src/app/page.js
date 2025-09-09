import UsinaProtegida from "./componentes/crearComponentes/usinaProtegida";
import Acordeon from "./componentes/basicos/acordeon/acordeon";
import { Imagen } from './componentes/basicos/imagen/imagen';
import Carrusel from './componentes/basicos/carrusel';
import Agenda from './componentes/basicos/agenda';
import Link from 'next/link';
import Usina from "./componentes/basicos/usina";
import "@/styles/componentes-styles.css";
import "@/styles/styles.css";
import { UserMenu } from "./componentes/basicos/userMenu";
import { Texto } from "./componentes/basicos/texto/text";

export default function Page() {
  return (
    <div className="home">
      {/* Header con navegación */}
      <div className="header">
        <Imagen ImagenID="logo" className="logo" />

        <nav className="nav-links">
          <a href="#agenda">Agenda</a>
          <a href="#usina">Usina</a>
          <a href="#carreras">Carreras</a>
        </nav>

        <div className="head">
          <Link href="/login/">
            <button className="login">
              <h4>Iniciar Sesión</h4>
            </button>
          </Link>

          <Link href="/registrar/">
            <button className="register">
              <h4>Registrarse</h4>
            </button>
          </Link>
        </div>
      </div>

      <div className="carrusel-container">
        <Carrusel />
      </div>

      <UserMenu />

      <div className="textos-row">
        <div className="texto-contenedor">
          <Texto textoID="texto-introduccion" />
        </div>
        <div className="texto-contenedor">
          <Texto textoID="texto-introduccion2" />
        </div>
      </div>

      <div className="texto-container">
        <div className="title">
          <h2 id="carreras">Nuestras Carreras</h2>
        </div>
        <Acordeon acordeonID="carreras" />
      </div>

      <div className="agenda">
        <div className="title-container">
          <div className="title">
            <h2 id="agenda">Agenda</h2>
          </div>
        </div>
        <Agenda />
      </div>

      <div className="usina">
        <div className="title-container">
          <div className="title">
            <h2 id="usina">Usina</h2>
          </div>
        </div>
        <Usina />
        <UsinaProtegida />
      </div>
    </div>
  );
}

// Developed by Lautaro Sánchez Bonaldo y Brian Sánchez