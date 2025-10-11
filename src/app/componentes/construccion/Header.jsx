// components/Header.jsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import styles from '@/styles/components/Header.module.css'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const toggleSearch = () => {
    setSearchOpen(!searchOpen)
  }

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.container}>
          {/* Logo + lupa */}
          <div className={styles.logoLupaBox}>
            <div className={styles.logoSearchContainer}>
              <Link href="/" className={styles.navbarBrand} onClick={closeMenu}>
                <img 
                  src="/svg/Iso_Malharro.svg" 
                  alt="Isotipo Malharro" 
                  className={styles.logoNav}
                />
              </Link>
              {/* Lupa abre modal de búsqueda */}
              <button 
                onClick={toggleSearch}
                className={styles.searchButton}
                aria-label="Buscar"
              >
                <img 
                  src="/svg/Icon_Lupa.svg" 
                  alt="Buscar" 
                  className={styles.lupaNav}
                />
              </button>
            </div>
          </div>

          {/* Botón hamburguesa */}
          <button 
            className={`${styles.navbarToggler} ${isMenuOpen ? styles.collapsed : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation"
          >
            <span className={styles.navbarTogglerIcon}></span>
          </button>

          {/* Menú lateral */}
          <div className={`${styles.menuCollapse} ${isMenuOpen ? styles.show : ''}`}>
            <div className={styles.menuBox}>
              {/* Botón de cierre solo se muestra en móviles */}
              <button 
                className={styles.closeMenuButton}
                onClick={closeMenu}
                aria-label="Cerrar menú"
              >
                <img src="/svg/Icon_X_Blanca.svg" alt="Cerrar menú" />
              </button>

              <ul className={styles.navbarNav}>
                {/* Carreras Dropdown */}
                <li className={styles.navItemDropdown}>
                  <button className={styles.navLinkDropdown}>
                    Carreras
                      <span className={styles.dropdownIcon}></span>
                  </button>
                  <ul className={styles.dropdownMenu}>
                    <li><Link href="/disenografico" onClick={closeMenu}>Diseño Gráfico</Link></li>
                    <li><Link href="/escenografia" onClick={closeMenu}>Escenografía</Link></li>
                    <li><Link href="/fotografia" onClick={closeMenu}>Fotografía</Link></li>
                    <li><Link href="/ilustracion" onClick={closeMenu}>Ilustración</Link></li>
                    <li><Link href="/mediosav" onClick={closeMenu}>Medios Audiovisuales</Link></li>
                    <li><Link href="/profesorado" onClick={closeMenu}>Profesorado</Link></li>
                    <li><Link href="/realizador" onClick={closeMenu}>Realizador</Link></li>
                  </ul>
                </li>

                {/* Institucional Dropdown */}
                <li className={styles.navItemDropdown}>
                  <button className={styles.navLinkDropdown}>
                    Institucional
                      <span className={styles.dropdownIcon}></span>
                  </button>
                  <ul className={styles.dropdownMenu}>
                    <li><Link href="/acerca-de-malharro" onClick={closeMenu}>Acerca de Malharro</Link></li>
                    <li><Link href="/autoridades" onClick={closeMenu}>Autoridades</Link></li>
                    <li><Link href="/biblioteca" onClick={closeMenu}>Biblioteca</Link></li>
                    <li><Link href="/consejo-academico" onClick={closeMenu}>Consejo Académico</Link></li>
                    <li className={styles.dropdownDivider}></li>
                    <li><Link href="/cooperadora" onClick={closeMenu}>Cooperadora</Link></li>
                    <li><Link href="/docentes" onClick={closeMenu}>Docentes</Link></li>
                    <li><Link href="/nuestros-estudiantes" onClick={closeMenu}>Nuestros Estudiantes</Link></li>
                    <li><Link href="/pasantias" onClick={closeMenu}>Pasantías</Link></li>
                    <li><Link href="/planimetria" onClick={closeMenu}>Planimetría</Link></li>
                  </ul>
                </li>

                {/* Estudiantes Dropdown */}
                <li className={styles.navItemDropdown}>
                  <button className={styles.navLinkDropdown}>
                    Estudiantes
                      <span className={styles.dropdownIcon}></span>
                  </button>
                  <ul className={styles.dropdownMenu}>
                    <li><Link href="/convivencia" onClick={closeMenu}>Convivencia</Link></li>
                    <li><Link href="/documentacion" onClick={closeMenu}>Documentación</Link></li>
                    <li><Link href="/titulos" onClick={closeMenu}>Títulos</Link></li>
                  </ul>
                </li>

                {/* Ciclo 2025 Dropdown */}
                <li className={styles.navItemDropdown}>
                  <button className={styles.navLinkDropdown}>
                    Ciclo 2025
                      <span className={styles.dropdownIcon}></span>
                  </button>
                  <ul className={styles.dropdownMenu}>
                    <li><Link href="/horarios" onClick={closeMenu}>Horarios</Link></li>
                    <li><Link href="/licencias-docentes" onClick={closeMenu}>Licencias docentes</Link></li>
                    <li><Link href="/mesas-de-examen" onClick={closeMenu}>Mesas de examen</Link></li>
                  </ul>
                </li>

                {/* Talleres Dropdown */}
                <li className={styles.navItemDropdown}>
                  <button className={styles.navLinkDropdown}>
                    Talleres
                      <span className={styles.dropdownIcon}></span>
                  </button>
                  <ul className={styles.dropdownMenu}>
                    <li><Link href="/talleres/jovenes-adultos" onClick={closeMenu}>Jóvenes - Adultos</Link></li>
                    <li><Link href="/talleres/infancias-adolescentes" onClick={closeMenu}>Infancias - Adolescentes</Link></li>
                  </ul>
                </li>

                {/* Enlaces simples */}
                <li className={styles.navItem}>
                  <Link href="/preguntas-frecuentes" onClick={closeMenu} className={styles.navLink}>
                    Preguntas frecuentes
                  </Link>
                </li>
                <li className={styles.navItem}>
                  <Link href="/campus" onClick={closeMenu} className={styles.navLink}>
                    CAMPUS
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Modal de búsqueda */}
      {searchOpen && (
        <div className={styles.searchModal}>
          <div className={styles.searchModalContent}>
            <button 
              className={styles.closeSearchButton}
              onClick={toggleSearch}
              aria-label="Cerrar búsqueda"
            >
              <img src="/svg/Icon_X_Magenta.svg" alt="Cerrar barra de búsqueda" />
            </button>
            <div className={styles.searchIconContainer}>
              <img src="/svg/Icon_LupaBarraBusqueda.svg" alt="ícono lupa" />
            </div>
            <div className={styles.searchBar}>
              <input 
                type="text" 
                className={styles.searchInput}
                placeholder="Buscar..." 
                aria-label="Buscar"
              />
            </div>
          </div>
        </div>
      )}

      {/* Overlay para cerrar menú al hacer click fuera */}
      {isMenuOpen && (
        <div className={styles.menuOverlay} onClick={closeMenu}></div>
      )}
    </>
  )
}