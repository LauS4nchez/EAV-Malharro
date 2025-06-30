
import Register from '../componentes/login/registrar';
import Link from 'next/link';
import "../componentes/componentes-styles.css";
import "../styles.css";

export default function Page() {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  return (
    <div className="home">
        <section>
          <Register/>

          <div>
            <p className="form-footer">
              ¿Ya tenés una cuenta? <a href="../login" className="form-link">Inicia Sesión</a>
            </p> 
          </div>
        </section>
      </div>
  );
}