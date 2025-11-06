'use client';

import { useState, useEffect } from 'react';
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
  // 🚫 No usar `use(params)` aquí
  const username = params?.username;

  const [userData, setUserData] = useState(null);
  const [usinas, setUsinas] = useState([]);                 // solo aprobadas para mostrar a terceros
  const [usinasTotalCount, setUsinasTotalCount] = useState(0); // 🔢 TODAS las usinas (cualquier estado)
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
            if (userRes.ok) setCurrentUser(await userRes.json());
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

        // USINAS: contamos TODAS (sin importar estado) y además preparamos "aprobadas" para la vista pública
        if (Array.isArray(user.usinas_creadas)) {
          // Unique por documentId
          const uniqueAll = user.usinas_creadas.filter(
            (u, i, self) => i === self.findIndex((x) => x.documentId === u.documentId)
          );

          // 🔢 Conteo total (independiente del estado)
          setUsinasTotalCount(uniqueAll.length);

          // Para mostrar en la galería de terceros: solo aprobadas (tu componente UsinaGallery ya carga todas para el propio dueño)
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
        } else {
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
  }, [username]);

  const handleUsinaCreada = (nuevaUsina) => {
    // Al crear, normalmente queda "pendiente": sumamos al contador total.
    setUsinasTotalCount((c) => c + 1);
    // Si querés, podés optimizar agregando al estado visible si viene aprobada.
  };

  // Update desde InformacionPersonal
  const handleAvatarUpdate = (newAvatarData) => {
    setUserData((prev) => ({ ...prev, avatar: newAvatarData }));
  };
  const handleUserDataUpdate = (updatedData) => {
    setUserData((prev) => ({ ...prev, ...updatedData }));
  };
  const handleAvatarOverlayChange = (show) => setShowAvatarOverlay(show);
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab !== 'informacion') setShowAvatarOverlay(false);
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
                  {/* 🔢 ahora muestra el total real de usinas, sin importar estado */}
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
