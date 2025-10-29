'use client';

import styles from '@/styles/components/Usina/Galeria.module.css';

const CARRERAS = [
  "Diseño Gráfico",
  "Escenografía",
  "Fotografía",
  "Ilustración",
  "Medios Audiovisuales",
  "Profesorado",
  "Realizador en Artes Visuales"
];

export default function GaleriaFiltros({ 
  searchTerm, 
  onSearchChange, 
  filterCarrera, 
  onCarreraChange, 
  filterAutor,
  onAutorChange,
  sortBy, 
  onSortChange,
  resultadosCount,
  totalCount 
}) {
  return (
    <div className={styles.filtrosContainer}>
      {/* Búsqueda */}
      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Buscar por título..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className={styles.searchInput}
        />
      </div>
      
      {/* Filtros */}
      <div className={styles.filtrosGrid}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Carrera</label>
          <select
            value={filterCarrera}
            onChange={(e) => onCarreraChange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="">Todas las carreras</option>
            {CARRERAS.map(carrera => (
              <option key={carrera} value={carrera}>{carrera}</option>
            ))}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Autor</label>
          <input
            type="text"
            placeholder="Filtrar por autor..."
            value={filterAutor}
            onChange={(e) => onAutorChange(e.target.value)}
            className={styles.filterSelect}
          />
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>Ordenar por</label>
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className={styles.filterSelect}
          >
            <option value="newest">Más recientes primero</option>
            <option value="oldest">Más antiguos primero</option>
            <option value="title-asc">Título (A-Z)</option>
            <option value="title-desc">Título (Z-A)</option>
          </select>
        </div>
      </div>

      {/* Información de resultados */}
      <div className={styles.resultadosInfo}>
        <p>
          Mostrando {resultadosCount} de {totalCount} trabajos
          {searchTerm && ` para "${searchTerm}"`}
          {filterCarrera && ` en ${filterCarrera}`}
          {filterAutor && ` del autor "${filterAutor}"`}
        </p>
      </div>
    </div>
  );
}