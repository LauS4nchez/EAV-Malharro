export function isAuthenticated() {
  if (typeof window === "undefined") return false;
  const token = localStorage.getItem("token");
  return !!token;
}

export function getToken() {
  return localStorage.getItem("token");
}