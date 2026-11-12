import { Preferences } from "@capacitor/preferences";
import type { Role } from "./App";

export interface StoredSession {
  role: Role;
  username: string;
  email?: string;
  fullName: string;
  token?: string;
  refreshToken?: string;
  timestamp: number;
}

const SESSION_KEY = "campus_secure_auth_session";

export function getInitialLocalSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.role) return parsed;
    }
  } catch {}
  return null;
}

export async function getStoredSession(): Promise<StoredSession | null> {
  try {
    const { value } = await Preferences.get({ key: SESSION_KEY });
    if (value) {
      const parsed = JSON.parse(value);
      if (parsed && parsed.role) return parsed;
    }
  } catch {}
  return getInitialLocalSession();
}

export async function saveSession(session: StoredSession): Promise<void> {
  const serialized = JSON.stringify(session);
  try {
    await Preferences.set({ key: SESSION_KEY, value: serialized });
  } catch {}
  try {
    localStorage.setItem(SESSION_KEY, serialized);
    if (session.token) {
      localStorage.setItem("campus_token", session.token);
    }
  } catch {}
}

export async function clearSession(): Promise<void> {
  try {
    await Preferences.remove({ key: SESSION_KEY });
  } catch {}
  try {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("campus_token");
  } catch {}
}
