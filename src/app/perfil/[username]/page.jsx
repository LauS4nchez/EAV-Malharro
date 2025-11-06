'use client';

import { useState, useEffect, use } from 'react';
import { API_URL, API_TOKEN, URL } from "@/app/config";
import styles from "@/styles/components/Perfil/PerfilPublico.module.css";
import agendaStyles from "@/styles/components/Agenda/Agenda.module.css";
import InformacionPersonal from './InformacionPersonal';
import Footer from '@/app/componentes/construccion/Footer';
import Header from '@/app/componentes/construccion/Header';
import UsinaGallery from './usina/UsinaGallery';
import CrearUsinaModal from './usina/CrearUsinaModal';
import { Toaster } from 'react-hot-toast';

export default function PerfilPublicoPage({ params }) {
  // ✅ Usar use(params) para Next.js 14+ con Server Components
  const { username } = use(params);

  const [userData, setUserData] = useState(null);
  const [usinas, setUsinas] = useState([]);
  const [usinasTotalCount, setUsinasTotalCount] = useState(0);
  const [agendas, setAgendas] = useState([]);
  const [agendasWithImages, setAgendasWithImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [activeTab, setActiveTab] = useState('trabajos');
  const [showCrearUsinaModal, setShowCrearUsinaModal] = useState(false);
  const [showAvatarOverlay, setShowAvatarOverlay] = useState(false);

  // Helpers para media (normaliza URL absoluta)
  const withBase = (u) => (u?.startsWith('http') ? u : (u ? `${URL}${u}` : '/img/placeholder.jpg'));

  const getPreviewUrl = (media) => {
    if (!media) return '/img/placeholder.jpg';
    // v4/v5: media puede venir como {data:{attributes:{url,mime,previewUrl}}} o plano
    const m = media?.data?.attributes || media;
    if (m?.mime?.startsWith('image/')) return withBase(m.url);
    if (m?.mime?.startsWith('video/')) return withBase(m.previewUrl || m.url);
    return withBase(m?.url);
  };

  const getMediaUrl = (media) => {
    if (!media) return '/img/placeholder.jpg';
    const m = media?.data?.attributes || media;
    return withBase(m?.url);
  };

  // 🔢 Fallback para contar TODAS las usinas (por si la relación viene paginada)
  const fetchTotalUsinasCount = async (userId) => {
    try {
      const res = await fetch(
        `${API_URL}/usinas?filters[creador][id][$eq]=${userId}` +
          `&publicationState=preview&fields[0]=id&pagination[page]=1&pagination[pageSize]=1`,
        { headers: { Authorization: `Bearer ${API_TOKEN}` } }
      );
      const json = await res.json();
      const total = json?.meta?.pagination?.total;
      if (Number.isInteger(total)) {
        setUsinasTotalCount(total);
      }
    } catch (e) {
      // si falla, nos quedamos con el conteo de la relación
      console.warn('No se pudo obtener meta.pagination.total de usinas:', e);
    }
  };

  // 🔄 Función para cargar todas las usinas del usuario (incluyendo rechazadas/pendientes)
  const fetchAllUserUsinas = async (userId) => {
    try {
      const jwt = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
      
      const headers = jwt
        ? { Authorization: `Bearer ${jwt}` }
        : API_TOKEN
        ? { Authorization: `Bearer ${API_TOKEN}` }
        : {};

      const qs =
        `filters[creador][id][$eq]=${userId}` +
        `&publicationState=preview` +
        `&sort=createdAt:desc` +
        `&pagination[pageSize]=200` +
        `&populate[0]=media` +
        `&populate[1]=creador`;

      const res = await fetch(`${API_URL}/usinas?${qs}`, { headers });
      const json = await res.json().catch(() => null);
      const items = Array.isArray(json?.data) ? json.data : [];

      // Normalización de usinas
      const normalizedUsinas = items.map((item) => {
        const a = item.attributes ?? item;

        // media
        let mediaUrl = '/placeholder.jpg';
        let previewUrl = '/placeholder.jpg';
        let mediaType = 'image';
        const mediaField = a.media;
        const mediaData = mediaField?.data ?? mediaField;
        const mediaAttrs = mediaData?.attributes ?? mediaData;
        const urlPath = mediaAttrs?.url;
        const mime = mediaAttrs?.mime || '';
        
        if (urlPath) {
          const fullUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;
          mediaUrl = fullUrl;
          
          // Para videos, usar previewUrl si existe, sino usar la miniatura de Strapi
          if (mime.startsWith('video/')) {
            mediaType = 'video';
            previewUrl = a.previewUrl || mediaAttrs?.formats?.thumbnail?.url 
              ? `${URL}${mediaAttrs.formats.thumbnail.url}`
              : fullUrl;
          } else {
            previewUrl = fullUrl;
          }
        }

        // creador
        const creadorField = a.creador;
        const creadorData = creadorField?.data ?? creadorField;
        const creadorAttrs = creadorData?.attributes ?? creadorData;

        return {
          id: item.id,
          documentId: item.documentId ?? item.id,
          titulo: a.titulo ?? 'Sin título',
          aprobado: (a.aprobado ?? 'pendiente').toLowerCase(),
          mediaUrl,
          previewUrl,
          mediaType,
          creador: creadorAttrs
            ? {
                id: creadorData?.id,
                name: creadorAttrs.name || '',
                surname: creadorAttrs.surname || '',
                username: creadorAttrs.username || '',
                carrera: creadorAttrs.carrera || 'Sin carrera',
              }
            : null,
          createdAt: a.createdAt || item.createdAt,
          publishedAt: a.publishedAt || item.publishedAt,
          link: a.link || null,
        };
      });

      return normalizedUsinas;
    } catch (error) {
      console.error('Error al cargar todas las usinas del usuario:', error);
      return [];
    }
  };

  useEffect(() => {
    // Sincronizar tab con hash
    const hash = typeof window !== 'undefined' ? window.location.hash : '';
    if (hash === '#trabajos') setActiveTab('trabajos');
    else if (hash === '#agendas') setActiveTab('agendas');
    else if (hash === '#informacion') setActiveTab('informacion');

    const fetchData = async () => {
      try {
        // Usuario logueado
        const token = typeof window !== 'undefined' ? localStorage.getItem('jwt') : null;
        if (token) {
          try {
            const userRes = await fetch(`${API_URL}/users/me`, {
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            });
            if (userRes.ok) {
              const currentUserData = await userRes.json();
              setCurrentUser(currentUserData);
              
              // Si es el perfil del usuario actual, cargar TODAS las usinas (incluyendo rechazadas/pendientes)
              if (currentUserData.username === username) {
                const allUsinas = await fetchAllUserUsinas(currentUserData.id);
                setUsinas(allUsinas);
                setUsinasTotalCount(allUsinas.length);
              }
            }
          } catch (err) {
            console.error('Error al obtener usuario logueado:', err);
          }
        }

        // Datos del perfil (populate usinas + agendas con imagen)
        const usersResponse = await fetch(
          `${API_URL}/users?filters[username][$eq]=${encodeURIComponent(username)}` +
            `&populate[0]=role&populate[1]=avatar&populate[2]=usinas_creadas.media&populate[3]=agendas_creadas.imagen`,
          { headers: { Authorization: `Bearer ${API_TOKEN}`, 'Content-Type': 'application/json' } }
        );
        if (!usersResponse.ok) throw new Error('Error al cargar el usuario');

        const usersData = await usersResponse.json();
        const users = usersData?.data || usersData;
        if (!users || users.length === 0) throw new Error('Usuario no encontrado');

        const user = users[0];
        setUserData(user);

        // Solo procesar usinas si NO es el usuario actual (ya las cargamos arriba)
        const isCurrentUser = currentUser && currentUser.username === username;
        if (!isCurrentUser && Array.isArray(user.usinas_creadas)) {
          // Unique por documentId
          const uniqueAll = user.usinas_creadas.filter(
            (u, i, self) => i === self.findIndex((x) => x.documentId === u.documentId)
          );

          // 🔢 Conteo total (independiente del estado)
          setUsinasTotalCount(uniqueAll.length);

          // Para mostrar en la galería de terceros: solo aprobadas
          const approvedUsinas = uniqueAll
            .filter((u) => (u.aprobado || '').toLowerCase() === 'aprobada')
            .map((usina) => {
              const media = usina.media;
              const previewUrl = getPreviewUrl(media);
              const mediaUrl = getMediaUrl(media);
              return {
                ...usina,
                previewUrl,
                mediaUrl,
                mediaType:
                  (media?.data?.attributes?.mime || media?.mime || '').startsWith('video/')
                    ? 'video'
                    : 'image',
                creador: {
                  name: user.name || '',
                  surname: user.surname || '',
                  username: user.username || '',
                  carrera: user.carrera || '',
                },
              };
            });

          setUsinas(approvedUsinas);

          // Fallback para conteo exacto desde Strapi (por si la relación viniera recortada)
          if (user?.id) {
            fetchTotalUsinasCount(user.id);
          }
        } else if (!isCurrentUser) {
          setUsinas([]);
          setUsinasTotalCount(0);
        }

        // AGENDAS (ya vienen populateadas con imagen → NO volver a pedir por /agendas/:id)
        if (Array.isArray(user.agendas_creadas)) {
          const uniqueAgendas = user.agendas_creadas.filter(
            (a, i, self) => i === self.findIndex((x) => x.documentId === a.documentId)
          );

          const agendasMapped = uniqueAgendas.map((agenda) => {
            const img = agenda?.imagen?.data?.attributes || agenda?.imagen;
            const imageUrl = withBase(img?.url);
            return { ...agenda, imageUrl };
          });

          setAgendas(agendasMapped);
          setAgendasWithImages(agendasMapped);
        } else {
          setAgendas([]);
          setAgendasWithImages([]);
        }
      } catch (err) {
        console.error(err);
        setError(err.message || 'Error desconocido');
      } finally {
        setLoading(false);
        setImagesLoading(false);
      }
    };

    fetchData();
  }, [username, currentUser]);

  const handleUsinaCreada = async (nuevaUsina) => {
    // Al crear una usina, actualizar la lista si es el usuario actual
    const isCurrent = currentUser && currentUser.username === username;
    if (isCurrent && currentUser?.id) {
      const allUsinas = await fetchAllUserUsinas(currentUser.id);
      setUsinas(allUsinas);
      setUsinasTotalCount(allUsinas.length);
    } else {
      // Si no es el usuario actual, solo incrementar el contador
      setUsinasTotalCount((c) => c + 1);
    }
  };

  // Update desde InformacionPersonal
  const handleAvatarUpdate = (newAvatarData) => {
    setUserData((prev) => ({ ...prev, avatar: newAvatarData }));
  };
  const handleUserDataUpdate = (updatedData) => {
    setUserData((prev) => ({ ...prev, ...updatedData }));
  };
  const handleAvatarOverlayChange = (show) => setShowAvatarOverlay(show);

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
        <button onClick={() => (window.location.href = '/')} className={styles.backButton}>
          Volver al inicio
        </button>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className={styles.errorContainer}>
        <h2>Usuario no encontrado</h2>
        <button onClick={() => (window.location.href = '/')} className={styles.backButton}>
          Volver al inicio
        </button>
      </div>
    );
  }

  const userRole = userData.role?.type || userData.role?.name;
  const isCurrent = currentUser && currentUser.username === userData.username;

  const showUsinas =
    userRole === 'estudiante' ||
    ['profesor', 'administrador', 'superadministrador'].includes(userRole?.toLowerCase());

  const showAgendas = ['profesor', 'administrador', 'superadministrador'].includes(
    userRole?.toLowerCase()
  );

  const hasTabsToShow = showUsinas || showAgendas || isCurrent;
  const forceInfoTab = !hasTabsToShow && isCurrent;

  // Agendas visibles: si es tu perfil → todas; si no → solo aprobadas
  const agendasVisibles = (isCurrent ? agendasWithImages : agendasWithImages.filter(a => (a.aprobado || '').toLowerCase() === 'aprobada'))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  const renderContent = () => {
    switch (activeTab) {
      case 'trabajos':
        return (
          <>
            {isCurrent && (
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
              isCurrentUser={isCurrent}
              currentUserId={currentUser?.id}
            />
          </>
        );

      case 'agendas':
        return (
          <div className={styles.agendasGridContainer}>
            {agendasVisibles.length > 0 ? (
              <div className={styles.agendasGrid}>
                {agendasVisibles.map((agenda) => (
                  <div key={agenda.documentId || agenda.id} className={styles.agendaCard}>
                    {agenda.imageUrl && (
                      <img
                        src={agenda.imageUrl}
                        alt="Imagen del evento"
                        className={styles.imagenAgenda}
                      />
                    )}

                    {/* Vista compacta */}
                    <div className={styles.agendaContenido}>
                      <div className={styles.fecha}>
                        <p>{agenda.fecha ? new Date(agenda.fecha).toLocaleDateString('es-AR') : ''}</p>
                      </div>
                      <p className={styles.textoRegular}>{agenda.tituloActividad}</p>
                    </div>

                    {/* Hover detalle */}
                    <div className={styles.agendaContenidoHover}>
                      <p className={styles.textoRegular}>{agenda.tituloActividad}</p>
                      <div className={styles.textoContenidoActividad}>
                        <p>{agenda.contenidoActividad}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.noPublicaciones}>
                {isCurrent
                  ? 'Todavía no creaste agendas.'
                  : 'Este usuario aún no ha publicado agendas aprobadas.'}
              </p>
            )}
          </div>
        );

      case 'informacion':
        return (
          <InformacionPersonal
            userData={userData}
            isCurrentUser={isCurrent}
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
          <Header variant="dark" />
        </div>

        <div className={styles.perfilContent}>
          {/* Izquierda: avatar + datos */}
          <div className={styles.leftBlock}>
            <div className={styles.avatarContainer}>
              {userData.avatar?.url ? (
                <img
                  src={withBase(userData.avatar.url)}
                  alt={`Avatar de ${userData.username}`}
                  className={styles.avatar}
                />
              ) : (
                <div className={styles.avatarPlaceholder}>
                  {userData.username?.charAt(0).toUpperCase()}
                </div>
              )}

              {isCurrent && activeTab === 'informacion' && showAvatarOverlay && (
                <div className={styles.avatarEditOverlay}>
                  <label htmlFor="avatar-upload" className={styles.avatarUploadLabel}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                  </label>
                </div>
              )}
            </div>

            {(userData.name || userData.surname) && (
              <h2 className={styles.fullName}>
                {userData.name} {userData.surname}
              </h2>
            )}
            <p className={styles.username}>@{userData.username}</p>
            {userData.carrera && <span className={styles.carrera}>{userData.carrera}</span>}

            {isCurrent && <p className={styles.sosVos}>Este es tu perfíl</p>}
          </div>

          {/* Derecha: tabs + contenido */}
          <div className={styles.rightBlock}>
            <div className={styles.navigation}>
              {showUsinas && (
                <button
                  className={`${styles.navButton} ${activeTab === 'trabajos' ? styles.active : ''}`}
                  onClick={() => setActiveTab('trabajos')}
                >
                  Trabajos ({usinasTotalCount})
                </button>
              )}
              {showAgendas && (
                <button
                  className={`${styles.navButton} ${activeTab === 'agendas' ? styles.active : ''}`}
                  onClick={() => setActiveTab('agendas')}
                >
                  Agendas ({
                    (isCurrent
                      ? agendasWithImages
                      : agendasWithImages.filter(a => (a.aprobado || '').toLowerCase() === 'aprobada')
                    ).length
                  })
                </button>
              )}
              {(isCurrent || forceInfoTab) && (
                <button
                  className={`${styles.navButton} ${activeTab === 'informacion' ? styles.active : ''}`}
                  onClick={() => setActiveTab('informacion')}
                >
                  Información Personal
                </button>
              )}
            </div>

            {!hasTabsToShow && !forceInfoTab ? (
              <div className={styles.noContent}>
                <p>Este perfil no tiene contenido público disponible.</p>
              </div>
            ) : (
              <div className={styles.tabContent}>{renderContent()}</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal crear usina */}
      <CrearUsinaModal
        isOpen={showCrearUsinaModal}
        onClose={() => setShowCrearUsinaModal(false)}
        userId={currentUser?.id}
        userData={userData}
        onUsinaCreada={handleUsinaCreada}
      />

      <Footer />

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
        }}
      />
    </div>
  );
}