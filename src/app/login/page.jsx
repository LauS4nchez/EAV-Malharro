
import Login from '../componentes/login/Login';

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