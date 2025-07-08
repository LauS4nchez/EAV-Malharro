
import Login from '../componentes/login/iniciarSesion';
import "@/styles/componentes-styles.css";
import "@/styles/styles.css";

export default function Page() {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  return (
    <div className="home">
        <section>
          <Login/>

          <div>
            <p className="form-footer">
              ¿No tenés una cuenta? <a href="../registrar" className="form-link">Registrate</a>
            </p>
          </div>
        </section>
      </div>
  );
}