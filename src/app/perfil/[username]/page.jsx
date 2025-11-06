'use client';

import { useState, useEffect, use } from 'react';
import { API_URL, API_TOKEN } from "@/app/config";
import styles from "@/styles/components/Perfil/PerfilPublico.module.css";
import agendaStyles from "@/styles/components/Agenda/Agenda.module.css";
import InformacionPersonal from './InformacionPersonal';
import Footer from '@/app/componentes/construccion/Footer';
import Header from '@/app/componentes/construccion/Header';
import UsinaGallery from './usina/UsinaGallery';
import CrearUsinaModal from './usina/CrearUsinaModal';
import { Toaster } from 'react-hot-toast';
import { isNativePlatform, openMediaPicker } from '@/app/utils/mediaPicker';

/* =========================================================
   Funciones para manejar media (imágenes y videos)
========================================================= */
const getPreviewUrl = (media) => {
  if (!media) return '/img/placeholder.jpg';
  
  // Para imágenes - usar la URL original
  if (media.mime?.startsWith('image/')) {
    return media.url;
  }
  
  // Para videos - usar el preview GIF si existe
  if (media.mime?.startsWith('video/') && media.previewUrl) {
    return media.previewUrl;
  }
  
  // Fallback
  return media.url || '/img/placeholder.jpg';
};

const getMediaUrl = (media) => {
  if (!media) return '/img/placeholder.jpg';
  
  // Para ambos casos (imágenes y videos) usar la URL original
  return media.url || '/img/placeholder.jpg';
};

const getMediaType = (media) => {
  if (!media) return 'image';
  return media.mime?.startsWith('video/') ? 'video' : 'image';
};

