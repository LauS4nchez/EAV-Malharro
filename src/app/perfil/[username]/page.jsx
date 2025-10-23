'use client';

import { useState, useEffect } from 'react';
import { API_URL, API_TOKEN } from "@/app/config";
import styles from "@/styles/components/PerfilPublico.module.css";
import usinaStyles from "@/styles/components/Usina.module.css";
import agendaStyles from "@/styles/components/Agenda.module.css";
import InformacionPersonal from '@/app/componentes/login/InformacionPersonal';

export default function PerfilPublicoPage({ params }) {
  const { username } = params;
  const [userData, setUserData] = useState(null);
  const [usinas, setUsinas] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('trabajos');
  const [usinasWithImages, setUsinasWithImages] = useState([]);
  const [agendasWithImages, setAgendasWithImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);

  useEffect(() => {
    const hash = window.location.hash;
    if (hash === '#trabajos') {
      setActiveTab('trabajos');
    } else if (hash === '#agendas') {
      setActiveTab('agendas');
    } else if (hash === '#informacion') {
      setActiveTab('informacion');
    }
    
    const fetchData = async () => {
      try {
        // Obtener usuario logueado
        const storedUser = localStorage.getItem("user");
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }

        // Buscar usuario del perfil con populate completo
        const usersResponse = await fetch(
          `${API_URL}/users?filters[username][$eq]=${username}&populate[0]=role&populate[1]=avatar&populate[2]=usinas_creadas&populate[3]=agendas_creadas`,
          {
            headers: {
              'Authorization': `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!usersResponse.ok) throw new Error('Error al cargar el usuario');

        const usersData = await usersResponse.json();
        
        // Strapi v5 devuelve { data: [], meta: {} }
        const users = usersData.data || usersData;

        if (!users || users.length === 0) throw new Error('Usuario no encontrado');

        const user = users[0];
        setUserData(user);

        let approvedUsinas = [];
        let approvedAgendas = [];

        if (user.usinas_creadas) {
          // Primero eliminar duplicados, luego filtrar por aprobación
          const uniqueUsinas = user.usinas_creadas.filter((usina, index, self) => 
            index === self.findIndex(u => u.documentId === usina.documentId)
          );
          
          // Ahora filtrar solo las aprobadas
          approvedUsinas = uniqueUsinas.filter(usina => {
            return usina.aprobado === 'aprobada';
          });
          
          setUsinas(approvedUsinas);
        }

        if (user.agendas_creadas) {
          // Primero eliminar duplicados, luego filtrar por aprobación
          const uniqueAgendas = user.agendas_creadas.filter((agenda, index, self) => 
            index === self.findIndex(a => a.documentId === agenda.documentId)
          );
          
          // Ahora filtrar solo las aprobadas
          approvedAgendas = uniqueAgendas.filter(agenda => {
            return agenda.aprobado === 'aprobada';
          });
          
          setAgendas(approvedAgendas);
        }

        // Cargar imágenes para usinas y agendas
        await fetchImages(approvedUsinas, approvedAgendas);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setImagesLoading(false);
      }
    };

    const fetchImages = async (usinas, agendas) => {
      try {
        // Fetch imágenes para usinas
        const usinasWithImagesData = await Promise.all(
          usinas.map(async (usina) => {
            try {
              const response = await fetch(
                `${API_URL}/usinas/${usina.documentId}?populate=imagen`,
                {
                  headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              if (response.ok) {
                const usinaData = await response.json();
                const usinaWithImage = usinaData.data || usinaData;
                
                // Obtener URL de la imagen
                let imageUrl = '/placeholder.jpg';
                const imagenField = usinaWithImage.imagen;
                const imgData = imagenField?.data ?? imagenField;
                const imgAttrs = imgData?.attributes ?? imgData;
                const urlPath = imgAttrs?.url;
                
                if (urlPath) {
                  imageUrl = urlPath.startsWith('http') ? urlPath : `${API_URL.replace('/api', '')}${urlPath}`;
                }
                
                return {
                  ...usina,
                  imageUrl
                };
              }
              return { ...usina, imageUrl: '/placeholder.jpg' };
            } catch (error) {
              return { ...usina, imageUrl: '/placeholder.jpg' };
            }
          })
        );

        // Fetch imágenes para agendas
        const agendasWithImagesData = await Promise.all(
          agendas.map(async (agenda) => {
            try {
              const response = await fetch(
                `${API_URL}/agendas/${agenda.documentId}?populate=imagen`,
                {
                  headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': 'application/json',
                  },
                }
              );
              
              if (response.ok) {
                const agendaData = await response.json();
                const agendaWithImage = agendaData.data || agendaData;
                
                // Obtener URL de la imagen
                let imageUrl = '/placeholder.jpg';
                const imagenField = agendaWithImage.imagen;
                const imgData = imagenField?.data ?? imagenField;
                const imgAttrs = imgData?.attributes ?? imgData;
                const urlPath = imgAttrs?.url;
                
                if (urlPath) {
                  imageUrl = urlPath.startsWith('http') ? urlPath : `${API_URL.replace('/api', '')}${urlPath}`;
                }
                
                return {
                  ...agenda,
                  imageUrl
                };
              }
              return { ...agenda, imageUrl: '/placeholder.jpg' };
            } catch (error) {
              return { ...agenda, imageUrl: '/placeholder.jpg' };
            }
          })
        );

        setUsinasWithImages(usinasWithImagesData);
        setAgendasWithImages(agendasWithImagesData);

      } catch (error) {
        setUsinasWithImages(usinas.map(u => ({ ...u, imageUrl: '/placeholder.jpg' })));
        setAgendasWithImages(agendas.map(a => ({ ...a, imageUrl: '/placeholder.jpg' })));
      }
    };

    fetchData();
  }, [username]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando perfil...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorContainer}>
        <h2>Error</h2>
        <p>{error}</p>
        <button 
          onClick={() => window.location.href = "/"}
          className={styles.backButton}
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Usuario no encontrado</h2>
        <button 
          onClick={() => window.location.href = "/"}
          className={styles.backButton}
        >
          Volver al inicio
        </button>
      </div>
    );
  }

  const userRole = userData.role?.type || userData.role?.name;
  const isCurrentUser = currentUser && currentUser.username === userData.username;

  // Obtener publicación más reciente (ya ordenadas por fecha)
  const latestUsina = usinasWithImages.length > 0 ? usinasWithImages[0] : null;
  const latestAgenda = agendasWithImages.length > 0 ? agendasWithImages[0] : null;

  // CORREGIDO: Usar minúsculas para coincidir con el rol real
  const showUsinas = userRole === 'estudiante' || ['profesor', 'administrador', 'superadministrador'].includes(userRole?.toLowerCase());
  const showAgendas = ['profesor', 'administrador', 'superadministrador'].includes(userRole?.toLowerCase());

  // Renderizar contenido según la pestaña activa
  const renderContent = () => {
    switch (activeTab) {
      case 'trabajos':
        return (
          <div className={usinaStyles.usinaGaleria}>
            {usinasWithImages.length > 0 ? (
              usinasWithImages.map((usina) => (
                <div key={usina.id} className={usinaStyles.usinaCard}>
                  <div className={usinaStyles.usinaImageContainer}>
                    <img 
                      src={usina.imageUrl} 
                      alt={usina.nombre} 
                      className={usinaStyles.usinaImage} 
                    />
                  </div>
                  <div className={usinaStyles.usinaContenido}>
                    <h3>{usina.nombre}</h3>
                    <p>{usina.carrera}</p>
                    {usina.link && (
                      <a 
                        href={usina.link} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className={usinaStyles.usinaLink}
                      >
                        Contactar
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.noPublicaciones}>
                Este usuario aún no ha publicado trabajos aprobados.
              </p>
            )}
          </div>
        );

      case 'agendas':
        return (
          <div className={agendaStyles.agendaContainer}>
            {agendasWithImages.length > 0 ? (
              agendasWithImages.map((agenda) => (
                <div key={agenda.id} className={agendaStyles.agendaCard}>
                  {agenda.imageUrl && (
                    <img
                      src={agenda.imageUrl}
                      alt="Imagen del evento"
                      className={agendaStyles.imagenAgenda}
                    />
                  )}
                  <div className={agendaStyles.agendaContenido}>
                    <div className={agendaStyles.fecha}>
                      <p>{new Date(agenda.fecha).toLocaleDateString()}</p>
                    </div>
                    <p className={agendaStyles.textoRegular}>
                      {agenda.tituloActividad}
                    </p>
                  </div>
                  <div className={agendaStyles.agendaContenidoHover}>
                    <p className={agendaStyles.textoRegular}>
                      {agenda.tituloActividad}
                    </p>
                    <div className={agendaStyles.textoContenidoActividad}>
                      <p>{agenda.contenidoActividad}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className={styles.noPublicaciones}>
                Este usuario aún no ha publicado agendas aprobadas.
              </p>
            )}
          </div>
        );

      case 'informacion':
        return <InformacionPersonal />;

      default:
        return null;
    }
  };

  return (
    <div className={styles.perfilPublicoContainer}>
      <div className={styles.header}>
        <button 
          onClick={() => window.location.href = "/"}
          className={styles.backButton}
        >
          ← Volver
        </button>
        <h1>Perfil de {userData.username}</h1>
      </div>

      <div className={styles.perfilContent}>
        {/* Bloque izquierdo con avatar y datos */}
        <div className={styles.leftBlock}>
          <div className={styles.avatarContainer}>
            {userData.avatar?.url ? (
              <img 
                src={userData.avatar.url} 
                alt={`Avatar de ${userData.username}`} 
                className={styles.avatar}
              />
            ) : (
              <div className={styles.avatarPlaceholder}>
                {userData.username?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {(userData.name || userData.surname) && (
            <h2 className={styles.fullName}>
              {userData.name} {userData.surname}
            </h2>
          )}
          <p className={styles.username}>@{userData.username}</p>
          {userData.Carrera && (
            <span className={styles.carrera}>{userData.Carrera}</span>
          )}

          {isCurrentUser && (
            <p className={styles.sosVos}>¡Sos vos! 👋</p>
          )}
        </div>

        {/* Bloque derecho: contenido según rol */}
        <div className={styles.rightBlock}>
          {/* Navegación con tabs */}
          <div className={styles.navigation}>
            {showUsinas && (
              <button 
                className={`${styles.navButton} ${activeTab === 'trabajos' ? styles.active : ''}`}
                onClick={() => setActiveTab('trabajos')}
              >
                Trabajos ({usinasWithImages.length})
              </button>
            )}
            {showAgendas && (
              <button 
                className={`${styles.navButton} ${activeTab === 'agendas' ? styles.active : ''}`}
                onClick={() => setActiveTab('agendas')}
              >
                Agendas ({agendasWithImages.length})
              </button>
            )}
            {isCurrentUser && (
              <button 
                className={`${styles.navButton} ${activeTab === 'informacion' ? styles.active : ''}`}
                onClick={() => setActiveTab('informacion')}
              >
                Información Personal
              </button>
            )}
          </div>

          {/* Contenido de la pestaña activa */}
          {imagesLoading && activeTab !== 'informacion' ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner}></div>
              <p>Cargando contenido...</p>
            </div>
          ) : (
            <div className={styles.tabContent}>
              {renderContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}