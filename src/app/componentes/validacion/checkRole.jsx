export function checkUserRole() {
  if (typeof window === "undefined") return "Public";
  const role = localStorage.getItem("userRole");
  return role || "Public";
}
