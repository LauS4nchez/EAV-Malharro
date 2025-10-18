// components/construccion/Header.jsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from '@/styles/components/Header.module.css'
import { API_URL } from '@/app/config'
import { checkUserRole } from '../validacion/checkRole'
import { logout } from '../login/Logout'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null);

  // Verificar autenticación con Strapi
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('jwt')
        
        if (!token) {
          setUser(null)
          setUserRole(null)
          setLoading(false)
          return
        }

        // Hacer request al endpoint de Strapi para obtener datos del usuario
        const response = await fetch(`${API_URL}/users/me`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        if (response.ok) {
          const userData = await response.json()
          setUser(userData)
          
          // Obtener el rol del usuario
          const role = checkUserRole()
          setUserRole(role)
        } else {
          // Token inválido, limpiar
          localStorage.removeItem('jwt')
          setUser(null)
          setUserRole(null)
        }
      } catch (error) {
        console.error('Error verificando autenticación:', error)
        setUser(null)
        setUserRole(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
    if (!isMenuOpen) {
      setOpenDropdown(null)
    }
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
    setOpenDropdown(null)
  }

  const toggleSearch = () => {
    setSearchOpen(!searchOpen)
  }

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName)
  }

  const isDropdownOpen = (dropdownName) => {
    return openDropdown === dropdownName
  }

  // Función para renderizar las opciones según el rol
  const renderUserMenuItems = () => {
    const items = []

    // Opción común para todos los usuarios autenticados
    items.push(
      <li key="profile">
        <Link href="/profile" onClick={closeMenu}>
          Mi Perfil
        </Link>
      </li>
    )

    // Opciones específicas según el rol
    if (userRole === 'Estudiante' || userRole === 'Profesor' || userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="mis-trabajos">
          <Link href="/mis-trabajos" onClick={closeMenu}>
            Mis trabajos
          </Link>
        </li>
      )
    }

    if (userRole === 'Profesor' || userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="mis-agendas">
          <Link href="/mis-agendas" onClick={closeMenu}>
            Mis agendas
          </Link>
        </li>
      )
    }

    if (userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="gestor-usuarios">
          <Link href="/gestor-usuarios" onClick={closeMenu}>
            Gestor de usuarios
          </Link>
        </li>
      )
    }

    // Agregar separador antes del logout si hay items
    if (items.length > 0) {
      items.push(<li key="divider" className={styles.dropdownDivider}></li>)
    }

    return items
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
                  src="/img/Iso_Malharro.svg" 
                  alt="Isotipo Malharro" 
                  className={styles.logoNav}
                />
              </Link>
              <button 
                onClick={toggleSearch}
                className={styles.searchButton}
                aria-label="Buscar"
              >
                <img 
                  src="/img/Icon_Lupa.svg" 
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
              <button 
                className={styles.closeMenuButton}
                onClick={closeMenu}
                aria-label="Cerrar menú"
              >
                <img src="/img/Icon_X_Blanca.svg" alt="Cerrar menú" />
              </button>

              <ul className={styles.navbarNav}>
                {/* Carreras Dropdown */}
                <li className={styles.navItemDropdown}>
                  <button 
                    className={styles.navLinkDropdown}
                    onClick={() => toggleDropdown('carreras')}
                  >
                    Carreras
                    <span className={`${styles.dropdownIcon} ${isDropdownOpen('carreras') ? styles.rotate : ''}`}></span>
                  </button>

                  <ul className={`${styles.dropdownMenu} ${isDropdownOpen('carreras') ? styles.open : ''}`}>
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
                  <button 
                    className={styles.navLinkDropdown}
                    onClick={() => toggleDropdown('institucional')}
                  >
                    Institucional
                    <span className={`${styles.dropdownIcon} ${isDropdownOpen('institucional') ? styles.rotate : ''}`}></span>
                  </button>
                  <ul className={`${styles.dropdownMenu} ${isDropdownOpen('institucional') ? styles.open : ''}`}>
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
                  <button 
                    className={styles.navLinkDropdown}
                    onClick={() => toggleDropdown('estudiantes')}
                  >
                    Estudiantes
                    <span className={`${styles.dropdownIcon} ${isDropdownOpen('estudiantes') ? styles.rotate : ''}`}></span>
                  </button>
                  <ul className={`${styles.dropdownMenu} ${isDropdownOpen('estudiantes') ? styles.open : ''}`}>
                    <li><Link href="/convivencia" onClick={closeMenu}>Convivencia</Link></li>
                    <li><Link href="/documentacion" onClick={closeMenu}>Documentación</Link></li>
                    <li><Link href="/titulos" onClick={closeMenu}>Títulos</Link></li>
                  </ul>
                </li>

                {/* Ciclo 2025 Dropdown */}
                <li className={styles.navItemDropdown}>
                  <button 
                    className={styles.navLinkDropdown}
                    onClick={() => toggleDropdown('ciclo')}
                  >
                    Ciclo 2025
                    <span className={`${styles.dropdownIcon} ${isDropdownOpen('ciclo') ? styles.rotate : ''}`}></span>
                  </button>
                  <ul className={`${styles.dropdownMenu} ${isDropdownOpen('ciclo') ? styles.open : ''}`}>
                    <li><Link href="/horarios" onClick={closeMenu}>Horarios</Link></li>
                    <li><Link href="/licencias-docentes" onClick={closeMenu}>Licencias docentes</Link></li>
                    <li><Link href="/mesas-de-examen" onClick={closeMenu}>Mesas de examen</Link></li>
                  </ul>
                </li>

                {/* Talleres Dropdown */}
                <li className={styles.navItemDropdown}>
                  <button 
                    className={styles.navLinkDropdown}
                    onClick={() => toggleDropdown('talleres')}
                  >
                    Talleres
                    <span className={`${styles.dropdownIcon} ${isDropdownOpen('talleres') ? styles.rotate : ''}`}></span>
                  </button>
                  <ul className={`${styles.dropdownMenu} ${isDropdownOpen('talleres') ? styles.open : ''}`}>
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

                {/* Item de Usuario/Login */}
                {!loading && (
                  <li className={styles.navItemUser}>
                    {user ? (
                      <>
                        <button 
                          className={`${styles.userLink} ${styles.loggedIn}`}
                          onClick={() => toggleDropdown('usuario')}
                        >
                          {user.username}
                          <span className={`${styles.dropdownIcon} ${isDropdownOpen('usuario') ? styles.rotate : ''}`}></span>
                        </button>
                        <ul className={`${styles.userDropdownMenu} ${isDropdownOpen('usuario') ? styles.open : ''}`}>
                          {renderUserMenuItems()}
                          <li>
                            <button 
                              onClick={logout}
                              className={styles.logoutButton}
                            >
                              Cerrar Sesión
                            </button>
                          </li>
                        </ul>
                      </>
                    ) : (
                      <Link href="/login" onClick={closeMenu} className={styles.userLink}>
                        Iniciar Sesión
                      </Link>
                    )}
                  </li>
                )}
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
              <img src="/img/Icon_X_Magenta.svg" alt="Cerrar barra de búsqueda" />
            </button>
            <div className={styles.searchIconContainer}>
              <img src="/img/Icon_LupaBarraBusqueda.svg" alt="ícono lupa" />
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