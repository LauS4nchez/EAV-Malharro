// components/construccion/Header.jsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import styles from '@/styles/components/Construccion/Header.module.css'
import darkStyles from '@/styles/components/Construccion/HeaderDark.module.css'
import { API_URL } from '@/app/config'
import { checkUserRole } from '../validacion/checkRole'
import { logout } from '../login/Logout'

export default function Header({ variant = 'light' }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [loading, setLoading] = useState(true)
  const [openDropdown, setOpenDropdown] = useState(null);

  // Combinar estilos según la variante
  const currentStyles = variant === 'dark' ? darkStyles : styles;

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

  const toggleDropdown = (dropdownName) => {
    setOpenDropdown(openDropdown === dropdownName ? null : dropdownName)
  }

  const isDropdownOpen = (dropdownName) => {
    return openDropdown === dropdownName
  }

  // Función para renderizar las opciones según el rol
  const renderUserMenuItems = () => {
    const items = []

    if (userRole === 'Authenticated' || userRole === 'Estudiante' || userRole === 'Profesor' || userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="informacion">
          <Link href={`/perfil/${user.username}#informacion`} onClick={closeMenu}>
            Información Personal
          </Link>
        </li>
      )
    }

    if (userRole === 'Authenticated' || userRole === 'Estudiante' || userRole === 'Profesor' || userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="notificaciones">
          <Link href={`/notificaciones`} onClick={closeMenu}>
            Notificaciones
          </Link>
        </li>
      )
    }

    // Opciones específicas según el rol
    if (userRole === 'Estudiante' || userRole === 'Profesor' || userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="mis-trabajos">
          <Link href={`/perfil/${user.username}#trabajos`} onClick={closeMenu}>
            Mis trabajos
          </Link>
        </li>
      )
    }

    if (userRole === 'Profesor' || userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="mis-agendas">
          <Link href={`/mis-agendas`} onClick={closeMenu}>
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

    if (userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="agendas-admin">
          <Link href={`/agendas-admin`} onClick={closeMenu}>
            Moderación de Agendas
          </Link>
        </li>
      )
    }

    if (userRole === 'Profesor' || userRole === 'Administrador' || userRole === 'SuperAdministrador') {
      items.push(
        <li key="admin-usina">
          <Link href="/panel-moderacion" onClick={closeMenu}>
            Moderación de Usinas
          </Link>
        </li>
      )
    }

    // Agregar separador antes del logout si hay items
    if (items.length > 0) {
      items.push(<li key="divider" className={currentStyles.dropdownDivider}></li>)
    }

    return items
  }

  return (
    <>
      <nav className={currentStyles.navbar}>
        <div className={currentStyles.container}>
          {/* Logo + lupa */}
          <div className={currentStyles.logoLupaBox}>
            <div className={currentStyles.logoSearchContainer}>
              <Link href="/" className={currentStyles.navbarBrand} onClick={closeMenu}>
                <img 
                  src="/img/Iso_Malharro.svg" 
                  alt="Isotipo Malharro" 
                  className={currentStyles.logoNav}
                />
              </Link>
            </div>
          </div>

          {/* Botón hamburguesa */}
          <button 
            className={`${currentStyles.navbarToggler} ${isMenuOpen ? currentStyles.collapsed : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation"
          >
            <span className={currentStyles.navbarTogglerIcon}></span>
          </button>

          {/* Menú lateral */}
          <div className={`${currentStyles.menuCollapse} ${isMenuOpen ? currentStyles.show : ''}`}>
            <div className={currentStyles.menuBox}>
              <button 
                className={currentStyles.closeMenuButton}
                onClick={closeMenu}
                aria-label="Cerrar menú"
              >
                <img src="/img/Icon_X_Blanca.svg" alt="Cerrar menú" />
              </button>

              <ul className={currentStyles.navbarNav}>
                {/* Carreras Dropdown */}
                <li className={currentStyles.navItemDropdown}>
                  <button 
                    className={currentStyles.navLinkDropdown}
                    onClick={() => toggleDropdown('carreras')}
                  >
                    Carreras
                    <span className={`${currentStyles.dropdownIcon} ${isDropdownOpen('carreras') ? currentStyles.rotate : ''}`}></span>
                  </button>

                  <ul className={`${currentStyles.dropdownMenu} ${isDropdownOpen('carreras') ? currentStyles.open : ''}`}>
                    <li><Link href="/paginas-informativas/carreras/diseno-grafico" onClick={closeMenu}>Diseño Gráfico</Link></li>
                    <li><Link href="/paginas-informativas/carreras/escenografia" onClick={closeMenu}>Escenografía</Link></li>
                    <li><Link href="/paginas-informativas/carreras/fotografia" onClick={closeMenu}>Fotografía</Link></li>
                    <li><Link href="/paginas-informativas/carreras/ilustracion" onClick={closeMenu}>Ilustración</Link></li>
                    <li><Link href="/paginas-informativas/carreras/medios-audiovisuales" onClick={closeMenu}>Medios Audiovisuales</Link></li>
                    <li><Link href="/paginas-informativas/carreras/profesorado" onClick={closeMenu}>Profesorado</Link></li>
                    <li><Link href="/paginas-informativas/carreras/realizador" onClick={closeMenu}>Realizador</Link></li>
                  </ul>
                </li>

                {/* Institucional Dropdown */}
                <li className={currentStyles.navItemDropdown}>
                  <button 
                    className={currentStyles.navLinkDropdown}
                    onClick={() => toggleDropdown('institucional')}
                  >
                    Institucional
                    <span className={`${currentStyles.dropdownIcon} ${isDropdownOpen('institucional') ? currentStyles.rotate : ''}`}></span>
                  </button>
                  <ul className={`${currentStyles.dropdownMenu} ${isDropdownOpen('institucional') ? currentStyles.open : ''}`}>
                    <li><Link href="/paginas-informativas/institucional/acerca-de-malharro" onClick={closeMenu}>Acerca de Malharro</Link></li>
                    <li><Link href="/paginas-informativas/institucional/autoridades" onClick={closeMenu}>Autoridades</Link></li>
                    <li><Link href="/paginas-informativas/institucional/biblioteca" onClick={closeMenu}>Biblioteca</Link></li>
                    <li><Link href="/paginas-informativas/institucional/consejo-academico" onClick={closeMenu}>Consejo Académico</Link></li>
                    <li className={currentStyles.dropdownDivider}></li>
                    <li><Link href="/paginas-informativas/institucional/cooperadora" onClick={closeMenu}>Cooperadora</Link></li>
                    <li><Link href="/paginas-informativas/institucional/docentes" onClick={closeMenu}>Docentes</Link></li>
                    <li><Link href="/paginas-informativas/#estudiantes" onClick={closeMenu}>Nuestros Estudiantes</Link></li>
                    <li><Link href="/paginas-informativas/institucional/pasantias" onClick={closeMenu}>Pasantías</Link></li>
                    <li><Link href="/paginas-informativas/institucional/planimetria" onClick={closeMenu}>Planimetría</Link></li>
                  </ul>
                </li>

                {/* Estudiantes Dropdown */}
                <li className={currentStyles.navItemDropdown}>
                  <button 
                    className={currentStyles.navLinkDropdown}
                    onClick={() => toggleDropdown('estudiantes')}
                  >
                    Estudiantes
                    <span className={`${currentStyles.dropdownIcon} ${isDropdownOpen('estudiantes') ? currentStyles.rotate : ''}`}></span>
                  </button>
                  <ul className={`${currentStyles.dropdownMenu} ${isDropdownOpen('estudiantes') ? currentStyles.open : ''}`}>
                    <li><Link href="/paginas-informativas/estudiantes/convivencia" onClick={closeMenu}>Convivencia</Link></li>
                    <li><Link href="/paginas-informativas/estudiantes/documentacion" onClick={closeMenu}>Documentación</Link></li>
                    <li><Link href="/paginas-informativas/estudiantes/titulos" onClick={closeMenu}>Títulos</Link></li>
                  </ul>
                </li>

                {/* Ciclo 2025 Dropdown */}
                <li className={currentStyles.navItemDropdown}>
                  <button 
                    className={currentStyles.navLinkDropdown}
                    onClick={() => toggleDropdown('ciclo')}
                  >
                    Ciclo Lectivo
                    <span className={`${currentStyles.dropdownIcon} ${isDropdownOpen('ciclo') ? currentStyles.rotate : ''}`}></span>
                  </button>
                  <ul className={`${currentStyles.dropdownMenu} ${isDropdownOpen('ciclo') ? currentStyles.open : ''}`}>
                    <li><Link href="/paginas-informativas/ciclo-lectivo/horarios" onClick={closeMenu}>Horarios</Link></li>
                    <li><Link href="/paginas-informativas/ciclo-lectivo/licencias-docentes" onClick={closeMenu}>Licencias docentes</Link></li>
                    <li><Link href="/paginas-informativas/ciclo-lectivo/mesas-de-examen" onClick={closeMenu}>Mesas de examen</Link></li>
                  </ul>
                </li>

                {/* Talleres Dropdown */}
                <li className={currentStyles.navItemDropdown}>
                  <button 
                    className={currentStyles.navLinkDropdown}
                    onClick={() => toggleDropdown('talleres')}
                  >
                    Talleres
                    <span className={`${currentStyles.dropdownIcon} ${isDropdownOpen('talleres') ? currentStyles.rotate : ''}`}></span>
                  </button>
                  <ul className={`${currentStyles.dropdownMenu} ${isDropdownOpen('talleres') ? currentStyles.open : ''}`}>
                    <li><Link href="/paginas-informativas/talleres/jovenes-adultos" onClick={closeMenu}>Jóvenes - Adultos</Link></li>
                    <li><Link href="/paginas-informativas/talleres/infancias-adolescentes" onClick={closeMenu}>Infancias - Adolescentes</Link></li>
                  </ul>
                </li>

                {/* Enlaces simples */}
                <li className={currentStyles.navItem}>
                  <Link href="/#preguntas-frecuentes" onClick={closeMenu} className={currentStyles.navLink}>
                    Preguntas frecuentes
                  </Link>
                </li>
                <li className={currentStyles.navItem}>
                  <Link href="https://esavmamalharro-bue.infd.edu.ar/" onClick={closeMenu} className={currentStyles.navLink}>
                    CAMPUS
                  </Link>
                </li>

                {/* Item de Usuario/Login */}
                {!loading && (
                  <li className={currentStyles.navItemUser}>
                    {user ? (
                      <>
                        <button 
                          className={`${currentStyles.userLink} ${currentStyles.loggedIn}`}
                          onClick={() => toggleDropdown('usuario')}
                        >
                          {user.username}
                          <span className={`${currentStyles.dropdownIcon} ${isDropdownOpen('usuario') ? currentStyles.rotate : ''}`}></span>
                        </button>
                        <ul className={`${currentStyles.userDropdownMenu} ${isDropdownOpen('usuario') ? currentStyles.open : ''}`}>
                          {renderUserMenuItems()}
                          <li>
                            <button 
                              onClick={logout}
                              className={currentStyles.logoutButton}
                            >
                              Cerrar Sesión
                            </button>
                          </li>
                        </ul>
                      </>
                    ) : (
                      <Link href="/login" onClick={closeMenu} className={currentStyles.userLink}>
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

      {/* Overlay para cerrar menú al hacer click fuera */}
      {isMenuOpen && (
        <div className={currentStyles.menuOverlay} onClick={closeMenu}></div>
      )}
    </>
  )
}