import styles from '@/styles/components/Header.module.css'
import Link from 'next/link'
import { Imagen } from '../basicos/imagen/imagen'

export default function Header() {
  return (
    <div className={styles.header}>
        <div className={styles.logo}>
            <Imagen ImagenID="logo"/>
        </div>

        <nav className={styles.navLinks}>
          <a href="#agenda">Agenda</a>
          <a href="#usina">Usina</a>
          <a href="#carreras">Carreras</a>
        </nav>

        <div className={styles.head}>
          <Link href="/login/">
            <button className={styles.login}>
              <h4>Iniciar Sesión</h4>
            </button>
          </Link>

          <Link href="/registrar/">
            <button className={styles.register}>
              <h4>Registrarse</h4>
            </button>
          </Link>
        </div>
      </div>
  )
}