export default function PerfilPublicoPage({ params }) {
  const { username } = use(params);
  const [userData, setUserData] = useState(null);
  const [usinas, setUsinas] = useState([]);
  const [agendas, setAgendas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('trabajos');
  const [agendasWithImages, setAgendasWithImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [showCrearUsinaModal, setShowCrearUsinaModal] = useState(false);
  const [showAvatarOverlay, setShowAvatarOverlay] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  /* =================== NUEVO: Manejo de selección de avatar con Capacitor =================== */
  const handleAvatarSelect = async () => {
    if (uploadingAvatar) return;

    try {
      setUploadingAvatar(true);

      const mediaResult = await openMediaPicker({
        source: 'photos',
        allowEditing: true,
        quality: 90,
        resultType: 'DataUrl'
      });

      if (!mediaResult || !mediaResult.file) {
        console.log('Usuario canceló la selección');
        return;
      }

      const file = mediaResult.file;

      // Validaciones para avatar
      const okImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
      const maxMB = 2;

      if (!file.type.startsWith('image/')) {
        toast.error('Solo se permiten imágenes para el avatar.');
        return;
      }

      if (!okImageTypes.includes(file.type)) {
        toast.error('Formato de imagen inválido (JPG, PNG, WEBP o AVIF).');
        return;
      }

      if (file.size > maxMB * 1024 * 1024) {
        toast.error(`La imagen supera ${maxMB} MB.`);
        return;
      }

      // Subir avatar
      const token = localStorage.getItem('jwt');
      if (!token) {
        toast.error('No hay token. Iniciá sesión.');
        return;
      }

      const fd = new FormData();
      fd.append('files', file);
      
      const uploadRes = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!uploadRes.ok) {
        throw new Error('Error al subir la imagen');
      }

      const uploadData = await uploadRes.json();
      const avatarId = uploadData?.[0]?.id;

      if (!avatarId) {
        throw new Error('No se pudo obtener el ID del avatar');
      }

      // Actualizar usuario con nuevo avatar
      const updateRes = await fetch(`${API_URL}/users/${currentUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          avatar: avatarId
        }),
      });

      if (!updateRes.ok) {
        throw new Error('Error al actualizar el avatar');
      }

      // Actualizar estado local con la nueva imagen
      const updatedAvatar = {
        id: avatarId,
        url: uploadData[0].url,
        // Agregar otros campos que pueda necesitar
      };

      setUserData(prev => ({
        ...prev,
        avatar: updatedAvatar
      }));

      toast.success('Avatar actualizado correctamente');

    } catch (err) {
      console.error('Error actualizando avatar:', err);
      toast.error('Error al actualizar el avatar: ' + err.message);
    } finally {
      setUploadingAvatar(false);
      setShowAvatarOverlay(false);
    }
  };

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
        const token = localStorage.getItem('jwt');
        if (token) {
          try {
            const userRes = await fetch(`${API_URL}/users/me`, {
              headers: { 
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
            });
            
            if (userRes.ok) {
              const userData = await userRes.json();
              console.log('Usuario logueado:', userData);
              setCurrentUser(userData);
            }
          } catch (err) {
            console.error('Error al obtener usuario logueado:', err);
          }
        }

        // Obtener datos del usuario
        const usersResponse = await fetch(
          `${API_URL}/users?filters[username][$eq]=${username}&populate[0]=role&populate[1]=avatar&populate[2]=usinas_creadas.media&populate[3]=agendas_creadas.imagen`,
          {
            headers: {
              'Authorization': `Bearer ${API_TOKEN}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (!usersResponse.ok) throw new Error('Error al cargar el usuario');

        const usersData = await usersResponse.json();
        const users = usersData.data || usersData;

        if (!users || users.length === 0) throw new Error('Usuario no encontrado');

        const user = users[0];
        setUserData(user);

        // Procesar usinas
        let approvedUsinas = [];
        if (user.usinas_creadas) {
          const uniqueUsinas = user.usinas_creadas.filter((usina, index, self) => 
            index === self.findIndex(u => u.documentId === usina.documentId)
          );
          
          approvedUsinas = uniqueUsinas.filter(usina => {
            return usina.aprobado === 'aprobada';
          });
          
          // Procesar media de usinas aquí mismo
          const usinasWithMedia = approvedUsinas.map(usina => {
            const media = usina.media;
            const previewUrl = getPreviewUrl(media);
            const mediaUrl = getMediaUrl(media);
            
            return {
              ...usina,
              previewUrl,
              mediaUrl,
              mediaType: media?.mime?.startsWith('video/') ? 'video' : 'image',
              mimeType: media?.mime,
              creador: {
                name: user.name || '',
                surname: user.surname || '',
                username: user.username || '',
                carrera: user.carrera || '',
              }
            };
          });
          
          setUsinas(usinasWithMedia);
        }

        // Procesar agendas
        let approvedAgendas = [];
        if (user.agendas_creadas) {
          const uniqueAgendas = user.agendas_creadas.filter((agenda, index, self) => 
            index === self.findIndex(a => a.documentId === agenda.documentId)
          );
          
          approvedAgendas = uniqueAgendas.filter(agenda => {
            return agenda.aprobado === 'aprobada';
          });
          
          setAgendas(approvedAgendas);
        }

        // Cargar imágenes para agendas
        await fetchAgendasImages(approvedAgendas);

      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
        setImagesLoading(false);
      }
    };

    const fetchAgendasImages = async (agendas) => {
      try {
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
                
                let imageUrl = '/placeholder.jpg';
                const imagen = agendaWithImage.imagen;
                
                if (imagen?.url) {
                  imageUrl = imagen.url;
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

        setAgendasWithImages(agendasWithImagesData);

      } catch (error) {
        setAgendasWithImages(agendas.map(a => ({ ...a, imageUrl: '/placeholder.jpg' })));
      }
    };

    fetchData();
  }, [username]);

  const handleUsinaCreada = (nuevaUsina) => {
    console.log('Nueva usina creada:', nuevaUsina);
  };

  // Función para actualizar el avatar desde InformacionPersonal
  const handleAvatarUpdate = (newAvatarData) => {
    setUserData(prev => ({
      ...prev,
      avatar: newAvatarData
    }));
  };

  // Función para actualizar datos del usuario desde InformacionPersonal
  const handleUserDataUpdate = (updatedData) => {
    setUserData(prev => ({
      ...prev,
      ...updatedData
    }));
  };

  const handleAvatarOverlayChange = (show) => {
    setShowAvatarOverlay(show);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'informacion') {
      setShowAvatarOverlay(false);
    }
  };

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

  const showUsinas = userRole === 'estudiante' || ['profesor', 'administrador', 'superadministrador'].includes(userRole?.toLowerCase());
  const showAgendas = ['profesor', 'administrador', 'superadministrador'].includes(userRole?.toLowerCase());

  // 🔥 NUEVA LÓGICA: Calcular si hay tabs para mostrar
  const hasTabsToShow = showUsinas || showAgendas || isCurrentUser;
  const forceInfoTab = !hasTabsToShow && isCurrentUser;

  const renderContent = () => {
    switch (activeTab) {
      case 'trabajos':
        return (
          <>
            {isCurrentUser && (
              <div className={styles.crearUsinaHeader}>
                <h2 className={styles.sectionTitle}>Mis Trabajos</h2>
                <button 
                  className={styles.crearUsinaButton}
                  onClick={() => setShowCrearUsinaModal(true)}
                >
                  Subir trabajo
                </button>
              </div>
            )}
            <UsinaGallery 
              usinas={usinas}
              loading={imagesLoading}
              isCurrentUser={isCurrentUser}
              currentUserId={currentUser?.id}
            />
          </>
        );

      case 'agendas':
        return (
          <div className={styles.agendasGridContainer}>
            {agendasWithImages.length > 0 ? (
              <div className={styles.agendasGrid}>
                {agendasWithImages.map((agenda) => (
                  <div key={agenda.id} className={styles.agendaCard}>
                    {agenda.imageUrl && (
                      <img
                        src={agenda.imageUrl}
                        alt="Imagen del evento"
                        className={styles.imagenAgenda}
                      />
                    )}
                    
                    {/* Vista compacta (siempre visible) */}
                    <div className={styles.agendaContenido}>
                      <div className={styles.fecha}>
                        <p>{new Date(agenda.fecha).toLocaleDateString("es-AR")}</p>
                      </div>
                      <p className={styles.textoRegular}>
                        {agenda.tituloActividad}
                      </p>
                    </div>

                    {/* Overlay con detalle (aparece en hover) */}
                    <div className={styles.agendaContenidoHover}>
                      <p className={styles.textoRegular}>
                        {agenda.tituloActividad}
                      </p>
                      <div className={styles.textoContenidoActividad}>
                        <p>{agenda.contenidoActividad}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noPublicaciones}>
                Este usuario aún no ha publicado agendas aprobadas.
              </p>
            )}
          </div>
        );

      case 'informacion':
        return (
          <InformacionPersonal 
            userData={userData}
            isCurrentUser={isCurrentUser}
            onAvatarUpdate={handleAvatarUpdate}
            onUserDataUpdate={handleUserDataUpdate}
            onAvatarOverlayChange={handleAvatarOverlayChange}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className={styles.bodyPerfil}>
      <div className={styles.perfilPublicoContainer}>
        <div className={`${styles.header} mb-5`}>
          <Header variant='dark'/>
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
              {isCurrentUser && activeTab === 'informacion' && showAvatarOverlay && (
                <div className={styles.avatarEditOverlay}>
                  <button 
                    type="button"
                    onClick={handleAvatarSelect}
                    className={styles.avatarUploadButton}
                    disabled={uploadingAvatar}
                  >
                    {uploadingAvatar ? (
                      'Subiendo...'
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                      </svg>
                    )}
                  </button>
                </div>
              )}
            </div>

            {(userData.name || userData.surname) && (
              <h2 className={styles.fullName}>
                {userData.name} {userData.surname}
              </h2>
            )}
            <p className={styles.username}>@{userData.username}</p>
            {userData.carrera && (
              <span className={styles.carrera}>{userData.carrera}</span>
            )}

            {isCurrentUser && (
              <p className={styles.sosVos}>Este es tu perfíl</p>
            )}
          </div>

          {/* Bloque derecho: contenido según rol */}
          <div className={styles.rightBlock}>
            {/* Navegación con tabs */}
            <div className={styles.navigation}>
              {showUsinas && (
                <button 
                  className={`${styles.navButton} ${activeTab === 'trabajos' ? styles.active : ''}`}
                  onClick={() => handleTabChange('trabajos')}
                >
                  Trabajos ({usinas.length})
                </button>
              )}
              {showAgendas && (
                <button 
                  className={`${styles.navButton} ${activeTab === 'agendas' ? styles.active : ''}`}
                  onClick={() => handleTabChange('agendas')}
                >
                  Agendas ({agendas.length})
                </button>
              )}
              {(isCurrentUser || forceInfoTab) && (
                <button 
                  className={`${styles.navButton} ${activeTab === 'informacion' ? styles.active : ''}`}
                  onClick={() => handleTabChange('informacion')}
                >
                  Información Personal
                </button>
              )}
            </div>

            {/* Contenido de la pestaña activa */}
            {!hasTabsToShow && !forceInfoTab ? (
              <div className={styles.noContent}>
                <p>Este perfil no tiene contenido público disponible.</p>
              </div>
            ) : (
              <div className={styles.tabContent}>
                {renderContent()}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal para crear usina */}
      <CrearUsinaModal
        isOpen={showCrearUsinaModal}
        onClose={() => setShowCrearUsinaModal(false)}
        userId={currentUser?.id}
        userData={userData}
        onUsinaCreada={handleUsinaCreada}
      />

      <Footer />
      
      {/* Toaster para notificaciones */}
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
        }}
      />
    </div>
  );
}