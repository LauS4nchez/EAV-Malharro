
import Register from '../componentes/login/registrar';
import "@/styles/componentes-styles.css";
import "@/styles/styles.css";

export default function Page() {
  const jwt = typeof window !== "undefined" ? localStorage.getItem("jwt") : null;

  return (
    <div className="home">
        <section>
          <Register/>
        </section>
      </div>
  );
}