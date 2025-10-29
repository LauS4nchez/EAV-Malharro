// @/app/componentes/perfil/usina/UsinaFilters.jsx
'use client'

import React from 'react'
import styles from '@/styles/components/Usina/UsinaFilters.module.css'

export default function UsinaFilters({ 
  filters, 
  onFiltersChange, 
  totalUsinas,
  filteredCount 
}) {
  const {
    searchTerm,
    sortBy,
    sortOrder
  } = filters;

  const handleSearchChange = (e) => {
    onFiltersChange({ searchTerm: e.target.value });
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      onFiltersChange({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      onFiltersChange({ sortBy: field, sortOrder: 'asc' });
    }
  };

  const clearFilters = () => {
    onFiltersChange({
      searchTerm: '',
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const hasActiveFilters = searchTerm || sortBy !== 'createdAt';

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <img 
            src="/img/Icon_Lupa.svg" 
            alt="Buscar" 
            className={styles.searchIcon}
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span className={styles.searchIconFallback}>🔍</span>
        </div>
        
        <div className={styles.resultsInfo}>
          <span className={styles.resultsText}>
            Mostrando {filteredCount} de {totalUsinas} trabajos
          </span>
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className={styles.clearFiltersBtn}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className={styles.sortSection}>
        <label className={styles.sortLabel}>Ordenar por:</label>
        <div className={styles.sortButtons}>
          <button
            onClick={() => handleSortChange('titulo')}
            className={`${styles.sortBtn} ${
              sortBy === 'titulo' ? styles.active : ''
            }`}
          >
            Título {sortBy === 'titulo' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => handleSortChange('createdAt')}
            className={`${styles.sortBtn} ${
              sortBy === 'createdAt' ? styles.active : ''
            }`}
          >
            Fecha {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {hasActiveFilters && (
        <div className={styles.activeFilters}>
          <span className={styles.activeFiltersLabel}>Filtros activos: </span>
          {searchTerm && (
            <span className={styles.activeFilterTag}>
              Búsqueda: "{searchTerm}"
            </span>
          )}
          {sortBy && (
            <span className={styles.activeFilterTag}>
              Orden: {sortBy === 'titulo' ? 'Título' : 'Fecha'} 
              ({sortOrder === 'asc' ? 'Ascendente' : 'Descendente'})
            </span>
          )}
        </div>
      )}
    </div>
  );
}