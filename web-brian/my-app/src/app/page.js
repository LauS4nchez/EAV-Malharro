import UsinaProtegida from "./componentes/crearComponentes/usinaProtegida";
import Acordeon from "./componentes/basicos/acordeon/acordeon";
import { Imagen } from './componentes/basicos/imagen/imagen';
import Carrusel from './componentes/basicos/carrusel';
import Agenda from './componentes/basicos/agenda';
import Link from 'next/link';
import "@/styles/componentes-styles.css";
import "@/styles/styles.css";
import { Texto } from "./componentes/basicos/texto/text";

export default function Page() {
  return (
    <div className="home">
      <div className="header">
        <Imagen
          ImagenID="logo"
        />
        <div className="head">
          <Link href="/login/">
            <button className="login"><h4>Iniciar Sesión</h4></button>
          </Link>

          <Link href="/registrar/">
            <button className="register"><h4>Registrarse</h4></button>
          </Link>
        </div>
      </div>
      <div className="carrusel-container">
        <Carrusel/>
      </div>

      <div className="textos-row">
        <div className="texto-contenedor">
          <Texto
            textoID="texto-introduccion"
          />
        </div>
        <div className="texto-contenedor">
          <Texto
            textoID="texto-introduccion2"
          />
        </div>
      </div>


      <div className="texto-container">
        <div className="title">
          <h2>Nuestras Carreras</h2>
        </div>
        <Acordeon
          acordeonID="carreras"
        />
      </div>
      <div className="agenda">
        <div className="title-container">
          <div className="title">
            <h2>Agenda</h2>
          </div>
        </div>
        <Agenda/>
      </div>
      <div><h1>KALINAAAAAAAA</h1></div>
      <Acordeon
        acordeonID="preguntas"
      />
        <section>
          <UsinaProtegida/>
        </section>
      </div>
  );
}