
import Login from '../componentes/login/iniciarSesion';
import "@/styles/componentes-styles.css";
import "@/styles/styles.css";

export default function Page() {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  return (
    <div className="home">
        <section>
          <Login/>
        </section>
      </div>
  );
}