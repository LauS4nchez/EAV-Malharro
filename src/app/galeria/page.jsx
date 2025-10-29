'use client';

import { useEffect, useState } from 'react';
import { API_URL, API_TOKEN } from '@/app/config';
import Header from '../componentes/construccion/Header';
import Footer from '../componentes/construccion/Footer';
import styles from '@/styles/components/Usina/Galeria.module.css';
import GaleriaFiltros from './GaleriaFiltros';

export default function GaleriaPage() {
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUsina, setSelectedUsina] = useState(null);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCarrera, setFilterCarrera] = useState('');
  const [filterAutor, setFilterAutor] = useState('');
  const [sortBy, setSortBy] = useState('newest');

  const getPreviewUrl = (media) => {
    if (!media) return '/img/placeholder.jpg';
    
    if (media.mime?.startsWith('image/')) {
      return media.url;
    }
    
    if (media.mime?.startsWith('video/') && media.previewUrl) {
      return media.previewUrl;
    }
    
    return media.url || '/img/placeholder.jpg';
  };

  const getMediaUrl = (media) => {
    if (!media) return '/img/placeholder.jpg';
    return media.url || '/img/placeholder.jpg';
  };

  useEffect(() => {
    const fetchAllUsinas = async () => {
      try {
        const res = await fetch(
          `${API_URL}/usinas?populate=*&filters[aprobado][$eq]=aprobada&sort=createdAt:desc`,
          {
            headers: {
              Authorization: `Bearer ${API_TOKEN}`,
            },
            cache: 'no-store',
          }
        );

        if (!res.ok) {
          console.error('Error en fetch usinas:', res.status, res.statusText);
          setUsinas([]);
          return;
        }

        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const normalized = items
          .map((item) => {
            if (!item) return null;

            const previewUrl = getPreviewUrl(item.media);
            const mediaUrl = getMediaUrl(item.media);
            
            const creador = item.creador;

            return {
              id: item.id,
              titulo: item.titulo || 'Sin título',
              creado: item.createdAt || item.publishedAt || null,
              previewUrl,
              mediaUrl,
              creador: creador ? {
                name: creador.name || '',
                surname: creador.surname || '',
                username: creador.username || '',
                carrera: creador.carrera || 'Sin carrera',
              } : null,
              mediaType: item.media?.mime?.startsWith('video/') ? 'video' : 'image',
              mimeType: item.media?.mime
            };
          })
          .filter(Boolean);

        setUsinas(normalized);
      } catch (err) {
        console.error('Error al obtener usinas:', err);
        setUsinas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAllUsinas();
  }, []);

  // Filtrar y ordenar usinas
  const filteredAndSortedUsinas = usinas
    .filter(usina => {
      // Filtro por búsqueda en título
      const matchesSearch = searchTerm === '' || 
        usina.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (usina.creador?.name && usina.creador.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (usina.creador?.surname && usina.creador.surname.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filtro por carrera
      const matchesCarrera = filterCarrera === '' || 
        usina.creador?.carrera === filterCarrera;

      // Filtro por autor
      const matchesAutor = filterAutor === '' ||
        (usina.creador?.name && usina.creador.name.toLowerCase().includes(filterAutor.toLowerCase())) ||
        (usina.creador?.surname && usina.creador.surname.toLowerCase().includes(filterAutor.toLowerCase())) ||
        (usina.creador?.username && usina.creador.username.toLowerCase().includes(filterAutor.toLowerCase()));

      return matchesSearch && matchesCarrera && matchesAutor;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.creado) - new Date(b.creado);
        case 'title-asc':
          return a.titulo.localeCompare(b.titulo);
        case 'title-desc':
          return b.titulo.localeCompare(a.titulo);
        case 'newest':
        default:
          return new Date(b.creado) - new Date(a.creado);
      }
    });

  const handleCardClick = (usina) => {
    setSelectedUsina(usina);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedUsina(null);
    document.body.style.overflow = 'auto';
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <p>Cargando galería...</p>
      </div>
    );
  }

  return (
    <div>
        <Header variant='dark'/>
        <div className={`${styles.galeriaContainer} mt-5`}>
        <div className={styles.galeriaContent}>
            {/* Header */}
            <div className={styles.galeriaTitulo}>
            <h1>Galería de Trabajos</h1>
            </div>

            <div className={styles.galeriaDescripcion}>
            <p>Explorá todos los trabajos y proyectos creados por nuestros estudiantes y egresados.</p>
            </div>

            {/* Filtros */}
            <GaleriaFiltros
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            filterCarrera={filterCarrera}
            onCarreraChange={setFilterCarrera}
            filterAutor={filterAutor}
            onAutorChange={setFilterAutor}
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultadosCount={filteredAndSortedUsinas.length}
            totalCount={usinas.length}
            />
            <div>
                {/* Galería */}
                    <div className={styles.galeriaGrid}>
                    {filteredAndSortedUsinas.length > 0 ? (
                        filteredAndSortedUsinas.map((usina) => (
                        <div
                            key={usina.id}
                            className={styles.galeriaCard}
                            onClick={() => handleCardClick(usina)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => (e.key === 'Enter' ? handleCardClick(usina) : null)}
                        >
                            <img 
                            src={usina.previewUrl} 
                            alt={usina.titulo} 
                            className={styles.galeriaImage}
                            />
                            <div className={styles.cardOverlay}>
                            <h3 className={styles.cardTitle}>{usina.titulo}</h3>
                            {usina.creador && (
                                <p className={styles.cardAuthor}>
                                {usina.creador.name} {usina.creador.surname}
                                </p>
                            )}
                            {usina.creador?.carrera && (
                                <p className={styles.cardCarrera}>{usina.creador.carrera}</p>
                            )}
                            </div>
                        </div>
                        ))
                    ) : (
                        <div className={styles.noResults}>
                        <p>No se encontraron trabajos que coincidan con los filtros seleccionados.</p>
                        </div>
                    )}
                    </div>
                </div>
            </div>

        {/* Modal */}
        {selectedUsina && (
            <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.closeButton} onClick={closeModal}>✕</button>

                <div className={styles.modalImageContainer}>
                {selectedUsina.mediaType === 'video' ? (
                    <video 
                    src={selectedUsina.mediaUrl} 
                    className={styles.modalImage}
                    controls
                    autoPlay
                    muted
                    playsInline
                    >
                    Tu navegador no soporta el elemento de video.
                    </video>
                ) : (
                    <img src={selectedUsina.mediaUrl} alt={selectedUsina.titulo} className={styles.modalImage} />
                )}
                </div>

                <div className={styles.modalInfo}>
                <h2>{selectedUsina.titulo}</h2>

                {selectedUsina.creador && (
                    <p>
                    <strong>Creador:</strong> {selectedUsina.creador.name} {selectedUsina.creador.surname}{' '}
                    <span className={styles.username}>@{selectedUsina.creador.username}</span>
                    </p>
                )}

                <p><strong>Carrera:</strong> {selectedUsina.creador?.carrera || 'No especificada'}</p>

                {selectedUsina.creado && (
                    <p><strong>Publicado:</strong> {new Date(selectedUsina.creado).toLocaleDateString('es-AR')}</p>
                )}

                {selectedUsina.creador?.username && (
                    <a 
                    href={`/perfil/${selectedUsina.creador.username}#trabajos`} 
                    className={styles.modalLink}
                    >
                    Ver más trabajos →
                    </a>
                )}
                </div>
            </div>
            </div>
        )}
        </div>
        <Footer/>
    </div>
  );
}