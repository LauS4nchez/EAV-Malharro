'use client';

import { useEffect, useState } from 'react';
import { API_URL, URL, API_TOKEN } from '@/app/config';
import styles from '@/styles/components/Administrador/PanelModeracionUsina.module.css';
import Header from '@/app/componentes/construccion/Header';
import Footer from '@/app/componentes/construccion/Footer';
import toast from 'react-hot-toast';

export default function AdminUsinasPage() {
  const [usinas, setUsinas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pendientes');
  const [selectedImage, setSelectedImage] = useState(null);
  const [modal, setModal] = useState({ open: false, action: '', usina: null });
  
  // 🔹 Estado para paginación
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0
  });

  const jwt = localStorage.getItem('jwt');

  // 🔹 Cargar usinas con la nueva estructura
  useEffect(() => {
    const fetchUsinas = async () => {
      try {
        const res = await fetch(`${API_URL}/usinas?populate[0]=media&populate[1]=creador`, {
          headers: {
            'Authorization': `Bearer ${API_TOKEN}`,
            'Content-Type': 'application/json',
          }
        });
        const json = await res.json();
        const items = Array.isArray(json?.data) ? json.data : [];

        const normalized = items.map((item) => {
          const attributes = item.attributes ?? item;
          
          // Obtener URL del media
          let mediaUrl = '/placeholder.jpg';
          const mediaField = attributes.media;
          const mediaData = mediaField?.data ?? mediaField;
          const mediaAttrs = mediaData?.attributes ?? mediaData;
          const urlPath = mediaAttrs?.url;

          if (urlPath) {
            mediaUrl = urlPath.startsWith('http') ? urlPath : `${URL}${urlPath}`;
          }

          // Obtener información del creador
          const creadorField = attributes.creador;
          const creadorData = creadorField?.data ?? creadorField;
          const creadorAttrs = creadorData?.attributes ?? creadorData;

          return {
            id: item.id,
            documentId: item.documentId ?? item.id,
            titulo: attributes.titulo ?? 'Sin título',
            aprobado: attributes.aprobado ?? 'pendiente',
            mediaUrl,
            creador: creadorAttrs ? {
              name: creadorAttrs.name || '',
              surname: creadorAttrs.surname || '',
              username: creadorAttrs.username || '',
              carrera: creadorAttrs.carrera || 'Sin carrera',
            } : null
          };
        });

        setUsinas(normalized);
        setPagination(prev => ({ ...prev, total: normalized.length }));
      } catch (err) {
        console.error('Error al obtener usinas:', err);
        toast.error('Error al cargar las usinas');
      } finally {
        setLoading(false);
      }
    };

    fetchUsinas();
  }, []);

  // 🔹 Filtrar usinas según tab
  const usinasFiltradas = usinas.filter((u) =>
    tab === 'pendientes'
      ? u.aprobado === 'pendiente'
      : tab === 'aprobadas'
      ? u.aprobado === 'aprobada'
      : u.aprobado === 'rechazada'
  );

  // 🔹 Calcular datos de paginación
  const totalUsinas = usinasFiltradas.length;
  const totalPages = Math.ceil(totalUsinas / pagination.pageSize);
  const startIndex = (pagination.page - 1) * pagination.pageSize;
  const endIndex = startIndex + pagination.pageSize;
  const usinasPaginated = usinasFiltradas.slice(startIndex, endIndex);

  // 🔹 Actualizar estado
  const actualizarEstado = async (usina, nuevoEstado) => {
    try {
      if (!jwt) {
        toast.error('No hay token. Inicia sesión.');
        return;
      }

      const url = `${API_URL}/usinas/${usina.documentId}`;
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${jwt}`,
        },
        body: JSON.stringify({
          data: { aprobado: nuevoEstado },
        }),
      });

      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }

      setUsinas((prev) =>
        prev.map((u) =>
          u.documentId === usina.documentId ? { ...u, aprobado: nuevoEstado } : u
        )
      );

      toast.success(`Trabajo ${nuevoEstado === 'aprobada' ? 'aprobado' : 'rechazado'} correctamente`);
    } catch (error) {
      console.error('Error al actualizar:', error);
      toast.error('Error al actualizar el trabajo');
    } finally {
      setModal({ open: false, action: '', usina: null });
    }
  };

  // 🔹 Eliminar usina
  const eliminarUsina = async (usina) => {
    try {
      if (!jwt) {
        toast.error('No hay token. Inicia sesión.');
        return;
      }

      const url = `${API_URL}/usinas/${usina.documentId}`;
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${jwt}` },
      });
      
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }
      
      setUsinas((prev) => prev.filter((u) => u.documentId !== usina.documentId));
      toast.success('Trabajo eliminado correctamente');
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast.error('Error al eliminar el trabajo');
    } finally {
      setModal({ open: false, action: '', usina: null });
    }
  };

  // 🔹 Confirmar acción desde el modal
  const confirmarAccion = () => {
    const { action, usina } = modal;
    if (action === 'aprobar') actualizarEstado(usina, 'aprobada');
    else if (action === 'rechazar') actualizarEstado(usina, 'rechazada');
    else if (action === 'eliminar') eliminarUsina(usina);
  };

  // 🔹 Manejar cambio de página
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  // 🔹 Manejar cambio de tamaño de página
  const handlePageSizeChange = (newSize) => {
    setPagination({ page: 1, pageSize: parseInt(newSize), total: usinasFiltradas.length });
  };

  // 🔹 Resetear paginación cuando cambia el tab
  useEffect(() => {
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [tab]);

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Cargando trabajos...</p>
      </div>
    );
  }

  return (
    <div>
      <Header  variant='dark'/>
      <div className={styles.adminContainer}>
        <div className={`${styles.adminContent} mt-5`}>
          <h1 className={styles.adminTitle}>Panel de Moderación</h1>
          <p className={styles.adminSubtitle}>
            Gestiona los trabajos enviados por los usuarios
          </p>

          {/* 🔹 Tabs */}
          <div className={styles.tabs}>
            {['pendientes', 'aprobadas', 'rechazadas'].map((tipo) => (
              <button
                key={tipo}
                className={`${styles.tab} ${tab === tipo ? styles.activeTab : ''}`}
                onClick={() => setTab(tipo)}
              >
                {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
                <span className={styles.tabCount}>
                  ({usinas.filter(u => u.aprobado === (tipo === 'pendientes' ? 'pendiente' : tipo.slice(0, -1))).length})
                </span>
              </button>
            ))}
          </div>

          {/* 🔹 Controles de paginación - Superior */}
          {usinasFiltradas.length > 0 && (
            <div className={styles.paginationControls}>
              <div className={styles.pageSizeSelector}>
                <label className={styles.textPageSize} htmlFor="pageSize">Mostrar:</label>
                <select
                  id="pageSize"
                  value={pagination.pageSize}
                  onChange={(e) => handlePageSizeChange(e.target.value)}
                  className={styles.pageSizeSelect}
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className={styles.textPageSize} >entradas por página</span>
              </div>
              
              <div className={styles.paginationInfo}>
                Mostrando {Math.min(endIndex, totalUsinas)} de {totalUsinas} trabajos
              </div>
            </div>
          )}

          {/* 🔹 Grid de usinas */}
          <div className={styles.usinaGrid}>
            {usinasPaginated.length > 0 ? (
              usinasPaginated.map((usina) => (
                <div key={usina.documentId} className={styles.usinaCard}>
                  <div
                    className={styles.imageContainer}
                    onClick={() => usina.mediaUrl && setSelectedImage(usina.mediaUrl)}
                  >
                    {usina.mediaUrl && usina.mediaUrl !== '/placeholder.jpg' ? (
                      <img src={usina.mediaUrl} alt={usina.titulo} className={styles.image} />
                    ) : (
                      <div className={styles.noImage}>Sin imagen</div>
                    )}
                  </div>

                  <div className={styles.usinaInfo}>
                    <h2 className={styles.titulo}>{usina.titulo}</h2>
                    
                    {usina.creador && (
                      <div className={styles.creadorInfo}>
                        <p className={styles.creadorNombre}>
                          <strong>Creador:</strong> {usina.creador.name} {usina.creador.surname}
                        </p>
                        <p className={styles.creadorUsername}>
                          @{usina.creador.username}
                        </p>
                        <p className={styles.creadorCarrera}>
                          {usina.creador.carrera}
                        </p>
                      </div>
                    )}

                    <div className={`${styles.estado} ${styles[usina.aprobado]}`}>
                      Estado: {usina.aprobado}
                    </div>
                  </div>

                  {/* 🔹 Botones según tab */}
                  <div className={styles.actions}>
                    {tab === 'pendientes' && (
                      <>
                        <button
                          className={styles.btnAprobar}
                          onClick={() => setModal({ open: true, action: 'aprobar', usina })}
                        >
                          Aprobar
                        </button>
                        <button
                          className={styles.btnRechazar}
                          onClick={() => setModal({ open: true, action: 'rechazar', usina })}
                        >
                          Rechazar
                        </button>
                      </>
                    )}

                    {tab === 'aprobadas' && (
                      <button
                        className={styles.btnRechazar}
                        onClick={() => setModal({ open: true, action: 'rechazar', usina })}
                      >
                        Rechazar
                      </button>
                    )}

                    {tab === 'rechazadas' && (
                      <>
                        <button
                          className={styles.btnAprobar}
                          onClick={() => setModal({ open: true, action: 'aprobar', usina })}
                        >
                          Aprobar
                        </button>
                        <button
                          className={styles.btnEliminar}
                          onClick={() => setModal({ open: true, action: 'eliminar', usina })}
                        >
                          Eliminar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.noUsinas}>
                <p>No hay trabajos {tab} en este momento.</p>
              </div>
            )}
          </div>

          {/* 🔹 Controles de paginación - Inferior */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                className={styles.paginationBtn}
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
              >
                Anterior
              </button>
              
              <div className={styles.paginationNumbers}>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(page => 
                    page === 1 || 
                    page === totalPages || 
                    Math.abs(page - pagination.page) <= 1
                  )
                  .map((page, index, array) => {
                    // Agregar puntos suspensivos para páginas omitidas
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <span key={page}>
                        {showEllipsis && <span className={styles.paginationEllipsis}>...</span>}
                        <button
                          className={`${styles.paginationBtn} ${pagination.page === page ? styles.paginationBtnActive : ''}`}
                          onClick={() => handlePageChange(page)}
                        >
                          {page}
                        </button>
                      </span>
                    );
                  })}
              </div>
              
              <button
                className={styles.paginationBtn}
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === totalPages}
              >
                Siguiente
              </button>
            </div>
          )}

          {/* 🔹 Modal para imagen */}
          {selectedImage && (
            <div className={styles.modalOverlay} onClick={() => setSelectedImage(null)}>
              <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                <button className={styles.modalClose} onClick={() => setSelectedImage(null)}>
                  ✕
                </button>
                <img src={selectedImage} alt="Trabajo" className={styles.modalImage} />
              </div>
            </div>
          )}

          {/* 🔹 Modal de confirmación */}
          {modal.open && (
            <div className={styles.modalOverlay}>
              <div className={styles.confirmModal}>
                <h2 className={styles.modalTitle}>Confirmar acción</h2>
                <p className={styles.modalText}>
                  ¿Seguro que deseas {modal.action === 'eliminar'
                    ? 'eliminar este trabajo'
                    : `${modal.action} este trabajo`
                  }?
                </p>
                {modal.usina && (
                  <div className={styles.modalUsinaInfo}>
                    <strong>{modal.usina.titulo}</strong>
                    {modal.usina.creador && (
                      <span> - @{modal.usina.creador.username}</span>
                    )}
                  </div>
                )}
                <div className={styles.modalButtons}>
                  <button
                    className={styles.btnConfirmar}
                    onClick={confirmarAccion}
                  >
                    Confirmar
                  </button>
                  <button
                    className={styles.btnCancelar}
                    onClick={() => setModal({ open: false, action: '', usina: null })}
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}