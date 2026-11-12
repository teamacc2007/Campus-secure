/**
 * Campus Secure API Configuration
 * Reads backend URL from VITE_API_BASE_URL (configured in Vercel or .env).
 * Defaults to "http://localhost:8000" if unset for seamless local development.
 */
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"
).replace(/\/+$/, "");

