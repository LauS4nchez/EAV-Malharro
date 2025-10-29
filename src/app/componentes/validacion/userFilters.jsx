
// Función para normalizar texto (quitar acentos, minúsculas, etc.)
export const normalizeText = (text) => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
};

// Función de búsqueda flexible por username
export const searchByUsername = (users, searchTerm) => {
  if (!searchTerm) return users;
  
  const normalizedSearch = normalizeText(searchTerm);
  return users.filter(user => 
    normalizeText(user.username).includes(normalizedSearch)
  );
};

// Función de búsqueda exacta por email
export const searchByEmail = (users, searchTerm) => {
  if (!searchTerm) return users;
  
  return users.filter(user => 
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

// Función de búsqueda combinada (username o email)
export const searchUsers = (users, searchTerm) => {
  if (!searchTerm) return users;
  
  const normalizedSearch = normalizeText(searchTerm);
  return users.filter(user => 
    normalizeText(user.username).includes(normalizedSearch) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
};

// Filtrado por roles
export const filterByRoles = (users, selectedRoles) => {
  if (!selectedRoles || selectedRoles.length === 0) return users;
  
  return users.filter(user => 
    selectedRoles.includes(user.role?.name || 'Authenticated')
  );
};

// Filtrado por estado de bloqueo
export const filterByBlockedStatus = (users, blockedFilter) => {
  if (blockedFilter === 'all') return users;
  if (blockedFilter === 'blocked') return users.filter(user => user.blocked);
  if (blockedFilter === 'unblocked') return users.filter(user => !user.blocked);
  return users;
};

// Filtrado por estado de confirmación
export const filterByConfirmedStatus = (users, confirmedFilter) => {
  if (confirmedFilter === 'all') return users;
  if (confirmedFilter === 'confirmed') return users.filter(user => user.confirmed);
  if (confirmedFilter === 'unconfirmed') return users.filter(user => !user.confirmed);
  return users;
};

// Ordenamiento de usuarios
export const sortUsers = (users, sortBy, sortOrder = 'asc') => {
  const sortedUsers = [...users];
  
  switch (sortBy) {
    case 'username':
      sortedUsers.sort((a, b) => a.username.localeCompare(b.username));
      break;
    case 'email':
      sortedUsers.sort((a, b) => a.email.localeCompare(b.email));
      break;
    case 'role':
      sortedUsers.sort((a, b) => 
        (a.role?.name || '').localeCompare(b.role?.name || '')
      );
      break;
    case 'createdAt':
      sortedUsers.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      break;
    case 'id':
    default:
      sortedUsers.sort((a, b) => a.id - b.id);
      break;
  }
  
  return sortOrder === 'desc' ? sortedUsers.reverse() : sortedUsers;
};

// Aplicar todos los filtros
export const applyAllFilters = (users, filters) => {
  let filteredUsers = [...users];
  
  // Búsqueda
  if (filters.searchTerm) {
    filteredUsers = searchUsers(filteredUsers, filters.searchTerm);
  }
  
  // Filtros de rol
  if (filters.selectedRoles && filters.selectedRoles.length > 0) {
    filteredUsers = filterByRoles(filteredUsers, filters.selectedRoles);
  }
  
  // Filtro de bloqueo
  if (filters.blockedFilter !== 'all') {
    filteredUsers = filterByBlockedStatus(filteredUsers, filters.blockedFilter);
  }
  
  // Filtro de confirmación
  if (filters.confirmedFilter !== 'all') {
    filteredUsers = filterByConfirmedStatus(filteredUsers, filters.confirmedFilter);
  }
  
  // Ordenamiento
  if (filters.sortBy) {
    filteredUsers = sortUsers(filteredUsers, filters.sortBy, filters.sortOrder);
  }
  
  return filteredUsers;
};