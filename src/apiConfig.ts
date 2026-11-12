export const API_BASE_URL = (
  (import.meta as any).env?.VITE_API_BASE_URL ||
  "https://backend-production-19f741ab.up.railway.app"
).replace(/\/+$/, "");
