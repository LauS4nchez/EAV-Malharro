
import UsinaProtegida from "./componentes/crearComponentes/usinaProtegida";
import Document from './componentes/basicos/document';
import { Texto } from './componentes/basicos/texto/text';
import Links from './componentes/basicos/link';
import { Imagen } from './componentes/basicos/imagen/imagen';
import Carrusel from './componentes/carrusel';
import Usina from './componentes/basicos/usina';
import Agenda from './componentes/basicos/agenda';
import Link from 'next/link';
import "./componentes/componentes-styles.css";
import "./styles.css";

export default function Page() {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  return (
    <div className="home">
      <div className='container'>
        <div className="title-container">
          <p className="title-text">Presentación Avances Malharro</p>      
        </div>

        <div className="components-row">
          <section className="container-components">
            <Texto 
              textoID="eav-malharro"
            />
            <Texto 
              textoID="ejemplo-1"
            />
            <Texto 
              textoID="ejemplo-2"
            />
          </section>
        </div>

        <div className="components-row">
          <section className="container-components">
            <Document />
          </section>
        </div>

        <div className="components-row">
          <section className="container-components">
            <Links />
          </section>
        </div>

        <div className="components-row">
          <section className="container-components">
            <Imagen 
              ImagenID="imagen-chanchos"
            />

            <Imagen 
              ImagenID="imagen-chancho2"
            />
          </section>
        </div>

        <section>
          <Carrusel />
        </section>

        <section>
          <h2 className="title">Usina</h2>
          <Usina />
        </section>

        <section>
          <h2 className="title">Agenda</h2>
          <Agenda />
        </section>

        <section className="auth-buttons-container">
          <Link href="/login/">
            <button className="auth-button login-button">Inciar Sesión</button>
          </Link>

          <Link href="/registrar/">
            <button className="auth-button register-button">Registrarse</button>
          </Link>
        </section>

        <section>
          <UsinaProtegida/>
        </section>
      </div>
    </div>
  );
}