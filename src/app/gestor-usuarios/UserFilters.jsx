// @/app/componentes/gestor-usuarios/UserFilters.jsx
'use client'

import React, { useState } from 'react'
import styles from '@/styles/components/Perfil/UserFilters.module.css'

export default function UserFilters({ 
  filters, 
  onFiltersChange, 
  availableRoles,
  totalUsers,
  filteredCount 
}) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  
  const {
    searchTerm,
    selectedRoles,
    blockedFilter,
    confirmedFilter,
    sortBy,
    sortOrder
  } = filters;

  const handleSearchChange = (e) => {
    onFiltersChange({ searchTerm: e.target.value });
  };

  const handleRoleToggle = (roleName) => {
    const newSelectedRoles = selectedRoles.includes(roleName)
      ? selectedRoles.filter(role => role !== roleName)
      : [...selectedRoles, roleName];
    
    onFiltersChange({ selectedRoles: newSelectedRoles });
  };

  const handleBlockedFilterChange = (value) => {
    onFiltersChange({ blockedFilter: value });
  };

  const handleConfirmedFilterChange = (value) => {
    onFiltersChange({ confirmedFilter: value });
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      onFiltersChange({ sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' });
    } else {
      onFiltersChange({ sortBy: field, sortOrder: 'asc' });
    }
  };

  const clearAllFilters = () => {
    onFiltersChange({
      searchTerm: '',
      selectedRoles: [],
      blockedFilter: 'all',
      confirmedFilter: 'all',
      sortBy: 'id',
      sortOrder: 'asc'
    });
  };

  const hasActiveFilters = 
    searchTerm || 
    selectedRoles.length > 0 || 
    blockedFilter !== 'all' || 
    confirmedFilter !== 'all' ||
    sortBy !== 'id';

  return (
    <div className={styles.filtersContainer}>
      <div className={styles.searchSection}>
        <div className={styles.searchBox}>
          <input
            type="text"
            placeholder="Buscar por usuario o email..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <img 
            src="/img/Icon_Lupa.svg" 
            alt="Buscar" 
            className={styles.searchIcon}
            onError={(e) => {
              // Fallback si no existe la imagen
              e.target.style.display = 'none';
              e.target.nextSibling.style.display = 'block';
            }}
          />
          <span className={styles.searchIconFallback}>🔍</span>
        </div>
        
        <div className={styles.resultsInfo}>
          <span className={styles.resultsText}>
            Mostrando {filteredCount} de {totalUsers} usuarios
          </span>
          {hasActiveFilters && (
            <button 
              onClick={clearAllFilters}
              className={styles.clearFiltersBtn}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className={styles.advancedFiltersToggle}>
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={styles.toggleButton}
        >
          <span className={styles.masFiltros}>Más filtros</span>
          <span className={`${styles.arrow} ${showAdvancedFilters ? styles.arrowUp : styles.arrowDown}`}>
            ↓
          </span>
        </button>
      </div>

      {showAdvancedFilters && (
        <>
          <div className={styles.filtersRow}>
            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Roles:</label>
              <div className={styles.roleFilters}>
                {availableRoles.map(role => (
                  <button
                    key={role.name}
                    onClick={() => handleRoleToggle(role.name)}
                    className={`${styles.roleFilterBtn} ${
                      selectedRoles.includes(role.name) ? styles.active : ''
                    }`}
                  >
                    {role.name}
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Estado:</label>
              <select 
                value={blockedFilter}
                onChange={(e) => handleBlockedFilterChange(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Todos los estados</option>
                <option value="blocked">Bloqueados</option>
                <option value="unblocked">No bloqueados</option>
              </select>
            </div>

            <div className={styles.filterGroup}>
              <label className={styles.filterLabel}>Confirmación:</label>
              <select 
                value={confirmedFilter}
                onChange={(e) => handleConfirmedFilterChange(e.target.value)}
                className={styles.filterSelect}
              >
                <option value="all">Todos</option>
                <option value="confirmed">Confirmados</option>
                <option value="unconfirmed">No confirmados</option>
              </select>
            </div>
          </div>

          <div className={styles.sortSection}>
            <label className={styles.sortLabel}>Ordenar por:</label>
            <div className={styles.sortButtons}>
              <button
                onClick={() => handleSortChange('username')}
                className={`${styles.sortBtn} ${
                  sortBy === 'username' ? styles.active : ''
                }`}
              >
                Usuario {sortBy === 'username' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('email')}
                className={`${styles.sortBtn} ${
                  sortBy === 'email' ? styles.active : ''
                }`}
              >
                Email {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('role')}
                className={`${styles.sortBtn} ${
                  sortBy === 'role' ? styles.active : ''
                }`}
              >
                Rol {sortBy === 'role' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('createdAt')}
                className={`${styles.sortBtn} ${
                  sortBy === 'createdAt' ? styles.active : ''
                }`}
              >
                Fecha {sortBy === 'createdAt' && (sortOrder === 'asc' ? '↑' : '↓')}
              </button>
              <button
                onClick={() => handleSortChange('id')}
                className={`${styles.sortBtn} ${
                  sortBy === 'id' ? styles.active : ''
                }`}
              >
                ID {sortBy === 'id' && (sortOrder === 'asc' ? '↑' : '↓')}
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
              {selectedRoles.map(role => (
                <span key={role} className={styles.activeFilterTag}>
                  Rol: {role}
                </span>
              ))}
              {blockedFilter !== 'all' && (
                <span className={styles.activeFilterTag}>
                  {blockedFilter === 'blocked' ? 'Bloqueados' : 'No bloqueados'}
                </span>
              )}
              {confirmedFilter !== 'all' && (
                <span className={styles.activeFilterTag}>
                  {confirmedFilter === 'confirmed' ? 'Confirmados' : 'No confirmados'}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}